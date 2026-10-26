/*
  ALL SKILLS: every skill in a table you can search and sort
  ----------------------------------------------------------
  The same skills as the map, as a list. It is also the way into the map for anyone who can't use
  a mouse: every row opens the same panel a dot on the map does.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c;
  const V = (window.SM.views = window.SM.views || {});

  const COLUMNS = [
    { key: "name", label: "Skill" },
    { key: "group", label: "Group" },
    { key: "origin", label: "From" },
    { key: "uses", label: "Used lately", num: true },
    { key: "last", label: "Last used" },
    { key: "flags", label: "Notes", nosort: true }
  ];

  function groupLabel(d, n) {
    const a = n.area && M.areaByKey(d, n.area);
    return a ? a.label : "";
  }

  function filtered(c) {
    const d = c.d, s = c.state;
    const q = s.skillsQuery.trim().toLowerCase();
    let list = d.nodes.filter(function (n) {
      if (s.skillsOrigin !== "all" && n.origin !== s.skillsOrigin) return false;
      if (s.skillsAttention && !M.needsLook(d, n)) return false;
      if (q && n.name.toLowerCase().indexOf(q) === -1 && n.description.toLowerCase().indexOf(q) === -1 && n.path.toLowerCase().indexOf(q) === -1 && groupLabel(d, n).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    const dir = s.skillsSort.dir === "desc" ? -1 : 1;
    const key = s.skillsSort.key;
    function val(n) {
      if (key === "group") return groupLabel(d, n).toLowerCase() || "￿";
      if (key === "origin") return n.source.toLowerCase();
      if (key === "uses") return n.uses.last90;
      if (key === "last") return n.uses.lastUsed || "";
      return n.name.toLowerCase();
    }
    list = list.slice().sort(function (a, b) {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) * dir;
    });
    return list;
  }

  function rows(c) {
    const list = filtered(c);
    if (!list.length) return '<tr><td colspan="6" class="table__none">Nothing matches. Try fewer words, or clear the filters.</td></tr>';
    return list.map(function (n) {
      return '<tr class="table__row" data-action="open-node" data-id="' + esc(n.id) + '">' +
        '<td class="table__name"><button type="button" class="table__link" data-action="open-node" data-id="' + esc(n.id) + '">' + esc(n.name) + "</button>" +
          (n.kind === "command" ? ' <span class="chip chip--quiet">command</span>' : "") + '<span class="table__desc">' + esc(n.description) + "</span></td>" +
        "<td>" + esc(groupLabel(c.d, n) || "Not grouped") + "</td>" +
        "<td>" + C.originChip(n) + "</td>" +
        '<td class="num">' + esc(n.origin === "manual" ? "Not counted" : String(n.uses.last90)) + "</td>" +
        "<td>" + esc(n.origin === "manual" ? "" : M.usedLabel(n.uses.lastUsed)) + "</td>" +
        '<td class="table__flags">' + C.flagChips(c.d, n) + "</td></tr>";
    }).join("");
  }

  function countText(c) {
    const n = filtered(c).length, total = c.d.nodes.length;
    return n === total ? total + (total === 1 ? " skill" : " skills") : n + " of " + total + " skills";
  }

  function render(c) {
    const d = c.d, s = c.state;
    if (M.notSetUp(d)) return '<div class="page page--narrow">' + C.scanCard(c) + "</div>";
    const origins = M.ORIGINS.filter(function (o) { return d.nodes.some(function (n) { return n.origin === o.key; }); });
    const head = COLUMNS.map(function (col) {
      const on = s.skillsSort.key === col.key;
      if (col.nosort) return "<th scope=\"col\">" + esc(col.label) + "</th>";
      return '<th scope="col" aria-sort="' + (on ? (s.skillsSort.dir === "desc" ? "descending" : "ascending") : "none") + '"' + (col.num ? ' class="num"' : "") + '><button type="button" class="table__sort' + (on ? " is-on" : "") + '" data-action="skills-sort" data-key="' + col.key + '">' + esc(col.label) + (on ? icon(s.skillsSort.dir === "desc" ? "chevronDown" : "chevronDown", "table__arrow" + (s.skillsSort.dir === "desc" ? "" : " is-up")) : "") + "</button></th>";
    }).join("");
    return '<div class="page page--wide">' +
      '<div class="toolbar">' +
        '<div class="toolbar__group">' +
          '<input type="search" class="input skills-q" data-skills-q placeholder="Filter by name, words or place" value="' + esc(s.skillsQuery) + '" aria-label="Filter the skills" autocomplete="off">' +
          '<select class="select select--sm" data-skills-origin aria-label="Where from"><option value="all">All places</option>' +
            origins.map(function (o) { return '<option value="' + o.key + '"' + (s.skillsOrigin === o.key ? " selected" : "") + ">" + esc(o.plural) + "</option>"; }).join("") + "</select>" +
          '<button type="button" class="filter' + (s.skillsAttention ? " is-active" : "") + '" data-action="skills-attention" aria-pressed="' + (s.skillsAttention ? "true" : "false") + '">Needs a look</button>' +
        "</div>" +
        '<div class="toolbar__group"><span class="muted" id="skillCount" aria-live="polite">' + esc(countText(c)) + "</span>" +
          '<button type="button" class="btn btn--sm" data-action="add-manual">' + icon("plus") + "Add a skill I use on claude.ai</button></div>" +
      "</div>" +
      '<div class="panel panel--flush table-wrap"><table class="table"><thead><tr>' + head + '</tr></thead><tbody id="skillRows">' + rows(c) + "</tbody></table></div>" +
    "</div>";
  }

  V.skills = {
    render: render, rows: rows, countText: countText,
    title: function () { return "All skills"; },
    sub: function (c) { return M.notSetUp(c.d) ? "" : "Every skill in one list"; }
  };
})();
