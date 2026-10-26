/*
  COMPONENTS: small pieces of screen used by every page
  -----------------------------------------------------
  Each function that draws returns HTML as text, with every value passed through ui.esc. A button with
  data-copy="text" copies that text when pressed, data-go="connections" moves to that page and a link
  with data-open-claude opens the Claude desktop app (app.js handles all three).

  Every job button is the same pair: "Open in Claude" (the Code tab in this folder, with the job typed in)
  and a quiet "Copy the prompt" beside it. Until the person has used one, a one-line note says what happens.

  Also creates TK.views, where each page registers itself as TK.views.<name> = { render(root, ctx) }.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.TK.model;
  window.TK.views = window.TK.views || {};

  // Where the shared images live, worked out from the theme.css link so it survives moving
  const SHARED = document.querySelector('link[href$="theme.css"]').getAttribute("href").replace("theme.css", "");
  const ART = { welcome: SHARED + "images/claude-welcome.jpg", thinking: SHARED + "images/claude-thinking.jpg" };

  // ---------- This folder, for the Open in Claude links ----------
  // Set by app.js from the helper's /api/info. Without it the buttons are Copy the prompt only.
  let kitFolder = null;
  function setFolder(f) { kitFolder = f || null; }
  function folder() { return kitFolder; }

  // ---------- The first-time note ----------
  // Remembered in this browser only, so a new browser shows it once more. Nothing depends on it.
  const SEEN_KEY = "tk-claude-note-seen";
  function noteSeen() { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* not remembered: the note shows again next time */ } }
  function claudeNote() {
    if (!kitFolder) return '<p class="tk-note">' + icon("info") + "<span>Open this folder in the Code tab of the Claude desktop app, then paste the prompt in.</span></p>";
    if (noteSeen()) return "";
    return '<p class="tk-note">' + icon("info") + "<span>Opens Claude with this typed in. Press Enter to start.</span></p>";
  }

  // The Open in Claude button and Copy the prompt. opts: label (default "Open in Claude"), small, primary (default true)
  function claudeActions(prompt, opts) {
    const o = opts || {};
    const link = M.claudeLink(prompt, kitFolder);
    const size = o.small ? " btn--sm" : "";
    const kind = o.primary === false ? "" : " btn--primary";
    if (!link) return '<span class="tk-actions"><button type="button" class="btn' + kind + size + '" data-copy="' + esc(prompt) + '">' + icon("fileText") + "Copy the prompt</button></span>";
    return '<span class="tk-actions"><a class="btn' + kind + size + '" href="' + esc(link) + '" data-open-claude>' + icon("external") + esc(o.label || "Open in Claude") + "</a>" +
      '<button type="button" class="link-btn tk-copy" data-copy="' + esc(prompt) + '">Copy the prompt</button></span>';
  }

  // A status pill from model.CONN or model.TOOL
  function statusChip(table, status) {
    const s = table[status];
    return '<span class="chip ' + esc(s.chip) + '">' + esc(s.label) + "</span>";
  }

  // "21 Oct", or "21 Oct 2025" when it is not this year
  function shortDate(iso) {
    const d = ui.parseDate(iso);
    if (!d) return "";
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString("en-GB", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }

  function emptyState(title, text) {
    return '<div class="empty empty--compact"><h3>' + esc(title) + "</h3>" + (text ? "<p>" + esc(text) + "</p>" : "") + "</div>";
  }

  // A phrase to say to Claude, with a Copy button
  function say(text) {
    return '<span class="say">' + esc(text) + '<button type="button" class="say__copy" data-copy="' + esc(text) + '">Copy</button></span>';
  }

  // A page heading: title, the line under it, and buttons on the right
  function pageHead(title, line, actionsHtml) {
    return '<header class="tk-head"><div class="tk-head__text"><h2>' + esc(title) + "</h2>" + (line ? '<p class="muted">' + esc(line) + "</p>" : "") + "</div>" +
      (actionsHtml ? '<div class="tk-head__actions">' + actionsHtml + "</div>" : "") + "</header>";
  }

  // The end of a promise chain. A save that failed has already been shown to the person by ctx.update,
  // so only any other error is shown here.
  function failed(err) {
    if (!err.shownToPerson) ui.toast(err.message, { icon: "alert" });
  }

  window.TK.components = {
    ART: ART, setFolder: setFolder, folder: folder, markSeen: markSeen, claudeNote: claudeNote, claudeActions: claudeActions,
    statusChip: statusChip, shortDate: shortDate, emptyState: emptyState, say: say, pageHead: pageHead, failed: failed
  };
})();
