/*
  PLATFORMS: where the owner posts
  --------------------------------
  One card for every platform in CM.model.PLATFORMS. Switch one on, add the handle and link, and say
  how many posts a week it should get. Changes save when a box is left, not on every keystroke.
*/
(function () {
  "use strict";

  window.CM = window.CM || {};
  CM.views = CM.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc;

  const DEFAULT_PER_WEEK = 2;
  const MAX_PER_WEEK = 14;

  function weeklyPlan(data, M) {
    const on = M.onPlatforms(data), total = M.weeklyTarget(data);
    if (!on.length) return "Switch on the platforms you post to and the plan is worked out here.";
    return "Your plan is " + total + (total === 1 ? " post" : " posts") + " a week across " + on.length + (on.length === 1 ? " platform." : " platforms.");
  }

  function card(p, data, posted) {
    const C = window.CM.components;
    const cfg = data.platforms[p.key] || blank();
    const key = esc(p.key);
    const fields = cfg.on ?
      '<div class="plat-fields"><label class="field"><span class="field__label">Your handle</span><input class="input" data-field="handle" maxlength="80" value="' + esc(cfg.handle) + '" placeholder="@yourbusiness"></label>' +
      '<label class="field"><span class="field__label">Link to your page</span><input class="input" data-field="url" maxlength="300" value="' + esc(cfg.url) + '" placeholder="https://"></label>' +
      '<label class="field plat-fields__week"><span class="field__label">Posts a week</span><input class="input num" type="number" data-field="perWeek" min="0" max="' + MAX_PER_WEEK + '" step="1" value="' + esc(cfg.perWeek) + '"></label></div>' +
      '<p class="plat-posted">Posted this month: <strong>' + posted + "</strong></p>" : "";
    return '<article class="card plat-card' + (cfg.on ? " is-on" : "") + '" data-platform="' + key + '"><div class="plat-card__head"><span class="plat-card__name">' + C.platformTag(p.key) + "<h3>" + esc(p.label) + "</h3></span>" +
      '<label class="switch"><input type="checkbox" data-field="on" aria-label="Post to ' + esc(p.label) + '"' + (cfg.on ? " checked" : "") + '><span class="switch__track"></span></label></div>' +
      (cfg.recommended ? '<p class="plat-why"><span class="chip chip--accent">Recommended for you</span>' + (cfg.why ? " " + esc(cfg.why) : "") + "</p>" : "") +
      fields + "</article>";
  }

  function blank() { return { on: false, handle: "", url: "", perWeek: DEFAULT_PER_WEEK, recommended: false, why: "" }; }

  function save(ctx, key, field, input) {
    const label = ctx.model.platform(key).label;
    let value, what;
    if (field === "on") { value = input.checked; what = (value ? "Switched on " : "Switched off ") + label; }
    else if (field === "perWeek") {
      value = Number(input.value);
      if (input.value === "" || !Number.isInteger(value) || value < 0 || value > MAX_PER_WEEK) { ctx.toast("Posts a week is a whole number from 0 to " + MAX_PER_WEEK); ctx.go("platforms"); return; }
      what = "Set " + label + " to " + value + " posts a week";
    } else { value = input.value.trim(); what = "Changed the " + (field === "url" ? "link" : "handle") + " for " + label; }
    ctx.update(function (d) {
      const cfg = d.platforms[key] || (d.platforms[key] = blank());
      cfg[field] = value;
    }, what);
  }

  CM.views.platforms = {
    title: "Platforms",
    line: function (ctx) { return weeklyPlan(ctx.data, ctx.model); },
    render: function (root, ctx) {
      const M = ctx.model;
      const posted = M.postedCounts(ctx.data, ctx.today());
      root.innerHTML = '<div class="plat-page"><p class="plat-plan">' + esc(weeklyPlan(ctx.data, M)) + '</p><div class="plat-grid">' +
        M.PLATFORMS.map(function (p) { return card(p, ctx.data, posted[p.key] || 0); }).join("") + "</div></div>";
      root.onchange = function (e) {
        const field = e.target.getAttribute("data-field");
        if (field) save(ctx, e.target.closest(".plat-card").getAttribute("data-platform"), field, e.target);
      };
    }
  };
})();
