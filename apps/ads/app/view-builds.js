/*
  NEW CAMPAIGNS: the campaigns Claude has drafted and built
  ---------------------------------------------------------
  Cards in 4 groups: Waiting for you (drafts to read and approve), Ready to build (approved), Switch it
  on (built and switched off, waiting for you) and Running (the last 8 you switched on). A click opens the
  campaign panel, where it is edited, approved, built and switched on.

  Claude drafts and builds them switched off. Switching one on is always the owner's click: for Meta
  the Switch it on button and a yes in the pop-up, for Google in Google Ads. The page says so at the top.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const M = window.AD.model;

  const GROUPS = [
    { key: "waiting", label: "Waiting for you", hint: "Claude wrote these. Read each one, change what you like, then approve it." },
    { key: "ready", label: "Ready to build", hint: "You approved these. Ask Claude to build them, switched off." },
    { key: "switchOn", label: "Switch it on", hint: "Built and switched off. Nothing is spending. Switch each one on when you are ready." },
    { key: "running", label: "Running", hint: "The last 8 you switched on." }
  ];

  function todayOf(ctx) { return typeof ctx.today === "function" ? ctx.today() : (ctx.today || ui.isoDate()); }
  function wanted(ctx, b) { return !ctx.platform || ctx.platform === "all" || b.platform === ctx.platform; }

  // Where a build stands, in a few plain words, for the line under its name
  function standing(b) {
    const m = M.platform(b.platform);
    if (b.status === "draft") return "Draft. Nothing is built.";
    if (b.status === "approved") return "Approved. Not built yet.";
    if (b.status === "building") return "Claude is building it, switched off.";
    if (b.status === "in-account") return "Switched off in your account. Switch it on in " + (m ? m.managerName : "your ad account") + ".";
    if (b.status === "ready-to-import") return "Import file ready. It arrives switched off.";
    if (b.status === "live") return b.switchedOnAt ? "You switched it on " + M.dayLabel(M.localDay(b.switchedOnAt)) + "." : "You switched it on.";
    return "";
  }
  function dates(b) {
    if (b.budget.start && b.budget.end) return M.rangeLabel(b.budget.start, b.budget.end);
    if (b.budget.start) return "From " + M.shortDate(b.budget.start);
    return "No dates yet";
  }

  function card(ctx, b) {
    const C = window.AD.components, id = esc(b.id), checks = M.buildChecks(ctx.data, b, todayOf(ctx));
    const flags = (!checks.budget.ok && !checks.budget.missing ? '<span class="chip chip--danger">Over your limit</span>' : "") +
      (checks.season && !checks.season.ok ? '<span class="chip chip--danger">Out of season</span>' : "") +
      (checks.budget.missing ? '<span class="chip chip--warning">No budget yet</span>' : "");
    const open = b.checks.filter(function (c) { return !c.done; }).length;
    return '<li><button type="button" class="card bld-card" data-build="' + id + '">' +
      '<span class="bld-card__top">' + C.platformTag(b.platform) + C.buildPill(b.status) + "</span>" +
      '<span class="bld-card__name">' + esc(b.name || "Untitled campaign") + "</span>" +
      (b.objective ? '<span class="bld-card__goal">For ' + esc(b.objective) + "</span>" : "") +
      '<span class="bld-card__facts"><span>' + (b.budget.daily ? esc(M.money(b.budget.daily)) + " a day" : "No daily budget") + "</span><span>" + esc(dates(b)) + "</span><span>" +
        b.ads.length + (b.ads.length === 1 ? " ad" : " ads") + "</span></span>" +
      '<span class="bld-card__standing">' + esc(standing(b)) + "</span>" +
      (flags || open ? '<span class="bld-card__flags">' + flags + (open ? '<span class="chip">' + open + (open === 1 ? " thing to check" : " things to check") + "</span>" : "") + "</span>" : "") +
      "</button></li>";
  }

  function group(ctx, g, list) {
    if (!list.length) return "";
    return '<section class="bld-group"><div class="bld-group__head"><h2 class="bld-group__title">' + g.label + ' <span class="bld-group__count">' + list.length + '</span></h2><p class="bld-group__hint">' + esc(g.hint) + '</p></div><ul class="bld-grid">' +
      list.map(function (b) { return card(ctx, b); }).join("") + "</ul></section>";
  }

  // The groups with the platform filter applied
  function groupsFor(ctx) {
    const all = M.buildGroups(ctx.data), out = {};
    Object.keys(all).forEach(function (k) { out[k] = all[k].filter(function (b) { return wanted(ctx, b); }); });
    return out;
  }
  // Builds waiting on the owner: drafts, approved and waiting to be switched on
  function waitingCount(ctx, groups) {
    if (!ctx.platform || ctx.platform === "all") return M.todo(ctx.data, todayOf(ctx)).builds;
    return groups.waiting.length + groups.ready.filter(function (b) { return b.status === "approved"; }).length + groups.switchOn.length;
  }

  AD.views.builds = {
    title: "New campaigns",
    line: function (ctx) {
      const n = waitingCount(ctx, groupsFor(ctx));
      return n ? n + (n === 1 ? " campaign" : " campaigns") + " waiting on you" : "Nothing waiting on you";
    },
    render: function (root, ctx) {
      const C = window.AD.components, groups = groupsFor(ctx), n = waitingCount(ctx, groups);
      const any = GROUPS.some(function (g) { return groups[g.key].length; });
      const lead = '<div class="bld-lead"><p class="bld-lead__text">Claude drafts and builds campaigns switched off. You approve each one. Nothing changes in your ad account until you press the button and say yes.</p>' +
        '<span class="chip ' + (n ? "chip--accent" : "") + ' bld-lead__count" aria-live="polite">' + (n ? n + " waiting on you" : "Nothing waiting") + "</span></div>";
      const body = any ? GROUPS.map(function (g) { return group(ctx, g, groups[g.key]); }).join("") :
        C.emptyState("No new campaigns yet", "Press New campaign above and say what it is for. Claude drafts it here for you to read. Nothing is built until you approve it, and nothing is switched on until you say yes.");
      root.innerHTML = '<div class="bld-page">' + lead + body + "</div>";
      root.onclick = function (e) {
        const b = e.target.closest("[data-build]");
        if (b) ctx.openDrawer("build", b.getAttribute("data-build"));
      };
    }
  };
})();
