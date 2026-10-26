/*
  CAMPAIGNS: every campaign that is in an ad account
  --------------------------------------------------
  A table with a traffic light, the campaign, where it runs, its status, spend, results, cost per
  result, return and how the cost changed against the range before. Click a column to sort, click a
  row to open the campaign. On a phone the table becomes a card for each campaign.

  Every figure comes from AD.model.byCampaign, so this page and the Overview always agree. Nothing here
  adds anything up, and nothing here changes a campaign: a change is only made from the campaign panel, after a pop-up and a yes.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  // What the person has chosen on this page. Kept between redraws.
  const state = { key: "spend", dir: -1 };
  const LIGHT_ORDER = { green: 0, amber: 1, red: 2, grey: 3 };
  const STATUS_ORDER = { on: 0, paused: 1, ended: 2 };

  // key, heading, whether a bigger number sorts first by default, and how to read the sort value
  const COLUMNS = [
    { key: "light", label: "Light", sort: function (r) { return LIGHT_ORDER[r.light.state]; }, text: true },
    { key: "name", label: "Campaign", sort: function (r) { return r.campaign.name.toLowerCase(); }, text: true },
    { key: "platform", label: "Where", sort: function (r) { return r.campaign.platform; }, text: true },
    { key: "status", label: "Status", sort: function (r) { return STATUS_ORDER[r.campaign.status]; }, text: true },
    { key: "spend", label: "Spend", sort: function (r) { return r.totals.spend; } },
    { key: "results", label: "Results", sort: function (r) { return r.totals.results; } },
    { key: "cost", label: "Cost per result", sort: function (r) { return r.totals.costPerResult; } },
    { key: "return", label: "Return", sort: function (r) { return r.roas ? r.roas.ratio : null; } },
    { key: "change", label: "Change in cost", sort: function (r) { return r.change.costPerResult; } }
  ];

  function todayOf(ctx) { return typeof ctx.today === "function" ? ctx.today() : (ctx.today || ui.isoDate()); }
  // The range the rail has chosen, with the platform filter added
  function rangeOf(ctx) {
    const r = ctx.range;
    const base = r && r.from ? r : M.rangeFor(typeof r === "string" ? r : (r && r.key) || "4weeks", todayOf(ctx), M.weekStartsOf(ctx.data));
    return Object.assign({}, base, { platform: ctx.platform || "all" });
  }

  // Rows in the order chosen. A figure that doesn't exist (no results, so no cost) always goes last.
  function sorted(rows) {
    const col = COLUMNS.find(function (c) { return c.key === state.key; }) || COLUMNS[4];
    return rows.slice().sort(function (a, b) {
      const x = col.sort(a), y = col.sort(b);
      if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
      if (y === null || y === undefined) return -1;
      const order = x < y ? -1 : x > y ? 1 : 0;
      return order * state.dir || a.campaign.name.localeCompare(b.campaign.name);
    });
  }

  function costCell(ctx, r) { return r.totals.costPerResult === null ? '<span class="muted">-</span>' : esc(M.money(r.totals.costPerResult)); }
  // "Return per £1", with the owner's own currency symbol
  function labelOf(ctx, col) { return col.key === "return" ? "Return per " + M.symbol(ctx.data) + "1" : col.label; }
  function returnCell(ctx, r) {
    return r.roas ? esc(M.money(r.roas.ratio)) + (r.roas.estimated ? ' <span class="muted cmp-est" title="Worked out from what you told Claude a customer is worth">est.</span>' : "") : '<span class="muted" title="' + esc(M.roasReason(ctx.data, r.totals)) + '">-</span>';
  }
  function change(r) { return window.AD.components.delta(r.change.costPerResult, "down"); }

  function head(ctx, col) {
    const on = state.key === col.key, num = !col.text;
    return '<th scope="col" class="' + (num ? "is-num" : "") + '"' + (on ? ' aria-sort="' + (state.dir === 1 ? "ascending" : "descending") + '"' : "") + '>' +
      '<button type="button" class="cmp-sort" data-sort="' + col.key + '">' + esc(labelOf(ctx, col)) + (on ? icon("chevronDown", state.dir === 1 ? "cmp-sort__up" : "") : "") + "</button></th>";
  }

  function tableRow(ctx, r) {
    const C = window.AD.components, id = esc(r.campaign.id);
    return '<tr class="cmp-row" data-campaign="' + id + '"><td>' + C.lightDot(r.light) + '</td>' +
      '<td class="cmp-name"><button type="button" class="cmp-name__btn" data-campaign="' + id + '">' + esc(r.campaign.name) + "</button></td>" +
      "<td>" + C.platformTag(r.campaign.platform) + "</td><td>" + C.campaignPill(r.campaign.status) + "</td>" +
      '<td class="is-num num">' + esc(M.money(r.totals.spend)) + '</td><td class="is-num num">' + esc(M.num(r.totals.results)) + '</td>' +
      '<td class="is-num num">' + costCell(ctx, r) + '</td><td class="is-num num">' + returnCell(ctx, r) + '</td><td class="is-num">' + change(r) + "</td></tr>";
  }

  function card(ctx, r) {
    const C = window.AD.components, id = esc(r.campaign.id), word = M.resultPlural(ctx.data);
    return '<li><article class="card cmp-card" data-campaign="' + id + '">' +
      '<div class="cmp-card__top">' + C.lightDot(r.light) + '<button type="button" class="cmp-name__btn" data-campaign="' + id + '">' + esc(r.campaign.name) + "</button></div>" +
      '<div class="cmp-card__tags">' + C.platformTag(r.campaign.platform) + C.campaignPill(r.campaign.status) + "</div>" +
      '<dl class="cmp-card__stats"><div><dt>Spend</dt><dd class="num">' + esc(M.money(r.totals.spend)) + "</dd></div>" +
      "<div><dt>" + esc(word.charAt(0).toUpperCase() + word.slice(1)) + '</dt><dd class="num">' + esc(M.num(r.totals.results)) + "</dd></div>" +
      "<div><dt>" + esc(M.costLabel(ctx.data)) + '</dt><dd class="num">' + costCell(ctx, r) + "</dd></div>" +
      '<div><dt>' + esc(labelOf(ctx, { key: "return" })) + '</dt><dd class="num">' + returnCell(ctx, r) + "</dd></div></dl>" +
      '<div class="cmp-card__change">' + change(r) + " <span class=\"muted\">cost per " + esc(M.resultName(ctx.data)) + " on the weeks before</span></div></article></li>";
  }

  function sortSelect(ctx) {
    return '<label class="field cmp-sortpick"><span class="field__label">Sort by</span><span class="cmp-sortpick__row"><select class="select" data-sort-select>' + COLUMNS.filter(function (c) { return c.key !== "light"; }).map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === state.key ? " selected" : "") + ">" + esc(labelOf(ctx, c)) + "</option>";
    }).join("") + '</select><button type="button" class="btn btn--sm" data-sort-flip aria-label="Reverse the order">' + (state.dir === 1 ? "Low to high" : "High to low") + "</button></span></label>";
  }

  function onClick(ctx, root) {
    return function (e) {
      const sort = e.target.closest("[data-sort]");
      if (sort) {
        const key = sort.getAttribute("data-sort");
        if (state.key === key) state.dir = -state.dir;
        else { state.key = key; state.dir = COLUMNS.find(function (c) { return c.key === key; }).text ? 1 : -1; }
        AD.views.campaigns.render(root, ctx);
        const again = root.querySelector('[data-sort="' + key + '"]');
        if (again) again.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest("[data-sort-flip]")) { state.dir = -state.dir; AD.views.campaigns.render(root, ctx); return; }
      const row = e.target.closest("[data-campaign]");
      if (row) ctx.openDrawer("campaign", row.getAttribute("data-campaign"));
    };
  }
  function onChange(ctx, root) {
    return function (e) {
      if (!e.target.hasAttribute("data-sort-select")) return;
      state.key = e.target.value;
      state.dir = COLUMNS.find(function (c) { return c.key === state.key; }).text ? 1 : -1;
      AD.views.campaigns.render(root, ctx);
    };
  }

  AD.views.campaigns = {
    title: "Campaigns",
    line: function (ctx) {
      const list = ctx.data.campaigns.filter(function (c) { return !ctx.platform || ctx.platform === "all" || c.platform === ctx.platform; });
      const on = list.filter(function (c) { return c.status === "on"; }).length;
      if (!list.length) return "No campaigns copied in yet";
      return list.length + (list.length === 1 ? " campaign" : " campaigns") + ", " + on + " switched on";
    },
    render: function (root, ctx) {
      const C = window.AD.components;
      const range = rangeOf(ctx), rows = sorted(M.byCampaign(ctx.data, range));
      let body;
      if (!ctx.data.campaigns.length) {
        body = C.emptyState("No campaigns yet", M.hasFigures(ctx.data) ? "Claude copies your campaigns in from your ad accounts when it refreshes your figures." : M.COPY.noFigures);
      } else if (!rows.length) {
        body = C.emptyState("No campaigns to show", "Nothing in this range or for this platform has spend or is switched on. Change the range or the platform above to see more.");
      } else {
        const both = rows.some(function (r) { return r.campaign.platform === "meta"; }) && rows.some(function (r) { return r.campaign.platform === "google"; });
        body = '<div class="cmp-table card"><table class="cmp-tbl"><caption class="sr-only">Campaigns for ' + esc(range.label) + ", with spend, results, cost per result, return and change</caption><thead><tr>" + COLUMNS.map(function (c) { return head(ctx, c); }).join("") + "</tr></thead><tbody>" +
          rows.map(function (r) { return tableRow(ctx, r); }).join("") + "</tbody></table></div>" +
          sortSelect(ctx) + '<ul class="cmp-cards">' + rows.map(function (r) { return card(ctx, r); }).join("") + "</ul>" +
          '<p class="cmp-foot muted">' + esc(range.label) + (range.prevFrom ? ", against " + esc(M.rangeLabel(range.prevFrom, range.prevTo)) : "") + ". Nothing changes in your ad account until you press the button and say yes.</p>" +
          (both ? C.countingNote() : "");
      }
      root.innerHTML = '<div class="cmp-page">' + body + "</div>";
      root.onclick = onClick(ctx, root);
      root.onchange = onChange(ctx, root);
    }
  };
})();
