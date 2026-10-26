/*
  CALLS: every sales call, written up and linked to its deal
  ----------------------------------------------------------
  Claude reads each call from the person's recorder (Fathom, Fireflies, Otter, Granola, tl;dv,
  Read AI, Zoom, Microsoft Teams or Google Meet), writes it up and updates the deal. A call with
  no recording asks the person for a few lines instead.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c;

  function callCard(ctx, c) {
    const d = ctx.d;
    const x = M.dealById(d, c.dealId);
    const people = (c.personIds || []).map(function (id) { return M.personById(d, id); }).filter(Boolean);
    return '<li class="call' + ctx.anim("call-" + c.id) + '" data-call="' + esc(c.id) + '"' + (x ? ' data-deal="' + esc(x.id) + '"' : "") + ">" +
      '<button type="button" class="call__main" data-action="' + (x ? "open-deal" : "open-call") + '">' +
      '<span class="call__top"><span class="call__title">' + esc(c.title) + '</span><span class="call__when">' + esc(M.whenLabel(c.date)) + "</span></span>" +
      '<span class="call__people">' + people.map(function (p) { return C.avatar(p); }).join("") + (c.source ? '<span class="chip">' + icon("phone") + esc(c.source) + "</span>" : "") + "</span>" +
      (c.summary ? '<span class="call__summary">' + esc(c.summary) + "</span>" :
        c.noTranscript ? '<span class="call__summary muted">There\'s no recording or transcript of this call. Add a few lines on how it went and Claude updates the deal.</span>' : "") +
      ((c.decisions || []).length ? '<span class="call__decisions">' + c.decisions.map(function (t) { return '<span class="call__decision">' + icon("check") + esc(t) + "</span>"; }).join("") + "</span>" : "") +
      "</button>" +
      '<div class="call__foot">' +
      (x ? '<span class="chip">' + icon("trendingUp") + esc(x.title) + "</span>" : '<span class="chip chip--warning">' + icon("info") + "Not linked to a deal</span>") +
      (c.noTranscript ? '<button type="button" class="btn btn--sm btn--primary" data-action="add-notes">' + icon("pencil") + "Add how it went</button>" : "") +
      (c.transcriptUrl ? '<a class="btn btn--sm btn--ghost" href="' + esc(/^https?:\/\//i.test(c.transcriptUrl) ? c.transcriptUrl : "#") + '" target="_blank" rel="noopener">' + icon("external") + "Recording</a>" : "") +
      "</div></li>";
  }

  // A booked sales call, from the deal's nextMeeting (Claude finds them in the calendar)
  function upcomingRow(ctx, r) {
    const d = ctx.d;
    const p = M.personById(d, r.deal.personIds[0]);
    const prep = (r.meeting.prep || []).length;
    const rs = r.deal.research;
    const who = rs && rs.person ? [rs.person.role, rs.company && rs.company.name].filter(Boolean).join(" at ") : "";
    const plan = rs && (rs.callPlan || []).length ? '<details class="peek"><summary>' + icon("list") + "How to run the call</summary><ol class=\"callplan\">" +
      rs.callPlan.map(function (st) { return "<li><strong>" + esc(st.step) + "</strong>" + (st.minutes ? ' <span class="muted">' + esc(st.minutes) + " min</span>" : "") + (st.detail ? "<span>" + esc(st.detail) + "</span>" : "") + "</li>"; }).join("") + "</ol></details>" : "";
    return '<li class="call call--upcoming' + ctx.anim("up-" + r.deal.id) + '" data-deal="' + esc(r.deal.id) + '">' +
      '<button type="button" class="call__main" data-action="open-deal">' +
      '<span class="call__top"><span class="call__title">' + esc(r.meeting.title || r.deal.title) + '</span><span class="call__when call__when--soon">' + esc(M.meetingLabel(r.meeting.start)) + "</span></span>" +
      '<span class="call__people">' + (p ? C.avatar(p) + '<span class="muted">' + esc(p.name + (who ? ", " + who : p.organisation ? ", " + p.organisation : "")) + "</span>" : "") + "</span>" +
      (rs && rs.person && rs.person.summary ? '<span class="call__summary">' + esc(rs.person.summary) + "</span>" : prep ? '<span class="call__summary">Ask: ' + esc(r.meeting.prep[0]) + "</span>" : "") +
      "</button>" + (plan ? '<div class="call__plan">' + plan + "</div>" : "") +
      '<div class="call__foot"><span class="chip">' + icon("trendingUp") + esc(r.deal.title) + "</span>" +
      '<span class="chip">' + esc(M.stageLabel(r.deal.stage)) + "</span>" + C.fitChip(r.deal) +
      (rs ? "" : '<button type="button" class="btn btn--sm" data-action="research-deal">' + icon("search") + "Research them</button>") +
      (prep ? '<span class="chip chip--accent">' + icon("target") + prep + (prep === 1 ? " question" : " questions") + " to ask</span>" : "") + "</div></li>";
  }

  function render(ctx) {
    const d = ctx.d;
    const calls = M.callsSorted(d);
    const upcoming = M.openDeals(d).map(function (x) { return { deal: x, meeting: M.upcomingMeeting(x) }; }).filter(function (r) { return r.meeting; })
      .sort(function (a, b) { return String(a.meeting.start).localeCompare(String(b.meeting.start)); });
    const comingUp = upcoming.length ? '<section class="calls-sec">' + C.sectionHead("Coming up", { icon: "calendar", count: upcoming.length }) +
      '<ul class="calls" role="list">' + upcoming.map(function (r) { return upcomingRow(ctx, r); }).join("") + "</ul></section>" : "";
    if (!calls.length && comingUp) return '<div class="page page--narrow">' + comingUp + "</div>";
    if (!calls.length) {
      return '<div class="page page--narrow">' + C.empty("thinking", "No sales calls yet.", "If you record your calls (Fathom, Fireflies, Otter, Granola, tl;dv, Read AI, Zoom, Microsoft Teams or Google Meet), Claude writes up each sales call and updates the deal. No recorder? Add your notes to a deal and Claude does the same.",
        '<div class="empty__actions">' + C.say("Connect my call recordings") + '<button type="button" class="btn" data-action="add-notes">' + icon("pencil") + "Add call notes</button></div>") + "</div>";
    }
    return '<div class="page page--narrow">' + comingUp + '<section class="calls-sec">' + C.sectionHead("Written up", { icon: "phone", count: calls.length }) +
      '<ul class="calls" role="list">' + calls.map(function (c) { return callCard(ctx, c); }).join("") + "</ul></section></div>";
  }

  window.PL.views = window.PL.views || {};
  window.PL.views.calls = {
    title: function () { return "Calls"; },
    sub: function (ctx) { const n = ctx.d.calls.length; return n ? n + (n === 1 ? " sales call" : " sales calls") + " written up" : "Your sales calls, coming up and written up"; },
    render: render
  };
})();
