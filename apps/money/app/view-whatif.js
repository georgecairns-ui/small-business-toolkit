/*
  WHAT IF: try a change before you make it
  ----------------------------------------
  A card for each what if: its changes in plain words, an on and off switch, and Claude's note if it
  wrote one. Add a what if builds one from a short form (hiring someone, a new cost, extra income,
  losing a customer). The chart draws "As things are" and every what if that is switched on as lines on
  the same axes, and the table compares them: the lowest point, when, and the balance in 12 weeks.
  Every figure comes from MV.model.scenarioCompare (the same rules as the Overview forecast).

  The Ask Claude box ("Can I afford a new van at 450 pounds a month?") makes a what if with a request
  on it and runs the can-i-afford-this job. Claude fills in the changes and writes the note; the numbers
  still come from the model. Claude never moves money. A what if is put away, never deleted.

  The chart is drawn by MV.chart.forecast(element, seriesList, options). Each series is
  { id, label, weeks, base } where weeks is the list MV.model.forecast returns and base is true for
  "As things are". The options are { nervous, maybes, compare: true }.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  MV.views = MV.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components;

  const REPEATS = [["none", "Once"], ["weekly", "Every week"], ["monthly", "Every month"], ["quarterly", "Every 3 months"], ["yearly", "Every year"]];
  const KINDS = [["out", "Spending more"], ["in", "More money coming in"], ["lose", "Losing a customer"]];
  const WEEKS = 12;

  // form: null, "new", or the id of the what if a change is being added to; draft: what is typed in it
  const state = { form: null, draft: {}, question: "", asking: false };

  function visible(data) { return data.scenarios.filter(function (s) { return !s.dropped; }); }


  // ---------- The chart and the table ----------
  // Which scenarios are drawn: the ones switched on
  function onIds(data) { return visible(data).filter(function (s) { return s.on; }).map(function (s) { return s.id; }); }
  function compare(ctx) { return M.scenarioCompare(ctx.data, C.todayOf(ctx), onIds(ctx.data), { maybes: !!ctx.maybes }); }

  function lowClass(balance, nervous) { return balance < 0 ? " is-bad" : balance < nervous ? " is-warn" : ""; }
  function tableHtml(rows, ctx) {
    const today = C.todayOf(ctx), nervous = Number(ctx.data.settings.nervousBalance) || 0, onSet = onIds(ctx.data);
    return '<div class="wi-tablewrap"><table class="wi-table"><thead><tr><th scope="col">What if</th><th scope="col" class="wi-right">Lowest point</th><th scope="col">When</th><th scope="col" class="wi-right">Balance in ' + WEEKS + ' weeks</th></tr></thead><tbody>' +
      rows.map(function (r) {
        const base = onSet.indexOf(r.id) === -1;
        return "<tr" + (base ? ' class="wi-table__base"' : "") + '><th scope="row" data-label="What if">' + esc(base ? "As things are" : r.name) + '</th><td class="wi-right num' + lowClass(r.lowPoint.balance, nervous) + '" data-label="Lowest point">' + esc(M.money(r.lowPoint.balance)) +
          '</td><td data-label="When">w/c ' + esc(C.shortDate(r.lowPoint.weekStart, today)) + '</td><td class="wi-right num' + lowClass(r.endBalance, nervous) + '" data-label="Balance in ' + WEEKS + ' weeks">' + esc(M.money(r.endBalance)) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function drawChart(root, rows, ctx) {
    const host = root.querySelector("[data-chart]");
    if (!host) return;
    const onSet = onIds(ctx.data);
    const series = rows.map(function (r) {
      return { id: r.id, label: onSet.indexOf(r.id) === -1 ? "As things are" : r.name, weeks: r.weeks, base: onSet.indexOf(r.id) === -1 };
    });
    MV.chart.forecast(host, series, { nervous: Number(ctx.data.settings.nervousBalance) || 0, maybes: !!ctx.maybes, compare: true });
  }
  function chartPanel(ctx) {
    const rows = compare(ctx), on = onIds(ctx.data).length;
    return '<section class="panel wi-chartpanel"><h2 class="wi-title">Side by side</h2>' +
      '<p class="muted wi-note">' + (on ? "Your balance over the next " + WEEKS + " weeks, as things are and with each what if that is switched on." : "Your balance over the next " + WEEKS + " weeks as things are. Switch a what if on below to draw it here.") + " Estimates, from your invoices and confirmed items.</p>" +
      '<div class="wi-chart" data-chart></div>' + tableHtml(rows, ctx) + "</section>";
  }

  // ---------- Ask Claude ----------
  function askPanel(ctx) {
    return '<section class="panel wi-ask"><h2 class="wi-title">Ask Claude</h2>' +
      '<p class="muted wi-note">Say what you are thinking of. Claude sets it up as a what if and adds a short note. The numbers still come from the same rules as your forecast.</p>' +
      '<form class="wi-ask__form" data-form="ask" autocomplete="off"><label class="sr-only" for="wiQuestion">Your question</label>' +
      '<input class="input" id="wiQuestion" name="question" maxlength="300" value="' + esc(state.question) + '" placeholder="Can I afford a new van at £450 a month?">' +
      '<button type="submit" class="btn btn--primary"' + (state.asking ? " disabled" : "") + ">" + icon("sparkle") + "Ask Claude</button></form></section>";
  }

  // ---------- Cards ----------
  function card(s, ctx) {
    const today = C.todayOf(ctx), id = esc(s.id);
    const asked = s.request ? '<div class="drawer__banner wi-banner"><span>' + icon("sparkle") + "<span>Claude is working this out: “" + esc(s.request.question) + "”. It appears here when it is done.</span></span>" +
      '<span>Nothing happening? Open the folder in Claude and say <span class="say">can I afford this<button type="button" class="say__copy" data-copy="can I afford this">Copy</button></span></span></div>' : "";
    return '<article class="card wi-card' + (s.on ? " is-on" : "") + '"><div class="wi-card__head"><h3 class="wi-card__name">' + esc(s.name) + "</h3>" +
      '<label class="switch"><input type="checkbox" data-toggle="' + id + '"' + (s.on ? " checked" : "") + '><span class="switch__track"></span><span>' + (s.on ? "On" : "Off") + "</span></label></div>" + asked +
      (s.changes.length ? '<ul class="wi-changes">' + s.changes.map(function (c) { return "<li>" + esc(M.changeText(c)) + "</li>"; }).join("") + "</ul>" : (s.request ? "" : '<p class="muted wi-note">No changes in this one yet.</p>')) +
      (s.note ? '<div class="wi-claude"><span class="wi-claude__label">' + icon("sparkle") + "Claude’s note</span><p>" + esc(s.note) + '</p><p class="muted wi-claude__small">An estimate to help you plan, not financial advice. Check big decisions with your accountant.</p></div>' : "") +
      (state.form === s.id ? changeForm(ctx, false) : '<div class="wi-card__actions"><button type="button" class="btn btn--sm" data-action="add-change" data-id="' + id + '">' + icon("plus") + "Add a change</button>" +
        '<button type="button" class="btn btn--sm btn--ghost" data-action="put-away" data-id="' + id + '">Put away</button></div>') + "</article>";
  }

  // ---------- The form ----------
  function opt(value, text, selected) { return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + ">" + esc(text) + "</option>"; }
  function field(label, control, cls) { return '<label class="field' + (cls ? " " + cls : "") + '"><span class="field__label">' + esc(label) + "</span>" + control + "</label>"; }
  function customers(data) {
    const seen = {};
    M.customers(data).forEach(function (c) { seen[c] = true; });
    data.expected.forEach(function (e) { if (e.who) seen[e.who] = true; });
    return Object.keys(seen).sort();
  }
  function blankDraft(ctx) { return { scenario: "", kind: "out", name: "", amount: "", repeat: "monthly", from: C.todayOf(ctx), to: "", customer: "" }; }

  function changeForm(ctx, isNew) {
    const d = state.draft, lose = d.kind === "lose";
    return '<form class="wi-form' + (isNew ? " card" : "") + '" data-form="change" autocomplete="off"><h3 class="wi-form__title">' + (isNew ? "Add a what if" : "Add a change") + "</h3>" +
      '<div class="wi-form__grid">' +
      (isNew ? field("Give it a name", '<input class="input" name="scenario" value="' + esc(d.scenario) + '" placeholder="Hire a designer in March" maxlength="120">', "wi-form__wide") : "") +
      field("What kind of change", '<select class="select" name="kind">' + KINDS.map(function (k) { return opt(k[0], k[1], d.kind); }).join("") + "</select>") +
      (lose ? field("Which customer", '<input class="input" name="customer" list="wiCustomers" value="' + esc(d.customer) + '" placeholder="Greenway Café" maxlength="140"><datalist id="wiCustomers">' + customers(ctx.data).map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join("") + "</datalist>") :
        field("What it is", '<input class="input" name="name" value="' + esc(d.name) + '" placeholder="Designer salary" maxlength="140">') +
        field("Amount (£)", '<input class="input" name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(d.amount) + '">') +
        field("How often", '<select class="select" name="repeat">' + REPEATS.map(function (r) { return opt(r[0], r[1], d.repeat); }).join("") + "</select>")) +
      field("From", '<input class="input" name="from" type="date" value="' + esc(d.from) + '">') +
      field("Until (optional)", '<input class="input" name="to" type="date" value="' + esc(d.to) + '">') + "</div>" +
      '<div class="wi-form__foot"><button type="submit" class="btn btn--primary">' + (isNew ? "Add it" : "Add the change") + '</button><button type="button" class="btn btn--ghost" data-action="form-cancel">Cancel</button></div></form>';
  }

  // ---------- Saving ----------
  function submitChange(ctx, root, form) {
    const f = form.elements, kind = f.kind.value, isNew = state.form === "new", targetId = state.form;
    const scenarioName = isNew ? f.scenario.value.trim() : "";
    if (isNew && !scenarioName) { ctx.toast("Give the what if a name first"); f.scenario.focus(); return; }
    if (!f.from.value) { ctx.toast("Choose the date it starts"); f.from.focus(); return; }
    let change;
    if (kind === "lose") {
      const customer = f.customer.value.trim();
      if (!customer) { ctx.toast("Say which customer"); f.customer.focus(); return; }
      change = { kind: "lose", name: "Lose " + customer, amount: 0, repeat: "none", from: f.from.value, to: f.to.value || null, customer: customer };
    } else {
      const name = f.name.value.trim(), amount = Math.round(Number(f.amount.value) * 100) / 100;
      if (!name) { ctx.toast("Say what it is"); f.name.focus(); return; }
      if (!(amount > 0)) { ctx.toast("Add an amount first"); f.amount.focus(); return; }
      change = { kind: kind, name: name, amount: amount, repeat: f.repeat.value, from: f.from.value, to: f.to.value || null, customer: "" };
    }
    change.id = ui.makeId("c");
    state.form = null;
    ctx.update(function (d) {
      if (isNew) d.scenarios.unshift({ id: ui.makeId("s"), name: scenarioName, on: true, changes: [change], request: null, note: "", createdAt: new Date().toISOString() });
      else { const s = d.scenarios.find(function (x) { return x.id === targetId; }); s.changes.push(change); }
    }, isNew ? "Added a what if: " + scenarioName : "Added a change to a what if: " + change.name).catch(C.failed);
  }

  function ask(ctx, root, form) {
    const question = form.elements.question.value.trim();
    if (!question) { ctx.toast("Type your question first"); form.elements.question.focus(); return; }
    if (state.asking) return;
    state.asking = true;
    const name = question.length > 70 ? question.slice(0, 67) + "..." : question;
    ctx.update(function (d) {
      d.scenarios.unshift({ id: ui.makeId("s"), name: name, on: false, changes: [], request: { question: question, at: new Date().toISOString() }, note: "", createdAt: new Date().toISOString() });
    }, "Asked Claude: " + question).then(function () {
      state.question = "";
      return ctx.runJob("can-i-afford-this");
    }).catch(C.failed).then(function () { state.asking = false; });
  }

  function toggle(ctx, id, on) {
    const s = ctx.data.scenarios.find(function (x) { return x.id === id; });
    ctx.update(function (d) { d.scenarios.find(function (x) { return x.id === id; }).on = on; }, (on ? "Switched on the what if: " : "Switched off the what if: ") + s.name).catch(C.failed);
  }
  function putAway(ctx, id) {
    const s = ctx.data.scenarios.find(function (x) { return x.id === id; }), wasOn = s.on;
    ctx.update(function (d) { const x = d.scenarios.find(function (y) { return y.id === id; }); x.dropped = true; x.on = false; }, "Put away the what if: " + s.name).then(function () {
      ctx.toast("Put away. It is kept, not deleted", function () {
        ctx.update(function (d) { const x = d.scenarios.find(function (y) { return y.id === id; }); x.dropped = false; x.on = wasOn; }, "Brought back the what if: " + s.name).catch(C.failed);
      });
    }).catch(C.failed);
  }

  function onClick(ctx, root) {
    return function (e) {
      const b = e.target.closest("[data-action]");
      if (!b) return;
      const a = b.getAttribute("data-action"), id = b.getAttribute("data-id");
      if (a === "new") { state.form = "new"; state.draft = blankDraft(ctx); MV.views.whatif.render(root, ctx); const first = root.querySelector(".wi-form input"); if (first) first.focus(); }
      else if (a === "add-change") { state.form = id; state.draft = blankDraft(ctx); MV.views.whatif.render(root, ctx); const first = root.querySelector(".wi-form select"); if (first) first.focus(); }
      else if (a === "form-cancel") { state.form = null; MV.views.whatif.render(root, ctx); }
      else if (a === "put-away") putAway(ctx, id);
    };
  }

  MV.views.whatif = {
    title: "What if",
    line: function (ctx) {
      const n = onIds(ctx.data).length, total = visible(ctx.data).length;
      if (!total) return "Try a change before you make it";
      return n ? n + (n === 1 ? " what if" : " what ifs") + " switched on" : total + (total === 1 ? " what if" : " what ifs") + ", none switched on";
    },
    render: function (root, ctx) {
      const list = visible(ctx.data);
      const cards = list.length ? '<div class="wi-grid">' + list.map(function (s) { return card(s, ctx); }).join("") + "</div>" :
        '<div class="empty empty--compact"><h3>No what ifs yet</h3><p>Try one: hiring someone in March, a new van, or losing your biggest customer. Ask Claude above, or add one yourself.</p></div>';
      root.innerHTML = '<div class="wi-page">' + askPanel(ctx) + chartPanel(ctx) +
        '<section class="wi-section"><div class="wi-section__head"><h2 class="wi-title">Your what ifs</h2>' +
        (state.form === "new" ? "" : '<button type="button" class="btn btn--sm" data-action="new">' + icon("plus") + "Add a what if</button>") + "</div>" +
        (state.form === "new" ? changeForm(ctx, true) : "") + cards + "</section></div>";
      drawChart(root, compare(ctx), ctx);
      root.onclick = onClick(ctx, root);
      root.onchange = function (e) {
        const t = e.target;
        if (t.hasAttribute("data-toggle")) { toggle(ctx, t.getAttribute("data-toggle"), t.checked); return; }
        if (t.form && t.form.getAttribute("data-form") === "change") {
          state.draft[t.name] = t.value;
          // The kind decides which boxes show
          if (t.name === "kind") MV.views.whatif.render(root, ctx);
        }
      };
      // What is typed is kept, so a redraw never loses it
      root.oninput = function (e) {
        const t = e.target;
        if (!t.form) return;
        if (t.form.getAttribute("data-form") === "change" && t.name) state.draft[t.name] = t.value;
        else if (t.form.getAttribute("data-form") === "ask") state.question = t.value;
      };
      root.onsubmit = function (e) {
        e.preventDefault();
        if (e.target.getAttribute("data-form") === "ask") ask(ctx, root, e.target);
        else submitChange(ctx, root, e.target);
      };
    }
  };
})();
