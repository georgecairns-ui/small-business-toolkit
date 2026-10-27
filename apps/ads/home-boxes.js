/*
  ADS OS ON HOME: the boxes this tool adds to the Home dashboard
  --------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js and app/charts.js (listed under "home" in the tool's menu
  file). It reads the same data file as the app itself, through the same shared store. The boxes start switched on when Ads OS is on its own, and off when Task List OS is in the
  folder, so attaching never changes someone's Home: the person switches boxes on from Home's list.
*/
(function () {
  "use strict";

  const M = window.AD.model, charts = window.AD.charts;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../ads/#";
  const STYLE_ID = "ad-home-style";
  let data = null;

  // Boxes start switched on only when Ads OS is on its own. When Task List OS is in the folder
  // (its Home scripts load first and set window.TL), they start off, so attaching never changes
  // someone's Home. Home reads this once, when it first builds the layout.
  function startOn() { return !window.TL; }
  function box(def) { Object.defineProperty(def, "defaultOn", { get: startOn, enumerable: true }); return def; }

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function today() { return ui.isoDate(new Date()); }
  function cap(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

  function setupNote() {
    return '<div class="hbox__setup"><p><strong>Let’s set up your ads.</strong> Open this folder in the Code tab of the Claude desktop app and type <code>/setup</code>. Claude asks where your ads are, reads your figures and drafts campaigns for you to approve.</p></div>';
  }

  function row(title, sub) {
    return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(title) + '</span><span class="hrow__sub">' + esc(sub) + "</span></span></li>";
  }

  // ---------- The boxes ----------
  function thisWeek() {
    if (!M.isSetUp(data)) return setupNote();
    if (!M.hasFigures(data)) return empty(M.COPY.noFigures);
    ensureStyles();
    const t = today(), r = M.rangeFor("week", t, M.weekStartsOf(data)), now = M.rangeTotals(data, { from: r.from, to: r.to }), before = M.rangeTotals(data, { from: r.prevFrom, to: r.prevTo });
    now.historyDays = M.historyDays(data, {}, r.to);
    const l = M.light(now, M.targetFor(data, null)), roas = M.roas(data, now);
    const mini = function (label, value, note) { return '<div class="adhome__tile"><span class="adhome__label">' + esc(label) + '</span><span class="adhome__value">' + esc(value) + "</span>" + (note || "") + "</div>"; };
    const change = function (a, b) { const c = M.change(a, b); return c === null ? "" : '<span class="adhome__note">' + (Math.round(c * 100) === 0 ? "No change" : (c > 0 ? "Up " : "Down ") + Math.abs(Math.round(c * 100)) + "%") + " on last week</span>"; };
    return '<div class="adhome__tiles">' + mini("Spend", M.money(now.spend), change(now.spend, before.spend)) + mini(cap(M.resultPlural(data)), M.num(now.results), change(now.results, before.results)) +
      mini(M.costLabel(data), M.money(now.costPerResult), '<span class="adhome__light adhome__light--' + l.state + '">' + esc(l.label) + "</span>") +
      mini("Return", roas ? M.money(roas.ratio) + " for " + M.symbol(data) + "1" : "-", roas ? (roas.estimated ? '<span class="adhome__note">estimated</span>' : "") : '<span class="adhome__note">' + esc(M.roasReason(data, now)) + "</span>") + "</div>";
  }

  function waiting() {
    if (!M.isSetUp(data)) return empty("Once Claude has drafted campaigns for you, the ones waiting for your say show here.");
    // The same list as the To do tab, so the count matches everywhere: your items first, then what Claude can do
    const t = M.todoList(data, today()), items = t.you.concat(t.claude);
    if (!items.length) return empty("Nothing on your To do list. Campaigns to review or switch on, and things Claude can do for you, show here.");
    return '<p class="hstat"><span class="hstat__num">' + items.length + '</span><span class="hstat__label">' + (items.length === 1 ? "thing" : "things") + " on your To do list</span></p>" +
      '<ul class="hlist" role="list">' + items.slice(0, 4).map(function (it) { return row(it.label, it.why); }).join("") + "</ul>" +
      (items.length > 4 ? '<p class="hbox__more">and ' + (items.length - 4) + " more</p>" : "");
  }

  function trend() {
    if (!M.isSetUp(data)) return empty("Once your figures are in, the cost of each " + M.resultName(data) + " over time shows here.");
    ensureStyles();
    const weeks = M.weeks(data, 12, today()), target = M.targetFor(data, null), spark = charts.sparkline(weeks, target, { width: 240, height: 56, word: M.resultName(data) });
    if (!spark) return empty("Needs 2 weeks with " + M.resultPlural(data) + " to draw. It fills in as Claude copies your figures in.");
    const latest = weeks.filter(function (w) { return typeof w.costPerResult === "number"; }).pop();
    return '<div class="adhome__spark">' + spark + '</div><p class="adhome__caption"><strong>' + esc(M.money(latest.costPerResult)) + "</strong> in the latest week" + (target ? ", against a target of " + esc(M.money(target)) : "") + ".</p>";
  }

  // Home's own stylesheet has no tiles or traffic lights, so this tool adds the small ones it needs once.
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".adhome__tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }" +
      ".adhome__tile { display: grid; align-content: start; gap: 2px; min-width: 0; padding: 10px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); }" +
      ".adhome__label { font-size: var(--text-xs); font-weight: 650; color: var(--color-muted); }" +
      ".adhome__value { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }" +
      ".adhome__note { font-size: var(--text-xs); color: var(--color-muted); }" +
      ".adhome__light { justify-self: start; padding: 1px 8px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 650; background: var(--color-sunk); color: var(--color-muted); }" +
      ".adhome__light--green { background: var(--color-success-soft); color: var(--color-success); }" +
      ".adhome__light--amber { background: var(--color-warning-soft); color: var(--color-warning); }" +
      ".adhome__light--red { background: var(--color-danger-soft); color: var(--color-danger); }" +
      ".adhome__spark { max-width: 240px; }" +
      ".adhome__caption { margin: 8px 0 0; font-size: var(--text-sm); color: var(--color-ink-soft); }";
    document.head.appendChild(style);
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("ads", {
    boxes: [
      box({ id: "week", title: "Ads this week", icon: "barChart", size: 2, page: PAGE + "overview", render: thisWeek }),
      box({ id: "waiting", title: "Ads to do", icon: "checkSquare", size: 1, page: PAGE + "todo", render: waiting }),
      box({ id: "trend", title: "Cost per result trend", icon: "trendingUp", size: 1, page: PAGE + "overview", render: trend })
    ],
    greetingName: function () { return data && data.settings.ownerName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "ads",
        fileName: "ads.json",
        dataPaths: ["data", "", "apps/ads/data"],
        api: "/api/data/ads/ads.json",
        validate: function (d) { return d; },
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
    },
    action: function () {}
  });
})();
