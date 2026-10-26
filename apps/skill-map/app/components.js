/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Chips, the use-per-month bars, section headings and empty states. Each function returns a piece
  of HTML as text. Buttons carry data-action="..." and app.js decides what each does. Same look and
  wording as Task List OS.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc;
  const icon = ui.icon;
  const M = window.SM.model;

  // Where the shared images live (worked out from the theme.css link, so it survives moving)
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = {
    welcome: SHARED + "images/claude-welcome.jpg",
    thinking: SHARED + "images/claude-thinking.jpg",
    celebrate: SHARED + "images/claude-celebrate.jpg",
    shrug: SHARED + "images/claude-shrug.jpg",
    trophy: SHARED + "images/claude-trophy.jpg"
  };

  // ---------- Opening something in Claude ----------
  // Opens the Claude desktop app with the prompt typed in, ready for the person to read and send.
  // With the folder known it opens a Claude Code session in their folder; otherwise a new chat.
  let kitFolder = null;
  function setFolder(f) { kitFolder = f || null; }
  function claudeLink(prompt) {
    const q = encodeURIComponent(String(prompt || "").slice(0, 12000));
    return kitFolder ? "claude://code/new?q=" + q + "&folder=" + encodeURIComponent(kitFolder) : "claude://claude.ai/new?q=" + q;
  }

  // ---------- Words and small marks ----------
  function say(text) {
    return '<span class="say">“' + esc(text) + '”<button type="button" class="say__copy" data-action="copy" data-text="' + esc(text) + '">Copy</button></span>';
  }
  function sectionHead(title, opts) {
    const o = opts || {};
    return '<div class="section-head"><h2>' + (o.icon ? icon(o.icon) : "") + esc(title) + (o.count != null ? ' <span class="badge' + (o.accent ? " badge--accent" : "") + '">' + o.count + "</span>" : "") + "</h2>" + (o.right || "") + "</div>";
  }
  function empty(art, title, text, extra, compact) {
    return '<div class="empty' + (compact ? " empty--compact" : "") + '">' +
      (art ? '<div class="empty__art"><img src="' + ART[art] + '" alt="" width="96" height="96"></div>' : "") +
      "<h3>" + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + (extra || "") + "</div>";
  }
  function originChip(n) {
    const o = M.ORIGIN[n.origin] || M.ORIGIN.own;
    return '<span class="chip chip--quiet">' + esc(n.origin === "plugin" ? "Plugin: " + n.source : n.origin === "toolkit" ? (n.source === "Toolkit" ? "Toolkit" : n.source) : o.label) + "</span>";
  }
  function flagChips(d, n) {
    return M.flagsFor(d, n).map(function (f) { return '<span class="chip chip--' + f.tone + '" title="' + esc(f.why) + '">' + esc(f.label) + "</span>"; }).join("");
  }
  function usesText(n) {
    if (n.origin === "manual") return "Not counted";
    return n.uses.last90 ? n.uses.last90 + (n.uses.last90 === 1 ? " use" : " uses") : "None lately";
  }

  // ---------- Use per month: 12 small bars, worked out from the scan ----------
  function bars(months, opts) {
    const o = opts || {};
    const max = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    const w = o.width || 240, h = o.height || 56, gap = 4, bw = (w - gap * 11) / 12;
    return '<svg class="bars" viewBox="0 0 ' + w + " " + (h + 16) + '" role="img" aria-label="' + esc(o.label || "Use per month") + '" preserveAspectRatio="xMidYMid meet">' +
      months.map(function (m, i) {
        const bh = m.n ? Math.max(3, Math.round(m.n / max * h)) : 2;
        const x = i * (bw + gap);
        return '<g><title>' + esc(M.monthLabel(m.month) + ": " + m.n + (m.n === 1 ? " use" : " uses")) + '</title><rect x="' + x.toFixed(1) + '" y="' + (h - bh) + '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="2" class="bars__bar' + (m.n ? "" : " is-empty") + '"/>' +
          (i % 3 === 0 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h + 13) + '" text-anchor="middle" class="bars__label">' + esc(M.monthLabel(m.month)) + "</text>" : "") + "</g>";
      }).join("") + "</svg>";
  }

  // ---------- Numbers that count up when a page opens ----------
  function stat(value, label, sub, tone) {
    return '<div class="stat' + (tone ? " stat--" + tone : "") + '"><span class="stat__num num" data-count-up="' + esc(value) + '">' + esc(value) + '</span><span class="stat__label">' + esc(label) + "</span>" + (sub ? '<span class="stat__sub">' + esc(sub) + "</span>" : "") + "</div>";
  }
  function countUp(root) {
    root.querySelectorAll("[data-count-up]").forEach(function (el) {
      const to = Number(el.getAttribute("data-count-up"));
      if (!isFinite(to) || to < 2 || ui.prefersReducedMotion()) { el.textContent = el.getAttribute("data-count-up"); return; }
      const t0 = performance.now(), ms = 650;
      (function step(now) {
        const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(to * e).toLocaleString("en-GB");
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  // What Claude has tidied so far, each with an Undo button while it can still be undone
  const WORDS = { done: "Done", partly: "Partly done", failed: "Nothing changed", undone: "Undone", "partly-undone": "Partly undone", queued: "Waiting for Claude" };
  function tidiedSoFar(rows) {
    if (!rows || !rows.length) return "";
    const F = window.SM.fmodel;
    return '<details class="panel done-list tidied"' + (rows.some(function (r) { return r.status === "queued"; }) ? " open" : "") + '><summary>Tidied so far <span class="badge">' + rows.length + '</span></summary><ul class="hlist hlist--plain" role="list">' +
      rows.slice(0, 20).map(function (r) {
        return '<li class="tidied__row"><span class="tidied__main"><strong>' + esc(r.title) + '</strong><span class="muted"> ' + esc(WORDS[r.status] || r.status) + (r.moved ? " · " + F.fmtCount(r.moved) + (r.moved === 1 ? " thing" : " things") : "") + (r.at ? " · " + esc(F.whenLabel(String(r.at).slice(0, 10))) : "") + (r.note ? " · " + esc(r.note) : "") + "</span></span>" +
          (r.undoable ? '<button type="button" class="btn btn--sm" data-action="undo-tidy" data-id="' + esc(r.id) + '">' + icon("undo") + "Undo</button>" : "") + "</li>";
      }).join("") + "</ul></details>";
  }

  // Shown before the first scan
  function scanCard(c) {
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + ART.welcome + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s map your skills</h2>' +
      '<p class="muted">Claude looks through the skills on this computer, works out which ones you use and how they connect, and draws them here. It only reads: nothing is changed, moved or sent.</p>' +
      '<div class="setup-card__actions">' + (c && c.canScan ? '<button type="button" class="btn btn--primary btn--lg" data-action="scan">' + icon("refresh") + "Scan my skills now</button>" : "") + "</div>" +
      '<p class="muted setup-card__alt">' + (c && c.canScan ? "Or in Claude Code, in your Small Business Toolkit OS folder, say " : "In Claude Code, in your Small Business Toolkit OS folder, say ") + say("Scan my skills") + "</p></div></section>";
  }

  window.SM = window.SM || {};
  window.SM.c = {
    ART: ART, setFolder: setFolder, claudeLink: claudeLink, say: say, sectionHead: sectionHead, empty: empty,
    originChip: originChip, flagChips: flagChips, usesText: usesText, bars: bars, stat: stat, countUp: countUp, scanCard: scanCard, tidiedSoFar: tidiedSoFar
  };
})();
