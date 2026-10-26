/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Each function that draws returns HTML as text, with every value passed through ui.esc. A button with
  data-copy="text" copies that text when pressed, data-go="overview" moves to that view and
  data-open-invoice="<id>" opens that invoice (app.js handles all three). Every figure shown comes from
  MV.model; nothing here works out money.

  Also creates MV.views, where each page registers itself as MV.views.<name> = { render(root, ctx) }.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.MV.model;
  window.MV.views = window.MV.views || {};

  // Where the shared images live, worked out from the theme.css link so it survives moving
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = { welcome: SHARED + "images/claude-welcome.jpg" };

  // An amount in a pill. opts: round, signed (shows + or -), tone "auto" (default: red below zero), "plain" or "in" / "out"
  function moneyPill(amount, opts) {
    const o = opts || {}, n = Number(amount) || 0;
    const tone = o.tone || "auto";
    const cls = tone === "auto" ? (n < 0 ? "neg" : n === 0 ? "zero" : "plain") : tone;
    const text = (o.signed && n > 0 ? "+" : "") + M.money(n, { round: !!o.round });
    return '<span class="mpill mpill--' + cls + '">' + esc(text) + "</span>";
  }

  // Where a figure came from and when: "From Xero, 21 Oct", or "Estimate". opts.estimate marks it as a worked-out guess.
  function sourceTag(label, opts) {
    if (!label) return "";
    const o = opts || {};
    return '<span class="srctag' + (o.estimate ? " srctag--estimate" : "") + '"' + (o.title ? ' title="' + esc(o.title) + '"' : "") + ">" + esc(label) + "</span>";
  }
  // The source line for the balances: "From Xero, 21 Oct"
  function asAtTag(data) { return sourceTag(M.cashSource(data)); }

  // An invoice's state as a pill (draft, waiting, in-accounts, sent, part-paid, paid, overdue, void)
  function statePill(state, data) {
    const label = state === "in-accounts" ? "Draft in " + (M.appName(data || {}) === "your accounts app" ? "your accounts app" : M.appName(data)) : M.stateLabel(state);
    return '<span class="spill spill--' + esc(state) + '">' + esc(label) + "</span>";
  }

  // A figure that is also a button to a view. o: { go, label, value, sub, tagHtml, tone ("" | "warn" | "bad" | "good"), id }
  // tagHtml is HTML that is already safe (it comes from sourceTag, which escapes its text), so it is not escaped again.
  function statButton(o) {
    return '<button type="button" class="stat-card' + (o.tone ? " stat-card--" + o.tone : "") + '" data-go="' + esc(o.go) + '"' + (o.id ? ' id="' + esc(o.id) + '"' : "") + ">" +
      '<span class="stat-card__label">' + esc(o.label) + "</span>" +
      '<span class="stat-card__value">' + esc(o.value) + "</span>" +
      (o.sub ? '<span class="stat-card__sub">' + esc(o.sub) + "</span>" : "") +
      (o.tagHtml ? '<span class="stat-card__tag">' + o.tagHtml + "</span>" : "") + "</button>";
  }

  function emptyState(title, text) {
    return '<div class="empty empty--compact"><h3>' + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + "</div>";
  }

  // A phrase to say to Claude, with a Copy button
  function say(text) {
    return '<span class="say">' + esc(text) + '<button type="button" class="say__copy" data-copy="' + esc(text) + '">Copy</button></span>';
  }

  // Shown before setup (no business name, no accounts and no invoices), on every view and in the first Home box
  function setupCard() {
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + ART.welcome + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s set up your money view</h2>' +
      '<p class="muted">Open this folder in the Code tab of the Claude desktop app and type <strong>/setup</strong>. Claude connects to your accounts, sees your business bank account (read only), and fills in what is invoiced, what is paid and what is coming.</p>' +
      '<div class="setup-card__actions"><button type="button" class="btn btn--primary" data-copy="/setup">' + icon("fileText") + "Copy /setup</button></div>" +
      '<p class="muted setup-card__alt">Claude never moves money and never sends an invoice. You do that yourself.</p></div></section>';
  }

  // The "Include maybes" switch used on Overview, Months and What if
  function maybesSwitch(on) {
    return '<label class="switch maybes"><input type="checkbox" data-maybes' + (on ? " checked" : "") + '><span class="switch__track"></span>Include maybes</label>';
  }

  // The end of a promise chain. A save that failed has already been shown to the person by ctx.update,
  // so only any other error is shown here.
  function failed(err) {
    if (!err.shownToPerson) ui.toast(err.message);
  }

  // Today as "YYYY-MM-DD" from the page's context (a string, or a function that gives one)
  function todayOf(ctx) { return typeof ctx.today === "function" ? ctx.today() : ctx.today; }

  // "21 Oct", or "21 Oct 2025" when it is not this year (the year of `today`)
  function shortDate(iso, today) {
    const d = ui.parseDate(iso);
    if (!d) return "";
    const sameYear = d.getFullYear() === ui.parseDate(today).getFullYear();
    return d.toLocaleDateString("en-GB", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }

  window.MV.components = {
    ART: ART, moneyPill: moneyPill, sourceTag: sourceTag, asAtTag: asAtTag, statePill: statePill, statButton: statButton,
    emptyState: emptyState, say: say, setupCard: setupCard, maybesSwitch: maybesSwitch, failed: failed, todayOf: todayOf, shortDate: shortDate
  };
})();
