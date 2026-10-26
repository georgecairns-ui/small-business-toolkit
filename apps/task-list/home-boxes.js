/*
  TASK LIST OS ON HOME: the boxes this tool adds to the Home dashboard
  -------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (see "home" in menu.json).
  It reads and saves the same task file as the task list itself, through the same shared store,
  so Approve, Skip and ticking a task off on Home are exactly the same as in the task list.
*/
(function () {
  "use strict";

  const M = window.TL.model, mut = M.mut;
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const PAGE = "../task-list/#";
  let data = null;
  let ctx = null;
  let store = null;
  let folder = null;   // this Task List OS folder, so "Open in Claude" starts Claude Code right here

  // Same rule as the task panel: Claude Code in this folder when it's known, otherwise a new chat. Never sent by itself.
  function claudeLink(prompt) {
    const q = encodeURIComponent(String(prompt || "").slice(0, 12000));
    return folder ? "claude://code/new?q=" + q + "&folder=" + encodeURIComponent(folder) : "claude://claude.ai/new?q=" + q;
  }

  function today() { return M.todayISO(); }
  function person(id) { return id ? M.personById(data, id) : null; }
  function firstName(p) { return p && p.name ? p.name.split(" ")[0] : ""; }
  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }

  function change(fn) {
    return store.update(function (d) { M.normalise(d); fn(d); })
      .catch(function () { ui.toast("That couldn't be saved. Is the task list running?", { icon: "alert", duration: 6000 }); });
  }

  // ---------- The boxes ----------
  function plan() {
    const props = M.proposals(data);
    const list = M.tasksForDate(data, today(), { includeDone: true })
      .concat(M.approvedToday(data).map(function (i) { return M.taskById(data, i.taskId); }))
      .filter(function (t, i, all) { return t && all.indexOf(t) === i; });
    if (M.notSetUp(data)) return '<div class="hbox__setup"><p><strong>Let\u2019s set up your task list.</strong> In the Claude desktop app, open the Code tab in your Small Business Toolkit OS folder and type <code>/setup</code>. Claude connects your email, calendar and calls, then fills this page with your real work.</p></div>';
    if (!props.length && !list.length) return empty("Claude hasn't sorted today yet. Say \"sort my day\" to Claude and the plan appears here.");
    const note = M.planIsToday(data) && data.plan.note ? '<p class="hplan__note">' + esc(data.plan.note) + "</p>" : "";
    const rows = props.slice(0, 4).map(function (i) {
      const t = M.taskById(data, i.taskId);
      return '<li class="hrow hrow--plan"><span class="hrow__main"><span class="hrow__title">' + esc(t.title) + "</span>" +
        (i.reason ? '<span class="hrow__sub">' + esc(i.reason) + "</span>" : "") + "</span>" +
        '<span class="hrow__actions"><button type="button" class="btn btn--sm btn--approve" data-home-action="task-list:approve" data-id="' + esc(t.id) + '">' + icon("check") + "Approve</button>" +
        '<button type="button" class="btn btn--sm btn--ghost" data-home-action="task-list:skip" data-id="' + esc(t.id) + '">Skip</button></span></li>';
    }).join("");
    const more = props.length > 4 ? '<li class="hrow hrow--more"><a href="' + PAGE + 'today">' + (props.length - 4) + " more on Today</a></li>" : "";
    const ticks = list.slice(0, 6).map(function (t) {
      const done = t.status === "done";
      return '<li class="hrow hrow--task' + (done ? " is-done" : "") + '"><button type="button" class="check" role="checkbox" aria-checked="' + done + '" aria-label="' + (done ? "Mark not done: " : "Mark done: ") + esc(t.title) + '" data-home-action="task-list:tick" data-id="' + esc(t.id) + '"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></button>' +
        '<span class="hrow__title">' + esc(t.title) + "</span>" + (t.scheduledTime ? '<span class="hrow__meta">' + esc(M.timeLabel(t.scheduledTime)) + "</span>" : "") + "</li>";
    }).join("");
    return note +
      (rows ? '<h4 class="hbox__sub">Claude suggests</h4><ul class="hlist" role="list">' + rows + more + "</ul>" : "") +
      (ticks ? '<h4 class="hbox__sub">On your list today</h4><ul class="hlist" role="list">' + ticks + "</ul>" : "");
  }

  function inbox() {
    const open = M.openReplies(data);
    if (!open.length) return empty(data.triage && data.triage.lastRunAt ? "Nothing needs a reply. Claude checks again on its next check-in." : "Once your email is connected, emails that need an answer appear here with a draft ready.");
    return '<p class="hstat"><span class="hstat__num">' + open.length + '</span><span class="hstat__label">' + (open.length === 1 ? "email needs" : "emails need") + " a reply</span></p>" +
      '<ul class="hlist" role="list">' + open.slice(0, 3).map(function (r) {
        const sender = r.from ? (r.from.name || r.from.email) : "Unknown sender";
        return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(sender) + '</span><span class="hrow__sub">' + esc(r.subject || "(no subject)") + "</span></span>" +
          (r.draft ? '<span class="chip chip--accent">Draft ready</span>' : "") + "</li>";
      }).join("") + "</ul>";
  }

  function calendar() {
    const iso = today();
    const items = M.eventsForDate(data, iso).map(function (e) { return { at: e.allDay ? -1 : M.splitLocal(e.start).minutes, title: e.title, sub: e.location || "", kind: "event" }; })
      .concat(M.timedTasksForDate(data, iso).map(function (t) { return { at: M.toMinutes(t.scheduledTime), title: t.title, sub: "Task", kind: "task" }; }))
      .sort(function (a, b) { return a.at - b.at; });
    if (!items.length) return empty(data.eventsSyncedAt ? "Nothing in your calendar today." : "Your meetings appear here once Claude has copied in your calendar (say \"sort my day\").");
    return '<ul class="hcal" role="list">' + items.slice(0, 6).map(function (x) {
      return '<li class="hcal__item hcal__item--' + x.kind + '"><span class="hcal__time">' + (x.at < 0 ? "All day" : esc(M.timeLabel(M.fromMinutes(x.at)))) + '</span><span class="hcal__what"><span class="hrow__title">' + esc(x.title) + "</span>" + (x.sub ? '<span class="hrow__sub">' + esc(x.sub) + "</span>" : "") + "</span></li>";
    }).join("") + "</ul>" + (items.length > 6 ? '<p class="hbox__more">' + (items.length - 6) + " more today</p>" : "");
  }

  function week() {
    const days = M.weekDates(M.mondayOf(today()));
    return '<ol class="hweek" role="list">' + days.map(function (iso) {
      const n = M.tasksForDate(data, iso).filter(function (t) { return t.status === "open"; }).length + M.eventsForDate(data, iso).length;
      const d = ui.parseDate(iso);
      return '<li><a class="hweek__day' + (iso === today() ? " is-today" : "") + (iso < today() ? " is-past" : "") + '" href="' + PAGE + 'week">' +
        '<span class="hweek__name">' + esc(d.toLocaleDateString("en-GB", { weekday: "short" })) + "</span>" +
        '<span class="hweek__date">' + d.getDate() + "</span>" +
        '<span class="hweek__count">' + (n ? n + (n === 1 ? " thing" : " things") : "Free") + "</span></a></li>";
    }).join("") + "</ol>";
  }

  function waiting() {
    const list = M.waitingList(data).sort(function (a, b) { return String(a.waitingSince || "").localeCompare(String(b.waitingSince || "")); });
    if (!list.length) return empty("Nobody to chase. Nice.");
    const now = ui.parseDate(today());
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (t) {
      const p = person(t.personId);
      const days = t.waitingSince ? Math.max(0, Math.round((now - ui.parseDate(t.waitingSince)) / 86400000)) : null;
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(t.title) + "</span>" +
        (p ? '<span class="hrow__sub">' + esc(p.name) + "</span>" : "") + "</span>" +
        (days != null ? '<span class="hrow__meta">' + (days === 0 ? "since today" : days + (days === 1 ? " day" : " days")) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  function claudeCan() {
    const list = data.tasks.filter(M.claudeCanDo);
    if (!list.length) return empty("When Claude checks in, it marks the tasks it could do for you, using your connections. They appear here with a prompt ready to go.");
    return '<ul class="hlist" role="list">' + list.slice(0, 4).map(function (t) {
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(t.title) + '</span><span class="hrow__sub">' + esc(t.claude.how || "") + "</span></span>" +
        '<a class="btn btn--sm" href="' + esc(claudeLink(t.claude.prompt)) + '" title="Opens Claude with the prompt ready. You press send.">' + icon("sparkle") + "Open in Claude</a></li>";
    }).join("") + "</ul>" + (list.length > 4 ? '<p class="hbox__more">' + (list.length - 4) + " more on Tasks</p>" : "");
  }

  function saved() {
    const start = ui.parseDate(today());
    const w = M.timeSaved(data, ui.addDays(start, -6));
    return '<p class="hstat"><span class="hstat__num">' + esc(ui.minutesLabel(w.minutes)) + '</span><span class="hstat__label">saved in the last 7 days (an estimate)</span></p>' +
      '<p class="hbox__more">' + w.tasksDone + (w.tasksDone === 1 ? " task" : " tasks") + " done and " + w.plans + (w.plans === 1 ? " plan" : " plans") + " approved.</p>";
  }

  function calls() {
    const list = M.meetingsSorted(data);
    if (!list.length) return empty("Once your call recorder is connected, your calls are written up here.");
    return '<ul class="hlist" role="list">' + list.slice(0, 3).map(function (m) {
      const waitingActions = (m.actionTaskIds || []).filter(function (id) { return M.isSuggestion(M.taskById(data, id)); }).length;
      const s = m.date ? M.splitLocal(m.date) : null;
      const when = s ? ui.parseDate(s.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";
      return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(m.title) + '</span><span class="hrow__sub">' + esc(when) + "</span></span>" +
        (waitingActions ? '<span class="chip chip--accent">' + waitingActions + (waitingActions === 1 ? " action" : " actions") + " to approve</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("task-list", {
    // In this order the default Home fills every row of the 3-column grid exactly
    boxes: [
      { id: "plan", title: "Today's plan", icon: "sun", size: 2, defaultOn: true, page: PAGE + "today", render: plan },
      { id: "inbox", title: "Inbox", icon: "inbox", size: 1, defaultOn: true, page: PAGE + "replies", render: inbox },
      { id: "week", title: "This week", icon: "columns", size: 2, defaultOn: true, page: PAGE + "week", render: week },
      { id: "waiting", title: "Waiting on", icon: "hourglass", size: 1, defaultOn: true, page: PAGE + "waiting", render: waiting },
      { id: "calendar", title: "Today's calendar", icon: "calendar", size: 1, defaultOn: true, page: PAGE + "calendar", render: calendar },
      { id: "claude", title: "Claude can do these", icon: "sparkle", size: 1, defaultOn: true, page: PAGE + "tasks", render: claudeCan },
      { id: "saved", title: "Time saved", icon: "clock", size: 1, defaultOn: false, page: PAGE + "tasks", render: saved },
      { id: "calls", title: "Calls", icon: "phone", size: 1, defaultOn: true, page: PAGE + "calls", render: calls }
    ],
    greetingName: function () { return data && data.settings.yourName; },
    businessName: function () { return data && (data.settings.businessName || (data.settings.yourName ? data.settings.yourName + "'s workspace" : "")); },
    start: function (c) {
      ctx = c;
      const def = this;
      store = window.TaskListOS.createStore({
        moduleId: "task-list",
        fileName: "tasks.json",
        dataPaths: ["data", "", "apps/task-list/data"],
        api: "/api/tasks",
        validate: M.validate,
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
      fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { folder = info.folder || null; ctx.refresh(); }).catch(function () {});
    },
    action: function (name, el) {
      const id = el.getAttribute("data-id");
      if (!data || !id) return;
      if (name === "approve") change(function (d) { mut.approve(d, id); }).then(function () { ui.toast("Approved"); });
      if (name === "skip") change(function (d) { mut.skip(d, id); });
      if (name === "tick") {
        const t = M.taskById(data, id);
        const done = t && t.status !== "done";
        change(function (d) { mut.setDone(d, id, done); });
      }
    }
  });
})();
