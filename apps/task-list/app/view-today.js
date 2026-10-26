/*
  TODAY: the daily view
  ---------------------
  Left: a greeting, Claude's plan to approve, anything overdue, and today's list.
  Right: today's schedule (calendar events and timed tasks), who you're waiting on,
  and the time-saved estimate.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;

  // Today's list: what was approved for today, plus anything planned or due today
  function todaysTasks(d) {
    const today = M.todayISO();
    const ids = new Set();
    const out = [];
    M.approvedToday(d).forEach(function (i) {
      const t = M.taskById(d, i.taskId);
      if (t && !ids.has(t.id) && (t.status === "open" || (t.doneAt && ui.isoDate(new Date(t.doneAt)) === today))) { ids.add(t.id); out.push(t); }
    });
    M.tasksForDate(d, today, { includeDone: true }).forEach(function (t) { if (!ids.has(t.id)) { ids.add(t.id); out.push(t); } });
    return out;
  }

  function greetingLine(d) {
    const props = M.proposals(d);
    const list = todaysTasks(d);
    const done = list.filter(function (t) { return t.status === "done"; }).length;
    if (props.length) {
      const fresh = props.filter(function (i) { return M.isSuggestion(M.taskById(d, i.taskId)); }).length;
      return "Claude has sorted your day: " + props.length + (props.length === 1 ? " suggestion" : " suggestions") + " to review" +
        (fresh ? ", " + fresh + " of them new from your inbox or calendar" : "") + ".";
    }
    if (list.length) return done === list.length ? "Everything on today's list is done. Nicely handled." : done + " of " + list.length + " done. " + (list.length - done) + " to go.";
    if (M.claudeHasPlanned(d)) return "You've been through Claude's plan. Add anything else below.";
    return "Claude hasn't sorted today yet. Ask it to and the plan appears here.";
  }

  function scheduleRail(ctx) {
    const d = ctx.d, today = M.todayISO();
    const items = M.eventsForDate(d, today).map(function (e) {
      return { start: e.allDay ? null : M.splitLocal(e.start).minutes, end: e.allDay ? null : M.splitLocal(e.end).minutes, title: e.title, kind: "event", id: e.id, sub: e.location || "" };
    }).concat(M.timedTasksForDate(d, today).map(function (t) {
      const s = M.toMinutes(t.scheduledTime);
      return { start: s, end: s + (t.durationMinutes || 30), title: t.title, kind: "task", id: t.id, done: t.status === "done" };
    })).sort(function (a, b) { return (a.start == null ? -1 : a.start) - (b.start == null ? -1 : b.start); });

    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const list = items.length ? '<ol class="agenda">' + items.map(function (it) {
      const past = it.end != null && it.end < now;
      const time = it.start == null ? "All day" : M.timeLabel(M.fromMinutes(it.start));
      const attrs = it.kind === "task" ? ' data-task="' + esc(it.id) + '"' : ' data-event="' + esc(it.id) + '"';
      return '<li class="agenda__item agenda__item--' + it.kind + (past ? " is-past" : "") + (it.done ? " is-done" : "") + '"' + attrs + '>' +
        '<span class="agenda__time num">' + esc(time) + "</span>" +
        '<button type="button" class="agenda__title" data-action="' + (it.kind === "task" ? "open-task" : "open-event") + '">' + esc(it.title) + (it.sub ? '<span class="agenda__sub">' + esc(it.sub) + "</span>" : "") + "</button></li>";
    }).join("") + "</ol>" : '<p class="muted rail-empty">Nothing in your calendar today. Drag tasks into time slots on the Calendar page to plan your hours.</p>';

    return '<section class="card rail-card">' +
      '<div class="card__head"><h2>Schedule</h2><a class="btn btn--ghost btn--sm" href="#calendar">Calendar' + icon("chevronRight") + "</a></div>" +
      '<div class="card__body">' + list + "</div></section>";
  }

  function waitingRail(ctx) {
    const d = ctx.d;
    const list = M.waitingList(d).slice(0, 4);
    if (!list.length) return "";
    return '<section class="card rail-card"><div class="card__head"><h2>Waiting on</h2><a class="btn btn--ghost btn--sm" href="#waiting">All' + icon("chevronRight") + "</a></div>" +
      '<ul class="mini-list" role="list">' + list.map(function (t) {
        const p = M.personById(d, t.personId);
        const since = t.waitingSince ? Math.max(0, Math.round((ui.parseDate(M.todayISO()) - ui.parseDate(t.waitingSince)) / 86400000)) : null;
        return '<li data-task="' + esc(t.id) + '"><button type="button" class="mini-list__item" data-action="open-task">' + (p ? C.avatar(p) : '<span class="avatar">?</span>') +
          '<span><span class="mini-list__title">' + esc(t.title) + '</span><span class="mini-list__sub">' + esc(p ? p.name : t.waitingOn || "Someone") + (since ? " · " + since + (since === 1 ? " day" : " days") : "") + "</span></span></button></li>";
      }).join("") + "</ul></section>";
  }

  function savedRail(ctx) {
    const d = ctx.d;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const first = ui.addDays(start, -6);
    const total = M.timeSaved(d, first);
    let max = 1;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const from = ui.addDays(first, i);
      const m = M.timeSaved(d, from, ui.addDays(first, i + 1)).minutes;
      max = Math.max(max, m);
      days.push({ label: from.toLocaleDateString("en-GB", { weekday: "narrow" }), m: m, today: i === 6 });
    }
    return '<section class="card rail-card"><div class="card__head"><h2>Time saved</h2><span class="chip">Last 7 days · estimate</span></div>' +
      '<div class="card__body saved"><p class="saved__value num">' + esc(ui.minutesLabel(total.minutes)) + "</p>" +
      '<div class="bars" aria-hidden="true">' + days.map(function (x) {
        return '<span class="bar' + (x.today ? " is-today" : "") + '"><span style="height:' + (x.m ? Math.max(8, Math.round(x.m / max * 100)) : 3) + '%"></span><em>' + x.label + "</em></span>";
      }).join("") + "</div>" +
      '<p class="saved__how">' + total.tasksDone + (total.tasksDone === 1 ? " task" : " tasks") + " done and " + total.plans + (total.plans === 1 ? " plan" : " plans") + " approved, at about " + d.settings.minutesSavedPerTask + " and " + d.settings.minutesSavedPerPlan + " minutes each.</p>" +
      '<button type="button" class="btn btn--sm saved__wrap" data-action="summary">' + icon("moon") + "Wrap up the day</button></div></section>";
  }

  // Claude's plan for today (or a nudge to ask for one), shown at the top of the Tasks page's Today view
  function planSection(ctx) {
    const d = ctx.d;
    const props = M.proposals(d);
    if (props.length) {
      return '<section class="panel panel--accent">' + C.sectionHead("Claude's plan for today", { icon: "sparkle", count: props.length, accent: true,
        right: '<button type="button" class="btn btn--approve btn--sm" data-action="approve-plan">' + icon("check") + "Approve all</button>" }) +
        (d.plan.note ? '<blockquote class="claude-note"><span class="label">Claude\'s read on today</span><p>' + esc(d.plan.note) + "</p></blockquote>" : "") +
        '<ul class="proposals" role="list">' + props.map(function (i) { return window.TL.views.review.proposalRow(ctx, M.taskById(d, i.taskId), { kind: "plan", category: i.category, reason: i.reason }); }).join("") + "</ul></section>";
    }
    if (!M.claudeHasPlanned(d)) {
      return '<section class="panel nudge"><div class="nudge__art"><img src="' + C.ART.thinking + '" alt="" width="64" height="64"></div>' +
        "<div><h2>No plan for today yet</h2><p class=\"muted\">Ask Claude to sort your day. It checks your list, inbox and calendar, then suggests a plan for you to approve.</p></div>" + C.say("Sort my day") + "</section>";
    }
    return "";
  }

  function render(ctx) {
    const d = ctx.d;
    const name = d.settings.yourName;
    const props = M.proposals(d);
    const list = todaysTasks(d);
    const done = list.filter(function (t) { return t.status === "done"; }).length;
    const late = M.overdue(d).filter(function (t) { return list.indexOf(t) === -1; });

    let main = '<div class="today-head' + ctx.anim("today-head") + '">' +
      "<div><h2 class=\"greeting\">" + esc(ui.greeting()) + (name ? ", " + esc(name) : "") + "</h2>" +
      '<p class="muted">' + esc(greetingLine(d)) + "</p></div>" +
      (list.length ? '<div class="progress"><span class="progress__label num"><strong>' + done + "</strong> of " + list.length + ' done</span><span class="progress__bar" role="progressbar" aria-label="Today\'s progress" aria-valuemin="0" aria-valuemax="' + list.length + '" aria-valuenow="' + done + '"><span style="width:' + Math.round(done / list.length * 100) + '%"></span></span></div>' : "") +
      "</div>" + window.TL.views.replies.triageStrip(d, true);

    // Claude's plan
    if (props.length) {
      main += '<section class="panel panel--accent">' + C.sectionHead("Claude's plan for today", { icon: "sparkle", count: props.length, accent: true,
        right: '<button type="button" class="btn btn--approve btn--sm" data-action="approve-plan">' + icon("check") + "Approve all</button>" }) +
        (d.plan.note ? '<blockquote class="claude-note"><span class="label">Claude\'s read on today</span><p>' + esc(d.plan.note) + "</p></blockquote>" : "") +
        '<ul class="proposals" role="list">' + props.map(function (i) { return window.TL.views.review.proposalRow(ctx, M.taskById(d, i.taskId), { kind: "plan", category: i.category, reason: i.reason }); }).join("") + "</ul></section>";
    } else if (!M.claudeHasPlanned(d)) {
      main += '<section class="panel nudge">' + '<div class="nudge__art"><img src="' + C.ART.thinking + '" alt="" width="64" height="64"></div>' +
        "<div><h2>No plan for today yet</h2><p class=\"muted\">Ask Claude to sort your day. It checks your list, inbox and calendar, then suggests a plan for you to approve.</p></div>" + C.say("Sort my day") + "</section>";
    }

    // Emails that need an answer, with Claude's drafts
    const replies = M.openReplies(d);
    if (replies.length) {
      main += '<section class="panel panel--flush">' + C.sectionHead("Needs a reply", { icon: "mail", count: replies.length,
        right: '<a class="btn btn--ghost btn--sm" href="#replies">All replies' + icon("chevronRight") + "</a>" }) +
        '<ul class="replies" role="list">' + replies.slice(0, 3).map(function (r) { return window.TL.views.replies.replyRow(ctx, r, { suffix: "-today" }); }).join("") + "</ul></section>";
    }

    // Overdue
    if (late.length) {
      main += '<section class="panel">' + C.sectionHead("Overdue", { icon: "alert", count: late.length }) +
        C.taskList(d, late, { anim: ctx.anim, keySuffix: "-late", showCat: true, actions: '<button type="button" class="btn btn--sm" data-action="add-today">Do today</button>' }) + "</section>";
    }

    // Today's list
    main += '<section class="panel">' + C.sectionHead("Today's list", { icon: "sun", count: list.length || null }) +
      '<form class="inline-add" data-form="add-today" autocomplete="off"><span class="inline-add__icon">' + icon("plus") + '</span>' +
      '<input class="inline-add__input" id="todayAdd" data-keep name="title" maxlength="200" placeholder="Add a task for today and press Enter" aria-label="Add a task for today"></form>' +
      (list.length ? C.groupedList(d, list, { anim: ctx.anim, keySuffix: "-today", draggable: false }) :
        '<p class="muted list-empty">Nothing on today\'s list yet. Approve Claude\'s plan, or add your own task above.</p>') +
      "</section>";

    return '<div class="page page--split"><div class="page__main">' + main + '</div><aside class="page__rail">' + scheduleRail(ctx) + waitingRail(ctx) + savedRail(ctx) + "</aside></div>";
  }

  // End-of-day summary, shown in a pop-up
  function summary(ctx) {
    const d = ctx.d;
    const doneList = M.doneToday(d);
    const open = todaysTasks(d).filter(function (t) { return t.status === "open"; });
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const saved = M.timeSaved(d, start);
    const stat = function (v, l) { return '<div class="stat"><span class="stat__value num">' + esc(v) + '</span><span class="stat__label">' + esc(l) + "</span></div>"; };
    const listOf = function (title, tasks, isDone) {
      return tasks.length ? '<div class="summary__list"><span class="label">' + esc(title) + '</span><ul role="list">' + tasks.map(function (t) { return "<li>" + icon(isDone ? "check" : "arrowRight", isDone ? "is-done" : "") + esc(t.title) + "</li>"; }).join("") + "</ul></div>" : "";
    };
    return '<div class="modal__head"><h2 id="genericTitle">' + (doneList.length >= 3 ? "Good day's work" : doneList.length ? "Steady progress today" : "A quiet one today") + (d.settings.yourName ? ", " + esc(d.settings.yourName) : "") + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><div class="summary__hero"><img src="' + (doneList.length ? C.ART.trophy : C.ART.thinking) + '" alt="" width="72" height="72"><div class="stats">' +
      stat(doneList.length, "done") + stat(open.length, "rolling over") + stat(M.waitingList(d).length, "waiting on others") + stat(ui.minutesLabel(saved.minutes), "saved today (estimate)") + "</div></div>" +
      listOf("Done today", doneList, true) + listOf("Rolls over to tomorrow", open, false) +
      '<div class="summary__next"><p>Tomorrow morning, say this to Claude and it will carry the unfinished ones over:</p>' + C.say("Sort my day") + "</div></div>" +
      '<div class="modal__foot"><button type="button" class="btn btn--primary" data-close>Close</button></div>';
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.today = {
    title: function () { return "Today"; },
    sub: function () { return ui.longDate(); },
    render: render,
    summary: summary,
    todaysTasks: todaysTasks,
    planSection: planSection,
    greetingLine: greetingLine
  };
})();
