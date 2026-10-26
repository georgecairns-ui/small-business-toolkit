/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Task rows, chips, avatars, section headings and empty states. Each function returns a
  piece of HTML as text. Buttons carry data-action="..." and app.js decides what each does.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc;
  const icon = ui.icon;
  const M = window.TL.model;

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
  const AVATAR_COLOURS = ["#C4643F", "#5B7FA6", "#4F8A5B", "#C08A1E", "#8A5BA6", "#A6505B", "#3F8A8A", "#7A6A4F"];
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

  // ---------- Chips ----------
  // Each category's colour comes from Preferences, or the theme's own colour for the standard ones
  function catColour(key) { return (M.CAT[key] || M.CAT.later).css; }
  function catDot(key) { return '<span class="dot" style="background:' + esc(catColour(key)) + '" aria-hidden="true"></span>'; }
  function catChip(key) {
    const c = M.CAT[key] || M.CAT.later;
    return '<span class="chip cat-chip">' + catDot(c.key) + esc(c.label) + "</span>";
  }

  // ---------- Opening a task in Claude ----------
  // Opens the Claude desktop app with the prompt typed in, ready for the person to read and send.
  // With the folder known it opens a Claude Code session in their Small Business Toolkit OS folder (their
  // connections, skills and notes); otherwise a new chat. Claude never sends it by itself.
  let kitFolder = null;
  function setFolder(f) { kitFolder = f || null; }
  function claudeLink(prompt) {
    const q = encodeURIComponent(String(prompt || "").slice(0, 12000));
    return kitFolder ? "claude://code/new?q=" + q + "&folder=" + encodeURIComponent(kitFolder) : "claude://claude.ai/new?q=" + q;
  }

  // ---------- A task card (board, Home) ----------
  // Every card shows the same things in the same places, at the same height:
  // tick, title (up to 2 lines), then category, when, and who it's for.
  function taskCard(d, t, opts) {
    const o = opts || {};
    const done = t.status === "done";
    const p = M.personById(d, t.personId);
    const when = dateChip(t) || '<span class="chip chip--quiet">' + icon("calendar") + (done && t.doneAt ? "Done " + esc(ui.parseDate(ui.isoDate(new Date(t.doneAt))).toLocaleDateString("en-GB", { day: "numeric", month: "short" })) : "No date") + "</span>";
    const who = p ? '<span class="tcard__who" title="' + esc(personLabel(p)) + '">' + avatar(p) + '<span>' + esc(p.name) + "</span></span>" :
      '<span class="tcard__who tcard__who--none">' + icon("user") + "<span>Just you</span></span>";
    const claude = M.claudeCanDo(t) ? '<span class="tcard__claude" title="Claude can do this">' + icon("sparkle") + "<span>Claude can do this</span></span>" : "";
    return '<article class="tcard' + (done ? " is-done" : "") + (o.anim ? o.anim("card-" + t.id) : "") + '" data-task="' + esc(t.id) + '" style="--edge:' + esc(catColour(t.category)) + '"' + (!done && o.draggable ? ' draggable="true"' : "") + ">" +
      '<div class="tcard__top"><button type="button" class="check check--sm" role="checkbox" aria-checked="' + done + '" data-action="toggle-done" aria-label="' + (done ? "Mark not done: " : "Mark done: ") + esc(t.title) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></button>' +
      '<button type="button" class="tcard__title" data-action="open-task">' + esc(t.title) + "</button></div>" +
      '<div class="tcard__meta">' + catChip(t.category) + when + "</div>" +
      '<div class="tcard__foot">' + who + claude + "</div></article>";
  }
  // Claude's plan for today, as a card in the To do column: same size and rows as every card,
  // with Approve and Skip in place of who it's for
  function planCard(d, t, item, o) {
    o = o || {};
    const cat = (item && item.category) || t.category;
    const reason = item && item.reason ? ' title="' + esc(item.reason) + '"' : "";
    return '<article class="tcard tcard--suggested' + (o.anim ? o.anim("plan-" + t.id) : "") + '" data-task="' + esc(t.id) + '" data-kind="plan" style="--edge:' + esc(catColour(cat)) + '"' + reason + ">" +
      '<div class="tcard__top"><span class="tcard__badge">' + icon("sparkle") + 'Suggested</span><button type="button" class="tcard__title" data-action="open-task">' + esc(t.title) + "</button></div>" +
      '<div class="tcard__meta">' + catChip(cat) + (dateChip(t) || "") + "</div>" +
      '<div class="tcard__foot tcard__foot--decide"><button type="button" class="btn btn--approve btn--sm" data-action="approve">' + icon("check") + "<span>Approve</span></button>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-action="skip" aria-label="Skip: ' + esc(t.title) + '">Skip</button></div></article>';
  }
  // A card that tells people what to do next, for an empty column
  function nudgeCard(title, text, sayText) {
    return '<article class="tcard tcard--nudge"><div class="tcard__top"><span class="tcard__badge">' + icon("sparkle") + esc(title) + "</span></div>" +
      '<p class="tcard__nudge">' + esc(text) + "</p>" + (sayText ? '<div class="tcard__foot">' + say(sayText) + "</div>" : "") + "</article>";
  }

  // "Due today", "Overdue 3 days", "Thu", "14 Oct"
  function dateChip(t) {
    if (t.status === "done") return "";
    const when = M.plannedDate(t);
    if (!when) return "";
    const today = M.todayISO();
    const d = ui.parseDate(when);
    const diff = Math.round((d - ui.parseDate(today)) / 86400000);
    const isDue = !t.scheduledDate || t.scheduledDate === t.due;
    let text, cls = "";
    if (diff < 0) { text = diff === -1 ? "Yesterday" : Math.abs(diff) + " days late"; cls = " chip--danger"; }
    else if (diff === 0) { text = isDue ? "Due today" : "Today"; cls = isDue ? " chip--warning" : ""; }
    else if (diff === 1) text = "Tomorrow";
    else if (diff < 7) text = d.toLocaleDateString("en-GB", { weekday: "short" });
    else text = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const time = t.scheduledTime && t.scheduledDate === when ? " " + M.timeLabel(t.scheduledTime) : "";
    return '<span class="chip' + cls + '" title="' + (isDue ? "Due" : "Planned for") + " " + esc(d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + '">' + icon(isDue ? "flag" : "calendar") + esc(text + time) + "</span>";
  }
  function sourceChip(t) {
    if (!t.source) return "";
    const map = { email: ["mail", "Email"], calendar: ["calendar", "Calendar"], meeting: ["users", "Meeting"], braindump: ["pencil", "Brain dump"] };
    const m = map[t.source.type] || ["sparkle", t.source.label || "Claude"];
    return '<span class="chip chip--info" title="' + esc((t.source.from || "") + (t.source.subject ? ": " + t.source.subject : "")) + '">' + icon(m[0]) + esc(m[1]) + "</span>";
  }
  // One line saying where a suggestion came from
  function sourceLine(t) {
    const s = t.source;
    if (!s) return "";
    const labels = { email: "From your inbox", calendar: "From your calendar", meeting: "From a meeting", braindump: "From your brain dump" };
    const icons = { email: "mail", calendar: "calendar", meeting: "users", braindump: "pencil" };
    const detail = [s.from, s.subject ? "“" + s.subject + "”" : ""].filter(Boolean).join(", ");
    return '<p class="source-line">' + icon(icons[s.type] || "sparkle") + "<span><strong>" + esc(labels[s.type] || s.label || "Spotted by Claude") + "</strong>" + (detail ? " " + esc(detail) : "") + "</span></p>";
  }
  function whoChip(d, t) {
    const p = M.personById(d, t.personId);
    if (p) return '<span class="who" title="' + esc(personLabel(p)) + '">' + avatar(p) + '<span class="who__name">' + esc(p.name.split(" ")[0]) + "</span></span>";
    const name = t.category === "waiting" ? t.waitingOn : t.category === "delegate" ? t.delegateTo : "";
    return name ? '<span class="who"><span class="who__name muted">' + esc(name) + "</span></span>" : "";
  }

  // ---------- A task row ----------
  /*
    opts:
      anim        function(key) returning extra classes for a gentle entrance
      draggable   true to allow dragging onto a day or time slot
      showCat     show the category chip
      actions     extra buttons on the right, as HTML
  */
  function taskRow(d, t, opts) {
    const o = opts || {};
    const done = t.status === "done";
    const key = "row-" + t.id + (o.keySuffix || "");
    return '<li class="row' + (done ? " is-done" : "") + (o.anim ? o.anim(key) : "") + '" data-task="' + esc(t.id) + '"' + (o.draggable && !done ? ' draggable="true"' : "") + ">" +
      '<button type="button" class="check" role="checkbox" aria-checked="' + done + '" data-action="toggle-done" aria-label="' + (done ? "Mark not done: " : "Mark done: ") + esc(t.title) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></button>' +
      '<button type="button" class="row__main" data-action="open-task">' +
      '<span class="row__title">' + esc(t.title) + "</span>" +
      (t.notes && o.showNotes ? '<span class="row__notes">' + esc(t.notes) + "</span>" : "") +
      "</button>" +
      '<span class="row__meta">' + (M.claudeCanDo(t) ? '<span class="chip chip--accent" title="Claude can do this">' + icon("sparkle") + "Claude can do this</span>" : "") + (o.showCat ? catChip(t.category) : "") + sourceChip(t) + dateChip(t) + whoChip(d, t) + "</span>" +
      (o.actions ? '<span class="row__actions">' + o.actions + "</span>" : "") +
      "</li>";
  }
  function taskList(d, tasks, opts) {
    if (!tasks.length) return "";
    return '<ul class="rows" role="list">' + tasks.map(function (t) { return taskRow(d, t, opts); }).join("") + "</ul>";
  }
  // Tasks grouped under their category headings
  function groupedList(d, tasks, opts) {
    return M.CATEGORIES.map(function (c) {
      const group = tasks.filter(function (t) { return t.category === c.key; })
        .sort(function (a, b) { return (a.status === "done") - (b.status === "done"); });
      if (!group.length) return "";
      return '<section class="group"><h3 class="group__head">' + catDot(c.key) + esc(c.label) + '<span class="badge">' + group.length + "</span></h3>" + taskList(d, group, opts) + "</section>";
    }).join("");
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
      '<div class="setup-card__body"><h2>Let\u2019s set up your task list</h2>' +
      '<p class="muted">It\u2019s empty for now. Claude fills it with your real work in about 20 minutes, and you approve everything.</p>' +
      '<ol class="setup-card__steps">' +
      "<li>Open Claude Code in your <strong>Task List OS</strong> folder (in the Claude desktop app, the Code tab).</li>" +
      "<li>Type " + say("/setup") + " and answer Claude\u2019s questions. It connects your email, calendar and calls first.</li>" +
      "<li>Your tasks, replies and today\u2019s plan appear here. Then press <strong>Brain dump</strong> any time your head\u2019s full.</li>" +
      "</ol></div></section>";
  }
  function say(text) {
    return '<span class="say">“' + esc(text) + '”<button type="button" class="say__copy" data-action="copy" data-text="' + esc(text) + '">Copy</button></span>';
  }
  function categoryOptions(selected) {
    return M.CATEGORIES.map(function (c) { return '<option value="' + c.key + '"' + (c.key === selected ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("");
  }
  function personOptions(d, selected) {
    const people = d.people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<option value="">Nobody in particular</option>' + people.map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (p.id === selected ? " selected" : "") + ">" + esc(personLabel(p)) + "</option>";
    }).join("");
  }

  window.TL.c = {
    ART: ART, avatar: avatar, initials: initials, colourFor: colourFor, personLabel: personLabel,
    catDot: catDot, catChip: catChip, catColour: catColour, claudeLink: claudeLink, setFolder: setFolder, taskCard: taskCard, planCard: planCard, nudgeCard: nudgeCard, dateChip: dateChip, sourceChip: sourceChip, sourceLine: sourceLine, whoChip: whoChip,
    taskRow: taskRow, taskList: taskList, groupedList: groupedList,
    sectionHead: sectionHead, empty: empty, say: say, setupCard: setupCard, categoryOptions: categoryOptions, personOptions: personOptions
  };
})();
