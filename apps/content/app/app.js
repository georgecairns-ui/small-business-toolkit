/*
  CONTENT MACHINE OS: the app
  ---------------------------
  Ties everything together:
  1. Connects to data/content.json through the shared store.
  2. Shows a short card until the app is running, then the app.
  3. Draws the one page: the rail (the views to flick between, Health check, Settings and the Calendar
     controls) and the view under it. The views are Calendar, To do, Ideas, Research, Platforms and
     Health check, and each has its own address (#calendar, #todo and so on); each move is a history
     entry, so Back and Forward work. A view is CM.views.<id> with title, line and render(root, ctx).
  4. Gives every view the same ctx: the data, update(), openPost(), runJob(), go(), redraw(), toast().
  5. Asks Claude to do its 3 jobs (claude-jobs.json) and shows the shared "Claude is working" pill.

  The rule throughout: Claude plans and writes, the person approves and posts. Nothing here posts
  or sends anything anywhere.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.CM.model, C = window.CM.components, V = window.CM.views, Drawer = window.CM.drawer, Settings = window.CM.settings, Media = window.CM.media;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // The views, in the order of the rail (the number keys 1 to 6 follow it). Health check has its own button.
  const TABS = [{ id: "calendar", label: "Calendar" }, { id: "todo", label: "To do" }, { id: "ideas", label: "Ideas" }, { id: "research", label: "Research" }, { id: "platforms", label: "Platforms" }];
  const VIEW_ORDER = TABS.map(function (t) { return t.id; }).concat("health");
  const DEFAULT_VIEW = "calendar";
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

  const state = { view: DEFAULT_VIEW, rendered: null };
  let data = null;
  let status = "checking";
  let statusDetail = {};

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "content",
    fileName: "content.json",
    dataPaths: ["data", "", "apps/content/data"],
    api: "/api/data/content/content.json",
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
      if (reason === "load") Drawer.close();
      // Claude wrote something while the person is typing in a box: leave the page alone until they finish
      if (reason === "external" && typingInView()) { renderChrome(); return; }
      render();
    }
  });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your content file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in a backup file next to it.", say: "Please check my content file and fix it", short: "Your content file needs a quick fix" };
    if (kind === "missing") return { title: "Your content file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My content file seems to be missing, please check it", short: "Your content file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your content machine has stopped running.", body: "Everything is saved. In Claude, say “open my content machine” and it starts again. This page reconnects by itself.", say: "Open my content machine", short: "Your content machine has stopped running" };
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
    return '<div class="gate__card"><div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Content Machine OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + esc(title) + "</h1>" + body +
      (actions ? '<div class="gate__actions">' + actions + "</div>" : "") + '</div><div class="gate__art"><img src="' + C.ART.welcome + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate() {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your content machine"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("", "Your content machine opens from Claude.",
        "<p>Claude runs it on this computer and gives you a link. In Claude Code, in your Small Business Toolkit folder, just say:</p>" + C.say("Open my content machine") +
        "<p class=\"gate__note\">Not set up yet? Say <strong>/setup</strong> instead.</p>",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-connect") {
      return showGate(gateCard("One-time setup", "Connect your content machine.",
        "<p>Choose your <strong>Content Machine OS</strong> folder, the one with START-HERE.md in it, then click <strong>Allow</strong> when Chrome asks. Nothing leaves your computer.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your folder</button>"));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my content machine</button>"));
    }
    const f = friendlyError(statusDetail.error);
    showGate(gateCard("Something needs a look", f.title, "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
  }

  // ============================================================
  // 3. The app: pages, top bar and sidebar
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }
  function viewId() { return V[state.view] ? state.view : DEFAULT_VIEW; }
  function typingInView() {
    const a = document.activeElement;
    return !!a && $("#view").contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search|number/.test(a.type)));
  }

  // section "media" opens the post at its photos and videos
  function openPost(postId, section) { Drawer.open(postId, section); }
  function makeCtx() {
    return {
      data: data,
      update: update,
      openPost: openPost,
      runJob: runJob,
      go: go,
      redraw: redrawPage,
      toast: function (message, undoFn) { ui.toast(message, undoFn ? { actionLabel: "Undo", onAction: undoFn, duration: 7000 } : {}); },
      ui: ui, model: M,
      today: function () { return ui.isoDate(); }
    };
  }
  // The only way a page changes the data. The change is saved, and if there's a wording it goes in the activity list.
  function update(mutator, activityText, postId) {
    return store.update(function (d) {
      M.normalise(d);
      mutator(d);
      if (activityText) M.logActivity(d, activityText, postId || null);
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
    Drawer.refresh();
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
    const due = counts().todo;
    document.querySelectorAll(".nav [data-count]").forEach(function (el) { el.textContent = due || ""; });
  }

  // To do counts what is due today or overdue; Ideas counts the ones not planned yet
  function counts() {
    const t = M.todo(data, ui.isoDate());
    return { todo: t.overdue.length + t.today.length, ideas: data.ideas.filter(function (i) { return i.status === "new"; }).length };
  }

  // The rail: the views to flick between, Health check, then (on Calendar) its controls and the Settings gear
  function tabButton(tab, n) {
    return '<button type="button" data-rail="' + tab.id + '" aria-pressed="' + (viewId() === tab.id) + '">' + esc(tab.label) +
      (n ? ' <span class="badge' + (tab.id === "todo" ? " badge--accent" : "") + '">' + n + "</span>" : "") + "</button>";
  }
  function healthButton(ctx) {
    const overall = M.healthOverall(M.health(data, ctx.today()));
    return '<button type="button" class="btn rail__health" data-rail="health" aria-pressed="' + (viewId() === "health") + '">' + icon("barChart") + "Health check" +
      '<span class="hdot hdot--' + overall + '" title="' + esc(M.HEALTH_LABELS[overall]) + '"></span></button>';
  }
  function railHtml(ctx) {
    const n = counts(), setUp = M.isSetUp(data);
    return '<div class="rail__left"><div class="rail__tabs"><div class="segmented" role="group" aria-label="Views">' +
        TABS.map(function (t) { return tabButton(t, n[t.id]); }).join("") + "</div></div>" + (setUp ? healthButton(ctx) : "") + "</div>" +
      '<div class="rail__right">' + (setUp && viewId() === "calendar" ? V.calendar.controls(ctx) : "") +
        '<button type="button" class="icon-btn" data-action="settings" aria-label="Settings" title="Settings">' + icon("settings") + "</button></div>";
  }
  // Drawn again after every change; whichever rail button had focus keeps it
  function renderRail() {
    const rail = $("#rail"), ctx = makeCtx();
    const at = Array.prototype.indexOf.call(rail.querySelectorAll(FOCUSABLE), document.activeElement);
    rail.innerHTML = railHtml(ctx);
    const again = rail.querySelectorAll(FOCUSABLE);
    if (at > -1 && again[at]) again[at].focus({ preventScroll: true });
  }
  function redrawPage() {
    if (!inApp()) return;
    renderRail();
    renderView();
  }

  // The page element a view draws into. A different page gets a brand new element, so nothing the
  // last page attached to it (including Calendar's listeners) can run on the new one. Even for the same
  // page, the handlers a view sets with root.onclick and friends are cleared before it draws again.
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
    if (M.isSetUp(data)) view.render(root, ctx);
    else root.innerHTML = '<div class="page">' + C.setupCard() + "</div>";
    if (same) {
      root.scrollTop = scroll;
      const again = root.querySelectorAll(FOCUSABLE);
      if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
    }
    state.rendered = id;
    $("#viewSub").textContent = M.isSetUp(data) ? view.line(ctx) : "Let’s set up your content machine";
    document.title = view.title + " · Content Machine OS";
  }

  // Moving to a page adds an entry to the browser's history, so Back returns to the page before.
  // replace: true is for when the address is already the person's own move (Back, Forward, a typed address).
  function go(view, replace) {
    state.view = V[view] ? view : DEFAULT_VIEW;
    if (location.hash !== "#" + state.view) history[replace ? "replaceState" : "pushState"](null, "", "#" + state.view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderRail(); renderView(); $("#view").scrollTop = 0; }
  }
  function viewFromHash() { return location.hash.slice(1).split("/")[0]; }
  window.addEventListener("hashchange", function () { const v = viewFromHash(); if (v !== state.view) go(v, true); });

  // ============================================================
  // 4. Asking Claude (research, plan, write)
  // ============================================================

  // say: what to tell Claude in the folder if the app can't start it
  const JOBS = {
    "research-my-market": { doing: "Claude is researching what your customers search for", done: "Claude has finished the research", say: "refresh my research" },
    "plan-my-content": { doing: "Claude is planning your next posts", done: "Claude has planned your next posts", say: "plan my content" },
    "write-posts": { doing: "Claude is writing your waiting posts", done: "Claude has written your waiting posts", say: "write my waiting posts" }
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
    return fetch("/api/claude/run/content/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function (r) {
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
      if (!timer) timer = setInterval(poll, POLL_MS);
    });
  }
  function finish(item, ok, message, iconName) {
    waiting.splice(waiting.indexOf(item), 1);
    ui.toast(message, { icon: iconName, duration: ok ? 5000 : 9000 });
    item.resolve(ok);
  }
  function poll() {
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if (st.running || st.queued) {
        const known = waiting.find(function (w) { return st.job === "content:" + w.name; }) || waiting[0];
        if (known) setClaudeStatus(JOBS[known.name].doing);
        return;
      }
      waiting.slice().forEach(function (w) {
        w.polls += 1;
        if (st.lastJob === "content:" + w.name) {
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
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.getAttribute("data-action")) {
      case "connect": store.connect().catch(function (err) { ui.toast(err && err.kind === "wrong-folder" ? "That folder doesn't have a content file in it. Choose the Small Business Toolkit folder." : "Couldn't connect that folder. Please try again.", { icon: "alert", duration: 6000 }); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      case "settings": Settings.open(); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
    }
  });
  // The rail: a view to flick to, or one of the Calendar's own controls
  $("#rail").addEventListener("click", function (e) {
    const tab = e.target.closest("[data-rail]");
    if (tab) { Drawer.close(); go(tab.getAttribute("data-rail")); return; }
    const cal = e.target.closest("[data-cal]");
    if (cal) V.calendar.act(cal);
  });
  // Moving to the page from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item");
    if (!link) return;
    e.preventDefault();
    Drawer.close();
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
    if (typing || e.metaKey || e.ctrlKey || e.altKey || Drawer.isOpen() || document.querySelector("dialog[open]")) return;
    if (/^[1-6]$/.test(e.key)) go(VIEW_ORDER[Number(e.key) - 1]);
  });

  // ============================================================
  // 6. Brain dump (shared, ../shared/js/braindump.js)
  // ============================================================
  // The button, V and the sorting are shared by every tool. This tool adds "An idea or post…" to "What's it about?".
  window.TaskListOS.brainDump.register("content", {
    pickers: function () {
      if (!data) return [];
      const items = data.ideas.filter(function (i) { return i.status !== "dropped"; }).map(function (i) { return { id: i.id, label: "Idea: " + (i.title || "Untitled idea") }; })
        .concat(data.posts.filter(function (p) { return p.status !== "skipped"; }).map(function (p) { return { id: p.id, label: "Post: " + M.titleOf(p) }; }));
      return [{ type: "idea", label: "An idea or post…", items: items }];
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
  Media.guardPage();
  Drawer.init(makeCtx);
  Settings.init(makeCtx);
  state.view = V[viewFromHash()] ? viewFromHash() : DEFAULT_VIEW;
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  renderGate();
  store.start().then(function () {
    if (!store.isHelper()) return;
    // If Claude is already working on one of this tool's jobs (the page was reloaded), show the pill again
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      const name = /^content:(.+)$/.exec(st.job || "");
      if ((st.running || st.queued) && name && JOBS[name[1]]) watch(name[1]);
    }).catch(function () { /* the helper is briefly unavailable; nothing to show */ });
  });
})();
