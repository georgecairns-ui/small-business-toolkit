/*
  CALLS: what happened on each call, and what to do next
  ------------------------------------------------------
  Claude reads the transcripts from the person's call recorder (Fathom, Fireflies, Otter and so
  on), writes a short summary, turns the actions into suggested tasks, and drafts the
  follow-up email. Each call shows here; the actions wait in Review for approval.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c;

  function when(m) {
    if (!m.date) return "";
    const s = M.splitLocal(m.date);
    const day = ui.parseDate(s.date);
    const diff = Math.round((ui.parseDate(M.todayISO()) - day) / 86400000);
    const dayLabel = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return dayLabel + (s.minutes != null ? ", " + M.timeLabel(M.fromMinutes(s.minutes)) : "");
  }

  function callCard(ctx, m) {
    const d = ctx.d;
    const actions = (m.actionTaskIds || []).map(function (id) { return M.taskById(d, id); }).filter(Boolean);
    const pending = actions.filter(M.isSuggestion).length;
    const people = (m.personIds || []).map(function (id) { return M.personById(d, id); }).filter(Boolean);
    const followUpDone = m.followUp && m.followUp.status === "sent";
    return '<li class="call' + ctx.anim("call-" + m.id) + '" data-meeting="' + esc(m.id) + '">' +
      '<button type="button" class="call__main" data-action="open-meeting">' +
      '<span class="call__top"><span class="call__title">' + esc(m.title) + '</span><span class="call__when">' + esc(when(m)) + "</span></span>" +
      '<span class="call__people">' + people.map(function (p) { return C.avatar(p); }).join("") + (m.source ? '<span class="chip">' + icon("users") + esc(m.source) + "</span>" : "") + "</span>" +
      (m.summary ? '<span class="call__summary">' + esc(m.summary) + "</span>" : "") +
      "</button>" +
      '<div class="call__foot">' +
      '<span class="chip' + (pending ? " chip--accent" : "") + '">' + icon("check") + actions.length + (actions.length === 1 ? " action" : " actions") + (pending ? ", " + pending + " to review" : "") + "</span>" +
      (m.followUp && m.followUp.body ? (followUpDone ? '<span class="chip chip--success">' + icon("check") + "Follow-up sent</span>" :
        '<button type="button" class="btn btn--sm btn--primary" data-action="meeting-draft">' + icon("pencil") + "Draft follow-up</button>") : "") +
      "</div></li>";
  }

  function render(ctx) {
    const d = ctx.d;
    const calls = M.meetingsSorted(d);
    if (!calls.length) {
      return '<div class="page page--narrow">' + C.empty("thinking", "No calls yet.", "If you record your calls (with Fathom, Fireflies, Otter, Granola, Zoom or Teams), Claude reads each transcript, writes it up, drafts the follow-up email and suggests the actions as tasks.",
        '<div class="empty__actions">' + C.say("Connect my call recordings") + "</div>") + "</div>";
    }
    return '<div class="page page--narrow"><ul class="calls" role="list">' + calls.map(function (m) { return callCard(ctx, m); }).join("") + "</ul></div>";
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.calls = {
    title: function () { return "Calls"; },
    sub: function (ctx) { const n = ctx.d.meetings.length; return n ? n + (n === 1 ? " call" : " calls") + " written up" : "Your calls, written up"; },
    render: render,
    when: when
  };
})();
