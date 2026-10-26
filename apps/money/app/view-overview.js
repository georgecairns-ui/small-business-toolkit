/*
  OVERVIEW: the first page
  ------------------------
  4 numbers at the top (each a button to its view), the forecast chart for the next 12 weeks, the tax pot,
  the flags tray and the next 14 days. Every figure comes from MV.model; this file only lays them out.
  The tax pot box suggests what to move and logs it when the owner says they have moved it. Nothing here
  moves money. Every change goes through ctx.update().
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  MV.views = MV.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  const FLAG_ICONS = { overdue: "clock", low: "alert", tax: "wallet", unusual: "flag", duplicate: "flag", other: "info" };
  const KIND_WORDS = { invoice: "Invoice due", expected: "Expected", outgoing: "Bill", tax: "Tax, estimate", scenario: "What if" };

  function invoiceSource(d) {
    const a = d.sources.accounts;
    if (a.mode === "none" || !a.app) return "From your invoices";
    return M.sourceLabel("accounts", d, a.checkedAt ? String(a.checkedAt).slice(0, 10) : null);
  }

  function stats(ctx, weeks, lp, owed, tp) {
    const d = ctx.data, cash = M.cashToday(d), nervous = d.settings.nervousBalance;
    const has = cash.accounts.length > 0;
    const lowTone = lp && lp.balance < 0 ? "bad" : lp && nervous > 0 && lp.balance < nervous ? "warn" : "";
    const taxSet = tp.percent > 0 || d.settings.vat.registered;
    return '<div class="stats">' +
      C.statButton({ go: "months", label: "Cash today", value: has ? M.money(cash.total) : "No balance yet", sub: has ? "Across " + cash.accounts.length + (cash.accounts.length === 1 ? " account" : " accounts") : "Add your accounts in Settings", tagHtml: has ? C.sourceTag(M.cashSource(d)) : "" }) +
      C.statButton({ go: "whatif", label: "Lowest point, next 12 weeks", value: has ? M.money(lp.balance) : "Not yet", sub: has ? M.weekLabel(lp.weekStart) : "Needs your balance first", tone: has ? lowTone : "", tagHtml: C.sourceTag("Estimate", { estimate: true }) }) +
      C.statButton({ go: "invoices", label: "Owed to you", value: M.money(owed.total), sub: owed.overdue > 0 ? M.money(owed.overdue) + " overdue" : owed.count ? "Nothing overdue" : "Nothing owed", tone: owed.overdue > 0 ? "warn" : "", tagHtml: C.sourceTag(invoiceSource(d)) }) +
      C.statButton({ go: "inout", label: "Tax pot", value: !taxSet ? "Not set up" : tp.toMove > 0 ? "Move " + M.money(tp.toMove) : "Up to date", sub: !taxSet ? "Add a percentage in Settings" : "Should have " + M.money(tp.shouldHave), tone: taxSet && tp.toMove > 0 ? "warn" : taxSet ? "good" : "", tagHtml: C.sourceTag("Estimate", { estimate: true }) }) +
      "</div>";
  }

  function chartPanel(ctx, weeks, hasData) {
    const d = ctx.data;
    return '<section class="panel" aria-label="Forecast"><div class="ov-head"><h2>The next 12 weeks</h2><div class="ov-head__tags">' + C.sourceTag("Estimate", { estimate: true }) + C.maybesSwitch(ctx.maybes) + "</div></div>" +
      (hasData ? '<div data-chart></div><p class="ov-tightest">' + esc(M.tightestLine(d, weeks)) + "</p>"
        : C.emptyState("No balance to draw yet", "Add your bank accounts in Settings, or press Refresh numbers. Claude reads them from your accounts app.")) + "</section>";
  }

  function taxBox(ctx, tp) {
    const d = ctx.data, s = d.settings, link = s.bank.link, bank = s.bank.name || "your bank";
    const safeLink = /^https?:\/\//i.test(link || "") ? link : "";
    const set = tp.percent > 0 || s.vat.registered;
    let body;
    if (!set) {
      body = '<p class="muted">Tell Money View what share of your money to set aside for tax (ask your accountant) and, if you are VAT registered, switch that on. Both are in Settings.</p>';
    } else {
      body = '<p class="tax-headline' + (tp.toMove > 0 ? "" : " tax-headline--ok") + '">' + (tp.toMove > 0 ? "Move " + esc(M.money(tp.toMove)) + " to your Tax pot" : "Your tax pot is up to date") + "</p>" +
        '<dl class="tax-table">' +
        (s.vat.registered ? "<div><dt>VAT you are holding" + (tp.vatPaid > 0 ? " (after the VAT you have already paid)" : "") + "</dt><dd>" + esc(M.money(tp.vatPart)) + "</dd></div>" : "") +
        "<div><dt>Set aside for tax (" + esc(tp.percent) + "% of money received after VAT)</dt><dd>" + esc(M.money(tp.incomePart)) + "</dd></div>" +
        (tp.taxPaid > 0 ? "<div><dt>Tax you have already paid this year</dt><dd>-" + esc(M.money(tp.taxPaid)) + "</dd></div>" : "") +
        '<div class="is-total"><dt>You should have</dt><dd>' + esc(M.money(tp.shouldHave)) + "</dd></div>" +
        "<div><dt>In your pot" + (tp.potKnown ? " (" + esc(tp.potName || "tax pot") + ")" : ", from what you have told us") + "</dt><dd>" + esc(M.money(tp.inPot)) + "</dd></div></dl>";
    }
    return '<section class="panel ov-box" id="taxBox"><div class="ov-box__head"><h2>Tax pot</h2>' + C.sourceTag("Estimate", { estimate: true }) + "</div>" + body +
      '<div class="tax-moved"><label class="field"><span class="field__label">Amount you moved</span><input class="input num" type="number" step="0.01" id="taxAmount" value="' + esc(tp.toMove) + '" aria-label="Amount you moved to the tax pot"></label>' +
      '<button type="button" class="btn" data-act="moved">' + icon("check") + "I’ve moved it</button></div>" +
      (safeLink ? '<div class="tax-actions"><a class="btn" href="' + esc(safeLink) + '" target="_blank" rel="noopener">' + icon("external") + "Open " + esc(bank) + "</a></div>" : "") +
      '<p class="muted">Claude works this out from what you’ve been paid. It never moves money. You move it yourself, then tell us here.</p></section>';
  }

  function flagsBox(ctx) {
    const flags = M.flags(ctx.data, ctx.today);
    const rows = flags.map(function (f) {
      let acts = "";
      if (f.action === "chase" && f.invoiceId) acts += '<button type="button" class="btn btn--sm" data-open-invoice="' + esc(f.invoiceId) + '" data-section="chase">Chase</button>';
      else if (f.action === "open" && f.invoiceId) acts += '<button type="button" class="btn btn--sm" data-open-invoice="' + esc(f.invoiceId) + '">Open invoice</button>';
      else if (f.action === "check") acts += '<button type="button" class="btn btn--sm" data-go="inout">Check</button>';
      else if (f.action === "refresh") acts += '<button type="button" class="btn btn--sm" data-act="refresh">Refresh numbers</button>';
      else if (f.action === "tax") acts += '<button type="button" class="btn btn--sm" data-act="tax-box">See the tax pot</button>';
      else if (!f.derived && f.invoiceId) acts += '<button type="button" class="btn btn--sm" data-open-invoice="' + esc(f.invoiceId) + '">Open invoice</button>';
      if (!f.derived) acts += '<button type="button" class="btn btn--sm btn--ghost" data-act="dismiss" data-id="' + esc(f.id) + '">Dismiss</button>';
      return '<li class="flag flag--' + esc(f.kind) + '"><span class="flag__icon">' + icon(FLAG_ICONS[f.kind] || "info") + '</span><span class="flag__text">' + esc(f.text) + "</span>" + (acts ? '<span class="flag__actions">' + acts + "</span>" : "") + "</li>";
    }).join("");
    return '<section class="panel ov-box"><div class="ov-box__head"><h2>Worth a look</h2></div>' +
      (rows ? '<ul class="flag-list">' + rows + "</ul>" : C.emptyState("Nothing needs you", "Overdue invoices, a tight week and a short tax pot show here.")) + "</section>";
  }

  function dayName(iso, today) {
    if (iso === today) return "Today";
    if (iso === M.addDaysIso(today, 1)) return "Tomorrow";
    return ui.parseDate(iso).toLocaleDateString("en-GB", { weekday: "long" }) + " " + M.dayLabel(iso);
  }
  function comingUp(ctx) {
    const items = M.comingUp(ctx.data, ctx.today, 14, { maybes: ctx.maybes });
    const days = [];
    items.forEach(function (it) {
      let day = days[days.length - 1];
      if (!day || day.date !== it.date) { day = { date: it.date, items: [] }; days.push(day); }
      day.items.push(it);
    });
    const html = days.map(function (day) {
      return '<li class="up-day"><span class="up-day__name">' + esc(dayName(day.date, ctx.today)) + '</span><ul class="up-list">' + day.items.map(function (it) {
        const inner = '<span class="up-row__main"><span class="up-row__name">' + esc(it.name) + '</span><span class="up-row__sub">' + esc((KIND_WORDS[it.kind] || "") + (it.late ? ", overdue so counted today" : "") + (it.maybe ? ", maybe" : "")) + "</span></span>" +
          (it.askAccountant ? '<span class="muted">Ask your accountant</span>' : C.moneyPill(it.amount, { tone: it.dir === "in" ? "in" : "out", signed: false }));
        return "<li>" + (it.kind === "invoice" && it.ref ? '<button type="button" class="up-row" data-open-invoice="' + esc(it.ref) + '">' + inner + "</button>" : '<div class="up-row">' + inner + "</div>") + "</li>";
      }).join("") + "</ul></li>";
    }).join("");
    return '<section class="panel ov-box"><div class="ov-box__head"><h2>Coming up in the next 14 days</h2>' + C.sourceTag("Estimate", { estimate: true }) + "</div>" +
      (html ? '<ul class="up-list">' + html + "</ul>" : C.emptyState("Nothing due in the next 14 days", "Invoices you have sent and bills you have confirmed show here on the day.")) + "</section>";
  }

  function render(root, ctx) {
    const d = ctx.data, today = ctx.today;
    const weeks = M.forecast(d, today, 12, { maybes: ctx.maybes });
    const lp = M.lowPoint(weeks), owed = M.owed(d, today), tp = M.taxPot(d, today);
    const hasData = d.accounts.length > 0 || weeks.some(function (w) { return w.items.length; });
    root.innerHTML = '<div class="ov-page">' + stats(ctx, weeks, lp, owed, tp) + chartPanel(ctx, weeks, hasData) +
      '<div class="ov-grid">' + taxBox(ctx, tp) + flagsBox(ctx) + "</div>" + comingUp(ctx) + "</div>";

    const host = root.querySelector("[data-chart]");
    if (host) MV.chart.forecast(host, [{ id: "base", label: "Your balance", weeks: weeks, tone: "accent" }], { nervous: d.settings.nervousBalance, label: "Your balance over the next 12 weeks" });

    root.onclick = function (e) {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.getAttribute("data-act");
      if (act === "refresh") ctx.runJob("refresh-money");
      else if (act === "tax-box") { const box = root.querySelector("#taxBox"); if (box) box.scrollIntoView({ behavior: ui.prefersReducedMotion() ? "auto" : "smooth", block: "center" }); }
      else if (act === "moved") logMove(ctx, root);
      else if (act === "dismiss") dismiss(ctx, b.getAttribute("data-id"));
    };
  }

  // The owner says they moved money to the tax pot: kept as a pot move, with an Undo
  function logMove(ctx, root) {
    const input = root.querySelector("#taxAmount"), amount = Math.round(Number(input.value) * 100) / 100;
    if (!isFinite(amount) || amount === 0) { ctx.toast("Type the amount you moved first"); input.focus(); return; }
    const id = M.makeId("m");
    ctx.update(function (d) { d.potMoves.unshift({ id: id, date: ctx.today, amount: amount, note: "" }); },
      (amount > 0 ? "Moved " : "Took out ") + M.money(Math.abs(amount)) + (amount > 0 ? " to the tax pot" : " from the tax pot")).then(function () {
      ctx.toast("Logged " + M.money(Math.abs(amount)) + (amount > 0 ? " moved to your tax pot" : " taken out of your tax pot"), function () {
        ctx.update(function (d) { d.potMoves = d.potMoves.filter(function (m) { return m.id !== id; }); }, "Undid the tax pot move").catch(function (err) { C.failed(err); });
      });
    }).catch(function (err) { C.failed(err); });
  }
  // A flag Claude wrote is kept, marked dismissed, with an Undo
  function dismiss(ctx, id) {
    ctx.update(function (d) { const f = d.flags.filter(function (x) { return x.id === id; })[0]; if (f) f.status = "dismissed"; }, "Dismissed a flag").then(function () {
      ctx.toast("Dismissed", function () {
        ctx.update(function (d) { const f = d.flags.filter(function (x) { return x.id === id; })[0]; if (f) f.status = "open"; }).catch(function (err) { C.failed(err); });
      });
    }).catch(function (err) { C.failed(err); });
  }

  MV.views.overview = { render: render };
})();
