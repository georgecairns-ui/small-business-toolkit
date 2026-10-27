/*
  PROPOSAL WRITING OS: the app
  --------------------
  Ties everything together:
  1. Connects to data/proposals.json through the shared store.
  2. Shows the welcome screen until the app is running, then the app.
  3. Moves between pages (Proposals, Clients, Packages, one proposal, Preferences) using the
     address bar, so Back and Forward work.
  4. Handles every button, form and keyboard shortcut. Every change goes through change(),
     which saves it into the proposals file for Claude to read.
  5. Asking Claude: Write proposal, Ask Claude to change it and Check for new folders save a
     request in the file, then the helper starts Claude straight away (the jobs in
     claude-jobs.json). If Claude can't be started from here, the request waits and an Open in
     Claude button does the same with one click.

  The rule throughout: Claude writes, the person checks, approves and sends it themselves.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c, V = window.PO.views, L = window.PO.links;
  const mut = M.mut;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Number keys 1 to 3 follow the sidebar
  const VIEW_ORDER = ["proposals", "clients", "packages"];

  function remembered(key, allowed) {
    try { const v = localStorage.getItem(key); return allowed.indexOf(v) > -1 ? v : null; } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  // ---------- Screen state (not saved to the file) ----------
  const state = {
    view: "proposals",
    proposalId: null,
    filter: remembered("pros-filter", ["open", "won", "lost", "all"]) || "open",
    unlocked: {}
  };
  // What Claude is doing right now, so the app can say so and report back
  const claude = { requests: [], timer: null };

  let data = null;
  let status = "checking";
  let statusDetail = {};
  let pendingRender = false;
  const seen = new Set();
  let stagger = 0;

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "proposals",
    fileName: "proposals.json",
    dataPaths: ["data", "", "apps/proposals/data"],
    api: "/api/data/proposals/proposals.json",
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
      if (reason === "load") seen.clear();
      render();
      if (reason === "external" && !claude.requests.length) ui.toast("Claude updated your proposals", { icon: "sparkle" });
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
    if (kind === "bad-file") return { title: "Your proposals file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in proposals.backup.json next to it.", say: "Please check my proposals.json file and fix it", short: "Your proposals file needs a quick fix" };
    if (kind === "missing") return { title: "Your proposals file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My proposals file seems to be missing, please check it", short: "Your proposals file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Proposal Writing OS has stopped running.", body: "Everything is saved. In Claude, say “open my proposals” and it starts again. This page reconnects by itself.", say: "Open my proposals", short: "Proposal Writing OS has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }

  // ============================================================
  // 2. Before the app is running: welcome, loading, problems
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }
  function gateCard(art, eyebrow, title, body, actions, small) {
    return '<div class="gate__card">' +
      '<div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Proposal Writing OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + title + "</h1>" + body +
      '<div class="gate__actions">' + actions + "</div>" + (small ? '<p class="gate__small">' + small + "</p>" : "") + "</div>" +
      '<div class="gate__art"><img src="' + C.ART[art] + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate(message) {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your proposals"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("welcome", "", "Your proposals open from Claude.",
        "<p>Claude runs Proposal Writing OS on this computer and gives you a link to it. In Claude Code, in your Small Business Toolkit folder, just say:</p>" + C.say("Open my proposals") +
        '<p class="gate__note">Not set up yet? Say <strong>/setup</strong> instead. Claude learns your brand, your packages and how you write, then writes your first proposal.</p>',
        "",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("shrug", "One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("welcome", "Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my proposals</button>", "Folder: " + esc(statusDetail.folderName || "")));
    }
    if (status === "error" && !data) {
      const f = friendlyError(statusDetail.error);
      return showGate(gateCard("shrug", "Something needs a look", esc(f.title), "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
        '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
    }
    showGate(gateCard("welcome", "One-time setup", "Proposals that write themselves. <span class=\"accent\">Checked by you.</span>",
      "<p>Put everything about a client in their folder. Claude writes the proposal in your brand, with your packages and prices, and you check it before it goes anywhere. It all lives on your own computer.</p>" +
      '<ol class="gate__steps"><li><span>Click <strong>Connect your proposals</strong>.</span></li><li><span>Choose your <strong>Proposal Writing OS</strong> folder, the one with START-HERE.md in it.</span></li><li><span>When Chrome asks to let this page edit files, click <strong>Allow</strong>.</span></li></ol>' +
      (message ? '<p class="gate__error" role="alert">' + icon("alert") + esc(message) + "</p>" : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your proposals</button>",
      "No account, nothing to install. Your proposals never leave your computer."));
  }

  // ============================================================
  // 3. The app
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }

  // Someone is typing on the page: don't redraw under their fingers
  function isEditing() {
    const el = document.activeElement;
    return !!(el && $("#view").contains(el) && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName)));
  }

  function render() {
    if (!inApp()) { renderChrome(); return renderGate(); }
    $("#gate").hidden = true;
    $("#shell").hidden = false;
    renderChrome();
    if (isEditing()) { pendingRender = true; return; }
    renderView();
  }

  function anim(key) {
    if (seen.has(key)) return "";
    seen.add(key);
    return ' enter" style="--i:' + Math.min(stagger++, 12);
  }
  function storeInfo() {
    return { canChange: !store.isHelper(), folder: store.isHelper() ? "Your Proposal Writing OS folder, on this computer" : store.folderName() };
  }
  function ctx() { return { d: data, state: state, anim: anim, storeInfo: storeInfo, claude: claude }; }

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
      proposals: M.byStatus(data, "draft").length,
      clients: data.clients.filter(function (c) { return M.clientState(data, c) === "ready"; }).length,
      packages: 0
    };
    document.querySelectorAll("[data-count]").forEach(function (el) { const n = counts[el.getAttribute("data-count")]; el.textContent = n ? n : ""; });
    const navView = state.view === "proposal" ? "proposals" : state.view;
    document.querySelectorAll(".nav__item").forEach(function (a) {
      const on = a.getAttribute("data-view") === navView;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const n = M.numbers(data);
    $("#savedMini").innerHTML = '<span class="saved-mini__value num">' + esc(M.money(data, n.sentValue)) + '</span><span class="saved-mini__label">out with clients</span>';
    document.body.classList.toggle("on-doc", state.view === "proposal");
  }

  function renderView() {
    pendingRender = false;
    const view = V[state.view] || V.proposals;
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
    document.title = view.title(c) + " · Proposal Writing OS";
  }

  // ============================================================
  // 4. Moving between pages
  // ============================================================

  function parseHash(h) {
    const m = /^proposal\/([a-z0-9-]+)$/i.exec(h);
    if (m) return { view: "proposal", proposalId: m[1] };
    return { view: V[h] && h !== "proposal" ? h : "proposals" };
  }
  function go(view, proposalId) {
    if (!V[view]) view = "proposals";
    if (view !== state.view || proposalId !== state.proposalId) seen.clear();
    state.view = view;
    state.proposalId = view === "proposal" ? proposalId : null;
    const hash = view === "proposal" ? "proposal/" + proposalId : view;
    if (view !== "proposal") remember("pros-view", view);
    if (location.hash !== "#" + hash) history.pushState(null, "", "#" + hash);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderView(); $("#view").scrollTop = 0; }
  }
  window.addEventListener("hashchange", function () { const r = parseHash(location.hash.slice(1)); if (r.view !== state.view || r.proposalId !== state.proposalId) go(r.view, r.proposalId); });
  window.addEventListener("popstate", function () { const r = parseHash(location.hash.slice(1)); if (r.view !== state.view || r.proposalId !== state.proposalId) go(r.view, r.proposalId); });

  // ============================================================
  // 5. Asking Claude
  // ============================================================

  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  // Claude's 3 jobs (claude-jobs.json). The app asks the helper to start one; it never sends
  // the words Claude follows, only the job's name.
  const JOBS = {
    write: { name: "write-proposals", doing: "Claude is writing your proposal" },
    change: { name: "change-proposals", doing: "Claude is changing your proposal" },
    scan: { name: "check-folders", doing: "Claude is checking your client folders" }
  };
  // Resolves true if Claude was started (or queued)
  function askClaude(kind, requestId) {
    if (!store.isHelper()) return Promise.resolve(false);
    return fetch("/api/claude/run/proposals/" + JOBS[kind].name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (r.status !== 202) return false;
        if (requestId && !claude.requests.some(function (x) { return x.id === requestId; })) claude.requests.push({ id: requestId, kind: kind });
        watchClaude();
        return true;
      })
      .catch(function () { return false; });
  }
  function claudeDoing() {
    const kinds = claude.requests.map(function (r) { return r.kind; });
    if (kinds.indexOf("write") > -1) return JOBS.write.doing;
    if (kinds.indexOf("change") > -1) return JOBS.change.doing;
    if (kinds.indexOf("scan") > -1) return JOBS.scan.doing;
    return "Claude is working";
  }
  function watchClaude() {
    setClaudeStatus(claudeDoing());
    clearInterval(claude.timer);
    claude.timer = setInterval(function () {
      fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
        if (st.running || st.queued) { setClaudeStatus(claudeDoing()); return; }
        clearInterval(claude.timer);
        setTimeout(finishedClaude, 2500);
      }).catch(function () { /* helper briefly unavailable; keep watching */ });
    }, 3000);
  }
  // Read the file fresh to say how it went (the app's own refresh pauses while its tab is hidden)
  function finishedClaude() {
    setClaudeStatus("");
    fetch("/api/data/proposals/proposals.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (fresh) { reportClaude(fresh ? M.normalise(fresh) : data); }, function () { reportClaude(data); });
  }
  function reportClaude(now) {
    const list = claude.requests.splice(0);
    list.forEach(function (item) {
      const r = now.requests.find(function (x) { return x.id === item.id; });
      if (!r) return;
      if (r.status === "waiting") {
        ui.toast("Claude couldn’t finish. Nothing is lost: press Open in Claude to try again", { icon: "info", duration: 9000 });
        return;
      }
      if (r.kind === "write") {
        const p = r.proposalId ? M.proposalById(now, r.proposalId) : null;
        const cl = M.clientById(now, r.clientId);
        if (p) ui.toast("Claude has written the proposal for " + M.clientName(now, p) + ". Have a read", { icon: "sparkle", duration: 10000, actionLabel: "Open it", onAction: function () { go("proposal", p.id); } });
        else ui.toast(r.note || "Claude needs a bit more before it can write for " + (cl ? cl.name : "this client") + ". See the Clients page", { icon: "info", duration: 10000 });
      }
      if (r.kind === "change") ui.toast(r.note || "Claude has changed the proposal", { icon: "sparkle", duration: 7000 });
      if (r.kind === "scan") ui.toast(r.note || "Claude has checked your client folders", { icon: "folder", duration: 8000 });
    });
  }

  // ---------- Brain dump (shared, ../shared/js/braindump.js) ----------
  // The button, V and the sorting are shared by every tool. Proposal Writing OS adds "A client..." and
  // "A proposal..." to "What's it about?", and starts with the proposal that's open, if one is.
  if (window.TaskListOS.brainDump) window.TaskListOS.brainDump.register("proposals", {
    pickers: function () {
      if (!data) return [];
      return [
        { type: "client", label: "A client…", items: data.clients.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { return { id: c.id, label: c.name }; }) },
        { type: "proposal", label: "A proposal…", items: data.proposals.filter(M.isOpen).map(function (p) { return { id: p.id, label: M.clientName(data, p) + ": " + (p.title || "Proposal") }; }) }
      ];
    },
    preset: function () {
      const p = data && state.view === "proposal" ? M.proposalById(data, state.proposalId) : null;
      return p ? { type: "proposal", id: p.id, label: M.clientName(data, p), tool: "proposals" } : null;
    }
  });

  // A text file of notes or a transcript, read here on this computer
  function readNotesFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error("no file"));
      if (file.size > 2 * 1024 * 1024) return reject(new Error("That file is too big. Paste the important part instead, or put the file in the client's folder."));
      if (!/\.(txt|md|vtt|srt|csv)$/i.test(file.name) && file.type && file.type.indexOf("text/") !== 0) return reject(new Error("That isn't a text file. Put Word documents and PDFs in the client's folder instead: Claude reads those."));
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { reject(new Error("That file couldn't be read.")); };
      r.readAsText(file);
    });
  }

  function writeFor(clientId, notes, fileName) {
    let req = null;
    return change(function (d) { req = mut.requestWrite(d, clientId, notes, fileName); }).then(function () {
      return req ? askClaude("write", req.id) : false;
    }).then(function (started) {
      const cl = M.clientById(data, clientId);
      if (started) ui.toast("Claude is writing the proposal for " + (cl ? cl.name : "them") + ". It usually takes 2 to 4 minutes", { icon: "sparkle", duration: 8000 });
      else ui.toast("Saved. To start Claude, press Open in Claude on the Clients page, or say “write my proposals”", { icon: "info", duration: 9000 });
    });
  }

  // ============================================================
  // 6. Pop-ups
  // ============================================================

  const generic = document.createElement("dialog");
  generic.className = "modal";
  generic.id = "genericDialog";
  generic.setAttribute("aria-labelledby", "genericTitle");
  document.body.appendChild(generic);
  function openGeneric(html) { generic.innerHTML = html; generic.showModal(); const f = generic.querySelector("textarea, input:not([type=hidden]), select"); if (f) f.focus(); }
  function modalHead(title) { return '<div class="modal__head"><h2 id="genericTitle">' + esc(title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>"; }

  function openNewProposal(clientId) {
    const pick = clientId ? M.clientById(data, clientId) : null;
    openGeneric('<form data-form="new-proposal" autocomplete="off">' + modalHead("New proposal") + '<div class="modal__body">' +
      '<label class="field"><span class="field__label">Who’s it for?</span><input class="input input--title" name="client" required maxlength="80" list="clientList" value="' + esc(pick ? pick.name : "") + '" placeholder="Hollins Lettings">' +
      '<datalist id="clientList">' + data.clients.map(function (c) { return '<option value="' + esc(c.name) + '"></option>'; }).join("") + "</datalist></label>" +
      '<div class="field-row" data-new-only' + (pick ? " hidden" : "") + '><label class="field"><span class="field__label">Who you’re talking to (optional)</span><input class="input" name="contact" maxlength="80" placeholder="Dev Patel"></label>' +
      '<label class="field"><span class="field__label">Their email (optional)</span><input class="input" type="email" name="email" maxlength="120"></label></div>' +
      '<label class="field"><span class="field__label">Anything to add? (optional)</span><textarea class="textarea" name="notes" rows="7" maxlength="60000" placeholder="Paste call notes, a transcript or their email. Rough is fine: what they need, what’s hurting, budget, timing."></textarea></label>' +
      '<label class="btn btn--ghost btn--sm notes__file">' + icon("folder") + 'Or choose a text file<input type="file" name="file" accept=".txt,.md,.vtt,.srt,.csv,text/plain" hidden></label>' +
      '<p class="field__hint">Claude also reads everything in their client folder, and your emails and calls with them if those are connected. It writes the proposal in your brand with your packages and prices. Nothing is sent.</p>' +
      '</div><div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">' + icon("sparkle") + "Write the proposal</button></div></form>");
    const form = generic.querySelector("form");
    form.client.addEventListener("input", function () {
      const known = data.clients.some(function (c) { return c.name.toLowerCase() === form.client.value.trim().toLowerCase(); });
      form.querySelector("[data-new-only]").hidden = known;
    });
    form.file.addEventListener("change", function () {
      const f = form.file.files[0];
      readNotesFile(f).then(function (text) { form.notes.value = text; form.dataset.fileName = f.name; })
        .catch(function (err) { ui.toast(err.message, { icon: "alert", duration: 7000 }); });
    });
  }

  function openDeleteProposal(id) {
    const p = M.proposalById(data, id);
    if (!p) return;
    openGeneric('<form data-form="delete-proposal" data-proposal="' + esc(id) + '" autocomplete="off">' + modalHead("Delete this proposal?") + '<div class="modal__body">' +
      "<p>" + esc(M.clientName(data, p) + ": " + (p.title || p.cover.title || "Proposal")) + " will be taken off your list.</p>" +
      '<p class="field__hint">You will have a few seconds to undo it straight after.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Keep it</button><button type="submit" class="btn btn--primary">Delete it</button></div></form>');
  }

  function openMarkLost(id) {
    openGeneric('<form data-form="mark-lost" data-proposal="' + esc(id) + '" autocomplete="off">' + modalHead("Mark as lost") + '<div class="modal__body">' +
      '<label class="field"><span class="field__label">Why didn’t it go ahead? (optional)</span><input class="input" name="reason" maxlength="160" placeholder="Went with someone cheaper, timing, went quiet"></label>' +
      '<p class="field__hint">Claude uses this to write better proposals next time.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Mark lost</button></div></form>');
  }

  function setStatus(id, to, extra) {
    const p = M.proposalById(data, id);
    if (!p) return;
    const from = p.status;
    return change(function (d) { mut.setStatus(d, id, to, extra); }).then(function () {
      const msg = to === "approved" ? "Approved. Save it as a PDF and send it when you’re ready" : to === "sent" ? "Marked as sent. Claude nudges you in " + data.settings.chaseAfterDays + " days if you haven’t heard" :
        to === "won" ? "Marked won. Nice work" : to === "lost" ? "Marked lost" : "Back to " + M.STATUS[to].label.toLowerCase();
      ui.toast(msg, { icon: to === "won" ? "sparkle" : "check", duration: 6000, actionLabel: "Undo", onAction: function () { change(function (d) { mut.setStatus(d, id, from); }); } });
    });
  }

  function openEmail(email, after) {
    L.open(L.composeUrl(email, data.settings.emailProvider || "gmail"));
    if (after) after();
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
    const pEl = btn.closest("[data-proposal]");
    const proposalId = btn.getAttribute("data-proposal") || (pEl && pEl.getAttribute("data-proposal")) || (state.view === "proposal" ? state.proposalId : null);
    const cEl = btn.closest("[data-client]");
    const clientId = cEl && cEl.getAttribute("data-client");

    switch (action) {
      case "connect":
        store.connect().catch(function (err) {
          renderGate(err && err.kind === "wrong-folder" ? "That folder doesn't have your proposals in it. Choose your Small Business Toolkit folder, the one with START-HERE.md in it." : "That didn't work. Please try again, and click Allow when Chrome asks.");
        });
        break;
      case "reconnect": store.reconnect().catch(function () { renderGate(); }); break;
      case "change-folder": data = null; store.forget(); break;
      case "retry": store.retry(); break;

      case "open-proposal": if (proposalId) go("proposal", proposalId); break;
      case "new-proposal": openNewProposal(); break;
      case "write-proposal": if (clientId) writeFor(clientId, "", ""); break;
      case "scan": {
        let req = null;
        change(function (d) { req = mut.requestScan(d); }).then(function () { return req ? askClaude("scan", req.id) : false; }).then(function (started) {
          ui.toast(started ? "Claude is looking through your client folders" : "Saved. Say “check my client folders” to Claude, or wait for the next check-in", { icon: "folder", duration: 7000 });
        });
        break;
      }
      case "filter": state.filter = btn.getAttribute("data-value"); remember("pros-filter", state.filter); seen.clear(); renderView(); break;

      // one proposal
      case "approve": setStatus(proposalId, "approved"); break;
      case "mark-sent": setStatus(proposalId, "sent"); break;
      case "mark-won": setStatus(proposalId, "won"); break;
      case "mark-lost": openMarkLost(proposalId); break;
      case "reopen": setStatus(proposalId, "sent"); break;
      case "unlock": state.unlocked[proposalId] = true; renderView(); ui.toast("You can change it now. Remember the client has the version you sent", { icon: "info", duration: 6000 }); break;
      case "print": {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        ui.toast("Choose “Save as PDF” as the printer, then save it in the client’s folder", { icon: "fileText", duration: 7000 });
        setTimeout(function () { window.print(); }, 350);
        break;
      }
      case "cover-email": {
        const p = M.proposalById(data, proposalId);
        if (!p || !p.coverEmail) break;
        openEmail(p.coverEmail, function () {
          change(function (d) { mut.coverEmailOpened(d, proposalId); });
          ui.toast("Your email is open. Attach the PDF, check it and press send", { icon: "mail", duration: 10000, actionLabel: "I sent it", onAction: function () { setStatus(proposalId, "sent"); } });
        });
        break;
      }
      case "follow-up": {
        const p = M.proposalById(data, proposalId);
        if (!p || !p.followUp) break;
        openEmail(p.followUp, function () { change(function (d) { mut.followUpOpened(d, proposalId); }); ui.toast("Your follow-up is open. Check it and press send", { icon: "mail", duration: 7000 }); });
        break;
      }
      case "recommend": change(function (d) { mut.setRecommended(d, proposalId, Number(btn.getAttribute("data-index"))); }).then(function () { ui.toast("Recommended option changed"); }); break;
      case "delete-proposal": openDeleteProposal(proposalId); break;

      // packages and preferences
      case "pkg-add": V.packages.addRow($("#pkgList")); break;
      case "pkg-remove": btn.closest(".pkg").remove(); break;
      case "extra-add": V.packages.addExtra($("#extraList")); break;
      case "extra-remove": btn.closest(".extra").remove(); break;
      case "sec-up": V.preferences.move(btn, -1); break;
      case "sec-down": V.preferences.move(btn, 1); break;
      case "settings": go("preferences"); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      case "copy":
        ui.copyText(btn.getAttribute("data-text")).then(function (ok) { ui.toast(ok ? "Copied" : "Couldn't copy. Type it instead", { icon: ok ? "check" : "info" }); });
        break;
    }
  });

  // Moving between pages from the sidebar and links
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item, a[href^='#']");
    if (!link) return;
    const r = parseHash(link.getAttribute("href").slice(1));
    e.preventDefault();
    go(r.view, r.proposalId);
  });

  // Words changed in place on a proposal: saved when they click away
  document.addEventListener("focusout", function (e) {
    const el = e.target.closest && e.target.closest("[data-edit]");
    if (!el || !data || state.view !== "proposal") return;
    const path = el.getAttribute("data-edit");
    const p = M.proposalById(data, state.proposalId);
    if (!p) return;
    const before = String(M.getPath(p, path) || "").trim();
    const after = el.innerText.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const id = p.id;
    if (after === before) { if (pendingRender) setTimeout(function () { if (!isEditing()) renderView(); }, 0); return; }
    change(function (d) { mut.editText(d, id, path, after); }).then(function () { if (!isEditing()) renderView(); });
  });
  // Enter in a one-line piece of text finishes it
  document.addEventListener("keydown", function (e) {
    const el = e.target.closest && e.target.closest("[data-edit]");
    if (!el) return;
    if (e.key === "Escape") { el.blur(); return; }
    if (e.key === "Enter" && !el.classList.contains("doc-paras") && !e.shiftKey) { e.preventDefault(); el.blur(); }
  });
  // A price for this proposal only
  document.addEventListener("change", function (e) {
    const input = e.target.closest && e.target.closest("[data-custom-price]");
    if (!input || state.view !== "proposal") return;
    const i = Number(input.getAttribute("data-custom-price")), id = state.proposalId, value = input.value.trim();
    change(function (d) { mut.setCustomPrice(d, id, i, value); }).then(function () { if (!isEditing()) renderView(); ui.toast(value === "" ? "Back to your usual price" : "Price changed for this proposal only"); });
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
      change(function (d) { mut.setPreferences(d, got.values, got.sections); }).then(function () { ui.toast("Preferences saved"); renderChrome(); });
      return;
    }
    if (kind === "packages") {
      const got = V.packages.collect(form, data);
      if (got.error) return ui.toast(got.error, { icon: "alert", duration: 6000 });
      change(function (d) { mut.setPackages(d, got.packages, got.extras, got.money); }).then(function () { ui.toast("Packages and prices saved"); renderView(); });
      return;
    }
    if (kind === "new-proposal") {
      const name = f.client.value.trim();
      if (!name) return f.client.focus();
      const notes = f.notes.value, fileName = form.dataset.fileName || "";
      generic.close();
      let client = null;
      change(function (d) { client = mut.addClient(d, { name: name, contact: f.contact.value, email: f.email.value }); }).then(function () {
        go("proposals");
        return writeFor(client.id, notes, fileName);
      });
      return;
    }
    if (kind === "change") {
      const text = f.instruction.value.trim();
      if (!text) return f.instruction.focus();
      const id = state.proposalId;
      let req = null;
      f.instruction.blur();
      change(function (d) { req = mut.requestChange(d, id, text); }).then(function () { renderView(); return req ? askClaude("change", req.id) : false; }).then(function (started) {
        ui.toast(started ? "Claude is changing it now. This page updates by itself" : "Saved. Press Open in Claude to make the change now", { icon: "sparkle", duration: 7000 });
      });
      return;
    }
    if (kind === "delete-proposal") {
      const id = form.getAttribute("data-proposal");
      let removed = null;
      generic.close();
      go("proposals");
      change(function (d) { removed = mut.deleteProposal(d, id); }).then(function () {
        if (!removed) return;
        ui.toast("Proposal deleted", { icon: "trash", actionLabel: "Undo", onAction: function () { change(function (d) { mut.restoreProposal(d, removed); }); } });
      });
      return;
    }
    if (kind === "mark-lost") {
      const id = form.getAttribute("data-proposal");
      const reason = f.reason.value.trim();
      generic.close();
      setStatus(id, "lost", { reason: reason });
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
    const items = r.proposals.map(function (p) {
      return '<button type="button" class="menu-item" role="option" data-result-proposal="' + esc(p.id) + '">' + icon("fileText") + '<span class="menu-item__text">' + esc(M.clientName(data, p) + ": " + (p.title || "Proposal")) + "</span></button>";
    }).concat(r.clients.map(function (c) {
      return '<button type="button" class="menu-item" role="option" data-result-client="' + esc(c.id) + '">' + icon("folder") + '<span class="menu-item__text">' + esc(c.name) + "</span></button>";
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
    if (b.dataset.resultProposal) go("proposal", b.dataset.resultProposal);
    if (b.dataset.resultClient) {
      go("clients");
      setTimeout(function () { const el = document.querySelector('[data-client="' + b.dataset.resultClient + '"]'); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("is-found"); } }, 60);
    }
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".topbar__search")) results.hidden = true; });

  // ============================================================
  // 9. Keyboard shortcuts
  // ============================================================

  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (e.key === "Escape") { if (!document.querySelector("dialog[open]")) document.body.classList.remove("sidebar-open"); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openNewProposal(); }
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

  const fromHash = parseHash(location.hash.slice(1));
  let lastView = null;
  try { lastView = localStorage.getItem("pros-view"); } catch (e) { lastView = null; }
  if (location.hash.length > 1) { state.view = fromHash.view; state.proposalId = fromHash.proposalId || null; }
  else state.view = V[lastView] && lastView !== "proposal" ? lastView : "proposals";
  const startHash = state.view === "proposal" ? "proposal/" + state.proposalId : state.view;
  if (location.hash !== "#" + startHash) history.replaceState(null, "", "#" + startHash);

  renderGate();
  store.start().then(function () {
    if (store.isHelper()) fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if ((st.running || st.queued) && /^proposals:/.test(st.job || "")) { setClaudeStatus("Claude is working on your proposals"); watchClaude(); }
    }).catch(function () {});
    if (/^https?:$/.test(location.protocol)) fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { C.setFolder(info.folder); if (inApp()) renderView(); }).catch(function () {});
  });
})();
