/*
  TASKS: every task, one page
  ---------------------------
  2 sets of buttons at the top:
    Which tasks:  Today (Claude's plan shows as Suggested cards in To do), This week, All
    How:          Board (columns by where each task is: To do, In progress, Waiting on, Done),
                  List (the same groups as rows), Calendar (Day, Week or Month to match)
  Drag a card between columns to move it on. "Claude can do" shows only the tasks Claude has
  written a prompt for. Every card looks the same: see taskCard in components.js.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;

  const SCOPES = [["today", "Today"], ["week", "This week"], ["all", "All"]];
  const VIEWS = [["board", "Board", "columns"], ["list", "List", "list"], ["calendar", "Calendar", "calendar"]];
  const DONE_SHOWN = 12;

  // Which tasks belong to Today, This week or All
  function inScope(d, t, scope) {
    const today = M.todayISO();
    const stage = M.stageOf(t);
    if (t.status === "dismissed" || (t.status === "open" && t.suggested)) return false;
    const doneOn = t.doneAt ? ui.isoDate(new Date(t.doneAt)) : null;
    const planned = M.plannedDate(t);
    if (scope === "all") return stage !== "done" || (doneOn && doneOn >= ui.isoDate(ui.addDays(new Date(), -13)));
    const monday = ui.isoDate(M.mondayOf()), sunday = ui.isoDate(ui.addDays(M.mondayOf(), 6));
    const approvedToday = M.approvedToday(d).some(function (i) { return i.taskId === t.id; });
    if (scope === "today") {
      if (stage === "done") return doneOn === today;
      if (stage === "doing" || approvedToday) return true;
      return !!planned && planned <= today;
    }
    // This week
    if (stage === "done") return !!doneOn && doneOn >= monday && doneOn <= sunday;
    if (stage === "doing" || stage === "waiting" || approvedToday) return true;
    return !!planned && planned <= sunday;
  }

  function tasksFor(ctx) {
    const d = ctx.d, st = ctx.state;
    return d.tasks.filter(function (t) {
      if (!inScope(d, t, st.tasksScope)) return false;
      if (st.claudeOnly && !M.claudeCanDo(t)) return false;
      if (st.filterCat && st.filterCat !== "all" && t.category !== st.filterCat) return false;
      return true;
    });
  }

  function sortTasks(list, stage) {
    if (stage === "done") return list.sort(function (a, b) { return String(b.doneAt || "").localeCompare(String(a.doneAt || "")); });
    return list.sort(function (a, b) {
      return String(M.plannedDate(a) || "9999").localeCompare(String(M.plannedDate(b) || "9999")) ||
        String(a.scheduledTime || "99").localeCompare(String(b.scheduledTime || "99")) || String(a.created || "").localeCompare(String(b.created || ""));
    });
  }

  function byStage(tasks) {
    const groups = {};
    M.STAGES.forEach(function (s) { groups[s.key] = []; });
    tasks.forEach(function (t) { groups[M.stageOf(t)].push(t); });
    M.STAGES.forEach(function (s) { sortTasks(groups[s.key], s.key); });
    return groups;
  }

  // ---------- The switches along the top ----------
  function controls(ctx, allTasks) {
    const d = ctx.d, st = ctx.state;
    const seg = function (list, current, action, label) {
      return '<div class="segmented" role="group" aria-label="' + label + '">' + list.map(function (x) {
        return '<button type="button" data-action="' + action + '" data-value="' + x[0] + '" aria-pressed="' + (current === x[0]) + '">' + (x[2] ? icon(x[2]) : "") + esc(x[1]) + "</button>";
      }).join("") + "</div>";
    };
    const claudeCount = d.tasks.filter(function (t) { return M.claudeCanDo(t) && inScope(d, t, st.tasksScope); }).length;
    const cats = '<label class="sr-only" for="filterCat">Category</label><select class="select select--sm" id="filterCat" data-change="filter-cat">' +
      '<option value="all">All categories</option>' + M.CATEGORIES.map(function (c) { return '<option value="' + esc(c.key) + '"' + (st.filterCat === c.key ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") + "</select>";
    return '<div class="tasks-bar">' +
      '<div class="tasks-bar__group">' + seg(SCOPES, st.tasksScope, "tasks-scope", "Which tasks") + seg(VIEWS, st.tasksView, "tasks-view", "Show as") + "</div>" +
      '<div class="tasks-bar__group">' +
      '<button type="button" class="filter' + (st.claudeOnly ? " is-active" : "") + '" data-action="claude-only" aria-pressed="' + !!st.claudeOnly + '">' + icon("sparkle") + 'Claude can do<span class="filter__n num">' + claudeCount + "</span></button>" +
      cats + "</div></div>";
  }

  // ---------- Board ----------
  function board(ctx, groups, planned) {
    const d = ctx.d;
    planned = planned || [];
    return '<div class="sboard" role="list">' + M.STAGES.map(function (s) {
      const all = groups[s.key];
      const shown = s.key === "done" ? all.slice(0, DONE_SHOWN) : all;
      const first = s.key === "todo";
      const extra = first ? planned.map(function (x) { return C.planCard(d, x.task, x.item, { anim: ctx.anim }); }).join("") + planNudge(ctx) : "";
      const approveAll = first && planned.length > 1 ? '<button type="button" class="btn btn--approve btn--sm scol__approve" data-action="approve-plan">' + icon("check") + "Approve all</button>" : "";
      return '<section class="scol scol--' + s.key + '" data-drop-stage="' + s.key + '" role="listitem" aria-label="' + esc(M.stageLabel(d, s.key)) + '">' +
        '<header class="scol__head"><span class="scol__name">' + esc(M.stageLabel(d, s.key)) + '</span><span class="scol__count num">' + (all.length + (first ? planned.length : 0)) + "</span>" + approveAll + "</header>" +
        '<div class="scol__cards">' + extra + (shown.length ? shown.map(function (t) { return C.taskCard(d, t, { anim: ctx.anim, draggable: true }); }).join("") :
          (extra ? "" : '<p class="scol__empty">' + (s.key === "done" ? "Nothing done yet" : "Drop a task here") + "</p>")) +
        (all.length > shown.length ? '<button type="button" class="scol__more" data-action="tasks-view" data-value="list">' + (all.length - shown.length) + " more in List</button>" : "") +
        "</div></section>";
    }).join("") + "</div>";
  }

  // ---------- List ----------
  function list(ctx, groups, planned) {
    const d = ctx.d;
    planned = planned || [];
    return M.STAGES.map(function (s) {
      const tasks = groups[s.key];
      const first = s.key === "todo";
      const sugg = first && planned.length ? '<ul class="proposals" role="list">' + planned.map(function (x) {
        return window.TL.views.review.proposalRow(ctx, x.task, { kind: "plan", category: x.item.category, reason: x.item.reason });
      }).join("") + "</ul>" : "";
      const nudge = first ? planNudge(ctx) : "";
      const head = '<span class="scol__name">' + esc(M.stageLabel(d, s.key)) + '</span><span class="scol__count num">' + (tasks.length + (first ? planned.length : 0)) + "</span>" +
        (first && planned.length > 1 ? '<button type="button" class="btn btn--approve btn--sm scol__approve" data-action="approve-plan">' + icon("check") + "Approve all</button>" : "");
      const body = sugg + (nudge ? '<div class="slist__nudge">' + nudge + "</div>" : "") + (tasks.length ? C.taskList(d, tasks, { anim: ctx.anim, keySuffix: "-list", showCat: true }) : (sugg || nudge ? "" : '<p class="muted list-empty">Nothing here.</p>'));
      if (s.key === "done") return '<details class="panel panel--flush slist"' + (tasks.length && tasks.length < 6 ? " open" : "") + '><summary class="slist__head">' + head + "</summary>" + body + "</details>";
      return '<section class="panel panel--flush slist"><h2 class="slist__head">' + head + "</h2>" + body + "</section>";
    }).join("");
  }

  // Claude's plan for today, shown inside the To do column (Board) or group (List)
  function planItems(ctx) {
    const d = ctx.d, st = ctx.state;
    if (st.tasksScope !== "today" || st.claudeOnly) return [];
    return M.proposals(d).map(function (i) { return { item: i, task: M.taskById(d, i.taskId) }; }).filter(function (x) {
      return x.task && (!st.filterCat || st.filterCat === "all" || (x.item.category || x.task.category) === st.filterCat);
    });
  }
  function planNudge(ctx) {
    const d = ctx.d, st = ctx.state;
    if (st.tasksScope !== "today" || st.claudeOnly || M.proposals(d).length || M.claudeHasPlanned(d)) return "";
    return C.nudgeCard("No plan yet", "Ask Claude to sort your day. It checks your list, inbox and calendar, then suggests tasks here for you to approve.", "Sort my day");
  }

  function render(ctx) {
    const d = ctx.d, st = ctx.state;
    const planned = planItems(ctx);
    const plannedIds = planned.map(function (x) { return x.task.id; });
    const tasks = tasksFor(ctx).filter(function (t) { return plannedIds.indexOf(t.id) === -1; });
    const groups = byStage(tasks);
    const bar = controls(ctx, tasks);
    if (st.tasksView === "calendar") {
      st.calMode = st.tasksScope === "today" ? "day" : st.tasksScope === "week" ? "week" : "month";
      return '<div class="tasks-page tasks-page--calendar">' + bar + window.TL.views.calendar.render(ctx, { hideModes: true }) + "</div>";
    }
    const nothing = !tasks.length && !planned.length && !planNudge(ctx) ? C.empty("thinking", st.claudeOnly ? "Nothing for Claude here yet." : "Nothing here.",
      st.claudeOnly ? "When Claude checks in, it marks the tasks it could do for you." : st.tasksScope === "today" ? "Nothing is planned for today. Add a task with New, or say \u201cSort my day\u201d to Claude." : "Add a task with New, or ask Claude to add one.", "", true) : "";
    const fresh = M.notSetUp(d) ? C.setupCard() : "";
    return '<div class="page page--wide tasks-page">' + fresh + bar + (fresh ? board(ctx, groups, []) : nothing || (st.tasksView === "list" ? list(ctx, groups, planned) : board(ctx, groups, planned))) + "</div>";
  }

  // Dragging cards between columns
  function bind(root, ctx) {
    if (ctx.state.tasksView === "calendar") return window.TL.views.calendar.bind(root, ctx);
    root.querySelectorAll('.tcard[draggable="true"]').forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", el.getAttribute("data-task"));
        e.dataTransfer.effectAllowed = "move";
        el.classList.add("is-dragging");
        root.classList.add("is-drag-active");
      });
      el.addEventListener("dragend", function () { el.classList.remove("is-dragging"); root.classList.remove("is-drag-active"); });
    });
    root.querySelectorAll("[data-drop-stage]").forEach(function (col) {
      col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("is-over"); });
      col.addEventListener("dragleave", function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("is-over"); });
      col.addEventListener("drop", function (e) {
        e.preventDefault();
        col.classList.remove("is-over");
        const id = e.dataTransfer.getData("text/plain");
        if (id) ctx.actions.setStage(id, col.getAttribute("data-drop-stage"));
      });
    });
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.tasks = {
    title: function () { return "Tasks"; },
    sub: function (ctx) {
      const st = ctx.state;
      if (st.tasksView === "calendar") return window.TL.views.calendar.sub(ctx);
      const n = tasksFor(ctx).filter(function (t) { return t.status === "open"; }).length;
      return (st.tasksScope === "today" ? ui.longDate() + ", " : "") + n + " open";
    },
    render: render,
    bind: bind,
    inScope: inScope
  };
})();
