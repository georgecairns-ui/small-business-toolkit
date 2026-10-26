/*
  MONEY VIEW OS ON HOME: the boxes this tool adds to the Home dashboard
  ---------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (listed under "home" in the tool's menu file). It reads the same data
  file as the app itself, through the same shared store. Every box starts switched off, so attaching
  never changes someone's Home: the person switches boxes on from Home's list.

  Every figure comes from MV.model, the same rules as the app, and every box says where its figure
  came from or that it is an estimate. Nothing on Home moves money or sends anything.
*/
(function () {
  "use strict";

  const M = window.MV.model;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../money/#";
  const STYLE_ID = "mv-home-style";
  let data = null;

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function today() { return ui.isoDate(new Date()); }
  function shortDate(iso) {
    const d = ui.parseDate(iso);
    return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  }
  function isSetUp() { return !!data && M.isSetUp(data); }

  function setupNote() {
    return '<div class="hbox__setup"><p><strong>Let’s set up your money view.</strong> Open this folder in the Code tab of the Claude desktop app and type <code>/setup</code>. Claude connects to your accounts and bank (read only) and builds your first forecast.</p></div>';
  }
  function notSetUp(text) { return empty(text); }

  function row(title, sub, meta) {
    return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(title) + '</span><span class="hrow__sub">' + esc(sub) + "</span></span>" +
      (meta ? '<span class="hrow__meta">' + esc(meta) + "</span>" : "") + "</li>";
  }
  function stat(num, label, cls) {
    return '<p class="hstat"><span class="hstat__num mvnum' + (cls ? " mvnum--" + cls : "") + '">' + esc(num) + '</span><span class="hstat__label">' + esc(label) + "</span></p>";
  }
  function sub(text) { return '<p class="hbox__more">' + esc(text) + "</p>"; }

  function forecastWeeks(weeks) {
    return M.forecast(data, today(), weeks, { scenarioIds: [], maybes: false });
  }

  // ---------- The boxes ----------
  function cashBox() {
    if (!isSetUp()) return setupNote();
    ensureStyles();
    const c = M.cashToday(data);
    if (!c.accounts.length) return empty("Add your bank balance in Settings, or Refresh numbers in Money View, and your cash shows here.");
    return stat(M.money(c.total), "in the bank today") + sub(M.cashSource(data));
  }

  function spark(weeks, nervous) {
    const values = weeks.map(function (w) { return w.balance; });
    const lo = Math.min.apply(null, values.concat(nervous)), hi = Math.max.apply(null, values.concat(0));
    const span = hi - lo || 1, W = 120, H = 32;
    const pts = values.map(function (v, i) { return (i / (values.length - 1 || 1) * W).toFixed(1) + "," + (H - 3 - (v - lo) / span * (H - 6)).toFixed(1); });
    return '<svg class="mvspark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Your balance over the next 12 weeks"><polyline points="' + pts.join(" ") + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
  function lowestBox() {
    if (!isSetUp()) return notSetUp("Once your money view is set up, your tightest week in the next 12 weeks shows here.");
    ensureStyles();
    if (!M.cashToday(data).accounts.length) return empty("Add your bank balance first and the forecast starts.");
    const weeks = forecastWeeks(12), lp = M.lowPoint(weeks), nervous = Number(data.settings.nervousBalance) || 0;
    const cls = lp.balance < 0 ? "bad" : lp.balance < nervous ? "warn" : "";
    return stat(M.money(lp.balance), "lowest point, w/c " + shortDate(lp.weekStart)) + '<div class="mvspark-wrap mvnum--' + (cls || "ok") + '">' + spark(weeks, nervous) + "</div>" + sub("Estimate, from your invoices and confirmed items");
  }

  function owedBox() {
    if (!isSetUp()) return notSetUp("Once your invoices are in, what people owe you shows here.");
    ensureStyles();
    const o = M.owed(data, today());
    if (!o.count) return empty("Nobody owes you anything right now. Invoices waiting to be paid show here.");
    return stat(M.money(o.total), o.count === 1 ? "owed on 1 invoice" : "owed on " + o.count + " invoices") +
      (o.overdueCount ? '<p class="hbox__more mvnum--bad">' + esc(M.money(o.overdue) + " overdue on " + o.overdueCount + (o.overdueCount === 1 ? " invoice" : " invoices")) + "</p>" : sub("None overdue")) + sub("From your invoices");
  }

  function taxBox() {
    if (!isSetUp()) return notSetUp("Once your money view is set up, how much to put aside for tax shows here.");
    ensureStyles();
    if (!data.settings.tax.setAsidePercent && !data.settings.vat.registered) return empty("Add the percentage your accountant gives you in Money View settings, and your tax pot shows here.");
    const t = M.taxPot(data, today());
    return (t.toMove > 0 ? stat("Move " + M.money(t.toMove), "to your Tax pot", "warn") : stat("Up to date", "your Tax pot")) +
      sub("Should have " + M.money(t.shouldHave) + ", in the pot " + M.money(t.inPot) + ". Estimate. You move the money yourself.");
  }

  function nextBox() {
    if (!isSetUp()) return notSetUp("Once your money view is set up, the next 14 days of money in and out show here.");
    ensureStyles();
    const items = M.comingUp(data, today(), 14).slice();
    if (!items.length) return empty("Nothing due in or out in the next 14 days. Invoices due and payments going out show here.");
    items.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    return '<ul class="hlist" role="list">' + items.slice(0, 6).map(function (it) {
      return row(it.name, shortDate(it.date) + (it.dir === "in" ? ", money in" : ", going out"), (it.dir === "in" ? "+" : "-") + M.money(Math.abs(it.amount)));
    }).join("") + "</ul>" + (items.length > 6 ? '<p class="hbox__more">and ' + (items.length - 6) + " more</p>" : "") + sub("Estimates, from your invoices and confirmed items");
  }

  // Home's own stylesheet has no small chart and no warning colours for figures, so this tool adds the few it needs once.
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".mvnum--warn { color: var(--color-warning); }" +
      ".mvnum--bad { color: var(--color-danger); }" +
      ".mvnum--ok { color: var(--color-ink-soft); }" +
      ".mvspark-wrap { min-width: 0; }" +
      ".mvspark { display: block; width: 100%; max-width: 100%; height: 36px; }" +
      ".hrow__meta { font-variant-numeric: tabular-nums; }";
    document.head.appendChild(style);
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("money", {
    boxes: [
      { id: "cash", title: "Cash today", icon: "wallet", size: 1, defaultOn: false, page: PAGE + "overview", render: cashBox },
      { id: "lowest", title: "Lowest point", icon: "trendingUp", size: 1, defaultOn: false, page: PAGE + "overview", render: lowestBox },
      { id: "owed", title: "Owed to you", icon: "fileText", size: 1, defaultOn: false, page: PAGE + "invoices", render: owedBox },
      { id: "tax", title: "Tax pot", icon: "inbox", size: 1, defaultOn: false, page: PAGE + "overview", render: taxBox },
      { id: "next", title: "Next 14 days", icon: "calendar", size: 2, defaultOn: false, page: PAGE + "overview", render: nextBox }
    ],
    greetingName: function () { return data && data.settings.ownerName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "money",
        fileName: "money.json",
        dataPaths: ["data", "", "apps/money/data"],
        api: "/api/data/money/money.json",
        validate: function (d) { return d; },
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
    },
    action: function () {}
  });
})();
