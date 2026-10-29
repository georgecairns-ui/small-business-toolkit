/*
  TOOLKIT ON HOME: the boxes this tool adds to the Home dashboard
  ---------------------------------------------------------------
  Loaded by apps/home/home.js after ../shared/js/connections.js, app/apps-list.js and app/model.js (listed under
  "home" in the tool's menu file). It reads the same data files as the app itself, through the same shared store:
  data/toolkit.json, and apps/home/data/connections.json for which apps are connected (shared version 13).

  Both boxes start switched on (defaultOn), because this kit is always installed fresh with the Toolkit in it.
  - Next steps: up to 4 things, in order: tools not set up yet, key apps not connected, then Claude's new ideas.
  - Connections: how many are connected (the shared count every tool's Home box uses), then the ones needing
    attention, including rows with no card on the Connections page (LinkedIn, anything added through Connect something else).
  Every button opens Claude with the job typed in (or copies it), exactly as in the app. Nothing on Home
  changes the file.
*/
(function () {
  "use strict";

  const M = window.TK.model;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../toolkit/#";
  const SEEN_KEY = "tk-claude-note-seen";
  let data = null;
  let folder = null;
  let problem = "";   // why the file couldn't be read, shown in place of the boxes
  let shared = {};    // the connections in apps/home/data/connections.json

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function sub(text) { return '<p class="hbox__more">' + esc(text) + "</p>"; }
  function noteSeen() { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; } }

  // The same pair as the app: Open in Claude (or the job's own word) and Copy. Without the folder, Copy only.
  function actions(label, prompt) {
    const link = M.claudeLink(prompt, folder);
    const copy = '<button type="button" class="btn btn--sm' + (link ? " btn--ghost" : "") + '" data-home-action="toolkit:copy" data-prompt="' + esc(prompt) + '"' +
      (link ? ' aria-label="Copy the prompt">Copy' : ">Copy the prompt") + "</button>";
    return '<span class="hrow__actions">' + (link ? '<a class="btn btn--sm btn--primary" href="' + esc(link) + '" data-open-claude>' + esc(label) + "</a>" : "") + copy + "</span>";
  }
  function row(title, subText, label, prompt) {
    return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(title) + "</span>" +
      (subText ? '<span class="hrow__sub">' + esc(subText) + "</span>" : "") + "</span>" + actions(label, prompt) + "</li>";
  }
  function note() {
    if (!folder) return sub("Open this folder in the Code tab of the Claude desktop app, then paste the prompt in.");
    return noteSeen() ? "" : sub("Opens Claude with this typed in. Press Enter to start.");
  }

  // ---------- The boxes ----------
  function nextBox() {
    if (problem) return empty(problem);
    const items = M.nextSteps(data, 4);
    if (!items.length) return empty("Everything's set up. Claude adds ideas here as it spots them.");
    return '<ul class="hlist" role="list">' + items.map(function (it) { return row(it.title, it.sub, it.label, it.prompt); }).join("") + "</ul>" + note();
  }

  function connectionsBox() {
    if (problem) return empty(problem);
    if (M.connectionsProblem()) return empty(M.connectionsProblem());
    const s = window.TaskListOS.connections.counts({ connections: shared });
    const stat = s.total ? '<p class="hstat"><span class="hstat__num">' + s.connected + " of " + s.total + '</span><span class="hstat__label">connected</span></p>' :
      '<p class="hstat"><span class="hstat__label">Nothing connected yet</span></p>';
    const attention = M.connectionsByUrgency(data).filter(function (x) { return x.status === "needs-attention"; })
      .map(function (x) { return { name: x.app.name, prompt: M.prompt.fix(x.app) }; })
      .concat(M.extras(data).filter(function (x) { return x.status === "needs-attention"; })
        .map(function (x) { return { name: x.name, prompt: window.TaskListOS.connections.fixPrompt(x.name) }; }));
    if (!attention.length) return stat + sub(s.connected ? "None need attention." : "Connect your email and calendar first. Open the page to see them all.");
    return stat + '<ul class="hlist" role="list">' + attention.slice(0, 3).map(function (x) {
      return row(x.name, "Needs attention", "Fix it", x.prompt);
    }).join("") + "</ul>" + (attention.length > 3 ? sub("and " + (attention.length - 3) + " more on the Connections page") : "") + note();
  }

  // Once the person has used an Open in Claude link, the first-time note goes (the same note as in the app)
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-open-claude]")) return;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (err) { /* not remembered: the note shows again next time */ }
  });

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("toolkit", {
    boxes: [
      { id: "next", title: "Next steps", icon: "sparkle", size: 2, defaultOn: true, page: PAGE + "setup", render: nextBox },
      { id: "connections", title: "Connections", icon: "external", size: 1, defaultOn: true, page: PAGE + "connections", render: connectionsBox }
    ],
    start: function (ctx) {
      const def = this;
      // Where this folder is, so the links open Claude Code right here. Without it the boxes offer Copy only, and say so.
      fetch("/api/info", { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("no folder");
        return r.json();
      }).then(function (info) { folder = info.folder || null; ctx.refresh(); }).catch(function () { folder = null; });
      const store = window.TaskListOS.createStore({
        moduleId: "toolkit",
        fileName: "toolkit.json",
        dataPaths: ["data", "", "apps/toolkit/data"],
        api: "/api/data/toolkit/toolkit.json",
        validate: M.validate,
        onStatus: function (s, detail) {
          if (s !== "error") return;
          const kind = detail.error && detail.error.kind;
          problem = kind === "bad-file" ? "Your toolkit file has a small mistake in it. Ask Claude: please check my toolkit file and fix it." :
            kind === "missing" ? "Your toolkit file can't be found. Ask Claude to check it." : "Your toolkit couldn't be read just now. Reload the page to try again.";
          def.ready = true;
          ctx.refresh();
        },
        onData: function (d) { data = d; problem = ""; def.ready = true; ctx.refresh(); }
      });
      store.start();
      // Which apps Claude can reach: the shared file every tool reads (shared v13). Missing just means nothing is connected yet.
      window.TaskListOS.createStore({
        moduleId: "connections",
        fileName: "connections.json",
        dataPaths: ["data", "", "apps/home/data"],
        api: window.TaskListOS.connections.API,
        validate: window.TaskListOS.connections.validate,
        // As in apps/shared/js/connections-box.js: a missing file stays silent, a broken one says so in the box
        onStatus: function (s, detail) {
          // Read cleanly again: any old message goes
          if (s === "ready" && M.connectionsProblem()) { M.setConnectionsProblem(""); ctx.refresh(); return; }
          if (s !== "error") return;
          const kind = detail && detail.error && detail.error.kind;
          M.setConnectionsProblem(kind === "missing" ? "" : kind === "bad-file" ? "Your connections file has a small mistake in it. Ask Claude to check it." : "Your connections couldn't be read just now. Reload the page to try again.");
          ctx.refresh();
        },
        onData: function (d) { shared = d.connections; M.setConnections(d.connections); ctx.refresh(); }
      }).start();
    },
    action: function (name, el) {
      if (name !== "copy") return;
      ui.copyText(el.getAttribute("data-prompt")).then(function (ok) {
        ui.toast(ok ? "Copied. Paste it into Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" });
      });
    }
  });
})();
