/*
  MONEY VIEW OS: the app
  ----------------------
  Ties everything together:
  1. Connects to data/money.json through the shared store.
  2. Shows a short card until the app is running, then the app.
  3. Draws the one page: the top bar (with the "As at" line), the rail (Overview, Months, Invoices, In and out,
     What if, then Refresh numbers, New invoice and Settings) and the view under it. Each view has its own
     address (#overview, #months, #invoices, #inout, #whatif and #invoice/<id>); every move is a history entry,
     so Back and Forward work.
  4. Gives every view the same ctx (below).
  5. Asks Claude to do its 4 jobs (claude-jobs.json) and shows the shared "Claude is working" pill.

  A view registers itself as MV.views.<name> = { render(root, ctx) } for overview, months, invoices, inout and
  whatif. The invoice drawer registers as MV.drawer = { open(ctx, id, section), close(), refresh(ctx), isOpen() }
  (only open is needed; init, refresh, close and isOpen are used if they exist). The drawer's own markup goes in <aside id="drawer">
  with <div id="drawerScrim"> in index.html, and when the person closes it the app notices (body class has-drawer goes) and puts the address back.

  ctx (a new one every time something is drawn, so always read the latest):
    ctx.data               the file as it is now, tidied by MV.model.normalise. Read only: change it with ctx.update.
    ctx.today              today as the text "YYYY-MM-DD" (a string, not a function)
    ctx.update(fn, what, ref)  the only way a page changes the data. fn(d) edits a fresh copy, which is then
                           saved; what is the line for the activity list (leave out for none); ref is an invoice
                           or scenario id for that line. Returns a promise, rejected after the person has been told.
    ctx.openInvoice(id, section)  opens the invoice drawer on that invoice (address #invoice/<id>);
                           section is optional, "chase" opens it at the reminder
    ctx.closeInvoice()     closes the drawer and puts the address back
    ctx.newInvoice()       opens the drawer on a blank draft (MV.drawer.open(ctx, null)); it is written when the first change is saved. Returns a promise.
    ctx.runJob(name)       asks Claude to run a job: "refresh-money", "put-invoices-in-accounts", "chase-invoices"
                           or "can-i-afford-this". Resolves true when Claude finished, false if not.
    ctx.toast(text, undoFn) a notice at the bottom; with undoFn it has an Undo button
    ctx.go(view, replace)  moves to a view by name
    ctx.redraw()           draws the page again
    ctx.maybes             whether "Include maybes" is switched on (kept until the page is closed)
    ctx.setMaybes(on)      switches it and draws again
    ctx.scenarioIds        the ids of the what ifs that are switched on (scenario.on), for forecast options
    ctx.forecastOpts()     { scenarioIds: ctx.scenarioIds, maybes: ctx.maybes }
    ctx.busy(name)         true while that job is running
    ctx.ui, ctx.model      the shared helpers and MV.model

  The rule throughout: the app suggests, the person does. Nothing here moves money, sends an invoice or
  changes anything in the accounts app.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.MV.model, C = window.MV.components, V = window.MV.views, Settings = window.MV.settings;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const drawer = function () { return window.MV.drawer || null; };

  const TABS = [{ id: "overview", label: "Overview" }, { id: "months", label: "Months" }, { id: "invoices", label: "Invoices" }, { id: "inout", label: "In and out" }, { id: "whatif", label: "What if" }];
  const VIEW_ORDER = TABS.map(function (t) { return t.id; });
  const TITLES = { overview: "Overview", months: "Months", invoices: "Invoices", inout: "In and out", whatif: "What if" };
  const DEFAULT_VIEW = "overview";
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

  const state = { view: DEFAULT_VIEW, rendered: null, invoiceId: null, openedId: null, pushed: false, maybes: false };
  let data = null;
  let status = "checking";
  let statusDetail = {};

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "money",
    fileName: "money.json",
    dataPaths: ["data", "", "apps/money/data"],
    api: "/api/data/money/money.json",
    validate: M.validate,
    onStatus: function (s, detail) {
      const previous = status;
      status = s;
      statusDetail = detail || {};
      renderChrome();
      if (!(data && (s === "ready" || s === "error")) || previous !== s) render();
    },
    onData: function (d, reason) {
      data = M.normalise(d);
      if (reason === "load") closeDrawerNow();
      // Claude wrote something while the person is typing in a box: leave the page alone until they finish
      if (reason === "external" && typingInView()) { renderChrome(); return; }
      render();
    }
  });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your money file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in a backup file next to it.", say: "Please check my money file and fix it", short: "Your money file needs a quick fix" };
    if (kind === "missing") return { title: "Your money file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My money file seems to be missing, please check it", short: "Your money file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your money view has stopped running.", body: "Everything is saved. In Claude, say “open my money view” and it starts again. This page reconnects by itself.", say: "Open my money view", short: "Your money view has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }
  window.addEventListener("unhandledrejection", function (e) { if (e.reason && e.reason.shownToPerson) e.preventDefault(); });

  // ============================================================
  // 2. Before the app is running
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }
  function gateCard(eyebrow, title, body, actions) {
    return '<div class="gate__card"><div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Money View OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + esc(title) + "</h1>" + body +
      (actions ? '<div class="gate__actions">' + actions + "</div>" : "") + '</div><div class="gate__art"><img src="' + C.ART.welcome + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate() {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your money view"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("", "Your money view opens from Claude.",
        "<p>Claude runs it on this computer and gives you a link. In Claude Code, in your Small Business Toolkit folder, just say:</p>" + C.say("Open my money view") +
        "<p class=\"gate__note\">Not set up yet? Say <strong>/setup</strong> instead.</p>",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-connect") {
      return showGate(gateCard("One-time setup", "Connect your money view.",
        "<p>Choose your <strong>Money View OS</strong> folder, the one with START-HERE.md in it, then click <strong>Allow</strong> when Chrome asks. Nothing leaves your computer.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your folder</button>"));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my money view</button>"));
    }
    const f = friendlyError(statusDetail.error);
    showGate(gateCard("Something needs a look", f.title, "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
  }

  // ============================================================
  // 3. The app: pages, top bar and rail
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }
  function viewId() { return V[state.view] ? state.view : DEFAULT_VIEW; }
  function typingInView() {
    const a = document.activeElement;
    return !!a && ($("#view").contains(a) || $("#drawer").contains(a)) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search|number|date/.test(a.type)));
  }

  function makeCtx() {
    const scenarioIds = data ? data.scenarios.filter(function (s) { return s.on; }).map(function (s) { return s.id; }) : [];
    return {
      data: data,
      today: ui.isoDate(),
      update: update,
      openInvoice: openInvoice,
      closeInvoice: closeInvoice,
      newInvoice: newInvoice,
      runJob: runJob,
      go: go,
      redraw: redrawPage,
      toast: function (message, undoFn) { ui.toast(message, undoFn ? { actionLabel: "Undo", onAction: undoFn, duration: 7000 } : {}); },
      maybes: state.maybes,
      setMaybes: function (on) { state.maybes = !!on; redrawPage(); },
      scenarioIds: scenarioIds,
      forecastOpts: function () { return { scenarioIds: scenarioIds, maybes: state.maybes }; },
      busy: function (name) { return waiting.some(function (w) { return w.name === name; }); },
      ui: ui, model: M
    };
  }
  // The only way a page changes the data. The change is saved, and if there's a wording it goes in the activity list.
  function update(mutator, activityText, ref) {
    return store.update(function (d) {
      M.normalise(d);
      mutator(d);
      if (activityText) M.logActivity(d, activityText, ref || null);
    }).catch(function (err) {
      ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 });
      render();
      err.shownToPerson = true;
      throw err;
    });
  }

  function render() {
    if (!inApp()) { renderChrome(); return renderGate(); }
    $("#gate").hidden = true;
    $("#shell").hidden = false;
    renderChrome();
    renderRail();
    renderView();
    syncDrawer();
    Settings.refresh();
  }

  // The "As at" line: when the balances were read and where from
  function asAtLine() {
    const c = M.cashToday(data);
    if (!c.accounts.length) return M.isSetUp(data) ? "No balances yet. Add your accounts in Settings, or press Refresh numbers." : "Let’s set up your money view";
    const kinds = {};
    c.accounts.forEach(function (a) { kinds[a.source || "you"] = true; });
    const keys = Object.keys(kinds), src = keys.length === 1 ? M.sourceLabel(keys[0], data).replace(/^F/, "f").replace(/^Y/, "y") : "from several places";
    return "As at " + (c.asAt ? M.dayLabel(c.asAt) : "an unknown date") + ", " + src;
  }

  function renderChrome() {
    const pill = $("#saveStatus");
    if (status === "ready") {
      const just = statusDetail.savedAt && Date.now() - statusDetail.savedAt < 3000;
      pill.hidden = false;
      pill.className = "save-status" + (just ? " is-saving" : "");
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">' + (just ? "Saved" : "All changes saved") + "</span>";
      if (just) setTimeout(function () { if (status === "ready") renderChrome(); }, 3100);
    } else if (status === "error" && data) {
      pill.hidden = false;
      pill.className = "save-status is-error";
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">Not saved</span>';
    } else pill.hidden = true;

    const banner = $("#banner");
    if (status === "error" && data) {
      const f = friendlyError(statusDetail.error);
      banner.innerHTML = '<div class="banner banner--error">' + icon("alert") + "<span><strong>" + esc(f.title) + "</strong> " + esc(f.body) + "</span>" +
        '<button type="button" class="btn btn--sm" data-action="retry">Try again</button></div>';
    } else banner.innerHTML = "";

    if (!data) return;
    const s = data.settings;
    $("#businessName").textContent = s.businessName || (s.ownerName ? s.ownerName + "'s workspace" : "Your workspace");
    const late = M.owed(data, ui.isoDate()).overdueCount;
    document.querySelectorAll(".nav [data-count]").forEach(function (el) { el.textContent = late || ""; });
  }

  // The rail: the views to flick between, then Refresh numbers, New invoice and the Settings gear
  function railHtml() {
    const setUp = M.isSetUp(data), late = M.owed(data, ui.isoDate()).overdueCount, refreshing = waiting.some(function (w) { return w.name === "refresh-money"; });
    return '<div class="rail__left"><div class="rail__tabs"><div class="segmented" role="group" aria-label="Views">' +
        TABS.map(function (t) {
          const n = t.id === "invoices" ? late : 0;
          return '<button type="button" data-rail="' + t.id + '" aria-pressed="' + (viewId() === t.id) + '">' + esc(t.label) +
            (n ? ' <span class="badge badge--accent" title="' + n + (n === 1 ? " invoice is" : " invoices are") + ' overdue">' + n + "</span>" : "") + "</button>";
        }).join("") + "</div></div></div>" +
      '<div class="rail__right">' +
        (setUp ? '<button type="button" class="btn rail__refresh' + (refreshing ? " is-busy" : "") + '" data-action="refresh"' + (refreshing ? " disabled" : "") + ">" + icon("refresh") + "Refresh numbers</button>" +
          '<button type="button" class="btn btn--primary" data-action="new-invoice">' + icon("plus") + "New invoice</button>" : "") +
        '<button type="button" class="icon-btn" data-action="settings" aria-label="Settings" title="Settings">' + icon("settings") + "</button></div>";
  }
  // Drawn again after every change; whichever rail button had focus keeps it
  function renderRail() {
    const rail = $("#rail");
    const at = Array.prototype.indexOf.call(rail.querySelectorAll(FOCUSABLE), document.activeElement);
    rail.innerHTML = railHtml();
    const again = rail.querySelectorAll(FOCUSABLE);
    if (at > -1 && again[at]) again[at].focus({ preventScroll: true });
  }
  function redrawPage() {
    if (!inApp()) return;
    renderChrome();
    renderRail();
    renderView();
  }

  // The page element a view draws into. A different page gets a brand new element, so nothing the last page
  // attached to it can run on the new one. Even for the same page, the handlers a view sets with root.onclick
  // and friends are cleared before it draws again.
  function viewRoot(same) {
    let root = $("#view");
    if (!same) {
      const fresh = root.cloneNode(false);
      root.replaceWith(fresh);
      root = fresh;
    }
    ["onclick", "onchange", "oninput", "onsubmit", "onkeydown"].forEach(function (name) { root[name] = null; });
    return root;
  }

  // Draws the page. When it's the same page again, the scroll position and the focused control are kept.
  function renderView() {
    const id = viewId(), view = V[id], ctx = makeCtx();
    const same = state.rendered === id;
    const old = $("#view");
    const scroll = old.scrollTop;
    const all = Array.prototype.slice.call(old.querySelectorAll(FOCUSABLE));
    const focusAt = same ? all.indexOf(document.activeElement) : -1;
    const root = viewRoot(same);
    root.setAttribute("data-view", id);
    if (M.isSetUp(data)) {
      if (view && view.render) view.render(root, ctx);
      else root.innerHTML = '<div class="page">' + C.emptyState("This page isn't ready yet", "") + "</div>";
    } else root.innerHTML = '<div class="page">' + C.setupCard() + "</div>";
    root.insertAdjacentHTML("beforeend", '<p class="disclaimer">' + esc(M.DISCLAIMER) + "</p>");
    if (same) {
      root.scrollTop = scroll;
      const again = root.querySelectorAll(FOCUSABLE);
      if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
    }
    state.rendered = id;
    $("#viewTitle").textContent = TITLES[id];
    $("#viewSub").textContent = asAtLine();
    document.title = TITLES[id] + " · Money View OS";
  }

  function hashFor() { return "#" + (state.invoiceId ? "invoice/" + state.invoiceId : state.view); }
  // Moving to a page adds an entry to the browser's history, so Back returns to the page before.
  // replace: true is for when the address is already the person's own move (Back, Forward, a typed address).
  function go(view, replace) {
    state.view = V[view] ? view : DEFAULT_VIEW;
    if (state.openedId === "new") closeDrawerNow();
    state.invoiceId = null; state.pushed = false;
    if (location.hash !== "#" + state.view) history[replace ? "replaceState" : "pushState"](null, "", "#" + state.view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderRail(); renderView(); syncDrawer(); $("#view").scrollTop = 0; }
  }
  function parseHash() { const p = location.hash.slice(1).split("/"); return { view: p[0], arg: p.slice(1).join("/") }; }
  function applyHash() {
    const h = parseHash();
    if (h.view === "invoice" && h.arg) { state.invoiceId = h.arg; if (!V[state.view]) state.view = "invoices"; return; }
    state.invoiceId = null;
    state.view = V[h.view] ? h.view : DEFAULT_VIEW;
  }
  window.addEventListener("hashchange", function () {
    applyHash();
    if (inApp()) { renderChrome(); renderRail(); renderView(); syncDrawer(); }
  });

  // ---------- The invoice drawer (Builder C's drawer.js) ----------
  function closeDrawerNow() { const d = drawer(); if (state.openedId && d && d.close) d.close(); state.openedId = null; }
  // Makes the drawer match the address: open on the invoice named in it, shut when it names none
  function syncDrawer() {
    const d = drawer();
    if (!state.invoiceId) {
      if (state.openedId === "new") { if (d && d.refresh) d.refresh(makeCtx()); return; }
      if (state.openedId) closeDrawerNow();
      return;
    }
    if (!inApp()) return;
    if (!data.invoices.some(function (i) { return i.id === state.invoiceId; })) {
      ui.toast("That invoice isn't in your list any more", { icon: "info" });
      state.invoiceId = null; state.openedId = null;
      history.replaceState(null, "", "#" + state.view);
      return;
    }
    if (!d || !d.open) { ui.toast("The invoice editor isn't available", { icon: "alert" }); return; }
    if (state.openedId === state.invoiceId) { if (d.refresh) d.refresh(makeCtx()); return; }
    state.openedId = state.invoiceId;
    d.open(makeCtx(), state.invoiceId, state.section);
    state.section = undefined;
  }
  function openInvoice(id, section) {
    state.invoiceId = id; state.section = section; state.pushed = true;
    history.pushState(null, "", "#invoice/" + id);
    document.body.classList.remove("sidebar-open");
    state.openedId = null;
    syncDrawer();
  }
  function closeInvoice() {
    if (!state.invoiceId && !state.openedId) return;
    const d = drawer();
    if (d && d.close && state.openedId) d.close();
    state.openedId = null; state.invoiceId = null;
    if (state.pushed && location.hash.indexOf("#invoice/") === 0) { state.pushed = false; history.back(); }
    else history.replaceState(null, "", "#" + state.view);
  }
  // New invoice: the drawer starts a blank draft with the next number and only writes it once the first change is saved
  function newInvoice() {
    const d = drawer();
    if (!d || !d.open) { ui.toast("The invoice editor isn't available", { icon: "alert" }); return Promise.resolve(null); }
    state.invoiceId = null; state.section = undefined; state.openedId = "new";
    document.body.classList.remove("sidebar-open");
    d.open(makeCtx(), null);
    return Promise.resolve(null);
  }

  // ============================================================
  // 4. Asking Claude (refresh, drafts, reminders, what ifs)
  // ============================================================

  // say: what to tell Claude in the folder if the app can't start it. doing is the words in the pill.
  const JOBS = {
    "refresh-money": { doing: "Claude is refreshing your money view", done: "Your numbers are up to date", say: "update my money view" },
    "put-invoices-in-accounts": { doing: "Claude is putting your invoices in as drafts", done: "Your invoices are in as drafts. Check and send them from your accounts app", say: "put my invoices in my accounts app" },
    "chase-invoices": { doing: "Claude is drafting your reminders", done: "Your reminders are drafted. Nothing has been sent", say: "who owes me money" },
    "can-i-afford-this": { doing: "Claude is working out your what if", done: "Your what if is ready", say: "can I afford this" }
  };
  const POLL_MS = 2500, GIVE_UP_AFTER_POLLS = 480;   // 20 minutes
  const waiting = [];   // { name, resolve, polls }
  let timer = null;

  function offMessage(name) { return "Claude isn't switched on for the app. Open the folder in Claude and say: " + JOBS[name].say + "."; }
  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }

  // Resolves true when Claude finished the job, false if it couldn't be started or didn't finish
  function runJob(name) {
    if (!JOBS[name]) return Promise.reject(new Error("Unknown job: " + name));
    return fetch("/api/claude/run/money/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function (r) {
      if (r.status === 202) return watch(name);
      ui.toast(r.status === 503 ? offMessage(name) : "Claude couldn't be started from here. Open the folder in Claude and say: " + JOBS[name].say + ".", { icon: "info", duration: 9000 });
      return false;
    }, function () {
      ui.toast("This page can't reach Claude right now. Open the folder in Claude and say: " + JOBS[name].say + ".", { icon: "info", duration: 9000 });
      return false;
    });
  }
  function watch(name) {
    return new Promise(function (resolve) {
      waiting.push({ name: name, resolve: resolve, polls: 0 });
      setClaudeStatus(JOBS[name].doing);
      if (inApp()) renderRail();
      if (!timer) timer = setInterval(poll, POLL_MS);
    });
  }
  function finish(item, ok, message, iconName) {
    waiting.splice(waiting.indexOf(item), 1);
    ui.toast(message, { icon: iconName, duration: ok ? 5000 : 9000 });
    if (inApp()) renderRail();
    item.resolve(ok);
  }
  function poll() {
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if (st.running || st.queued) {
        const known = waiting.find(function (w) { return st.job === "money:" + w.name; }) || waiting[0];
        if (known) setClaudeStatus(JOBS[known.name].doing);
        return;
      }
      waiting.slice().forEach(function (w) {
        w.polls += 1;
        if (st.lastJob === "money:" + w.name) {
          if (st.lastResult === "ok") finish(w, true, JOBS[w.name].done, "sparkle");
          else finish(w, false, "Claude couldn't finish. Nothing is lost. Open the folder in Claude and say: " + JOBS[w.name].say + ".", "alert");
        } else if (w.polls > GIVE_UP_AFTER_POLLS) finish(w, false, "Claude didn't answer. Open the folder in Claude and say: " + JOBS[w.name].say + ".", "alert");
      });
      if (!waiting.length) { clearInterval(timer); timer = null; setClaudeStatus(""); }
    }).catch(function () { /* the helper is briefly unavailable; keep watching */ });
  }

  // ============================================================
  // 5. Buttons, links and keys
  // ============================================================

  document.addEventListener("click", function (e) {
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      ui.copyText(copy.getAttribute("data-copy")).then(function (ok) { ui.toast(ok ? "Copied. Paste it to Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" }); });
      return;
    }
    const goTo = e.target.closest("[data-go]");
    if (goTo) { closeInvoice(); go(goTo.getAttribute("data-go")); return; }
    const inv = e.target.closest("[data-open-invoice]");
    if (inv) { openInvoice(inv.getAttribute("data-open-invoice"), inv.getAttribute("data-section") || undefined); return; }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.getAttribute("data-action")) {
      case "connect": store.connect().catch(function (err) { ui.toast(err && err.kind === "wrong-folder" ? "That folder doesn't have a money file in it. Choose the Small Business Toolkit folder." : "Couldn't connect that folder. Please try again.", { icon: "alert", duration: 6000 }); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      case "settings": Settings.open(); break;
      case "refresh": runJob("refresh-money"); break;
      case "new-invoice": newInvoice().catch(function (err) { C.reportFailure(makeCtx(), err); }); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
    }
  });
  // The "Include maybes" switch, wherever it sits
  document.addEventListener("change", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-maybes")) { state.maybes = e.target.checked; redrawPage(); }
  });
  // The rail: a view to flick to
  $("#rail").addEventListener("click", function (e) {
    const tab = e.target.closest("[data-rail]");
    if (tab) { closeInvoice(); go(tab.getAttribute("data-rail")); }
  });
  // Moving to the page from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item");
    if (!link) return;
    e.preventDefault();
    closeInvoice();
    go(link.getAttribute("href").slice(1));
  });
  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  });
  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    if (e.key === "Escape") { document.body.classList.remove("sidebar-open"); return; }
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    const d = drawer();
    if (typing || e.metaKey || e.ctrlKey || e.altKey || (d && d.isOpen && d.isOpen()) || document.querySelector("dialog[open]")) return;
    if (/^[1-5]$/.test(e.key)) go(VIEW_ORDER[Number(e.key) - 1]);
  });

  // ============================================================
  // 6. Brain dump (shared, ../shared/js/braindump.js)
  // ============================================================
  // The button, V and the sorting are shared by every tool. This tool adds "An invoice…" and "A what if…" to "What's it about?".
  window.TaskListOS.brainDump.register("money", {
    pickers: function () {
      if (!data) return [];
      const invoices = data.invoices.filter(function (i) { return i.status !== "void" && i.status !== "linked"; }).map(function (i) { return { id: i.id, label: (i.number ? i.number + ": " : "") + (i.customer || "No customer yet") }; });
      const scenarios = data.scenarios.map(function (s) { return { id: s.id, label: s.name || "A what if" }; });
      return [{ type: "invoice", label: "An invoice…", items: invoices }, { type: "scenario", label: "A what if…", items: scenarios }];
    },
    preset: function () {
      if (!data || !state.invoiceId) return null;
      const i = data.invoices.filter(function (x) { return x.id === state.invoiceId; })[0];
      return i ? { type: "invoice", id: i.id, label: (i.number ? i.number + ": " : "") + (i.customer || "No customer yet") } : null;
    }
  });

  // ============================================================
  // Start
  // ============================================================

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });
  Settings.init(makeCtx);
  if (drawer() && drawer().init) drawer().init(makeCtx);
  // The drawer closes itself (its own buttons, Escape, the dimmed area): put the address back to match
  new MutationObserver(function () {
    if (document.body.classList.contains("has-drawer") || !state.openedId) return;
    state.openedId = null;
    if (state.invoiceId) {
      state.invoiceId = null;
      if (state.pushed && location.hash.indexOf("#invoice/") === 0) { state.pushed = false; history.back(); }
      else history.replaceState(null, "", "#" + state.view);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  applyHash();
  if (location.hash !== hashFor()) history.replaceState(null, "", hashFor());

  renderGate();
  store.start().then(function () {
    if (!store.isHelper()) return;
    // If Claude is already working on one of this tool's jobs (the page was reloaded), show the pill again
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      const name = /^money:(.+)$/.exec(st.job || "");
      if ((st.running || st.queued) && name && JOBS[name[1]]) watch(name[1]);
    }).catch(function () { /* the helper is briefly unavailable; nothing to show */ });
  });
})();
