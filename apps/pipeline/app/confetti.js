/*
  CONFETTI: a short burst when something's done
  ---------------------------------------------
  Pressing Done in Review sets off a small burst of confetti from the button, in the app's own
  colours (so it matches light, dark and the customer's brand). About a second, then it tidies
  itself away. Skipped for anyone whose computer asks for less motion.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;

  function colours() {
    const css = getComputedStyle(document.documentElement);
    return ["--color-accent", "--color-success", "--color-warning", "--color-info", "--color-accent-line"]
      .map(function (v) { return css.getPropertyValue(v).trim(); }).filter(Boolean);
  }

  // from: the element the burst comes from (the Done button), or the middle of the screen
  function burst(from) {
    if (ui.prefersReducedMotion()) return;
    const rect = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null;
    const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const oy = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.className = "confetti";
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    const palette = colours();
    const pieces = [];
    for (let i = 0; i < 70; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 5 + Math.random() * 7;
      pieces.push({ x: ox, y: oy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35, c: palette[i % palette.length] || "#cc785c" });
    }
    const start = performance.now();
    const life = 1300;
    function frame(now) {
      const t = now - start;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.globalAlpha = Math.max(0, 1 - Math.max(0, t - life * 0.6) / (life * 0.4));
      pieces.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      });
      if (t < life) requestAnimationFrame(frame); else canvas.remove();
    }
    requestAnimationFrame(frame);
    // Always tidy up, even if the tab is hidden and animation pauses
    setTimeout(function () { canvas.remove(); }, life + 400);
  }

  window.PL = window.PL || {};
  window.PL.confetti = burst;
})();
