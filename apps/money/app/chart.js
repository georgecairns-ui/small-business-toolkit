/*
  CHART: the forecast line chart, drawn by hand as SVG
  ----------------------------------------------------
  No library. One call draws it: MV.chart.mount(host, config) and it keeps itself the right size for its box.

  The pages call MV.chart.forecast(host, [ { id, label, weeks, base, tone } ], { nervous, label }), which works out
  the opening balance and calls mount with this:

  config = {
    series: [ { id, label, tone, weeks } ],   weeks is the list from MV.model.forecast; the first series is the main one
    opening: 5800,                           today's balance, where every line starts (the "Now" dot)
    nervous: 5000,                           the comfort level, drawn as a dashed line (0 or missing: not drawn)
    label: "Your balance over the next 12 weeks"
  }
  tone is one of ink, accent, info, success, warning (the colours come from theme.css through app.css).

  What it shows: a line per series through the balance at the end of each week; the part of any line under
  zero shaded; the main line's lowest week marked and labelled; the comfort level dashed. Moving the mouse
  over a week (or tapping it, or the left and right arrow keys once the chart has focus) opens a small card
  with that week's money in and out, item by item, and each line's balance. A hidden table says the same
  to screen readers. Every figure is handed in; nothing here works out money.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc;
  const M = window.MV.model;
  const TONES = ["ink", "accent", "info", "success", "warning"];
  const MAX_ITEMS = 7;
  let counter = 0;

  // Round tick values: 1, 2, 2.5 or 5 times a power of 10, about 5 of them
  function ticksFor(min, max) {
    const span = Math.max(max - min, 1), raw = span / 5, pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(function (m) { return m * pow; }).filter(function (s) { return s >= raw; })[0];
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (let v = lo; v <= hi + step / 1000; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }
  // £5k, £1.2k, £850, -£500
  function axisLabel(v) {
    const a = Math.abs(v), sign = v < 0 ? "-" : "";
    if (a >= 1000) return sign + "£" + String(Math.round(a / 100) / 10).replace(/\.0$/, "") + "k";
    return sign + "£" + Math.round(a);
  }
  function lowOf(weeks) {
    let best = null;
    weeks.forEach(function (w, i) { if (!best || w.balance < best.balance) best = { balance: w.balance, index: i }; });
    return best;
  }

  function mount(host, config) {
    const uid = "mvc" + (++counter);
    const series = (config.series || []).filter(function (s) { return s && s.weeks && s.weeks.length; });
    const state = { active: -1, focused: false };
    let observer = null, live = null;

    if (!series.length) { host.innerHTML = ""; return { destroy: function () {} }; }
    const n = series[0].weeks.length;
    const opening = Number(config.opening) || 0;
    const nervous = Number(config.nervous) > 0 ? Number(config.nervous) : null;

    // The numbers the axis has to cover
    const values = [opening];
    series.forEach(function (s) { s.weeks.forEach(function (w) { values.push(w.balance); }); });
    if (nervous) values.push(nervous);
    let min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (min < 0) min = Math.min(min, 0); else min = Math.max(0, min - (max - min) * 0.2);
    if (max === min) max = min + 1000;
    const ticks = ticksFor(min, max), lo = ticks[0], hi = ticks[ticks.length - 1];

    function geometry() {
      const W = Math.max(280, host.clientWidth || 640), H = W < 520 ? 230 : 290;
      const g = { W: W, H: H, L: W < 520 ? 44 : 52, R: 14, T: 18, B: 30 };
      g.pw = W - g.L - g.R; g.ph = H - g.T - g.B; g.bw = g.pw / n;
      g.x = function (i) { return g.L + (i + 0.5) * g.bw; };
      g.y = function (v) { return g.T + (1 - (v - lo) / (hi - lo)) * g.ph; };
      return g;
    }
    function tone(s, i) { return s.tone || TONES[i % TONES.length]; }

    function pathFor(s, g) {
      return "M" + g.L.toFixed(1) + "," + g.y(opening).toFixed(1) + s.weeks.map(function (w, i) { return " L" + g.x(i).toFixed(1) + "," + g.y(w.balance).toFixed(1); }).join("");
    }
    function describe(i) {
      const w = series[0].weeks[i];
      return M.weekLabel(w.weekStart) + ": " + series.map(function (s) { return (series.length > 1 ? s.label + " " : "Balance ") + M.money(s.weeks[i].balance); }).join(", ") +
        ". In " + M.money(w.in) + ", out " + M.money(w.out) + ".";
    }

    function cardHtml(i) {
      const w = series[0].weeks[i];
      const items = w.items.slice().sort(function (a, b) { return a.dir === b.dir ? a.date.localeCompare(b.date) : a.dir === "in" ? -1 : 1; });
      const rows = items.slice(0, MAX_ITEMS).map(function (it) {
        return '<li class="chart-card__item"><span class="chart-card__name">' + esc(it.name) + (it.estimate ? ' <span class="muted">(estimate)</span>' : "") + (it.maybe ? ' <span class="muted">(maybe)</span>' : "") +
          '</span><span class="chart-card__amount chart-card__amount--' + (it.dir === "in" ? "in" : "out") + '">' + (it.dir === "in" ? "+" : "-") + esc(M.money(it.amount)) + "</span></li>";
      }).join("");
      const more = items.length > MAX_ITEMS ? '<li class="chart-card__more muted">and ' + (items.length - MAX_ITEMS) + " more</li>" : "";
      return '<div class="chart-card__head"><strong>' + esc(M.weekLabel(w.weekStart)) + '</strong><span class="muted">' + esc(M.dayLabel(w.weekStart) + " to " + M.dayLabel(w.weekEnd)) + "</span></div>" +
        '<div class="chart-card__sums"><span>In <b class="chart-card__amount--in">' + esc(M.money(w.in)) + '</b></span><span>Out <b class="chart-card__amount--out">' + esc(M.money(w.out)) + "</b></span></div>" +
        (items.length ? '<ul class="chart-card__list">' + rows + more + "</ul>" : '<p class="chart-card__none muted">Nothing due this week.</p>') +
        '<ul class="chart-card__bal">' + series.map(function (s, k) {
          return '<li><i class="chart__swatch chart__swatch--' + tone(s, k) + '"></i><span>' + esc(series.length > 1 ? s.label : "Balance at the end of the week") + "</span><b>" + esc(M.money(s.weeks[i].balance)) + "</b></li>";
        }).join("") + "</ul>";
    }

    function draw() {
      const g = geometry(), zeroInside = lo < 0 && hi > 0, y0 = g.y(0);
      const every = Math.max(1, Math.ceil(46 / g.bw));
      const low = lowOf(series[0].weeks);
      let svg = '<svg class="chart__svg" viewBox="0 0 ' + g.W + " " + g.H + '" width="' + g.W + '" height="' + g.H + '" aria-hidden="true" focusable="false">';
      // Grid and the money axis
      ticks.forEach(function (t) {
        const y = g.y(t).toFixed(1);
        svg += '<line class="chart__grid' + (t === 0 ? " chart__grid--zero" : "") + '" x1="' + g.L + '" x2="' + (g.W - g.R) + '" y1="' + y + '" y2="' + y + '"/>' +
          '<text class="chart__tick" x="' + (g.L - 8) + '" y="' + (Number(y) + 4) + '" text-anchor="end">' + esc(axisLabel(t)) + "</text>";
      });
      // The weeks along the bottom: the first day of each
      series[0].weeks.forEach(function (w, i) {
        if (i % every === 0) svg += '<text class="chart__tick" x="' + g.x(i).toFixed(1) + '" y="' + (g.H - 8) + '" text-anchor="middle">' + esc(M.dayLabel(w.weekStart)) + "</text>";
      });
      // Under zero, shaded
      if (lo < 0) {
        svg += '<clipPath id="' + uid + '-neg"><rect x="' + g.L + '" y="' + (zeroInside ? y0 : g.T) + '" width="' + g.pw + '" height="' + ((g.H - g.B) - (zeroInside ? y0 : g.T)) + '"/></clipPath>';
        series.forEach(function (s, k) {
          svg += '<path class="chart__neg" clip-path="url(#' + uid + '-neg)" d="' + pathFor(s, g) + " L" + g.x(n - 1).toFixed(1) + "," + y0.toFixed(1) + " L" + g.L + "," + y0.toFixed(1) + ' Z"' + (k ? ' style="opacity:.5"' : "") + "/>";
        });
      }
      // The comfort level
      if (nervous) {
        const yn = g.y(nervous).toFixed(1);
        svg += '<line class="chart__nervous" x1="' + g.L + '" x2="' + (g.W - g.R) + '" y1="' + yn + '" y2="' + yn + '"/>' +
          '<text class="chart__label chart__label--nervous" x="' + (g.W - g.R - 4) + '" y="' + (Number(yn) - 6) + '" text-anchor="end">Your comfort level ' + esc(M.money(nervous, { round: true })) + "</text>";
      }
      // The hover guide
      if (state.active > -1) {
        svg += '<rect class="chart__band" x="' + (g.L + state.active * g.bw).toFixed(1) + '" y="' + g.T + '" width="' + g.bw.toFixed(1) + '" height="' + g.ph + '"/>';
      }
      // The lines, main one last so it sits on top
      series.slice().map(function (s, k) { return { s: s, k: k }; }).reverse().forEach(function (o) {
        svg += '<path class="chart__line chart__line--' + tone(o.s, o.k) + '" d="' + pathFor(o.s, g) + '"/>';
      });
      svg += '<circle class="chart__now" cx="' + g.L + '" cy="' + g.y(opening).toFixed(1) + '" r="4"/>' +
        '<text class="chart__tick" x="' + (g.L + 8) + '" y="' + (g.y(opening) - 8).toFixed(1) + '">Now</text>';
      // Every line's lowest week, and the main one labelled
      series.forEach(function (s, k) {
        const l = lowOf(s.weeks);
        svg += '<circle class="chart__low chart__low--' + tone(s, k) + '" cx="' + g.x(l.index).toFixed(1) + '" cy="' + g.y(l.balance).toFixed(1) + '" r="5"/>';
      });
      if (low) {
        const lx = g.x(low.index), ly = g.y(low.balance), above = ly - 14 > g.T + 8, anchor = lx > g.W - 120 ? "end" : lx < g.L + 70 ? "start" : "middle";
        svg += '<text class="chart__label' + (low.balance < 0 ? " chart__label--bad" : "") + '" x="' + lx.toFixed(1) + '" y="' + (above ? ly - 12 : ly + 20).toFixed(1) + '" text-anchor="' + anchor + '">Lowest ' + esc(M.money(low.balance, { round: true })) + "</text>";
      }
      if (state.active > -1) {
        series.forEach(function (s, k) {
          svg += '<circle class="chart__dot chart__dot--' + tone(s, k) + '" cx="' + g.x(state.active).toFixed(1) + '" cy="' + g.y(s.weeks[state.active].balance).toFixed(1) + '" r="4.5"/>';
        });
      }
      svg += "</svg>";

      const legend = '<ul class="chart__legend">' + series.map(function (s, k) {
        return '<li><i class="chart__swatch chart__swatch--' + tone(s, k) + '"></i>' + esc(s.label || "Your balance") + "</li>";
      }).join("") + (nervous ? '<li><i class="chart__swatch chart__swatch--dash"></i>Your comfort level</li>' : "") +
        (lo < 0 ? '<li><i class="chart__swatch chart__swatch--neg"></i>Below zero</li>' : "") + "</ul>";
      const table = '<table class="sr-only"><caption>' + esc(config.label || "Your balance week by week") + "</caption><thead><tr><th>Week starting</th><th>Money in</th><th>Money out</th>" +
        series.map(function (s) { return "<th>" + esc((s.label || "Balance") + " at the end of the week") + "</th>"; }).join("") + "</tr></thead><tbody>" +
        series[0].weeks.map(function (w, i) {
          return "<tr><th scope=\"row\">" + esc(M.dayLabel(w.weekStart)) + "</th><td>" + esc(M.money(w.in)) + "</td><td>" + esc(M.money(w.out)) + "</td>" +
            series.map(function (s) { return "<td>" + esc(M.money(s.weeks[i].balance)) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table>";

      host.classList.add("chart");
      host.innerHTML = '<div class="chart__stage" tabindex="0" role="group" aria-label="' + esc((config.label || "Your balance week by week") + ". Use the left and right arrow keys to move between weeks.") + '">' + svg +
        '<div class="chart-card" hidden></div></div><div class="chart__live sr-only" aria-live="polite"></div>' + legend +
        '<p class="chart__note muted">Each point is your balance at the end of a week. The labels under the chart are the first day of that week.</p>' + table;
      live = host.querySelector(".chart__live");
      if (state.active > -1) placeCard(g);
    }

    function placeCard(g) {
      const card = host.querySelector(".chart-card"), stage = host.querySelector(".chart__stage");
      if (!card || state.active < 0) return;
      card.innerHTML = cardHtml(state.active);
      card.hidden = false;
      const cw = Math.min(280, g.W - 16), x = g.x(state.active);
      card.style.width = cw + "px";
      const right = x + g.bw / 2 + 10, left = x - g.bw / 2 - 10 - cw;
      card.style.left = Math.max(8, Math.min(g.W - cw - 8, x < g.W / 2 ? right : left)) + "px";
      card.style.top = g.T + 4 + "px";
      // On a narrow chart the card would hide the line: show it under the chart instead
      if (g.W < 420) { card.style.left = "8px"; card.style.top = (g.H + 4) + "px"; stage.style.marginBottom = card.offsetHeight + 12 + "px"; } else stage.style.marginBottom = "";
    }

    function show(i) {
      const next = Math.max(0, Math.min(n - 1, i));
      if (next === state.active) return;
      state.active = next;
      const g = geometry();
      // Only the guide, the dots and the card change, so draw again and put focus back
      const hadFocus = host.contains(document.activeElement);
      draw();
      if (hadFocus) host.querySelector(".chart__stage").focus({ preventScroll: true });
      if (live && state.focused) live.textContent = describe(next);
      void g;
    }
    function hide() {
      if (state.active === -1) return;
      state.active = -1;
      const hadFocus = host.contains(document.activeElement);
      draw();
      if (hadFocus) host.querySelector(".chart__stage").focus({ preventScroll: true });
    }
    function indexAt(e) {
      const svg = host.querySelector(".chart__svg");
      if (!svg) return -1;
      const r = svg.getBoundingClientRect(), g = geometry(), x = e.clientX - r.left;
      if (x < g.L || x > g.W - g.R) return -1;
      return Math.floor((x - g.L) / g.bw);
    }

    host.addEventListener("pointermove", function (e) { const i = indexAt(e); if (i > -1) show(i); else if (!state.focused) hide(); });
    host.addEventListener("pointerdown", function (e) { const i = indexAt(e); if (i > -1) show(i); });
    host.addEventListener("pointerleave", function () { if (!state.focused) hide(); });
    host.addEventListener("focusin", function (e) {
      if (!e.target.classList.contains("chart__stage")) return;
      state.focused = true;
      if (state.active < 0) { const low = lowOf(series[0].weeks); show(low ? low.index : 0); }
      if (live) live.textContent = describe(state.active);
    });
    host.addEventListener("focusout", function (e) {
      if (host.contains(e.relatedTarget)) return;
      state.focused = false; hide();
    });
    host.addEventListener("keydown", function (e) {
      if (!e.target.classList.contains("chart__stage")) return;
      const k = e.key;
      if (k === "ArrowRight") show((state.active < 0 ? -1 : state.active) + 1);
      else if (k === "ArrowLeft") show((state.active < 0 ? n : state.active) - 1);
      else if (k === "Home") show(0);
      else if (k === "End") show(n - 1);
      else if (k === "Escape") { hide(); return; }
      else return;
      e.preventDefault();
    });

    draw();
    if (typeof ResizeObserver === "function") {
      let lastWidth = host.clientWidth;
      observer = new ResizeObserver(function () {
        if (!host.isConnected) { observer.disconnect(); return; }
        if (host.clientWidth !== lastWidth) { lastWidth = host.clientWidth; draw(); }
      });
      observer.observe(host);
    }
    return { destroy: function () { if (observer) observer.disconnect(); } };
  }

  // The call the pages make: MV.chart.forecast(host, seriesList, { nervous, label })
  //   seriesList: [ { id, label, weeks, base, tone } ]  weeks is MV.model.forecast's list. base is the line for "As
  //   Things Are" (drawn in ink); the others take the accent colours in turn unless they name a tone.
  //   The opening balance is worked back from the first week (its balance, less what came in, plus what went out).
  function forecast(host, seriesList, options) {
    const o = options || {};
    const order = ["accent", "info", "success", "warning"];
    let k = 0;
    const series = (seriesList || []).map(function (s) {
      return { id: s.id, label: s.label, weeks: s.weeks, tone: s.tone || (s.base ? "ink" : order[k++ % order.length]) };
    });
    const first = series[0] && series[0].weeks[0];
    const opening = first ? Math.round((first.balance - first.in + first.out) * 100) / 100 : 0;
    return mount(host, { series: series, opening: opening, nervous: o.nervous, label: o.label });
  }

  window.MV.chart = { mount: mount, forecast: forecast };
})();
