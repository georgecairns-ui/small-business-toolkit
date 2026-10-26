/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Each function that draws returns HTML as text, with every value passed through ui.esc. The platform
  tags are drawn with CSS from the colours in app.css, never logos. A button with data-copy="text"
  copies that text when pressed (app.js handles it). reportFailure is the end of a promise chain.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;

  // Where the shared images live, worked out from the theme.css link so it survives moving
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = { welcome: SHARED + "images/claude-welcome.jpg" };

  // A coloured tag with the platform's short name (Meta, Google). opts.dim shows a platform that isn't switched on.
  function platformTag(key, opts) {
    const p = M.platform(key);
    if (!p) return "";
    return '<span class="ptag ptag--' + esc(p.key) + (opts && opts.dim ? " is-dim" : "") + '" title="' + esc(p.label) + '">' + esc(p.short) + "</span>";
  }

  // The traffic light as a small pill: a dot and the words. light is from AD.model.light.
  function lightPill(l) {
    return '<span class="lpill lpill--' + esc(l.state) + '" title="' + esc(l.why || l.label) + '"><span class="lpill__dot"></span>' + esc(l.label) + "</span>";
  }
  // Just the dot, for tight places. The words are for screen readers.
  function lightDot(l) {
    return '<span class="ldot ldot--' + esc(l.state) + '" role="img" aria-label="' + esc(l.label) + '" title="' + esc(l.label) + '"></span>';
  }

  // A campaign's status (On, Paused, Ended)
  function campaignPill(status) {
    const label = M.CAMPAIGN_STATUS_LABELS[status] || M.CAMPAIGN_STATUS_LABELS.paused;
    return '<span class="spill spill--c-' + esc(M.CAMPAIGN_STATUS_LABELS[status] ? status : "paused") + '">' + esc(label) + "</span>";
  }
  // A new campaign's status (Waiting for you, Ready to build, Paused in your account, Running...)
  function buildPill(status) {
    const label = M.BUILD_STATUS_LABELS[status] || M.BUILD_STATUS_LABELS.draft;
    return '<span class="spill spill--b-' + esc(M.BUILD_STATUS_LABELS[status] ? status : "draft") + '">' + esc(label) + "</span>";
  }

  // How a figure changed against the range before, "up 12%". better is "up" when a rise is good (results, return),
  // "down" when a fall is good (cost per result), or "" for a figure with no good or bad direction (spend).
  function delta(frac, better) {
    if (frac === null || frac === undefined) return '<span class="delta delta--none">Can’t compare yet</span>';
    const r = Math.round(frac * 100);
    if (r === 0) return '<span class="delta delta--flat">No change</span>';
    const good = better === "up" ? r > 0 : better === "down" ? r < 0 : null;
    return '<span class="delta' + (good === null ? "" : good ? " delta--good" : " delta--bad") + '">' + (r > 0 ? "Up " : "Down ") + Math.abs(r) + "%</span>";
  }

  function emptyState(title, text) {
    return '<div class="empty empty--compact"><h3>' + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + "</div>";
  }

  // The sentence that says why two platforms' results can't be set side by side
  function countingNote() { return '<p class="counting-note">' + icon("info") + "<span>" + esc(M.COPY.countingNote) + "</span></p>"; }

  // A picture, or the first frame of a video with a play mark. The address always comes from AD.model.mediaUrl.
  // The wrapper around it must be position: relative (the play mark sits in the middle of it).
  function mediaThumb(file, alt) {
    const src = M.mediaUrl(file);
    if (M.mediaKind(file) === "video") {
      return '<video class="cmedia" src="' + esc(src + "#t=0.1") + '" muted playsinline preload="metadata" tabindex="-1" aria-hidden="true"></video><span class="cmedia-play" aria-hidden="true"></span>';
    }
    return '<img class="cmedia" src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy" draggable="false">';
  }

  // A phrase to say to Claude, with a Copy button
  function say(text) {
    return '<span class="say">' + esc(text) + '<button type="button" class="say__copy" data-copy="' + esc(text) + '">Copy</button></span>';
  }

  // Shown before setup (no result name and no platform on), on every page and in the first Home box
  function setupCard() {
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + ART.welcome + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s set up your ads</h2>' +
      '<p class="muted">Open this folder in the Code tab of the Claude desktop app and type <strong>/setup</strong>. Claude asks where your ads are, reads your figures, and drafts campaigns for you to approve.</p>' +
      '<div class="setup-card__actions"><button type="button" class="btn btn--primary" data-copy="/setup">' + icon("fileText") + "Copy /setup</button></div>" +
      '<p class="muted setup-card__alt">Claude reads your figures and builds campaigns switched off. Nothing changes in your ad account until you press the button and say yes.</p></div></section>';
  }

  // The 3 name tags that choose which platform's campaigns are on show: All, Meta, Google Ads. Plain coloured names, never logos,
  // and nothing that suggests the platforms back this tool. Each button carries data-platform="all|meta|google".
  const SWITCH_NAMES = { meta: "Meta", google: "Google Ads" };
  function platformSwitch(current) {
    const list = [{ key: "all", name: "All" }].concat(M.PLATFORMS.map(function (p) { return { key: p.key, name: SWITCH_NAMES[p.key] || p.short }; }));
    return '<div class="pswitch" role="group" aria-label="Platform">' + list.map(function (o) {
      return '<button type="button" class="pswitch__btn pswitch__btn--' + esc(o.key) + '" data-platform="' + esc(o.key) + '" aria-pressed="' + (o.key === current) + '">' + esc(o.name) + "</button>";
    }).join("") + "</div>";
  }

  // ---------- The carousel ----------
  // slides: a list of HTML strings, one for each slide. index: the one showing. label: what the slides are, for screen readers.
  // Previous and next buttons, dots and "2 of 5". The arrow keys (when it has focus) and a swipe are handled by carouselStep,
  // which the page calls; the buttons and dots carry data-slide="prev|next|0|1|...".
  function carousel(slides, index, label) {
    const n = slides.length, at = Math.max(0, Math.min(n - 1, index || 0));
    return '<div class="carousel" data-carousel data-count="' + n + '" data-at="' + at + '" role="group" aria-roledescription="carousel" aria-label="' + esc(label) + '" tabindex="0">' +
      '<div class="carousel__view"><div class="carousel__track" style="transform:translateX(' + (-100 * at) + '%)">' + slides.map(function (html, i) {
        return '<div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + n + '"' + (i === at ? "" : ' aria-hidden="true" inert') + ">" + html + "</div>";
      }).join("") + "</div></div>" +
      '<div class="carousel__nav"><button type="button" class="icon-btn" data-slide="prev" aria-label="Previous ad"' + (n < 2 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
      '<span class="carousel__count" aria-live="polite">' + (at + 1) + " of " + n + "</span>" +
      '<button type="button" class="icon-btn" data-slide="next" aria-label="Next ad"' + (n < 2 ? " disabled" : "") + ">" + icon("chevronRight") + "</button></div>" +
      (n > 1 ? '<div class="carousel__dots">' + slides.map(function (html, i) {
        return '<button type="button" class="carousel__dot" data-slide="' + i + '" aria-label="Ad ' + (i + 1) + '"' + (i === at ? ' aria-current="true"' : "") + "></button>";
      }).join("") + "</div>" : "") + "</div>";
  }
  // Moves a carousel in place (to = "prev", "next" or a number) and returns the slide now showing. It wraps round.
  function carouselStep(box, to) {
    const n = Number(box.getAttribute("data-count")) || 0;
    if (n < 2) return 0;
    const now = Number(box.getAttribute("data-at")) || 0;
    const at = to === "next" ? (now + 1) % n : to === "prev" ? (now + n - 1) % n : Math.max(0, Math.min(n - 1, Number(to) || 0));
    box.setAttribute("data-at", at);
    box.querySelector(".carousel__track").style.transform = "translateX(" + (-100 * at) + "%)";
    box.querySelectorAll(".carousel__slide").forEach(function (s, i) { s.inert = i !== at; if (i === at) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true"); });
    box.querySelectorAll(".carousel__dot").forEach(function (d, i) { if (i === at) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    box.querySelector(".carousel__count").textContent = (at + 1) + " of " + n;
    return at;
  }

  // The end of a promise chain. A save that failed has already been shown to the person by ctx.update,
  // so only any other error is shown here.
  function reportFailure(ctx, err) {
    if (!err.shownToPerson) ctx.toast(err.message);
  }

  window.AD.components = {
    ART: ART, platformTag: platformTag, lightPill: lightPill, lightDot: lightDot, campaignPill: campaignPill, buildPill: buildPill, delta: delta,
    platformSwitch: platformSwitch, carousel: carousel, carouselStep: carouselStep, emptyState: emptyState, countingNote: countingNote, mediaThumb: mediaThumb, say: say, setupCard: setupCard, reportFailure: reportFailure
  };
})();
