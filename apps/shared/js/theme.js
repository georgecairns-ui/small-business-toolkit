/*
  THEME SWITCH: light or dark
  ---------------------------
  Shared by every tool. Load it in <head>, before anything draws, so the page never flashes the
  wrong colours. Any button with a data-theme-toggle attribute flips between light and dark.
  The choice is remembered in this browser; with no choice made, the app follows the computer.
  The colours themselves live in theme.css.
*/
(function () {
  "use strict";

  const KEY = "tlos-theme";
  const root = document.documentElement;
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function saved() {
    try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : null; } catch (e) { return null; }
  }
  function current() {
    return root.getAttribute("data-theme") || (darkQuery && darkQuery.matches ? "dark" : "light");
  }

  // The icon shows where the button takes you: a moon in light mode, a sun in dark mode
  function drawButtons() {
    const ui = window.TaskListOS && window.TaskListOS.ui;
    const dark = current() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      if (ui) b.innerHTML = ui.icon(dark ? "sun" : "moon");
    });
  }

  function set(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* not remembered, fine */ }
    drawButtons();
  }

  const start = saved();
  if (start) root.setAttribute("data-theme", start);

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-theme-toggle]")) set(current() === "dark" ? "light" : "dark");
  });
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", function () { if (!saved()) drawButtons(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", drawButtons); else drawButtons();

  window.TaskListOS = window.TaskListOS || {};
  window.TaskListOS.theme = { set: set, current: current, refresh: drawButtons };
})();
