/*
  THE POST EDITOR: a panel that slides in from the right
  ------------------------------------------------------
  Opens from any card, any To do row and any link. Everything about the post is edited here, in
  place: title, day, time and theme; Ask me first or Automatic; which platforms; for each platform a
  small preview of how it reads in the feed (with the cover picture above the words), the words with a
  count, Copy, Open and "I've posted it"; how it scored on each platform, factor by factor; the shot
  list; what Claude needs from the person; and the buttons that ask Claude to write or change the post.

  Photos and videos: a section near the top takes files dragged from a folder (onto it, or anywhere on
  the panel) or chosen with a button. media.js saves them and adds them to the post. Each one can be
  made the cover, moved, viewed large or taken off the post (which only unlinks it: the file stays in the folder).

  Claude never posts. Every save goes through ctx.update(), so it is written to the file and
  logged. Typing is saved when the person leaves the box, without redrawing the panel, so a click
  on the next button is never lost.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.CM.model;
  const C = window.CM.components;
  const Media = window.CM.media;

  const FACTOR_LABELS = {
    fit: ["Fit", "The format suits this platform"],
    demand: ["Demand", "People are searching for or talking about this"],
    hook: ["Hook", "The first line or first 2 seconds stop the scroll"],
    proof: ["Proof", "It matches what works for competitors, or carries real proof"],
    timing: ["Timing", "In season, trending now, or tied to a date"]
  };
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

  let getCtx = null, el = null, scrim = null;
  // Screen state: what the person has typed but not sent yet, and which tab is showing
  // asking: the posts Claude is being asked about right now, so the buttons can't be pressed twice
  // notices: messages about files that couldn't be added; dragMedia: the id of the file being dragged to a new place
  const state = { id: null, tab: null, expanded: {}, note: "", answers: {}, links: {}, newNeed: { type: "photo", text: "" }, opener: null, skipRefresh: false, asking: {}, notices: [], dragMedia: null };

  // ---------- Small helpers ----------
  function ctxNow() { return getCtx(); }
  function postNow() { return ctxNow().data.posts.find(function (p) { return p.id === state.id; }); }
  // Platforms the person has switched on in Platforms (the ones the post can go to)
  function availableKeys(ctx) { return M.onPlatforms(ctx.data); }
  function formatLabel(f) { return f.charAt(0).toUpperCase() + f.slice(1).replace("-", " "); }
  function safeLink(url) { return /^https?:\/\//i.test(url || "") ? url : ""; }

  // ---------- Saving ----------
  // quiet: the panel is not redrawn when the save comes back (used for typing)
  function save(mutator, activityText, quiet) {
    const id = state.id;
    if (quiet) state.skipRefresh = true;
    return ctxNow().update(function (d) {
      const p = d.posts.find(function (x) { return x.id === id; });
      mutator(p, d);
      p.updatedAt = new Date().toISOString();
    }, activityText, id);
  }
  function toast(message, undo) { ctxNow().toast(message, undo); }

  // ---------- Drawing ----------
  function select(name, options, value, attrs) {
    return '<select class="select" ' + attrs + ' name="' + name + '">' + options.map(function (o) {
      return '<option value="' + esc(o.value) + '"' + (o.value === value ? " selected" : "") + ">" + esc(o.label) + "</option>";
    }).join("") + "</select>";
  }
  function prop(label, value) {
    return '<div class="prop"><span class="prop__label">' + esc(label) + '</span><span class="prop__value">' + value + "</span></div>";
  }
  function themeOptions(ctx, post) {
    const themes = ctx.data.settings.themes.slice();
    if (post.theme && themes.indexOf(post.theme) === -1) themes.push(post.theme);
    return [{ value: "", label: "No theme" }].concat(themes.map(function (t) { return { value: t, label: t }; }));
  }

  function basics(ctx, post) {
    return '<input class="input input--title" data-f="title" value="' + esc(post.title) + '" placeholder="Give the post a title" aria-label="Post title" maxlength="140">' +
      '<div class="props">' +
        prop("Day", '<input class="input input--sm" type="date" data-f="date" value="' + esc(post.date || "") + '" aria-label="Day">' +
          (post.date ? '<button type="button" class="btn btn--sm" data-d="unplanned">Unplanned</button>' : '<span class="muted drawer__small">Unplanned</span>')) +
        prop("Time", '<input class="input input--sm" type="time" data-f="time" value="' + esc(post.time || "") + '" aria-label="Time">') +
        prop("Theme", select("theme", themeOptions(ctx, post), post.theme || "", 'data-f="theme" aria-label="Theme"')) +
      "</div>" +
      '<div class="drawer__section"><h3 class="drawer__h">Who approves it</h3><div class="segmented" role="group" aria-label="Who approves it">' +
        [["ask", "Ask me first"], ["auto", "Automatic"]].map(function (a) { return '<button type="button" data-d="approval" data-v="' + a[0] + '" aria-pressed="' + (post.approval === a[0]) + '">' + a[1] + "</button>"; }).join("") + "</div>" +
        '<p class="drawer__small muted">Claude never posts, either way. Ask me first waits for your Approve. Automatic means Claude approves it without asking. You post it yourself on the day.</p></div>';
  }

  function platformsRow(ctx, post) {
    const wanted = availableKeys(ctx).concat(M.onKeys(post));
    const keys = M.PLATFORMS.map(function (p) { return p.key; }).filter(function (k) { return wanted.indexOf(k) > -1; });
    if (!keys.length) return '<div class="drawer__section"><h3 class="drawer__h">Platforms</h3><p class="drawer__small muted">Switch a platform on in Platforms first, then choose it here.</p></div>';
    const on = M.onKeys(post);
    const also = availableKeys(ctx).filter(function (k) {
      const s = M.score(post.platforms[k]);
      return on.indexOf(k) === -1 && s !== null && s >= 7;
    });
    return '<div class="drawer__section"><h3 class="drawer__h">Platforms</h3>' +
      '<div class="filters" role="group" aria-label="Platforms for this post">' + keys.map(function (k) {
        return '<button type="button" class="filter' + (on.indexOf(k) > -1 ? " is-active" : "") + '" data-d="toggle-platform" data-key="' + esc(k) + '" aria-pressed="' + (on.indexOf(k) > -1) + '">' + C.platformTag(k) + esc(M.platform(k).label) + "</button>";
      }).join("") + "</div>" +
      '<div class="drawer__row"><button type="button" class="btn btn--sm" data-d="plat-all">All</button><button type="button" class="btn btn--sm" data-d="plat-rec">Recommended</button></div>' +
      also.map(function (k) { return '<p class="drawer__small"><button type="button" class="link-btn" data-d="toggle-platform" data-key="' + esc(k) + '">Also good on ' + esc(M.platform(k).label) + ", " + M.score(post.platforms[k]) + "/10</button></p>"; }).join("") + "</div>";
  }

  function countHtml(key, text) {
    const c = M.charCount(key, text);
    if (c.limit === null) return c.count + " characters";
    return c.count + " of " + c.limit + (key === "youtube" ? " (title, the first line)" : "") + (c.over ? ", " + (c.count - c.limit) + " over" : "");
  }
  // The 5 factors, each worth 0, 1 or 2, drawn as a small bar
  function factorBars(entry) {
    return '<ul class="factors">' + M.FACTORS.map(function (f) {
      const v = entry.factors && typeof entry.factors[f] === "number" ? entry.factors[f] : null;
      return '<li title="' + esc(FACTOR_LABELS[f][1]) + '"><span class="factors__label">' + FACTOR_LABELS[f][0] + "</span>" +
        '<span class="fbar fbar--v' + (v === null ? 0 : Math.min(2, Math.max(0, Math.round(v)))) + '" role="img" aria-label="' + (v === null ? "not scored" : v + " out of 2") + '"><i></i></span>' +
        '<span class="factors__value num">' + (v === null ? "-" : v + "/2") + "</span></li>";
    }).join("") + "</ul>";
  }
  function scoreBox(post, key) {
    const entry = post.platforms[key], s = M.score(entry);
    return '<div class="scorebox"><div class="scorebox__head">' + C.platformTag(key) + '<span class="scorebox__name">' + esc(M.platform(key).label) + "</span>" +
      '<span class="scorebox__num num">' + (s === null ? "-" : s) + "<small>/10</small></span></div>" +
      (s === null ? '<p class="drawer__small muted">Not scored yet. Claude scores each post when it writes it.</p>' : factorBars(entry) + (entry.reason ? '<p class="reason">' + esc(entry.reason) + "</p>" : "")) + "</div>";
  }
  function scoreSection(post) {
    const keys = M.onKeys(post);
    if (!keys.length) return "";
    return '<div class="drawer__section"><h3 class="drawer__h">How it scored</h3><div class="scoregrid">' + keys.map(function (k) { return scoreBox(post, k); }).join("") + "</div></div>";
  }

  // How the words first read in the feed: cut where the platform says "see more"
  function previewText(key, text) {
    const p = M.preview(key, text), open = !!state.expanded[key];
    if (!p.shown) return '<span class="pview__empty">Nothing written yet. The first words people see will show here.</span>';
    if (!p.cut) return esc(p.shown);
    return open ? esc(String(text).trim()) + ' <button type="button" class="link-btn" data-d="see-more" data-key="' + esc(key) + '">show less</button>' :
      esc(p.shown) + '… <button type="button" class="link-btn" data-d="see-more" data-key="' + esc(key) + '">see more</button>';
  }
  function preview(ctx, post, key, entry) {
    const name = ctx.data.settings.businessName || "Your business", label = M.platform(key).label, cover = M.cover(post);
    return '<div class="pview" aria-label="How it looks on ' + esc(label) + '"><div class="pview__head"><span class="pview__avatar" aria-hidden="true">' + esc(Array.from(name)[0].toUpperCase()) + "</span>" +
      '<div class="pview__who"><span class="pview__name">' + esc(name) + '</span><span class="pview__sub">' + esc(label) + ' preview</span></div></div>' +
      (cover ? '<div class="pview__media">' + C.mediaThumb(cover) + "</div>" : "") +
      '<p class="pview__text" data-preview="' + esc(key) + '">' + previewText(key, entry.text) + "</p></div>";
  }
  function refreshPreview(key, text) {
    const box = el.querySelector('[data-preview="' + key + '"]');
    if (box) box.innerHTML = previewText(key, text);
  }
  function postedBox(key, entry) {
    if (entry.postedAt) {
      const link = safeLink(entry.link);
      return '<div class="posted"><span class="chip chip--success">' + icon("check") + "Posted " + esc(M.dayLabel(M.localDay(entry.postedAt))) + "</span>" +
        (link ? '<a class="link-btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">See the post</a>' : "") +
        '<button type="button" class="link-btn" data-d="unposted" data-key="' + esc(key) + '">Not posted after all</button></div>';
    }
    return '<div class="posted"><input class="input input--sm" type="url" data-link="' + esc(key) + '" value="' + esc(state.links[key] || "") + '" placeholder="Link to the post (optional)" aria-label="Link to the post, optional">' +
      '<button type="button" class="btn btn--sm btn--primary" data-d="posted" data-key="' + esc(key) + '">' + icon("check") + "I’ve posted it</button></div>";
  }
  function tabPanel(ctx, post, key) {
    const p = M.platform(key), entry = post.platforms[key], s = M.score(entry);
    const formats = p.formats.indexOf(entry.format) > -1 || !entry.format ? p.formats : p.formats.concat([entry.format]);
    const c = M.charCount(key, entry.text);
    return '<div class="ppanel" role="tabpanel" aria-label="' + esc(p.label) + '">' +
      '<div class="ppanel__row"><label class="field"><span class="field__label">Format</span>' +
        select("format", formats.map(function (f) { return { value: f, label: formatLabel(f) }; }), entry.format || formats[0], 'data-f="format" data-key="' + esc(key) + '"') + "</label>" +
        '<div class="score" aria-label="Score for ' + esc(p.label) + '"><span class="score__num num">' + (s === null ? "-" : s) + '</span><span class="score__of">/10</span></div></div>' +
      preview(ctx, post, key, entry) +
      '<label class="field"><span class="field__label">What goes out on ' + esc(p.label) + '</span><textarea class="textarea ppanel__text" rows="9" data-f="text" data-key="' + esc(key) + '" placeholder="Claude writes this when you ask. You can also write it yourself.">' + esc(entry.text) + "</textarea></label>" +
      '<div class="ppanel__meta"><span class="count' + (c.over ? " is-over" : "") + '" data-chars="' + esc(key) + '">' + esc(countHtml(key, entry.text)) + "</span></div>" +
      '<div class="drawer__row"><button type="button" class="btn btn--sm" data-d="copy" data-key="' + esc(key) + '">' + icon("fileText") + "Copy</button>" +
        (p.openUrl ? '<a class="btn btn--sm" href="' + esc(p.openUrl) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "Open " + esc(p.label) + "</a>" : "") + "</div>" +
      postedBox(key, entry) + "</div>";
  }
  function tabs(ctx, post) {
    const keys = M.onKeys(post);
    if (!keys.length) return "";
    if (keys.indexOf(state.tab) === -1) state.tab = keys[0];
    return '<div class="drawer__section"><div class="ptabs" role="tablist" aria-label="Words for each platform">' + keys.map(function (k) {
      return '<button type="button" class="ptab" role="tab" data-d="tab" data-key="' + esc(k) + '" aria-selected="' + (k === state.tab) + '">' + C.platformTag(k) + esc(M.platform(k).label) + (post.platforms[k].postedAt ? icon("check") : "") + "</button>";
    }).join("") + "</div>" + tabPanel(ctx, post, state.tab) + "</div>";
  }

  // ---------- Photos and videos ----------
  function uploadsHtml(postId) {
    return Media.pending(postId).map(function (u) {
      return '<div class="mup"><span class="mup__name">' + esc(u.name) + '</span><progress max="100" value="' + u.percent + '" aria-label="Saving ' + esc(u.name) + '"></progress><span class="mup__pct num">' + u.percent + "%</span></div>";
    }).join("");
  }
  function noticesHtml() {
    return state.notices.map(function (text, i) {
      return '<div class="mnotice" role="alert">' + icon("alert") + "<span>" + esc(text) + '</span><button type="button" class="icon-btn icon-btn--sm" data-d="notice-dismiss" data-i="' + i + '" aria-label="Dismiss">' + icon("x") + "</button></div>";
    }).join("");
  }
  // The need a file just added could answer, one click each. (A single matching need is ticked off on its own.)
  function tickOffers(post) {
    return M.tickable(post).map(function (n) {
      return '<button type="button" class="btn btn--sm mtick" data-d="need-toggle" data-id="' + esc(n.id) + '">' + icon("check") + "Tick off: " + esc(n.text) + "</button>";
    }).join("");
  }
  function mediaTile(post, m, at) {
    const cover = M.cover(post), isCover = !!cover && cover.id === m.id, last = at === post.media.length - 1, id = esc(m.id);
    return '<li class="mtile' + (isCover ? " is-cover" : "") + '" draggable="true" data-media-id="' + id + '">' +
      '<button type="button" class="mtile__view" data-d="media-view" data-id="' + id + '" aria-label="View ' + esc(m.name) + ' large">' + C.mediaThumb(m, m.name) + "</button>" +
      (isCover ? '<span class="mtile__badge">Cover</span>' : "") +
      '<span class="mtile__name" title="' + esc(m.name) + '">' + esc(m.name) + "</span>" +
      '<div class="mtile__actions">' +
        '<button type="button" class="icon-btn icon-btn--sm" data-d="media-earlier" data-id="' + id + '" aria-label="Move ' + esc(m.name) + ' earlier"' + (at === 0 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
        '<button type="button" class="icon-btn icon-btn--sm" data-d="media-later" data-id="' + id + '" aria-label="Move ' + esc(m.name) + ' later"' + (last ? " disabled" : "") + ">" + icon("chevronRight") + "</button>" +
        (m.type === "image" && !isCover ? '<button type="button" class="btn btn--sm" data-d="media-cover" data-id="' + id + '">Make cover</button>' : "") +
        '<button type="button" class="btn btn--sm" data-d="media-remove" data-id="' + id + '">Remove from post</button></div></li>';
  }
  function mediaSection(post) {
    const list = post.media;
    return '<div class="drawer__section" data-section="media"><h3 class="drawer__h">Photos and videos</h3>' +
      '<div class="mdrop"><p class="mdrop__text">Drag photos and videos here from a folder, or choose them from your computer.</p>' +
        '<button type="button" class="btn btn--sm" data-d="media-pick">' + icon("plus") + "Add from your computer</button>" +
        '<input type="file" multiple accept="image/*,video/*" hidden data-media-input aria-label="Choose photos and videos"></div>' +
      '<div data-notices>' + noticesHtml() + '</div><div data-uploads>' + uploadsHtml(post.id) + "</div>" +
      (list.length ? '<ul class="mgrid" data-media-grid>' + list.map(function (m, i) { return mediaTile(post, m, i); }).join("") + "</ul>" +
        '<p class="drawer__small muted">Drag to change the order. The first photo is the cover. Remove from post only takes it off this post: the file stays in the media folder inside Content Machine OS on this computer.</p>' :
        '<p class="drawer__small muted">Nothing added yet. The first photo you add becomes the cover and shows on the calendar.</p>') +
      '<div class="drawer__row" data-ticks>' + tickOffers(post) + "</div></div>";
  }
  function showUploads() {
    const box = el && state.id ? el.querySelector("[data-uploads]") : null;
    if (box) box.innerHTML = uploadsHtml(state.id);
  }
  function showNotices() {
    const box = el ? el.querySelector("[data-notices]") : null;
    if (box) box.innerHTML = noticesHtml();
  }
  function addFiles(files) {
    const id = state.id;
    Media.addFiles(ctxNow(), id, files, function (message) {
      if (state.id !== id) { toast(message); return; }
      state.notices.push(message);
      showNotices();
    });
  }
  // Saves to a post by its id (not the one open now), so an Undo still works after the panel is closed
  function updatePost(id, mutator, activityText) {
    return ctxNow().update(function (d) {
      const p = d.posts.find(function (x) { return x.id === id; });
      mutator(p);
      p.updatedAt = new Date().toISOString();
    }, activityText, id).catch(failed);
  }
  function mediaItemById(id) { return postNow().media.find(function (m) { return m.id === id; }); }
  function makeCover(id) {
    const post = postNow(), item = mediaItemById(id), title = M.titleOf(post);
    save(function (p) { M.makeCover(p, id); }, "Made “" + item.name + "” the cover of “" + title + "”").catch(failed);
  }
  function moveMedia(id, step) {
    const post = postNow(), list = post.media, at = list.findIndex(function (m) { return m.id === id; });
    const before = step < 0 ? list[at - 1] : list[at + 2];
    save(function (p) { M.moveMedia(p, id, before ? before.id : null); }, "Changed the order of the photos and videos on “" + M.titleOf(post) + "”").catch(failed);
  }
  function removeMedia(id) {
    const post = postNow(), postId = post.id, item = mediaItemById(id), title = M.titleOf(post);
    let spot = null;
    save(function (p) { spot = M.detachMedia(p, id); }, "Took “" + item.name + "” off “" + title + "”").then(function () {
      toast("Taken off the post. The file is still in your media folder.", function () {
        updatePost(postId, function (p) { M.restoreMedia(p, item, spot.at); }, "Put “" + item.name + "” back on “" + title + "”");
      });
    }).catch(failed);
  }

  // The large view: a simple pop-up with the photo, or the video with its own controls
  function lightbox() {
    let dlg = document.getElementById("mediaLightbox");
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "mediaLightbox";
    dlg.className = "lightbox";
    dlg.addEventListener("click", function (e) {
      const b = e.target.closest("[data-lb]");
      if (e.target === dlg || e.target.classList.contains("lightbox__stage") || (b && b.getAttribute("data-lb") === "close")) dlg.close();
      else if (b) showLightbox(Number(dlg.getAttribute("data-at")) + (b.getAttribute("data-lb") === "next" ? 1 : -1));
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") showLightbox(Number(dlg.getAttribute("data-at")) - 1);
      if (e.key === "ArrowRight") showLightbox(Number(dlg.getAttribute("data-at")) + 1);
    });
    dlg.addEventListener("close", function () { dlg.innerHTML = ""; });
    document.body.appendChild(dlg);
    return dlg;
  }
  function showLightbox(at) {
    const dlg = lightbox(), list = postNow().media;
    if (at < 0 || at >= list.length) return;
    const m = list[at], src = esc(M.mediaUrl(m.file));
    dlg.setAttribute("data-at", at);
    dlg.innerHTML = '<div class="lightbox__stage">' + (m.type === "video" ? '<video src="' + src + '" controls autoplay playsinline></video>' : '<img src="' + src + '" alt="' + esc(m.name) + '">') + "</div>" +
      '<div class="lightbox__bar"><button type="button" class="icon-btn" data-lb="prev" aria-label="Previous"' + (at === 0 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
      '<span class="lightbox__name">' + esc(m.name) + " (" + (at + 1) + " of " + list.length + ')</span>' +
      '<button type="button" class="icon-btn" data-lb="next" aria-label="Next"' + (at === list.length - 1 ? " disabled" : "") + ">" + icon("chevronRight") + "</button>" +
      '<button type="button" class="icon-btn" data-lb="close" aria-label="Close">' + icon("x") + "</button></div>";
    if (!dlg.open) dlg.showModal();
  }

  function shotList(post) {
    return '<div class="drawer__section"><h3 class="drawer__h">Shot list</h3><textarea class="textarea" rows="3" data-f="shot" aria-label="Shot list" placeholder="The picture or video that goes with it">' + esc(post.shot) + "</textarea></div>";
  }

  function needRow(ctx, post, n) {
    const ask = !n.done && (n.type === "case-study" || n.type === "info");
    const due = M.needDue(post, n, ctx.today());
    return '<li class="need' + (n.done ? " is-done" : "") + '"><button type="button" class="check" role="checkbox" aria-checked="' + !!n.done + '" data-d="need-toggle" data-id="' + esc(n.id) + '" aria-label="Done: ' + esc(n.text) + '">' + icon("check") + "</button>" +
      '<div class="need__body"><div class="need__text">' + C.needIcon(n.type) + "<span>" + esc(n.text) + '</span></div>' +
      (n.done ? "" : '<div class="need__due muted">' + esc(ui.friendlyDue(due)) + "</div>") +
      (ask ? '<div class="need__answer"><textarea class="textarea" rows="3" data-answer="' + esc(n.id) + '" aria-label="Your answer for Claude" placeholder="' + (n.type === "case-study" ? "Tell Claude about the job: who, what you did, the result" : "Type your answer for Claude") + '">' + esc(state.answers[n.id] || "") + "</textarea>" +
        '<button type="button" class="btn btn--sm btn--primary" data-d="need-send" data-id="' + esc(n.id) + '"' + (state.asking[post.id] ? " disabled" : "") + ">" + icon("sparkle") + "Send to Claude</button></div>" : "") +
      (n.done && n.answer ? '<p class="need__sent drawer__small muted">You told Claude: ' + esc(n.answer) + "</p>" : "") + "</div></li>";
  }
  function needsSection(ctx, post) {
    return '<div class="drawer__section"><h3 class="drawer__h">What Claude needs from you</h3>' +
      (post.needs.length ? '<ul class="needs">' + post.needs.map(function (n) { return needRow(ctx, post, n); }).join("") + "</ul>" : '<p class="drawer__small muted">Nothing needed yet.</p>') +
      '<div class="need-add"><select class="select" data-newneed="type" aria-label="What kind of thing">' + M.NEED_TYPES.map(function (t) { return '<option value="' + esc(t.key) + '"' + (state.newNeed.type === t.key ? " selected" : "") + ">" + esc(t.label) + "</option>"; }).join("") + "</select>" +
      '<input class="input" data-newneed="text" value="' + esc(state.newNeed.text) + '" placeholder="Add something you need to supply" aria-label="What you need to supply" maxlength="160">' +
      '<button type="button" class="btn btn--sm" data-d="need-add">Add</button></div></div>';
  }

  function askClaude(post) {
    const req = post.request, busy = !!state.asking[post.id];
    const asked = req ? '<div class="drawer__banner"><span>' + icon("sparkle") + "<span>Claude has been asked to " + (req.kind === "write" ? "write this one" : req.kind === "case-study" ? "write up your case study" : "change this one") + ". It appears here when it’s done.</span></span>" +
      "<span>Nothing happening? Open the folder in Claude and say " + C.say("write my waiting posts") + "</span></div>" : "";
    const noPlatform = !M.onKeys(post).length;
    const control = post.status === "idea"
      ? '<button type="button" class="btn btn--primary" data-d="ask-write"' + (noPlatform ? ' disabled title="Choose a platform first"' : busy ? " disabled" : "") + ">" + icon("sparkle") + "Ask Claude to write it</button>"
      : '<textarea class="textarea" rows="2" data-note aria-label="What should Claude change" placeholder="What should change? For example: shorter, and mention the price">' + esc(state.note) + "</textarea>" +
        '<div><button type="button" class="btn" data-d="ask-change"' + (busy ? " disabled" : "") + ">" + icon("sparkle") + "Ask Claude to change it</button></div>";
    return '<div class="drawer__section"><h3 class="drawer__h">Claude</h3>' + asked + control + "</div>";
  }

  function html(ctx, post) {
    const status = M.postStatus(post);
    return '<div class="drawer__head"><span class="chip chip--quiet">Post</span>' + C.statusPill(status) + '<span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-d="close" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body">' + basics(ctx, post) + mediaSection(post) + platformsRow(ctx, post) + tabs(ctx, post) + scoreSection(post) + shotList(post) + needsSection(ctx, post) + askClaude(post) + "</div>" +
      '<div class="drawer__foot">' + (post.status === "drafted" ? '<button type="button" class="btn btn--approve" data-d="approve">' + icon("check") + "Approve</button>" : "") +
        '<span class="drawer__spacer"></span><button type="button" class="btn btn--danger" data-d="skip">Skip this post</button></div>';
  }

  // Redraws the panel, keeping the scroll position and which control had focus
  function draw() {
    const post = postNow();
    if (!post) { close(); return; }
    const body = el.querySelector(".drawer__body");
    const scroll = body ? body.scrollTop : 0;
    const all = Array.prototype.slice.call(el.querySelectorAll(FOCUSABLE));
    const focusAt = all.indexOf(document.activeElement);
    el.innerHTML = html(ctxNow(), post);
    el.querySelector(".drawer__body").scrollTop = scroll;
    const again = el.querySelectorAll(FOCUSABLE);
    if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && el.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search/.test(a.type)));
  }

  // ---------- Opening and closing ----------
  // section "media" opens it at the photos and videos, ready to add a file
  function open(postId, section) {
    if (state.id !== postId) { state.tab = null; state.expanded = {}; state.note = ""; state.answers = {}; state.links = {}; state.newNeed = { type: "photo", text: "" }; state.skipRefresh = false; state.notices = []; }
    if (el.hidden) state.opener = document.activeElement;
    state.id = postId;
    el.hidden = false;
    scrim.hidden = false;
    document.body.classList.add("has-drawer");
    draw();
    const toMedia = section === "media";
    const first = toMedia ? el.querySelector("[data-d=media-pick]") : postNow().title ? el.querySelector("[data-d=close]") : el.querySelector("[data-f=title]");
    if (toMedia) el.querySelector('[data-section="media"]').scrollIntoView({ block: "start" });
    setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 30);
    el.classList.remove("is-open");
    void el.offsetWidth;
    el.classList.add("is-open");
  }
  function close() {
    if (!state.id && el.hidden) return;
    state.id = null;
    state.skipRefresh = false;
    el.hidden = true;
    scrim.hidden = true;
    el.innerHTML = "";
    document.body.classList.remove("has-drawer");
    if (state.opener && state.opener.isConnected) state.opener.focus({ preventScroll: true });
    state.opener = null;
  }
  // Called by the app after every data change
  function refresh() {
    const skip = state.skipRefresh;
    state.skipRefresh = false;
    if (!state.id || skip || typingInside()) return;
    draw();
  }

  // ---------- What the buttons do ----------
  function setDate(iso) {
    const post = postNow(), before = post.date || null;
    if (before === iso) return;
    const title = M.titleOf(post), where = iso ? M.dayLabel(iso) : "Unplanned";
    save(function (p) { p.date = iso; }, "Moved “" + title + "” to " + where).then(function () {
      toast("Moved to " + where, function () { save(function (p) { p.date = before; }, "Undid the move of “" + title + "”"); });
    });
  }
  function switchOn(p, key, on) {
    if (on && !p.platforms[key]) p.platforms[key] = M.blankPlatform(key);
    else if (p.platforms[key]) p.platforms[key].on = on;
  }
  function recommendedPlatforms() {
    const ctx = ctxNow(), post = postNow();
    const rec = M.recommended(post).filter(function (k) { return availableKeys(ctx).indexOf(k) > -1; });
    if (!rec.length) { toast("Claude hasn’t scored any platform 7 or more for this post yet"); return; }
    save(function (p) { availableKeys(ctx).forEach(function (k) { switchOn(p, k, rec.indexOf(k) > -1); }); });
  }
  function markPosted(key) {
    const post = postNow(), title = M.titleOf(post), before = post.status, label = M.platform(key).label;
    const link = (state.links[key] || "").trim();
    save(function (p) { M.markPosted(p, key, link, M.nowIso()); }, "Posted “" + title + "” on " + label).then(function () {
      delete state.links[key];
      toast("Marked as posted on " + label, function () { unmarkPosted(key, before); });
    }).catch(failed);
  }
  function unmarkPosted(key, statusBefore) {
    const post = postNow(), label = M.platform(key).label, title = M.titleOf(post);
    save(function (p) { M.unmarkPosted(p, key, statusBefore, M.nowIso()); }, "Marked “" + title + "” as not posted on " + label).catch(failed);
  }
  // While Claude is being asked (the save, then the job), the buttons that ask are switched off. They are
  // switched off in place at the start, so a box that is still being saved isn't redrawn from old data.
  function asking(postId, on) {
    if (on) {
      state.asking[postId] = true;
      el.querySelectorAll('[data-d="ask-write"], [data-d="ask-change"], [data-d="need-send"]').forEach(function (b) { b.disabled = true; });
    } else {
      delete state.asking[postId];
      if (state.id === postId && !typingInside()) draw();
    }
  }
  function askThenRun(postId, saving) {
    if (state.asking[postId]) return;
    asking(postId, true);
    saving().then(function () { return ctxNow().runJob("write-posts"); }).catch(failed).then(function () { asking(postId, false); });
  }
  function failed(err) { C.reportFailure(ctxNow(), err); }
  function askClaudeTo(kind, note, activity) {
    askThenRun(state.id, function () {
      return save(function (p) { p.request = { kind: kind, note: note, at: new Date().toISOString() }; }, activity);
    });
  }
  function sendAnswer(needId) {
    const answer = (state.answers[needId] || "").trim();
    const box = el.querySelector('[data-answer="' + needId + '"]');
    if (!answer) { toast("Write a few words for Claude first"); if (box) box.focus(); return; }
    const need = postNow().needs.find(function (n) { return n.id === needId; });
    const title = M.titleOf(postNow());
    askThenRun(state.id, function () {
      return save(function (p) { M.answerNeed(p, needId, answer, M.nowIso()); }, "Answered “" + need.text + "” for “" + title + "”").then(function () { delete state.answers[needId]; });
    });
  }
  function addNeed() {
    const text = state.newNeed.text.trim();
    if (!text) { toast("Say what you need to supply first"); return; }
    const type = state.newNeed.type;
    save(function (p) { p.needs.push({ id: M.makeId("n"), type: type, text: text, due: null, done: false, answer: "" }); }, "Added a thing to supply: " + text).then(function () {
      state.newNeed.text = "";
      draw();
    });
  }
  function approve() {
    const title = M.titleOf(postNow());
    save(function (p) { p.status = "approved"; p.approvedAt = new Date().toISOString(); }, "Approved “" + title + "”").then(function () { toast("Approved"); });
  }
  function skip() {
    const post = postNow(), title = M.titleOf(post), before = post.status, id = post.id;
    close();
    ctxNow().update(function (d) {
      const p = d.posts.find(function (x) { return x.id === id; });
      p.status = "skipped";
      p.updatedAt = new Date().toISOString();
    }, "Skipped “" + title + "”", id).then(function () {
      toast("Skipped “" + title + "”", function () {
        ctxNow().update(function (d) {
          const p = d.posts.find(function (x) { return x.id === id; });
          p.status = before;
          p.updatedAt = new Date().toISOString();
        }, "Brought back “" + title + "”", id);
      });
    });
  }
  function copyWords(key) {
    const box = el.querySelector('textarea[data-f="text"][data-key="' + key + '"]');
    if (!box || !box.value.trim()) { toast("There are no words to copy yet"); return; }
    ui.copyText(box.value).then(function (ok) { toast(ok ? "Copied. Paste it into " + M.platform(key).label : "Couldn’t copy. Select the words and copy them yourself"); });
  }

  const ACTIONS = {
    close: close,
    approval: function (b) {
      const v = b.getAttribute("data-v");
      save(function (p) { p.approval = v; });
    },
    unplanned: function () { setDate(null); },
    "toggle-platform": function (b) {
      const key = b.getAttribute("data-key"), on = M.onKeys(postNow()).indexOf(key) === -1;
      if (on) state.tab = key;
      save(function (p) { switchOn(p, key, on); });
    },
    "plat-all": function () { save(function (p) { availableKeys(ctxNow()).forEach(function (k) { switchOn(p, k, true); }); }); },
    "plat-rec": recommendedPlatforms,
    tab: function (b) { state.tab = b.getAttribute("data-key"); draw(); },
    "see-more": function (b) {
      const key = b.getAttribute("data-key"), box = el.querySelector('textarea[data-f="text"][data-key="' + key + '"]');
      state.expanded[key] = !state.expanded[key];
      refreshPreview(key, box.value);
    },
    copy: function (b) { copyWords(b.getAttribute("data-key")); },
    posted: function (b) { markPosted(b.getAttribute("data-key")); },
    unposted: function (b) { unmarkPosted(b.getAttribute("data-key"), null); },
    "need-toggle": function (b) {
      const id = b.getAttribute("data-id");
      save(function (p) { const n = p.needs.find(function (x) { return x.id === id; }); n.done = !n.done; });
    },
    "need-send": function (b) { sendAnswer(b.getAttribute("data-id")); },
    "need-add": addNeed,
    "media-pick": function () { el.querySelector("[data-media-input]").click(); },
    "media-view": function (b) { showLightbox(postNow().media.findIndex(function (m) { return m.id === b.getAttribute("data-id"); })); },
    "media-cover": function (b) { makeCover(b.getAttribute("data-id")); },
    "media-earlier": function (b) { moveMedia(b.getAttribute("data-id"), -1); },
    "media-later": function (b) { moveMedia(b.getAttribute("data-id"), 1); },
    "media-remove": function (b) { removeMedia(b.getAttribute("data-id")); },
    "notice-dismiss": function (b) { state.notices.splice(Number(b.getAttribute("data-i")), 1); showNotices(); },
    "ask-write": function () { askClaudeTo("write", "", "Asked Claude to write “" + M.titleOf(postNow()) + "”"); },
    "ask-change": function () {
      const note = state.note.trim();
      if (!note) { toast("Say what should change first"); el.querySelector("[data-note]").focus(); return; }
      askClaudeTo("rewrite", note, "Asked Claude to change “" + M.titleOf(postNow()) + "”");
      state.note = "";
    },
    approve: approve,
    skip: skip
  };

  // What changes when a box is left (saved quietly, without redrawing)
  function onChange(e) {
    const t = e.target, f = t.getAttribute("data-f"), key = t.getAttribute("data-key");
    if (t.hasAttribute("data-media-input")) {
      const files = Array.prototype.slice.call(t.files);
      t.value = "";
      addFiles(files);
      return;
    }
    if (t.hasAttribute("data-newneed")) { state.newNeed[t.getAttribute("data-newneed")] = t.value; return; }
    if (!f) return;
    if (f === "date") { setDate(t.value || null); return; }
    if (f === "format") { save(function (p) { p.platforms[key].format = t.value; }); return; }
    if (f === "theme") { save(function (p) { p.theme = t.value; }); return; }
    const quiet = true;
    if (f === "title") save(function (p) { p.title = t.value.trim(); }, null, quiet);
    if (f === "time") save(function (p) { p.time = t.value; }, null, quiet);
    if (f === "shot") save(function (p) { p.shot = t.value; }, null, quiet);
    if (f === "text") save(function (p) { p.platforms[key].text = t.value; }, null, quiet);
  }
  // What is typed but not sent yet is kept in memory, so a redraw never loses it
  function onInput(e) {
    const t = e.target;
    if (t.hasAttribute("data-note")) state.note = t.value;
    else if (t.hasAttribute("data-answer")) state.answers[t.getAttribute("data-answer")] = t.value;
    else if (t.hasAttribute("data-link")) state.links[t.getAttribute("data-link")] = t.value;
    else if (t.hasAttribute("data-newneed")) state.newNeed[t.getAttribute("data-newneed")] = t.value;
    else if (t.getAttribute("data-f") === "text") {
      const key = t.getAttribute("data-key"), counter = el.querySelector('[data-chars="' + key + '"]');
      counter.textContent = countHtml(key, t.value);
      counter.classList.toggle("is-over", M.charCount(key, t.value).over);
      refreshPreview(key, t.value);
    }
  }
  function trapFocus(e) {
    const items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  // Files dragged in from a folder land anywhere on the panel; thumbnails dragged within the grid change the order
  function bindMediaDrag() {
    function overTile(e) { return state.dragMedia ? e.target.closest("[data-media-id]") : null; }
    el.addEventListener("dragover", function (e) {
      if (Media.hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; el.classList.add("is-dropping"); return; }
      if (!state.dragMedia || !e.target.closest("[data-media-grid]")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      el.querySelectorAll(".mtile.is-over").forEach(function (t) { t.classList.remove("is-over"); });
      const tile = overTile(e);
      if (tile) tile.classList.add("is-over");
    });
    el.addEventListener("dragleave", function (e) {
      if (!el.contains(e.relatedTarget)) el.classList.remove("is-dropping");
    });
    el.addEventListener("dragstart", function (e) {
      const tile = e.target.closest("[data-media-id]");
      if (!tile) return;
      state.dragMedia = tile.getAttribute("data-media-id");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "media:" + state.dragMedia);
      tile.classList.add("is-dragging");
    });
    el.addEventListener("dragend", function () {
      state.dragMedia = null;
      el.querySelectorAll(".mtile.is-over, .mtile.is-dragging").forEach(function (t) { t.classList.remove("is-over", "is-dragging"); });
    });
    el.addEventListener("drop", function (e) {
      el.classList.remove("is-dropping");
      if (Media.hasFiles(e)) { e.preventDefault(); addFiles(e.dataTransfer.files); return; }
      const id = state.dragMedia;
      if (!id || !e.target.closest("[data-media-grid]")) return;
      e.preventDefault();
      const tile = overTile(e), before = tile ? tile.getAttribute("data-media-id") : null;
      state.dragMedia = null;
      save(function (p) { M.moveMedia(p, id, before); }, "Changed the order of the photos and videos on “" + M.titleOf(postNow()) + "”").catch(failed);
    });
  }

  function init(getContext) {
    getCtx = getContext;
    el = document.getElementById("drawer");
    scrim = document.getElementById("drawerScrim");
    el.addEventListener("click", function (e) {
      const b = e.target.closest("[data-d]");
      if (b && el.contains(b)) ACTIONS[b.getAttribute("data-d")](b);
    });
    el.setAttribute("data-media-drop", "");
    el.addEventListener("change", onChange);
    bindMediaDrag();
    Media.watch(showUploads);
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.getAttribute("data-newneed") === "text") { e.preventDefault(); addNeed(); }
    });
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (!state.id) return;
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) { e.preventDefault(); close(); }
      if (e.key === "Tab" && !document.querySelector("dialog[open]")) trapFocus(e);
    });
  }

  window.CM.drawer = { init: init, open: open, close: close, refresh: refresh, isOpen: function () { return !!state.id; } };
})();
