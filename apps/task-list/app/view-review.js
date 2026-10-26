/*
  REVIEW: everything Claude is waiting for the person to decide
  -------------------------------------------------------------
  3 kinds of suggestion, each with Approve and Skip:
    - today's plan (tasks Claude thinks belong on today's list)
    - new tasks Claude spotted (in email, the calendar, meetings, the brain dump)
    - suggested days for tasks this week (from "plan my week")
  Also exports proposalRow(), which the Today page uses for its plan.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;

  // One suggestion awaiting a decision. kind is "plan", "new" or "schedule".
  function proposalRow(ctx, t, opts) {
    const o = opts || {};
    const d = ctx.d;
    const isNew = M.isSuggestion(t);
    const category = o.category || t.category;
    let reason = o.reason || "";
    let extra = "";
    if (o.kind === "schedule" || (isNew && t.proposedDate)) {
      const day = ui.parseDate(t.proposedDate);
      extra = '<span class="chip chip--accent">' + icon("calendar") + esc(day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })) + (t.proposedTime ? " " + esc(M.timeLabel(t.proposedTime)) : "") + "</span>";
      reason = reason || t.proposedReason || "";
    }
    const approveAction = o.kind === "schedule" ? "approve-schedule" : "approve";
    const skipAction = o.kind === "schedule" ? "skip-schedule" : "skip";
    return '<li class="proposal' + ctx.anim("p-" + o.kind + "-" + t.id) + '" data-task="' + esc(t.id) + '" data-kind="' + esc(o.kind) + '">' +
      '<div class="proposal__body">' +
      '<div class="proposal__top">' + (isNew ? '<span class="new-tag">New</span>' : "") + (extra || C.catChip(category)) + C.dateChip(t) + C.whoChip(d, t) + "</div>" +
      '<button type="button" class="proposal__title" data-action="open-task">' + esc(t.title) + "</button>" +
      (reason ? '<p class="proposal__reason">' + esc(reason) + "</p>" : "") +
      (isNew ? C.sourceLine(t) : "") +
      "</div>" +
      '<div class="proposal__actions">' +
      '<button type="button" class="btn btn--approve btn--sm" data-action="' + approveAction + '">' + icon("check") + "<span>Approve</span></button>" +
      '<button type="button" class="btn btn--sm" data-action="open-task">' + icon("pencil") + "Edit</button>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-action="' + skipAction + '" aria-label="Skip: ' + esc(t.title) + '">Skip</button>' +
      "</div></li>";
  }

  function render(ctx) {
    const d = ctx.d;
    const q = M.reviewQueue(d);
    const total = q.plan.length + q.newTasks.length + q.schedule.length;

    if (!total) {
      return '<div class="page page--narrow">' +
        C.empty("celebrate", "All caught up.", "Nothing is waiting for you to decide. When Claude suggests something, from your inbox, your calendar or your brain dump, it lands here first.",
          '<div class="empty__actions">' + C.say("Sort my day") + C.say("Plan my week") + "</div>") +
        "</div>";
    }

    let html = '<div class="page page--narrow">' +
      '<div class="page-intro"><p>Claude never adds anything to your list without your say-so. Approve what\u2019s right, edit what\u2019s nearly right, skip the rest.</p>' +
      '<button type="button" class="btn btn--approve" data-action="approve-everything">' + icon("check") + "Approve all " + total + "</button></div>";

    if (q.plan.length) {
      html += '<section class="panel">' + C.sectionHead("Today's plan", { icon: "sun", count: q.plan.length }) +
        (d.plan.note ? '<blockquote class="claude-note"><span class="label">Claude\'s read on today</span><p>' + esc(d.plan.note) + "</p></blockquote>" : "") +
        '<ul class="proposals" role="list">' + q.plan.map(function (i) { return proposalRow(ctx, M.taskById(d, i.taskId), { kind: "plan", category: i.category, reason: i.reason }); }).join("") + "</ul></section>";
    }
    if (q.newTasks.length) {
      html += '<section class="panel">' + C.sectionHead("New tasks Claude spotted", { icon: "sparkle", count: q.newTasks.length }) +
        '<ul class="proposals" role="list">' + q.newTasks.map(function (t) { return proposalRow(ctx, t, { kind: "new" }); }).join("") + "</ul></section>";
    }
    if (q.schedule.length) {
      html += '<section class="panel">' + C.sectionHead("Suggested days this week", { icon: "columns", count: q.schedule.length }) +
        '<ul class="proposals" role="list">' + q.schedule.map(function (t) { return proposalRow(ctx, t, { kind: "schedule" }); }).join("") + "</ul></section>";
    }
    return html + "</div>";
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.review = {
    title: function () { return "Review"; },
    sub: function (ctx) { const n = M.reviewCount(ctx.d); return n ? n + (n === 1 ? " suggestion" : " suggestions") + " from Claude" : "Nothing waiting"; },
    render: render,
    proposalRow: proposalRow
  };
})();
