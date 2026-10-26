/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Status chips, proposal cards, client cards, section headings and empty states. Each function
  returns a piece of HTML as text. Buttons carry data-action="..." and app.js decides what each
  does. Same look and wording as Task List OS and Pipeline OS.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc;
  const icon = ui.icon;
  const M = window.PO.model;

  // Where the shared images live (worked out from the theme.css link, so it survives moving)
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = {
    welcome: SHARED + "images/claude-welcome.jpg",
    thinking: SHARED + "images/claude-thinking.jpg",
    celebrate: SHARED + "images/claude-celebrate.jpg",
    shrug: SHARED + "images/claude-shrug.jpg",
    trophy: SHARED + "images/claude-trophy.jpg"
  };

  // ---------- Opening something in Claude ----------
  // Opens the Claude desktop app with the prompt typed in, ready for the person to read and send.
  // With the folder known it opens a Claude Code session in their folder; otherwise a new chat.
  let kitFolder = null;
  function setFolder(f) { kitFolder = f || null; }
  function claudeLink(prompt) {
    const q = encodeURIComponent(String(prompt || "").slice(0, 12000));
    return kitFolder ? "claude://code/new?q=" + q + "&folder=" + encodeURIComponent(kitFolder) : "claude://claude.ai/new?q=" + q;
  }

  // ---------- Chips ----------
  function statusChip(status) {
    const s = M.STATUS[status] || M.STATUS.draft;
    return '<span class="chip chip--' + esc(s.tone) + '">' + (status === "writing" ? icon("loader", "spin") : "") + esc(s.label) + "</span>";
  }
  const CLIENT_STATE = {
    writing: { label: "Claude is writing", tone: "info", icon: "loader" },
    "needs-more": { label: "Needs more to go on", tone: "warning", icon: "alert" },
    ready: { label: "Ready for a proposal", tone: "accent", icon: "sparkle" }
  };
  function clientChip(state) {
    if (M.STATUS[state]) return statusChip(state);
    const s = CLIENT_STATE[state] || CLIENT_STATE.ready;
    return '<span class="chip chip--' + s.tone + '">' + icon(s.icon, s.icon === "loader" ? "spin" : "") + esc(s.label) + "</span>";
  }

  // ---------- A proposal card (Proposals page and Clients page) ----------
  function proposalCard(d, p, opts) {
    const o = opts || {};
    const value = M.proposalValue(d, p);
    const rec = M.recommended(p);
    const pkg = rec ? M.packageById(d, rec.packageId) : null;
    const flags = [];
    if (M.changeWaiting(d, p.id)) flags.push('<span class="chip chip--info">' + icon("loader", "spin") + "Claude is changing it</span>");
    if (p.unpriced.length) flags.push('<span class="chip chip--warning">' + icon("alert") + p.unpriced.length + " to price</span>");
    if (p.gaps.length && (p.status === "draft" || p.status === "writing")) flags.push('<span class="chip chip--quiet">' + icon("info") + p.gaps.length + (p.gaps.length === 1 ? " gap" : " gaps") + "</span>");
    if (M.needsChase(d, p)) flags.push('<span class="chip chip--danger">' + icon("hourglass") + M.ageDays(p.sentAt) + " days since sent</span>");
    const when = p.status === "sent" ? "Sent " + ago(p.sentAt) : p.status === "won" || p.status === "lost" ? (p.status === "won" ? "Won " : "Lost ") + ago(p.closedAt) : "Written " + ago(p.createdAt);
    return '<article class="pcard' + (o.anim ? o.anim("p-" + p.id) : "") + '" data-proposal="' + esc(p.id) + '">' +
      '<div class="pcard__top"><span class="pcard__client">' + esc(M.clientName(d, p)) + "</span>" + statusChip(p.status) + "</div>" +
      '<button type="button" class="pcard__title" data-action="open-proposal">' + esc(p.title || p.cover.title || "Proposal") + "</button>" +
      '<div class="pcard__row"><span class="muted">' + esc(pkg ? "Recommended: " + pkg.name : "No option chosen yet") + '</span><span class="pcard__value num">' + (value ? esc(M.money(d, value)) : "") + "</span></div>" +
      (flags.length ? '<div class="pcard__flags">' + flags.join("") + "</div>" : "") +
      '<div class="pcard__foot"><span class="muted">' + esc(when) + '</span><button type="button" class="btn btn--sm" data-action="open-proposal">Open' + icon("arrowRight") + "</button></div></article>";
  }

  // ---------- Page furniture ----------
  function sectionHead(title, opts) {
    const o = opts || {};
    return '<div class="section-head"><h2>' + (o.icon ? icon(o.icon) : "") + esc(title) + (o.count != null ? ' <span class="badge' + (o.accent ? " badge--accent" : "") + '">' + o.count + "</span>" : "") + "</h2>" + (o.right || "") + "</div>";
  }
  function empty(art, title, text, extra, compact) {
    return '<div class="empty' + (compact ? " empty--compact" : "") + '">' +
      (art ? '<div class="empty__art"><img src="' + ART[art] + '" alt="" width="96" height="96"></div>' : "") +
      "<h3>" + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + (extra || "") + "</div>";
  }
  // Shown on a fresh install, before /setup: what to do next, step by step
  function setupCard() {
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + ART.welcome + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s set up your proposals</h2>' +
      '<p class="muted">It’s empty for now. Claude learns your brand, your packages and how you write in about 20 minutes, then writes your first proposal from a real client.</p>' +
      '<ol class="setup-card__steps">' +
      "<li>Open Claude Code in your <strong>Proposal Writing OS</strong> folder (in the Claude desktop app, the Code tab).</li>" +
      "<li>Type " + say("/setup") + " and answer Claude’s questions. It asks for your website, logo and colours, your packages and prices, and any proposal you’d like it to copy.</li>" +
      "<li>Put everything about a client in their own folder. Claude writes the proposal in your brand, and you check it before it goes anywhere.</li>" +
      "</ol></div></section>";
  }
  function say(text) {
    return '<span class="say">“' + esc(text) + '”<button type="button" class="say__copy" data-action="copy" data-text="' + esc(text) + '">Copy</button></span>';
  }
  // "today", "yesterday", "3 days ago", by calendar day
  function ago(at) {
    if (!at) return "";
    const n = M.ageDays(at);
    return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
  }
  function longDate(at) {
    const d = at instanceof Date ? at : new Date(at || Date.now());
    return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  window.PO.c = {
    ART: ART, claudeLink: claudeLink, setFolder: setFolder, statusChip: statusChip, clientChip: clientChip, proposalCard: proposalCard,
    sectionHead: sectionHead, empty: empty, say: say, setupCard: setupCard, ago: ago, longDate: longDate
  };
})();
