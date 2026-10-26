/*
  THE PANEL: one skill, or one group, slides in from the right
  ------------------------------------------------------------
  What the skill says it does, where it lives, how often it was used, what it connects to, the
  group it's in (the person can change that) and their own tags. Opens from the map, the table,
  the search box and every link on the other pages.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c;

  function prop(label, value) {
    return '<div class="prop"><span class="prop__label">' + esc(label) + '</span><span class="prop__value">' + value + "</span></div>";
  }
  function skillRows(list, empty) {
    if (!list.length) return '<p class="muted drawer__small">' + esc(empty) + "</p>";
    return '<ul class="hlist hlist--plain" role="list">' + list.map(function (n) {
      return '<li><button type="button" class="hrow hrow--btn" data-action="open-node" data-id="' + esc(n.id) + '"><span class="hrow__main"><span class="hrow__title">' + esc(n.name) + '</span><span class="hrow__sub">' + esc(n.path) + "</span></span></button></li>";
    }).join("") + "</ul>";
  }

  function areaOptions(d, n) {
    return '<option value="">Not grouped yet</option>' + d.areas.map(function (a) { return '<option value="' + esc(a.key) + '"' + (n.area === a.key ? " selected" : "") + ">" + esc(a.label) + "</option>"; }).join("");
  }

  function skill(c, id) {
    const d = c.d, n = M.nodeById(d, id);
    if (!n) return "";
    const refs = M.refsOf(d, id);
    const recs = M.openRecs(d).filter(function (r) { return r.nodeIds.indexOf(id) > -1; });
    const tags = n.tags.map(function (t) { return d.tags.find(function (x) { return x.id === t; }); }).filter(Boolean);
    const manual = n.origin === "manual";
    const prompt = "Look at my skill “" + n.name + "” (" + n.path + "). Tell me what it does well, what is unclear, and whether it overlaps with any other skill I have. Don't change anything until I say so.";
    return '<div class="drawer__head"><span class="chip chip--quiet">' + (n.kind === "command" ? "Command" : manual ? "Skill added by hand" : "Skill") + '</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body">' +
        '<div><h2 class="drawer__name">' + esc(n.name) + '</h2><div class="drawer__chips">' + C.originChip(n) + C.flagChips(d, n) + "</div></div>" +
        (n.description ? '<p class="drawer__desc">' + esc(n.description) + "</p>" : '<p class="drawer__desc muted">This skill has no description.</p>') +
        (recs.length ? '<div class="drawer__banner"><span>' + icon("sparkle") + "<span>Claude suggested: <strong>" + esc(recs[0].title) + "</strong></span></span></div>" : "") +
        '<div class="props">' +
          prop("Group", '<select class="select select--bare" data-skill-area data-id="' + esc(n.id) + '" aria-label="Group">' + areaOptions(d, n) + "</select>" + (n.area && n.areaBy === "claude" ? '<span class="chip chip--quiet" title="Claude chose this group">Claude</span>' : "")) +
          prop("From", esc(n.source)) +
          prop(manual ? "Lives" : "Path", '<code class="path">' + esc(n.path) + "</code>" + (manual ? "" : '<button type="button" class="icon-btn icon-btn--sm" data-action="copy" data-text="' + esc(n.path) + '" aria-label="Copy the path" title="Copy the path">' + icon("fileText") + "</button>")) +
          (manual ? "" : prop("Used lately", esc(C.usesText(n)) + " <span class=\"muted\">(" + M.usageDays(d) + " days)</span>")) +
          (manual ? "" : prop("Last used", esc(M.usedLabel(n.uses.lastUsed)))) +
          (manual ? "" : prop("All time", n.uses.total + (n.uses.total === 1 ? " use" : " uses") + ' <span class="muted">in Claude Code</span>')) +
          (manual ? "" : prop("Changed", esc(M.usedLabel(n.modified)))) +
          (manual ? "" : prop("Size", n.lines + (n.lines === 1 ? " line" : " lines"))) +
        "</div>" +
        (manual ? "" : '<div class="drawer__section"><h3 class="drawer__h">Use, month by month</h3>' + C.bars(M.monthsOf(n), { width: 320, height: 48, label: "Use of " + n.name + " per month" }) + '<p class="drawer__small muted">Claude Code only.</p></div>') +
        '<div class="drawer__section"><h3 class="drawer__h">Your tags</h3>' +
          '<div class="tags">' + tags.map(function (t) { return '<span class="tag">#' + esc(t.label) + '<button type="button" class="tag__x" data-action="remove-tag" data-id="' + esc(n.id) + '" data-tag="' + esc(t.id) + '" aria-label="Remove tag ' + esc(t.label) + '">' + icon("x") + "</button></span>"; }).join("") + "</div>" +
          '<form data-form="add-tag" data-id="' + esc(n.id) + '" class="tag-form"><input class="input input--sm" name="tag" list="tagList" placeholder="Add a tag, then press Enter" maxlength="30" aria-label="Add a tag" autocomplete="off"><datalist id="tagList">' + d.tags.map(function (t) { return '<option value="' + esc(t.label) + '">'; }).join("") + "</datalist></form></div>" +
        '<div class="drawer__section"><h3 class="drawer__h">It uses</h3>' + skillRows(refs.uses, "It doesn’t name any other skill.") + "</div>" +
        '<div class="drawer__section"><h3 class="drawer__h">Used by</h3>' + skillRows(refs.usedBy, "No other skill names it.") + "</div>" +
        (refs.same.length ? '<div class="drawer__section"><h3 class="drawer__h">Same name</h3>' + skillRows(refs.same, "") + "</div>" : "") +
        (manual ? '<div class="drawer__section"><h3 class="drawer__h">Edit</h3><form data-form="edit-manual" data-id="' + esc(n.id) + '" class="stack">' +
          '<label class="field"><span class="field__label">Name</span><input class="input" name="name" value="' + esc(n.name) + '" maxlength="80"></label>' +
          '<label class="field"><span class="field__label">What it does</span><textarea class="textarea" name="description" rows="3" maxlength="500">' + esc(n.description) + "</textarea></label>" +
          '<label class="field"><span class="field__label">Where it lives</span><input class="input" name="where" value="' + esc(n.path) + '"></label>' +
          '<div class="drawer__row"><button type="submit" class="btn btn--sm btn--primary">Save</button><button type="button" class="btn btn--sm btn--danger" data-action="remove-manual" data-id="' + esc(n.id) + '">Remove from the map</button></div></form></div>' : "") +
      "</div>" +
      '<div class="drawer__foot"><button type="button" class="btn btn--sm" data-action="show-on-map" data-id="' + esc(n.id) + '">' + icon("map") + "Show on the map</button>" +
        '<a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink(prompt)) + '" title="Opens Claude with this typed in. Nothing is sent until you press send.">' + icon("sparkle") + "Look at it with Claude</a></div>";
  }

  function group(c, key) {
    const d = c.d;
    const g = M.groups(d, M.hasAreas(d) && /^area:/.test(key) ? "area" : "source").find(function (x) { return x.key === key; });
    if (!g) return "";
    const list = g.nodes.slice().sort(function (a, b) { return b.uses.last90 - a.uses.last90 || (a.name < b.name ? -1 : 1); });
    const used = list.filter(function (n) { return n.uses.last90 > 0; }).length;
    return '<div class="drawer__head"><span class="chip chip--quiet">Group</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body"><div><h2 class="drawer__name">' + esc(g.label) + '</h2><div class="drawer__chips"><span class="chip chip--quiet">' + list.length + (list.length === 1 ? " skill" : " skills") + '</span><span class="chip chip--quiet">' + used + " used lately</span></div></div>" +
      (g.blurb ? '<p class="drawer__desc">' + esc(g.blurb) + "</p>" : "") +
      '<div class="drawer__section"><h3 class="drawer__h">Skills in it</h3>' + skillRows(list, "Nothing here yet.") + "</div></div>" +
      '<div class="drawer__foot"><button type="button" class="btn btn--sm" data-action="show-group-on-map" data-group="' + esc(key) + '">' + icon("map") + "Show on the map</button></div>";
  }

  function render(c, which) {
    if (which.kind === "file") return window.SM.fdrawer.file(c, which.id);
    if (which.kind === "folder") return window.SM.fdrawer.folder(c, which.id);
    if (which.kind === "group") return group(c, which.id);
    return skill(c, which.id);
  }

  function bind(el) {
    const first = el.querySelector("[data-action='close-drawer']");
    if (first) first.setAttribute("data-first", "1");
  }

  window.SM = window.SM || {};
  window.SM.drawer = { render: render, bind: bind };
})();
