/*
  THIS WEEK: Claude's summary, the figures beside it, and what it suggests you change
  ------------------------------------------------------------------------------------
  The newest summary is Claude's words only. Beside it are the app's own figures for the same week, so
  every number on this page comes from AD.model and none is typed by Claude. Earlier weeks fold away
  underneath. Then the suggestions: Approve means "I will make this change" (Claude never makes it),
  Not now hides it (with an Undo), and Done is for one you have made.

  The two buttons ask Claude for a summary (how-did-the-ads-do) and for suggestions (what-should-i-change).
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  const KINDS = { pause: "Pause", budget: "Budget", test: "Test", words: "Ad words", audience: "Audience", landing: "Landing page", other: "Other" };
  const EARLIER_SHOWN = 12;
  const DONE_SHOWN = 5;
  // The jobs being run from this page right now, so a button can't be pressed twice
  const busy = {};

  function todayOf(ctx) { return typeof ctx.today === "function" ? ctx.today() : (ctx.today || ui.isoDate()); }
  function findSuggestion(d, id) { return d.suggestions.find(function (s) { return s.id === id; }); }

  // The figures for a week (Claude's summary covers every platform), set against the same days of the week before
  function weekFigures(ctx, start) {
    const today = todayOf(ctx), end = M.addDaysIso(start, 6) > today ? today : M.addDaysIso(start, 6);
    const days = M.daysBetween(start, end), prevFrom = M.addDaysIso(start, -7);
    const range = { from: start, to: end };
    return { range: range, now: M.rangeTotals(ctx.data, range), before: M.rangeTotals(ctx.data, { from: prevFrom, to: M.addDaysIso(prevFrom, days) }), partial: end < M.addDaysIso(start, 6), bw: M.bestWorst(ctx.data, range) };
  }

  function figureRow(label, value, delta, note) {
    return '<div class="wk-fig"><dt>' + esc(label) + '</dt><dd><span class="wk-fig__value num">' + value + "</span>" + (delta ? '<span class="wk-fig__delta">' + delta + "</span>" : "") + (note ? '<span class="wk-fig__note muted">' + note + "</span>" : "") + "</dd></div>";
  }
  function figures(ctx, start) {
    const C = window.AD.components, f = weekFigures(ctx, start), t = f.now, p = f.before, word = M.resultPlural(ctx.data);
    const roas = M.roas(ctx.data, t);
    const cheap = f.bw.best, dear = f.bw.worst;
    return '<div class="wk-figs"><h3 class="wk-figs__title">The figures for the week of ' + esc(M.shortDate(start)) + (f.partial ? ' <span class="muted">(so far)</span>' : "") + '</h3><dl class="wk-figs__list">' +
      figureRow("Spend", esc(M.money(t.spend)), C.delta(M.change(t.spend, p.spend), ""), "was " + esc(M.money(p.spend))) +
      figureRow(word.charAt(0).toUpperCase() + word.slice(1), esc(M.num(t.results)), C.delta(M.change(t.results, p.results), "up"), "was " + esc(M.num(p.results))) +
      figureRow(M.costLabel(ctx.data), t.costPerResult === null ? "-" : esc(M.money(t.costPerResult)), C.delta(M.change(t.costPerResult, p.costPerResult), "down"), p.costPerResult === null ? "" : "was " + esc(M.money(p.costPerResult))) +
      figureRow("Return", roas ? esc(M.roasText(roas, ctx.data)) : "-", "", roas ? "" : esc(M.roasReason(ctx.data, t))) + "</dl>" +
      (cheap ? '<p class="wk-bw"><span class="wk-bw__label">Best</span> <button type="button" class="link-btn" data-campaign="' + esc(cheap.campaign.id) + '">' + esc(cheap.campaign.name) + "</button> at " + esc(M.money(cheap.totals.costPerResult)) + " each</p>" : "") +
      (dear ? '<p class="wk-bw"><span class="wk-bw__label">Weakest</span> <button type="button" class="link-btn" data-campaign="' + esc(dear.campaign.id) + '">' + esc(dear.campaign.name) + "</button> at " + esc(M.money(dear.totals.costPerResult)) + " each</p>" : "") +
      "</div>";
  }

  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n|\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return "<p>" + esc(s) + "</p>"; }).join("");
  }

  function summarySection(ctx) {
    const C = window.AD.components, list = ctx.data.summaries, latest = list[0];
    const start = latest && M.validIso(latest.weekStart) ? latest.weekStart : M.weekStart(todayOf(ctx), M.weekStartsOf(ctx.data));
    const words = latest ?
      '<div class="wk-words"><h3 class="wk-words__title">Claude’s summary, week of ' + esc(M.shortDate(start)) + "</h3>" + paragraphs(latest.text) + '<p class="muted wk-words__note">Written by Claude from the figures beside it.</p></div>' :
      '<div class="wk-words"><h3 class="wk-words__title">No summary yet</h3><p class="muted">Press “Write this week’s summary” and Claude reads your figures and writes a few plain sentences. It only quotes the numbers shown beside it.</p></div>';
    return '<section class="wk-summary card">' + words + (M.hasFigures(ctx.data) ? figures(ctx, start) : '<div class="wk-figs">' + C.emptyState("No figures yet", M.COPY.noFigures) + "</div>") + "</section>";
  }

  function earlier(ctx) {
    const list = ctx.data.summaries.slice(1, 1 + EARLIER_SHOWN);
    if (!list.length) return "";
    return '<section class="wk-earlier"><h2 class="wk-h">Earlier weeks</h2>' + list.map(function (s) {
      const start = M.validIso(s.weekStart) ? s.weekStart : null;
      const t = start ? M.rangeTotals(ctx.data, { from: start, to: M.addDaysIso(start, 6) }) : null;
      const facts = t && t.days ? esc(M.money(t.spend)) + " spent, " + esc(M.num(t.results)) + " " + esc(M.resultPlural(ctx.data)) + (t.costPerResult === null ? "" : ", " + esc(M.money(t.costPerResult)) + " each") : "";
      return '<details class="wk-old card"><summary><span class="wk-old__week">Week of ' + esc(start ? M.shortDate(start) : "an earlier date") + '</span><span class="wk-old__facts muted">' + facts + "</span></summary>" + paragraphs(s.text) + "</details>";
    }).join("") + "</section>";
  }

  function suggestionCard(ctx, s) {
    const C = window.AD.components, id = esc(s.id), c = s.campaignId ? M.campaignById(ctx.data, s.campaignId) : null;
    let buttons = "";
    if (s.status === "new") {
      buttons = '<button type="button" class="btn btn--sm btn--approve" data-sug="approve" data-id="' + id + '">' + icon("check") + "Approve</button>" +
        '<button type="button" class="btn btn--sm btn--ghost" data-sug="dismiss" data-id="' + id + '">Not now</button>';
    } else if (s.status === "approved") {
      buttons = '<span class="chip chip--success">' + icon("check") + "You said you’ll do this</span>" +
        '<button type="button" class="btn btn--sm" data-sug="done" data-id="' + id + '">' + icon("check") + "Done</button>";
    }
    return '<li class="card sug-card sug-card--' + esc(s.status) + '"><div class="sug-card__top"><span class="chip">' + esc(KINDS[s.kind] || "Other") + "</span>" + (s.platform ? C.platformTag(s.platform) : "") +
      (c ? '<button type="button" class="link-btn sug-card__camp" data-campaign="' + esc(c.id) + '">' + esc(c.name) + "</button>" : "") + "</div>" +
      '<h3 class="sug-card__title">' + esc(s.title) + "</h3>" + (s.why ? '<p class="sug-card__why">' + esc(s.why) + "</p>" : "") +
      (buttons ? '<div class="sug-card__actions">' + buttons + "</div>" : "") + "</li>";
  }
  function suggestionsSection(ctx) {
    const C = window.AD.components, all = ctx.data.suggestions;
    const open = all.filter(function (s) { return s.status === "new"; }), approved = all.filter(function (s) { return s.status === "approved"; });
    const done = all.filter(function (s) { return s.status === "done"; }).slice(0, DONE_SHOWN);
    const shown = open.concat(approved);
    return '<section class="wk-sugs"><div class="wk-sugs__head"><h2 class="wk-h">What Claude suggests you change</h2>' +
      '<button type="button" class="btn" data-job="what-should-i-change"' + (busy["what-should-i-change"] ? " disabled" : "") + ">" + icon("sparkle") + "What should I change?</button></div>" +
      '<p class="wk-sugs__note muted">Approve means you will make the change yourself. Claude never pauses, edits or re-budgets a campaign that is in your account.</p>' +
      (shown.length ? '<ul class="sug-list">' + shown.map(function (s) { return suggestionCard(ctx, s); }).join("") + "</ul>" :
        C.emptyState("Nothing to decide", "Claude adds suggestions when you press “What should I change?”, with a plain reason for each. Anything you approve shows here until you mark it done.")) +
      (done.length ? '<details class="wk-done"><summary>Made recently (' + done.length + ')</summary><ul class="sug-list sug-list--quiet">' + done.map(function (s) {
        return '<li class="sug-done"><span class="chip">' + esc(KINDS[s.kind] || "Other") + "</span><span>" + esc(s.title) + "</span></li>";
      }).join("") + "</ul></details>" : "") + "</section>";
  }

  // ---------- What the buttons do ----------
  function runJob(ctx, name, root) {
    if (busy[name]) return;
    busy[name] = true;
    AD.views.week.render(root, ctx);
    ctx.runJob(name).catch(function (err) { if (!err.shownToPerson) ctx.toast(err.message); }).then(function () {
      delete busy[name];
      ctx.redraw();
    });
  }
  // Moves a suggestion to a new state, logged, with an Undo that puts it back as it was
  function decide(ctx, id, status, text, undoText, toast, after) {
    const s = findSuggestion(ctx.data, id), before = { status: s.status, decidedAt: s.decidedAt || null }, title = s.title;
    ctx.update(function (d) { const x = findSuggestion(d, id); x.status = status; x.decidedAt = M.nowIso(); }, text + title, id).then(function () {
      if (after) after();
      ctx.toast(toast, function () {
        ctx.update(function (d) { const x = findSuggestion(d, id); x.status = before.status; x.decidedAt = before.decidedAt; }, undoText + title, id).catch(function (err) { window.AD.components.reportFailure(ctx, err); });
      });
    }).catch(function (err) { window.AD.components.reportFailure(ctx, err); });
  }

  function onClick(ctx, root) {
    return function (e) {
      const job = e.target.closest("[data-job]");
      if (job) { runJob(ctx, job.getAttribute("data-job"), root); return; }
      const camp = e.target.closest("[data-campaign]");
      if (camp) { ctx.openDrawer("campaign", camp.getAttribute("data-campaign")); return; }
      const sug = e.target.closest("[data-sug]");
      if (!sug) return;
      const id = sug.getAttribute("data-id");
      switch (sug.getAttribute("data-sug")) {
        case "approve": decide(ctx, id, "approved", "Approved the suggestion: ", "Took back the approval of: ", "Approved. It is yours to make: Claude won’t change anything.", function () { ctx.sendToTaskList(); }); break;
        case "dismiss": decide(ctx, id, "dismissed", "Not now for the suggestion: ", "Brought back the suggestion: ", "Not now"); break;
        case "done": decide(ctx, id, "done", "Marked as made: ", "Marked as not made after all: ", "Marked as done"); break;
      }
    };
  }

  AD.views.week = {
    title: "This week",
    line: function (ctx) {
      const latest = ctx.data.summaries[0], n = ctx.data.suggestions.filter(function (s) { return s.status === "new"; }).length;
      const first = latest && M.validIso(latest.weekStart) ? "Summary for the week of " + M.shortDate(latest.weekStart) : "No summary yet";
      return first + (n ? ", " + n + (n === 1 ? " suggestion" : " suggestions") + " to decide" : "");
    },
    render: function (root, ctx) {
      const head = '<div class="wk-head"><h2 class="wk-h">Your week in ads</h2><button type="button" class="btn btn--primary" data-job="how-did-the-ads-do"' + (busy["how-did-the-ads-do"] ? " disabled" : "") + ">" + icon("sparkle") + (busy["how-did-the-ads-do"] ? "Claude is writing…" : "Write this week’s summary") + "</button></div>";
      root.innerHTML = '<div class="wk-page">' + head + summarySection(ctx) + suggestionsSection(ctx) + earlier(ctx) + "</div>";
      root.onclick = onClick(ctx, root);
    }
  };
})();
