/*
  SETTINGS: the business words and the money defaults, in a pop-up
  ----------------------------------------------------------------
  Opened by the gear on the rail (and the gear in the sidebar). Everything saves as soon as a box is
  left, through ctx.update(). The accounts list at the bottom is for the owner to correct a balance by
  hand: an account edited here is marked as typed by them. Numbering of invoices belongs to the accounts
  app; the prefix and terms here are only the starting point for a new draft.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model;
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';

  // Every box that saves by path: its words for the activity list and what it must be
  const FIELDS = {
    "businessName": { label: "business name", type: "text" },
    "ownerName": { label: "first name", type: "text" },
    "businessType": { label: "business type", type: "text" },
    "weekStarts": { label: "first day of the week", type: "int", min: 0, max: 1 },
    "nervousBalance": { label: "comfort level", type: "money", min: 0, max: 100000000 },
    "vat.registered": { label: "VAT registration", type: "bool" },
    "vat.scheme": { label: "VAT scheme", type: "text" },
    "vat.rate": { label: "VAT rate", type: "number", min: 0, max: 100 },
    "vat.flatRate": { label: "flat rate", type: "number", min: 0, max: 100 },
    "vat.cashAccounting": { label: "VAT cash accounting", type: "bool" },
    "tax.setAsidePercent": { label: "tax percentage", type: "number", min: 0, max: 100 },
    "tax.note": { label: "tax note", type: "text" },
    "invoice.prefix": { label: "invoice prefix", type: "text" },
    "invoice.nextNumber": { label: "next invoice number", type: "int", min: 1, max: 9999999 },
    "invoice.termsDays": { label: "payment terms", type: "int", min: 0, max: 365 },
    "bank.name": { label: "bank name", type: "text" },
    "bank.link": { label: "bank link", type: "url" }
  };
  const BUSINESS_TYPES = [{ value: "", label: "Not said yet" }, { value: "sole-trader", label: "Sole trader" }, { value: "partnership", label: "Partnership" }, { value: "limited", label: "Limited company" }];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const KINDS = [{ value: "current", label: "Current account" }, { value: "savings", label: "Savings" }, { value: "pot", label: "Pot" }, { value: "card", label: "Card (money you owe)" }];

  let getCtx = null, dlg = null;

  function get(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function put(obj, path, value) { const keys = path.split("."), last = keys.pop(); keys.reduce(function (o, k) { return o[k]; }, obj)[last] = value; }
  function options(list, selected) {
    return list.map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(selected) ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("");
  }
  function section(title, intro, body) {
    return '<section class="prefs-section"><h3 class="prefs-section__title">' + title + "</h3>" + (intro ? '<p class="prefs-hint">' + intro + "</p>" : "") + body + "</section>";
  }
  function text(s, path, label, ph, hint) {
    return '<label class="field"><span class="field__label">' + label + '</span><input class="input" data-setting="' + path + '" maxlength="120" value="' + esc(get(s, path)) + '" placeholder="' + esc(ph || "") + '">' + (hint ? '<span class="field__hint">' + hint + "</span>" : "") + "</label>";
  }
  function number(s, path, label, attrs, hint) {
    return '<label class="field"><span class="field__label">' + label + '</span><input class="input num" type="number" data-setting="' + path + '" ' + attrs + ' value="' + esc(get(s, path)) + '">' + (hint ? '<span class="field__hint">' + hint + "</span>" : "") + "</label>";
  }
  function sw(s, path, label) {
    return '<label class="switch"><input type="checkbox" data-setting="' + path + '"' + (get(s, path) ? " checked" : "") + '><span class="switch__track"></span>' + label + "</label>";
  }

  function acctRow(a) {
    return '<li class="prefs-acct" data-acct="' + esc(a.id) + '">' +
      '<label class="field"><span class="field__label">Name</span><input class="input" data-a="name" maxlength="60" value="' + esc(a.name) + '"></label>' +
      '<label class="field"><span class="field__label">Kind</span><select class="select" data-a="kind">' + options(KINDS, a.kind) + "</select></label>" +
      '<label class="field"><span class="field__label">Balance</span><input class="input num" type="number" step="0.01" min="0" data-a="balance" value="' + esc(a.balance) + '"></label>' +
      '<label class="field"><span class="field__label">As at</span><input class="input" type="date" data-a="asAt" value="' + esc(a.asAt || "") + '"></label>' +
      '<button type="button" class="icon-btn" data-set="acct-remove" data-id="' + esc(a.id) + '" aria-label="Remove ' + esc(a.name || "this account") + '">' + icon("trash") + "</button>" +
      '<span class="prefs-acct__tag">' + (a.source === "you" ? '<span class="srctag">You typed it</span>' : '<span class="srctag">' + esc(M.sourceLabel(a.source, getCtx().data)) + "</span>") + "</span></li>";
  }

  function form(d) {
    const s = d.settings, ys = String(s.yearStart).split("-").map(Number);
    const app = M.appName(d);
    const potOptions = [{ value: "", label: "None yet" }].concat(d.accounts.map(function (a) { return { value: a.id, label: a.name || "Unnamed account" }; }));
    return section("About you", "", '<div class="field-row">' + text(s, "businessName", "Business name", "Fern & Finch") + text(s, "ownerName", "Your first name", "Sam") + "</div>" +
        '<label class="field"><span class="field__label">Type of business</span><select class="select" data-setting="businessType">' + options(BUSINESS_TYPES, s.businessType) + "</select>" +
        '<span class="field__hint">Decides which tax dates show in In and out.</span></label>') +
      section("Your year", "", '<div class="prefs-grid">' +
        '<label class="field"><span class="field__label">Tax year starts</span><div class="field-row"><select class="select" data-year="m" aria-label="Month">' + options(MONTH_NAMES.map(function (n, i) { return { value: i + 1, label: n }; }), ys[0]) + '</select><input class="input num" type="number" min="1" max="31" step="1" data-year="d" aria-label="Day" value="' + esc(ys[1]) + '"></div>' +
        '<span class="field__hint">6 April for most sole traders. A limited company uses the day after its year end.</span></label>' +
        '<label class="field"><span class="field__label">Your week starts on</span><select class="select" data-setting="weekStarts">' + options([{ value: 1, label: "Monday" }, { value: 0, label: "Sunday" }], s.weekStarts) + "</select></label>" +
        number(s, "nervousBalance", "Balance that makes you nervous (£)", 'min="0" step="1"', "Money View warns you when the forecast drops under it.") + "</div>") +
      section("VAT", "", '<div class="prefs-switches">' + sw(s, "vat.registered", "I’m VAT registered") + "</div>" +
        (s.vat.registered ? '<div class="prefs-grid"><label class="field"><span class="field__label">Scheme</span><select class="select" data-setting="vat.scheme">' + options([{ value: "standard", label: "Standard" }, { value: "flat", label: "Flat rate" }], s.vat.scheme) + "</select></label>" +
          number(s, "vat.rate", "VAT rate (%)", 'min="0" max="100" step="0.5"') + (s.vat.scheme === "flat" ? number(s, "vat.flatRate", "Flat rate (%)", 'min="0" max="100" step="0.5"') : "") + "</div>" +
          '<div class="field"><span class="field__label">Your VAT quarters end in</span><div class="prefs-months" role="group" aria-label="Months your VAT quarters end">' +
          MONTH_NAMES.map(function (n, i) { return '<button type="button" class="filter' + (s.vat.quarterEnds.indexOf(i + 1) !== -1 ? " is-active" : "") + '" data-set="quarter" data-m="' + (i + 1) + '" aria-pressed="' + (s.vat.quarterEnds.indexOf(i + 1) !== -1) + '">' + n.slice(0, 3) + "</button>"; }).join("") + "</div></div>" +
          '<div class="prefs-switches">' + sw(s, "vat.cashAccounting", "I pay VAT when I’m paid (cash accounting)") + "</div>" : "")) +
      section("Tax", "Ask your accountant what to put aside.", '<div class="prefs-grid">' +
        number(s, "tax.setAsidePercent", "Share of money received to put aside (%)", 'min="0" max="100" step="0.5"', "Worked on money received after VAT.") +
        '<label class="field"><span class="field__label">Your tax pot account</span><select class="select" data-pot>' + options(potOptions, s.tax.potAccountId || "") + '</select><span class="field__hint">Pick the savings account or pot you keep tax in. If it isn’t one of your accounts below, leave it as none and log what you move.</span></label></div>' +
        text(s, "tax.note", "A note for yourself", "What my accountant said")) +
      section("New invoices", "Your invoices live in " + esc(app) + ", which numbers them. These are only the starting point for a new draft here.", '<div class="prefs-grid">' +
        text(s, "invoice.prefix", "Invoice prefix", "INV-") + number(s, "invoice.nextNumber", "Next number to suggest", 'min="1" step="1"', "Used when Claude can put drafts in " + esc(app) + ".") + number(s, "invoice.termsDays", "Payment terms (days)", 'min="0" max="365" step="1"') + "</div>") +
      section("Your bank", "Used by the Open button on your tax pot. Money View only opens the page, it never logs in for you.", '<div class="field-row">' + text(s, "bank.name", "Bank name", "Starling") + text(s, "bank.link", "Link to your online banking", "https://") + "</div>") +
      section("Your accounts", "Claude reads these from " + esc(app) + " when you press Refresh numbers. If one is wrong you can correct it here.",
        '<ul class="prefs-accts">' + (d.accounts.length ? d.accounts.map(acctRow).join("") : '<li class="prefs-hint">No accounts yet. Press Refresh numbers, or add one by hand.</li>') + '</ul><div><button type="button" class="btn" data-set="acct-add">' + icon("plus") + "Add an account</button></div>");
  }

  // Draws the pop-up again from the saved settings, keeping the scroll position and which control had focus
  function draw() {
    const body = dlg.querySelector(".modal__body");
    const scroll = body ? body.scrollTop : 0;
    const at = Array.prototype.indexOf.call(dlg.querySelectorAll(FOCUSABLE), document.activeElement);
    dlg.innerHTML = '<div class="modal__head"><h2 id="settingsTitle">Settings</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body">' + form(getCtx().data) + "</div>" +
      '<div class="modal__foot"><span class="prefs-hint">Changes save as you go.</span><span class="spacer"></span><button type="button" class="btn btn--primary" data-close>Done</button></div>';
    dlg.querySelector(".modal__body").scrollTop = scroll;
    const again = dlg.querySelectorAll(FOCUSABLE);
    if (at > -1 && again[at]) again[at].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && dlg.contains(a) && a.tagName === "INPUT" && /text|number|url|date/.test(a.type);
  }

  // ---------- Saving ----------
  function saveSetting(path, input) {
    const ctx = getCtx(), f = FIELDS[path];
    if (!f) return;
    let value;
    if (f.type === "bool") value = input.checked;
    else {
      value = input.value.trim();
      if (f.type === "int" || f.type === "number" || f.type === "money") {
        const n = Number(value);
        if (value === "" || !isFinite(n) || n < f.min || n > f.max || (f.type === "int" && !Number.isInteger(n))) {
          ctx.toast("Use " + (f.type === "int" ? "a whole number" : "a number") + " from " + f.min + " to " + f.max); draw(); return;
        }
        value = f.type === "money" ? Math.round(n * 100) / 100 : n;
      }
      if (f.type === "url" && value && !/^https?:\/\/\S+$/i.test(value)) { ctx.toast("Use the full address, starting with https://"); draw(); return; }
      if (path === "invoice.prefix" && value.length > 12) { ctx.toast("Keep the prefix short, 12 characters at most"); draw(); return; }
    }
    ctx.update(function (d) { put(d.settings, path, value); }, "Changed the " + f.label);
  }
  function saveYear() {
    const ctx = getCtx(), m = Number(dlg.querySelector("[data-year=m]").value), day = Number(dlg.querySelector("[data-year=d]").value);
    const days = new Date(Date.UTC(2024, m, 0)).getUTCDate();   // a leap year, so 29 February can be a year start
    if (!Number.isInteger(day) || day < 1 || day > days) { ctx.toast("That month has " + days + " days at most"); draw(); return; }
    ctx.update(function (d) { d.settings.yearStart = String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0"); }, "Changed the start of the tax year");
  }
  function toggleQuarter(m) {
    const ctx = getCtx(), list = ctx.data.settings.vat.quarterEnds.slice(), at = list.indexOf(m);
    if (at === -1) list.push(m); else list.splice(at, 1);
    if (!list.length) { ctx.toast("Keep at least one month"); return; }
    list.sort(function (a, b) { return a - b; });
    ctx.update(function (d) { d.settings.vat.quarterEnds = list; }, "Changed the months your VAT quarters end");
  }
  function savePot(id) {
    getCtx().update(function (d) {
      d.settings.tax.potAccountId = id || null;
      d.accounts.forEach(function (a) { a.isTaxPot = !!id && a.id === id; });
    }, "Changed the tax pot account");
  }
  function saveAccount(id, field, input) {
    const ctx = getCtx();
    let value = input.value.trim();
    if (field === "balance") {
      const n = Number(value);
      if (value === "" || !isFinite(n) || n < 0) { ctx.toast("Use an amount of 0 or more. For a card, the money you owe"); draw(); return; }
      value = Math.round(n * 100) / 100;
    }
    if (field === "asAt" && value && !M.validIso(value)) { ctx.toast("Use a real date"); draw(); return; }
    ctx.update(function (d) {
      const a = d.accounts.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      a[field] = field === "asAt" ? (value || null) : value;
      if (field === "balance" && !a.asAt) a.asAt = ctx.today;
      a.source = "you";
    }, "Corrected an account");
  }
  function addAccount() {
    const ctx = getCtx(), id = M.makeId("a");
    ctx.update(function (d) { d.accounts.push({ id: id, name: "", kind: "current", balance: 0, asAt: ctx.today, source: "you", isTaxPot: false }); }, "Added an account").then(function () {
      draw();
      const row = dlg.querySelector('[data-acct="' + id + '"] [data-a=name]');
      if (row) row.focus();
    });
  }
  function removeAccount(id) {
    const ctx = getCtx(), at = ctx.data.accounts.findIndex(function (a) { return a.id === id; });
    if (at === -1) return;
    const gone = Object.assign({}, ctx.data.accounts[at]), wasPot = ctx.data.settings.tax.potAccountId === id;
    ctx.update(function (d) {
      d.accounts = d.accounts.filter(function (a) { return a.id !== id; });
      if (d.settings.tax.potAccountId === id) d.settings.tax.potAccountId = null;
    }, "Removed the account " + (gone.name || "")).then(function () {
      draw();
      ctx.toast("Removed " + (gone.name || "the account"), function () {
        getCtx().update(function (d) {
          d.accounts.splice(Math.min(at, d.accounts.length), 0, gone);
          if (wasPot) d.settings.tax.potAccountId = gone.id;
        }, "Brought back the account " + (gone.name || ""));
      });
    });
  }

  function init(getContext) {
    getCtx = getContext;
    dlg = document.getElementById("settingsDialog");
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-close]")) { dlg.close(); return; }
      const b = e.target.closest("[data-set]");
      if (!b) return;
      const act = b.getAttribute("data-set");
      if (act === "acct-add") addAccount();
      else if (act === "acct-remove") removeAccount(b.getAttribute("data-id"));
      else if (act === "quarter") toggleQuarter(Number(b.getAttribute("data-m")));
    });
    dlg.addEventListener("change", function (e) {
      const el = e.target;
      if (el.hasAttribute("data-setting")) saveSetting(el.getAttribute("data-setting"), el);
      else if (el.hasAttribute("data-year")) saveYear();
      else if (el.hasAttribute("data-pot")) savePot(el.value);
      else if (el.hasAttribute("data-a")) saveAccount(el.closest("[data-acct]").getAttribute("data-acct"), el.getAttribute("data-a"), el);
    });
  }
  function open() { draw(); dlg.showModal(); }
  // Called by the app after every data change; leaves the boxes alone while the person is typing in one
  function refresh() { if (dlg.open && !typingInside()) draw(); }

  window.MV.settings = { init: init, open: open, refresh: refresh };
})();
