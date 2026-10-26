/*
  ADS OS: the app
  ---------------
  Ties everything together:
  1. Connects to data/ads.json through the shared store.
  2. Shows a short card until the app is running, then the app.
  3. Draws the one page: the rail (the views to flick between, Health check, the date range and the platform
     switch, Refresh figures, New campaign and the Settings gear) and the view under it. The views are Overview,
     Campaigns, New campaigns, This week, To do and Health check, and each has its own address (#overview,
     #campaigns and so on); each move is a history entry, so Back and Forward work. A view is
     AD.views.<id> with title, line and render(root, ctx).
  4. Gives every view the same ctx: the data, update(), openDrawer(), runJob(), go(), redraw(), toast(),
     today(), the rail's choices (range, an object from AD.model.rangeFor, and platform) and the things
     that ask Claude for something: analyse(), runCampaign(), confirmChange(), addGoogleTask() and doTodo().
  5. Asks Claude to do its 9 jobs (set out in its jobs file) and shows the shared "Claude is working" pill.
  6. Two pop-ups: the one that confirms a change to an ad account, and the Run campaign questions.

  The rule throughout: Claude reads the figures and drafts campaigns. Nothing changes in an ad account until
  the owner presses the button and says yes in the pop-up that states that exact change. This page never
  changes an account itself: it records what was approved, and Claude does that one change.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model, C = window.AD.components, V = (window.AD.views = window.AD.views || {}), Settings = window.AD.settings;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // The campaign editor and the picture helper are separate files; if one didn't load, the page still opens
  function drawer(name, args) {
    const d = window.AD.drawer;
    return d && typeof d[name] === "function" ? d[name].apply(d, args || []) : undefined;
  }

  // The views, in the order of the rail (the number keys 1 to 6 follow it). Health check has its own button.
  const TABS = [{ id: "overview", label: "Overview" }, { id: "campaigns", label: "Campaigns" }, { id: "builds", label: "New campaigns" }, { id: "week", label: "This week" }, { id: "todo", label: "To do" }];
  const VIEW_ORDER = TABS.map(function (t) { return t.id; }).concat("health");
  const TITLES = { overview: "Overview", campaigns: "Campaigns", builds: "New campaigns", week: "This week", todo: "To do", health: "Health check" };
  const DEFAULT_VIEW = "overview";
  const WITH_RANGE = ["overview", "campaigns"];   // the pages the date range and platform apply to
  const PLATFORM_CHOICES = [{ key: "all", label: "All" }].concat(M.PLATFORMS.map(function (p) { return { key: p.key, label: p.short }; }));
  const MAX_DAILY = 100000;   // a typed budget above this is a slip of the finger, not a budget
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';
  const STORE_RANGE = "ads-os-range", STORE_PLATFORM = "ads-os-platform";

  // The range and platform chosen on the rail are remembered in this browser. If it won't remember, the choice still works.
  function remembered(key, allowed, fallback) {
    try {
      const v = localStorage.getItem(key);
      return allowed.indexOf(v) > -1 ? v : fallback;
    } catch (e) { return fallback; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  const state = {
    view: DEFAULT_VIEW, rendered: null, busy: {},
    range: remembered(STORE_RANGE, M.RANGES.map(function (r) { return r.key; }), "4weeks"),
    platform: remembered(STORE_PLATFORM, PLATFORM_CHOICES.map(function (p) { return p.key; }), "all")
  };
  let data = null;
  let status = "checking";
  let statusDetail = {};

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "ads",
    fileName: "ads.json",
    dataPaths: ["data", "", "apps/ads/data"],
    api: "/api/data/ads/ads.json",
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
      if (reason === "load") drawer("close");
      // Claude wrote something while the person is typing in a box: leave the page alone until they finish
      if (reason === "external" && typingInView()) { renderChrome(); return; }
      render();
    }
  });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your ads file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in a backup file next to it.", say: "Please check my ads file and fix it", short: "Your ads file needs a quick fix" };
    if (kind === "missing") return { title: "Your ads file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My ads file seems to be missing, please check it", short: "Your ads file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your ads screen has stopped running.", body: "Everything is saved. In Claude, say “open my ads” and it starts again. This page reconnects by itself.", say: "Open my ads", short: "Your ads screen has stopped running" };
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
    return '<div class="gate__card"><div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Ads OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + esc(title) + "</h1>" + body +
      (actions ? '<div class="gate__actions">' + actions + "</div>" : "") + '</div><div class="gate__art"><img src="' + C.ART.welcome + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate() {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your ads"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("", "Your ads open from Claude.",
        "<p>Claude runs it on this computer and gives you a link. In Claude Code, in your Small Business Toolkit OS folder, just say:</p>" + C.say("Open my ads") +
        "<p class=\"gate__note\">Not set up yet? Say <strong>/setup</strong> instead.</p>",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-connect") {
      return showGate(gateCard("One-time setup", "Connect your ads.",
        "<p>Choose your <strong>Ads OS</strong> folder, the one with START-HERE.md in it, then click <strong>Allow</strong> when Chrome asks. Nothing leaves your computer.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your folder</button>"));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my ads</button>"));
    }
    const f = friendlyError(statusDetail.error);
    showGate(gateCard("Something needs a look", f.title, "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
  }

  // ============================================================
  // 3. The app: pages, top bar and sidebar
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }
  function isView(id) { return VIEW_ORDER.indexOf(id) > -1; }
  function viewId() { return isView(state.view) ? state.view : DEFAULT_VIEW; }
  // A page whose file didn't load says so instead of leaving the screen blank
  function viewFor(id) {
    return V[id] || {
      title: TITLES[id], line: function () { return ""; },
      render: function (root) { root.innerHTML = '<div class="page">' + C.emptyState("This page didn’t load", "Reload the page. If it still doesn’t show, ask Claude to check the Ads OS files.") + "</div>"; }
    };
  }
  function typingInView() {
    const a = document.activeElement;
    return !!a && $("#view").contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search|number/.test(a.type)));
  }

  function today() { return ui.isoDate(); }
  function makeCtx() {
    return {
      data: data,
      update: update,
      openDrawer: function (kind, id) { drawer("open", [kind, id, makeCtx()]); },
      runJob: runJob,
      sendToTaskList: sendToTaskList,
      analyse: analyseCampaign,
      runCampaign: openRunCampaign,
      confirmChange: openConfirm,
      addGoogleTask: addGoogleTask,
      doTodo: doTodo,
      go: go,
      redraw: redrawPage,
      toast: function (message, undoFn) { ui.toast(message, undoFn ? { actionLabel: "Undo", onAction: undoFn, duration: 7000 } : {}); },
      ui: ui, model: M,
      range: data ? M.rangeFor(state.range, today(), M.weekStartsOf(data)) : null,
      platform: state.platform,
      today: today
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
    drawer("refresh");
    Settings.refresh();
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
    const onList = todoCount();   // the same count as the To do tab
    document.querySelectorAll(".nav [data-count]").forEach(function (el) { el.textContent = onList || ""; });
  }
  // How many things are on the To do tab, from the model's own list (the same count wherever it is shown)
  function todoCount() {
    if (!data) return 0;
    const t = M.todoList(data, today());
    return t.claude.length + t.you.length;
  }

  // The rail: the views to flick between, Health check, then the range, platform, Refresh figures, New campaign and the Settings gear
  function tabButton(tab, n) {
    return '<button type="button" data-rail="' + tab.id + '" aria-pressed="' + (viewId() === tab.id) + '">' + esc(tab.label) +
      (n ? ' <span class="badge badge--accent">' + n + "</span>" : "") + "</button>";
  }
  function healthButton() {
    const overall = M.healthOverall(M.health(data, today()));
    return '<button type="button" class="btn rail__health" data-rail="health" aria-pressed="' + (viewId() === "health") + '">' + icon("barChart") + "Health check" +
      '<span class="hdot hdot--' + overall + '" title="' + esc(M.HEALTH_LABELS[overall]) + '"></span></button>';
  }
  // The date range: joined buttons on a wide screen and a drop-down on a phone (CSS shows one of them)
  function choice(label, attr, list, current) {
    return '<div class="rail__choice"><div class="segmented rail__seg" role="group" aria-label="' + esc(label) + '">' +
      list.map(function (o) { return '<button type="button" data-' + attr + '="' + o.key + '" aria-pressed="' + (o.key === current) + '">' + esc(o.label) + "</button>"; }).join("") + "</div>" +
      '<select class="select rail__sel" data-' + attr + '-select aria-label="' + esc(label) + '">' +
      list.map(function (o) { return '<option value="' + o.key + '"' + (o.key === current ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") + "</select></div>";
  }
  function busyButton(action, name, iconName, label, primary) {
    const busy = !!state.busy[name];
    return '<button type="button" class="btn' + (primary ? " btn--primary" : "") + '" data-action="' + action + '"' + (busy ? " disabled" : "") + ">" + icon(busy ? "loader" : iconName, busy ? "spin" : "") + "<span>" + esc(label) + "</span></button>";
  }
  function railHtml() {
    const setUp = M.isSetUp(data), builds = M.todo(data, today()).builds, id = viewId();
    const ranges = setUp && WITH_RANGE.indexOf(id) > -1 ? choice("Date range", "range", M.RANGES, state.range) + C.platformSwitch(state.platform) : "";
    const todo = setUp ? todoCount() : 0;
    return '<div class="rail__left"><div class="rail__tabs"><div class="segmented" role="group" aria-label="Views">' +
        TABS.map(function (t) { return tabButton(t, t.id === "builds" ? builds : t.id === "todo" ? todo : 0); }).join("") + "</div></div>" + (setUp ? healthButton() : "") + "</div>" +
      '<div class="rail__right">' + ranges +
        (setUp ? busyButton("refresh-figures", "update-my-ads", "refresh", "Refresh figures", false) + busyButton("new-campaign", "build-a-campaign", "plus", "New campaign", true) : "") +
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
    renderRail();
    renderView();
    drawer("refresh");
  }

  // The page element a view draws into. A different page gets a brand new element, so nothing the
  // last page attached to it can run on the new one. Even for the same page, the handlers a view sets
  // with root.onclick and friends are cleared before it draws again.
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
    const id = viewId(), view = viewFor(id), ctx = makeCtx();
    const same = state.rendered === id;
    const old = $("#view");
    const scroll = old.scrollTop;
    const all = Array.prototype.slice.call(old.querySelectorAll(FOCUSABLE));
    const focusAt = same ? all.indexOf(document.activeElement) : -1;
    const root = viewRoot(same);
    root.setAttribute("data-view", id);
    if (M.isSetUp(data)) view.render(root, ctx);
    else root.innerHTML = '<div class="page">' + C.setupCard() + "</div>";
    if (same) {
      root.scrollTop = scroll;
      const again = root.querySelectorAll(FOCUSABLE);
      if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
    }
    state.rendered = id;
    $("#viewTitle").textContent = view.title || TITLES[id];
    $("#viewSub").textContent = M.isSetUp(data) ? view.line(ctx) : "Let’s set up your ads";
    document.title = (view.title || TITLES[id]) + " · Ads OS";
  }

  // Moving to a page adds an entry to the browser's history, so Back returns to the page before.
  // replace: true is for when the address is already the person's own move (Back, Forward, a typed address).
  function go(view, replace) {
    state.view = isView(view) ? view : DEFAULT_VIEW;
    if (location.hash !== "#" + state.view) history[replace ? "replaceState" : "pushState"](null, "", "#" + state.view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderRail(); renderView(); $("#view").scrollTop = 0; }
  }
  function viewFromHash() { return location.hash.slice(1).split("/")[0]; }
  window.addEventListener("hashchange", function () { const v = viewFromHash(); if (v !== state.view) go(v, true); });

  // The charts are drawn for the width they are given; draw them again when the screen changes size enough to matter
  let widthBucket = Math.floor(window.innerWidth / 160), resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const bucket = Math.floor(window.innerWidth / 160);
      if (bucket !== widthBucket) { widthBucket = bucket; if (inApp() && (viewId() === "overview" || viewId() === "health")) renderView(); }
    }, 200);
  });

  function setRange(key) {
    if (!M.RANGES.some(function (r) { return r.key === key; }) || key === state.range) return;
    state.range = key;
    remember(STORE_RANGE, key);
    redrawPage();
  }
  function setPlatform(key) {
    if (!PLATFORM_CHOICES.some(function (p) { return p.key === key; }) || key === state.platform) return;
    state.platform = key;
    remember(STORE_PLATFORM, key);
    redrawPage();
  }

  // ============================================================
  // 4. Asking Claude (9 jobs)
  // ============================================================

  // say: what to tell Claude in the folder if the app can't start it
  const JOBS = {
    "update-my-ads": { doing: "Claude is refreshing your ad figures", done: "Claude has refreshed your figures", say: "update my ads" },
    "build-a-campaign": { doing: "Claude is drafting your new campaign", done: "Claude has drafted your campaign. It waits for you to approve it", say: "make me a campaign" },
    "write-campaign": { doing: "Claude is changing your campaign", done: "Claude has changed your campaign", say: "change my waiting campaigns" },
    "build-in-account": { doing: "Claude is building your approved campaigns, paused", done: "Claude has built your campaign. It is switched off until you press Switch it on and say yes", say: "build my approved campaigns" },
    "how-did-the-ads-do": { doing: "Claude is writing this week's summary", done: "Claude has written this week's summary", say: "how did the ads do" },
    "what-should-i-change": { doing: "Claude is looking for changes worth making", done: "Claude has added its suggestions", say: "what should I change" },
    "analyse-campaign": { doing: "Claude is analysing your campaign", done: "Claude has analysed your campaign. Read it in the campaign panel", say: "analyse my campaign" },
    "make-account-change": { doing: "Claude is making the change you approved", done: "Claude has finished. The result is shown on the campaign", say: "make the account change I approved" },
    "send-to-task-list": { doing: "Claude is adding it to your task list", done: "Claude has added it to your task list for you to review there", say: "add my ads to my task list" }
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
  function setBusy(name, on) {
    if (on) state.busy[name] = true; else delete state.busy[name];
    if (inApp()) renderRail();
  }

  // Resolves true when Claude finished the job, false if it couldn't be started or didn't finish
  function runJob(name) {
    if (!JOBS[name]) return Promise.reject(new Error("Unknown job: " + name));
    return fetch("/api/claude/run/ads/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function (r) {
      if (r.status === 202) return watch(name).then(function (ok) {
        if (ok && name === "build-in-account") sendToTaskList();
        return ok;
      });
      ui.toast(r.status === 503 ? offMessage(name) : "Claude couldn't be started from here. Open the folder in Claude and say: " + JOBS[name].say + ".", { icon: "info", duration: 9000 });
      return false;
    }, function () {
      ui.toast("This page can't reach Claude right now. Open the folder in Claude and say: " + JOBS[name].say + ".", { icon: "info", duration: 9000 });
      return false;
    });
  }
  // Task List OS is attached when apps/installed.json lists it. That file is read once, the first time it is needed.
  let taskListPromise = null;
  function taskListAttached() {
    if (!taskListPromise) {
      taskListPromise = !/^https?:$/.test(location.protocol) ? Promise.resolve(false) :
        fetch("../installed.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; }).then(function (inst) {
          return (inst.tools || []).some(function (t) { return t && t.id === "task-list"; });
        }, function () { return false; });
    }
    return taskListPromise;
  }
  // After an approved suggestion or a built campaign: asks Claude to put it in the task list, only when Task List OS is attached.
  // Without it nothing happens.
  function sendToTaskList() {
    return taskListAttached().then(function (attached) { return attached ? runJob("send-to-task-list") : false; });
  }
  function watch(name) {
    return new Promise(function (resolve) {
      waiting.push({ name: name, resolve: resolve, polls: 0 });
      setClaudeStatus(JOBS[name].doing);
      setBusy(name, true);
      if (!timer) timer = setInterval(poll, POLL_MS);
    });
  }
  function finish(item, ok, message, iconName) {
    waiting.splice(waiting.indexOf(item), 1);
    setBusy(item.name, false);
    ui.toast(message, { icon: iconName, duration: ok ? 5000 : 9000 });
    item.resolve(ok);
  }
  function poll() {
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if (st.running || st.queued) {
        const known = waiting.find(function (w) { return st.job === "ads:" + w.name; }) || waiting[0];
        if (known) setClaudeStatus(JOBS[known.name].doing);
        return;
      }
      waiting.slice().forEach(function (w) {
        w.polls += 1;
        if (st.lastJob === "ads:" + w.name) {
          if (st.lastResult === "ok") finish(w, true, JOBS[w.name].done, "sparkle");
          else finish(w, false, "Claude couldn't finish. Nothing is lost. Open the folder in Claude and say: " + JOBS[w.name].say + ".", "alert");
        } else if (w.polls > GIVE_UP_AFTER_POLLS) finish(w, false, "Claude didn't answer. Open the folder in Claude and say: " + JOBS[w.name].say + ".", "alert");
      });
      if (!waiting.length) { clearInterval(timer); timer = null; setClaudeStatus(""); }
    }).catch(function () { /* the helper is briefly unavailable; keep watching */ });
  }

  // ============================================================
  // 5. New campaign: the "What's it for?" box
  // ============================================================

  // The platforms ticked to begin with: the ones that are switched on, or both when none is yet
  function newCampaignForm() {
    const on = M.platformsOn(data), ticked = on.length ? on : [];
    return '<div class="modal__head"><h2 id="newTitle">New campaign</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><label class="field"><span class="field__label">What’s it for?</span>' +
      '<textarea class="textarea" data-new="note" rows="4" maxlength="600" placeholder="For example: more new patient check-ups before Christmas"></textarea>' +
      '<span class="field__hint">A few words is enough. Claude already knows your business and works out the rest.</span></label>' +
      '<fieldset class="newplat"><legend class="field__label">Where should it run?</legend><div class="newplat__opts">' +
      M.PLATFORMS.map(function (p) {
        return '<label class="newplat__opt"><input type="checkbox" data-new-platform="' + p.key + '"' + (ticked.indexOf(p.key) > -1 ? " checked" : "") + "> " + esc(p.label) + "</label>";
      }).join("") + "</div></fieldset>" +
      '<p class="prefs-hint">Claude drafts it and it stays a draft until you approve it. Nothing is built, switched on or spent until you say so.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><span class="spacer"></span><button type="button" class="btn btn--primary" data-new-go>' + icon("sparkle") + "Draft it</button></div>";
  }
  function openNewCampaign() {
    const dlg = $("#newDialog");
    dlg.innerHTML = newCampaignForm();
    dlg.showModal();
    const box = dlg.querySelector("[data-new=note]");
    if (box) box.focus();
  }
  // Saves a stub draft for each platform ticked (its request holds the note), then asks Claude to fill them in
  function startNewCampaign() {
    const dlg = $("#newDialog"), note = dlg.querySelector("[data-new=note]").value.trim();
    const keys = Array.prototype.map.call(dlg.querySelectorAll("[data-new-platform]:checked"), function (el) { return el.getAttribute("data-new-platform"); });
    if (note.length < 3) { ui.toast("Say a few words about what it's for", { icon: "info" }); return; }
    if (!keys.length) { ui.toast("Tick where it should run", { icon: "info" }); return; }
    dlg.close();
    update(function (d) {
      keys.forEach(function (key) {
        const b = M.newBuild(key);
        b.name = "New campaign";
        b.request = { kind: "write", note: note, at: M.nowIso() };
        d.builds.push(b);
      });
    }, "Asked Claude to draft a new campaign").then(function () {
      return runJob("build-a-campaign");
    }).then(function (ok) {
      if (ok) go("builds");
    }).catch(function (err) { C.reportFailure(makeCtx(), err); });
  }

  // ============================================================
  // 5b. Asking about one campaign, and changing an ad account with the owner's yes
  // ============================================================

  function campaignOf(id) { return data.campaigns.find(function (c) { return c.id === id; }); }
  function buildOf(id) { return data.builds.find(function (b) { return b.id === id; }); }
  function managerOf(key) { return M.platform(key) || { managerName: "your ad account", openUrl: "", label: key, short: key }; }
  function cap(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
  function reportFailure(err) { C.reportFailure(makeCtx(), err); }
  // An account change Claude hasn't finished: no second one is started on the same campaign
  function openAction(campaignId) {
    return (data.actions || []).find(function (a) { return a.campaignId === campaignId && (a.status === "requested" || a.status === "doing"); });
  }

  // ---------- Analyse campaign ----------
  // Saves the request on the campaign, then asks Claude. The newest analysis shows in the campaign panel.
  function analyseCampaign(campaignId, note) {
    const c = campaignOf(campaignId);
    if (!c) { ui.toast("That campaign is no longer in your list.", { icon: "info" }); return Promise.resolve(false); }
    if (c.request) { ui.toast("Claude has already been asked to look at this one.", { icon: "info" }); return Promise.resolve(false); }
    const name = c.name;
    return update(function (d) {
      const x = d.campaigns.find(function (y) { return y.id === campaignId; });
      if (!x) throw new Error("That campaign is no longer in your list.");
      x.request = { kind: "analyse", note: String(note || "").trim(), at: M.nowIso() };
    }, "Asked Claude to analyse “" + name + "”", campaignId).then(function () {
      return runJob("analyse-campaign");
    }).then(function (ok) { if (inApp()) redrawPage(); return ok; }).catch(reportFailure);
  }

  // ---------- The pop-up that confirms a change to an ad account ----------
  let pending = null;   // { spec, action }

  function makeAction(spec) { return M.newAction(spec.kind, spec); }
  function sentenceOf(action) { return M.actionSentence(data, action, today()); }
  function checksOf(action) { return M.actionChecks(data, action, today()); }
  function guardHtml(checks, blockedText) {
    if (blockedText) return '<div class="guard guard--quiet" role="group" aria-label="Limits check">' + icon("info") + '<div class="guard__text"><strong>Limits check</strong><span>' + esc(blockedText) + "</span></div></div>";
    if (checks.ok && !checks.warnings.length) return '<div class="guard guard--ok" role="group" aria-label="Limits check">' + icon("check") + '<div class="guard__text"><strong>Limits check</strong><span>Inside your limits.</span></div></div>';
    return '<div class="guard guard--' + (checks.ok ? "quiet" : "bad") + '" role="group" aria-label="Limits check">' + icon(checks.ok ? "info" : "alert") + '<div class="guard__text"><strong>Limits check</strong>' +
      checks.warnings.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + (checks.ok ? "" : "<span>Claude won’t make this change.</span>") + "</div></div>";
  }
  // The sentence, the limits check and the Yes button, drawn from what is in the pop-up now
  function confirmLive() {
    const dlg = $("#confirmDialog"), spec = pending.spec;
    let blocked = "", action = null;
    if (spec.kind === "budget") {
      const box = dlg.querySelector("[data-confirm-daily]"), v = box && box.value.trim() !== "" ? Number(box.value) : null;
      if (v === null || !isFinite(v) || v < 0 || v > MAX_DAILY) blocked = "Enter the new daily budget in pounds, for example 15.";
      else if (v === spec.budgetFrom) blocked = "That is the budget it already has.";
      else action = makeAction(Object.assign({}, spec, { budgetTo: v }));
    } else action = makeAction(spec);
    pending.action = action;
    const checks = action ? checksOf(action) : { ok: false, warnings: [] };
    dlg.querySelector("[data-confirm-live]").innerHTML = '<p class="confirm__sentence">' + (action ? esc(sentenceOf(action)) : "Change the daily budget.") + "</p>" + guardHtml(checks, blocked);
    dlg.querySelector("[data-confirm-yes]").disabled = !action || !checks.ok;
  }
  function confirmForm(spec) {
    const c = campaignOf(spec.campaignId), b = spec.buildId ? buildOf(spec.buildId) : null;
    const name = (c && c.name) || (b && b.name) || "this campaign";
    const heading = spec.kind === "budget" ? "Change the daily budget?" : spec.kind === "pause" ? "Pause this campaign?" : "Switch this campaign on?";
    const field = spec.kind === "budget" ? '<label class="field"><span class="field__label">New daily budget (' + esc(M.symbol(data)) + ')</span><input class="input input--sm" type="number" inputmode="decimal" min="0" step="0.01" data-confirm-daily value="' + esc(spec.budgetTo === null || spec.budgetTo === undefined ? "" : spec.budgetTo) + '" aria-label="New daily budget in pounds">' +
      '<span class="field__hint">' + (spec.budgetFrom === null || spec.budgetFrom === undefined ? "" : "It is " + esc(M.money(spec.budgetFrom)) + " a day now.") + "</span></label>" : "";
    return '<div class="modal__head"><h2 id="confirmTitle">' + esc(heading) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><p class="confirm__who muted">' + esc(name) + "</p>" + field + '<div data-confirm-live></div>' +
      '<p class="prefs-hint">Claude makes only this one change in your ' + esc(managerOf("meta").short) + " account, reads it back and tells you what it found. Nothing else is touched, and nothing is ever deleted.</p></div>" +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><span class="spacer"></span><button type="button" class="btn btn--primary" data-confirm-yes>' + icon("check") + "Yes, do it</button></div>";
  }
  // spec: { kind: "switch-on" | "pause" | "budget", campaignId, buildId, adId, budgetFrom, budgetTo }. Meta only.
  function openConfirm(spec) {
    spec = Object.assign({ campaignId: "", buildId: "", adId: "", budgetFrom: null, budgetTo: null }, spec || {});
    const c = campaignOf(spec.campaignId);
    if (c && c.platform !== "meta") { ui.toast("Google changes are made in Google Ads. Use Open Google Ads, or add it to your task list.", { icon: "info", duration: 7000 }); return; }
    if ((spec.campaignId && openAction(spec.campaignId)) || (spec.buildId && (data.actions || []).some(function (x) { return x.buildId === spec.buildId && (x.status === "requested" || x.status === "doing"); }))) { ui.toast("Claude is already making a change to this campaign. Wait for it to finish.", { icon: "info" }); return; }
    if (spec.kind === "budget" && (spec.budgetFrom === null || spec.budgetFrom === undefined) && c) spec.budgetFrom = c.dailyBudget;
    pending = { spec: spec, action: null };
    const dlg = $("#confirmDialog");
    dlg.innerHTML = confirmForm(spec);
    dlg.showModal();
    confirmLive();
    const first = dlg.querySelector("[data-confirm-daily]") || dlg.querySelector("[data-confirm-yes]");
    if (first) first.focus();
  }
  function confirmYes() {
    if (!pending) return;
    confirmLive();
    const action = pending.action, checks = action ? checksOf(action) : { ok: false };
    if (!action || !checks.ok) return;
    pending = null;
    $("#confirmDialog").close();
    const words = sentenceOf(action);
    update(function (d) {
      d.actions.push(action);
    }, "You approved this change and asked Claude to make it: " + words, action.campaignId || action.buildId || null).then(function () {
      if (inApp()) redrawPage();
      return runJob("make-account-change");
    }).then(function () { if (inApp()) redrawPage(); }).catch(reportFailure);
  }

  // ---------- Google changes: a task for the owner ----------
  // The owner approves it here, it becomes a suggested task, and Claude adds it to the task list when that is installed.
  // Claude never makes a Google change.
  function addGoogleTask(campaignId, change, budgetTo) {
    const c = campaignOf(campaignId);
    if (!c) { ui.toast("That campaign is no longer in your list.", { icon: "info" }); return Promise.resolve(false); }
    const kinds = { pause: "pause", "switch-on": "other", budget: "budget" };
    if (!kinds[change]) { ui.toast("Choose what to change first.", { icon: "info" }); return Promise.resolve(false); }
    if (change === "budget" && !(budgetTo !== null && isFinite(budgetTo) && budgetTo > 0 && budgetTo <= MAX_DAILY)) { ui.toast("Enter the new daily budget in pounds, for example 15.", { icon: "info" }); return Promise.resolve(false); }
    const title = change === "pause" ? "Pause “" + c.name + "” in Google Ads" : change === "switch-on" ? "Switch on “" + c.name + "” in Google Ads" : "Change the daily budget of “" + c.name + "” to " + M.money(budgetTo) + " in Google Ads";
    const why = "You asked for this in Ads OS. Google Ads is changed by you, so it is on your task list.";
    return update(function (d) {
      d.suggestions.unshift({ id: M.makeId("s"), kind: kinds[change], platform: "google", campaignId: campaignId, title: title, why: why, status: "approved", createdAt: M.nowIso(), decidedAt: M.nowIso(), taskId: null });
    }, "Added to your task list: " + title, campaignId).then(function () {
      ui.toast("Added. It is yours to make in Google Ads.");
      return sendToTaskList();
    }).then(function () { if (inApp()) redrawPage(); return true; }).catch(reportFailure);
  }

  // ---------- Run campaign: the questions ----------
  let runFor = null;   // the campaign id the questions are about

  function audienceText(a) {
    if (!a) return "";
    const parts = [];
    if (a.locations && a.locations.length) parts.push(a.locations.join(", "));
    if (a.ageMin !== null && a.ageMin !== undefined && a.ageMax !== null && a.ageMax !== undefined) parts.push("ages " + a.ageMin + " to " + a.ageMax);
    if (a.interests && a.interests.length) parts.push(a.interests.join(", "));
    if (a.keywords && a.keywords.length) parts.push("searches: " + a.keywords.join(", "));
    return parts.join(" · ");
  }
  // The build this campaign came from, or the newest build that names it
  function sourceBuild(c) {
    return data.builds.find(function (b) { return b.id === c.buildId; }) ||
      data.builds.filter(function (b) { return b.refs && b.refs.campaignId === c.id; }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0] || null;
  }
  function radio(name, value, label, checked, extra) {
    return '<label class="runq__opt"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + "> <span>" + esc(label) + (extra || "") + "</span></label>";
  }
  function runForm(c) {
    const src = sourceBuild(c), who = audienceText(src && src.audience);
    const hasBudget = c.dailyBudget !== null && c.dailyBudget !== undefined;
    return '<div class="modal__head"><h2 id="runTitle">Run this campaign again</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body runq"><p class="muted runq__who">' + esc(c.name) + " · " + esc(managerOf(c.platform).short) + "</p>" +
      '<fieldset class="runq__set"><legend class="field__label">1. Who should see it?</legend>' +
        radio("runWho", "same", "Same people as last time", true, who ? '<span class="runq__sub">' + esc(who) + "</span>" : '<span class="runq__sub">Claude copies them from the campaign.</span>') +
        radio("runWho", "change", "Change them", false) +
        '<textarea class="textarea" rows="2" data-run="audienceNote" placeholder="Who should see it this time?" aria-label="Who should see it" hidden></textarea></fieldset>' +
      '<fieldset class="runq__set"><legend class="field__label">2. Budget</legend>' +
        radio("runBudget", "same", hasBudget ? "Same (" + M.money(c.dailyBudget) + " a day)" : "Same as last time", true) + radio("runBudget", "change", "Change it", false) +
        '<span class="adpound runq__money" data-run-money hidden><span aria-hidden="true">' + esc(M.symbol(data)) + '</span><input class="input input--sm adpound__input" type="number" inputmode="decimal" min="0" step="0.01" data-run="daily" aria-label="Daily budget"> <span class="muted">a day</span></span>' +
        '<div data-run-guard></div></fieldset>' +
      '<fieldset class="runq__set"><legend class="field__label">3. Dates</legend><div class="runq__dates">' +
        '<label class="field"><span class="field__label">Starts</span><input class="input input--sm" type="date" data-run="start" value="' + esc(M.addDaysIso(today(), 1)) + '"></label>' +
        '<label class="field"><span class="field__label">Ends (optional)</span><input class="input input--sm" type="date" data-run="end"></label></div></fieldset>' +
      '<fieldset class="runq__set"><legend class="field__label">4. The ads</legend>' +
        radio("runWords", "keep", "Keep the best ones", true) + radio("runWords", "fresh", "Write fresh ones", false) + radio("runWords", "mix", "A mix", false) + "</fieldset>" +
      '<label class="field"><span class="field__label">5. Anything else for Claude?</span><textarea class="textarea" rows="2" data-run="note" maxlength="600" placeholder="For example: lead with the free check-up"></textarea></label>' +
      '<p class="prefs-hint">Claude writes it as a draft. Nothing is built or switched on until you approve it.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><span class="spacer"></span><button type="button" class="btn btn--primary" data-run-go>' + icon("sparkle") + "Draft it</button></div>";
  }
  function runValues(dlg) {
    const get = function (n) { return dlg.querySelector('[data-run="' + n + '"]'); };
    const pick = function (n) { const el = dlg.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ""; };
    const daily = get("daily").value.trim();
    return { who: pick("runWho"), audienceNote: get("audienceNote").value.trim(), budget: pick("runBudget"), daily: daily === "" ? null : Number(daily),
      start: get("start").value || null, end: get("end").value || null, words: pick("runWords"), note: get("note").value.trim() };
  }
  // A throwaway build the budget guard can look at while the owner types
  function runGuard() {
    const dlg = $("#runDialog"), c = campaignOf(runFor), box = dlg.querySelector("[data-run-guard]"), v = runValues(dlg);
    dlg.querySelector("[data-run-money]").hidden = v.budget !== "change";
    dlg.querySelector('[data-run="audienceNote"]').hidden = v.who !== "change";
    if (!c || v.budget !== "change" || v.daily === null || !isFinite(v.daily)) { box.innerHTML = ""; return; }
    const probe = M.newBuild(c.platform);
    probe.budget.daily = v.daily; probe.budget.start = M.validIso(v.start); probe.budget.end = M.validIso(v.end);
    const checks = M.buildChecks(data, probe, today());
    const warn = checks.warnings || [];
    box.innerHTML = warn.length ? '<div class="guard guard--bad" role="group" aria-label="Budget check">' + icon("alert") + '<div class="guard__text"><strong>Budget check</strong>' + warn.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + "</div></div>" :
      '<div class="guard guard--ok" role="group" aria-label="Budget check">' + icon("check") + '<div class="guard__text"><strong>Budget check</strong><span>Inside your limits.</span></div></div>';
  }
  function openRunCampaign(campaignId) {
    const c = campaignOf(campaignId);
    if (!c) { ui.toast("That campaign is no longer in your list.", { icon: "info" }); return; }
    runFor = campaignId;
    const dlg = $("#runDialog");
    dlg.innerHTML = runForm(c);
    dlg.showModal();
    dlg.querySelector('input[name="runWho"]').focus();
  }
  function startRun() {
    const dlg = $("#runDialog"), c = campaignOf(runFor);
    if (!c) { dlg.close(); return; }
    const v = runValues(dlg);
    if (v.who === "change" && v.audienceNote.length < 3) { ui.toast("Say who should see it this time", { icon: "info" }); return; }
    if (v.budget === "change" && !(v.daily !== null && isFinite(v.daily) && v.daily > 0 && v.daily <= MAX_DAILY)) { ui.toast("Enter the daily budget in pounds, for example 15", { icon: "info" }); return; }
    if (v.start && !M.validIso(v.start)) { ui.toast("Check the start date", { icon: "info" }); return; }
    if (v.end && !M.validIso(v.end)) { ui.toast("Check the end date", { icon: "info" }); return; }
    if (v.start && v.end && v.end < v.start) { ui.toast("The end date can’t be before the start date", { icon: "info" }); return; }
    const src = sourceBuild(c), id = M.makeId("b"), name = c.name;
    dlg.close();
    update(function (d) {
      const b = M.newBuild(c.platform);
      b.id = id;
      b.name = name + ", run again";
      b.objective = c.objective || "";
      b.fromCampaignId = c.id;
      b.brief = { audience: v.who, audienceNote: v.audienceNote, budget: v.budget, daily: v.budget === "change" ? v.daily : (c.dailyBudget === undefined ? null : c.dailyBudget), start: v.start, end: v.end, words: v.words, note: v.note };
      b.budget.daily = b.brief.daily;
      b.budget.start = M.validIso(v.start);
      b.budget.end = M.validIso(v.end);
      if (v.who === "same" && src && src.audience) b.audience = JSON.parse(JSON.stringify(src.audience));
      b.refs.campaignId = c.id;
      b.request = { kind: "write", note: v.note, at: M.nowIso() };
      d.builds.push(b);
    }, "Asked Claude to draft a run of “" + name + "” again", id).then(function () {
      drawer("close");
      go("builds");
      drawer("open", ["build", id, makeCtx()]);
      return runJob("write-campaign");
    }).then(function () { if (inApp()) redrawPage(); }).catch(reportFailure);
  }

  // ---------- The To do tab: a Do it or an Open button ----------
  // item is from AD.model.todoList: { key, label, why, ref, job | action | open }
  function doTodo(item) {
    if (!item) return Promise.resolve(false);
    if (item.action) {
      const spec = Object.assign({}, item.action);
      openConfirm(spec);
      return Promise.resolve(true);
    }
    if (item.job) {
      if (item.job === "analyse-campaign" && item.ref) return analyseCampaign(item.ref, "");
      return runJob(item.job).then(function (ok) { if (inApp()) redrawPage(); return ok; });
    }
    return Promise.resolve(false);
  }

  // ============================================================
  // 6. Buttons, links and keys
  // ============================================================

  document.addEventListener("click", function (e) {
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      ui.copyText(copy.getAttribute("data-copy")).then(function (ok) { ui.toast(ok ? "Copied. Paste it to Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" }); });
      return;
    }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.getAttribute("data-action")) {
      case "connect": store.connect().catch(function (err) { ui.toast(err && err.kind === "wrong-folder" ? "That folder doesn't have an ads file in it. Choose the Small Business Toolkit OS folder." : "Couldn't connect that folder. Please try again.", { icon: "alert", duration: 6000 }); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      case "settings": Settings.open(); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      case "refresh-figures": runJob("update-my-ads").then(function () { if (inApp()) redrawPage(); }); break;
      case "new-campaign": openNewCampaign(); break;
    }
  });
  // The rail: a view to flick to, or the date range and platform switch
  $("#rail").addEventListener("click", function (e) {
    const tab = e.target.closest("[data-rail]");
    if (tab) { drawer("close"); go(tab.getAttribute("data-rail")); return; }
    const range = e.target.closest("[data-range]");
    if (range) { setRange(range.getAttribute("data-range")); return; }
    const plat = e.target.closest("[data-platform]");
    if (plat) setPlatform(plat.getAttribute("data-platform"));
  });
  $("#rail").addEventListener("change", function (e) {
    if (e.target.hasAttribute("data-range-select")) setRange(e.target.value);
  });
  // Moving to the page from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item");
    if (!link) return;
    e.preventDefault();
    drawer("close");
    go(link.getAttribute("href").slice(1));
  });
  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  });
  $("#newDialog").addEventListener("click", function (e) { if (e.target.closest("[data-new-go]")) startNewCampaign(); });
  $("#confirmDialog").addEventListener("click", function (e) { if (e.target.closest("[data-confirm-yes]")) confirmYes(); });
  $("#confirmDialog").addEventListener("input", function (e) { if (e.target.hasAttribute("data-confirm-daily")) confirmLive(); });
  $("#confirmDialog").addEventListener("close", function () { pending = null; });
  $("#runDialog").addEventListener("click", function (e) { if (e.target.closest("[data-run-go]")) startRun(); });
  $("#runDialog").addEventListener("input", runGuard);
  $("#runDialog").addEventListener("change", runGuard);
  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    if (e.key === "Escape") { document.body.classList.remove("sidebar-open"); return; }
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (typing || e.metaKey || e.ctrlKey || e.altKey || drawer("isOpen") || document.querySelector("dialog[open]")) return;
    if (/^[1-6]$/.test(e.key)) go(VIEW_ORDER[Number(e.key) - 1]);
  });

  // ============================================================
  // 7. Brain dump (shared, ../shared/js/braindump.js)
  // ============================================================
  // The button, V and the sorting are shared by every tool. This tool adds "A campaign…" to "What's it about?".
  window.TaskListOS.brainDump.register("ads", {
    pickers: function () {
      if (!data) return [];
      const items = data.builds.filter(function (b) { return b.status !== "dropped"; }).map(function (b) { return { id: b.id, label: "New campaign: " + (b.name || "Untitled campaign") }; })
        .concat(data.campaigns.filter(function (c) { return c.status !== "ended"; }).map(function (c) { return { id: c.id, label: "Campaign: " + c.name }; }));
      return [{ type: "campaign", label: "A campaign…", items: items }];
    },
    preset: null
  });

  // ============================================================
  // Start
  // ============================================================

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });
  if (window.AD.media && typeof window.AD.media.guardPage === "function") window.AD.media.guardPage();
  drawer("init", [makeCtx]);
  Settings.init(makeCtx);
  state.view = isView(viewFromHash()) ? viewFromHash() : DEFAULT_VIEW;
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  renderGate();
  store.start().then(function () {
    if (!store.isHelper()) return;
    // If Claude is already working on one of this tool's jobs (the page was reloaded), show the pill again
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      const name = /^ads:(.+)$/.exec(st.job || "");
      if ((st.running || st.queued) && name && JOBS[name[1]]) watch(name[1]);
    }).catch(function () { /* the helper is briefly unavailable; nothing to show */ });
  });
})();
