/*
  CALENDAR: the main view
  -----------------------
  Month (the first view) and week, the stats strip, the unplanned tray, and moving posts by dragging
  (mouse) or with the Move button (touch and keyboard). Each post shows a small card with its
  cover picture and scores when the mouse rests on it (hovercard.js); clicking it opens the post editor. A post
  with photos or videos shows a small cover picture, and files dragged in from a folder and dropped on a post
  are added to it. The controls for the month
  or week sit on the rail (app.js asks controls() for them). Every change goes through ctx.update()
  so it is saved and logged, and a toast offers Undo. Dragging an idea onto a day makes a post from it.

  Claude never posts. This page only plans.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.CM.model;
  const C = window.CM.components;
  const Hover = window.CM.hovercard;
  const Media = window.CM.media;

  const MODE_KEY = "cmos-calendar-mode", FILTER_KEY = "cmos-calendar-filter";
  const DAYS_SHOWN_IN_CELL = 3;
  // Under this width the month shows dots, and a tap opens the week. It matches the container query in app.css.
  const DOT_WIDTH = 560;

  function remembered(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }
  function rememberedFilter() {
    try {
      const list = JSON.parse(remembered(FILTER_KEY) || "[]");
      return Array.isArray(list) ? list.filter(function (k) { return M.platform(k); }) : [];
    } catch (e) { return []; }
  }

  // Screen state, kept while the person moves between pages (not saved in the file)
  const state = { mode: remembered(MODE_KEY) === "week" ? "week" : "month", anchor: null, filter: rememberedFilter(), planning: false };
  let current = null;       // { root, ctx } of the latest render, for the event handlers (and the rail)
  let dragging = null;      // { kind: "post" | "idea", id } while something is being dragged
  let boundRoot = null;     // the page element the listeners were attached to

  // ---------- Small helpers ----------
  function monthLabel(iso) { return ui.parseDate(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }
  function shortDate(iso, withYear) { return ui.parseDate(iso).toLocaleDateString("en-GB", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }); }
  function weekLabel(days) { return shortDate(days[0]) + " to " + shortDate(days[6], true); }
  function addMonths(iso, n) {
    const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 + n, 1));
    return d.toISOString().slice(0, 10);
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function activeFilter(ctx) {
    const on = M.onPlatforms(ctx.data);
    return state.filter.filter(function (k) { return on.indexOf(k) > -1; });
  }
  function ensureAnchor(ctx) { if (!state.anchor) state.anchor = ctx.today(); }
  function postById(ctx, id) { return ctx.data.posts.find(function (p) { return p.id === id; }); }

  // The unplanned tray: posts with no day, and ideas not planned yet
  function unplanned(ctx) {
    const keys = activeFilter(ctx);
    const posts = ctx.data.posts.filter(function (p) {
      if (p.date || p.status === "skipped") return false;
      return !keys.length || keys.some(function (k) { return p.platforms[k] && p.platforms[k].on === true; });
    });
    const ideas = ctx.data.ideas.filter(function (i) { return i.status === "new"; });
    return { posts: posts, ideas: ideas };
  }

  // ---------- Cards ----------
  function needTypes(post) {
    const seen = [];
    M.openNeeds(post).forEach(function (n) { if (seen.indexOf(n.type) === -1) seen.push(n.type); });
    return seen;
  }
  function tagRow(post) {
    const keys = M.onKeys(post), best = M.bestPlatform(post);
    const shown = keys.slice(0, 4).map(function (k) { return C.platformTag(k, best && best.key === k ? { score: best.score } : {}); });
    return shown.join("") + (keys.length > 4 ? '<span class="pcard__more">+' + (keys.length - 4) + "</span>" : "");
  }
  // The coloured left edge: the platform the post scores best on
  function hueClass(post) {
    const best = M.bestPlatform(post);
    return best ? " hue--" + best.key : "";
  }
  // withStrip: the week's cards show the cover as a strip along the top
  function postCard(post, withStrip) {
    const status = M.postStatus(post), title = M.titleOf(post), cover = withStrip ? M.cover(post) : null;
    return '<article class="pcard' + hueClass(post) + (cover ? " pcard--media" : "") + '" draggable="true" data-kind="post" data-media-drop data-id="' + esc(post.id) + '">' +
      (cover ? '<div class="pcard__strip">' + C.mediaThumb(cover) + "</div>" : "") +
      '<div class="pcard__main" role="button" tabindex="0" data-cal="open" data-id="' + esc(post.id) + '" aria-label="Edit ' + esc(title) + '">' +
        '<div class="pcard__top"><span class="pcard__time num">' + esc(post.time || "") + '</span><span class="pcard__icons">' +
          needTypes(post).map(C.needIcon).join("") + (post.approval === "auto" ? '<span class="chip chip--quiet" title="Claude approves this one without asking">Auto</span>' : "") + "</span></div>" +
        '<div class="pcard__title">' + esc(title) + "</div>" +
        '<div class="pcard__tags">' + tagRow(post) + "</div></div>" +
      '<div class="pcard__foot">' + C.statusPill(status) +
        '<button type="button" class="btn btn--sm btn--ghost pcard__move" data-cal="move" data-id="' + esc(post.id) + '" aria-label="Move ' + esc(title) + '">' + icon("calendar") + "Move</button></div></article>";
  }
  function ideaCard(idea) {
    return '<article class="pcard pcard--idea" draggable="true" data-kind="idea" data-id="' + esc(idea.id) + '">' +
      '<div class="pcard__main"><div class="pcard__top"><span class="pcard__time">Idea</span></div>' +
        '<div class="pcard__title">' + esc(idea.title || "Untitled idea") + "</div>" +
        '<div class="pcard__sub">' + esc(idea.theme || idea.notes || "") + "</div></div>" +
      '<div class="pcard__foot"><span class="pcard__src">' + esc(idea.source || "") + '</span>' +
        '<button type="button" class="btn btn--sm" data-cal="plan-idea" data-id="' + esc(idea.id) + '" aria-label="Plan ' + esc(idea.title || "this idea") + '">Plan it</button></div></article>';
  }
  function chip(post) {
    const title = M.titleOf(post), status = M.postStatus(post), label = M.STATUS_LABELS[status], cover = M.cover(post);
    return '<div class="mchip mchip--' + esc(status) + hueClass(post) + (cover ? " mchip--media" : "") + '" draggable="true" data-kind="post" data-media-drop data-id="' + esc(post.id) + '" role="button" tabindex="0" data-cal="open" aria-label="Edit ' + esc(title + ", " + label) + '">' +
      '<span class="mchip__title">' + esc(title) + "</span>" +
      '<span class="mchip__meta"><span class="mchip__time num">' + esc(post.time || "") + "</span>" + M.onKeys(post).slice(0, 3).map(function (k) { return C.platformTag(k); }).join("") +
        needTypes(post).slice(0, 2).map(C.needIcon).join("") + '<span class="sdot sdot--' + esc(status) + '" title="' + esc(label) + '"></span></span>' +
      (cover ? '<span class="mchip__thumb">' + C.mediaThumb(cover) + "</span>" : "") + "</div>";
  }

  // ---------- Pieces of the page ----------
  // The right of the rail: week or month, step through them, plan, add a post
  function controls(ctx) {
    ensureAnchor(ctx);
    const label = state.mode === "month" ? monthLabel(state.anchor) : weekLabel(M.weekDays(state.anchor, M.weekStartsOf(ctx.data)));
    return '<div class="segmented" role="group" aria-label="Calendar view">' +
        ["month", "week"].map(function (m) { return '<button type="button" data-cal="mode" data-mode="' + m + '" aria-pressed="' + (state.mode === m) + '">' + (m === "week" ? "Week" : "Month") + "</button>"; }).join("") + "</div>" +
      '<div class="rail__steps"><button type="button" class="icon-btn" data-cal="prev" aria-label="Previous ' + state.mode + '">' + icon("chevronLeft") + "</button>" +
        '<span class="rail__label" aria-live="polite">' + esc(label) + "</span>" +
        '<button type="button" class="icon-btn" data-cal="next" aria-label="Next ' + state.mode + '">' + icon("chevronRight") + "</button>" +
        '<button type="button" class="btn btn--sm" data-cal="today">Today</button></div>' +
      '<button type="button" class="btn cal__plan" data-cal="plan"' + (state.planning ? " disabled" : "") + ">" + icon(state.planning ? "loader" : "sparkle") +
        '<span class="cal__plan-label">' + (state.planning ? "Planning…" : "Plan next " + plural(Number(ctx.data.settings.planWeeks) || 2, "week", "weeks")) + "</span></button>" +
      '<button type="button" class="btn btn--primary" data-cal="new">' + icon("plus") + "New post</button>";
  }

  // The strip of numbers under the rail. Each one is a button that jumps to the matching view.
  function statsStrip(ctx) {
    const s = M.stats(ctx.data, ctx.today());
    const items = [
      ["posted", "Posted this month", s.posted + " of " + s.target, s.posted === 0 && s.target === 0],
      ["ahead", "Planned ahead", s.plannedWeeks === 0 ? "None" : plural(s.plannedWeeks, "week", "weeks"), s.plannedWeeks === 0],
      ["waiting", "Waiting on you", String(s.waiting), s.waiting === 0],
      ["score", "Average score", s.averageScore === null ? "None yet" : s.averageScore + "/10", s.averageScore === null]
    ];
    return '<div class="stats" role="group" aria-label="This month at a glance">' + items.map(function (x) {
      return '<button type="button" class="stat' + (x[3] ? " is-zero" : "") + '" data-cal="stat" data-stat="' + x[0] + '"><span>' + x[1] + "</span><b class=\"num\">" + esc(x[2]) + "</b></button>";
    }).join("") + "</div>";
  }
  function filters(ctx) {
    const on = M.onPlatforms(ctx.data), active = activeFilter(ctx);
    if (!on.length) return "";
    return '<div class="filters cal__filters" role="group" aria-label="Show only these platforms">' +
      on.map(function (k) { return '<button type="button" class="filter' + (active.indexOf(k) > -1 ? " is-active" : "") + '" data-cal="filter" data-key="' + esc(k) + '" aria-pressed="' + (active.indexOf(k) > -1) + '">' + C.platformTag(k) + esc(M.platform(k).label) + "</button>"; }).join("") +
      (active.length ? '<button type="button" class="link-btn" data-cal="filter-clear">Show all</button>' : "") + "</div>";
  }
  function tray(ctx) {
    const u = unplanned(ctx), n = u.posts.length + u.ideas.length;
    return '<aside class="tray" data-drop="tray" aria-label="Unplanned">' +
      '<div class="tray__head"><h2>Unplanned</h2><span class="badge">' + n + "</span></div>" +
      '<div class="tray__list">' + (n ? u.posts.map(function (p) { return postCard(p, false); }).join("") + u.ideas.map(ideaCard).join("") :
        '<p class="tray__empty muted">Nothing waiting. Ideas and posts with no day yet show here. Drag one onto a day to plan it.</p>') + "</div></aside>";
  }
  function weekView(ctx, days) {
    const today = ctx.today(), keys = activeFilter(ctx);
    const anyMedia = days.some(function (iso) { return M.postsForDay(ctx.data, iso, keys).some(function (p) { return !!M.cover(p); }); });
    return '<div class="week' + (anyMedia ? " week--media" : "") + '">' + days.map(function (iso) {
      const posts = M.postsForDay(ctx.data, iso, keys), d = ui.parseDate(iso);
      return '<section class="day' + (iso === today ? " is-today" : "") + (iso < today ? " is-past" : "") + '" data-drop="' + esc(iso) + '" aria-label="' + esc(M.dayLabel(iso)) + '">' +
        '<header class="day__head"><span class="day__name">' + esc(d.toLocaleDateString("en-GB", { weekday: "short" })) + '</span><span class="day__num num">' + d.getDate() + "</span>" +
          '<button type="button" class="icon-btn icon-btn--sm day__add" data-cal="add" data-iso="' + esc(iso) + '" aria-label="Add a post on ' + esc(M.dayLabel(iso)) + '">' + icon("plus") + "</button></header>" +
        '<div class="day__list">' + posts.map(function (p) { return postCard(p, true); }).join("") + "</div></section>";
    }).join("") + "</div>";
  }
  function monthView(ctx) {
    const today = ctx.today(), keys = activeFilter(ctx), grid = M.monthGrid(state.anchor, M.weekStartsOf(ctx.data));
    const head = grid[0].map(function (c) { return '<div class="month__dow">' + esc(ui.parseDate(c.iso).toLocaleDateString("en-GB", { weekday: "short" })) + "</div>"; }).join("");
    const rows = grid.map(function (week) {
      return week.map(function (c) {
        const posts = M.postsForDay(ctx.data, c.iso, keys), more = posts.length - DAYS_SHOWN_IN_CELL;
        return '<div class="mcell' + (c.inMonth ? "" : " is-outside") + (c.iso === today ? " is-today" : "") + '" data-drop="' + esc(c.iso) + '" aria-label="' + esc(M.dayLabel(c.iso)) + '">' +
          '<div class="mcell__head"><button type="button" class="mcell__num num" data-cal="goto-week" data-iso="' + esc(c.iso) + '" title="Open this week">' + Number(c.iso.slice(8, 10)) + "</button>" +
            '<button type="button" class="icon-btn icon-btn--sm mcell__add" data-cal="add" data-iso="' + esc(c.iso) + '" aria-label="Add a post on ' + esc(M.dayLabel(c.iso)) + '">' + icon("plus") + "</button></div>" +
          posts.slice(0, DAYS_SHOWN_IN_CELL).map(chip).join("") +
          (more > 0 ? '<button type="button" class="mcell__more" data-cal="goto-week" data-iso="' + esc(c.iso) + '">+' + more + " more</button>" : "") + "</div>";
      }).join("");
    }).join("");
    return '<div class="month"><div class="month__grid">' + head + rows + "</div></div>";
  }

  // ---------- Changes (each one saved, logged, and undoable) ----------
  function stamp(post) { post.updatedAt = new Date().toISOString(); }
  function movePost(ctx, id, iso) {
    const post = postById(ctx, id);
    if (!post || (post.date || null) === iso) return;
    const before = post.date || null, title = M.titleOf(post);
    const where = iso ? M.dayLabel(iso) : "Unplanned";
    function set(date, text) {
      return ctx.update(function (d) { const p = d.posts.find(function (x) { return x.id === id; }); p.date = date; stamp(p); }, text, id);
    }
    set(iso, "Moved “" + title + "” to " + where).then(function () {
      ctx.toast("Moved to " + where, function () { set(before, "Undid the move of “" + title + "”"); });
    });
  }
  function planIdea(ctx, id, iso) {
    C.planIdea(ctx, id, iso).catch(function (err) { C.reportFailure(ctx, err); });
  }
  // A new post on a day, or with no day yet when iso is null (it waits in Unplanned)
  function addPost(ctx, iso) {
    const id = M.makeId("p");
    ctx.update(function (d) {
      const post = M.postFromIdea(d, { id: null }, iso);
      post.id = id;
      d.posts.push(post);
    }, iso ? "Added a post for " + M.dayLabel(iso) : "Added a new post", id).then(function () { ctx.openPost(id); });
  }
  // Files dragged in from a folder and dropped on a post are added to it (the same way as in the post editor)
  function dropFiles(ctx, id, files) {
    if (postById(ctx, id)) Media.addFiles(ctx, id, files, function (message) { ctx.toast(message); });
  }
  // A post that is having files saved shows a thin bar along its bottom edge
  function markUploading() {
    if (!current) return;
    current.root.querySelectorAll("[data-media-drop]").forEach(function (el) {
      const now = Media.pending(el.getAttribute("data-id"));
      el.classList.toggle("is-uploading", now.length > 0);
      if (now.length) el.style.setProperty("--up", Math.round(now.reduce(function (a, u) { return a + u.percent; }, 0) / now.length) + "%");
    });
  }
  function dropOn(ctx, drag, target) {
    if (drag.kind === "idea") { if (target !== "tray") planIdea(ctx, drag.id, target); return; }
    movePost(ctx, drag.id, target === "tray" ? null : target);
  }

  // ---------- The Move picker (touch and keyboard) ----------
  function dialog() {
    let dlg = document.getElementById("calMoveDialog");
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "calMoveDialog";
    dlg.className = "modal modal--move";
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    dlg.addEventListener("submit", function (e) {
      e.preventDefault();
      const pick = e.submitter && e.submitter.getAttribute("data-unplanned") ? null : dlg.querySelector("[name=date]").value;
      if (pick === "") return;
      const kind = dlg.getAttribute("data-kind"), id = dlg.getAttribute("data-id");
      dlg.close();
      dropOn(current.ctx, { kind: kind, id: id }, pick === null ? "tray" : pick);
    });
    document.body.appendChild(dlg);
    return dlg;
  }
  function openPicker(kind, id) {
    const ctx = current.ctx, dlg = dialog();
    const item = kind === "idea" ? ctx.data.ideas.find(function (i) { return i.id === id; }) : postById(ctx, id);
    if (!item) return;
    const isIdea = kind === "idea";
    dlg.setAttribute("data-kind", kind);
    dlg.setAttribute("data-id", id);
    dlg.innerHTML = '<form method="dialog"><div class="modal__head"><h2>' + (isIdea ? "Plan " : "Move ") + "“" + esc(isIdea ? item.title || "Untitled idea" : M.titleOf(item)) + '”</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><label class="field"><span class="field__label">Day</span><input class="input" type="date" name="date" required value="' + esc(item.date || ctx.today()) + '"></label></div>' +
      '<div class="modal__foot">' + (isIdea || !item.date ? "" : '<button type="submit" class="btn" data-unplanned="1" formnovalidate>Unplanned</button>') +
        '<span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">' + (isIdea ? "Plan it" : "Move") + "</button></div></form>";
    dlg.showModal();
  }

  // ---------- Events (attached once; they read the latest render from `current`) ----------
  function clearDropHighlight() {
    document.body.classList.remove("cal-dragging");
    document.querySelectorAll(".is-over, .is-dragging, .is-file-over").forEach(function (el) { el.classList.remove("is-over", "is-dragging", "is-file-over"); });
  }
  function runPlan(ctx) {
    if (state.planning) return;
    state.planning = true;
    setPlanButton(true);
    ctx.runJob("plan-my-content").catch(function (err) { ctx.toast(err.message); }).finally(function () {
      state.planning = false;
      setPlanButton(false);
    });
  }
  function setPlanButton(busy) {
    const btn = document.querySelector("[data-cal=plan]");
    if (!btn || !current) return;
    btn.disabled = busy;
    btn.querySelector("svg").outerHTML = icon(busy ? "loader" : "sparkle");
    btn.querySelector(".cal__plan-label").textContent = busy ? "Planning…" : "Plan next " + plural(Number(current.ctx.data.settings.planWeeks) || 2, "week", "weeks");
  }
  function gotoWeek(ctx, iso) {
    state.anchor = iso;
    state.mode = "week";
    remember(MODE_KEY, "week");
    ctx.redraw();
  }
  // In the month, a post is only a dot when the page is narrow: a tap there opens that day's week
  function isDot(el) {
    return el.classList.contains("mchip") && el.closest(".cal").clientWidth < DOT_WIDTH;
  }
  const STAT_VIEWS = { posted: "health", score: "health", waiting: "todo" };

  const ACTIONS = {
    open: function (ctx, el) {
      if (isDot(el)) gotoWeek(ctx, el.closest("[data-drop]").getAttribute("data-drop"));
      else ctx.openPost(el.getAttribute("data-id"));
    },
    move: function (ctx, el) { openPicker("post", el.getAttribute("data-id")); },
    "plan-idea": function (ctx, el) { openPicker("idea", el.getAttribute("data-id")); },
    add: function (ctx, el) { addPost(ctx, el.getAttribute("data-iso")); },
    new: function (ctx) { addPost(ctx, null); },
    mode: function (ctx, el) { state.mode = el.getAttribute("data-mode"); remember(MODE_KEY, state.mode); ctx.redraw(); },
    prev: function (ctx) { state.anchor = state.mode === "month" ? addMonths(state.anchor, -1) : M.addDaysIso(state.anchor, -7); ctx.redraw(); },
    next: function (ctx) { state.anchor = state.mode === "month" ? addMonths(state.anchor, 1) : M.addDaysIso(state.anchor, 7); ctx.redraw(); },
    today: function (ctx) { state.anchor = ctx.today(); ctx.redraw(); },
    "goto-week": function (ctx, el) { gotoWeek(ctx, el.getAttribute("data-iso")); },
    filter: function (ctx, el) {
      const key = el.getAttribute("data-key"), at = state.filter.indexOf(key);
      if (at > -1) state.filter.splice(at, 1); else state.filter.push(key);
      remember(FILTER_KEY, JSON.stringify(state.filter));
      ctx.redraw();
    },
    "filter-clear": function (ctx) { state.filter = []; remember(FILTER_KEY, "[]"); ctx.redraw(); },
    stat: function (ctx, el) {
      const view = STAT_VIEWS[el.getAttribute("data-stat")];
      if (view) { ctx.go(view); return; }
      state.mode = "month";
      remember(MODE_KEY, "month");
      state.anchor = ctx.today();
      ctx.redraw();
    },
    plan: runPlan
  };

  function bind(root) {
    if (boundRoot === root) return;
    boundRoot = root;
    Hover.attach(root, function () { return current.ctx; });
    root.addEventListener("click", function (e) {
      const el = e.target.closest("[data-cal]");
      if (el && root.contains(el)) ACTIONS[el.getAttribute("data-cal")](current.ctx, el);
    });
    root.addEventListener("keydown", function (e) {
      const el = e.target.closest("[data-cal=open]");
      if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ACTIONS.open(current.ctx, el); }
    });
    root.addEventListener("dragstart", function (e) {
      const card = e.target.closest("[data-kind]");
      if (!card || !root.contains(card)) return;
      dragging = { kind: card.getAttribute("data-kind"), id: card.getAttribute("data-id") };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragging.kind + ":" + dragging.id);
      card.classList.add("is-dragging");
      document.body.classList.add("cal-dragging");
    });
    root.addEventListener("dragover", function (e) {
      if (Media.hasFiles(e)) {
        const post = e.target.closest("[data-media-drop]");
        if (post) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; post.classList.add("is-file-over"); }
        return;
      }
      const zone = dragging && e.target.closest("[data-drop]");
      if (!zone || (dragging.kind === "idea" && zone.getAttribute("data-drop") === "tray")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      root.querySelectorAll(".is-over").forEach(function (z) { if (z !== zone) z.classList.remove("is-over"); });
      zone.classList.add("is-over");
    });
    root.addEventListener("dragleave", function (e) {
      const post = e.target.closest("[data-media-drop]");
      if (post && !post.contains(e.relatedTarget)) post.classList.remove("is-file-over");
      const zone = e.target.closest("[data-drop]");
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("is-over");
    });
    root.addEventListener("drop", function (e) {
      if (Media.hasFiles(e)) {
        const post = e.target.closest("[data-media-drop]");
        if (!post) return;
        e.preventDefault();
        clearDropHighlight();
        dropFiles(current.ctx, post.getAttribute("data-id"), e.dataTransfer.files);
        return;
      }
      const zone = dragging && e.target.closest("[data-drop]");
      if (!zone) return;
      e.preventDefault();
      const drag = dragging;
      dragging = null;
      clearDropHighlight();
      dropOn(current.ctx, drag, zone.getAttribute("data-drop"));
    });
    root.addEventListener("dragend", function () { dragging = null; clearDropHighlight(); });
  }

  // ---------- The view ----------
  function render(root, ctx) {
    current = { root: root, ctx: ctx };
    ensureAnchor(ctx);
    bind(root);
    Hover.hide();
    const days = M.weekDays(state.anchor, M.weekStartsOf(ctx.data));
    root.innerHTML = '<div class="page page--wide"><div class="cal">' + statsStrip(ctx) + filters(ctx) +
      '<div class="cal__layout"><div class="cal__main">' + (state.mode === "month" ? monthView(ctx) : weekView(ctx, days)) + "</div>" + tray(ctx) + "</div></div></div>";
    markUploading();
  }

  function line(ctx) {
    const today = ctx.today(), week = M.weekDays(today, M.weekStartsOf(ctx.data));
    const thisWeek = week.reduce(function (n, iso) { return n + M.postsForDay(ctx.data, iso).length; }, 0);
    const waiting = unplanned(ctx);
    const loose = waiting.posts.length + waiting.ideas.length;
    return plural(thisWeek, "post", "posts") + " this week" + (loose ? ", " + loose + " unplanned" : "");
  }

  Media.watch(markUploading);

  window.CM.views = window.CM.views || {};
  // act: a button on the rail (see controls) was pressed
  window.CM.views.calendar = {
    title: "Calendar", line: line, render: render, controls: controls,
    act: function (el) { ACTIONS[el.getAttribute("data-cal")](current.ctx, el); }
  };
})();
