/*
  GAPS: what's covered, and what isn't yet
  ----------------------------------------
  Every area of the business as a card: the skills already doing a job there, or, where there are
  none, a few things a skill could do. This is the page to share on a call. It ends with the plain
  line about getting them built.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c;
  const V = (window.SM.views = window.SM.views || {});

  // A toolkit tool that already does the job for that area, if there is one
  const AREA_TOOL = { sales: "pipeline", marketing: "content", money: "money" };

  function toolCallout(c, areaKey) {
    const id = AREA_TOOL[areaKey];
    const kit = c.toolkit;
    const tool = id && kit && kit.tools.find(function (t) { return t.id === id; });
    if (!tool) return "";
    if (kit.installed[id]) return '<a class="gap__tool" href="../' + esc(tool.app.replace(/^apps\//, "")) + '">' + icon(tool.icon || "folder") + "<span><strong>" + esc(tool.name) + "</strong> is in your toolkit and covers this. Open it</span></a>";
    return '<button type="button" class="gap__tool" data-action="locked-tool" data-tool="' + esc(id) + '">' + icon(tool.icon || "folder") + "<span><strong>" + esc(tool.name) + "</strong> covers this. See what it does</span></button>";
  }

  function areaCard(c, g, a) {
    const list = g.nodes.slice().sort(function (x, y) { return y.uses.last90 - x.uses.last90 || (x.name < y.name ? -1 : 1); });
    if (!list.length) {
      return '<section class="gap gap--empty"><div class="gap__head"><h3>' + esc(a.label) + '</h3><span class="chip chip--warning">Nothing here yet</span></div>' +
        '<p class="gap__blurb">' + esc(a.blurb) + "</p>" +
        (a.ideas && a.ideas.length ? '<p class="gap__label">A skill could</p><ul class="gap__ideas">' + a.ideas.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") +
        toolCallout(c, a.key) + "</section>";
    }
    const shown = list.slice(0, 6), more = list.length - shown.length;
    const used = list.filter(function (n) { return n.uses.last90 > 0; }).length;
    return '<section class="gap"><div class="gap__head"><h3>' + esc(a.label) + '</h3><span class="badge num">' + list.length + "</span></div>" +
      '<p class="gap__blurb">' + esc(a.blurb) + "</p>" +
      '<div class="gap__chips">' + shown.map(function (n) { return '<button type="button" class="skill-chip' + (n.uses.last90 ? " is-used" : "") + '" data-action="open-node" data-id="' + esc(n.id) + '">' + esc(n.name) + "</button>"; }).join("") +
      (more > 0 ? '<button type="button" class="skill-chip skill-chip--more" data-action="map-group" data-group="area:' + esc(a.key) + '">+' + more + " more</button>" : "") + "</div>" +
      '<p class="gap__foot muted">' + used + " of " + list.length + (list.length === 1 ? " is" : " are") + " used lately</p></section>";
  }

  function render(c) {
    const d = c.d;
    if (M.notSetUp(d)) return '<div class="page page--narrow">' + C.scanCard(c) + "</div>";
    const grouped = M.hasAreas(d);
    if (!grouped) {
      return '<div class="page page--narrow"><section class="panel setup-card"><div class="setup-card__art"><img src="' + C.ART.thinking + '" alt="" width="72" height="72"></div>' +
        '<div class="setup-card__body"><h2>Which parts of your business have skills?</h2>' +
        '<p class="muted">Claude reads what each of your ' + d.nodes.length + " skills does and puts it in an area of your business: " + esc(d.areas.map(function (a) { return a.label; }).join(", ")) + ". The areas with nothing in them are the gaps.</p>" +
        '<div class="setup-card__actions"><button type="button" class="btn btn--primary btn--lg" data-action="group">' + icon("sparkle") + "Group my skills</button></div>" +
        '<p class="muted setup-card__alt">Or in Claude Code, say ' + C.say("Group my skills") + "</p></div></section></div>";
    }
    const groups = M.groups(d, "area");
    const byKey = {};
    groups.forEach(function (g) { byKey[g.key] = g; });
    const cards = d.areas.map(function (a) { return areaCard(c, byKey["area:" + a.key] || { nodes: [] }, a); });
    const none = byKey["area:none"];
    const n = M.numbers(d);
    return '<div class="page">' +
      (d.settings.areasApproved ? "" : '<div class="map-note">' + icon("sparkle") + "<span><strong>Claude has grouped your skills.</strong> Check the groups, change any that are wrong in the skill’s panel, then say it looks right.</span>" +
        '<button type="button" class="btn btn--sm" data-action="approve-areas">It looks right</button></div>') +
      '<div class="gaps-intro"><p class="gaps-intro__line"><strong class="num">' + n.areasFilled + "</strong> of <strong class=\"num\">" + n.areas + "</strong> areas of your business have a skill doing a job in them." +
        (n.areasEmpty ? " <strong class=\"num\">" + n.areasEmpty + "</strong> " + (n.areasEmpty === 1 ? "has" : "have") + " none yet." : " Every area is covered.") + "</p>" +
        '<button type="button" class="btn btn--sm" data-action="group">' + icon("refresh") + "Group again</button></div>" +
      '<div class="gaps">' + cards.join("") + "</div>" +
      (none && none.nodes.length ? '<p class="muted">' + none.nodes.length + (none.nodes.length === 1 ? " skill isn’t" : " skills aren’t") + " in an area yet. Open one and choose its area, or press Group again.</p>" : "") +
      '<section class="panel panel--accent gaps-cta"><div><h2>Want these built for you?</h2><p class="muted">Get AI Powers sets up the skills your business is missing, and shows your team how to use them.</p></div>' +
      '<a class="btn btn--primary" href="https://getaipowers.com" target="_blank" rel="noopener">' + icon("external") + "getaipowers.com</a></section>" +
    "</div>";
  }

  V.gaps = {
    render: render,
    title: function () { return "Gaps"; },
    sub: function (c) { return M.notSetUp(c.d) || !M.hasAreas(c.d) ? "" : M.numbers(c.d).areasEmpty + " of " + c.d.areas.length + " areas empty"; }
  };
})();
