/*
  RESEARCH: what customers search for, what is in season, and what works for competitors
  ---------------------------------------------------------------------------------------
  Claude fills this from public pages during setup and again when the owner presses Refresh research.
  Every search can become an idea in one click.
*/
(function () {
  "use strict";

  window.CM = window.CM || {};
  CM.views = CM.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;

  const DEMAND = { high: { label: "High demand", cls: "chip--success" }, medium: { label: "Some demand", cls: "chip--info" }, low: { label: "Low demand", cls: "" } };

  function link(url, text) {
    return /^https?:\/\//i.test(url) ? '<a class="research-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text) + icon("external") + "</a>" : "";
  }

  function tags(keys) {
    const C = window.CM.components;
    return keys.length ? '<span class="research-tags">' + keys.map(function (k) { return C.platformTag(k); }).join("") + "</span>" : "";
  }

  function searchRow(s, data) {
    const d = DEMAND[s.demand];
    const made = window.CM.model.hasResearchIdea(data, s);
    return '<li class="research-row"><div class="research-row__main"><div class="research-row__head"><strong class="research-row__title">' + esc(s.phrase) + "</strong>" +
      '<span class="chip ' + d.cls + '">' + d.label + "</span>" + (s.season ? '<span class="chip">' + esc(s.season) + "</span>" : "") + "</div>" +
      '<p class="research-row__why">' + esc(s.why) + (s.source ? ' <span class="research-row__source">Seen in: ' + esc(s.source) + ".</span>" : "") + "</p></div>" +
      (made ? '<span class="research-row__done">' + icon("check") + "In your ideas</span>" :
        '<button type="button" class="btn btn--sm" data-action="make-idea" data-search="' + esc(s.id) + '">' + icon("sparkle") + "Make it an idea</button>") + "</li>";
  }

  function trendRow(t) {
    return '<li class="research-row"><div class="research-row__main"><div class="research-row__head"><strong class="research-row__title">' + esc(t.title) + "</strong>" +
      (t.until ? '<span class="chip">Until ' + esc(ui.parseDate(t.until).toLocaleDateString("en-GB", { day: "numeric", month: "short" })) + "</span>" : "") + tags(t.platforms) + "</div>" +
      '<p class="research-row__why">' + esc(t.why) + "</p></div></li>";
  }

  function competitorCard(c) {
    const M = window.CM.model;
    const examples = c.examples.map(function (x) {
      return "<li><strong>" + esc(M.platform(x.platform).label) + ":</strong> " + esc(x.what) + (x.why ? ' <span class="muted">' + esc(x.why) + "</span>" : "") + "</li>";
    }).join("");
    return '<article class="card research-comp"><div class="research-comp__head"><h3 class="research-comp__name">' + esc(c.name) + "</h3>" + link(c.url, "Visit") + "</div>" +
      tags(c.platforms) + (c.whatWorks ? '<p class="research-comp__works">' + esc(c.whatWorks) + "</p>" : "") +
      (examples ? '<ul class="research-comp__examples">' + examples + "</ul>" : "") + "</article>";
  }

  function whatWorksCards(data, M) {
    return M.PLATFORMS.filter(function (p) { return data.platforms[p.key] && data.platforms[p.key].on && data.research.whatWorks[p.key]; }).map(function (p) {
      return '<article class="card research-works"><h3 class="research-works__title">' + window.CM.components.platformTag(p.key) + esc(p.label) + "</h3><p>" + esc(data.research.whatWorks[p.key]) + "</p></article>";
    }).join("");
  }

  function section(title, intro, body) {
    return '<section class="research-section"><h2 class="research-section__title">' + title + '</h2><p class="research-section__intro">' + intro + "</p>" + body + "</section>";
  }

  function isEmpty(r) {
    return !r.updatedAt && !r.searches.length && !r.trends.length && !r.competitors.length && !Object.keys(r.whatWorks).length;
  }

  function header(r) {
    const when = r.updatedAt ? "Last updated " + new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "." : "Not researched yet.";
    return '<div class="research-head"><p class="research-head__when">' + esc(when) + '</p><button type="button" class="btn btn--primary" data-action="refresh">' + icon("refresh") + "Refresh research</button></div>";
  }

  function refresh(ctx, button) {
    button.disabled = true;
    ctx.runJob("research-my-market").catch(function (err) { ctx.toast(err.message); }).then(function () { button.disabled = false; });
  }

  // One idea for each search: the idea keeps the search's id, so pressing twice (or after a reload) adds nothing more
  function makeIdea(ctx, button, searchId) {
    const M = ctx.model, C = window.CM.components;
    const s = ctx.data.research.searches.find(function (x) { return x.id === searchId; });
    if (M.hasResearchIdea(ctx.data, s)) { ctx.toast("That one is already in your ideas"); return; }
    button.disabled = true;
    const idea = { id: ui.makeId("i"), title: s.phrase, notes: s.why, source: "research", researchId: s.id, theme: "", createdAt: new Date().toISOString(), status: "new", postId: null };
    ctx.update(function (d) { if (!M.hasResearchIdea(d, s)) d.ideas.unshift(idea); }, "Made an idea from research: " + s.phrase)
      .catch(function (err) { button.disabled = false; C.reportFailure(ctx, err); });
  }

  CM.views.research = {
    title: "Research",
    line: function (ctx) {
      const n = ctx.data.research.searches.length;
      return n ? n + (n === 1 ? " search" : " searches") + " your customers make" : "What your customers search for";
    },
    render: function (root, ctx) {
      const C = window.CM.components, M = ctx.model, r = ctx.data.research;
      let body;
      if (isEmpty(r)) {
        body = C.emptyState("Nothing researched yet", "Claude fills this during setup, and again when you press Refresh research.");
      } else {
        const works = whatWorksCards(ctx.data, M);
        body =
          section("What people are searching for", "The phrases your customers type, and how much demand sits behind each.",
            r.searches.length ? '<ul class="research-list">' + r.searches.map(function (s) { return searchRow(s, ctx.data); }).join("") + "</ul>" : '<p class="research-none">No searches found yet. Press Refresh research.</p>') +
          section("In season and trending", "Topics with a date on them, so the timing is right.",
            r.trends.length ? '<ul class="research-list">' + r.trends.map(trendRow).join("") + "</ul>" : '<p class="research-none">Nothing in season right now.</p>') +
          section("Your competitors", "What they post and what seems to work for them. Claude reads public pages only.",
            r.competitors.length ? '<div class="research-grid">' + r.competitors.map(competitorCard).join("") + "</div>" : '<p class="research-none">No competitors added yet. Tell Claude who they are and press Refresh research.</p>') +
          section("What works on each platform", "In your industry, for the platforms you have switched on.",
            works ? '<div class="research-grid">' + works + "</div>" : '<p class="research-none">Switch on a platform and refresh to see what works there.</p>') +
          (r.skill ? '<p class="research-skill">' + icon("sparkle") + "Claude keeps these findings as a skill called <strong>" + esc(r.skill) + "</strong>, so every post it writes uses them.</p>" : "");
      }
      root.innerHTML = '<div class="research-page">' + header(r) + body + "</div>";
      root.onclick = function (e) {
        const el = e.target.closest("[data-action]");
        if (!el) return;
        if (el.getAttribute("data-action") === "refresh") refresh(ctx, el);
        else makeIdea(ctx, el, el.getAttribute("data-search"));
      };
    }
  };
})();
