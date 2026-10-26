/*
  MODEL: the rules of Ads OS, as plain functions
  ----------------------------------------------
  No screen code in here. The pages, the campaign drawer, report.js and the Home boxes all ask these
  functions, so every number, every traffic light and every warning means the same thing everywhere.
  It also runs under Node, which is how maintainers/test-model.js and report.js use it.

  The data file is apps/ads/data/ads.json. It holds raw figures only, one row per campaign per day.
  Every total, cost per result, return and traffic light is worked out here, never typed by Claude.
  Dates are "YYYY-MM-DD" text and are worked in UTC so clock changes never move a day. Nothing here
  changes the file by itself; the functions that edit (newBuild, logActivity) are used inside
  store.update() by the app.

  Money is pounds by default, shown as £1,234 (pence only under £10, for example £4.37).
*/
(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const DAY_MS = 86400000;
  const DAYS_IN_MONTH_AVERAGE = 30.4;   // the monthly equivalent of a daily budget
  const MIN_HISTORY_DAYS = 7;           // a light needs this many days of figures before it says more than "too early"

  // ---------- The platforms ----------
  // The order is the display order. Badges are drawn with CSS from theme colours, never logos.
  const PLATFORMS = [
    { key: "meta", label: "Meta (Facebook and Instagram)", short: "Meta", managerName: "Ads Manager", openUrl: "https://adsmanager.facebook.com/", how: "in the account, paused, through the Meta connection" },
    { key: "google", label: "Google Ads", short: "Google", managerName: "Google Ads", openUrl: "https://ads.google.com/", how: "a Google Ads Editor import file plus a build sheet" }
  ];

  // Ad word limits for the character counts. These are to check against each platform's current help page
  // before the kit is released, because both platforms change them. Meta's headline, main text and description
  // are the sizes it shows without cutting; Google's are its hard limits for a responsive search ad.
  // headline, primaryText (Meta's main text, Google's first description) and description are the 3 fields on an ad.
  const LIMITS = {
    meta: { headline: 40, primaryText: 125, description: 30 },
    google: { headline: 30, primaryText: 90, description: 90 }
  };
  // Where a platform cuts the main text and shows "See more" (Meta). Google does not cut, it refuses.
  const SEE_MORE_AT = { meta: 125 };

  // Words used on more than one screen, written once
  const COPY = {
    countingNote: "Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other.",
    claudeReads: "Nothing changes in your ad account until you press the button and say yes.",
    noFigures: "No figures yet. Press Refresh figures, or drop a report export into files/04-marketing/ads/exports and say: update my ads.",
    metaBuildNote: "Claude creates it switched off. Nothing spends until you press Switch it on and say yes.",
    googleBuildNote: "Claude writes a file you open in Google Ads Editor. It arrives paused.",
    roasUnknown: "Return can't be worked out: some campaigns don't report sales and no customer value is set."
  };

  const CAMPAIGN_STATUS_LABELS = { on: "On", paused: "Paused", ended: "Ended" };
  const BUILD_STATUS_LABELS = {
    draft: "Waiting for you", approved: "Ready to build", building: "Building", "in-account": "Paused in your account",
    "ready-to-import": "File ready to import", live: "Running", dropped: "Dropped"
  };
  const BUILD_STATUSES = Object.keys(BUILD_STATUS_LABELS);
  const LIGHT_LABELS = { green: "On target", amber: "A little over", red: "Over target", grey: "Too early to say" };
  const HEALTH_LABELS = { ok: "Healthy", warn: "Watch", bad: "Needs action" };
  const RESULT_KINDS = ["lead", "call", "booking", "sale"];
  // The account changes the owner can ask Claude to make (Meta only), and where each one has got to
  const ACTION_LABELS = { "switch-on": "Switch on", pause: "Pause", budget: "Change daily budget" };
  const ACTION_KINDS = Object.keys(ACTION_LABELS);
  const ACTION_STATUS_LABELS = { requested: "Waiting for Claude", doing: "Claude is doing it", done: "Done", failed: "Didn't work" };
  const ACTION_STATUSES = Object.keys(ACTION_STATUS_LABELS);
  const PREDICTION_STATES = { ahead: "ahead of what Claude predicted", "on-track": "on track with what Claude predicted", behind: "behind what Claude predicted", "too-early": "too early to score", none: "no prediction yet" };

  // The 4 choices of date range on the rail
  const RANGES = [
    { key: "week", label: "This week" },
    { key: "4weeks", label: "Last 4 weeks" },
    { key: "month", label: "This month" },
    { key: "12weeks", label: "Last 12 weeks" }
  ];

  // ---------- Small helpers ----------
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function positive(n) { return isNum(n) && n > 0 ? n : null; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function makeId(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8).padEnd(6, "0"); }
  function nowIso() { return new Date().toISOString(); }

  // ---------- Dates (worked in UTC) ----------
  function parseIso(iso) {
    const p = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function toIso(d) { return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { return toIso(new Date(parseIso(iso).getTime() + n * DAY_MS)); }
  // A real calendar day written as YYYY-MM-DD (not "2026-02-31", not a timestamp), else null
  function validIso(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return toIso(parseIso(value)) === value ? value : null;
  }
  function daysBetween(fromIso, toIsoDate) { return Math.round((parseIso(toIsoDate) - parseIso(fromIso)) / DAY_MS); }
  function dayOfWeek(iso) { return parseIso(iso).getUTCDay(); }
  function dayLabel(iso) {
    const d = parseIso(iso);
    return DAY_NAMES[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTH_NAMES[d.getUTCMonth()];
  }
  function shortDate(iso) { const d = parseIso(iso); return d.getUTCDate() + " " + MONTH_NAMES[d.getUTCMonth()]; }
  function daysInMonth(iso) { const d = parseIso(iso); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); }
  function monthStart(iso) { return iso.slice(0, 8) + "01"; }
  // The first day of the week containing the date, for weeks that start on Monday (1) or Sunday (0)
  function weekStart(iso, weekStarts) {
    const first = Number(weekStarts) === 0 ? 0 : 1;
    return addDays(iso, -((dayOfWeek(iso) - first + 7) % 7));
  }
  // "19 Oct to 25 Oct", or just "19 Oct" for one day
  function rangeLabel(from, to) { return from === to ? shortDate(from) : shortDate(from) + " to " + shortDate(to); }
  // The day a timestamp falls on for the person (their own clock), YYYY-MM-DD
  function localDay(timestamp) {
    const d = new Date(timestamp);
    if (!timestamp || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- Showing numbers ----------
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  const SYMBOLS = { GBP: "£", USD: "$", EUR: "€" };
  function symbolOf(currency) { return SYMBOLS[currency || "GBP"] || "£"; }
  // The currency symbol from the owner's settings ("£" by default), for words like "back for every £1"
  function symbol(data) { return symbolOf(data && data.settings && data.settings.currency); }
  // 1234 becomes "£1,234", 4.37 becomes "£4.37", null becomes "-". Pence only under £10.
  function money(n, currency) {
    if (n === null || n === undefined || !isNum(Number(n))) return "-";
    const value = Number(n), abs = Math.abs(value);
    const symbol = symbolOf(currency);
    const body = Math.round(abs * 100) < 1000 ? abs.toFixed(2) : group(Math.round(abs));
    const text = body === "0.00" ? "0" : body;
    return (value < 0 && text !== "0" ? "-" : "") + symbol + text;
  }
  // 0.123 becomes "12%". opts.sign puts a + on rises. null becomes "-".
  function pct(n, opts) {
    if (n === null || n === undefined || !isNum(Number(n))) return "-";
    const r = Math.round(Number(n) * 100);
    return (opts && opts.sign && r > 0 ? "+" : "") + r + "%";
  }
  function num(n) { return n === null || n === undefined || !isNum(Number(n)) ? "-" : group(Math.round(Number(n))); }
  // How much a figure changed: (now - before) / before, or null when there is nothing to compare with
  function change(now, before) {
    if (!isNum(now) || !isNum(before) || before === 0) return null;
    return (now - before) / Math.abs(before);
  }

  // ---------- Settings words ----------
  function resultName(data) { return (data.settings && data.settings.result && data.settings.result.name) || "result"; }
  function resultPlural(data) {
    const r = (data.settings && data.settings.result) || {};
    return r.plural || (r.name ? r.name + "s" : "results");
  }
  function costLabel(data) { return "Cost per " + resultName(data); }
  // The target cost per result for a platform (its own if set, else the shared one), or null
  function targetFor(data, key) {
    const s = data.settings || {};
    const own = key && s.platformTargets ? positive(s.platformTargets[key]) : null;
    return own || positive(s.targetCostPerResult);
  }
  function platform(key) { return PLATFORMS.find(function (p) { return p.key === key; }) || null; }
  function platformsOn(data) {
    const on = data.platforms || {};
    return PLATFORMS.filter(function (p) { return on[p.key] && on[p.key].on === true; }).map(function (p) { return p.key; });
  }
  // Before setup: no result name and no platform switched on
  function isSetUp(data) {
    const name = data.settings && data.settings.result && data.settings.result.name;
    return !!(name && String(name).trim()) || platformsOn(data).length > 0;
  }
  function hasFigures(data) { return (data.figures || []).length > 0; }
  function weekStartsOf(data) { return Number(data.settings && data.settings.weekStarts) === 0 ? 0 : 1; }
  function campaignById(data, id) { return (data.campaigns || []).find(function (c) { return c.id === id; }) || null; }

  // ---------- Totals ----------
  // A row of figures is in a filter when its date, platform and campaign match. platform "all" or empty means every platform.
  function rowsIn(data, range) {
    const r = range || {};
    const wantPlatform = r.platform && r.platform !== "all" ? r.platform : null;
    return (data.figures || []).filter(function (f) {
      if (r.from && f.date < r.from) return false;
      if (r.to && f.date > r.to) return false;
      if (wantPlatform && f.platform !== wantPlatform) return false;
      if (r.campaignId && f.campaignId !== r.campaignId) return false;
      return true;
    });
  }
  function worthPerResult(data) {
    const r = (data.settings && data.settings.result) || {};
    return isNum(r.worth) && isNum(r.closeRate) ? r.worth * r.closeRate : null;
  }
  // Adds up the figures for a date range (from and to, both included), a platform and a campaign. Returns
  //   { from, to, platform, campaignId, spend, results, value, estimatedValue, valueRows, estimatedRows, uncoveredSpend, clicks, impressions, days, costPerResult }
  // value is only what the platform reported. estimatedValue is results x worth x close rate for the rows
  // that reported no value (null when the owner hasn't given a worth and a close rate). estimatedRows counts
  // the rows with spend or results that were estimated that way, and uncoveredSpend is the spend of rows that
  // have neither a reported value nor an estimate. days is how many different dates have figures.
  // costPerResult is null when there are no results.
  function rangeTotals(data, range) {
    const rows = rowsIn(data, range), per = worthPerResult(data);
    const t = { from: range && range.from || null, to: range && range.to || null, platform: range && range.platform || "all", campaignId: range && range.campaignId || null,
      spend: 0, results: 0, value: 0, estimatedValue: per === null ? null : 0, valueRows: 0, estimatedRows: 0, uncoveredSpend: 0, clicks: 0, impressions: 0, days: 0, costPerResult: null };
    const dates = {};
    rows.forEach(function (f) {
      t.spend += f.spend; t.results += f.results; t.clicks += f.clicks; t.impressions += f.impressions;
      if (isNum(f.value)) { t.value += f.value; t.valueRows += 1; }
      else if (per !== null) { t.estimatedValue += f.results * per; if (f.spend > 0 || f.results > 0) t.estimatedRows += 1; }
      else t.uncoveredSpend += f.spend;
      dates[f.date] = true;
    });
    t.days = Object.keys(dates).length;
    t.costPerResult = costPerResult(t);
    return t;
  }
  // Spend divided by results, or null when there are no results
  function costPerResult(totals) { return totals && totals.results > 0 ? totals.spend / totals.results : null; }
  // What came back for each £1 spent: { ratio, estimated, value } or null when it can't be said.
  // Each row counts once: the platform-reported value where the row has one, else results x worth x close rate
  // when the owner has set both. estimated is true whenever any row was worked out the second way. null when
  // spend is 0, or when some spend has neither (roasReason says why).
  function roas(data, totals) {
    if (!totals || !(totals.spend > 0)) return null;
    if (totals.uncoveredSpend > 0) return null;
    const value = totals.value + (totals.estimatedValue || 0);
    return { ratio: value / totals.spend, estimated: totals.estimatedRows > 0, value: value };
  }
  // Why return can't be worked out, for the views to show where roas is null and there is spend. "" otherwise.
  function roasReason(data, totals) {
    return totals && totals.spend > 0 && !roas(data, totals) ? COPY.roasUnknown : "";
  }
  // "£3.20 back for every £1", with the word "estimated" when it is. data gives the currency symbol.
  function roasText(r, data) {
    if (!r) return "-";
    const sym = symbol(data);
    return sym + group(r.ratio.toFixed(2)) + " back for every " + sym + "1" + (r.estimated ? " (estimated)" : "");
  }
  // With Pipeline OS attached: what customers you won (wins) brought in for the spend in the same range.
  // null when there are no wins at all, so nothing is claimed for a tool that isn't attached.
  function realReturn(data, range) {
    const wins = data.wins || [];
    if (!wins.length) return null;
    const r = range || {}, wantPlatform = r.platform && r.platform !== "all" ? r.platform : null;
    const inRange = wins.filter(function (w) {
      const day = validIso(w.wonAt) || localDay(w.wonAt);
      if (!day || (r.from && day < r.from) || (r.to && day > r.to)) return false;
      if (wantPlatform) { const c = campaignById(data, w.campaignId); return !!c && c.platform === wantPlatform; }
      return true;
    });
    const spend = rangeTotals(data, range).spend, value = inRange.reduce(function (sum, w) { return sum + (isNum(w.value) ? w.value : 0); }, 0);
    return { count: inRange.length, value: value, spend: spend, ratio: spend > 0 ? value / spend : null };
  }

  // ---------- Date ranges ----------
  // The range for a key from RANGES, with the previous range of the same length for "up 12%" comparisons:
  //   { key, label, from, to, prevFrom, prevTo, days }
  // This week is the week so far, compared with the same days of last week. This month is the month so far,
  // compared with the same number of days of last month.
  function rangeFor(key, todayIso, weekStarts) {
    const label = (RANGES.find(function (r) { return r.key === key; }) || RANGES[1]).label;
    let from, prevFrom, prevTo;
    const to = todayIso;
    if (key === "week") { from = weekStart(todayIso, weekStarts); prevFrom = addDays(from, -7); prevTo = addDays(prevFrom, daysBetween(from, to)); }
    else if (key === "month") {
      from = monthStart(todayIso);
      const lastMonthEnd = addDays(from, -1);
      prevFrom = monthStart(lastMonthEnd);
      prevTo = addDays(prevFrom, Math.min(daysBetween(from, to), daysInMonth(lastMonthEnd) - 1));
    } else {
      const length = key === "12weeks" ? 84 : 28;
      from = addDays(todayIso, -(length - 1)); prevTo = addDays(from, -1); prevFrom = addDays(prevTo, -(length - 1));
    }
    return { key: RANGES.some(function (r) { return r.key === key; }) ? key : "4weeks", label: label, from: from, to: to, prevFrom: prevFrom, prevTo: prevTo, days: daysBetween(from, to) + 1 };
  }

  // Each of the last n weeks, oldest first, the last one being the week of today (so far):
  //   [{ start, end, partial, hasFigures, ...rangeTotals }]
  // A week with no figures has hasFigures false and a costPerResult of null, so a chart can leave a gap.
  // opts can limit it to one platform or campaign: { platform, campaignId }.
  function weeks(data, n, todayIso, opts) {
    const first = weekStart(todayIso, weekStartsOf(data)), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const start = addDays(first, -7 * i), end = addDays(start, 6);
      const t = rangeTotals(data, { from: start, to: end, platform: opts && opts.platform, campaignId: opts && opts.campaignId });
      out.push(Object.assign(t, { start: start, end: end, partial: end > todayIso, hasFigures: t.days > 0 }));
    }
    return out;
  }
  // This week so far against last week:
  //   { thisWeek, lastWeek, lastWeekSoFar, onDay, change: { spend, results, costPerResult } }
  // thisWeek and lastWeek (the whole of it) are rangeTotals. lastWeekSoFar is the same days of last week,
  // which is the fair thing to compare with, so change uses that. onDay is how many days of this week are done.
  function thisAndLast(data, todayIso, opts) {
    const first = weekStart(todayIso, weekStartsOf(data)), lastStart = addDays(first, -7);
    const filter = { platform: opts && opts.platform, campaignId: opts && opts.campaignId };
    const thisWeek = rangeTotals(data, Object.assign({ from: first, to: todayIso }, filter));
    const onDay = daysBetween(first, todayIso) + 1;
    const lastWeek = rangeTotals(data, Object.assign({ from: lastStart, to: addDays(lastStart, 6) }, filter));
    const lastWeekSoFar = rangeTotals(data, Object.assign({ from: lastStart, to: addDays(lastStart, onDay - 1) }, filter));
    return {
      thisWeek: thisWeek, lastWeek: lastWeek, lastWeekSoFar: lastWeekSoFar, onDay: onDay,
      change: { spend: change(thisWeek.spend, lastWeekSoFar.spend), results: change(thisWeek.results, lastWeekSoFar.results), costPerResult: change(thisWeek.costPerResult, lastWeekSoFar.costPerResult) }
    };
  }

  // ---------- The traffic light ----------
  // totals is from rangeTotals (and may carry historyDays, how many days of figures the thing has had in all;
  // without it days is used). target is the target cost per result.
  //   green: at or under target. amber: up to 25% over. red: more than 25% over, or no results yet with spend at
  //   least 2 x target. grey: no target, under 7 days of figures (always, before any red rule), or no results
  //   and spend under 2 x target.
  // Returns { state, label, costPerResult, target, over } where over is how far above target (0.1 is 10%).
  function light(totals, target) {
    const t = totals || { spend: 0, results: 0, days: 0 }, goal = positive(target), cpr = costPerResult(t);
    const make = function (state, over, why) { return { state: state, label: LIGHT_LABELS[state], costPerResult: cpr, target: goal, over: over, why: why || "" }; };
    if (!goal) return Object.assign(make("grey", null, "No target set yet."), { label: "No target set" });
    const age = isNum(t.historyDays) ? t.historyDays : t.days;
    if (age < MIN_HISTORY_DAYS) return make("grey", cpr === null ? null : cpr / goal - 1, "Under " + MIN_HISTORY_DAYS + " days of figures.");
    if (!(t.results > 0)) {
      return t.spend >= 2 * goal ? make("red", null, "No results yet, and the spend is over 2 times the target.") : make("grey", null, "Not enough spend to tell yet.");
    }
    const over = cpr / goal - 1;
    if (over <= 1e-9) return make("green", over);
    if (over <= 0.25 + 1e-9) return make("amber", over);
    return make("red", over);
  }
  // Days with figures for a campaign or platform up to a date, however long ago they began
  function historyDays(data, filter, to) {
    const dates = {};
    rowsIn(data, Object.assign({}, filter, { to: to })).forEach(function (f) { dates[f.date] = true; });
    return Object.keys(dates).length;
  }

  // Each platform that is switched on or has figures, in display order:
  //   [{ key, platform, on, target, totals, previous, light }]
  // range is from rangeFor (prevFrom and prevTo give previous) or just { from, to }.
  function byPlatform(data, range) {
    const on = platformsOn(data);
    return PLATFORMS.filter(function (p) { return on.indexOf(p.key) > -1 || (data.figures || []).some(function (f) { return f.platform === p.key; }); }).map(function (p) {
      const totals = rangeTotals(data, { from: range.from, to: range.to, platform: p.key });
      totals.historyDays = historyDays(data, { platform: p.key }, range.to);
      const previous = range.prevFrom ? rangeTotals(data, { from: range.prevFrom, to: range.prevTo, platform: p.key }) : null;
      const target = targetFor(data, p.key);
      return { key: p.key, platform: p, on: on.indexOf(p.key) > -1, target: target, totals: totals, previous: previous, light: light(totals, target) };
    });
  }
  // Every campaign that is on or has figures in the range:
  //   [{ campaign, target, totals, previous, light, roas, change: { spend, results, costPerResult } }]
  // range.platform limits it to one platform. Unsorted: the page sorts.
  function byCampaign(data, range) {
    const wantPlatform = range.platform && range.platform !== "all" ? range.platform : null;
    return (data.campaigns || []).filter(function (c) { return !wantPlatform || c.platform === wantPlatform; }).map(function (c) {
      const totals = rangeTotals(data, { from: range.from, to: range.to, campaignId: c.id });
      totals.historyDays = historyDays(data, { campaignId: c.id }, range.to);
      const previous = range.prevFrom ? rangeTotals(data, { from: range.prevFrom, to: range.prevTo, campaignId: c.id }) : null;
      const target = targetFor(data, c.platform);
      return { campaign: c, target: target, totals: totals, previous: previous, light: light(totals, target), roas: roas(data, totals),
        change: { spend: previous ? change(totals.spend, previous.spend) : null, results: previous ? change(totals.results, previous.results) : null, costPerResult: previous ? change(totals.costPerResult, previous.costPerResult) : null } };
    }).filter(function (row) { return row.campaign.status === "on" || row.totals.days > 0; });
  }
  // The campaigns with results in the range, cheapest and dearest per result: { best, worst } (rows from byCampaign), or nulls
  function bestWorst(data, range) {
    const rows = byCampaign(data, range).filter(function (r) { return r.totals.results > 0 && r.totals.spend > 0; });
    rows.sort(function (a, b) { return a.totals.costPerResult - b.totals.costPerResult; });
    return { best: rows[0] || null, worst: rows.length > 1 ? rows[rows.length - 1] : null };
  }

  // ---------- Pace and limits ----------
  // Spend so far this month against the monthly budget:
  //   { monthStart, spent, budget, daysElapsed, daysInMonth, projected, state, percentOfBudget }
  // projected is spent / days elapsed x days in the month. state is "ok" (on or under budget), "warn" (up to 10% over),
  // "bad" (more) or "none" (no budget set).
  function pace(data, todayIso) {
    const start = monthStart(todayIso), spent = rangeTotals(data, { from: start, to: todayIso }).spend;
    const elapsed = daysBetween(start, todayIso) + 1, total = daysInMonth(todayIso), budget = positive(data.settings && data.settings.monthlyBudget);
    const projected = spent / elapsed * total;
    const state = budget === null ? "none" : projected <= budget + 1e-9 ? "ok" : projected <= budget * 1.1 + 1e-9 ? "warn" : "bad";
    return { monthStart: start, spent: spent, budget: budget, daysElapsed: elapsed, daysInMonth: total, projected: projected, state: state, percentOfBudget: budget ? spent / budget : null };
  }
  function spendByDay(data) {
    const days = {};
    (data.figures || []).forEach(function (f) { days[f.date] = (days[f.date] || 0) + f.spend; });
    return days;
  }
  // Days with spend over the daily cap and weeks over the weekly cap, in the last 14 days (the weeks are the
  // ones that overlap those 14 days, counted whole):
  //   { days: [{ date, spend, cap }], weeks: [{ start, spend, cap }], count, dailyCap, weeklyCap }
  function capBreaches(data, todayIso, windowDays) {
    const s = data.settings || {}, dailyCap = positive(s.dailyCap), weeklyCap = positive(s.weeklyCap);
    const from = addDays(todayIso, -((windowDays || 14) - 1)), byDay = spendByDay(data), out = { days: [], weeks: [], count: 0, dailyCap: dailyCap, weeklyCap: weeklyCap };
    if (dailyCap) {
      Object.keys(byDay).sort().forEach(function (date) {
        if (date >= from && date <= todayIso && byDay[date] > dailyCap + 1e-9) out.days.push({ date: date, spend: byDay[date], cap: dailyCap });
      });
    }
    if (weeklyCap) {
      weeks(data, Math.ceil((windowDays || 14) / 7) + 1, todayIso).forEach(function (w) {
        if (w.end >= from && w.spend > weeklyCap + 1e-9) out.weeks.push({ start: w.start, spend: w.spend, cap: weeklyCap });
      });
    }
    out.count = out.days.length + out.weeks.length;
    return out;
  }

  // ---------- Checks on a new campaign ----------
  // MM-DD text of a date, and whether it falls in a season { from, to } (it may run over the new year, 11-15 to 01-10)
  function inSeason(season, iso) {
    const md = iso.slice(5);
    return season.from <= season.to ? md >= season.from && md <= season.to : md >= season.from || md <= season.to;
  }
  function seasonText(season) {
    const part = function (md) { return Number(md.slice(3)) + " " + MONTH_NAMES[Number(md.slice(0, 2)) - 1]; };
    return part(season.from) + " to " + part(season.to);
  }
  function validSeason(s) {
    return !!s && typeof s === "object" && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s.from || "") && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s.to || "");
  }
  // What the campaigns already on spend each day: each campaign that is on, its spend over the last 7 days
  // divided by 7, whether or not it has figures for every one of those days.
  function runningDaily(data, todayIso, exceptCampaignId) {
    const from = addDays(todayIso, -6);
    return (data.campaigns || []).filter(function (c) { return c.status === "on" && c.id !== exceptCampaignId; }).reduce(function (sum, c) {
      const t = rangeTotals(data, { from: from, to: todayIso, campaignId: c.id });
      return sum + t.spend / 7;
    }, 0);
  }
  const GOING_ON = ["approved", "building", "in-account", "ready-to-import"];   // statuses where the owner could switch it on any time now

  // The budget guard and the seasonal guard for a build:
  //   { ok, warnings: [plain sentences], budget: { ok, missing, daily, existing, total, monthly, dailyCap, monthlyBudget, dailyOver, monthlyOver },
  //     season: null | { ok, label, text, warnings } }
  // Budget: the build's daily budget plus what the live campaigns spend a day (last 7 days) against the daily cap, and
  // x 30.4 against the monthly budget. Season: any day of the run (start to end) outside it, or today outside it
  // when it is about to go on. A run of more than 366 days counts as outside. ok is false when either guard
  // fails, and Claude refuses to build it then.
  function buildChecks(data, build, todayIso) {
    const s = data.settings || {}, b = build.budget || {}, daily = positive(b.daily);
    const dailyCap = positive(s.dailyCap), monthlyBudget = positive(s.monthlyBudget);
    const existing = runningDaily(data, todayIso, build.refs && build.refs.campaignId), total = (daily || 0) + existing, monthly = total * DAYS_IN_MONTH_AVERAGE;
    const dailyOver = !!dailyCap && total > dailyCap + 1e-9, monthlyOver = !!monthlyBudget && monthly > monthlyBudget + 1e-9;
    const budget = { ok: !!daily && !dailyOver && !monthlyOver, missing: !daily, daily: daily, existing: existing, total: total, monthly: monthly, dailyCap: dailyCap, monthlyBudget: monthlyBudget, dailyOver: dailyOver, monthlyOver: monthlyOver };
    const warnings = [];
    if (!daily) warnings.push("This campaign has no daily budget yet.");
    if (dailyOver) warnings.push("This adds " + money(daily) + " a day to the " + money(existing) + " a day already running, which is " + money(total) + " in all. Your daily limit is " + money(dailyCap) + ".");
    if (monthlyOver) warnings.push("That comes to about " + money(monthly) + " a month, against your budget of " + money(monthlyBudget) + ".");

    let season = null;
    if (validSeason(build.season)) {
      const sw = [], label = build.season.label || "its season", text = seasonText(build.season);
      if (b.start && validIso(b.start) && !inSeason(build.season, b.start)) sw.push("It starts on " + shortDate(b.start) + ", outside " + label + " (" + text + ").");
      if (b.end && validIso(b.end) && !inSeason(build.season, b.end)) sw.push("It ends on " + shortDate(b.end) + ", outside " + label + " (" + text + ").");
      if (validIso(b.start) && validIso(b.end) && !sw.length) {
        const length = daysBetween(b.start, b.end) + 1;
        if (length > 366) sw.push("It runs for more than a year, so some of it falls outside " + label + " (" + text + ").");
        else for (let i = 1; i < length - 1; i++) {
          if (!inSeason(build.season, addDays(b.start, i))) { sw.push("It runs from " + shortDate(b.start) + " to " + shortDate(b.end) + ", and " + shortDate(addDays(b.start, i)) + " falls outside " + label + " (" + text + ")."); break; }
        }
      }
      // A campaign with a start date still to come can't spend before it, so today only matters once that date arrives
      const startsNow = !validIso(b.start) || b.start <= todayIso;
      if (GOING_ON.indexOf(build.status) > -1 && startsNow && !inSeason(build.season, todayIso)) sw.push("Today is outside " + label + " (" + text + "), so it shouldn't go on yet.");
      season = { ok: !sw.length, label: label, text: text, warnings: sw };
      Array.prototype.push.apply(warnings, sw);
    }
    return { ok: budget.ok && (!season || season.ok), warnings: warnings, budget: budget, season: season };
  }

  // ---------- Making a build ----------
  // An empty build for a platform, as Claude writes it, status draft. Ids are made here.
  function newBuild(platformKey) {
    const at = nowIso();
    return {
      id: makeId("b"), platform: platformKey, name: "", objective: "", status: "draft",
      audience: { locations: [], ageMin: null, ageMax: null, interests: [], keywords: [], negativeKeywords: [], notes: "" },
      budget: { daily: null, start: null, end: null }, season: null,
      ads: [{ id: makeId("a"), headline: "", primaryText: "", description: "", cta: "", url: "", media: [] }],
      why: "", checks: [], refs: { campaignId: "", url: "", file: "", sheet: "" }, request: null, taskId: null, prediction: null, fromCampaignId: "", brief: null, needs: "",
      createdAt: at, updatedAt: at, approvedAt: null, builtAt: null, switchedOnAt: null
    };
  }
  // Builds grouped for the New campaigns page: waiting for the owner, ready to build, to switch on, and running (the last 8)
  function buildGroups(data) {
    const builds = (data.builds || []).filter(function (b) { return b.status !== "dropped"; });
    const by = function (statuses) { return builds.filter(function (b) { return statuses.indexOf(b.status) > -1; }); };
    const newest = function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); };
    return {
      waiting: by(["draft"]).sort(newest), ready: by(["approved", "building"]).sort(newest), switchOn: by(["in-account", "ready-to-import"]).sort(newest),
      running: by(["live"]).sort(function (a, b) { return String(b.switchedOnAt || "").localeCompare(String(a.switchedOnAt || "")); }).slice(0, 8)
    };
  }
  // Where an ad's words get cut: { count, limit, over } for a field ("headline", "primaryText" or "description")
  function charCount(platformKey, field, text) {
    const count = Array.from(String(text == null ? "" : text)).length, limit = LIMITS[platformKey] && LIMITS[platformKey][field] || null;
    return { count: count, limit: limit, over: limit !== null && count > limit };
  }
  // The main text as the feed first shows it: cut at a word end where the platform adds "See more" (Meta). { shown, cut }
  function preview(platformKey, field, text) {
    const chars = Array.from(String(text == null ? "" : text).trim()), limit = field === "primaryText" ? SEE_MORE_AT[platformKey] : null;
    if (!limit || chars.length <= limit) return { shown: chars.join(""), cut: false };
    const head = chars.slice(0, limit).join(""), space = head.lastIndexOf(" ");
    return { shown: (space > limit - 20 ? head.slice(0, space) : head).trimEnd(), cut: true };
  }
  function monthlyEquivalent(daily) { return isNum(daily) ? daily * DAYS_IN_MONTH_AVERAGE : null; }

  // ---------- Pictures and videos for the ads ----------
  // The helper (apps/server) only accepts these names, saved in apps/ads/data/media.
  const MEDIA_KINDS = { jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", mp4: "video", mov: "video", webm: "video" };
  const MEDIA_MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
  const MEDIA_EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
  const MEDIA_NAME_RE = /^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/;
  const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
  function mediaUrl(file) { return "/api/media/ads/" + encodeURIComponent(file); }
  function extOf(name) { const m = /\.([A-Za-z0-9]+)$/.exec(String(name || "")); return m ? m[1].toLowerCase() : ""; }
  function mediaKind(file) { return MEDIA_KINDS[extOf(file)] || null; }
  function mediaMime(file) { return MEDIA_MIME[extOf(file)] || null; }
  // Whether a file from the person's computer can be added, in plain words if not. file is { name, type, size }.
  // Returns { ok: true, ext, kind } or { ok: false, message }.
  function checkMediaFile(file) {
    const name = file.name || "That file", ext = extOf(name);
    const known = MEDIA_KINDS[ext] ? (ext === "jpeg" ? "jpg" : ext) : MEDIA_EXT_BY_MIME[String(file.type || "").toLowerCase()];
    if (ext === "heic" || ext === "heif") return { ok: false, message: "“" + name + "” is a HEIC photo, which browsers can’t show. Save or export it as a JPG and add that instead." };
    if (!known) return { ok: false, message: "“" + name + "” isn’t a picture or video this can use. Pictures can be JPG, PNG, WebP or GIF. Videos can be MP4, MOV or WebM." };
    if (!(file.size > 0)) return { ok: false, message: "“" + name + "” is empty." };
    if (file.size > MAX_MEDIA_BYTES) return { ok: false, message: "“" + name + "” is over 200 MB, which is too big to add. Try a shorter or smaller version." };
    return { ok: true, ext: known, kind: MEDIA_KINDS[known] };
  }

  // ---------- What is waiting on the owner ----------
  // Where a build has been waiting for the owner since (a timestamp), by status
  function waitingSince(b) {
    if (b.status === "draft") return b.createdAt;
    if (b.status === "approved") return b.approvedAt || b.updatedAt || b.createdAt;
    return b.builtAt || b.updatedAt || b.createdAt;
  }
  const OWNER_STATUSES = ["draft", "approved", "in-account", "ready-to-import"];
  // The things waiting on the owner:
  //   { review, ready, switchOn, suggestions, breaches, items, builds, total }
  // review (drafts), ready (approved, to build), switchOn (in the account or file ready) and suggestions (new) are lists,
  // breaches is capBreaches. items is one flat list of { kind, id, title, sub, view } in that order, view being the
  // page it goes to. builds counts review, ready and switchOn together (the badge on New campaigns). total is every item.
  function todo(data, todayIso) {
    const groups = buildGroups(data);
    // A build Claude is already switching on is no longer waiting on the owner
    const review = groups.waiting, ready = groups.ready.filter(function (b) { return b.status === "approved"; }), switchOn = groups.switchOn.filter(function (b) {
      return !actionInFlight(data, function (a) { return a.kind === "switch-on" && a.buildId === b.id; });
    });
    const suggestions = (data.suggestions || []).filter(function (x) { return x.status === "new"; });
    const breaches = capBreaches(data, todayIso);
    const named = function (b) { return b.name || "Untitled campaign"; };
    const items = []
      .concat(review.map(function (b) { return { kind: "review", id: b.id, title: "Review: " + named(b), sub: platform(b.platform) ? platform(b.platform).short : "", view: "builds" }; }))
      .concat(ready.map(function (b) { return { kind: "build", id: b.id, title: "Ready to build: " + named(b), sub: "You approved it", view: "builds" }; }))
      .concat(switchOn.map(function (b) { return { kind: "switch-on", id: b.id, title: "Switch on: " + named(b), sub: b.status === "ready-to-import" ? "File ready to import" : "Paused in your account", view: "builds" }; }))
      .concat(suggestions.map(function (x) { return { kind: "suggestion", id: x.id, title: "Decide: " + (x.title || "A suggestion"), sub: x.why || "", view: "week" }; }));
    breaches.days.forEach(function (d) { items.push({ kind: "cap", id: "day-" + d.date, title: "Over your daily limit on " + dayLabel(d.date), sub: money(d.spend) + " against " + money(d.cap), view: "overview" }); });
    breaches.weeks.forEach(function (w) { items.push({ kind: "cap", id: "week-" + w.start, title: "Over your weekly limit, week of " + shortDate(w.start), sub: money(w.spend) + " against " + money(w.cap), view: "overview" }); });
    // claude and you are the To do lists (todoList), and count is the number in both. The review and switch-on items are the same builds in both.
    const list = todoList(data, todayIso);
    return { review: review, ready: ready, switchOn: switchOn, suggestions: suggestions, breaches: breaches, items: items, builds: review.length + ready.length + switchOn.length, total: items.length,
      claude: list.claude, you: list.you, count: list.claude.length + list.you.length };
  }
  // How many suggestions are in each state: { new, approved, dismissed, done, total }
  function suggestionCounts(data) {
    const out = { new: 0, approved: 0, dismissed: 0, done: 0, total: 0 };
    (data.suggestions || []).forEach(function (x) { if (out[x.status] !== undefined) out[x.status] += 1; out.total += 1; });
    return out;
  }

  // ---------- Predictions: is a campaign doing what Claude said it would? ----------
  // A number of results a week, shown without a pointless decimal: 4, 4.5, 12
  function perWeek(n) { return n === null || n === undefined ? "-" : String(n < 10 ? round1(n) : Math.round(n)); }
  // Money for a sentence: £6, not £6.00 (pence still show when there are some, £4.37)
  function wholeMoney(n) { return money(n).replace(/\.00$/, ""); }
  function ratioText(r) { return (Math.round(r * 100) / 100).toFixed(2).replace(/\.?0+$/, ""); }
  // How a campaign is doing against its prediction, from the day the prediction starts to yesterday:
  //   { state: ahead | on-track | behind | too-early | none, score, label, resultsRatio, costRatio, actual: { resultsPerWeek, costPerResult },
  //     predicted: { costPerResult, resultsPerWeek, spendPerWeek } | null, days, sums: [plain sentences] }
  // campaign is the campaign or its id. days is how many days have figures in that window. It is too early under 7 days,
  // or with no results and spend under 2 x the predicted cost per result. resultsRatio is actual results a week over
  // predicted. costRatio is predicted cost per result over actual. Each is capped at 2. score is 100 x their average
  // (just the one when only one was predicted), so 100 means as predicted. Ahead is 110 or more, behind is under 90.
  function predictionScore(data, campaign, todayIso) {
    const c = typeof campaign === "string" ? campaignById(data, campaign) : campaign, p = c && c.prediction;
    const out = { state: "none", score: null, label: "", resultsRatio: null, costRatio: null, actual: { resultsPerWeek: null, costPerResult: null }, predicted: null, days: 0, sums: [] };
    out.label = PREDICTION_LABEL_NONE;
    if (!p || !validIso(p.from) || !(p.costPerResult || p.resultsPerWeek)) return out;
    const totals = rangeTotals(data, { from: p.from, to: addDays(todayIso, -1), campaignId: c.id }), word = resultPlural(data), days = totals.days;
    out.predicted = { costPerResult: p.costPerResult, resultsPerWeek: p.resultsPerWeek, spendPerWeek: p.spendPerWeek };
    out.days = days;
    out.actual = { resultsPerWeek: days > 0 ? totals.results / days * 7 : null, costPerResult: totals.costPerResult };
    const tooEarly = days < MIN_HISTORY_DAYS || (totals.results === 0 && !!p.costPerResult && totals.spend < 2 * p.costPerResult);
    if (p.resultsPerWeek) out.resultsRatio = Math.min(2, out.actual.resultsPerWeek / p.resultsPerWeek);
    if (p.costPerResult) out.costRatio = out.actual.costPerResult ? Math.min(2, p.costPerResult / out.actual.costPerResult) : 0;
    if (tooEarly) {
      out.state = "too-early";
      out.label = "Too early to score";
      out.sums.push("Only " + days + (days === 1 ? " day" : " days") + " of figures since " + shortDate(p.from) + ". Claude scores a campaign after " + MIN_HISTORY_DAYS + " days with " + word + " coming in.");
      return out;
    }
    const parts = [out.resultsRatio, out.costRatio].filter(function (r) { return r !== null; });
    const average = parts.reduce(function (a, b) { return a + b; }, 0) / parts.length;
    out.score = Math.round(100 * average);
    out.state = out.score >= 110 ? "ahead" : out.score < 90 ? "behind" : "on-track";
    out.label = "Score " + out.score + ": " + PREDICTION_STATES[out.state];
    if (out.resultsRatio !== null) out.sums.push(capitalise(word) + " a week: " + perWeek(out.actual.resultsPerWeek) + " against " + perWeek(p.resultsPerWeek) + " predicted, so " + ratioText(out.resultsRatio) + (out.resultsRatio >= 2 ? " (the most it counts)" : "") + ".");
    if (out.costRatio !== null) out.sums.push(costLabel(data) + ": " + (out.actual.costPerResult === null ? "no " + word + " yet" : money(out.actual.costPerResult)) + " against " + money(p.costPerResult) + " predicted, so " + ratioText(out.costRatio) + (out.costRatio >= 2 ? " (the most it counts)" : "") + ".");
    out.sums.push("Score: " + (parts.length > 1 ? "the average of those 2, " : "") + ratioText(average) + ", times 100 is " + out.score + ". 100 means exactly as predicted.");
    return out;
  }
  const PREDICTION_LABEL_NONE = "No prediction yet";
  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // The plain sentence under the score: "Claude predicted £24 per enquiry and 4 a week; it's doing £21 and 5 a week."
  function predictionWords(score, data) {
    const name = resultName(data), word = resultPlural(data);
    if (!score || score.state === "none" || !score.predicted) return "Claude hasn't predicted how this campaign should do yet. Press Analyse campaign and it will.";
    const p = score.predicted, a = score.actual, bits = [];
    if (p.costPerResult) bits.push(wholeMoney(p.costPerResult) + " per " + name);
    if (p.resultsPerWeek) bits.push(perWeek(p.resultsPerWeek) + " a week");
    const said = "Claude predicted " + bits.join(" and ");
    if (score.state === "too-early") return said + ". It has " + score.days + (score.days === 1 ? " day" : " days") + " of figures so far, so it's too early to say.";
    const doing = [];
    if (p.costPerResult) doing.push(a.costPerResult === null ? "no " + word + " yet" : wholeMoney(a.costPerResult));
    if (p.resultsPerWeek) doing.push(perWeek(a.resultsPerWeek) + " a week");
    return said + "; it's doing " + doing.join(" and ") + ".";
  }

  // ---------- Each ad in a campaign ----------
  // The campaign's ads, each with its own totals for a range { from, to }:  [{ ad, totals }]
  // totals is { spend, results, value, clicks, impressions, days, costPerResult }, or null when the ad has no figures in that range.
  // These come from adFigures only. A campaign's own totals always come from figures, never from adding these up.
  function adsFor(data, campaignId, range) {
    const c = campaignById(data, campaignId), r = range || {};
    if (!c) return [];
    return c.ads.map(function (ad) {
      const rows = (data.adFigures || []).filter(function (f) {
        if (f.campaignId !== campaignId) return false;
        if (f.adId !== ad.id && (!ad.platformId || f.adId !== ad.platformId)) return false;
        return !(r.from && f.date < r.from) && !(r.to && f.date > r.to);
      });
      if (!rows.length) return { ad: ad, totals: null };
      const t = { spend: 0, results: 0, value: 0, clicks: 0, impressions: 0, days: 0, costPerResult: null }, dates = {};
      rows.forEach(function (f) { t.spend += f.spend; t.results += f.results; t.value += isNum(f.value) ? f.value : 0; t.clicks += f.clicks; t.impressions += f.impressions; dates[f.date] = true; });
      t.days = Object.keys(dates).length;
      t.costPerResult = costPerResult(t);
      return { ad: ad, totals: t };
    });
  }

  // ---------- Changes the owner asks Claude to make in their ad account ----------
  const IN_FLIGHT = ["requested", "doing"];
  function actionInFlight(data, match) {
    return (data.actions || []).some(function (a) { return IN_FLIGHT.indexOf(a.status) > -1 && match(a); });
  }
  // An action as the app creates it once the owner has said yes (Meta only). fields can set platform, campaignId, buildId, adId, budgetFrom, budgetTo and note.
  function newAction(kind, fields) {
    const f = fields || {};
    return { id: makeId("ac"), kind: kind, platform: f.platform || "meta", campaignId: f.campaignId || "", buildId: f.buildId || "", adId: f.adId || "",
      budgetFrom: isNum(f.budgetFrom) ? f.budgetFrom : null, budgetTo: isNum(f.budgetTo) ? f.budgetTo : null,
      status: "requested", requestedAt: nowIso(), doneAt: null, readBack: "", note: f.note || "" };
  }
  // Whether an account change stays inside the owner's limits: { ok, warnings, budget, season }
  //   budget: the new daily budget plus what the other live campaigns spend a day (last 7 days), against the daily limit
  //           and x 30.4 against the monthly budget, as for a new campaign. Bringing a budget down is always allowed.
  //   switch-on: the build's own checks (budget and season). With no build it is the campaign's own daily budget.
  //   pause: always inside the limits, but it must be on Meta, name something that exists and is not already paused.
  // Claude refuses when ok is false, and the app blocks the button.
  function actionChecks(data, action, todayIso) {
    const warnings = [];
    if (!action || ACTION_KINDS.indexOf(action.kind) === -1) return { ok: false, warnings: ["That isn't a change Claude can make."], budget: null, season: null };
    if (action.platform !== "meta") warnings.push("Claude can only make changes in Meta. For Google Ads, open Google Ads and make the change there.");
    const campaign = action.campaignId ? campaignById(data, action.campaignId) : null;
    const build = action.buildId ? (data.builds || []).find(function (b) { return b.id === action.buildId; }) || null : null;
    let budget = null, season = null;
    if (action.kind === "switch-on") {
      if (!build && !campaign) warnings.push("Claude can't find the campaign to switch on.");
      else if (build) {
        const c = buildChecks(data, build, todayIso);
        budget = c.budget; season = c.season; Array.prototype.push.apply(warnings, c.warnings);
      } else {
        const c = buildChecks(data, { budget: { daily: campaign.dailyBudget }, status: "in-account", refs: { campaignId: campaign.id } }, todayIso);
        budget = c.budget; Array.prototype.push.apply(warnings, c.warnings);
      }
    } else if (action.kind === "budget") {
      const to = positive(action.budgetTo);
      if (!campaign) warnings.push("Claude can't find the campaign to change.");
      else if (!to) warnings.push("There is no new daily budget to change it to.");
      else {
        const from = positive(action.budgetFrom) || positive(campaign.dailyBudget);
        if (from && to <= from + 1e-9) budget = { ok: true, daily: to, existing: 0, total: to, monthly: to * DAYS_IN_MONTH_AVERAGE, dailyCap: positive(data.settings && data.settings.dailyCap), monthlyBudget: positive(data.settings && data.settings.monthlyBudget), dailyOver: false, monthlyOver: false, missing: false };
        else {
          const c = buildChecks(data, { budget: { daily: to }, status: "in-account", refs: { campaignId: campaign.id } }, todayIso);
          budget = c.budget; Array.prototype.push.apply(warnings, c.warnings);
        }
      }
    } else if (!campaign) warnings.push("Claude can't find the campaign to pause.");
    else if (action.adId) {
      const ad = campaign.ads.find(function (a) { return a.id === action.adId; });
      if (!ad) warnings.push("Claude can't find that ad in the campaign.");
      else if (ad.status === "paused") warnings.push("That ad is already paused.");
    } else if (campaign.status === "paused") warnings.push("That campaign is already paused.");
    return { ok: warnings.length === 0, warnings: warnings, budget: budget, season: season };
  }
  // The sentence in the confirm pop-up, saying the exact change: "Switch on Christmas gift vouchers in your Meta account. It starts spending up to £6 a day from 15 Nov."
  // today is optional (the person's own date), so a start date already passed reads "straight away".
  function actionSentence(data, action, today) {
    const campaign = action.campaignId ? campaignById(data, action.campaignId) : null;
    const build = action.buildId ? (data.builds || []).find(function (b) { return b.id === action.buildId; }) || null : null;
    const name = (build && build.name) || (campaign && campaign.name) || "this campaign", where = " in your Meta account", now = today || localDay(nowIso());
    if (action.kind === "switch-on") {
      const daily = build ? positive(build.budget && build.budget.daily) : campaign && positive(campaign.dailyBudget), start = build && build.budget && validIso(build.budget.start);
      return "Switch on " + name + where + ". It starts spending" + (daily ? " up to " + wholeMoney(daily) + " a day" : "") + (start && start > now ? " from " + shortDate(start) : " straight away") + ".";
    }
    if (action.kind === "pause") {
      const ad = action.adId && campaign ? campaign.ads.find(function (a) { return a.id === action.adId; }) : null;
      if (action.adId) return "Pause the ad " + (ad ? "“" + (ad.name || ad.headline || "this ad") + "” in " + name : "in " + name) + where + ". It stops spending, and you can switch it back on later.";
      return "Pause " + name + where + ". It stops spending, and you can switch it back on later.";
    }
    const from = positive(action.budgetFrom) || (campaign && positive(campaign.dailyBudget));
    return "Change the daily budget of " + name + where + (from ? " from " + wholeMoney(from) : "") + " to " + wholeMoney(action.budgetTo) + " a day.";
  }

  // ---------- The To do list ----------
  // What Claude can do for the owner, and what only the owner can do, in 2 lists:
  //   { claude: [item], you: [item] }
  // Each item is { key, label, why, ref, button } plus, for Claude's list, job (the name of a job to run) or action
  // (the fields to pass to newAction, once the owner confirms) and, for the owner's list, give (what to give Claude)
  // and open ({ view, id } for a page and thing in the app, or { url } for an address). The key never changes for the same
  // thing, so the count is the same everywhere. The seasons come from opts.seasons when it is passed, otherwise from
  // data.settings.seasons ([{ label, from, to }], MM-DD); none means no season item.
  const SEASON_LOOKAHEAD_DAYS = 45;
  function olderThanWeek(iso, todayIso) { const day = localDay(iso); return !day || daysBetween(day, todayIso) >= 7; }
  function todoList(data, todayIso, opts) {
    const claude = [], you = [], builds = (data.builds || []).filter(function (b) { return b.status !== "dropped"; });
    const named = function (b) { return b.name || "Untitled campaign"; }, shortOf = function (key) { return platform(key) ? platform(key).short : ""; };
    const word = resultPlural(data), age = figureAge(data, todayIso);

    // Claude can do
    if ((platformsOn(data).length || hasFigures(data)) && (!age || age.age > FRESH_OK)) {
      claude.push({ key: "refresh", label: "Refresh your figures", why: age ? "The newest figures are " + age.age + " days old." : "There are no figures yet.", ref: null, job: "update-my-ads", button: "Do it" });
    }
    const range = { from: addDays(todayIso, -27), to: todayIso };
    (data.campaigns || []).filter(function (c) { return c.status === "on"; }).forEach(function (c) {
      if (c.request && c.request.kind === "analyse") return;
      if ((data.analyses || []).some(function (a) { return a.campaignId === c.id && !olderThanWeek(a.at, todayIso); })) return;
      const totals = rangeTotals(data, Object.assign({ campaignId: c.id }, range));
      totals.historyDays = historyDays(data, { campaignId: c.id }, todayIso);
      const state = predictionScore(data, c, todayIso).state, l = light(totals, targetFor(data, c.platform));
      const why = l.state === "red" ? "It's costing more per " + resultName(data) + " than your target." : state === "behind" ? "It's behind what Claude predicted." : !c.prediction ? "Claude hasn't predicted how it should do yet." : "";
      if (why) claude.push({ key: "analyse:" + c.id, label: "Analyse " + c.name, why: why, ref: c.id, job: "analyse-campaign", button: "Do it" });
    });
    if (hasFigures(data) && !(data.summaries || []).some(function (s) { return s.weekStart === weekStart(todayIso, weekStartsOf(data)); })) {
      claude.push({ key: "summary:" + weekStart(todayIso, weekStartsOf(data)), label: "Write this week's summary", why: "There isn't one for this week yet.", ref: null, job: "how-did-the-ads-do", button: "Do it" });
    }
    if (hasFigures(data) && !(data.suggestions || []).some(function (x) { return !olderThanWeek(x.createdAt, todayIso); })) {
      claude.push({ key: "changes", label: "Look for changes worth making", why: "Claude hasn't suggested anything in the last 7 days.", ref: null, job: "what-should-i-change", button: "Do it" });
    }
    ((opts && opts.seasons) || (data.settings && data.settings.seasons) || []).forEach(function (s) {
      if (!validSeason(s)) return;
      const label = s.label || "a coming season", thisYear = todayIso.slice(0, 4);
      const starts = [thisYear + "-" + s.from, (Number(thisYear) + 1) + "-" + s.from].filter(function (d) { return d > todayIso; })[0];
      if (!starts || daysBetween(todayIso, starts) > SEASON_LOOKAHEAD_DAYS) return;
      if (builds.some(function (b) { return b.season && b.season.label === s.label && b.budget && b.budget.start && inSeason(s, b.budget.start) && b.budget.start >= addDays(starts, -120); })) return;
      claude.push({ key: "season:" + label + ":" + starts, label: "Draft a campaign for " + label, why: label + " starts on " + shortDate(starts) + " and there is no campaign for it yet.", ref: null, job: "build-a-campaign", button: "Do it" });
    });
    builds.filter(function (b) { return b.platform === "meta" && b.status === "in-account"; }).forEach(function (b) {
      if (actionInFlight(data, function (a) { return a.kind === "switch-on" && a.buildId === b.id; })) return;
      claude.push({ key: "switch-on:" + b.id, label: "Switch on " + named(b), why: "It's built and paused in your Meta account.", ref: b.id, action: { kind: "switch-on", platform: "meta", buildId: b.id, campaignId: (b.refs && b.refs.campaignId) || "" }, button: "Do it" });
    });
    (data.suggestions || []).filter(function (x) { return x.status === "approved" && x.kind === "pause" && x.platform === "meta"; }).forEach(function (x) {
      const c = campaignById(data, x.campaignId);
      if (!c || c.status !== "on") return;
      if (actionInFlight(data, function (a) { return a.kind === "pause" && a.campaignId === c.id && !a.adId; })) return;
      if ((data.actions || []).some(function (a) { return a.kind === "pause" && a.campaignId === c.id && !a.adId && a.status === "done" && String(a.requestedAt) >= String(x.decidedAt || ""); })) return;
      claude.push({ key: "pause:" + x.id, label: "Pause " + c.name, why: x.title || "You approved this suggestion.", ref: c.id, action: { kind: "pause", platform: "meta", campaignId: c.id }, button: "Do it" });
    });

    // You need to
    builds.filter(function (b) { return b.status === "draft"; }).forEach(function (b) {
      you.push({ key: "review:" + b.id, label: "Review " + named(b), why: "Claude drafted it and is waiting for you to approve it or ask for changes.", ref: b.id, give: "Your yes, or what to change.", open: { view: "builds", id: b.id }, button: "Review" });
    });
    // Meta only: Google search ads carry no pictures, so there is nothing to add a photo to
    builds.filter(function (b) { return b.platform === "meta" && ["draft", "approved", "in-account"].indexOf(b.status) > -1; }).forEach(function (b) {
      b.ads.forEach(function (a, i) {
        if (a.media.length) return;
        you.push({ key: "photo:" + b.id + ":" + (a.id || i), label: "Add a photo to " + (a.headline ? "“" + a.headline + "”" : "ad " + (i + 1)) + " in " + named(b), why: "An ad with a picture or video usually does better than words alone.", ref: b.id,
          give: "A picture or video for that ad. Drop it in the ad's box.", open: { view: "builds", id: b.id }, button: "Add photo" });
      });
    });
    builds.filter(function (b) { return b.platform === "google" && (b.status === "ready-to-import" || b.status === "in-account"); }).forEach(function (b) {
      you.push({ key: "import:" + b.id, label: "Import " + named(b) + " into Google Ads Editor", why: "Claude wrote the file. It arrives paused.", ref: b.id, give: "Nothing. Open the build sheet and follow the clicks.", open: { view: "builds", id: b.id }, button: "Open" });
    });
    (data.suggestions || []).filter(function (x) { return x.status === "approved" && x.platform === "google"; }).forEach(function (x) {
      you.push({ key: "google:" + x.id, label: "Make “" + (x.title || "this change") + "” in Google Ads", why: x.why || "You approved this suggestion.", ref: x.campaignId || x.id, give: "Nothing. Open Google Ads and make the change, then say it's done.", open: { url: platform("google").openUrl }, button: "Open Google Ads" });
    });
    const r = data.settings && data.settings.result;
    if (isSetUp(data) && r && r.kind !== "sale" && !isNum(r.worth)) {
      you.push({ key: "worth", label: "Tell Claude what a new customer is worth", why: "Without it, Claude can't work out your return on ad spend for " + word + ".", ref: null, give: "Roughly what one new customer is worth to you in pounds, and how many " + word + " become customers.", open: { view: "settings" }, button: "Tell Claude" });
    }
    if (isSetUp(data) && !(data.platforms.meta && data.platforms.meta.how === "connected")) {
      you.push({ key: "connect-meta", label: "Connect your Meta account", why: "Claude needs a connected account to build campaigns and make changes for you.", ref: null, give: "Open this folder in the Code tab of the Claude desktop app and type /setup.", open: { view: "settings" }, button: "Connect" });
    }
    builds.filter(function (b) { return b.needs.trim(); }).forEach(function (b) {
      you.push({ key: "needs:" + b.id, label: "Answer Claude about " + named(b), why: b.needs.trim(), ref: b.id, give: "Your answer, in the note box on the campaign.", open: { view: "builds", id: b.id }, button: "Answer" });
    });
    return { claude: claude, you: you };
  }

  // ---------- Health check ----------
  function makeCheck(key, label, hint, state, value, target, valueText, targetText) {
    return { key: key, label: label, hint: hint, state: state, value: value, target: target, valueText: valueText, targetText: targetText };
  }
  const FRESH_OK = 3, FRESH_WATCH = 7;
  // How old the newest figures are: { date, age } in days, or null when there are none
  function figureAge(data, todayIso) {
    const newest = (data.figures || []).reduce(function (max, f) { return !max || f.date > max ? f.date : max; }, null);
    return newest ? { date: newest, age: Math.max(0, daysBetween(newest, todayIso)) } : null;
  }
  function freshCheck(data, todayIso) {
    const newest = figureAge(data, todayIso);
    if (!newest) return makeCheck("fresh", "Figures up to date", "The newest day of figures Claude has copied in.", "warn", null, FRESH_OK, "No figures yet", "Within " + FRESH_OK + " days");
    const age = newest.age;
    return makeCheck("fresh", "Figures up to date", "The newest day of figures Claude has copied in. Press Refresh figures to update them.",
      age <= FRESH_OK ? "ok" : age <= FRESH_WATCH ? "warn" : "bad", age, FRESH_OK, age === 0 ? "Up to today" : age + (age === 1 ? " day old" : " days old"), "Within " + FRESH_OK + " days");
  }
  function costCheck(data, todayIso) {
    const range = { from: addDays(todayIso, -27), to: todayIso }, totals = rangeTotals(data, range), target = targetFor(data, null);
    totals.historyDays = historyDays(data, {}, todayIso);
    const l = light(totals, target), word = resultName(data);
    const state = l.state === "green" ? "ok" : l.state === "amber" ? "warn" : l.state === "red" ? "bad" : "warn";
    return makeCheck("cost", "Cost per " + word, "Spend divided by " + resultPlural(data) + ", over the last 4 weeks, against your target.", state, totals.costPerResult, target,
      totals.costPerResult === null ? "No " + resultPlural(data) + " yet" : money(totals.costPerResult), target ? money(target) + " or less" : "Set a target in Settings");
  }
  function paceCheck(data, todayIso) {
    const p = pace(data, todayIso);
    if (p.state === "none") return makeCheck("pace", "Spend this month", "Spend so far this month, and where it is heading.", "warn", p.spent, null, money(p.spent) + " so far", "Set a monthly budget in Settings");
    return makeCheck("pace", "Spend this month", "Spend so far this month, and where it is heading by the end of it.", p.state, p.projected, p.budget,
      money(p.spent) + " so far, heading for " + money(p.projected), money(p.budget) + " or less");
  }
  function capsCheck(data, todayIso) {
    const b = capBreaches(data, todayIso), set = b.dailyCap || b.weeklyCap;
    if (!set) return makeCheck("caps", "Spending limits", "Days and weeks in the last 14 days that went over your limits.", "warn", null, 0, "No limits set", "Set a daily and a weekly limit in Settings");
    return makeCheck("caps", "Spending limits", "Days and weeks in the last 14 days that went over your limits.", b.count === 0 ? "ok" : b.count <= 2 ? "warn" : "bad", b.count, 0,
      b.count === 0 ? "None over" : b.count + " over", "None over");
  }
  // Campaigns that spent more than 2 x the target in 14 days and got nothing: a sign the results aren't being counted
  function trackingCheck(data, todayIso) {
    const target = targetFor(data, null), word = resultPlural(data);
    if (!target) return makeCheck("tracking", "Results being counted", "Campaigns that spent a lot and show no " + word + ", which can mean the " + word + " aren't being counted.", "warn", null, 0, "Can't tell yet", "Set a target in Settings");
    const from = addDays(todayIso, -13);
    const stuck = (data.campaigns || []).filter(function (c) {
      const t = rangeTotals(data, { from: from, to: todayIso, campaignId: c.id });
      return t.results === 0 && t.spend > 2 * (targetFor(data, c.platform) || target);
    });
    return makeCheck("tracking", "Results being counted", "Campaigns that spent more than 2 times your target in 14 days and show no " + word + ". Check the " + word + " are being counted.", stuck.length ? "bad" : "ok", stuck.length, 0,
      stuck.length ? stuck.length + (stuck.length === 1 ? " campaign" : " campaigns") + " to check" : "All counting", "None to check");
  }
  const WAITING_DAYS = 7;
  function waitingCheck(data, todayIso) {
    const old = (data.builds || []).filter(function (b) {
      const since = localDay(waitingSince(b));
      return OWNER_STATUSES.indexOf(b.status) > -1 && since && daysBetween(since, todayIso) > WAITING_DAYS;
    });
    return makeCheck("waiting", "New campaigns waiting", "Campaigns Claude has drafted or built that have waited for you more than " + WAITING_DAYS + " days.", old.length === 0 ? "ok" : old.length <= 2 ? "warn" : "bad", old.length, 0,
      old.length === 0 ? "None waiting long" : old.length + " waiting over " + WAITING_DAYS + " days", "None waiting over " + WAITING_DAYS + " days");
  }
  // 6 checks, each { key, label, hint, state: ok | warn | bad, value, target, valueText, targetText }
  function health(data, todayIso) {
    return [freshCheck, costCheck, paceCheck, capsCheck, trackingCheck, waitingCheck].map(function (f) { return f(data, todayIso); });
  }
  // The worst state among the checks
  function healthOverall(checks) {
    return checks.some(function (c) { return c.state === "bad"; }) ? "bad" : checks.some(function (c) { return c.state === "warn"; }) ? "warn" : "ok";
  }

  // ---------- Activity ----------
  // Adds a line to the top of the activity list (capped at 200)
  function logActivity(data, what, ref) {
    if (!Array.isArray(data.activity)) data.activity = [];
    data.activity.unshift({ at: nowIso(), what: what, ref: ref || null });
    if (data.activity.length > 200) data.activity.length = 200;
  }

  // ---------- Reading the file ----------
  function isObject(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  // Throws a plain message if the parts the app depends on are the wrong kind of thing
  function validate(d) {
    if (!isObject(d)) throw new Error("The ads file is empty or isn't set out the way the app expects.");
    ["campaigns", "figures", "adFigures", "builds", "summaries", "suggestions", "wins", "imports", "activity", "analyses", "actions"].forEach(function (k) {
      if (d[k] !== undefined && !Array.isArray(d[k])) throw new Error("The ads file has a small mistake: " + k + " should be a list.");
    });
    if (d.platforms !== undefined && !isObject(d.platforms)) throw new Error("The ads file has a small mistake: platforms should be a group of settings, one per platform.");
    if (d.settings !== undefined && !isObject(d.settings)) throw new Error("The ads file has a small mistake: settings should be a group of settings.");
  }
  function eachObject(list, fn) { list.forEach(function (x) { if (x && typeof x === "object") fn(x); }); }
  function figureNumber(n) { const v = Number(n); return isFinite(v) && v >= 0 ? v : 0; }
  // Fills in anything missing and fixes values Claude may have written badly, so a half-written file never trips
  // a screen. One row of figures for each campaign and date: where there are doubles the last one stays. A row
  // with no real date is left out. Note the app saves what this returns when it saves anything.
  function normalise(d) {
    d.version = 1;
    d.settings = Object.assign({ businessName: "", ownerName: "", currency: "GBP", weekStarts: 1, targetCostPerResult: null, platformTargets: {}, monthlyBudget: null, dailyCap: null, weeklyCap: null, seasons: [] }, d.settings || {});
    d.settings.result = Object.assign({ name: "", plural: "", kind: "", worth: null, closeRate: null }, d.settings.result || {});
    d.settings.weekStarts = weekStartsOf(d);
    if (!isObject(d.settings.platformTargets)) d.settings.platformTargets = {};
    ["targetCostPerResult", "monthlyBudget", "dailyCap", "weeklyCap"].forEach(function (k) { d.settings[k] = positive(d.settings[k]); });
    // Seasons that matter to the business: [{ label, from: "MM-DD", to: "MM-DD" }]. One that isn't a real season is left out.
    d.settings.seasons = (Array.isArray(d.settings.seasons) ? d.settings.seasons : []).filter(validSeason).map(function (s) {
      return { label: String(s.label || "").trim(), from: s.from, to: s.to };
    });
    if (!isNum(d.settings.result.worth)) d.settings.result.worth = null;
    if (!isNum(d.settings.result.closeRate)) d.settings.result.closeRate = null;
    if (RESULT_KINDS.indexOf(d.settings.result.kind) === -1) d.settings.result.kind = "";
    if (!isObject(d.platforms)) d.platforms = {};
    ["campaigns", "figures", "adFigures", "builds", "summaries", "suggestions", "wins", "imports", "activity", "analyses", "actions"].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    eachObject(d.campaigns, function (c) {
      if (!CAMPAIGN_STATUS_LABELS[c.status]) c.status = "paused";
      c.dailyBudget = isNum(c.dailyBudget) ? c.dailyBudget : null;
      normaliseCampaignExtras(c);
    });
    d.figures = normaliseFigures(d.figures);
    d.adFigures = normaliseFigures(d.adFigures, true);
    eachObject(d.builds, normaliseBuild);
    d.analyses = d.analyses.filter(isObject).map(normaliseAnalysis);
    d.actions = d.actions.filter(isObject).map(normaliseAction).filter(Boolean);
    return d;
  }
  // withAd is true for adFigures, which have an adId and keep one row per ad per day
  function normaliseFigures(list, withAd) {
    const seen = {}, kept = [];
    list.forEach(function (f) {
      if (!f || typeof f !== "object" || !validIso(f.date)) return;
      const row = { date: f.date, platform: f.platform, campaignId: f.campaignId, spend: figureNumber(f.spend), results: figureNumber(f.results),
        value: isNum(f.value) && f.value >= 0 ? f.value : null, clicks: figureNumber(f.clicks), impressions: figureNumber(f.impressions) };
      if (withAd) { row.adId = f.adId; if (typeof row.adId !== "string" || !row.adId) return; }
      const key = row.platform + "|" + row.campaignId + "|" + (withAd ? row.adId + "|" : "") + row.date;
      if (seen[key] !== undefined) kept[seen[key]] = null;
      seen[key] = kept.length;
      kept.push(row);
    });
    return kept.filter(Boolean);
  }
  function normaliseBuild(b) {
    if (BUILD_STATUSES.indexOf(b.status) === -1) b.status = "draft";
    b.audience = Object.assign({ locations: [], ageMin: null, ageMax: null, interests: [], keywords: [], negativeKeywords: [], notes: "" }, isObject(b.audience) ? b.audience : {});
    ["locations", "interests", "keywords", "negativeKeywords"].forEach(function (k) { if (!Array.isArray(b.audience[k])) b.audience[k] = []; });
    b.budget = Object.assign({ daily: null, start: null, end: null }, isObject(b.budget) ? b.budget : {});
    b.budget.start = validIso(b.budget.start); b.budget.end = validIso(b.budget.end);
    if (!validSeason(b.season)) b.season = null;
    if (!Array.isArray(b.ads)) b.ads = [];
    eachObject(b.ads, function (a) {
      a.media = (Array.isArray(a.media) ? a.media : []).filter(function (m) { return typeof m === "string" && MEDIA_NAME_RE.test(m); });
    });
    if (!Array.isArray(b.checks)) b.checks = [];
    b.refs = Object.assign({ campaignId: "", url: "", file: "", sheet: "" }, isObject(b.refs) ? b.refs : {});
    if (!isObject(b.request)) b.request = null;
    if (typeof b.taskId !== "string" || !b.taskId) b.taskId = null;
    b.prediction = normalisePrediction(b.prediction);
    if (typeof b.fromCampaignId !== "string") b.fromCampaignId = "";
    b.brief = normaliseBrief(b.brief);
    if (typeof b.needs !== "string") b.needs = "";
  }
  function text(x) { return typeof x === "string" ? x : ""; }
  function textList(x) { return (Array.isArray(x) ? x : []).filter(function (t) { return typeof t === "string" && t.trim(); }); }
  // A prediction is null, or { costPerResult, resultsPerWeek, spendPerWeek, from, madeAt, basis, assumptions }
  function normalisePrediction(p) {
    if (!isObject(p)) return null;
    return { costPerResult: positive(p.costPerResult), resultsPerWeek: positive(p.resultsPerWeek), spendPerWeek: positive(p.spendPerWeek), from: validIso(p.from),
      madeAt: text(p.madeAt), basis: p.basis === "analysis" ? "analysis" : "plan", assumptions: textList(p.assumptions) };
  }
  // The answers to the Run campaign questions, or null
  function normaliseBrief(b) {
    if (!isObject(b)) return null;
    return { audience: b.audience === "change" ? "change" : "same", audienceNote: text(b.audienceNote), budget: b.budget === "change" ? "change" : "same",
      daily: positive(b.daily), start: validIso(b.start), end: validIso(b.end), words: ["keep", "fresh", "mix"].indexOf(b.words) > -1 ? b.words : "keep", note: text(b.note) };
  }
  function normaliseCampaignExtras(c) {
    c.prediction = normalisePrediction(c.prediction);
    c.request = isObject(c.request) && c.request.kind === "analyse" ? { kind: "analyse", note: text(c.request.note), at: text(c.request.at) } : null;
    c.ads = (Array.isArray(c.ads) ? c.ads : []).filter(isObject).map(function (a) {
      return { id: text(a.id), platformId: text(a.platformId), name: text(a.name), headline: text(a.headline), primaryText: text(a.primaryText), description: text(a.description),
        cta: text(a.cta), url: text(a.url), media: (Array.isArray(a.media) ? a.media : []).filter(function (m) { return typeof m === "string" && MEDIA_NAME_RE.test(m); }), status: a.status === "on" ? "on" : "paused" };
    });
  }
  function normaliseAnalysis(a) {
    return { id: text(a.id), campaignId: text(a.campaignId), at: text(a.at), summary: text(a.summary), working: textList(a.working), wasting: textList(a.wasting), couldNotSee: textList(a.couldNotSee) };
  }
  // An account change, or null when its kind isn't one Claude can make
  function normaliseAction(a) {
    if (ACTION_KINDS.indexOf(a.kind) === -1) return null;
    return { id: text(a.id), kind: a.kind, platform: text(a.platform) || "meta", campaignId: text(a.campaignId), buildId: text(a.buildId), adId: text(a.adId),
      budgetFrom: positive(a.budgetFrom), budgetTo: positive(a.budgetTo), status: ACTION_STATUSES.indexOf(a.status) > -1 ? a.status : "requested",
      requestedAt: text(a.requestedAt), doneAt: typeof a.doneAt === "string" && a.doneAt ? a.doneAt : null, readBack: text(a.readBack), note: text(a.note) };
  }

  const model = {
    PLATFORMS: PLATFORMS, LIMITS: LIMITS, COPY: COPY, RANGES: RANGES, LIGHT_LABELS: LIGHT_LABELS, HEALTH_LABELS: HEALTH_LABELS,
    CAMPAIGN_STATUS_LABELS: CAMPAIGN_STATUS_LABELS, BUILD_STATUS_LABELS: BUILD_STATUS_LABELS, RESULT_KINDS: RESULT_KINDS, MAX_MEDIA_BYTES: MAX_MEDIA_BYTES,
    normalise: normalise, validate: validate, money: money, symbol: symbol, pct: pct, num: num, change: change, roasText: roasText,
    platform: platform, platformsOn: platformsOn, isSetUp: isSetUp, hasFigures: hasFigures, weekStartsOf: weekStartsOf, campaignById: campaignById,
    resultName: resultName, resultPlural: resultPlural, costLabel: costLabel, targetFor: targetFor,
    rangeTotals: rangeTotals, costPerResult: costPerResult, roas: roas, roasReason: roasReason, realReturn: realReturn, rangeFor: rangeFor,
    weekStart: weekStart, weeks: weeks, thisAndLast: thisAndLast, byPlatform: byPlatform, byCampaign: byCampaign, bestWorst: bestWorst,
    light: light, historyDays: historyDays, pace: pace, capBreaches: capBreaches, buildChecks: buildChecks, inSeason: inSeason, seasonText: seasonText,
    figureAge: figureAge, health: health, healthOverall: healthOverall, todo: todo, newBuild: newBuild, buildGroups: buildGroups, suggestionCounts: suggestionCounts,
    charCount: charCount, preview: preview, monthlyEquivalent: monthlyEquivalent,
    mediaUrl: mediaUrl, mediaKind: mediaKind, mediaMime: mediaMime, checkMediaFile: checkMediaFile,
    ACTION_LABELS: ACTION_LABELS, ACTION_STATUS_LABELS: ACTION_STATUS_LABELS, PREDICTION_STATES: PREDICTION_STATES,
    predictionScore: predictionScore, predictionWords: predictionWords, adsFor: adsFor, actionChecks: actionChecks, actionSentence: actionSentence,
    todoList: todoList, newAction: newAction,
    logActivity: logActivity, addDaysIso: addDays, validIso: validIso, localDay: localDay, dayLabel: dayLabel, shortDate: shortDate, rangeLabel: rangeLabel,
    daysBetween: daysBetween, makeId: makeId, nowIso: nowIso
  };

  root.AD = root.AD || {};
  root.AD.model = model;
  root.AD.PLATFORMS = PLATFORMS;
  root.AD.LIMITS = LIMITS;
  root.AD.COPY = COPY;
  if (typeof module !== "undefined") module.exports = model;
})();
