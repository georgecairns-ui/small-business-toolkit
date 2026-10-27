/*
  MODEL: the rules of Money View OS, as plain functions
  -----------------------------------------------------
  No screen code in here. Every page, the invoice drawer and the Home boxes ask these
  functions, so every figure means the same thing everywhere. It also runs under Node, which is how
  maintainers/test-model.js checks it.

  The data file is apps/money/data/money.json. Dates are "YYYY-MM-DD" text; timestamps are UTC text.
  Money is kept in pounds in the file (positive numbers, up to 2 decimals). Inside this file every sum
  is worked in whole pence and rounded half up to the penny at each line, then handed back in pounds,
  so a total never drifts by a penny. Nothing here changes the file by itself: the functions that edit
  (logActivity, newInvoice and so on) are used inside store.update() by the app.

  How the forecast reads the file (one set of rules, used by forecast, months and comingUp):
  - Money in: every invoice that is sent or sitting in the accounts app and not fully paid, for what is
    still owed, on its due date (an overdue one counts today, so in the first week). Then every expected
    item that is "confirmed" (a "maybe" only when the maybes switch is on).
  - Money out: every outgoing that is "confirmed", on each date it repeats, then the tax dates.
  - What ifs (scenarios) are added on top only when their id is listed.
  - A repeating item starts on its "date" and carries on from there, so a rent that began in January
    is still in October's list.
*/
(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const DAY_MS = 86400000;
  const CAPS = { transactions: 3000, imports: 100, activity: 200 };

  const INVOICE_STATUSES = ["draft", "waiting", "in-accounts", "sent", "void", "linked"];
  // Where a record came from is one of: accounts, you, ads, pipeline, proposals, claude. Older files may say "xero",
  // "statement" or "bank": normalise turns those into "accounts".
  const OLD_ACCOUNTS_SOURCES = ["xero", "quickbooks", "statement", "bank"];
  const REPEATS = ["none", "weekly", "monthly", "quarterly", "yearly"];
  const OUT_CATEGORIES = [
    { key: "bills", label: "Bills" }, { key: "staff", label: "Staff" }, { key: "rent", label: "Rent" }, { key: "software", label: "Software" },
    { key: "suppliers", label: "Suppliers" }, { key: "loan", label: "Loans" }, { key: "tax", label: "Tax" }, { key: "ads", label: "Advertising" }, { key: "other", label: "Other" }
  ];
  // Wages, loan payments and tax carry no VAT to reclaim, whatever the box says
  const NO_VAT_CATEGORIES = ["staff", "loan", "tax"];
  const STATE_LABELS = {
    draft: "Draft", waiting: "Waiting for Claude", "in-accounts": "Waiting for you to send", sent: "Sent", "part-paid": "Part paid", paid: "Paid", overdue: "Overdue", void: "Cancelled", linked: "Linked"
  };
  // The accounts apps Money View works with (Xero today, QuickBooks where Intuit's connector shows in Claude): name, the app's home page and the page that starts a new invoice
  const APPS = {
    xero: { name: "Xero", home: "https://go.xero.com/", newInvoice: "https://go.xero.com/AccountsReceivable/Edit.aspx" },
    quickbooks: { name: "QuickBooks", home: "https://app.qbo.intuit.com/", newInvoice: "https://app.qbo.intuit.com/app/invoice" }
  };
  // The entry for the app named in sources.accounts.app (any spelling of "Xero", "xero" or "Sage Accounting"), or null
  function appInfo(data) {
    const a = String(data && data.sources && data.sources.accounts && data.sources.accounts.app || "").toLowerCase();
    const key = Object.keys(APPS).filter(function (k) { return a.indexOf(k) !== -1; })[0];
    return key ? Object.assign({ key: key }, APPS[key]) : null;
  }
  const NO_DATA_LINE = "Add your bank balance and your regular bills and this will show your tightest week.";
  const DISCLAIMER = "Estimates to help you plan, not financial advice. Check big decisions with your accountant.";

  const DEFAULT_SETTINGS = {
    businessName: "", ownerName: "", currency: "GBP", businessType: "", yearStart: "04-06", weekStarts: 1, nervousBalance: 0,
    vat: { registered: false, scheme: "standard", rate: 20, flatRate: 0, quarterEnds: [3, 6, 9, 12], cashAccounting: false },
    tax: { setAsidePercent: 0, potAccountId: null, note: "" },
    invoice: { prefix: "INV-", nextNumber: 1, termsDays: 30 },
    bank: { name: "", link: "" }
  };
  const DEFAULT_SOURCES = { accounts: { app: "", mode: "none", checkedAt: null }, bank: { mode: "none", checkedAt: null } };

  // ---------- Pence ----------
  // Round half up to a whole number (the small nudge stops 1.005 pounds landing on the wrong side)
  function rp(x) { return x < 0 ? -Math.round(-x + 1e-9) : Math.round(x + 1e-9); }
  function toP(pounds) { const n = Number(pounds); return isFinite(n) ? rp(n * 100) : 0; }
  function fromP(pence) { return rp(pence) / 100; }
  function num(v, fallback) { const n = Number(v); return isFinite(n) ? n : (fallback || 0); }

  // ---------- Dates (worked in UTC so clock changes never move a day) ----------
  function parseIso(iso) {
    const p = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function toIso(d) { return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { return toIso(new Date(parseIso(iso).getTime() + n * DAY_MS)); }
  function daysBetween(a, b) { return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / DAY_MS); }
  // A real calendar day written as YYYY-MM-DD (not "2026-02-31", not a timestamp), else null
  function validIso(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return toIso(parseIso(value)) === value ? value : null;
  }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }   // m is 1 to 12
  function ymd(iso) { const p = iso.split("-").map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function make(y, m, d) { return y + "-" + pad2(m) + "-" + pad2(d); }
  // n months on, keeping the day of the month asked for but never past the end of that month
  function addMonthsKeep(iso, n, day) {
    const p = ymd(iso), idx = p.y * 12 + (p.m - 1) + n;
    const y = Math.floor(idx / 12), m = idx % 12 + 1;
    return make(y, m, Math.min(day || p.d, daysInMonth(y, m)));
  }
  function monthKey(iso) { return iso.slice(0, 7); }
  function addMonthsKey(key, n) { return monthKey(addMonthsKeep(key + "-01", n, 1)); }
  function monthStart(key) { return key + "-01"; }
  function monthEnd(key) { const y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7)); return make(y, m, daysInMonth(y, m)); }
  function monthsBetween(a, b) { const x = ymd(a), y = ymd(b); return (y.y - x.y) * 12 + (y.m - x.m); }
  // The first day of the week the date is in (weekStarts 1 = Monday, 0 = Sunday)
  function startOfWeekIso(iso, weekStarts) {
    const dow = parseIso(iso).getUTCDay();   // 0 is Sunday
    return addDays(iso, -(Number(weekStarts) === 0 ? dow : (dow + 6) % 7));
  }
  function weekStartsOf(data) { return Number(data && data.settings && data.settings.weekStarts) === 0 ? 0 : 1; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dayLabel(iso) { const p = ymd(iso); return p.d + " " + MONTHS[p.m - 1]; }
  function weekLabel(iso) { return "w/c " + dayLabel(iso); }
  function monthLabel(key) { return MONTHS[Number(key.slice(5, 7)) - 1] + " " + key.slice(0, 4); }
  function nowIso() { return new Date().toISOString(); }
  function makeId(prefix) { return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 8); }

  // ---------- Reading what the file says ----------
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function list(d, key) { return d && Array.isArray(d[key]) ? d[key].filter(isObj) : []; }
  function settingsOf(data) { return (data && data.settings) || DEFAULT_SETTINGS; }
  function vatOf(data) { return Object.assign({}, DEFAULT_SETTINGS.vat, settingsOf(data).vat || {}); }
  function appName(data) {
    const a = data && data.sources && data.sources.accounts && data.sources.accounts.app;
    return a && String(a).trim() ? String(a).trim() : "your accounts app";
  }
  function isSetUp(data) {
    const name = data && data.settings && data.settings.businessName;
    return !!(name && String(name).trim()) || list(data, "accounts").length > 0 || list(data, "invoices").length > 0;
  }

  // ---------- Money on screen ----------
  // "£1,234.56", or "£1,235" with { round: true }. A minus sits before the pound sign.
  function money(n, opts) {
    const o = opts || {};
    let pence = toP(n);
    if (o.round) pence = Math.round(Math.abs(pence) / 100) * 100 * (pence < 0 ? -1 : 1);
    const neg = pence < 0, abs = Math.abs(pence);
    const whole = Math.floor(abs / 100), cents = abs % 100;
    const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const body = "£" + grouped + (o.round ? "" : "." + pad2(cents));
    return (neg && abs > 0 ? "-" : "") + body;
  }

  // ---------- Invoices ----------
  function lineParts(line, fallbackRate) {
    const net = toP(num(line && line.qty, 0) * num(line && line.price, 0));
    const rate = line && line.vatRate != null && line.vatRate !== "" ? num(line.vatRate, 0) : fallbackRate || 0;
    return { net: net, vat: rp(net * rate / 100) };
  }
  // { net, vat, gross } in pounds, from the lines (qty x price, VAT per line at its own rate)
  function invoiceTotals(inv) {
    let net = 0, vat = 0;
    ((inv && inv.lines) || []).forEach(function (l) { const p = lineParts(l, 0); net += p.net; vat += p.vat; });
    return { net: fromP(net), vat: fromP(vat), gross: fromP(net + vat) };
  }
  function invoicePaid(inv) {
    return fromP(((inv && inv.payments) || []).reduce(function (s, p) { return s + toP(p && p.amount); }, 0));
  }
  function invoiceOutstanding(inv) {
    return fromP(Math.max(0, toP(invoiceTotals(inv).gross) - toP(invoicePaid(inv))));
  }
  // draft, waiting, in-accounts, sent, part-paid, paid, overdue, void or linked. Paid, part paid and overdue are
  // worked out from the payments and the due date, never stored. "linked" is a draft note whose real invoice has
  // arrived from the accounts app: it is closed, hidden from the list and left out of every count.
  function invoiceState(inv, today) {
    const s = inv && inv.status;
    if (s === "void" || s === "linked") return s;
    if (s === "draft" || s === "waiting") return s;
    const gross = toP(invoiceTotals(inv).gross), paid = toP(invoicePaid(inv));
    if (paid >= gross && (gross > 0 || paid > 0)) return "paid";
    const due = validIso(inv && inv.dueDate);
    if (due && today && due < today) return "overdue";
    if (paid > 0) return "part-paid";
    return s === "in-accounts" ? "in-accounts" : "sent";
  }
  function daysOverdue(inv, today) {
    if (invoiceState(inv, today) !== "overdue") return 0;
    return Math.max(0, daysBetween(validIso(inv.dueDate), today));
  }
  // Sent or in the accounts app, and not fully paid
  function isUnpaid(state) { return state === "sent" || state === "in-accounts" || state === "part-paid" || state === "overdue"; }
  function nextInvoiceNumber(settings, invoices) {
    const inv = (settings && settings.invoice) || DEFAULT_SETTINGS.invoice;
    const prefix = typeof inv.prefix === "string" ? inv.prefix : "INV-";
    const used = {};
    (invoices || []).forEach(function (i) { if (i && i.number) used[String(i.number)] = true; });
    let n = Math.max(1, Math.floor(num(inv.nextNumber, 1)));
    while (used[prefix + String(n).padStart(4, "0")]) n += 1;
    return prefix + String(n).padStart(4, "0");
  }
  // The number from the end of "INV-0042" (for moving settings.invoice.nextNumber on), or null
  function numberOf(text) { const m = /(\d+)\s*$/.exec(String(text || "")); return m ? Number(m[1]) : null; }
  // A blank draft: issued today, due after the usual terms, one empty line. Pass the invoices already in the
  // file as the third argument to give it the next number; without them the number is left empty.
  function newInvoice(settings, today, invoices) {
    const s = settings || DEFAULT_SETTINGS, inv = s.invoice || DEFAULT_SETTINGS.invoice, vat = s.vat || DEFAULT_SETTINGS.vat;
    const terms = Math.max(0, Math.floor(num(inv.termsDays, 30)));
    const now = nowIso();
    return {
      id: makeId("i"), number: invoices ? nextInvoiceNumber(s, invoices) : "", customer: "", email: "",
      issueDate: today, dueDate: addDays(today, terms),
      lines: [{ id: makeId("l"), text: "", qty: 1, price: 0, vatRate: vat.registered ? num(vat.rate, 20) : 0 }],
      status: "draft", payments: [], where: "here", ref: "", request: null, chaser: null,
      source: "you", notes: "", createdAt: now, updatedAt: now
    };
  }
  // A blank draft for the file as it stands. The number is suggested only when Claude can put drafts in the accounts
  // app (mode "drafts"); otherwise the accounts app numbers the invoice and the box is left empty.
  function newInvoiceFor(data, today) {
    const drafts = !!(data && data.sources && data.sources.accounts && data.sources.accounts.mode === "drafts");
    return newInvoice(settingsOf(data), today, drafts ? list(data, "invoices") : undefined);
  }
  // Where an invoice lives, in words: Money View, "Xero draft" or "In Xero"
  function invoiceWhere(inv, data) {
    if (inv.where === "accounts") return "In " + appName(data);
    if (inv.status === "in-accounts") return (appName(data) === "your accounts app" ? "Accounts app" : appName(data)) + " draft";
    if (inv.status === "waiting") return "Money View (waiting)";
    return "Money View";
  }
  function stateLabel(state) { return STATE_LABELS[state] || state; }
  function customers(data) {
    const seen = {}, out = [];
    list(data, "invoices").forEach(function (i) {
      const c = String(i.customer || "").trim();
      if (c && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = true; out.push(c); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b); });
  }
  // VAT inside a payment, in pence: the payment's share of the invoice's VAT
  function vatShareP(inv, payP) {
    const t = invoiceTotals(inv), gross = toP(t.gross);
    return gross > 0 ? rp(payP * toP(t.vat) / gross) : 0;
  }

  // ---------- Cash today ----------
  function cashToday(data) {
    const accounts = list(data, "accounts").map(function (a) {
      const signed = a.kind === "card" ? -Math.abs(num(a.balance)) : num(a.balance);
      return Object.assign({}, a, { signed: fromP(toP(signed)) });
    });
    const total = accounts.reduce(function (s, a) { return s + toP(a.signed); }, 0);
    const dates = accounts.map(function (a) { return validIso(a.asAt); }).filter(Boolean).sort();
    return { total: fromP(total), asAt: dates.length ? dates[0] : null, accounts: accounts };
  }
  function staleDays(data, today) {
    const at = cashToday(data).asAt;
    return at ? Math.max(0, daysBetween(at, today)) : null;
  }
  // "From Xero", "Estimate" or "You typed it", with the date when there is one: "From Xero, 21 Oct"
  function sourceLabel(source, data, asAt) {
    let text;
    if (source === "accounts") text = "From " + (appName(data) === "your accounts app" ? "your accounts app" : appName(data));
    else if (source === "estimate") text = "Estimate";
    else text = "You typed it";
    return text + (asAt && validIso(asAt) ? ", " + dayLabel(asAt) : "");
  }
  // The one source line for a whole set of accounts (top bar, stats): "From Xero, 21 Oct" or "You typed it, 18 Oct"
  function cashSource(data) {
    const c = cashToday(data);
    if (!c.accounts.length) return "";
    const kinds = {};
    c.accounts.forEach(function (a) { kinds[a.source || "you"] = true; });
    const keys = Object.keys(kinds);
    return keys.length === 1 ? sourceLabel(keys[0], data, c.asAt) : "From several places" + (c.asAt ? ", oldest " + dayLabel(c.asAt) : "");
  }

  // ---------- Owed to you ----------
  function owed(data, today) {
    const rows = [];
    list(data, "invoices").forEach(function (inv) {
      const state = invoiceState(inv, today);
      if (!isUnpaid(state)) return;
      const out = invoiceOutstanding(inv);
      if (out <= 0) return;
      rows.push({ invoice: inv, outstanding: out, state: state, daysOverdue: daysOverdue(inv, today), dueDate: validIso(inv.dueDate) });
    });
    rows.sort(function (a, b) {
      if ((a.state === "overdue") !== (b.state === "overdue")) return a.state === "overdue" ? -1 : 1;
      return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
    });
    let total = 0, overdue = 0, overdueCount = 0;
    rows.forEach(function (r) { total += toP(r.outstanding); if (r.state === "overdue") { overdue += toP(r.outstanding); overdueCount += 1; } });
    return { total: fromP(total), overdue: fromP(overdue), count: rows.length, overdueCount: overdueCount, list: rows };
  }

  // ---------- Repeating dates ----------
  const STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
  // The dates a repeating item falls on between from and to (both counted). An outgoing starts on "date" and a what-if
  // change on "from"; it stops at "endDate" (or the change's "to"). Monthly keeps the day, clamped to the month's end:
  // from the 31st it gives 31 Jan, 28 Feb (29 in a leap year), 31 Mar, 30 Apr.
  function occurrences(item, from, to) {
    const start = validIso(item && (item.date || item.from));
    if (!start || !validIso(from) || !validIso(to)) return [];
    const end = validIso(item.endDate || item.to);
    const limit = end && end < to ? end : to;
    const repeat = REPEATS.indexOf(item.repeat) === -1 ? "none" : item.repeat;
    const out = [];
    if (repeat === "none") {
      if (start >= from && start <= limit) out.push(start);
      return out;
    }
    if (repeat === "weekly") {
      let k = start < from ? Math.ceil(daysBetween(start, from) / 7) : 0;
      for (let i = 0; i < 3000; i += 1, k += 1) {
        const d = addDays(start, k * 7);
        if (d > limit) break;
        out.push(d);
      }
      return out;
    }
    const step = STEP_MONTHS[repeat], day = ymd(start).d;
    let k = Math.max(0, Math.floor(monthsBetween(start, from) / step) - 1);
    for (let i = 0; i < 3000; i += 1, k += 1) {
      const d = addMonthsKeep(start, k * step, day);
      if (d > limit) break;
      if (d >= from) out.push(d);
    }
    return out;
  }
  function monthlyEquivalent(item) {
    const a = num(item && item.amount);
    switch (item && item.repeat) {
      case "weekly": return fromP(rp(toP(a) * 52 / 12));
      case "monthly": return a;
      case "quarterly": return fromP(rp(toP(a) / 3));
      case "yearly": return fromP(rp(toP(a) / 12));
      default: return 0;
    }
  }
  // What the confirmed regular outgoings come to in a month (one-off ones are left out)
  function monthlyOutTotal(data) {
    let p = 0;
    list(data, "outgoings").forEach(function (o) { if (o.status === "confirmed" && o.repeat && o.repeat !== "none") p += toP(monthlyEquivalent(o)); });
    return fromP(p);
  }

  // ---------- Tax and VAT dates ----------
  function quarterEndMonths(data) {
    const q = vatOf(data).quarterEnds;
    const ok = (Array.isArray(q) ? q : []).map(Number).filter(function (m) { return m >= 1 && m <= 12 && Math.floor(m) === m; });
    const uniq = ok.filter(function (m, i) { return ok.indexOf(m) === i; }).sort(function (a, b) { return a - b; });
    return uniq.length ? uniq : [3, 6, 9, 12];
  }
  // HMRC gives 1 month and 7 days after the quarter ends. A quarter ends on the last day of a month, so the month
  // after ends on the last day of the next month: 30 Sep gives 31 Oct, then 7 Nov. Checked: 31 Mar gives 7 May,
  // 30 Jun gives 7 Aug, 31 Dec gives 7 Feb.
  function vatDueDate(endIso) {
    const p = ymd(endIso), idx = p.y * 12 + (p.m - 1) + 1;
    const y = Math.floor(idx / 12), m = idx % 12 + 1;
    return addDays(make(y, m, daysInMonth(y, m)), 7);
  }
  // Every VAT quarter that could touch the date range, oldest first: { start, end, dueDate }
  function quarterList(data, from, to) {
    const ends = quarterEndMonths(data), ys = ymd(from).y, ye = ymd(to).y, all = [];
    for (let y = ys - 2; y <= ye + 1; y += 1) ends.forEach(function (m) { all.push(make(y, m, daysInMonth(y, m))); });
    all.sort();
    const out = [];
    for (let i = 1; i < all.length; i += 1) out.push({ start: addDays(all[i - 1], 1), end: all[i], dueDate: vatDueDate(all[i]) });
    return out;
  }
  // The current VAT quarter: the one today falls in
  function quarterAt(data, iso) {
    return quarterList(data, iso, iso).filter(function (q) { return q.start <= iso && iso <= q.end; })[0];
  }
  function inRange(iso, a, b) { return !!iso && iso >= a && iso <= b; }
  function liveInvoices(data) { return list(data, "invoices").filter(function (i) { return i.status !== "void" && i.status !== "linked"; }); }
  // An invoice that is in the accounts app: a draft there, sent, or read from there. Drafts and invoices still waiting
  // for Claude are only in Money View, so they count for nothing yet (no VAT, not invoiced).
  function inAccountsApp(i) { return i.status === "in-accounts" || i.status === "sent" || (i.where === "accounts" && i.status !== "void" && i.status !== "linked"); }
  function accountsInvoices(data) { return list(data, "invoices").filter(inAccountsApp); }

  // The VAT worked out for any date range (start to end), in pence: { out, inn }
  function vatFor(data, start, end) {
    const v = vatOf(data);
    if (!v.registered) return { out: 0, inn: 0 };
    let out = 0, inn = 0;
    if (v.scheme === "flat") {
      let received = 0;
      liveInvoices(data).forEach(function (i) { (i.payments || []).forEach(function (p) { if (inRange(validIso(p.date), start, end)) received += toP(p.amount); }); });
      out = rp(received * num(v.flatRate) / 100);
      return { out: out, inn: 0 };
    }
    if (v.cashAccounting) {
      liveInvoices(data).forEach(function (i) { (i.payments || []).forEach(function (p) { if (inRange(validIso(p.date), start, end)) out += vatShareP(i, toP(p.amount)); }); });
    } else {
      accountsInvoices(data).forEach(function (i) { if (inRange(validIso(i.issueDate), start, end)) out += toP(invoiceTotals(i).vat); });
    }
    const rate = num(v.rate, 20);
    list(data, "outgoings").forEach(function (o) {
      if (o.status !== "confirmed" || o.vatIncluded === false || NO_VAT_CATEGORIES.indexOf(o.category) !== -1) return;
      occurrences(o, start, end).forEach(function () { inn += rp(toP(o.amount) * rate / (100 + rate)); });
    });
    return { out: out, inn: inn };
  }
  // The current VAT quarter and what it comes to so far (an estimate)
  function vatQuarter(data, today) {
    const q = quarterAt(data, today), v = vatOf(data), f = vatFor(data, q.start, q.end);
    return {
      start: q.start, end: q.end, dueDate: q.dueDate, registered: !!v.registered, scheme: v.scheme, estimate: true,
      outputVat: fromP(f.out), inputVat: fromP(f.inn), owed: fromP(f.out - f.inn)
    };
  }
  // Has the owner typed their own tax outgoing within 2 weeks of the date? A VAT one is told apart by "VAT" in its name.
  function nearTaxOutgoing(data, iso, isVat) {
    return list(data, "outgoings").some(function (o) {
      return o.status === "confirmed" && o.category === "tax" && /vat/i.test(String(o.name || "")) === isVat && occurrences(o, addDays(iso, -14), addDays(iso, 14)).length > 0;
    });
  }
  // The estimated tax outgoings between two dates: VAT returns, then (sole traders and partners) 31 January and 31 July,
  // or (limited companies) corporation tax 9 months and 1 day after the year end, which is the start of the next
  // year plus 9 months. Income and corporation tax come with amount 0 and askAccountant true: the app never works
  // them out. One the owner typed as an outgoing in the category "tax" nearby is left out so it isn't counted twice.
  function taxBetween(data, from, to) {
    const out = [], type = settingsOf(data).businessType;
    quarterList(data, from, to).forEach(function (q) {
      if (!vatOf(data).registered || !inRange(q.dueDate, from, to) || nearTaxOutgoing(data, q.dueDate, true)) return;
      const f = vatFor(data, q.start, q.end);
      out.push({ date: q.dueDate, name: "VAT return", detail: "quarter to " + dayLabel(q.end), amount: fromP(Math.max(0, f.out - f.inn)), dir: "out", kind: "tax", what: "vat", estimate: true, askAccountant: false });
    });
    if (type === "sole-trader" || type === "partnership") {
      for (let y = ymd(from).y; y <= ymd(to).y; y += 1) {
        [[1, "January"], [7, "July"]].forEach(function (pair) {
          const date = make(y, pair[0], 31);
          if (inRange(date, from, to) && !nearTaxOutgoing(data, date, false)) {
            out.push({ date: date, name: "Income tax payment", detail: "31 " + pair[1] + ", ask your accountant", amount: 0, dir: "out", kind: "tax", what: "income-tax", estimate: true, askAccountant: true });
          }
        });
      }
    } else if (type === "limited") {
      const ys = (settingsOf(data).yearStart || "04-06").split("-").map(Number);
      for (let y = ymd(from).y - 2; y <= ymd(to).y; y += 1) {
        const start = make(y, ys[0] || 4, Math.min(ys[1] || 6, daysInMonth(y, ys[0] || 4)));
        const date = addMonthsKeep(start, 9, ymd(start).d);
        if (inRange(date, from, to) && !nearTaxOutgoing(data, date, false)) {
          out.push({ date: date, name: "Corporation tax", detail: "9 months and 1 day after your year end, ask your accountant", amount: 0, dir: "out", kind: "tax", what: "corporation-tax", estimate: true, askAccountant: true });
        }
      }
    }
    return out.sort(function (a, b) { return a.date.localeCompare(b.date); });
  }
  function horizonEnd(data, today, weeks) { return addDays(startOfWeekIso(today, weekStartsOf(data)), weeks * 7 - 1); }
  function taxDates(data, today, weeks) { return taxBetween(data, today, horizonEnd(data, today, weeks == null ? 12 : weeks)); }

  // ---------- The forecast ----------
  function sameName(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() && String(a || "").trim() !== ""; }

  function optsOf(opts) { return { scenarioIds: (opts && opts.scenarioIds) || [], maybes: !!(opts && opts.maybes) }; }

  // Whether a customer is lost on a date under the scenarios chosen in opts ("lose a customer" what-ifs)
  function lostFn(data, o) {
    const loses = [];
    list(data, "scenarios").forEach(function (s) {
      if (o.scenarioIds.indexOf(s.id) === -1) return;
      (Array.isArray(s.changes) ? s.changes : []).forEach(function (c) { if (isObj(c) && c.kind === "lose" && validIso(c.from) && String(c.customer || "").trim()) loses.push(c); });
    });
    return function (customer, date) { return loses.some(function (c) { return sameName(c.customer, customer) && date >= c.from; }); };
  }

  // Every item of money in or out between two dates, using the rules at the top of this file. Amounts are pounds.
  function itemsBetween(data, today, from, to, opts) {
    const o = optsOf(opts), items = [];
    const chosen = list(data, "scenarios").filter(function (s) { return o.scenarioIds.indexOf(s.id) !== -1; });
    const changes = [];
    chosen.forEach(function (s) { (Array.isArray(s.changes) ? s.changes : []).forEach(function (c) { if (isObj(c)) changes.push({ change: c, scenario: s }); }); });
    const loses = changes.filter(function (x) { return x.change.kind === "lose" && validIso(x.change.from) && String(x.change.customer || "").trim(); }).map(function (x) { return x.change; });
    const lost = lostFn(data, o);
    function push(it) { if (it.date >= from && it.date <= to) items.push(it); }

    list(data, "invoices").forEach(function (inv) {
      const state = invoiceState(inv, today);
      if (!isUnpaid(state)) return;
      const out = invoiceOutstanding(inv);
      if (out <= 0) return;
      const due = validIso(inv.dueDate), date = due && due > today ? due : today;
      if (lost(inv.customer, date)) return;
      push({ date: date, name: (inv.number ? inv.number + " " : "") + (inv.customer || "Invoice"), amount: out, dir: "in", kind: "invoice", ref: inv.id, late: state === "overdue" });
    });
    list(data, "expected").forEach(function (e) {
      if (e.status !== "confirmed") return;
      const maybe = e.chance === "maybe";
      if (maybe && !o.maybes) return;
      const rep = Object.assign({}, e, { repeat: REPEATS.indexOf(e.repeat) === -1 ? "none" : e.repeat });
      const slipped = validIso(e.date) && e.date < today;
      // A confirmed item whose date has slipped by counts today; a repeating one carries on from today
      const dates = slipped && rep.repeat === "none" ? [today] : occurrences(rep, slipped ? today : from, to);
      dates.forEach(function (date) {
        if (lost(e.who, date)) return;
        push({ date: date, name: (e.who ? e.who + ": " : "") + (e.what || "Expected"), amount: num(e.amount), dir: "in", kind: "expected", ref: e.id, maybe: maybe });
      });
    });
    list(data, "outgoings").forEach(function (g) {
      if (g.status !== "confirmed") return;
      const start = from < today ? today : from;
      occurrences(g, start, to).forEach(function (date) { push({ date: date, name: g.name || "Payment", amount: num(g.amount), dir: "out", kind: "outgoing", ref: g.id, category: g.category }); });
    });
    taxBetween(data, from < today ? today : from, to).forEach(function (t) { push(t); });
    changes.forEach(function (x) {
      const c = x.change;
      if (c.kind !== "in" && c.kind !== "out") return;
      let ends = null;
      if (c.kind === "in" && String(c.customer || "").trim()) {
        loses.forEach(function (l) { if (sameName(l.customer, c.customer) && (!ends || l.from < ends)) ends = l.from; });
      }
      occurrences(c, from, to).forEach(function (date) {
        if (ends && date >= ends) return;
        push({ date: date, name: (c.name || "What if") + " (what if)", amount: num(c.amount), dir: c.kind, kind: "scenario", scenario: x.scenario.name });
      });
    });
    return items.sort(function (a, b) { return a.date.localeCompare(b.date) || (a.dir === b.dir ? 0 : a.dir === "in" ? -1 : 1); });
  }

  // Week by week from the week today is in: money in, money out and the balance at the end of the week, starting
  // from cashToday. Pass opts.scenarioIds to add what ifs, opts.maybes to count the "maybe" items.
  function forecast(data, today, weeks, opts) {
    const n = weeks == null ? 12 : weeks, ws = weekStartsOf(data);
    const first = startOfWeekIso(today, ws), end = addDays(first, n * 7 - 1);
    const items = itemsBetween(data, today, today, end, opts);
    let balance = toP(cashToday(data).total);
    const out = [];
    for (let w = 0; w < n; w += 1) {
      const a = addDays(first, w * 7), b = addDays(a, 6);
      const mine = items.filter(function (it) { return it.date >= a && it.date <= b; });
      let inP = 0, outP = 0;
      mine.forEach(function (it) { if (it.dir === "in") inP += toP(it.amount); else outP += toP(it.amount); });
      balance += inP - outP;
      out.push({ weekStart: a, weekEnd: b, in: fromP(inP), out: fromP(outP), balance: fromP(balance), items: mine });
    }
    return out;
  }
  // The lowest balance at the end of a week and which week (the earliest if two are equal), or null with no weeks
  function lowPoint(weeksList) {
    let best = null;
    (weeksList || []).forEach(function (w) { if (!best || toP(w.balance) < toP(best.balance)) best = { balance: w.balance, weekStart: w.weekStart }; });
    return best;
  }
  // The one plain line under the chart
  function tightestLine(data, weeksList) {
    const lp = lowPoint(weeksList);
    if (!lp || (!list(data, "accounts").length && !weeksList.some(function (w) { return w.items.length; }))) return NO_DATA_LINE;
    const wk = weeksList.filter(function (w) { return w.weekStart === lp.weekStart; })[0];
    const outs = wk.items.filter(function (i) { return i.dir === "out" && i.amount > 0; }).sort(function (a, b) { return toP(b.amount) - toP(a.amount); });
    let because = "";
    if (outs.length) {
      const big = outs[0];
      because = big.kind === "tax" ? ", after the " + big.name : ", after paying " + big.name;
    }
    if (lp.balance < 0) return "You would run out of money in " + weekLabel(lp.weekStart) + ", down to " + money(lp.balance) + because + ".";
    return "Your tightest week is " + weekLabel(lp.weekStart) + " at " + money(lp.balance) + because + ".";
  }
  // Money in and out over the next few days, soonest first
  function comingUp(data, today, days, opts) {
    return itemsBetween(data, today, today, addDays(today, (days == null ? 14 : days) - 1), opts);
  }

  // ---------- Months ----------
  function isTransfer(t) { return t.category === "transfer"; }
  // A row per calendar month, from `back` months ago to `ahead` months on:
  // { month, label, start, end, kind: "actual"|"now"|"estimate", invoiced, paid, due, expected, out, net, outBasis, items }.
  // Past months come from invoices, their payments and (for money out) the bank lines; this month and later use the forecast rules.
  function months(data, today, back, ahead, opts) {
    const b = back == null ? 3 : back, a = ahead == null ? 6 : ahead, o = optsOf(opts);
    const nowKey = monthKey(today), rows = [];
    const tx = list(data, "transactions").filter(function (t) { return validIso(t.date) && !isTransfer(t); });
    const invoices = liveInvoices(data), lost = lostFn(data, o);
    for (let k = -b; k <= a; k += 1) {
      const key = addMonthsKey(nowKey, k), start = monthStart(key), end = monthEnd(key);
      const kind = key < nowKey ? "actual" : key === nowKey ? "now" : "estimate", past = key < nowKey;
      const items = [];
      let invoiced = 0, paid = 0, due = 0, expected = 0, outP = 0, outBasis = "bank";

      invoices.forEach(function (inv) {
        const st = invoiceState(inv, today);
        if (inAccountsApp(inv) && inRange(validIso(inv.issueDate), start, end)) {
          invoiced += toP(invoiceTotals(inv).gross);
          items.push({ date: inv.issueDate, name: (inv.number ? inv.number + " " : "") + (inv.customer || "Invoice"), amount: invoiceTotals(inv).gross, dir: "info", kind: "invoiced", ref: inv.id });
        }
        (inv.payments || []).forEach(function (p) {
          if (inRange(validIso(p.date), start, end) && p.date <= today) {
            paid += toP(p.amount);
            items.push({ date: p.date, name: (inv.customer || "Payment") + (inv.number ? " " + inv.number : ""), amount: num(p.amount), dir: "in", kind: "paid", ref: inv.id });
          }
        });
        if (isUnpaid(st)) {
          const dueDate = validIso(inv.dueDate), eff = !past && dueDate && dueDate < today ? today : dueDate;
          if (inRange(eff, start, end) && !lost(inv.customer, eff)) {
            const out = invoiceOutstanding(inv);
            due += toP(out);
            items.push({ date: eff, name: (inv.number ? inv.number + " " : "") + (inv.customer || "Invoice"), amount: out, dir: "in", kind: "due", ref: inv.id, late: st === "overdue" });
          }
        }
      });
      // Money received counts only from invoice payments (which come from the accounts app). A bank line never adds
      // income on its own, so a loan, a refund or a transfer is never counted as money earned.
      // Money out: the bank lines for the part of the month that has gone, the rules for the part to come
      const pastEnd = !past && key !== nowKey ? null : (past ? end : addDays(today, -1));
      if (pastEnd && pastEnd >= start) {
        const lines = tx.filter(function (t) { return t.dir === "out" && inRange(t.date, start, pastEnd); });
        if (lines.length) {
          lines.forEach(function (t) { outP += toP(t.amount); items.push({ date: t.date, name: t.text || "Payment", amount: num(t.amount), dir: "out", kind: "outgoing" }); });
        } else {
          outBasis = "estimate";
          list(data, "outgoings").forEach(function (g) {
            if (g.status !== "confirmed") return;
            occurrences(g, start, pastEnd).forEach(function (d) { outP += toP(g.amount); items.push({ date: d, name: g.name || "Payment", amount: num(g.amount), dir: "out", kind: "outgoing", ref: g.id }); });
          });
        }
      }
      if (!past) {
        const from = key === nowKey ? today : start;
        itemsBetween(data, today, from, end, o).forEach(function (it) {
          if (it.dir === "out") { outP += toP(it.amount); items.push(it); }
          else if (it.kind === "expected" || it.kind === "scenario") { expected += toP(it.amount); items.push(it); }
        });
      }
      const net = paid + (past ? 0 : due + expected) - outP;
      rows.push({
        month: key, label: monthLabel(key), start: start, end: end, kind: kind, current: key === nowKey,
        invoiced: fromP(invoiced), paid: fromP(paid), due: fromP(due), expected: fromP(expected), out: fromP(outP), net: fromP(net),
        outBasis: outBasis, items: items.sort(function (x, y) { return String(x.date).localeCompare(String(y.date)); })
      });
    }
    return rows;
  }

  // ---------- Tax pot ----------
  function taxYearStart(settings, today) {
    const p = String((settings && settings.yearStart) || "04-06").split("-").map(Number);
    const m = p[0] >= 1 && p[0] <= 12 ? p[0] : 4, d = p[1] >= 1 ? p[1] : 6;
    const y = ymd(today).y;
    let start = make(y, m, Math.min(d, daysInMonth(y, m)));
    if (start > today) start = make(y - 1, m, Math.min(d, daysInMonth(y - 1, m)));
    return start;
  }
  // What the owner should have set aside, what is in the pot, and what to move. Worked from money received, and money
  // received means invoice payments only (they come from the accounts app). A bank line never adds income on its own,
  // so a loan, a refund or a transfer is never taxed.
  //  - VAT on money received in the current VAT quarter and in an earlier quarter whose return is not yet due
  //    (if registered), less any VAT already paid for that earlier quarter (a confirmed outgoing, or a bank line, in
  //    the category tax whose name or text says VAT, dated after that quarter ended), plus
  //  - the owner's set-aside percent of money received after VAT since the tax year began, minus
  //  - income or corporation tax already paid this year, only when the pot's balance is not known (a known balance has already
  //    had it taken out; VAT payments are not counted here: they settle the VAT part).
  // inPot is the tax pot account's balance when there is one, else the total of the moves the owner logged this year.
  function taxPot(data, today) {
    const s = settingsOf(data), v = vatOf(data), pct = num(s.tax && s.tax.setAsidePercent);
    const yearStart = taxYearStart(s, today);
    let vatPart = 0, netReceived = 0;
    const flat = v.registered && v.scheme === "flat", flatRate = num(v.flatRate);
    liveInvoices(data).forEach(function (inv) {
      (inv.payments || []).forEach(function (p) {
        const d = validIso(p.date);
        if (!d || d > today) return;
        const amt = toP(p.amount), share = flat ? rp(amt * flatRate / 100) : vatShareP(inv, amt);
        if (d >= yearStart) netReceived += amt - (v.registered ? share : 0);
      });
    });
    // Tax paid out: bank lines in the category tax, or if there are none the confirmed tax outgoings. VAT is told apart
    // by "VAT" in the name or text.
    const isVat = function (text) { return /\bvat\b/i.test(String(text || "")); };
    function taxPayments(from, vatOnly) {
      const fromTx = [], fromOut = [];
      list(data, "transactions").forEach(function (t) {
        if (t.dir === "out" && t.category === "tax" && isVat(t.text) === vatOnly && inRange(validIso(t.date), from, today)) fromTx.push({ date: t.date, p: toP(t.amount) });
      });
      list(data, "outgoings").forEach(function (g) {
        if (g.status !== "confirmed" || g.category !== "tax" || isVat(g.name) !== vatOnly) return;
        occurrences(g, from, today).forEach(function (date) { fromOut.push({ date: date, p: toP(g.amount) }); });
      });
      return fromTx.length ? fromTx : fromOut;
    }
    let vatPaid = 0;
    if (v.registered) {
      const quarters = quarterList(data, today, today).filter(function (q) { return q.start <= today && q.dueDate >= today; });
      const owedBy = quarters.map(function (q) {
        const to = q.end < today ? q.end : today;
        let p = 0;
        liveInvoices(data).forEach(function (inv) {
          (inv.payments || []).forEach(function (pay) {
            if (!inRange(validIso(pay.date), q.start, to)) return;
            const amt = toP(pay.amount);
            p += flat ? rp(amt * flatRate / 100) : vatShareP(inv, amt);
          });
        });
        return p;
      });
      // VAT paid after a quarter ended settles that quarter, oldest first, and never takes it below nothing
      const payments = quarters.length ? taxPayments(addDays(quarters[0].end, 1), true).sort(function (a, b) { return a.date.localeCompare(b.date); }) : [];
      quarters.forEach(function (q, k) {
        payments.forEach(function (pay) {
          if (pay.date <= q.end || pay.p <= 0 || owedBy[k] <= 0) return;
          const take = Math.min(pay.p, owedBy[k]);
          owedBy[k] -= take; pay.p -= take; vatPaid += take;
        });
        vatPart += owedBy[k];
      });
    }
    const taxPaid = taxPayments(yearStart, false).reduce(function (sum, x) { return sum + x.p; }, 0);
    const incomePart = rp(netReceived * pct / 100);

    const movedP = list(data, "potMoves").reduce(function (sum, m) { return inRange(validIso(m.date), yearStart, today) ? sum + toP(m.amount) : sum; }, 0);
    const potId = s.tax && s.tax.potAccountId;
    const acct = list(data, "accounts").filter(function (a) { return (potId && a.id === potId) || (!potId && a.isTaxPot === true); })[0];
    const potKnown = !!acct && isFinite(Number(acct.balance));
    const inPot = potKnown ? toP(acct.balance) : movedP;
    // Tax paid out already came out of the pot, so when the pot's real balance is known it is not taken off again.
    // Without a pot balance the moves the owner logged are all there is, so the tax paid is taken off the target instead.
    const shouldHave = Math.max(0, vatPart + incomePart - (potKnown ? 0 : taxPaid));
    return {
      shouldHave: fromP(shouldHave), inPot: fromP(inPot), moved: fromP(movedP), toMove: fromP(Math.max(0, shouldHave - inPot)),
      vatPart: fromP(vatPart), vatPaid: fromP(vatPaid), incomePart: fromP(incomePart), taxPaid: fromP(taxPaid), percent: pct, potKnown: potKnown, potName: potKnown ? acct.name : "", yearStart: yearStart
    };
  }

  // ---------- Flags ----------
  // Things the app notices for itself. Each has an action the screen turns into a button: chase, check, refresh, tax or null.
  function derivedFlags(data, today) {
    const flags = [];
    const o = owed(data, today);
    o.list.forEach(function (r) {
      if (r.state !== "overdue") return;
      const inv = r.invoice, sent = inv.status === "sent", who = (inv.number ? inv.number + " from " : "") + (inv.customer || "a customer");
      // A reminder only makes sense once the invoice has been sent. One still waiting in the accounts app has to be sent first.
      flags.push({ id: "d-overdue-" + inv.id, kind: "overdue", derived: true, status: "open", at: today, invoiceId: inv.id, action: sent ? "chase" : "open",
        text: sent ? who + " is " + r.daysOverdue + (r.daysOverdue === 1 ? " day" : " days") + " overdue (" + money(r.outstanding) + ")."
          : who + " was due " + r.daysOverdue + (r.daysOverdue === 1 ? " day" : " days") + " ago and is still waiting for you to send it from " + appName(data) + " (" + money(r.outstanding) + ")." });
    });
    const lp = lowPoint(forecast(data, today, 12, { maybes: false }));
    const nervous = num(settingsOf(data).nervousBalance);
    if (lp && list(data, "accounts").length && (lp.balance < 0 || (nervous > 0 && lp.balance < nervous))) {
      flags.push({ id: "d-low", kind: "low", derived: true, status: "open", at: today, invoiceId: null, action: null,
        text: lp.balance < 0 ? "Your balance goes below zero in " + weekLabel(lp.weekStart) + ", down to " + money(lp.balance) + "." : "Your balance dips to " + money(lp.balance) + " in " + weekLabel(lp.weekStart) + ", under your " + money(nervous, { round: true }) + " comfort level." });
    }
    const tp = taxPot(data, today);
    if (tp.toMove > 50) {
      flags.push({ id: "d-tax", kind: "tax", derived: true, status: "open", at: today, invoiceId: null, action: "tax", text: "Your tax pot is " + money(tp.toMove) + " short of what you should have set aside." });
    }
    const age = staleDays(data, today);
    if (age != null && age > 7) {
      flags.push({ id: "d-stale", kind: "other", derived: true, status: "open", at: today, invoiceId: null, action: "refresh", text: "Your numbers are " + age + " days old. Press Refresh numbers to bring them up to date." });
    }
    const waiting = list(data, "expected").filter(function (e) { return e.status === "suggested"; }).length + list(data, "outgoings").filter(function (g) { return g.status === "suggested"; }).length;
    if (waiting) {
      flags.push({ id: "d-suggested", kind: "other", derived: true, status: "open", at: today, invoiceId: null, action: "check", text: waiting + (waiting === 1 ? " thing Claude spotted is" : " things Claude spotted are") + " waiting for you to confirm or drop." });
    }
    return flags;
  }
  // The flags tray: the app's own first, then Claude's open ones, leaving out any that say what the app already says
  function flags(data, today) {
    const mine = derivedFlags(data, today);
    const kinds = {}, invoiceIds = {};
    mine.forEach(function (f) { kinds[f.kind] = true; if (f.kind === "overdue" && f.invoiceId) invoiceIds[f.invoiceId] = true; });
    const theirs = list(data, "flags").filter(function (f) {
      if (f.status !== "open") return false;
      if (f.kind === "overdue" && f.invoiceId && invoiceIds[f.invoiceId]) return false;
      if ((f.kind === "low" || f.kind === "tax") && kinds[f.kind]) return false;
      return true;
    });
    return mine.concat(theirs);
  }

  // ---------- What ifs ----------
  function scenarioCompare(data, today, ids, opts) {
    const o = optsOf(opts), rows = [];
    function row(id, name, scenarioIds) {
      const weeksList = forecast(data, today, 12, { scenarioIds: scenarioIds, maybes: o.maybes });
      rows.push({ id: id, name: name, lowPoint: lowPoint(weeksList), endBalance: weeksList.length ? weeksList[weeksList.length - 1].balance : cashToday(data).total, weeks: weeksList });
    }
    row("base", "As things are", []);
    (ids || []).forEach(function (id) {
      const s = list(data, "scenarios").filter(function (x) { return x.id === id; })[0];
      if (s) row(s.id, s.name || "What if", [s.id]);
    });
    return rows;
  }
  // A change in plain words: "Hire someone at £2,400 a month from 1 Dec"
  function changeText(c) {
    const every = { none: "", weekly: " a week", monthly: " a month", quarterly: " a quarter", yearly: " a year" }[c.repeat] || "";
    if (c.kind === "lose") return "Lose " + (c.customer || "a customer") + (validIso(c.from) ? " from " + dayLabel(c.from) : "");
    const amount = money(num(c.amount), { round: num(c.amount) % 1 === 0 });
    return (c.name || (c.kind === "in" ? "Extra money" : "Extra cost")) + " at " + amount + every + (validIso(c.from) ? " from " + dayLabel(c.from) : "") + (validIso(c.to) ? " to " + dayLabel(c.to) : "");
  }

  // ---------- Activity ----------
  function logActivity(data, what, ref) {
    if (!Array.isArray(data.activity)) data.activity = [];
    data.activity.unshift({ at: nowIso(), what: what, ref: ref || null });
    if (data.activity.length > CAPS.activity) data.activity.length = CAPS.activity;
  }

  // ---------- Reading the file ----------
  // Throws a plain message if the parts the app depends on are the wrong kind of thing
  function validate(d) {
    if (!isObj(d)) throw new Error("The money file is empty or isn't set out the way the app expects.");
    ["invoices", "outgoings", "expected", "accounts", "transactions"].forEach(function (k) {
      if (d[k] !== undefined && !Array.isArray(d[k])) throw new Error("The money file has a small mistake: " + k + " should be a list.");
    });
  }
  function fill(defaults, src) {
    const out = {};
    Object.keys(defaults).forEach(function (k) {
      const dv = defaults[k], sv = src && src[k];
      if (isObj(dv)) out[k] = fill(dv, isObj(sv) ? sv : {});
      else if (Array.isArray(dv)) out[k] = Array.isArray(sv) ? sv : dv.slice();
      else out[k] = sv === undefined || sv === null ? dv : sv;
    });
    if (src) Object.keys(src).forEach(function (k) { if (!(k in out)) out[k] = src[k]; });
    return out;
  }
  function oneOf(value, allowed, fallback) { return allowed.indexOf(value) === -1 ? fallback : value; }
  function keep(arr, fn) {
    return (Array.isArray(arr) ? arr : []).filter(function (x) { return isObj(x) && typeof x.id === "string" && x.id; }).map(function (x) { fn(x); return x; });
  }
  function textOr(v) { return typeof v === "string" ? v : ""; }
  // One word for where a record came from: the accounts app is "accounts" whatever older files called it
  function sourceOf(v) {
    const t = textOr(v).trim().toLowerCase();
    if (!t) return "you";
    return OLD_ACCOUNTS_SOURCES.indexOf(t) !== -1 ? "accounts" : t;
  }
  function normaliseInvoice(i) {
    i.number = textOr(i.number); i.customer = textOr(i.customer); i.email = textOr(i.email); i.notes = textOr(i.notes); i.ref = textOr(i.ref);
    i.issueDate = validIso(i.issueDate) || ""; i.dueDate = validIso(i.dueDate) || "";
    i.status = oneOf(i.status, INVOICE_STATUSES, "draft");
    i.where = i.where === "accounts" ? "accounts" : "here";
    i.source = sourceOf(i.source);
    i.lines = keep(i.lines, function (l) { l.text = textOr(l.text); l.qty = num(l.qty, 1); l.price = num(l.price); l.vatRate = l.vatRate == null || l.vatRate === "" ? 0 : num(l.vatRate); });
    i.payments = keep(i.payments, function (p) { p.date = validIso(p.date) || ""; p.amount = num(p.amount); p.source = sourceOf(p.source); });
    i.request = isObj(i.request) ? i.request : null;
    i.chaser = isObj(i.chaser) ? i.chaser : null;
  }
  // Fills in anything missing and fixes values Claude may have written badly, so a half-written file never
  // trips a screen. A record without an id is dropped. It tidies what is in memory only.
  function normalise(d) {
    d.version = 1;
    d.settings = fill(DEFAULT_SETTINGS, d.settings);
    d.settings.weekStarts = weekStartsOf(d);
    d.settings.nervousBalance = num(d.settings.nervousBalance);
    d.settings.yearStart = /^\d{2}-\d{2}$/.test(d.settings.yearStart) ? d.settings.yearStart : "04-06";
    if (!Array.isArray(d.settings.vat.quarterEnds)) d.settings.vat.quarterEnds = [3, 6, 9, 12];
    d.sources = fill(DEFAULT_SOURCES, d.sources);
    ["accounts", "invoices", "expected", "outgoings", "transactions", "potMoves", "scenarios", "flags", "imports", "activity"].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    d.accounts = keep(d.accounts, function (a) { a.name = textOr(a.name); a.kind = oneOf(a.kind, ["current", "savings", "pot", "card"], "current"); a.balance = num(a.balance); a.asAt = validIso(a.asAt); a.source = sourceOf(a.source); a.isTaxPot = a.isTaxPot === true; });
    d.invoices = keep(d.invoices, normaliseInvoice);
    d.expected = keep(d.expected, function (e) { e.who = textOr(e.who); e.what = textOr(e.what); e.amount = num(e.amount); e.date = validIso(e.date); e.chance = oneOf(e.chance, ["likely", "maybe"], "likely"); e.status = oneOf(e.status, ["suggested", "confirmed", "invoiced", "dropped"], "suggested"); e.invoiceId = e.invoiceId || null; e.source = sourceOf(e.source); e.note = textOr(e.note); });
    d.outgoings = keep(d.outgoings, function (g) { g.name = textOr(g.name); g.amount = num(g.amount); g.category = oneOf(g.category, OUT_CATEGORIES.map(function (c) { return c.key; }), "other"); g.repeat = oneOf(g.repeat, REPEATS, "none"); g.date = validIso(g.date); g.endDate = validIso(g.endDate); g.vatIncluded = g.vatIncluded !== false; g.status = oneOf(g.status, ["suggested", "confirmed", "dropped"], "suggested"); g.source = sourceOf(g.source); g.note = textOr(g.note); });
    d.transactions = keep(d.transactions, function (t) { t.date = validIso(t.date) || ""; t.text = textOr(t.text); t.amount = Math.abs(num(t.amount)); t.dir = t.dir === "in" ? "in" : "out"; t.invoiceId = t.invoiceId || null; t.category = textOr(t.category); t.source = sourceOf(t.source); });
    d.potMoves = keep(d.potMoves, function (m) { m.date = validIso(m.date) || ""; m.amount = num(m.amount); m.note = textOr(m.note); });
    d.scenarios = keep(d.scenarios, function (s) {
      s.name = textOr(s.name); s.on = s.on === true; s.note = textOr(s.note);
      s.request = isObj(s.request) ? s.request : null;
      s.changes = keep(s.changes, function (c) { c.kind = oneOf(c.kind, ["out", "in", "lose"], "out"); c.name = textOr(c.name); c.amount = num(c.amount); c.repeat = oneOf(c.repeat, REPEATS, "none"); c.from = validIso(c.from); c.to = validIso(c.to); c.customer = textOr(c.customer); });
    });
    d.flags = keep(d.flags, function (f) { f.kind = oneOf(f.kind, ["overdue", "unusual", "low", "tax", "duplicate", "other"], "other"); f.text = textOr(f.text); f.status = oneOf(f.status, ["open", "done", "dismissed"], "open"); f.invoiceId = f.invoiceId || null; });
    if (d.transactions.length > CAPS.transactions) d.transactions.length = CAPS.transactions;
    if (d.imports.length > CAPS.imports) d.imports.length = CAPS.imports;
    if (d.activity.length > CAPS.activity) d.activity.length = CAPS.activity;
    return d;
  }

  const model = {
    OUT_CATEGORIES: OUT_CATEGORIES, APPS: APPS, appInfo: appInfo, STATE_LABELS: STATE_LABELS, REPEATS: REPEATS, DISCLAIMER: DISCLAIMER, NO_DATA_LINE: NO_DATA_LINE,
    invoiceTotals: invoiceTotals, invoicePaid: invoicePaid, invoiceOutstanding: invoiceOutstanding, invoiceState: invoiceState, daysOverdue: daysOverdue,
    nextInvoiceNumber: nextInvoiceNumber, numberOf: numberOf, newInvoice: newInvoice, newInvoiceFor: newInvoiceFor, invoiceWhere: invoiceWhere, stateLabel: stateLabel, customers: customers,
    cashToday: cashToday, cashSource: cashSource, sourceLabel: sourceLabel, staleDays: staleDays, owed: owed,
    occurrences: occurrences, monthlyEquivalent: monthlyEquivalent, monthlyOutTotal: monthlyOutTotal,
    forecast: forecast, lowPoint: lowPoint, tightestLine: tightestLine, comingUp: comingUp, months: months,
    vatQuarter: vatQuarter, taxDates: taxDates, taxPot: taxPot, derivedFlags: derivedFlags, flags: flags,
    money: money, scenarioCompare: scenarioCompare, changeText: changeText,
    isSetUp: isSetUp, appName: appName, logActivity: logActivity, validate: validate, normalise: normalise,
    addDaysIso: addDays, daysBetween: daysBetween, validIso: validIso, startOfWeekIso: startOfWeekIso, dayLabel: dayLabel, weekLabel: weekLabel, monthLabel: monthLabel,
    monthKey: monthKey, addMonthsKey: addMonthsKey, nowIso: nowIso, makeId: makeId, isUnpaid: isUnpaid, toPence: toP, fromPence: fromP
  };

  root.MV = root.MV || {};
  root.MV.model = model;
  if (typeof module !== "undefined") module.exports = model;
})();
