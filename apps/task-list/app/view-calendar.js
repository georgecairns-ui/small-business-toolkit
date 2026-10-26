/*
  CALENDAR: day, week and month
  -----------------------------
  Blue blocks are events from the person's real calendar. Claude copies them into the task
  file when it sorts the day, so they show here. They're read only in this app; change them
  in your calendar.
  Terracotta blocks are tasks with a time. Drag a task from "To schedule" onto the grid to
  give it a time slot (snaps to 15 minutes), or drag a block to move it.
  Without a mouse: open a task and set its day and time in its panel.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;
  const HOUR_PX = 48;
  let grabOffset = 0; // where in a block the pointer picked it up, so it lands where you expect

  function hoursRange(d) {
    const s = Math.floor((M.toMinutes(d.settings.dayStarts) || 480) / 60);
    const e = Math.ceil((M.toMinutes(d.settings.dayEnds) || 1080) / 60);
    return { start: Math.max(0, Math.min(7, s - 1)), end: Math.min(24, Math.max(20, e + 2)) };
  }

  function visibleDates(state) {
    const anchor = ui.parseDate(state.calDate || M.todayISO());
    if (state.calMode === "day") return [ui.isoDate(anchor)];
    return M.weekDates(M.mondayOf(anchor));
  }

  // Everything with a time on one day, laid out in side-by-side lanes when they overlap
  function blocksFor(d, iso, range) {
    const items = M.eventsForDate(d, iso).filter(function (e) { return !e.allDay; }).map(function (e) {
      const s = M.splitLocal(e.start).minutes, en = M.splitLocal(e.end).minutes;
      return { kind: "event", id: e.id, title: e.title, sub: e.location || "", start: s, end: Math.max(s + 15, en == null ? s + 30 : en), pending: e.source === "app" };
    }).concat(M.timedTasksForDate(d, iso).map(function (t) {
      const s = M.toMinutes(t.scheduledTime);
      return { kind: "task", id: t.id, title: t.title, start: s, end: s + (t.durationMinutes || 30), done: t.status === "done", cat: t.category };
    })).filter(function (b) { return b.start != null; }).sort(function (a, b) { return a.start - b.start || b.end - a.end; });

    // Items that overlap form a cluster; only items in the same cluster share the width
    let cluster = [], clusterEnd = -1;
    const finish = function () {
      const laneEnds = [];
      cluster.forEach(function (b) {
        let lane = laneEnds.findIndex(function (end) { return end <= b.start; });
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(b.end); } else laneEnds[lane] = b.end;
        b.lane = lane;
      });
      cluster.forEach(function (b) { b.lanes = Math.max(1, laneEnds.length); });
      cluster = [];
    };
    items.forEach(function (b) {
      if (cluster.length && b.start >= clusterEnd) finish();
      cluster.push(b);
      clusterEnd = Math.max(clusterEnd, b.end);
    });
    finish();

    return items.map(function (b) {
      const top = (b.start - range.start * 60) / 60 * HOUR_PX;
      const height = Math.max(20, (b.end - b.start) / 60 * HOUR_PX - 2);
      const style = "top:" + top + "px;height:" + height + "px;left:calc(" + (b.lane / b.lanes * 100) + "% + 2px);width:calc(" + (100 / b.lanes) + "% - 4px)";
      // Short blocks (under about 40 minutes) show the title and start time on one line
      const short = height < 36 ? " is-short" : "";
      const time = short ? M.timeLabel(M.fromMinutes(b.start)) : M.timeLabel(M.fromMinutes(b.start)) + " to " + M.timeLabel(M.fromMinutes(b.end));
      const inner = '<span class="cal-block__title">' + esc(b.title) + '</span><span class="cal-block__time">' + esc(time) + "</span>";
      if (b.kind === "event") {
        return '<button type="button" class="cal-block cal-block--event' + (b.pending ? " cal-block--pending" : "") + short + '" style="' + style + '" data-event="' + esc(b.id) + '" data-action="open-event" title="' + esc(b.title) + '">' + inner + "</button>";
      }
      return '<div class="cal-block cal-block--task' + (b.done ? " is-done" : "") + short + '" style="' + style + ";--edge:" + esc(C.catColour(b.cat)) + '" data-task="' + esc(b.id) + '" draggable="true" title="' + esc(b.title) + '">' +
        '<button type="button" class="cal-block__open" data-action="open-task">' + inner + "</button></div>";
    }).join("");
  }

  function toScheduleList(ctx, dates) {
    const d = ctx.d;
    const planned = [];
    dates.forEach(function (iso) {
      M.tasksForDate(d, iso).forEach(function (t) { if (!t.scheduledTime && t.status === "open") planned.push(t); });
    });
    const unplanned = M.unscheduled(d).slice(0, 12);
    const item = function (t) {
      const p = M.personById(d, t.personId);
      return '<li class="sched-item" data-task="' + esc(t.id) + '" draggable="true">' + icon("grip", "sched-item__grip") +
        '<button type="button" class="sched-item__title" data-action="open-task">' + esc(t.title) + "</button>" + (p ? C.avatar(p) : "") + "</li>";
    };
    return '<aside class="cal-side">' +
      '<h2 class="label">To schedule</h2>' +
      '<p class="cal-side__hint">Drag a task onto the calendar to give it a time.</p>' +
      (planned.length ? '<h3 class="cal-side__head">Planned, no time yet</h3><ul class="sched-list" role="list">' + planned.map(item).join("") + "</ul>" : "") +
      (unplanned.length ? '<h3 class="cal-side__head">Unplanned</h3><ul class="sched-list" role="list">' + unplanned.map(item).join("") + "</ul>" : "") +
      (!planned.length && !unplanned.length ? '<p class="muted cal-side__hint">Nothing waiting for a time slot.</p>' : "") +
      '<p class="cal-side__sync">' + icon("calendar") + (d.eventsSyncedAt ? "Calendar copied in " + esc(new Date(d.eventsSyncedAt).toLocaleString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" })) : "Your calendar appears here once Claude has copied it in. Say “sort my day”.") + "</p>" +
      "</aside>";
  }

  function timeGrid(ctx, dates) {
    const d = ctx.d;
    const range = hoursRange(d);
    const today = M.todayISO();
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const hours = [];
    for (let h = range.start; h < range.end; h++) hours.push(h);
    const cols = "56px repeat(" + dates.length + ", minmax(0, 1fr))";

    let head = '<div class="cal-head" style="grid-template-columns:' + cols + '"><div></div>' + dates.map(function (iso) {
      const day = ui.parseDate(iso);
      return '<button type="button" class="cal-head__day' + (iso === today ? " is-today" : "") + '" data-action="go-calendar-day" data-date="' + iso + '"><span>' + esc(day.toLocaleDateString("en-GB", { weekday: "short" })) + '</span><strong class="num">' + day.getDate() + "</strong></button>";
    }).join("") + "</div>";

    // All-day events and tasks planned for the day without a time
    let allDay = '<div class="cal-allday" style="grid-template-columns:' + cols + '"><div class="cal-allday__label">All day</div>' + dates.map(function (iso) {
      const evs = M.eventsForDate(d, iso).filter(function (e) { return e.allDay; });
      return '<div class="cal-allday__cell" data-drop-date="' + iso + '" data-drop-allday="1">' + evs.map(function (e) {
        return '<button type="button" class="cal-chip cal-chip--event" data-event="' + esc(e.id) + '" data-action="open-event">' + esc(e.title) + "</button>";
      }).join("") + "</div>";
    }).join("") + "</div>";

    let body = '<div class="cal-scroll" id="calScroll"><div class="cal-body" style="grid-template-columns:' + cols + ";height:" + (hours.length * HOUR_PX) + 'px">' +
      '<div class="cal-gutter">' + hours.map(function (h) { return '<span class="cal-gutter__h" style="top:' + ((h - range.start) * HOUR_PX) + 'px">' + (h === range.start ? "" : esc(M.timeLabel(M.fromMinutes(h * 60)))) + "</span>"; }).join("") + "</div>" +
      dates.map(function (iso) {
        const isToday = iso === today;
        const nowTop = (nowMin - range.start * 60) / 60 * HOUR_PX;
        return '<div class="cal-col' + (isToday ? " is-today" : "") + '" data-drop-date="' + iso + '" data-range-start="' + range.start + '" style="background-size:100% ' + HOUR_PX + 'px">' +
          blocksFor(d, iso, range) +
          (isToday && nowTop > 0 && nowTop < hours.length * HOUR_PX ? '<div class="cal-now" style="top:' + nowTop + 'px" aria-hidden="true"></div>' : "") +
          "</div>";
      }).join("") + "</div></div>";

    return '<div class="cal-grid">' + head + allDay + body + "</div>";
  }

  function monthGrid(ctx) {
    const d = ctx.d;
    const anchor = ui.parseDate(ctx.state.calDate || M.todayISO());
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = M.mondayOf(first);
    const today = M.todayISO();
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const day = ui.addDays(start, i);
      const iso = ui.isoDate(day);
      const inMonth = day.getMonth() === anchor.getMonth();
      const evs = M.eventsForDate(d, iso);
      const tasks = M.tasksForDate(d, iso, { includeDone: true });
      const items = evs.map(function (e) { return '<span class="month-item month-item--event">' + esc(e.title) + "</span>"; })
        .concat(tasks.map(function (t) { return '<span class="month-item' + (t.status === "done" ? " is-done" : "") + '">' + C.catDot(t.category) + esc(t.title) + "</span>"; }));
      cells += '<button type="button" class="month-cell' + (inMonth ? "" : " is-out") + (iso === today ? " is-today" : "") + '" data-action="go-calendar-day" data-date="' + iso + '" aria-label="' + esc(day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + ", " + items.length + ' items">' +
        '<span class="month-cell__num num">' + day.getDate() + "</span>" + items.slice(0, 3).join("") + (items.length > 3 ? '<span class="month-more">' + (items.length - 3) + " more</span>" : "") + "</button>";
    }
    const heads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (h) { return '<span class="month-head">' + h + "</span>"; }).join("");
    return '<div class="month">' + heads + cells + "</div>";
  }

  function label(state) {
    const anchor = ui.parseDate(state.calDate || M.todayISO());
    if (state.calMode === "month") return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (state.calMode === "day") return anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const mon = M.mondayOf(anchor), sun = ui.addDays(mon, 6);
    return mon.toLocaleDateString("en-GB", { day: "numeric", month: mon.getMonth() === sun.getMonth() ? undefined : "short" }) + " to " + sun.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  // opts.lead: anything to show first in the toolbar (the Tasks page's switches)
  // opts.hideModes: the Tasks page's Today, This week or All choice sets Day, Week or Month instead
  function render(ctx, opts) {
    const st = ctx.state;
    const mode = st.calMode;
    const modes = [["day", "Day"], ["week", "Week"], ["month", "Month"]].map(function (m) {
      return '<button type="button" data-action="cal-mode" data-mode="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + m[1] + "</button>";
    }).join("");
    let html = '<div class="page page--wide page--calendar">' +
      '<div class="toolbar"><div class="toolbar__group">' + ((opts && opts.lead) || "") +
      '<button type="button" class="icon-btn" data-action="cal-prev" aria-label="Previous">' + icon("chevronLeft") + "</button>" +
      '<button type="button" class="btn btn--sm" data-action="cal-today">Today</button>' +
      '<button type="button" class="icon-btn" data-action="cal-next" aria-label="Next">' + icon("chevronRight") + "</button>" +
      '<h2 class="toolbar__label">' + esc(label(st)) + "</h2></div>" +
      '<div class="toolbar__group">' + (opts && opts.hideModes ? "" : '<div class="segmented" role="group" aria-label="Calendar view">' + modes + "</div>") + '<button type="button" class="btn" data-action="add-meeting" data-date="' + esc(st.calDate || "") + '">' + icon("plus") + "Add meeting</button></div></div>";
    if (mode === "month") return html + monthGrid(ctx) + "</div>";
    const dates = visibleDates(st);
    return html + '<div class="cal-layout">' + toScheduleList(ctx, dates) + timeGrid(ctx, dates) + "</div></div>";
  }

  function bind(root, ctx) {
    const scroller = root.querySelector("#calScroll");
    if (scroller) {
      const range = hoursRange(ctx.d);
      scroller.scrollTop = ctx.state.calScroll != null ? ctx.state.calScroll : Math.max(0, ((M.toMinutes(ctx.d.settings.dayStarts) || 480) / 60 - range.start) * HOUR_PX - 8);
      scroller.addEventListener("scroll", function () { ctx.state.calScroll = scroller.scrollTop; }, { passive: true });
    }
    root.querySelectorAll('[draggable="true"][data-task]').forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", el.getAttribute("data-task"));
        e.dataTransfer.effectAllowed = "move";
        grabOffset = el.classList.contains("cal-block") ? e.clientY - el.getBoundingClientRect().top : 0;
        el.classList.add("is-dragging");
      });
      el.addEventListener("dragend", function () { el.classList.remove("is-dragging"); });
    });
    root.querySelectorAll(".cal-col, .cal-allday__cell").forEach(function (col) {
      col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("is-over"); });
      col.addEventListener("dragleave", function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("is-over"); });
      col.addEventListener("drop", function (e) {
        e.preventDefault();
        col.classList.remove("is-over");
        const id = e.dataTransfer.getData("text/plain");
        if (!id) return;
        const date = col.getAttribute("data-drop-date");
        if (col.hasAttribute("data-drop-allday")) return ctx.actions.scheduleAt(id, date, null);
        const start = Number(col.getAttribute("data-range-start"));
        const y = e.clientY - col.getBoundingClientRect().top - grabOffset;
        const mins = Math.round((start * 60 + y / HOUR_PX * 60) / 15) * 15;
        ctx.actions.scheduleAt(id, date, M.fromMinutes(Math.max(start * 60, mins)));
      });
    });
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.calendar = {
    title: function () { return "Calendar"; },
    sub: function (ctx) { return label(ctx.state); },
    render: render,
    bind: bind
  };
})();
