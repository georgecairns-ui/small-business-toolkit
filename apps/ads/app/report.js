/*
  REPORT: prints the app's own numbers as plain text, for Claude to read
  ----------------------------------------------------------------------
  Claude never works out a total or a cost itself. It runs this and quotes what it prints.
    node apps/ads/app/report.js week [YYYY-MM-DD]   the week containing that day (this week by default)
    node apps/ads/app/report.js todo                what is waiting on the owner, and how old the newest figures are
    node apps/ads/app/report.js checks <buildId>    the budget and season checks for one build, ending OK or BLOCKED
    node apps/ads/app/report.js campaign <id>       one campaign: totals, 12 weeks, its light, its ads and its prediction score
    node apps/ads/app/report.js action <id>         the limits check for one account change the owner approved, ending OK or BLOCKED
  It reads apps/ads/data/ads.json and uses model.js, so every number here is the number the app shows.
  Nothing is written anywhere. No packages.
*/
"use strict";

const fs = require("fs");
const path = require("path");
const M = require("./model.js");

const DATA_FILE = path.join(__dirname, "..", "data", "ads.json");

function todayLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function load(file) {
  const raw = JSON.parse(fs.readFileSync(file || DATA_FILE, "utf8"));
  M.validate(raw);
  return M.normalise(raw);
}

function change(frac) { return frac === null ? "no earlier figure to compare" : M.pct(frac, { sign: true }) + " on the same days last week"; }
function costText(t) { return t.costPerResult === null ? "no results yet" : M.money(t.costPerResult); }
function returnText(data, t) { const r = M.roas(data, t); return r ? M.roasText(r, data) : M.roasReason(data, t) || "not known"; }

// The text for one week. asOf is the day the figures are read up to: the week's end, or today if the week isn't over.
function weekReport(data, dateIso, todayIso) {
  const wk = M.weekStart(dateIso, M.weekStartsOf(data)), end = M.addDaysIso(wk, 6), asOf = end < todayIso ? end : todayIso;
  const word = M.resultPlural(data), lines = [];
  const range = { from: wk, to: asOf, prevFrom: M.addDaysIso(wk, -7), prevTo: M.addDaysIso(wk, -7 + M.daysBetween(wk, asOf)) };
  lines.push("Week of " + M.dayLabel(wk) + " to " + M.dayLabel(end) + (asOf < end ? " (so far, up to " + M.dayLabel(asOf) + ")" : ""));
  if (!M.hasFigures(data)) { lines.push("", M.COPY.noFigures); return lines.join("\n"); }

  const tl = M.thisAndLast(data, asOf), t = tl.thisWeek;
  if (!t.days) lines.push("", "There are no figures for this week yet.");
  lines.push("", "All platforms");
  lines.push("  Spend: " + M.money(t.spend) + " (" + change(tl.change.spend) + ")");
  lines.push("  " + word.charAt(0).toUpperCase() + word.slice(1) + ": " + M.num(t.results) + " (" + change(tl.change.results) + ")");
  lines.push("  " + M.costLabel(data) + ": " + costText(t) + (tl.change.costPerResult !== null ? " (" + change(tl.change.costPerResult) + ")" : ""));
  lines.push("  Return on ad spend: " + returnText(data, t));
  lines.push("  Last week in full: " + M.money(tl.lastWeek.spend) + " spent, " + M.num(tl.lastWeek.results) + " " + word + ", " + M.costLabel(data).toLowerCase() + " " + costText(tl.lastWeek));
  const real = M.realReturn(data, { from: wk, to: asOf });
  if (real) lines.push("  From customers you've won: " + real.count + " won, " + M.money(real.value) + (real.ratio === null ? "" : ", " + M.roasText({ ratio: real.ratio, estimated: false }, data)));

  lines.push("", "By platform (" + M.COPY.countingNote + ")");
  M.byPlatform(data, range).forEach(function (p) {
    lines.push("  " + p.platform.short + ": " + M.money(p.totals.spend) + " spent, " + M.num(p.totals.results) + " " + word + ", " + M.costLabel(data).toLowerCase() + " " + costText(p.totals) +
      (p.target ? " against a target of " + M.money(p.target) : " (no target set)") + ". " + p.light.label + (p.light.why ? ": " + p.light.why : "."));
  });

  const rows = M.byCampaign(data, range).filter(function (r) { return r.totals.days > 0; }).sort(function (a, b) { return b.totals.spend - a.totals.spend; });
  lines.push("", "By campaign");
  if (!rows.length) lines.push("  No campaign has figures this week.");
  rows.forEach(function (r) {
    lines.push("  " + r.campaign.name + " (" + M.platform(r.campaign.platform).short + ", " + r.campaign.status + "): " + M.money(r.totals.spend) + " spent, " + M.num(r.totals.results) + " " + word +
      ", " + M.costLabel(data).toLowerCase() + " " + costText(r.totals) + ". " + r.light.label + ".");
  });
  const bw = M.bestWorst(data, range);
  if (bw.best) lines.push("", "Best campaign by " + M.costLabel(data).toLowerCase() + ": " + bw.best.campaign.name + " at " + M.money(bw.best.totals.costPerResult));
  if (bw.worst) lines.push("Worst campaign by " + M.costLabel(data).toLowerCase() + ": " + bw.worst.campaign.name + " at " + M.money(bw.worst.totals.costPerResult));

  const p = M.pace(data, asOf);
  lines.push("", "This month so far: " + M.money(p.spent) + " spent" + (p.budget ? " of a " + M.money(p.budget) + " budget, heading for " + M.money(p.projected) + " by the month end" : " (no monthly budget set)"));
  const b = M.capBreaches(data, asOf);
  if (b.dailyCap || b.weeklyCap) {
    if (!b.count) lines.push("Spending limits: nothing over in the last 14 days.");
    b.days.forEach(function (d) { lines.push("Over the daily limit on " + M.dayLabel(d.date) + ": " + M.money(d.spend) + " against " + M.money(d.cap)); });
    b.weeks.forEach(function (w) { lines.push("Over the weekly limit, week of " + M.shortDate(w.start) + ": " + M.money(w.spend) + " against " + M.money(w.cap)); });
  } else lines.push("Spending limits: none set.");
  return lines.join("\n");
}

