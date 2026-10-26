/*
  PROPOSAL WRITING OS ON HOME: the boxes this tool adds to the Home dashboard
  -------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (see "home" in menu.json).
  It reads the same proposals file as the app, through the same shared store. On its own,
  Proposal Writing OS's boxes start switched on. With another tool's Home boxes already loaded (Task List
  OS or Pipeline OS), they start switched off (the person turns them on in Home's list), so
  attaching never changes someone's Home.
*/
(function () {
  "use strict";

  const M = window.PO.model;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../proposals/#";
  let data = null;

  function startOn() { return !window.TL && !window.PL; }
  function box(def) { Object.defineProperty(def, "defaultOn", { get: startOn, enumerable: true }); return def; }
  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }

  // ---------- The boxes ----------
  function overview() {
    if (M.notSetUp(data)) return '<div class="hbox__setup"><p><strong>Let’s set up your proposals.</strong> In the Claude desktop app, open the Code tab in your Small Business Toolkit OS folder and type <code>/setup</code>. Claude learns your brand, packages and prices, then writes your first proposal from a real client.</p></div>';
    const n = M.numbers(data);
    if (!data.proposals.length) return empty("No proposals yet. Put everything about a client in their folder and press Write proposal on the Clients page.");
    return '<p class="hstat"><span class="hstat__num">' + esc(M.money(data, n.sentValue)) + '</span><span class="hstat__label">out with clients, ' + n.sentCount + (n.sentCount === 1 ? " proposal" : " proposals") + "</span></p>" +
      '<ul class="hlist" role="list">' +
      '<li class="hrow"><span class="hrow__main"><span class="hrow__title">Ready for you to check</span></span><span class="hrow__meta">' + n.toCheck + "</span></li>" +
      '<li class="hrow"><span class="hrow__main"><span class="hrow__title">Won this month</span></span><span class="hrow__meta">' + esc(M.money(data, n.wonMonthValue)) + "</span></li>" +
      "</ul>" + (n.winRate == null ? "" : '<p class="hbox__more">Win rate ' + n.winRate + "% over 90 days.</p>");
  }

  function toCheck() {
    const list = M.byStatus(data, "draft");
    if (!list.length) return empty("Nothing to check. When Claude writes a proposal, it shows here.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (p) {
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(M.clientName(data, p)) + '</span><span class="hrow__sub">' + esc(p.title || "Proposal") + '</span></span><span class="hrow__meta">' + esc(M.money(data, M.proposalValue(data, p))) + "</span></li>";
    }).join("") + "</ul>";
  }

  function ready() {
    const list = data.clients.filter(function (c) { return M.clientState(data, c) === "ready" || M.clientState(data, c) === "writing"; });
    if (!list.length) return empty("No clients waiting for a proposal. Put a client’s notes, calls and emails in their folder and Claude picks it up.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (c) {
      const writing = M.clientState(data, c) === "writing";
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(c.name) + '</span><span class="hrow__sub">' + esc(writing ? "Claude is writing it" : c.sources.length + (c.sources.length === 1 ? " thing" : " things") + " in the folder") + "</span></span></li>";
    }).join("") + "</ul>";
  }

  function nudge() {
    const list = M.byStatus(data, "sent").filter(function (p) { return M.needsChase(data, p); });
    if (!list.length) return empty("Nothing to chase. When a sent proposal goes quiet, it shows here with a follow-up from Claude.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (p) {
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(M.clientName(data, p)) + '</span><span class="hrow__sub">' + esc(p.title || "Proposal") + '</span></span><span class="hrow__meta">' + M.ageDays(p.sentAt) + " days</span></li>";
    }).join("") + "</ul>";
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("proposals", {
    boxes: [
      box({ id: "overview", title: "Proposals", icon: "fileText", size: 1, page: PAGE + "proposals", render: overview }),
      box({ id: "check", title: "Proposals to check", icon: "sparkle", size: 1, page: PAGE + "proposals", render: toCheck }),
      box({ id: "ready", title: "Clients ready for a proposal", icon: "folder", size: 1, page: PAGE + "clients", render: ready }),
      box({ id: "nudge", title: "Proposals gone quiet", icon: "hourglass", size: 1, page: PAGE + "proposals", render: nudge })
    ],
    greetingName: function () { return data && data.settings.yourName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "proposals",
        fileName: "proposals.json",
        dataPaths: ["data", "", "apps/proposals/data"],
        api: "/api/data/proposals/proposals.json",
        validate: M.validate,
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
    },
    action: function () {}
  });
})();
