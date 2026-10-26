/*
  MODEL: the task data and everything you can ask of it or do to it
  -----------------------------------------------------------------
  The whole task list lives in one file, data/tasks.json, shared with Claude. This file knows
  its shape. Screens ask questions here ("what's on today?") and every change a click makes
  is a function here that edits the data. app.js saves those changes through the store.

  Sections of tasks.json (formatVersion 2):
    settings  name, business, time-saved estimates, working hours
    tasks     every task, open or done
    plan      today's plan: Claude's proposals and what the person approved
    week      (older versions: this week's goals; no longer shown)
    events    calendar events Claude copied in from the person's calendar (read only here)
    people    clients, suppliers, team: who tasks are for or waiting on
    dump      brain dump lines waiting for Claude to sort into tasks
    activity  a log of things done, used for the time-saved estimate and task history
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;

  // The standard categories. People can rename, recolour, add and remove them in Preferences
  // (saved as settings.categories); "waiting" always exists because the Waiting on column uses it.
  // A colour of "" means the theme's own colour for that category (works in light and dark).
  const DEFAULT_CATEGORIES = [
    { key: "today",     label: "Do today",           colour: "" },
    { key: "quick-win", label: "Quick wins",         colour: "" },
    { key: "delegate",  label: "Delegate",           colour: "" },
    { key: "waiting",   label: "Waiting on someone", colour: "" },
    { key: "later",     label: "Can wait",           colour: "" }
  ];
  const THEME_COLOURS = { today: "var(--cat-today)", "quick-win": "var(--cat-quick)", delegate: "var(--cat-delegate)", waiting: "var(--cat-waiting)", later: "var(--cat-later)" };
  const CATEGORIES = [];
  const CAT = {};
  function useCategories(list) {
    const clean = (Array.isArray(list) && list.length ? list : DEFAULT_CATEGORIES)
      .filter(function (c) { return c && /^[a-z0-9-]{1,40}$/.test(c.key) && String(c.label || "").trim(); })
      .map(function (c) { return { key: c.key, label: String(c.label).trim().slice(0, 40), colour: /^#[0-9a-fA-F]{6}$/.test(c.colour || "") ? c.colour : "" }; });
    if (!clean.some(function (c) { return c.key === "waiting"; })) clean.push({ key: "waiting", label: "Waiting on someone", colour: "" });
    if (!clean.some(function (c) { return c.key === "later"; })) clean.push({ key: "later", label: "Can wait", colour: "" });
    CATEGORIES.length = 0;
    Object.keys(CAT).forEach(function (k) { delete CAT[k]; });
    clean.forEach(function (c) { c.css = c.colour || THEME_COLOURS[c.key] || "var(--cat-later)"; CATEGORIES.push(c); CAT[c.key] = c; });
  }
  useCategories(null);

  // Where a task is on the board. The labels can be renamed in Preferences (settings.stageLabels).
  const STAGES = [
    { key: "todo",    label: "To do" },
    { key: "doing",   label: "In progress" },
    { key: "waiting", label: "Waiting on" },
    { key: "done",    label: "Done" }
  ];
  function stageLabel(d, key) {
    const custom = d && d.settings && d.settings.stageLabels && d.settings.stageLabels[key];
    const s = STAGES.find(function (x) { return x.key === key; });
    return custom || (s ? s.label : key);
  }
  function stageOf(t) {
    if (t.status === "done") return "done";
    if (t.category === "waiting") return "waiting";
    if (t.inProgress) return "doing";
    return "todo";
  }

  const ROLES = [
    { key: "client",   label: "Client" },
    { key: "customer", label: "Customer" },
    { key: "supplier", label: "Supplier" },
    { key: "team",     label: "Team" },
    { key: "adviser",  label: "Adviser" },
    { key: "other",    label: "Other" }
  ];

  const DEFAULT_SETTINGS = {
    yourName: "", businessName: "",
    minutesSavedPerTask: 6, minutesSavedPerPlan: 20,
    dayStarts: "08:00", dayEnds: "18:00",
    defaultScope: "today", defaultView: "board"
  };

  // ============================================================
  // Reading the file safely
  // ============================================================

  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.tasks)) throw new Error('The file has no "tasks" list.');
  }

  // Fill in anything missing so the screens never trip over a half-written or older file.
  // Only tidies what is in memory; it is saved the next time something changes.
  function normalise(d) {
    d.formatVersion = 2;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    useCategories(d.settings.categories);
    d.tasks = (d.tasks || []).filter(function (t) { return t && t.id && t.title; });
    d.tasks.forEach(function (t) {
      if (!CAT[t.category]) t.category = "later";
      if (t.status !== "done" && t.status !== "dismissed") t.status = "open";
    });
    if (!d.plan || typeof d.plan !== "object") d.plan = { date: null, preparedAt: null, note: "", items: [] };
    if (!Array.isArray(d.plan.items)) d.plan.items = [];
    d.plan.items = d.plan.items.filter(function (i) { return i && i.taskId; });
    if (!d.week || typeof d.week !== "object") d.week = { start: null, goals: [], note: "" };
    if (!Array.isArray(d.week.goals)) d.week.goals = [];
    ["events", "people", "dump", "activity", "replies", "meetings"].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    d.events = d.events.filter(function (e) { return e && e.id && e.start; });
    d.people = d.people.filter(function (p) { return p && p.id && p.name; });
    d.dump = d.dump.filter(function (x) { return x && x.id && x.text; });
    d.replies = d.replies.filter(function (r) { return r && r.id && r.subject !== undefined; });
    d.replies.forEach(function (r) { if (["waiting", "replied", "dismissed"].indexOf(r.status) === -1) r.status = "waiting"; if (!r.draft) r.draft = { to: "", cc: "", subject: "", body: "" }; });
    d.meetings = d.meetings.filter(function (m) { return m && m.id && m.title; });
    if (!d.triage || typeof d.triage !== "object") d.triage = { lastRunAt: null, nextRunAt: null, emailsScanned: 0, needReply: 0, newTasks: 0, noAction: 0, callsProcessed: 0 };
    return d;
  }

  // ============================================================
  // Dates and times
  // ============================================================

  function todayISO() { return ui.isoDate(); }
  function mondayOf(date) { return ui.startOfWeek(date || new Date()); }
  function weekDates(monday) {
    const out = [];
    for (let i = 0; i < 7; i++) out.push(ui.isoDate(ui.addDays(monday, i)));
    return out;
  }
  // "14:30" to minutes since midnight
  function toMinutes(hhmm) {
    if (!hhmm) return null;
    const p = String(hhmm).split(":").map(Number);
    return p.length >= 2 && !p.some(isNaN) ? p[0] * 60 + p[1] : null;
  }
  function fromMinutes(mins) {
    const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }
  // "2026-10-06T14:00" (local) to { date, minutes }
  function splitLocal(dt) {
    const s = String(dt || "");
    return { date: s.slice(0, 10), minutes: s.length > 10 ? toMinutes(s.slice(11, 16)) : null };
  }
  function timeLabel(hhmm) {
    const m = toMinutes(hhmm);
    if (m == null) return "";
    const h = Math.floor(m / 60), min = m % 60;
    return (h % 12 || 12) + (min ? ":" + String(min).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
  }

  // ============================================================
  // Questions the screens ask
  // ============================================================

  function taskById(d, id) { return d.tasks.find(function (t) { return t.id === id; }); }
  function personById(d, id) { return id ? d.people.find(function (p) { return p.id === id; }) : null; }
  function planIsToday(d) { return d.plan && d.plan.date === todayISO(); }
  function claudeHasPlanned(d) { return planIsToday(d) && !!d.plan.preparedAt; }
  // A fresh install that Claude hasn't set up yet: no name, no tasks
  function notSetUp(d) { return !(d.settings && d.settings.yourName) && !d.tasks.length; }

  // A new task Claude spotted that the person has not approved yet
  // Claude has looked at this task and written a prompt it could act on (see the spot-claude-tasks skill)
  function claudeCanDo(t) { return !!(t && t.status === "open" && !t.suggested && t.claude && t.claude.prompt); }
  function isSuggestion(t) { return !!t && !!t.suggested && t.status === "open"; }
  // Really on the list: open and not an unapproved suggestion
  function isOnList(t) { return !!t && t.status === "open" && !t.suggested; }

  // Today's plan items still waiting for a yes or no
  function proposals(d) {
    if (!claudeHasPlanned(d)) return [];
    return d.plan.items.filter(function (i) { const t = taskById(d, i.taskId); return i.status === "proposed" && t && t.status === "open"; });
  }
  function approvedToday(d) {
    if (!planIsToday(d)) return [];
    return d.plan.items.filter(function (i) { const t = taskById(d, i.taskId); return i.status === "approved" && t && t.status !== "dismissed"; });
  }
  // Everything waiting for the person's decision, for the Review page and its badge
  function reviewQueue(d) {
    const onPlan = new Set(proposals(d).map(function (i) { return i.taskId; }));
    return {
      plan: proposals(d),
      newTasks: d.tasks.filter(function (t) { return isSuggestion(t) && !onPlan.has(t.id); }),
      schedule: d.tasks.filter(function (t) { return isOnList(t) && t.proposedDate; })
    };
  }
  function reviewCount(d) {
    const q = reviewQueue(d);
    return q.plan.length + q.newTasks.length + q.schedule.length;
  }

  // The date a task is planned for: its scheduled day, or failing that its due date
  function plannedDate(t) { return t.scheduledDate || t.due || null; }
  function tasksForDate(d, iso, opts) {
    const o = opts || {};
    return d.tasks.filter(function (t) {
      if (t.status === "dismissed" || t.suggested) return false;
      if (t.status === "done") return o.includeDone && t.doneAt && ui.isoDate(new Date(t.doneAt)) === iso && plannedDate(t) === iso;
      return plannedDate(t) === iso;
    });
  }
  function overdue(d) {
    const today = todayISO();
    return d.tasks.filter(function (t) { return isOnList(t) && plannedDate(t) && plannedDate(t) < today; });
  }
  function unscheduled(d) {
    return d.tasks.filter(function (t) { return isOnList(t) && !plannedDate(t) && t.category !== "waiting"; });
  }
  function openTasks(d) { return d.tasks.filter(isOnList); }
  function waitingList(d) { return d.tasks.filter(function (t) { return isOnList(t) && t.category === "waiting"; }); }
  function doneTasks(d) {
    return d.tasks.filter(function (t) { return t.status === "done"; })
      .sort(function (a, b) { return String(b.doneAt || "").localeCompare(String(a.doneAt || "")); });
  }
  function doneToday(d) {
    const today = todayISO();
    return d.tasks.filter(function (t) { return t.status === "done" && t.doneAt && ui.isoDate(new Date(t.doneAt)) === today; });
  }
  function eventsForDate(d, iso) {
    return d.events.filter(function (e) { return splitLocal(e.start).date === iso || (e.allDay && e.end && splitLocal(e.start).date <= iso && splitLocal(e.end).date >= iso); })
      .sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); });
  }
  function timedTasksForDate(d, iso) {
    return d.tasks.filter(function (t) { return t.status !== "dismissed" && !t.suggested && t.scheduledDate === iso && t.scheduledTime; });
  }
  function unsortedDump(d) { return d.dump.filter(function (x) { return x.status === "unsorted"; }); }

  function tasksForPerson(d, personId) {
    return d.tasks.filter(function (t) { return t.personId === personId && t.status !== "dismissed"; });
  }
  function personSummary(d, p) {
    const tasks = tasksForPerson(d, p.id);
    const open = tasks.filter(isOnList);
    const done = tasks.filter(function (t) { return t.status === "done"; });
    const lastDone = done.map(function (t) { return t.doneAt; }).filter(Boolean).sort().pop();
    const nextDue = open.map(plannedDate).filter(Boolean).sort()[0] || null;
    return {
      open: open.length,
      waiting: open.filter(function (t) { return t.category === "waiting"; }).length,
      overdue: open.filter(function (t) { return plannedDate(t) && plannedDate(t) < todayISO(); }).length,
      lastActivity: [lastDone, p.lastContact].filter(Boolean).sort().pop() || null,
      nextDue: nextDue
    };
  }

  // Time saved: an estimate from the activity log
  function num(v, fallback) { return typeof v === "number" && isFinite(v) ? v : Number(fallback) || 0; }
  function timeSaved(d, fromDate, toDate) {
    let minutes = 0, tasksDone = 0, plans = 0;
    d.activity.forEach(function (a) {
      const when = new Date(a.at);
      if (isNaN(when) || when < fromDate || (toDate && when >= toDate)) return;
      if (a.type === "task-done") { tasksDone++; minutes += num(a.minutes, d.settings.minutesSavedPerTask); }
      if (a.type === "plan-approved") { plans++; minutes += num(a.minutes, d.settings.minutesSavedPerPlan); }
    });
    return { minutes: minutes, tasksDone: tasksDone, plans: plans };
  }

  // ---------- Emails that need a reply, and calls ----------
  function openReplies(d) {
    const rank = { high: 0, normal: 1, low: 2 };
    return d.replies.filter(function (r) { return r.status === "waiting"; })
      .sort(function (a, b) { return (rank[a.urgency] || 1) - (rank[b.urgency] || 1) || String(a.receivedAt || "").localeCompare(String(b.receivedAt || "")); });
  }
  function replyById(d, id) { return d.replies.find(function (r) { return r.id === id; }); }
  function meetingsSorted(d) {
    return d.meetings.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  }
  function meetingById(d, id) { return d.meetings.find(function (m) { return m.id === id; }); }

  // ---------- Free time ----------
  // Free slots of at least `length` minutes, inside working hours, from now onwards.
  // Used to suggest "when would you like to do this?"
  function freeSlots(d, length, maxSlots, daysAhead) {
    const len = length || 30;
    const startOfDay = toMinutes(d.settings.dayStarts) || 480;
    const endOfDay = toMinutes(d.settings.dayEnds) || 1080;
    const out = [];
    const now = new Date();
    for (let i = 0; i < (daysAhead || 5) && out.length < (maxSlots || 3); i++) {
      const day = ui.addDays(now, i);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // weekdays only
      const iso = ui.isoDate(day);
      const busy = eventsForDate(d, iso).filter(function (e) { return !e.allDay; }).map(function (e) {
        const s = splitLocal(e.start).minutes, en = splitLocal(e.end).minutes;
        return [s, en == null ? s + 30 : en];
      }).concat(timedTasksForDate(d, iso).filter(function (t) { return t.status === "open"; }).map(function (t) {
        const s = toMinutes(t.scheduledTime);
        return [s, s + (t.durationMinutes || 30)];
      })).sort(function (a, b) { return a[0] - b[0]; });
      // Start from the next half hour today, or the start of the working day
      let cursor = i === 0 ? Math.max(startOfDay, Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30) : startOfDay;
      busy.forEach(function (b) {
        if (out.length >= (maxSlots || 3)) return;
        if (b[0] - cursor >= len && cursor + len <= endOfDay) out.push({ date: iso, time: fromMinutes(cursor) });
        cursor = Math.max(cursor, b[1]);
      });
      if (out.length < (maxSlots || 3) && endOfDay - cursor >= len) out.push({ date: iso, time: fromMinutes(cursor) });
    }
    return out.slice(0, maxSlots || 3);
  }

  // Simple search across tasks and people
  function search(d, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return { tasks: [], people: [] };
    const hit = function (s) { return String(s || "").toLowerCase().indexOf(q) > -1; };
    return {
      tasks: d.tasks.filter(function (t) { return t.status !== "dismissed" && (hit(t.title) || hit(t.notes) || hit(t.waitingOn) || hit(t.delegateTo)); }).slice(0, 8),
      people: d.people.filter(function (p) { return hit(p.name) || hit(p.organisation); }).slice(0, 5)
    };
  }

  // A task's history, newest first, built from its own dates and the activity log
  function history(d, t) {
    const items = [];
    if (t.created) items.push({ at: t.created, text: t.addedBy === "claude" ? "Suggested by Claude" : "Added" });
    if (t.approvedAt) items.push({ at: t.approvedAt, text: "Approved" });
    d.plan.items.forEach(function (i) { if (i.taskId === t.id && i.approvedAt && planIsToday(d)) items.push({ at: i.approvedAt, text: "Put on today's plan" }); });
    if (t.scheduledAt) items.push({ at: t.scheduledAt, text: "Scheduled" });
    if (t.doneAt) items.push({ at: t.doneAt, text: "Done" });
    return items.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  }

  // ============================================================
  // Changes (each edits the data it is given; app.js saves it)
  // ============================================================

  function nowISO() { return new Date().toISOString(); }
  function ensureTodayPlan(d) { if (!planIsToday(d)) d.plan = { date: todayISO(), preparedAt: null, note: "", items: [] }; }
  function trimActivity(d) { if (d.activity.length > 2000) d.activity = d.activity.slice(-2000); }

  function logPlanApproved(d) {
    if (!claudeHasPlanned(d)) return;
    const pending = d.plan.items.some(function (i) { return i.status === "proposed"; });
    const anyApproved = d.plan.items.some(function (i) { return i.status === "approved"; });
    const already = d.activity.some(function (a) { return a.type === "plan-approved" && a.planDate === d.plan.date; });
    if (!pending && anyApproved && !already) {
      d.activity.push({ at: nowISO(), type: "plan-approved", planDate: d.plan.date, minutes: num(d.settings.minutesSavedPerPlan, 20) });
    }
  }

  // Turn an approved suggestion into a real task
  function acceptSuggestion(t) {
    if (t.suggested) { delete t.suggested; t.addedBy = "claude"; t.approvedAt = nowISO(); }
  }

  const mut = {
    // Approve a suggestion: a plan item, a brand-new task, or both
    approve: function (d, taskId) {
      const t = taskById(d, taskId);
      if (!t) return;
      const item = planIsToday(d) ? d.plan.items.find(function (i) { return i.taskId === taskId && i.status === "proposed"; }) : null;
      if (item) { item.status = "approved"; item.approvedAt = nowISO(); t.category = item.category || t.category; }
      // A brand-new suggestion that came with a suggested time: one Approve accepts both
      if (t.suggested && t.proposedDate) mut.approveSchedule(d, taskId);
      acceptSuggestion(t);
      logPlanApproved(d);
    },
    // Skip: a plan item stays on the list for another day; a brand-new suggestion is dismissed for good
    skip: function (d, taskId) {
      const t = taskById(d, taskId);
      if (!t) return;
      const item = planIsToday(d) ? d.plan.items.find(function (i) { return i.taskId === taskId && i.status === "proposed"; }) : null;
      if (item) item.status = "skipped";
      if (t.suggested) { t.status = "dismissed"; t.dismissedAt = nowISO(); }
      logPlanApproved(d);
    },
    // Put a suggestion back (Undo)
    unreview: function (d, taskId, wasSuggestion) {
      const t = taskById(d, taskId);
      if (!t) return;
      const item = planIsToday(d) ? d.plan.items.find(function (i) { return i.taskId === taskId; }) : null;
      if (item) { item.status = "proposed"; delete item.approvedAt; }
      if (wasSuggestion) { t.suggested = true; t.status = "open"; delete t.dismissedAt; delete t.approvedAt; }
      d.activity = d.activity.filter(function (a) { return !(a.type === "plan-approved" && a.planDate === d.plan.date); });
    },
    approveAll: function (d, taskIds) {
      taskIds.forEach(function (id) { mut.approve(d, id); });
    },

    // Claude's proposed day for a task (from "plan my week")
    approveSchedule: function (d, taskId) {
      const t = taskById(d, taskId);
      if (!t || !t.proposedDate) return;
      t.scheduledDate = t.proposedDate;
      if (t.proposedTime) { t.scheduledTime = t.proposedTime; t.durationMinutes = t.durationMinutes || 30; }
      t.scheduledAt = nowISO();
      delete t.proposedDate; delete t.proposedTime; delete t.proposedReason;
    },
    skipSchedule: function (d, taskId) {
      const t = taskById(d, taskId);
      if (!t) return;
      delete t.proposedDate; delete t.proposedTime; delete t.proposedReason;
    },

    setDone: function (d, taskId, done) {
      const t = taskById(d, taskId);
      if (!t) return;
      if (done && t.status !== "done") {
        t.status = "done"; t.doneAt = nowISO();
        d.activity.push({ at: t.doneAt, type: "task-done", taskId: taskId, minutes: num(t.minutesSaved, d.settings.minutesSavedPerTask) });
        trimActivity(d);
      } else if (!done && t.status === "done") {
        t.status = "open"; t.doneAt = null;
        for (let i = d.activity.length - 1; i >= 0; i--) {
          if (d.activity[i].type === "task-done" && d.activity[i].taskId === taskId) { d.activity.splice(i, 1); break; }
        }
      }
    },

    // Add a task the person typed. opts.today puts it on today's list.
    addTask: function (d, fields, opts) {
      const t = Object.assign({
        id: ui.makeId("t"), title: "", notes: "", category: "today", status: "open",
        due: null, scheduledDate: null, scheduledTime: null, durationMinutes: null,
        personId: null, waitingOn: "", delegateTo: "", addedBy: "you", created: nowISO(), doneAt: null
      }, fields);
      if (t.category === "waiting" && !t.waitingSince) t.waitingSince = todayISO();
      d.tasks.push(t);
      if (opts && opts.today) {
        ensureTodayPlan(d);
        d.plan.items.push({ taskId: t.id, category: t.category, reason: "", status: "approved", addedBy: "you", approvedAt: nowISO() });
      }
      d.activity.push({ at: nowISO(), type: "task-added", taskId: t.id, minutes: 0 });
      trimActivity(d);
      return t;
    },

    // Move a task to a column on the board: To do, In progress, Waiting on or Done
    setStage: function (d, taskId, stage) {
      const t = taskById(d, taskId);
      if (!t) return;
      if (stage === "done") { mut.setDone(d, taskId, true); t.inProgress = false; return; }
      if (t.status === "done") mut.setDone(d, taskId, false);
      if (stage === "waiting") {
        if (t.category !== "waiting") { t.categoryBeforeWaiting = t.category; t.category = "waiting"; t.waitingSince = todayISO(); }
        t.inProgress = false;
        return;
      }
      if (t.category === "waiting") { t.category = CAT[t.categoryBeforeWaiting] && t.categoryBeforeWaiting !== "waiting" ? t.categoryBeforeWaiting : "today"; delete t.waitingSince; }
      t.inProgress = stage === "doing";
    },

    // Save Preferences. Categories that were removed move their tasks to "Can wait".
    setPreferences: function (d, values, categories) {
      Object.assign(d.settings, values);
      if (categories) {
        d.settings.categories = categories;
        useCategories(categories);
        d.tasks.forEach(function (t) { if (!CAT[t.category]) t.category = "later"; });
        d.plan.items.forEach(function (i) { if (i.category && !CAT[i.category]) i.category = "later"; });
      }
    },

    // "Who's it for": an existing person or company by name, or a new one added to the contacts
    personByName: function (d, name, organisation) {
      const n = String(name || "").trim();
      if (!n) return null;
      const lower = n.toLowerCase();
      const found = d.people.find(function (p) { return p.name.toLowerCase() === lower || (p.organisation && p.organisation.toLowerCase() === lower); });
      if (found) return found;
      return mut.addPerson(d, { name: n, organisation: String(organisation || "").trim(), role: "other" });
    },

    // Edit any fields of a task
    updateTask: function (d, taskId, fields) {
      const t = taskById(d, taskId);
      if (!t) return;
      Object.keys(fields).forEach(function (k) {
        const v = fields[k];
        if (v === undefined) return;
        t[k] = (v === "" && ["due", "scheduledDate", "scheduledTime", "personId"].indexOf(k) > -1) ? null : v;
      });
      if (t.category === "waiting" && !t.waitingSince) t.waitingSince = todayISO();
      if (fields.scheduledDate !== undefined || fields.scheduledTime !== undefined) t.scheduledAt = nowISO();
      if (t.scheduledTime && !t.durationMinutes) t.durationMinutes = 30;
      // Keep today's plan in step with the category
      if (fields.category && planIsToday(d)) d.plan.items.forEach(function (i) { if (i.taskId === taskId) i.category = fields.category; });
    },

    // Plan a task for a day, and optionally a time slot
    schedule: function (d, taskId, date, time, duration) {
      const t = taskById(d, taskId);
      if (!t) return;
      t.scheduledDate = date || null;
      t.scheduledTime = time || null;
      if (time) t.durationMinutes = duration || t.durationMinutes || 30;
      t.scheduledAt = nowISO();
    },

    addToToday: function (d, taskId) {
      const t = taskById(d, taskId);
      if (!t) return;
      ensureTodayPlan(d);
      if (t.category === "later") t.category = "today";
      const existing = d.plan.items.find(function (i) { return i.taskId === taskId; });
      if (existing) { existing.status = "approved"; existing.category = t.category; existing.approvedAt = nowISO(); }
      else d.plan.items.push({ taskId: taskId, category: t.category, reason: "", status: "approved", addedBy: "you", approvedAt: nowISO() });
    },
    removeFromToday: function (d, taskId) {
      if (!planIsToday(d)) return;
      d.plan.items = d.plan.items.filter(function (i) { return i.taskId !== taskId; });
    },

    deleteTask: function (d, taskId) {
      const idx = d.tasks.findIndex(function (t) { return t.id === taskId; });
      if (idx < 0) return null;
      const removed = { task: d.tasks.splice(idx, 1)[0], planItems: d.plan.items.filter(function (i) { return i.taskId === taskId; }), planDate: d.plan.date };
      d.plan.items = d.plan.items.filter(function (i) { return i.taskId !== taskId; });
      return removed;
    },
    restoreTask: function (d, removed) {
      if (!removed || taskById(d, removed.task.id)) return;
      d.tasks.push(removed.task);
      if (d.plan.date === removed.planDate) removed.planItems.forEach(function (i) { d.plan.items.push(i); });
    },

    // ---------- Brain dump ----------
    addDump: function (d, lines) {
      const made = [];
      lines.forEach(function (line) {
        const text = String(line).replace(/^\s*[-*•]\s*/, "").trim();
        if (!text) return;
        const item = { id: ui.makeId("b"), text: text.slice(0, 500), createdAt: nowISO(), status: "unsorted" };
        d.dump.push(item);
        made.push(item);
      });
      return made;
    },
    // The person turns a line into a task themselves
    dumpToTask: function (d, dumpId) {
      const item = d.dump.find(function (x) { return x.id === dumpId; });
      if (!item) return null;
      const t = mut.addTask(d, { title: item.text.slice(0, 200), category: "later" });
      item.status = "sorted"; item.sortedAt = nowISO(); item.taskIds = [t.id];
      return t;
    },
    // A voice note goes into the brain dump as one item; Claude splits it into tasks
    addVoiceNote: function (d, text) {
      const item = { id: ui.makeId("b"), text: String(text).slice(0, 20000), createdAt: nowISO(), status: "unsorted", kind: "voice" };
      d.dump.push(item);
      return item;
    },
    removeDump: function (d, dumpId) {
      const item = d.dump.find(function (x) { return x.id === dumpId; });
      if (item) { item.status = "dismissed"; item.sortedAt = nowISO(); }
    },
    restoreDump: function (d, dumpId) {
      const item = d.dump.find(function (x) { return x.id === dumpId; });
      if (item) { item.status = "unsorted"; delete item.sortedAt; }
    },

    // ---------- Weekly goals ----------
    ensureWeek: function (d) {
      const start = ui.isoDate(mondayOf());
      if (d.week.start !== start) d.week = { start: start, goals: [], note: "" };
    },
    addGoal: function (d, text) {
      mut.ensureWeek(d);
      d.week.goals.push({ id: ui.makeId("g"), text: String(text).slice(0, 200), done: false, addedBy: "you" });
    },
    toggleGoal: function (d, goalId) {
      const g = d.week.goals.find(function (x) { return x.id === goalId; });
      if (g) g.done = !g.done;
    },
    removeGoal: function (d, goalId) {
      d.week.goals = d.week.goals.filter(function (x) { return x.id !== goalId; });
    },

    // ---------- People ----------
    addPerson: function (d, fields) {
      const p = Object.assign({ id: ui.makeId("p"), name: "", organisation: "", role: "client", email: "", phone: "", notes: "", added: nowISO() }, fields);
      d.people.push(p);
      return p;
    },
    updatePerson: function (d, personId, fields) {
      const p = personById(d, personId);
      if (p) Object.assign(p, fields);
    },

    // ---------- Replies ----------
    setReply: function (d, replyId, fields) {
      const r = replyById(d, replyId);
      if (!r) return;
      if (fields.draft) { r.draft = Object.assign({}, r.draft, fields.draft); delete fields.draft; r.draftEditedAt = nowISO(); }
      Object.assign(r, fields);
      if (fields.status === "replied") r.repliedAt = nowISO();
      if (fields.status === "waiting") { delete r.repliedAt; }
    },
    markDraftOpened: function (d, replyId) {
      const r = replyById(d, replyId);
      if (r) r.draftOpenedAt = nowISO();
    },
    calendarAdded: function (d, taskId) {
      const t = taskById(d, taskId);
      if (t) t.calendarAddedAt = nowISO();
    },

    // A meeting the person adds in the app. It shows straight away; they save it in their real
    // calendar from the link the app opens, and Claude's next calendar copy brings in the real one.
    addMeeting: function (d, m) {
      const start = m.date + "T" + m.time;
      const end = fromMinutes(Math.min(toMinutes(m.time) + (Number(m.minutes) || 30), 23 * 60 + 59));
      const ev = { id: ui.makeId("ev-app"), title: m.title, start: start, end: m.date + "T" + end, allDay: false,
        location: m.location || "", guests: m.guests || "", notes: m.notes || "", source: "app", addedAt: nowISO() };
      d.events.push(ev);
      return ev;
    },
    removeMeeting: function (d, id) {
      d.events = d.events.filter(function (e) { return !(e.id === id && e.source === "app"); });
    },

    setSettings: function (d, values) { Object.assign(d.settings, values); }
  };

  window.TL = window.TL || {};
  window.TL.model = {
    CATEGORIES: CATEGORIES, CAT: CAT, DEFAULT_CATEGORIES: DEFAULT_CATEGORIES, ROLES: ROLES, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    STAGES: STAGES, stageOf: stageOf, stageLabel: stageLabel, claudeCanDo: claudeCanDo,
    validate: validate, normalise: normalise,
    todayISO: todayISO, mondayOf: mondayOf, weekDates: weekDates, toMinutes: toMinutes, fromMinutes: fromMinutes,
    splitLocal: splitLocal, timeLabel: timeLabel,
    taskById: taskById, personById: personById, planIsToday: planIsToday, claudeHasPlanned: claudeHasPlanned, notSetUp: notSetUp,
    isSuggestion: isSuggestion, isOnList: isOnList, proposals: proposals, approvedToday: approvedToday,
    reviewQueue: reviewQueue, reviewCount: reviewCount, plannedDate: plannedDate, tasksForDate: tasksForDate,
    overdue: overdue, unscheduled: unscheduled, openTasks: openTasks, waitingList: waitingList,
    doneTasks: doneTasks, doneToday: doneToday, eventsForDate: eventsForDate, timedTasksForDate: timedTasksForDate,
    unsortedDump: unsortedDump, tasksForPerson: tasksForPerson, personSummary: personSummary,
    timeSaved: timeSaved, search: search, history: history, num: num,
    openReplies: openReplies, replyById: replyById, meetingsSorted: meetingsSorted, meetingById: meetingById, freeSlots: freeSlots,
    mut: mut
  };
})();
