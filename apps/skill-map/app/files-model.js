/*
  FILES MODEL: the folder and file data and everything you can ask of it
  ----------------------------------------------------------------------
  The folder map lives in one file, data/filemap.json, written by the folder scan
  (apps/skill-map/scan/scan-files.js or scan-files.py) and shared with Claude. This file knows its shape.
  Screens ask questions here ("what's in this folder?", "what needs tidying?") and every click that changes
  something is a function here. app.js saves those changes through the store.

  Sections of filemap.json (version 1):
    settings          roots (the folders to look in), setUp, ignore (names to skip)
    scan              when it ran, which roots were found, totals, warnings
    folders           every folder: path, parent, depth, files and bytes in it and below it, newest and oldest
                      change, a count of each kind of file, whether it goes deeper than the scan walked
    files             the files the map keeps: the biggest and newest in each folder, and every file a finding
                      names. The totals count every file the scan saw
    findings          what the scan spotted: duplicates, big files, old downloads, installers, untidy names,
                      empty, crowded and deep folders
    recommendations   what Claude suggests doing (it suggests; a Fix button acts)

  The scan reads names, sizes and dates only. It never opens a file. Every number on screen is worked out
  here from the scan, never typed in by Claude.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;

  // One colour for each kind of file. These are the map's own glowing palette (the map is always drawn dark).
  const TYPES = {
    document: { label: "Documents", colour: "#34e5ff" },
    spreadsheet: { label: "Spreadsheets", colour: "#9dff5c" },
    slides: { label: "Slides", colour: "#ffb347" },
    image: { label: "Images", colour: "#ff4fd8" },
    design: { label: "Design files", colour: "#8f7bff" },
    video: { label: "Video", colour: "#ff6b6b" },
    audio: { label: "Audio", colour: "#2effb5" },
    code: { label: "Code", colour: "#5aa2ff" },
    archive: { label: "Archives", colour: "#d9dfec" },
    installer: { label: "Installers", colour: "#ff9bd2" },
    other: { label: "Other", colour: "#8793ad" }
  };
  const TYPE_ORDER = ["document", "spreadsheet", "slides", "image", "design", "video", "audio", "code", "archive", "installer", "other"];
  const DAY = 86400000;
  const DEFAULT_SETTINGS = { roots: [], setUp: false, ignore: [] };

  function arr(v) { return Array.isArray(v) ? v : []; }

  // ---------- Reading the file ----------
  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.folders)) throw new Error('The file has no "folders" list.');
  }

  const cache = new WeakMap();
  function normalise(d) {
    d.version = 1;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    d.settings.roots = arr(d.settings.roots);
    d.settings.ignore = arr(d.settings.ignore);
    ["folders", "files", "recommendations"].forEach(function (k) { d[k] = arr(d[k]); });
    if (!d.scan || typeof d.scan !== "object") d.scan = null;
    d.folders = d.folders.filter(function (f) { return f && f.id && f.name != null; });
    d.folders.forEach(function (f) {
      f.direct = f.direct || { files: 0, bytes: 0 };
      f.total = f.total || { files: 0, bytes: 0 };
      f.types = f.types || {};
    });
    d.files = d.files.filter(function (x) { return x && x.id && x.name != null && x.folder; });
    const fd = d.findings && typeof d.findings === "object" ? d.findings : {};
    d.findings = {
      dups: Object.assign({ groupCount: 0, wastedBytes: 0, groups: [] }, fd.dups || {}),
      big: Object.assign({ count: 0, bytes: 0, ids: [] }, fd.big || {}),
      stale: Object.assign({ count: 0, bytes: 0, ids: [] }, fd.stale || {}),
      oldDownloads: Object.assign({ count: 0, bytes: 0, ids: [] }, fd.oldDownloads || {}),
      installers: Object.assign({ count: 0, bytes: 0, ids: [] }, fd.installers || {}),
      messy: Object.assign({ count: 0, bytes: 0, ids: [] }, fd.messy || {}),
      emptyFolders: Object.assign({ count: 0, ids: [] }, fd.emptyFolders || {}),
      looseFolders: Object.assign({ count: 0, ids: [] }, fd.looseFolders || {}),
      deepFolders: Object.assign({ count: 0, ids: [] }, fd.deepFolders || {})
    };
    d.recommendations = d.recommendations.filter(function (r) { return r && r.id && r.title; });
    d.recommendations.forEach(function (r) { r.fileIds = arr(r.fileIds); r.folderIds = arr(r.folderIds); r.status = r.status || "open"; });
    cache.delete(d);
    return d;
  }

  // ---------- Indexes, built once per version of the data ----------
  function index(d) {
    let ix = cache.get(d);
    if (ix) return ix;
    ix = { folder: {}, file: {}, kids: {}, filesIn: {}, roots: [], flags: {}, sample: {} };
    d.folders.forEach(function (f) { ix.folder[f.id] = f; ix.kids[f.id] = []; });
    d.folders.forEach(function (f) { if (f.parent && ix.kids[f.parent]) ix.kids[f.parent].push(f); else if (!f.parent) ix.roots.push(f); });
    Object.keys(ix.kids).forEach(function (k) { ix.kids[k].sort(function (a, b) { return b.total.bytes - a.total.bytes || (a.name < b.name ? -1 : 1); }); });
    ix.roots.sort(function (a, b) { return b.total.bytes - a.total.bytes || (a.name < b.name ? -1 : 1); });
    d.files.forEach(function (x) { ix.file[x.id] = x; (ix.filesIn[x.folder] = ix.filesIn[x.folder] || []).push(x); });
    const f = d.findings;
    function flag(ids, key) { arr(ids).forEach(function (id) { (ix.flags[id] = ix.flags[id] || []).push(key); }); }
    arr(f.dups.groups).forEach(function (g) { flag(g.ids, "dups"); });
    ["big", "stale", "oldDownloads", "installers", "messy"].forEach(function (k) { flag(f[k].ids, k); });
    ["emptyFolders", "looseFolders", "deepFolders"].forEach(function (k) { flag(f[k].ids, k); });
    cache.set(d, ix);
    return ix;
  }
  function folderById(d, id) { return index(d).folder[id] || null; }
  function fileById(d, id) { return index(d).file[id] || null; }
  function kidsOf(d, id) { return index(d).kids[id] || []; }
  function rootsOf(d) { return index(d).roots; }
  function filesIn(d, id) { return index(d).filesIn[id] || []; }
  function flagsOf(d, id) { return index(d).flags[id] || []; }
  function crumbs(d, id) {
    const out = [];
    let f = folderById(d, id);
    while (f) { out.unshift(f); f = f.parent ? folderById(d, f.parent) : null; }
    return out;
  }
  // The largest stored files anywhere below a folder, for the dots round its hub on the map
  function sampleBelow(d, id, count) {
    const ix = index(d);
    const key = id + "|" + count;
    if (ix.sample[key]) return ix.sample[key];
    const out = [];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      (ix.filesIn[cur] || []).forEach(function (x) { out.push(x); });
      (ix.kids[cur] || []).forEach(function (k) { stack.push(k.id); });
    }
    out.sort(function (a, b) { return b.bytes - a.bytes || (a.id < b.id ? -1 : 1); });
    ix.sample[key] = out.slice(0, count);
    return ix.sample[key];
  }

  // ---------- Words and numbers ----------
  function fmtBytes(b) {
    b = Number(b) || 0;
    if (b >= 1073741824) return (b / 1073741824).toFixed(b >= 10737418240 ? 0 : 1).replace(/\.0$/, "") + " GB";
    if (b >= 1048576) return Math.round(b / 1048576) + " MB";
    if (b >= 1024) return Math.round(b / 1024) + " KB";
    return b + " B";
  }
  function fmtCount(n) { return Number(n || 0).toLocaleString("en-GB"); }
  function daysSince(iso) {
    const t = iso ? new Date(String(iso).length === 10 ? iso + "T12:00:00Z" : iso).getTime() : NaN;
    return isNaN(t) ? null : Math.floor((Date.now() - t) / DAY);
  }
  function whenLabel(iso) {
    const n = daysSince(iso);
    if (n === null) return "Unknown";
    if (n <= 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n < 31) return n + " days ago";
    if (n < 365) { const m = Math.round(n / 30); return m + (m === 1 ? " month ago" : " months ago"); }
    const y = Math.floor(n / 365);
    return y + (y === 1 ? " year ago" : " years ago");
  }
  function scanLabel(d) {
    if (!d || !d.scan || !d.scan.at) return "Not scanned yet";
    const n = daysSince(d.scan.at);
    const clock = new Date(d.scan.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (n <= 0) return "Scanned today at " + clock;
    if (n === 1) return "Scanned yesterday";
    return "Scanned " + n + " days ago";
  }
  function typeLabel(t) { return (TYPES[t] || TYPES.other).label; }
  function typeColour(t) { return (TYPES[t] || TYPES.other).colour; }
  // Recent change: used to make the dot bright and let it pulse
  function recency(x) { const n = daysSince(x.modified); return n === null ? 0 : n <= 14 ? 3 : n <= 90 ? 1 : 0; }

  // ---------- Questions the screens ask ----------
  function notSetUp(d) { return !d || !d.scan || !d.folders.length; }
  function numbers(d) {
    const t = d.scan && d.scan.totals ? d.scan.totals : { folders: d.folders.length, files: 0, bytes: 0 };
    const f = d.findings;
    return {
      files: t.files, folders: t.folders, bytes: t.bytes, stored: d.files.length,
      dupSets: f.dups.groupCount, dupBytes: f.dups.wastedBytes, big: f.big.count, stale: f.stale.count, oldDl: f.oldDownloads.count,
      installers: f.installers.count, messy: f.messy.count, empty: f.emptyFolders.count, loose: f.looseFolders.count, deep: f.deepFolders.count,
      worth: findingCards(d).length, roots: rootsOf(d).length
    };
  }
  function typeTotals(d) {
    const out = {};
    rootsOf(d).forEach(function (r) { Object.keys(r.types).forEach(function (t) { out[t] = (out[t] || 0) + r.types[t]; }); });
    return TYPE_ORDER.filter(function (t) { return out[t]; }).map(function (t) { return { type: t, count: out[t] }; });
  }

  const FINDING_TEXT = {
    dups: { title: "Duplicate files", why: "The same name and size in 2 or more places. Keep one copy and the others are free space.", tone: "danger" },
    big: { title: "Very big files", why: "Files over 100 MB. Worth knowing where they are, and whether you still need them.", tone: "warning" },
    stale: { title: "Big files nobody has touched in 2 years", why: "Over 10 MB and not changed for 2 years. Good candidates for an archive or a backup drive.", tone: "warning" },
    oldDownloads: { title: "Old files in Downloads", why: "Not changed for over 90 days. Downloads is meant to be a waiting room, not a home.", tone: "warning" },
    installers: { title: "Installers", why: "Disk images and installers. Once the app is installed, these can usually go.", tone: "info" },
    messy: { title: "Untidy names", why: "Names like “final final”, “copy”, “Untitled” or “(1)” make the right file hard to find.", tone: "info" },
    emptyFolders: { title: "Empty folders", why: "Folders with nothing in them. Clutter in the sidebar and in your head.", tone: "info", folders: true },
    looseFolders: { title: "Crowded folders", why: "Folders with 100 or more loose files in them. They need sub-folders.", tone: "warning", folders: true },
    deepFolders: { title: "Buried folders", why: "Folders 7 or more levels down. If you can't remember how to get there, neither can anyone else.", tone: "info", folders: true }
  };
  const FINDING_ORDER = ["dups", "big", "stale", "oldDownloads", "installers", "messy", "looseFolders", "emptyFolders", "deepFolders"];
  // The things worth tidying, biggest first. Counts and sizes come straight from the scan.
  function findingCards(d) {
    const f = d.findings;
    const out = [];
    FINDING_ORDER.forEach(function (k) {
      const x = f[k], text = FINDING_TEXT[k];
      const count = k === "dups" ? x.groupCount : x.count;
      if (!count) return;
      out.push({ key: k, title: text.title, why: text.why, tone: text.tone, folders: !!text.folders, count: count, bytes: k === "dups" ? x.wastedBytes : x.bytes || 0, ids: k === "dups" ? [].concat.apply([], arr(x.groups).map(function (g) { return g.ids; })) : arr(x.ids) });
    });
    return out;
  }
  function findingLabel(key) { return (FINDING_TEXT[key] || { title: key }).title; }

  function search(d, q) {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return [];
    const scored = [];
    d.folders.forEach(function (f) {
      const n = f.name.toLowerCase();
      const score = n === s ? 100 : n.indexOf(s) === 0 ? 80 : n.indexOf(s) > -1 ? 60 : f.path.toLowerCase().indexOf(s) > -1 ? 20 : 0;
      if (score) scored.push({ kind: "folder", id: f.id, name: f.name, path: f.path, score: score + 1 });
    });
    d.files.forEach(function (x) {
      const n = x.name.toLowerCase();
      const score = n === s ? 100 : n.indexOf(s) === 0 ? 80 : n.indexOf(s) > -1 ? 60 : 0;
      if (score) { const f = folderById(d, x.folder); scored.push({ kind: "file", id: x.id, name: x.name, path: f ? f.path : "", score: score }); }
    });
    scored.sort(function (a, b) { return b.score - a.score || (a.name < b.name ? -1 : 1); });
    return scored.slice(0, 8);
  }

  // ---------- The map's data ----------
  // The folder in focus is the centre; its sub-folders are the hubs; the biggest files below each hub are the dots.
  // Clicking a hub makes that folder the new centre, so the person can go as deep as the folders go.
  function graph(d, focusId, options) {
    const o = options || {};
    const ix = index(d);
    const focus = focusId ? ix.folder[focusId] : null;
    const nodes = [{ id: "core", kind: "core", label: focus ? focus.name : "Your folders", r: 17, group: -1 }];
    const links = [];
    const groups = [];
    const kids = focus ? ix.kids[focus.id] : ix.roots;
    const shown = kids.slice(0, 24);
    let gi = 0;
    function dot(x, hubId, group) {
      const typeOk = !o.type || x.type === o.type;
      const flags = flagsOf(d, x.id);
      if (!typeOk) return null;
      if (o.worth && !flags.length) return null;
      return { id: x.id, kind: "skill", label: x.name, r: 3.2 + Math.min(6.5, Math.log10(1 + (x.bytes || 0) / 50000) * 1.7), group: group, uses: recency(x), hub: hubId, colour: typeColour(x.type), flag: flags.length > 0, fileType: x.type, fileKind: "file" };
    }
    function addHub(hub, items) {
      nodes.push(hub);
      links.push({ s: "core", t: hub.id, type: "hub" });
      const seen = {};
      items.forEach(function (x) {
        const n = dot(x, hub.id, hub.group);
        if (!n || seen[x.id]) return;
        seen[x.id] = true;
        nodes.push(n);
        links.push({ s: hub.id, t: n.id, type: "spoke" });
      });
    }
    shown.forEach(function (c) {
      const hub = { id: "hub:" + c.id, kind: "hub", label: c.name, r: 13 + Math.min(14, Math.sqrt(c.total.files) * 0.8), group: gi, count: c.total.files, key: c.id, folderId: c.id, bytes: c.total.bytes, flagged: flagsOf(d, c.id).length > 0 };
      groups.push({ key: c.id, label: c.name, count: c.total.files, bytes: c.total.bytes, drill: true });
      gi++;
      addHub(hub, sampleBelow(d, c.id, o.type || o.worth ? 40 : 9));
    });
    const here = focus ? ix.filesIn[focus.id] || [] : [];
    if (here.length) {
      const sorted = here.slice().sort(function (a, b) { return b.bytes - a.bytes || (a.id < b.id ? -1 : 1); });
      const hub = { id: "hub:here", kind: "hub", label: "Files in this folder", r: 13 + Math.min(14, Math.sqrt(focus.direct.files) * 0.8), group: gi, count: focus.direct.files, key: "here", bytes: focus.direct.bytes };
      groups.push({ key: "here", label: "Files in this folder", count: focus.direct.files, bytes: focus.direct.bytes, drill: false });
      gi++;
      const shownHere = sorted.slice(0, 60);
      if (o.pin && !shownHere.some(function (x) { return x.id === o.pin; })) { const pinned = ix.file[o.pin]; if (pinned && pinned.folder === focus.id) shownHere.push(pinned); }
      addHub(hub, shownHere);
    }
    if (kids.length > shown.length) {
      const rest = kids.slice(shown.length);
      groups.push({ key: "more", label: "+" + rest.length + " smaller folders", count: rest.reduce(function (s, c) { return s + c.total.files; }, 0), bytes: rest.reduce(function (s, c) { return s + c.total.bytes; }, 0), drill: false });
    }
    // Duplicates draw a dashed link between the two copies, when both are on the map
    const onMap = {};
    nodes.forEach(function (n) { if (n.kind === "skill") onMap[n.id] = true; });
    arr(d.findings.dups.groups).forEach(function (g) {
      const ids = g.ids.filter(function (i) { return onMap[i]; });
      for (let i = 1; i < ids.length; i++) links.push({ s: ids[i], t: ids[0], type: "dup" });
    });
    return { nodes: nodes, links: links, groups: groups, focus: focus ? focus.id : null };
  }

  // ---------- Changes the person makes ----------
  const mut = {
    decideRec: function (d, id, status) {
      const r = d.recommendations.find(function (x) { return x.id === id; });
      if (r) { r.status = status; r.decidedAt = new Date().toISOString(); }
    },
    setRoots: function (d, roots) { d.settings.roots = roots; }
  };
  function openRecs(d) { return d.recommendations.filter(function (r) { return r.status === "open"; }); }
  function doneRecs(d) { return d.recommendations.filter(function (r) { return r.status === "done"; }); }

  window.SM = window.SM || {};
  window.SM.fmodel = {
    TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    validate: validate, normalise: normalise, folderById: folderById, fileById: fileById, kidsOf: kidsOf, rootsOf: rootsOf, filesIn: filesIn,
    flagsOf: flagsOf, crumbs: crumbs, sampleBelow: sampleBelow, fmtBytes: fmtBytes, fmtCount: fmtCount, whenLabel: whenLabel, scanLabel: scanLabel,
    typeLabel: typeLabel, typeColour: typeColour, recency: recency, notSetUp: notSetUp, numbers: numbers, typeTotals: typeTotals,
    findingCards: findingCards, findingLabel: findingLabel, search: search, graph: graph, mut: mut, openRecs: openRecs, doneRecs: doneRecs, daysSince: daysSince
  };
})();
