/*
  THE FILES PANEL: one file, or one folder, slides in from the right
  ------------------------------------------------------------------
  Where it is, how big, when it last changed, what kind it is and why it might need tidying. Opens from the
  map, the lists and every link on the other pages. Reads only what the folder scan saved.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const FM = window.SM.fmodel, C = window.SM.c, F = window.SM.fview;

  function prop(label, value) { return '<div class="prop"><span class="prop__label">' + esc(label) + '</span><span class="prop__value">' + value + "</span></div>"; }
  function why(d, id) {
    const flags = FM.flagsOf(d, id);
    if (!flags.length) return "";
    const all = FM.findingCards(d);
    return '<div class="drawer__section"><h3 class="drawer__h">Worth a look</h3><ul class="gap__ideas">' + flags.map(function (k) {
      const card = all.find(function (x) { return x.key === k; });
      return "<li><strong>" + esc(FM.findingLabel(k)) + ".</strong> " + esc(card ? card.why : "") + "</li>";
    }).join("") + "</ul></div>";
  }

  function file(c, id) {
    const d = c.f, x = FM.fileById(d, id);
    if (!x) return "";
    const folder = FM.folderById(d, x.folder);
    const full = (folder ? folder.path + "/" : "") + x.name;
    const copies = [];
    d.findings.dups.groups.forEach(function (g) { if (g.ids.indexOf(id) > -1) g.ids.forEach(function (o) { if (o !== id) { const y = FM.fileById(d, o); if (y) copies.push(y); } }); });
    const prompt = "Look at my file “" + x.name + "” in " + (folder ? folder.path : "my folders") + ". Tell me whether it looks like something I still need, and where it would be better filed. Don't move, rename or delete anything until I say so.";
    return '<div class="drawer__head"><span class="chip chip--quiet">File</span><span class="drawer__spacer"></span><button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body"><div><h2 class="drawer__name">' + esc(x.name) + '</h2><div class="drawer__chips">' + F.typeChip(x.type) + F.flagChips(d, x.id) + "</div></div>" +
      '<div class="props">' +
        prop("Folder", folder ? '<button type="button" class="link-btn path" data-action="open-folder" data-id="' + esc(folder.id) + '">' + esc(folder.path) + "</button>" : "") +
        prop("Size", esc(x.bytes ? FM.fmtBytes(x.bytes) : "Folder-like item")) +
        prop("Changed", esc(FM.whenLabel(x.modified)) + ' <span class="muted">(' + esc(x.modified) + ")</span>") +
        prop("Kind", esc(FM.typeLabel(x.type)) + (x.ext ? ' <span class="muted">.' + esc(x.ext) + "</span>" : "")) +
        prop("Full path", '<code class="path">' + esc(full) + '</code><button type="button" class="icon-btn icon-btn--sm" data-action="copy" data-text="' + esc(full) + '" aria-label="Copy the path" title="Copy the path">' + icon("fileText") + "</button>") +
      "</div>" + why(d, x.id) +
      (copies.length ? '<div class="drawer__section"><h3 class="drawer__h">Other copies</h3><ul class="hlist hlist--plain" role="list">' + copies.slice(0, 8).map(function (y) { return '<li><button type="button" class="hrow hrow--btn" data-action="open-file" data-id="' + esc(y.id) + '"><span class="hrow__main"><span class="hrow__title">' + esc(y.name) + '</span><span class="hrow__sub">' + esc((FM.folderById(d, y.folder) || {}).path || "") + "</span></span></button></li>"; }).join("") + "</ul></div>" : "") +
      '<p class="drawer__small muted">Skill and Folder Map OS only read this file’s name, size and date. It never opens a file.</p></div>' +
      '<div class="drawer__foot"><button type="button" class="btn btn--sm" data-action="file-on-map" data-id="' + esc(x.id) + '">' + icon("map") + 'Show on the map</button><a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink(prompt)) + '" title="Opens Claude with this typed in. Nothing is sent until you press send.">' + icon("sparkle") + "Look at it with Claude</a></div>";
  }

  function folder(c, id) {
    const d = c.f, f = FM.folderById(d, id);
    if (!f) return "";
    const kids = FM.kidsOf(d, id);
    const types = Object.keys(f.types).sort(function (a, b) { return f.types[b] - f.types[a]; });
    const prompt = "Look at my folder " + f.path + " (" + FM.fmtCount(f.total.files) + " files). Tell me how it could be better organised. Don't move, rename or delete anything until I say so.";
    return '<div class="drawer__head"><span class="chip chip--quiet">Folder</span><span class="drawer__spacer"></span><button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close panel">' + icon("x") + "</button></div>" +
      '<div class="drawer__body"><div><h2 class="drawer__name">' + esc(f.name) + '</h2><div class="drawer__chips">' + F.flagChips(d, f.id) + "</div></div>" +
      '<div class="props">' +
        prop("Where", '<code class="path">' + esc(f.path) + '</code><button type="button" class="icon-btn icon-btn--sm" data-action="copy" data-text="' + esc(f.path) + '" aria-label="Copy the path" title="Copy the path">' + icon("fileText") + "</button>") +
        prop("Files here", FM.fmtCount(f.direct.files) + ' <span class="muted">(' + esc(FM.fmtBytes(f.direct.bytes)) + ")</span>") +
        prop("In all", FM.fmtCount(f.total.files) + ' files <span class="muted">(' + esc(FM.fmtBytes(f.total.bytes)) + ")</span>") +
        prop("Sub-folders", FM.fmtCount(f.subfolders)) +
        prop("Newest change", esc(f.newest ? FM.whenLabel(f.newest) : "Empty")) +
        prop("Oldest change", esc(f.oldest ? FM.whenLabel(f.oldest) : "Empty")) +
      "</div>" + why(d, f.id) +
      (types.length ? '<div class="drawer__section"><h3 class="drawer__h">What’s in it</h3><div class="drawer__chips">' + types.map(function (t) { return '<span class="ftype"><span class="ftype__dot" style="background:' + FM.typeColour(t) + '"></span>' + esc(FM.typeLabel(t)) + ' <strong class="num">' + FM.fmtCount(f.types[t]) + "</strong></span>"; }).join("") + "</div></div>" : "") +
      (kids.length ? '<div class="drawer__section"><h3 class="drawer__h">Folders inside</h3><ul class="hlist hlist--plain" role="list">' + kids.slice(0, 10).map(function (k) { return '<li><button type="button" class="hrow hrow--btn" data-action="open-folder" data-id="' + esc(k.id) + '"><span class="hrow__main"><span class="hrow__title">' + esc(k.name) + '</span><span class="hrow__sub">' + FM.fmtCount(k.total.files) + ' files</span></span><span class="hrow__meta num">' + esc(FM.fmtBytes(k.total.bytes)) + "</span></button></li>"; }).join("") + (kids.length > 10 ? '<li class="muted drawer__small">and ' + (kids.length - 10) + " more</li>" : "") + "</ul></div>" : "") +
      (f.deeper ? '<p class="drawer__small muted">This folder goes deeper than the scan looks. Add the deeper folder in Preferences to see inside it.</p>' : "") + "</div>" +
      '<div class="drawer__foot"><button type="button" class="btn btn--sm" data-action="drill-to" data-id="' + esc(f.id) + '">' + icon("map") + 'Open on the map</button><a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink(prompt)) + '" title="Opens Claude with this typed in. Nothing is sent until you press send.">' + icon("sparkle") + "Look at it with Claude</a></div>";
  }

  window.SM.fdrawer = { file: file, folder: folder };
})();
