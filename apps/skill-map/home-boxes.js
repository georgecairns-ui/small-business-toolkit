/*
  SKILL MAP OS ON HOME: the boxes this tool adds to the Home dashboard
  --------------------------------------------------------------------
  Loaded by apps/home/home.js after app/model.js (see "home" in menu.json).
  It reads the same map file as the app itself, through the same shared store. On its own, Skill Map
  OS's boxes start switched on. With Task List OS in the folder they start switched off (the person
  turns them on in Home's list), so attaching never changes someone's Home.
*/
(function () {
  "use strict";

  const M = window.SM.model, FM = window.SM.fmodel;
  let fdata = null;
  const ui = window.TaskListOS.ui, esc = ui.esc;
  const PAGE = "../skill-map/#";
  let data = null;

  // Boxes start switched on only when Skill and Folder Map OS is on its own. When Task List OS is in the folder
  // (its Home scripts load first and set window.TL), they start off, so attaching never changes
  // someone's Home. Home reads this once, when it first builds the layout.
  function startOn() { return !window.TL; }
  function box(def) { Object.defineProperty(def, "defaultOn", { get: startOn, enumerable: true }); return def; }

  function empty(text) { return '<p class="hbox__empty">' + esc(text) + "</p>"; }

  // ---------- The boxes ----------
  function skills() {
    if (M.notSetUp(data)) return '<div class="hbox__setup"><p><strong>Let’s map your skills.</strong> In the Claude desktop app, open the Code tab in your Small Business Toolkit OS folder and type <code>/setup</code>, or just say “Scan my skills”. Claude finds your skills and draws them as a map.</p></div>';
    const n = M.numbers(data);
    return '<p class="hstat"><span class="hstat__num">' + n.total + '</span><span class="hstat__label">' + (n.total === 1 ? "skill" : "skills") + " mapped, " + n.used90 + " used in the last " + M.usageDays(data) + " days</span></p>" +
      '<p class="hbox__more">' + esc(M.scanLabel(data)) + ".</p>";
  }
  function attention() {
    if (M.notSetUp(data)) return empty("Once your skills are mapped, the ones worth a look show here.");
    const list = M.unusedList(data).slice(0, 4);
    const dups = M.duplicateGroups(data).length;
    if (!list.length && !dups) return empty("Nothing needs a look. Every skill is in use and none share a name.");
    return '<ul class="hlist" role="list">' +
      (dups ? '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + dups + (dups === 1 ? " name is" : " names are") + ' used twice</span><span class="hrow__sub">Claude can pick the wrong one</span></span></li>' : "") +
      list.map(function (x) { return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(x.name) + '</span><span class="hrow__sub">Not used lately</span></span></li>'; }).join("") + "</ul>";
  }
  function gaps() {
    if (M.notSetUp(data) || !M.hasAreas(data)) return empty("Ask Claude to group your skills and the parts of your business with none show here.");
    const groups = M.groups(data, "area");
    const filled = {};
    groups.forEach(function (g) { if (g.area) filled[g.area.key] = g.nodes.length; });
    const emptyAreas = data.areas.filter(function (a) { return !filled[a.key]; });
    if (!emptyAreas.length) return empty("Every area of your business has a skill in it.");
    return '<p class="hstat"><span class="hstat__num">' + emptyAreas.length + '</span><span class="hstat__label">' + (emptyAreas.length === 1 ? "area has" : "areas have") + " no skill yet</span></p>" +
      '<ul class="hlist" role="list">' + emptyAreas.slice(0, 3).map(function (a) { return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(a.label) + '</span><span class="hrow__sub">' + esc(a.ideas[0] || a.blurb) + "</span></span></li>"; }).join("") + "</ul>";
  }
  function folders() {
    if (!fdata || FM.notSetUp(fdata)) return '<div class="hbox__setup"><p><strong>Let\u2019s map your folders.</strong> Say \u201cScan my folders\u201d to Claude, or open the Files map and press Scan. Claude reads names, sizes and dates only, and shows what to tidy first.</p></div>';
    const n = FM.numbers(fdata), cards = FM.findingCards(fdata);
    return '<p class="hstat"><span class="hstat__num">' + FM.fmtCount(n.files) + '</span><span class="hstat__label">files in ' + FM.fmtCount(n.folders) + " folders, " + esc(FM.fmtBytes(n.bytes)) + "</span></p>" +
      (cards.length ? '<ul class="hlist" role="list">' + cards.slice(0, 3).map(function (k) { return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(k.title) + '</span><span class="hrow__sub">' + FM.fmtCount(k.count) + (k.bytes ? ", " + esc(FM.fmtBytes(k.bytes)) : "") + "</span></span></li>"; }).join("") + "</ul>" : '<p class="hbox__more">Nothing needs tidying.</p>');
  }

  function review() {
    const recs = M.openRecs(data);
    if (!recs.length) return empty("Nothing waiting. When Claude has a suggestion about your skills, it shows here.");
    return '<p class="hstat"><span class="hstat__num">' + recs.length + '</span><span class="hstat__label">' + (recs.length === 1 ? "suggestion" : "suggestions") + " for you to look at</span></p>" +
      '<ul class="hlist" role="list">' + recs.slice(0, 3).map(function (r) { return '<li class="hrow"><span class="hrow__main"><span class="hrow__title">' + esc(r.title) + "</span></span></li>"; }).join("") + "</ul>";
  }

  // ---------- What Home asks of this tool ----------
  window.TaskListOS.home.register("skill-map", {
    boxes: [
      box({ id: "skills", title: "Skills", icon: "map", size: 1, page: PAGE + "map", render: skills }),
      box({ id: "attention", title: "Skills worth a look", icon: "hourglass", size: 1, page: PAGE + "review", render: attention }),
      box({ id: "gaps", title: "Gaps in your business", icon: "target", size: 1, page: PAGE + "gaps", render: gaps }),
      box({ id: "review", title: "Skill suggestions", icon: "sparkle", size: 1, page: PAGE + "review", render: review }),
      box({ id: "folders", title: "Folders and files", icon: "folder", size: 1, page: PAGE + "map", render: folders })
    ],
    greetingName: function () { return data && data.settings.yourName; },
    businessName: function () { return data && data.settings.businessName; },
    start: function (ctx) {
      const def = this;
      const store = window.TaskListOS.createStore({
        moduleId: "skill-map",
        fileName: "skillmap.json",
        dataPaths: ["data", "", "apps/skill-map/data"],
        api: "/api/data/skill-map/skillmap.json",
        validate: M.validate,
        onStatus: function () {},
        onData: function (d) { data = M.normalise(d); def.ready = true; ctx.refresh(); }
      });
      store.start();
      window.TaskListOS.createStore({
        moduleId: "skill-map-files",
        fileName: "filemap.json",
        dataPaths: ["data", "", "apps/skill-map/data"],
        api: "/api/data/skill-map/filemap.json",
        validate: FM.validate,
        onStatus: function () {},
        onData: function (d) { fdata = FM.normalise(d); ctx.refresh(); }
      }).start().catch(function () { /* no folder map file yet: the box shows its setup note */ });
    },
    action: function () {}
  });
})();
