/*
  CONNECTIONS: every app the toolkit can connect to
  -------------------------------------------------
  Grouped (Email and calendar, Calls, and so on). Each card: the name, one line on what connecting it does,
  which tools use it, its status and one button: Connect, Check it or Fix it. Every button opens Claude
  with the job typed in, because signing in to an app happens on that app's own screen, inside Claude.
  The filter (All, Connected, Not connected) is kept until the page is closed.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc;
  const L = window.TK.list, M = window.TK.model, C = window.TK.components;
  const FILTERS = [{ id: "all", label: "All" }, { id: "connected", label: "Connected" }, { id: "not-connected", label: "Not connected" }];
  let filter = "all";

  function shows(status) {
    if (filter === "connected") return status === "connected";
    if (filter === "not-connected") return status !== "connected";
    return true;
  }

  function card(d, app) {
    const c = M.conn(d, app.id), btn = M.connButton(d, app);
    const used = M.toolNames(app.usedBy).map(function (n) { return '<span class="chip">' + esc(n) + "</span>"; }).join("");
    const how = [c.how, c.checked ? "checked " + C.shortDate(c.checked) : ""].filter(Boolean).join(", ");
    return '<article class="card tk-card tk-card--' + esc(c.status) + '">' +
      '<div class="tk-card__top"><h4 class="tk-card__name">' + esc(app.name) + "</h4>" + C.statusChip(M.CONN, c.status) + "</div>" +
      '<p class="tk-card__what">' + esc(app.what) + "</p>" +
      '<div class="tk-card__used"><span class="tk-card__label">Used by</span>' + used + "</div>" +
      (c.note ? '<p class="tk-card__note">' + esc(c.note) + "</p>" : "") +
      (how ? '<p class="tk-card__meta">' + esc(how.charAt(0).toUpperCase() + how.slice(1)) + "</p>" : "") +
      '<div class="tk-card__actions">' + C.claudeActions(btn.prompt, { label: btn.label, small: true, primary: c.status !== "connected" }) + "</div></article>";
  }

  function render(root, ctx) {
    const d = ctx.data;
    const groups = L.GROUPS.map(function (g) {
      const cards = L.APPS.filter(function (a) { return a.group === g && shows(M.connStatus(d, a.id)); }).map(function (a) { return card(d, a); });
      return cards.length ? '<section class="tk-group" aria-label="' + esc(g) + '"><h3 class="tk-group__title">' + esc(g) + '</h3><div class="tk-grid">' + cards.join("") + "</div></section>" : "";
    }).join("");
    const n = M.counts(d);
    root.innerHTML = '<div class="page">' +
      C.pageHead(M.connectedLine(d), n.attention ? (n.attention === 1 ? "1 needs attention. " : n.attention + " need attention. ") + "Each button opens Claude, and you sign in on the app's own screen." : "Each button opens Claude, and you sign in on the app's own screen.",
        C.claudeActions(M.prompt.connectElse(), { label: "Connect something else" })) +
      C.claudeNote() +
      '<div class="filters" role="group" aria-label="Show">' + FILTERS.map(function (f) {
        return '<button type="button" class="filter' + (filter === f.id ? " is-active" : "") + '" data-filter="' + f.id + '" aria-pressed="' + (filter === f.id) + '">' + esc(f.label) + "</button>";
      }).join("") + "</div>" +
      (groups || C.emptyState(filter === "connected" ? "Nothing connected yet" : "Everything is connected", filter === "connected" ? "Press Connect on any app and Claude walks you through it." : "")) +
      "</div>";
    root.onclick = function (e) {
      const f = e.target.closest("[data-filter]");
      if (!f) return;
      filter = f.getAttribute("data-filter");
      ctx.redraw();
    };
  }

  window.TK.views.connections = { render: render };
})();
