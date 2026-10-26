/*
  BUILD AND CUSTOMISE: jobs to hand Claude, its ideas and what it has built
  -------------------------------------------------------------------------
  1. Action cards. Each opens a small pop-up (<dialog id="buildDialog">) with an optional "Describe it in a
     sentence" box, then Open in Claude or Copy the prompt. "Ask Claude what to do next" has no box.
  2. Ideas from Claude: the ideas with status "new". Do it opens Claude with the idea's own prompt; Not now
     sets its status to "dismissed" (the only change this app makes to the file), with Undo.
     Find ideas, beside the heading, asks the helper to run the "find-ideas" job (claude-jobs.json). If the
     helper can't start Claude, the page says so and offers the same job through Open in Claude.
  3. What Claude has built for you: data.builds, newest first.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TK.model, C = window.TK.components;

  const CARDS = [
    { id: "page", title: "Build me a new page", sub: "A new screen in this app for something you track.", icon: "layout", job: "Build me a new page in this app for something I track" },
    { id: "skill", title: "Add a skill for a job I repeat", sub: "Claude learns the job once, then does it your way every time.", icon: "zap", job: "Add a skill for a job I repeat" },
    { id: "change", title: "Change how something works", sub: "A page, a button or a routine that doesn't suit you.", icon: "settings", job: "Change how something in my toolkit works" },
    { id: "look", title: "Change the look", sub: "Your brand's colours, so the toolkit feels like yours.", icon: "sun", job: "Change the look of my toolkit to match my brand" },
    { id: "routine", title: "Automate a routine", sub: "Something Claude checks for you on a schedule.", icon: "clock", job: "Automate a routine: something Claude checks for me on a schedule" },
    { id: "team", title: "Add my team", sub: "Who does what, so tasks and drafts go to the right person.", icon: "users", job: "Add my team: who does what, so tasks and drafts go to the right person" },
    { id: "next", title: "Ask Claude what to do next", sub: "The 3 things that would save you the most time.", icon: "sparkle" }
  ];

  function cardPrompt(card, sentence) { return card.id === "next" ? M.prompt.whatsNext() : M.prompt.build(card.job, sentence); }

  // ---------- The pop-up ----------
  function dialog() { return document.getElementById("buildDialog"); }
  function openDialog(card) {
    const dlg = dialog();
    const box = card.id !== "next";
    dlg.innerHTML = '<div class="modal__head"><h2 id="buildTitle">' + esc(card.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body"><p class="muted">' + esc(card.sub) + "</p>" +
      (box ? '<label class="field"><span class="field__label">Describe it in a sentence</span><textarea class="input textarea" id="buildSentence" rows="3" placeholder="Optional. Claude asks you anything it needs."></textarea></label>' : "") +
      C.claudeNote() + "</div>" +
      '<div class="modal__foot" id="buildFoot">' + C.claudeActions(cardPrompt(card, "")) + "</div>";
    const text = dlg.querySelector("#buildSentence");
    if (text) text.addEventListener("input", function () { dlg.querySelector("#buildFoot").innerHTML = C.claudeActions(cardPrompt(card, text.value)); });
    dlg.showModal();
    (text || dlg.querySelector("#buildFoot .btn")).focus();
  }

  // ---------- The page ----------
  function cardsHtml() {
    return '<div class="tk-build">' + CARDS.map(function (c) {
      return '<button type="button" class="tk-action" data-build="' + c.id + '"><span class="tk-action__icon">' + icon(c.icon) + "</span>" +
        '<span class="tk-action__text"><span class="tk-action__title">' + esc(c.title) + '</span><span class="tk-action__sub">' + esc(c.sub) + "</span></span></button>";
    }).join("") + "</div>";
  }

  function ideasHtml(ctx) {
    const ideas = M.newIdeas(ctx.data), busy = ctx.busy("find-ideas");
    const head = '<div class="tk-section__head"><h3>Ideas from Claude</h3><button type="button" class="btn btn--sm' + (busy ? " is-busy" : "") + '" data-action="find-ideas"' + (busy ? " disabled" : "") + ">" +
      icon(busy ? "loader" : "sparkle") + (busy ? "Looking for ideas" : "Find ideas") + "</button></div>";
    const off = ctx.jobsOff ? '<div class="tk-off">' + icon("info") + "<div><p>Claude can't be started from this page on this computer. Open Claude with the job typed in instead.</p>" +
      C.claudeActions(M.prompt.findIdeas(), { small: true }) + "</div></div>" : "";
    const list = ideas.length ? '<ul class="tk-list" role="list">' + ideas.map(function (i) {
      return '<li class="tk-item"><div class="tk-item__main"><span class="tk-item__title">' + esc(i.title || "An idea from Claude") + "</span>" +
        (i.why ? '<span class="tk-item__sub">' + esc(i.why) + "</span>" : "") + "</div>" +
        '<div class="tk-item__actions">' + C.claudeActions(i.prompt || M.prompt.whatsNext(), { label: "Do it", small: true }) +
        '<button type="button" class="btn btn--sm btn--ghost" data-dismiss-idea="' + esc(i.id) + '">Not now</button></div></li>';
    }).join("") + "</ul>" : '<p class="muted tk-empty">No new ideas right now. Claude adds them here as it spots them, or press Find ideas.</p>';
    return '<section class="panel tk-section" aria-label="Ideas from Claude">' + head + off + list + "</section>";
  }

  function buildsHtml(ctx) {
    const list = M.builds(ctx.data);
    return '<section class="panel tk-section" aria-label="What Claude has built for you"><div class="tk-section__head"><h3>What Claude has built for you</h3></div>' +
      (list.length ? '<ul class="tk-list" role="list">' + list.map(function (b) {
        return '<li class="tk-item"><div class="tk-item__main"><span class="tk-item__title">' + esc(b.title || "Something new") + "</span>" +
          (b.what ? '<span class="tk-item__sub">' + esc(b.what) + "</span>" : "") + "</div>" +
          (b.date ? '<span class="tk-item__meta">' + esc(C.shortDate(b.date)) + "</span>" : "") + "</li>";
      }).join("") + "</ul>" : '<p class="muted tk-empty">Nothing yet. Pages, skills and routines Claude builds for you are listed here.</p>') + "</section>";
  }

  function dismiss(ctx, id) {
    ctx.update(function (d) {
      const idea = d.ideas.find(function (i) { return i.id === id; });
      if (!idea) throw new Error("That idea isn't in your list any more");
      idea.status = "dismissed";
    }).then(function () {
      ctx.toast("Idea put away", function () {
        ctx.update(function (d) {
          const idea = d.ideas.find(function (i) { return i.id === id; });
          if (idea && idea.status === "dismissed") idea.status = "new";
        }).catch(C.failed);
      });
    }).catch(C.failed);
  }

  function render(root, ctx) {
    root.innerHTML = '<div class="page">' +
      C.pageHead("Build and customise", "Tell Claude what you'd like and it builds it into your toolkit. Nothing changes until you've seen it.", "") +
      cardsHtml() + ideasHtml(ctx) + buildsHtml(ctx) + "</div>";
    root.onclick = function (e) {
      const b = e.target.closest("[data-build]");
      if (b) { openDialog(CARDS.find(function (c) { return c.id === b.getAttribute("data-build"); })); return; }
      const n = e.target.closest("[data-dismiss-idea]");
      if (n) dismiss(ctx, n.getAttribute("data-dismiss-idea"));
    };
  }

  window.TK.views.build = { render: render };
})();
