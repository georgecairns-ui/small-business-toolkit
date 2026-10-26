/*
  DRAWER: the record panel that slides in from the right
  ------------------------------------------------------
  Opening a task shows everything about it: list, person, planned day and time, due date,
  notes, where it came from and its history. Opening a person shows their details and every
  task linked to them. Changes save as soon as you make them.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;

  const LENGTHS = [15, 30, 45, 60, 90, 120, 180];

  function prop(label, control, extraClass) {
    return '<div class="prop' + (extraClass ? " " + extraClass : "") + '"><span class="prop__label">' + esc(label) + '</span><div class="prop__value">' + control + "</div></div>";
  }

  // ---------- A task ----------
  function taskHTML(ctx, t) {
    const d = ctx.d;
    const done = t.status === "done";
    const planItem = M.planIsToday(d) ? d.plan.items.find(function (i) { return i.taskId === t.id; }) : null;
    const onToday = planItem && planItem.status === "approved";
    const proposed = planItem && planItem.status === "proposed";
    const isNew = M.isSuggestion(t);

    let banner = "";
    if (isNew || proposed) {
      banner = '<div class="drawer__banner"><span>' + icon("sparkle") + (isNew ? "Claude spotted this. It isn't on your list until you approve it." : "Claude suggests this for today." + (planItem.reason ? " " + esc(planItem.reason) : "")) + "</span>" +
        '<span class="drawer__banner-actions"><button type="button" class="btn btn--approve btn--sm" data-action="approve">' + icon("check") + 'Approve</button><button type="button" class="btn btn--sm" data-action="skip">Skip</button></span></div>';
    } else if (t.proposedDate) {
      banner = '<div class="drawer__banner"><span>' + icon("calendar") + "Claude suggests doing this on " + esc(ui.parseDate(t.proposedDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })) + "." + (t.proposedReason ? " " + esc(t.proposedReason) : "") + "</span>" +
        '<span class="drawer__banner-actions"><button type="button" class="btn btn--approve btn--sm" data-action="approve-schedule">' + icon("check") + 'Approve</button><button type="button" class="btn btn--sm" data-action="skip-schedule">Skip</button></span></div>';
    }

    // "When would you like to do this?": free slots from the calendar, and the calendar button
    const L = window.TL.links;
    let whenRow = "";
    if (!done) {
      if (t.scheduledDate && t.scheduledTime) {
        whenRow = '<div class="when-row">' + (t.calendarAddedAt ? '<span class="chip chip--success">' + icon("check") + "In your calendar</span>" : "") +
          '<button type="button" class="btn btn--sm" data-action="add-to-calendar">' + icon("calendar") + (t.calendarAddedAt ? "Add again" : "Add to " + esc(L.calendarLabel(d.settings.calendarProvider))) + "</button></div>";
      } else {
        const slots = M.freeSlots(d, t.durationMinutes || 30, 3);
        if (slots.length) whenRow = '<div class="when-row"><span class="when-row__label">Free:</span>' + slots.map(function (s) {
          return '<button type="button" class="chip chip--slot" data-action="pick-slot" data-date="' + s.date + '" data-time="' + s.time + '">' + esc(slotLabel(s)) + "</button>";
        }).join("") + "</div>";
      }
    }
    const guide = t.guide ? '<section class="drawer__section guide"><h3 class="label">How to do this</h3>' +
      (t.guide.summary ? "<p>" + esc(t.guide.summary) + "</p>" : "") +
      (t.guide.steps && t.guide.steps.length ? '<ol class="guide__steps">' + t.guide.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : "") +
      (t.guide.links && t.guide.links.length ? '<ul class="guide__links" role="list">' + t.guide.links.map(function (l) {
        return '<li><a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + icon("external") + esc(l.label || l.url) + "</a></li>";
      }).join("") + "</ul>" : "") +
      (t.guide.researchedAt ? '<p class="muted drawer__small">Researched by Claude on ' + esc(new Date(t.guide.researchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })) + ". Check the official pages before acting.</p>" : "") + "</section>"
      : (!done ? '<section class="drawer__section"><button type="button" class="btn btn--sm btn--ghost" data-action="copy" data-text="Research how to do this task and add the steps to it: ' + esc(t.title) + '">' + icon("search") + "Ask Claude how to do this</button></section>" : "");
    // An email Claude drafted for this task (for example from "email Tom about the quote" in a voice note)
    const ed = t.emailDraft;
    const emailDraft = ed && ed.body && !done ? '<section class="drawer__section draft"><h3 class="label">Email to send</h3>' +
      '<div class="draft__fields"><label class="draft__field"><span>To</span><input class="input input--bare" data-efield="to" value="' + esc(ed.to || "") + '"></label>' +
      '<label class="draft__field"><span>Subject</span><input class="input input--bare" data-efield="subject" value="' + esc(ed.subject || "") + '"></label></div>' +
      '<textarea class="textarea draft__body" data-efield="body" rows="7" aria-label="Email to send">' + esc(ed.body) + "</textarea>" +
      '<div class="draft__actions"><button type="button" class="btn btn--primary" data-action="task-draft">' + icon("pencil") + "Draft in " + esc(window.TL.links.emailLabel(d.settings.emailProvider)) + "</button>" +
      '<button type="button" class="btn" data-action="copy-task-draft">' + icon("list") + "Copy</button></div></section>" : "";
    const replyLink = t.replyId && M.replyById(d, t.replyId) ? '<section class="drawer__section"><button type="button" class="btn btn--sm" data-action="open-reply" data-reply="' + esc(t.replyId) + '">' + icon("mail") + "Open the email and Claude's draft</button></section>" : "";

    const lengthOptions = '<option value="">Length</option>' + LENGTHS.map(function (m) { return '<option value="' + m + '"' + (Number(t.durationMinutes) === m ? " selected" : "") + ">" + esc(ui.minutesLabel(m)) + "</option>"; }).join("");
    const source = t.source ? '<section class="drawer__section"><h3 class="label">Where it came from</h3>' + C.sourceLine(t) + (t.source.date ? '<p class="muted drawer__small">' + esc(ui.parseDate(t.source.date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })) + "</p>" : "") + "</section>" : "";
    const hist = M.history(d, t);
    const person = M.personById(d, t.personId);
    // Claude has written a prompt it could act on: open it in Claude, ready for the person to send
    const cl = t.claude;
    const claudeSection = M.claudeCanDo(t) ? '<section class="drawer__section claude-can"><h3 class="label">' + icon("sparkle") + "Claude can do this</h3>" +
      (cl.how ? "<p>" + esc(cl.how) + "</p>" : "") +
      (cl.uses && cl.uses.length ? '<p class="claude-can__uses">' + cl.uses.map(function (u) { return '<span class="chip">' + esc(u) + "</span>"; }).join("") + "</p>" : "") +
      '<div class="claude-can__actions"><a class="btn btn--primary" href="' + esc(C.claudeLink(cl.prompt)) + '">' + icon("external") + "Open in Claude</a>" +
      '<button type="button" class="btn" data-action="copy" data-text="' + esc(cl.prompt) + '">' + icon("list") + "Copy the prompt</button></div>" +
      '<p class="muted drawer__small">Opens Claude with the prompt ready. Read it, then press send. Claude asks you before it sends, books or pays for anything.</p></section>' : "";

    return '<div class="drawer__head"><span class="label">Task</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="drawer__body" data-task="' + esc(t.id) + '">' + banner +
      '<div class="drawer__title-row"><button type="button" class="check check--lg" role="checkbox" aria-checked="' + done + '" data-action="toggle-done" aria-label="' + (done ? "Mark not done" : "Mark done") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></button>' +
      '<textarea class="input-bare drawer__title" data-field="title" rows="1" maxlength="200" aria-label="Task title">' + esc(t.title) + "</textarea></div>" +
      '<div class="props">' +
      prop("Status", '<select class="select select--bare" data-stage aria-label="Status">' + M.STAGES.map(function (st) { return '<option value="' + st.key + '"' + (M.stageOf(t) === st.key ? " selected" : "") + ">" + esc(M.stageLabel(d, st.key)) + "</option>"; }).join("") + "</select>") +
      prop("Category", '<select class="select select--bare" data-field="category" aria-label="Category">' + C.categoryOptions(t.category) + "</select>") +
      prop("Who", '<input class="input input--bare" data-who list="drawerPeople" maxlength="80" value="' + esc(person ? person.name : "") + '" placeholder="A person or company" aria-label="Who it\'s for"><datalist id="drawerPeople">' +
        d.people.map(function (x) { return '<option value="' + esc(x.name) + '">' + esc(x.organisation || "") + "</option>"; }).join("") + "</datalist>") +
      (t.category === "waiting" ? prop("Waiting on", '<input class="input input--bare" data-field="waitingOn" maxlength="120" value="' + esc(t.waitingOn || "") + '" placeholder="Who or what" aria-label="Waiting on">') : "") +
      (t.category === "delegate" ? prop("Hand to", '<input class="input input--bare" data-field="delegateTo" maxlength="120" value="' + esc(t.delegateTo || "") + '" placeholder="Who should do it" aria-label="Hand to">') : "") +
      prop("Plan for", '<input class="input input--bare" type="date" data-field="scheduledDate" value="' + esc(t.scheduledDate || "") + '" aria-label="Plan for">') +
      prop("Time", '<input class="input input--bare" type="time" step="900" data-field="scheduledTime" value="' + esc(t.scheduledTime || "") + '" aria-label="Time"><select class="select select--bare" data-field="durationMinutes" aria-label="Length">' + lengthOptions + "</select>", "prop--pair") +
      (whenRow ? prop("", whenRow, "prop--when") : "") +
      prop("Due", '<input class="input input--bare" type="date" data-field="due" value="' + esc(t.due || "") + '" aria-label="Due date">') +
      prop("Today", done ? '<span class="muted">Done</span>' : onToday ? '<button type="button" class="btn btn--sm" data-action="remove-today">' + icon("sun") + "On today's list · Remove</button>" : '<button type="button" class="btn btn--sm" data-action="add-today">' + icon("sun") + "Add to today</button>") +
      "</div>" +
      claudeSection + emailDraft + replyLink + guide +
      '<section class="drawer__section"><h3 class="label"><label for="taskNotes">Notes</label></h3><textarea class="textarea" id="taskNotes" data-field="notes" rows="4" maxlength="4000" placeholder="Names, amounts, links, anything useful">' + esc(t.notes || "") + "</textarea></section>" +
      source +
      (hist.length ? '<section class="drawer__section"><h3 class="label">History</h3><ol class="history">' + hist.map(function (h) {
        return '<li><span class="history__dot"></span><span>' + esc(h.text) + '</span><span class="muted num">' + esc(new Date(h.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })) + "</span></li>";
      }).join("") + "</ol></section>" : "") +
      "</div>" +
      '<div class="drawer__foot" data-task="' + esc(t.id) + '"><button type="button" class="btn btn--ghost btn--danger btn--sm" data-action="delete-task">' + icon("trash") + 'Delete</button><span class="drawer__spacer"></span>' +
      '<button type="button" class="btn ' + (done ? "" : "btn--approve") + '" data-action="toggle-done">' + icon(done ? "undo" : "check") + (done ? "Mark not done" : "Mark done") + "</button></div>";
  }

  // ---------- A person ----------
  function personHTML(ctx, p) {
    const d = ctx.d;
    const tasks = M.tasksForPerson(d, p.id);
    const open = tasks.filter(M.isOnList);
    const waiting = open.filter(function (t) { return t.category === "waiting"; });
    const doing = open.filter(function (t) { return t.category !== "waiting"; });
    const done = tasks.filter(function (t) { return t.status === "done"; }).slice(-5).reverse();
    const s = M.personSummary(d, p);
    const roles = M.ROLES.map(function (r) { return '<option value="' + r.key + '"' + (p.role === r.key ? " selected" : "") + ">" + r.label + "</option>"; }).join("");
    const list = function (title, items) { return items.length ? '<section class="drawer__section"><h3 class="label">' + esc(title) + ' <span class="badge">' + items.length + "</span></h3>" + C.taskList(d, items, { keySuffix: "-person" }) + "</section>" : ""; };

    return '<div class="drawer__head"><span class="label">Person</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="drawer__body" data-person="' + esc(p.id) + '">' +
      '<div class="person-head">' + C.avatar(p, "lg") + '<div class="person-head__text">' +
      '<input class="input-bare person-head__name" data-pfield="name" maxlength="80" value="' + esc(p.name) + '" aria-label="Name">' +
      '<input class="input-bare person-head__org" data-pfield="organisation" maxlength="80" value="' + esc(p.organisation || "") + '" placeholder="Business or organisation" aria-label="Organisation"></div></div>' +
      '<div class="stat-strip stat-strip--sm"><div class="stat"><span class="stat__value num">' + s.open + '</span><span class="stat__label">open</span></div><div class="stat"><span class="stat__value num">' + s.waiting + '</span><span class="stat__label">waiting</span></div><div class="stat"><span class="stat__value num">' + s.overdue + '</span><span class="stat__label">late</span></div></div>' +
      '<div class="props">' +
      prop("Type", '<select class="select select--bare" data-pfield="role" aria-label="Type">' + roles + "</select>") +
      prop("Email", '<input class="input input--bare" type="email" data-pfield="email" maxlength="120" value="' + esc(p.email || "") + '" placeholder="Add email" aria-label="Email">') +
      prop("Phone", '<input class="input input--bare" type="tel" data-pfield="phone" maxlength="40" value="' + esc(p.phone || "") + '" placeholder="Add phone" aria-label="Phone">') +
      "</div>" +
      '<section class="drawer__section"><h3 class="label"><label for="personNotes">Notes</label></h3><textarea class="textarea" id="personNotes" data-pfield="notes" rows="3" maxlength="2000" placeholder="How you know them, how they like to work, anything useful">' + esc(p.notes || "") + "</textarea></section>" +
      list("Open tasks", doing) + list("Waiting on them", waiting) + list("Recently done", done) +
      "</div>" +
      '<div class="drawer__foot" data-person="' + esc(p.id) + '"><span class="drawer__spacer"></span><button type="button" class="btn btn--primary" data-action="quick-add-person">' + icon("plus") + "New task for " + esc(p.name.split(" ")[0]) + "</button></div>";
  }

  // "Today 3:30pm", "Tomorrow 9am", "Thu 10am"
  function slotLabel(s) {
    const diff = Math.round((ui.parseDate(s.date) - ui.parseDate(M.todayISO())) / 86400000);
    const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : ui.parseDate(s.date).toLocaleDateString("en-GB", { weekday: "short" });
    return day + " " + M.timeLabel(s.time);
  }
  // Only open web links (no javascript: or file links from a hand-edited file)
  function safeUrl(url) { return /^https?:\/\//i.test(String(url || "")) ? url : "#"; }

  // ---------- An email that needs a reply ----------
  function replyHTML(ctx, r) {
    const d = ctx.d;
    const L = window.TL.links;
    const p = M.personById(d, r.personId);
    const sender = r.from ? (r.from.name ? r.from.name + (r.from.email ? " <" + r.from.email + ">" : "") : r.from.email) : "";
    const waiting = r.status === "waiting";
    const dr = r.draft || {};
    return '<div class="drawer__head"><span class="label">Email to answer</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="drawer__body" data-reply="' + esc(r.id) + '">' +
      '<div class="mail-head">' + (p ? C.avatar(p, "lg") : '<span class="avatar avatar--lg" style="--av:' + C.colourFor(sender) + '">' + esc(C.initials(sender)) + "</span>") +
      '<div><p class="mail-head__subject">' + esc(r.subject || "(no subject)") + '</p><p class="muted">' + esc(sender) + "</p>" +
      (r.receivedAt ? '<p class="muted drawer__small">' + esc(new Date(r.receivedAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })) + "</p>" : "") + "</div></div>" +
      (r.why ? '<div class="drawer__banner"><span>' + icon("sparkle") + esc(r.why) + "</span></div>" : "") +
      (r.summary ? '<section class="drawer__section"><h3 class="label">What they said</h3><p>' + esc(r.summary) + "</p>" +
        (r.threadUrl ? '<a class="btn btn--ghost btn--sm" href="' + esc(safeUrl(r.threadUrl)) + '" target="_blank" rel="noopener">' + icon("external") + "Open the original email</a>" : "") + "</section>" : "") +
      '<section class="drawer__section draft"><h3 class="label">Claude\'s draft reply</h3>' +
      '<div class="draft__fields">' +
      '<label class="draft__field"><span>To</span><input class="input input--bare" data-rfield="to" value="' + esc(dr.to || "") + '"></label>' +
      '<label class="draft__field"><span>Cc</span><input class="input input--bare" data-rfield="cc" value="' + esc(dr.cc || "") + '"></label>' +
      '<label class="draft__field"><span>Subject</span><input class="input input--bare" data-rfield="subject" value="' + esc(dr.subject || "") + '"></label>' +
      "</div>" +
      '<textarea class="textarea draft__body" data-rfield="body" rows="10" aria-label="Draft reply">' + esc(dr.body || "") + "</textarea>" +
      '<div class="draft__actions"><button type="button" class="btn btn--primary" data-action="reply-draft">' + icon("pencil") + "Draft in " + esc(L.emailLabel(d.settings.emailProvider)) + "</button>" +
      '<button type="button" class="btn" data-action="copy-draft">' + icon("list") + "Copy</button></div>" +
      '<p class="muted drawer__small">Opens a new email with this reply in it. Check it and press send yourself. Changes you make here are kept.</p></section>' +
      "</div>" +
      '<div class="drawer__foot" data-reply="' + esc(r.id) + '">' + (waiting ?
        '<button type="button" class="btn btn--ghost btn--sm" data-action="reply-dismiss">No reply needed</button><span class="drawer__spacer"></span><button type="button" class="btn btn--approve" data-action="reply-done">' + icon("check") + "Mark as replied</button>" :
        '<span class="muted">' + (r.status === "replied" ? "Replied" : "No reply needed") + '</span><span class="drawer__spacer"></span><button type="button" class="btn" data-action="reply-reopen">' + icon("undo") + "Put back</button>") + "</div>";
  }

  // ---------- A call ----------
  function meetingHTML(ctx, m) {
    const d = ctx.d;
    const L = window.TL.links;
    const people = (m.personIds || []).map(function (id) { return M.personById(d, id); }).filter(Boolean);
    const actions = (m.actionTaskIds || []).map(function (id) { return M.taskById(d, id); }).filter(function (t) { return t && t.status !== "dismissed"; });
    const f = m.followUp || {};
    return '<div class="drawer__head"><span class="label">Call</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="drawer__body" data-meeting="' + esc(m.id) + '">' +
      '<div><p class="mail-head__subject">' + esc(m.title) + '</p><p class="muted">' + esc(window.TL.views.calls.when(m)) + (m.source ? " · " + esc(m.source) : "") + "</p></div>" +
      (people.length ? '<div class="call-people">' + people.map(function (p) { return '<button type="button" class="who who--btn" data-action="open-person" data-person="' + esc(p.id) + '">' + C.avatar(p) + '<span class="who__name">' + esc(p.name) + "</span></button>"; }).join("") + "</div>" : "") +
      (m.summary ? '<section class="drawer__section"><h3 class="label">Summary</h3><p>' + esc(m.summary) + "</p></section>" : "") +
      (m.decisions && m.decisions.length ? '<section class="drawer__section"><h3 class="label">Decided</h3><ul class="guide__steps">' + m.decisions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : "") +
      (actions.length ? '<section class="drawer__section"><h3 class="label">Actions <span class="badge">' + actions.length + "</span></h3>" +
        '<ul class="rows" role="list">' + actions.map(function (t) {
          return M.isSuggestion(t) ? '<li class="row" data-task="' + esc(t.id) + '"><span class="new-tag">New</span><button type="button" class="row__main" data-action="open-task"><span class="row__title">' + esc(t.title) + "</span></button>" +
            '<span class="row__actions row__actions--show"><button type="button" class="icon-btn icon-btn--sm is-approve" data-action="approve" aria-label="Approve">' + icon("check") + '</button><button type="button" class="icon-btn icon-btn--sm is-skip" data-action="skip" aria-label="Skip">' + icon("x") + "</button></span></li>"
            : C.taskRow(d, t, { keySuffix: "-call" });
        }).join("") + "</ul></section>" : "") +
      (f.body ? '<section class="drawer__section draft"><h3 class="label">Follow-up email</h3>' +
        '<p class="muted drawer__small">To ' + esc(f.to || "") + (f.subject ? " · " + esc(f.subject) : "") + "</p>" +
        '<textarea class="textarea draft__body" data-mfield="body" rows="8" aria-label="Follow-up email">' + esc(f.body) + "</textarea>" +
        '<div class="draft__actions"><button type="button" class="btn btn--primary" data-action="meeting-draft">' + icon("pencil") + "Draft in " + esc(L.emailLabel(d.settings.emailProvider)) + "</button>" +
        '<button type="button" class="btn" data-action="copy-followup">' + icon("list") + "Copy</button></div></section>" : "") +
      (m.transcriptUrl ? '<section class="drawer__section"><a class="btn btn--ghost btn--sm" href="' + esc(safeUrl(m.transcriptUrl)) + '" target="_blank" rel="noopener">' + icon("external") + "Open the recording</a></section>" : "") +
      "</div>";
  }

  function render(ctx, target) {
    if (target.kind === "task") { const t = M.taskById(ctx.d, target.id); return t ? taskHTML(ctx, t) : null; }
    if (target.kind === "person") { const p = M.personById(ctx.d, target.id); return p ? personHTML(ctx, p) : null; }
    if (target.kind === "reply") { const r = M.replyById(ctx.d, target.id); return r ? replyHTML(ctx, r) : null; }
    if (target.kind === "meeting") { const m = M.meetingById(ctx.d, target.id); return m ? meetingHTML(ctx, m) : null; }
    return null;
  }

  // Save each field as soon as it changes
  function bind(root, ctx, target) {
    root.querySelectorAll("[data-stage]").forEach(function (el) {
      el.addEventListener("change", function () { ctx.actions.setStage(target.id, el.value); });
    });
    root.querySelectorAll("[data-who]").forEach(function (el) {
      el.addEventListener("change", function () { ctx.actions.setWho(target.id, el.value.trim()); });
    });
    root.querySelectorAll("[data-field]").forEach(function (el) {
      el.addEventListener("change", function () {
        const field = el.getAttribute("data-field");
        let value = el.value;
        if (field === "title") { value = value.replace(/\s+/g, " ").trim(); if (!value) { el.value = M.taskById(ctx.d, target.id).title; return; } }
        if (field === "durationMinutes") value = value ? Number(value) : null;
        const fields = {}; fields[field] = value;
        ctx.actions.updateTask(target.id, fields);
      });
    });
    root.querySelectorAll("[data-pfield]").forEach(function (el) {
      el.addEventListener("change", function () {
        const field = el.getAttribute("data-pfield");
        const value = el.value.trim();
        if (field === "name" && !value) { el.value = M.personById(ctx.d, target.id).name; return; }
        const fields = {}; fields[field] = value;
        ctx.actions.updatePerson(target.id, fields);
      });
    });
    // Edits to Claude's drafts are kept in the task file
    root.querySelectorAll("[data-rfield]").forEach(function (el) {
      el.addEventListener("change", function () {
        const draft = {}; draft[el.getAttribute("data-rfield")] = el.value;
        ctx.actions.updateReply(target.id, { draft: draft });
      });
    });
    root.querySelectorAll("[data-efield]").forEach(function (el) {
      el.addEventListener("change", function () {
        const t = M.taskById(ctx.d, target.id);
        const draft = Object.assign({}, t.emailDraft); draft[el.getAttribute("data-efield")] = el.value;
        ctx.actions.updateTask(target.id, { emailDraft: draft });
      });
    });
    root.querySelectorAll("[data-mfield]").forEach(function (el) {
      el.addEventListener("change", function () { ctx.actions.updateMeetingFollowUp(target.id, el.value); });
    });
    root.querySelectorAll(".draft__body").forEach(function (ta) {
      const fit = function () { ta.style.height = "auto"; ta.style.height = Math.min(520, ta.scrollHeight + 2) + "px"; };
      fit(); ta.addEventListener("input", fit);
    });

    // The title grows with its text, and Enter finishes editing
    const title = root.querySelector(".drawer__title");
    if (title) {
      const fit = function () { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; };
      fit();
      title.addEventListener("input", fit);
      title.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); title.blur(); } });
    }
  }

  window.TL.drawer = { render: render, bind: bind };
})();
