/*
  CHARTS: hand-built SVG, no library
  ----------------------------------
  Every function takes the weeks from AD.model.weeks and returns HTML as text. Colours come from the
  theme tokens (theme.css) through inline styles, so light and dark both follow the theme and the same
  charts work on Home, where app.css isn't loaded. Each chart is drawn for the width it is given
  (opts.width) so the writing stays readable on a phone, and each comes with a visually hidden table that
  says the same thing for a screen reader (the drawing itself is hidden from one).

    trend(weeks, target, opts)      spend as bars, cost per result as a line, the target as a dashed line
    sparkline(weeks, target, opts)  just the cost per result line against its target, small
    bars(weeks, opts)               one bar for each week of a figure, such as results (the Health check)

  opts for all: width (pixels, default as noted), word (what a result is called, "enquiry"), plural.
  trend also takes compact: true for a small version with no writing, for a campaign's own 12 weeks.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const M = window.AD.model;

  const MONO = "font-family:var(--font-mono);font-size:11px;";
  const SR_ONLY = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";

  // Rounds a top value up to 1, 2, 5 or 10 of its size, so the 3 lines of the grid read as round numbers
  function niceMax(v) {
    if (!(v > 0)) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v))), f = v / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  }
  function px(n) { return Math.round(n * 10) / 10; }
  function text(x, y, anchor, style, value) {
    return '<text x="' + px(x) + '" y="' + px(y) + '" text-anchor="' + anchor + '" style="' + MONO + style + '">' + esc(value) + "</text>";
  }
  function weekWords(w) {
    return "Week of " + M.shortDate(w.start) + (w.partial ? " (so far)" : "");
  }
  function svg(W, H, inner) {
    return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" style="display:block;max-width:' + W + 'px;height:auto;overflow:visible" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function table(caption, head, rows) {
    return '<div style="' + SR_ONLY + '"><table><caption>' + esc(caption) + "</caption><thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  // Which of the week labels to write, counted back from the last so that one is always there
  function labelStep(band) { return band < 26 ? 3 : band < 46 ? 2 : 1; }
  function costValues(weeks) { return weeks.map(function (w) { return w.costPerResult; }).filter(function (c) { return typeof c === "number"; }); }

  // ---------- Spend bars, cost per result line, target line ----------
  function trend(weeks, target, opts) {
    const o = opts || {}, compact = !!o.compact, W = Math.round(o.width || (compact ? 260 : 680)), word = o.word || "result";
    const H = compact ? 92 : 236, pad = compact ? { l: 4, r: 4, t: 8, b: 4 } : { l: 50, r: 50, t: 18, b: 30 };
    const n = weeks.length, plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b, band = plotW / n, bw = Math.max(3, band * (compact ? 0.66 : 0.6));
    const costs = costValues(weeks), hasCost = costs.length > 0, goal = target > 0 ? target : null;
    const maxSpend = niceMax(Math.max.apply(null, weeks.map(function (w) { return w.spend; }).concat([0])));
    const maxCost = niceMax(Math.max.apply(null, costs.concat([goal || 0])));
    const ySpend = function (v) { return pad.t + plotH - v / maxSpend * plotH; };
    const yCost = function (v) { return pad.t + plotH - v / maxCost * plotH; };
    const cx = function (i) { return pad.l + band * i + band / 2; };
    let g = "";

    // The grid: 3 lines, with the spend scale on the left and the cost per result scale on the right
    [0, 0.5, 1].forEach(function (f) {
      const y = pad.t + plotH - f * plotH;
      g += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + px(y) + '" y2="' + px(y) + '" style="stroke:var(--color-line);stroke-width:1"/>';
      if (!compact) {
        g += text(pad.l - 8, y + 4, "end", "fill:var(--color-muted)", M.money(maxSpend * f));
        if (hasCost) g += text(W - pad.r + 8, y + 4, "start", "fill:var(--color-ink-soft)", M.money(maxCost * f));
      }
    });

    // Spend bars. The week still going has a dashed edge.
    weeks.forEach(function (w, i) {
      const top = w.spend > 0 ? Math.min(ySpend(w.spend), pad.t + plotH - 1.5) : pad.t + plotH;
      const tip = weekWords(w) + ": " + M.money(w.spend) + " spent, " + M.num(w.results) + " " + (w.results === 1 ? word : o.plural || word + "s") + (w.costPerResult === null ? "" : ", " + M.money(w.costPerResult) + " each");
      g += "<g><title>" + esc(tip) + "</title>" +
        '<rect x="' + px(pad.l + band * i) + '" y="' + pad.t + '" width="' + px(band) + '" height="' + px(plotH) + '" style="fill:transparent"/>' +
        (w.spend > 0 ? '<rect x="' + px(cx(i) - bw / 2) + '" y="' + px(top) + '" width="' + px(bw) + '" height="' + px(pad.t + plotH - top) + '" rx="3" style="fill:var(--color-accent-line);stroke:var(--color-accent);stroke-width:1' + (w.partial ? ";stroke-dasharray:3 2" : "") + '"/>' : "") + "</g>";
    });

    // The target, a dashed line on the cost per result scale
    if (hasCost || goal) {
      if (goal) {
        const y = yCost(goal);
        g += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + px(y) + '" y2="' + px(y) + '" style="stroke:var(--color-success);stroke-width:1.75;stroke-dasharray:6 4"/>';
        if (!compact) g += text(W - pad.r - 4, y - 6, "end", "fill:var(--color-success);font-weight:600;paint-order:stroke;stroke:var(--color-surface);stroke-width:3px", "Target " + M.money(goal));
      }
    }

    // The cost per result line. A week with no results leaves a gap rather than a line down to nothing.
    if (hasCost) {
      let run = [], d = "", dots = "";
      const flush = function () { if (run.length > 1) d += "M" + run.join("L"); run = []; };
      weeks.forEach(function (w, i) {
        if (typeof w.costPerResult !== "number") { flush(); return; }
        run.push(px(cx(i)) + " " + px(yCost(w.costPerResult)));
        dots += '<circle cx="' + px(cx(i)) + '" cy="' + px(yCost(w.costPerResult)) + '" r="' + (compact ? 2.5 : 3.25) + '" style="fill:var(--color-surface);stroke:var(--color-ink);stroke-width:1.75"/>';
      });
      flush();
      g += (d ? '<path d="' + d + '" style="fill:none;stroke:var(--color-ink);stroke-width:' + (compact ? 1.75 : 2) + ';stroke-linejoin:round;stroke-linecap:round"/>' : "") + dots;
    }

    // Week labels along the bottom
    if (!compact) {
      const step = labelStep(band);
      weeks.forEach(function (w, i) {
        if ((n - 1 - i) % step === 0) g += text(cx(i), H - pad.b + 18, "middle", "fill:var(--color-muted)", M.shortDate(w.start));
      });
    }

    const rows = weeks.map(function (w) { return [M.shortDate(w.start) + (w.partial ? " (so far)" : ""), M.money(w.spend), String(Math.round(w.results)), w.costPerResult === null ? "none" : M.money(w.costPerResult)]; });
    return '<figure class="chart chart--trend" style="margin:0">' + svg(W, H, g) +
      table("Spend, " + (o.plural || word + "s") + " and cost per " + word + " for each of the last " + n + " weeks" + (goal ? ". Your target is " + M.money(goal) + " per " + word : ""), ["Week starting", "Spend", (o.plural || word + "s"), "Cost per " + word], rows) + "</figure>";
  }

  // ---------- A small line for the Home box ----------
  function sparkline(weeks, target, opts) {
    const o = opts || {}, W = Math.round(o.width || 160), H = Math.round(o.height || 44), word = o.word || "result", goal = target > 0 ? target : null;
    const points = weeks.map(function (w, i) { return { i: i, v: w.costPerResult }; }).filter(function (p) { return typeof p.v === "number"; });
    if (points.length < 2) return "";
    const pad = 4, top = Math.max(points.reduce(function (m, p) { return Math.max(m, p.v); }, 0), goal || 0) * 1.15 || 1;
    const x = function (i) { return pad + (W - 2 * pad) * i / Math.max(1, weeks.length - 1); };
    const y = function (v) { return H - pad - (H - 2 * pad) * v / top; };
    let g = "";
    if (goal) g += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + px(y(goal)) + '" y2="' + px(y(goal)) + '" style="stroke:var(--color-success);stroke-width:1.5;stroke-dasharray:4 3"/>';
    let d = "", run = [];
    weeks.forEach(function (w, i) {
      if (typeof w.costPerResult !== "number") { if (run.length > 1) d += "M" + run.join("L"); run = []; return; }
      run.push(px(x(i)) + " " + px(y(w.costPerResult)));
    });
    if (run.length > 1) d += "M" + run.join("L");
    const last = points[points.length - 1];
    g += (d ? '<path d="' + d + '" style="fill:none;stroke:var(--color-ink);stroke-width:1.75;stroke-linejoin:round;stroke-linecap:round"/>' : "") +
      '<circle cx="' + px(x(last.i)) + '" cy="' + px(y(last.v)) + '" r="3" style="fill:var(--color-ink)"/>';
    const label = "Cost per " + word + " over the last " + weeks.length + " weeks, " + M.money(last.v) + " in the latest week with results" + (goal ? ", against a target of " + M.money(goal) : "");
    return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" style="display:block;max-width:' + W + 'px;height:auto;overflow:visible" role="img" aria-label="' + esc(label) + '">' + g + "</svg>";
  }

  // ---------- One bar a week ----------
  // opts.field is the figure to draw ("results" by default), opts.label what it is called in the writing ("Results").
  function bars(weeks, opts) {
    const o = opts || {}, field = o.field || "results", name = o.label || "Results", W = Math.round(o.width || 560), H = 190;
    const pad = { l: 8, r: 8, t: 22, b: 28 }, n = weeks.length, plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b, band = plotW / n, bw = Math.max(6, band * 0.56);
    const values = weeks.map(function (w) { return w[field] || 0; }), max = niceMax(Math.max.apply(null, values.concat([0])));
    const fmt = function (v) { return field === "spend" ? M.money(v) : M.num(v); };
    let g = '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + (pad.t + plotH) + '" y2="' + (pad.t + plotH) + '" style="stroke:var(--color-line-strong);stroke-width:1"/>';
    weeks.forEach(function (w, i) {
      const v = values[i], h = v > 0 ? Math.max(2, v / max * plotH) : 0, x = pad.l + band * i + (band - bw) / 2, y = pad.t + plotH - h;
      g += "<g><title>" + esc(weekWords(w) + ": " + fmt(v) + " " + name.toLowerCase()) + "</title>" +
        '<rect x="' + px(pad.l + band * i) + '" y="' + pad.t + '" width="' + px(band) + '" height="' + px(plotH) + '" style="fill:transparent"/>' +
        (h ? '<rect x="' + px(x) + '" y="' + px(y) + '" width="' + px(bw) + '" height="' + px(h) + '" rx="3" style="fill:var(--color-accent-line);stroke:var(--color-accent);stroke-width:1' + (w.partial ? ";stroke-dasharray:3 2" : "") + '"/>' : "") +
        text(x + bw / 2, (h ? y : pad.t + plotH) - 6, "middle", "fill:var(--color-ink-soft)", fmt(v)) + "</g>";
      g += text(pad.l + band * i + band / 2, H - pad.b + 18, "middle", "fill:" + (w.partial ? "var(--color-accent-text);font-weight:600" : "var(--color-muted)"), M.shortDate(w.start));
    });
    const rows = weeks.map(function (w, i) { return [M.shortDate(w.start) + (w.partial ? " (so far)" : ""), fmt(values[i])]; });
    return '<figure class="chart chart--bars" style="margin:0">' + svg(W, H, g) + table(name + " for each of the last " + n + " weeks", ["Week starting", name], rows) + "</figure>";
  }

  window.AD.charts = { trend: trend, sparkline: sparkline, bars: bars, niceMax: niceMax };
})();
