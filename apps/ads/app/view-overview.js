/*
  OVERVIEW: how the ads are doing, at a glance
  --------------------------------------------
  From the top: what is waiting on the owner, 5 tiles (spend, results, cost per result with its traffic light,
  return on ad spend, pace this month), a card for each platform, and the 12 week trend. The date range and
  platform come from the rail (ctx.range and ctx.platform). Every number is worked out by AD.model from the
  raw figures; nothing here is typed by Claude. Buttons that do something carry data-action (app.js) or
  data-go (a page to move to).
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  const TREND_WEEKS = 12;
  // What the change is measured against, for each range on the rail
  const AGAINST = { week: "the same days last week", "4weeks": "the 4 weeks before", month: "the same days last month", "12weeks": "the 12 weeks before" };

  function counted(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function filter(ctx, from, to) { return { from: from, to: to, platform: ctx.platform }; }
  // The target for what is on show: the platform's own, else the shared one
  function targetFor(ctx) { return M.targetFor(ctx.data, ctx.platform === "all" ? null : ctx.platform); }
  function cap(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

  // ---------- Waiting on you ----------
  function waiting(ctx) {
    const t = M.todo(ctx.data, ctx.today());
    const items = [];
    if (t.breaches.count) items.push({ go: "health", icon: "alert", text: counted(t.breaches.count, "spending limit", "spending limits") + " passed", warn: true });
    // Everything on the To do tab, Claude's list and yours, is one button, so it never overlaps another count
    const list = M.todoList(ctx.data, ctx.today()), all = list.claude.length + list.you.length;
    if (all) items.push({ go: "todo", icon: "checkSquare", text: counted(all, "thing", "things") + " on your To do list" });
    if (!items.length) return '<p class="waiting-none">' + icon("check") + "Nothing is waiting on you.</p>";
    return '<section class="waiting" aria-label="Waiting on you"><h2 class="waiting__title">Waiting on you</h2><div class="waiting__items">' +
      items.map(function (it) {
        return '<button type="button" class="wchip' + (it.warn ? " wchip--warn" : "") + '" data-go="' + it.go + '">' + icon(it.icon) + "<span>" + esc(it.text) + "</span>" + icon("chevronRight", "wchip__arrow") + "</button>";
      }).join("") + "</div></section>";
  }

  // ---------- The tiles ----------
  function tile(label, value, lines, mod) {
    return '<div class="tile' + (mod ? " tile--" + mod : "") + '"><span class="tile__label">' + esc(label) + '</span><span class="tile__value num">' + value + "</span>" +
      lines.filter(Boolean).map(function (l) { return '<span class="tile__line">' + l + "</span>"; }).join("") + "</div>";
  }

  function tiles(ctx) {
    const data = ctx.data, C = AD.components, r = ctx.range;
    const now = M.rangeTotals(data, filter(ctx, r.from, r.to)), before = M.rangeTotals(data, filter(ctx, r.prevFrom, r.prevTo));
    now.historyDays = M.historyDays(data, { platform: ctx.platform }, r.to);
    const target = targetFor(ctx), l = M.light(now, target), roas = M.roas(data, now), real = M.realReturn(data, filter(ctx, r.from, r.to));
    const against = '<span class="muted">on ' + esc(AGAINST[r.key]) + "</span>";
    const p = M.pace(data, ctx.today());
    const paceLine = p.budget ? "of " + M.money(p.budget) + " this month" : "this month";
    const paceNote = p.budget ? '<span class="pace-note pace-note--' + p.state + '">Heading for ' + M.money(p.projected) + " by the month end</span>" : '<span class="muted">Set a monthly budget in Settings to see the pace.</span>';
    const cost = M.costLabel(data);
    return '<div class="tiles">' +
      tile("Spend", M.money(now.spend), [C.delta(M.change(now.spend, before.spend), "") + " " + against]) +
      tile(cap(M.resultPlural(data)), M.num(now.results), [C.delta(M.change(now.results, before.results), "up") + " " + against]) +
      tile(cost, M.money(now.costPerResult), [target ? "Target " + M.money(target) : '<span class="muted">No target set</span>', C.lightPill(l), C.delta(M.change(now.costPerResult, before.costPerResult), "down") + " " + against], "cost") +
      tile("Return on ad spend", roas ? M.money(roas.ratio) + '<span class="tile__unit"> back for every ' + esc(M.symbol(data)) + "1</span>" : "-",
        [roas && roas.estimated ? '<span class="chip chip--info" title="Worked out from what a new customer is worth and how many results become customers">estimated</span>' : roas ? '<span class="muted">as the platforms report it</span>' : '<span class="muted">' + esc(M.roasReason(data, now) || "Add what a new customer is worth in Settings") + "</span>",
          real && real.ratio !== null ? '<span class="tile__real">' + esc(M.roasText({ ratio: real.ratio, estimated: false }, data)) + ' <span class="muted">from customers you’ve won</span></span>' : ""]) +
      tile("Pace this month", M.money(p.spent), ['<span class="muted">' + esc(paceLine) + "</span>", paceNote]) + "</div>";
  }

  // ---------- A card for each platform ----------
  function figure(label, value) { return '<div class="pfig"><dt>' + esc(label) + '</dt><dd class="num">' + value + "</dd></div>"; }

  function platformCards(ctx) {
    const C = AD.components, data = ctx.data, r = ctx.range;
    const rows = M.byPlatform(data, r).filter(function (p) { return ctx.platform === "all" || p.key === ctx.platform; });
    if (!rows.length) return "";
    const cards = rows.map(function (p) {
      const t = p.totals, roas = M.roas(data, t);
      return '<article class="pcard2"><header class="pcard2__head">' + C.platformTag(p.key) + '<h3 class="pcard2__name">' + esc(p.platform.label) + "</h3>" + C.lightPill(p.light) + "</header>" +
        '<dl class="pfigs">' + figure("Spend", M.money(t.spend)) + figure(cap(M.resultPlural(data)), M.num(t.results)) +
        figure(M.costLabel(data), M.money(t.costPerResult)) + figure("Return", roas ? M.money(roas.ratio) + " for " + esc(M.symbol(data)) + "1" + (roas.estimated ? " (est.)" : "") : '<span title="' + esc(M.roasReason(data, t)) + '">-</span>') + "</dl>" +
        '<p class="pcard2__target">' + (p.target ? "Target " + M.money(p.target) + " per " + esc(M.resultName(data)) : "No target set") + (p.on ? "" : " · Switched off") + "</p></article>";
    }).join("");
    return '<section class="ovsection"><h2 class="ovsection__title">By platform</h2><div class="pcards">' + cards + "</div>" + (rows.length > 1 ? C.countingNote() : "") + "</section>";
  }

  // ---------- The 12 week trend ----------
  function trendCard(ctx) {
    const data = ctx.data, word1 = M.resultName(data);
    const weeks = M.weeks(data, TREND_WEEKS, ctx.today(), { platform: ctx.platform }), target = targetFor(ctx);
    const has = weeks.some(function (w) { return w.hasFigures; });
    const body = has ? '<div class="chart-slot" data-chart="trend"></div>' + '<ul class="legend" aria-hidden="true"><li><i class="sw sw--bar"></i>Spend</li><li><i class="sw sw--line"></i>' + esc(M.costLabel(data)) + "</li>" +
      (target ? '<li><i class="sw sw--target"></i>Your target</li>' : "") + '<li class="legend__note">Dashed bar: this week so far</li></ul>' :
      AD.components.emptyState("Nothing to draw yet", "Each week’s spend and cost per " + word1 + " show here once Claude has copied your figures in.");
    return { html: '<section class="card trend-card"><div class="trend-card__head"><h2 class="ovsection__title">The last ' + TREND_WEEKS + " weeks</h2></div>" + body + "</section>", weeks: weeks, target: target, has: has };
  }

  AD.views.overview = {
    title: "Overview",
    line: function (ctx) {
      const t = M.rangeTotals(ctx.data, filter(ctx, ctx.range.from, ctx.range.to));
      if (!M.hasFigures(ctx.data)) return "No figures yet";
      return ctx.range.label + ": " + M.money(t.spend) + " spent, " + M.num(t.results) + " " + (t.results === 1 ? M.resultName(ctx.data) : M.resultPlural(ctx.data));
    },
    render: function (root, ctx) {
      root.onclick = function (e) {
        const go = e.target.closest("[data-go]");
        if (go) ctx.go(go.getAttribute("data-go"));
      };
      if (!M.hasFigures(ctx.data)) {
        root.innerHTML = '<div class="page ov-page">' + waiting(ctx) + '<section class="panel nofigures"><h2>' + "No figures yet" + "</h2><p class=\"muted\">" + esc(M.COPY.noFigures) + "</p>" +
          '<div class="setup-card__actions"><button type="button" class="btn btn--primary" data-action="refresh-figures">' + icon("refresh") + "Refresh figures</button></div></section></div>";
        return;
      }
      const trend = trendCard(ctx);
      root.innerHTML = '<div class="page ov-page">' + waiting(ctx) + tiles(ctx) + platformCards(ctx) + trend.html + "</div>";
      const slot = root.querySelector('[data-chart="trend"]');
      if (slot) slot.innerHTML = AD.charts.trend(trend.weeks, trend.target, { width: Math.max(280, Math.min(760, slot.clientWidth || 640)), word: M.resultName(ctx.data), plural: M.resultPlural(ctx.data) });
    }
  };
})();
