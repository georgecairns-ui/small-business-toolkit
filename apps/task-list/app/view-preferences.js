/*
  PREFERENCES: everything the person can change about how Task List OS works for them
  -----------------------------------------------------------------------------------
  You and your business, your working day, how the Tasks page opens, the names of the board's
  columns, the categories (rename, recolour, add, remove), where drafts and calendar events
  open, the time-saved estimate, light or dark, and sample data. Saved to settings in the task
  file, so Claude follows the same choices.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c, L = window.TL.links;

  function field(label, input, hint) {
    return '<label class="field"><span class="field__label">' + esc(label) + "</span>" + input + (hint ? '<span class="field__hint">' + esc(hint) + "</span>" : "") + "</label>";
  }
  function options(list, current) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === current ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
  }
  // The colour picker needs a plain colour; a standard category uses its theme colour until changed
  function pickerValue(c) {
    if (c.colour) return c.colour;
    return { today: "#d97757", "quick-win": "#c08a1e", delegate: "#3f8a55", waiting: "#4a73b5", later: "#8c9099" }[c.key] || "#8c9099";
  }
  function catRow(c) {
    const fixed = c.key === "waiting";
    return '<li class="pref-cat" data-cat-key="' + esc(c.key) + '" data-custom-colour="' + (c.colour ? "1" : "") + '">' +
      '<input class="pref-cat__colour" type="color" value="' + esc(pickerValue(c)) + '" aria-label="Colour for ' + esc(c.label) + '" data-pref="cat-colour">' +
      '<input class="input pref-cat__label" value="' + esc(c.label) + '" maxlength="40" aria-label="Name" data-pref="cat-label" required>' +
      (fixed ? '<span class="pref-cat__note">Used by the Waiting on column</span>' :
        '<button type="button" class="icon-btn" data-action="pref-remove-cat" aria-label="Remove ' + esc(c.label) + '">' + icon("trash") + "</button>") + "</li>";
  }

  function render(ctx) {
    const d = ctx.d, s = d.settings;
    const section = function (title, body, intro) {
      return '<section class="panel pref"><h2 class="pref__title">' + esc(title) + "</h2>" + (intro ? '<p class="muted pref__intro">' + esc(intro) + "</p>" : "") + '<div class="pref__body">' + body + "</div></section>";
    };
    const where = ctx.storeInfo();
    return '<div class="page page--narrow"><form class="prefs" data-form="preferences" autocomplete="off">' +
      section("You and your business",
        '<div class="field-row">' + field("Your first name", '<input class="input" name="yourName" maxlength="60" value="' + esc(s.yourName) + '">') +
        field("Business name", '<input class="input" name="businessName" maxlength="80" value="' + esc(s.businessName) + '">') + "</div>" +
        '<div class="field-row">' + field("Your day starts", '<input class="input" type="time" name="dayStarts" value="' + esc(s.dayStarts) + '">') +
        field("Your day ends", '<input class="input" type="time" name="dayEnds" value="' + esc(s.dayEnds) + '">') + "</div>") +

      section("Tasks",
        '<div class="field-row">' + field("Open Tasks on", '<select class="select" name="defaultScope">' + options([["today", "Today"], ["week", "This week"], ["all", "All"]], s.defaultScope) + "</select>") +
        field("Show them as", '<select class="select" name="defaultView">' + options([["board", "Board"], ["list", "List"], ["calendar", "Calendar"]], s.defaultView) + "</select>") + "</div>" +
        '<div class="pref__sub"><span class="field__label">Board columns</span><div class="pref-stages">' + M.STAGES.map(function (st) {
          return '<input class="input" name="stage-' + st.key + '" maxlength="30" value="' + esc(M.stageLabel(d, st.key)) + '" aria-label="Name for the ' + esc(st.label) + ' column" placeholder="' + esc(st.label) + '">';
        }).join("") + '</div><span class="field__hint">Rename them to suit how you work. The 4 columns stay in this order.</span></div>' +
        '<div class="pref__sub"><span class="field__label">Categories</span><ul class="pref-cats" id="prefCats" role="list">' + M.CATEGORIES.map(catRow).join("") + "</ul>" +
        '<button type="button" class="btn btn--sm" data-action="pref-add-cat">' + icon("plus") + "Add a category</button>" +
        '<span class="field__hint">Tasks in a category you remove move to "' + esc((M.CAT.later || {}).label || "Can wait") + '". Claude uses your categories too.</span></div>',
        "How the Tasks page opens, the board's columns, and the categories tasks are sorted into.") +

      section("Email and calendar",
        '<div class="field-row">' + field("Drafts open in", '<select class="select" name="emailProvider">' + options(L.EMAIL_PROVIDERS.map(function (p) { return [p.key, p.label]; }), s.emailProvider || "gmail") + "</select>") +
        field("Add to calendar opens", '<select class="select" name="calendarProvider">' + options(L.CALENDAR_PROVIDERS.map(function (p) { return [p.key, p.label]; }), s.calendarProvider || "google") + "</select>") + "</div>") +

      section("Time saved",
        '<div class="field-row">' + field("Minutes saved per task", '<input class="input" type="number" name="minutesSavedPerTask" min="0" max="120" value="' + esc(s.minutesSavedPerTask) + '">') +
        field("Minutes saved per plan", '<input class="input" type="number" name="minutesSavedPerPlan" min="0" max="240" value="' + esc(s.minutesSavedPerPlan) + '">') + "</div>",
        "These drive the time-saved estimate on Home. A rough guide, not a measurement.") +

      section("Look",
        '<div class="pref-row"><span>Light or dark</span><button type="button" class="btn btn--sm" data-theme-toggle>' + icon("moon") + "Switch</button></div>" +
        '<div class="pref-row"><span>Your own colours, font and logo</span>' + C.say("Make it match my brand") + "</div>") +

      section("Where your tasks live",
        '<div class="pref-row"><span class="muted">Your tasks are saved in: ' + esc(where.folder) + "</span>" + (where.canChange ? '<button type="button" class="btn btn--sm" data-action="change-folder">Use a different folder</button>' : "") + "</div>") +

      '<div class="prefs__save"><button type="submit" class="btn btn--primary">Save preferences</button></div>' +
      "</form></div>";
  }

  // Read the form back. Returns { values, categories } or { error } in plain words.
  function collect(form) {
    const f = form.elements;
    const values = {
      yourName: f.yourName.value.trim(), businessName: f.businessName.value.trim(),
      dayStarts: f.dayStarts.value || "08:00", dayEnds: f.dayEnds.value || "18:00",
      defaultScope: f.defaultScope.value, defaultView: f.defaultView.value,
      emailProvider: f.emailProvider.value, calendarProvider: f.calendarProvider.value,
      minutesSavedPerTask: Math.max(0, Number(f.minutesSavedPerTask.value) || 0),
      minutesSavedPerPlan: Math.max(0, Number(f.minutesSavedPerPlan.value) || 0),
      stageLabels: {}
    };
    M.STAGES.forEach(function (st) { const v = f["stage-" + st.key].value.trim(); if (v && v !== st.label) values.stageLabels[st.key] = v; });
    const seen = {};
    const categories = [];
    let error = null;
    form.querySelectorAll(".pref-cat").forEach(function (row) {
      const label = row.querySelector('[data-pref="cat-label"]').value.trim();
      if (!label) { error = "Every category needs a name."; return; }
      if (seen[label.toLowerCase()]) { error = 'There are 2 categories called "' + label + '". Give each its own name.'; return; }
      seen[label.toLowerCase()] = true;
      let key = row.getAttribute("data-cat-key");
      if (!key) {
        key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "category";
        let n = 2, base = key;
        while (categories.some(function (c) { return c.key === key; }) || M.CAT[key]) key = base + "-" + n++;
      }
      const colourInput = row.querySelector('[data-pref="cat-colour"]');
      const changed = row.getAttribute("data-custom-colour") === "1" || colourInput.dataset.touched === "1";
      categories.push({ key: key, label: label, colour: changed ? colourInput.value : "" });
    });
    return error ? { error: error } : { values: values, categories: categories };
  }

  function addCategoryRow(list) {
    const li = document.createElement("li");
    li.innerHTML = catRow({ key: "", label: "", colour: "#7a6a4f" });
    const row = li.firstChild;
    row.setAttribute("data-custom-colour", "1");
    list.appendChild(row);
    row.querySelector('[data-pref="cat-label"]').focus();
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.preferences = {
    title: function () { return "Preferences"; },
    sub: function () { return "How Task List OS works for you"; },
    render: render,
    bind: function (root) {
      root.querySelectorAll('[data-pref="cat-colour"]').forEach(function (el) { el.addEventListener("input", function () { el.dataset.touched = "1"; }); });
    },
    collect: collect,
    addCategoryRow: addCategoryRow
  };
})();
