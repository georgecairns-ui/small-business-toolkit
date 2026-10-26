/*
  SETTINGS: the business words and the defaults, in a pop-up
  ----------------------------------------------------------
  Opened by the gear on the rail (and the gear in the sidebar). Everything saves as soon as a box is
  left. Themes are the 3 to 5 subjects Claude rotates between when it plans posts. Renaming a theme
  renames it on the posts and ideas that use it. Every save goes through ctx.update().
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]';

  const WEEK_STARTS = [{ value: 1, label: "Monday" }, { value: 0, label: "Sunday" }];
  const PLAN_WEEKS = [1, 2, 3, 4];
  const MIN_THEMES = 3, MAX_THEMES = 5;
  const SETTING_LABELS = {
    businessName: "business name", ownerName: "first name", postsPerWeek: "posts a week", planWeeks: "weeks to plan",
    defaultApproval: "approval setting", defaultTime: "usual posting time", weekStarts: "first day of the week"
  };
  const NUMBER_SETTINGS = { postsPerWeek: [1, 21], planWeeks: [1, 4], weekStarts: [0, 1] };

  let getCtx = null, dlg = null;

  function options(list, selected) {
    return list.map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(selected) ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("");
  }
  function themeRow(name, i) {
    return '<li class="prefs-theme"><input class="input" data-theme="' + i + '" maxlength="40" value="' + esc(name) + '" aria-label="Theme name">' +
      '<button type="button" class="icon-btn" data-set="theme-remove" data-theme="' + i + '" aria-label="Remove ' + esc(name) + '">' + icon("trash") + "</button></li>";
  }
  function themeHint(n) {
    if (n < MIN_THEMES) return "Add " + (MIN_THEMES - n) + " more. 3 to 5 themes keeps your posts varied.";
    if (n > MAX_THEMES) return "That is a lot. 3 to 5 themes keeps your posts varied.";
    return "3 to 5 themes keeps your posts varied.";
  }
  function section(title, intro, body) {
    return '<section class="prefs-section"><h3 class="prefs-section__title">' + title + "</h3>" + (intro ? '<p class="prefs-hint">' + intro + "</p>" : "") + body + "</section>";
  }

  function form(s) {
    const text = function (field, label, ph) {
      return '<label class="field"><span class="field__label">' + label + '</span><input class="input" data-setting="' + field + '" maxlength="80" value="' + esc(s[field]) + '" placeholder="' + esc(ph) + '"></label>';
    };
    return section("About you", "", '<div class="field-row">' + text("businessName", "Business name", "Fern & Finch") + text("ownerName", "Your first name", "Sam") + "</div>") +
      section("How Claude plans", "Claude uses these every time it plans or writes posts.",
        '<div class="prefs-grid"><label class="field"><span class="field__label">Posts a week</span><input class="input num" type="number" data-setting="postsPerWeek" min="1" max="21" step="1" value="' + esc(s.postsPerWeek) + '"></label>' +
        '<label class="field"><span class="field__label">Weeks to plan at a time</span><select class="select" data-setting="planWeeks">' + options(PLAN_WEEKS.map(function (n) { return { value: n, label: n + (n === 1 ? " week" : " weeks") }; }), s.planWeeks) + "</select></label>" +
        '<label class="field"><span class="field__label">New posts are</span><select class="select" data-setting="defaultApproval">' + options([{ value: "ask", label: "Ask me first" }, { value: "auto", label: "Automatic" }], s.defaultApproval) + '</select><span class="field__hint">Claude never posts for you either way.</span></label>' +
        '<label class="field"><span class="field__label">Usual posting time</span><input class="input" type="time" data-setting="defaultTime" value="' + esc(s.defaultTime) + '"></label>' +
        '<label class="field"><span class="field__label">Your week starts on</span><select class="select" data-setting="weekStarts">' + options(WEEK_STARTS, s.weekStarts) + "</select></label></div>") +
      section("Themes", "The subjects you post about. Claude mixes them so no feed gets samey.",
        '<ul class="prefs-themes">' + s.themes.map(themeRow).join("") + '</ul><p class="prefs-hint">' + esc(themeHint(s.themes.length)) + "</p>" +
        '<div class="prefs-theme"><input class="input" data-theme-new maxlength="40" placeholder="Real work" aria-label="New theme"><button type="button" class="btn" data-set="theme-add">' + icon("plus") + "Add theme</button></div>");
  }

  // Draws the pop-up again from the saved settings, keeping the scroll position and which control had focus
  function draw() {
    const body = dlg.querySelector(".modal__body");
    const scroll = body ? body.scrollTop : 0;
    const at = Array.prototype.indexOf.call(dlg.querySelectorAll(FOCUSABLE), document.activeElement);
    dlg.innerHTML = '<div class="modal__head"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + '</button></div>' +
      '<div class="modal__body">' + form(getCtx().data.settings) + "</div>" +
      '<div class="modal__foot"><span class="prefs-hint">Changes save as you go.</span><span class="spacer"></span><button type="button" class="btn btn--primary" data-close>Done</button></div>';
    dlg.querySelector(".modal__body").scrollTop = scroll;
    const again = dlg.querySelectorAll(FOCUSABLE);
    if (at > -1 && again[at]) again[at].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && dlg.contains(a) && (a.tagName === "INPUT" && /text|number|time/.test(a.type));
  }

  // ---------- Saving ----------
  function saveSetting(field, input) {
    const ctx = getCtx();
    let value = input.value.trim();
    if (NUMBER_SETTINGS[field]) {
      const range = NUMBER_SETTINGS[field];
      value = Number(value);
      if (input.value === "" || !Number.isInteger(value) || value < range[0] || value > range[1]) { ctx.toast("Use a whole number from " + range[0] + " to " + range[1]); draw(); return; }
    }
    if (field === "defaultTime" && !value) { ctx.toast("Pick a time"); draw(); return; }
    ctx.update(function (d) { d.settings[field] = value; }, "Changed the " + SETTING_LABELS[field]);
  }
  function renameTheme(index, input) {
    const ctx = getCtx(), next = input.value.trim(), old = ctx.data.settings.themes[index];
    if (next === old) return;
    if (!next) { ctx.toast("A theme needs a name. Use the bin to remove it"); draw(); return; }
    if (ctx.data.settings.themes.indexOf(next) !== -1) { ctx.toast("You already have a theme called " + next); draw(); return; }
    ctx.update(function (d) {
      d.settings.themes[index] = next;
      d.posts.concat(d.ideas).forEach(function (x) { if (x.theme === old) x.theme = next; });
    }, "Renamed the theme " + old + " to " + next);
  }
  function addTheme(input) {
    const ctx = getCtx(), name = input.value.trim();
    if (!name) { ctx.toast("Type a theme first"); return; }
    if (ctx.data.settings.themes.indexOf(name) !== -1) { ctx.toast("You already have a theme called " + name); return; }
    ctx.update(function (d) { d.settings.themes.push(name); }, "Added the theme " + name).then(draw);
  }
  function removeTheme(index) {
    const ctx = getCtx(), name = ctx.data.settings.themes[index];
    ctx.update(function (d) { d.settings.themes.splice(index, 1); }, "Removed the theme " + name).then(function () {
      draw();
      ctx.toast("Removed " + name, function () {
        getCtx().update(function (d) { d.settings.themes.splice(index, 0, name); }, "Brought back the theme " + name);
      });
    });
  }

  function init(getContext) {
    getCtx = getContext;
    dlg = document.getElementById("settingsDialog");
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-close]")) { dlg.close(); return; }
      const b = e.target.closest("[data-set]");
      if (!b) return;
      if (b.getAttribute("data-set") === "theme-add") addTheme(dlg.querySelector("[data-theme-new]"));
      else removeTheme(Number(b.getAttribute("data-theme")));
    });
    dlg.addEventListener("change", function (e) {
      const el = e.target;
      if (el.hasAttribute("data-setting")) saveSetting(el.getAttribute("data-setting"), el);
      else if (el.hasAttribute("data-theme")) renameTheme(Number(el.getAttribute("data-theme")), el);
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.hasAttribute("data-theme-new")) { e.preventDefault(); addTheme(e.target); }
    });
  }
  function open() { draw(); dlg.showModal(); }
  // Called by the app after every data change; leaves the boxes alone while the person is typing in one
  function refresh() { if (dlg.open && !typingInside()) draw(); }

  window.CM.settings = { init: init, open: open, refresh: refresh };
})();