// How old the newest figures are, in a line: "Newest figures: 2 days old"
function ageLine(data, todayIso) {
  const f = M.figureAge(data, todayIso);
  if (!f) return "Newest figures: none yet";
  return "Newest figures: " + (f.age === 0 ? "from today" : f.age + (f.age === 1 ? " day old" : " days old"));
}

// The To do lists (what Claude can do, what only the owner can do), then anything else waiting on the owner, then how old the newest figures are
function todoReport(data, todayIso, opts) {
  const t = M.todo(data, todayIso), list = M.todoList(data, todayIso, opts), age = ageLine(data, todayIso), lines = [];
  const covered = { review: true, "switch-on": true };   // already in the lists above
  const more = t.items.filter(function (it) { return !covered[it.kind]; });
  if (!list.claude.length && !list.you.length && !more.length) return "Nothing is waiting on you in your ads.\n" + age;
  lines.push("Claude can do (" + list.claude.length + ")");
  if (!list.claude.length) lines.push("  Nothing right now.");
  list.claude.forEach(function (it) { lines.push("  " + it.label + " (" + it.why + ")"); });
  lines.push("", "You need to (" + list.you.length + ")");
  if (!list.you.length) lines.push("  Nothing right now.");
  list.you.forEach(function (it) { lines.push("  " + it.label + " (" + it.why + ") Give Claude: " + it.give); });
  if (more.length) {
    lines.push("", "Also waiting on you (" + more.length + ")");
    more.forEach(function (it) { lines.push("  " + it.title + (it.sub ? " (" + it.sub + ")" : "")); });
  }
  lines.push("", age);
  return lines.join("\n");
}

