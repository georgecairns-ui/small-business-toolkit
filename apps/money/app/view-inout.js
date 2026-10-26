/*
  IN AND OUT: what is expected, what regularly goes out, and the tax dates
  ------------------------------------------------------------------------
  Three sections.
  Money coming in: money that is not on an invoice yet. Suggestions (from Pipeline OS, Proposal OS or Claude)
  sit at the top waiting for Confirm or Drop. Only confirmed items count in the forecast.
  Money going out: regular and one-off payments grouped by category, with the monthly total from the model.
  Suggestions from your accounts app wait for Confirm.
  Tax and VAT dates: worked out by MV.model.taxDates, each one labelled as an estimate.

  Add and edit happen in place. Drop keeps the record (status "dropped") and offers Undo; nothing is deleted.
  Every change goes through ctx.update(); every figure comes from MV.model.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  MV.views = MV.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  const CATEGORIES = M.OUT_CATEGORIES.map(function (c) { return [c.key, c.label]; });
  const REPEATS = [["none", "Once"], ["weekly", "Every week"], ["monthly", "Every month"], ["quarterly", "Every 3 months"], ["yearly", "Every year"]];
  const IN_SOURCES = { you: "you", pipeline: "Pipeline OS", proposals: "Proposal OS", claude: "Claude" };
  const OUT_SOURCES = { you: "you", ads: "Ads OS", claude: "Claude" };
  const TAX_WEEKS = 52;

  // form: which add or edit form is open ({ type: "in" | "out", id: null for a new one }); draft: what is typed in it
  const state = { form: null, draft: {} };

  function label(list, key) { const f = list.find(function (x) { return x[0] === key; }); return f ? f[1] : key; }
  function outSource(key, data) { return key === "accounts" ? M.appName(data) : OUT_SOURCES[key] || key; }

  // ---------- Forms ----------
  function opt(value, text, selected) { return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + ">" + esc(text) + "</option>"; }
  function field(label, control) { return '<label class="field"><span class="field__label">' + esc(label) + "</span>" + control + "</label>"; }

  function openForm(type, item, ctx) {
    const today = C.todayOf(ctx);
    state.form = { type: type, id: item ? item.id : null };
    if (type === "in") {
      state.draft = item ? { who: item.who, what: item.what, amount: String(item.amount), date: item.date, chance: item.chance } :
        { who: "", what: "", amount: "", date: today, chance: "likely" };
    } else {
      state.draft = item ? { name: item.name, amount: String(item.amount), category: item.category, repeat: item.repeat, date: item.date, endDate: item.endDate || "", vatIncluded: !!item.vatIncluded } :
        { name: "", amount: "", category: "bills", repeat: "monthly", date: today, endDate: "", vatIncluded: !!ctx.data.settings.vat.registered };
    }
  }

  function inForm(ctx) {
    const d = state.draft, editing = !!state.form.id;
    return '<form class="card io-form" data-form="in" autocomplete="off"><h3 class="io-form__title">' + (editing ? "Change this" : "Add money coming in") + "</h3>" +
      '<div class="io-form__grid">' +
      field("Who from", '<input class="input" name="who" value="' + esc(d.who) + '" placeholder="Greenway Café" maxlength="140">') +
      field("What for", '<input class="input" name="what" value="' + esc(d.what) + '" placeholder="Menu redesign, second half" maxlength="200">') +
      field("Amount (£)", '<input class="input" name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(d.amount) + '">') +
      field("When you expect it", '<input class="input" name="date" type="date" value="' + esc(d.date) + '">') +
      field("How sure", '<select class="select" name="chance">' + opt("likely", "Likely", d.chance) + opt("maybe", "Maybe", d.chance) + "</select>") + "</div>" +
      '<div class="io-form__foot"><button type="submit" class="btn btn--primary">' + (editing ? "Save" : "Add it") + '</button><button type="button" class="btn btn--ghost" data-action="form-cancel">Cancel</button></div></form>';
  }
  function outForm(ctx) {
    const d = state.draft, editing = !!state.form.id, vat = !!ctx.data.settings.vat.registered;
    return '<form class="card io-form" data-form="out" autocomplete="off"><h3 class="io-form__title">' + (editing ? "Change this" : "Add money going out") + "</h3>" +
      '<div class="io-form__grid">' +
      field("What it is", '<input class="input" name="name" value="' + esc(d.name) + '" placeholder="Studio rent" maxlength="140">') +
      field("Amount (£)", '<input class="input" name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(d.amount) + '">') +
      field("Kind", '<select class="select" name="category">' + CATEGORIES.map(function (c) { return opt(c[0], c[1], d.category); }).join("") + "</select>") +
      field("How often", '<select class="select" name="repeat">' + REPEATS.map(function (r) { return opt(r[0], r[1], d.repeat); }).join("") + "</select>") +
      field("Next date", '<input class="input" name="date" type="date" value="' + esc(d.date) + '">') +
      field("Stops on (optional)", '<input class="input" name="endDate" type="date" value="' + esc(d.endDate) + '">') + "</div>" +
      (vat ? '<label class="switch io-form__vat"><input type="checkbox" name="vatIncluded"' + (d.vatIncluded ? " checked" : "") + '><span class="switch__track"></span><span>The amount includes VAT</span></label>' : "") +
      '<div class="io-form__foot"><button type="submit" class="btn btn--primary">' + (editing ? "Save" : "Add it") + '</button><button type="button" class="btn btn--ghost" data-action="form-cancel">Cancel</button></div></form>';
  }
  function formFor(type, ctx) { return type === "in" ? inForm(ctx) : outForm(ctx); }
  function formOpen(type, id) { return state.form && state.form.type === type && state.form.id === id; }

  // ---------- Rows ----------
  function chanceChip(item) {
    return item.chance === "maybe" ? '<span class="chip chip--warning" title="Only counts when Include maybes is on">Maybe</span>' : '<span class="chip chip--success">Likely</span>';
  }
  function actionButtons(item, suggested) {
    const id = esc(item.id);
    return '<div class="io-row__actions">' +
      (suggested ? '<button type="button" class="btn btn--sm btn--primary" data-action="confirm" data-id="' + id + '">' + icon("check") + "Confirm</button>" : "") +
      '<button type="button" class="btn btn--sm" data-action="edit" data-id="' + id + '">' + icon("pencil") + "Edit</button>" +
      '<button type="button" class="btn btn--sm btn--ghost" data-action="drop" data-id="' + id + '">Drop</button></div>';
  }
  function inRow(it, ctx, suggested) {
    if (formOpen("in", it.id)) return "<li>" + inForm(ctx) + "</li>";
    const today = C.todayOf(ctx);
    return '<li class="io-row' + (suggested ? " io-row--suggested" : "") + '"><div class="io-row__main"><span class="io-row__title">' + esc(it.who || "Someone") + (it.what ? '<span class="muted"> · ' + esc(it.what) + "</span>" : "") + "</span>" +
      '<span class="io-row__sub muted">' + esc(C.shortDate(it.date, today)) + " · Estimate from " + esc(IN_SOURCES[it.source] || it.source) + "</span></div>" +
      '<div class="io-row__side">' + chanceChip(it) + '<span class="io-row__amount num">' + esc(M.money(it.amount)) + "</span></div>" + actionButtons(it, suggested) + "</li>";
  }
  function outRow(it, ctx, suggested) {
    if (formOpen("out", it.id)) return "<li>" + outForm(ctx) + "</li>";
    const today = C.todayOf(ctx);
    const when = it.repeat === "none" ? C.shortDate(it.date, today) : label(REPEATS, it.repeat).toLowerCase() + ", next " + C.shortDate(it.date, today) + (it.endDate ? ", until " + C.shortDate(it.endDate, today) : "");
    return '<li class="io-row' + (suggested ? " io-row--suggested" : "") + '"><div class="io-row__main"><span class="io-row__title">' + esc(it.name) + "</span>" +
      '<span class="io-row__sub muted">' + esc(when) + " · " + (suggested ? "Spotted in " : "From ") + esc(outSource(it.source, ctx.data)) + (it.vatIncluded && ctx.data.settings.vat.registered ? " · includes VAT" : "") + "</span></div>" +
      '<div class="io-row__side"><span class="io-row__amount num">' + esc(M.money(it.amount)) + "</span></div>" + actionButtons(it, suggested) + "</li>";
  }

  // ---------- Sections ----------
  function section(title, intro, body, addButton) {
    return '<section class="io-section"><div class="io-section__head"><div><h2 class="io-section__title">' + esc(title) + '</h2><p class="io-section__intro muted">' + esc(intro) + "</p></div>" + (addButton || "") + "</div>" + body + "</section>";
  }
  function addButton(type, text) {
    return '<button type="button" class="btn btn--sm" data-action="add" data-type="' + type + '">' + icon("plus") + esc(text) + "</button>";
  }

  function comingIn(ctx) {
    const live = ctx.data.expected.filter(function (e) { return e.status === "suggested" || e.status === "confirmed"; });
    const suggested = live.filter(function (e) { return e.status === "suggested"; }), confirmed = live.filter(function (e) { return e.status === "confirmed"; });
    confirmed.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    let body = "";
    if (suggested.length) body += '<div class="io-group io-group--suggested"><h3 class="io-group__title">Waiting for you</h3><p class="muted io-group__note">Won deals and approved proposals show here. Confirm the ones you are counting on. They only join your forecast once confirmed.</p><ul class="io-list">' +
      suggested.map(function (e) { return inRow(e, ctx, true); }).join("") + "</ul></div>";
    if (confirmed.length) body += '<div class="io-group"><h3 class="io-group__title">Counting on</h3><ul class="io-list">' + confirmed.map(function (e) { return inRow(e, ctx, false); }).join("") + "</ul></div>";
    if (!live.length) body += '<div class="empty empty--compact"><h3>Nothing expected yet</h3><p>Money you expect that is not on an invoice yet goes here: a deposit, a deal you have won. Add one, or tell Claude in a Brain dump.</p></div>';
    if (state.form && state.form.type === "in" && !state.form.id) body += inForm(ctx);
    return section("Money coming in", "Money you expect that is not on an invoice yet. Estimates, from the source shown on each one.", body, state.form && state.form.type === "in" && !state.form.id ? "" : addButton("in", "Add money coming in"));
  }

  function goingOut(ctx) {
    const live = ctx.data.outgoings.filter(function (o) { return o.status === "suggested" || o.status === "confirmed"; });
    const suggested = live.filter(function (o) { return o.status === "suggested"; }), confirmed = live.filter(function (o) { return o.status === "confirmed"; });
    let body = "";
    if (confirmed.length) body += '<p class="io-total"><span class="io-total__label">Regular payments, each month</span><span class="io-total__num num">' + esc(M.money(M.monthlyOutTotal(ctx.data))) + '</span><span class="muted io-total__note">Estimate, from the repeating payments below that you have confirmed.</span></p>';
    if (suggested.length) body += '<div class="io-group io-group--suggested"><h3 class="io-group__title">Waiting for you</h3><p class="muted io-group__note">Regular payments Claude spotted in your accounts app. Confirm the real ones. They only count once confirmed.</p><ul class="io-list">' +
      suggested.map(function (o) { return outRow(o, ctx, true); }).join("") + "</ul></div>";
    CATEGORIES.forEach(function (c) {
      const items = confirmed.filter(function (o) { return (o.category || "other") === c[0]; });
      if (!items.length) return;
      items.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
      body += '<div class="io-group"><h3 class="io-group__title">' + esc(c[1]) + '</h3><ul class="io-list">' + items.map(function (o) { return outRow(o, ctx, false); }).join("") + "</ul></div>";
    });
    if (!live.length) body += '<div class="empty empty--compact"><h3>No payments going out yet</h3><p>Rent, software, wages and other regular payments go here. Add them, or Refresh numbers and Claude suggests the ones it spots in your accounts app.</p></div>';
    if (state.form && state.form.type === "out" && !state.form.id) body += outForm(ctx);
    return section("Money going out", "Regular and one-off payments, by kind. The forecast counts the ones you have confirmed.", body, state.form && state.form.type === "out" && !state.form.id ? "" : addButton("out", "Add money going out"));
  }

  function taxSection(ctx) {
    const today = C.todayOf(ctx), vat = ctx.data.settings.vat;
    const dates = M.taxDates(ctx.data, today, TAX_WEEKS);
    let body = "";
    if (vat.registered) {
      const q = M.vatQuarter(ctx.data, today);
      body += '<p class="io-total"><span class="io-total__label">This VAT quarter, ' + esc(C.shortDate(q.start, today)) + " to " + esc(C.shortDate(q.end, today)) + '</span><span class="io-total__num num">' + esc(M.money(q.owed)) + '</span><span class="muted io-total__note">Estimate of VAT owed, due by ' + esc(C.shortDate(q.dueDate, today)) + ".</span></p>";
    }
    if (dates.length) {
      body += '<ul class="io-list">' + dates.map(function (t) {
        const known = !t.askAccountant;
        return '<li class="io-row"><div class="io-row__main"><span class="io-row__title">' + esc(t.name) + '</span><span class="io-row__sub muted">' + esc(C.shortDate(t.date, today)) + " · Estimate" + (t.detail ? " · " + esc(t.detail) : "") + "</span></div>" +
          '<div class="io-row__side">' + (known ? '<span class="io-row__amount num">' + esc(M.money(t.amount)) + "</span>" : '<span class="chip chip--warning">Ask your accountant</span>') + "</div></li>";
      }).join("") + "</ul>" +
        '<p class="muted io-group__note">To put a real amount on a date, add it under Money going out with the kind set to Tax. It then counts in your forecast.</p>';
    } else {
      body += '<div class="empty empty--compact"><h3>No tax dates to show yet</h3><p>Add your business type, year start and VAT details in Settings and the dates appear here.</p></div>';
    }
    return section("Tax and VAT dates", "Worked out from your settings. Every date and amount here is an estimate.", body);
  }

  // ---------- Saving ----------
  function amountOf(v) { return Math.round(Number(v) * 100) / 100; }
  function setStatus(ctx, list, id, status, text, undoText, toastText) {
    const item = ctx.data[list].find(function (x) { return x.id === id; }), before = item.status;
    ctx.update(function (d) { d[list].find(function (x) { return x.id === id; }).status = status; }, text).then(function () {
      ctx.toast(toastText, function () {
        ctx.update(function (d) { d[list].find(function (x) { return x.id === id; }).status = before; }, undoText).catch(C.failed);
      });
    }).catch(C.failed);
  }
  function findItem(ctx, id) {
    return ctx.data.expected.find(function (x) { return x.id === id; }) || ctx.data.outgoings.find(function (x) { return x.id === id; });
  }
  function listOf(ctx, id) { return ctx.data.expected.some(function (x) { return x.id === id; }) ? "expected" : "outgoings"; }
  function nameOf(it) { return it.who ? it.who + (it.what ? ", " + it.what : "") : it.name; }

  function submit(ctx, root, form) {
    const type = form.getAttribute("data-form"), f = form.elements, id = state.form.id;
    const amount = amountOf(f.amount.value);
    if (!(amount > 0)) { ctx.toast("Add an amount first"); f.amount.focus(); return; }
    if (!f.date.value) { ctx.toast("Choose a date first"); f.date.focus(); return; }
    if (type === "in") {
      const who = f.who.value.trim(), what = f.what.value.trim();
      if (!who && !what) { ctx.toast("Say who it is from or what it is for"); f.who.focus(); return; }
      const values = { who: who, what: what, amount: amount, date: f.date.value, chance: f.chance.value };
      state.form = null;
      ctx.update(function (d) {
        if (id) Object.assign(d.expected.find(function (x) { return x.id === id; }), values);
        else d.expected.unshift(Object.assign({ id: ui.makeId("e"), source: "you", status: "confirmed", invoiceId: null, note: "" }, values));
      }, (id ? "Changed money coming in: " : "Added money coming in: ") + (who || what) + ", " + M.money(amount)).catch(C.failed);
    } else {
      const name = f.name.value.trim();
      if (!name) { ctx.toast("Say what it is first"); f.name.focus(); return; }
      const values = { name: name, amount: amount, category: f.category.value, repeat: f.repeat.value, date: f.date.value, endDate: f.endDate.value || null, vatIncluded: f.vatIncluded ? f.vatIncluded.checked : false };
      state.form = null;
      ctx.update(function (d) {
        if (id) Object.assign(d.outgoings.find(function (x) { return x.id === id; }), values);
        else d.outgoings.unshift(Object.assign({ id: ui.makeId("o"), source: "you", status: "confirmed", note: "" }, values));
      }, (id ? "Changed a payment going out: " : "Added a payment going out: ") + name + ", " + M.money(amount)).catch(C.failed);
    }
  }

  function onClick(ctx, root) {
    return function (e) {
      const b = e.target.closest("[data-action]");
      if (!b) return;
      const action = b.getAttribute("data-action"), id = b.getAttribute("data-id");
      if (action === "add") { openForm(b.getAttribute("data-type"), null, ctx); MV.views.inout.render(root, ctx); const first = root.querySelector(".io-form input"); if (first) first.focus(); return; }
      if (action === "form-cancel") { state.form = null; MV.views.inout.render(root, ctx); return; }
      const item = findItem(ctx, id), list = item && listOf(ctx, id);
      if (!item) return;
      if (action === "edit") { openForm(list === "expected" ? "in" : "out", item, ctx); MV.views.inout.render(root, ctx); const first = root.querySelector(".io-form input"); if (first) first.focus(); }
      else if (action === "confirm") setStatus(ctx, list, id, "confirmed", "Confirmed: " + nameOf(item), "Unconfirmed: " + nameOf(item), "Confirmed. It now counts in your forecast");
      else if (action === "drop") setStatus(ctx, list, id, "dropped", "Dropped: " + nameOf(item), "Brought back: " + nameOf(item), "Dropped. It is kept, not deleted");
    };
  }

  MV.views.inout = {
    title: "In and out",
    line: function (ctx) {
      const waiting = ctx.data.expected.filter(function (e) { return e.status === "suggested"; }).length + ctx.data.outgoings.filter(function (o) { return o.status === "suggested"; }).length;
      return waiting ? waiting + (waiting === 1 ? " suggestion" : " suggestions") + " waiting for you to confirm" : "What is expected, what goes out, and your tax dates";
    },
    render: function (root, ctx) {
      root.innerHTML = '<div class="io-page">' + comingIn(ctx) + goingOut(ctx) + taxSection(ctx) + "</div>";
      root.onclick = onClick(ctx, root);
      // What is typed in a form is kept, so a redraw never loses it
      root.oninput = function (e) {
        const t = e.target;
        if (t.form && t.form.hasAttribute("data-form") && t.name) state.draft[t.name] = t.type === "checkbox" ? t.checked : t.value;
      };
      root.onchange = root.oninput;
      root.onsubmit = function (e) { e.preventDefault(); submit(ctx, root, e.target); };
    }
  };
})();
