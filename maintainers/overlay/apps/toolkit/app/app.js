/*
  TOOLKIT: the app
  ----------------
  Ties everything together:
  1. Connects to data/toolkit.json through the shared store, and reads apps/home/data/connections.json (the
     shared file every tool reads since shared version 13) for which apps are connected.
  2. Shows a short card until the app is running, then the app.
  3. Draws the 3 pages: Connections, Set up, and Build and customise, each with its own address
     (#connections, #setup, #build) in the sidebar and on the rail. Every move is a history entry, so Back
     and Forward work.
  4. Asks the helper where this folder is (/api/info), so every Open in Claude link starts the Claude
     desktop app's Code tab right here.
  5. Asks Claude to do its 1 job (claude-jobs.json: "find-ideas") and shows the shared "Claude is working" pill.

  A page registers itself as TK.views.<name> = { render(root, ctx) }.

  ctx (a new one every time something is drawn, so always read the latest):
    ctx.data               the file as it is now. Read only: change it with ctx.update.
    ctx.update(fn)         the only way a page changes the data. fn(d) edits a fresh copy, which is then saved.
                           Returns a promise, rejected after the person has been told.
    ctx.runJob(name)       asks Claude to run a job. Resolves true when Claude finished, false if not.
    ctx.busy(name)         true while that job is running
    ctx.jobsOff            true once the helper has said it can't start Claude on this computer
    ctx.toast(text, undoFn) a notice at the bottom; with undoFn it has an Undo button
    ctx.go(view), ctx.redraw()

  The rule throughout: the app hands Claude the job, the person presses Enter. The app itself only ever
  changes an idea's status.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TK.model, C = window.TK.components, V = window.TK.views;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  const TABS = [{ id: "connections", label: "Connections" }, { id: "setup", label: "Set up" }, { id: "build", label: "Build and customise" }];
  const VIEW_ORDER = TABS.map(function (t) { return t.id; });
  const TITLES = { connections: "Connections", setup: "Set up", build: "Build and customise" };
  const DEFAULT_VIEW = "connections";
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

  const state = { view: DEFAULT_VIEW, rendered: null, jobsOff: false };
  let data = null;
  let status = "checking";
  let statusDetail = {};

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "toolkit",
    fileName: "toolkit.json",
    dataPaths: ["data", "", "apps/toolkit/data"],
    api: "/api/data/toolkit/toolkit.json",
    validate: M.validate,
    onStatus: function (s, detail) {
      const previous = status;
      status = s;
      statusDetail = detail || {};
      renderChrome();
      if (!(data && (s === "ready" || s === "error")) || previous !== s) render();
    },
    onData: function (d, reason) {
      data = d;
      // Claude wrote something while the person is typing in the pop-up: leave the page alone until they finish
      if (reason === "external" && typing()) { renderChrome(); return; }
      render();
    }
  });

  // Which apps Claude can reach: the shared file every tool reads (shared v13). Missing just means nothing is connected yet.
  window.TaskListOS.createStore({
    moduleId: "connections",
    fileName: "connections.json",
    dataPaths: ["data", "", "apps/home/data"],
    api: window.TaskListOS.connections.API,
    validate: window.TaskListOS.connections.validate,
    onStatus: function () {},
    onData: function (d) { M.setConnections(d.connections); if (data) render(); }
  }).start();

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your toolkit file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in a backup file next to it.", say: "Please check my toolkit file and fix it", short: "Your toolkit file needs a quick fix" };
    if (kind === "missing") return { title: "Your toolkit file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My toolkit file seems to be missing, please check it", short: "Your toolkit file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your toolkit has stopped running.", body: "Everything is saved. In Claude, say “open my toolkit” and it starts again. This page reconnects by itself.", say: "Open my toolkit", short: "Your toolkit has stopped running" };
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
    return '<div class="gate__card"><div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Toolkit</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + esc(title) + "</h1>" + body +
      (actions ? '<div class="gate__actions">' + actions + "</div>" : "") + '</div><div class="gate__art"><img src="' + C.ART.welcome + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate() {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your toolkit"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("", "Your toolkit opens from Claude.",
        "<p>Claude runs it on this computer and gives you a link. In Claude Code, in your toolkit folder, just say:</p>" + C.say("Open my toolkit") +
        "<p class=\"gate__note\">Not set up yet? Say <strong>/setup</strong> instead.</p>",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-connect") {
      return showGate(gateCard("One-time setup", "Connect your toolkit.",
        "<p>Choose your toolkit folder, the one with START-HERE.md in it, then click <strong>Allow</strong> when Chrome asks. Nothing leaves your computer.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your folder</button>"));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my toolkit</button>"));
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
  function typing() {
    const a = document.activeElement;
    return !!a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|search/.test(a.type)));
  }

  function makeCtx() {
    return {
      data: data,
      update: update,
      runJob: runJob,
      busy: function (name) { return waiting.some(function (w) { return w.name === name; }); },
      jobsOff: state.jobsOff,
      go: go,
      redraw: redrawPage,
      toast: function (message, undoFn) { ui.toast(message, undoFn ? { actionLabel: "Undo", onAction: undoFn, duration: 7000 } : {}); },
      ui: ui, model: M
    };
  }
  // The only way a page changes the data
  function update(mutator) {
    return store.update(mutator).catch(function (err) {
      ui.toast(err.kind ? friendlyError(err).short : err.message, { icon: "alert", duration: 6000 });
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
  }

  function subLine() {
    const id = viewId();
    if (id === "connections") return M.connectedLine(data);
    if (id === "setup") return M.setUpLine(data);
    const n = M.newIdeas(data).length;
    return n ? (n === 1 ? "1 new idea from Claude" : n + " new ideas from Claude") : "Hand Claude a job";
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
    const n = M.counts(data), ideas = M.newIdeas(data).length;
    document.querySelectorAll('#nav [data-count="attention"]').forEach(function (el) { el.textContent = n.attention || ""; });
    document.querySelectorAll('#nav [data-count="ideas"]').forEach(function (el) { el.textContent = ideas || ""; });
    document.querySelectorAll("#nav .nav__item").forEach(function (a) {
      const on = a.getAttribute("href") === "#" + viewId();
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  // The rail: the 3 pages to flick between
  function railHtml() {
    const n = M.counts(data), ideas = M.newIdeas(data).length;
    return '<div class="rail__left"><div class="rail__tabs"><div class="segmented" role="group" aria-label="Pages">' +
      TABS.map(function (t) {
        const count = t.id === "connections" ? n.attention : t.id === "build" ? ideas : 0;
        return '<button type="button" data-rail="' + t.id + '" aria-pressed="' + (viewId() === t.id) + '">' + esc(t.label) +
          (count ? ' <span class="badge badge--accent">' + count + "</span>" : "") + "</button>";
      }).join("") + "</div></div></div>";
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

  // A different page gets a brand new element, so nothing the last page attached to it can run on the new one
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
    const id = viewId(), ctx = makeCtx();
    const same = state.rendered === id;
    const old = $("#view");
    const scroll = old.scrollTop;
    const all = Array.prototype.slice.call(old.querySelectorAll(FOCUSABLE));
    const focusAt = same ? all.indexOf(document.activeElement) : -1;
    const root = viewRoot(same);
    root.setAttribute("data-view", id);
    V[id].render(root, ctx);
    if (same) {
      root.scrollTop = scroll;
      const again = root.querySelectorAll(FOCUSABLE);
      if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
    }
    state.rendered = id;
    $("#viewTitle").textContent = TITLES[id];
    $("#viewSub").textContent = subLine();
    document.title = TITLES[id] + " · Toolkit";
  }

  function go(view, replace) {
    state.view = V[view] ? view : DEFAULT_VIEW;
    if (location.hash !== "#" + state.view) history[replace ? "replaceState" : "pushState"](null, "", "#" + state.view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderRail(); renderView(); $("#view").scrollTop = 0; }
  }
  function applyHash() {
    const h = location.hash.slice(1).split("/")[0];
    state.view = V[h] ? h : DEFAULT_VIEW;
  }
  window.addEventListener("hashchange", function () {
    applyHash();
    if (inApp()) { renderChrome(); renderRail(); renderView(); }
  });

  // ============================================================
  // 4. Asking Claude (Find ideas)
  // ============================================================

  // say: what to tell Claude in the folder if the app can't start it. doing is the words in the pill.
  const JOBS = {
    "find-ideas": { doing: "Claude is looking for what to do next", done: "Claude has looked. Any new ideas are on Build and customise", say: "what should I do next with my toolkit" }
  };
  const POLL_MS = 2500, GIVE_UP_AFTER_POLLS = 480;   // 20 minutes
  const waiting = [];   // { name, resolve, polls }
  let timer = null;

  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  // The helper can't start Claude here (Claude Code isn't found, it's switched off, or the page isn't running
  // through the helper): say so, and the page offers the same job through Open in Claude
  function jobsUnavailable(text) {
    state.jobsOff = true;
    ui.toast(text, { icon: "info", duration: 9000 });
    redrawPage();
    return false;
  }

  // Resolves true when Claude finished the job, false if it couldn't be started or didn't finish
  function runJob(name) {
    if (!JOBS[name]) return Promise.reject(new Error("Unknown job: " + name));
    if (!store.isHelper()) return Promise.resolve(jobsUnavailable("Claude can't be started from this page. Use Open in Claude instead."));
    return fetch("/api/claude/run/toolkit/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function (r) {
      if (r.status === 202) { state.jobsOff = false; return watch(name); }
      if (r.status === 503) return jobsUnavailable("Claude isn't switched on for the app on this computer. Use Open in Claude instead.");
      ui.toast("Claude couldn't be started from here. Open the folder in Claude and say: " + JOBS[name].say + ".", { icon: "alert", duration: 9000 });
      return false;
    }, function () {
      return jobsUnavailable("This page can't reach Claude right now. Use Open in Claude instead.");
    });
  }
  function watch(name) {
    return new Promise(function (resolve) {
      waiting.push({ name: name, resolve: resolve, polls: 0 });
      setClaudeStatus(JOBS[name].doing);
      redrawPage();
      if (!timer) timer = setInterval(poll, POLL_MS);
    });
  }
  function finish(item, ok, message, iconName) {
    waiting.splice(waiting.indexOf(item), 1);
    ui.toast(message, { icon: iconName, duration: ok ? 5000 : 9000 });
    redrawPage();
    item.resolve(ok);
  }
  function poll() {
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if (st.running || st.queued) {
        const known = waiting.find(function (w) { return st.job === "toolkit:" + w.name; }) || waiting[0];
        if (known) setClaudeStatus(JOBS[known.name].doing);
        return;
      }
      waiting.slice().forEach(function (w) {
        w.polls += 1;
        if (st.lastJob === "toolkit:" + w.name) {
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
      ui.copyText(copy.getAttribute("data-copy")).then(function (ok) { ui.toast(ok ? "Copied. Paste it into Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" }); });
      return;
    }
    // Open in Claude: the link itself does the work. Once used, the first-time note goes, and a pop-up closes.
    const open = e.target.closest("[data-open-claude]");
    if (open) {
      C.markSeen();
      const dlg = open.closest("dialog");
      if (dlg) dlg.close();
      setTimeout(redrawPage, 0);
      return;
    }
    const goTo = e.target.closest("[data-go]");
    if (goTo) { go(goTo.getAttribute("data-go")); return; }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.getAttribute("data-action")) {
      case "connect": store.connect().catch(function (err) { ui.toast(err && err.kind === "wrong-folder" ? "That folder doesn't have a toolkit file in it. Choose your toolkit folder." : "Couldn't connect that folder. Please try again.", { icon: "alert", duration: 6000 }); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      case "find-ideas": runJob("find-ideas"); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
    }
  });
  // The rail: a page to flick to
  $("#rail").addEventListener("click", function (e) {
    const tab = e.target.closest("[data-rail]");
    if (tab) go(tab.getAttribute("data-rail"));
  });
  // Moving between pages from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest("#nav .nav__item");
    if (!link) return;
    e.preventDefault();
    go(link.getAttribute("href").slice(1));
  });
  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  });
  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    if (e.key === "Escape") { document.body.classList.remove("sidebar-open"); return; }
    const el = document.activeElement;
    const isTyping = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (isTyping || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (/^[1-3]$/.test(e.key)) go(VIEW_ORDER[Number(e.key) - 1]);
  });

  // ============================================================
  // Start
  // ============================================================

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });
  applyHash();
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  renderGate();
  store.start().then(function () {
    if (!store.isHelper()) return;
    // Where this folder is, so Open in Claude starts Claude Code right here (with its connections and skills).
    // Without it the buttons offer Copy the prompt only, and say so.
    fetch("/api/info", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("The helper didn't say where this folder is");
      return r.json();
    }).then(function (info) { C.setFolder(info.folder); redrawPage(); }).catch(function () {
      ui.toast("Open in Claude isn't available right now, so the buttons copy the prompt instead.", { icon: "info", duration: 7000 });
    });
    // If Claude is already working on this tool's job (the page was reloaded), show the pill again
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      const name = /^toolkit:(.+)$/.exec(st.job || "");
      if ((st.running || st.queued) && name && JOBS[name[1]]) watch(name[1]);
    }).catch(function () { /* the helper is briefly unavailable; nothing to show */ });
  });
})();
