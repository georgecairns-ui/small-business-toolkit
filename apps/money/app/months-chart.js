/*
  MONTHS CHART: money in and money out for each month, drawn by hand as SVG
  -------------------------------------------------------------------------
  No library. One call draws it: MV.monthsChart.draw(host, months, opts) and it keeps itself the right size for its box.

  months is the list from MV.model.months (the last 3, this one and the next 6). opts:
    today     "YYYY-MM-DD", where the divider sits inside this month
    label     what the chart is called, for screen readers
    onSelect  function (monthKey), called when a column is clicked (or Enter is pressed on it)

  What it shows: for each month a column of money in, stacked as paid (solid), due and expected (lighter), next to a
  column of money out, with a dot for the difference. Past months are solid and say Actual; later months are paler
  with a dashed edge and say Estimate; a divider marks today and this month is shaded. Moving the mouse over a month
  (or the left and right arrow keys once the chart has focus) opens a small card with all 6 figures. A hidden table
  says the same to screen readers. Every figure is handed in; nothing here works out money.
*/
(function () {
  "use strict";

  window.MV = window.MV || {};
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const M = window.MV.model;
  const KIND_WORDS = { actual: "Actual", now: "This month", estimate: "Estimate" };
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
  function signed(v) { return (v > 0 ? "+" : "") + M.money(v, { round: true }); }

  // Money in as drawn. A past month shows only what was paid, so its column matches its difference; the money that
  // was due and never paid is left out of the column and named in the hover card.
  function inOf(m) { return m.kind === "actual" ? m.paid : m.paid + m.due + m.expected; }

  function draw(host, months, opts) {
    const o = opts || {};
    const uid = "mvm" + (++counter);
    const rows = months || [];
    const n = rows.length;
    const state = { active: -1, focused: false, touchArmed: -1, lastType: "mouse" };
    let observer = null, live = null;

    if (!n) { host.innerHTML = ""; return { destroy: function () {} }; }
    const cur = Math.max(0, rows.findIndex(function (m) { return m.current; }));

    // The numbers the axis has to cover: money in, money out and the difference (which can be below zero)
    const values = [0];
    rows.forEach(function (m) { values.push(inOf(m), m.out, m.net); });
    let min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (max === min) max = min + 1000;
    const ticks = ticksFor(min, max), lo = ticks[0], hi = ticks[ticks.length - 1];

    function geometry() {
      const W = Math.max(280, host.clientWidth || 640), narrow = W < 520, H = narrow ? 260 : 330;
      const g = { W: W, H: H, narrow: narrow, L: narrow ? 38 : 52, R: narrow ? 6 : 14, T: 36, B: narrow ? 40 : 44, gap: narrow ? 1 : 3 };
      g.pw = W - g.L - g.R; g.ph = H - g.T - g.B; g.bw = g.pw / n;
      g.cw = Math.max(3, Math.min(24, (g.bw * 0.8 - g.gap) / 2));
      g.cx = function (i) { return g.L + (i + 0.5) * g.bw; };
      g.y = function (v) { return g.T + (1 - (v - lo) / (hi - lo)) * g.ph; };
      return g;
    }

    function describe(i) {
      const m = rows[i];
      return m.label + ", " + KIND_WORDS[m.kind] + ". Paid " + M.money(m.paid, { round: true }) + ", due " + M.money(m.due, { round: true }) + ", expected " + M.money(m.expected, { round: true }) +
        ", money out " + M.money(m.out, { round: true }) + ", difference " + M.money(m.net, { round: true }) + ".";
    }

    function cardHtml(i) {
      const m = rows[i];
      const line = function (label, value, cls) { return "<div><dt>" + esc(label) + '</dt><dd class="' + (cls || "") + '">' + esc(value) + "</dd></div>"; };
      return '<div class="chart-card__head"><strong>' + esc(m.label) + '</strong><span class="mc-card__kind mc-card__kind--' + esc(m.kind) + '">' + esc(KIND_WORDS[m.kind]) + "</span></div>" +
        '<dl class="mc-card__figs">' +
        line("Invoiced", M.money(m.invoiced, { round: true })) + line("Paid", M.money(m.paid, { round: true })) + line(m.kind === "actual" ? "Was due, unpaid" : "Due", M.money(m.due, { round: true })) +
        line("Expected", M.money(m.expected, { round: true })) + line("Money out", M.money(m.out, { round: true })) +
        line("Difference", signed(m.net), m.net < 0 ? "is-bad" : m.net > 0 ? "is-good" : "") + "</dl>" +
        '<p class="mc-card__hint muted">Select to see the items' + (m.kind === "estimate" ? ". These figures are an estimate." : m.kind === "actual" ? ". Money that was due and unpaid is not in the difference." : "") + "</p>";
    }

    function paint() {
      const g = geometry();
      const every = Math.max(1, Math.ceil(30 / g.bw));
      const base = g.y(0);
      let svg = '<svg class="chart__svg mc__svg" viewBox="0 0 ' + g.W + " " + g.H + '" width="' + g.W + '" height="' + g.H + '" aria-hidden="true" focusable="false">';

      // Grid and the money axis
      ticks.forEach(function (t) {
        const y = g.y(t).toFixed(1);
        svg += '<line class="chart__grid' + (t === 0 ? " chart__grid--zero" : "") + '" x1="' + g.L + '" x2="' + (g.W - g.R) + '" y1="' + y + '" y2="' + y + '"/>' +
          '<text class="chart__tick" x="' + (g.L - 6) + '" y="' + (Number(y) + 4) + '" text-anchor="end">' + esc(axisLabel(t)) + "</text>";
      });

      // This month shaded, and the month under the pointer
      svg += '<rect class="mc__now" x="' + (g.L + cur * g.bw).toFixed(1) + '" y="' + g.T + '" width="' + g.bw.toFixed(1) + '" height="' + g.ph + '" rx="4"/>';
      if (state.active > -1 && state.active !== cur) {
        svg += '<rect class="chart__band" x="' + (g.L + state.active * g.bw).toFixed(1) + '" y="' + g.T + '" width="' + g.bw.toFixed(1) + '" height="' + g.ph + '" rx="4"/>';
      } else if (state.active === cur) {
        svg += '<rect class="mc__now-ring" x="' + (g.L + cur * g.bw).toFixed(1) + '" y="' + g.T + '" width="' + g.bw.toFixed(1) + '" height="' + g.ph + '" rx="4"/>';
      }

      // The columns
      rows.forEach(function (m, i) {
        const cx = g.cx(i), inX = cx - g.gap / 2 - g.cw, outX = cx + g.gap / 2;
        let acc = 0;
        svg += '<g class="mc__month' + (m.kind === "estimate" ? " mc-est" : "") + '">';
        (m.kind === "actual" ? [["paid", m.paid]] : [["paid", m.paid], ["due", m.due], ["expected", m.expected]]).forEach(function (p) {
          if (!(p[1] > 0)) return;
          const top = g.y(acc + p[1]), bottom = g.y(acc);
          svg += '<rect class="mc-col mc-col--' + p[0] + '" x="' + inX.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + g.cw.toFixed(1) + '" height="' + Math.max(0, bottom - top).toFixed(1) + '" rx="1.5"/>';
          acc += p[1];
        });
        if (m.out > 0) {
          svg += '<rect class="mc-col mc-col--out" x="' + outX.toFixed(1) + '" y="' + g.y(m.out).toFixed(1) + '" width="' + g.cw.toFixed(1) + '" height="' + Math.max(0, base - g.y(m.out)).toFixed(1) + '" rx="1.5"/>';
        }
        svg += "</g>";
      });

      // The divider at today, with the Actual and Estimate labels either side
      const cm = rows[cur];
      const span = M.daysBetween(cm.start, cm.end) + 1, frac = Math.max(0, Math.min(1, (M.daysBetween(cm.start, o.today || cm.start) + 0.5) / span));
      const dx = g.L + (cur + frac) * g.bw;
      svg += '<line class="mc__today" x1="' + dx.toFixed(1) + '" x2="' + dx.toFixed(1) + '" y1="' + (g.T - 12) + '" y2="' + (g.H - g.B) + '"/>' +
        '<text class="mc__zone mc__zone--today" x="' + dx.toFixed(1) + '" y="12" text-anchor="middle">Today</text>' +
        '<text class="mc__zone" x="' + (dx - 26).toFixed(1) + '" y="12" text-anchor="end">Actual</text>' +
        '<text class="mc__zone" x="' + (dx + 26).toFixed(1) + '" y="12" text-anchor="start">Estimate</text>';

      // The difference: a dot for each month, green at or above zero and red below it
      rows.forEach(function (m, i) {
        const cx = g.cx(i), y = g.y(m.net).toFixed(1);
        if (!g.narrow) svg += '<line class="mc__tick" x1="' + (cx - g.cw - g.gap / 2).toFixed(1) + '" x2="' + (cx + g.cw + g.gap / 2).toFixed(1) + '" y1="' + y + '" y2="' + y + '"/>';
        svg += '<circle class="mc__dot' + (m.net < 0 ? " mc__dot--bad" : "") + '" cx="' + cx.toFixed(1) + '" cy="' + y + '" r="' + (g.narrow ? 3.5 : 4.5) + '"/>';
      });

      // Month names (the year where it changes), counted out from this month so it is always named
      let lastYear = "";
      rows.forEach(function (m, i) {
        if ((((i - cur) % every) + every) % every !== 0) return;
        const parts = m.label.split(" ");
        svg += '<text class="chart__tick mc__month-name' + (m.current ? " is-now" : "") + '" x="' + g.cx(i).toFixed(1) + '" y="' + (g.H - g.B + 16) + '" text-anchor="middle">' + esc(parts[0]) + "</text>";
        if (parts[1] !== lastYear) {
          svg += '<text class="chart__tick mc__year" x="' + g.cx(i).toFixed(1) + '" y="' + (g.H - g.B + 30) + '" text-anchor="middle">' + esc(parts[1] || "") + "</text>";
          lastYear = parts[1];
        }
      });
      svg += "</svg>";

      const legend = '<ul class="chart__legend mc__legend">' +
        '<li><i class="mc-sw mc-sw--paid"></i>Paid</li><li><i class="mc-sw mc-sw--due"></i>Due</li><li><i class="mc-sw mc-sw--expected"></i>Expected</li>' +
        '<li><i class="mc-sw mc-sw--out"></i>Money out</li><li><i class="mc-sw mc-sw--dot"></i>Difference</li>' +
        '<li><i class="mc-sw mc-sw--est"></i>Estimate (paler, dashed)</li></ul>';
      const table = '<table class="sr-only"><caption>' + esc(o.label || "Money in and out, month by month") + "</caption><thead><tr><th>Month</th><th>Actual or estimate</th><th>Invoiced</th><th>Paid</th><th>Due</th><th>Expected</th><th>Money out</th><th>Difference</th></tr></thead><tbody>" +
        rows.map(function (m) {
          return '<tr><th scope="row">' + esc(m.label) + "</th><td>" + esc(KIND_WORDS[m.kind]) + "</td><td>" + esc(M.money(m.invoiced)) + "</td><td>" + esc(M.money(m.paid)) + "</td><td>" + esc(M.money(m.due)) + "</td><td>" + esc(M.money(m.expected)) +
            "</td><td>" + esc(M.money(m.out)) + "</td><td>" + esc(M.money(m.net)) + "</td></tr>";
        }).join("") + "</tbody></table>";

      host.classList.add("chart", "mc");
      host.innerHTML = '<div class="chart__stage mc__stage" tabindex="0" role="group" aria-label="' + esc((o.label || "Money in and out, month by month") + ". Use the left and right arrow keys to move between months and Enter to open one.") + '">' + svg +
        '<div class="chart-card mc-card" hidden></div></div><div class="chart__live sr-only" aria-live="polite"></div>' + legend + table;
      live = host.querySelector(".chart__live");
      if (state.active > -1) placeCard(g);
    }

    function placeCard(g) {
      const card = host.querySelector(".mc-card"), stage = host.querySelector(".chart__stage");
      if (!card || state.active < 0) return;
      card.innerHTML = cardHtml(state.active);
      card.hidden = false;
      const cw = Math.min(250, g.W - 16), x = g.cx(state.active);
      card.style.width = cw + "px";
      const right = x + g.bw / 2 + 8, left = x - g.bw / 2 - 8 - cw;
      card.style.left = Math.max(8, Math.min(g.W - cw - 8, x < g.W / 2 ? right : left)) + "px";
      card.style.top = g.T + 4 + "px";
      // On a narrow chart the card would cover the columns: show it under the chart instead
      if (g.W < 460) { card.style.left = "8px"; card.style.top = (g.H + 4) + "px"; stage.style.marginBottom = card.offsetHeight + 12 + "px"; } else stage.style.marginBottom = "";
    }

    function refocus(hadFocus) { if (hadFocus) host.querySelector(".chart__stage").focus({ preventScroll: true }); }
    function show(i) {
      const next = Math.max(0, Math.min(n - 1, i));
      if (next === state.active) return;
      state.active = next;
      const hadFocus = host.contains(document.activeElement);
      paint();
      refocus(hadFocus);
      if (live && state.focused) live.textContent = describe(next);
    }
    function hide() {
      if (state.active === -1) return;
      state.active = -1;
      const hadFocus = host.contains(document.activeElement);
      paint();
      refocus(hadFocus);
    }
    function indexAt(e) {
      const svg = host.querySelector(".mc__svg");
      if (!svg) return -1;
      const r = svg.getBoundingClientRect(), g = geometry(), x = e.clientX - r.left;
      if (x < g.L || x > g.W - g.R) return -1;
      return Math.floor((x - g.L) / g.bw);
    }
    function select(i) { if (i > -1 && typeof o.onSelect === "function") o.onSelect(rows[i].month); }

    host.addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; const i = indexAt(e); if (i > -1) show(i); else if (!state.focused) hide(); });
    host.addEventListener("pointerdown", function (e) {
      state.lastType = e.pointerType || "mouse";
      if (state.lastType !== "touch") return;
      // On a touch screen the first tap shows the figures; tapping the same month again opens it
      const i = indexAt(e);
      state.touchArmed = i > -1 && i === state.active ? i : -1;
      if (i > -1) show(i);
    });
    host.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch" && !state.focused) hide(); });
    host.addEventListener("click", function (e) {
      const i = indexAt(e);
      if (i < 0) return;
      if (state.lastType === "touch" && state.touchArmed !== i) return;
      select(i);
    });
    host.addEventListener("focusin", function (e) {
      if (!e.target.classList.contains("chart__stage")) return;
      state.focused = true;
      if (state.active < 0) show(cur);
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
      else if (k === "Enter" || k === " ") select(state.active);
      else if (k === "Escape") { hide(); return; }
      else return;
      e.preventDefault();
    });

    paint();
    if (typeof ResizeObserver === "function") {
      let lastWidth = host.clientWidth;
      observer = new ResizeObserver(function () {
        if (!host.isConnected) { observer.disconnect(); return; }
        if (host.clientWidth !== lastWidth) { lastWidth = host.clientWidth; paint(); }
      });
      observer.observe(host);
    }
    return { destroy: function () { if (observer) observer.disconnect(); } };
  }

  window.MV.monthsChart = { draw: draw };
})();
