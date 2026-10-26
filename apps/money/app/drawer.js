/*
  THE INVOICE EDITOR: a panel that slides in from the right
  ---------------------------------------------------------
  Opens from any invoice row, from New invoice, from a Chase button and from a link (#invoice/<id>).
  The owner fills in the customer, dates and lines; every total is worked out by MV.model.invoiceTotals
  as they type. Which buttons show depends on where the invoice is:

    draft, accounts app can take drafts   Put it in <app> as a draft (Claude adds it, the owner sends it from there)
    draft, connection reads only          Open <app> to raise it (the owner raises it there; it shows on the next refresh)
    in the accounts app as a draft        Open <app> and I've sent it
    sent and not fully paid               Chase (Claude drafts a reminder, never sends it). Not for drafts, waiting
                                          ones or ones in the accounts app that are not sent yet
    raised in Money View, not in the      Cancel invoice (kept as cancelled, with Undo). Never for an invoice that
    accounts app as a sent invoice        was read from the accounts app (where "accounts"): cancel those there
    a new draft                           the invoice number is suggested only when Claude can put drafts in (mode "drafts")

  Claude never sends, approves or deletes an invoice. Every save goes through ctx.update(), so it is
  written to the file and logged. Typing is saved when the person leaves the box, without redrawing
  the panel, so a click on the next button is never lost. A brand new invoice is only written to the
  file when the first change is saved, so opening New invoice and closing it leaves nothing behind.

  How the app uses it: MV.drawer.open(ctx, id) (id null for a new invoice), MV.drawer.refresh() after every
  data change, MV.drawer.close(). If the app gives a getter once with MV.drawer.init(() => ctx), the panel
  always reads fresh data from it; otherwise it uses the last ctx it was opened with.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';
  let getCtx = null, lastCtx = null, el = null, scrim = null;
  // fresh: a new invoice not yet in the file.
  // asking: the buttons that ask Claude are switched off while a request is being saved and started.
  // chaserText: the reminder as the person has edited it (not saved; it is only copied or emailed).
  const state = { id: null, fresh: null, chaserText: null, opener: null, skipRefresh: false, asking: false };

  // ---------- Small helpers ----------
  function ctxNow() { return getCtx ? getCtx() : lastCtx; }
  function nowIso() { return new Date().toISOString(); }
  function invNow() {
    const ctx = ctxNow();
    return ctx.data.invoices.find(function (i) { return i.id === state.id; }) || state.fresh;
  }
  function appName(ctx) { return M.appName(ctx.data); }
  // The app's own pages come from MV.model.APPS (name, home link, new invoice link), keyed by the app's name in lower case
  function appInfo(ctx) {
    const apps = M.APPS || {};
    return apps[String(ctx.data.sources.accounts.app || "").toLowerCase().replace(/[^a-z]/g, "")] || null;
  }
  function appLink(ctx, which) {
    const info = appInfo(ctx), a = ctx.data.sources.accounts;
    const link = info && info[which];
    return link && /^https?:\/\//i.test(link) ? link : (which === "home" && a.link && /^https?:\/\//i.test(a.link) ? a.link : "");
  }
  function canDraft(ctx) { return ctx.data.sources.accounts.mode === "drafts"; }
  function vatShown(ctx, inv) {
    return !!ctx.data.settings.vat.registered || inv.lines.some(function (l) { return Number(l.vatRate) > 0; });
  }
  function outstanding(inv) { return M.invoiceOutstanding(inv); }
  function toast(message, undo) { ctxNow().toast(message, undo); }
  // A reminder is only for an invoice that has been sent and is not fully paid. A draft, one still waiting for Claude and
  // one in the accounts app that the owner has not sent yet have nothing to chase.
  function canChase(inv, st) { return inv.status === "sent" && (st === "sent" || st === "part-paid" || st === "overdue"); }
  // What to call an invoice in a message when the accounts app has not numbered it yet
  function nameOf(inv) { return inv.number || inv.customer || "the invoice"; }

  // ---------- Saving ----------
  // quiet: the panel is not redrawn when the save comes back (used for typing)
  function save(mutator, activityText, quiet) {
    const id = state.id, fresh = state.fresh;
    if (quiet) state.skipRefresh = true;
    return ctxNow().update(function (d) {
      let inv = d.invoices.find(function (x) { return x.id === id; });
      if (!inv) {
        inv = JSON.parse(JSON.stringify(fresh));
        inv.createdAt = nowIso();
        d.invoices.unshift(inv);
      }
      mutator(inv, d);
      inv.updatedAt = nowIso();
    }, activityText, id);
  }

  // ---------- Drawing ----------
  function field(label, control, hint) {
    return '<label class="field"><span class="field__label">' + esc(label) + "</span>" + control + (hint ? '<span class="field__hint">' + esc(hint) + "</span>" : "") + "</label>";
  }

  function vatOptions(ctx, line) {
    const registered = !!ctx.data.settings.vat.registered;
    const rate = Number(line.vatRate) || 0;
    const rates = registered ? [20, 5, 0] : [0];
    if (rates.indexOf(rate) === -1) rates.push(rate);
    return rates.map(function (r) {
      const label = !registered && r === 0 ? "No VAT" : r + "% VAT";
      return '<option value="' + r + '"' + (r === rate ? " selected" : "") + ">" + label + "</option>";
    }).join("");
  }
  function lineRow(ctx, line, locked, only) {
    const total = M.invoiceTotals({ lines: [line] }).net;
    const dis = locked ? " disabled" : "";
    return '<div class="inv-line" data-line="' + esc(line.id) + '">' +
      '<input class="input inv-line__text" data-l="text" value="' + esc(line.text) + '" placeholder="What the work was" aria-label="Description" maxlength="200"' + dis + ">" +
      '<input class="input inv-line__qty" data-l="qty" type="number" inputmode="decimal" min="0" step="any" value="' + esc(line.qty) + '" aria-label="Quantity"' + dis + ">" +
      '<input class="input inv-line__price" data-l="price" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(line.price) + '" aria-label="Price each in pounds"' + dis + ">" +
      '<select class="select inv-line__vat" data-l="vatRate" aria-label="VAT rate"' + dis + ">" + vatOptions(ctx, line) + "</select>" +
      '<span class="inv-line__total num" data-line-total>' + esc(M.money(total)) + "</span>" +
      (locked || only ? '<span class="inv-line__gap"></span>' : '<button type="button" class="icon-btn icon-btn--sm" data-d="line-remove" data-id="' + esc(line.id) + '" aria-label="Take this line off">' + icon("x") + "</button>") + "</div>";
  }
  function totalsHtml(ctx, inv) {
    const t = M.invoiceTotals(inv), paid = M.invoicePaid(inv);
    return '<div class="inv-totals__row"><span>Subtotal</span><span class="num">' + esc(M.money(t.net)) + "</span></div>" +
      (vatShown(ctx, inv) ? '<div class="inv-totals__row"><span>VAT</span><span class="num">' + esc(M.money(t.vat)) + "</span></div>" : "") +
      '<div class="inv-totals__row inv-totals__row--big"><span>Total</span><span class="num">' + esc(M.money(t.gross)) + "</span></div>" +
      (paid ? '<div class="inv-totals__row"><span>Paid so far</span><span class="num">' + esc(M.money(paid)) + "</span></div>" +
        '<div class="inv-totals__row inv-totals__row--big"><span>Still to pay</span><span class="num">' + esc(M.money(outstanding(inv))) + "</span></div>" : "");
  }

  function basics(ctx, inv, locked) {
    const dis = locked ? " disabled" : "";
    return '<div class="inv-grid">' +
      field("Customer", '<input class="input" data-f="customer" list="invCustomers" value="' + esc(inv.customer) + '" placeholder="Who is it for?" maxlength="140" autocomplete="off"' + dis + ">" +
        '<datalist id="invCustomers">' + M.customers(ctx.data).map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join("") + "</datalist>") +
      field("Their email", '<input class="input" data-f="email" type="email" value="' + esc(inv.email) + '" placeholder="accounts@theirbusiness.co.uk" maxlength="160" autocomplete="off">', "Used to open a reminder email. Nothing is sent from here.") +
      field("Invoice number", '<input class="input" data-f="number" value="' + esc(inv.number) + '" maxlength="40"' + dis + ">") +
      field("Issue date", '<input class="input" data-f="issueDate" type="date" value="' + esc(inv.issueDate) + '"' + dis + ">") +
      field("Due date", '<input class="input" data-f="dueDate" type="date" value="' + esc(inv.dueDate) + '"' + dis + ">") + "</div>";
  }

  function linesSection(ctx, inv, locked) {
    return '<div class="drawer__section"><h3 class="drawer__h">What it is for</h3><div class="inv-lines">' +
      '<div class="inv-lines__head" aria-hidden="true"><span>Description</span><span>Qty</span><span>Price</span><span>VAT</span><span class="inv-lines__right">Total</span><span></span></div>' +
      inv.lines.map(function (l) { return lineRow(ctx, l, locked, inv.lines.length === 1); }).join("") + "</div>" +
      (locked ? '<p class="drawer__small muted">The lines are fixed now that it has left the draft stage. Change them in ' + esc(appName(ctx)) + " if you need to.</p>" :
        '<div><button type="button" class="btn btn--sm" data-d="line-add">' + icon("plus") + "Add a line</button></div>") +
      '<div class="inv-totals" data-totals>' + totalsHtml(ctx, inv) + "</div></div>";
  }

  function paymentsSection(ctx, inv) {
    if (!inv.payments.length) return "";
    return '<div class="drawer__section"><h3 class="drawer__h">Payments</h3><ul class="inv-pay">' + inv.payments.map(function (p) {
      return '<li><span class="num">' + esc(M.money(p.amount)) + '</span><span class="muted">' + esc(M.sourceLabel(p.source, ctx.data, p.date)) + "</span></li>";
    }).join("") + "</ul></div>";
  }

  function chaserBox(ctx, inv) {
    const c = inv.chaser;
    if (!c || !c.text) return "";
    const text = state.chaserText === null ? c.text : state.chaserText;
    return '<div class="drawer__section"><h3 class="drawer__h">Your reminder</h3>' +
      '<textarea class="textarea" rows="6" data-chaser aria-label="The reminder Claude drafted">' + esc(text) + "</textarea>" +
      '<p class="drawer__small muted">Claude drafted this' + (c.at ? " on " + esc(C.shortDate(String(c.at).slice(0, 10), C.todayOf(ctx))) : "") + ". Change it if you like. Claude never sends it: you copy it or open it in your email.</p>" +
      '<div class="drawer__row"><button type="button" class="btn btn--sm" data-d="chaser-copy">' + icon("fileText") + "Copy</button>" +
      '<button type="button" class="btn btn--sm" data-d="chaser-email">' + icon("mail") + "Open email</button></div>" +
      (inv.email ? "" : '<p class="drawer__small muted">Add their email above and it fills in the address for you.</p>') + "</div>";
  }

  function claudeBanner(ctx, inv) {
    const req = inv.request;
    if (!req) return "";
    let words, say;
    if (req.kind === "draft") { words = "Claude is adding it to " + appName(ctx) + " as a draft. You check it and send it from there."; say = "put that invoice in " + appName(ctx); }
    else if (req.kind === "chase") { words = "Claude is drafting a polite reminder. It appears here when it is done."; say = "chase my invoices"; }
    else { words = "Claude is checking this invoice in " + appName(ctx) + "."; say = "update my money view"; }
    return '<div class="drawer__banner"><span>' + icon("sparkle") + "<span>" + esc(words) + "</span></span>" +
      '<span>Nothing happening? Open the folder in Claude and say <span class="say">' + esc(say) + '<button type="button" class="say__copy" data-copy="' + esc(say) + '">Copy</button></span></span></div>';
  }

  // A new invoice not saved to the file yet
  function isFresh(ctx, inv) { return !!state.fresh && !ctx.data.invoices.some(function (i) { return i.id === inv.id; }); }

  function actions(ctx, inv, st) {
    const out = [], busy = state.asking ? " disabled" : "", app = esc(appName(ctx));
    let note = "";
    if (inv.status === "draft") {
      if (canDraft(ctx)) {
        out.push('<button type="button" class="btn btn--primary" data-d="to-accounts"' + busy + ">" + icon("arrowRight") + "Put it in " + app + " as a draft</button>");
        note = "Claude adds it to " + app + " as a draft. You check it and send it from there.";
      } else {
        const link = appLink(ctx, "newInvoice");
        if (link) out.push('<a class="btn btn--primary" href="' + esc(link) + '" target="_blank" rel="noopener">' + icon("external") + "Open " + app + " to raise it</a>");
        note = "Your connection reads only, so you raise it in " + app + ". It shows here on the next refresh.";
      }
    }
    if (inv.status === "in-accounts") {
      const link = appLink(ctx, "home");
      if (link) out.push('<a class="btn btn--primary" href="' + esc(link) + '" target="_blank" rel="noopener">' + icon("external") + "Open " + app + "</a>");
      out.push('<button type="button" class="btn' + (link ? "" : " btn--primary") + '" data-d="mark-sent">' + icon("check") + "I\u2019ve sent it</button>");
    }
    if (canChase(inv, st)) out.push('<button type="button" class="btn" data-d="chase"' + busy + ">" + icon("mail") + "Chase</button>");
    return out.length || note ? '<div class="drawer__section"><h3 class="drawer__h">What next</h3>' + (out.length ? '<div class="drawer__row inv-actions">' + out.join("") + "</div>" : "") +
      (note ? '<p class="drawer__small muted">' + note + "</p>" : "") + "</div>" : "";
  }

  function overdueText(n) { return n + (n === 1 ? " day overdue" : " days overdue"); }

  function html(ctx, inv) {
    const st = M.invoiceState(inv, C.todayOf(ctx));
    const locked = inv.status !== "draft";
    const noteLine = st === "overdue" ? '<p class="drawer__small inv-overdue">' + overdueText(M.daysOverdue(inv, C.todayOf(ctx))) + "</p>" : "";
    return '<div class="drawer__head"><span class="chip chip--quiet">Invoice</span><span class="spill inv-pill inv-pill--' + esc(st) + '">' + esc(M.stateLabel(st)) + "</span>" +
      '<span class="drawer__spacer"></span><button type="button" class="icon-btn" data-d="close" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body">' + noteLine + claudeBanner(ctx, inv) + basics(ctx, inv, locked) + linesSection(ctx, inv, locked) + paymentsSection(ctx, inv) + actions(ctx, inv, st) + chaserBox(ctx, inv) +
      '<div class="drawer__section"><h3 class="drawer__h">Notes</h3><textarea class="textarea" rows="3" data-f="notes" aria-label="Notes" placeholder="Anything to remember about this invoice. Only you see it.">' + esc(inv.notes) + "</textarea></div></div>" +
      '<div class="drawer__foot">' + (st === "paid" || st === "void" || st === "linked" || inv.where === "accounts" ? "" : isFresh(ctx, inv) ?
        '<button type="button" class="btn btn--ghost" data-d="close">Discard</button>' : '<button type="button" class="btn btn--danger" data-d="cancel-invoice">Cancel invoice</button>') +
      '<span class="drawer__spacer"></span><span class="drawer__small muted">' + (inv.source === "accounts" || inv.where === "accounts" ? "From " + esc(appName(ctx)) : "Raised in Money View") + "</span></div>";
  }

  // Redraws the panel, keeping the scroll position and which control had focus
  function draw() {
    const inv = invNow();
    if (!inv) { close(); return; }
    const body = el.querySelector(".drawer__body");
    const scroll = body ? body.scrollTop : 0;
    const all = Array.prototype.slice.call(el.querySelectorAll(FOCUSABLE));
    const focusAt = all.indexOf(document.activeElement);
    el.innerHTML = html(ctxNow(), inv);
    el.querySelector(".drawer__body").scrollTop = scroll;
    const again = el.querySelectorAll(FOCUSABLE);
    if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && el.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search|number|email/.test(a.type)));
  }

  // ---------- Opening and closing ----------
  function ensureEls() {
    if (el) return;
    el = document.getElementById("drawer");
    scrim = document.getElementById("drawerScrim");
    if (!scrim) { scrim = document.createElement("div"); scrim.className = "drawer-scrim"; scrim.id = "drawerScrim"; scrim.hidden = true; document.body.appendChild(scrim); }
    if (!el) {
      el = document.createElement("aside");
      el.className = "drawer"; el.id = "drawer"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Invoice");
      document.body.appendChild(el);
    }
    el.setAttribute("aria-label", "Invoice");
    el.classList.add("inv-drawer");
    bind();
  }

  function blankInvoice(ctx) {
    return M.newInvoiceFor(ctx.data, C.todayOf(ctx));
  }

  function open(ctx, id) {
    ensureEls();
    lastCtx = ctx;
    const live = getCtx ? getCtx() : ctx;
    if (id === null || id === undefined) {
      state.fresh = blankInvoice(live);
      state.id = state.fresh.id;
    } else {
      if (!live.data.invoices.some(function (i) { return i.id === id; })) { live.toast("That invoice could not be found."); return; }
      if (state.id !== id) state.fresh = null;
      state.id = id;
    }
    state.chaserText = null; state.skipRefresh = false;
    if (el.hidden) state.opener = document.activeElement;
    el.hidden = false;
    scrim.hidden = false;
    document.body.classList.add("has-drawer");
    draw();
    const first = state.fresh && state.fresh.id === state.id ? el.querySelector("[data-f=customer]") : el.querySelector("[data-d=close]");
    setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 30);
    el.classList.remove("is-open");
    void el.offsetWidth;
    el.classList.add("is-open");
  }
  function close() {
    if (!el || (!state.id && el.hidden)) return;
    state.id = null; state.fresh = null; state.skipRefresh = false;
    el.hidden = true;
    scrim.hidden = true;
    el.innerHTML = "";
    document.body.classList.remove("has-drawer");
    if (state.opener && state.opener.isConnected) state.opener.focus({ preventScroll: true });
    state.opener = null;
  }
  // Called by the app after every data change
  function refresh(ctx) {
    if (ctx) lastCtx = ctx;
    if (!el) return;
    const skip = state.skipRefresh;
    state.skipRefresh = false;
    if (!state.id || skip || typingInside()) return;
    draw();
  }

  // ---------- What the buttons do ----------
  // The invoice must be complete enough to leave Money View
  function readyToLeave(inv) {
    if (!String(inv.customer || "").trim()) { toast("Add who the invoice is for first"); focusField("customer"); return false; }
    const real = inv.lines.filter(function (l) { return String(l.text).trim() && Number(l.price) > 0 && Number(l.qty) > 0; });
    if (!real.length) { toast("Add at least one line with a description and a price first"); return false; }
    return true;
  }
  function focusField(name) { const n = el.querySelector('[data-f="' + name + '"]'); if (n) n.focus(); }

  function setStatus(status, activityText, toastText) {
    const inv = invNow(), before = inv.status, beforeRequest = inv.request || null, id = inv.id;
    return save(function (i) { i.status = status; if (status !== "waiting") i.request = i.request && i.request.kind === "draft" ? null : i.request; }, activityText).then(function () {
      toast(toastText, function () {
        ctxNow().update(function (d) {
          const i = d.invoices.find(function (x) { return x.id === id; });
          i.status = before; i.request = beforeRequest; i.updatedAt = nowIso();
        }, "Undid: " + activityText, id).catch(C.failed);
      });
    });
  }

  function toAccounts() {
    const inv = invNow();
    if (state.asking || !readyToLeave(inv)) return;
    const app = appName(ctxNow()), num = nameOf(inv);
    asking(true);
    save(function (i) { i.status = "waiting"; i.request = { kind: "draft", at: nowIso() }; }, "Asked Claude to put " + num + " in " + app + " as a draft")
      .then(function () { return ctxNow().runJob("put-invoices-in-accounts"); })
      .catch(C.failed).then(function () { asking(false); });
  }
  function chase() {
    const inv = invNow();
    if (state.asking) return;
    const num = nameOf(inv);
    asking(true);
    save(function (i) { i.request = { kind: "chase", at: nowIso() }; }, "Asked Claude to draft a reminder for " + num)
      .then(function () { return ctxNow().runJob("chase-invoices"); })
      .catch(C.failed).then(function () { asking(false); });
  }
  // While Claude is being asked, the buttons that ask are switched off in place, so a box still being saved isn't redrawn from old data
  function asking(on) {
    state.asking = on;
    if (on) el.querySelectorAll('[data-d="to-accounts"], [data-d="chase"]').forEach(function (b) { b.disabled = true; });
    else if (state.id && !typingInside()) draw();
  }

  function cancelInvoice() {
    const inv = invNow(), id = inv.id, num = nameOf(inv), before = inv.status, beforeRequest = inv.request || null;
    close();
    ctxNow().update(function (d) {
      const i = d.invoices.find(function (x) { return x.id === id; });
      i.status = "void"; i.request = null; i.updatedAt = nowIso();
    }, "Cancelled invoice " + num, id).then(function () {
      toast("Cancelled " + num + ". It is kept in your list.", function () {
        ctxNow().update(function (d) {
          const i = d.invoices.find(function (x) { return x.id === id; });
          i.status = before; i.request = beforeRequest; i.updatedAt = nowIso();
        }, "Brought back invoice " + num, id).catch(C.failed);
      });
    }).catch(C.failed);
  }

  function chaserNow() {
    const box = el.querySelector("[data-chaser]");
    return box ? box.value : "";
  }
  function copyChaser() {
    const text = chaserNow();
    if (!text.trim()) { toast("There is no reminder to copy yet"); return; }
    ui.copyText(text).then(function (ok) { toast(ok ? "Copied. Paste it into your email" : "Could not copy. Select the words and copy them yourself"); });
  }
  function emailChaser() {
    const inv = invNow(), text = chaserNow();
    if (!text.trim()) { toast("There is no reminder to open yet"); return; }
    const subject = "Invoice " + inv.number;
    window.location.href = "mailto:" + encodeURIComponent(inv.email || "").replace(/%40/g, "@") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
  }

  // The lines as they are on screen right now
  function collectLines() {
    const inv = invNow();
    return Array.prototype.map.call(el.querySelectorAll("[data-line]"), function (row) {
      const old = inv.lines.find(function (l) { return l.id === row.getAttribute("data-line"); }) || {};
      const get = function (n) { return row.querySelector('[data-l="' + n + '"]').value; };
      return Object.assign({}, old, { id: row.getAttribute("data-line"), text: get("text"), qty: Number(get("qty")) || 0, price: Number(get("price")) || 0, vatRate: Number(get("vatRate")) || 0 });
    });
  }
  function showLiveTotals() {
    const ctx = ctxNow(), inv = invNow();
    const lines = collectLines();
    const temp = Object.assign({}, inv, { lines: lines });
    el.querySelector("[data-totals]").innerHTML = totalsHtml(ctx, temp);
    lines.forEach(function (l) {
      const row = el.querySelector('[data-line="' + l.id + '"] [data-line-total]');
      if (row) row.textContent = M.money(M.invoiceTotals({ lines: [l] }).net);
    });
  }

  const ACTIONS = {
    close: close,
    "to-accounts": toAccounts,
    chase: chase,
    "mark-sent": function () {
      const inv = invNow();
      if (!readyToLeave(inv)) return;
      setStatus("sent", "Marked " + nameOf(inv) + " as sent", "Marked as sent");
    },
    "cancel-invoice": cancelInvoice,
    "chaser-copy": copyChaser,
    "chaser-email": emailChaser,
    "line-add": function () {
      const ctx = ctxNow();
      const line = { id: ui.makeId("l"), text: "", qty: 1, price: 0, vatRate: ctx.data.settings.vat.registered ? ctx.data.settings.vat.rate : 0 };
      const lines = collectLines().concat(line);
      save(function (i) { i.lines = lines; }).then(function () {
        const rows = el.querySelectorAll("[data-line] [data-l=text]");
        if (rows.length) rows[rows.length - 1].focus();
      }).catch(C.failed);
    },
    "line-remove": function (b) {
      const id = b.getAttribute("data-id");
      const lines = collectLines().filter(function (l) { return l.id !== id; });
      if (!lines.length) return;
      save(function (i) { i.lines = lines; }).catch(C.failed);
    }
  };

  // What changes when a box is left (saved quietly, without redrawing)
  function onChange(e) {
    const t = e.target, f = t.getAttribute("data-f");
    if (t.hasAttribute("data-l")) {
      const lines = collectLines();
      save(function (i) { i.lines = lines; }, null, true).catch(C.failed);
      return;
    }
    if (!f) return;
    const v = t.value.trim();
    if (f === "customer") {
      // A customer used before brings their email along if none is typed yet
      const ctx = ctxNow();
      const known = ctx.data.invoices.find(function (i) { return i.customer === v && i.email; });
      const emailBox = el.querySelector('[data-f="email"]');
      const fillEmail = known && emailBox && !emailBox.value.trim() ? known.email : null;
      if (fillEmail) emailBox.value = fillEmail;
      save(function (i) { i.customer = v; if (fillEmail && !i.email) i.email = fillEmail; }, null, true).catch(C.failed);
    } else if (f === "email") save(function (i) { i.email = v; }, null, true).catch(C.failed);
    else if (f === "number") save(function (i) { i.number = v; }, null, true).catch(C.failed);
    else if (f === "notes") save(function (i) { i.notes = t.value; }, null, true).catch(C.failed);
    else if (f === "issueDate" || f === "dueDate") {
      const terms = Number(ctxNow().data.settings.invoice.termsDays) || 0;
      save(function (i) {
        i[f] = t.value;
        // A due date before the issue date is moved to the usual terms after it
        if (f === "issueDate" && t.value && i.dueDate && i.dueDate < t.value) i.dueDate = ui.isoDate(ui.addDays(ui.parseDate(t.value), terms));
      }).catch(C.failed);
    }
  }
  // What is typed but not saved yet is kept in memory, so a redraw never loses it
  function onInput(e) {
    const t = e.target;
    if (t.hasAttribute("data-chaser")) state.chaserText = t.value;
    else if (t.hasAttribute("data-l")) showLiveTotals();
  }
  function trapFocus(e) {
    const items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  function bind() {
    el.addEventListener("click", function (e) {
      const b = e.target.closest("[data-d]");
      if (b && el.contains(b) && ACTIONS[b.getAttribute("data-d")]) ACTIONS[b.getAttribute("data-d")](b);
    });
    el.addEventListener("change", onChange);
    el.addEventListener("input", onInput);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (!state.id) return;
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) { e.preventDefault(); close(); }
      if (e.key === "Tab" && !document.querySelector("dialog[open]")) trapFocus(e);
    });
  }

  // The app may give a getter once, so the panel always reads fresh data after a save
  function init(getContext) { getCtx = getContext; ensureEls(); }

  window.MV.drawer = { init: init, open: open, close: close, refresh: refresh, isOpen: function () { return !!state.id; } };
})();
