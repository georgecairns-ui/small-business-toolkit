/*
  TASK LIST OS: the app
  ---------------------
  Ties everything together:
  1. Connects to data/tasks.json through the shared store.
  2. Shows the welcome screen until a folder is connected, then the app.
  3. Moves between pages (Today, Review, Brain dump, This week, Calendar, All tasks,
     Waiting on, People, Done) using the address bar, so Back and Forward work.
  4. Handles every button, form, drag and keyboard shortcut. Every change goes through
     change(), which saves it into the task file for Claude to read.

  The rule throughout: Claude proposes, the person approves.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c, V = window.TL.views, Drawer = window.TL.drawer;
  const mut = M.mut;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Number keys 1 to 4 follow the sidebar: Tasks, Inbox, Review, Calls
  const VIEW_ORDER = ["tasks", "replies", "review", "calls"];
  const L = window.TL.links;
  const narrow = function () { return window.matchMedia("(max-width: 760px)").matches; };

  function remembered(key, allowed) {
    try { const v = localStorage.getItem(key); return allowed.indexOf(v) > -1 ? v : null; } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  // ---------- Screen state (not saved to the file) ----------
  const state = {
    view: "tasks",
    calMode: narrow() ? "day" : "week",
    calDate: M.todayISO(),
    calScroll: null,
    weekStart: null,
    // The Tasks page: which tasks (today, week, all) and how (board, list, calendar); remembered in this browser
    tasksScope: remembered("tlos-tasks-scope", ["today", "week", "all"]),
    tasksView: remembered("tlos-tasks-view", ["board", "list", "calendar"]),
    claudeOnly: false,
    filterCat: "all", filterPerson: "", sortBy: "date", allView: "all", filterRole: "all",
    drawer: null
  };

  let data = null;
  let status = "checking";
  let statusDetail = {};
  const seen = new Set();
  let stagger = 0;

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "task-list",
    fileName: "tasks.json",
    // Where tasks.json can be, depending on which folder the person picks
    dataPaths: ["data", "", "apps/task-list/data"],
    // The helper on this computer (apps/server), which Claude starts during setup
    api: "/api/tasks",
    validate: M.validate,
    onStatus: function (s, detail) {
      const previous = status;
      status = s;
      statusDetail = detail || {};
      renderChrome();
      if (!(data && (s === "ready" || s === "error")) || previous !== s) render();
    },
    onData: function (d, reason) {
      data = M.normalise(d);
      // First time on Tasks in this browser: open it the way Preferences says
      if (!state.tasksScope) state.tasksScope = data.settings.defaultScope || "today";
      if (!state.tasksView) state.tasksView = data.settings.defaultView || "board";
      // A different set of data (a folder opened): start with a clean screen
      if (reason === "load") { seen.clear(); state.drawer = null; }
      render();
      if (reason === "external") ui.toast("Claude updated your list", { icon: "sparkle" });
    }
  });

  function change(fn) {
    return store.update(function (d) { M.normalise(d); fn(d); }).catch(function (err) {
      ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 });
      render();
      err.shownToPerson = true;
      throw err;
    });
  }
  // A failed save has already been explained on screen, so it is not an unexpected error
  window.addEventListener("unhandledrejection", function (e) { if (e.reason && e.reason.shownToPerson) e.preventDefault(); });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your task file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in tasks.backup.json next to it.", say: "Please check my tasks.json file and fix it", short: "Your task file needs a quick fix" };
    if (kind === "missing") return { title: "Your task file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check, or choose your folder again.", say: "My task list file seems to be missing, please check it", short: "Your task file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your task list has stopped running.", body: "Everything is saved. In Claude, say \u201copen my task list\u201d and it starts again. This page reconnects by itself.", say: "Open my task list", short: "Your task list has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }

  // ============================================================
  // 2. Before a folder is connected: welcome, loading, problems
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }

  function gateCard(art, eyebrow, title, body, actions, small) {
    return '<div class="gate__card">' +
      '<div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Task List OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + title + "</h1>" + body +
      '<div class="gate__actions">' + actions + "</div>" + (small ? '<p class="gate__small">' + small + "</p>" : "") + "</div>" +
      '<div class="gate__art"><img src="' + C.ART[art] + '" alt="" width="440" height="440"></div></div>';
  }

  function renderGate(message) {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your task list"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("welcome", "", "Your task list opens from Claude.",
        "<p>Claude runs your task list on this computer and gives you a link to it. In Claude Code, in your Small Business Toolkit folder, just say:</p>" +
        C.say("Open my task list") +
        "<p class=\"gate__note\">Not set up yet? Say <strong>/setup</strong> instead. Claude connects your email, calendar and calls and builds your list first.</p>",
        "",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("shrug", "One small thing", "This works in Chrome or Microsoft Edge.",
        "<p>This browser can't save changes to files on your computer. Open this same file in Google Chrome or Microsoft Edge and it will work. Both are free.</p>",
        ""));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("welcome", "Welcome back", "Pick up where you left off.",
        "<p>Chrome asks for one click each visit before this page can open your files. It keeps your computer safe. If Chrome offers <strong>Allow on every visit</strong>, choose it and this step disappears.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my task list</button>" +
        '<button type="button" class="btn btn--ghost" data-action="change-folder">Use a different folder</button>',
        "Folder: " + esc(statusDetail.folderName || "")));
    }
    if (status === "error" && !data) {
      const f = friendlyError(statusDetail.error);
      return showGate(gateCard("shrug", "Something needs a look", esc(f.title), "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
        '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>" +
        '<button type="button" class="btn btn--ghost" data-action="change-folder">Choose the folder again</button>'));
    }
    // needs-connect: the first visit
    showGate(gateCard("welcome", "One-time setup", "Your day, sorted by Claude. <span class=\"accent\">Approved by you.</span>",
      "<p>Claude sorts your inbox, writes up your calls and drafts your replies. Everything lands here for you to approve. It all lives in a file on your own computer, in the folder Claude works from. Connect it once.</p>" +
      '<ol class="gate__steps"><li><span>Click <strong>Connect your task list</strong>.</span></li><li><span>Choose your <strong>Task List OS</strong> folder, the one with START-HERE.md in it.</span></li><li><span>When Chrome asks to let this page edit files, click <strong>Allow</strong>.</span></li></ol>' +
      (message ? '<p class="gate__error" role="alert">' + icon("alert") + esc(message) + "</p>" : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your task list</button>",
      "No account, nothing to install. Your tasks never leave your computer."));
  }

  // ============================================================
  // 3. The app
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }

  function render() {
    if (!inApp()) { renderChrome(); return renderGate(); }
    $("#gate").hidden = true;
    $("#shell").hidden = false;
    renderChrome();
    renderView();
    renderDrawer();
  }

  function anim(key) {
    if (seen.has(key)) return "";
    seen.add(key);
    return ' enter" style="--i:' + Math.min(stagger++, 12);
  }

  function storeInfo() {
    return { canChange: !store.isHelper(),
      folder: store.isHelper() ? "Your Task List OS folder, on this computer" : store.folderName() };
  }

  function ctx() {
    return { d: data, state: state, anim: anim, actions: viewActions, storeInfo: storeInfo };
  }

  // Sidebar counts, top bar, banners
  function renderChrome() {
    const pill = $("#saveStatus");
    if (status === "ready") {
      const just = statusDetail.savedAt && Date.now() - statusDetail.savedAt < 3000;
      pill.hidden = false;
      pill.className = "save-status" + (just ? " is-saving" : "");
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">' + (just ? "Saved" : "All changes saved") + "</span>";
      pill.title = statusDetail.helper ? "Saved in your Small Business Toolkit folder" : "Connected to " + (statusDetail.folderName || "your folder");
      if (just) setTimeout(function () { if (status === "ready") renderChrome(); }, 3100);
    } else if (status === "error" && data) {
      pill.hidden = false; pill.className = "save-status is-error";
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">Not saved</span>';
    } else pill.hidden = true;

    const banner = $("#banner");
    if (status === "error" && data) {
      const f = friendlyError(statusDetail.error);
      banner.innerHTML = '<div class="banner banner--error">' + icon("alert") + "<span><strong>" + esc(f.title) + "</strong> " + esc(f.body) + "</span>" +
        '<button type="button" class="btn btn--sm" data-action="retry">Try again</button></div>';
    } else banner.innerHTML = "";

    if (!data) return;
    $("#businessName").textContent = data.settings.businessName || (data.settings.yourName ? data.settings.yourName + "'s workspace" : "Your workspace");
    const counts = {
      today: V.today.todaysTasks(data).filter(function (t) { return t.status === "open"; }).length,
      tasks: data.tasks.filter(function (t) { return t.status === "open" && V.tasks.inScope(data, t, "today"); }).length,
      review: M.reviewCount(data),
      dump: M.unsortedDump(data).length,
      replies: M.openReplies(data).length,
      calls: data.meetings.filter(function (m) { return (m.actionTaskIds || []).some(function (id) { return M.isSuggestion(M.taskById(data, id)); }); }).length,
      all: M.openTasks(data).length,
      waiting: M.waitingList(data).length,
      people: data.people.length
    };
    document.querySelectorAll("[data-count]").forEach(function (el) {
      const n = counts[el.getAttribute("data-count")];
      el.textContent = n ? n : "";
    });
    document.querySelectorAll(".nav__item").forEach(function (a) {
      const on = a.getAttribute("data-view") === state.view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const week = M.timeSaved(data, ui.addDays(start, -6));
    $("#savedMini").innerHTML = '<span class="saved-mini__value num">' + esc(ui.minutesLabel(week.minutes)) + '</span><span class="saved-mini__label">saved in the last 7 days (estimate)</span>';
  }

  function renderView() {
    const view = V[state.view] || V.today;
    const root = $("#view");
    const c = ctx();
    // Keep anything typed in a box (brain dump, quick add lines) while the page redraws
    const kept = {};
    root.querySelectorAll("[data-keep]").forEach(function (el) { kept[el.id] = { value: el.value, start: el.selectionStart, end: el.selectionEnd }; });
    const focusedId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
    const scroll = root.scrollTop;

    stagger = 0;
    root.innerHTML = view.render(c);
    root.setAttribute("data-view", state.view);
    if (view.bind) view.bind(root, c);

    Object.keys(kept).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) { el.value = kept[id].value; if (id === focusedId) { el.focus(); try { el.setSelectionRange(kept[id].start, kept[id].end); } catch (e) { /* not a text box */ } } }
    });
    root.scrollTop = scroll;
    $("#viewTitle").textContent = view.title(c);
    $("#viewSub").textContent = view.sub ? view.sub(c) : "";
    document.title = view.title(c) + " · Task List OS";
  }

  // The record panel
  let drawerKey = null;
  function renderDrawer() {
    const el = $("#drawer");
    if (!state.drawer) { el.hidden = true; document.body.classList.remove("has-drawer"); drawerKey = null; return; }
    const key = state.drawer.kind + ":" + state.drawer.id;
    const active = document.activeElement;
    // Don't redraw under someone's fingers while they type in the panel
    if (key === drawerKey && active && el.contains(active) && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && /text|email|tel|search/.test(active.type)))) return;
    const html = Drawer.render(ctx(), state.drawer);
    if (!html) { state.drawer = null; return renderDrawer(); }
    const focusField = active && el.contains(active) ? (active.getAttribute("data-field") || active.getAttribute("data-pfield")) : null;
    el.innerHTML = html;
    Drawer.bind(el, ctx(), state.drawer);
    const opening = el.hidden;
    el.hidden = false;
    document.body.classList.add("has-drawer");
    if (opening) { el.classList.remove("is-open"); void el.offsetWidth; el.classList.add("is-open"); }
    if (focusField) { const f = el.querySelector('[data-field="' + focusField + '"],[data-pfield="' + focusField + '"]'); if (f) f.focus(); }
    drawerKey = key;
  }
  function openDrawer(kind, id) {
    if (!id) return;
    state.drawer = { kind: kind, id: id };
    drawerKey = null;
    renderDrawer();
    // Put keyboard users inside the panel
    setTimeout(function () { const b = $("#drawer [data-action='close-drawer']"); if (b) b.focus({ preventScroll: true }); }, 40);
  }
  function closeDrawer() { state.drawer = null; renderDrawer(); }

  // ============================================================
  // 4. Moving between pages
  // ============================================================

  function setScope(scope) { state.tasksScope = scope; remember("tlos-tasks-scope", scope); }
  function setTasksView(v) { state.tasksView = v; remember("tlos-tasks-view", v); }
  // Pages that are now views of Tasks (and People, which lives in Pipeline OS): old links still land somewhere sensible
  function resolve(view) {
    const map = { today: ["today"], week: ["week"], calendar: [null, "calendar"], all: ["all"], waiting: ["all"], done: ["all", "list"], dump: [], people: [] };
    if (!map[view]) return V[view] && ["preferences", "tasks", "replies", "review", "calls"].indexOf(view) > -1 ? view : "tasks";
    if (map[view][0]) setScope(map[view][0]);
    if (map[view][1]) setTasksView(map[view][1]);
    return "tasks";
  }
  function go(view) {
    view = resolve(view);
    if (view !== state.view) seen.clear();
    state.view = view;
    remember("tlos-view", view);
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderView(); $("#view").scrollTop = 0; }
  }
  window.addEventListener("hashchange", function () { const v = location.hash.slice(1); if (v && v !== state.view) go(v); });

  // ============================================================
  // 5. What the pages ask the app to do
  // ============================================================

  const viewActions = {
    setStage: function (taskId, stage) {
      const before = M.taskById(data, taskId);
      if (!before || M.stageOf(before) === stage) return;
      change(function (d) { mut.setStage(d, taskId, stage); }).then(function () { ui.toast("Moved to " + M.stageLabel(data, stage)); });
    },
    planForDay: function (taskId, date) {
      change(function (d) {
        const t = M.taskById(d, taskId);
        if (!t) return;
        if (!date) { t.scheduledDate = null; t.scheduledTime = null; }
        else mut.schedule(d, taskId, date, t.scheduledDate === date ? t.scheduledTime : null);
      }).then(function () {
        ui.toast(date ? "Planned for " + ui.parseDate(date).toLocaleDateString("en-GB", { weekday: "long" }) : "Moved to unplanned");
      });
    },
    scheduleAt: function (taskId, date, time) {
      change(function (d) { mut.schedule(d, taskId, date, time); }).then(function () {
        ui.toast(time ? "Scheduled for " + M.timeLabel(time) + ", " + ui.parseDate(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "Planned for " + ui.parseDate(date).toLocaleDateString("en-GB", { weekday: "long" }));
      });
    },
    updateTask: function (taskId, fields) {
      change(function (d) { mut.updateTask(d, taskId, fields); });
    },
    // "Who's it for" in a task's panel: an existing person or company, or a new one
    setWho: function (taskId, name) {
      let added = false;
      change(function (d) {
        const before = d.people.length;
        const p = name ? mut.personByName(d, name) : null;
        added = d.people.length > before;
        mut.updateTask(d, taskId, { personId: p ? p.id : "" });
      }).then(function () { if (added) ui.toast(name + " added to your contacts"); });
    },
    updatePerson: function (personId, fields) {
      change(function (d) { mut.updatePerson(d, personId, fields); });
    },
    updateReply: function (replyId, fields) {
      change(function (d) { mut.setReply(d, replyId, fields); });
    },
    updateMeetingFollowUp: function (meetingId, body) {
      change(function (d) { const m = M.meetingById(d, meetingId); if (m) { m.followUp = Object.assign({}, m.followUp, { body: body, editedAt: new Date().toISOString() }); } });
    }
  };

  // ---------- Drafts and calendar ----------
  function openDraft(draft, after) {
    const provider = data.settings.emailProvider || "gmail";
    L.open(L.composeUrl(draft, provider));
    if (after) after();
  }
  function addToCalendar(taskId) {
    const t = M.taskById(data, taskId);
    if (!t || !t.scheduledDate) return;
    const ev = { title: t.title, date: t.scheduledDate, time: t.scheduledTime || "09:00", minutes: t.durationMinutes || 30,
      details: [t.notes, t.guide && t.guide.summary ? "How to do it: " + t.guide.summary : ""].filter(Boolean).join("\n\n") + "\n\nFrom Task List OS" };
    const provider = data.settings.calendarProvider || "google";
    const url = L.calendarUrl(ev, provider);
    if (url) L.open(url); else L.downloadIcs(ev);
    change(function (d) { mut.calendarAdded(d, taskId); });
  }
  function slotText(date, time) {
    const diff = Math.round((ui.parseDate(date) - ui.parseDate(M.todayISO())) / 86400000);
    return (diff === 0 ? "today" : diff === 1 ? "tomorrow" : ui.parseDate(date).toLocaleDateString("en-GB", { weekday: "long" })) + " at " + M.timeLabel(time);
  }
  function scheduled(taskId, date, time) {
    ui.toast("Planned for " + slotText(date, time), { icon: "calendar", duration: 7000, actionLabel: "Add to calendar", onAction: function () { addToCalendar(taskId); } });
  }

  // Brain dump is shared (../shared/js/braindump.js): the button, V, and asking Claude to sort it

  // "When would you like to do this?" with free slots from the calendar
  function askWhen(taskId) {
    const t = M.taskById(data, taskId);
    if (!t) return;
    const slots = M.freeSlots(data, t.durationMinutes || 30, 4);
    const chip = function (s) {
      const diff = Math.round((ui.parseDate(s.date) - ui.parseDate(M.todayISO())) / 86400000);
      const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : ui.parseDate(s.date).toLocaleDateString("en-GB", { weekday: "long" });
      return '<button type="button" class="slot" data-when-date="' + s.date + '" data-when-time="' + s.time + '"><strong>' + esc(day) + "</strong><span>" + esc(M.timeLabel(s.time)) + "</span></button>";
    };
    openGeneric('<form data-form="when" data-task="' + esc(taskId) + '" autocomplete="off"><div class="modal__head"><h2 id="genericTitle">When would you like to do this?</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><p class="when__task">' + esc(t.title) + "</p>" +
      (slots.length ? '<div><span class="label">Free in your calendar</span><div class="slots">' + slots.map(chip).join("") + "</div></div>" : "") +
      '<div><span class="label">Or pick a time</span><div class="field-row field-row--3"><input class="input" type="date" name="date" aria-label="Day" value="' + M.todayISO() + '"><input class="input" type="time" name="time" step="900" aria-label="Time" value="09:00">' +
      '<select class="select" name="minutes" aria-label="How long">' + [15, 30, 45, 60, 90, 120].map(function (m) { return '<option value="' + m + '"' + (m === (t.durationMinutes || 30) ? " selected" : "") + ">" + ui.minutesLabel(m) + "</option>"; }).join("") + "</select></div></div></div>" +
      '<div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>No time for now</button><span class="spacer"></span><button type="submit" class="btn btn--primary">Plan it</button></div></form>');
  }

  // Approve or skip with a small, satisfying moment, then save. Undo puts it back.
  function decide(taskId, how, holder) {
    const t = M.taskById(data, taskId);
    if (!t) return;
    const wasNew = M.isSuggestion(t);
    const delay = holder && !ui.prefersReducedMotion() ? (how === "approve" ? 420 : 260) : 0;
    if (holder) {
      holder.classList.add(how === "approve" ? "is-approved" : "is-skipped");
      setTimeout(function () { holder.classList.add("is-leaving"); }, delay * 0.5);
    }
    setTimeout(function () {
      change(function (d) { if (how === "approve") mut.approve(d, taskId); else mut.skip(d, taskId); }).then(function () {
        focusNextDecision();
        const now = M.taskById(data, taskId);
        if (how === "approve" && now && now.scheduledTime && now.scheduledAt && Date.now() - new Date(now.scheduledAt) < 5000) return scheduled(taskId, now.scheduledDate, now.scheduledTime);
        const msg = how === "approve" ? (wasNew ? "Added to your list" : "Added to today's list") : (wasNew ? "Skipped. Claude won't suggest it again" : "Skipped. It stays on your list for another day");
        ui.toast(msg, { icon: how === "approve" ? "check" : "info", actionLabel: "Undo", onAction: function () { change(function (d) { mut.unreview(d, taskId, wasNew); }); } });
      });
    }, delay);
  }
  function decideSchedule(taskId, how, holder) {
    const t = M.taskById(data, taskId);
    if (!t) return;
    const before = { proposedDate: t.proposedDate, proposedTime: t.proposedTime, proposedReason: t.proposedReason, scheduledDate: t.scheduledDate, scheduledTime: t.scheduledTime };
    if (holder) holder.classList.add(how === "approve" ? "is-approved" : "is-skipped", "is-leaving");
    setTimeout(function () {
      change(function (d) { if (how === "approve") mut.approveSchedule(d, taskId); else mut.skipSchedule(d, taskId); }).then(function () {
        focusNextDecision();
        const after = M.taskById(data, taskId);
        if (how === "approve" && after && after.scheduledTime) scheduled(taskId, after.scheduledDate, after.scheduledTime);
        else ui.toast(how === "approve" ? "Planned" : "Suggestion skipped", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.updateTask(d, taskId, before); }); } });
      });
    }, holder && !ui.prefersReducedMotion() ? 300 : 0);
  }
  function focusNextDecision() {
    const next = $('#view [data-action="approve"], #view [data-action="approve-schedule"]');
    if (next) next.focus({ preventScroll: true });
  }
  function approveMany(ids, scheduleIds) {
    const total = ids.length + (scheduleIds || []).length;
    if (!total) return;
    document.querySelectorAll("#view .proposal").forEach(function (el, n) { setTimeout(function () { el.classList.add("is-approved"); }, n * 40); });
    setTimeout(function () {
      const newOnes = ids.filter(function (id) { return M.isSuggestion(M.taskById(data, id)); });
      change(function (d) {
        mut.approveAll(d, ids);
        (scheduleIds || []).forEach(function (id) { mut.approveSchedule(d, id); });
      }).then(function () {
        ui.toast("Approved " + total + (total === 1 ? " suggestion" : " suggestions"), {
          actionLabel: "Undo",
          onAction: function () { change(function (d) { ids.forEach(function (id) { mut.unreview(d, id, newOnes.indexOf(id) > -1); }); }); }
        });
      });
    }, ui.prefersReducedMotion() ? 0 : 300 + Math.min(total, 10) * 40);
  }

  function toggleDone(taskId) {
    const t = M.taskById(data, taskId);
    if (!t) return;
    const nowDone = t.status !== "done";
    document.querySelectorAll('[data-task="' + taskId + '"] .check').forEach(function (b) {
      b.setAttribute("aria-checked", String(nowDone));
      if (nowDone) b.classList.add("is-popping");
    });
    document.querySelectorAll('.row[data-task="' + taskId + '"], .wcard[data-task="' + taskId + '"]').forEach(function (r) { r.classList.toggle("is-done", nowDone); });
    setTimeout(function () {
      change(function (d) { mut.setDone(d, taskId, nowDone); }).then(function () {
        if (!nowDone) return;
        const today = V.today.todaysTasks(data);
        if (today.length && today.every(function (x) { return x.status === "done"; })) ui.toast("That's everything on today's list. Nice work", { icon: "sparkle" });
        else ui.toast("Done", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.setDone(d, taskId, false); }); } });
      });
    }, ui.prefersReducedMotion() ? 0 : 240);
  }

  // ---------- Pop-ups ----------
  const quickAdd = $("#quickAdd"), quickForm = $("#quickAddForm");
  function openQuickAdd(preset) {
    const p = preset || {};
    quickForm.reset();
    quickForm.category.innerHTML = C.categoryOptions(p.category || "today");
    const forPerson = p.personId ? M.personById(data, p.personId) : null;
    quickForm.whoFor.value = forPerson ? forPerson.name : "";
    $("#quickPeople").innerHTML = data.people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (x) {
      return '<option value="' + esc(x.name) + '">' + esc(x.organisation || "") + "</option>" + (x.organisation ? '<option value="' + esc(x.organisation) + '"></option>' : "");
    }).join("");
    quickForm.today.checked = p.today !== false;
    if (p.title) quickForm.title.value = p.title;
    quickAdd.showModal();
    quickForm.title.focus();
  }
  quickForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const title = quickForm.title.value.trim();
    if (!title) return quickForm.title.focus();
    const fields = { title: title, category: quickForm.category.value, personId: null, scheduledDate: quickForm.scheduledDate.value || null, due: quickForm.due.value || null };
    const whoFor = quickForm.whoFor.value.trim();
    const today = quickForm.today.checked;
    quickAdd.close();
    let made = null;
    change(function (d) {
      if (whoFor) fields.personId = mut.personByName(d, whoFor).id;
      made = mut.addTask(d, fields, { today: today });
    }).then(function () {
      ui.toast(today ? "Added to today's list" : "Task added", { actionLabel: "Open", onAction: function () { openDrawer("task", made.id); } });
    });
  });

  // A general pop-up for summaries, event details and the add-person form
  const generic = document.createElement("dialog");
  generic.className = "modal";
  generic.id = "genericDialog";
  generic.setAttribute("aria-labelledby", "genericTitle");
  document.body.appendChild(generic);
  function openGeneric(html) { generic.innerHTML = html; generic.showModal(); const f = generic.querySelector("input, .btn--primary"); if (f) f.focus(); }

  function openEvent(eventId) {
    const e = data.events.find(function (x) { return x.id === eventId; });
    if (!e) return;
    const s = M.splitLocal(e.start), en = M.splitLocal(e.end);
    const when = ui.parseDate(s.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + (e.allDay || s.minutes == null ? ", all day" : ", " + M.timeLabel(M.fromMinutes(s.minutes)) + (en.minutes != null ? " to " + M.timeLabel(M.fromMinutes(en.minutes)) : ""));
    openGeneric('<div class="modal__head"><h2 id="genericTitle">' + esc(e.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><div class="event-detail">' + icon("clock") + "<span>" + esc(when) + "</span></div>" +
      (e.location ? '<div class="event-detail">' + icon("mapPin") + "<span>" + esc(e.location) + "</span></div>" : "") +
      (e.calendar ? '<div class="event-detail">' + icon("calendar") + "<span>" + esc(e.calendar) + "</span></div>" : "") +
      (e.notes ? '<p class="muted">' + esc(e.notes) + "</p>" : "") +
      (e.guests ? '<div class="event-detail">' + icon("users") + "<span>" + esc(e.guests) + "</span></div>" : "") +
      (e.source === "app" ? '<p class="field__hint">You added this here. If you haven\'t saved it in your calendar yet, press "Open in calendar". Once it\'s there, Claude\'s next calendar copy replaces this one.</p></div>' +
        '<div class="modal__foot"><button type="button" class="btn btn--ghost btn--danger" data-action="remove-meeting" data-event="' + esc(e.id) + '">Remove</button><span class="spacer"></span>' +
        '<button type="button" class="btn" data-action="prep-event" data-title="' + esc(e.title) + '">' + icon("plus") + 'Prep task</button><button type="button" class="btn btn--primary" data-action="meeting-calendar" data-event="' + esc(e.id) + '">' + icon("calendar") + "Open in calendar</button></div>" :
      '<p class="field__hint">From your calendar. To change it, change it there; Claude copies it in again next time it sorts your day.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-action="prep-event" data-title="' + esc(e.title) + '">' + icon("plus") + 'Add a prep task</button><button type="button" class="btn btn--primary" data-close>Close</button></div>'));
  }

  // ---------- Adding a meeting ----------
  function meetingEvent(e) {
    const st = M.splitLocal(e.start), en = M.splitLocal(e.end);
    return { title: e.title, date: st.date, time: M.fromMinutes(st.minutes), minutes: Math.max(15, (en.minutes || st.minutes + 30) - st.minutes),
      location: e.location, guests: e.guests, details: [e.notes, "Added from Task List OS"].filter(Boolean).join("\n\n") };
  }
  function openInCalendar(e) {
    const ev = meetingEvent(e);
    const url = L.calendarUrl(ev, data.settings.calendarProvider || "google");
    if (url) L.open(url); else L.downloadIcs(ev);
  }
  function openAddMeeting(date) {
    const day = date || (state.calDate && state.calDate >= M.todayISO() ? state.calDate : M.todayISO());
    const emails = data.people.filter(function (p) { return p.email; });
    const where = L.calendarLabel ? L.calendarLabel(data.settings.calendarProvider || "google") : "your calendar";
    openGeneric('<form data-form="add-meeting" autocomplete="off"><div class="modal__head"><h2 id="genericTitle">Add meeting</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body">' +
      '<label class="field"><span class="field__label">What is it?</span><input class="input input--title" name="title" required maxlength="160" placeholder="Call with Tom about the menu boards"></label>' +
      '<div class="field-row field-row--3"><label class="field"><span class="field__label">Day</span><input class="input" type="date" name="date" required value="' + esc(day) + '"></label>' +
      '<label class="field"><span class="field__label">Starts</span><input class="input" type="time" name="time" required step="900" value="10:00"></label>' +
      '<label class="field"><span class="field__label">How long</span><select class="select" name="minutes">' +
      [[15, "15 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 hour"], [90, "1 and a half hours"], [120, "2 hours"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === 30 ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") +
      "</select></label></div>" +
      '<label class="field"><span class="field__label">Who\'s coming</span><input class="input" name="guests" list="meetingPeople" maxlength="400" placeholder="tom@greenway.example, priya@example.com">' +
      '<span class="field__hint">Email addresses, separated by commas. They go on the invite; nothing is sent until you save it.</span></label>' +
      (emails.length ? '<datalist id="meetingPeople">' + emails.map(function (p) { return '<option value="' + esc(p.email) + '">' + esc(p.name) + "</option>"; }).join("") + "</datalist>" : "") +
      '<label class="field"><span class="field__label">Where</span><input class="input" name="location" maxlength="200" placeholder="Video call, an address, or a meeting link"></label>' +
      '<label class="field"><span class="field__label">Notes (optional)</span><textarea class="textarea" name="notes" maxlength="2000" rows="2"></textarea></label>' +
      '<p class="field__hint">It shows in your task list straight away, and opens in ' + esc(where) + ' ready to save. Nothing goes into your real calendar until you press save there.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">' + icon("calendar") + "Add meeting</button></div></form>");
  }

  function openAddPerson() {
    openGeneric('<form data-form="add-person" autocomplete="off"><div class="modal__head"><h2 id="genericTitle">Add person</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><div class="field-row"><label class="field"><span class="field__label">Name</span><input class="input" name="name" required maxlength="80"></label>' +
      '<label class="field"><span class="field__label">Business or organisation</span><input class="input" name="organisation" maxlength="80"></label></div>' +
      '<div class="field-row"><label class="field"><span class="field__label">Type</span><select class="select" name="role">' + M.ROLES.map(function (r) { return '<option value="' + r.key + '">' + r.label + "</option>"; }).join("") + "</select></label>" +
      '<label class="field"><span class="field__label">Email</span><input class="input" type="email" name="email" maxlength="120"></label></div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Add person</button></div></form>');
  }


  // ============================================================
  // 6. Clicks, forms and changes
  // ============================================================

  document.addEventListener("click", function (e) {
    const closer = e.target.closest("[data-close]");
    if (closer) { const dlg = closer.closest("dialog"); if (dlg) dlg.close(); return; }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const holder = btn.closest("[data-task]");
    const taskId = holder && holder.getAttribute("data-task");
    const proposal = btn.closest(".proposal, .wcard--ghost, .tcard--suggested");

    switch (action) {
      // getting in
      case "connect":
        store.connect().catch(function (err) {
          renderGate(err && err.kind === "wrong-folder" ? "That folder doesn't have your task list in it. Choose your Small Business Toolkit folder, the one with START-HERE.md in it." : "That didn't work. Please try again, and click Allow when Chrome asks.");
        });
        break;
      case "reconnect": store.reconnect().catch(function () { renderGate(); }); break;
      case "change-folder": data = null; store.forget(); break;
      case "retry": store.retry(); break;

      // tasks
      case "toggle-done": toggleDone(taskId); break;
      case "open-task": openDrawer("task", taskId); break;
      case "open-person": openDrawer("person", btn.getAttribute("data-person") || (btn.closest("[data-person]") || btn).getAttribute("data-person")); break;
      case "close-drawer": closeDrawer(); break;
      case "approve": decide(taskId, "approve", proposal); break;
      case "skip": decide(taskId, "skip", proposal); break;
      case "approve-schedule": decideSchedule(taskId, "approve", proposal); break;
      case "skip-schedule": decideSchedule(taskId, "skip", proposal); break;
      case "approve-plan": approveMany(M.proposals(data).map(function (i) { return i.taskId; }), []); break;
      case "approve-everything": {
        const q = M.reviewQueue(data);
        approveMany(q.plan.map(function (i) { return i.taskId; }).concat(q.newTasks.map(function (t) { return t.id; })), q.schedule.map(function (t) { return t.id; }));
        break;
      }
      case "add-today": change(function (d) { mut.addToToday(d, taskId); }).then(function () { ui.toast("Added to today's list"); }); break;
      case "remove-today": change(function (d) { mut.removeFromToday(d, taskId); }).then(function () { ui.toast("Taken off today's list"); }); break;
      case "delete-task": {
        let removed = null;
        closeDrawer();
        change(function (d) { removed = mut.deleteTask(d, taskId); }).then(function () {
          ui.toast("Task deleted", { icon: "trash", actionLabel: "Undo", onAction: function () { change(function (d) { mut.restoreTask(d, removed); }); } });
        });
        break;
      }
      case "quick-add": openQuickAdd(); break;
      case "task-draft": {
        const t = M.taskById(data, taskId);
        if (t && t.emailDraft) openDraft(t.emailDraft, function () { ui.toast("Your email is open in " + L.emailLabel(data.settings.emailProvider) + ". Check it and press send", { icon: "mail", duration: 6000 }); });
        break;
      }
      case "copy-task-draft": {
        const t = M.taskById(data, taskId);
        if (t && t.emailDraft) ui.copyText(t.emailDraft.body || "").then(function (ok) { ui.toast(ok ? "Email copied" : "Couldn't copy"); });
        break;
      }
      case "schedule-ask": askWhen(taskId); break;
      case "pick-slot": {
        const date = btn.getAttribute("data-date"), time = btn.getAttribute("data-time");
        change(function (d) { mut.schedule(d, taskId, date, time); }).then(function () { scheduled(taskId, date, time); });
        break;
      }
      case "add-to-calendar": addToCalendar(taskId); break;

      // replies and calls
      case "open-reply": openDrawer("reply", btn.getAttribute("data-reply") || btn.closest("[data-reply]").getAttribute("data-reply")); break;
      case "open-meeting": openDrawer("meeting", btn.closest("[data-meeting]").getAttribute("data-meeting")); break;
      case "reply-draft": {
        const id = btn.closest("[data-reply]").getAttribute("data-reply");
        const r = M.replyById(data, id);
        if (r) openDraft(r.draft, function () {
          change(function (d) { mut.markDraftOpened(d, id); });
          ui.toast("Your draft is open in " + L.emailLabel(data.settings.emailProvider) + ". Check it and press send", { icon: "mail", duration: 7000, actionLabel: "I sent it", onAction: function () { change(function (d) { mut.setReply(d, id, { status: "replied" }); }); } });
        });
        break;
      }
      case "reply-done": case "reply-dismiss": case "reply-reopen": {
        const id = btn.closest("[data-reply]").getAttribute("data-reply");
        const status = action === "reply-done" ? "replied" : action === "reply-dismiss" ? "dismissed" : "waiting";
        const row = btn.closest(".reply");
        if (row && status !== "waiting") row.classList.add("is-leaving");
        setTimeout(function () {
          change(function (d) { mut.setReply(d, id, status === "dismissed" ? { status: status, dismissedAt: new Date().toISOString() } : { status: status }); }).then(function () {
            if (status !== "waiting") ui.toast(status === "replied" ? "Marked as replied" : "No reply needed", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.setReply(d, id, { status: "waiting" }); }); } });
          });
        }, row && !ui.prefersReducedMotion() ? 260 : 0);
        break;
      }
      case "copy-draft": {
        const r = M.replyById(data, btn.closest("[data-reply]").getAttribute("data-reply"));
        if (r) ui.copyText(r.draft.body || "").then(function (ok) { ui.toast(ok ? "Draft copied" : "Couldn't copy"); });
        break;
      }
      case "meeting-draft": {
        const m = M.meetingById(data, btn.closest("[data-meeting]").getAttribute("data-meeting"));
        if (m && m.followUp) openDraft(m.followUp, function () { ui.toast("Your follow-up is open in " + L.emailLabel(data.settings.emailProvider) + ". Check it and press send", { icon: "mail", duration: 6000 }); });
        break;
      }
      case "copy-followup": {
        const m = M.meetingById(data, btn.closest("[data-meeting]").getAttribute("data-meeting"));
        if (m && m.followUp) ui.copyText(m.followUp.body || "").then(function (ok) { ui.toast(ok ? "Follow-up copied" : "Couldn't copy"); });
        break;
      }
      case "quick-add-person": openQuickAdd({ personId: (btn.closest("[data-person]") || btn).getAttribute("data-person"), today: false }); break;
      case "prep-event": generic.close(); openQuickAdd({ title: "Prepare for " + btn.getAttribute("data-title") }); break;

      // brain dump
      case "dump-add": {
        const ta = $("#dumpText");
        if (!ta) break;
        const text = ta.value;
        const lines = text.split(/\r?\n/);
        if (!lines.some(function (l) { return l.trim(); })) { ta.focus(); break; }
        let made = [];
        ta.value = "";
        change(function (d) { made = mut.addDump(d, lines); }).then(function () {
          ui.toast(made.length + (made.length === 1 ? " item" : " items") + " added. Say “sort my brain dump” when you're ready", { duration: 5000 });
          const t = $("#dumpText"); if (t) t.focus();
        }).catch(function () { const t = $("#dumpText"); if (t) t.value = text; });
        break;
      }
      case "dump-to-task": {
        const id = btn.closest("[data-dump]").getAttribute("data-dump");
        let made = null;
        change(function (d) { made = mut.dumpToTask(d, id); }).then(function () { askWhen(made.id); });
        break;
      }
      case "dump-remove": {
        const id = btn.closest("[data-dump]").getAttribute("data-dump");
        change(function (d) { mut.removeDump(d, id); }).then(function () {
          ui.toast("Removed", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.restoreDump(d, id); }); } });
        });
        break;
      }

      // week and goals
      case "goal-toggle": { const id = btn.closest("[data-goal]").getAttribute("data-goal"); btn.setAttribute("aria-checked", String(btn.getAttribute("aria-checked") !== "true")); change(function (d) { mut.toggleGoal(d, id); }); break; }
      case "goal-remove": { const id = btn.closest("[data-goal]").getAttribute("data-goal"); change(function (d) { mut.removeGoal(d, id); }); break; }
      case "week-prev": case "week-next": case "week-today": {
        const base = state.weekStart ? ui.parseDate(state.weekStart) : M.mondayOf();
        state.weekStart = action === "week-today" ? null : ui.isoDate(ui.addDays(base, action === "week-prev" ? -7 : 7));
        seen.clear(); renderView(); break;
      }

      // calendar
      case "cal-mode": state.calMode = btn.getAttribute("data-mode"); seen.clear(); renderView(); break;
      case "cal-today": state.calDate = M.todayISO(); renderView(); break;
      case "cal-prev": case "cal-next": {
        const dir = action === "cal-prev" ? -1 : 1;
        const cur = ui.parseDate(state.calDate);
        if (state.calMode === "month") state.calDate = ui.isoDate(new Date(cur.getFullYear(), cur.getMonth() + dir, 1));
        else state.calDate = ui.isoDate(ui.addDays(cur, dir * (state.calMode === "day" ? 1 : 7)));
        renderView(); break;
      }
      case "go-calendar-day": state.calDate = btn.getAttribute("data-date"); state.calMode = "day"; state.calScroll = null; go("calendar"); break;
      case "open-event": openEvent(btn.getAttribute("data-event") || (btn.closest("[data-event]") || btn).getAttribute("data-event")); break;

      // lists and people
      case "filter-cat": state.filterCat = btn.getAttribute("data-cat"); renderView(); break;
      case "all-view": state.allView = btn.getAttribute("data-view-key"); renderView(); break;
      case "filter-role": state.filterRole = btn.getAttribute("data-role"); renderView(); break;
      case "add-person": openAddPerson(); break;
      case "add-meeting": openAddMeeting(btn.getAttribute("data-date")); break;
      case "meeting-calendar": { const ev = data.events.find(function (x) { return x.id === btn.getAttribute("data-event"); }); if (ev) openInCalendar(ev); break; }
      case "remove-meeting": { const id = btn.getAttribute("data-event"); generic.close(); change(function (d) { mut.removeMeeting(d, id); }).then(function () { ui.toast("Meeting removed from your task list"); }); break; }

      // everything else
      case "summary": openGeneric(V.today.summary(ctx())); break;
      case "settings": go("preferences"); break;
      case "change-folder": data = null; store.forget(); break;
      case "pref-add-cat": V.preferences.addCategoryRow($("#prefCats")); break;
      case "pref-remove-cat": btn.closest(".pref-cat").remove(); break;
      case "tasks-scope": setScope(btn.getAttribute("data-value")); seen.clear(); state.calScroll = null; state.calDate = M.todayISO(); renderView(); renderChrome(); break;
      case "tasks-view": setTasksView(btn.getAttribute("data-value")); seen.clear(); state.calScroll = null; renderView(); renderChrome(); break;
      case "claude-only": state.claudeOnly = !state.claudeOnly; seen.clear(); renderView(); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      case "copy":
        ui.copyText(btn.getAttribute("data-text")).then(function (ok) {
          ui.toast(ok ? "Copied. Paste it to Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" });
        });
        break;
    }
  });

  // Moving between pages from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item, a[href^='#']");
    if (!link) return;
    const v = link.getAttribute("href").slice(1);
    if (V[v]) { e.preventDefault(); go(v); }
  });

  document.addEventListener("submit", function (e) {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const kind = form.getAttribute("data-form");
    if (kind === "add-today") {
      const input = form.querySelector("input");
      const title = input.value.trim();
      if (!title) return;
      input.value = "";
      change(function (d) { mut.addTask(d, { title: title, category: "today" }, { today: true }); }).then(function () { ui.toast("Added to today's list"); const i = $("#todayAdd"); if (i) i.focus(); })
        .catch(function () { input.value = title; });
    }
    if (kind === "add-goal") {
      const input = form.querySelector("input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      change(function (d) { mut.addGoal(d, text); }).then(function () { const i = $("#goalAdd"); if (i) i.focus(); });
    }
    if (kind === "when") {
      const id = form.getAttribute("data-task");
      const f = form.elements;
      const pick = e.submitter && e.submitter.dataset && e.submitter.dataset.whenDate ? e.submitter : null;
      const date = pick ? pick.dataset.whenDate : f.date.value;
      const time = pick ? pick.dataset.whenTime : f.time.value;
      const minutes = Number(f.minutes.value) || 30;
      if (!date) return f.date.focus();
      generic.close();
      change(function (d) { mut.schedule(d, id, date, time || null, minutes); }).then(function () { if (time) scheduled(id, date, time); else ui.toast("Planned for " + ui.parseDate(date).toLocaleDateString("en-GB", { weekday: "long" })); });
    }
    if (kind === "preferences") {
      const got = V.preferences.collect(form);
      if (got.error) return ui.toast(got.error, { icon: "alert", duration: 6000 });
      change(function (d) { mut.setPreferences(d, got.values, got.categories); }).then(function () { ui.toast("Preferences saved"); renderChrome(); });
      return;
    }
    if (kind === "add-meeting") {
      const f = form.elements;
      const m = { title: f.title.value.trim(), date: f.date.value, time: f.time.value, minutes: f.minutes.value, guests: f.guests.value.trim(), location: f.location.value.trim(), notes: f.notes.value.trim() };
      if (!m.title) return f.title.focus();
      if (!m.date) return f.date.focus();
      if (!m.time) return f.time.focus();
      generic.close();
      let made = null;
      // Open the calendar now, while the click still counts as the person's own (browsers block it later)
      openInCalendar({ title: m.title, start: m.date + "T" + m.time, end: m.date + "T" + M.fromMinutes(M.toMinutes(m.time) + Number(m.minutes)), location: m.location, guests: m.guests, notes: m.notes });
      change(function (d) { made = mut.addMeeting(d, m); }).then(function () {
        ui.toast("Added. Press save in your calendar to keep it there", { icon: "calendar", duration: 7000 });
        if (made) { state.calDate = m.date; }
      });
    }
    if (kind === "add-person") {
      const f = form.elements;
      const fields = { name: f.name.value.trim(), organisation: f.organisation.value.trim(), role: f.role.value, email: f.email.value.trim() };
      if (!fields.name) return f.name.focus();
      generic.close();
      let made = null;
      change(function (d) { made = mut.addPerson(d, fields); }).then(function () { if (state.view !== "people") go("people"); openDrawer("person", made.id); });
    }
  });

  document.addEventListener("change", function (e) {
    const el = e.target.closest("[data-change]");
    if (!el) return;
    const kind = el.getAttribute("data-change");
    if (kind === "filter-person") state.filterPerson = el.value;
    if (kind === "sort-by") state.sortBy = el.value;
    if (kind === "filter-cat") { state.filterCat = el.value; seen.clear(); }
    renderView();
  });

  document.querySelectorAll("dialog.modal").forEach(function (dlg) { dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); });
  generic.addEventListener("click", function (e) {
    if (e.target === generic) return generic.close();
    const slot = e.target.closest(".slot");
    if (slot) { const form = slot.closest("form"); slot.type = "submit"; form.requestSubmit(slot); }
  });

  // ============================================================
  // 7. Search
  // ============================================================

  const searchInput = $("#searchInput"), results = $("#searchResults");
  function renderResults() {
    const r = M.search(data, searchInput.value);
    if (!searchInput.value.trim()) { results.hidden = true; return; }
    const items = r.tasks.map(function (t) {
      return '<button type="button" class="menu-item" role="option" data-result-task="' + esc(t.id) + '">' + icon(t.status === "done" ? "check" : "list") + '<span class="menu-item__text">' + esc(t.title) + "</span></button>";
    }).concat(r.people.map(function (p) {
      return '<button type="button" class="menu-item" role="option" data-result-person="' + esc(p.id) + '">' + C.avatar(p) + '<span class="menu-item__text">' + esc(C.personLabel(p)) + "</span></button>";
    }));
    results.innerHTML = items.length ? items.join("") : '<p class="search-results__none">Nothing matches “' + esc(searchInput.value.trim()) + "”</p>";
    results.hidden = false;
  }
  searchInput.addEventListener("input", function () { if (data) renderResults(); });
  searchInput.addEventListener("focus", function () { if (data && searchInput.value) renderResults(); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { searchInput.value = ""; results.hidden = true; searchInput.blur(); }
    if (e.key === "Enter") { e.preventDefault(); const first = results.querySelector(".menu-item"); if (first) first.click(); }
    if (e.key === "ArrowDown") { const first = results.querySelector(".menu-item"); if (first) { e.preventDefault(); first.focus(); } }
  });
  results.addEventListener("keydown", function (e) {
    const items = Array.prototype.slice.call(results.querySelectorAll(".menu-item"));
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); if (i > 0) items[i - 1].focus(); else searchInput.focus(); }
  });
  results.addEventListener("click", function (e) {
    const b = e.target.closest(".menu-item");
    if (!b) return;
    results.hidden = true;
    searchInput.value = "";
    if (b.dataset.resultTask) openDrawer("task", b.dataset.resultTask);
    if (b.dataset.resultPerson) openDrawer("person", b.dataset.resultPerson);
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".topbar__search")) results.hidden = true; });

  // ============================================================
  // 8. Keyboard shortcuts
  // ============================================================

  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return;
      if (state.drawer) { closeDrawer(); return; }
      document.body.classList.remove("sidebar-open");
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openQuickAdd(); }
    else if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    else if (e.key === "d" || e.key === "D") { const b = $('#view [data-action="reply-draft"]'); if (b) b.click(); }
    else if (e.key === "a" || e.key === "A") { const b = $('#view [data-action="approve"], #view [data-action="approve-schedule"]'); if (b) b.click(); }
    else if (/^[1-9]$/.test(e.key)) { const v = VIEW_ORDER[Number(e.key) - 1]; if (v) go(v); }
  });

  // ============================================================
  // Start
  // ============================================================

  // Draw the icons in the fixed parts of the page
  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });

  const fromHash = location.hash.slice(1);
  let lastView = null;
  try { lastView = localStorage.getItem("tlos-view"); } catch (e) { lastView = null; }
  state.view = resolve(fromHash || lastView || "tasks");
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  renderGate();
  store.start().then(function () {
    // Where this folder is, so "Open in Claude" can start Claude Code right here (with its connections and skills)
    if (/^https?:$/.test(location.protocol)) fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { C.setFolder(info.folder); }).catch(function () {});
  });
})();
