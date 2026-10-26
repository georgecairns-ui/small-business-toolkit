/*
  HEALTH CHECK: how the content machine is doing
  ----------------------------------------------
  6 checks, each Healthy, Watch or Needs action, with the value and the target beside it, and a bar
  chart of posts put out each week against the target. Every number is worked out by CM.model.health
  and CM.model.weeklyPosted from the data; nothing here is typed by Claude. The kit doesn't read
  platform stats, so reach and engagement are not shown, and the page says so.
*/
(function () {
  "use strict";

  window.CM = window.CM || {};
  CM.views = CM.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;

  const CHART_WEEKS = 8;
  const STATE_ICON = { ok: "check", warn: "info", bad: "alert" };
  const SUMMARY = {
    ok: "Everything is on track.",
    warn: "A few things are worth keeping an eye on.",
    bad: "Some things need action."
  };

  function pill(state, M) {
    return '<span class="hpill hpill--' + state + '">' + icon(STATE_ICON[state]) + esc(M.HEALTH_LABELS[state]) + "</span>";
  }

  function checkCard(c, M) {
    return '<li class="hcheck hcheck--' + c.state + '"><div class="hcheck__top">' + pill(c.state, M) + '</div>' +
      '<h3 class="hcheck__label">' + esc(c.label) + "</h3>" +
      '<p class="hcheck__value num">' + esc(c.valueText) + "</p>" +
      '<p class="hcheck__target">Target: ' + esc(c.targetText) + "</p>" +
      '<p class="hcheck__hint">' + esc(c.hint) + "</p></li>";
  }

  function head(checks, M) {
    const overall = M.healthOverall(checks), healthy = checks.filter(function (c) { return c.state === "ok"; }).length;
    return '<header class="health-head">' + pill(overall, M) + '<p class="health-head__text"><strong>' + esc(SUMMARY[overall]) + "</strong> " +
      healthy + " of " + checks.length + " checks are healthy.</p></header>";
  }

  // ---------- The chart: one bar for each week, the target as a dashed line ----------
  function axisLabel(iso) {
    const d = ui.parseDate(iso);
    return "<span>" + d.getDate() + "</span><span>" + esc(d.toLocaleDateString("en-GB", { month: "short" })) + "</span>";
  }
  function percent(n, top) { return Math.round(n / top * 100) + "%"; }

  function chart(weeks, target) {
    const top = Math.max(target, 1, Math.max.apply(null, weeks.map(function (w) { return w.posted; })));
    const last = weeks.length - 1;
    const spoken = weeks.map(function (w) { return "week of " + ui.parseDate(w.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ": " + w.posted; }).join(", ");
    const cols = weeks.map(function (w, i) {
      const kind = i === last ? "now" : target && w.posted >= target ? "hit" : "low";
      return '<div class="hchart__col"><span class="hchart__val num" style="--h:' + percent(w.posted, top) + '">' + w.posted + "</span>" +
        '<span class="hchart__bar hchart__bar--' + kind + '" style="--h:' + percent(w.posted, top) + '"></span></div>';
    }).join("");
    return '<figure class="hchart" role="img" aria-label="' + esc("Posts each week. " + spoken.charAt(0).toUpperCase() + spoken.slice(1)) + '">' +
      '<div class="hchart__plot">' + (target ? '<span class="hchart__target" style="--h:' + percent(target, top) + '"><span>Target ' + target + "</span></span>" : "") +
        '<div class="hchart__cols">' + cols + "</div></div>" +
      '<div class="hchart__axis">' + weeks.map(function (w, i) { return '<div class="hchart__tick' + (i === last ? " is-now" : "") + '">' + axisLabel(w.start) + "</div>"; }).join("") + "</div></figure>";
  }

  function chartPanel(ctx) {
    const C = window.CM.components, M = ctx.model;
    const weeks = M.weeklyPosted(ctx.data, ctx.today(), CHART_WEEKS), target = M.weeklyTarget(ctx.data);
    const body = weeks.some(function (w) { return w.posted > 0; }) ? chart(weeks, target) :
      C.emptyState("Nothing posted yet", "Each time you press I’ve posted it, that week’s bar grows.");
    const how = target ?
      "Each bar is the posts you put out that week, week by week. The dashed line is your target of " + target + " a week. The last bar is this week so far." :
      "Switch on a platform in Platforms to set a weekly target. Each bar is the posts you put out that week.";
    return '<section class="card health-chart"><h2 class="health-section">Posts put out each week</h2><p class="health-how">' + esc(how) + "</p>" + body + "</section>";
  }

  CM.views.health = {
    title: "Health check",
    line: function (ctx) {
      const checks = ctx.model.health(ctx.data, ctx.today()), n = checks.filter(function (c) { return c.state !== "ok"; }).length;
      return n ? n + (n === 1 ? " check needs a look" : " checks need a look") : "Everything is on track";
    },
    render: function (root, ctx) {
      const M = ctx.model, checks = M.health(ctx.data, ctx.today());
      root.innerHTML = '<div class="health-page">' + head(checks, M) +
        '<ul class="hchecks">' + checks.map(function (c) { return checkCard(c, M); }).join("") + "</ul>" + chartPanel(ctx) +
        '<p class="health-note">Reach and engagement numbers come later, once Claude can read your platform stats.</p></div>';
    }
  };
})();
