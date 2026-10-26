/*
  IDEAS: the bank of things worth posting about
  ---------------------------------------------
  Ideas come from Research, brain dumps, wins in other tools and the owner. "Plan it" turns one
  into a post on a day. "Drop" hides it (nothing is ever deleted, and Undo brings it back).
*/
(function () {
  "use strict";

  window.CM = window.CM || {};
  CM.views = CM.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;

  const SOURCE_LABELS = {
    research: "Research", "brain-dump": "Brain dump", you: "You", pipeline: "Pipeline OS",
    "case-study": "Case study", claude: "Claude"
  };

  // What the person has chosen on this page. Kept between redraws.
  const state = { source: "", theme: "", planning: null, planDate: "" };
  // What is typed in the Add an idea form but not added yet. Kept between redraws.
  const draft = { title: "", notes: "", theme: "" };

  function sourceLabel(key) { return SOURCE_LABELS[key] || key; }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + ">" + esc(label) + "</option>";
  }

  function addForm(data) {
    const themes = ['<option value="">No theme</option>'].concat(data.settings.themes.map(function (t) { return option(t, t, draft.theme); })).join("");
    return '<form class="card ideas-add" data-form="add" autocomplete="off"><h2 class="ideas-add__title">Add an idea</h2>' +
      '<label class="field"><span class="field__label">What is it?</span><input class="input" name="title" maxlength="140" value="' + esc(draft.title) + '" placeholder="Why we switched to lime plaster"></label>' +
      '<label class="field"><span class="field__label">Anything Claude should know (optional)</span><textarea class="textarea" name="notes" rows="2" maxlength="1000">' + esc(draft.notes) + '</textarea></label>' +
      '<div class="ideas-add__foot"><label class="field ideas-add__theme"><span class="field__label">Theme</span><select class="select" name="theme">' + themes + '</select></label>' +
      '<button type="submit" class="btn btn--primary">' + icon("plus") + "Add idea</button></div></form>";
  }

  function filters(ideas, themes) {
    const sources = Object.keys(ideas.reduce(function (acc, i) { acc[i.source] = true; return acc; }, {}));
    return '<div class="ideas-filters"><label class="field"><span class="field__label">Where from</span><select class="select" data-filter="source">' +
      option("", "Everywhere", state.source) + sources.map(function (s) { return option(s, sourceLabel(s), state.source); }).join("") + "</select></label>" +
      '<label class="field"><span class="field__label">Theme</span><select class="select" data-filter="theme">' +
      option("", "Every theme", state.theme) + themes.map(function (t) { return option(t, t, state.theme); }).join("") + "</select></label></div>";
  }

  function planPanel(idea) {
    return '<div class="ideas-plan"><label class="field"><span class="field__label">Which day?</span><input class="input" type="date" data-plan-date value="' + esc(state.planDate) + '"></label>' +
      '<div class="ideas-plan__buttons"><button type="button" class="btn btn--sm btn--primary" data-action="plan-confirm" data-idea="' + esc(idea.id) + '">Plan it</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-action="plan-cancel">Cancel</button></div></div>';
  }

  function card(idea) {
    const id = esc(idea.id);
    return '<article class="card ideas-card"><h3 class="ideas-card__title">' + esc(idea.title) + "</h3>" +
      (idea.notes ? '<p class="ideas-card__notes">' + esc(idea.notes) + "</p>" : "") +
      '<div class="ideas-card__tags"><span class="chip ideas-tag">' + esc(sourceLabel(idea.source)) + "</span>" + (idea.theme ? '<span class="chip chip--accent">' + esc(idea.theme) + "</span>" : "") + "</div>" +
      (state.planning === idea.id ? planPanel(idea) :
        '<div class="ideas-card__actions"><button type="button" class="btn btn--sm btn--primary" data-action="plan" data-idea="' + id + '">' + icon("calendar") + "Plan it</button>" +
        '<button type="button" class="btn btn--sm btn--ghost" data-action="drop" data-idea="' + id + '">Drop</button></div>') + "</article>";
  }

  function newIdea(fields) {
    return Object.assign({ id: ui.makeId("i"), source: "you", createdAt: new Date().toISOString(), status: "new", postId: null }, fields);
  }

  function setStatus(ctx, ideaId, status, text) {
    ctx.update(function (d) { d.ideas.find(function (i) { return i.id === ideaId; }).status = status; }, text);
  }

  function plan(ctx, ideaId, dateIso) {
    const C = window.CM.components;
    state.planning = null;
    C.planIdea(ctx, ideaId, dateIso).then(function (postId) { ctx.openPost(postId); }).catch(function (err) { C.reportFailure(ctx, err); });
  }

  function drop(ctx, ideaId) {
    const idea = ctx.data.ideas.find(function (i) { return i.id === ideaId; });
    setStatus(ctx, ideaId, "dropped", "Dropped the idea: " + idea.title);
    ctx.toast("Idea dropped", function () { setStatus(ctx, ideaId, "new", "Brought back the idea: " + idea.title); });
  }

  function onClick(ctx, rootEl) {
    return function (e) {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const ideaId = el.getAttribute("data-idea");
      switch (el.getAttribute("data-action")) {
        case "plan":
          state.planning = ideaId;
          state.planDate = ui.isoDate(ui.addDays(ui.parseDate(ctx.today()), 1));
          CM.views.ideas.render(rootEl, ctx);
          break;
        case "plan-cancel":
          state.planning = null;
          CM.views.ideas.render(rootEl, ctx);
          break;
        case "plan-confirm": {
          const date = el.closest(".ideas-plan").querySelector("[data-plan-date]").value;
          if (!date) { ctx.toast("Pick a day first"); return; }
          plan(ctx, ideaId, date);
          break;
        }
        case "drop":
          drop(ctx, ideaId);
          break;
      }
    };
  }

  function onChange(ctx, rootEl) {
    return function (e) {
      const f = e.target.getAttribute("data-filter");
      if (f) {
        state[f] = e.target.value;
        CM.views.ideas.render(rootEl, ctx);
      } else if (e.target.hasAttribute("data-plan-date")) {
        state.planDate = e.target.value;
      }
    };
  }

  // Keeps what is typed in the Add an idea form
  function onInput(e) {
    if (e.target.form && e.target.form.getAttribute("data-form") === "add") draft[e.target.name] = e.target.value;
  }

  function onSubmit(ctx, rootEl) {
    return function (e) {
      e.preventDefault();
      const form = e.target;
      const title = form.elements.title.value.trim();
      if (!title) { ctx.toast("Give the idea a short title"); return; }
      const idea = newIdea({ title: title, notes: form.elements.notes.value.trim(), theme: form.elements.theme.value });
      const typed = Object.assign({}, draft);
      draft.title = draft.notes = draft.theme = "";
      ctx.update(function (d) { d.ideas.unshift(idea); }, "Added an idea: " + title).catch(function (err) {
        // The save failed: give the person their words back
        Object.assign(draft, typed);
        CM.views.ideas.render(rootEl, ctx);
        throw err;
      });
    };
  }

  CM.views.ideas = {
    title: "Ideas",
    line: function (ctx) {
      const n = ctx.data.ideas.filter(function (i) { return i.status === "new"; }).length;
      return n ? n + (n === 1 ? " idea" : " ideas") + " waiting to be planned" : "Nothing waiting to be planned";
    },
    render: function (root, ctx) {
      const C = window.CM.components;
      const open = ctx.data.ideas.filter(function (i) { return i.status === "new"; });
      const shown = open.filter(function (i) { return (!state.source || i.source === state.source) && (!state.theme || i.theme === state.theme); });
      let list;
      if (!open.length) list = C.emptyState("No ideas yet", "Claude adds ideas from your research, brain dumps and wins in your other tools. Add your own above, or press Brain dump and say what you would like to post about.");
      else if (!shown.length) list = C.emptyState("No ideas match", "Change the filters to see the rest.");
      else list = '<div class="ideas-grid">' + shown.map(card).join("") + "</div>";
      root.innerHTML = '<div class="ideas-page">' + addForm(ctx.data) + (open.length ? filters(open, ctx.data.settings.themes) : "") + list + "</div>";
      root.onclick = onClick(ctx, root);
      root.onchange = onChange(ctx, root);
      root.oninput = onInput;
      root.onsubmit = onSubmit(ctx, root);
    }
  };
})();
