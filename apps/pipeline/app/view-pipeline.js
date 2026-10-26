/*
  PIPELINE: every deal by stage
  -----------------------------
  A board (one column per stage, with what each column is worth) or a list. Drag a card to move
  a deal. The numbers along the top (in the pipeline, won this month, win rate) are worked out
  from the deals themselves, never typed in.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c;

  function stats(d) {
    const n = M.numbers(d);
    return '<div class="stat-strip pstats">' +
      '<div class="stat"><span class="stat__value num">' + esc(M.money(d, n.pipeline)) + '</span><span class="stat__label">in your pipeline, ' + n.open + (n.open === 1 ? " deal" : " deals") + "</span></div>" +
      '<div class="stat"><span class="stat__value num">' + esc(M.money(d, n.wonMonthValue)) + '</span><span class="stat__label">won this month' + (n.wonMonthCount ? ", " + n.wonMonthCount + (n.wonMonthCount === 1 ? " deal" : " deals") : "") + "</span></div>" +
      '<div class="stat"><span class="stat__value num">' + (n.winRate == null ? "None yet" : n.winRate + "%") + '</span><span class="stat__label">win rate, last 90 days' + (n.closedRecently ? " (" + n.closedRecently + " closed)" : "") + "</span></div>" +
      "</div>";
  }

  function toolbar(ctx) {
    const v = ctx.state.pipeView;
    const seg = function (key, label, ic) { return '<button type="button" data-action="pipe-view" data-value="' + key + '" aria-pressed="' + (v === key) + '">' + icon(ic) + label + "</button>"; };
    return '<div class="toolbar pipe-bar"><div class="segmented" role="group" aria-label="Show deals as">' + seg("board", "Board", "columns") + seg("list", "List", "list") + "</div>" +
      "</div>";
  }

  function setupNote(ctx) {
    const d = ctx.d;
    if (M.notSetUp(d) || d.settings.salesSetUp) return "";
    return '<div class="banner banner--setup">' + icon("info") + "<span><strong>Tell Claude what you sell.</strong> Claude needs to know your services, who you sell to and the problems you solve before it can spot sales calls and check deals properly.</span>" + C.say("Set up my pipeline") + "</div>";
  }

  function board(ctx) {
    const d = ctx.d;
    const col = function (s) {
      const deals = M.dealsInStage(d, s.key).sort(function (a, b) { return (Number(b.value) || 0) - (Number(a.value) || 0); });
      const closed = s.key === "won" || s.key === "lost";
      // Won and lost show the last 90 days, so the board doesn't fill up with old deals
      const shown = closed ? deals.filter(function (x) { return !x.closedAt || M.daysSince(x.closedAt) <= 90; }) : deals;
      const value = shown.reduce(function (sum, x) { return sum + (Number(x.value) || 0); }, 0);
      return '<section class="pcol pcol--' + esc(s.key) + (closed ? " pcol--closed" : "") + '" data-stage="' + esc(s.key) + '" aria-label="' + esc(s.label) + '">' +
        '<header class="pcol__head"><span class="pcol__name">' + esc(s.label) + '</span><span class="pcol__count">' + shown.length + "</span></header>" +
        '<div class="pcol__value num">' + esc(M.money(d, value)) + (closed ? '<span class="pcol__hint">last 90 days</span>' : "") + "</div>" +
        '<div class="pcol__cards">' + (shown.length ? shown.map(function (x) { return C.dealCard(d, x, { anim: ctx.anim, draggable: true }); }).join("") :
          '<p class="pcol__empty">' + (closed ? "None yet" : "Drop a deal here") + "</p>") + "</div></section>";
    };
    // The columns are laid out in app.css (all on one row when there's room, wrapping on smaller screens)
    return '<div class="pboard" style="--open:' + M.openStages().length + '">' + M.STAGES.map(col).join("") + "</div>";
  }

  function list(ctx) {
    const d = ctx.d;
    const deals = d.deals.filter(function (x) { return !x.suggested && (M.isOpen(x) || M.daysSince(x.closedAt) <= 90); })
      .sort(function (a, b) { return M.STAGES.indexOf(M.STAGE[a.stage]) - M.STAGES.indexOf(M.STAGE[b.stage]) || (Number(b.value) || 0) - (Number(a.value) || 0); });
    if (!deals.length) return "";
    return '<div class="panel panel--flush"><div class="table ptable" role="table">' +
      '<div class="table__row table__row--head" role="row"><span role="columnheader">Deal</span><span role="columnheader">Stage</span><span role="columnheader">Value</span><span role="columnheader">Deal check</span><span role="columnheader">Next step</span><span role="columnheader">Last contact</span></div>' +
      deals.map(function (x) {
        const next = x.nextSteps.find(function (s) { return !s.done; });
        return '<button type="button" class="table__row' + ctx.anim("row-" + x.id) + '" role="row" data-deal="' + esc(x.id) + '" data-action="open-deal">' +
          '<span class="table__name" role="cell"><span><strong>' + esc(x.title) + '</strong><span class="muted">' + esc(x.organisation || "") + "</span></span></span>" +
          '<span role="cell"><span class="chip">' + esc(M.stageLabel(x.stage)) + "</span></span>" +
          '<span role="cell" class="num">' + esc(M.money(d, x.value)) + "</span>" +
          '<span role="cell">' + C.checkMeter(x, { quiet: !M.isOpen(x) }) + "</span>" +
          '<span role="cell" class="muted">' + esc(next ? next.text : "") + "</span>" +
          '<span role="cell" class="muted">' + esc(C.ago(x.lastContact)) + "</span></button>";
      }).join("") + "</div></div>";
  }

  function render(ctx) {
    const d = ctx.d;
    const hasDeals = d.deals.some(function (x) { return !x.suggested; });
    let body;
    // Fresh install, before /setup: the setup card above an empty board
    if (M.notSetUp(d)) return '<div class="page page--wide pipe-page">' + C.setupCard() + toolbar(ctx) + board(ctx) + "</div>";
    if (!hasDeals) {
      body = C.empty("welcome", "No deals yet.", "Claude builds your pipeline from your email, calendar and calls. Or add a deal yourself, or paste the notes from a sales call and Claude fills the deal in.",
        '<div class="empty__actions">' + C.say("Update my pipeline") + '<button type="button" class="btn btn--primary" data-action="add-deal">' + icon("plus") + "New deal</button></div>");
    } else body = (ctx.state.pipeView === "list" ? list(ctx) : board(ctx));
    return '<div class="page page--wide pipe-page">' + setupNote(ctx) + (hasDeals ? stats(d) : "") + toolbar(ctx) + body + "</div>";
  }

  // Drag a card to another stage
  function bind(root, ctx) {
    let dragId = null;
    root.querySelectorAll(".dcard[draggable]").forEach(function (card) {
      card.addEventListener("dragstart", function (e) {
        dragId = card.getAttribute("data-deal");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", dragId); } catch (err) { /* older browsers */ }
        card.classList.add("is-dragging");
        document.body.classList.add("is-drag-active");
      });
      card.addEventListener("dragend", function () {
        card.classList.remove("is-dragging");
        document.body.classList.remove("is-drag-active");
        root.querySelectorAll(".pcol.is-over").forEach(function (c) { c.classList.remove("is-over"); });
      });
    });
    root.querySelectorAll(".pcol").forEach(function (col) {
      col.addEventListener("dragover", function (e) { if (dragId) { e.preventDefault(); col.classList.add("is-over"); } });
      col.addEventListener("dragleave", function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("is-over"); });
      col.addEventListener("drop", function (e) {
        e.preventDefault();
        col.classList.remove("is-over");
        if (dragId) ctx.actions.setStage(dragId, col.getAttribute("data-stage"));
        dragId = null;
      });
    });
  }

  window.PL.views = window.PL.views || {};
  window.PL.views.pipeline = {
    title: function () { return "Pipeline"; },
    sub: function (ctx) { const n = M.openDeals(ctx.d).length; return n ? n + (n === 1 ? " open deal" : " open deals") : "Every deal, by stage"; },
    render: render,
    bind: bind
  };
})();
