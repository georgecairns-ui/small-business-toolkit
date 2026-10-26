/*
  INVOICES: every invoice, found fast
  -----------------------------------
  Filter chips (All, Draft, Waiting for you to send, Due, Overdue, Paid, Cancelled) with counts, a search
  by customer or number, and rows sorted overdue first, then by due date. A row opens the invoice editor.
  The state of each invoice comes from MV.model.invoiceState (paid, part paid and overdue are worked out
  from payments and the due date, never stored). Nothing here changes an invoice; the editor does that.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  MV.views = MV.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  // Which invoice states each chip shows. "Due" is sent and part paid: owed, not yet late.
  const FILTERS = [
    { key: "all", label: "All", states: null },
    { key: "draft", label: "Draft", states: ["draft", "waiting"] },
    { key: "send", label: "Waiting for you to send", states: ["in-accounts"] },
    { key: "due", label: "Due", states: ["sent", "part-paid"] },
    { key: "overdue", label: "Overdue", states: ["overdue"] },
    { key: "paid", label: "Paid", states: ["paid"] },
    { key: "void", label: "Cancelled", states: ["void"] }
  ];
  // Overdue first, then what you still have to send, then owed, then drafts, then done
  const RANK = { overdue: 0, "in-accounts": 1, sent: 2, "part-paid": 2, draft: 3, waiting: 3, paid: 4, void: 5 };

  // What the person has chosen on this page. Kept between redraws.
  const state = { filter: "all", q: "" };

  function appName(data) { return M.appName(data); }


  function decorate(ctx) {
    const today = C.todayOf(ctx);
    // A draft note closed by its arriving invoice (status "linked") is not listed and not counted
    return ctx.data.invoices.filter(function (inv) { return inv.status !== "linked"; }).map(function (inv) {
      return { inv: inv, st: M.invoiceState(inv, today), totals: M.invoiceTotals(inv), paid: M.invoicePaid(inv) };
    });
  }
  function sortRows(rows, today) {
    return rows.slice().sort(function (a, b) {
      const ra = RANK[a.st], rb = RANK[b.st];
      if (ra !== rb) return ra - rb;
      if (a.st === "overdue") return M.daysOverdue(b.inv, today) - M.daysOverdue(a.inv, today);
      if (ra >= 4) return String(b.inv.issueDate).localeCompare(String(a.inv.issueDate));
      return String(a.inv.dueDate).localeCompare(String(b.inv.dueDate)) || String(a.inv.number).localeCompare(String(b.inv.number));
    });
  }
  function matches(row) {
    const f = FILTERS.find(function (x) { return x.key === state.filter; });
    if (f.states && f.states.indexOf(row.st) === -1) return false;
    const q = state.q.trim().toLowerCase();
    return !q || String(row.inv.customer).toLowerCase().indexOf(q) > -1 || String(row.inv.number).toLowerCase().indexOf(q) > -1;
  }

  function chips(rows) {
    return '<div class="filters inv-chips" role="group" aria-label="Show invoices">' + FILTERS.map(function (f) {
      const n = f.states ? rows.filter(function (r) { return f.states.indexOf(r.st) > -1; }).length : rows.length;
      return '<button type="button" class="filter inv-chip' + (state.filter === f.key ? " is-active" : "") + '" data-filter="' + f.key + '" aria-pressed="' + (state.filter === f.key) + '">' +
        esc(f.label) + ' <span class="inv-chip__n num">' + n + "</span></button>";
    }).join("") + "</div>";
  }

  function row(r, ctx) {
    const today = C.todayOf(ctx), inv = r.inv;
    const late = r.st === "overdue" ? M.daysOverdue(inv, today) + (M.daysOverdue(inv, today) === 1 ? " day late" : " days late") : "";
    return '<li><button type="button" class="inv-row inv-row--' + esc(r.st) + '" data-open="' + esc(inv.id) + '">' +
      '<span class="inv-row__num num">' + esc(inv.number) + "</span>" +
      '<span class="inv-row__cust">' + esc(inv.customer || "No customer yet") + "</span>" +
      '<span class="inv-row__date inv-row__issued" data-label="Issued">' + esc(C.shortDate(inv.issueDate, today)) + "</span>" +
      '<span class="inv-row__date inv-row__due" data-label="Due">' + esc(C.shortDate(inv.dueDate, today)) + (late ? '<small class="inv-late"> ' + esc(late) + "</small>" : "") + "</span>" +
      '<span class="inv-row__money inv-row__total num" data-label="Total">' + esc(M.money(r.totals.gross)) + "</span>" +
      '<span class="inv-row__money inv-row__paid num" data-label="Paid">' + (r.paid ? esc(M.money(r.paid)) : '<span class="faint">-</span>') + "</span>" +
      '<span class="inv-row__state"><span class="spill inv-pill inv-pill--' + esc(r.st) + '">' + esc(M.stateLabel(r.st)) + "</span></span>" +
      '<span class="inv-row__where muted">' + esc(M.invoiceWhere(inv, ctx.data)) + "</span></button></li>";
  }

  function listHtml(rows, all, ctx) {
    if (!all.length) {
      return '<div class="empty empty--compact"><h3>No invoices yet</h3><p>Invoices in ' + esc(appName(ctx.data)) + " appear here after Refresh numbers. Press New invoice to start one.</p>" +
        '<button type="button" class="btn btn--primary" data-new>' + icon("plus") + "New invoice</button></div>";
    }
    if (!rows.length) return '<div class="empty empty--compact"><h3>No invoices match</h3><p>Try another filter or clear the search.</p></div>';
    return '<div class="inv-head" aria-hidden="true"><span>Number</span><span>Customer</span><span>Issued</span><span>Due</span><span class="inv-right">Total</span><span class="inv-right">Paid</span><span>State</span><span>Where</span></div>' +
      '<ul class="inv-list">' + rows.map(function (r) { return row(r, ctx); }).join("") + "</ul>";
  }

  // Every amount says where it came from
  function sourceLine(data) {
    const a = data.sources.accounts;
    const when = a.checkedAt ? " (last checked " + ui.parseDate(String(a.checkedAt).slice(0, 10)).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ")" : "";
    return "Invoices and payments come from " + M.appName(data) + when + ". Press Refresh numbers to bring in the latest.";
  }

  function body(root, ctx) {
    const all = decorate(ctx), today = C.todayOf(ctx);
    const shown = sortRows(all.filter(matches), today);
    root.querySelector("[data-list]").innerHTML = listHtml(shown, all, ctx);
    root.querySelector("[data-chips]").innerHTML = chips(all);
  }

  MV.views.invoices = {
    title: "Invoices",
    line: function (ctx) {
      const o = M.owed(ctx.data, C.todayOf(ctx));
      if (!decorate(ctx).length) return "No invoices yet";
      return o.overdueCount ? o.overdueCount + (o.overdueCount === 1 ? " invoice overdue" : " invoices overdue") + ", " + M.money(o.overdue) + " late" :
        o.count ? o.count + (o.count === 1 ? " invoice" : " invoices") + " waiting to be paid, " + M.money(o.total) : "Nothing waiting to be paid";
    },
    render: function (root, ctx) {
      const all = decorate(ctx);
      root.innerHTML = '<div class="inv-page"><div class="inv-tools"><div data-chips>' + chips(all) + "</div>" +
        '<label class="inv-search"><span class="sr-only">Search invoices</span>' + icon("search") +
        '<input class="input" type="search" data-search value="' + esc(state.q) + '" placeholder="Search customer or number" autocomplete="off" maxlength="80"></label></div>' +
        '<p class="inv-source muted">' + esc(sourceLine(ctx.data)) + '</p><div data-list></div></div>';
      body(root, ctx);
      root.onclick = function (e) {
        const f = e.target.closest("[data-filter]");
        if (f) { state.filter = f.getAttribute("data-filter"); body(root, ctx); return; }
        if (e.target.closest("[data-new]")) { ctx.newInvoice(); return; }
        const o = e.target.closest("[data-open]");
        if (o) ctx.openInvoice(o.getAttribute("data-open"));
      };
      // Only the list is redrawn while typing, so the search box keeps its place
      root.oninput = function (e) {
        if (!e.target.hasAttribute("data-search")) return;
        state.q = e.target.value;
        body(root, ctx);
      };
    }
  };
})();
