#!/usr/bin/env node
/*
  SKILL AND FOLDER MAP OS: the tidy-up (Node version)
  ----------------------------------------------------
  Does the tidying the person asked for with a button press. The app writes what it wants done into
  apps/skill-map/data/tidy.json (a list of moves, with the person's OK already given), and Claude runs
  this once. It carries out each move, and records exactly what happened so it can be undone.

    node apps/skill-map/tidy/tidy.js              do everything waiting in tidy.json
    node apps/skill-map/tidy/tidy.js --dry-run    say what it would do, change nothing

  tidy.py does the same job with Python. Both behave exactly the same (the test is in
  maintainers/TESTING.md), so keep them in step.

  THE RULES THIS SCRIPT HOLDS TO, whatever the file says:
    - It never deletes anything. Every change is a move or a rename, so every change can be undone.
    - It only touches things inside the folders the person chose in Preferences (the folder map), or
      inside their skill folders. Anything else is refused.
    - A move can only end up in the same chosen folder (folder map) or in the matching "-archive"
      folder next to the skill folder (skills). It never moves anything somewhere else.
    - It never overwrites: if the new name is taken it adds " (2)", " (3)" and so on.
    - It never opens a file, and it skips a file whose size has changed since the scan.
    - It never follows a shortcut (symbolic link) out of a chosen folder.

  Environment overrides, for testing: SKILLMAP_HOME (stands in for the home folder), SKILLMAP_KIT
  (stands in for this folder) and SKILLMAP_NOW (a fixed "now", as an ISO date).
*/
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const HOME = path.resolve(process.env.SKILLMAP_HOME || os.homedir());
const KIT = path.resolve(process.env.SKILLMAP_KIT || path.join(__dirname, "..", "..", ".."));
const DATA = path.join(KIT, "apps", "skill-map", "data");
const NOW = process.env.SKILLMAP_NOW ? new Date(process.env.SKILLMAP_NOW) : new Date();
const DRY = process.argv.indexOf("--dry-run") > -1;
const MAX_MOVES = 5000;

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
}
function expand(p) {
  p = String(p || "");
  if (p === "~") return HOME;
  if (p.indexOf("~/") === 0 || p.indexOf("~\\") === 0) return path.join(HOME, p.slice(2));
  return path.resolve(p);
}
function real(p) { try { return fs.realpathSync(p); } catch (e) { return null; } }
function inside(root, p) {
  const rel = path.relative(root, p);
  return rel !== "" && rel.split(path.sep)[0] !== ".." && !path.isAbsolute(rel);
}
function exists(p) { try { fs.lstatSync(p); return true; } catch (e) { return false; } }
function iso(d) { return d.toISOString(); }

// The folders each lens may touch
function rootsFor(lens) {
  if (lens === "files") {
    const fm = readJson(path.join(DATA, "filemap.json"));
    let list = fm && fm.settings && Array.isArray(fm.settings.roots) ? fm.settings.roots : [];
    if (!list.length) list = ["~/Documents", "~/Desktop", "~/Downloads"];   // the same folders the scan starts with
    return list.map(expand).filter(function (r) { return real(r); }).map(function (r) { return { root: r, archive: null }; });
  }
  const sm = readJson(path.join(DATA, "skillmap.json"));
  const extra = sm && sm.settings && Array.isArray(sm.settings.extraFolders) ? sm.settings.extraFolders : [];
  const list = [path.join(HOME, ".claude", "skills"), path.join(HOME, ".claude", "commands"), path.join(KIT, ".claude", "skills")].concat(extra.map(expand));
  return list.filter(function (r) { return real(r); }).map(function (r) { return { root: r, archive: r + "-archive" }; });
}
// Which chosen folder a path belongs to: { r, base } where base is the folder (or its archive) it sits in
function rootOf(roots, p) {
  for (let i = 0; i < roots.length; i++) {
    if (inside(roots[i].root, p)) return { r: roots[i], base: roots[i].root };
    if (roots[i].archive && inside(roots[i].archive, p)) return { r: roots[i], base: roots[i].archive };
  }
  return null;
}
function parentInside(root, p) {
  const rp = real(path.dirname(p)), rr = real(root);
  return !!rp && !!rr && (rp === rr || inside(rr, rp));
}

function uniqueTo(to) {
  if (!exists(to)) return to;
  const dir = path.dirname(to), ext = path.extname(to), base = path.basename(to, ext);
  for (let n = 2; n < 1000; n++) {
    const t = path.join(dir, base + " (" + n + ")" + ext);
    if (!exists(t)) return t;
  }
  return null;
}

