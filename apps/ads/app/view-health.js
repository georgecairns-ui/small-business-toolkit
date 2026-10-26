/*
  HEALTH CHECK: how the ads are doing, as 6 checks
  ------------------------------------------------
  Each check is Healthy, Watch or Needs action, with the value and the target beside it, and below them
  a bar chart of results for each of the last 8 weeks. Every number is worked out by AD.model.health and
  AD.model.weeks from the raw figures; nothing here is typed by Claude. The page ends by saying what Claude
  does and doesn't do in the ad accounts.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  const CHART_WEEKS = 8;
  const STATE_ICON = { ok: "check", warn: "info", bad: "alert" };
  const SUMMARY = {
    ok: "Everything is on track.",
    warn: "A few things are worth keeping an eye on.",
    bad: "Some things need action."
  };

  function pill(state) {
    return '<span class="hpill hpill--' + state + '">' + icon(STATE_ICON[state]) + esc(M.HEALTH_LABELS[state]) + "</span>";
  }

  function checkCard(c) {
    return '<li class="hcheck hcheck--' + c.state + '"><div class="hcheck__top">' + pill(c.state) + "</div>" +
      '<h3 class="hcheck__label">' + esc(c.label) + "</h3>" +
      '<p class="hcheck__value num">' + esc(c.valueText) + "</p>" +
      '<p class="hcheck__target">Target: ' + esc(c.targetText) + "</p>" +
      '<p class="hcheck__hint">' + esc(c.hint) + "</p></li>";
  }

  function head(checks) {
    const overall = M.healthOverall(checks), healthy = checks.filter(function (c) { return c.state === "ok"; }).length;
    return '<header class="health-head">' + pill(overall) + '<p class="health-head__text"><strong>' + esc(SUMMARY[overall]) + "</strong> " +
      healthy + " of " + checks.length + " checks are healthy.</p></header>";
  }

  function chartPanel(ctx) {
    const data = ctx.data, weeks = M.weeks(data, CHART_WEEKS, ctx.today()), plural = M.resultPlural(data);
    const has = weeks.some(function (w) { return w.results > 0; });
    const body = has ? '<div class="chart-slot" data-chart="results"></div>' :
      AD.components.emptyState("No " + plural + " yet", "Each week’s " + plural + " show here once Claude has copied your figures in.");
    return { weeks: weeks, has: has, html: '<section class="card health-chart"><h2 class="health-section">' + esc(plural.charAt(0).toUpperCase() + plural.slice(1)) + " each week</h2>" +
      '<p class="health-how">Each bar is one week, with the week’s start date underneath. The dashed bar is this week so far.</p>' + body + "</section>" };
  }

  AD.views.health = {
    title: "Health check",
    line: function (ctx) {
      const checks = M.health(ctx.data, ctx.today()), n = checks.filter(function (c) { return c.state !== "ok"; }).length;
      return n ? n + (n === 1 ? " check needs a look" : " checks need a look") : "Everything is on track";
    },
    render: function (root, ctx) {
      const checks = M.health(ctx.data, ctx.today()), chart = chartPanel(ctx);
      root.innerHTML = '<div class="health-page">' + head(checks) + '<ul class="hchecks">' + checks.map(checkCard).join("") + "</ul>" + chart.html +
        '<p class="health-note">' + esc(M.COPY.claudeReads) + "</p></div>";
      const slot = root.querySelector('[data-chart="results"]');
      if (slot) slot.innerHTML = AD.charts.bars(chart.weeks, { field: "results", label: M.resultPlural(ctx.data).charAt(0).toUpperCase() + M.resultPlural(ctx.data).slice(1), width: Math.max(280, Math.min(640, slot.clientWidth || 560)) });
    }
  };
})();
