/*
  CONNECTIONS ON HOME (shared version 13)
  ---------------------------------------
  Loaded by apps/home/home.js after apps/shared/js/connections.js, in every tool except the Small
  Business Toolkit (its own Connections box reads the same file). Shows how many apps Claude can
  reach and lists them, needing attention first, each with a Fix it link that opens Claude here.
*/
(function () {
  "use strict";

  const C = window.TaskListOS.connections;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  let data = null;
  let folder = null;
  let problem = "";

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }
  function claudeLink(prompt) {
    return folder ? "claude://code/new?q=" + encodeURIComponent(prompt) + "&folder=" + encodeURIComponent(folder) : null;
  }
  function row(x) {
    const s = C.STATUS[x.status];
    const link = x.status === "needs-attention" ? claudeLink(C.fixPrompt(x.name)) : null;
    return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(x.name) + "</span>" +
      '<span class="hrow__sub"><span class="chip ' + s.chip + '">' + esc(s.label) + "</span></span></span>" +
      (link ? '<span class="hrow__actions"><a class="btn btn--sm btn--primary" href="' + esc(link) + '">Fix it</a></span>' : "") + "</li>";
  }

  function box() {
    if (problem) return empty(problem);
    if (!data) return empty("Claude fills this in when it connects your apps during setup.");
    const n = C.counts(data);
    const shown = C.list(data).filter(function (x) { return x.status !== "not-used"; });
    if (!shown.length) return empty("Claude fills this in when it connects your apps during setup.");
    // The count covers only live connections and ones to fix; export-only and the rest are still listed below it
    const stat = n.total ? '<p class="hstat"><span class="hstat__num">' + n.connected + " of " + n.total + '</span><span class="hstat__label">connected</span></p>' : "";
    return stat + '<ul class="hlist" role="list">' + shown.slice(0, 5).map(row).join("") + "</ul>" +
      (shown.length > 5 ? '<p class="hbox__more">' + esc("and " + (shown.length - 5) + " more") + "</p>" : "");
  }

  window.TaskListOS.home.register("connections", {
    boxes: [{ id: "status", title: "Connections", icon: "external", size: 1, defaultOn: true, render: box }],
    start: function (ctx) {
      const def = this;
      fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (info) { folder = info.folder || null; ctx.refresh(); }).catch(function () { folder = null; });
      window.TaskListOS.createStore({
        moduleId: "connections",
        fileName: "connections.json",
        dataPaths: ["data", "", "apps/home/data"],
        api: C.API,
        validate: C.validate,
        onStatus: function (s, detail) {
          if (s !== "error") return;
          const kind = detail && detail.error && detail.error.kind;
          // No file yet just means setup hasn't connected anything
          problem = kind === "missing" ? "" : kind === "bad-file" ? "Your connections file has a small mistake in it. Ask Claude to check it." : "Your connections couldn't be read just now. Reload the page to try again.";
          def.ready = true;
          ctx.refresh();
        },
        onData: function (d) { data = d; problem = ""; def.ready = true; ctx.refresh(); }
      }).start();
    }
  });
})();