// One campaign: its last 4 weeks and all-time totals, its light, 12 weeks, its ads and how it is doing against its prediction
function campaignReport(data, campaignId, todayIso) {
  const c = M.campaignById(data, campaignId);
  if (!c) throw new Error("There is no campaign with the id " + campaignId + ".");
  const word = M.resultPlural(data), cost = M.costLabel(data).toLowerCase(), lines = [];
  const range = { from: M.addDaysIso(todayIso, -27), to: todayIso, campaignId: c.id };
  const t = M.rangeTotals(data, range), all = M.rangeTotals(data, { to: todayIso, campaignId: c.id });
  t.historyDays = M.historyDays(data, { campaignId: c.id }, todayIso);
  const l = M.light(t, M.targetFor(data, c.platform));
  lines.push(c.name + " (" + M.platform(c.platform).short + ", " + c.status + (c.dailyBudget ? ", " + M.money(c.dailyBudget) + " a day" : "") + ")");
  if (!all.days) { lines.push("", "There are no figures for this campaign yet."); }
  else {
    lines.push("", "Last 4 weeks (" + M.rangeLabel(range.from, range.to) + ")");
    lines.push("  Spend: " + M.money(t.spend) + ", " + word + ": " + M.num(t.results) + ", " + cost + ": " + costText(t) + ", return on ad spend: " + returnText(data, t));
    lines.push("  Light: " + l.label + (l.target ? " (target " + M.money(l.target) + ")" : "") + (l.why ? ". " + l.why : ""));
    lines.push("All time: " + M.money(all.spend) + " spent, " + M.num(all.results) + " " + word + ", " + cost + " " + costText(all) + ", " + all.days + " days of figures");
    lines.push("", "Week by week (12 weeks, oldest first)");
    M.weeks(data, 12, todayIso, { campaignId: c.id }).forEach(function (w) {
      lines.push("  Week of " + M.shortDate(w.start) + (w.partial ? " (so far)" : "") + ": " + (w.hasFigures ? M.money(w.spend) + " spent, " + M.num(w.results) + " " + word + ", " + cost + " " + costText(w) : "no figures"));
    });
  }
  const ads = M.adsFor(data, c.id, { from: range.from, to: range.to });
  lines.push("", "Ads (" + ads.length + ")");
  if (!ads.length) lines.push("  Claude hasn't read this campaign's ads yet.");
  ads.forEach(function (x) {
    lines.push("  " + (x.ad.name || x.ad.headline || "An ad") + " (" + x.ad.status + "): " + (x.totals ? M.money(x.totals.spend) + " spent, " + M.num(x.totals.results) + " " + word + ", " + cost + " " + costText(x.totals) : "no figures for it in the last 4 weeks") + (x.ad.headline ? ". Headline: " + x.ad.headline : ""));
  });
  const s = M.predictionScore(data, c, todayIso);
  lines.push("", "Prediction: " + s.label);
  lines.push("  " + M.predictionWords(s, data));
  if (c.prediction && c.prediction.assumptions.length) lines.push("  Assumptions: " + c.prediction.assumptions.join(" "));
  s.sums.forEach(function (x) { lines.push("  " + x); });
  const a = (data.analyses || []).filter(function (x) { return x.campaignId === c.id; })[0];
  if (a) lines.push("", "Newest analysis (" + (M.localDay(a.at) ? M.dayLabel(M.localDay(a.at)) : "undated") + "): " + a.summary);
  return lines.join("\n");
}

// One account change the owner approved, with its limits check, ending OK or BLOCKED
function actionReport(data, actionId, todayIso) {
  const a = (data.actions || []).find(function (x) { return x.id === actionId; });
  if (!a) throw new Error("There is no account change with the id " + actionId + ".");
  const c = M.actionChecks(data, a, todayIso), lines = ["Change: " + M.actionSentence(data, a, todayIso), "Status: " + (M.ACTION_STATUS_LABELS[a.status] || a.status)];
  if (c.budget && c.budget.daily) {
    const b = c.budget;
    lines.push("  New daily budget: " + M.money(b.daily) + " a day");
    lines.push("  Already running: " + M.money(b.existing) + " a day (the last 7 days, divided by 7)");
    lines.push("  Room per day: " + roomText(b.dailyCap, b.existing, "a day") + (b.dailyCap !== null ? " (daily limit " + M.money(b.dailyCap) + ")" : ""));
    lines.push("  Room per month: " + roomText(b.monthlyBudget, M.monthlyEquivalent(b.existing), "a month") + (b.monthlyBudget !== null ? " (monthly budget " + M.money(b.monthlyBudget) + ")" : ""));
    lines.push("  In all: " + M.money(b.total) + " a day, about " + M.money(b.monthly) + " a month");
  }
  if (c.season) lines.push("  Season: " + c.season.label + " (" + c.season.text + ")");
  if (c.warnings.length) { lines.push("Warnings"); c.warnings.forEach(function (w) { lines.push("  " + w); }); }
  else lines.push("Warnings: none");
  lines.push("Result: " + (c.ok ? "OK" : "BLOCKED"));
  return lines.join("\n");
}

