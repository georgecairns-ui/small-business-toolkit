/*
  THE FILES PAGES: list, overview, clean-up and review for the folder map
  -----------------------------------------------------------------------
  The map page for folders lives in view-map.js (it shares the map engine with the skills). These are the
  other pages the Files side of the app shows. They read the folder scan through c.f, and work out every
  number from it. Scanning only reads; a file is moved or renamed only when the person presses a Fix button, and nothing is ever deleted.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const FM = window.SM.fmodel, C = window.SM.c, T = window.SM.tidy;
  const F = (window.SM.fview = window.SM.fview || {});

  // Shown before the first folder scan
  function foldersCard(c) {
    const roots = c.f && c.f.settings.roots.length ? c.f.settings.roots : ["~/Documents", "~/Desktop", "~/Downloads"];
    return '<section class="panel setup-card"><div class="setup-card__art"><img src="' + C.ART.thinking + '" alt="" width="72" height="72"></div>' +
      '<div class="setup-card__body"><h2>Let’s map your folders</h2>' +
      '<p class="muted">Claude looks through the folders you choose and draws them as a map you can click into, down to each file. Then it shows what needs tidying: duplicates, very big files, old downloads, untidy names and empty folders.</p>' +
      '<p class="muted"><strong>It reads names, sizes and dates only.</strong> It never opens a file, and nothing is ever deleted. Tidying happens only when you press a Fix button. It starts with ' + roots.map(function (r) { return "<code>" + esc(r) + "</code>"; }).join(", ") + '. You change the list in <button type="button" class="link-btn" data-action="settings">Preferences</button>.</p>' +
      '<div class="setup-card__actions">' + (c.canScan ? '<button type="button" class="btn btn--primary btn--lg" data-action="scan-folders">' + icon("refresh") + "Scan my folders now</button>" : "") + "</div>" +
      '<p class="muted setup-card__alt">' + (c.canScan ? "Or in Claude Code, in your Small Business Toolkit folder, say " : "In Claude Code, in your Small Business Toolkit folder, say ") + C.say("Scan my folders") + "</p></div></section>";
  }
  F.foldersCard = foldersCard;

  function flagChips(d, id) {
    return FM.flagsOf(d, id).map(function (k) {
      const tone = k === "dups" ? "danger" : k === "big" || k === "stale" || k === "oldDownloads" || k === "looseFolders" ? "warning" : "info";
      return '<span class="chip chip--' + tone + '" title="' + esc(FM.findingLabel(k)) + '">' + esc(shortFlag(k)) + "</span>";
    }).join("");
  }
  function shortFlag(k) {
    return { dups: "Duplicate", big: "Very big", stale: "Untouched 2 years", oldDownloads: "Old download", installers: "Installer", messy: "Untidy name", emptyFolders: "Empty", looseFolders: "Crowded", deepFolders: "Buried" }[k] || k;
  }
  F.flagChips = flagChips;
  function typeChip(t) {
    return '<span class="ftype"><span class="ftype__dot" style="background:' + FM.typeColour(t) + '"></span>' + esc(FM.typeLabel(t)) + "</span>";
  }
  F.typeChip = typeChip;
  function folderPath(d, id) { const f = FM.folderById(d, id); return f ? f.path : ""; }

  // ============================================================
  // The list: every file the map keeps, and every folder
  // ============================================================

  function filteredFiles(c) {
    const d = c.f, s = c.state;
    const q = s.fq.trim().toLowerCase();
    const ids = s.ffinding ? findingIds(d, s.ffinding) : null;
    let list = d.files.filter(function (x) {
      if (s.ftype && x.type !== s.ftype) return false;
      if (ids && !ids[x.id]) return false;
      if (q && x.name.toLowerCase().indexOf(q) === -1 && folderPath(d, x.folder).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    const dir = s.fsort.dir === "desc" ? -1 : 1, key = s.fsort.key;
    function val(x) {
      if (key === "folder") return folderPath(d, x.folder).toLowerCase();
      if (key === "type") return x.type;
      if (key === "bytes") return x.bytes;
      if (key === "modified") return x.modified;
      return x.name.toLowerCase();
    }
    list = list.slice().sort(function (a, b) { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : a.name < b.name ? -1 : 1) * dir; });
    return list;
  }
  function findingIds(d, key) {
    const out = {};
    const f = d.findings;
    if (key === "dups") f.dups.groups.forEach(function (g) { g.ids.forEach(function (i) { out[i] = true; }); });
    else if (f[key]) f[key].ids.forEach(function (i) { out[i] = true; });
    return out;
  }
  function filteredFolders(c) {
    const d = c.f, s = c.state;
    const q = s.fq.trim().toLowerCase();
    const ids = s.ffinding && /Folders$/.test(s.ffinding) ? findingIds(d, s.ffinding) : null;
    let list = d.folders.filter(function (f) { return (!ids || ids[f.id]) && (!q || f.name.toLowerCase().indexOf(q) > -1 || f.path.toLowerCase().indexOf(q) > -1); });
    const dir = s.fsort.dir === "desc" ? -1 : 1, key = s.fsort.key;
    function val(f) { return key === "bytes" ? f.total.bytes : key === "files" ? f.total.files : key === "modified" ? f.newest || "" : key === "folder" ? f.path.toLowerCase() : f.name.toLowerCase(); }
    return list.slice().sort(function (a, b) { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : a.name < b.name ? -1 : 1) * dir; });
  }

  function fileRows(c) {
    const list = filteredFiles(c), d = c.f;
    if (!list.length) return '<tr><td colspan="6" class="table__none">Nothing matches. Try fewer words, or clear the filters.</td></tr>';
    return list.slice(0, 600).map(function (x) {
      return '<tr class="table__row" data-action="open-file" data-id="' + esc(x.id) + '"><td class="table__name"><button type="button" class="table__link" data-action="open-file" data-id="' + esc(x.id) + '">' + esc(x.name) + '</button><span class="table__desc">' + esc(folderPath(d, x.folder)) + "</span></td>" +
        "<td>" + typeChip(x.type) + '</td><td class="num">' + esc(FM.fmtBytes(x.bytes)) + "</td><td>" + esc(FM.whenLabel(x.modified)) + '</td><td class="table__flags">' + flagChips(d, x.id) + "</td></tr>";
    }).join("") + (list.length > 600 ? '<tr><td colspan="5" class="table__none">Showing the first 600 of ' + FM.fmtCount(list.length) + ". Filter to narrow it down.</td></tr>" : "");
  }
  function folderRows(c) {
    const list = filteredFolders(c), d = c.f;
    if (!list.length) return '<tr><td colspan="5" class="table__none">Nothing matches. Try fewer words, or clear the filters.</td></tr>';
    return list.slice(0, 600).map(function (f) {
      return '<tr class="table__row" data-action="open-folder" data-id="' + esc(f.id) + '"><td class="table__name"><button type="button" class="table__link" data-action="open-folder" data-id="' + esc(f.id) + '">' + esc(f.name) + '</button><span class="table__desc">' + esc(f.path) + "</span></td>" +
        '<td class="num">' + FM.fmtCount(f.total.files) + '</td><td class="num">' + esc(FM.fmtBytes(f.total.bytes)) + "</td><td>" + esc(f.newest ? FM.whenLabel(f.newest) : "Empty") + '</td><td class="table__flags">' + flagChips(d, f.id) + "</td></tr>";
    }).join("");
  }
  function countText(c) {
    const s = c.state;
    if (s.flistMode === "folders") { const n = filteredFolders(c).length; return n === c.f.folders.length ? FM.fmtCount(n) + " folders" : n + " of " + c.f.folders.length + " folders"; }
    const n = filteredFiles(c).length, total = c.f.files.length;
    return n === total ? FM.fmtCount(total) + " files" : FM.fmtCount(n) + " of " + FM.fmtCount(total) + " files";
  }
  F.fileRows = fileRows; F.folderRows = folderRows; F.countText = countText;

  function sortHead(c, cols) {
    const s = c.state;
    return cols.map(function (col) {
      const on = s.fsort.key === col.key;
      if (col.nosort) return '<th scope="col">' + esc(col.label) + "</th>";
      return '<th scope="col" aria-sort="' + (on ? (s.fsort.dir === "desc" ? "descending" : "ascending") : "none") + '"' + (col.num ? ' class="num"' : "") + '><button type="button" class="table__sort' + (on ? " is-on" : "") + '" data-action="files-sort" data-key="' + col.key + '">' + esc(col.label) + (on ? icon("chevronDown", "table__arrow" + (s.fsort.dir === "desc" ? "" : " is-up")) : "") + "</button></th>";
    }).join("");
  }

  const list = {
    title: function () { return "All files"; },
    sub: function (c) { return FM.notSetUp(c.f) ? "" : "Every file and folder the map knows"; },
    render: function (c) {
      const d = c.f, s = c.state;
      if (FM.notSetUp(d)) return '<div class="page page--narrow">' + foldersCard(c) + "</div>";
      const folders = s.flistMode === "folders";
      const types = FM.typeTotals(d);
      const cards = FM.findingCards(d);
      const head = folders
        ? sortHead(c, [{ key: "name", label: "Folder" }, { key: "files", label: "Files", num: true }, { key: "bytes", label: "Size", num: true }, { key: "modified", label: "Last change" }, { key: "x", label: "Notes", nosort: true }])
        : sortHead(c, [{ key: "name", label: "File" }, { key: "type", label: "Type" }, { key: "bytes", label: "Size", num: true }, { key: "modified", label: "Changed" }, { key: "x", label: "Notes", nosort: true }]);
      const note = !folders && d.scan && d.scan.totals && d.scan.totals.files > d.files.length
        ? '<p class="muted drawer__small">The map keeps the biggest and newest files in each folder, and every file named in the tidy-up lists: ' + FM.fmtCount(d.files.length) + " of " + FM.fmtCount(d.scan.totals.files) + ". The Folders list covers everything.</p>" : "";
      return '<div class="page page--wide"><div class="toolbar"><div class="toolbar__group">' +
        '<div class="segmented" role="group" aria-label="Show"><button type="button" data-action="flist-mode" data-mode="files" aria-pressed="' + !folders + '">Files</button><button type="button" data-action="flist-mode" data-mode="folders" aria-pressed="' + folders + '">Folders</button></div>' +
        '<input type="search" class="input skills-q" data-files-q placeholder="Filter by name or folder" value="' + esc(s.fq) + '" aria-label="Filter" autocomplete="off">' +
        (folders ? "" : '<select class="select select--sm" data-files-type aria-label="Kind of file"><option value="">All kinds</option>' + types.map(function (t) { return '<option value="' + t.type + '"' + (s.ftype === t.type ? " selected" : "") + ">" + esc(FM.typeLabel(t.type)) + "</option>"; }).join("") + "</select>") +
        '<select class="select select--sm" data-files-finding aria-label="Worth a look"><option value="">Everything</option>' + cards.filter(function (k) { return folders ? k.folders : !k.folders; }).map(function (k) { return '<option value="' + k.key + '"' + (s.ffinding === k.key ? " selected" : "") + ">" + esc(k.title) + " (" + FM.fmtCount(k.count) + ")</option>"; }).join("") + "</select>" +
        '</div><div class="toolbar__group"><span class="muted" id="fileCount" aria-live="polite">' + esc(countText(c)) + "</span></div></div>" + note +
        '<div class="panel panel--flush table-wrap"><table class="table"><thead><tr>' + head + '</tr></thead><tbody id="fileRows">' + (folders ? folderRows(c) : fileRows(c)) + "</tbody></table></div></div>";
    }
  };

  // ============================================================
  // The overview: what's in there
  // ============================================================

  function typeBar(d) {
    const t = FM.typeTotals(d), total = t.reduce(function (s, x) { return s + x.count; }, 0) || 1;
    return '<div class="stackbar" role="img" aria-label="' + esc(t.map(function (x) { return FM.fmtCount(x.count) + " " + FM.typeLabel(x.type).toLowerCase(); }).join(", ")) + '">' +
      t.map(function (x) { return '<span class="stackbar__part" style="flex:' + x.count + ";background:" + FM.typeColour(x.type) + '" title="' + esc(FM.typeLabel(x.type) + ": " + FM.fmtCount(x.count)) + '"></span>'; }).join("") + "</div>" +
      '<ul class="legend" role="list">' + t.map(function (x) { return '<li><span class="legend__dot" style="background:' + FM.typeColour(x.type) + '"></span>' + esc(FM.typeLabel(x.type)) + ' <strong class="num">' + FM.fmtCount(x.count) + "</strong></li>"; }).join("") + "</ul>";
  }
  function biggestFolders(d) {
    const all = d.folders.filter(function (f) { return !f.root && f.depth <= 2; }).sort(function (a, b) { return b.total.bytes - a.total.bytes; }).slice(0, 8);
    const max = Math.max.apply(null, all.map(function (f) { return f.total.bytes; }).concat([1]));
    return '<div class="hbars">' + all.map(function (f) {
      return '<button type="button" class="hbar" data-action="drill-to" data-id="' + esc(f.id) + '" title="' + esc(f.path) + '"><span class="hbar__name">' + esc(f.name) + '</span><span class="hbar__track"><span class="hbar__fill" style="width:' + Math.max(3, Math.round(f.total.bytes / max * 100)) + '%"></span></span><span class="hbar__n num">' + esc(FM.fmtBytes(f.total.bytes)) + "</span></button>";
    }).join("") + "</div>";
  }
  function rootsPanel(d) {
    const s = d.scan, prev = s.previous;
    const rows = (s.roots || []).map(function (r) {
      return '<li class="source"><span class="source__name">' + esc(r.label) + '</span><span class="source__path">' + esc(r.path) + (r.found ? "" : " (not found)") + '</span><span class="source__n num">' + (r.found ? FM.fmtCount(r.files) + " files" : "") + "</span></li>";
    }).join("");
    const diff = prev && prev.files != null ? " " + (s.totals.files === prev.files ? "The same number of files as the scan before." : Math.abs(s.totals.files - prev.files) + (s.totals.files > prev.files ? " more" : " fewer") + " files than the scan before.") : "";
    const notes = (s.warnings || []).map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("");
    return C.sectionHead("The last scan", { icon: "refresh", right: '<button type="button" class="btn btn--sm" data-action="scan-folders">' + icon("refresh") + "Scan again</button>" }) +
      '<p class="muted">' + esc(FM.scanLabel(d)) + "." + esc(diff) + "</p>" + '<ul class="sources" role="list">' + rows + "</ul>" +
      '<p class="muted drawer__small">Only names, sizes and dates are read. Nothing is opened, and nothing is deleted. Scanning changes nothing.</p>' + (notes ? '<div class="notes"><strong>Notes from the scan</strong><ul>' + notes + "</ul></div>" : "");
  }
  const overview = {
    title: function () { return "Overview"; },
    sub: function (c) { return FM.notSetUp(c.f) ? "" : FM.scanLabel(c.f); },
    render: function (c) {
      const d = c.f;
      if (FM.notSetUp(d)) return '<div class="page page--narrow">' + foldersCard(c) + "</div>";
      const n = FM.numbers(d);
      const top = d.files.slice().sort(function (a, b) { return b.bytes - a.bytes; }).slice(0, 8);
      return '<div class="page"><div class="stats">' +
        C.stat(n.files, n.files === 1 ? "file" : "files", FM.fmtCount(n.folders) + " folders") +
        C.stat(FM.fmtBytes(n.bytes), "in all", "across " + n.roots + (n.roots === 1 ? " folder" : " folders")) +
        C.stat(n.dupSets, n.dupSets === 1 ? "set of duplicates" : "sets of duplicates", n.dupSets ? FM.fmtBytes(n.dupBytes) + " repeated" : "", n.dupSets ? "bad" : "good") +
        C.stat(n.oldDl, "old downloads", "untouched for 90 days", n.oldDl ? "warn" : "good") +
        C.stat(n.empty, n.empty === 1 ? "empty folder" : "empty folders", "", n.empty ? "warn" : "good") + "</div>" +
        '<div class="grid-2"><section class="panel">' + C.sectionHead("What it’s made of", { icon: "folder" }) + typeBar(d) + "</section>" +
        '<section class="panel">' + C.sectionHead("Biggest folders", { icon: "barChart" }) + biggestFolders(d) + "</section></div>" +
        '<div class="grid-2"><section class="panel">' + C.sectionHead("Biggest files", { icon: "trendingUp" }) +
        '<ul class="hlist hlist--plain" role="list">' + top.map(function (x) { return '<li><button type="button" class="hrow hrow--btn" data-action="open-file" data-id="' + esc(x.id) + '"><span class="hrow__main"><span class="hrow__title">' + esc(x.name) + '</span><span class="hrow__sub">' + esc(folderPath(d, x.folder)) + '</span></span><span class="hrow__meta num">' + esc(FM.fmtBytes(x.bytes)) + "</span></button></li>"; }).join("") + "</ul></section>" +
        '<section class="panel">' + rootsPanel(d) + "</section></div></div>";
    }
  };

  // ============================================================
  // Clean-up: what needs tidying, biggest first
  // ============================================================

  function examples(d, card) {
    if (card.folders) return card.ids.slice(0, 3).map(function (id) { const f = FM.folderById(d, id); return f ? f.path : null; }).filter(Boolean);
    if (card.key === "dups") return d.findings.dups.groups.slice(0, 3).map(function (g) { return g.name + " (" + g.count + " copies)"; });
    return card.ids.slice(0, 3).map(function (id) { const x = FM.fileById(d, id); return x ? x.name : null; }).filter(Boolean);
  }
  const gaps = {
    title: function () { return "Clean-up"; },
    sub: function (c) { return FM.notSetUp(c.f) ? "" : FM.findingCards(c.f).length + " things worth tidying"; },
    render: function (c) {
      const d = c.f;
      if (FM.notSetUp(d)) return '<div class="page page--narrow">' + foldersCard(c) + "</div>";
      const cards = FM.findingCards(d);
      const n = FM.numbers(d);
      return '<div class="page"><div class="gaps-intro"><p class="gaps-intro__line">' + (cards.length
        ? "<strong class=\"num\">" + cards.length + "</strong> " + (cards.length === 1 ? "thing" : "things") + " worth tidying across <strong class=\"num\">" + FM.fmtCount(n.files) + "</strong> files." + (n.dupSets ? " Up to <strong class=\"num\">" + esc(FM.fmtBytes(n.dupBytes)) + "</strong> is repeated copies." : "")
        : "Nothing needs tidying. Your folders are in good shape.") + '</p><button type="button" class="btn btn--primary" data-action="review-folders">' + icon("sparkle") + "Review my folders</button></div>" +
        '<div class="gaps">' + cards.map(function (k) {
          const ex = examples(d, k);
          return '<section class="gap"><div class="gap__head"><h3>' + esc(k.title) + '</h3><span class="chip chip--' + k.tone + ' num">' + FM.fmtCount(k.count) + "</span></div>" +
            '<p class="gap__blurb">' + esc(k.why) + "</p>" + (k.bytes ? '<p class="gap__size num">' + esc(FM.fmtBytes(k.bytes)) + (k.key === "dups" ? " repeated" : " in these files") + "</p>" : "") +
            (ex.length ? '<ul class="gap__ideas">' + ex.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
            '<div class="gap__actions">' + (T.filesPlan(d, k.key) ? '<button type="button" class="btn btn--sm btn--primary" data-action="fix" data-lens="files" data-key="' + k.key + '">' + icon("sparkle") + esc(T.filesPlan(d, k.key).button) + "</button>" : "") + '<button type="button" class="btn btn--sm" data-action="show-finding" data-key="' + k.key + '">' + icon("list") + "See them</button>" +
            (k.ids.length ? '<button type="button" class="btn btn--sm" data-action="finding-on-map" data-key="' + k.key + '">' + icon("map") + "Find on the map</button>" : "") + "</div></section>";
        }).join("") + "</div>" +
        C.tidiedSoFar(T.history(c.t, "files")) + '<section class="panel panel--accent gaps-cta"><div><h2>Want a hand tidying up?</h2><p class="muted">Get AI Powers shows your team how to keep folders and files in order, and sets Claude up to help.</p></div>' +
        '<a class="btn btn--primary" href="https://getaipowers.com" target="_blank" rel="noopener">' + icon("external") + "getaipowers.com</a></section></div>";
    }
  };

  // ============================================================
  // Review: Claude's suggestions about the folders, and the duplicate sets
  // ============================================================

  const KINDS = { tidy: { label: "Tidy", icon: "folder" }, archive: { label: "Archive", icon: "inbox" }, rename: { label: "Rename", icon: "pencil" }, merge: { label: "Merge folders", icon: "columns" }, "keep-one": { label: "Keep one copy", icon: "columns" }, review: { label: "Take a look", icon: "search" } };
  function recCard(c, r) {
    const d = c.f, k = KINDS[r.kind] || KINDS.review;
    const files = r.fileIds.map(function (id) { return FM.fileById(d, id); }).filter(Boolean);
    const folders = r.folderIds.map(function (id) { return FM.folderById(d, id); }).filter(Boolean);
    const prompt = "Skill and Folder Map OS suggested this about my folders: " + r.title + ". " + (r.why || "") + " Please talk me through it. Don't move, rename or delete anything until I say so.";
    return '<article class="rec enter" data-rec="' + esc(r.id) + '"><div class="rec__icon">' + icon(k.icon) + '</div><div class="rec__body"><div class="rec__top"><span class="chip chip--quiet">' + esc(k.label) + "</span></div><h3>" + esc(r.title) + "</h3>" + (r.why ? '<p class="muted">' + esc(r.why) + "</p>" : "") +
      ((files.length || folders.length) ? '<div class="gap__chips">' + folders.slice(0, 5).map(function (f) { return '<button type="button" class="skill-chip" data-action="open-folder" data-id="' + esc(f.id) + '">' + esc(f.name) + "</button>"; }).join("") + files.slice(0, 6).map(function (x) { return '<button type="button" class="skill-chip is-used" data-action="open-file" data-id="' + esc(x.id) + '">' + esc(x.name) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="rec__actions">' + (T.filesRecPlan(d, r) ? '<button type="button" class="btn btn--sm btn--primary" data-action="fix" data-lens="files" data-key="rec" data-id="' + esc(r.id) + '">' + icon("sparkle") + esc(T.filesRecPlan(d, r).button) + "</button>" : "") + '<button type="button" class="btn btn--sm btn--approve" data-action="frec-done" data-id="' + esc(r.id) + '">' + icon("check") + 'Done</button><button type="button" class="btn btn--sm" data-action="frec-skip" data-id="' + esc(r.id) + '">Not now</button>' +
      '<a class="btn btn--sm btn--ghost" href="' + esc(C.claudeLink(prompt)) + '" title="Opens Claude with this typed in. Nothing is sent until you press send.">' + icon("sparkle") + "Talk it through with Claude</a></div></div></article>";
  }
  function dupSets(d) {
    return d.findings.dups.groups.slice(0, 8).map(function (g) {
      const where = g.ids.map(function (id) { const x = FM.fileById(d, id); return x ? { id: id, path: folderPath(d, x.folder) } : null; }).filter(Boolean);
      return '<div class="spot"><div class="spot__icon spot__icon--bad">' + icon("columns") + '</div><div class="spot__body"><strong>“' + esc(g.name) + "” is in " + g.count + " places</strong>" +
        '<p class="muted">' + esc(FM.fmtBytes(g.bytes)) + " each, " + esc(FM.fmtBytes(g.bytes * (g.count - 1))) + " repeated.</p>" +
        '<ul class="spot__paths" role="list">' + where.slice(0, 5).map(function (w) { return '<li><button type="button" class="link-btn" data-action="open-file" data-id="' + esc(w.id) + '">' + esc(w.path) + "</button></li>"; }).join("") + "</ul></div></div>";
    }).join("");
  }
  const review = {
    title: function () { return "Review"; },
    sub: function (c) { return FM.notSetUp(c.f) ? "" : FM.openRecs(c.f).length ? FM.openRecs(c.f).length + " to look at" : "Nothing waiting"; },
    render: function (c) {
      const d = c.f;
      if (FM.notSetUp(d)) return '<div class="page page--narrow">' + foldersCard(c) + "</div>";
      const recs = FM.openRecs(d), done = FM.doneRecs(d);
      const sets = d.findings.dups.groupCount;
      return '<div class="page page--narrow"><div class="page-intro"><p>Claude looks over your folders and suggests what to tidy. Where it can, there is a button to have Claude do it for you: nothing is ever deleted, files only move into a “Tidied by Claude” folder, and you can undo it.</p>' +
        '<button type="button" class="btn btn--primary" data-action="review-folders">' + icon("sparkle") + "Review my folders</button></div>" +
        '<section class="panel panel--flush">' + C.sectionHead("From Claude", { icon: "sparkle", count: recs.length, accent: recs.length > 0 }) +
        (recs.length ? '<div class="recs">' + recs.map(function (r) { return recCard(c, r); }).join("") + "</div>" : C.empty("thinking", "Nothing from Claude yet", "Press Review my folders and Claude looks through what was found, then suggests what to tidy first.", "", true)) + "</section>" +
        '<section class="panel panel--flush">' + C.sectionHead("Duplicate files", { icon: "alert", count: sets }) +
        (sets ? '<div class="spotted">' + dupSets(d) + "</div>" : '<p class="muted list-empty drawer__pad">No file shares its name and size with another.</p>') + "</section>" +
        (done.length ? '<details class="panel done-list"><summary>Done <span class="badge">' + done.length + '</span></summary><ul class="hlist hlist--plain" role="list">' + done.map(function (r) { return '<li class="muted">' + icon("check") + " " + esc(r.title) + "</li>"; }).join("") + "</ul></details>" : "") + C.tidiedSoFar(T.history(c.t, "files")) + "</div>";
    }
  };

  F.list = list; F.overview = overview; F.gaps = gaps; F.review = review;
  window.SM.views = window.SM.views || {};
  window.SM.views.f = { list: list, overview: overview, gaps: gaps, review: review };
})();
