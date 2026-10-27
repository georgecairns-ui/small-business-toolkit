/*
  SKILL MAP OS: the app
  ---------------------
  Ties everything together:
  1. Connects to data/skillmap.json through the shared store.
  2. Shows the welcome screen until the helper is running, then the app.
  3. Moves between pages (Map, All skills, Overview, Gaps, Review, Preferences) using the address
     bar, so Back and Forward work.
  4. Handles every button, form and keyboard shortcut. Every change goes through change(), which
     saves it into the map file for Claude to read.
  5. Asks Claude, through the helper, to do its 3 jobs (claude-jobs.json): scan the skills, group
     them by what they do, and review them. The scan itself is a plain script that only reads.

  The rule throughout: Claude suggests, the person decides. Nothing changes until the person presses
  a Fix button and confirms, nothing is ever deleted, and nothing is sent anywhere.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, FM = window.SM.fmodel, TM = window.SM.tidy, C = window.SM.c, V = window.SM.views, Drawer = window.SM.drawer;
  const mut = M.mut;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Number keys 1 to 5 follow the sidebar
  const VIEW_ORDER = ["map", "skills", "overview", "gaps", "review"];

  function remembered(key, allowed) {
    try { const v = localStorage.getItem(key); return allowed.indexOf(v) > -1 ? v : null; } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  // ---------- Screen state (not saved to the file) ----------
  const state = {
    view: "map",
    mapMode: remembered("smos-map-mode", ["area", "source"]),
    origins: [], used: "all", attention: false, tag: "", links: remembered("smos-links", ["on", "off"]) === "on",
    skillsQuery: "", skillsOrigin: "all", skillsAttention: false, skillsSort: { key: "name", dir: "asc" },
    drawer: null, flyTo: null,
    // The Files side: which folder is in the middle of the map, filters, and the list
    lens: remembered("smos-lens", ["skills", "files"]) || "skills", focus: null, pin: null, ftype: "", fworth: false,
    fq: "", ffinding: "", flistMode: "files", fsort: { key: "bytes", dir: "desc" }
  };
  const claude = { jobs: [], timer: null, before: null, tidyIds: [] };

  let data = null;
  let fdata = null;
  let tdata = null;
  let status = "checking";
  let statusDetail = {};
  const toolkit = { tools: [], installed: {}, booking: null };

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "skill-map",
    fileName: "skillmap.json",
    dataPaths: ["data", "", "apps/skill-map/data"],
    api: "/api/data/skill-map/skillmap.json",
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
      if (reason === "load") state.drawer = null;
      render();
      if (reason === "external" && !claude.jobs.length) ui.toast("Your map was updated", { icon: "sparkle" });
    }
  });

  // The folder map has its own file. If it can't be read the skills side carries on; the Files side shows its welcome card.
  const fstore = window.TaskListOS.createStore({
    moduleId: "skill-map-files",
    fileName: "filemap.json",
    dataPaths: ["data", "", "apps/skill-map/data"],
    api: "/api/data/skill-map/filemap.json",
    validate: FM.validate,
    onStatus: function () {},
    onData: function (d, reason) {
      fdata = FM.normalise(d);
      if (reason === "load") { state.focus = state.focus && FM.folderById(fdata, state.focus) ? state.focus : null; }
      render();
      if (reason === "external" && !claude.jobs.length && state.lens === "files") ui.toast("Your folder map was updated", { icon: "sparkle" });
    }
  });
  function fchange(fn) {
    if (!fdata) return Promise.resolve();
    return fstore.update(function (d) { FM.normalise(d); fn(d); }).catch(function (err) {
      ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 });
      render();
      err.shownToPerson = true;
      throw err;
    });
  }

  // What the person has asked Claude to tidy, and what came of it. Missing or unreadable, the Fix buttons simply don't appear.
  const tstore = window.TaskListOS.createStore({
    moduleId: "skill-map-tidy",
    fileName: "tidy.json",
    dataPaths: ["data", "", "apps/skill-map/data"],
    api: "/api/data/skill-map/tidy.json",
    validate: TM.validate,
    onStatus: function () {},
    onData: function (d) { tdata = TM.normalise(d); render(); }
  });
  function tchange(fn) {
    if (!tdata) return Promise.reject(new Error("The tidy-up list couldn\u2019t be found"));
    return tstore.update(function (d) { TM.normalise(d); fn(d); });
  }

  function change(fn) {
    return store.update(function (d) { M.normalise(d); fn(d); }).catch(function (err) {
      ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 });
      render();
      err.shownToPerson = true;
      throw err;
    });
  }
  window.addEventListener("unhandledrejection", function (e) { if (e.reason && e.reason.shownToPerson) e.preventDefault(); });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your map file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in skillmap.backup.json next to it.", say: "Please check my skillmap.json file and fix it", short: "Your map file needs a quick fix" };
    if (kind === "missing") return { title: "Your map file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My map file seems to be missing, please check it", short: "Your map file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your map has stopped running.", body: "Everything is saved. In Claude, say “open my skill map” and it starts again. This page reconnects by itself.", say: "Open my map", short: "Your skill map has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }

  // ============================================================
  // 2. Before the map is running: welcome, loading, problems
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }
  function gateCard(art, eyebrow, title, body, actions, small) {
    return '<div class="gate__card">' +
      '<div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Skill and Folder Map OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + title + "</h1>" + body +
      '<div class="gate__actions">' + actions + "</div>" + (small ? '<p class="gate__small">' + small + "</p>" : "") + "</div>" +
      '<div class="gate__art"><img src="' + C.ART[art] + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate(message) {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your map"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("welcome", "", "Your map opens from Claude.",
        "<p>Claude runs your map on this computer and gives you a link to it. In Claude Code, in your Small Business Toolkit folder, just say:</p>" + C.say("Open my map") +
        '<p class="gate__note">Not set up yet? Say <strong>/setup</strong> instead. Claude scans your skills and your folders and draws the maps for you.</p>',
        "",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("shrug", "One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("welcome", "Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my map</button>", "Folder: " + esc(statusDetail.folderName || "")));
    }
    if (status === "error" && !data) {
      const f = friendlyError(statusDetail.error);
      return showGate(gateCard("shrug", "Something needs a look", esc(f.title), "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
        '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
    }
    showGate(gateCard("welcome", "One-time setup", "See every skill and folder you have. <span class=\"accent\">At a glance.</span>",
      "<p>Skill and Folder Map OS finds the skills on your computer and the folders and files you keep, draws each as a map you can click into, and shows what you use, what is doubled up and what to tidy first. Scanning only reads names, sizes and dates, and nothing is changed until you press a Fix button. It all lives in files on your own computer.</p>" +
      '<ol class="gate__steps"><li><span>Click <strong>Connect your map</strong>.</span></li><li><span>Choose your <strong>Skill and Folder Map OS</strong> folder, the one with START-HERE.md in it.</span></li><li><span>When Chrome asks to let this page edit files, click <strong>Allow</strong>.</span></li></ol>' +
      (message ? '<p class="gate__error" role="alert">' + icon("alert") + esc(message) + "</p>" : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your map</button>",
      "No account, nothing to install. Your skills and files never leave your computer."));
  }

  // ============================================================
  // 3. The app
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }

  function render() {
    if (!inApp()) { renderChrome(); return renderGate(); }
    $("#gate").hidden = true;
    $("#shell").hidden = false;
    renderChrome();
    renderView();
    renderDrawer();
  }

  const actions = {
    openNode: function (id) { openDrawer("skill", id); },
    openGroup: function (key) { openDrawer("group", key); },
    closeDrawer: function () { closeDrawer(); },
    openFile: function (id) { openDrawer("file", id); },
    drill: function (id) { drill(id); },
    up: function () { up(); }
  };
  function ctx() { return { d: data, f: fdata, t: tdata, state: state, actions: actions, toolkit: toolkit, canScan: store.isHelper() }; }
  // On the Files side the pages are the folder ones; the map page is shared and branches inside itself
  function viewFor(name) {
    if (state.lens === "files" && V.f && V.f[name === "skills" ? "list" : name]) return V.f[name === "skills" ? "list" : name];
    return V[name] || V.map;
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
      pill.hidden = false; pill.className = "save-status is-error";
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">Not saved</span>';
    } else pill.hidden = true;

    const banner = $("#banner");
    if (status === "error" && data) {
      const f = friendlyError(statusDetail.error);
      banner.innerHTML = '<div class="banner banner--error">' + icon("alert") + "<span><strong>" + esc(f.title) + "</strong> " + esc(f.body) + "</span>" +
        '<button type="button" class="btn btn--sm" data-action="retry">Try again</button></div>';
    } else banner.innerHTML = "";

    if (!data) return;
    $("#businessName").textContent = data.settings.businessName || (data.settings.yourName ? data.settings.yourName + "'s workspace" : "Your workspace");
    const files = state.lens === "files";
    document.body.setAttribute("data-lens", state.lens);
    const n = M.numbers(data), fn = fdata && !FM.notSetUp(fdata) ? FM.numbers(fdata) : null;
    const counts = files
      ? { skills: fn ? FM.fmtCount(fn.files) : "", gaps: fn ? fn.worth || "" : "", review: fdata ? FM.openRecs(fdata).length || "" : "" }
      : { skills: data.nodes.length || "", gaps: M.hasAreas(data) ? n.areasEmpty || "" : "", review: M.reviewCount(data) || "" };
    document.querySelectorAll("[data-count]").forEach(function (el) { const v = counts[el.getAttribute("data-count")]; el.textContent = v ? v : ""; });
    const labels = files ? { skills: "All files", gaps: "Clean-up" } : { skills: "All skills", gaps: "Gaps" };
    document.querySelectorAll("[data-label]").forEach(function (el) { const k = el.getAttribute("data-label"); if (labels[k]) el.textContent = labels[k]; });
    document.querySelectorAll(".nav__item").forEach(function (a) {
      const on = a.getAttribute("data-view") === state.view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-lens]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lens") === state.lens)); });
    $("#savedMini").innerHTML = files
      ? (fn ? '<span class="saved-mini__value num">' + FM.fmtCount(fn.files) + '</span><span class="saved-mini__label">' + (fn.files === 1 ? "file" : "files") + " mapped, " + FM.fmtBytes(fn.bytes) + "</span>" : "")
      : (M.notSetUp(data) ? "" : '<span class="saved-mini__value num">' + n.total + '</span><span class="saved-mini__label">' + (n.total === 1 ? "skill" : "skills") + " mapped</span>");
    const notSet = files ? FM.notSetUp(fdata) : M.notSetUp(data);
    const scanLabel = notSet ? (files ? "Scan my folders" : "Scan my skills") : "Scan again";
    $("#scanBtn").disabled = claude.jobs.length > 0;
    $("#scanBtn").setAttribute("data-action", files ? "scan-folders" : "scan");
    $("#scanBtn .topbar__new-label").textContent = scanLabel;
    $("#scanBtn").setAttribute("aria-label", scanLabel);
    $("#searchInput").placeholder = files ? "Find a file or folder" : "Find a skill";
    $("#searchInput").setAttribute("aria-label", files ? "Find a file or folder" : "Find a skill");
    $(".topbar__add").hidden = files;
  }

  function renderView() {
    const view = viewFor(state.view);
    const root = $("#view");
    const c = ctx();
    const scroll = root.scrollTop;
    root.innerHTML = view.render(c);
    root.setAttribute("data-view", state.view);
    if (view.bind) view.bind(root, c);
    C.countUp(root);
    root.scrollTop = scroll;
    $("#viewTitle").textContent = view.title(c);
    $("#viewSub").textContent = view.sub ? view.sub(c) : "";
    document.title = view.title(c) + " · Skill and Folder Map OS";
  }

  // The panel
  let drawerKey = null;
  function renderDrawer() {
    const el = $("#drawer");
    if (!state.drawer) { el.hidden = true; document.body.classList.remove("has-drawer"); drawerKey = null; syncMapSelection(); return; }
    const key = state.drawer.kind + ":" + state.drawer.id;
    const active = document.activeElement;
    // Don't redraw under someone's fingers while they type in the panel
    if (key === drawerKey && active && el.contains(active) && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && /text|search/.test(active.type)))) return;
    const html = Drawer.render(ctx(), state.drawer);
    if (!html) { state.drawer = null; return renderDrawer(); }
    el.innerHTML = html;
    Drawer.bind(el, ctx(), state.drawer);
    const opening = el.hidden;
    el.hidden = false;
    document.body.classList.add("has-drawer");
    if (opening) { el.classList.remove("is-open"); void el.offsetWidth; el.classList.add("is-open"); }
    drawerKey = key;
    syncMapSelection();
  }
  function syncMapSelection() {
    const map = V.map.controls();
    if (!map || state.view !== "map") return;
    map.setSelected(state.drawer ? (state.drawer.kind === "group" || state.drawer.kind === "folder" ? "hub:" + state.drawer.id : state.drawer.id) : null);
  }
  function openDrawer(kind, id) {
    if (!id) return;
    state.drawer = { kind: kind, id: id };
    drawerKey = null;
    renderDrawer();
    setTimeout(function () { const b = $("#drawer [data-action='close-drawer']"); if (b) b.focus({ preventScroll: true }); }, 40);
  }
  function closeDrawer() { state.drawer = null; renderDrawer(); }

  // ============================================================
  // 4. Moving between pages
  // ============================================================

  function go(view) {
    if (!V[view]) view = "map";
    state.view = view;
    remember("smos-view", view);
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderView(); renderDrawer(); $("#view").scrollTop = 0; syncMapSelection(); }
  }
  window.addEventListener("hashchange", function () { const v = location.hash.slice(1); if (v && v !== state.view) { state.drawer = null; go(v); } });

  // Go into a folder on the map (null goes back to all the folders)
  function drill(id) {
    state.focus = id || null; state.pin = null; state.drawer = null; state.flyTo = null;
    if (state.view !== "map") go("map"); else { renderView(); renderDrawer(); }
  }
  function up() {
    const f = state.focus ? FM.folderById(fdata, state.focus) : null;
    drill(f && f.parent ? f.parent : null);
  }
  function fileOnMap(id) {
    const x = FM.fileById(fdata, id);
    if (!x) return;
    state.focus = x.folder; state.pin = id; state.flyTo = id; state.drawer = { kind: "file", id: id };
    if (state.view !== "map") go("map"); else { renderView(); renderDrawer(); }
  }
  function setLens(lens) {
    if (lens !== "skills" && lens !== "files") return;
    state.lens = lens; remember("smos-lens", lens);
    state.drawer = null; state.ffinding = "";
    if (state.view === "preferences" || V[state.view] || state.view === "map") { /* stay on the same page */ }
    render();
  }
  function showFinding(key) {
    const card = FM.findingCards(fdata).find(function (k) { return k.key === key; });
    state.lens = "files"; remember("smos-lens", "files");
    state.ffinding = key; state.flistMode = card && card.folders ? "folders" : "files"; state.fq = ""; state.ftype = "";
    state.fsort = card && card.folders ? { key: "files", dir: "desc" } : { key: "bytes", dir: "desc" };
    go("skills");
  }
  function findingOnMap(key) {
    const card = FM.findingCards(fdata).find(function (k) { return k.key === key; });
    if (!card || !card.ids.length) return;
    state.lens = "files"; remember("smos-lens", "files");
    if (card.folders) drill(card.ids[0]); else fileOnMap(card.ids[0]);
  }

  // Show a skill on the map: switch to the map page, then fly to it
  function showOnMap(id) {
    state.flyTo = id;
    if (state.view !== "map") go("map"); else { renderView(); }
  }

  // ============================================================
  // 5. Asking Claude (scan, group, review)
  // ============================================================

  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  const JOBS = {
    scan: { name: "scan-my-skills", doing: "Claude is scanning your skills", say: "Scan my skills" },
    group: { name: "group-my-skills", doing: "Claude is grouping your skills", say: "Group my skills" },
    review: { name: "review-my-skills", doing: "Claude is reviewing your skills", say: "Review my skills" },
    scanfolders: { name: "scan-my-folders", doing: "Claude is looking through your folders", say: "Scan my folders" },
    reviewfolders: { name: "review-my-folders", doing: "Claude is reviewing your folders", say: "Review my folders" },
    tidy: { name: "tidy-up", doing: "Claude is tidying up", say: "Tidy up what I asked for" }
  };
  function snapshot() {
    return { scanAt: data && data.scan ? data.scan.at : null, recs: data ? data.recommendations.length : 0, fscanAt: fdata && fdata.scan ? fdata.scan.at : null, frecs: fdata ? fdata.recommendations.length : 0 };
  }
  // Resolves true if Claude was started (or queued)
  function askClaude(kind) {
    if (!store.isHelper()) return Promise.resolve(false);
    return fetch("/api/claude/run/skill-map/" + JOBS[kind].name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (r.status !== 202) return false;
        if (claude.jobs.indexOf(kind) === -1) claude.jobs.push(kind);
        claude.before = claude.before || snapshot();
        watchClaude();
        return true;
      })
      .catch(function () { return false; });
  }
  function startJob(kind) {
    if (claude.jobs.indexOf(kind) > -1) return;
    askClaude(kind).then(function (started) {
      if (started) return;
      $("#genericBody").innerHTML = '<div class="modal__head"><h2>Ask Claude to do it</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
        '<div class="modal__body"><p>Claude can\u2019t be started from this page on this computer. In Claude Code, in your Small Business Toolkit folder, say:</p>' + C.say(JOBS[kind].say) +
        '<p class="muted">Claude does it straight away and this page updates by itself.</p></div>';
      $("#genericDialog").showModal();
    });
  }
  function watchClaude() {
    setClaudeStatus(JOBS[claude.jobs[0]] ? JOBS[claude.jobs[0]].doing : "Claude is working");
    renderChrome();
    clearInterval(claude.timer);
    claude.timer = setInterval(function () {
      fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
        if (st.running || st.queued) { setClaudeStatus(JOBS[claude.jobs[0]] ? JOBS[claude.jobs[0]].doing : "Claude is working"); return; }
        clearInterval(claude.timer);
        setTimeout(function () { finishedClaude(st.lastResult); }, 2000);
      }).catch(function () { /* helper briefly unavailable; keep watching */ });
    }, 3000);
  }
  // Read both files fresh to say how it went (the app's own refresh pauses while its tab is hidden)
  function finishedClaude(result) {
    function get(url) { return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
    Promise.all([get("/api/data/skill-map/skillmap.json"), get("/api/data/skill-map/filemap.json"), get("/api/data/skill-map/tidy.json")]).then(function (both) {
      if (both[2]) tdata = TM.normalise(both[2]);
      reportClaude(both[0] ? M.normalise(both[0]) : data, both[1] ? FM.normalise(both[1]) : fdata, result);
    });
  }
  function reportClaude(now, fnow, result) {
    const kinds = claude.jobs.splice(0), before = claude.before || {};
    claude.before = null;
    setClaudeStatus("");
    if (now && now !== data) data = now;
    if (fnow && fnow !== fdata) fdata = fnow;
    render();
    if (result === "failed" && kinds.indexOf("tidy") > -1) { claude.tidyIds = []; ui.toast("Claude couldn\u2019t finish tidying. Nothing was lost: say \u201cTidy up what I asked for\u201d to Claude in Claude Code and it will tell you why.", { icon: "alert", duration: 9000 }); return; }
    if (result === "failed") { ui.toast("Claude couldn\u2019t finish. Say \u201c" + JOBS[kinds[0] || "scan"].say + "\u201d to Claude in Claude Code and it will tell you why.", { icon: "alert", duration: 9000 }); return; }
    if (kinds.indexOf("scan") > -1) {
      const s = now && now.scan, scanned = s && s.at && s.at !== before.scanAt;
      if (!scanned) ui.toast("The scan didn\u2019t save anything new. Say \u201cScan my skills\u201d to Claude to see why.", { icon: "alert", duration: 9000 });
      else ui.toast("Found " + now.nodes.length + (now.nodes.length === 1 ? " skill" : " skills") + (s.changes && s.changes.added ? ", " + s.changes.added + " new" : "") + (s.changes && s.changes.removed && s.changes.removed.length ? ", " + s.changes.removed.length + " gone" : ""), { icon: "sparkle", duration: 6000 });
    }
    if (kinds.indexOf("group") > -1) {
      if (now && M.hasAreas(now)) { state.mapMode = "area"; ui.toast("Claude grouped your skills. Check the groups, then say it looks right", { icon: "sparkle", duration: 7000 }); go("gaps"); }
      else ui.toast("Claude didn\u2019t group anything. Say \u201cGroup my skills\u201d to Claude to see why.", { icon: "alert", duration: 9000 });
    }
    if (kinds.indexOf("review") > -1) {
      const gained = now ? now.recommendations.length - (before.recs || 0) : 0;
      ui.toast(gained > 0 ? "Claude left " + gained + (gained === 1 ? " suggestion" : " suggestions") + " for you" : "Claude has nothing new to suggest", { icon: "sparkle", duration: 6000 });
      if (gained > 0) go("review");
    }
    if (kinds.indexOf("scanfolders") > -1) {
      const s = fnow && fnow.scan, scanned = s && s.at && s.at !== before.fscanAt;
      if (!scanned) ui.toast("The folder scan didn\u2019t save anything new. Say \u201cScan my folders\u201d to Claude to see why.", { icon: "alert", duration: 9000 });
      else { state.focus = null; ui.toast("Looked through " + FM.fmtCount(s.totals.folders) + " folders: " + FM.fmtCount(s.totals.files) + " files, " + FM.fmtBytes(s.totals.bytes), { icon: "sparkle", duration: 6000 }); if (state.lens !== "files") setLens("files"); }
    }
    if (kinds.indexOf("tidy") > -1) reportTidy();
    if (kinds.indexOf("reviewfolders") > -1) {
      const gained = fnow ? fnow.recommendations.length - (before.frecs || 0) : 0;
      ui.toast(gained > 0 ? "Claude left " + gained + (gained === 1 ? " suggestion" : " suggestions") + " about your folders" : "Claude has nothing new to suggest", { icon: "sparkle", duration: 6000 });
      if (gained > 0) { if (state.lens !== "files") setLens("files"); go("review"); }
    }
  }

  // ============================================================
  // 5b. Fix buttons: show the plan, ask, save it, let Claude do it
  // ============================================================
  let pendingFix = null;
  function openFix(plan) {
    if (!plan) return;
    pendingFix = plan;
    const eg = plan.examples || [];
    openGeneric('<div class="modal__head"><h2>' + esc(plan.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body stack"><p>' + esc(plan.summary) + "</p>" +
      (eg.length ? '<ul class="gap__ideas">' + eg.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + (plan.count > eg.length ? '<li class="muted">and ' + FM.fmtCount(plan.count - eg.length) + " more</li>" : "") + "</ul>" : "") +
      '<p class="tidy-safe">' + icon("lock") + "<span>" + esc(plan.reassure) + "</span></p></div>" +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn btn--primary" data-action="fix-go">' + esc(plan.button) + "</button></div>");
  }
  function fixGo() {
    const plan = pendingFix;
    pendingFix = null;
    generic.close();
    if (!plan) return;
    const action = TM.makeAction(plan);
    tchange(function (d) { d.actions.push(action); }).then(function () {
      claude.tidyIds.push(action.id);
      startJob("tidy");
    }).catch(function (err) { ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 }); });
  }
  function undoTidy(id) {
    const a = tdata && tdata.actions.find(function (x) { return x.id === id; });
    if (!a) return;
    const u = TM.makeUndo(a.lens, id);
    tchange(function (d) { d.actions.push(u); }).then(function () { claude.tidyIds.push(u.id); startJob("tidy"); }).catch(function (err) { ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 }); });
  }
  // Say how the tidy-up went, in plain words
  function reportTidy() {
    const ids = claude.tidyIds.splice(0);
    ids.forEach(function (id) {
      const a = tdata && tdata.actions.find(function (x) { return x.id === id; });
      if (!a) return;
      const n = a.summary ? a.summary.moved : 0, left = a.summary ? a.summary.left : 0;
      if (a.kind === "undo") {
        ui.toast(a.status === "done" ? "Put " + n + (n === 1 ? " thing" : " things") + " back where " + (n === 1 ? "it was" : "they were") : (a.note || "Couldn\u2019t undo that"), { icon: a.status === "done" ? "check" : "alert", duration: 7000 });
      } else if (a.status === "done" || a.status === "partly") {
        ui.toast("Tidied " + n + (n === 1 ? " thing" : " things") + (left ? ", left " + left + " alone (see Tidied so far)" : ""), { icon: "check", duration: 12000, actionLabel: "Undo", onAction: function () { undoTidy(a.id); } });
      } else ui.toast(a.note || "Claude couldn\u2019t tidy that. Nothing was changed", { icon: "alert", duration: 9000 });
    });
  }

  // ============================================================
  // 6. Buttons and forms
  // ============================================================

  const generic = $("#genericDialog");
  function openGeneric(html) { $("#genericBody").innerHTML = html; generic.showModal(); }

  function openAddManual() {
    openGeneric('<form data-form="add-manual" class="modal__form">' +
      '<div class="modal__head"><h2>Add a skill I use on claude.ai</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body stack"><p class="muted">The scan can only see skills on this computer. Add the ones you use on claude.ai or in Cowork by hand so the map is complete. They don’t get use counts.</p>' +
      '<label class="field"><span class="field__label">Name</span><input class="input" name="name" required maxlength="80" autocomplete="off"></label>' +
      '<label class="field"><span class="field__label">What it does</span><textarea class="textarea" name="description" rows="3" maxlength="500"></textarea></label>' +
      '<div class="field-row"><label class="field"><span class="field__label">Where it lives</span><input class="input" name="where" value="claude.ai" maxlength="80"></label>' +
      '<label class="field"><span class="field__label">Group</span><select class="select" name="area"><option value="">Not grouped yet</option>' + data.areas.map(function (a) { return '<option value="' + esc(a.key) + '">' + esc(a.label) + "</option>"; }).join("") + "</select></label></div></div>" +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Add to the map</button></div></form>');
    setTimeout(function () { const i = $("#genericBody [name=name]"); if (i) i.focus(); }, 30);
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    switch (action) {
      // connecting
      case "connect": store.connect().catch(function (err) { renderGate(err && err.kind === "wrong-folder" ? "That folder doesn't have a map in it. Choose the Small Business Toolkit folder." : ""); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      // Claude's jobs
      case "scan": startJob("scan"); break;
      case "group": startJob("group"); break;
      case "review": startJob("review"); break;
      // the map
      case "map-mode": state.mapMode = btn.getAttribute("data-mode"); remember("smos-map-mode", state.mapMode); renderView(); break;
      case "map-links": state.links = !state.links; remember("smos-links", state.links ? "on" : "off"); renderView(); break;
      case "map-fit": { const m = V.map.controls(); if (m) m.fit(); break; }
      case "map-origin": { const o = btn.getAttribute("data-origin"); const i = state.origins.indexOf(o); if (i > -1) state.origins.splice(i, 1); else state.origins.push(o); renderView(); break; }
      case "map-used": { const u = btn.getAttribute("data-used"); state.used = state.used === u ? "all" : u; renderView(); break; }
      case "map-attention": state.attention = !state.attention; renderView(); break;
      case "map-tag": { const t = btn.getAttribute("data-tag"); state.tag = state.tag === t ? "" : t; renderView(); break; }
      case "map-clear": state.origins = []; state.used = "all"; state.attention = false; state.tag = ""; renderView(); break;
      case "map-group": {
        const key = btn.getAttribute("data-group");
        const wantsArea = /^area:/.test(key);
        if (state.view !== "map" || (wantsArea && V.map.mode(ctx()) !== "area") || (!wantsArea && V.map.mode(ctx()) !== "source")) { state.mapMode = wantsArea ? "area" : "source"; }
        state.flyTo = "hub:" + key;
        if (state.view !== "map") go("map"); else renderView();
        openDrawer("group", key);
        break;
      }
      case "show-unused": state.used = "unused"; state.origins = []; state.attention = false; state.tag = ""; go("map"); break;
      case "show-on-map": showOnMap(id); break;
      case "show-group-on-map": state.flyTo = "hub:" + btn.getAttribute("data-group"); if (state.view !== "map") go("map"); else renderView(); break;
      case "locked-tool": { const t = document.querySelector('[data-locked-tool="' + btn.getAttribute("data-tool") + '"]'); if (t) t.click(); break; }
      // opening and closing the panel
      case "open-node": openDrawer("skill", id); break;
      case "close-drawer": closeDrawer(); break;
      // the table
      case "skills-sort": { const k = btn.getAttribute("data-key"); state.skillsSort = { key: k, dir: state.skillsSort.key === k && state.skillsSort.dir === "asc" ? "desc" : "asc" }; renderView(); break; }
      case "skills-attention": state.skillsAttention = !state.skillsAttention; renderView(); break;
      // changing things
      case "approve-areas": change(function (d) { mut.approveAreas(d); }).then(function () { ui.toast("Thanks. Your groups are saved"); }); break;
      case "rec-done": change(function (d) { mut.decideRec(d, id, "done"); }).then(function () { ui.toast("Marked done", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.decideRec(d, id, "open"); }); } }); }); break;
      case "rec-skip": change(function (d) { mut.decideRec(d, id, "skipped"); }).then(function () { ui.toast("Not now", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.decideRec(d, id, "open"); }); } }); }); break;
      case "remove-tag": change(function (d) { mut.removeTag(d, id, btn.getAttribute("data-tag")); }); break;
      case "add-manual": openAddManual(); break;
      case "remove-manual": {
        const n = M.nodeById(data, id);
        closeDrawer();
        change(function (d) { mut.removeManual(d, id); }).then(function () { ui.toast("Removed " + (n ? n.name : "the skill") + " from the map"); });
        break;
      }
      // everything else
      // the Skills / Files switch, folders and files
      case "lens": setLens(btn.getAttribute("data-lens")); break;
      case "scan-folders": startJob("scanfolders"); break;
      case "review-folders": startJob("reviewfolders"); break;
      case "drill": drill(id || null); break;
      case "drill-to": drill(id); break;
      case "up": up(); break;
      case "open-file": openDrawer("file", id); break;
      case "open-folder": openDrawer("folder", id); break;
      case "file-on-map": fileOnMap(id); break;
      case "ftype": { const t = btn.getAttribute("data-type"); state.ftype = state.ftype === t ? "" : t; state.pin = null; renderView(); break; }
      case "fworth": state.fworth = !state.fworth; state.pin = null; renderView(); break;
      case "fclear": state.ftype = ""; state.fworth = false; renderView(); break;
      case "flist-mode": state.flistMode = btn.getAttribute("data-mode"); state.ffinding = ""; state.fsort = state.flistMode === "folders" ? { key: "bytes", dir: "desc" } : { key: "bytes", dir: "desc" }; renderView(); break;
      case "files-sort": { const k = btn.getAttribute("data-key"); state.fsort = { key: k, dir: state.fsort.key === k && state.fsort.dir === "asc" ? "desc" : (k === "name" || k === "folder" || k === "type" ? "asc" : "desc") }; renderView(); break; }
      case "show-finding": showFinding(btn.getAttribute("data-key")); break;
      case "finding-on-map": findingOnMap(btn.getAttribute("data-key")); break;
      case "fix": {
        const lens = btn.getAttribute("data-lens"), key = btn.getAttribute("data-key"), rid = btn.getAttribute("data-id");
        if (!tdata) { ui.toast("The tidy-up list couldn\u2019t be found. Say \u201cTidy up\u201d to Claude in Claude Code", { icon: "alert", duration: 7000 }); break; }
        if (TM.waiting(tdata) || claude.jobs.indexOf("tidy") > -1) { ui.toast("Claude is already tidying. Give it a moment", { icon: "sparkle" }); break; }
        if (lens === "files") openFix(key === "rec" ? TM.filesRecPlan(fdata, fdata.recommendations.find(function (r) { return r.id === rid; })) : TM.filesPlan(fdata, key));
        else openFix(key === "recommendation" ? TM.skillsPlan(data, key, (data.recommendations.find(function (r) { return r.id === rid; }) || {}).nodeIds) : TM.skillsPlan(data, key));
        break;
      }
      case "fix-go": fixGo(); break;
      case "undo-tidy": undoTidy(id); break;
      case "frec-done": fchange(function (d) { FM.mut.decideRec(d, id, "done"); }).then(function () { ui.toast("Marked done", { actionLabel: "Undo", onAction: function () { fchange(function (d) { FM.mut.decideRec(d, id, "open"); }); } }); }); break;
      case "frec-skip": fchange(function (d) { FM.mut.decideRec(d, id, "skipped"); }).then(function () { ui.toast("Not now", { actionLabel: "Undo", onAction: function () { fchange(function (d) { FM.mut.decideRec(d, id, "open"); }); } }); }); break;
      case "settings": go("preferences"); break;
      case "pref-add-area": V.preferences.addAreaRow($("#prefAreas")); break;
      case "pref-remove-area": btn.closest(".pref-cat").remove(); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      case "copy":
        ui.copyText(btn.getAttribute("data-text")).then(function (ok) { ui.toast(ok ? "Copied. Paste it to Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" }); });
        break;
    }
  });

  // Moving between pages from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item, a[href^='#']");
    if (!link) return;
    const v = link.getAttribute("href").slice(1);
    if (V[v]) { e.preventDefault(); state.drawer = null; go(v); }
  });

  // The table's filter box changes only the rows, so typing never loses its place
  document.addEventListener("input", function (e) {
    if (!e.target.matches || !e.target.matches("[data-skills-q]")) return;
    state.skillsQuery = e.target.value;
    const rows = $("#skillRows"), count = $("#skillCount");
    if (rows) { rows.innerHTML = V.skills.rows(ctx()); if (count) count.textContent = V.skills.countText(ctx()); }
  });
  document.addEventListener("input", function (e) {
    if (!e.target.matches || !e.target.matches("[data-files-q]")) return;
    state.fq = e.target.value;
    const rows = $("#fileRows"), count = $("#fileCount");
    if (rows) { rows.innerHTML = state.flistMode === "folders" ? window.SM.fview.folderRows(ctx()) : window.SM.fview.fileRows(ctx()); if (count) count.textContent = window.SM.fview.countText(ctx()); }
  });
  document.addEventListener("change", function (e) {
    const t = e.target;
    if (t.matches && t.matches("[data-files-type]")) { state.ftype = t.value; renderView(); }
    if (t.matches && t.matches("[data-files-finding]")) { state.ffinding = t.value; renderView(); }
    if (t.matches && t.matches("[data-skills-origin]")) { state.skillsOrigin = t.value; renderView(); }
    if (t.matches && t.matches("[data-skill-area]")) {
      const id = t.getAttribute("data-id"), area = t.value;
      change(function (d) { mut.setArea(d, id, area); }).then(function () { ui.toast("Moved to " + (area ? M.areaByKey(data, area).label : "not grouped")); });
    }
  });

  document.addEventListener("submit", function (e) {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const kind = form.getAttribute("data-form");
    const f = form.elements;
    if (kind === "preferences") {
      const got = V.preferences.collect(form);
      if (got.error) return ui.toast(got.error, { icon: "alert", duration: 6000 });
      change(function (d) { mut.setSettings(d, got.values, got.areas); }).then(function () {
        const before = fdata ? fdata.settings.roots.join("\n") : "";
        return fchange(function (d) { FM.mut.setRoots(d, got.roots); }).then(function () {
          ui.toast(fdata && got.roots.join("\n") !== before ? "Preferences saved. Scan your folders again to use the new list" : "Preferences saved");
          renderChrome();
        });
      });
      return;
    }
    if (kind === "add-tag") {
      const id = form.getAttribute("data-id"), text = f.tag.value.trim();
      if (!text) return;
      change(function (d) { mut.addTag(d, id, text); });
      return;
    }
    if (kind === "add-manual") {
      const name = f.name.value.trim();
      if (!name) return f.name.focus();
      let made = null;
      generic.close();
      change(function (d) { made = mut.addManual(d, { name: name, description: f.description.value, where: f.where.value, area: f.area.value }); }).then(function () {
        ui.toast("Added " + name);
        if (made) openDrawer("skill", made.id);
      });
      return;
    }
    if (kind === "edit-manual") {
      const id = form.getAttribute("data-id");
      change(function (d) { mut.updateManual(d, id, { name: f.name.value, description: f.description.value, where: f.where.value }); }).then(function () { ui.toast("Saved"); });
    }
  });

  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  });

  // ============================================================
  // 7. Search
  // ============================================================

  const searchInput = $("#searchInput"), results = $("#searchResults");
  function renderResults() {
    if (!searchInput.value.trim()) { results.hidden = true; return; }
    if (state.lens === "files") {
      const r = fdata ? FM.search(fdata, searchInput.value) : [];
      results.innerHTML = r.length ? r.map(function (n) {
        return '<button type="button" class="menu-item" role="option" data-result="' + esc(n.id) + '" data-kind="' + n.kind + '">' + icon(n.kind === "folder" ? "folder" : "fileText") + '<span class="menu-item__text">' + esc(n.name) + '</span><span class="menu-item__sub">' + esc(n.path) + "</span></button>";
      }).join("") : '<p class="search-results__none">Nothing matches \u201c' + esc(searchInput.value.trim()) + "\u201d</p>";
      results.hidden = false;
      return;
    }
    const r = M.search(data, searchInput.value);
    results.innerHTML = r.length ? r.map(function (n) {
      return '<button type="button" class="menu-item" role="option" data-result="' + esc(n.id) + '">' + icon("sparkle") + '<span class="menu-item__text">' + esc(n.name) + '</span><span class="menu-item__sub">' + esc(n.source) + "</span></button>";
    }).join("") : '<p class="search-results__none">Nothing matches \u201c' + esc(searchInput.value.trim()) + "\u201d</p>";
    results.hidden = false;
  }
  searchInput.addEventListener("input", function () { if (data) renderResults(); });
  searchInput.addEventListener("focus", function () { if (data && searchInput.value) renderResults(); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { searchInput.value = ""; results.hidden = true; searchInput.blur(); }
    if (e.key === "Enter") { e.preventDefault(); const first = results.querySelector(".menu-item"); if (first) first.click(); }
    if (e.key === "ArrowDown") { const first = results.querySelector(".menu-item"); if (first) { e.preventDefault(); first.focus(); } }
  });
  results.addEventListener("keydown", function (e) {
    const items = Array.prototype.slice.call(results.querySelectorAll(".menu-item"));
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); if (i > 0) items[i - 1].focus(); else searchInput.focus(); }
  });
  results.addEventListener("click", function (e) {
    const b = e.target.closest(".menu-item");
    if (!b) return;
    results.hidden = true;
    searchInput.value = "";
    if (state.lens === "files") {
      if (b.dataset.kind === "folder") { drill(b.dataset.result); openDrawer("folder", b.dataset.result); }
      else fileOnMap(b.dataset.result);
      return;
    }
    state.flyTo = b.dataset.result;
    if (state.view === "map") { renderView(); }
    openDrawer("skill", b.dataset.result);
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".topbar__search")) results.hidden = true; });

  // ============================================================
  // 8. Keyboard shortcuts
  // ============================================================

  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return;
      if (state.drawer) { closeDrawer(); return; }
      document.body.classList.remove("sidebar-open");
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    else if (e.key === "f" || e.key === "F") { const m = V.map.controls(); if (m && state.view === "map") { e.preventDefault(); m.fit(); } }
    else if (e.key === "s" || e.key === "S") { e.preventDefault(); startJob(state.lens === "files" ? "scanfolders" : "scan"); }
    else if (e.key === "t" || e.key === "T") { e.preventDefault(); setLens(state.lens === "files" ? "skills" : "files"); }
    else if ((e.key === "u" || e.key === "U") && state.lens === "files" && state.view === "map") { e.preventDefault(); up(); }
    else if (/^[1-9]$/.test(e.key)) { const v = VIEW_ORDER[Number(e.key) - 1]; if (v) go(v); }
  });

  // ============================================================
  // Start
  // ============================================================

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });

  const fromHash = location.hash.slice(1);
  let lastView = null;
  try { lastView = localStorage.getItem("smos-view"); } catch (e) { lastView = null; }
  state.view = V[fromHash] ? fromHash : V[lastView] ? lastView : "map";
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  // Which toolkit tools exist and which are in this folder (for the Gaps page)
  function loadToolkit() {
    Promise.all([
      fetch("../shared/catalogue.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; }),
      fetch("../installed.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; })
    ]).then(function (both) {
      toolkit.tools = Array.isArray(both[0].tools) ? both[0].tools : [];
      toolkit.installed = {};
      (both[1].tools || []).forEach(function (t) { if (t && t.id) toolkit.installed[t.id] = true; });
      if (inApp() && state.view === "gaps") renderView();
    }).catch(function () { /* opened without the helper: the Gaps page just leaves the tool hints out */ });
  }

  renderGate();
  store.start().then(function () {
    tstore.start().catch(function () { /* no tidy-up list yet: the Fix buttons stay out of sight */ });
    fstore.start().catch(function () { /* no folder map file yet: the Files side shows its welcome card */ });
    loadToolkit();
    if (store.isHelper()) fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) { if ((st.running || st.queued) && /^skill-map:/.test(st.job || "")) { claude.jobs.push(/tidy-up/.test(st.job) ? "tidy" : /scan-my-folders/.test(st.job) ? "scanfolders" : /review-my-folders/.test(st.job) ? "reviewfolders" : /scan/.test(st.job) ? "scan" : /group/.test(st.job) ? "group" : "review"); watchClaude(); } }).catch(function () {});
    if (/^https?:$/.test(location.protocol)) fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { C.setFolder(info.folder); }).catch(function () {});
  });
})();
