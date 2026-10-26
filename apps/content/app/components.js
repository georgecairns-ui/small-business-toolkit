/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Each function that draws returns HTML as text, with every value passed through ui.esc. The platform
  tags are drawn with CSS from the colours in app.css, never logos. A button with data-copy="text"
  copies that text when pressed (app.js handles it). Two helpers that more than one page needs live
  here too: planIdea (Calendar and Ideas) and reportFailure (the end of a promise chain).
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.CM.model;

  // Where the shared images live, worked out from the theme.css link so it survives moving
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = { welcome: SHARED + "images/claude-welcome.jpg" };

  // A coloured 2 letter tag. opts.score adds "9/10"; opts.dim shows a platform that isn't switched on.
  function platformTag(key, opts) {
    const p = M.platform(key);
    if (!p) return "";
    const o = opts || {};
    const hasScore = typeof o.score === "number";
    return '<span class="ptag ptag--' + esc(p.key) + (o.dim ? " is-dim" : "") + '" title="' + esc(p.label + (hasScore ? ", " + o.score + "/10" : "")) + '">' +
      '<span class="ptag__short">' + esc(p.short) + "</span>" + (hasScore ? '<span class="ptag__score">' + o.score + "/10</span>" : "") + "</span>";
  }

  function statusPill(status) {
    const label = M.STATUS_LABELS[status] || M.STATUS_LABELS.idea;
    return '<span class="spill spill--' + esc(M.STATUS_LABELS[status] ? status : "idea") + '">' + esc(label) + "</span>";
  }

  function needIcon(type) {
    const t = M.NEED_TYPES.find(function (n) { return n.key === type; }) || M.NEED_TYPES[M.NEED_TYPES.length - 1];
    return '<span class="needicon" title="' + esc(t.label) + '" role="img" aria-label="' + esc(t.label) + '">' + icon(t.icon) + "</span>";
  }

  // A photo, or the first frame of a video with a play mark. The address always comes from CM.model.mediaUrl.
  // The wrapper around it must be position: relative (the play mark sits in the middle of it).
  function mediaThumb(item, alt) {
    const src = M.mediaUrl(item.file);
    if (item.type === "video") {
      return '<video class="cmedia" src="' + esc(src + "#t=0.1") + '" muted playsinline preload="metadata" tabindex="-1" aria-hidden="true"></video><span class="cmedia-play" aria-hidden="true"></span>';
    }
    return '<img class="cmedia" src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy" draggable="false">';
  }

  function emptyState(title, text) {
    return '<div class="empty empty--compact"><h3>' + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + "</div>";
  }

  // A phrase to say to Claude, with a Copy button
  function say(text) {
    return '<span class="say">' + esc(text) + '<button type="button" class="say__copy" data-copy="' + esc(text) + '">Copy</button></span>';
  }

  // Shown before setup (no business name and no posts), on Calendar and in the first Home box
  function setupCard() {
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + ART.welcome + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s set up your content machine</h2>' +
      '<p class="muted">Open this folder in the Code tab of the Claude desktop app and type <strong>/setup</strong>. Claude gets to know your business, looks at what your customers search for, and fills your calendar with posts for you to approve.</p>' +
      '<div class="setup-card__actions"><button type="button" class="btn btn--primary" data-copy="/setup">' + icon("fileText") + "Copy /setup</button></div>" +
      '<p class="muted setup-card__alt">Nothing is posted or sent. You approve every post and post it yourself.</p></div></section>';
  }

  // The end of a promise chain. A save that failed has already been shown to the person by ctx.update,
  // so only any other error is shown here.
  function reportFailure(ctx, err) {
    if (!err.shownToPerson) ctx.toast(err.message);
  }

  // Plans an idea on a day, saved and logged with the idea's title, with an Undo. Resolves to the new
  // post's id once the save is done, so the caller can open the post.
  function planIdea(ctx, ideaId, iso) {
    const idea = ctx.data.ideas.find(function (i) { return i.id === ideaId; });
    if (!idea) return Promise.reject(new Error("That idea is no longer in your list."));
    const postId = M.makeId("p"), title = idea.title || "Untitled idea", where = M.dayLabel(iso);
    return ctx.update(function (d) { M.planIdea(d, ideaId, iso, postId); }, "Planned “" + title + "” for " + where, postId).then(function () {
      ctx.toast("Planned for " + where, function () {
        ctx.update(function (d) { M.unplanIdea(d, ideaId, postId); }, "Undid planning “" + title + "”", null).catch(function (err) { reportFailure(ctx, err); });
      });
      return postId;
    });
  }

  window.CM.components = {
    ART: ART, platformTag: platformTag, statusPill: statusPill, needIcon: needIcon, mediaThumb: mediaThumb, emptyState: emptyState, say: say, setupCard: setupCard,
    reportFailure: reportFailure, planIdea: planIdea
  };
})();
