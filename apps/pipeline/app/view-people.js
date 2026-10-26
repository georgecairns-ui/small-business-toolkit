/*
  PEOPLE: every contact, in groups
  --------------------------------
  5 groups worked out from each person's deals (model.js, peopleGroups): Clients, Prospects,
  Not contacted yet, Gone quiet, and Closed, lost. People move between groups by themselves as
  their deals move. Open a group to see who's in it and to email them: one email to everyone
  (Bcc), or a personal email to each, written by Claude and checked by the person in Review.
  Nothing is ever sent from here.
  When Task List OS is attached, its contacts show here too (stored once, in the task list).
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c;

  function groupBox(ctx, g, people) {
    const on = ctx.state.peopleGroup === g.key;
    const faces = people.slice(0, 5).map(function (p) { return C.avatar(p); }).join("");
    return '<button type="button" class="pgroup' + (on ? " is-active" : "") + ctx.anim("g-" + g.key) + '" data-action="people-group" data-group="' + esc(g.key) + '" aria-pressed="' + on + '">' +
      '<span class="pgroup__top"><span class="pgroup__icon pgroup__icon--' + esc(g.key) + '">' + icon(g.icon) + '</span><span class="pgroup__count num">' + people.length + "</span></span>" +
      '<span class="pgroup__name">' + esc(g.label) + '</span><span class="pgroup__hint">' + esc(g.hint) + "</span>" +
      '<span class="pgroup__faces">' + (faces || '<span class="muted">Nobody yet</span>') + (people.length > 5 ? '<span class="pgroup__more">+' + (people.length - 5) + "</span>" : "") + "</span></button>";
  }

  function row(ctx, p) {
    const d = ctx.d;
    const deals = M.dealsForPerson(d, p.id);
    const open = deals.filter(M.isOpen);
    const value = open.reduce(function (s, x) { return s + (Number(x.value) || 0); }, 0);
    const role = M.ROLES.find(function (r) { return r.key === p.role; });
    const main = open[0] || deals[0];
    const meeting = open.map(M.upcomingMeeting).filter(Boolean)[0];
    const waiting = d.deals.some(function (x) { return x.suggested && x.stage !== "lost" && x.personIds.indexOf(p.id) > -1; });
    const status = !main ? (waiting ? "New deal waiting in Review" : p.role === "prospect" ? "No deal yet" : "") : meeting ? "Call booked: " + M.meetingLabel(meeting.start) :
      M.isOpen(main) ? M.stageLabel(main.stage) + (M.needsChase(d, main) ? ", " + M.quietDays(main) + " days quiet" : "") :
      M.stageLabel(main.stage) + (main.closedAt ? " " + C.ago(main.closedAt) : "");
    return '<button type="button" class="table__row' + ctx.anim("p-" + p.id) + '" role="row" data-action="open-person" data-person="' + esc(p.id) + '">' +
      '<span class="table__name" role="cell">' + C.avatar(p) + '<span><strong>' + esc(p.name) + '</strong><span class="muted">' + esc(p.organisation || p.email || "") + "</span></span></span>" +
      '<span role="cell"><span class="chip role-chip--' + esc(p.role || "other") + '">' + esc(role ? role.label : "Other") + "</span></span>" +
      '<span role="cell" class="muted">' + esc(status) + "</span>" +
      '<span role="cell" class="num">' + (value ? esc(M.money(d, value)) : "") + "</span>" +
      '<span role="cell" class="muted">' + (p.email ? icon("mail") : '<span title="No email address">' + icon("alert") + "</span>") + "</span></button>";
  }

  function render(ctx) {
    const d = ctx.d;
    const groups = M.peopleGroups(d);
    if (!groups.all.length) {
      return '<div class="page">' + C.empty("welcome", "No contacts yet.", "Everyone you're selling to appears here, grouped as clients, prospects, not contacted yet, gone quiet and closed. Claude adds them from your email and calls, or add someone yourself.",
        '<div class="empty__actions"><button type="button" class="btn btn--primary" data-action="add-person">' + icon("plus") + "Add person</button></div>") + "</div>";
    }
    const key = ctx.state.peopleGroup;
    const g = M.GROUPS.find(function (x) { return x.key === key; });
    const list = g ? groups[key] : groups.all;
    const withEmail = list.filter(function (p) { return p.email; }).length;

    const head = '<div class="toolbar pgroups-bar"><span class="pgroups-bar__title">' + (g ? esc(g.label) + ' <span class="badge">' + list.length + "</span>" : "Everyone " + '<span class="badge">' + list.length + "</span>") + "</span>" +
      (g ? '<button type="button" class="link-btn" data-action="people-group" data-group="">Show everyone</button>' : "") +
      '<span class="spacer"></span>' +
      (g && list.length ? '<button type="button" class="btn" data-action="group-copy">' + icon("list") + "Copy " + withEmail + (withEmail === 1 ? " address" : " addresses") + "</button>" +
        '<button type="button" class="btn btn--primary" data-action="group-email" data-group="' + esc(key) + '"' + (withEmail ? "" : " disabled") + ">" + icon("mail") + "Email this group</button>" :
        '<button type="button" class="btn btn--primary" data-action="add-person">' + icon("plus") + "Add person</button>") + "</div>";

    return '<div class="page">' +
      '<div class="pgroups">' + M.GROUPS.map(function (x) { return groupBox(ctx, x, groups[x.key]); }).join("") + "</div>" + head +
      '<div class="panel panel--flush"><div class="table people-table" role="table">' +
      '<div class="table__row table__row--head" role="row"><span role="columnheader">Name</span><span role="columnheader">Type</span><span role="columnheader">Where they are</span><span role="columnheader">In the pipeline</span><span role="columnheader">Email</span></div>' +
      (list.length ? list.map(function (p) { return row(ctx, p); }).join("") : '<p class="list-empty">Nobody in this group right now.</p>') + "</div></div>" +
      (groups.all.some(function (p) { return p.fromTaskList; }) ? '<p class="muted page-foot">Includes the contacts in your task list. Change their details there; their deals show here.</p>' : "") + "</div>";
  }

  window.PL.views = window.PL.views || {};
  window.PL.views.people = {
    title: function () { return "People"; },
    sub: function (ctx) { const n = M.allPeople(ctx.d).length; return n ? n + (n === 1 ? " contact" : " contacts") : "Your contacts"; },
    render: render
  };
})();
