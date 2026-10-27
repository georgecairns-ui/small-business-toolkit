/*
  PIPELINE OS: the app
  --------------------
  Ties everything together:
  1. Connects to data/pipeline.json through the shared store.
  2. Shows the welcome screen until the pipeline is running, then the app.
  3. Moves between pages (Pipeline, Review, Calls, People, Preferences) using the address bar,
     so Back and Forward work.
  4. Handles every button, form, drag and keyboard shortcut. Every change goes through change(),
     which saves it into the pipeline file for Claude to read.
  5. Call notes: saved on the deal, then the helper asks Claude to read them straight away
     (the "update-deals" job in claude-jobs.json). If Claude can't be started from here, the
     notes wait and an Open in Claude button does the same with one click.

  The rule throughout: Claude proposes and drafts, the person decides and sends.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c, V = window.PL.views, Drawer = window.PL.drawer, L = window.PL.links;
  const mut = M.mut;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Number keys 1 to 4 follow the sidebar
  const VIEW_ORDER = ["pipeline", "review", "calls", "people"];

  function remembered(key, allowed) {
    try { const v = localStorage.getItem(key); return allowed.indexOf(v) > -1 ? v : null; } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  // ---------- Screen state (not saved to the file) ----------
  const state = {
    view: "pipeline",
    pipeView: remembered("plos-pipe-view", ["board", "list"]) || "board",
    reviewGrade: remembered("plos-review-grade", ["all", "high", "medium", "low"]) || "all",
    peopleGroup: remembered("plos-people-group", ["clients", "prospects", "untouched", "quiet", "lost"]) || "",
    drawer: null
  };
  // Deals Claude is updating right now (from call notes), so the panel can say so
  const claude = { dealIds: [], research: [], sends: [], timer: null };

  let data = null;
  let status = "checking";
  let statusDetail = {};
  const seen = new Set();
  let stagger = 0;

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "pipeline",
    fileName: "pipeline.json",
    dataPaths: ["data", "", "apps/pipeline/data"],
    api: "/api/data/pipeline/pipeline.json",
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
      if (reason === "load") { seen.clear(); state.drawer = null; }
      render();
      // While Claude reads call notes, the "deal updated" message says it instead
      if (reason === "external" && !claude.dealIds.length) ui.toast("Claude updated your pipeline", { icon: "sparkle" });
    }
  });

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
    if (kind === "bad-file") return { title: "Your pipeline file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in pipeline.backup.json next to it.", say: "Please check my pipeline.json file and fix it", short: "Your pipeline file needs a quick fix" };
    if (kind === "missing") return { title: "Your pipeline file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My pipeline file seems to be missing, please check it", short: "Your pipeline file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your pipeline has stopped running.", body: "Everything is saved. In Claude, say “open my pipeline” and it starts again. This page reconnects by itself.", say: "Open my pipeline", short: "Your pipeline has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }

  // ============================================================
  // 2. Before the pipeline is running: welcome, loading, problems
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }
  function gateCard(art, eyebrow, title, body, actions, small) {
    return '<div class="gate__card">' +
      '<div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Pipeline OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + title + "</h1>" + body +
      '<div class="gate__actions">' + actions + "</div>" + (small ? '<p class="gate__small">' + small + "</p>" : "") + "</div>" +
      '<div class="gate__art"><img src="' + C.ART[art] + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate(message) {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your pipeline"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("welcome", "", "Your pipeline opens from Claude.",
        "<p>Claude runs your pipeline on this computer and gives you a link to it. In Claude Code, in your Small Business Toolkit folder, just say:</p>" + C.say("Open my pipeline") +
        '<p class="gate__note">Not set up yet? Say <strong>/setup</strong> instead. Claude asks about your business and the people you sell to, connects your email, calendar and calls, and builds your pipeline first.</p>',
        "",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("shrug", "One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("welcome", "Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my pipeline</button>", "Folder: " + esc(statusDetail.folderName || "")));
    }
    if (status === "error" && !data) {
      const f = friendlyError(statusDetail.error);
      return showGate(gateCard("shrug", "Something needs a look", esc(f.title), "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
        '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
    }
    showGate(gateCard("welcome", "One-time setup", "The pipeline that chases itself. <span class=\"accent\">Approved by you.</span>",
      "<p>Claude writes up your sales calls, checks every deal, tells you what to do next and drafts the email back. Everything lands here for you to approve. It all lives in a file on your own computer.</p>" +
      '<ol class="gate__steps"><li><span>Click <strong>Connect your pipeline</strong>.</span></li><li><span>Choose your <strong>Pipeline OS</strong> folder, the one with START-HERE.md in it.</span></li><li><span>When Chrome asks to let this page edit files, click <strong>Allow</strong>.</span></li></ol>' +
      (message ? '<p class="gate__error" role="alert">' + icon("alert") + esc(message) + "</p>" : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your pipeline</button>",
      "No account, nothing to install. Your deals never leave your computer."));
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

  function anim(key) {
    if (seen.has(key)) return "";
    seen.add(key);
    return ' enter" style="--i:' + Math.min(stagger++, 12);
  }
  function storeInfo() {
    return { canChange: !store.isHelper(),
      folder: store.isHelper() ? "Your Pipeline OS folder, on this computer" : store.folderName() };
  }
  function ctx() { return { d: data, state: state, anim: anim, actions: viewActions, storeInfo: storeInfo, claude: claude }; }

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
    const counts = {
      pipeline: M.openDeals(data).length,
      review: M.reviewCount(data),
      calls: data.calls.filter(function (c) { return c.noTranscript; }).length,
      people: M.allPeople(data).length
    };
    document.querySelectorAll("[data-count]").forEach(function (el) { const n = counts[el.getAttribute("data-count")]; el.textContent = n ? n : ""; });
    document.querySelectorAll(".nav__item").forEach(function (a) {
      const on = a.getAttribute("data-view") === state.view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const n = M.numbers(data);
    $("#savedMini").innerHTML = '<span class="saved-mini__value num">' + esc(M.money(data, n.pipeline)) + '</span><span class="saved-mini__label">in your pipeline</span>';
  }

  function renderView() {
    const view = V[state.view] || V.pipeline;
    const root = $("#view");
    const c = ctx();
    const scroll = root.scrollTop;
    stagger = 0;
    root.innerHTML = view.render(c);
    root.setAttribute("data-view", state.view);
    if (view.bind) view.bind(root, c);
    root.scrollTop = scroll;
    $("#viewTitle").textContent = view.title(c);
    $("#viewSub").textContent = view.sub ? view.sub(c) : "";
    document.title = view.title(c) + " · Pipeline OS";
  }

  // The record panel
  let drawerKey = null;
  function renderDrawer() {
    const el = $("#drawer");
    if (!state.drawer) { el.hidden = true; document.body.classList.remove("has-drawer"); drawerKey = null; return; }
    const key = state.drawer.kind + ":" + state.drawer.id;
    const active = document.activeElement;
    // Don't redraw under someone's fingers while they type in the panel
    if (key === drawerKey && active && el.contains(active) && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && /text|email|tel|search|number/.test(active.type)))) return;
    // Keep half-typed call notes when the panel redraws
    const typed = $("#dealNotes") ? $("#dealNotes").value : "";
    const html = Drawer.render(ctx(), state.drawer);
    if (!html) { state.drawer = null; return renderDrawer(); }
    el.innerHTML = html;
    Drawer.bind(el, ctx(), state.drawer);
    if (key === drawerKey && typed && $("#dealNotes")) $("#dealNotes").value = typed;
    const opening = el.hidden;
    el.hidden = false;
    document.body.classList.add("has-drawer");
    if (opening) { el.classList.remove("is-open"); void el.offsetWidth; el.classList.add("is-open"); }
    drawerKey = key;
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
    if (!V[view]) view = "pipeline";
    if (view !== state.view) seen.clear();
    state.view = view;
    remember("plos-view", view);
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderView(); $("#view").scrollTop = 0; }
  }
  window.addEventListener("hashchange", function () { const v = location.hash.slice(1); if (v && v !== state.view) go(v); });

  // ============================================================
  // 5. Call notes, and asking Claude to read them
  // ============================================================

  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  // Claude's 3 jobs (claude-jobs.json): read call notes, send the emails the person approved, and
  // research the people they're meeting. The app asks the helper to start one; it never sends the
  // words Claude follows, only the job's name.
  const JOBS = {
    notes: { name: "update-deals", doing: "Claude is updating your deal" },
    send: { name: "send-emails", doing: "Claude is sending your email" },
    research: { name: "research-deals", doing: "Claude is researching" }
  };
  // Resolves true if Claude was started (or queued)
  function askClaude(kind, dealId, extra) {
    if (!store.isHelper()) return Promise.resolve(false);
    return fetch("/api/claude/run/pipeline/" + JOBS[kind].name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (r.status !== 202) return false;
        const list = kind === "notes" ? claude.dealIds : kind === "research" ? claude.research : claude.sends;
        const item = kind === "send" ? extra : dealId;
        if (item && list.indexOf(item) === -1) list.push(item);
        watchClaude();
        return true;
      })
      .catch(function () { return false; });
  }
  function claudeDoing() {
    if (claude.sends.length) return JOBS.send.doing;
    if (claude.dealIds.length) return JOBS.notes.doing;
    if (claude.research.length) return JOBS.research.doing;
    return "Claude is working";
  }
  function watchClaude() {
    setClaudeStatus(claudeDoing());
    renderDrawer();
    clearInterval(claude.timer);
    claude.timer = setInterval(function () {
      fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
        if (st.running || st.queued) { setClaudeStatus(claudeDoing()); return; }
        clearInterval(claude.timer);
        // Give the app a moment to pick up what Claude saved, then say how it went
        setTimeout(finishedClaude, 2500);
      }).catch(function () { /* helper briefly unavailable; keep watching */ });
    }, 3000);
  }
  // Read the file fresh to say how it went (the app's own refresh pauses while its tab is hidden)
  function finishedClaude() {
    fetch("/api/data/pipeline/pipeline.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (fresh) { reportClaude(fresh ? M.normalise(fresh) : data); }, function () { reportClaude(data); });
  }
  function reportClaude(now) {
    const data = now;
    const notes = claude.dealIds.splice(0), research = claude.research.splice(0), sends = claude.sends.splice(0);
    notes.forEach(function (id) {
      const x = M.dealById(data, id);
      if (!x) return;
      if (!M.notesWaiting(x).length) ui.toast("Claude has updated " + x.title + ": next steps, the deal check and the email back are ready", { icon: "sparkle", duration: 9000, actionLabel: "Open it", onAction: function () { openDrawer("deal", x.id); } });
      else ui.toast("Claude couldn't finish " + x.title + ". Your notes are safe; press Open in Claude on the deal to try again", { icon: "info", duration: 9000 });
    });
    sends.forEach(function (key) {
      const parts = key.split(":"), holder = parts[0] === "deal" ? M.dealById(data, parts[1]) : M.suggestionById(data, parts[1]);
      const e = holder && holder.email;
      if (!e) return;
      if (e.sendStatus === "sent") ui.toast("Claude sent your email to " + (e.to || "them"), { icon: "check", duration: 7000 });
      else ui.toast("That email wasn't sent" + (e.sendError ? ": " + e.sendError : "") + ". Press I'll do it to send it yourself", { icon: "alert", duration: 10000 });
    });
    research.forEach(function (id) {
      const x = M.dealById(data, id);
      if (!x) return;
      if (x.research && x.research.researchedAt && (!x.researchRequestedAt || x.research.researchedAt >= x.researchRequestedAt)) ui.toast("Claude has researched " + (x.organisation || x.title) + ". See Who you're meeting on the deal", { icon: "sparkle", duration: 8000, actionLabel: "Open it", onAction: function () { openDrawer("deal", x.id); } });
      else ui.toast("Claude couldn't finish the research. Try again from the deal", { icon: "info", duration: 8000 });
    });
  }

  // ---------- Brain dump (shared, ../shared/js/braindump.js) ----------
  // The button, V and the sorting are shared by every tool. Pipeline OS adds "A deal..." and
  // "A person..." to "What's it about?", and starts with the deal that's open, if one is.
  if (window.TaskListOS.brainDump) window.TaskListOS.brainDump.register("pipeline", {
    pickers: function () {
      if (!data) return [];
      const deals = M.openDeals(data).concat(data.deals.filter(M.isSuggested)).sort(function (a, b) { return a.title.localeCompare(b.title); });
      return [
        { type: "deal", label: "A deal\u2026", items: deals.map(function (x) { return { id: x.id, label: x.organisation ? x.organisation + ": " + x.title : x.title }; }) },
        { type: "person", label: "A person\u2026", items: M.allPeople(data).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (p) { return { id: p.id, label: C.personLabel(p) }; }) }
      ];
    },
    preset: function () {
      const x = data && state.drawer && state.drawer.kind === "deal" ? M.dealById(data, state.drawer.id) : null;
      return x ? { type: "deal", id: x.id, label: x.title, tool: "pipeline" } : null;
    }
  });

  // ---------- Sending: Claude emails, or I'll do it ----------
  function sendHolder(where, id) { return where === "deal" ? M.dealById(data, id) : M.suggestionById(data, id); }
  function openSendConfirm(where, id) {
    const h = sendHolder(where, id);
    if (!h || !h.email) return;
    const e = h.email;
    const from = L.emailLabel(data.settings.emailProvider);
    openGeneric('<form data-form="claude-send" data-where="' + esc(where) + '" data-id="' + esc(id) + '" autocomplete="off">' + modalHead("Claude emails this for you") + '<div class="modal__body send-confirm">' +
      '<label class="field"><span class="field__label">To</span><input class="input" name="to" required maxlength="300" value="' + esc(e.to || "") + '"></label>' +
      '<label class="field"><span class="field__label">Subject</span><input class="input" name="subject" maxlength="200" value="' + esc(e.subject || "") + '"></label>' +
      '<label class="field"><span class="field__label">Email</span><textarea class="textarea" name="body" rows="10" maxlength="10000">' + esc(e.body || "") + "</textarea></label>" +
      '<p class="send-confirm__note">' + icon("info") + "<span>Check it, change anything you like, then press Send. Claude sends exactly this, from your " + esc(from === "your email app" ? "email" : from) + ", within a minute or 2. It only ever sends emails you've sent this way.</span></p>" +
      '</div><div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">' + icon("sparkle") + "Send</button></div></form>");
  }
  function selfSend(where, id) {
    const h = sendHolder(where, id);
    if (!h || !h.email) return;
    openDraft(h.email, function () {
      if (where === "deal") change(function (d) { mut.emailOpened(d, id); }); else change(function (d) { mut.suggestionOpened(d, id); });
      ui.toast("Your email is open in " + L.emailLabel(data.settings.emailProvider) + ". Check it and press send", { icon: "mail", duration: 9000, actionLabel: "I sent it", onAction: function () {
        change(function (d) {
          if (where === "deal") mut.emailSent(d, id);
          else { const sg = M.suggestionById(d, id); if (sg) { sg.email.sentAt = new Date().toISOString(); mut.decide(d, id, "approve"); } }
        });
      } });
    });
  }
  function linkedinOpen(where, id) {
    const h = sendHolder(where, id);
    const msg = h && h.linkedin;
    if (!msg) return;
    ui.copyText(msg.body || "").then(function (ok) {
      if (msg.profileUrl && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(msg.profileUrl)) window.open(msg.profileUrl, "_blank", "noopener");
      ui.toast((ok ? "Message copied. " : "") + "Press Message on their LinkedIn profile, paste it and send", { icon: "external", duration: 10000, actionLabel: "I sent it", onAction: function () {
        change(function (d) { const r = where === "deal" ? M.dealById(d, id) : M.suggestionById(d, id); if (r && r.linkedin) r.linkedin.sentAt = new Date().toISOString(); if (where === "suggestion") mut.decide(d, id, "approve"); });
      } });
    });
  }
  function saveNotes(dealId, text, fileName) {
    if (!String(text || "").trim()) return Promise.resolve(false);
    return change(function (d) { mut.addNotes(d, dealId, text, fileName); }).then(function () {
      return askClaude("notes", dealId);
    }).then(function (started) {
      if (started) ui.toast("Got it. Claude is reading your notes now", { icon: "sparkle", duration: 6000 });
      else ui.toast("Notes saved on the deal. Press Open in Claude on it, or say “update my deals” to Claude", { icon: "info", duration: 8000 });
      return true;
    });
  }
  // A text file of notes or a transcript, read here on this computer
  function readNotesFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error("no file"));
      if (file.size > 2 * 1024 * 1024) return reject(new Error("That file is too big. Paste the important part instead."));
      if (!/\.(txt|md|vtt|srt|csv)$/i.test(file.name) && file.type && file.type.indexOf("text/") !== 0) return reject(new Error("That isn't a text file. For a Word document or PDF, copy the text and paste it in."));
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { reject(new Error("That file couldn't be read.")); };
      r.readAsText(file);
    });
  }

  // ============================================================
  // 6. What the pages ask the app to do
  // ============================================================

  const viewActions = {
    setStage: function (id, stage) {
      const x = M.dealById(data, id);
      if (!x || x.stage === stage) return;
      const from = x.stage;
      change(function (d) { mut.setStage(d, id, stage, "you"); }).then(function () {
        ui.toast(stage === "won" ? "Marked won. Nice work" : "Moved to " + M.stageLabel(stage), { icon: stage === "won" ? "sparkle" : "check", actionLabel: "Undo", onAction: function () { change(function (d) { mut.setStage(d, id, from, "you"); }); } });
      });
    },
    updateDeal: function (id, fields) { change(function (d) { mut.updateDeal(d, id, fields); }); },
    updatePerson: function (id, fields) { change(function (d) { mut.updatePerson(d, id, fields); }); },
    addPersonToDeal: function (id, name) {
      change(function (d) {
        const x = M.dealById(d, id);
        const p = mut.personByName(d, name);
        if (x && p && x.personIds.indexOf(p.id) === -1) x.personIds.push(p.id);
      }).then(function () { ui.toast(name + " added to the deal"); });
    },
    notesFromFile: function (id, file) {
      readNotesFile(file).then(function (text) { return saveNotes(id, text, file.name); })
        .catch(function (err) { ui.toast(err.message || "That file couldn't be read", { icon: "alert", duration: 7000 }); });
    }
  };

  function openDraft(email, after) {
    L.open(L.composeUrl(email, data.settings.emailProvider || "gmail"));
    if (after) after();
  }

  // ---------- Pop-ups ----------
  const generic = document.createElement("dialog");
  generic.className = "modal";
  generic.id = "genericDialog";
  generic.setAttribute("aria-labelledby", "genericTitle");
  document.body.appendChild(generic);
  function openGeneric(html) { generic.innerHTML = html; generic.showModal(); const f = generic.querySelector("textarea, input:not([type=hidden]), select"); if (f) f.focus(); }
  function modalHead(title) { return '<div class="modal__head"><h2 id="genericTitle">' + esc(title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>"; }
  function peopleList(id) { return '<datalist id="' + id + '">' + M.allPeople(data).map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.organisation || "") + "</option>"; }).join("") + "</datalist>"; }

  function openAddDeal(preset) {
    const p = preset || {};
    const person = p.personId ? M.personById(data, p.personId) : null;
    openGeneric('<form data-form="add-deal" autocomplete="off">' + modalHead("New deal") + '<div class="modal__body">' +
      '<label class="field"><span class="field__label">What is it?</span><input class="input input--title" name="title" required maxlength="160" placeholder="New website for Hollins Lettings"></label>' +
      '<div class="field-row"><label class="field"><span class="field__label">Business</span><input class="input" name="organisation" maxlength="80" value="' + esc(person ? person.organisation || "" : "") + '"></label>' +
      '<label class="field"><span class="field__label">Who you\'re talking to</span><input class="input" name="person" list="dealPeople" maxlength="80" value="' + esc(person ? person.name : "") + '">' + peopleList("dealPeople") + "</label></div>" +
      '<div class="field-row"><label class="field"><span class="field__label">Roughly worth</span><input class="input num" type="number" name="value" min="0" step="50" placeholder="0"></label>' +
      '<label class="field"><span class="field__label">Stage</span><select class="select" name="stage">' + C.stageOptions(M.openStages()[0].key, true) + "</select></label></div>" +
      '<label class="field"><span class="field__label">Call notes (optional)</span><textarea class="textarea" name="notes" rows="4" maxlength="60000" placeholder="Paste notes from a call and Claude fills the deal in"></textarea></label>' +
      '</div><div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Add deal</button></div></form>');
  }

  function openAddNotes(dealId) {
    const deals = M.openDeals(data).sort(function (a, b) { return a.title.localeCompare(b.title); });
    const pick = dealId || (state.drawer && state.drawer.kind === "deal" ? state.drawer.id : "");
    openGeneric('<form data-form="add-notes" autocomplete="off">' + modalHead("Add call notes") + '<div class="modal__body">' +
      '<label class="field"><span class="field__label">Which deal?</span><select class="select" name="deal">' +
      deals.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === pick ? " selected" : "") + ">" + esc(x.title) + "</option>"; }).join("") +
      '<option value="__new"' + (deals.length ? "" : " selected") + ">A new deal…</option></select></label>" +
      '<label class="field" data-new-deal' + (deals.length ? " hidden" : "") + '><span class="field__label">Name the new deal</span><input class="input" name="newTitle" maxlength="160" placeholder="Website for Bramble & Co"></label>' +
      '<label class="field"><span class="field__label">Your notes or the transcript</span><textarea class="textarea" name="notes" rows="8" maxlength="60000" placeholder="Rough notes are fine: who was there, what they need, what it\'s costing them, what you agreed"></textarea></label>' +
      '<label class="btn btn--ghost btn--sm notes__file">' + icon("folder") + 'Or choose a text file<input type="file" name="file" accept=".txt,.md,.vtt,.srt,.csv,text/plain" hidden></label>' +
      '<p class="field__hint">Claude reads them straight away and fills in the deal check, next steps and an email back to them. Nothing is sent.</p>' +
      '</div><div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">' + icon("sparkle") + "Update the deal</button></div></form>");
    const form = generic.querySelector("form");
    form.deal.addEventListener("change", function () { form.querySelector("[data-new-deal]").hidden = form.deal.value !== "__new"; });
    form.file.addEventListener("change", function () {
      const f = form.file.files[0];
      readNotesFile(f).then(function (text) { form.notes.value = text; form.dataset.fileName = f.name; })
        .catch(function (err) { ui.toast(err.message, { icon: "alert", duration: 7000 }); });
    });
  }

  function openAddPerson() {
    openGeneric('<form data-form="add-person" autocomplete="off">' + modalHead("Add person") +
      '<div class="modal__body"><div class="field-row"><label class="field"><span class="field__label">Name</span><input class="input" name="name" required maxlength="80"></label>' +
      '<label class="field"><span class="field__label">Business or organisation</span><input class="input" name="organisation" maxlength="80"></label></div>' +
      '<div class="field-row"><label class="field"><span class="field__label">Type</span><select class="select" name="role">' + M.ROLES.map(function (r) { return '<option value="' + r.key + '">' + r.label + "</option>"; }).join("") + "</select></label>" +
      '<label class="field"><span class="field__label">Email</span><input class="input" type="email" name="email" maxlength="120"></label></div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Add person</button></div></form>');
  }

  // Email a whole group from People. 2 ways, and the person sends either way:
  //   one email to everyone, opened in their email with every address in Bcc
  //   a personal email to each, written by Claude and put in Review to check and send one by one
  function groupPrompt(g, topic) {
    return "In Pipeline OS, write a short personal email to each person in my \u201c" + g.label + "\u201d group on the People page" +
      (topic ? ", about: " + topic : "") + ". Use what you know about each person and their deal (apps/pipeline/data/pipeline.json, context/sales.md) and write in my voice (context/voice.md, .claude/skills/human-email). " +
      "Add each one as a suggestion of kind \"email\" with the draft, so I can check and send them from Review. Don't send anything.";
  }
  function openGroupEmail(key) {
    const g = M.GROUPS.find(function (x) { return x.key === key; });
    if (!g) return;
    const list = M.peopleGroups(data)[key];
    const emails = list.filter(function (p) { return p.email; }).map(function (p) { return p.email; });
    const missing = list.filter(function (p) { return !p.email; });
    const where = L.emailLabel(data.settings.emailProvider);
    openGeneric('<form data-form="group-email" data-group="' + esc(key) + '" data-emails="' + esc(emails.join(", ")) + '" autocomplete="off">' + modalHead("Email " + g.label.toLowerCase()) + '<div class="modal__body">' +
      '<p class="gmail__who">' + icon("users") + "<span><strong>" + emails.length + (emails.length === 1 ? " person" : " people") + "</strong> with an email address" +
      (missing.length ? ". No address for " + esc(missing.map(function (p) { return p.name; }).join(", ")) : "") + ".</span></p>" +
      '<section class="gmail__way"><h3>A personal email to each, written by Claude</h3><p class="muted">Claude writes a short email to each person, using what it knows about them and their deal, and puts them in Review. You check each one and send it. Best for prospects and anyone gone quiet.</p>' +
      '<label class="field"><span class="field__label">What\'s it about? (optional)</span><input class="input" name="topic" maxlength="200" placeholder="Our new winter offer, a check-in, a case study"></label>' +
      '<a class="btn" data-group-claude href="' + esc(C.claudeLink(groupPrompt(g, ""))) + '">' + icon("sparkle") + "Ask Claude to write them</a></section>" +
      '<section class="gmail__way"><h3>One email to everyone</h3>' +
      '<label class="field"><span class="field__label">Subject</span><input class="input" name="subject" maxlength="200"></label>' +
      '<label class="field"><span class="field__label">Message</span><textarea class="textarea" name="body" rows="6" maxlength="8000" placeholder="Hi,\n\n..."></textarea></label>' +
      '<p class="field__hint">Opens in ' + esc(where) + ' with everyone in Bcc, so nobody sees anyone else\'s address. Nothing is sent until you press send there. For a marketing email, include a line saying how to opt out.</p>' +
      '<div class="gmail__actions"><button type="submit" class="btn btn--primary">' + icon("mail") + "Open in " + esc(where) + '</button><button type="button" class="btn btn--ghost" data-action="group-email-copy">Copy the addresses</button></div></section>' +
      '</div><div class="modal__foot"><span class="spacer"></span><button type="button" class="btn" data-close>Close</button></div></form>');
    const form = generic.querySelector("form");
    form.topic.addEventListener("input", function () { form.querySelector("[data-group-claude]").href = C.claudeLink(groupPrompt(g, form.topic.value.trim())); });
  }

  function closeWith(id, how) {
    const x = M.dealById(data, id);
    if (!x) return;
    if (how === "lost") {
      openGeneric('<form data-form="mark-lost" data-deal="' + esc(id) + '" autocomplete="off">' + modalHead("Mark as lost") + '<div class="modal__body">' +
        '<label class="field"><span class="field__label">Why did it go? (optional)</span><input class="input" name="reason" maxlength="160" placeholder="Went with someone cheaper, timing, went quiet"></label>' +
        '<p class="field__hint">Claude uses this to spot patterns and get better at qualifying deals early.</p></div>' +
        '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Mark lost</button></div></form>');
      return;
    }
    viewActions.setStage(id, "won");
  }

  // ============================================================
  // 7. Clicks, forms and changes
  // ============================================================

  document.addEventListener("click", function (e) {
    const closer = e.target.closest("[data-close]");
    if (closer) { const dlg = closer.closest("dialog"); if (dlg) dlg.close(); return; }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const dealEl = btn.closest("[data-deal]");
    const dealId = btn.getAttribute("data-deal") || (dealEl && dealEl.getAttribute("data-deal"));
    const sEl = btn.closest("[data-suggestion]");
    const sId = sEl && sEl.getAttribute("data-suggestion");
    const row = btn.closest(".proposal");
    const leave = function (fn) {
      if (row && !ui.prefersReducedMotion()) { row.classList.add("is-approved", "is-leaving"); setTimeout(fn, 280); } else fn();
    };

    switch (action) {
      case "connect":
        store.connect().catch(function (err) {
          renderGate(err && err.kind === "wrong-folder" ? "That folder doesn't have your pipeline in it. Choose your Small Business Toolkit folder, the one with START-HERE.md in it." : "That didn't work. Please try again, and click Allow when Chrome asks.");
        });
        break;
      case "reconnect": store.reconnect().catch(function () { renderGate(); }); break;
      case "change-folder": data = null; store.forget(); break;
      case "retry": store.retry(); break;

      case "open-deal": if (dealId) openDrawer("deal", dealId); break;
      case "open-person": openDrawer("person", btn.getAttribute("data-person") || (btn.closest("[data-person]") || btn).getAttribute("data-person")); break;
      case "open-call": openDrawer("call", btn.closest("[data-call]").getAttribute("data-call")); break;
      case "close-drawer": closeDrawer(); break;
      case "add-deal": openAddDeal(); break;
      case "add-deal-person": openAddDeal({ personId: btn.closest("[data-person]").getAttribute("data-person") }); break;
      case "add-notes": openAddNotes(dealId); break;
      case "add-person": openAddPerson(); break;
      case "pipe-view": state.pipeView = btn.getAttribute("data-value"); remember("plos-pipe-view", state.pipeView); seen.clear(); renderView(); break;
      case "review-grade": state.reviewGrade = btn.getAttribute("data-value"); remember("plos-review-grade", state.reviewGrade); seen.clear(); renderView(); break;
      case "people-group": {
        const g = btn.getAttribute("data-group") || "";
        state.peopleGroup = state.peopleGroup === g ? "" : g;
        remember("plos-people-group", state.peopleGroup);
        seen.clear(); renderView(); break;
      }
      case "group-copy": {
        const list = state.peopleGroup ? M.peopleGroups(data)[state.peopleGroup] : [];
        const emails = list.filter(function (p) { return p.email; }).map(function (p) { return p.email; });
        ui.copyText(emails.join(", ")).then(function (ok) { ui.toast(ok ? emails.length + " addresses copied" : "Couldn't copy"); });
        break;
      }
      case "group-email": openGroupEmail(btn.getAttribute("data-group")); break;
      case "group-email-copy": {
        const f = generic.querySelector("form");
        ui.copyText(f.dataset.emails).then(function (ok) { ui.toast(ok ? "Addresses copied. Paste them into Bcc" : "Couldn't copy"); });
        break;
      }

      // the deal panel
      case "save-notes": {
        const ta = $("#dealNotes");
        if (!ta || !ta.value.trim()) { if (ta) ta.focus(); break; }
        const text = ta.value;
        ta.value = "";
        saveNotes(dealId, text, "").then(function (ok) { if (!ok) { const t = $("#dealNotes"); if (t) t.value = text; } }).catch(function () { const t = $("#dealNotes"); if (t) t.value = text; });
        break;
      }
      case "step-done": {
        const i = Number(btn.getAttribute("data-step"));
        const x = M.dealById(data, dealId);
        if (x && x.nextSteps[i]) change(function (d) { mut.setNextStepDone(d, dealId, i, !x.nextSteps[i].done); });
        break;
      }
      case "copy-email": { const x = M.dealById(data, dealId); if (x && x.email) ui.copyText(x.email.body || "").then(function (ok) { ui.toast(ok ? "Email copied" : "Couldn't copy"); }); break; }
      // Sending: Claude emails (after the person checks it) or I'll do it
      case "claude-send": {
        openSendConfirm(btn.getAttribute("data-send-where"), btn.getAttribute("data-send-id"));
        break;
      }
      case "self-send": selfSend(btn.getAttribute("data-send-where"), btn.getAttribute("data-send-id")); break;
      case "cancel-send": {
        const w = btn.getAttribute("data-send-where"), id = btn.getAttribute("data-send-id");
        change(function (d) { mut.cancelSend(d, w, id); }).then(function () { ui.toast("Stopped. It won't be sent unless you ask again"); });
        break;
      }
      case "linkedin-open": linkedinOpen(btn.getAttribute("data-send-where"), btn.getAttribute("data-send-id")); break;
      case "research-deal": {
        change(function (d) { mut.requestResearch(d, dealId); }).then(function () { return askClaude("research", dealId); }).then(function (started) {
          ui.toast(started ? "Claude is researching them now" : "Asked. Claude researches them on its next check-in, or say \u201cresearch my next call\u201d", { icon: "sparkle", duration: 7000 });
        });
        break;
      }
      case "mark-won": closeWith(dealId, "won"); break;
      case "mark-lost": closeWith(dealId, "lost"); break;
      case "reopen-deal": viewActions.setStage(dealId, M.openStages()[M.openStages().length - 1].key); break;
      case "delete-deal": {
        let removed = null;
        closeDrawer();
        change(function (d) { removed = mut.deleteDeal(d, dealId); }).then(function () {
          ui.toast("Deal deleted", { icon: "trash", actionLabel: "Undo", onAction: function () { change(function (d) { mut.restoreDeal(d, removed); }); } });
        });
        break;
      }

      // Claude's moves and suggestions
      case "undo-move": {
        const x = M.dealById(data, dealId);
        const back = x && x.moved ? M.stageLabel(x.moved.from) : "";
        change(function (d) { mut.undoMove(d, dealId); }).then(function () { ui.toast("Moved back to " + back); });
        break;
      }
      case "approve-deal": leave(function () { change(function (d) { mut.approveDeal(d, dealId); }).then(function () { ui.toast("Added to your pipeline", { icon: "check" }); }); }); break;
      case "skip-deal": {
        const x = M.dealById(data, dealId);
        const stage = x ? x.stage : M.openStages()[0].key;
        if (state.drawer && state.drawer.id === dealId) closeDrawer();
        leave(function () { change(function (d) { mut.skipDeal(d, dealId); }).then(function () { ui.toast("Skipped. Claude won't suggest it again", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.unskipDeal(d, dealId, stage); }); } }); }); });
        break;
      }
      case "approve-suggestion": case "skip-suggestion": {
        const how = action === "approve-suggestion" ? "approve" : "skip";
        if (how === "approve" && window.PL.confetti) window.PL.confetti(btn);
        leave(function () { change(function (d) { mut.decide(d, sId, how); }).then(function () { ui.toast(how === "approve" ? "Done" : "Skipped", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.undecide(d, sId); }); } }); }); });
        break;
      }
      // everything else
      case "settings": go("preferences"); break;
      case "pref-add-stage": V.preferences.addStageRow($("#prefStages")); break;
      case "pref-remove-stage": btn.closest(".pref-cat").remove(); break;
      case "pref-add-crit": V.preferences.addCritRow($("#prefCrits")); break;
      case "pref-remove-crit": btn.closest(".pref-cat").remove(); break;
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
    if (V[v]) { e.preventDefault(); go(v); }
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
      change(function (d) { mut.setPreferences(d, got.values, got.stages, got.checkLabels); }).then(function () { ui.toast("Preferences saved"); renderChrome(); });
      return;
    }
    if (kind === "add-deal") {
      const title = f.title.value.trim();
      if (!title) return f.title.focus();
      const person = f.person.value.trim(), notes = f.notes.value;
      generic.close();
      let made = null;
      change(function (d) {
        const p = person ? mut.personByName(d, person) : null;
        if (p && f.organisation.value.trim() && !p.organisation && !p.fromTaskList) p.organisation = f.organisation.value.trim();
        made = mut.addDeal(d, { title: title, organisation: f.organisation.value.trim() || (p && p.organisation) || "", personIds: p ? [p.id] : [], value: f.value.value, stage: f.stage.value });
      }).then(function () {
        go("pipeline");
        openDrawer("deal", made.id);
        if (notes.trim()) saveNotes(made.id, notes, "");
        else ui.toast("Deal added. Paste your call notes into it and Claude fills the rest in", { duration: 6000 });
      });
    }
    if (kind === "add-notes") {
      const notes = f.notes.value;
      if (!notes.trim()) return f.notes.focus();
      const fileName = form.dataset.fileName || "";
      if (f.deal.value === "__new") {
        const title = f.newTitle.value.trim();
        if (!title) return f.newTitle.focus();
        generic.close();
        let made = null;
        change(function (d) { made = mut.addDeal(d, { title: title }); }).then(function () { openDrawer("deal", made.id); return saveNotes(made.id, notes, fileName); });
      } else {
        const id = f.deal.value;
        generic.close();
        openDrawer("deal", id);
        saveNotes(id, notes, fileName);
      }
    }
    if (kind === "add-person") {
      const fields = { name: f.name.value.trim(), organisation: f.organisation.value.trim(), role: f.role.value, email: f.email.value.trim() };
      if (!fields.name) return f.name.focus();
      generic.close();
      let made = null;
      change(function (d) { made = mut.addPerson(d, fields); }).then(function () { go("people"); openDrawer("person", made.id); });
    }
    if (kind === "claude-send") {
      const where = form.getAttribute("data-where"), id = form.getAttribute("data-id");
      const email = { to: f.to.value.trim(), subject: f.subject.value.trim(), body: f.body.value };
      if (!email.to) return f.to.focus();
      if (!email.body.trim()) return f.body.focus();
      generic.close();
      change(function (d) { mut.approveSend(d, where, id, email); }).then(function () { return askClaude("send", null, where + ":" + id); }).then(function (started) {
        ui.toast(started ? "Claude is sending it now" : "Claude sends it on its next check-in. To send it straight away, say \u201csend my approved emails\u201d to Claude", { icon: "sparkle", duration: 8000 });
      });
      return;
    }
    if (kind === "group-email") {
      if (!f.subject.value.trim()) return f.subject.focus();
      if (!f.body.value.trim()) return f.body.focus();
      // A very long Bcc list can be too long for a link; then the person pastes the addresses themselves
      const bcc = form.dataset.emails;
      const draft = { to: "", bcc: bcc.length > 1500 ? "" : bcc, subject: f.subject.value.trim(), body: f.body.value };
      openDraft(draft, function () {
        if (!draft.bcc) { ui.copyText(bcc); ui.toast("Your email is open. The addresses are copied: paste them into Bcc, then send", { icon: "mail", duration: 9000 }); }
        else ui.toast("Your email is open in " + L.emailLabel(data.settings.emailProvider) + " with everyone in Bcc. Check it and press send", { icon: "mail", duration: 8000 });
      });
      generic.close();
      return;
    }
    if (kind === "mark-lost") {
      const id = form.getAttribute("data-deal");
      const reason = f.reason.value.trim();
      generic.close();
      const from = M.dealById(data, id).stage;
      change(function (d) { mut.setStage(d, id, "lost", "you"); if (reason) mut.updateDeal(d, id, { lostReason: reason }); }).then(function () {
        ui.toast("Marked lost", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.setStage(d, id, from, "you"); }); } });
      });
    }
  });

  generic.addEventListener("click", function (e) { if (e.target === generic) generic.close(); });
  document.querySelectorAll("dialog.modal").forEach(function (dlg) { dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); });

  // ============================================================
  // 8. Search
  // ============================================================

  const searchInput = $("#searchInput"), results = $("#searchResults");
  function renderResults() {
    if (!searchInput.value.trim()) { results.hidden = true; return; }
    const r = M.search(data, searchInput.value);
    const items = r.deals.map(function (x) {
      return '<button type="button" class="menu-item" role="option" data-result-deal="' + esc(x.id) + '">' + icon("trendingUp") + '<span class="menu-item__text">' + esc(x.title) + "</span></button>";
    }).concat(r.people.map(function (p) {
      return '<button type="button" class="menu-item" role="option" data-result-person="' + esc(p.id) + '">' + C.avatar(p) + '<span class="menu-item__text">' + esc(C.personLabel(p)) + "</span></button>";
    }));
    results.innerHTML = items.length ? items.join("") : '<p class="search-results__none">Nothing matches “' + esc(searchInput.value.trim()) + "”</p>";
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
    if (b.dataset.resultDeal) openDrawer("deal", b.dataset.resultDeal);
    if (b.dataset.resultPerson) openDrawer("person", b.dataset.resultPerson);
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".topbar__search")) results.hidden = true; });

  // ============================================================
  // 9. Keyboard shortcuts
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
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openAddDeal(); }
    else if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
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
  try { lastView = localStorage.getItem("plos-view"); } catch (e) { lastView = null; }
  state.view = V[fromHash] ? fromHash : V[lastView] ? lastView : "pipeline";
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  // When Task List OS is attached, its contacts show in People and can be linked to deals (read only here)
  function loadTaskListPeople() {
    if (!store.isHelper()) return;
    fetch("../installed.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; }).then(function (inst) {
      const attached = (inst.tools || []).some(function (t) { return t && t.id === "task-list"; });
      return attached ? fetch("/api/data/task-list/tasks.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }) : null;
    }).then(function (t) {
      if (t && Array.isArray(t.people)) { M.setLinkedPeople(t.people); if (inApp()) render(); }
    }).catch(function () { /* not attached: nothing to show */ });
  }
  window.addEventListener("focus", loadTaskListPeople);

  renderGate();
  store.start().then(function () {
    loadTaskListPeople();
    if (store.isHelper()) fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) { if ((st.running || st.queued) && /^pipeline:/.test(st.job || "")) watchClaude(); }).catch(function () {});
    if (/^https?:$/.test(location.protocol)) fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { C.setFolder(info.folder); }).catch(function () {});
  });
})();
