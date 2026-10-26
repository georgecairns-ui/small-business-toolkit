/*
  REVIEW: what Claude suggests doing about your skills, and what the app spotted
  ------------------------------------------------------------------------------
  Claude suggests. Nothing here changes a skill until the person presses a Fix button, and nothing is deleted: each suggestion is for the
  person to act on (or hand back to Claude in a chat they start), then mark Done or Not now.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c, T = window.SM.tidy;
  const V = (window.SM.views = window.SM.views || {});

  const KINDS = {
    review: { label: "Take a look", icon: "search" },
    retire: { label: "Retire", icon: "hourglass" },
    merge: { label: "Merge", icon: "columns" },
    update: { label: "Update", icon: "refresh" },
    "set-up": { label: "Set up", icon: "plus" }
  };

  function recCard(c, r) {
    const k = KINDS[r.kind] || KINDS.review;
    const skills = r.nodeIds.map(function (id) { return M.nodeById(c.d, id); }).filter(Boolean);
    const prompt = "Skill and Folder Map OS suggested this about my skills: " + r.title + ". " + (r.why || "") + " Skills involved: " + skills.map(function (n) { return n.name + " (" + n.path + ")"; }).join(", ") + ". Please talk me through it and help me do it. Don't change anything until I say so.";
    return '<article class="rec enter" data-rec="' + esc(r.id) + '">' +
      '<div class="rec__icon">' + icon(k.icon) + "</div>" +
      '<div class="rec__body"><div class="rec__top"><span class="chip chip--quiet">' + esc(k.label) + "</span></div>" +
        "<h3>" + esc(r.title) + "</h3>" + (r.why ? '<p class="muted">' + esc(r.why) + "</p>" : "") +
        (skills.length ? '<div class="gap__chips">' + skills.map(function (n) { return '<button type="button" class="skill-chip' + (n.uses.last90 ? " is-used" : "") + '" data-action="open-node" data-id="' + esc(n.id) + '">' + esc(n.name) + "</button>"; }).join("") + "</div>" : "") +
        '<div class="rec__actions">' + (r.kind === "retire" && T.skillsPlan(c.d, "recommendation", r.nodeIds) ? '<button type="button" class="btn btn--sm btn--primary" data-action="fix" data-lens="skills" data-key="recommendation" data-id="' + esc(r.id) + '">' + icon("sparkle") + esc(T.skillsPlan(c.d, "recommendation", r.nodeIds).button) + "</button>" : "") + '<button type="button" class="btn btn--sm btn--approve" data-action="rec-done" data-id="' + esc(r.id) + '">' + icon("check") + "Done</button>" +
        '<button type="button" class="btn btn--sm" data-action="rec-skip" data-id="' + esc(r.id) + '">Not now</button>' +
        '<a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink(prompt)) + '" title="Opens Claude with this typed in. Nothing is sent until you press send.">' + icon("sparkle") + "Talk it through with Claude</a></div></div></article>";
  }

  function render(c) {
    const d = c.d;
    if (M.notSetUp(d)) return '<div class="page page--narrow">' + C.scanCard(c) + "</div>";
    const recs = M.openRecs(d), done = M.doneRecs(d);
    const dups = M.duplicateGroups(d);
    const unused = M.unusedList(d);
    const spotted = dups.length + (unused.length ? 1 : 0);
    return '<div class="page page--narrow">' +
      '<div class="page-intro"><p>Claude reads your skills and suggests what to tidy. Where it can, there is a button to have Claude do it for you: nothing is ever deleted, skills only move into an archive folder, and you can undo it.</p>' +
        '<button type="button" class="btn btn--primary" data-action="review">' + icon("sparkle") + "Review my skills</button></div>" +
      '<section class="panel panel--flush">' + C.sectionHead("From Claude", { icon: "sparkle", count: recs.length, accent: recs.length > 0 }) +
        (recs.length ? '<div class="recs">' + recs.map(function (r) { return recCard(c, r); }).join("") + "</div>"
          : C.empty("thinking", "Nothing from Claude yet", "Press Review my skills and Claude looks through them, then suggests what to merge, update or retire.", "", true)) + "</section>" +
      '<section class="panel panel--flush">' + C.sectionHead("Spotted by the app", { icon: "alert", count: spotted }) +
        (spotted ? '<div class="spotted">' +
          dups.map(function (g, gi) {
            return '<div class="spot"><div class="spot__icon spot__icon--bad">' + icon("columns") + '</div><div class="spot__body"><strong>“' + esc(g[0].name) + "” is in " + g.length + " places</strong>" +
              '<p class="muted">Claude can pick the wrong one when two skills share a name.</p>' + (gi === 0 && T.skillsPlan(d, "dups") ? '<p><button type="button" class="btn btn--sm btn--primary" data-action="fix" data-lens="skills" data-key="dups">' + icon("sparkle") + esc(T.skillsPlan(d, "dups").button) + "</button></p>" : "") + '<ul class="spot__paths" role="list">' + g.map(function (n) { return '<li><button type="button" class="link-btn" data-action="open-node" data-id="' + esc(n.id) + '">' + esc(n.path) + "</button>" + " " + C.originChip(n) + "</li>"; }).join("") + "</ul></div></div>";
          }).join("") +
          (unused.length ? '<div class="spot"><div class="spot__icon spot__icon--warn">' + icon("hourglass") + '</div><div class="spot__body"><strong>' + unused.length + (unused.length === 1 ? " skill hasn’t" : " skills haven’t") + " been used in " + M.usageDays(d) + ' days</strong><p class="muted">Worth a look: keep them, or retire the ones you don’t need so Claude has less to choose from.</p>' +
            '<button type="button" class="link-btn" data-action="show-unused">Show them on the map</button>' + (T.skillsPlan(d, "unused") ? ' <button type="button" class="btn btn--sm btn--primary" data-action="fix" data-lens="skills" data-key="unused">' + icon("sparkle") + esc(T.skillsPlan(d, "unused").button) + "</button>" : "") + '</div></div>' : "") + "</div>"
          : '<p class="muted list-empty drawer__pad">Nothing spotted: no skill shares a name with another' + (M.usageKnown(d) ? ", and every skill has been used lately" : "") + ".</p>") + "</section>" +
      (done.length ? '<details class="panel done-list"><summary>Done <span class="badge">' + done.length + '</span></summary><ul class="hlist hlist--plain" role="list">' + done.map(function (r) { return "<li class=\"muted\">" + icon("check") + " " + esc(r.title) + "</li>"; }).join("") + "</ul></details>" : "") + C.tidiedSoFar(T.history(c.t, "skills")) +
    "</div>";
  }

  V.review = {
    render: render,
    title: function () { return "Review"; },
    sub: function (c) { return M.notSetUp(c.d) ? "" : M.openRecs(c.d).length ? M.openRecs(c.d).length + " to look at" : "Nothing waiting"; }
  };
})();
