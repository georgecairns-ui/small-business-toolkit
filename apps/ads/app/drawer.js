/*
  THE CAMPAIGN PANEL: slides in from the right
  --------------------------------------------
  Two kinds, opened with AD.drawer.open(kind, id, ctx):

  "build"     a new campaign Claude has drafted. Everything is edited in place: name, platform, goal,
              dates, daily budget (with the monthly equivalent and the budget check), the season (with
              the seasonal check), who sees it, and each ad with its words, character counts, button,
              link, pictures and videos, and a preview of how it reads. Then Claude's reason, a list of
              things to check, and the buttons for where it has got to: Approve, Build it paused, Open in
              the manager, "I've switched it on".
  "campaign"  a campaign that is in an ad account: how Claude's prediction is going, its last 12 weeks, a
              carousel of its ads (each with its own figures), Claude's newest analysis, the suggestions
              about it and the buttons: Analyse campaign, Run campaign and, on Meta, Pause, Switch on and
              Change daily budget (each through the confirm pop-up in app.js). On Google it links to
              Google Ads and adds the change to the owner's task list, because Google is changed by the owner.

  Nothing changes in an ad account until the owner presses a button here and says yes in the pop-up. The panel
  only records what was approved (app.js does that); Claude makes the one change and reads it back, and the
  panel shows how that went. A build becomes Running when Claude has switched it on, or when the owner says
  they switched it on themselves.

  Pictures and videos: each ad has a drop zone and a button. media.js saves the files; they are added to
  the ad through ctx.update(), so every change is saved and logged. Typing is saved when the person
  leaves the box, without redrawing the panel, so a click on the next button is never lost.

  The app calls AD.drawer.init(makeCtx) once and AD.drawer.refresh() after every data change, as Content
  Machine OS does. If init was never called, the ctx given to open() is used (and refresh(ctx) can pass a
  newer one), but the panel then shows the data as it was when the ctx was made.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const ui = window.TaskListOS.ui;
  const esc = ui.esc, icon = ui.icon;
  const M = window.AD.model;
  const C = window.AD.components;
  const Media = window.AD.media;

  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const SUGGESTION_KINDS = { pause: "Pause", budget: "Budget", test: "Test", words: "Ad words", audience: "Audience", landing: "Landing page", other: "Other" };
  const EDITABLE = ["draft", "approved"];   // once Claude has built it, changes are made in the ad account, not here
  const REQUEST_WORDS = { write: "write this one", rewrite: "change this one", build: "build this one" };
  const SAY = { build: "build my approved campaigns", write: "change my waiting campaigns", rewrite: "change my waiting campaigns" };
  const NOTHING_CHANGES = "Nothing changes in your ad account until you press the button and say yes.";

  let getCtx = null, lastCtx = null, el = null, scrim = null, bound = false;
  // kind and id: what is open. note: what is typed for Claude and not sent. asking: the builds Claude is being asked about
  // right now, so the buttons can't be pressed twice. notices: messages about files that couldn't be added.
  // dragMedia: { adId, file } being dragged to a new place. expanded: ads whose "see more" is open. slide: the ad showing in each
  // campaign's carousel. analyseNote and gChange and gBudget: what is typed or chosen for Claude and the Google task, not yet sent.
  const state = { kind: null, id: null, opener: null, skipRefresh: false, pendingDraw: false, note: "", newCheck: "", asking: {}, notices: [], dragMedia: null, expanded: {}, confirmOn: false,
    slide: {}, analyseNote: "", gChange: "pause", gBudget: "" };

  // ---------- Small helpers ----------
  function ctxNow() { return getCtx ? getCtx() : lastCtx; }
  function todayOf(ctx) { return typeof ctx.today === "function" ? ctx.today() : (ctx.today || ui.isoDate()); }
  function buildNow() { return ctxNow().data.builds.find(function (b) { return b.id === state.id; }); }
  function campaignNow() { return ctxNow().data.campaigns.find(function (c) { return c.id === state.id; }); }
  function safeLink(url) { return /^https?:\/\//i.test(url || "") ? url : ""; }
  function nameOf(b) { return b.name || "Untitled campaign"; }
  function managerOf(key) { return M.platform(key) || { managerName: "your ad account", openUrl: "", label: key }; }
  function toast(message, undo) { ctxNow().toast(message, undo); }
  function failed(err) { if (!err.shownToPerson) toast(err.message); }
  function lines(text) { return String(text || "").split(/\n|,/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function linesText(list) { return (list || []).join("\n"); }
  function numberOrNull(text) { const t = String(text).trim(); return t === "" ? null : Number(t); }

  function select(name, options, value, attrs) {
    return '<select class="select" ' + attrs + ' name="' + name + '">' + options.map(function (o) {
      return '<option value="' + esc(o.value) + '"' + (o.value === value ? " selected" : "") + ">" + esc(o.label) + "</option>";
    }).join("") + "</select>";
  }
  function prop(label, value) {
    return '<div class="prop"><span class="prop__label">' + esc(label) + '</span><span class="prop__value">' + value + "</span></div>";
  }
  // ---------- Saving ----------
  // quiet: the panel is not redrawn when the save comes back (used for typing)
  function save(mutator, activityText, quiet) {
    const id = state.id;
    if (quiet) state.skipRefresh = true;
    return ctxNow().update(function (d) {
      const b = d.builds.find(function (x) { return x.id === id; });
      if (!b) throw new Error("That campaign is no longer in your list.");
      mutator(b, d);
      b.updatedAt = M.nowIso();
    }, activityText, id).catch(function (err) { state.skipRefresh = false; throw err; });
  }
  // Saves to a build by its id (not the one open now), so an Undo still works after the panel is closed
  function updateBuild(id, mutator, activityText) {
    return ctxNow().update(function (d) {
      const b = d.builds.find(function (x) { return x.id === id; });
      if (!b) throw new Error("That campaign is no longer in your list.");
      mutator(b);
      b.updatedAt = M.nowIso();
    }, activityText, id).catch(failed);
  }
  function saveAd(adId, mutator, activityText, quiet) {
    return save(function (b) {
      const ad = b.ads.find(function (a) { return a.id === adId; });
      if (!ad) throw new Error("That ad is no longer in this campaign.");
      mutator(ad, b);
    }, activityText, quiet);
  }

  // ============================================================
  // A new campaign
  // ============================================================

  function countText(c) { return c.count + (c.limit ? " of " + c.limit : "") + (c.over ? ", " + (c.count - c.limit) + " over" : ""); }
  function adLabels(platformKey) {
    return platformKey === "google"
      ? { headline: "Headline", primaryText: "Description", description: "Second description (optional)" }
      : { headline: "Headline", primaryText: "Main text", description: "Description (optional)" };
  }

  function topNote(b) {
    return '<p class="adnote">' + icon("lock") + "<span>" + esc(NOTHING_CHANGES) + (b.status === "live" ? " This one is running." : "") + "</span></p>";
  }
  function requestBanner(b) {
    const req = b.request;
    if (!req) return "";
    return '<div class="drawer__banner"><span>' + icon("sparkle") + "<span>Claude has been asked to " + esc(REQUEST_WORDS[req.kind] || "work on this one") + ". It appears here when it’s done.</span></span>" +
      "<span>Nothing happening? Open the folder in Claude and say " + C.say(SAY[req.kind] || SAY.build) + "</span></div>";
  }
  function lockedNote(b) {
    if (EDITABLE.indexOf(b.status) > -1) return "";
    return '<p class="drawer__small muted adlocked">' + (b.status === "building" ? "Claude is building this one now, so it can’t be changed." : "This one has been built, so the words and settings are shown as they were built. Change a campaign that exists in your account in " + esc(managerOf(b.platform).managerName) + ".") + "</p>";
  }

  function basics(ctx, b, locked) {
    const dis = locked ? " disabled" : "";
    const monthly = M.monthlyEquivalent(b.budget.daily);
    return '<input class="input input--title" data-f="name" value="' + esc(b.name) + '" placeholder="Name the campaign" aria-label="Campaign name" maxlength="140"' + dis + ">" +
      '<div class="props adprops">' +
        prop("Where", select("platform", M.PLATFORMS.map(function (p) { return { value: p.key, label: p.label }; }), b.platform, 'data-f="platform" aria-label="Where it runs"' + dis)) +
        prop("Goal", '<input class="input" data-f="objective" list="adObjectives" value="' + esc(b.objective) + '" placeholder="For example: enquiries" aria-label="What the campaign is for" maxlength="80"' + dis + '>' +
          '<datalist id="adObjectives"><option value="enquiries"><option value="bookings"><option value="calls"><option value="sales"><option value="visits to the website"><option value="people hearing about you"></datalist>') +
        prop("Starts", '<input class="input input--sm" type="date" data-f="start" value="' + esc(b.budget.start || "") + '" aria-label="Start date"' + dis + ">") +
        prop("Ends", '<input class="input input--sm" type="date" data-f="end" value="' + esc(b.budget.end || "") + '" aria-label="End date"' + dis + ">") +
        prop("Per day", '<span class="adpound"><span aria-hidden="true">£</span><input class="input input--sm adpound__input" type="number" inputmode="decimal" min="0" step="0.01" data-f="daily" value="' + esc(b.budget.daily === null ? "" : b.budget.daily) + '" aria-label="Daily budget in pounds"' + dis + "></span>" +
          '<span class="muted drawer__small" data-monthly>' + monthlyText(monthly) + "</span>") +
      "</div>" + '<div data-guards>' + guards(ctx, b) + "</div>" + seasonSection(b, locked);
  }
  function monthlyText(monthly) { return monthly === null ? "" : "about " + M.money(monthly) + " a month"; }

  // The budget check and the seasonal check, in plain words
  function guards(ctx, b) {
    const c = M.buildChecks(ctx.data, b, todayOf(ctx)), bd = c.budget;
    const seasonWarnings = c.season ? c.season.warnings : [];
    const budgetWarnings = c.warnings.filter(function (w) { return seasonWarnings.indexOf(w) === -1; });
    let budgetBody, budgetState;
    if (bd.missing) { budgetState = "quiet"; budgetBody = "Add a daily budget and Claude checks it against your limits."; }
    else if (budgetWarnings.length) { budgetState = "bad"; budgetBody = budgetWarnings.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join(""); }
    else if (!bd.dailyCap && !bd.monthlyBudget) { budgetState = "quiet"; budgetBody = "You haven’t set a daily limit or a monthly budget yet. Set them in Settings and this check starts working."; }
    else {
      budgetState = "ok";
      budgetBody = "Inside your limits: " + M.money(bd.total) + " a day with the campaigns already running, about " + M.money(bd.monthly) + " a month" +
        (bd.dailyCap ? ". Daily limit " + M.money(bd.dailyCap) : "") + (bd.monthlyBudget ? (bd.dailyCap ? ", monthly budget " : ". Monthly budget ") + M.money(bd.monthlyBudget) : "") + ".";
    }
    let seasonBody = "";
    if (c.season) {
      seasonBody = '<div class="guard guard--' + (c.season.ok ? "ok" : "bad") + '" role="group" aria-label="Season check">' + icon(c.season.ok ? "check" : "alert") + '<div class="guard__text"><strong>Season check</strong>' +
        (c.season.ok ? "<span>In season: " + esc(c.season.label) + " (" + esc(c.season.text) + ").</span>" : c.season.warnings.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("")) + "</div></div>";
    }
    const budgetHtml = budgetState === "bad" ? budgetBody : "<span>" + esc(budgetBody) + "</span>";
    return '<div class="guard guard--' + budgetState + '" role="group" aria-label="Budget check">' + icon(budgetState === "ok" ? "check" : budgetState === "bad" ? "alert" : "info") +
      '<div class="guard__text"><strong>Budget check</strong>' + budgetHtml + "</div></div>" + seasonBody;
  }

  function seasonSection(b, locked) {
    const dis = locked ? " disabled" : "";
    const intro = '<h3 class="drawer__h">Season</h3><p class="drawer__small muted">A Christmas ad should never run in June. Give a campaign its season and Claude warns you when the dates or today fall outside it.</p>';
    if (!b.season) {
      return '<div class="drawer__section">' + intro + '<div class="drawer__row"><span class="muted drawer__small">No season set.</span>' +
        (locked ? "" : '<button type="button" class="btn btn--sm" data-d="season-add">' + icon("plus") + "Add a season</button>") + "</div></div>";
    }
    function part(which, md) {
      const m = md.slice(0, 2), d = Number(md.slice(3));
      return '<span class="adseason__part">' +
        select("season-" + which + "-m", MONTHS.map(function (n, i) { return { value: String(i + 1).padStart(2, "0"), label: n }; }), m, 'data-f="season-' + which + '-m" aria-label="Season ' + which + ', month"' + dis) +
        '<input class="input input--sm adseason__day" type="number" min="1" max="31" data-f="season-' + which + '-d" value="' + d + '" aria-label="Season ' + which + ', day"' + dis + "></span>";
    }
    return '<div class="drawer__section">' + intro +
      '<input class="input" data-f="season-label" value="' + esc(b.season.label || "") + '" placeholder="Name it, for example Christmas" aria-label="Season name" maxlength="60"' + dis + ">" +
      '<div class="adseason"><span class="drawer__small muted">From</span>' + part("from", b.season.from) + '<span class="drawer__small muted">to</span>' + part("to", b.season.to) +
      (locked ? "" : '<button type="button" class="btn btn--sm btn--ghost" data-d="season-clear">Clear</button>') + "</div></div>";
  }

  function whoSection(b, locked) {
    const a = b.audience, dis = locked ? " disabled" : "", google = b.platform === "google";
    function box(f, label, list, hint) {
      return '<label class="field"><span class="field__label">' + label + '</span><textarea class="textarea" rows="2" data-f="' + f + '" placeholder="One on each line"' + dis + ">" + esc(linesText(list)) + "</textarea>" +
        (hint ? '<span class="field__hint">' + hint + "</span>" : "") + "</label>";
    }
    return '<div class="drawer__section"><h3 class="drawer__h">Who sees it</h3>' +
      box("locations", "Where", a.locations, "") +
      (google ? box("keywords", "Words people search for", a.keywords, "Claude uses these as the searches your ad can show for.") + box("negativeKeywords", "Words that should stop it showing", a.negativeKeywords, "For example “free” or “jobs”.") :
        '<div class="adages"><label class="field"><span class="field__label">Youngest</span><input class="input input--sm" type="number" min="13" max="65" data-f="ageMin" value="' + esc(a.ageMin === null ? "" : a.ageMin) + '"' + dis + ">" + "</label>" +
        '<label class="field"><span class="field__label">Oldest</span><input class="input input--sm" type="number" min="13" max="65" data-f="ageMax" value="' + esc(a.ageMax === null ? "" : a.ageMax) + '"' + dis + ">" + "</label></div>" +
        box("interests", "Interests", a.interests, "")) +
      '<label class="field"><span class="field__label">Notes</span><textarea class="textarea" rows="2" data-f="notes" placeholder="Anything else about who this is for"' + dis + ">" + esc(a.notes) + "</textarea></label></div>";
  }

  // ---------- The ads ----------
  function field(ad, key, platformKey, locked, opts) {
    const labels = adLabels(platformKey), c = M.charCount(platformKey, key, ad[key]), dis = locked ? " disabled" : "";
    const control = opts.area ? '<textarea class="textarea" rows="3" data-f="' + key + '" data-ad="' + esc(ad.id) + '"' + dis + ">" + esc(ad[key]) + "</textarea>" :
      '<input class="input" data-f="' + key + '" data-ad="' + esc(ad.id) + '" value="' + esc(ad[key]) + '"' + dis + ">";
    return '<label class="field"><span class="field__label">' + labels[key] + "</span>" + control +
      '<span class="count' + (c.over ? " is-over" : "") + '" data-count="' + key + '">' + esc(countText(c)) + "</span></label>";
  }

  // fixed: the words are cut where the platform cuts them, with no "see more" button (the carousel's ads)
  function previewText(adId, platformKey, text, fixed) {
    const p = M.preview(platformKey, "primaryText", text), open = !!state.expanded[adId];
    if (!p.shown) return '<span class="pview__empty">Nothing written yet. The first words people see will show here.</span>';
    if (!p.cut) return esc(p.shown);
    if (fixed) return esc(p.shown) + "…";
    return open ? esc(String(text).trim()) + ' <button type="button" class="link-btn" data-d="see-more" data-ad="' + esc(adId) + '">show less</button>' :
      esc(p.shown) + '… <button type="button" class="link-btn" data-d="see-more" data-ad="' + esc(adId) + '">see more</button>';
  }
  function hostOf(url) { const m = /^https?:\/\/([^/?#]+)/i.exec(url || ""); return m ? m[1].replace(/^www\./, "") : "your website"; }
  function preview(ctx, b, ad, fixed) {
    const name = ctx.data.settings.businessName || "Your business", label = M.platform(b.platform).label;
    if (b.platform === "google") {
      const headline = ad.headline || "Your headline shows here";
      return '<div class="pview adprev adprev--google" aria-label="How it looks on ' + esc(label) + '"><p class="adprev__sponsor"><strong>Sponsored</strong> · ' + esc(hostOf(ad.url)) + "</p>" +
        '<p class="adprev__ghead">' + esc(headline) + '</p><p class="adprev__gtext">' + esc([ad.primaryText, ad.description].filter(Boolean).join(" ") || "Your description shows here.") + "</p></div>";
    }
    const cover = ad.media[0];
    return '<div class="pview adprev" aria-label="How it looks on ' + esc(label) + '"><div class="pview__head"><span class="pview__avatar" aria-hidden="true">' + esc(Array.from(name)[0].toUpperCase()) + "</span>" +
      '<div class="pview__who"><span class="pview__name">' + esc(name) + '</span><span class="pview__sub">Sponsored · ' + esc(label) + " preview</span></div></div>" +
      '<p class="pview__text" data-preview-text>' + previewText(ad.id, b.platform, ad.primaryText, fixed) + "</p>" +
      (cover ? '<div class="pview__media">' + C.mediaThumb(cover) + "</div>" : "") +
      '<div class="adprev__bar"><div class="adprev__words"><span class="adprev__headline">' + esc(ad.headline || "Your headline") + "</span>" +
      (ad.description ? '<span class="adprev__desc">' + esc(ad.description) + "</span>" : "") + "</div>" +
      (ad.cta ? '<span class="adprev__cta">' + esc(ad.cta) + "</span>" : "") + "</div></div>";
  }

  function uploadsHtml(adId) {
    return Media.pending(adId).map(function (u) {
      return '<div class="mup"><span class="mup__name">' + esc(u.name) + '</span><progress max="100" value="' + u.percent + '" aria-label="Saving ' + esc(u.name) + '"></progress><span class="mup__pct num">' + u.percent + "%</span></div>";
    }).join("");
  }
  function noticesHtml() {
    return state.notices.map(function (text, i) {
      return '<div class="mnotice" role="alert">' + icon("alert") + "<span>" + esc(text) + '</span><button type="button" class="icon-btn icon-btn--sm" data-d="notice-dismiss" data-i="' + i + '" aria-label="Dismiss">' + icon("x") + "</button></div>";
    }).join("");
  }
  function mediaTile(ad, file, at, locked) {
    const last = at === ad.media.length - 1, f = esc(file), a = esc(ad.id), isVideo = Media.kind(file) === "video";
    const label = (isVideo ? "video " : "picture ") + (at + 1);
    return '<li class="mtile' + (at === 0 ? " is-cover" : "") + '"' + (locked ? "" : ' draggable="true"') + ' data-media-id="' + f + '" data-ad="' + a + '">' +
      '<button type="button" class="mtile__view" data-d="media-view" data-ad="' + a + '" data-file="' + f + '" aria-label="View ' + esc(label) + ' large">' + C.mediaThumb(file, "") + "</button>" +
      (at === 0 ? '<span class="mtile__badge">Cover</span>' : "") +
      (locked ? "" : '<div class="mtile__actions">' +
        '<button type="button" class="icon-btn icon-btn--sm" data-d="media-earlier" data-ad="' + a + '" data-file="' + f + '" aria-label="Move ' + esc(label) + ' earlier"' + (at === 0 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
        '<button type="button" class="icon-btn icon-btn--sm" data-d="media-later" data-ad="' + a + '" data-file="' + f + '" aria-label="Move ' + esc(label) + ' later"' + (last ? " disabled" : "") + ">" + icon("chevronRight") + "</button>" +
        '<button type="button" class="btn btn--sm" data-d="media-remove" data-ad="' + a + '" data-file="' + f + '">Remove</button></div>') + "</li>";
  }
  function mediaBlock(ad, locked) {
    const a = esc(ad.id);
    return '<div class="admedia" data-ad-drop="' + a + '"><span class="field__label">Pictures and videos</span>' +
      (locked ? "" : '<div class="mdrop"><p class="mdrop__text">Drag them here from a folder, or choose them from your computer.</p>' +
        '<button type="button" class="btn btn--sm" data-d="media-pick" data-ad="' + a + '">' + icon("plus") + "Add from your computer</button>" +
        '<input type="file" multiple accept="image/*,video/*" hidden data-media-input data-ad="' + a + '" aria-label="Choose pictures and videos"></div>') +
      '<div data-uploads="' + a + '">' + uploadsHtml(ad.id) + "</div>" +
      (ad.media.length ? '<ul class="mgrid" data-media-grid="' + a + '">' + ad.media.map(function (f, i) { return mediaTile(ad, f, i, locked); }).join("") + "</ul>" +
        (locked ? "" : '<p class="drawer__small muted">The first one is the cover. Remove only takes it off this ad: the file stays in the media folder inside Ads OS on this computer.</p>') :
        '<p class="drawer__small muted">Nothing added yet. The first picture you add is the cover.</p>') + "</div>";
  }

  function adCard(ctx, b, ad, at, locked) {
    const a = esc(ad.id), dis = locked ? " disabled" : "", meta = b.platform !== "google";
    // On Google the third ad gives a headline only. Its other two boxes are hidden unless they already hold words, which the owner must clear.
    const headlineOnly = !meta && at === 2, hasWords = !!(ad.primaryText || ad.description);
    const words = headlineOnly && !hasWords ? '<p class="drawer__small muted">Google uses this ad’s headline only.</p>' :
      (headlineOnly ? '<p class="drawer__small muted">Google uses this ad’s headline only. Clear these two boxes before Claude makes the import file.</p>' : "") +
      field(ad, "primaryText", b.platform, locked, { area: true }) + field(ad, "description", b.platform, locked, {});
    return '<article class="adcard" data-ad-card="' + a + '"><header class="adcard__head"><h4 class="adcard__title">Ad ' + (at + 1) + "</h4>" +
      (locked ? "" : '<button type="button" class="btn btn--sm btn--ghost" data-d="ad-remove" data-ad="' + a + '">' + icon("trash") + "Remove this ad</button>") + "</header>" +
      field(ad, "headline", b.platform, locked, {}) + words +
      '<div class="adcard__row">' +
        (meta ? '<label class="field"><span class="field__label">Button</span><input class="input" data-f="cta" data-ad="' + a + '" list="adButtons" value="' + esc(ad.cta) + '" placeholder="For example: Book now" maxlength="30"' + dis + ">" +
          '<datalist id="adButtons"><option value="Book now"><option value="Learn more"><option value="Sign up"><option value="Contact us"><option value="Get quote"><option value="Shop now"><option value="Call now"></datalist></label>' : "") +
        '<label class="field adcard__link"><span class="field__label">Where it goes (link)</span><input class="input" type="url" data-f="url" data-ad="' + a + '" value="' + esc(ad.url) + '" placeholder="https://" aria-label="Link for ad ' + (at + 1) + '"' + dis + "></label></div>" +
      mediaBlock(ad, locked) +
      '<div class="adcard__preview"><span class="field__label">How it will look</span><div data-ad-preview="' + a + '">' + preview(ctx, b, ad) + "</div></div></article>";
  }
  function adsSection(ctx, b, locked) {
    return '<div class="drawer__section" data-section="ads"><div class="adsec__head"><h3 class="drawer__h">The ads</h3>' +
      (locked ? "" : '<button type="button" class="btn btn--sm" data-d="ad-add">' + icon("plus") + "Add an ad</button>") + "</div>" +
      '<div data-notices>' + noticesHtml() + "</div>" +
      (b.ads.length ? b.ads.map(function (ad, i) { return adCard(ctx, b, ad, i, locked); }).join("") : '<p class="drawer__small muted">No ads yet. Claude writes 2 or 3 when it drafts a campaign, or add one yourself.</p>') + "</div>";
  }

  function whySection(b) {
    return '<div class="drawer__section"><h3 class="drawer__h">Why Claude built it this way</h3>' +
      (b.why ? '<p class="adwhy">' + esc(b.why) + "</p>" : '<p class="drawer__small muted">Claude adds a short reason when it drafts a campaign.</p>') + "</div>";
  }
  function checkRow(c) {
    return '<li class="adcheck' + (c.done ? " is-done" : "") + '"><button type="button" class="check" role="checkbox" aria-checked="' + !!c.done + '" data-d="check-toggle" data-id="' + esc(c.id) + '" aria-label="Done: ' + esc(c.text) + '">' + icon("check") + "</button>" +
      '<span class="adcheck__text">' + esc(c.text) + "</span></li>";
  }
  function checksSection(b) {
    return '<div class="drawer__section"><h3 class="drawer__h">Check before it goes on</h3>' +
      (b.checks.length ? '<ul class="adchecks">' + b.checks.map(checkRow).join("") + "</ul>" : '<p class="drawer__small muted">Nothing to check yet.</p>') +
      '<div class="adcheck-add"><input class="input" data-newcheck value="' + esc(state.newCheck) + '" placeholder="Add something to check" aria-label="Something to check" maxlength="160"><button type="button" class="btn btn--sm" data-d="check-add">Add</button></div></div>';
  }

  function askSection(b) {
    if (b.status !== "draft") return "";
    const busy = !!state.asking[b.id] || !!b.request;
    return '<div class="drawer__section"><h3 class="drawer__h">Claude</h3>' +
      '<textarea class="textarea" rows="2" data-note aria-label="What should Claude change" placeholder="What should change? For example: a smaller budget, and lead with the free check-up">' + esc(state.note) + "</textarea>" +
      '<div><button type="button" class="btn" data-d="ask-change"' + (busy ? " disabled" : "") + ">" + icon("sparkle") + "Ask Claude to change it</button></div></div>";
  }

  // ---------- Changes the owner has approved, and how they went ----------
  // The newest account change that matches (campaign or build), or null
  function newestAction(ctx, match) {
    return (ctx.data.actions || []).filter(match).sort(function (a, b) { return String(b.requestedAt).localeCompare(String(a.requestedAt)); })[0] || null;
  }
  function inFlight(a) { return !!a && (a.status === "requested" || a.status === "doing"); }
  // One line: what was asked and where it has got to. Done shows what Claude read back, a failure shows why.
  function actionLine(ctx, a) {
    if (!a) return "";
    const label = M.ACTION_LABELS[a.kind] || "Change", status = a.status;
    const words = status === "doing" ? "Claude is doing it" : status === "requested" ? "Waiting for Claude" : status === "done" ? "Done" : "Didn’t work";
    const detail = status === "done" ? (a.readBack || "Claude made the change.") : status === "failed" ? (a.note || "Claude couldn’t make the change. Nothing else was touched.") : M.actionSentence(ctx.data, a, todayOf(ctx));
    const iconName = status === "done" ? "check" : status === "failed" ? "alert" : "loader";
    return '<div class="actline actline--' + esc(status) + '" role="status">' + icon(iconName, inFlight(a) ? "adspin" : "") + '<div class="actline__text"><strong>' + esc(label + ": " + words) + "</strong><span>" + esc(detail) + "</span>" +
      (status === "requested" ? '<span class="actline__help">Nothing happening? Open the folder in Claude and say ' + C.say("make the account change I approved") + "</span>" : "") + "</div></div>";
  }

  // The buttons for where the campaign has got to
  function foot(ctx, b, c) {
    const m = managerOf(b.platform), link = safeLink(b.refs.url) || m.openUrl, busy = !!state.asking[b.id] || !!b.request;
    const open = link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "Open in " + esc(m.managerName) + "</a>" : "";
    let main = "";
    if (b.status === "draft") {
      main = '<button type="button" class="btn btn--approve" data-d="approve">' + icon("check") + "Approve</button>" +
        '<span class="drawer__spacer"></span><button type="button" class="btn btn--danger" data-d="drop">Drop</button>';
      return '<div class="drawer__foot adfoot"><p class="drawer__small muted adfoot__line">Approving doesn’t build anything or spend anything. It tells Claude you are happy with it.</p><div class="adfoot__row">' + main + "</div></div>";
    }
    if (b.status === "approved") {
      const meta = b.platform !== "google";
      const why = c.ok ? "" : '<p class="drawer__small adfoot__why" role="alert">' + icon("alert") + "<span>Not yet. " + esc(c.warnings.join(" ")) + "</span></p>";
      return '<div class="drawer__foot adfoot">' + why +
        '<p class="drawer__small muted adfoot__line">' + esc(meta ? M.COPY.metaBuildNote : M.COPY.googleBuildNote) + "</p>" +
        '<div class="adfoot__row"><button type="button" class="btn btn--primary" data-d="build"' + (!c.ok || busy ? " disabled" : "") + ">" + icon("sparkle") + (meta ? "Build it in my account, paused" : "Make the import file") + "</button>" +
        '<span class="drawer__spacer"></span><button type="button" class="btn btn--danger" data-d="drop">Drop</button></div></div>';
    }
    if (b.status === "building") {
      return '<div class="drawer__foot adfoot"><p class="drawer__small adfoot__line">' + icon("loader", "adspin") + " Claude is building it now. It stays switched off.</p></div>";
    }
    if (b.status === "in-account" || b.status === "ready-to-import") {
      if (state.confirmOn) {
        return '<div class="drawer__foot adfoot"><p class="adfoot__line">Only confirm once you have switched it on yourself in ' + esc(m.managerName) + '. Claude can’t see that you have.</p>' +
          '<div class="adfoot__row"><button type="button" class="btn btn--approve" data-d="switched-on-yes">' + icon("check") + "Yes, it’s switched on</button>" +
          '<button type="button" class="btn" data-d="switched-on-no">Not yet</button></div></div>';
      }
      const meta = b.platform === "meta";
      const where = b.status === "in-account" ? "It’s in your account, switched off." : "The import file is ready. It arrives switched off.";
      if (meta && b.status === "in-account") {
        // Meta: the owner presses Switch it on and says yes in the pop-up; Claude then does that one change and reads it back
        const last = newestAction(ctx, function (a) { return a.buildId === b.id && a.kind === "switch-on"; }), doing = inFlight(last);
        const probe = M.newAction("switch-on", { platform: "meta", buildId: b.id, campaignId: (b.refs && b.refs.campaignId) || "" }), checks = M.actionChecks(ctx.data, probe, todayOf(ctx));
        const why = checks.ok || doing ? "" : '<p class="drawer__small adfoot__why" role="alert">' + icon("alert") + "<span>Not yet. " + esc(checks.warnings.join(" ")) + "</span></p>";
        return '<div class="drawer__foot adfoot">' + actionLine(ctx, last) + why + '<p class="drawer__small muted adfoot__line">' + esc(where + (b.refs.file ? " File: " + b.refs.file + "." : "")) + " " + esc(NOTHING_CHANGES) + '</p><div class="adfoot__row">' +
          open + '<button type="button" class="btn btn--primary" data-d="build-switch-on"' + (!checks.ok || doing ? " disabled" : "") + ">" + icon("zap") + "Switch it on</button></div>" +
          '<p class="drawer__small adfoot__alt"><button type="button" class="link-btn" data-d="switched-on">I’ve switched it on myself</button></p></div>';
      }
      let sheet = "";
      if (b.status === "ready-to-import") {
        const path = b.refs.sheet || "", url = safeLink(path);
        sheet = (url ? '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + icon("fileText") + "Open the build sheet</a>" :
          '<button type="button" class="btn" data-d="sheet"' + (path ? "" : ' disabled title="Claude hasn’t saved a build sheet for this one"') + ">" + icon("fileText") + "Open the build sheet</button>");
      }
      return '<div class="drawer__foot adfoot"><p class="drawer__small muted adfoot__line">' + esc(where) + (b.refs.file ? " File: " + esc(b.refs.file) + "." : "") + '</p><div class="adfoot__row">' +
        sheet + (b.status === "in-account" ? open : (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "Open " + esc(m.managerName) + "</a>" : "")) +
        '<button type="button" class="btn btn--primary" data-d="switched-on">' + icon("check") + "I’ve switched it on</button></div></div>";
    }
    if (b.status === "live") {
      const done = newestAction(ctx, function (a) { return a.buildId === b.id && a.kind === "switch-on" && a.status === "done"; });
      return '<div class="drawer__foot adfoot">' + actionLine(ctx, done) + '<p class="drawer__small muted adfoot__line">' + (done ? "Switched on" : "You switched it on") + (b.switchedOnAt ? " on " + esc(M.dayLabel(M.localDay(b.switchedOnAt))) : "") + ".</p>" + (open ? '<div class="adfoot__row">' + open + "</div>" : "") + "</div>";
    }
    return "";
  }

  function buildHtml(ctx, b) {
    const locked = EDITABLE.indexOf(b.status) === -1, c = M.buildChecks(ctx.data, b, todayOf(ctx));
    return '<div class="drawer__head"><span class="chip chip--quiet">New campaign</span>' + C.platformTag(b.platform) + C.buildPill(b.status) +
      '<span class="drawer__spacer"></span><button type="button" class="icon-btn" data-d="close" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body adrawer">' + topNote(b) + requestBanner(b) + lockedNote(b) + basics(ctx, b, locked) + whoSection(b, locked) + adsSection(ctx, b, locked) + whySection(b) + checksSection(b) + askSection(b) + "</div>" +
      foot(ctx, b, c);
  }

  // ============================================================
  // A campaign in an ad account
  // ============================================================

  // The campaign's last 12 weeks, drawn by charts.js (spend as bars, cost per result as a line against the
  // target). Without charts.js nothing is drawn. The figures all come from the model.
  function miniChart(ctx, c) {
    const data = ctx.data, weeks = M.weeks(data, 12, todayOf(ctx), { campaignId: c.id }), target = M.targetFor(data, c.platform);
    if (!weeks.some(function (w) { return w.hasFigures; })) return '<p class="drawer__small muted">No figures for this campaign yet. They appear here once Claude copies them in.</p>';
    if (!window.AD.charts) return "";
    const word = M.resultName(data), width = Math.min(560, Math.max(260, (el.clientWidth || 360) - 48));
    return '<div class="mchart">' + window.AD.charts.trend(weeks, target, { compact: true, width: width, word: word, plural: M.resultPlural(data) }) +
      '<p class="drawer__small muted">Each bar is a week of spend. The line is the ' + esc(M.costLabel(data).toLowerCase()) + (target ? ", and the dashed line is your target of " + esc(M.money(target)) : "") + ".</p></div>";
  }

  function campaignRow(ctx, c) {
    const range = Object.assign({}, rangeOf(ctx), { platform: "all" });
    const row = M.byCampaign(ctx.data, range).find(function (r) { return r.campaign.id === c.id; });
    if (row) return row;
    const totals = M.rangeTotals(ctx.data, { from: range.from, to: range.to, campaignId: c.id });
    return { campaign: c, totals: totals, light: M.light(totals, M.targetFor(ctx.data, c.platform)), roas: M.roas(ctx.data, totals), change: { spend: null, results: null, costPerResult: null } };
  }
  function rangeOf(ctx) {
    const r = ctx.range;
    if (r && r.from) return r;
    return M.rangeFor(typeof r === "string" ? r : (r && r.key) || "4weeks", todayOf(ctx), M.weekStartsOf(ctx.data));
  }
  function tile(label, value, sub) {
    return '<div class="ctile"><span class="ctile__label">' + esc(label) + '</span><span class="ctile__value num">' + value + "</span>" + (sub ? '<span class="ctile__sub">' + sub + "</span>" : "") + "</div>";
  }
  // ---------- How the prediction is going ----------
  // The score, Claude's plain sentence and, folded away, the sums behind them (all worked out by AD.model.predictionScore)
  function predictionSection(ctx, c) {
    const sc = M.predictionScore(ctx.data, c, todayOf(ctx));
    const sums = (sc.sums || []).slice(), assumed = c.prediction ? c.prediction.assumptions : [];
    const more = sums.length || assumed.length ? '<details class="pred__more"><summary>How is this worked out?</summary>' +
      (sums.length ? '<ul class="pred__list">' + sums.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
      (assumed.length ? '<p class="pred__head">What Claude assumed</p><ul class="pred__list">' + assumed.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") + "</details>" : "";
    return '<div class="drawer__section"><h3 class="drawer__h">Is it doing what Claude predicted?</h3><div class="pred pred--' + esc(sc.state) + '">' +
      '<div class="pred__top"><span class="pred__score num" aria-hidden="true">' + (sc.score === null ? "-" : esc(sc.score)) + "</span>" +
      '<div class="pred__text"><strong class="pred__label">' + esc(sc.label) + '</strong><p class="pred__words">' + esc(M.predictionWords(sc, ctx.data)) + "</p></div></div>" + more + "</div></div>";
  }

  // ---------- The ads in a campaign: a carousel ----------
  function adTitle(ad, at) { return ad.name || ad.headline || "Ad " + (at + 1); }
  function slideHtml(ctx, c, item, at, range) {
    const ad = item.ad, t = item.totals, data = ctx.data, word = M.resultPlural(data), meta = c.platform === "meta";
    const stats = t ? '<dl class="aslide__stats"><div><dt>Spend</dt><dd class="num">' + esc(M.money(t.spend)) + "</dd></div><div><dt>" + esc(word.charAt(0).toUpperCase() + word.slice(1)) + '</dt><dd class="num">' + esc(M.num(t.results)) + "</dd></div>" +
      "<div><dt>" + esc(M.costLabel(data)) + '</dt><dd class="num">' + esc(M.money(t.costPerResult)) + "</dd></div></dl>" :
      '<p class="aslide__none muted">No figures for this ad in ' + esc(range.label.toLowerCase()) + ".</p>";
    const last = newestAction(ctx, function (a) { return a.campaignId === c.id && a.adId === ad.id; });
    const pause = meta && ad.status === "on" && c.status !== "ended" ? '<button type="button" class="btn btn--sm" data-d="pause-ad" data-ad="' + esc(ad.id) + '"' + (inFlight(last) || inFlight(openChange(ctx, c)) ? " disabled" : "") + ">Pause this ad</button>" : "";
    return '<div class="aslide"><div class="aslide__top"><strong class="aslide__name">' + esc(adTitle(ad, at)) + "</strong>" + C.campaignPill(ad.status) + "</div>" +
      preview(ctx, { platform: c.platform }, ad, true) + stats + (pause ? '<div class="aslide__act">' + pause + "</div>" : "") + (last ? actionLine(ctx, last) : "") + "</div>";
  }
  function adsCarousel(ctx, c) {
    const range = rangeOf(ctx), items = M.adsFor(ctx.data, c.id, { from: range.from, to: range.to });
    const body = items.length ? C.carousel(items.map(function (it, i) { return slideHtml(ctx, c, it, i, range); }), state.slide[c.id] || 0, "The ads in " + c.name) :
      C.emptyState("No ads to show yet", "Claude reads your ads’ words the next time it refreshes your figures.");
    return '<div class="drawer__section" data-section="campaign-ads"><h3 class="drawer__h">The ads</h3>' + body + "</div>";
  }

  // ---------- Claude's newest analysis ----------
  function listBlock(title, list) {
    return list.length ? '<div class="anl__block"><h4 class="anl__title">' + esc(title) + '</h4><ul class="anl__list">' + list.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>" : "";
  }
  function analysisSection(ctx, c) {
    const mine = (ctx.data.analyses || []).filter(function (a) { return a.campaignId === c.id; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    const a = mine[0], asked = !!c.request || !!state.asking[c.id];
    const day = a && M.localDay(a.at) ? M.dayLabel(M.localDay(a.at)) : "";
    const banner = c.request ? '<div class="drawer__banner"><span>' + icon("sparkle") + "<span>Claude has been asked to analyse this campaign. It appears here when it’s done.</span></span><span>Nothing happening? Open the folder in Claude and say " + C.say("analyse my campaign") + "</span></div>" : "";
    const body = a ? '<div class="anl"><p class="anl__date muted">' + (day ? "Claude’s latest look, " + esc(day) : "Claude’s latest look") + '</p><p class="anl__summary">' + esc(a.summary) + "</p>" +
      listBlock("What’s working", a.working) + listBlock("What’s wasting money", a.wasting) + listBlock("What Claude couldn’t see", a.couldNotSee) + "</div>" :
      '<p class="drawer__small muted">Claude hasn’t analysed this campaign yet. It reads your figures and tells you what’s working and what isn’t.</p>';
    return '<div class="drawer__section" data-section="analysis"><h3 class="drawer__h">What Claude thinks</h3>' + banner + body +
      '<textarea class="textarea" rows="2" data-analyse-note aria-label="Anything Claude should look at" placeholder="Anything Claude should look at? (optional)">' + esc(state.analyseNote) + "</textarea>" +
      '<div class="drawer__row"><button type="button" class="btn" data-d="analyse"' + (asked ? " disabled" : "") + ">" + icon("sparkle") + "Analyse campaign</button></div></div>";
  }

  // ---------- What can be done with the campaign ----------
  function openChange(ctx, c) { return newestAction(ctx, function (a) { return a.campaignId === c.id && inFlight(a); }); }
  function doSection(ctx, c) {
    const meta = c.platform === "meta", m = managerOf(c.platform), link = safeLink(c.url) || m.openUrl, busy = !!openChange(ctx, c);
    const run = '<button type="button" class="btn" data-d="run">' + icon("refresh") + "Run campaign</button>";
    let body;
    if (meta) {
      const last = newestAction(ctx, function (a) { return a.campaignId === c.id && !a.adId; });
      body = '<p class="drawer__small muted">' + esc(NOTHING_CHANGES) + " Each change opens a pop-up that says exactly what will happen. Claude makes only that one change and reads it back.</p>" +
        '<div class="drawer__row">' + (c.status === "on" ? '<button type="button" class="btn" data-d="pause-campaign"' + (busy ? " disabled" : "") + ">Pause campaign</button>" :
          c.status === "paused" ? '<button type="button" class="btn btn--primary" data-d="switch-on-campaign"' + (busy ? " disabled" : "") + ">" + icon("zap") + "Switch on</button>" : "") +
        (c.status !== "ended" ? '<button type="button" class="btn" data-d="budget"' + (busy ? " disabled" : "") + ">Change daily budget</button>" : "") + run + "</div>" + actionLine(ctx, last);
    } else {
      const kind = state.gChange;
      body = '<p class="drawer__small muted">Google Ads is changed by you, in Google Ads. Say what you want and it goes on your task list, ready for you to make.</p>' +
        '<div class="drawer__row">' + (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "Open Google Ads</a>" : "") + run + "</div>" +
        '<div class="gtask"><label class="field"><span class="field__label">Change to make</span>' + select("gchange", [{ value: "pause", label: "Pause it" }, { value: "switch-on", label: "Switch it on" }, { value: "budget", label: "Change the daily budget" }], kind, 'data-gchange aria-label="Change to make in Google Ads"') + "</label>" +
        '<label class="field gtask__budget"' + (kind === "budget" ? "" : " hidden") + '><span class="field__label">New daily budget</span><span class="adpound"><span aria-hidden="true">' + esc(M.symbol(ctx.data)) + '</span><input class="input input--sm adpound__input" type="number" inputmode="decimal" min="0" step="0.01" data-gbudget value="' + esc(state.gBudget) + '" aria-label="New daily budget"></span></label>' +
        '<div><button type="button" class="btn btn--primary" data-d="google-task">' + icon("plus") + "Add to my task list</button></div></div>";
    }
    return '<div class="drawer__section" data-section="do"><h3 class="drawer__h">What would you like to do?</h3>' + body + "</div>";
  }

  function campaignHtml(ctx, c) {
    const data = ctx.data, row = campaignRow(ctx, c), t = row.totals, range = rangeOf(ctx), m = managerOf(c.platform);
    const link = safeLink(c.url) || m.openUrl;
    const mine = data.suggestions.filter(function (s) { return s.campaignId === c.id && (s.status === "new" || s.status === "approved"); });
    const built = c.buildId && data.builds.some(function (b) { return b.id === c.buildId; });
    return '<div class="drawer__head"><span class="chip chip--quiet">Campaign</span>' + C.platformTag(c.platform) + C.campaignPill(c.status) + C.lightPill(row.light) +
      '<span class="drawer__spacer"></span><button type="button" class="icon-btn" data-d="close" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body adrawer"><h2 class="adrawer__name">' + esc(c.name) + "</h2>" +
      '<p class="adnote">' + icon("lock") + "<span>" + esc(NOTHING_CHANGES) + "</span></p>" +
      // The ads come first, then how it is doing against the prediction, what to do and Claude's view; the details and figures follow
      adsCarousel(ctx, c) + predictionSection(ctx, c) + doSection(ctx, c) + analysisSection(ctx, c) +
      '<div class="props adprops">' +
        (c.objective ? prop("Goal", esc(c.objective)) : "") +
        (c.dailyBudget !== null ? prop("Per day", esc(M.money(c.dailyBudget)) + ' <span class="muted drawer__small">' + esc(monthlyText(M.monthlyEquivalent(c.dailyBudget))) + "</span>") : "") +
        (c.startedAt && M.validIso(c.startedAt) ? prop("Started", esc(M.dayLabel(c.startedAt))) : "") +
        prop("Built by", c.builtBy === "claude" ? "Claude (you switched it on)" : "You") +
      "</div>" +
      '<div class="drawer__section"><h3 class="drawer__h">' + esc(range.label) + '</h3><div class="ctiles">' +
        tile("Spend", esc(M.money(t.spend)), C.delta(row.change.spend, "")) +
        tile(M.resultPlural(data).replace(/^./, function (ch) { return ch.toUpperCase(); }), esc(M.num(t.results)), C.delta(row.change.results, "up")) +
        tile(M.costLabel(data), C.lightDot(row.light) + " " + esc(M.money(t.costPerResult)), C.delta(row.change.costPerResult, "down") + (row.target ? '<span class="muted"> Target ' + esc(M.money(row.target)) + "</span>" : "")) +
        tile("Return", row.roas ? esc(M.roasText(row.roas, ctx.data)) : "-", "") + "</div>" +
        '<p class="drawer__small muted">' + esc(row.light.label) + (row.light.why ? ". " + esc(row.light.why) : "") + "</p></div>" +
      '<div class="drawer__section"><h3 class="drawer__h">The last 12 weeks</h3>' + miniChart(ctx, c) + "</div>" +
      '<div class="drawer__section"><h3 class="drawer__h">Suggestions about it</h3>' +
        (mine.length ? '<ul class="adsugs">' + mine.map(function (s) {
          return '<li class="adsug"><div class="adsug__top"><span class="chip">' + esc(SUGGESTION_KINDS[s.kind] || "Other") + "</span>" + (s.status === "approved" ? '<span class="chip chip--success">You approved it</span>' : "") + "</div>" +
            '<strong class="adsug__title">' + esc(s.title) + "</strong>" + (s.why ? '<span class="adsug__why">' + esc(s.why) + "</span>" : "") + "</li>";
        }).join("") + '</ul><div><button type="button" class="btn btn--sm" data-d="go-week">Decide on This week' + icon("arrowRight") + "</button></div>" :
          '<p class="drawer__small muted">Nothing suggested for this campaign. Press “What should I change?” on This week and Claude looks.</p>') + "</div>" +
      (built ? '<div class="drawer__section"><button type="button" class="link-btn" data-d="see-build" data-id="' + esc(c.buildId) + '">See the campaign Claude built</button></div>' : "") + "</div>" +
      '<div class="drawer__foot adfoot"><div class="adfoot__row">' + (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + icon("external") + "Open in " + esc(m.managerName) + "</a>" : "") + "</div></div>";
  }

  // ============================================================
  // Drawing, opening and closing
  // ============================================================

  // Redraws the panel, keeping the scroll position and which control had focus
  function draw() {
    const ctx = ctxNow();
    let thing = null;
    if (state.kind === "build") thing = buildNow();
    else if (state.kind === "campaign") thing = campaignNow();
    if (!thing) { close(); return; }
    state.pendingDraw = false;
    const body = el.querySelector(".drawer__body");
    const scroll = body ? body.scrollTop : 0;
    const all = Array.prototype.slice.call(el.querySelectorAll(FOCUSABLE));
    const focusAt = all.indexOf(document.activeElement);
    el.innerHTML = state.kind === "build" ? buildHtml(ctx, thing) : campaignHtml(ctx, thing);
    el.querySelector(".drawer__body").scrollTop = scroll;
    const again = el.querySelectorAll(FOCUSABLE);
    if (focusAt > -1 && again[focusAt]) again[focusAt].focus({ preventScroll: true });
  }
  function typingInside() {
    const a = document.activeElement;
    return !!a && el.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|url|search|number/.test(a.type)));
  }

  function open(kind, id, ctx) {
    ensureInit();
    if (ctx) lastCtx = ctx;
    if (kind !== "build" && kind !== "campaign") throw new Error("The panel opens a build or a campaign, not " + kind + ".");
    if (state.kind !== kind || state.id !== id) { state.note = ""; state.newCheck = ""; state.notices = []; state.expanded = {}; state.confirmOn = false; state.skipRefresh = false; state.analyseNote = ""; state.gChange = "pause"; state.gBudget = ""; }
    if (el.hidden) state.opener = document.activeElement;
    state.kind = kind;
    state.id = id;
    el.hidden = false;
    scrim.hidden = false;
    document.body.classList.add("has-drawer");
    draw();
    const first = el.querySelector("[data-d=close]");
    setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 30);
    el.classList.remove("is-open");
    void el.offsetWidth;
    el.classList.add("is-open");
  }
  function close() {
    if (!el || (!state.id && el.hidden)) return;
    state.id = null;
    state.kind = null;
    state.skipRefresh = false;
    state.pendingDraw = false;
    state.confirmOn = false;
    el.hidden = true;
    scrim.hidden = true;
    el.innerHTML = "";
    document.body.classList.remove("has-drawer");
    if (state.opener && state.opener.isConnected) state.opener.focus({ preventScroll: true });
    state.opener = null;
  }
  // Called by the app after every data change
  function refresh(ctx) {
    if (ctx) lastCtx = ctx;
    const skip = state.skipRefresh;
    state.skipRefresh = false;
    if (!state.id || skip) return;
    if (typingInside()) { state.pendingDraw = true; return; }
    draw();
  }

  // ============================================================
  // What the buttons do
  // ============================================================

  // While Claude is being asked (the save, then the job), the buttons that ask are switched off. They are
  // switched off in place at the start, so a box that is still being saved isn't redrawn from old data.
  function asking(id, on) {
    if (on) {
      state.asking[id] = true;
      el.querySelectorAll('[data-d="ask-change"], [data-d="build"]').forEach(function (b) { b.disabled = true; });
    } else {
      delete state.asking[id];
      if (state.id === id && !typingInside()) draw();
    }
  }
  function askThenRun(id, saving, job) {
    if (state.asking[id]) return;
    asking(id, true);
    saving().then(function () { return ctxNow().runJob(job); }).catch(failed).then(function () { asking(id, false); });
  }
  function askClaudeTo(kind, note, job, activity) {
    askThenRun(state.id, function () {
      return save(function (b) { b.request = { kind: kind, note: note, at: M.nowIso() }; }, activity);
    }, job);
  }

  function approve() {
    const b = buildNow(), name = nameOf(b), id = b.id;
    save(function (x) { x.status = "approved"; x.approvedAt = M.nowIso(); }, "Approved the campaign “" + name + "”").then(function () {
      toast("Approved. Nothing is built or spent until you ask Claude to build it.", function () {
        updateBuild(id, function (x) { x.status = "draft"; x.approvedAt = null; }, "Took back the approval of “" + name + "”");
      });
    }).catch(failed);
  }
  function drop() {
    const b = buildNow(), name = nameOf(b), before = b.status, id = b.id, approvedAt = b.approvedAt;
    close();
    ctxNow().update(function (d) {
      const x = d.builds.find(function (y) { return y.id === id; });
      x.status = "dropped";
      x.updatedAt = M.nowIso();
    }, "Dropped the campaign “" + name + "”", id).then(function () {
      toast("Dropped “" + name + "”", function () {
        updateBuild(id, function (x) { x.status = before; x.approvedAt = approvedAt; }, "Brought back the campaign “" + name + "”");
      });
    }).catch(failed);
  }
  function switchedOn() {
    const b = buildNow(), name = nameOf(b), id = b.id, before = { status: b.status, switchedOnAt: b.switchedOnAt };
    state.confirmOn = false;
    save(function (x) { x.status = "live"; x.switchedOnAt = M.nowIso(); }, "Marked “" + name + "” as switched on").then(function () {
      toast("Marked as switched on", function () {
        updateBuild(id, function (x) { x.status = before.status; x.switchedOnAt = before.switchedOnAt; }, "Marked “" + name + "” as not switched on after all");
      });
    }).catch(failed);
  }

  function addAd() {
    const b = buildNow(), name = nameOf(b), last = b.ads[b.ads.length - 1], id = M.makeId("a");
    save(function (x) { x.ads.push({ id: id, headline: "", primaryText: "", description: "", cta: last ? last.cta : "", url: last ? last.url : "", media: [] }); }, "Added an ad to “" + name + "”").then(function () {
      toast("Ad added", function () { updateBuild(b.id, function (x) { x.ads = x.ads.filter(function (a) { return a.id !== id; }); }, "Took the new ad off “" + name + "”"); });
    }).catch(failed);
  }
  function removeAd(adId) {
    const b = buildNow(), name = nameOf(b), at = b.ads.findIndex(function (a) { return a.id === adId; }), ad = b.ads[at];
    if (!ad) return;
    save(function (x) { x.ads.splice(x.ads.findIndex(function (a) { return a.id === adId; }), 1); }, "Removed an ad from “" + name + "”").then(function () {
      toast("Ad removed", function () {
        updateBuild(b.id, function (x) { if (!x.ads.some(function (a) { return a.id === adId; })) x.ads.splice(Math.min(at, x.ads.length), 0, ad); }, "Put the ad back on “" + name + "”");
      });
    }).catch(failed);
  }

  function toggleCheck(id) { save(function (b) { const c = b.checks.find(function (x) { return x.id === id; }); if (c) c.done = !c.done; }).catch(failed); }
  function addCheck() {
    const text = state.newCheck.trim();
    if (!text) { toast("Say what to check first"); return; }
    save(function (b) { b.checks.push({ id: M.makeId("c"), text: text, done: false }); }, "Added something to check: " + text).then(function () { state.newCheck = ""; draw(); }).catch(failed);
  }

  function setSeason() {
    const g = function (n) { return el.querySelector('[data-f="' + n + '"]'); };
    const pad = function (v) { return String(v).padStart(2, "0"); };
    const day = function (n) { return Math.min(31, Math.max(1, parseInt(g(n).value, 10) || 1)); };
    const season = { label: g("season-label").value.trim(), from: g("season-from-m").value + "-" + pad(day("season-from-d")), to: g("season-to-m").value + "-" + pad(day("season-to-d")) };
    return save(function (b) { b.season = season; }, "Changed the season on “" + nameOf(buildNow()) + "”").then(refreshGuards);
  }
  // The checks are drawn again in place, so typing in the next box isn't interrupted. The buttons at the foot
  // follow, unless the person is already typing somewhere else.
  function refreshGuards() {
    if (!el || !state.id || state.kind !== "build") return;
    const b = buildNow(), box = el.querySelector("[data-guards]");
    if (!b) return;
    if (box) box.innerHTML = guards(ctxNow(), b);
    if (!typingInside()) draw();
  }

  function sheetPath() {
    const b = buildNow(), path = b.refs.sheet;
    ui.copyText(path).then(function (ok) { toast(ok ? "Copied the path to the build sheet. Open it from your Small Business Toolkit OS folder." : "Couldn’t copy. The build sheet is at " + path); });
  }

  // ---------- Pictures and videos ----------
  function showUploads() {
    if (!el || !state.id) return;
    el.querySelectorAll("[data-uploads]").forEach(function (box) { box.innerHTML = uploadsHtml(box.getAttribute("data-uploads")); });
  }
  function showNotices() {
    const box = el ? el.querySelector("[data-notices]") : null;
    if (box) box.innerHTML = noticesHtml();
  }
  function addFiles(adId, files) {
    const id = state.id;
    Media.addFiles(ctxNow(), id, adId, files, function (message) {
      if (state.id !== id) { toast(message); return; }
      state.notices.push(message);
      showNotices();
    });
  }
  function adFor(adId) { return buildNow().ads.find(function (a) { return a.id === adId; }); }
  function moveMedia(adId, file, step) {
    const at = adFor(adId).media.indexOf(file), to = at + step;
    if (to < 0 || to >= adFor(adId).media.length) return;
    saveAd(adId, function (ad) { ad.media.splice(to, 0, ad.media.splice(at, 1)[0]); }, "Changed the order of the pictures on an ad in “" + nameOf(buildNow()) + "”").catch(failed);
  }
  function removeMedia(adId, file) {
    const b = buildNow(), name = nameOf(b), id = b.id, at = adFor(adId).media.indexOf(file);
    saveAd(adId, function (ad) { ad.media = ad.media.filter(function (f) { return f !== file; }); }, "Took a picture off an ad in “" + name + "”").then(function () {
      toast("Taken off the ad. The file is still in your media folder.", function () {
        updateBuild(id, function (x) {
          const ad = x.ads.find(function (a) { return a.id === adId; });
          if (ad && ad.media.indexOf(file) === -1) ad.media.splice(Math.min(at, ad.media.length), 0, file);
        }, "Put a picture back on an ad in “" + name + "”");
      });
    }).catch(failed);
  }

  // The large view: a simple pop-up with the picture, or the video with its own controls
  function lightbox() {
    let dlg = document.getElementById("mediaLightbox");
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "mediaLightbox";
    dlg.className = "lightbox";
    dlg.addEventListener("click", function (e) {
      const b = e.target.closest("[data-lb]");
      if (e.target === dlg || e.target.classList.contains("lightbox__stage") || (b && b.getAttribute("data-lb") === "close")) dlg.close();
      else if (b) showLightbox(dlg.getAttribute("data-ad"), Number(dlg.getAttribute("data-at")) + (b.getAttribute("data-lb") === "next" ? 1 : -1));
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") showLightbox(dlg.getAttribute("data-ad"), Number(dlg.getAttribute("data-at")) - 1);
      if (e.key === "ArrowRight") showLightbox(dlg.getAttribute("data-ad"), Number(dlg.getAttribute("data-at")) + 1);
    });
    dlg.addEventListener("close", function () { dlg.innerHTML = ""; });
    document.body.appendChild(dlg);
    return dlg;
  }
  function showLightbox(adId, at) {
    const dlg = lightbox(), ad = adFor(adId);
    if (!ad || at < 0 || at >= ad.media.length) return;
    const file = ad.media[at], src = esc(Media.url(file)), label = (Media.kind(file) === "video" ? "Video " : "Picture ") + (at + 1) + " of " + ad.media.length;
    dlg.setAttribute("data-at", at);
    dlg.setAttribute("data-ad", adId);
    dlg.innerHTML = '<div class="lightbox__stage">' + (Media.kind(file) === "video" ? '<video src="' + src + '" controls autoplay playsinline></video>' : '<img src="' + src + '" alt="">') + "</div>" +
      '<div class="lightbox__bar"><button type="button" class="icon-btn" data-lb="prev" aria-label="Previous"' + (at === 0 ? " disabled" : "") + ">" + icon("chevronLeft") + "</button>" +
      '<span class="lightbox__name">' + esc(label) + '</span>' +
      '<button type="button" class="icon-btn" data-lb="next" aria-label="Next"' + (at === ad.media.length - 1 ? " disabled" : "") + ">" + icon("chevronRight") + "</button>" +
      '<button type="button" class="icon-btn" data-lb="close" aria-label="Close">' + icon("x") + "</button></div>";
    if (!dlg.open) dlg.showModal();
  }

  const ACTIONS = {
    close: close,
    approve: approve,
    drop: drop,
    build: function () {
      const b = buildNow(), c = M.buildChecks(ctxNow().data, b, todayOf(ctxNow()));
      if (!c.ok) { toast("Not yet. " + c.warnings.join(" ")); return; }
      const meta = b.platform !== "google";
      askClaudeTo("build", "", "build-in-account", (meta ? "Asked Claude to build “" : "Asked Claude to make the import file for “") + nameOf(b) + "”, switched off");
    },
    "ask-change": function () {
      const note = state.note.trim();
      if (!note) { toast("Say what should change first"); el.querySelector("[data-note]").focus(); return; }
      askClaudeTo("rewrite", note, "write-campaign", "Asked Claude to change “" + nameOf(buildNow()) + "”");
      state.note = "";
    },
    "switched-on": function () { state.confirmOn = true; draw(); const yes = el.querySelector('[data-d="switched-on-yes"]'); if (yes) yes.focus({ preventScroll: true }); },
    "switched-on-yes": switchedOn,
    "switched-on-no": function () { state.confirmOn = false; draw(); },
    sheet: sheetPath,
    "season-add": function () {
      save(function (b) { b.season = { label: "", from: "01-01", to: "12-31" }; }, "Added a season to “" + nameOf(buildNow()) + "”").then(function () { draw(); const l = el.querySelector('[data-f="season-label"]'); if (l) l.focus(); }).catch(failed);
    },
    "season-clear": function () {
      const b = buildNow(), season = b.season, id = b.id, name = nameOf(b);
      save(function (x) { x.season = null; }, "Took the season off “" + name + "”").then(function () {
        toast("Season taken off", function () { updateBuild(id, function (x) { x.season = season; }, "Put the season back on “" + name + "”"); });
      }).catch(failed);
    },
    "ad-add": addAd,
    "ad-remove": function (b) { removeAd(b.getAttribute("data-ad")); },
    "see-more": function (b) {
      const adId = b.getAttribute("data-ad"), box = el.querySelector('[data-ad="' + adId + '"][data-f="primaryText"]');
      state.expanded[adId] = !state.expanded[adId];
      refreshAdLive(adId, box ? box.closest("[data-ad-card]") : null);
    },
    "check-toggle": function (b) { toggleCheck(b.getAttribute("data-id")); },
    "check-add": addCheck,
    "media-pick": function (b) { el.querySelector('[data-media-input][data-ad="' + b.getAttribute("data-ad") + '"]').click(); },
    "media-view": function (b) { const ad = adFor(b.getAttribute("data-ad")); showLightbox(ad.id, ad.media.indexOf(b.getAttribute("data-file"))); },
    "media-earlier": function (b) { moveMedia(b.getAttribute("data-ad"), b.getAttribute("data-file"), -1); },
    "media-later": function (b) { moveMedia(b.getAttribute("data-ad"), b.getAttribute("data-file"), 1); },
    "media-remove": function (b) { removeMedia(b.getAttribute("data-ad"), b.getAttribute("data-file")); },
    "notice-dismiss": function (b) { state.notices.splice(Number(b.getAttribute("data-i")), 1); showNotices(); },
    analyse: function () {
      const note = state.analyseNote.trim();
      state.analyseNote = "";
      ctxNow().analyse(state.id, note);
    },
    run: function () { ctxNow().runCampaign(state.id); },
    "pause-campaign": function () { ctxNow().confirmChange({ kind: "pause", campaignId: state.id }); },
    "switch-on-campaign": function () { ctxNow().confirmChange({ kind: "switch-on", campaignId: state.id }); },
    budget: function () { const c = campaignNow(); ctxNow().confirmChange({ kind: "budget", campaignId: c.id, budgetFrom: c.dailyBudget }); },
    "pause-ad": function (b) { ctxNow().confirmChange({ kind: "pause", campaignId: state.id, adId: b.getAttribute("data-ad") }); },
    "build-switch-on": function () { const b = buildNow(); ctxNow().confirmChange({ kind: "switch-on", buildId: b.id, campaignId: (b.refs && b.refs.campaignId) || "" }); },
    "google-task": function () {
      const raw = state.gBudget.trim(), c = ctxNow();
      c.addGoogleTask(state.id, state.gChange, raw === "" ? null : Number(raw)).then(function (ok) { if (ok) { state.gBudget = ""; } });
    },
    "go-week": function () { const ctx = ctxNow(); close(); ctx.go("week"); },
    "see-build": function (b) { open("build", b.getAttribute("data-id")); }
  };

  // ---------- Typing ----------
  // The words of one ad as they are in its boxes now (not yet saved), for the live counts and preview
  function refreshAdLive(adId, card) {
    const c = card || el.querySelector('[data-ad-card="' + adId + '"]');
    if (!c) return;
    const b = buildNow(), ad = Object.assign({}, adFor(adId));
    ["headline", "primaryText", "description", "cta", "url"].forEach(function (k) { const box = c.querySelector('[data-f="' + k + '"]'); if (box) ad[k] = box.value; });
    ["headline", "primaryText", "description"].forEach(function (k) {
      const n = M.charCount(b.platform, k, ad[k]), out = c.querySelector('[data-count="' + k + '"]');
      if (out) { out.textContent = countText(n); out.classList.toggle("is-over", n.over); }
    });
    c.querySelector("[data-ad-preview]").innerHTML = preview(ctxNow(), b, ad);
  }

  function onInput(e) {
    const t = e.target;
    if (t.hasAttribute("data-note")) state.note = t.value;
    else if (t.hasAttribute("data-analyse-note")) state.analyseNote = t.value;
    else if (t.hasAttribute("data-gbudget")) state.gBudget = t.value;
    else if (t.hasAttribute("data-newcheck")) state.newCheck = t.value;
    else if (t.getAttribute("data-f") === "daily") {
      const out = el.querySelector("[data-monthly]"), v = numberOrNull(t.value);
      if (out) out.textContent = monthlyText(v === null || isNaN(v) ? null : M.monthlyEquivalent(v));
    } else if (t.hasAttribute("data-ad") && /^(headline|primaryText|description|cta|url)$/.test(t.getAttribute("data-f") || "")) refreshAdLive(t.getAttribute("data-ad"), t.closest("[data-ad-card]"));
  }

  // What changes when a box is left (saved quietly, without redrawing, except where the checks must be redone)
  function onChange(e) {
    const t = e.target, f = t.getAttribute("data-f"), adId = t.getAttribute("data-ad");
    if (t.hasAttribute("data-gchange")) {
      state.gChange = t.value;
      const box = el.querySelector(".gtask__budget");
      if (box) box.hidden = t.value !== "budget";
      return;
    }
    if (t.hasAttribute("data-media-input")) {
      const files = Array.prototype.slice.call(t.files);
      t.value = "";
      addFiles(adId, files);
      return;
    }
    if (!f) return;
    const quiet = true;
    if (adId) {
      if (/^(headline|primaryText|description|cta|url)$/.test(f)) saveAd(adId, function (ad) { ad[f] = t.value.trim(); }, null, quiet).catch(failed);
      return;
    }
    if (/^season-/.test(f)) { setSeason().catch(failed); return; }
    switch (f) {
      case "name": save(function (b) { b.name = t.value.trim(); }, null, quiet).catch(failed); break;
      case "objective": save(function (b) { b.objective = t.value.trim(); }, null, quiet).catch(failed); break;
      case "platform": save(function (b) { b.platform = t.value; }, "Changed where “" + nameOf(buildNow()) + "” runs to " + M.platform(t.value).short).catch(failed); break;
      case "start": case "end": {
        const iso = t.value ? M.validIso(t.value) : null, b = buildNow(), other = f === "start" ? b.budget.end : b.budget.start;
        if (iso && other && (f === "start" ? iso > other : iso < other)) { toast("The end date can’t be before the start date"); draw(); return; }
        save(function (x) { x.budget[f] = iso; }, "Changed the " + f + " date of “" + nameOf(b) + "”", quiet).then(refreshGuards).catch(failed);
        break;
      }
      case "daily": {
        const v = numberOrNull(t.value);
        if (v !== null && !(isFinite(v) && v >= 0)) { toast("Enter the daily budget in pounds, for example 15"); draw(); return; }
        save(function (x) { x.budget.daily = v; }, "Changed the daily budget of “" + nameOf(buildNow()) + "”", quiet).then(refreshGuards).catch(failed);
        break;
      }
      case "ageMin": case "ageMax": {
        const v = numberOrNull(t.value);
        if (v !== null && !(isFinite(v) && v >= 13 && v <= 65)) { toast("Ages can be from 13 to 65"); draw(); return; }
        save(function (x) { x.audience[f] = v === null ? null : Math.round(v); }, null, quiet).catch(failed);
        break;
      }
      case "locations": case "interests": case "keywords": case "negativeKeywords":
        save(function (x) { x.audience[f] = lines(t.value); }, null, quiet).catch(failed); break;
      case "notes": save(function (x) { x.audience.notes = t.value.trim(); }, null, quiet).catch(failed); break;
    }
  }

  function trapFocus(e) {
    const items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null && !n.closest("[inert]"); });
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  // Files dragged in from a folder land on an ad's drop area (or anywhere on the panel when there is only one ad);
  // thumbnails dragged within one ad's grid change the order
  function dropTarget(e) {
    const zone = e.target.closest("[data-ad-drop]");
    if (zone) return zone.getAttribute("data-ad-drop");
    const b = state.kind === "build" ? buildNow() : null;
    return b && b.ads.length === 1 ? b.ads[0].id : null;
  }
  function bindMediaDrag() {
    function editable() { const b = state.kind === "build" ? buildNow() : null; return !!b && EDITABLE.indexOf(b.status) > -1; }
    el.addEventListener("dragover", function (e) {
      if (Media.hasFiles(e)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = editable() ? "copy" : "none";
        if (editable()) el.classList.add("is-dropping");
        return;
      }
      if (!state.dragMedia || !e.target.closest("[data-media-grid]")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      el.querySelectorAll(".mtile.is-over").forEach(function (t) { t.classList.remove("is-over"); });
      const tile = e.target.closest("[data-media-id]");
      if (tile) tile.classList.add("is-over");
    });
    el.addEventListener("dragleave", function (e) { if (!el.contains(e.relatedTarget)) el.classList.remove("is-dropping"); });
    el.addEventListener("dragstart", function (e) {
      const tile = e.target.closest("[data-media-id]");
      if (!tile) return;
      state.dragMedia = { adId: tile.getAttribute("data-ad"), file: tile.getAttribute("data-media-id") };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "media:" + state.dragMedia.file);
      tile.classList.add("is-dragging");
    });
    el.addEventListener("dragend", function () {
      state.dragMedia = null;
      el.querySelectorAll(".mtile.is-over, .mtile.is-dragging").forEach(function (t) { t.classList.remove("is-over", "is-dragging"); });
    });
    el.addEventListener("drop", function (e) {
      el.classList.remove("is-dropping");
      if (Media.hasFiles(e)) {
        e.preventDefault();
        if (!editable()) return;
        const adId = dropTarget(e);
        if (!adId) { state.notices.push("Drop the files onto the ad you want them on."); showNotices(); return; }
        addFiles(adId, e.dataTransfer.files);
        return;
      }
      const drag = state.dragMedia, grid = e.target.closest("[data-media-grid]");
      if (!drag || !grid || grid.getAttribute("data-media-grid") !== drag.adId) return;
      e.preventDefault();
      const tile = e.target.closest("[data-media-id]"), before = tile ? tile.getAttribute("data-media-id") : null;
      state.dragMedia = null;
      saveAd(drag.adId, function (ad) {
        ad.media = ad.media.filter(function (f) { return f !== drag.file; });
        const at = before ? ad.media.indexOf(before) : -1;
        ad.media.splice(at < 0 ? ad.media.length : at, 0, drag.file);
      }, "Changed the order of the pictures on an ad in “" + nameOf(buildNow()) + "”").catch(failed);
    });
  }

  // ---------- The carousel of a campaign's ads ----------
  // Moves it in place (so nothing is redrawn) and remembers which ad was showing for when the panel is drawn again
  function slide(box, to) {
    if (!box || state.kind !== "campaign") return;
    state.slide[state.id] = C.carouselStep(box, to);
  }

  // ---------- Starting up ----------
  function ensureInit() {
    if (bound) return;
    el = document.getElementById("drawer");
    scrim = document.getElementById("drawerScrim");
    if (!el || !scrim) throw new Error("The page has no panel to draw the campaign in.");
    bound = true;
    el.addEventListener("click", function (e) {
      const sl = e.target.closest("[data-slide]");
      if (sl && el.contains(sl)) { slide(sl.closest("[data-carousel]"), sl.getAttribute("data-slide")); return; }
      const b = e.target.closest("[data-d]");
      if (b && el.contains(b)) ACTIONS[b.getAttribute("data-d")](b);
    });
    el.setAttribute("data-media-drop", "");
    el.addEventListener("change", onChange);
    el.addEventListener("input", onInput);
    // A redraw held back while the person was typing happens once focus leaves the text boxes
    el.addEventListener("focusout", function () {
      if (!state.pendingDraw) return;
      setTimeout(function () { if (state.pendingDraw && state.id && !typingInside()) draw(); }, 0);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.hasAttribute("data-newcheck")) { e.preventDefault(); addCheck(); }
      // The arrow keys move the ads when the carousel (or one of its buttons) has focus
      const box = e.target.closest ? e.target.closest("[data-carousel]") : null;
      if (box && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); slide(box, e.key === "ArrowLeft" ? "prev" : "next"); }
    });
    // A swipe to the side moves the ads on a touch screen; a mostly vertical drag is left to scroll the panel
    let touch = null;
    el.addEventListener("touchstart", function (e) {
      const box = e.target.closest("[data-carousel]"), t = e.changedTouches[0];
      touch = box && e.touches.length === 1 ? { box: box, x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (!touch) return;
      const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y, box = touch.box;
      touch = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) slide(box, dx < 0 ? "next" : "prev");
    }, { passive: true });
    el.addEventListener("touchcancel", function () { touch = null; }, { passive: true });
    bindMediaDrag();
    Media.watch(showUploads);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (!state.id) return;
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) { e.preventDefault(); close(); }
      if (e.key === "Tab" && !document.querySelector("dialog[open]")) trapFocus(e);
    });
  }
  function init(getContext) { getCtx = getContext; ensureInit(); }

  window.AD.drawer = { init: init, open: open, close: close, refresh: refresh, isOpen: function () { return !!state.id; } };
})();
