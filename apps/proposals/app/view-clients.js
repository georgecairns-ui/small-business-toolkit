/*
  CLIENTS: one folder per client, and the one button that writes their proposal
  -----------------------------------------------------------------------------
  Everything about a client lives in their own folder (files/02-clients/<name>/): call notes,
  transcripts, emails, a brief, anything. Claude lists what's in each folder here (the app can't
  look inside folders itself). Write proposal asks Claude to write one from all of it.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c;
  window.PO.views = window.PO.views || {};

  function sources(c) {
    if (!c.sources.length) return '<p class="muted ccard__none">Nothing in the folder yet that Claude has seen.</p>';
    const counts = {};
    c.sources.forEach(function (s) { const k = M.SOURCE_KINDS[s.kind] ? s.kind : "other"; counts[k] = (counts[k] || 0) + 1; });
    return '<div class="ccard__sources">' + Object.keys(counts).map(function (k) {
      const n = counts[k], label = M.SOURCE_KINDS[k];
      return '<span class="chip chip--quiet">' + n + " " + esc(n === 1 ? label.toLowerCase() : label.toLowerCase() + "s") + "</span>";
    }).join("") + "</div>";
  }

  function card(c, d, anim) {
    const state = M.clientState(d, c);
    const latest = M.proposalsFor(d, c.id)[0];
    const req = M.requestFor(d, c.id);
    const actions = [];
    if (req) actions.push('<a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink("Write the proposal for " + c.name + " in Proposal Writing OS. Follow .claude/skills/write-a-proposal.")) + '" title="If nothing has happened after 5 minutes">' + icon("external") + "Open in Claude</a>");
    else if (latest) actions.push('<button type="button" class="btn btn--sm" data-action="write-proposal" title="Write a fresh proposal from everything in the folder">' + icon("refresh") + "Write again</button>",
      '<button type="button" class="btn btn--sm btn--primary" data-action="open-proposal" data-proposal="' + esc(latest.id) + '">Open proposal' + icon("arrowRight") + "</button>");
    else actions.push('<button type="button" class="btn btn--sm btn--primary" data-action="write-proposal">' + icon("sparkle") + "Write proposal</button>");
    return '<article class="ccard' + anim("c-" + c.id) + '" data-client="' + esc(c.id) + '">' +
      '<div class="ccard__top"><h3 class="ccard__name">' + esc(c.name) + "</h3>" + C.clientChip(state) + "</div>" +
      (c.contact.name ? '<p class="ccard__contact">' + icon("user") + esc([c.contact.name, c.contact.role].filter(Boolean).join(", ")) + "</p>" : "") +
      (c.summary ? '<p class="ccard__summary">' + esc(c.summary) + "</p>" : "") +
      sources(c) +
      (state === "needs-more" && c.missing.length ? '<div class="ccard__missing"><strong>Claude needs:</strong> ' + esc(c.missing.join("; ")) + "</div>" : "") +
      '<div class="ccard__foot"><button type="button" class="ccard__folder" data-action="copy" data-text="' + esc(c.folder) + '" title="Copy where the folder is">' + icon("folder") + "<span>" + esc(c.folder) + "</span></button>" +
      '<span class="spacer"></span>' + actions.join("") + "</div></article>";
  }

  window.PO.views.clients = {
    title: function () { return "Clients"; },
    sub: function (c) { return c.d.clients.length ? c.d.clients.length + (c.d.clients.length === 1 ? " client folder" : " client folders") : "One folder per client"; },
    render: function (c) {
      const d = c.d;
      if (M.notSetUp(d)) return '<div class="page">' + C.setupCard() + "</div>";
      const folder = d.settings.clientsFolder;
      const scanning = M.waitingRequests(d, "scan").length > 0;
      const checked = d.checkIn.lastRunAt ? "Claude last looked " + C.ago(d.checkIn.lastRunAt) + (d.checkIn.foldersChecked ? ", " + d.checkIn.foldersChecked + " folders" : "") + "." : "Claude hasn’t looked yet.";
      let html = '<div class="page">' +
        '<section class="panel how-folders"><div class="how-folders__text"><h2>' + icon("folder") + "One folder per client, and Claude does the rest</h2>" +
        "<p>Put everything about a client in their folder inside <button type=\"button\" class=\"link-btn\" data-action=\"copy\" data-text=\"" + esc(folder) + '">' + esc(folder) + "</button>: call notes, transcripts, emails, their brief, anything. Then press <strong>Write proposal</strong>." +
        (d.settings.autoWrite ? " New folders get a proposal by themselves when Claude next checks." : "") + "</p>" +
        '<p class="muted">' + esc(checked) + "</p></div>" +
        '<div class="how-folders__actions"><button type="button" class="btn" data-action="scan"' + (scanning ? " disabled" : "") + ">" + icon(scanning ? "loader" : "refresh", scanning ? "spin" : "") + (scanning ? "Checking the folders" : "Check for new folders") + "</button>" +
        '<button type="button" class="btn btn--primary" data-action="new-proposal">' + icon("plus") + "New client</button></div></section>";
      if (!d.clients.length) {
        html += C.empty("thinking", "No client folders yet", "Make a folder for a client in " + folder + " and drop in anything you have, then press Check for new folders. Or press New client and paste your notes: Claude makes the folder for you.", "");
        return html + "</div>";
      }
      const order = { writing: 0, ready: 1, draft: 2, "needs-more": 3, approved: 4, sent: 5, won: 6, lost: 7 };
      const list = d.clients.slice().sort(function (a, b) { return (order[M.clientState(d, a)] - order[M.clientState(d, b)]) || a.name.localeCompare(b.name); });
      html += '<div class="cgrid">' + list.map(function (cl) { return card(cl, d, c.anim); }).join("") + "</div>";
      return html + "</div>";
    }
  };
})();
