/*
  MODEL: the proposals data and everything you can ask of it or do to it
  ----------------------------------------------------------------------
  Everything lives in one file, data/proposals.json, shared with Claude. This file knows its
  shape. Screens ask questions here ("what does this option cost with VAT?") and every change a
  click makes is a function here that edits the data. app.js saves those changes through the store.

  Sections of proposals.json (formatVersion 1):
    settings     name, business, money (VAT, payment terms, how long a proposal is valid),
                 the sections a proposal has, the brand, where client folders live
    packages     what they sell, each with its own price. Proposals point at these
    extras       optional add-ons with their own prices
    clients      one per client folder: what's in it and whether there's enough to write
    proposals    every proposal: the words Claude wrote, the options offered, its status
    requests     jobs waiting for Claude: write a proposal, change one, check the folders
    checkIn      when Claude last checked the client folders
    activity     a log of what happened

  Every number the person relies on (each option's price, VAT, totals, what's out, won this
  month) is worked out here from the packages, never typed in by Claude. Once a proposal is
  approved or sent, each option keeps its own copy of the package's name, price and length
  (option.snapshot), so changing or removing a package later never changes a proposal that is out.
*/
(function () {
  "use strict";

  window.PO = window.PO || {};
  const ui = window.TaskListOS.ui;

  // The sections every proposal has, in order. People rename them, switch them off and reorder
  // them in Preferences (settings.sections); the keys never change.
  const DEFAULT_SECTIONS = [
    { key: "about", label: "About you", on: true },
    { key: "challenge", label: "What's getting in the way", on: true },
    { key: "solution", label: "How we'll fix it", on: true },
    { key: "delivery", label: "How we'll deliver it", on: true },
    { key: "investment", label: "Your options", on: true },
    { key: "next", label: "Next steps", on: true },
    { key: "terms", label: "Terms", on: false }
  ];
  const SECTION_KEYS = DEFAULT_SECTIONS.map(function (s) { return s.key; });

  const STATUS = {
    writing: { label: "Claude is writing", tone: "info" },
    draft: { label: "Ready to check", tone: "accent" },
    approved: { label: "Approved", tone: "success" },
    sent: { label: "Sent", tone: "info" },
    won: { label: "Won", tone: "success" },
    lost: { label: "Lost", tone: "danger" }
  };
  const STATUS_ORDER = ["writing", "draft", "approved", "sent", "won", "lost"];

  const BILLING = [
    { key: "one-off", label: "One-off" },
    { key: "monthly", label: "A month" },
    { key: "yearly", label: "A year" },
    { key: "per-day", label: "A day" },
    { key: "per-hour", label: "An hour" }
  ];

  const SOURCE_KINDS = {
    call: "Call", notes: "Notes", email: "Email", brief: "Brief", document: "Document", proposal: "Old proposal", other: "File"
  };

  const DEFAULT_SETTINGS = {
    yourName: "", businessName: "", currency: "GBP", vatRegistered: false, vatRate: 20,
    paymentTerms: "", validDays: 30, chaseAfterDays: 7, autoWrite: true, clientsFolder: "files/02-clients",
    emailProvider: "gmail", proposalsSetUp: false, ownSkill: ""
  };

  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return v == null ? "" : String(v); }
  function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }

  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.proposals)) throw new Error('The file has no "proposals" list.');
  }

  // Fill in anything missing so the screens never trip over a half-written or older file.
  // Only tidies what is in memory; it is saved the next time something changes.
  function normalise(d) {
    d.formatVersion = 1;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    const s = d.settings;
    s.signOff = Object.assign({ name: "", role: "", email: "", phone: "" }, s.signOff || {});
    s.brand = Object.assign({ logo: "", logoOnColour: "", website: "", cover: "colour", setUp: false }, s.brand || {});
    s.template = Object.assign({ name: "", importedAt: null }, s.template || {});
    s.sections = useSections(s.sections);
    ["packages", "extras", "clients", "proposals", "requests", "activity"].forEach(function (k) { d[k] = arr(d[k]); });
    d.packages = d.packages.filter(function (p) { return p && p.id && p.name; });
    d.packages.forEach(function (p) { p.includes = arr(p.includes).map(str).filter(Boolean); p.price = num(p.price); if (!p.billing) p.billing = "one-off"; });
    d.extras = d.extras.filter(function (x) { return x && x.id && x.name; });
    d.extras.forEach(function (x) { x.price = num(x.price); if (!x.billing) x.billing = "one-off"; });
    d.clients = d.clients.filter(function (c) { return c && c.id && c.name; });
    d.clients.forEach(function (c) { c.sources = arr(c.sources).filter(function (f) { return f && (f.file || f.summary); }); c.missing = arr(c.missing); c.contact = Object.assign({ name: "", role: "", email: "" }, c.contact || {}); });
    d.proposals = d.proposals.filter(function (p) { return p && p.id; });
    d.proposals.forEach(function (p) { normaliseProposal(p); snapshotOptions(d, p, false); });
    d.requests = d.requests.filter(function (r) { return r && r.id && r.kind; });
    d.checkIn = Object.assign({ lastRunAt: null, foldersChecked: 0, proposalsWritten: 0 }, d.checkIn || {});
    return d;
  }
  function normaliseProposal(p) {
    if (!STATUS[p.status]) p.status = "draft";
    p.cover = Object.assign({ title: "", subtitle: "", preparedFor: { name: "", role: "", organisation: "" } }, p.cover || {});
    p.cover.preparedFor = Object.assign({ name: "", role: "", organisation: "" }, p.cover.preparedFor || {});
    p.sections = p.sections && typeof p.sections === "object" ? p.sections : {};
    const S = p.sections;
    S.about = Object.assign({ body: "", points: [] }, S.about || {});
    S.challenge = Object.assign({ body: "", pains: [] }, S.challenge || {});
    S.solution = Object.assign({ body: "", points: [] }, S.solution || {});
    S.delivery = Object.assign({ body: "", phases: [] }, S.delivery || {});
    S.investment = Object.assign({ body: "", options: [], extras: [] }, S.investment || {});
    S.next = Object.assign({ body: "", steps: [] }, S.next || {});
    S.terms = Object.assign({ body: "" }, S.terms || {});
    S.about.points = arr(S.about.points).map(str).filter(Boolean);
    S.challenge.pains = arr(S.challenge.pains).filter(function (x) { return x && (x.title || x.detail); });
    S.solution.points = arr(S.solution.points).filter(function (x) { return x && (x.title || x.detail); });
    S.delivery.phases = arr(S.delivery.phases).filter(function (x) { return x && (x.name || x.detail); });
    S.investment.options = arr(S.investment.options).filter(function (o) { return o && o.packageId; });
    S.investment.extras = arr(S.investment.extras).filter(function (o) { return o && o.extraId; });
    S.next.steps = arr(S.next.steps).filter(function (x) { return x && (x.title || x.detail); });
    p.gaps = arr(p.gaps).map(str).filter(Boolean);
    p.unpriced = arr(p.unpriced).filter(function (u) { return u && u.what; });
    p.sources = arr(p.sources).filter(function (f) { return f && (f.file || f.what); });
    p.timeline = arr(p.timeline).filter(function (e) { return e && e.at; });
    p.intro = str(p.intro);
  }

  // The person's sections, in their order. Every known section is always there exactly once.
  function useSections(list) {
    const out = [];
    arr(list).forEach(function (s) {
      if (!s || SECTION_KEYS.indexOf(s.key) === -1 || out.some(function (o) { return o.key === s.key; })) return;
      const def = DEFAULT_SECTIONS.find(function (x) { return x.key === s.key; });
      out.push({ key: s.key, label: str(s.label).trim().slice(0, 60) || def.label, on: s.on !== false });
    });
    DEFAULT_SECTIONS.forEach(function (def) { if (!out.some(function (o) { return o.key === def.key; })) out.push(Object.assign({}, def)); });
    return out;
  }
  function sectionsOn(d) { return d.settings.sections.filter(function (s) { return s.on; }); }
  function sectionLabel(d, key) { const s = d.settings.sections.find(function (x) { return x.key === key; }); return s ? s.label : key; }

  // ============================================================
  // Money: every price, VAT and total is worked out here
  // ============================================================

  function money(d, n, opts) {
    const value = num(n);
    const pence = opts && opts.pence ? 2 : Math.round(value) === value ? 0 : 2;
    try {
      return value.toLocaleString("en-GB", { style: "currency", currency: (d && d.settings.currency) || "GBP", minimumFractionDigits: pence, maximumFractionDigits: pence });
    } catch (e) { return "£" + value.toFixed(pence); }
  }
  function billingLabel(key) { const b = BILLING.find(function (x) { return x.key === key; }); return b ? b.label : "One-off"; }
  function billingSuffix(key) {
    return key === "monthly" ? " a month" : key === "yearly" ? " a year" : key === "per-day" ? " a day" : key === "per-hour" ? " an hour" : "";
  }

  function packageById(d, id) { return id ? d.packages.find(function (p) { return p.id === id; }) || null : null; }
  function extraById(d, id) { return id ? d.extras.find(function (x) { return x.id === id; }) || null : null; }

  // Once a proposal is approved or sent, each option keeps its own copy of what the package was
  // (name, price, billing, months and the wording shown), so the price on a proposal that is out
  // never moves when the package is changed or removed. Proposals made before this existed are
  // copied from the package as it is now, the first time they load, so their numbers stay the same.
  const LOCKED = ["approved", "sent", "won", "lost"];
  function snapshotOption(d, o, force) {
    if (!force && o.snapshot && o.snapshot.packageId === o.packageId) return;
    const pkg = packageById(d, o.packageId);
    if (!pkg) return;
    o.snapshot = { packageId: pkg.id, name: pkg.name, price: num(pkg.price), billing: pkg.billing || "one-off",
      months: pkg.billing === "monthly" ? Math.max(0, Math.round(num(pkg.months))) : 0,
      summary: str(pkg.summary), timeline: str(pkg.timeline), includes: arr(pkg.includes).map(str) };
  }
  function snapshotOptions(d, p, force) {
    if (LOCKED.indexOf(p.status) === -1) return;
    p.sections.investment.options.forEach(function (o) { snapshotOption(d, o, force); });
  }
  // What an option sells: the snapshot when there is one, otherwise the package as it is now
  function optionPackage(d, o) {
    const s = o.snapshot;
    if (s && s.packageId === o.packageId) {
      return { id: s.packageId, name: str(s.name), price: num(s.price), billing: s.billing || "one-off", months: num(s.months),
        summary: str(s.summary), timeline: str(s.timeline), includes: arr(s.includes).map(str) };
    }
    return packageById(d, o.packageId);
  }

  // One option in a proposal: the package's price (as it was when the proposal went out, if it has),
  // or the price the person set for this proposal (customPrice, only ever set in the app). Monthly
  // packages show the monthly price and, when the package has a length in months, the total over that time.
  function optionPrice(d, o) {
    const pkg = optionPackage(d, o);
    if (!pkg) return null;
    const unit = o.customPrice != null && o.customPrice !== "" ? num(o.customPrice) : pkg.price;
    const months = pkg.billing === "monthly" ? Math.max(0, Math.round(num(pkg.months))) : 0;
    const total = months ? unit * months : unit;
    const vat = d.settings.vatRegistered ? Math.round(total * num(d.settings.vatRate)) / 100 : 0;
    return { pkg: pkg, unit: unit, billing: pkg.billing, months: months, total: total, vat: vat, gross: total + vat, custom: unit !== pkg.price };
  }
  function extraPrice(d, e) {
    const x = extraById(d, e.extraId);
    if (!x) return null;
    const qty = Math.max(1, Math.round(num(e.qty) || 1));
    const total = x.price * qty;
    const vat = d.settings.vatRegistered ? Math.round(total * num(d.settings.vatRate)) / 100 : 0;
    return { extra: x, qty: qty, total: total, vat: vat, gross: total + vat };
  }
  function recommended(p) {
    const opts = p.sections.investment.options;
    return opts.find(function (o) { return o.recommended; }) || opts[0] || null;
  }
  // What a proposal is worth: the recommended option before VAT (its first year, for a monthly one).
  // A rate by the day or the hour has no total (nobody knows how many days), so it counts as 0 in
  // the totals and the screens say so; see ratesLeftOut.
  function isRate(pr) { return !!pr && (pr.billing === "per-day" || pr.billing === "per-hour"); }
  function proposalRate(d, p) {
    const o = recommended(p);
    const pr = o ? optionPrice(d, o) : null;
    return isRate(pr) ? pr : null;
  }
  function proposalValue(d, p) {
    const o = recommended(p);
    const pr = o ? optionPrice(d, o) : null;
    if (!pr || isRate(pr)) return 0;
    if (pr.billing === "monthly" && !pr.months) return pr.unit * 12;
    return pr.total;
  }

  // ============================================================
  // Questions the screens ask
  // ============================================================

  function proposalById(d, id) { return id ? d.proposals.find(function (p) { return p.id === id; }) || null : null; }
  function clientById(d, id) { return id ? d.clients.find(function (c) { return c.id === id; }) || null : null; }
  function clientFor(d, p) { return clientById(d, p.clientId); }
  function clientName(d, p) {
    const c = clientFor(d, p);
    return (c && c.name) || p.cover.preparedFor.organisation || p.title || "Proposal";
  }
  function proposalsFor(d, clientId) {
    return d.proposals.filter(function (p) { return p.clientId === clientId; }).sort(function (a, b) { return str(b.createdAt).localeCompare(str(a.createdAt)); });
  }
  function waitingRequests(d, kind) { return d.requests.filter(function (r) { return r.status === "waiting" && (!kind || r.kind === kind); }); }
  function requestFor(d, clientId) { return d.requests.find(function (r) { return r.status === "waiting" && r.kind === "write" && r.clientId === clientId; }) || null; }
  function changeWaiting(d, proposalId) { return d.requests.find(function (r) { return r.status === "waiting" && r.kind === "change" && r.proposalId === proposalId; }) || null; }

  function notSetUp(d) { return !d.settings.yourName && !d.proposals.length && !d.clients.length; }
  function needsPackages(d) { return !d.packages.length; }

  // Where a client is up to: a proposal on the way, one written, enough to write one, or not yet
  function clientState(d, c) {
    if (requestFor(d, c.id)) return "writing";
    const latest = proposalsFor(d, c.id)[0];
    if (latest) return latest.status;
    return c.ready === false ? "needs-more" : "ready";
  }

  function ageDays(at) {
    if (!at) return 0;
    const then = new Date(String(at).length === 10 ? at + "T12:00" : at);
    if (isNaN(then)) return 0;
    return Math.max(0, Math.round((ui.parseDate(ui.isoDate(new Date())) - ui.parseDate(ui.isoDate(then))) / 86400000));
  }
  function validUntil(d, p) {
    const from = p.sentAt || p.approvedAt || p.createdAt;
    if (!from || !num(d.settings.validDays)) return null;
    return ui.addDays(new Date(from), num(d.settings.validDays));
  }
  function needsChase(d, p) { return p.status === "sent" && ageDays(p.sentAt) >= num(d.settings.chaseAfterDays || 7); }

  function byStatus(d, status) { return d.proposals.filter(function (p) { return p.status === status; }); }
  function isOpen(p) { return p.status !== "won" && p.status !== "lost"; }

  // The numbers along the top of the Proposals page
  function numbers(d) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const since90 = ui.addDays(now, -90);
    const sent = byStatus(d, "sent");
    const won = byStatus(d, "won");
    const wonMonth = won.filter(function (p) { return p.closedAt && new Date(p.closedAt) >= monthStart; });
    const closed90 = d.proposals.filter(function (p) { return (p.status === "won" || p.status === "lost") && p.closedAt && new Date(p.closedAt) >= since90; });
    const won90 = closed90.filter(function (p) { return p.status === "won"; });
    return {
      toCheck: byStatus(d, "draft").length,
      writing: byStatus(d, "writing").length + waitingRequests(d, "write").length,
      sentCount: sent.length,
      sentRates: sent.filter(function (p) { return !!proposalRate(d, p); }).length,
      wonMonthRates: wonMonth.filter(function (p) { return !!proposalRate(d, p); }).length,
      sentValue: sent.reduce(function (sum, p) { return sum + proposalValue(d, p); }, 0),
      wonMonthCount: wonMonth.length,
      wonMonthValue: wonMonth.reduce(function (sum, p) { return sum + proposalValue(d, p); }, 0),
      winRate: closed90.length >= 3 ? Math.round(won90.length / closed90.length * 100) : null
    };
  }

  function search(d, q) {
    const t = str(q).trim().toLowerCase();
    if (!t) return { proposals: [], clients: [] };
    const hit = function (s) { return str(s).toLowerCase().indexOf(t) > -1; };
    return {
      proposals: d.proposals.filter(function (p) { return hit(p.title) || hit(clientName(d, p)) || hit(p.cover.title); }).slice(0, 8),
      clients: d.clients.filter(function (c) { return hit(c.name) || hit(c.contact.name) || hit(c.summary); }).slice(0, 8)
    };
  }

  // A path inside a proposal, such as "sections.challenge.pains.0.title"
  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    const parts = path.split(".");
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== "object") return false;
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
    return true;
  }
  // Only words can be edited in place: never prices, ids or statuses
  const EDITABLE = /^(intro|cover\.(title|subtitle)|sections\.(about|challenge|solution|delivery|investment|next|terms)\.body|sections\.about\.points\.\d+|sections\.challenge\.pains\.\d+\.(title|detail|quote)|sections\.solution\.points\.\d+\.(title|detail)|sections\.delivery\.phases\.\d+\.(name|when|detail)|sections\.investment\.options\.\d+\.why|sections\.next\.steps\.\d+\.(title|detail))$/;

  // ============================================================
  // Changes (each edits the data it's given; app.js saves it)
  // ============================================================

  function now() { return new Date().toISOString(); }
  function log(d, entry) { d.activity.push(Object.assign({ at: now() }, entry)); if (d.activity.length > 500) d.activity.splice(0, d.activity.length - 500); }
  function slugId(prefix, name, list) {
    const base = prefix + "-" + (str(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || Math.random().toString(36).slice(2, 8));
    let id = base, n = 2;
    while (list.some(function (x) { return x.id === id; })) id = base + "-" + n++;
    return id;
  }
  // A folder name that works on Mac and Windows
  function folderName(name) { return str(name).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "New client"; }

  const mut = {
    // A client typed into the app: Claude makes the folder when it writes the proposal
    addClient: function (d, fields) {
      const name = str(fields.name).trim();
      const existing = d.clients.find(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
      if (existing) return existing;
      const c = { id: slugId("c", name, d.clients), name: name, folder: d.settings.clientsFolder.replace(/\/+$/, "") + "/" + folderName(name),
        contact: { name: str(fields.contact).trim(), role: "", email: str(fields.email).trim() }, summary: "", sources: [], missing: [], addedBy: "you", addedAt: now() };
      d.clients.push(c);
      log(d, { type: "client-added", clientId: c.id });
      return c;
    },
    // Ask Claude to write a proposal for a client (with any notes typed or dropped into the app)
    requestWrite: function (d, clientId, notes, fileName) {
      const c = clientById(d, clientId);
      if (!c) return null;
      const already = requestFor(d, clientId);
      if (already) {
        if (str(notes).trim()) already.notes = (already.notes ? already.notes + "\n\n" : "") + str(notes).slice(0, 60000);
        return already;
      }
      const r = { id: ui.makeId("r"), kind: "write", clientId: clientId, notes: str(notes).slice(0, 60000), fileName: str(fileName), status: "waiting", addedAt: now() };
      d.requests.push(r);
      log(d, { type: "write-asked", clientId: clientId });
      return r;
    },
    requestChange: function (d, proposalId, instruction) {
      const p = proposalById(d, proposalId);
      if (!p || !str(instruction).trim()) return null;
      const r = { id: ui.makeId("r"), kind: "change", proposalId: proposalId, clientId: p.clientId, instruction: str(instruction).trim().slice(0, 4000), status: "waiting", addedAt: now() };
      d.requests.push(r);
      log(d, { type: "change-asked", proposalId: proposalId });
      return r;
    },
    requestScan: function (d) {
      if (waitingRequests(d, "scan").length) return null;
      const r = { id: ui.makeId("r"), kind: "scan", status: "waiting", addedAt: now() };
      d.requests.push(r);
      return r;
    },
    cancelRequest: function (d, id) {
      const r = d.requests.find(function (x) { return x.id === id; });
      if (r && r.status === "waiting") { r.status = "cancelled"; r.doneAt = now(); }
    },
    editText: function (d, proposalId, path, value) {
      const p = proposalById(d, proposalId);
      if (!p || !EDITABLE.test(path)) return false;
      const ok = setPath(p, path, str(value).replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim());
      if (ok) { p.editedAt = now(); p.updatedAt = p.editedAt; }
      return ok;
    },
    setStatus: function (d, proposalId, status, extra) {
      const p = proposalById(d, proposalId);
      if (!p || !STATUS[status]) return;
      const from = p.status;
      p.status = status;
      p.updatedAt = now();
      if (status === "approved") p.approvedAt = p.updatedAt;
      if (status === "sent") p.sentAt = p.sentAt || p.updatedAt;
      if (status === "approved" || status === "sent") snapshotOptions(d, p, false);
      if (status === "won" || status === "lost") p.closedAt = p.updatedAt; else delete p.closedAt;
      if (status === "lost" && extra && extra.reason) p.lostReason = str(extra.reason).slice(0, 200);
      if (status !== "lost") delete p.lostReason;
      p.timeline.push({ at: p.updatedAt, kind: "status", from: from, to: status, by: "you" });
      log(d, { type: "status", proposalId: proposalId, from: from, to: status });
    },
    setRecommended: function (d, proposalId, index) {
      const p = proposalById(d, proposalId);
      if (!p) return;
      p.sections.investment.options.forEach(function (o, i) { o.recommended = i === index; });
      p.editedAt = p.updatedAt = now();
    },
    // A price for this proposal only. Only ever set here, by the person; never by Claude.
    setCustomPrice: function (d, proposalId, index, value) {
      const p = proposalById(d, proposalId);
      const o = p && p.sections.investment.options[index];
      if (!o) return;
      if (value === "" || value == null) delete o.customPrice; else o.customPrice = Math.max(0, num(value));
      p.editedAt = p.updatedAt = now();
    },
    followUpOpened: function (d, proposalId) {
      const p = proposalById(d, proposalId);
      if (p && p.followUp) p.followUp.openedAt = now();
    },
    coverEmailOpened: function (d, proposalId) {
      const p = proposalById(d, proposalId);
      if (p && p.coverEmail) p.coverEmail.openedAt = now();
    },
    deleteProposal: function (d, proposalId) {
      const i = d.proposals.findIndex(function (p) { return p.id === proposalId; });
      if (i === -1) return null;
      const removed = d.proposals.splice(i, 1)[0];
      log(d, { type: "deleted", proposalId: proposalId });
      return { item: removed, index: i };
    },
    restoreProposal: function (d, removed) {
      if (!removed || proposalById(d, removed.item.id)) return;
      d.proposals.splice(Math.min(removed.index, d.proposals.length), 0, removed.item);
    },
    setPackages: function (d, packages, extras, money) {
      d.packages = packages;
      d.extras = extras;
      Object.assign(d.settings, money);
      log(d, { type: "prices-changed" });
    },
    setPreferences: function (d, values, sections) {
      Object.assign(d.settings, values);
      d.settings.sections = useSections(sections);
    }
  };

  window.PO.model = {
    DEFAULT_SECTIONS: DEFAULT_SECTIONS, STATUS: STATUS, STATUS_ORDER: STATUS_ORDER, BILLING: BILLING, SOURCE_KINDS: SOURCE_KINDS,
    validate: validate, normalise: normalise, sectionsOn: sectionsOn, sectionLabel: sectionLabel,
    money: money, billingLabel: billingLabel, billingSuffix: billingSuffix,
    packageById: packageById, optionPackage: optionPackage, proposalRate: proposalRate, extraById: extraById, optionPrice: optionPrice, extraPrice: extraPrice, recommended: recommended, proposalValue: proposalValue,
    proposalById: proposalById, clientById: clientById, clientFor: clientFor, clientName: clientName, proposalsFor: proposalsFor,
    waitingRequests: waitingRequests, requestFor: requestFor, changeWaiting: changeWaiting,
    notSetUp: notSetUp, needsPackages: needsPackages, clientState: clientState, ageDays: ageDays, validUntil: validUntil, needsChase: needsChase,
    byStatus: byStatus, isOpen: isOpen, numbers: numbers, search: search, getPath: getPath, EDITABLE: EDITABLE, folderName: folderName, slugId: slugId,
    mut: mut
  };
})();