// Carry out one planned move. Returns { status, to?, why? }
function doMove(lens, roots, mv, undo) {
  const from = expand(mv.from), wanted = expand(mv.to);
  const found = rootOf(roots, from);
  if (!found) return { status: "refused", why: "It isn't inside a folder you chose" };
  const r = found.r;
  if (!parentInside(found.base, from)) return { status: "refused", why: "It sits behind a shortcut out of your chosen folder" };
  let st;
  try { st = fs.lstatSync(from); } catch (e) { return { status: "skipped", why: "It isn't there any more" }; }
  if (lens === "files") {
    if (st.isSymbolicLink()) return { status: "refused", why: "It's a shortcut, so it was left alone" };
    if (mv.type === "folder") {
      if (!st.isDirectory()) return { status: "skipped", why: "It isn't a folder any more" };
      if (fs.readdirSync(from).filter(function (n) { return n.charAt(0) !== "."; }).length) return { status: "skipped", why: "It has something in it now" };
    } else {
      if (!st.isFile()) return { status: "skipped", why: "It isn't a file any more" };
      if (typeof mv.bytes === "number" && st.size !== mv.bytes) return { status: "skipped", why: "It has changed since the scan" };
    }
  }
  const allowed = lens === "files" || undo ? r.root : r.archive;
  if (!inside(allowed, wanted)) return { status: "refused", why: "That isn't somewhere it is allowed to go" };
  if (wanted === from) return { status: "skipped", why: "It already has that name" };
  const to = uniqueTo(wanted);
  if (!to) return { status: "skipped", why: "Couldn't find a free name" };
  if (DRY) return { status: "would-move", to: to };
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (!parentInside(allowed, to)) return { status: "refused", why: "That isn't somewhere it is allowed to go" };
    fs.renameSync(from, to);
  } catch (e) {
    return { status: "failed", why: e.code === "EXDEV" ? "It would have to move to another drive" : "The computer wouldn't let it move (" + (e.code || "error") + ")" };
  }
  return { status: "moved", to: to };
}

function runAction(a, actions) {
  const lens = a.lens === "skills" ? "skills" : "files";
  const roots = rootsFor(lens);
  const results = [];
  let moves;
  if (a.kind === "undo") {
    const target = actions.filter(function (x) { return x.id === a.of; })[0];
    if (!target || !Array.isArray(target.results)) { a.status = "failed"; a.note = "There is nothing to undo"; return; }
    if (target.status === "undone") { a.status = "failed"; a.note = "That was already undone"; return; }
    moves = target.results.filter(function (m) { return m.status === "moved"; }).reverse().map(function (m) { return { from: m.to, to: m.from, type: m.type, back: m }; });
  } else {
    moves = Array.isArray(a.plan) ? a.plan : [];
    if (!moves.length) { a.status = "failed"; a.note = a.needsPlan ? "No new names were chosen" : "There was nothing to do"; return; }
    if (moves.length > MAX_MOVES) { a.status = "failed"; a.note = "That is more than " + MAX_MOVES + " things at once. Do it in smaller parts"; return; }
  }
  moves.forEach(function (mv) {
    const res = doMove(lens, roots, mv, a.kind === "undo");
    const row = { from: mv.from, to: res.to || mv.to, status: res.status };
    if (mv.type) row.type = mv.type;
    if (res.why) row.why = res.why;
    results.push(row);
    if (a.kind === "undo" && res.status === "moved") mv.back.status = "undone";
  });
  const moved = results.filter(function (m) { return m.status === "moved" || m.status === "would-move"; }).length;
  a.results = results;
  a.summary = { moved: moved, left: results.length - moved };
  a.status = moved === results.length ? "done" : moved ? "partly" : "failed";
  if (a.kind === "undo") {
    const target = actions.filter(function (x) { return x.id === a.of; })[0];
    const undone = target.results.filter(function (m) { return m.status === "undone"; }).length;
    target.status = undone === target.results.filter(function (m) { return m.status === "undone" || m.status === "moved"; }).length ? "undone" : "partly-undone";
  }
}

function main() {
  const file = path.join(DATA, "tidy.json");
  const d = readJson(file);
  if (!d || !Array.isArray(d.actions)) { console.error("There is no tidy-up list to read at " + file); process.exit(1); }
  const waiting = d.actions.filter(function (a) { return a.status === "queued"; });
  if (!waiting.length) { console.log(JSON.stringify({ done: 0, note: "Nothing is waiting" })); return; }
  waiting.forEach(function (a) {
    runAction(a, d.actions);
    if (!DRY) a.finishedAt = iso(NOW);
  });
  if (DRY) { console.log(JSON.stringify({ dryRun: true, actions: waiting.map(function (a) { return { id: a.id, status: a.status, summary: a.summary || null, note: a.note || null }; }) })); return; }
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + "\n");
  fs.renameSync(tmp, file);
  console.log(JSON.stringify({ done: waiting.length, actions: waiting.map(function (a) { return { id: a.id, status: a.status, summary: a.summary || null, note: a.note || null }; }) }));
}

main();
