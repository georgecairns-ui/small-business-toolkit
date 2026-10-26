/*
  PREFERENCES: everything the person can change about how Pipeline OS works for them
  ---------------------------------------------------------------------------------
  You and your business, your stages (rename, add, remove), money and chasing, whether Claude
  may move deals by itself, the deal check's wording, where drafts open, light or dark, and
  where the pipeline is saved. Saved to settings in the pipeline file, so Claude follows the same choices.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c, L = window.PL.links;

  const CURRENCIES = [["GBP", "Pounds (£)"], ["EUR", "Euros (€)"], ["USD", "US dollars ($)"]];

  function field(label, input, hint) {
    return '<label class="field"><span class="field__label">' + esc(label) + "</span>" + input + (hint ? '<span class="field__hint">' + esc(hint) + "</span>" : "") + "</label>";
  }
  function options(list, current) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === current ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
  }
  function stageRow(s) {
    const fixed = s.key === "won" || s.key === "lost";
    return '<li class="pref-cat" data-stage-key="' + esc(s.key) + '">' +
      '<input class="input pref-cat__label" value="' + esc(s.label) + '" maxlength="40" aria-label="Stage name" data-pref="stage-label" required>' +
      (fixed ? '<span class="pref-cat__note">Closes a deal</span>' :
        '<button type="button" class="icon-btn" data-action="pref-remove-stage" aria-label="Remove ' + esc(s.label) + '">' + icon("trash") + "</button>") + "</li>";
  }

  function critRow(c) {
    return '<li class="pref-cat pref-crit" data-crit>' +
      '<input class="input pref-cat__label" value="' + esc(c.text || "") + '" maxlength="120" aria-label="What makes an ideal client" data-pref="crit-text" placeholder="For example: 10 to 50 staff">' +
      '<label class="pref-crit__deal"><input type="checkbox" data-pref="crit-breaker"' + (c.dealBreaker ? " checked" : "") + '> Must have</label>' +
      '<button type="button" class="icon-btn" data-action="pref-remove-crit" aria-label="Remove">' + icon("trash") + "</button></li>";
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
        field("Business name", '<input class="input" name="businessName" maxlength="80" value="' + esc(s.businessName) + '">') + "</div>") +

      section("Your pipeline",
        '<div class="pref__sub"><span class="field__label">Stages</span><ul class="pref-cats" id="prefStages" role="list">' + M.openStages().map(stageRow).join("") + "</ul>" +
        '<button type="button" class="btn btn--sm" data-action="pref-add-stage">' + icon("plus") + "Add a stage</button>" +
        '<ul class="pref-cats" role="list">' + ["won", "lost"].map(function (k) { return stageRow(M.STAGE[k]); }).join("") + "</ul>" +
        '<span class="field__hint">In the order a deal moves through them. Deals in a stage you remove go back to the first one.</span></div>' +
        '<div class="field-row">' + field("Currency", '<select class="select" name="currency">' + options(CURRENCIES, s.currency) + "</select>") +
        field("Chase after", '<select class="select" name="chaseAfterDays">' + options([3, 5, 7, 10, 14, 21].map(function (n) { return [String(n), n + " days with no reply"]; }), String(s.chaseAfterDays)) + "</select>", "Claude drafts a chase when a deal goes this long without contact.") + "</div>" +
        '<label class="switch"><input type="checkbox" name="claudeSends"' + (s.claudeSends !== false ? " checked" : "") + '><span class="switch__track" aria-hidden="true"></span>Show Claude emails: I check an email and press Send, and Claude sends it for me</label>' +
        '<label class="switch"><input type="checkbox" name="autoMove"' + (s.autoMove !== false ? " checked" : "") + '><span class="switch__track" aria-hidden="true"></span>Let Claude move deals to the next stage when it’s clear (you can undo any move)</label>',
        "The stages your deals move through, and how Claude keeps them moving.") +

      section("Your ideal client",
        '<ul class="pref-cats" id="prefCrits" role="list">' + (s.fitCriteria || []).map(function (c) { return critRow(typeof c === "string" ? { text: c } : c); }).join("") + "</ul>" +
        '<button type="button" class="btn btn--sm" data-action="pref-add-crit">' + icon("plus") + "Add one</button>" +
        '<span class="field__hint">Claude researches everyone you\'re about to meet and checks them against this list. The fit score on each deal is how many they match. Tick Must have for a deal-breaker. Claude wrote these from your answers in setup; change them any time.</span>',
        "What makes someone a good client for you.") +

      section("The deal check",
        '<div class="pref-checks">' + M.CHECK.map(function (c) {
          return field(c.name, '<input class="input" name="check-' + c.key + '" maxlength="80" value="' + esc(M.checkLabel(d, c.key)) + '" placeholder="' + esc(c.label) + '">');
        }).join("") + "</div>",
        "The 8 questions Claude checks every deal against, based on MEDDPICC, a standard way to qualify sales. Reword them to suit your business; the meaning stays the same.") +

      section("Email and calendar",
        '<div class="field-row">' + field("Drafts open in", '<select class="select" name="emailProvider">' + options(L.EMAIL_PROVIDERS.map(function (p) { return [p.key, p.label]; }), s.emailProvider || "gmail") + "</select>") +
        field("Add to calendar opens", '<select class="select" name="calendarProvider">' + options(L.CALENDAR_PROVIDERS.map(function (p) { return [p.key, p.label]; }), s.calendarProvider || "google") + "</select>") + "</div>") +

      section("Look",
        '<div class="pref-row"><span>Light or dark</span><button type="button" class="btn btn--sm" data-theme-toggle>' + icon("moon") + "Switch</button></div>" +
        '<div class="pref-row"><span>Your own colours, font and logo</span>' + C.say("Make it match my brand") + "</div>") +

      section("Where your pipeline lives",
        '<div class="pref-row"><span class="muted">Your pipeline is saved in: ' + esc(where.folder) + "</span>" + (where.canChange ? '<button type="button" class="btn btn--sm" data-action="change-folder">Use a different folder</button>' : "") + "</div>") +

      '<div class="prefs__save"><button type="submit" class="btn btn--primary">Save preferences</button></div>' +
      "</form></div>";
  }

  // Read the form back. Returns { values, stages, checkLabels } or { error } in plain words.
  function collect(form) {
    const f = form.elements;
    const values = {
      yourName: f.yourName.value.trim(), businessName: f.businessName.value.trim(),
      currency: f.currency.value, chaseAfterDays: Number(f.chaseAfterDays.value) || 7, autoMove: f.autoMove.checked, claudeSends: f.claudeSends.checked,
      emailProvider: f.emailProvider.value, calendarProvider: f.calendarProvider.value
    };
    const fitCriteria = [];
    form.querySelectorAll("[data-crit]").forEach(function (row) {
      const text = row.querySelector('[data-pref="crit-text"]').value.trim();
      if (text) fitCriteria.push({ text: text, dealBreaker: row.querySelector('[data-pref="crit-breaker"]').checked });
    });
    values.fitCriteria = fitCriteria;
    const checkLabels = {};
    M.CHECK.forEach(function (c) { const v = f["check-" + c.key].value.trim(); if (v && v !== c.label) checkLabels[c.key] = v; });
    const seen = {};
    const stages = [];
    let error = null;
    form.querySelectorAll("[data-stage-key]").forEach(function (row) {
      const label = row.querySelector('[data-pref="stage-label"]').value.trim();
      if (!label) { error = "Every stage needs a name."; return; }
      if (seen[label.toLowerCase()]) { error = 'There are 2 stages called "' + label + '". Give each its own name.'; return; }
      seen[label.toLowerCase()] = true;
      let key = row.getAttribute("data-stage-key");
      if (!key) {
        key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "stage";
        let n = 2;
        const base = key;
        while (key === "won" || key === "lost" || stages.some(function (s) { return s.key === key; }) || M.STAGE[key]) key = base + "-" + n++;
      }
      stages.push({ key: key, label: label });
    });
    if (!error && !stages.some(function (s) { return s.key !== "won" && s.key !== "lost"; })) error = "Keep at least one stage before Won and Lost.";
    return error ? { error: error } : { values: values, stages: stages, checkLabels: checkLabels };
  }

  function addCritRow(list) {
    const li = document.createElement("li");
    li.innerHTML = critRow({ text: "" });
    list.appendChild(li.firstChild);
    list.lastChild.querySelector("input").focus();
  }

  function addStageRow(list) {
    const li = document.createElement("li");
    li.innerHTML = stageRow({ key: "", label: "" });
    const row = li.firstChild;
    list.appendChild(row);
    row.querySelector('[data-pref="stage-label"]').focus();
  }

  window.PL.views = window.PL.views || {};
  window.PL.views.preferences = {
    title: function () { return "Preferences"; },
    sub: function () { return "How Pipeline OS works for you"; },
    render: render,
    collect: collect,
    addStageRow: addStageRow,
    addCritRow: addCritRow
  };
})();
