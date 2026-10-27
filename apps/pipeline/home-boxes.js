/*
  PIPELINE OS ON HOME: the boxes this tool adds to the Home dashboard
  -------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (see "home" in menu.json).
  It reads the same pipeline file as the pipeline itself, through the same shared store. On its own, Pipeline OS's boxes start switched on. With
  Task List OS in the folder they start switched off (the person turns them on in Home's list),
  so attaching never changes someone's Home.
*/
(function () {
  "use strict";

  const M = window.PL.model;
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const PAGE = "../pipeline/#";
  let data = null;

  // Boxes start switched on only when Pipeline OS is on its own. When Task List OS is in the folder
  // (its Home scripts load first and set window.TL), they start off, so attaching never changes
  // someone's Home. Home reads this once, when it first builds the layout.
  function startOn() { return !window.TL; }
  function box(def) { Object.defineProperty(def, "defaultOn", { get: startOn, enumerable: true }); return def; }

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function person(id) { return M.personById(data, id); }

  // ---------- The boxes ----------
  function value() {
    if (M.notSetUp(data)) return '<div class="hbox__setup"><p><strong>Let\u2019s set up your pipeline.</strong> In the Claude desktop app, open the Code tab in your Small Business Toolkit folder and type <code>/setup</code>. Claude asks what you sell, connects your email, calendar and calls, then fills this page with your real deals.</p></div>';
    const n = M.numbers(data);
    if (!n.open && !n.wonMonthCount) return empty("No open deals yet. Claude adds them from your email, calendar and calls on each check-in, or add one with New deal on the Pipeline page.");
    const stages = M.openStages().map(function (s) { return { s: s, n: M.dealsInStage(data, s.key).length, v: M.stageValue(data, s.key) }; }).filter(function (r) { return r.n; });
    return '<p class="hstat"><span class="hstat__num">' + esc(M.money(data, n.pipeline)) + '</span><span class="hstat__label">in your pipeline, ' + n.open + (n.open === 1 ? " deal" : " deals") + "</span></p>" +
      (stages.length ? '<ul class="hlist" role="list">' + stages.map(function (r) {
        return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(r.s.label) + '</span><span class="hrow__sub">' + r.n + (r.n === 1 ? " deal" : " deals") + '</span></span><span class="hrow__meta">' + esc(M.money(data, r.v)) + "</span></li>";
      }).join("") + "</ul>" : "") +
      '<p class="hbox__more">Won this month: ' + esc(M.money(data, n.wonMonthValue)) + (n.winRate == null ? "" : ". Win rate " + n.winRate + "% over 90 days") + ".</p>";
  }

  function review() {
    const chases = M.waitingSuggestions(data);
    const fresh = data.deals.filter(M.isSuggested);
    const total = M.reviewCount(data);
    if (!total) return empty("Nothing waiting. When Claude has a chase drafted or spots a new deal, it shows here.");
    const rows = fresh.map(function (x) { return { title: x.title, sub: "New deal Claude spotted" }; })
      .concat(chases.map(function (s) { return { title: s.title, sub: s.kind === "chase" ? "Chase, email drafted" : s.kind === "prep" ? "Call prep" : "Question for you" }; }));
    return '<p class="hstat"><span class="hstat__num">' + total + '</span><span class="hstat__label">' + (total === 1 ? "thing" : "things") + " for you to decide</span></p>" +
      '<ul class="hlist" role="list">' + rows.slice(0, 3).map(function (r) { return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(r.title) + '</span><span class="hrow__sub">' + esc(r.sub) + "</span></span></li>"; }).join("") + "</ul>";
  }

  function calls() {
    const list = M.meetingsThisWeek(data);
    if (!list.length) return empty("No sales calls in the next 7 days. Claude spots them in your calendar on each check-in.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (r) {
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(r.meeting.title || r.deal.title) + '</span><span class="hrow__sub">' + esc(r.deal.organisation || r.deal.title) + "</span></span>" +
        '<span class="hrow__meta">' + esc(M.whenLabel(r.meeting.start)) + "</span></li>";
    }).join("") + "</ul>";
  }

  function gaps() {
    const list = M.openDeals(data).filter(M.hasBeenChecked).sort(function (a, b) { return M.checkScore(a) - M.checkScore(b) || (Number(b.value) || 0) - (Number(a.value) || 0); });
    if (!list.length) return empty("Once Claude has checked your deals, the ones you know least about show here, with the question to ask.");
    return '<ul class="hlist" role="list">' + list.slice(0, 3).map(function (x) {
      const q = x.check.questions[0];
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(x.title) + '</span><span class="hrow__sub">' + esc(q ? "Ask: " + q : M.checkGaps(x).length + " questions not answered yet") + '</span></span><span class="hrow__meta">' + M.checkScore(x) + "%</span></li>";
    }).join("") + "</ul>";
  }

  function quiet() {
    const list = M.openDeals(data).filter(function (x) { return M.needsChase(data, x); }).sort(function (a, b) { return M.quietDays(b) - M.quietDays(a); });
    if (!list.length) return empty("Nothing has gone quiet. When a deal goes too long without contact, it shows here and Claude drafts a chase for you to approve.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (x) {
      const p = person(x.personIds[0]);
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(x.title) + "</span>" + (p ? '<span class="hrow__sub">' + esc(p.name) + "</span>" : "") + '</span><span class="hrow__meta">' + M.quietDays(x) + " days</span></li>";
    }).join("") + "</ul>";
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("pipeline", {
    boxes: [
      box({ id: "value", title: "Pipeline", icon: "trendingUp", size: 1, page: PAGE + "pipeline", render: value }),
      box({ id: "review", title: "Sales to review", icon: "sparkle", size: 1, page: PAGE + "review", render: review }),
      box({ id: "calls", title: "Sales calls this week", icon: "phone", size: 1, page: PAGE + "pipeline", render: calls }),
      box({ id: "gaps", title: "Deals with the biggest gaps", icon: "target", size: 2, page: PAGE + "pipeline", render: gaps }),
      box({ id: "quiet", title: "Gone quiet", icon: "hourglass", size: 1, page: PAGE + "review", render: quiet })
    ],
    greetingName: function () { return data && data.settings.yourName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "pipeline",
        fileName: "pipeline.json",
        dataPaths: ["data", "", "apps/pipeline/data"],
        api: "/api/data/pipeline/pipeline.json",
        validate: M.validate,
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
    },
    action: function () {}
  });
})();
