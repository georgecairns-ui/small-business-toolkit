/*
  HOVER CARD: the small card that shows a post and its scores
  -----------------------------------------------------------
  Appears when the mouse rests on a post or the keyboard focuses it. A post with a photo or video shows
  it first, laid out like the real post: the business name, the cover picture and the first lines of the
  words on the platform it scores best on. A post with no picture shows its shot list idea instead. Then
  the status, each platform the post goes to with its score out of 10 and Claude's one-line reason, and
  anything still needed from the person. It hides when the mouse leaves, focus moves away, Escape is pressed, the page scrolls or
  a drag starts. It is placed so it never runs off the screen. It never shows on touch, where a tap
  opens the post instead. Clicking opens the post editor, where the full score is explained.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc;
  const M = window.CM.model;
  const C = window.CM.components;

  const TARGET = '[data-cal="open"]';
  const SHOW_AFTER_MS = 140, GAP = 8, EDGE = 8;

  let card = null, timer = null, shownFor = null;

  function element() {
    if (card) return card;
    card = document.createElement("div");
    card.className = "hover-card";
    card.id = "hoverCard";
    card.setAttribute("role", "tooltip");
    card.hidden = true;
    document.body.appendChild(card);
    return card;
  }

  function platformRow(post, key) {
    const s = M.score(post.platforms[key]), reason = post.platforms[key].reason;
    return '<li class="hover-card__plat">' + C.platformTag(key) + '<span class="hover-card__name">' + esc(M.platform(key).label) + "</span>" +
      '<b class="hover-card__score num">' + (s === null ? "Not scored" : s + "/10") + "</b>" +
      (reason ? '<span class="hover-card__reason">' + esc(reason) + "</span>" : "") + "</li>";
  }
  function needRow(need) {
    return '<li class="hover-card__need">' + C.needIcon(need.type) + "<span>" + esc(need.text) + "</span></li>";
  }
  // The words as the feed first shows them, from the platform the post scores best on (else the first one with words)
  function firstWords(post) {
    const best = M.bestPlatform(post), keys = M.onKeys(post);
    const key = best && post.platforms[best.key].text ? best.key : keys.find(function (k) { return post.platforms[k].text; });
    return key ? M.preview(key, post.platforms[key].text).shown : "";
  }
  // Like a real post: who, the picture, the first lines
  function postLook(ctx, post, cover) {
    const name = ctx.data.settings.businessName || "Your business", words = firstWords(post);
    return '<div class="hover-card__post"><div class="hover-card__who"><span class="pview__avatar" aria-hidden="true">' + esc(Array.from(name)[0].toUpperCase()) + "</span>" +
      '<span class="hover-card__bname">' + esc(name) + "</span></div>" +
      '<div class="hover-card__media">' + C.mediaThumb(cover) + "</div>" +
      (words ? '<p class="hover-card__words">' + esc(words) + "</p>" : '<p class="hover-card__words muted">No words written yet.</p>') + "</div>";
  }
  function html(ctx, post) {
    const keys = M.onKeys(post), needs = M.openNeeds(post), cover = M.cover(post);
    return (cover ? postLook(ctx, post, cover) : "") + '<div class="hover-card__head">' + C.statusPill(M.postStatus(post)) + '<span class="hover-card__when muted">' + esc(post.date ? M.dayLabel(post.date) + (post.time ? ", " + post.time : "") : "Unplanned") + "</span></div>" +
      '<div class="hover-card__title">' + esc(M.titleOf(post)) + "</div>" +
      (!cover && post.shot ? '<p class="hover-card__shot">' + esc(post.shot) + "</p>" : "") +
      (keys.length ? '<ul class="hover-card__list">' + keys.map(function (k) { return platformRow(post, k); }).join("") + "</ul>" : '<p class="hover-card__none muted">No platform chosen yet.</p>') +
      (needs.length ? '<div class="hover-card__label">Still needed</div><ul class="hover-card__list">' + needs.map(needRow).join("") + "</ul>" : "") +
      '<p class="hover-card__hint muted">Click to open, edit and see the full score.</p>';
  }

  // Under the post when there is room, above it when there isn't, and never past the edges of the screen
  function place(anchor) {
    const a = anchor.getBoundingClientRect(), c = card.getBoundingClientRect();
    const below = a.bottom + GAP, above = a.top - GAP - c.height;
    const top = below + c.height <= window.innerHeight - EDGE ? below : above >= EDGE ? above : Math.max(EDGE, window.innerHeight - EDGE - c.height);
    const left = Math.max(EDGE, Math.min(a.left, window.innerWidth - EDGE - c.width));
    card.style.top = top + "px";
    card.style.left = left + "px";
  }

  function hide() {
    clearTimeout(timer);
    timer = null;
    if (shownFor) shownFor.removeAttribute("aria-describedby");
    shownFor = null;
    if (card) card.hidden = true;
  }
  function show(anchor, post, ctx) {
    const el = element();
    shownFor = anchor;
    el.className = "hover-card" + (M.cover(post) ? " hover-card--media" : "");
    el.innerHTML = html(ctx, post);
    el.hidden = false;
    anchor.setAttribute("aria-describedby", el.id);
    place(anchor);
  }

  // The mouse only counts on a device that has one; a tap there opens the post
  function mouseWorks() { return window.matchMedia("(hover: hover)").matches; }

  // Attaches to a page element once. getCtx gives the latest data every time.
  function attach(root, getCtx) {
    function lookUp(el) {
      const id = el.getAttribute("data-id");
      return getCtx().data.posts.find(function (p) { return p.id === id; });
    }
    function showSoon(el, wait) {
      const post = lookUp(el);
      if (!post || el === shownFor) return;
      clearTimeout(timer);
      timer = setTimeout(function () { show(el, post, getCtx()); }, wait);
    }
    root.addEventListener("mouseover", function (e) {
      const el = e.target.closest(TARGET);
      if (el && root.contains(el) && mouseWorks()) showSoon(el, SHOW_AFTER_MS);
    });
    root.addEventListener("mouseout", function (e) {
      const el = e.target.closest(TARGET);
      if (el && !el.contains(e.relatedTarget)) hide();
    });
    // Keyboard focus only: a tap also focuses, but a tap opens the post
    root.addEventListener("focusin", function (e) {
      const el = e.target.closest(TARGET);
      if (el && root.contains(el) && el.matches(":focus-visible")) showSoon(el, 0);
    });
    root.addEventListener("focusout", hide);
    root.addEventListener("dragstart", hide);
    root.addEventListener("click", hide);
    root.addEventListener("scroll", hide, true);
  }

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  window.addEventListener("resize", hide);

  window.CM.hovercard = { attach: attach, hide: hide };
})();
