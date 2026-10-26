/*
  TO DO: what is waiting, in two lists
  ------------------------------------
  "Claude can do this" has a Do it button for each item. It runs the job, or opens the pop-up that states the exact change to your
  ad account and asks you to say yes. "You need to" has the right button for each item (Review, Add photo, Open Google Ads,
  Tell Claude) and a line saying what to give Claude. Both lists come from AD.model.todoList, so the count on the rail
  tab is always the same as what is here. Nothing on this page changes an ad account until the pop-up is confirmed.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  AD.views = AD.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  // The items being worked on now, so Do it can't be pressed twice
  const busy = {};

  function safeUrl(url) { return /^https?:\/\//i.test(url || "") ? url : ""; }

  function claudeItem(item) {
    const working = !!busy[item.key];
    return '<li class="todo-item" data-key="' + esc(item.key) + '"><div class="todo-item__main"><strong class="todo-item__label">' + esc(item.label) + "</strong>" +
      (item.why ? '<span class="todo-item__why">' + esc(item.why) + "</span>" : "") + "</div>" +
      '<div class="todo-item__act"><button type="button" class="btn btn--sm btn--primary" data-todo-do="' + esc(item.key) + '"' + (working ? " disabled" : "") + ">" +
      icon(working ? "loader" : "sparkle", working ? "spin" : "") + "<span>" + esc(item.button || "Do it") + "</span></button></div></li>";
  }

  // The owner's button: a page in the app, the settings, or an address
  function youButton(item) {
    const o = item.open || {}, label = item.button || "Open";
    if (o.url && safeUrl(o.url)) return '<a class="btn btn--sm" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "<span>" + esc(label) + "</span></a>";
    if (o.view === "settings") return '<button type="button" class="btn btn--sm" data-action="settings">' + esc(label) + "</button>";
    if (o.view) return '<button type="button" class="btn btn--sm" data-todo-open="' + esc(item.key) + '">' + esc(label) + icon("arrowRight") + "</button>";
    return "";
  }
  function youItem(item) {
    return '<li class="todo-item" data-key="' + esc(item.key) + '"><div class="todo-item__main"><strong class="todo-item__label">' + esc(item.label) + "</strong>" +
      (item.why ? '<span class="todo-item__why">' + esc(item.why) + "</span>" : "") +
      (item.give ? '<span class="todo-item__give"><strong>What to give Claude:</strong> ' + esc(item.give) + "</span>" : "") + '</div><div class="todo-item__act">' + youButton(item) + "</div></li>";
  }

  function column(title, hint, items, draw, none) {
    return '<section class="todo-col card" aria-label="' + esc(title) + '"><header class="todo-col__head"><h2 class="todo-col__title">' + esc(title) + ' <span class="badge">' + items.length + '</span></h2>' +
      '<p class="todo-col__hint">' + esc(hint) + "</p></header>" +
      (items.length ? '<ul class="todo-list">' + items.map(draw).join("") + "</ul>" : '<p class="todo-col__none">' + icon("check") + "<span>" + esc(none) + "</span></p>") + "</section>";
  }

  AD.views.todo = {
    title: "To do",
    line: function (ctx) {
      const t = M.todoList(ctx.data, ctx.today());
      if (!t.claude.length && !t.you.length) return "Nothing to do";
      return t.claude.length + " for Claude, " + t.you.length + " for you";
    },
    render: function (root, ctx) {
      const t = M.todoList(ctx.data, ctx.today());
      const lead = '<p class="todo-lead">Nothing changes in your ad account until you press the button and say yes. Claude does the left-hand list when you press Do it, and the right-hand list is yours.</p>';
      root.innerHTML = '<div class="page todo-page">' + lead + '<div class="todo-cols">' +
        column("Claude can do this", "Press Do it and Claude gets on with it.", t.claude, claudeItem, "Nothing for Claude to do right now.") +
        column("You need to", "Only you can do these. Each says what Claude needs from you.", t.you, youItem, "Nothing for you to do right now.") + "</div></div>";
      root.onclick = function (e) {
        const find = function (list, key) { return list.find(function (i) { return i.key === key; }); };
        const doBtn = e.target.closest("[data-todo-do]");
        if (doBtn) {
          const item = find(t.claude, doBtn.getAttribute("data-todo-do"));
          if (!item || busy[item.key]) return;
          if (item.action) { ctx.doTodo(item); return; }   // the pop-up asks first
          busy[item.key] = true;
          ctx.redraw();
          ctx.doTodo(item).catch(function () { /* shown by the app */ }).then(function () { delete busy[item.key]; ctx.redraw(); });
          return;
        }
        const open = e.target.closest("[data-todo-open]");
        if (open) {
          const item = find(t.you, open.getAttribute("data-todo-open"));
          if (!item || !item.open) return;
          ctx.go(item.open.view);
          if (item.open.id) ctx.openDrawer("build", item.open.id);
        }
      };
    }
  };
})();