// What is left under a limit: "£12 a day left", "no room (£4 over)" or "no limit set"
function roomText(limit, used, unit) {
  if (limit === null) return "no limit set";
  const left = limit - used;
  return left > 1e-9 ? M.money(left) + " " + unit + " left" : "no room" + (left < -1e-9 ? " (" + M.money(-left) + " over)" : "");
}

// The budget and season checks for one build, as the app works them out, ending OK or BLOCKED
function checksReport(data, buildId, todayIso) {
  const build = (data.builds || []).find(function (b) { return b.id === buildId; });
  if (!build) throw new Error("There is no campaign with the id " + buildId + ".");
  const c = M.buildChecks(data, build, todayIso), b = c.budget, p = M.platform(build.platform);
  const lines = ["Checks for " + (build.name || "Untitled campaign") + (p ? " (" + p.short + ")" : "")];
  lines.push("  This campaign: " + (b.daily === null ? "no daily budget yet" : M.money(b.daily) + " a day, about " + M.money(M.monthlyEquivalent(b.daily)) + " a month"));
  lines.push("  Already running: " + M.money(b.existing) + " a day (the last 7 days, divided by 7)");
  lines.push("  Room per day: " + roomText(b.dailyCap, b.existing, "a day") + (b.dailyCap !== null ? " (daily limit " + M.money(b.dailyCap) + ")" : ""));
  lines.push("  Room per month: " + roomText(b.monthlyBudget, M.monthlyEquivalent(b.existing), "a month") + (b.monthlyBudget !== null ? " (monthly budget " + M.money(b.monthlyBudget) + ")" : ""));
  lines.push("  In all with this campaign: " + M.money(b.total) + " a day, about " + M.money(b.monthly) + " a month");
  if (c.season) lines.push("  Season: " + c.season.label + " (" + c.season.text + ")");
  else lines.push("  Season: none set");
  if (c.warnings.length) { lines.push("Warnings"); c.warnings.forEach(function (w) { lines.push("  " + w); }); }
  else lines.push("Warnings: none");
  lines.push("Result: " + (c.ok ? "OK" : "BLOCKED"));
  return lines.join("\n");
}

function main(argv) {
  const command = argv[0];
  if (["week", "todo", "checks", "campaign", "action"].indexOf(command) === -1) {
    console.error("Use: node apps/ads/app/report.js week [YYYY-MM-DD]   or   todo   or   checks <buildId>   or   campaign <id>   or   action <id>");
    process.exit(2);
  }
  const today = todayLocal(), data = load();
  if (command === "todo") { console.log(todoReport(data, today)); return; }
  if (command === "checks") {
    if (!argv[1]) { console.error("Say which campaign: node apps/ads/app/report.js checks <buildId>"); process.exit(2); }
    if (!(data.builds || []).some(function (x) { return x.id === argv[1]; })) { console.error("There is no campaign with the id " + argv[1] + "."); process.exit(2); }
    console.log(checksReport(data, argv[1], today));
    return;
  }
  if (command === "campaign") {
    if (!argv[1]) { console.error("Say which campaign: node apps/ads/app/report.js campaign <id>"); process.exit(2); }
    if (!M.campaignById(data, argv[1])) { console.error("There is no campaign with the id " + argv[1] + "."); process.exit(2); }
    console.log(campaignReport(data, argv[1], today));
    return;
  }
  if (command === "action") {
    if (!argv[1]) { console.error("Say which change: node apps/ads/app/report.js action <id>"); process.exit(2); }
    if (!(data.actions || []).some(function (x) { return x.id === argv[1]; })) { console.error("There is no account change with the id " + argv[1] + "."); process.exit(2); }
    console.log(actionReport(data, argv[1], today));
    return;
  }
  const date = argv[1] || today;
  if (!M.validIso(date)) { console.error("That date isn't YYYY-MM-DD: " + date); process.exit(2); }
  if (date > today) { console.error("That date is in the future: " + date); process.exit(2); }
  console.log(weekReport(data, date, today));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { weekReport: weekReport, todoReport: todoReport, checksReport: checksReport, campaignReport: campaignReport, actionReport: actionReport, load: load };
