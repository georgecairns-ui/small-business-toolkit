/*
  SET UP: the 7 tools and how far each one is set up
  --------------------------------------------------
  Each tool: its status (Set up, Part done, Not yet, Skipped for now), the date Claude wrote down and one
  button, Set up now, Carry on or Run it again. Every button opens Claude with that tool's part of
  START-HERE.md to follow. Claude writes the status; this page only reads it.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const L = window.TK.list, M = window.TK.model, C = window.TK.components;
  // The pill already says Set up or Skipped, so only a part-done tool needs a word before its date
  const DATE_WORD = { "set-up": "", "part-done": "Started ", "not-yet": null, "skipped": "" };

  function row(d, t) {
    const s = M.tool(d, t.id), btn = M.toolButton(d, t);
    const when = s.date && DATE_WORD[s.status] !== null ? DATE_WORD[s.status] + C.shortDate(s.date) : "";
    return '<li class="card tk-tool tk-tool--' + esc(s.status) + '">' +
      '<span class="tk-tool__icon">' + icon(t.icon) + "</span>" +
      '<div class="tk-tool__main"><div class="tk-tool__top"><h3 class="tk-tool__name">' + esc(t.name) + "</h3>" + C.statusChip(M.TOOL, s.status) +
      (when ? '<span class="tk-tool__date">' + esc(when) + "</span>" : "") + "</div>" +
      '<p class="tk-tool__what">' + esc(s.note || t.what) + "</p></div>" +
      '<div class="tk-tool__actions">' + C.claudeActions(btn.prompt, { label: btn.label, small: true, primary: s.status !== "set-up" }) + "</div></li>";
  }

  function render(root, ctx) {
    const d = ctx.data, n = M.counts(d);
    const line = n.setUp === n.tools ? "Every tool is set up. Run one again whenever your business changes." : "Each button opens Claude, which picks up where you left off and skips anything it already knows.";
    root.innerHTML = '<div class="page">' + C.pageHead(M.setUpLine(d), line, "") + C.claudeNote() +
      '<ul class="tk-tools" role="list">' + L.TOOLS.map(function (t) { return row(d, t); }).join("") + "</ul></div>";
  }

  window.TK.views.setup = { render: render };
})();
