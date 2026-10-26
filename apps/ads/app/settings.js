/*
  SETTINGS: the business words, the targets and the limits, in a pop-up
  --------------------------------------------------------------------
  Opened by the gear on the rail (and the gear in the sidebar). Everything saves as soon as a box is
  left. Money boxes take pounds and leave a box empty to mean "not set". The close rate is typed as a
  percentage and kept as a fraction (25 is kept as 0.25). Every save goes through ctx.update().
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]';

  const WEEK_STARTS = [{ value: 1, label: "Monday" }, { value: 0, label: "Sunday" }];
  const KINDS = [
    { value: "", label: "Choose one" }, { value: "lead", label: "A form filled in" }, { value: "call", label: "A phone call" },
    { value: "booking", label: "A booking" }, { value: "sale", label: "A sale" }
  ];
  const TEXT_LABELS = { businessName: "business name", ownerName: "first name" };
  // Boxes of money in pounds, where they live in the settings, and what they are called in the activity list
  const MONEY = {
    targetCostPerResult: { label: "target cost per result" }, monthlyBudget: { label: "monthly budget" },
    dailyCap: { label: "daily limit" }, weeklyCap: { label: "weekly limit" }
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let getCtx = null, dlg = null;

  function options(list, selected) {
    return list.map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(selected) ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("");
  }
  function section(title, intro, body) {
    return '<section class="prefs-section"><h3 class="prefs-section__title">' + title + "</h3>" + (intro ? '<p class="prefs-hint">' + intro + "</p>" : "") + body + "</section>";
  }
  function shown(n) { return n === null || n === undefined ? "" : String(n); }

  // One season: a name, then the day it starts and the day it ends (each a month and a day). It may run over the new year.
  function seasonRow(season, i) {
    const month = function (md, part) {
      return '<select class="select" data-season-part="' + part + '-m" aria-label="' + (part === "from" ? "Starts in" : "Ends in") + '">' +
        MONTHS.map(function (m, n) { const v = String(n + 1).padStart(2, "0"); return '<option value="' + v + '"' + (v === md.slice(0, 2) ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select>" +
        '<input class="input num" type="number" min="1" max="31" data-season-part="' + part + '-d" aria-label="' + (part === "from" ? "Start day" : "End day") + '" value="' + Number(md.slice(3)) + '">';
    };
    return '<div class="prefs-grid" data-season="' + i + '"><label class="field"><span class="field__label">Name</span><input class="input" data-season-part="label" maxlength="40" value="' + esc(season.label) + '" placeholder="Christmas"></label>' +
      '<div class="field"><span class="field__label">Starts</span><span class="prefs-money">' + month(season.from, "from") + '</span></div>' +
      '<div class="field"><span class="field__label">Ends</span><span class="prefs-money">' + month(season.to, "to") + '</span></div>' +
      '<div class="field"><button type="button" class="btn btn--sm btn--ghost" data-season-remove="' + i + '">' + icon("trash") + "Remove</button></div></div>";
  }

  function form(s) {
    const result = s.result, isSale = result.kind === "sale";
    const text = function (field, label, ph) {
      return '<label class="field"><span class="field__label">' + label + '</span><input class="input" data-setting="' + field + '" maxlength="80" value="' + esc(s[field]) + '" placeholder="' + esc(ph) + '"></label>';
    };
    const pounds = function (field, label, ph, hint) {
      return '<label class="field"><span class="field__label">' + label + '</span><span class="prefs-money"><span aria-hidden="true">£</span><input class="input num" type="number" inputmode="decimal" min="0" step="any" data-money="' + field + '" value="' + esc(shown(s[field])) + '" placeholder="' + esc(ph) + '"></span>' +
        (hint ? '<span class="field__hint">' + hint + "</span>" : "") + "</label>";
    };
    const platformTargets = M.PLATFORMS.map(function (p) {
      return '<label class="field"><span class="field__label">' + esc(p.short) + '</span><span class="prefs-money"><span aria-hidden="true">£</span><input class="input num" type="number" inputmode="decimal" min="0" step="any" data-platform-target="' + esc(p.key) + '" value="' + esc(shown(s.platformTargets[p.key])) + '" placeholder="Same as above"></span></label>';
    }).join("");
    return section("About you", "", '<div class="field-row">' + text("businessName", "Business name", "Marlow Dental") + text("ownerName", "Your first name", "Sam") + "</div>") +
      section("What counts as a result", "The word you use for it shows on every screen, so it reads “Cost per " + esc(result.name || "enquiry") + "”.",
        '<div class="prefs-grid"><label class="field"><span class="field__label">One of them is called</span><input class="input" data-result="name" maxlength="40" value="' + esc(result.name) + '" placeholder="enquiry"></label>' +
        '<label class="field"><span class="field__label">Two or more are called</span><input class="input" data-result="plural" maxlength="40" value="' + esc(result.plural) + '" placeholder="' + esc((result.name || "enquiry") + "s") + '"></label>' +
        '<label class="field"><span class="field__label">It is</span><select class="select" data-result="kind">' + options(KINDS, result.kind) + "</select></label></div>" +
        (isSale ? '<p class="prefs-hint">Sales carry their own value, so there is nothing else to fill in.</p>' :
          '<div class="prefs-grid"><label class="field"><span class="field__label">A new customer is worth</span><span class="prefs-money"><span aria-hidden="true">£</span><input class="input num" type="number" inputmode="decimal" min="0" step="any" data-result="worth" value="' + esc(shown(result.worth)) + '" placeholder="400"></span><span class="field__hint">Roughly, over the time they stay with you.</span></label>' +
          '<label class="field"><span class="field__label">How many become customers</span><span class="prefs-money prefs-money--after"><input class="input num" type="number" inputmode="decimal" min="0" max="100" step="any" data-result="closeRate" value="' + esc(result.closeRate === null ? "" : String(Math.round(result.closeRate * 1000) / 10)) + '" placeholder="25"><span aria-hidden="true">%</span></span><span class="field__hint">Out of every 100, roughly. Used to estimate the return.</span></label></div>')) +
      section("Targets", "What you are happy to pay for one result. The traffic lights are measured against these.",
        '<div class="prefs-grid">' + pounds("targetCostPerResult", "Target cost per " + esc(result.name || "result"), "20", "") + "</div>" +
        '<p class="prefs-hint">Google and Meta count a result differently, so each can have its own target. Leave one empty to use the target above.</p><div class="prefs-grid">' + platformTargets + "</div>") +
      section("Budget and limits", "Claude keeps every new campaign inside these, and the app warns you when spend goes over.",
        '<div class="prefs-grid">' + pounds("monthlyBudget", "Monthly budget", "600", "") + pounds("dailyCap", "Daily limit", "30", "Most you want spent in one day.") + pounds("weeklyCap", "Weekly limit", "150", "Most you want spent in one week.") + "</div>") +
      section("Seasons that matter", "Busy times of year. Claude drafts a campaign ahead of each one, and a campaign can only run inside its season.",
        s.seasons.map(seasonRow).join("") + '<div><button type="button" class="btn btn--sm" data-season-add>' + icon("plus") + "Add a season</button></div>") +
      section("The week", "", '<div class="prefs-grid"><label class="field"><span class="field__label">Your week starts on</span><select class="select" data-setting="weekStarts">' + options(WEEK_STARTS, s.weekStarts) + "</select></label></div>");
  }

  // Draws the pop-up again from the saved settings, keeping the scroll position and which control had focus
  function draw() {
    const body = dlg.querySelector(".modal__body");
    const scroll = body ? body.scrollTop : 0;
    const at = Array.prototype.indexOf.call(dlg.querySelectorAll(FOCUSABLE), document.activeElement);
    dlg.innerHTML = '<div class="modal__head"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body">' + form(getCtx().data.settings) + "</div>" +
      '<div class="modal__foot"><span class="prefs-hint">Changes save as you go.</span><span class="spacer"></span><button type="button" class="btn btn--primary" data-close>Done</button></div>';
    dlg.querySelector(".modal__body").scrollTop = scroll;
    const again = dlg.querySelectorAll(FOCUSABLE);
    if (at > -1 && again[at]) again[at].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && dlg.contains(a) && a.tagName === "INPUT" && /text|number/.test(a.type);
  }

  // ---------- Saving ----------
  // A box of pounds or a percentage: "" means not set, anything else must be a number of 0 or more
  function readNumber(input, max) {
    const raw = input.value.trim();
    if (raw === "") return { ok: true, value: null };
    const n = Number(raw);
    if (!isFinite(n) || n < 0 || (max !== undefined && n > max)) return { ok: false };
    return { ok: true, value: n };
  }
  function saveText(field, input) {
    getCtx().update(function (d) { d.settings[field] = input.value.trim(); }, "Changed the " + TEXT_LABELS[field]);
  }
  function saveWeekStarts(input) {
    getCtx().update(function (d) { d.settings.weekStarts = Number(input.value) === 0 ? 0 : 1; }, "Changed the first day of the week");
  }
  function saveMoney(field, input) {
    const ctx = getCtx(), got = readNumber(input);
    if (!got.ok) { ctx.toast("Use a number of pounds, or leave it empty"); draw(); return; }
    ctx.update(function (d) { d.settings[field] = got.value > 0 ? got.value : null; }, "Changed the " + MONEY[field].label);
  }
  function savePlatformTarget(key, input) {
    const ctx = getCtx(), got = readNumber(input), p = M.platform(key);
    if (!got.ok) { ctx.toast("Use a number of pounds, or leave it empty"); draw(); return; }
    ctx.update(function (d) {
      if (got.value > 0) d.settings.platformTargets[key] = got.value; else delete d.settings.platformTargets[key];
    }, "Changed the " + p.short + " target");
  }
  function saveResult(field, input) {
    const ctx = getCtx();
    if (field === "name" || field === "plural") {
      ctx.update(function (d) { d.settings.result[field] = input.value.trim(); }, "Changed what a result is called").then(draw);
      return;
    }
    if (field === "kind") {
      const kind = input.value;
      ctx.update(function (d) {
        d.settings.result.kind = kind;
        if (kind === "sale") { d.settings.result.worth = null; d.settings.result.closeRate = null; }
      }, "Changed what a result is").then(draw);
      return;
    }
    const got = readNumber(input, field === "closeRate" ? 100 : undefined);
    if (!got.ok) { ctx.toast(field === "closeRate" ? "Use a number from 0 to 100" : "Use a number of pounds, or leave it empty"); draw(); return; }
    ctx.update(function (d) {
      d.settings.result[field] = got.value === null ? null : field === "closeRate" ? got.value / 100 : got.value;
    }, field === "closeRate" ? "Changed how many become customers" : "Changed what a new customer is worth");
  }

  // A season row's boxes are read together and saved as one season
  function saveSeason(row) {
    const i = Number(row.getAttribute("data-season")), g = function (part) { return row.querySelector('[data-season-part="' + part + '"]'); };
    const pad = function (v) { return String(v).padStart(2, "0"); };
    const day = function (part) { return Math.min(31, Math.max(1, parseInt(g(part).value, 10) || 1)); };
    const season = { label: g("label").value.trim(), from: g("from-m").value + "-" + pad(day("from-d")), to: g("to-m").value + "-" + pad(day("to-d")) };
    getCtx().update(function (d) { d.settings.seasons[i] = season; }, "Changed the season " + (season.label || "")).then(draw);
  }
  function addSeason() {
    getCtx().update(function (d) { d.settings.seasons.push({ label: "", from: "01-01", to: "01-31" }); }, "Added a season").then(draw);
  }
  function removeSeason(i) {
    getCtx().update(function (d) { d.settings.seasons.splice(i, 1); }, "Removed a season").then(draw);
  }

  function init(getContext) {
    getCtx = getContext;
    dlg = document.getElementById("settingsDialog");
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
      else if (e.target.closest("[data-season-add]")) addSeason();
      else if (e.target.closest("[data-season-remove]")) removeSeason(Number(e.target.closest("[data-season-remove]").getAttribute("data-season-remove")));
    });
    dlg.addEventListener("change", function (e) {
      const el = e.target;
      if (el.hasAttribute("data-season-part")) saveSeason(el.closest("[data-season]"));
      else if (el.hasAttribute("data-setting")) {
        const field = el.getAttribute("data-setting");
        if (field === "weekStarts") saveWeekStarts(el); else saveText(field, el);
      } else if (el.hasAttribute("data-money")) saveMoney(el.getAttribute("data-money"), el);
      else if (el.hasAttribute("data-platform-target")) savePlatformTarget(el.getAttribute("data-platform-target"), el);
      else if (el.hasAttribute("data-result")) saveResult(el.getAttribute("data-result"), el);
    });
  }
  function open() { draw(); dlg.showModal(); }
  // Called by the app after every data change; leaves the boxes alone while the person is typing in one
  function refresh() { if (dlg.open && !typingInside()) draw(); }

  window.AD.settings = { init: init, open: open, refresh: refresh };
})();
