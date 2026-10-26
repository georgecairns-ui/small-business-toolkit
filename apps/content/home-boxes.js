/*
  CONTENT MACHINE OS ON HOME: the boxes this tool adds to the Home dashboard
  -------------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (listed under "home" in the tool's menu file). It reads the same data
  file as the app itself, through the same shared store. Every box starts switched off, so attaching
  never changes someone's Home: the person switches boxes on from Home's list.
*/
(function () {
  "use strict";

  const M = window.CM.model;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../content/#";
  const STYLE_ID = "cm-home-style";
  let data = null;

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function today() { return ui.isoDate(new Date()); }

  function setupNote() {
    return '<div class="hbox__setup"><p><strong>Let’s set up your content machine.</strong> Open this folder in the Code tab of the Claude desktop app and type <code>/setup</code>. Claude learns your business, researches your market and plans your first posts.</p></div>';
  }

  function row(title, sub) {
    return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(title) + '</span><span class="hrow__sub">' + esc(sub) + "</span></span></li>";
  }

  function postTitle(it) { return "Post to " + M.platform(it.platform).label; }

  // ---------- The boxes ----------
  function posting() {
    if (!M.isSetUp(data)) return setupNote();
    const t = M.todo(data, today());
    const items = t.overdue.concat(t.today).filter(function (it) { return it.kind === "post"; });
    if (!items.length) return empty("Nothing to post today. Approved posts show here on their day, with a Copy button.");
    return '<ul class="hlist" role="list">' + items.slice(0, 5).map(function (it) { return row(postTitle(it), M.titleOf(it.post)); }).join("") + "</ul>" +
      (items.length > 5 ? '<p class="hbox__more">and ' + (items.length - 5) + " more</p>" : "");
  }

  function waiting() {
    if (!M.isSetUp(data)) return empty("Once Claude has planned your posts, the photos it needs and the posts to check show here.");
    const t = M.todo(data, today());
    const items = t.overdue.concat(t.today, t.week).filter(function (it) { return it.kind !== "post"; });
    if (!items.length) return empty("Nothing waiting on you. Photos Claude needs and posts to check show here.");
    return '<p class="hstat"><span class="hstat__num">' + items.length + '</span><span class="hstat__label">' + (items.length === 1 ? "thing" : "things") + " waiting on you</span></p>" +
      '<ul class="hlist" role="list">' + items.slice(0, 4).map(function (it) {
        return row(it.kind === "approve" ? "Check and approve: " + M.titleOf(it.post) : it.need.text, ui.friendlyDue(it.due));
      }).join("") + "</ul>";
  }

  function dayColumn(iso, todayIso) {
    const date = ui.parseDate(iso);
    const posts = M.postsForDay(data, iso);
    return '<li class="cmweek__day' + (iso === todayIso ? " is-today" : "") + '"><span class="cmweek__name">' + esc(date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })) + "</span>" +
      (posts.length ? posts.map(function (p) { return '<span class="cmweek__post" title="' + esc(M.titleOf(p)) + '">' + esc(M.titleOf(p)) + "</span>"; }).join("") : '<span class="cmweek__none">Nothing</span>') + "</li>";
  }

  function week() {
    if (!M.isSetUp(data)) return empty("Once Claude has planned your posts, the week shows here.");
    ensureStyles();
    const todayIso = today();
    return '<ol class="cmweek" role="list">' + M.weekDays(todayIso, M.weekStartsOf(data)).map(function (iso) { return dayColumn(iso, todayIso); }).join("") + "</ol>";
  }

  function healthBox() {
    if (!M.isSetUp(data)) return empty("Once you start posting, how your content machine is doing shows here.");
    ensureStyles();
    const checks = M.health(data, today()), overall = M.healthOverall(checks);
    return '<p class="cmhealth__overall"><span class="cmhealth__pill cmhealth__pill--' + overall + '">' + esc(M.HEALTH_LABELS[overall]) + "</span></p>" +
      '<ul class="hlist" role="list">' + checks.map(function (c) {
        return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(c.label) + '</span><span class="hrow__sub">' + esc(c.valueText + ", target " + c.targetText) + "</span></span>" +
          '<span class="cmhealth__dot cmhealth__dot--' + c.state + '" title="' + esc(M.HEALTH_LABELS[c.state]) + '"></span></li>';
      }).join("") + "</ul>";
  }

  // Home's own stylesheet has no seven day grid and no health pills, so this tool adds the small ones it needs once.
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".cmweek { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 6px; }" +
      ".cmweek__day { display: grid; align-content: start; gap: 4px; min-width: 0; padding: 8px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); }" +
      ".cmweek__day.is-today { border-color: var(--color-accent-line); background: var(--color-accent-soft); }" +
      ".cmweek__name { font-size: var(--text-xs); font-weight: 650; color: var(--color-ink-soft); }" +
      ".cmweek__post { font-size: var(--text-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
      ".cmweek__none { font-size: var(--text-xs); color: var(--color-faint); }" +
      ".cmhealth__overall { margin: 0 0 8px; }" +
      ".cmhealth__pill { display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 650; }" +
      ".cmhealth__pill--ok { background: var(--color-success-soft); color: var(--color-success); }" +
      ".cmhealth__pill--warn { background: var(--color-warning-soft); color: var(--color-warning); }" +
      ".cmhealth__pill--bad { background: var(--color-danger-soft); color: var(--color-danger); }" +
      ".cmhealth__dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--color-success); }" +
      ".cmhealth__dot--warn { background: var(--color-warning); }" +
      ".cmhealth__dot--bad { background: var(--color-danger); }";
    document.head.appendChild(style);
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("content", {
    boxes: [
      { id: "posting", title: "Posting today", icon: "megaphone", size: 1, defaultOn: false, page: PAGE + "todo", render: posting },
      { id: "waiting", title: "Waiting on you", icon: "checkSquare", size: 1, defaultOn: false, page: PAGE + "todo", render: waiting },
      { id: "week", title: "This week’s posts", icon: "calendar", size: 2, defaultOn: false, page: PAGE + "calendar", render: week },
      { id: "health", title: "Health check", icon: "barChart", size: 1, defaultOn: false, page: PAGE + "health", render: healthBox }
    ],
    greetingName: function () { return data && data.settings.ownerName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "content",
        fileName: "content.json",
        dataPaths: ["data", "", "apps/content/data"],
        api: "/api/data/content/content.json",
        validate: function (d) { return d; },
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
    },
    action: function () {}
  });
})();
