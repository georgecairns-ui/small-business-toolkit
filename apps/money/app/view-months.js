/*
  MONTHS: this month, a chart of every month, and a table
  -------------------------------------------------------
  From top to bottom: a summary of this month (the difference, and what has been paid, what is still due, what is
  expected and what goes out), a column chart of the last 3 months, this one and the next 6, and a table with a row
  for each. Past months say Actual, this month says This month and later ones say Estimate. A click on a table row
  or a chart column opens that month's items. Every figure comes from MV.model.months; this file only lays them out.
  The page is its own size container: under 560 pixels the table becomes compact rows, with no sideways scroll.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  MV.views = MV.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  const KIND_WORDS = { actual: "Actual", now: "This month", estimate: "Estimate" };
  const SECTIONS = [["invoiced", "Invoiced"], ["paid", "Paid"], ["due", "Due"], ["expected", "Expected"], ["outgoing", "Money out"], ["tax", "Tax and VAT"], ["scenario", "What if"]];
  let openMonth = null;   // the month whose items are showing; kept while the page is drawn again

  // "+£1,200", "-£300" or "£0": the sign is only for reading, the figure is the model's
  function signed(v) { return (v > 0 ? "+" : "") + M.money(v, { round: true }); }
  function tone(v) { return v < 0 ? "bad" : v > 0 ? "good" : "zero"; }
  function invoiceSource(d) {
    const a = d.sources.accounts;
    if (a.mode === "none" || !a.app) return "From your invoices";
    return M.sourceLabel("accounts", d, a.checkedAt ? String(a.checkedAt).slice(0, 10) : null);
  }
  function kindTag(m) {
    if (m.kind === "now") return '<span class="mt-tag mt-tag--now">This month</span>';
    return C.sourceTag(KIND_WORDS[m.kind], { estimate: m.kind === "estimate" });
  }

  // 1. This month
  function nowFig(label, value, tagHtml) {
    return '<div class="mo-fig"><dt>' + esc(label) + "</dt><dd>" + esc(M.money(value, { round: true })) + "</dd>" + (tagHtml ? "<dd class=\"mo-fig__tag\">" + tagHtml + "</dd>" : "") + "</div>";
  }
  function thisMonth(d, m) {
    const t = tone(m.net);
    const outTag = m.outBasis === "estimate" ? C.sourceTag("Estimate", { estimate: true }) : C.sourceTag("So far, then estimate", { estimate: true });
    return '<section class="panel mo-now" aria-label="This month"><div class="mo-now__lead"><span class="label">This month</span><h2>' + esc(m.label) + "</h2>" +
      '<p class="mo-now__diff mo-now__diff--' + t + '">' + esc(signed(m.net)) + '</p><p class="mo-now__sub">Difference: money in less money out, for the whole month</p>' + C.sourceTag("Estimate", { estimate: true }) + "</div>" +
      '<dl class="mo-now__figs">' +
      nowFig("Paid so far", m.paid, C.sourceTag(invoiceSource(d))) +
      nowFig("Still due this month", m.due, C.sourceTag(invoiceSource(d))) +
      nowFig("Expected", m.expected, C.sourceTag("Estimate", { estimate: true })) +
      nowFig("Money out", m.out, outTag) + "</dl></section>";
  }

  // 3. The items in a month, as a clean list
  function detail(m) {
    const groups = {};
    m.items.forEach(function (it) { (groups[it.kind] = groups[it.kind] || []).push(it); });
    const html = SECTIONS.filter(function (s) { return groups[s[0]]; }).map(function (s) {
      return '<div class="mdet"><h3>' + esc(s[1]) + "</h3><ul>" + groups[s[0]].map(function (it) {
        return '<li><span class="mdet__date">' + esc(M.dayLabel(it.date)) + '</span><span class="mdet__name">' + esc(it.name) + (it.estimate ? ' <span class="muted">(estimate)</span>' : "") + (it.late ? ' <span class="muted">(overdue)</span>' : "") + "</span><b>" +
          (it.askAccountant ? "ask your accountant" : (it.dir === "out" ? "-" : "") + esc(M.money(it.amount))) + "</b></li>";
      }).join("") + "</ul></div>";
    }).join("");
    const note = m.kind !== "estimate" && m.outBasis === "estimate" ? '<p class="mdet__note muted">There are no bank lines for the days that have gone, so money out comes from your regular bills. It is an estimate.</p>' : "";
    return (html || '<p class="muted">Nothing in this month yet.</p>') + note;
  }

  function table(rows) {
    return '<section class="panel mt-panel" aria-label="Month by month figures"><div class="mt" role="table" aria-label="Month by month figures">' +
      '<div class="mt-head" role="row"><span role="columnheader">Month</span><span role="columnheader" class="mt-num">Paid</span><span role="columnheader" class="mt-num">Due</span><span role="columnheader" class="mt-num">Expected</span><span role="columnheader" class="mt-num">Money out</span><span role="columnheader" class="mt-num">Difference</span><span class="mt-chevcell" aria-hidden="true"></span></div>' +
      rows.map(function (m) {
        const open = openMonth === m.month;
        return '<div class="mt-group' + (m.current ? " is-now" : "") + (m.kind === "estimate" ? " is-est" : "") + (open ? " is-open" : "") + '" data-row="' + esc(m.month) + '">' +
          '<div class="mt-row" role="row" data-month="' + esc(m.month) + '">' +
          '<span class="mt-month" role="rowheader"><button type="button" class="mt-toggle" data-toggle="' + esc(m.month) + '" aria-expanded="' + open + '" aria-controls="md-' + esc(m.month) + '"><span class="mt-name">' + esc(m.label) + "</span>" + kindTag(m) + "</button></span>" +
          mcell("Paid", m.paid) + mcell("Due", m.due, "", m.kind === "actual" ? "Was due, unpaid, and not counted in the difference" : "") + mcell("Expected", m.expected) + mcell("Money out", m.out) + mcell("Difference", m.net, "mt-diff mt-diff--" + tone(m.net)) + '<span class="mt-chevcell" aria-hidden="true">' + icon("chevronDown", "mt-chev") + "</span></div>" +
          '<div class="mt-detail" id="md-' + esc(m.month) + '"' + (open ? "" : " hidden") + ">" + detail(m) + "</div></div>";
      }).join("") + "</div></section>";
  }
  function mcell(label, value, cls, title) {
    return '<span role="cell"' + (title ? ' title="' + esc(title) + '"' : "") + ' class="mt-num' + (cls ? " " + cls : "") + (Number(value) === 0 ? " is-zero" : "") + '" data-label="' + esc(label) + '">' + esc(cls ? signed(value) : M.money(value, { round: true })) + "</span>";
  }

  // Opens one month's items and closes the others; asked to scroll when the click came from the chart
  function setOpen(root, key, scroll) {
    openMonth = key;
    root.querySelectorAll(".mt-group").forEach(function (g) {
      const on = g.getAttribute("data-row") === key;
      g.classList.toggle("is-open", on);
      g.querySelector(".mt-detail").hidden = !on;
      g.querySelector("[data-toggle]").setAttribute("aria-expanded", on ? "true" : "false");
    });
    const g = key && root.querySelector('.mt-group[data-row="' + key + '"]');
    if (g && scroll) g.scrollIntoView({ behavior: ui.prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
  }

  function render(root, ctx) {
    const d = ctx.data, rows = M.months(d, ctx.today, 3, 6, { maybes: ctx.maybes });
    const now = rows.filter(function (m) { return m.current; })[0];
    const empty = !d.invoices.length && !d.outgoings.length && !d.transactions.length && !d.expected.length;
    root.innerHTML = '<div class="mo-page"><div class="mo-head"><h2>Month by month</h2><div class="ov-head__tags">' + C.sourceTag("Past months actual, later months estimate", { estimate: true }) + C.maybesSwitch(ctx.maybes) + "</div></div>" +
      (empty ? '<section class="panel">' + C.emptyState("Nothing to show yet", "Invoices from your accounts app and the bills you confirm fill in the months. Press Refresh numbers to bring them in.") + "</section>" : "") +
      (now ? thisMonth(d, now) : "") +
      '<section class="panel mo-chartpanel" aria-label="Month by month chart"><div class="ov-head"><h2>Money in and out</h2><div class="ov-head__tags">' + C.sourceTag("Estimate for months to come", { estimate: true }) + '</div></div><div data-months-chart></div></section>' +
      table(rows) + "</div>";

    const host = root.querySelector("[data-months-chart]");
    if (host) MV.monthsChart.draw(host, rows, {
      today: ctx.today, label: "Money in and out, month by month",
      onSelect: function (key) { setOpen(root, key, true); }
    });

    root.onclick = function (e) {
      const row = e.target.closest("[data-month]");
      if (!row || !root.contains(row)) return;
      const key = row.getAttribute("data-month");
      setOpen(root, openMonth === key ? null : key, false);
    };
  }

  MV.views.months = { render: render };
})();
