/*
  PREFERENCES: your name, extra folders to scan, and the areas of your business
  -----------------------------------------------------------------------------
  The areas are the words Skill and Folder Map OS uses to group skills by what they do for the business.
  Rename them, change what they say, add your own, or remove the ones that don't fit.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model;
  const V = (window.SM.views = window.SM.views || {});

  function areaRow(a, count) {
    return '<div class="pref-cat" data-key="' + esc(a.key || "") + '">' +
      '<input type="text" class="input" name="areaLabel" value="' + esc(a.label || "") + '" placeholder="Area name" aria-label="Area name" maxlength="40">' +
      '<input type="text" class="input" name="areaBlurb" value="' + esc(a.blurb || "") + '" placeholder="What goes here, in a few words" aria-label="What goes in this area" maxlength="120">' +
      '<span class="pref-cat__n muted">' + (count == null ? "New" : count + (count === 1 ? " skill" : " skills")) + "</span>" +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="pref-remove-area" aria-label="Remove this area" title="Remove this area (its skills become ungrouped)">' + icon("x") + "</button></div>";
  }

  function render(c) {
    const d = c.d;
    const counts = {};
    d.nodes.forEach(function (n) { if (n.area) counts[n.area] = (counts[n.area] || 0) + 1; });
    return '<div class="page page--narrow"><form data-form="preferences" class="pref" autocomplete="off">' +
      '<section class="panel"><div class="section-head"><h2>' + icon("user") + "About you</h2></div>" +
        '<div class="field-row"><label class="field"><span class="field__label">Your name</span><input class="input" name="yourName" value="' + esc(d.settings.yourName) + '"></label>' +
        '<label class="field"><span class="field__label">Your business</span><input class="input" name="businessName" value="' + esc(d.settings.businessName) + '"></label></div></section>' +
      '<section class="panel"><div class="section-head"><h2>' + icon("folder") + "Folders to map</h2></div>" +
        '<p class="muted">The folder map looks inside these folders, one on each line, and nowhere else. It reads names, sizes and dates only: never what is inside a file. Add a folder, or take one out, then scan your folders again. Hidden items, <code>node_modules</code> and the Library folder are always skipped.</p>' +
        '<label class="field"><span class="field__label sr-only">Folders</span><textarea class="textarea" name="roots" rows="4" placeholder="For example ~/Documents">' + esc((c.f && c.f.settings.roots.length ? c.f.settings.roots : ["~/Documents", "~/Desktop", "~/Downloads"]).join("\n")) + "</textarea></label></section>" +
      '<section class="panel"><div class="section-head"><h2>' + icon("sparkle") + "Other folders to look for skills in</h2></div>" +
        '<p class="muted">The scan already looks in your own skills, this toolkit and your plugins. If your team keeps skills in another folder, add it here, one folder on each line, then scan again.</p>' +
        '<label class="field"><span class="field__label sr-only">Folders</span><textarea class="textarea" name="extraFolders" rows="3" placeholder="For example /Users/sam/Documents/Team skills">' + esc(d.settings.extraFolders.join("\n")) + "</textarea></label></section>" +
      '<section class="panel"><div class="section-head"><h2>' + icon("target") + "Areas of your business</h2>" +
        '<button type="button" class="btn btn--sm" data-action="pref-add-area">' + icon("plus") + "Add an area</button></div>" +
        '<p class="muted">Skills are grouped into these. Use the words you use. An area with no skill in it shows on the Gaps page.</p>' +
        '<div id="prefAreas" class="pref-cats">' + d.areas.map(function (a) { return areaRow(a, counts[a.key] || 0); }).join("") + "</div></section>" +
      '<div class="pref__foot"><button type="submit" class="btn btn--primary">Save preferences</button></div>' +
      '<p class="muted drawer__small">Your map is saved in <code>apps/skill-map/data/skillmap.json</code> on this computer. Nothing leaves it.</p>' +
    "</form></div>";
  }

  // Read the form back into values
  function collect(form) {
    const f = form.elements;
    const rows = Array.prototype.slice.call(form.querySelectorAll(".pref-cat"));
    const areas = [], seen = {};
    for (let i = 0; i < rows.length; i++) {
      const label = rows[i].querySelector("[name=areaLabel]").value.trim();
      const blurb = rows[i].querySelector("[name=areaBlurb]").value.trim();
      if (!label) continue;
      if (seen[label.toLowerCase()]) return { error: "You have two areas called “" + label + "”. Give them different names." };
      seen[label.toLowerCase()] = true;
      areas.push({ key: rows[i].getAttribute("data-key") || "", label: label, blurb: blurb });
    }
    if (!areas.length) return { error: "Keep at least one area, so skills have somewhere to go." };
    const folders = f.extraFolders.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    const roots = f.roots.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    return { roots: roots, values: { yourName: f.yourName.value.trim(), businessName: f.businessName.value.trim(), extraFolders: folders }, areas: areas };
  }

  V.preferences = {
    render: render, collect: collect,
    addAreaRow: function (host) {
      const tmp = document.createElement("div");
      tmp.innerHTML = areaRow({ key: "", label: "", blurb: "" }, null);
      host.appendChild(tmp.firstChild);
      host.lastChild.querySelector("input").focus();
    },
    title: function () { return "Preferences"; },
    sub: function () { return "Your name, folders and areas"; }
  };
})();
