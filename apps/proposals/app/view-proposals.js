/*
  PROPOSALS: every proposal, by where it's up to
  ----------------------------------------------
  The numbers along the top (worked out from the packages, never typed in), then the proposals
  grouped: ready to check, approved, sent and waiting, won and lost. A filter along the top.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c;
  window.PO.views = window.PO.views || {};

  const FILTERS = [
    { key: "open", label: "In progress", statuses: ["writing", "draft", "approved", "sent"] },
    { key: "won", label: "Won", statuses: ["won"] },
    { key: "lost", label: "Lost", statuses: ["lost"] },
    { key: "all", label: "All", statuses: M.STATUS_ORDER }
  ];
  const GROUPS = [
    { status: "draft", title: "Ready for you to check", icon: "sparkle", accent: true },
    { status: "approved", title: "Approved, ready to send", icon: "check" },
    { status: "sent", title: "Sent, waiting to hear", icon: "mail" },
    { status: "won", title: "Won", icon: "flag" },
    { status: "lost", title: "Lost", icon: "x" }
  ];

  function stat(value, label) {
    return '<div class="stat"><span class="stat__value num">' + esc(value) + '</span><span class="stat__label">' + esc(label) + "</span></div>";
  }

  window.PO.views.proposals = {
    title: function () { return "Proposals"; },
    sub: function (c) {
      const n = M.numbers(c.d);
      return n.toCheck ? n.toCheck + (n.toCheck === 1 ? " proposal" : " proposals") + " ready for you to check" : "Written by Claude, checked by you";
    },
    render: function (c) {
      const d = c.d;
      if (M.notSetUp(d)) return '<div class="page">' + C.setupCard() + "</div>";
      const n = M.numbers(d);
      const filter = FILTERS.find(function (f) { return f.key === c.state.filter; }) || FILTERS[0];
      const writing = M.waitingRequests(d, "write").map(function (r) { return M.clientById(d, r.clientId); }).filter(Boolean);
      let html = '<div class="page">';
      if (M.needsPackages(d)) html += '<div class="banner banner--setup">' + icon("info") + "<span><strong>Add your packages and prices.</strong> Every proposal’s options and totals come from them.</span>" +
        '<a class="btn btn--sm" href="#packages">Add packages</a></div>';
      html += '<div class="pstats">' +
        stat(String(n.toCheck), n.toCheck === 1 ? "ready to check" : "ready to check") +
        stat(M.money(d, n.sentValue), "out with clients, " + n.sentCount + " sent" + (n.sentRates ? ", day and hourly rates not counted" : "")) +
        stat(M.money(d, n.wonMonthValue), "won this month" + (n.wonMonthRates ? ", day and hourly rates not counted" : "") + (n.winRate == null ? "" : ", " + n.winRate + "% win rate")) +
        "</div>";
      html += '<div class="pipe-bar"><div class="segmented" role="group" aria-label="Show">' + FILTERS.map(function (f) {
        return '<button type="button" data-action="filter" data-value="' + f.key + '" aria-pressed="' + (f.key === filter.key) + '">' + esc(f.label) + "</button>";
      }).join("") + "</div></div>";

      if (writing.length && filter.key !== "won" && filter.key !== "lost") {
        html += '<section class="panel panel--accent writing-now">' + C.sectionHead("Claude is writing", { icon: "loader", count: writing.length }) +
          '<ul class="writing-now__list">' + writing.map(function (cl) { return '<li data-client="' + esc(cl.id) + '">' + icon("loader", "spin") + "<span><strong>" + esc(cl.name) + "</strong> <span class=\"muted\">usually ready in 2 to 4 minutes</span></span></li>"; }).join("") + "</ul></section>";
      }

      const groups = GROUPS.filter(function (g) { return filter.statuses.indexOf(g.status) > -1; });
      let any = false;
      groups.forEach(function (g) {
        const list = M.byStatus(d, g.status).sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); });
        if (!list.length) return;
        any = true;
        html += "<section>" + C.sectionHead(g.title, { icon: g.icon, count: list.length, accent: g.accent }) +
          '<div class="pgrid">' + list.map(function (p) { return C.proposalCard(d, p, { anim: c.anim }); }).join("") + "</div></section>";
      });
      if (!any && !writing.length) {
        html += filter.key === "open" ? C.empty("thinking", "No proposals on the go", "Put everything about a client in their folder (notes, a call, their emails) and press Write proposal on the Clients page. Or press New proposal and paste your notes.",
          '<div class="empty__actions"><a class="btn" href="#clients">' + icon("folder") + 'Go to Clients</a><button type="button" class="btn btn--primary" data-action="new-proposal">' + icon("plus") + "New proposal</button></div>")
          : C.empty("", "Nothing here yet", filter.key === "won" ? "Proposals you win show here." : filter.key === "lost" ? "Proposals that didn't go ahead show here, with why." : "Your proposals show here.", "", true);
      }
      return html + "</div>";
    }
  };
})();
