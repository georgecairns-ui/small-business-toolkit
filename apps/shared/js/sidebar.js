/*
  SIDEBAR: the left-hand menu every tool shares
  ---------------------------------------------
  Under "Your tools", each tool in this folder is a dropdown of its own pages. The tool you're in
  sits in the page itself (its <section class="tool-group">), so its pages work even when nothing
  else can load. This file:
    - opens and closes the dropdowns, and remembers which are open in this browser
    - shows a folded tool's total of things waiting (the highlighted counts) next to its name
    - adds the other tools in this folder (apps/installed.json), each with its pages from its own
      apps/<tool>/menu.json
    - adds "More tools": every other tool in apps/shared/catalogue.json with a padlock. Clicking one
      opens a calm panel saying what it does, with a button to book a free call with Get AI Powers,
      who set it up with you. Nothing ever pops up by itself.

  How a tool uses it: give <body> a data-tool attribute (this tool's id, for example "task-list"),
  copy the sidebar markup from apps/task-list/index.html, and load this file after ui.js.
  If the shared files can't be read (for example when the page is opened straight from the folder
  rather than through the helper), the extra parts simply stay hidden.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const OPEN_KEY = "tlos-sidebar-open";

  function getJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Could not read " + url);
      return r.json();
    });
  }

  // apps/pipeline/ -> ../pipeline/ (pages live one folder down from apps/)
  function hrefFor(tool) { return "../" + String(tool.app || "").replace(/^apps\//, ""); }

  // ---------- Dropdowns ----------
  function remembered() {
    try { return JSON.parse(localStorage.getItem(OPEN_KEY)) || {}; } catch (e) { return {}; }
  }
  function remember(id, open) {
    const all = remembered();
    all[id] = open;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(all)); } catch (e) { /* not remembered, fine */ }
  }
  function setOpen(group, open) {
    group.classList.toggle("is-open", open);
    const head = group.querySelector(".tool-group__head");
    if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
    const body = group.querySelector(".tool-group__body");
    if (body) body.inert = !open;
    updateTotal(group);
  }

  // A folded tool shows the sum of its highlighted counts (Inbox, Review), so nothing waiting is hidden
  function updateTotal(group) {
    const out = group.querySelector(".tool-group__count");
    if (!out) return;
    let total = 0;
    group.querySelectorAll(".nav__count--accent").forEach(function (el) { total += Number(el.textContent) || 0; });
    out.textContent = !group.classList.contains("is-open") && total ? String(total) : "";
  }

  function wireGroup(group, defaultOpen) {
    const id = group.getAttribute("data-tool-group");
    const saved = remembered()[id];
    setOpen(group, typeof saved === "boolean" ? saved : defaultOpen);
    group.querySelector(".tool-group__head").addEventListener("click", function () {
      const open = !group.classList.contains("is-open");
      setOpen(group, open);
      remember(id, open);
    });
    // Keep the folded total right as the tool's own counts change
    new MutationObserver(function () { updateTotal(group); }).observe(group.querySelector(".tool-group__body"), { childList: true, characterData: true, subtree: true });
  }

  // ---------- Other tools in this folder ----------
  function pageLinks(tool, pages, indent) {
    return pages.map(function (p) {
      const link = '<a class="nav__item" href="' + esc(hrefFor(tool) + "#" + p.id) + '">' + icon(p.icon || "list") + esc(p.label) + "</a>";
      const kids = Array.isArray(p.children) && p.children.length ? '<div class="nav__sub">' + pageLinks(tool, p.children, true) + "</div>" : "";
      return link + kids;
    }).join("");
  }
  function otherGroup(tool, pages) {
    const id = "tool-" + tool.id;
    return '<section class="tool-group" data-tool-group="' + esc(tool.id) + '">' +
      '<button type="button" class="tool-group__head" aria-expanded="false" aria-controls="' + esc(id) + '">' +
      '<span class="tool-group__icon">' + icon(tool.icon || "folder") + "</span>" +
      '<span class="tool-group__name">' + esc(tool.name) + "</span>" +
      '<span class="tool-group__count" aria-hidden="true"></span>' +
      '<span class="tool-group__chevron">' + icon("chevronDown") + "</span></button>" +
      '<div class="tool-group__body"><nav class="nav" id="' + esc(id) + '" aria-label="' + esc(tool.name) + '">' +
      (pages.length ? pageLinks(tool, pages) : '<a class="nav__item" href="' + esc(hrefFor(tool)) + '">' + icon("arrowRight") + "Open " + esc(tool.name) + "</a>") +
      "</nav></div></section>";
  }

  // ---------- Locked tools ----------
  // The booking link, tagged with the tool being used and the locked tool that was clicked
  function bookingLink(booking, from, locked) {
    const url = new URL(booking.url);
    url.searchParams.set("utm_source", from.repository || from.id);
    url.searchParams.set("utm_medium", "toolkit-app");
    url.searchParams.set("utm_campaign", locked.id);
    return url.toString();
  }

  function openPanel(tool, booking, from, opener) {
    const dlg = document.createElement("dialog");
    dlg.className = "modal modal--tool";
    dlg.setAttribute("aria-labelledby", "toolPanelName");
    dlg.innerHTML =
      '<div class="tool-panel">' +
      '<button type="button" class="icon-btn tool-panel__close" data-close aria-label="Close">' + icon("x") + "</button>" +
      '<div class="tool-panel__top"><span class="tool-panel__icon">' + icon(tool.icon) + "</span>" +
      '<div><h2 class="tool-panel__name" id="toolPanelName">' + esc(tool.name) + "</h2>" +
      '<span class="tool-panel__tag">' + icon("lock") + "Not in your toolkit yet</span></div></div>" +
      '<p class="tool-panel__text">' + esc(tool.description) + "</p>" +
      '<p class="tool-panel__line">' + esc(booking.line) + "</p>" +
      '<div class="tool-panel__actions"><button type="button" class="btn" data-close>Not now</button>' +
      '<a class="btn btn--primary" href="' + esc(bookingLink(booking, from, tool)) + '" target="_blank" rel="noopener" data-close>' +
      icon("calendar") + esc(booking.button) + "</a></div></div>";
    document.body.appendChild(dlg);
    dlg.addEventListener("click", function (e) {
      // A click on the dim area outside the panel lands on the dialog itself
      if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
    });
    dlg.addEventListener("close", function () {
      dlg.remove();
      if (opener && document.contains(opener)) opener.focus();
    });
    dlg.showModal();
    dlg.querySelector(".btn--primary").focus();
  }

  function render(catalogue, installed, menus, currentId) {
    const tools = Array.isArray(catalogue.tools) ? catalogue.tools : [];
    const booking = catalogue.booking || {};
    const inFolder = (installed.tools || []).filter(function (t) { return t && t.id; });
    const have = {};
    inFolder.forEach(function (t) { have[t.id] = true; });
    have[currentId] = true;
    const from = tools.find(function (t) { return t.id === currentId; }) || { id: currentId };

    // Other tools in this folder, in catalogue order, then any the catalogue doesn't know (a custom one)
    const known = {};
    tools.forEach(function (t) { known[t.id] = true; });
    const others = tools.filter(function (t) { return have[t.id] && t.id !== currentId; })
      .concat(inFolder.filter(function (t) { return !known[t.id] && t.id !== currentId; })
        .map(function (t) { return { id: t.id, name: t.name || t.id, icon: t.icon || "folder", app: t.app }; }));
    const othersEl = document.querySelector('[data-toolkit-menu="others"]');
    if (othersEl) {
      othersEl.innerHTML = others.map(function (t) { return otherGroup(t, menus[t.id] || []); }).join("");
      // On Home every tool starts open; inside a tool, the others start folded
      othersEl.querySelectorAll(".tool-group").forEach(function (g) { wireGroup(g, currentId === "home"); });
    }

    const moreEl = document.querySelector('[data-toolkit-menu="more"]');
    if (!moreEl) return;
    const locked = tools.filter(function (t) { return !have[t.id]; });
    const show = booking.showMoreTools !== false && booking.url && locked.length > 0;
    moreEl.className = "tools tools--more";
    moreEl.hidden = !show;
    if (!show) { moreEl.innerHTML = ""; return; }
    moreEl.setAttribute("role", "group");
    moreEl.setAttribute("aria-label", "More tools");
    moreEl.innerHTML = '<div class="side-label" aria-hidden="true">More tools</div>' + locked.map(function (t) {
      return '<button type="button" class="tools__item is-locked" data-locked-tool="' + esc(t.id) + '" aria-haspopup="dialog" aria-label="' + esc(t.name) + ', not in your toolkit yet">' +
        icon(t.icon) + '<span class="tools__name">' + esc(t.name) + "</span>" + icon("lock", "tools__lock") + "</button>";
    }).join("");
    moreEl.addEventListener("click", function (e) {
      const b = e.target.closest("[data-locked-tool]");
      if (!b) return;
      const tool = locked.find(function (t) { return t.id === b.getAttribute("data-locked-tool"); });
      if (tool) openPanel(tool, booking, from, b);
    });
  }

  function mount() {
    const currentId = document.body.getAttribute("data-tool");
    document.querySelectorAll(".tool-group").forEach(function (g) {
      const mine = g.getAttribute("data-tool-group") === currentId;
      g.classList.toggle("is-current", mine);
      wireGroup(g, mine);
    });
    if (!currentId) return Promise.resolve();
    return Promise.all([getJson("../shared/catalogue.json"), getJson("../installed.json")])
      .then(function (both) {
        const inFolder = (both[1].tools || []).filter(function (t) { return t && t.id && t.id !== currentId && typeof t.app === "string"; });
        // Each other tool's pages, from its own menu.json. A tool without one gets a single "Open" link.
        return Promise.all(inFolder.map(function (t) {
          return getJson(hrefFor(t) + "menu.json").then(function (m) { return [t.id, Array.isArray(m.pages) ? m.pages : []]; }, function () { return [t.id, []]; });
        })).then(function (pairs) {
          const menus = {};
          pairs.forEach(function (p) { menus[p[0]] = p[1]; });
          render(both[0], both[1], menus, currentId);
        });
      })
      .catch(function () { /* Opened without the helper: this tool's own pages still work */ });
  }

  window.TaskListOS.sidebar = { mount: mount, bookingLink: bookingLink };
  window.TaskListOS.toolkitMenu = window.TaskListOS.sidebar;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
