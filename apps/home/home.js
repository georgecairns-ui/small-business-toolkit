/*
  HOME: the dashboard for the whole app
  -------------------------------------
  Shared by every tool. Home is a grid of boxes. Each tool in this folder (apps/installed.json)
  supplies its own boxes: its apps/<tool>/menu.json lists, under "home.scripts", the files to load,
  and the last of them calls window.TaskListOS.home.register(toolId, { ... }) (see
  apps/task-list/home-boxes.js for a worked example).

  The person chooses which boxes show, in what order and how wide (Customise). That choice is
  saved through the helper in apps/home/data/layout.json. A box that's new to the layout (a tool
  attached later) starts switched off, so Home never changes without the person choosing it.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const LAYOUT_API = "/api/data/home/layout.json";
  const $ = function (sel) { return document.querySelector(sel); };

  const tools = {};        // toolId -> what it registered
  const order = [];        // toolIds in sidebar order
  let layout = null;       // [{ id: "task-list:plan", on: true, size: 2 }]
  let editing = false;
  let saving = Promise.resolve();

  // ---------- What tools call ----------
  function register(toolId, def) {
    tools[toolId] = def;
    if (order.indexOf(toolId) === -1) order.push(toolId);
  }

  // Every box from every tool, keyed "<tool>:<box>"
  function allBoxes() {
    const out = [];
    order.forEach(function (toolId) {
      const def = tools[toolId];
      (def.boxes || []).forEach(function (b, i) {
        out.push(Object.assign({ key: toolId + ":" + b.id, tool: toolId, rank: i }, b));
      });
    });
    return out;
  }
  function boxByKey(key) { return allBoxes().find(function (b) { return b.key === key; }); }

  function defaultLayout() {
    return allBoxes().map(function (b) { return { id: b.key, on: !!b.defaultOn, size: b.size === 2 ? 2 : 1 }; });
  }
  // Keep the saved layout, drop boxes that no longer exist, and add new ones switched off
  function mergeLayout(saved) {
    const keys = allBoxes().map(function (b) { return b.key; });
    const kept = (saved || []).filter(function (x) { return x && keys.indexOf(x.id) !== -1; })
      .map(function (x) { return { id: x.id, on: !!x.on, size: x.size === 2 ? 2 : 1 }; });
    keys.forEach(function (k) {
      if (!kept.some(function (x) { return x.id === k; })) kept.push({ id: k, on: false, size: boxByKey(k).size === 2 ? 2 : 1 });
    });
    return kept;
  }

  function saveLayout() {
    const body = JSON.stringify({ version: 1, boxes: layout });
    saving = saving.then(function () {
      return fetch(LAYOUT_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body }).then(function (r) {
        if (!r.ok) throw new Error("save failed");
      });
    }).catch(function () { ui.toast("Your Home layout couldn't be saved. Is the app running from its link?", { icon: "alert", duration: 6000 }); });
    return saving;
  }

  // ---------- Drawing ----------
  function greet() {
    const named = order.map(function (id) { return tools[id].greetingName && tools[id].greetingName(); }).filter(Boolean)[0];
    $("#greeting").textContent = ui.greeting() + (named ? ", " + named : "");
    $("#today").textContent = ui.longDate(new Date());
    const business = order.map(function (id) { return tools[id].businessName && tools[id].businessName(); }).filter(Boolean)[0];
    if (business) $("#businessName").textContent = business;
  }

  function boxHtml(b, item, index) {
    const def = tools[b.tool];
    let body;
    try { body = def.ready ? b.render(def.context) : '<div class="hbox__loading"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>'; }
    catch (e) { body = '<p class="hbox__empty">This box couldn\'t be drawn. Reload the page to try again.</p>'; }
    const open = b.page ? '<a class="hbox__open" href="' + esc(b.page) + '">Open' + icon("chevronRight") + "</a>" : "";
    const tools2 = editing ? '<div class="hbox__edit">' +
      '<span class="hbox__grip" aria-hidden="true">' + icon("grip") + "</span>" +
      '<button type="button" class="icon-btn icon-btn--sm" data-home-action="earlier" data-key="' + esc(b.key) + '" aria-label="Move ' + esc(b.title) + ' earlier"' + (index === 0 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
      '<button type="button" class="icon-btn icon-btn--sm" data-home-action="later" data-key="' + esc(b.key) + '" aria-label="Move ' + esc(b.title) + ' later">' + icon("chevronRight") + "</button>" +
      '<div class="segmented hbox__size" role="group" aria-label="Width of ' + esc(b.title) + '">' +
      '<button type="button" data-home-action="size" data-size="1" data-key="' + esc(b.key) + '" aria-pressed="' + (item.size === 1) + '">Standard</button>' +
      '<button type="button" data-home-action="size" data-size="2" data-key="' + esc(b.key) + '" aria-pressed="' + (item.size === 2) + '">Wide</button></div>' +
      '<button type="button" class="btn btn--sm" data-home-action="hide" data-key="' + esc(b.key) + '">Hide</button></div>' : open;
    return '<section class="hbox enter' + (item.size === 2 ? " hbox--wide" : "") + (editing ? " is-editing" : "") + '" style="--i:' + index + '" data-key="' + esc(b.key) + '"' + (editing ? ' draggable="true"' : "") + ' aria-label="' + esc(b.title) + '">' +
      '<header class="hbox__head"><span class="hbox__icon">' + icon(b.icon || "list") + '</span><h3 class="hbox__title">' + esc(b.title) + "</h3>" + tools2 + "</header>" +
      '<div class="hbox__body">' + body + "</div></section>";
  }

  function render() {
    greet();
    const grid = $("#grid");
    const shown = layout.filter(function (x) { return x.on && boxByKey(x.id); });
    if (!allBoxes().length) {
      grid.innerHTML = '<div class="empty"><h3>Nothing to show yet</h3><p>Home fills up from the tools in this folder. Open the app from its link (http://localhost:4747) so it can read them.</p></div>';
    } else if (!shown.length && !editing) {
      grid.innerHTML = '<div class="empty"><h3>Every box is hidden</h3><p>Press Customise to choose what Home shows.</p></div>';
    } else {
      grid.innerHTML = shown.map(function (x, i) { return boxHtml(boxByKey(x.id), x, i); }).join("");
    }
    const hidden = layout.filter(function (x) { return !x.on && boxByKey(x.id); });
    $("#hiddenBoxes").hidden = !editing || !hidden.length;
    $("#hiddenList").innerHTML = hidden.map(function (x) {
      const b = boxByKey(x.id);
      return '<button type="button" class="hidden-box" data-home-action="show" data-key="' + esc(b.key) + '">' + icon(b.icon || "list") + "<span>" + esc(b.title) + '</span><span class="hidden-box__add">' + icon("plus") + "Show</span></button>";
    }).join("");
    $("#editBar").hidden = !editing;
    $("#customiseBtn").hidden = editing;
    document.body.classList.toggle("is-customising", editing);
  }

  // Redraw one tool's boxes when its data changes (Claude edited a file, a tick, an approve)
  function refresh() { if (layout) render(); }

  // ---------- Customise ----------
  function move(key, by) {
    const shown = layout.filter(function (x) { return x.on; });
    const i = shown.findIndex(function (x) { return x.id === key; });
    const j = i + by;
    if (i < 0 || j < 0 || j >= shown.length) return;
    const a = layout.indexOf(shown[i]), b = layout.indexOf(shown[j]);
    const tmp = layout[a]; layout[a] = layout[b]; layout[b] = tmp;
    render();
    const btn = document.querySelector('[data-home-action="' + (by < 0 ? "earlier" : "later") + '"][data-key="' + key + '"]');
    if (btn && !btn.disabled) btn.focus();
  }

  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-home-action]");
    if (!el) return;
    const action = el.getAttribute("data-home-action");
    const key = el.getAttribute("data-key");
    const item = key ? layout.find(function (x) { return x.id === key; }) : null;
    switch (action) {
      case "customise": editing = true; render(); $("#editBar .btn--primary").focus(); break;
      case "done": editing = false; render(); saveLayout().then(function () { ui.toast("Home saved"); }); $("#customiseBtn").focus(); break;
      case "reset": layout = defaultLayout(); render(); break;
      case "hide": if (item) { item.on = false; render(); } break;
      case "show": if (item) { item.on = true; const at = layout.indexOf(item); layout.splice(at, 1); layout.push(item); render(); } break;
      case "size": if (item) { item.size = Number(el.getAttribute("data-size")) === 2 ? 2 : 1; render(); } break;
      case "earlier": move(key, -1); break;
      case "later": move(key, 1); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      default: {
        // Anything else belongs to a tool's box: "<tool>:<action>"
        const box = el.closest("[data-key]");
        const toolId = box ? box.getAttribute("data-key").split(":")[0] : action.split(":")[0];
        const def = tools[toolId];
        if (def && def.action) def.action(action.replace(/^[^:]+:/, ""), el);
      }
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") document.body.classList.remove("sidebar-open");
  });

  // Dragging boxes into a new order while customising
  let dragKey = null;
  const grid = $("#grid");
  grid.addEventListener("dragstart", function (e) {
    const box = e.target.closest(".hbox");
    if (!editing || !box) return;
    dragKey = box.getAttribute("data-key");
    box.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", dragKey); } catch (err) { /* some browsers only */ }
  });
  grid.addEventListener("dragover", function (e) {
    if (!dragKey) return;
    e.preventDefault();
    const over = e.target.closest(".hbox");
    if (!over || over.getAttribute("data-key") === dragKey) return;
    const from = layout.findIndex(function (x) { return x.id === dragKey; });
    const to = layout.findIndex(function (x) { return x.id === over.getAttribute("data-key"); });
    const moved = layout.splice(from, 1)[0];
    layout.splice(to, 0, moved);
    // Move the box on screen without redrawing, so the drag isn't interrupted
    const dragged = grid.querySelector('[data-key="' + dragKey + '"]');
    if (from < to) over.after(dragged); else over.before(dragged);
  });
  grid.addEventListener("dragend", function () {
    dragKey = null;
    render();
  });

  // ---------- Start ----------
  function getJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error(src)); };
      document.body.appendChild(s);
    });
  }

  function start() {
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      const tmp = document.createElement("span");
      tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
      el.replaceWith(tmp.firstChild);
    });
    greet();
    Promise.all([getJson("../installed.json"), getJson("../shared/catalogue.json").catch(function () { return { tools: [] }; })])
      .then(function (both) {
        const rank = {};
        (both[1].tools || []).forEach(function (t, i) { rank[t.id] = i; });
        const inFolder = (both[0].tools || []).filter(function (t) { return t && t.id && typeof t.app === "string"; })
          .sort(function (a, b) { return (rank[a.id] == null ? 99 : rank[a.id]) - (rank[b.id] == null ? 99 : rank[b.id]); });
        // Each tool's box scripts, in sidebar order, one tool at a time (a tool's scripts depend on each other)
        return inFolder.reduce(function (chain, t) {
          const base = "../" + t.app.replace(/^apps\//, "");
          return chain.then(function () {
            return getJson(base + "menu.json").then(function (m) {
              const scripts = m.home && Array.isArray(m.home.scripts) ? m.home.scripts : [];
              return scripts.reduce(function (c, src) { return c.then(function () { return loadScript(base + src); }); }, Promise.resolve());
            }).catch(function () { /* a tool without Home boxes, or one that failed to load: skip it quietly */ });
          });
        }, Promise.resolve());
      })
      .then(function () { return getJson(LAYOUT_API).then(function (saved) { return saved.boxes; }, function () { return null; }); })
      .then(function (saved) {
        layout = saved ? mergeLayout(saved) : defaultLayout();
        render();
        // Let each tool fetch its data; its boxes redraw as soon as it arrives
        order.forEach(function (id) {
          const def = tools[id];
          def.context = { refresh: refresh, esc: esc, icon: icon, ui: ui };
          if (def.start) def.start(def.context);
        });
      })
      .catch(function () {
        layout = [];
        render();
      });
  }

  window.TaskListOS.home = { register: register, refresh: refresh };
  start();
})();
