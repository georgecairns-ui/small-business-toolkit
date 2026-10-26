/*
  MODEL: the pipeline data and everything you can ask of it or do to it
  ---------------------------------------------------------------------
  The whole pipeline lives in one file, data/pipeline.json, shared with Claude. This file knows
  its shape. Screens ask questions here ("what's this stage worth?") and every change a click
  makes is a function here that edits the data. app.js saves those changes through the store.

  Sections of pipeline.json (formatVersion 1):
    settings     name, business, currency, stages, chase timing, where drafts open
    deals        every deal: stage, value, people, the deal check, next steps, the email to send
    people       contacts and companies (when Task List OS is attached, its contacts show too)
    calls        sales calls Claude has written up, each linked to a deal
    suggestions  what Claude is waiting for the person to decide: chases, new deals, questions
    checkIn      when Claude last looked at email, calendar and calls
    activity     a log of what happened, for the numbers and each deal's history

  Every number the person relies on (what a stage is worth, the deal check score, win rate)
  is worked out here from the raw data, never typed in by Claude.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;

  // The standard stages. People rename, add and remove them in Preferences (settings.stages).
  // "won" and "lost" always exist and always come last: they close a deal.
  const DEFAULT_STAGES = [
    { key: "new", label: "New enquiry" },
    { key: "call-completed", label: "Call completed" },
    { key: "talking", label: "Talking" },
    { key: "proposal", label: "Proposal sent" },
    { key: "negotiating", label: "Negotiating" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" }
  ];
  const STAGES = [];
  const STAGE = {};
  function useStages(list) {
    const clean = (Array.isArray(list) && list.length ? list : DEFAULT_STAGES)
      .filter(function (s) { return s && /^[a-z0-9-]{1,40}$/.test(s.key) && String(s.label || "").trim(); })
      .map(function (s) { return { key: s.key, label: String(s.label).trim().slice(0, 40) }; });
    const open = clean.filter(function (s) { return s.key !== "won" && s.key !== "lost"; });
    if (!open.length) open.push({ key: "new", label: "New enquiry" });
    const won = clean.find(function (s) { return s.key === "won"; }) || { key: "won", label: "Won" };
    const lost = clean.find(function (s) { return s.key === "lost"; }) || { key: "lost", label: "Lost" };
    STAGES.length = 0;
    Object.keys(STAGE).forEach(function (k) { delete STAGE[k]; });
    open.concat([won, lost]).forEach(function (s) { STAGES.push(s); STAGE[s.key] = s; });
  }
  useStages(null);
  function openStages() { return STAGES.filter(function (s) { return s.key !== "won" && s.key !== "lost"; }); }
  function stageLabel(key) { return (STAGE[key] || { label: key }).label; }

  // The deal check: the 8 MEDDPICC questions, in plain English. The words can be changed in
  // Preferences (settings.checkLabels); the keys never change.
  const CHECK = [
    { key: "metrics", name: "Metrics", label: "What is the problem costing them?" },
    { key: "economicBuyer", name: "Economic buyer", label: "Who signs it off?" },
    { key: "decisionCriteria", name: "Decision criteria", label: "What will they judge it on?" },
    { key: "decisionProcess", name: "Decision process", label: "How and when will they decide?" },
    { key: "paperProcess", name: "Paper process", label: "Contracts or checks before they can buy" },
    { key: "pain", name: "Identify pain", label: "What's actually hurting?" },
    { key: "competition", name: "Competition", label: "Who or what else are they considering?" },
    { key: "champion", name: "Champion", label: "Who on their side is pushing for it?" }
  ];
  const STATUS = { known: { label: "Known", score: 1 }, partly: { label: "Partly known", score: 0.5 }, gap: { label: "Not known yet", score: 0 } };
  function checkLabel(d, key) {
    const custom = d && d.settings && d.settings.checkLabels && d.settings.checkLabels[key];
    const c = CHECK.find(function (x) { return x.key === key; });
    return custom || (c ? c.label : key);
  }

  const ROLES = [
    { key: "prospect", label: "Prospect" },
    { key: "client", label: "Client" },
    { key: "customer", label: "Customer" },
    { key: "supplier", label: "Supplier" },
    { key: "team", label: "Team" },
    { key: "adviser", label: "Adviser" },
    { key: "other", label: "Other" }
  ];

  const DEFAULT_SETTINGS = {
    yourName: "", businessName: "",
    currency: "GBP", chaseAfterDays: 7, autoMove: true, fitCriteria: [],
    emailProvider: "gmail", calendarProvider: "google"
  };

  // ============================================================
  // Reading the file safely
  // ============================================================

  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.deals)) throw new Error('The file has no "deals" list.');
  }

  function arr(v) { return Array.isArray(v) ? v : []; }

  // Fill in anything missing so the screens never trip over a half-written or older file.
  // Only tidies what is in memory; it is saved the next time something changes.
  function normalise(d) {
    d.formatVersion = 1;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    useStages(d.settings.stages);
    ["deals", "people", "calls", "suggestions", "activity"].forEach(function (k) { d[k] = arr(d[k]); });
    d.deals = d.deals.filter(function (x) { return x && x.id && x.title; });
    d.deals.forEach(function (x) {
      if (!STAGE[x.stage]) x.stage = openStages()[0].key;
      x.personIds = arr(x.personIds);
      x.timeline = arr(x.timeline).filter(function (e) { return e && e.at; });
      x.nextSteps = arr(x.nextSteps).filter(function (s) { return s && s.text; });
      x.notesInbox = arr(x.notesInbox).filter(function (n) { return n && n.id && n.text; });
      x.alsoHelp = arr(x.alsoHelp).filter(function (a) { return a && a.problem; });
      if (!x.check || typeof x.check !== "object") x.check = {};
      CHECK.forEach(function (c) {
        const a = x.check[c.key];
        if (!a || typeof a !== "object") x.check[c.key] = { status: "gap", answer: "", evidence: "" };
        else if (!STATUS[a.status]) a.status = "gap";
      });
      ["risks", "signals", "questions"].forEach(function (k) { x.check[k] = arr(x.check[k]).filter(Boolean); });
    });
    d.people = d.people.filter(function (p) { return p && p.id && p.name; });
    d.calls = d.calls.filter(function (c) { return c && c.id && c.title; });
    d.suggestions = d.suggestions.filter(function (s) { return s && s.id && s.title; });
    d.suggestions.forEach(function (s) { if (["waiting", "approved", "skipped"].indexOf(s.status) === -1) s.status = "waiting"; });
    if (!d.checkIn || typeof d.checkIn !== "object") d.checkIn = { lastRunAt: null, nextRunAt: null, emailsRead: 0, callsRead: 0, dealsUpdated: 0 };
    return d;
  }

  // ============================================================
  // Dates, money
  // ============================================================

  function todayISO() { return ui.isoDate(); }
  function nowISO() { return new Date().toISOString(); }
  function daysSince(at) {
    if (!at) return null;
    const then = new Date(String(at).length === 10 ? at + "T12:00" : at);
    if (isNaN(then)) return null;
    return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
  }
  function splitLocal(dt) {
    const s = String(dt || "");
    const date = s.slice(0, 10);
    const t = /T(\d{2}):(\d{2})/.exec(s);
    return { date: date, minutes: t ? Number(t[1]) * 60 + Number(t[2]) : null };
  }
  function timeLabel(minutes) {
    if (minutes == null) return "";
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
  }
  // "Today", "Tomorrow", "Thu", "14 Oct", with a time if there is one
  function whenLabel(dt) {
    if (!dt) return "";
    const s = splitLocal(dt);
    const day = ui.parseDate(s.date);
    const diff = Math.round((day - ui.parseDate(todayISO())) / 86400000);
    const name = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" :
      diff > 1 && diff < 7 ? day.toLocaleDateString("en-GB", { weekday: "short" }) : day.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return name + (s.minutes != null ? " " + timeLabel(s.minutes) : "");
  }
  // "Today, 2pm", "Tomorrow, Fri 10 Oct, 10am", "Mon 13 Oct, 11am": the day a call is booked for, in full
  function meetingLabel(dt) {
    if (!dt) return "";
    const s = splitLocal(dt);
    const day = ui.parseDate(s.date);
    const diff = Math.round((day - ui.parseDate(todayISO())) / 86400000);
    const full = day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const time = s.minutes != null ? ", " + timeLabel(s.minutes) : "";
    return diff === 0 ? "Today" + time : diff === 1 ? "Tomorrow, " + full + time : full + time;
  }
  function money(d, n, opts) {
    const value = Number(n) || 0;
    try {
      return value.toLocaleString("en-GB", { style: "currency", currency: (d && d.settings.currency) || "GBP", maximumFractionDigits: opts && opts.pence ? 2 : 0 });
    } catch (e) { return "£" + Math.round(value).toLocaleString("en-GB"); }
  }

  // ============================================================
  // Questions the screens ask
  // ============================================================

  function dealById(d, id) { return id ? d.deals.find(function (x) { return x.id === id; }) : null; }
  function callById(d, id) { return id ? d.calls.find(function (x) { return x.id === id; }) : null; }
  function suggestionById(d, id) { return id ? d.suggestions.find(function (x) { return x.id === id; }) : null; }

  // People: this tool's own, plus the task list's contacts when Task List OS is attached (read only here)
  let linkedPeople = [];
  function setLinkedPeople(list) { linkedPeople = arr(list).filter(function (p) { return p && p.id && p.name; }).map(function (p) { return Object.assign({}, p, { fromTaskList: true }); }); }
  function allPeople(d) {
    const own = d.people.map(function (p) { return p; });
    const ids = {};
    own.forEach(function (p) { ids[p.id] = true; });
    return own.concat(linkedPeople.filter(function (p) { return !ids[p.id]; }));
  }
  // A fresh install that Claude hasn't set up yet: no name and no deals, people or calls
  function notSetUp(d) { return !(d.settings && d.settings.yourName) && !d.deals.length && !d.people.length && !d.calls.length; }
  function personById(d, id) { return id ? allPeople(d).find(function (p) { return p.id === id; }) || null : null; }

  function isOpen(x) { return x.stage !== "won" && x.stage !== "lost" && !x.suggested; }
  function isSuggested(x) { return !!x.suggested && x.stage !== "lost"; }
  function openDeals(d) { return d.deals.filter(isOpen); }
  function dealsInStage(d, key) { return d.deals.filter(function (x) { return x.stage === key && !x.suggested; }); }
  function stageValue(d, key) { return dealsInStage(d, key).reduce(function (sum, x) { return sum + (Number(x.value) || 0); }, 0); }
  function pipelineValue(d) { return openDeals(d).reduce(function (sum, x) { return sum + (Number(x.value) || 0); }, 0); }

  // The deal check score: Known counts 1, Partly known 0.5, out of 8, as a percentage
  function checkScore(x) {
    const total = CHECK.reduce(function (sum, c) { return sum + STATUS[(x.check[c.key] || {}).status || "gap"].score; }, 0);
    return Math.round(total / CHECK.length * 100);
  }
  function checkGaps(x) { return CHECK.filter(function (c) { return (x.check[c.key] || {}).status !== "known"; }); }
  function hasBeenChecked(x) { return !!x.check.checkedAt; }

  // How well a prospect fits the ideal client, from Claude's research: each of the person's own
  // criteria (settings.fitCriteria) is yes 1, partly 0.5 or no 0. Criteria Claude couldn't find
  // out ("unknown") are left out, and the app says how many it's based on.
  const FIT = { yes: { label: "Yes", score: 1 }, partly: { label: "Partly", score: 0.5 }, no: { label: "No", score: 0 }, unknown: { label: "Couldn't tell", score: null } };
  function fitScore(x) {
    const fit = x && x.research && Array.isArray(x.research.fit) ? x.research.fit : [];
    const assessed = fit.filter(function (f) { return f && FIT[f.result] && FIT[f.result].score != null; });
    if (!assessed.length) return null;
    const total = assessed.reduce(function (sum, f) { return sum + FIT[f.result].score; }, 0);
    return { score: Math.round(total / assessed.length * 100), assessed: assessed.length, of: fit.length, dealBreaker: fit.some(function (f) { return f.result === "no" && f.dealBreaker; }) };
  }
  // How important a Review item is to the pipeline, worked out from its deal (never typed in by
  // Claude). Value counts most: what it's worth against the biggest open deal (up to 50), then how
  // far along it is (15), how well they fit (10), and how urgent it is (a call today or tomorrow 20,
  // in 3 days 10; gone quiet twice the chase setting 15, once 8; a new enquiry from the last day 8;
  // a chase 3).
  // 55 or more is High, 30 or more Medium, otherwise Low. item is a suggestion or a suggested deal.
  function importance(d, item) {
    let x = item && item.title && item.check && item.timeline ? item : dealById(d, item && item.dealId);
    if (!x && item && item.personId) x = openDeals(d).find(function (dl) { return dl.personIds.indexOf(item.personId) > -1; }) || null;
    const reasons = [];
    let score = 0;
    if (x) {
      const max = Math.max.apply(null, openDeals(d).map(function (dl) { return Number(dl.value) || 0; }).concat([Number(x.value) || 0, 1]));
      if (x.value) { score += Math.round((Number(x.value) || 0) / max * 50); reasons.push(money(d, x.value) + " deal"); }
      const open = openStages();
      const i = open.findIndex(function (s) { return s.key === x.stage; });
      if (!x.suggested && i > 0) { score += Math.round(i / Math.max(1, open.length - 1) * 15); reasons.push(open[i].label); }
      const f = fitScore(x);
      if (f) { score += Math.round(f.score / 100 * 10) - (f.dealBreaker ? 10 : 0); reasons.push(f.score + "% fit"); } else score += 5;
      const m = upcomingMeeting(x);
      if (m) {
        const days = Math.round((ui.parseDate(splitLocal(m.start).date) - ui.parseDate(todayISO())) / 86400000);
        if (days <= 1) { score += 20; reasons.push(days === 0 ? "call today" : "call tomorrow"); }
        else if (days <= 3) { score += 10; reasons.push("call in " + days + " days"); }
      }
      const q = quietDays(x), chase = Number(d.settings.chaseAfterDays) || 7;
      if (isOpen(x) && !m && q != null && q >= chase * 2) { score += 15; reasons.push(q + " days quiet"); }
      else if (isOpen(x) && !m && q != null && q >= chase) { score += 8; reasons.push(q + " days quiet"); }
      if (x.suggested && daysSince(x.created) <= 1) { score += 8; reasons.push("new enquiry, reply fast"); }
    } else reasons.push("not linked to a deal yet");
    if (item && item.kind === "chase") score += 3;
    const level = score >= 55 ? "high" : score >= 30 ? "medium" : "low";
    return { score: score, level: level, label: { high: "High", medium: "Medium", low: "Low" }[level], reasons: reasons };
  }

  // Emails waiting for Claude to send: the person pressed Claude emails, then Send
  function queuedEmails(d) {
    const out = [];
    d.deals.forEach(function (x) { if (x.email && x.email.sendStatus === "queued") out.push(x.email); });
    d.suggestions.forEach(function (sg) { if (sg.email && sg.email.sendStatus === "queued") out.push(sg.email); });
    return out;
  }

  // Gone quiet: no contact for longer than the person's chase setting
  function quietDays(x) { return daysSince(x.lastContact || x.created); }
  function needsChase(d, x) { const q = quietDays(x); return isOpen(x) && q != null && q >= (Number(d.settings.chaseAfterDays) || 7); }
  function notesWaiting(x) { return x.notesInbox.filter(function (n) { return n.status !== "done"; }); }

  // A sales call coming up: nextMeeting.start in the future (or today)
  function upcomingMeeting(x) {
    const m = x.nextMeeting;
    if (!m || !m.start) return null;
    return splitLocal(m.start).date >= todayISO() ? m : null;
  }
  function meetingsThisWeek(d) {
    const end = ui.isoDate(ui.addDays(new Date(), 7));
    return openDeals(d).map(function (x) { return { deal: x, meeting: upcomingMeeting(x) }; })
      .filter(function (r) { return r.meeting && splitLocal(r.meeting.start).date <= end; })
      .sort(function (a, b) { return String(a.meeting.start).localeCompare(String(b.meeting.start)); });
  }

  function waitingSuggestions(d) { return d.suggestions.filter(function (s) { return s.status === "waiting"; }); }
  function reviewCount(d) { return waitingSuggestions(d).length + d.deals.filter(isSuggested).length; }

  function callsSorted(d) { return d.calls.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }); }
  function callsForDeal(d, id) { return callsSorted(d).filter(function (c) { return c.dealId === id; }); }
  function dealsForPerson(d, personId) { return d.deals.filter(function (x) { return x.personIds.indexOf(personId) > -1 && !x.suggested; }); }

  // People, in groups. Worked out from their deals, so a person moves between groups by themselves:
  //   clients    a client or customer, or anyone you've won a deal with
  //   prospects  anyone with an open deal, or a prospect with no deal yet
  //   untouched  prospects you haven't spoken to yet: no deal yet, or only at the first stage with no call booked or held
  //   quiet      prospects with an open deal that's gone quiet (no contact for the chase setting)
  //   lost       people whose deals were all lost, with nothing open or won
  const GROUPS = [
    { key: "clients", label: "Clients", icon: "check", hint: "Clients and customers, and anyone you've won a deal with" },
    { key: "prospects", label: "Prospects", icon: "trendingUp", hint: "Everyone you're selling to right now" },
    { key: "untouched", label: "Not contacted yet", icon: "user", hint: "Prospects you haven't spoken to yet" },
    { key: "quiet", label: "Gone quiet", icon: "hourglass", hint: "Prospects who've stopped replying" },
    { key: "lost", label: "Closed, lost", icon: "x", hint: "Deals that didn't happen, worth a friendly nudge later" }
  ];
  function peopleGroups(d) {
    const g = { clients: [], prospects: [], untouched: [], quiet: [], lost: [], all: [] };
    const first = openStages()[0].key;
    allPeople(d).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (p) {
      const deals = dealsForPerson(d, p.id);
      const open = deals.filter(isOpen);
      const won = deals.some(function (x) { return x.stage === "won"; });
      const lost = deals.some(function (x) { return x.stage === "lost"; });
      g.all.push(p);
      if (p.role === "client" || p.role === "customer" || won) g.clients.push(p);
      const prospect = open.length > 0 || (p.role === "prospect" && !deals.length);
      if (prospect) g.prospects.push(p);
      const quiet = open.some(function (x) { return needsChase(d, x); });
      const untouched = prospect && !quiet && open.every(function (x) { return x.stage === first && !upcomingMeeting(x) && !callsForDeal(d, x.id).length; });
      if (untouched) g.untouched.push(p);
      if (quiet) g.quiet.push(p);
      if (lost && !open.length && !won) g.lost.push(p);
    });
    return g;
  }

  // Won this month and win rate (deals closed in the last 90 days), worked out from the activity log
  function numbers(d) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoff = ui.addDays(now, -90);
    const closed = d.deals.filter(function (x) { return (x.stage === "won" || x.stage === "lost") && x.closedAt; });
    const wonMonth = closed.filter(function (x) { return x.stage === "won" && new Date(x.closedAt) >= monthStart; });
    const recent = closed.filter(function (x) { return new Date(x.closedAt) >= cutoff; });
    const recentWon = recent.filter(function (x) { return x.stage === "won"; }).length;
    return {
      open: openDeals(d).length,
      pipeline: pipelineValue(d),
      wonMonthCount: wonMonth.length,
      wonMonthValue: wonMonth.reduce(function (s, x) { return s + (Number(x.value) || 0); }, 0),
      winRate: recent.length ? Math.round(recentWon / recent.length * 100) : null,
      closedRecently: recent.length
    };
  }

  function search(d, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return { deals: [], people: [] };
    const has = function (s) { return String(s || "").toLowerCase().indexOf(q) > -1; };
    return {
      deals: d.deals.filter(function (x) { return has(x.title) || has(x.organisation); }).slice(0, 8),
      people: allPeople(d).filter(function (p) { return has(p.name) || has(p.organisation) || has(p.email); }).slice(0, 6)
    };
  }

  // ============================================================
  // Changes (each one edits the data in memory; app.js saves it)
  // ============================================================

  function newId(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8).padEnd(6, "0"); }
  function log(d, entry) { d.activity.push(Object.assign({ at: nowISO() }, entry)); if (d.activity.length > 2000) d.activity = d.activity.slice(-2000); }
  function addTimeline(x, entry) { x.timeline.push(Object.assign({ id: newId("e"), at: nowISO() }, entry)); }

  const mut = {
    addDeal: function (d, fields) {
      const x = {
        id: newId("d"), title: fields.title, organisation: fields.organisation || "", personIds: fields.personIds || [],
        value: Number(fields.value) || 0, stage: fields.stage && STAGE[fields.stage] ? fields.stage : openStages()[0].key,
        source: fields.source || "", created: nowISO(), lastContact: null, addedBy: "you",
        nextSteps: [], notesInbox: [], timeline: [], alsoHelp: [], check: {}
      };
      d.deals.push(x);
      normalise(d);
      addTimeline(x, { kind: "created", title: "Deal added", by: "you" });
      log(d, { type: "deal-added", dealId: x.id });
      return x;
    },
    updateDeal: function (d, id, fields) {
      const x = dealById(d, id);
      if (!x) return;
      Object.keys(fields).forEach(function (k) { x[k] = fields[k]; });
    },
    // Move a deal to another stage (the person dragging it, or choosing in the panel)
    setStage: function (d, id, stage, by) {
      const x = dealById(d, id);
      if (!x || !STAGE[stage] || x.stage === stage) return;
      const from = x.stage;
      x.stage = stage;
      x.stageChangedAt = nowISO();
      if (stage === "won" || stage === "lost") x.closedAt = nowISO(); else delete x.closedAt;
      if (by !== "claude") delete x.moved;
      addTimeline(x, { kind: stage === "won" ? "won" : stage === "lost" ? "lost" : "stage", title: "Moved from " + stageLabel(from) + " to " + stageLabel(stage), by: by || "you" });
      log(d, { type: "deal-moved", dealId: id, from: from, to: stage });
    },
    // Undo a move Claude made by itself
    undoMove: function (d, id) {
      const x = dealById(d, id);
      if (!x || !x.moved) return;
      const back = x.moved.from;
      delete x.moved;
      if (STAGE[back]) mut.setStage(d, id, back, "you");
    },
    seenMove: function (d, id) { const x = dealById(d, id); if (x && x.moved) x.moved.seen = true; },
    // A deal Claude spotted: approving puts it on the board
    approveDeal: function (d, id) {
      const x = dealById(d, id);
      if (!x) return;
      delete x.suggested;
      x.approvedAt = nowISO();
      addTimeline(x, { kind: "created", title: "Added to your pipeline", by: "you" });
      log(d, { type: "deal-approved", dealId: id });
    },
    skipDeal: function (d, id) {
      const x = dealById(d, id);
      if (!x) return;
      x.stage = "lost";
      x.lostReason = "Not a deal (skipped)";
      x.dismissedAt = nowISO();
    },
    unskipDeal: function (d, id, stage) {
      const x = dealById(d, id);
      if (!x) return;
      x.stage = stage;
      delete x.lostReason; delete x.dismissedAt;
    },
    // Call notes the person adds: they wait on the deal until Claude has read them
    addNotes: function (d, id, text, fileName) {
      const x = dealById(d, id);
      if (!x) return null;
      const n = { id: newId("n"), text: String(text).slice(0, 60000), fileName: fileName || "", addedAt: nowISO(), status: "waiting" };
      x.notesInbox.push(n);
      addTimeline(x, { kind: "note", title: fileName ? "Call notes added (" + fileName + ")" : "Call notes added", by: "you" });
      log(d, { type: "notes-added", dealId: id });
      return n;
    },
    setNextStepDone: function (d, id, index, done) {
      const x = dealById(d, id);
      if (!x || !x.nextSteps[index]) return;
      x.nextSteps[index].done = !!done;
      x.nextSteps[index].doneAt = done ? nowISO() : null;
    },
    emailOpened: function (d, id) {
      const x = dealById(d, id);
      if (!x || !x.email) return;
      x.email.openedAt = nowISO();
    },
    // The person pressed Claude emails, checked it, and pressed Send. Claude sends it on its next
    // run (started straight away through the helper) and sets sendStatus to "sent" or "failed".
    approveSend: function (d, where, id, email) {
      const holder = where === "deal" ? dealById(d, id) : suggestionById(d, id);
      if (!holder || !holder.email) return;
      Object.assign(holder.email, email, { sendApprovedAt: nowISO(), sendStatus: "queued" });
      delete holder.email.sendError;
      const x = where === "deal" ? holder : dealById(d, holder.dealId);
      if (x) addTimeline(x, { kind: "email", title: "You asked Claude to send: " + (email.subject || "an email"), by: "you" });
    },
    cancelSend: function (d, where, id) {
      const holder = where === "deal" ? dealById(d, id) : suggestionById(d, id);
      if (holder && holder.email && holder.email.sendStatus === "queued") { holder.email.sendStatus = ""; delete holder.email.sendApprovedAt; }
    },
    requestResearch: function (d, id) { const x = dealById(d, id); if (x) x.researchRequestedAt = nowISO(); },
    emailSent: function (d, id) {
      const x = dealById(d, id);
      if (!x || !x.email) return;
      x.email.sentAt = nowISO();
      x.lastContact = nowISO();
      addTimeline(x, { kind: "email", title: "You sent: " + (x.email.subject || "an email"), by: "you" });
      log(d, { type: "email-sent", dealId: id });
    },
    deleteDeal: function (d, id) {
      const i = d.deals.findIndex(function (x) { return x.id === id; });
      return i > -1 ? d.deals.splice(i, 1)[0] : null;
    },
    restoreDeal: function (d, x) { if (x && !dealById(d, x.id)) d.deals.push(x); },

    // Suggestions: chases, questions ("is this a sales call?") and tasks
    decide: function (d, id, how) {
      const s = suggestionById(d, id);
      if (!s) return;
      s.status = how === "approve" ? "approved" : "skipped";
      s.decidedAt = nowISO();
      if (how === "approve" && s.dealId) {
        const x = dealById(d, s.dealId);
        if (x) addTimeline(x, { kind: "note", title: "You approved: " + s.title, by: "you" });
      }
    },
    undecide: function (d, id) { const s = suggestionById(d, id); if (s) { s.status = "waiting"; delete s.decidedAt; } },
    suggestionOpened: function (d, id) { const s = suggestionById(d, id); if (s) s.draftOpenedAt = nowISO(); },

    addPerson: function (d, fields) {
      const p = { id: newId("p"), name: fields.name, organisation: fields.organisation || "", role: fields.role || "prospect", email: fields.email || "", phone: "", linkedin: fields.linkedin || "", notes: "" };
      d.people.push(p);
      return p;
    },
    updatePerson: function (d, id, fields) {
      const p = d.people.find(function (x) { return x.id === id; });
      if (p) Object.assign(p, fields);
    },
    personByName: function (d, name) {
      const n = String(name || "").trim();
      if (!n) return null;
      const low = n.toLowerCase();
      return allPeople(d).find(function (p) { return p.name.toLowerCase() === low || (p.organisation || "").toLowerCase() === low; }) ||
        mut.addPerson(d, { name: n, role: "prospect" });
    },
    setPreferences: function (d, values, stages, checkLabels) {
      Object.assign(d.settings, values);
      if (stages) d.settings.stages = stages;
      if (checkLabels) d.settings.checkLabels = checkLabels;
      useStages(d.settings.stages);
      // Deals in a stage that was removed go back to the first stage
      d.deals.forEach(function (x) { if (!STAGE[x.stage]) x.stage = openStages()[0].key; });
    }
  };

  window.PL = window.PL || {};
  window.PL.model = {
    DEFAULT_STAGES: DEFAULT_STAGES, STAGES: STAGES, STAGE: STAGE, CHECK: CHECK, STATUS: STATUS, ROLES: ROLES,
    openStages: openStages, stageLabel: stageLabel, checkLabel: checkLabel,
    validate: validate, normalise: normalise, notSetUp: notSetUp, FIT: FIT, fitScore: fitScore, importance: importance, queuedEmails: queuedEmails,
    todayISO: todayISO, daysSince: daysSince, splitLocal: splitLocal, timeLabel: timeLabel, whenLabel: whenLabel, money: money,
    dealById: dealById, callById: callById, suggestionById: suggestionById,
    setLinkedPeople: setLinkedPeople, allPeople: allPeople, personById: personById,
    isOpen: isOpen, isSuggested: isSuggested, openDeals: openDeals, dealsInStage: dealsInStage, stageValue: stageValue, pipelineValue: pipelineValue,
    checkScore: checkScore, checkGaps: checkGaps, hasBeenChecked: hasBeenChecked,
    quietDays: quietDays, needsChase: needsChase, notesWaiting: notesWaiting, upcomingMeeting: upcomingMeeting, meetingsThisWeek: meetingsThisWeek,
    waitingSuggestions: waitingSuggestions, reviewCount: reviewCount, callsSorted: callsSorted, callsForDeal: callsForDeal, dealsForPerson: dealsForPerson,
    numbers: numbers, search: search, meetingLabel: meetingLabel, GROUPS: GROUPS, peopleGroups: peopleGroups, mut: mut
  };
})();
