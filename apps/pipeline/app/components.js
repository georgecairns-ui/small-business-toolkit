/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Deal cards, chips, avatars, the deal check meter, section headings and empty states. Each
  function returns a piece of HTML as text. Buttons carry data-action="..." and app.js decides
  what each does. Same look and wording as Task List OS.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc;
  const icon = ui.icon;
  const M = window.PL.model;

  // Where the shared images live (worked out from the theme.css link, so it survives moving)
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = {
    welcome: SHARED + "images/claude-welcome.jpg",
    thinking: SHARED + "images/claude-thinking.jpg",
    celebrate: SHARED + "images/claude-celebrate.jpg",
    shrug: SHARED + "images/claude-shrug.jpg",
    trophy: SHARED + "images/claude-trophy.jpg"
  };

  // ---------- People ----------
  const AVATAR_COLOURS = ["#B8643F", "#5B7FA6", "#4F8A5B", "#C08A1E", "#8A5BA6", "#A6505B", "#3F8A8A", "#7A6A4F"];
  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "")[0] + ((parts.length > 1 ? parts[parts.length - 1][0] : "") || "")).toUpperCase();
  }
  function colourFor(name) {
    let h = 0;
    String(name || "").split("").forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
    return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
  }
  function avatar(person, size) {
    if (!person) return "";
    return '<span class="avatar' + (size ? " avatar--" + size : "") + '" style="--av:' + colourFor(person.name) + '" title="' + esc(person.name) + '" aria-hidden="true">' + esc(initials(person.name)) + "</span>";
  }
  function personLabel(p) { return p.organisation ? p.name + ", " + p.organisation : p.name; }

  // ---------- Opening something in Claude ----------
  // Opens the Claude desktop app with the prompt typed in, ready for the person to read and send.
  // With the folder known it opens a Claude Code session in their folder (connections, skills and
  // notes); otherwise a new chat. Claude never sends it by itself.
  let kitFolder = null;
  function setFolder(f) { kitFolder = f || null; }
  function claudeLink(prompt) {
    const q = encodeURIComponent(String(prompt || "").slice(0, 12000));
    return kitFolder ? "claude://code/new?q=" + q + "&folder=" + encodeURIComponent(kitFolder) : "claude://claude.ai/new?q=" + q;
  }

  // ---------- The deal check ----------
  // A small meter: 8 segments, one per question, coloured by how much is known
  function checkMeter(x, opts) {
    const o = opts || {};
    if (!M.hasBeenChecked(x)) return o.quiet ? "" : '<span class="chip chip--quiet" title="Claude hasn\'t checked this deal yet">' + icon("target") + "Not checked yet</span>";
    const score = M.checkScore(x);
    return '<span class="meter" title="Deal check: ' + score + '% known" aria-label="Deal check ' + score + ' percent">' +
      '<span class="meter__bars" aria-hidden="true">' + M.CHECK.map(function (c) { return '<span class="meter__bar is-' + esc((x.check[c.key] || {}).status || "gap") + '"></span>'; }).join("") + "</span>" +
      '<span class="meter__num num">' + score + "%</span></span>";
  }
  function statusChip(status) {
    const s = M.STATUS[status] || M.STATUS.gap;
    return '<span class="kstatus kstatus--' + esc(status) + '">' + esc(s.label) + "</span>";
  }

  // ---------- A deal card (the board) ----------
  // Every card shows the same things in the same places: name, business, value, then what needs
  // doing (a call coming up, a chase, notes waiting) and the deal check.
  function dealCard(d, x, opts) {
    const o = opts || {};
    const people = x.personIds.map(function (id) { return M.personById(d, id); }).filter(Boolean);
    const meeting = M.upcomingMeeting(x);
    const flags = [];
    if (x.moved && !x.moved.seen) flags.push('<span class="chip chip--accent" title="' + esc(x.moved.reason || "") + '">' + icon("sparkle") + "Claude moved this</span>");
    if (M.notesWaiting(x).length) flags.push('<span class="chip chip--info">' + icon("loader") + "Notes waiting</span>");
    if (M.isOpen(x) && M.fitScore(x)) flags.push(fitChip(x));
    if (x.noTranscript) flags.push('<span class="chip chip--warning">' + icon("mic") + "Tell Claude how it went</span>");
    if (M.needsChase(d, x) && !meeting) flags.push('<span class="chip chip--danger">' + icon("hourglass") + M.quietDays(x) + " days quiet</span>");
    const who = people.length ? '<span class="dcard__who" title="' + esc(people.map(personLabel).join(", ") + "") + '">' + people.slice(0, 3).map(function (p) { return avatar(p); }).join("") +
      '<span>' + esc(people[0].name) + (people.length > 1 ? " +" + (people.length - 1) : "") + "</span></span>" : '<span class="dcard__who dcard__who--none">' + icon("user") + "<span>No contact yet</span></span>";
    return '<article class="dcard' + (o.anim ? o.anim("card-" + x.id) : "") + '" data-deal="' + esc(x.id) + '"' + (o.draggable ? ' draggable="true"' : "") + ">" +
      '<button type="button" class="dcard__title" data-action="open-deal">' + esc(x.title) + "</button>" +
      '<div class="dcard__row"><span class="dcard__org">' + esc(x.organisation || "") + '</span><span class="dcard__value num">' + esc(M.money(d, x.value)) + "</span></div>" +
      (meeting ? '<div class="dcard__call" title="' + esc(meeting.title || "Sales call") + '">' + icon("phone") + "<span>Call booked: <strong>" + esc(M.meetingLabel(meeting.start)) + "</strong></span></div>" : "") +
      (flags.length ? '<div class="dcard__flags">' + flags.join("") + "</div>" : "") +
      '<div class="dcard__foot">' + who + checkMeter(x, { quiet: true }) + "</div></article>";
  }

  // ---------- Sending: Claude emails, or I'll do it ----------
  // where is "deal" or "suggestion"; id is that record's id. The buttons find them through
  // data-send-where and data-send-id, so they work the same on the deal panel and in Review.
  function emailActions(d, where, id, email, opts) {
    const o = opts || {};
    if (!email || !email.body) return "";
    const L = window.PL.links;
    const attrs = ' data-send-where="' + esc(where) + '" data-send-id="' + esc(id) + '"';
    const small = o.small ? " btn--sm" : "";
    if (email.sendStatus === "sent" || email.sentAt) {
      return '<span class="send-state send-state--sent">' + icon("check") + (email.sentBy === "claude" ? "Claude sent this " : "Sent ") + esc(ago(email.sentAt) || "") + "</span>";
    }
    if (email.sendStatus === "queued") {
      return '<span class="send-state send-state--queued">' + icon("loader", "spin") + "Claude is sending this</span>" +
        '<button type="button" class="btn btn--ghost' + small + '" data-action="cancel-send"' + attrs + ">Stop</button>";
    }
    // Sending switched off (setup step 2.5, or Preferences): just I'll do it
    if (d.settings.claudeSends === false) {
      return '<button type="button" class="btn btn--primary' + small + '" data-action="self-send"' + attrs + ">" + icon("pencil") + "I'll do it</button>";
    }
    return (email.sendStatus === "failed" ? '<span class="send-state send-state--failed">' + icon("alert") + "Couldn't send" + (email.sendError ? ": " + esc(email.sendError) : "") + "</span>" : "") +
      '<button type="button" class="btn btn--primary' + small + '" data-action="claude-send"' + attrs + ">" + icon("sparkle") + "Claude emails</button>" +
      '<button type="button" class="btn' + small + '" data-action="self-send"' + attrs + ' title="Opens it in ' + esc(L.emailLabel(d.settings.emailProvider)) + ' for you to send">' + icon("pencil") + "I'll do it</button>";
  }
  // LinkedIn: Claude writes it; the person pastes and sends it (LinkedIn doesn't allow automated messages)
  function linkedinActions(where, id, msg, opts) {
    if (!msg || !msg.body) return "";
    if (msg.sentAt) return '<span class="send-state send-state--sent">' + icon("check") + "Sent on LinkedIn " + esc(ago(msg.sentAt)) + "</span>";
    return '<button type="button" class="btn btn--primary' + (opts && opts.small ? " btn--sm" : "") + '" data-action="linkedin-open" data-send-where="' + esc(where) + '" data-send-id="' + esc(id) + '">' + icon("external") + "I'll do it on LinkedIn</button>";
  }
  // The ideal client score, worked out from Claude's research (model.js, fitScore)
  function fitChip(x) {
    const f = M.fitScore(x);
    if (!f) return "";
    const tone = f.dealBreaker || f.score < 50 ? "danger" : f.score < 75 ? "warning" : "success";
    return '<span class="chip chip--' + tone + '" title="How well they match your ideal client, based on ' + f.assessed + " of " + f.of + ' things Claude could check">' + icon("target") + f.score + "% fit</span>";
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
      '<div class="setup-card__body"><h2>Let\u2019s set up your pipeline</h2>' +
      '<p class="muted">It\u2019s empty for now. Claude fills it with your real deals in about 25 minutes, and you approve everything.</p>' +
      '<ol class="setup-card__steps">' +
      "<li>Open Claude Code in your <strong>Pipeline OS</strong> folder (in the Claude desktop app, the Code tab).</li>" +
      "<li>Type " + say("/setup") + " and answer Claude\u2019s questions. It asks what you sell and who you sell to, then connects your email, calendar and calls.</li>" +
      "<li>Your deals, the next step on each and the chases to send appear here. Nothing is sent until you say so.</li>" +
      "</ol></div></section>";
  }
  function say(text) {
    return '<span class="say">“' + esc(text) + '”<button type="button" class="say__copy" data-action="copy" data-text="' + esc(text) + '">Copy</button></span>';
  }
  function stageOptions(selected, openOnly) {
    return (openOnly ? M.openStages() : M.STAGES).map(function (s) { return '<option value="' + esc(s.key) + '"' + (s.key === selected ? " selected" : "") + ">" + esc(s.label) + "</option>"; }).join("");
  }
  // "today", "yesterday", "3 days ago", by calendar day
  function ago(at) {
    if (!at) return "";
    const then = new Date(String(at).length === 10 ? at + "T12:00" : at);
    if (isNaN(then)) return "";
    const n = Math.max(0, Math.round((ui.parseDate(ui.isoDate(new Date())) - ui.parseDate(ui.isoDate(then))) / 86400000));
    return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
  }

  window.PL.c = {
    ART: ART, avatar: avatar, initials: initials, colourFor: colourFor, personLabel: personLabel,
    claudeLink: claudeLink, setFolder: setFolder, checkMeter: checkMeter, emailActions: emailActions, linkedinActions: linkedinActions, fitChip: fitChip, statusChip: statusChip, dealCard: dealCard,
    sectionHead: sectionHead, empty: empty, say: say, setupCard: setupCard, stageOptions: stageOptions, ago: ago
  };
})();
