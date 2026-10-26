/*
  OVERVIEW: the numbers behind the map
  ------------------------------------
  How many skills, how many are used, what is used most, how use changed month by month, where the
  skills come from and what the last scan found. Every figure is counted here from the scan.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c;
  const V = (window.SM.views = window.SM.views || {});

  function hbars(list, key) {
    const max = Math.max.apply(null, list.map(function (n) { return n.uses.last90; }).concat([1]));
    return '<div class="hbars">' + list.map(function (n) {
      return '<button type="button" class="hbar" data-action="open-node" data-id="' + esc(n.id) + '"><span class="hbar__name">' + esc(n.name) + '</span><span class="hbar__track"><span class="hbar__fill" style="width:' + Math.max(3, Math.round(n.uses.last90 / max * 100)) + '%"></span></span><span class="hbar__n num">' + n.uses.last90 + "</span></button>";
    }).join("") + "</div>";
  }

  function originBar(d) {
    const total = d.nodes.length || 1;
    const by = {};
    d.nodes.forEach(function (n) { by[n.origin] = (by[n.origin] || 0) + 1; });
    const parts = M.ORIGINS.filter(function (o) { return by[o.key]; });
    return '<div class="stackbar" role="img" aria-label="' + esc(parts.map(function (o) { return by[o.key] + " " + o.plural.toLowerCase(); }).join(", ")) + '">' +
      parts.map(function (o) { return '<span class="stackbar__part stackbar__part--' + o.key + '" style="flex:' + by[o.key] + '" title="' + esc(o.plural + ": " + by[o.key]) + '"></span>'; }).join("") + "</div>" +
      '<ul class="legend" role="list">' + parts.map(function (o) { return '<li><span class="legend__dot legend__dot--' + o.key + '"></span>' + esc(o.plural) + ' <strong class="num">' + by[o.key] + "</strong></li>"; }).join("") + "</ul>";
  }

  function scanPanel(d, c) {
    const s = d.scan;
    const u = s.usage || {};
    const places = (s.sources || []).map(function (p) {
      return '<li class="source"><span class="source__name">' + esc(p.label) + '</span><span class="source__path">' + esc(p.path) + '</span><span class="source__n num">' + p.count + "</span></li>";
    }).join("");
    const notes = (s.warnings || []).map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("");
    return C.sectionHead("The last scan", { icon: "refresh", right: '<button type="button" class="btn btn--sm" data-action="scan">' + icon("refresh") + "Scan again</button>" }) +
      '<p class="muted">' + esc(M.scanLabel(d)) + (s.changes ? ". " + s.changes.added + " new since the scan before" + (s.changes.removed && s.changes.removed.length ? ", " + s.changes.removed.length + " gone" : "") : "") + ".</p>" +
      '<ul class="sources" role="list">' + places + "</ul>" +
      '<p class="muted drawer__small">Use counts: ' + (u.files ? u.events + " uses found in " + u.files + " Claude Code " + (u.files === 1 ? "history file" : "history files") + (u.from ? ", from " + esc(u.from) + " to " + esc(u.to) : "") + ". Only the skill’s name and the date are read, never what was typed. " + esc(u.note || "") + "." : esc(u.note || "No use counts yet") + ".") + "</p>" +
      (notes ? '<div class="notes"><strong>Notes from the scan</strong><ul>' + notes + "</ul></div>" : "");
  }

  function render(c) {
    const d = c.d;
    if (M.notSetUp(d)) return '<div class="page page--narrow">' + C.scanCard(c) + "</div>";
    const n = M.numbers(d);
    const known = M.usageKnown(d);
    const top = M.topUsed(d, 8);
    const unused = M.unusedList(d).slice(0, 6);
    return '<div class="page">' +
      (known ? "" : '<div class="map-note">' + icon("info") + "<span>No Claude Code history was found on this computer, so use counts show as 0 and no skill is marked as unused.</span></div>") +
      '<div class="stats">' +
        C.stat(n.total, n.total === 1 ? "skill" : "skills", n.commands ? n.skills + " skills and " + n.commands + (n.commands === 1 ? " command" : " commands") : "") +
        C.stat(n.used90, "used lately", "in the last " + M.usageDays(d) + " days", "good") +
        C.stat(n.uses90, n.uses90 === 1 ? "use" : "uses", "counted in Claude Code") +
        C.stat(n.unused90, "not used lately", known ? "worth a look" : "", n.unused90 ? "warn" : "") +
        C.stat(n.dupGroups, n.dupGroups === 1 ? "name used twice" : "names used twice", n.dupGroups ? "Claude can pick the wrong one" : "", n.dupGroups ? "bad" : "") +
      "</div>" +
      '<div class="grid-2">' +
        '<section class="panel">' + C.sectionHead("Used most lately", { icon: "trendingUp" }) + (top.length ? hbars(top) : '<p class="muted list-empty">Nothing has been used in the last ' + M.usageDays(d) + " days.</p>") + "</section>" +
        '<section class="panel">' + C.sectionHead("Use, month by month", { icon: "barChart" }) + C.bars(M.monthTotals(d), { label: "Skill use per month, last 12 months" }) + '<p class="muted drawer__small">Every skill added together. Claude Code only: use in Cowork or on claude.ai isn’t recorded here.</p></section>' +
      "</div>" +
      '<div class="grid-2">' +
        '<section class="panel">' + C.sectionHead("Where your skills come from", { icon: "folder" }) + originBar(d) + "</section>" +
        '<section class="panel">' + C.sectionHead("Not used lately", { icon: "hourglass", count: n.unused90, accent: n.unused90 > 0 }) +
          (unused.length ? '<ul class="hlist hlist--plain" role="list">' + unused.map(function (x) { return '<li><button type="button" class="hrow hrow--btn" data-action="open-node" data-id="' + esc(x.id) + '"><span class="hrow__main"><span class="hrow__title">' + esc(x.name) + '</span><span class="hrow__sub">Last used: ' + esc(M.usedLabel(x.uses.lastUsed).toLowerCase()) + '</span></span></button></li>'; }).join("") + "</ul>" +
            (n.unused90 > unused.length ? '<button type="button" class="link-btn" data-action="show-unused">See all ' + n.unused90 + " on the map</button>" : "")
            : '<p class="muted list-empty">' + (known ? "Every skill has been used in the last " + M.usageDays(d) + " days." : "Nothing to show until use counts are available.") + "</p>") +
        "</section>" +
      "</div>" +
      '<section class="panel">' + scanPanel(d, c) + "</section>" +
    "</div>";
  }

  V.overview = {
    render: render,
    title: function () { return "Overview"; },
    sub: function (c) { return M.notSetUp(c.d) ? "" : M.scanLabel(c.d); }
  };
})();
