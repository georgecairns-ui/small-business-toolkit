/*
  THE MAP: a 3D network, drawn on a canvas
  ----------------------------------------
  No libraries. One centre, one hub for each group, one dot for each skill, file or folder. The network
  floats in 3D: drag to turn it, scroll to zoom, hold Shift (or use the right button) and drag to slide it.
  It turns slowly by itself until you touch it, hover a dot or select one. Things nearer to you are bigger
  and brighter, things further away are smaller and softer.

  The 3D is done by hand: every dot has a place in space (x, y, z). Each frame the space is turned by the
  camera (yaw and pitch), squeezed by a little perspective, and drawn from the back to the front. The
  layout is worked out once when the map is built, so it is the same every time for the same skills.

  Two looks, chosen by the page with build(model, { style }):
    "pastel"  soft tones: a light, creamy stage, rounded pastel dots, quiet links, dark slate words
              (turns to a soft dusk in the dark app theme). Used for the skills.
    "neon"    vibrant: a dark stage, glowing neon dots and links, comet-trail pulses. Used for the folders.

  With "reduce motion" switched on in the computer's settings, nothing moves by itself: no turning, no
  growing, no pulses. You can still turn it by hand.

  create(canvas, handlers) returns the controls:
    build(model, { animate, style })   draw a new set of nodes and links (model comes from model.graph)
    setFilter(idSet | null)            dim everything not in the set
    setSelected(id | null)             ring a dot (or hub) and light up what it connects to
    setShowLinks(boolean)              draw every link between items
    fit(), flyTo(id), zoomBy(factor)
  handlers: onSelect(node | null), onHover(node | null, clientX, clientY)
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const TAU = Math.PI * 2;
  const GOLDEN = 2.399963;
  const NEON = ["#34e5ff", "#ff4fd8", "#9dff5c", "#ffb347", "#8f7bff", "#ff6b6b", "#2effb5", "#ff9bd2", "#5aa2ff"];
  const PASTEL = ["#9fd3ee", "#f4b6cf", "#b6dca4", "#f9d98a", "#c9b3ee", "#f6b8a1", "#a6e0cf", "#e9b5ea", "#a9c1f2"];
  const DEFAULT_YAW = 0.55, DEFAULT_PITCH = 0.28;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  // "#RRGGBB" or "rgb(r, g, b)" into a colour with an alpha
  function alpha(colour, a) {
    let r = 128, g = 128, b = 128;
    const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(colour);
    const rgb = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(colour);
    if (hex) { r = parseInt(hex[1], 16); g = parseInt(hex[2], 16); b = parseInt(hex[3], 16); }
    else if (rgb) { r = +rgb[1]; g = +rgb[2]; b = +rgb[3]; }
    return "rgba(" + r + "," + g + "," + b + "," + Math.max(0, Math.min(1, a)) + ")";
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // A small steady number from a word, so every dot has its own phase and the same one each time
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  // 0 (black) to 1 (white), for telling a light theme from a dark one
  function brightness(colour) {
    const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(colour);
    const rgb = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(colour);
    const v = hex ? [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)] : rgb ? [+rgb[1], +rgb[2], +rgb[3]] : [255, 255, 255];
    return (v[0] * 0.299 + v[1] * 0.587 + v[2] * 0.114) / 255;
  }

  function create(canvas, handlers) {
    const ctx = canvas.getContext("2d");
    const reduce = function () { return ui.prefersReducedMotion(); };
    let W = 0, H = 0, dpr = 1;
    let nodes = [], byId = {}, links = [], groups = [], adj = {};
    let cam = { k: 1, x: 0, y: 0, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH };
    let tween = null;
    let style = "neon", dusk = false, col = readColours();
    let filter = null, selected = null, hover = null, showLinks = false;
    let builtAt = 0, animateIn = true, dirty = true, fitted = false, autoFit = true;
    let particles = [], nextSpawn = 0, spawnPool = [];
    let Rmax = 120, Rho = 120, Ymax = 80, baseK = 1, persp = 400;
    let stars = [], lastFrame = 0, spinning = false, inside = false, spin = { yaw: 0, pitch: 0 };

    // ---------- Looks ----------
    function readColours() {
      dusk = brightness(css("--color-bg")) < 0.5;
      const font = css("--font-ui") || "sans-serif";
      if (style === "pastel") {
        return dusk
          ? { ink: "#ece8fa", soft: "#b9b3d3", bg: ["#2f2b40", "#25222f", "#1b1924"], link: "#bdb3e6", danger: "#ff9aa8", halo: 0.5, word: "rgba(236,232,250,", wordSoft: "rgba(185,179,211,", back: "rgba(27,25,36,", font: font }
          : { ink: "#464361", soft: "#7b7899", bg: ["#fffdfb", "#f6f0fb", "#e9f2f6"], link: "#9a93c4", danger: "#e5677a", halo: 0.55, word: "rgba(70,67,97,", wordSoft: "rgba(123,120,153,", back: "rgba(255,253,251,", font: font };
      }
      return { ink: "#f2f7ff", soft: "#8ea0c0", bg: ["#0a1226", "#060a17", "#02040a"], link: "#5aa2ff", danger: "#ff4d6d", halo: 1, word: "rgba(242,247,255,", wordSoft: "rgba(160,178,210,", back: "rgba(3,6,14,", accent: "#34e5ff", font: font };
    }
    function palette() { return style === "pastel" ? PASTEL : NEON; }
    // Nine group colours. A tenth group and beyond take the same colours turned round the colour wheel, so no two groups match
    function groupColour(i) {
      const list = palette();
      const base = list[i % list.length];
      const round = Math.floor(i / list.length);
      return round ? turn(base, round) : base;
    }
    function turn(colour, round) {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(colour);
      if (!m) return colour;
      const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      let h = 0, s = 0;
      if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
      }
      h = (h + 38 * round + 360) % 360;
      const lo = style === "pastel" ? 0.72 : 0.32, hi = style === "pastel" ? 0.86 : 0.72;
      const l2 = clamp(l + (round % 2 ? 0.05 : -0.05), lo, hi);
      const c = (1 - Math.abs(2 * l2 - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), mm = l2 - c / 2;
      const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      return "rgb(" + rgb.map(function (v) { return Math.round((v + mm) * 255); }).join(",") + ")";
    }

    // ---------- Building ----------
    function build(model, options) {
      const first = !nodes.length;
      const nextStyle = options && options.style === "pastel" ? "pastel" : options && options.style === "neon" ? "neon" : style;
      const styleChanged = nextStyle !== style;
      style = nextStyle;
      animateIn = !!(options && options.animate) && !reduce();
      builtAt = performance.now();
      col = readColours();
      groups = model.groups.map(function (g, i) { return Object.assign({}, g, { css: groupColour(i) }); });
      nodes = model.nodes.map(function (n) { return Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ph: hash(n.id) * TAU, born: 0 }, n); });
      links = model.links;
      byId = {}; adj = {};
      nodes.forEach(function (n) { byId[n.id] = n; adj[n.id] = []; });
      links = links.filter(function (l) { return byId[l.s] && byId[l.t]; });
      links.forEach(function (l) { adj[l.s].push(l); adj[l.t].push(l); });
      layout();
      makeStars();
      if (first || !fitted || styleChanged) { fit(false); fitted = true; }
      autoFit = true;
      spawnPool = nodes.filter(function (n) { return n.kind === "skill" && n.uses > 0; });
      particles = [];
      dirty = true;
    }

    // Where every dot sits in space: hubs spread over a squashed sphere, each hub's dots in shells round it
    function layout() {
      const hubs = nodes.filter(function (n) { return n.kind === "hub"; });
      const core = byId.core;
      core.x = core.y = core.z = 0;
      const members = {};
      nodes.forEach(function (n) { if (n.kind === "skill") (members[n.hub] = members[n.hub] || []).push(n); });
      const spacing = 10.4;
      hubs.forEach(function (h) { const m = members[h.id] || []; h.cluster = h.r + 14 + spacing * Math.cbrt(m.length + 1) * 1.55; });
      const widest = hubs.reduce(function (m, h) { return Math.max(m, h.cluster); }, 0);
      const area = hubs.reduce(function (s, h) { return s + h.cluster * h.cluster; }, 0);
      const ring = Math.max(Math.sqrt(area) * 1.55, widest * 1.4 + core.r + 80, 170);
      hubs.forEach(function (h, i) {
        const n = hubs.length;
        const y = n === 1 ? 0 : 1 - 2 * (i + 0.5) / n;
        const rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * GOLDEN;
        h.x = Math.cos(th) * rr * ring; h.y = y * ring * 0.4; h.z = Math.sin(th) * rr * ring;
        h.home = { x: h.x, y: h.y, z: h.z };
        const list = members[h.id] || [];
        list.forEach(function (d, k) {
          const N = list.length;
          const yy = N === 1 ? 0 : 1 - 2 * (k + 0.5) / N, r2 = Math.sqrt(Math.max(0, 1 - yy * yy)), t2 = k * GOLDEN + i * 1.3;
          const r = h.r + 14 + spacing * Math.cbrt(k + 1) * 1.55;
          d.x = h.x + Math.cos(t2) * r2 * r; d.y = h.y + yy * r; d.z = h.z + Math.sin(t2) * r2 * r;
          d.rest = r;
        });
      });
      // A short settling: dots keep their distance from the hub, never overlap, and related dots draw closer
      const refs = links.filter(function (l) { return l.type === "ref" || l.type === "dup"; });
      const dots = nodes.filter(function (n) { return n.kind === "skill"; });
      for (let tick = 0; tick < 80; tick++) {
        const a = 1 - tick / 80;
        dots.forEach(function (n) {
          const h = byId[n.hub];
          const dx = n.x - h.x, dy = n.y - h.y, dz = n.z - h.z, d = Math.hypot(dx, dy, dz) || 1;
          const pull = (d - n.rest) * 0.08;
          n.vx -= dx / d * pull; n.vy -= dy / d * pull; n.vz -= dz / d * pull;
        });
        refs.forEach(function (l) {
          const s = byId[l.s], t = byId[l.t];
          const dx = t.x - s.x, dy = t.y - s.y, dz = t.z - s.z, d = Math.hypot(dx, dy, dz) || 1;
          const f = (d - 90) * 0.0016 * a;
          s.vx += dx / d * f; s.vy += dy / d * f; s.vz += dz / d * f; t.vx -= dx / d * f; t.vy -= dy / d * f; t.vz -= dz / d * f;
        });
        collide(nodes);
        nodes.forEach(function (n) {
          if (n.kind === "core") return;
          if (n.kind === "hub") { n.vx += (n.home.x - n.x) * 0.05; n.vy += (n.home.y - n.y) * 0.05; n.vz += (n.home.z - n.z) * 0.05; }
          n.x += n.vx; n.y += n.vy; n.z += n.vz; n.vx *= 0.6; n.vy *= 0.6; n.vz *= 0.6;
        });
      }
      // The size of the cloud: how far it reaches sideways (the same from every side) and up and down
      Rho = 60; Ymax = 40;
      nodes.forEach(function (n) { const m = n.r + (n.kind === "hub" ? 26 : 8); Rho = Math.max(Rho, Math.hypot(n.x, n.z) + m); Ymax = Math.max(Ymax, Math.abs(n.y) + m); });
      Rmax = Math.max(Rho, Ymax);
      persp = Rmax * 3.2;
      // Grow-in: the centre first, then each hub, then its dots
      let i = 0;
      nodes.forEach(function (n) {
        n.born = n.kind === "core" ? 0 : n.kind === "hub" ? 120 + groupIndex(n) * 90 : 380 + groupIndex(n) * 90 + (i++ % 40) * 14;
      });
    }
    function groupIndex(n) { return Math.max(0, n.group); }

    // Push overlapping dots apart (a 3D grid keeps it quick with hundreds of dots)
    function collide(list) {
      const cell = 34, grid = {};
      list.forEach(function (n) { const key = Math.floor(n.x / cell) + "," + Math.floor(n.y / cell) + "," + Math.floor(n.z / cell); (grid[key] = grid[key] || []).push(n); });
      list.forEach(function (n) {
        const cx = Math.floor(n.x / cell), cy = Math.floor(n.y / cell), cz = Math.floor(n.z / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
          const bucket = grid[gx + "," + gy + "," + gz];
          if (!bucket) continue;
          bucket.forEach(function (m) {
            if (m === n || m.id < n.id) return;
            const dx = m.x - n.x, dy = m.y - n.y, dz = m.z - n.z, d = Math.hypot(dx, dy, dz) || 0.01;
            const min = n.r + m.r + 2.5;
            if (d >= min) return;
            const push = (min - d) / 2 / d;
            if (n.kind !== "core") { n.x -= dx * push; n.y -= dy * push; n.z -= dz * push; }
            if (m.kind !== "core") { m.x += dx * push; m.y += dy * push; m.z += dz * push; }
          });
        }
      });
    }
    // A scatter of faint points around and behind the network, so turning it feels like moving through space
    function makeStars() {
      stars = [];
      const count = 140;
      for (let i = 0; i < count; i++) {
        const a = hash("star" + i), b = hash("sx" + i), c = hash("sy" + i), d = hash("sz" + i);
        stars.push({ x: (b - 0.5) * Rho * 5.5, y: (c - 0.5) * Ymax * 6, z: (d - 0.5) * Rho * 5.5, r: 0.6 + a * 1.6, ph: a * TAU });
      }
    }

    // ---------- Looking at it ----------
    function size() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;
      if (w === W && h === H && ratio === dpr) return;
      W = w; H = h; dpr = ratio;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      dirty = true;
      // Until the person moves the map themselves, it keeps itself fitted to whatever room it has
      if (autoFit && nodes.length) fitNow(false);
    }
    // The camera, worked out once per frame
    let cy_ = 1, sy_ = 0, cp_ = 1, sp_ = 0;
    function setCamera() { cy_ = Math.cos(cam.yaw); sy_ = Math.sin(cam.yaw); cp_ = Math.cos(cam.pitch); sp_ = Math.sin(cam.pitch); }
    // A point in space to a point on the screen (with its depth, for sorting and fading)
    function proj(x, y, z) {
      const x1 = x * cy_ + z * sy_, z1 = -x * sy_ + z * cy_;
      const y2 = y * cp_ - z1 * sp_, z2 = y * sp_ + z1 * cp_;
      const p = persp / (persp + z2);
      return { sx: W / 2 + cam.x + x1 * cam.k * p, sy: H / 2 + cam.y + y2 * cam.k * p, z: z2, p: p };
    }
    function fit(animated) {
      size();
      autoFit = true;
      fitNow(animated);
    }
    function fitNow(animated) {
      if (!nodes.length) return;
      const pitch = animated === false ? cam.pitch : DEFAULT_PITCH;
      // Half as wide as the cloud reaches, and half as tall as it looks from this angle, so it fills the room it has
      const halfH = Ymax * Math.cos(pitch) + Rho * 0.8 * Math.sin(Math.abs(pitch));
      const k = Math.max(0.1, Math.min((W / 2 - 24) / (Rho * 1.02), (H / 2 - 22) / (halfH * 1.04), 3));
      baseK = k;
      moveTo({ k: k, x: 0, y: 0, yaw: cam.yaw, pitch: pitch }, animated === false ? 0 : 450);
    }
    function moveTo(target, ms) {
      if (!ms || reduce()) { cam = Object.assign({}, cam, target); tween = null; dirty = true; return; }
      tween = { from: Object.assign({}, cam), to: Object.assign({}, cam, target), at: performance.now(), ms: ms };
    }
    function flyTo(id, zoom) {
      const n = byId[id];
      if (!n) return;
      size();
      autoFit = false;
      const k = Math.max(cam.k, baseK * (zoom ? zoom / 1.9 * 1.9 : 1.9));
      setCamera();
      const x1 = n.x * cy_ + n.z * sy_, z1 = -n.x * sy_ + n.z * cy_, y2 = n.y * cp_ - z1 * sp_, z2 = n.y * sp_ + z1 * cp_;
      const p = persp / (persp + z2);
      moveTo({ k: k, x: -x1 * k * p, y: -y2 * k * p, yaw: cam.yaw, pitch: cam.pitch }, 500);
    }
    function zoomBy(factor, sx, sy) {
      autoFit = false;
      const k = clamp(cam.k * factor, 0.1, 9);
      const cx = sx == null ? W / 2 : sx, cyy = sy == null ? H / 2 : sy;
      const ratio = k / cam.k;
      cam = { k: k, x: (cx - W / 2) - (cx - W / 2 - cam.x) * ratio, y: (cyy - H / 2) - (cyy - H / 2 - cam.y) * ratio, yaw: cam.yaw, pitch: cam.pitch };
      tween = null; dirty = true;
    }
    function lvl() { return cam.k / Math.max(baseK, 0.01); }

    // How much of a dot's growing-in has happened (0 to 1.15)
    function grown(n, now) {
      if (!animateIn) return 1;
      const t = (now - builtAt - n.born) / 520;
      return t <= 0 ? 0 : t >= 1 ? 1 : back(t);
    }
    function passes(n) {
      if (!filter) return true;
      if (n.kind === "core") return true;
      if (n.kind === "hub") return (adj[n.id] || []).some(function (l) { return l.type === "spoke" && l.s === n.id && filter.has(l.t); });
      return filter.has(n.id);
    }
    // The ids lit up around the selected (or hovered) dot
    function lit(id) {
      const set = new Set([id]);
      const n = byId[id];
      if (!n) return set;
      (adj[id] || []).forEach(function (l) { set.add(l.s); set.add(l.t); });
      if (n.kind === "skill") set.add("core");
      return set;
    }
    // A little float, so the network feels alive
    function wob(n, now) {
      if (reduce() || n.kind === "core") return { x: n.x, y: n.y, z: n.z };
      const m = n.kind === "hub" ? 0.6 : 1.4;
      return { x: n.x + Math.sin(now / 1900 + n.ph) * m, y: n.y + Math.cos(now / 2300 + n.ph * 1.3) * m, z: n.z + Math.sin(now / 2100 + n.ph * 0.7) * m };
    }

    // A soft glowing ball in one colour, drawn once and stamped wherever a glow is needed
    const sprites = {};
    function sprite(colour) {
      if (sprites[colour]) return sprites[colour];
      const c = document.createElement("canvas"); c.width = c.height = 96;
      const x = c.getContext("2d"), g = x.createRadialGradient(48, 48, 0, 48, 48, 48);
      g.addColorStop(0, alpha(colour, 1)); g.addColorStop(0.28, alpha(colour, 0.45)); g.addColorStop(1, alpha(colour, 0));
      x.fillStyle = g; x.fillRect(0, 0, 96, 96);
      sprites[colour] = c;
      return c;
    }

    // ---------- Drawing ----------
    function draw(now) {
      const pastel = style === "pastel";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, Math.max(W, H) * 0.78);
      bg.addColorStop(0, col.bg[0]); bg.addColorStop(0.55, col.bg[1]); bg.addColorStop(1, col.bg[2]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!nodes.length) return;
      setCamera();

      const focus = selected && byId[selected] ? lit(selected) : null;
      const hoverSet = !focus && hover && byId[hover] ? lit(hover) : null;
      const P = {};
      nodes.forEach(function (n) { const w = wob(n, now); P[n.id] = proj(w.x, w.y, w.z); P[n.id].w = w; });
      function dimmed(n) { return !passes(n) || (focus && !focus.has(n.id)); }
      function colourOf(n) { return n.colour && !pastel ? n.colour : n.kind === "core" ? (pastel ? "#c9b3ee" : col.accent) : groups[n.group] ? groups[n.group].css : (pastel ? PASTEL[0] : col.accent); }
      // Near things are bright, far things fade (1 at the front, about 0.4 at the back)
      function depth(z) { return clamp(0.7 - z / (Rmax * 2.2), 0.38, 1); }
      function halo(x, y, r, c, a) { if (a <= 0.01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(c), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
      const lw = Math.max(0.7, Math.min(2, cam.k / Math.max(baseK, 0.01)));

      // A faint floor and points of light behind everything, so the depth reads straight away
      drawSpace(P, now, pastel);

      // Links first, then dots from the back to the front
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = pastel ? "source-over" : "lighter";

      links.forEach(function (l) {
        if (l.type !== "spoke") return;
        const s = byId[l.s], t = byId[l.t];
        const g = Math.min(grown(s, now), grown(t, now));
        if (g <= 0) return;
        const a = P[s.id], b = P[t.id], dim = dimmed(t), f = depth((a.z + b.z) / 2);
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(a.sx + (b.sx - a.sx) * Math.min(1, g), a.sy + (b.sy - a.sy) * Math.min(1, g));
        ctx.lineWidth = lw * (pastel ? 1.6 : 1.1) * (a.p + b.p) / 2;
        ctx.strokeStyle = alpha(colourOf(s), (dim ? 0.05 : pastel ? 0.5 : 0.34) * f);
        ctx.stroke();
      });
      links.forEach(function (l) {
        if (l.type !== "hub") return;
        const s = byId[l.s], t = byId[l.t];
        const g = Math.min(1, grown(t, now));
        if (g <= 0) return;
        const a = P[s.id], b = P[t.id], dm = dimmed(t), c = colourOf(t), f = depth((a.z + b.z) / 2);
        const ex = a.sx + (b.sx - a.sx) * g, ey = a.sy + (b.sy - a.sy) * g;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(ex, ey);
        ctx.lineWidth = lw * (pastel ? 9 : 7); ctx.strokeStyle = alpha(c, (dm ? 0.015 : pastel ? 0.16 : 0.07) * f); ctx.stroke();
        ctx.lineWidth = lw * (pastel ? 2.4 : 1.7); ctx.strokeStyle = alpha(c, (dm ? 0.1 : pastel ? 0.8 : 0.62) * f); ctx.stroke();
      });
      // Links between items: all of them with Links on, otherwise only around the selected or hovered dot
      const around = focus ? selected : hover && hoverSet ? hover : null;
      links.forEach(function (l) {
        if (l.type !== "ref" && l.type !== "dup") return;
        const touching = around && (l.s === around || l.t === around);
        if (!showLinks && !touching && l.type !== "dup") return;
        const s = byId[l.s], t = byId[l.t];
        if (grown(s, now) < 1 || grown(t, now) < 1) return;
        const a = P[s.id], b = P[t.id], f = depth((a.z + b.z) / 2);
        const mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2, dx = b.sx - a.sx, dy = b.sy - a.sy;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy);
        ctx.quadraticCurveTo(mx - dy * 0.18, my + dx * 0.18, b.sx, b.sy);
        ctx.lineWidth = (touching ? 2 : 1.2) * lw;
        const dim = !touching && (dimmed(s) || dimmed(t));
        if (l.type === "dup") { ctx.setLineDash([5, 4]); ctx.strokeStyle = alpha(col.danger, (dim ? 0.1 : touching ? 0.95 : 0.6) * f); }
        else { ctx.setLineDash([]); ctx.strokeStyle = alpha(col.link, (dim ? 0.08 : touching ? 0.95 : pastel ? 0.5 : 0.38) * f); }
        ctx.stroke(); ctx.setLineDash([]);
      });

      // Pulses travelling out to the active dots, each with a short comet tail
      if (!reduce() && !document.hidden && spawnPool.length) {
        if (now > nextSpawn && particles.length < Math.min(44, 8 + spawnPool.length)) {
          let total = 0; spawnPool.forEach(function (n) { total += n.uses; });
          let pick = Math.random() * total, target = spawnPool[0];
          for (let i = 0; i < spawnPool.length; i++) { pick -= spawnPool[i].uses; if (pick <= 0) { target = spawnPool[i]; break; } }
          particles.push({ to: target, at: now, ms: 1500 + Math.random() * 900 });
          nextSpawn = now + 130 + Math.random() * 240;
        }
        particles = particles.filter(function (p) { return now - p.at < p.ms; });
        particles.forEach(function (p) {
          const hub = byId[p.to.hub];
          if (!hub || grown(p.to, now) < 1 || dimmed(p.to)) return;
          const c = colourOf(p.to), A = P.core.w, B = P[hub.id].w, Cc = P[p.to.id].w;
          const at = function (t) {
            let w;
            if (t < 0.5) { const u = ease(Math.max(0, t) / 0.5); w = { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u, z: A.z + (B.z - A.z) * u }; }
            else { const u = ease(Math.min(1, (t - 0.5) / 0.5)); w = { x: B.x + (Cc.x - B.x) * u, y: B.y + (Cc.y - B.y) * u, z: B.z + (Cc.z - B.z) * u }; }
            return proj(w.x, w.y, w.z);
          };
          const t = (now - p.at) / p.ms, fade = Math.sin(Math.min(1, t) * Math.PI);
          for (let i = 5; i >= 0; i--) {
            const q = at(t - i * 0.022);
            halo(q.sx, q.sy, (6 - i * 0.7) * q.p * Math.max(1, lw), c, fade * (0.9 - i * 0.14) * (pastel ? 0.8 : 1));
          }
          const h = at(t);
          ctx.beginPath(); ctx.arc(h.sx, h.sy, 1.9 * h.p, 0, TAU); ctx.fillStyle = pastel ? alpha("#ffffff", 0.95 * fade) : alpha("#ffffff", 0.95 * fade); ctx.fill();
        });
      }

      // The dots, back to front
      const order = nodes.slice().sort(function (a, b) { return P[b.id].z - P[a.id].z; });
      order.forEach(function (n) {
        const g = grown(n, now);
        if (g <= 0) return;
        const q = P[n.id], dm = dimmed(n), c = colourOf(n), f = depth(q.z);
        const scale = cam.k * q.p;
        const r = Math.max(0.8, n.r * g * scale);
        const isSel = selected === n.id;
        if (n.kind === "core") {
          const pulse = reduce() ? 0 : Math.sin(now / 900) * 2;
          halo(q.sx, q.sy, r * 5 + pulse, c, pastel ? 0.7 : 0.55);
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, TAU); ctx.fillStyle = pastel ? "#ffffff" : "#e8fbff"; ctx.fill();
          if (pastel) { ctx.lineWidth = 3 * lw; ctx.strokeStyle = alpha(c, 0.95); ctx.stroke(); }
          const spinA = reduce() ? 0 : now / 1700;
          ctx.lineWidth = 2 * lw; ctx.strokeStyle = alpha(pastel ? "#a999d8" : col.accent, 0.9);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(q.sx, q.sy, r + 8 * q.p, spinA + i * 2.094, spinA + i * 2.094 + 1.2); ctx.stroke(); }
          ctx.globalCompositeOperation = "source-over"; sparkle(q.sx, q.sy, r * 0.55, pastel ? "#8f7fc4" : "#04141c"); ctx.globalCompositeOperation = pastel ? "source-over" : "lighter";
          return;
        }
        if (n.kind === "hub") {
          halo(q.sx, q.sy, r * 2.7, c, (dm ? 0.1 : 0.42) * f * col.halo);
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, TAU);
          if (pastel) {
            ctx.fillStyle = alpha(c, dm ? 0.18 : 0.88); ctx.fill();
            ctx.lineWidth = (isSel ? 3.5 : 2.4) * lw; ctx.strokeStyle = alpha(dusk ? "#ffffff" : "#ffffff", dm ? 0.25 : 0.95); ctx.stroke();
          } else {
            ctx.fillStyle = alpha(c, dm ? 0.05 : 0.14); ctx.fill();
            ctx.lineWidth = (isSel ? 3 : 2) * lw; ctx.strokeStyle = alpha(c, dm ? 0.25 : 1); ctx.stroke();
          }
          const spinH = reduce() ? 0 : now / 2600 * (n.group % 2 ? 1 : -1);
          ctx.setLineDash([3, 7]); ctx.lineDashOffset = spinH * 40;
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r + 7 * q.p, 0, TAU); ctx.lineWidth = lw; ctx.strokeStyle = alpha(c, (dm ? 0.08 : 0.55) * f); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          if (n.flagged && !dm) { ctx.beginPath(); ctx.arc(q.sx + r * 0.78, q.sy - r * 0.78, 3.2 * Math.max(1, lw), 0, TAU); ctx.fillStyle = alpha(col.danger, 1); ctx.fill(); }
          return;
        }
        const bright = n.uses > 0 && !dm;
        const breathe = reduce() ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1100 + n.ph);
        if (pastel) {
          // Soft rounded dots with a pale highlight, like sweets
          if (bright) halo(q.sx, q.sy, r * (2.8 + breathe * 0.9), c, (0.34 + breathe * 0.16) * f);
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, TAU);
          if (n.uses > 0) { ctx.fillStyle = alpha(c, dm ? 0.18 : 0.95 * (0.55 + 0.45 * f)); ctx.fill(); ctx.beginPath(); ctx.arc(q.sx - r * 0.28, q.sy - r * 0.3, Math.max(0.6, r * 0.34), 0, TAU); ctx.fillStyle = alpha("#ffffff", dm ? 0.1 : 0.7); ctx.fill(); }
          else { ctx.fillStyle = alpha(dusk ? "#25222f" : "#ffffff", dm ? 0.35 : 0.85); ctx.fill(); ctx.lineWidth = 1.6 * lw; ctx.strokeStyle = alpha(c, dm ? 0.2 : 0.95 * (0.6 + 0.4 * f)); ctx.stroke(); }
        } else {
          if (bright) halo(q.sx, q.sy, r * (3.4 + breathe * 1.2), c, (0.26 + breathe * 0.2) * f);
          else if (!dm) halo(q.sx, q.sy, r * 2.4, c, 0.1 * f);
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, TAU);
          if (n.uses > 0) { ctx.fillStyle = alpha(c, dm ? 0.14 : 1 * (0.5 + 0.5 * f)); ctx.fill(); ctx.beginPath(); ctx.arc(q.sx, q.sy, Math.max(0.7, r * 0.42), 0, TAU); ctx.fillStyle = alpha("#ffffff", dm ? 0.1 : 0.85); ctx.fill(); }
          else { ctx.fillStyle = alpha("#04060d", dm ? 0.4 : 0.9); ctx.fill(); ctx.lineWidth = 1.5 * lw; ctx.strokeStyle = alpha(c, dm ? 0.18 : 0.9 * f); ctx.stroke(); }
        }
        if (n.skillKind === "command") { ctx.beginPath(); ctx.arc(q.sx, q.sy, Math.max(0.9, r * 0.3), 0, TAU); ctx.fillStyle = pastel ? alpha(dusk ? "#25222f" : "#ffffff", dm ? 0.3 : 0.95) : alpha("#04060d", dm ? 0.3 : 0.9); ctx.fill(); }
        if (n.flag && !dm) {
          const k2 = reduce() ? 1 : 0.65 + 0.35 * Math.sin(now / 500 + n.ph);
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r + 3.4 * q.p, 0, TAU); ctx.lineWidth = 1.4 * lw; ctx.strokeStyle = alpha(col.danger, 0.9 * k2); ctx.stroke();
        }
        if (isSel || hover === n.id) { ctx.beginPath(); ctx.arc(q.sx, q.sy, r + 4.5 * q.p, 0, TAU); ctx.lineWidth = (isSel ? 2.2 : 1.5) * lw; ctx.strokeStyle = isSel ? (pastel ? col.ink : "#ffffff") : alpha(pastel ? col.ink : "#ffffff", 0.55); ctx.stroke(); }
      });
      ctx.globalCompositeOperation = "source-over";

      // Words, drawn at screen size so they stay crisp (back to front, so near words sit on top)
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const L = lvl();
      order.forEach(function (n) {
        const g = grown(n, now);
        if (g < 0.9) return;
        const q = P[n.id];
        if (q.sx < -80 || q.sy < -40 || q.sx > W + 80 || q.sy > H + 40) return;
        const dm = dimmed(n), f = depth(q.z), scale = cam.k * q.p;
        if (n.kind === "hub") {
          const r = n.r * scale;
          ctx.font = "700 " + Math.max(10, Math.min(14, 11.5 * Math.sqrt(q.p * Math.max(L, 0.6)) + 1)) + "px " + col.font;
          ctx.fillStyle = dm ? col.word + "0.3)" : col.word + (0.55 + 0.45 * f) + ")";
          if (r > 11) { ctx.fillStyle = pastel ? (dm ? col.word + "0.3)" : "rgba(60,56,90," + (0.7 + 0.3 * f) + ")") : ctx.fillStyle; ctx.fillText(String(n.count), q.sx, q.sy); }
          label(n.label, q.sx, q.sy + r + 14, (dm ? 0.4 : 1) * (0.55 + 0.45 * f), true);
        } else if (n.kind === "skill") {
          const sel = selected === n.id || hover === n.id;
          const show = sel || (focus && focus.has(n.id) && L > 0.9) || L >= 2.6 || (L >= 1.7 && n.r > 4.8 && !dm);
          if (show && !(dm && !sel) && (sel || f > 0.5)) label(n.label, q.sx, q.sy + n.r * scale + 11, (sel ? 1 : f), sel);
        } else if (n.kind === "core" && L > 0.3) {
          label(n.label, q.sx, q.sy + n.r * scale + 26, 1, true);
        }
      });
      // A soft vignette pulls the eye to the middle
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
      if (pastel) { vg.addColorStop(0, alpha(col.bg[2], 0)); vg.addColorStop(1, alpha(col.bg[2], dusk ? 0.5 : 0.55)); }
      else { vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); }
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    // The floor (rings and spokes below the network) and the far-off points of light
    function drawSpace(P, now, pastel) {
      ctx.globalCompositeOperation = pastel ? "source-over" : "lighter";
      const floorY = Ymax * 1.05;
      const ringC = pastel ? alpha(dusk ? "#b9b3d3" : "#9a93c4", dusk ? 0.2 : 0.3) : "rgba(90,162,255,0.16)";
      ctx.lineWidth = 1; ctx.strokeStyle = ringC;
      [0.5, 0.85, 1.2].forEach(function (m) {
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, q = proj(Math.cos(a) * Rho * m, floorY, Math.sin(a) * Rho * m); if (i) ctx.lineTo(q.sx, q.sy); else ctx.moveTo(q.sx, q.sy); }
        ctx.stroke();
      });
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, a0 = proj(Math.cos(a) * Rho * 0.5, floorY, Math.sin(a) * Rho * 0.5), b0 = proj(Math.cos(a) * Rho * 1.2, floorY, Math.sin(a) * Rho * 1.2); ctx.moveTo(a0.sx, a0.sy); ctx.lineTo(b0.sx, b0.sy); }
      ctx.strokeStyle = pastel ? alpha(dusk ? "#b9b3d3" : "#9a93c4", dusk ? 0.1 : 0.16) : "rgba(90,162,255,0.08)"; ctx.stroke();
      stars.forEach(function (s) {
        const q = proj(s.x, s.y, s.z);
        const tw = reduce() ? 0.7 : 0.55 + 0.45 * Math.sin(now / 1400 + s.ph);
        const fade = clamp(0.8 - q.z / (Rmax * 4.5), 0.15, 1);
        if (pastel) { halo(q.sx, q.sy, s.r * 5 * q.p, PASTEL[(s.ph * 3 | 0) % 9], 0.22 * fade * tw); }
        else { ctx.fillStyle = "rgba(160,200,255," + (0.5 * fade * tw) + ")"; ctx.fillRect(q.sx - s.r * 0.5, q.sy - s.r * 0.5, s.r, s.r); }
      });
      ctx.globalCompositeOperation = "source-over";
    }
    function halo(x, y, r, c, a) { if (a <= 0.01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(c), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    function label(text, x, y, a, strong) {
      const t = text.length > 28 ? text.slice(0, 27) + "…" : text;
      ctx.font = (strong ? "650 " : "500 ") + "11.5px " + col.font;
      ctx.lineWidth = 4; ctx.lineJoin = "round";
      ctx.strokeStyle = col.back + (0.9 * a) + ")"; ctx.strokeText(t, x, y);
      ctx.fillStyle = (strong ? col.word : col.wordSoft) + a + ")"; ctx.fillText(t, x, y);
    }
    function sparkle(x, y, r, colour) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.34 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
    }

    // ---------- The loop ----------
    let raf = 0, timer = 0, alive = true;
    function frame(now) {
      raf = 0;
      if (!alive) return;
      if (!canvas.isConnected) { timer = setTimeout(function () { timer = 0; schedule(); }, 400); return; }
      size();
      const dt = lastFrame ? Math.min(60, now - lastFrame) : 16;
      lastFrame = now;
      if (tween) {
        const t = Math.min(1, (now - tween.at) / tween.ms), e = ease(t), a = tween.from, b = tween.to;
        cam = { k: a.k + (b.k - a.k) * e, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, yaw: a.yaw + (b.yaw - a.yaw) * e, pitch: a.pitch + (b.pitch - a.pitch) * e };
        if (t >= 1) tween = null;
        dirty = true;
      }
      // Turning: by hand (with a little glide after you let go), or slowly on its own
      if (spin.yaw || spin.pitch) {
        cam.yaw += spin.yaw * dt; cam.pitch = clamp(cam.pitch + spin.pitch * dt, -1.3, 1.3);
        spin.yaw *= Math.pow(0.992, dt); spin.pitch *= Math.pow(0.992, dt);
        if (Math.abs(spin.yaw) < 0.00001) spin.yaw = 0;
        if (Math.abs(spin.pitch) < 0.00001) spin.pitch = 0;
        dirty = true;
      }
      const idle = !spinning && !inside && !tween && !hover && !selected && !document.hidden;
      if (idle && !reduce() && nodes.length) { cam.yaw += 0.00003 * dt; dirty = true; }
      const growing = animateIn && now - builtAt < 3200;
      if (dirty || growing || !reduce()) { draw(now); dirty = false; }
      schedule();
    }
    function schedule() { if (alive && !raf && !timer) raf = requestAnimationFrame(frame); }

    // ---------- Pointing at it ----------
    // Whatever the pointer is closest to the middle of wins (a dot just beats a hub when both are equally close);
    // when two are about equal, the nearer one wins
    function hit(ev) {
      const r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
      setCamera();
      let best = null, bestScore = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const q = proj(n.x, n.y, n.z);
        const rad = Math.max(n.r * cam.k * q.p, 5) + 4;
        const d = Math.hypot(q.sx - mx, q.sy - my);
        if (d > rad) continue;
        const score = d / rad * (n.kind === "skill" ? 0.85 : 1) + (q.z / Rmax) * 0.08;
        if (score < bestScore) { best = n; bestScore = score; }
      }
      return best;
    }
    const pointers = new Map();
    let drag = null, pinch = null;
    canvas.addEventListener("pointerdown", function (ev) {
      canvas.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      tween = null; spin.yaw = 0; spin.pitch = 0;
      if (pointers.size === 1) drag = { x: ev.clientX, y: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: false, slide: ev.shiftKey || ev.button === 2 || ev.button === 1 };
      if (pointers.size === 2) { const a = Array.from(pointers.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), k: cam.k, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 }; drag = null; }
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const a = Array.from(pointers.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        const r = canvas.getBoundingClientRect(), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        cam.x += mx - pinch.mx; cam.y += my - pinch.my; pinch.mx = mx; pinch.my = my; autoFit = false;
        zoomBy(pinch.k * (d / pinch.d) / cam.k, mx - r.left, my - r.top);
        return;
      }
      if (drag) {
        const dx = ev.clientX - drag.lx, dy = ev.clientY - drag.ly;
        if (!drag.moved && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > 4) { drag.moved = true; spinning = true; autoFit = false; }
        if (drag.moved) {
          if (drag.slide) { cam.x += dx; cam.y += dy; }
          else { cam.yaw += dx * 0.0062; cam.pitch = clamp(cam.pitch + dy * 0.0062, -1.3, 1.3); spin.yaw = dx * 0.0062 / 16; spin.pitch = dy * 0.0062 / 16; }
          drag.lx = ev.clientX; drag.ly = ev.clientY; dirty = true; canvas.style.cursor = "grabbing"; handlers.onHover(null); return;
        }
      }
      const n = hit(ev);
      const id = n ? n.id : null;
      if (id !== hover) { hover = id; dirty = true; canvas.style.cursor = n ? "pointer" : "grab"; }
      handlers.onHover(n, ev.clientX, ev.clientY);
    });
    function release(ev) {
      const was = drag;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      drag = null; spinning = false;
      canvas.style.cursor = hover ? "pointer" : "grab";
      if (ev.type === "pointerup" && was && !was.moved) { const n = hit(ev); handlers.onSelect(n); }
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerenter", function () { inside = true; });
    canvas.addEventListener("pointerleave", function () { inside = false; if (hover) { hover = null; dirty = true; } handlers.onHover(null); });
    canvas.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomBy(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0016)), ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    canvas.addEventListener("dblclick", function (ev) { const n = hit(ev); if (n && n.kind === "hub") flyTo(n.id, 1.6); });
    canvas.addEventListener("keydown", function (ev) {
      if (ev.key === "+" || ev.key === "=") zoomBy(1.25);
      else if (ev.key === "-") zoomBy(0.8);
      else if (ev.key === "0") fit();
      else if (ev.key === "ArrowLeft") { cam.yaw -= 0.15; dirty = true; }
      else if (ev.key === "ArrowRight") { cam.yaw += 0.15; dirty = true; }
      else if (ev.key === "ArrowUp") { cam.pitch = clamp(cam.pitch - 0.12, -1.3, 1.3); dirty = true; }
      else if (ev.key === "ArrowDown") { cam.pitch = clamp(cam.pitch + 0.12, -1.3, 1.3); dirty = true; }
      else return;
      ev.preventDefault();
    });

    // Light or dark changes the colours; a new size changes the picture
    function recolour() { col = readColours(); groups.forEach(function (g, i) { g.css = groupColour(i); }); dirty = true; }
    const themeWatch = new MutationObserver(recolour);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    const sizeWatch = typeof ResizeObserver === "function" ? new ResizeObserver(function () { size(); dirty = true; }) : null;
    if (sizeWatch) sizeWatch.observe(canvas);
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.addEventListener) mq.addEventListener("change", function () { dirty = true; });
    }
    schedule();

    return {
      build: build,
      setFilter: function (set) { filter = set; dirty = true; },
      setSelected: function (id) { selected = id; dirty = true; },
      setShowLinks: function (on) { showLinks = !!on; dirty = true; },
      fit: function () { fit(true); },
      flyTo: flyTo,
      zoomBy: function (f) { zoomBy(f); },
      resize: function () { size(); dirty = true; },
      repaint: recolour,
      groupColours: function () { return groups.map(function (g) { return { key: g.key, label: g.label, count: g.count, css: g.css }; }); },
      style: function () { return style; },
      has: function (id) { return !!byId[id]; },
      destroy: function () { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); themeWatch.disconnect(); if (sizeWatch) sizeWatch.disconnect(); }
    };
  }

  window.SM = window.SM || {};
  window.SM.map = { create: create };
})();
