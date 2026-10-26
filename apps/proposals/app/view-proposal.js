/*
  ONE PROPOSAL: the document, and everything you can do with it
  -------------------------------------------------------------
  The proposal laid out like the finished document (doc.js), editable in place while it's a
  draft. Down the side: approve it, save it as a PDF, open the covering email, mark it sent, won
  or lost, ask Claude to change it, and what Claude wants checked (prices it couldn't find,
  anything nobody said, the files it used).
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c, Doc = window.PO.doc;
  window.PO.views = window.PO.views || {};

  function canEdit(c, p) { return p.status === "draft" || p.status === "approved" || !!c.state.unlocked[p.id]; }

  function actions(c, p) {
    const d = c.d, out = [];
    if (p.status === "draft") out.push('<button type="button" class="btn btn--primary btn--block" data-action="approve">' + icon("check") + "Approve it</button>");
    out.push('<button type="button" class="btn btn--block' + (p.status === "approved" ? " btn--primary" : "") + '" data-action="print">' + icon("fileText") + "Save as PDF</button>");
    if (p.coverEmail && p.coverEmail.body && (p.status === "approved" || p.status === "draft")) out.push('<button type="button" class="btn btn--block" data-action="cover-email">' + icon("mail") + "Open the covering email</button>");
    if (p.status === "draft" || p.status === "approved") out.push('<button type="button" class="btn btn--block btn--ghost" data-action="mark-sent">' + icon("arrowRight") + "I’ve sent it</button>");
    if (p.status === "sent") out.push('<div class="rail-pair"><button type="button" class="btn btn--primary" data-action="mark-won">' + icon("flag") + 'Won</button><button type="button" class="btn" data-action="mark-lost">Lost</button></div>');
    if (p.status === "won" || p.status === "lost") out.push('<button type="button" class="btn btn--block btn--ghost" data-action="reopen">' + icon("undo") + "Back to sent</button>");
    return out.join("");
  }

  function chase(c, p) {
    const d = c.d;
    if (!M.needsChase(d, p)) return "";
    if (p.followUp && p.followUp.body) {
      return '<section class="panel rail-box">' + C.sectionHead("Time for a nudge", { icon: "hourglass" }) +
        '<p class="muted">Sent ' + esc(C.ago(p.sentAt)) + ". " + esc(p.followUp.why || "Claude has written a friendly follow-up.") + "</p>" +
        '<button type="button" class="btn btn--primary btn--sm" data-action="follow-up">' + icon("mail") + "Open the follow-up</button></section>";
    }
    return '<section class="panel rail-box">' + C.sectionHead("Time for a nudge", { icon: "hourglass" }) +
      '<p class="muted">Sent ' + esc(C.ago(p.sentAt)) + " and no news yet.</p>" +
      '<a class="btn btn--sm" href="' + esc(C.claudeLink("Write a follow-up for my proposal to " + M.clientName(d, p) + " in Proposal Writing OS. Follow .claude/skills/follow-up-a-proposal.")) + '">' + icon("sparkle") + "Ask Claude for a follow-up</a></section>";
  }

  function checks(c, p) {
    const d = c.d;
    let html = "";
    if (p.unpriced.length) {
      html += '<section class="panel rail-box rail-box--warn">' + C.sectionHead("Needs a price", { icon: "alert", count: p.unpriced.length }) +
        '<ul class="rail-list">' + p.unpriced.map(function (u) { return "<li><strong>" + esc(u.what) + "</strong>" + (u.why ? '<span class="muted">' + esc(u.why) + "</span>" : "") + "</li>"; }).join("") + "</ul>" +
        '<p class="muted rail-small">These aren’t on your price list, so Claude left them out rather than guess. Add them on Packages, then ask Claude to put them in.</p>' +
        '<a class="btn btn--sm" href="#packages">' + icon("list") + "Go to Packages</a></section>";
    }
    if (p.gaps.length) {
      html += '<section class="panel rail-box">' + C.sectionHead("Claude couldn’t find", { icon: "info", count: p.gaps.length }) +
        '<ul class="rail-list">' + p.gaps.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul>" +
        '<p class="muted rail-small">Nobody said these, so Claude didn’t make them up. Fill them in on the page, or tell Claude below.</p></section>';
    }
    return html;
  }

  function changeBox(c, p) {
    const waiting = M.changeWaiting(c.d, p.id);
    if (waiting) {
      return '<section class="panel rail-box rail-box--doing">' + icon("loader", "spin") + "<div><strong>Claude is changing it</strong><p class=\"muted\">“" + esc(waiting.instruction) + "”</p>" +
        '<a class="link-btn" href="' + esc(C.claudeLink("In Proposal Writing OS, follow .claude/skills/change-a-proposal for the waiting change requests in apps/proposals/data/proposals.json.")) + '">Nothing happening? Open in Claude</a></div></section>';
    }
    if (!canEdit(c, p)) return "";
    return '<section class="panel rail-box"><form data-form="change" autocomplete="off">' + C.sectionHead("Ask Claude to change it", { icon: "sparkle" }) +
      '<textarea class="textarea" name="instruction" rows="3" maxlength="4000" placeholder="Make it shorter. Lead with the Growth package. Mention the 2 weeks they’re closed in August."></textarea>' +
      '<div class="rail-row"><span class="muted rail-small">Or click any words on the page and type.</span><button type="submit" class="btn btn--sm btn--primary">Ask Claude</button></div></form></section>';
  }

  function sources(p) {
    if (!p.sources.length) return "";
    return '<details class="panel rail-box rail-sources"><summary>' + icon("folder") + "What Claude used (" + p.sources.length + ")</summary>" +
      '<ul class="rail-list">' + p.sources.map(function (s) { return "<li><strong>" + esc(s.file || "") + "</strong>" + (s.what ? '<span class="muted">' + esc(s.what) + "</span>" : "") + "</li>"; }).join("") + "</ul></details>";
  }

  window.PO.views.proposal = {
    title: function (c) { const p = M.proposalById(c.d, c.state.proposalId); return p ? M.clientName(c.d, p) : "Proposal"; },
    sub: function (c) { const p = M.proposalById(c.d, c.state.proposalId); return p ? (p.title || p.cover.title || "") : ""; },
    render: function (c) {
      const d = c.d;
      const p = M.proposalById(d, c.state.proposalId);
      if (!p) return '<div class="page">' + C.empty("shrug", "That proposal isn’t here", "It may have been deleted. Your other proposals are on the Proposals page.", '<a class="btn" href="#proposals">Go to Proposals</a>') + "</div>";
      if (p.status === "writing") {
        return '<div class="page">' + C.empty("thinking", "Claude is writing this one", "It’s reading everything in the client’s folder. It usually takes 2 to 4 minutes, and this page fills in by itself.", "") + "</div>";
      }
      const edit = canEdit(c, p);
      const locked = !edit ? '<div class="doc-locked no-print">' + icon("info") + "<span>" + (p.status === "sent" ? "Sent " + esc(C.ago(p.sentAt)) + ". It’s locked so it matches what the client has." : "This proposal is closed.") + '</span><button type="button" class="btn btn--sm btn--ghost" data-action="unlock">Change it anyway</button></div>' : "";
      return '<div class="page page--doc"><div class="doc-col">' +
        '<div class="doc-bar no-print"><a class="btn btn--sm btn--ghost" href="#proposals">' + icon("chevronLeft") + "All proposals</a>" + C.statusChip(p.status) +
        (edit ? '<span class="muted doc-bar__hint">' + icon("pencil") + "Click any words to change them</span>" : "") +
        '<span class="doc-bar__quick">' + (p.status === "draft" ? '<button type="button" class="btn btn--sm btn--primary" data-action="approve">' + icon("check") + "Approve</button>" : "") +
        '<button type="button" class="btn btn--sm" data-action="print">' + icon("fileText") + "PDF</button></span>" + "</div>" + locked +
        Doc.render(d, p, { editable: edit }) + "</div>" +
        '<aside class="doc-rail no-print">' +
        '<section class="panel rail-box rail-actions">' + actions(c, p) +
        (M.validUntil(d, p) && M.isOpen(p) ? '<p class="muted rail-small">Valid until ' + esc(C.longDate(M.validUntil(d, p))) + ".</p>" : "") +
        (p.lostReason ? '<p class="muted rail-small">Why it was lost: ' + esc(p.lostReason) + "</p>" : "") + "</section>" +
        chase(c, p) + changeBox(c, p) + checks(c, p) + sources(p) +
        '<button type="button" class="btn btn--ghost btn--sm rail-delete" data-action="delete-proposal">' + icon("trash") + "Delete this proposal</button>" +
        "</aside></div>";
    }
  };
})();
