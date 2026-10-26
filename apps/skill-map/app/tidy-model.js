/*
  TIDY MODEL: turning "fix this" into a list of moves
  ----------------------------------------------------
  The Clean-up page and the Review page offer a button for each problem. This file works out exactly what
  the button would do: a short list of moves (this file goes there), worked out from the scan, plus the
  plain-English words that go in the "Are you sure?" box.

  Nothing here changes a file. The person sees the plan, presses the button, and the plan is saved into
  data/tidy.json. Claude then runs apps/skill-map/tidy/tidy.js (or tidy.py), which carries the moves out and
  records what happened so it can be undone. The rules the script holds to (never delete, only move inside
  the chosen folders, never overwrite) are written at the top of those files.

  Some fixes need judgement, not just a rule: better names for untidy files, and how to sort a crowded
  folder. Those are saved as "Claude, work out the moves", and Claude fills in the plan before the script runs.

  Sections of tidy.json (version 1):
    actions   each thing the person asked for: lens ("files" or "skills"), kind, title, status
              (queued, done, partly, failed, undone), the plan, and the results the script recorded
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const FM = window.SM.fmodel, M = window.SM.model;

  const ARCHIVE = "Tidied by Claude";
  function arr(v) { return Array.isArray(v) ? v : []; }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function stamp() { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  // ---------- The file ----------
  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.actions)) throw new Error('The file has no "actions" list.');
  }
  function normalise(d) {
    d.version = 1;
    d.actions = arr(d.actions).filter(function (a) { return a && a.id && a.lens && a.kind; });
    return d;
  }
  function empty() { return { version: 1, actions: [] }; }

  // ---------- Reading what has happened ----------
  function waiting(td) { return !!td && td.actions.some(function (a) { return a.status === "queued"; }); }
  function undoOf(td, id) { return td.actions.find(function (a) { return a.kind === "undo" && a.of === id; }) || null; }
  // What has been tidied, newest first (the undo entries themselves are not listed)
  function history(td, lens) {
    if (!td) return [];
    return td.actions.filter(function (a) { return a.lens === lens && a.kind !== "undo"; }).slice().reverse().map(function (a) {
      const u = undoOf(td, a.id);
      const moved = a.summary ? a.summary.moved : 0;
      return {
        id: a.id, title: a.title, status: a.status, at: a.finishedAt || a.createdAt, moved: moved, left: a.summary ? a.summary.left : 0, note: a.note || "",
        undoable: (a.status === "done" || a.status === "partly" || a.status === "partly-undone") && moved > 0 && !(u && u.status === "queued") && a.status !== "undone"
      };
    });
  }

  // ---------- The Files side ----------
  function rootFolder(fd, folderId) {
    let f = FM.folderById(fd, folderId), guard = 0;
    while (f && !f.root && f.parent && guard++ < 40) f = FM.folderById(fd, f.parent);
    return f || null;
  }
  function filePath(fd, x) {
    const f = FM.folderById(fd, x.folder);
    return f ? f.path + "/" + x.name : null;
  }
  function archiveTo(fd, x) {
    const root = rootFolder(fd, x.folder);
    return root ? root.path + "/" + ARCHIVE + "/" + stamp() + "/" + x.name : null;
  }
  // Anything already in a "Tidied by Claude" folder has been dealt with
  function tidied(fd, folderId) {
    const f = FM.folderById(fd, folderId);
    return !!f && (" " + f.path + "/").indexOf("/" + ARCHIVE + "/") > -1;
  }
  function fileMoves(fd, ids) {
    const out = [], seen = {};
    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      const x = FM.fileById(fd, id);
      if (!x || tidied(fd, x.folder)) return;
      const from = filePath(fd, x), to = archiveTo(fd, x);
      if (from && to) out.push({ from: from, to: to, type: "file", bytes: x.bytes || 0, name: x.name });
    });
    return out;
  }
  function sum(moves) { return moves.reduce(function (t, m) { return t + (m.bytes || 0); }, 0); }
  function names(moves, n) { return moves.slice(0, n).map(function (m) { return m.name; }); }

  // Which copy of a duplicated file to keep: the most recently changed, then the one in the shallowest folder
  function keeper(fd, files) {
    return files.slice().sort(function (a, b) {
      if (a.modified !== b.modified) return a.modified < b.modified ? 1 : -1;
      const fa = FM.folderById(fd, a.folder), fb = FM.folderById(fd, b.folder);
      const da = fa ? fa.depth : 99, db = fb ? fb.depth : 99;
      return da - db || (a.id < b.id ? -1 : 1);
    })[0];
  }

  const WHERE = "into a folder called “" + ARCHIVE + "” inside the same folder";
  // The plan for one problem on the Clean-up page, or null when there is no safe button for it
  function filesPlan(fd, key) {
    const card = FM.findingCards(fd).find(function (k) { return k.key === key; });
    if (!card) return null;
    const base = { lens: "files", key: key, reassure: "Nothing is deleted. Everything is moved " + WHERE + ", and you can undo it from this page." };
    if (key === "oldDownloads" || key === "stale" || key === "installers") {
      const moves = fileMoves(fd, card.ids);
      if (!moves.length) return null;
      return Object.assign(base, { kind: "archive", title: "Move " + plural(moves.length, key === "installers" ? "installer" : key === "stale" ? "big old file" : "old Downloads file", key === "installers" ? "installers" : key === "stale" ? "big old files" : "old Downloads files") + " out of the way", button: "Move them out of the way", summary: "Claude will move " + plural(moves.length, "file", "files") + " (" + FM.fmtBytes(sum(moves)) + ") " + WHERE + ".", moves: moves, count: moves.length, bytes: sum(moves), examples: names(moves, 6) });
    }
    if (key === "dups") {
      const moves = [];
      fd.findings.dups.groups.forEach(function (g) {
        const files = g.ids.map(function (id) { return FM.fileById(fd, id); }).filter(function (x) { return x && !tidied(fd, x.folder); });
        if (files.length < 2) return;
        const keep = keeper(fd, files);
        fileMoves(fd, files.filter(function (x) { return x.id !== keep.id; }).map(function (x) { return x.id; })).forEach(function (m) { moves.push(m); });
      });
      if (!moves.length) return null;
      return Object.assign(base, { kind: "keep-one", title: "Keep one copy of each duplicated file", button: "Keep one copy of each", summary: "Claude will keep the most recently changed copy of each file and move the " + plural(moves.length, "extra copy", "extra copies") + " (" + FM.fmtBytes(sum(moves)) + ") " + WHERE + ".", moves: moves, count: moves.length, bytes: sum(moves), examples: names(moves, 6) });
    }
    if (key === "emptyFolders") {
      const moves = [];
      card.ids.forEach(function (id) {
        const f = FM.folderById(fd, id), root = f ? rootFolder(fd, id) : null;
        if (f && root && !f.root && !tidied(fd, id)) moves.push({ from: f.path, to: root.path + "/" + ARCHIVE + "/" + stamp() + "/" + f.name, type: "folder", bytes: 0, name: f.name });
      });
      if (!moves.length) return null;
      return Object.assign(base, { kind: "empty", title: "Clear away " + plural(moves.length, "empty folder", "empty folders"), button: "Clear them away", summary: "Claude will move " + plural(moves.length, "empty folder", "empty folders") + " " + WHERE + ".", moves: moves, count: moves.length, bytes: 0, examples: names(moves, 6) });
    }
    if (key === "messy") {
      const items = card.ids.map(function (id) { const x = FM.fileById(fd, id); return x ? { from: filePath(fd, x), bytes: x.bytes || 0, name: x.name } : null; }).filter(function (i) { return i && i.from; });
      if (!items.length) return null;
      return Object.assign(base, { kind: "rename", task: "rename", needsPlan: true, title: "Give " + plural(items.length, "file", "files") + " clearer names", button: "Give them clearer names", reassure: "Nothing is deleted and nothing leaves its folder. Only the names change, and you can undo it from this page.", summary: "Claude will choose a clearer name for " + plural(items.length, "file", "files") + " (it keeps each file’s type and folder, and only reads the names).", items: items, count: items.length, bytes: sum(items), examples: names(items, 6) });
    }
    if (key === "looseFolders") {
      const items = card.ids.map(function (id) { const f = FM.folderById(fd, id); return f ? { from: f.path, name: f.name, files: f.direct.files } : null; }).filter(Boolean);
      if (!items.length) return null;
      return Object.assign(base, { kind: "sort", task: "sort", needsPlan: true, title: "Sort " + plural(items.length, "crowded folder", "crowded folders") + " into sub-folders", button: "Sort them out", reassure: "Nothing is deleted and nothing leaves its folder. Files are moved into new sub-folders, and you can undo it from this page.", summary: "Claude will look at the names of the loose files in " + plural(items.length, "folder", "folders") + " and sort them into sub-folders that make sense.", items: items, count: items.length, bytes: 0, examples: items.slice(0, 6).map(function (i) { return i.name + " (" + FM.fmtCount(i.files) + " loose files)"; }) });
    }
    return null;
  }

  // The plan for one of Claude's suggestions on the Review page (only some kinds have a safe button)
  function filesRecPlan(fd, r) {
    const base = { lens: "files", key: "rec", reassure: "Nothing is deleted. Everything is moved " + WHERE + ", and you can undo it from this page." };
    const ids = arr(r.fileIds);
    if (r.kind === "archive") {
      const moves = fileMoves(fd, ids);
      if (!moves.length) return null;
      return Object.assign(base, { kind: "archive", title: "Move " + plural(moves.length, "file", "files") + " out of the way", button: "Move them out of the way", summary: "Claude will move " + plural(moves.length, "file", "files") + " (" + FM.fmtBytes(sum(moves)) + ") " + WHERE + ".", moves: moves, count: moves.length, bytes: sum(moves), examples: names(moves, 6) });
    }
    if (r.kind === "keep-one") {
      const files = ids.map(function (id) { return FM.fileById(fd, id); }).filter(function (x) { return x && !tidied(fd, x.folder); });
      const byKey = {};
      files.forEach(function (x) { const k = x.name + "|" + x.bytes; (byKey[k] = byKey[k] || []).push(x); });
      const moves = [];
      Object.keys(byKey).forEach(function (k) {
        if (byKey[k].length < 2) return;
        const keep = keeper(fd, byKey[k]);
        fileMoves(fd, byKey[k].filter(function (x) { return x.id !== keep.id; }).map(function (x) { return x.id; })).forEach(function (m) { moves.push(m); });
      });
      if (!moves.length) return null;
      return Object.assign(base, { kind: "keep-one", title: "Keep one copy of each duplicated file", button: "Keep one copy of each", summary: "Claude will keep the most recently changed copy and move the " + plural(moves.length, "extra copy", "extra copies") + " " + WHERE + ".", moves: moves, count: moves.length, bytes: sum(moves), examples: names(moves, 6) });
    }
    if (r.kind === "rename") {
      const items = ids.map(function (id) { const x = FM.fileById(fd, id); return x && !tidied(fd, x.folder) ? { from: filePath(fd, x), bytes: x.bytes || 0, name: x.name } : null; }).filter(function (i) { return i && i.from; });
      if (!items.length) return null;
      return Object.assign(base, { kind: "rename", task: "rename", needsPlan: true, title: "Give " + plural(items.length, "file", "files") + " clearer names", button: "Give them clearer names", reassure: "Nothing is deleted and nothing leaves its folder. Only the names change, and you can undo it from this page.", summary: "Claude will choose a clearer name for " + plural(items.length, "file", "files") + " (it keeps each file’s type and folder, and only reads the names).", items: items, count: items.length, bytes: sum(items), examples: names(items, 6) });
    }
    return null;
  }

  // ---------- The Skills side ----------
  function sepOf(p) { return p.indexOf("\\") > -1 && p.indexOf("/") === -1 ? "\\" : "/"; }
  function movable(n) { return n.origin === "own" && n.kind !== "area" && n.path && /^(\/|[A-Za-z]:[\\/]|~)/.test(n.path); }
  function skillMove(n) {
    const sep = sepOf(n.path), cut = n.path.lastIndexOf(sep);
    const dir = n.path.slice(0, cut), base = n.path.slice(cut + 1);
    return { from: n.path, to: dir + "-archive" + sep + stamp() + sep + base, type: "skill", name: n.name };
  }
  function skillsPlan(d, key, nodeIds) {
    const base = { lens: "skills", key: key, reassure: "Nothing is deleted. The skills are moved into a folder next to where they were (the same name with “-archive” on the end), and you can undo it from this page." };
    let nodes = [];
    if (key === "unused") nodes = M.unusedList(d).filter(movable);
    else if (key === "recommendation") nodes = arr(nodeIds).map(function (id) { return M.nodeById(d, id); }).filter(function (n) { return n && movable(n); });
    else if (key === "dups") {
      const moves = [];
      M.duplicateGroups(d).forEach(function (g) {
        const own = g.filter(movable);
        if (own.length < 2) return;
        const keep = own.slice().sort(function (a, b) {
          return (b.uses.last90 - a.uses.last90) || (b.uses.total - a.uses.total) || ((a.modified || "") < (b.modified || "") ? 1 : -1) || (a.path.length - b.path.length);
        })[0];
        own.filter(function (n) { return n.id !== keep.id; }).forEach(function (n) { moves.push(skillMove(n)); });
      });
      if (!moves.length) return null;
      return Object.assign(base, { kind: "keep-one", title: "Keep one copy of each duplicated skill", button: "Keep one copy", summary: "Claude will keep the copy that gets used most (or the newest) and move the " + plural(moves.length, "other one", "others") + " into its archive folder.", moves: moves, count: moves.length, bytes: 0, examples: names(moves, 6) });
    }
    if (!nodes.length) return null;
    const moves = nodes.map(skillMove);
    return Object.assign(base, { kind: "retire", title: "Retire " + plural(moves.length, "skill", "skills"), button: key === "unused" ? "Retire them" : "Retire these", summary: "Claude will move " + plural(moves.length, "skill", "skills") + " you haven’t used lately into an archive folder. Skills that came with a plugin or this toolkit are never touched.", moves: moves, count: moves.length, bytes: 0, examples: names(moves, 6) });
  }

  // ---------- Making the action that gets saved ----------
  function makeAction(plan) {
    const a = { id: ui.makeId("t"), lens: plan.lens, kind: plan.kind, key: plan.key, title: plan.title, status: "queued", createdAt: new Date().toISOString() };
    if (plan.needsPlan) {
      a.needsPlan = true; a.task = plan.task; a.items = plan.items.map(function (i) { return i.name ? Object.assign({}, i) : i; }); a.plan = [];
    } else a.plan = plan.moves.map(function (m) { const o = { from: m.from, to: m.to, type: m.type }; if (typeof m.bytes === "number" && m.type === "file") o.bytes = m.bytes; return o; });
    return a;
  }
  function makeUndo(lens, id) {
    return { id: ui.makeId("t"), lens: lens, kind: "undo", of: id, title: "Undo", status: "queued", createdAt: new Date().toISOString() };
  }

  window.SM.tidy = {
    ARCHIVE: ARCHIVE, validate: validate, normalise: normalise, empty: empty, waiting: waiting, history: history,
    filesPlan: filesPlan, filesRecPlan: filesRecPlan, skillsPlan: skillsPlan, makeAction: makeAction, makeUndo: makeUndo, movable: movable
  };
})();
