#!/usr/bin/env node
/*
  SKILL AND FOLDER MAP OS: the folder scan (Node version)
  --------------------------------------------------------
  Walks the folders the person chose and saves what it found in apps/skill-map/data/filemap.json, for
  the app to draw as a map of folders and files and to point out what needs tidying.

    node apps/skill-map/scan/scan-files.js              scan and save
    node apps/skill-map/scan/scan-files.js --dry-run    scan and print the summary, save nothing

  scan-files.py does the same job with Python. Both write exactly the same file (the test is in
  maintainers/TESTING.md), so keep them in step.

  What it reads: the NAME, size, type and last-changed date of every file and folder inside the folders
  listed in Preferences (settings.roots). It never opens a file, never reads what is inside one, never
  follows a shortcut out of a chosen folder, and never changes, moves or deletes anything.

  It skips hidden items (names starting with a dot), node_modules, the "Tidied by Claude" folders it makes itself, the Library folder of a home folder
  and the inside of app and photo-library bundles (they show up as one item).

  A re-scan keeps the person's settings and the suggestions Claude left.

  Environment overrides, for testing: SKILLMAP_HOME (stands in for the home folder), SKILLMAP_KIT
  (stands in for this folder) and SKILLMAP_NOW (a fixed "now", as an ISO date).
*/
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const HOME = path.resolve(process.env.SKILLMAP_HOME || os.homedir());
const KIT = path.resolve(process.env.SKILLMAP_KIT || path.join(__dirname, "..", "..", ".."));
const DATA_FILE = path.join(KIT, "apps", "skill-map", "data", "filemap.json");
const NOW = process.env.SKILLMAP_NOW ? new Date(process.env.SKILLMAP_NOW) : new Date();
const DAY = 86400000;

const MAX_DEPTH = 10;            // folders deeper than this are counted as "deeper", not walked
const MAX_ITEMS = 400000;        // a safety stop for enormous folders
const STORE_FILES = 15000;       // most files kept in the saved map; the rest are counted
const LIST_CAP = 100;            // most files named in each finding
const BIG_BYTES = 100 * 1024 * 1024;
const STALE_BYTES = 10 * 1024 * 1024;
const STALE_DAYS = 730;
const DOWNLOAD_DAYS = 90;
const LOOSE_FILES = 100;
const DEEP_DEPTH = 7;

const SKIP_DIRS = new Set(["node_modules", "__pycache__", ".git", ".trash", "$recycle.bin", "venv", ".venv", "tidied by claude"]);
const BUNDLE_EXT = new Set([".app", ".photoslibrary", ".xcodeproj", ".bundle", ".framework", ".rtfd", ".pages", ".numbers", ".key", ".sketch"]);
const TYPES = {
  document: ["doc", "docx", "pdf", "txt", "md", "rtf", "odt", "pages", "gdoc", "epub"],
  spreadsheet: ["xls", "xlsx", "csv", "numbers", "ods", "gsheet", "tsv"],
  slides: ["ppt", "pptx", "key", "odp", "gslides"],
  image: ["jpg", "jpeg", "png", "gif", "heic", "webp", "svg", "tif", "tiff", "bmp", "raw", "cr2", "nef"],
  design: ["psd", "ai", "fig", "sketch", "indd", "xd", "afdesign", "afphoto", "eps"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv"],
  audio: ["mp3", "wav", "m4a", "aac", "flac", "aiff", "ogg"],
  code: ["js", "ts", "jsx", "tsx", "py", "html", "css", "json", "sh", "rb", "php", "java", "swift", "go", "c", "cpp"],
  archive: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2"],
  installer: ["dmg", "pkg", "exe", "msi", "iso", "apk"]
};
const TYPE_OF = {};
Object.keys(TYPES).forEach((t) => TYPES[t].forEach((e) => { TYPE_OF[e] = t; }));
const MESSY = /(\bfinal[ _-]*final\b|\bcopy of\b|\(\d+\)(\.[a-z0-9]+)?$|\bcopy( \d+)?(\.[a-z0-9]+)?$|^untitled|^new folder|^document\d*\.|\bfinal[ _-]*v?\d+\b|\bscreenshot \d{4}-\d\d-\d\d)/i;

// ---------- helpers ----------
function fail(message) { process.stderr.write("Folder scan: " + message + "\n"); process.exit(1); }
function exists(p) { try { fs.statSync(p); return true; } catch (e) { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }
function slash(p) { return p.split(path.sep).join("/"); }
function shortPath(p) {
  const rel = path.relative(HOME, p);
  if (rel === "") return "~";
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return "~/" + slash(rel);
  return slash(p);
}
function idFor(prefix, p) { return prefix + crypto.createHash("sha1").update(shortPath(p)).digest("hex").slice(0, 10); }
function day(ms) { return new Date(Math.floor(ms / 1000) * 1000).toISOString().slice(0, 10); }
function cmpStr(a, b) { return Buffer.compare(Buffer.from(a), Buffer.from(b)); }
function extOf(name) { const i = name.lastIndexOf("."); return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : ""; }
function readJson(p) {
  let text;
  try { text = fs.readFileSync(p, "utf8"); } catch (e) { return null; }
  try { return JSON.parse(text); } catch (e) { fail(p + " is not valid JSON (" + e.message + "). Fix or move it, then scan again."); }
}

function loadSettings() {
  const existing = readJson(DATA_FILE);
  const prev = existing && existing.settings && typeof existing.settings === "object" ? existing.settings : {};
  let roots = Array.isArray(prev.roots) ? prev.roots.filter((r) => typeof r === "string" && r.trim()) : null;
  if (!roots || !roots.length) {
    roots = ["Documents", "Desktop", "Downloads"].filter((n) => isDir(path.join(HOME, n))).map((n) => "~/" + n);
  }
  return { existing: existing && typeof existing === "object" ? existing : null, settings: Object.assign({ roots: [], setUp: false, ignore: [] }, prev, { roots: roots }) };
}
function resolveRoot(r) { return path.resolve(String(r).replace(/^~(?=$|[\\/])/, HOME)); }

// ---------- the walk ----------
function walk(rootPath, ctx) {
  const rootId = idFor("f-", rootPath);
  const stack = [{ dir: rootPath, id: rootId, parent: null, depth: 0 }];
  const ignore = ctx.ignore;
  while (stack.length) {
    const cur = stack.pop();
    const folder = { id: cur.id, path: shortPath(cur.dir), name: cur.parent === null ? (path.basename(cur.dir) || cur.dir) : path.basename(cur.dir), parent: cur.parent, depth: cur.depth, root: cur.parent === null,
      direct: { files: 0, bytes: 0 }, total: { files: 0, bytes: 0 }, newest: null, oldest: null, types: {}, subfolders: 0, deeper: false, _abs: cur.dir };
    ctx.folders.push(folder);
    let entries;
    try { entries = fs.readdirSync(cur.dir, { withFileTypes: true }); } catch (e) { ctx.warnings.push("Could not open " + shortPath(cur.dir) + " (" + (e.code || "error") + "). Skipped."); continue; }
    entries.sort((a, b) => cmpStr(a.name, b.name));
    for (const e of entries) {
      if (ctx.items >= MAX_ITEMS) { ctx.truncated = true; break; }
      const name = e.name;
      if (name.startsWith(".")) continue;
      const full = path.join(cur.dir, name);
      if (ignore.has(name.toLowerCase())) continue;
      if (e.isSymbolicLink()) continue;
      const ext = "." + extOf(name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(name.toLowerCase())) continue;
        if (cur.depth === 0 && name === "Library" && path.resolve(cur.dir) === HOME) continue;
        if (BUNDLE_EXT.has(ext)) { ctx.addFile(folder, name, 0, safeMtime(full)); continue; }
        if (cur.depth + 1 > MAX_DEPTH) { folder.deeper = true; continue; }
        folder.subfolders++;
        ctx.items++;
        stack.push({ dir: full, id: idFor("f-", full), parent: cur.id, depth: cur.depth + 1 });
      } else if (e.isFile()) {
        let st;
        try { st = fs.lstatSync(full); } catch (err) { continue; }
        ctx.items++;
        ctx.addFile(folder, name, st.size, st.mtimeMs);
      }
    }
  }
}
function safeMtime(p) { try { return fs.lstatSync(p).mtimeMs; } catch (e) { return NOW.getTime(); } }

function makeCtx(ignoreList) {
  const ctx = { folders: [], files: [], warnings: [], items: 0, truncated: false, ignore: new Set(ignoreList.map((s) => String(s).toLowerCase())) };
  ctx.addFile = function (folder, name, bytes, mtimeMs) {
    const ext = extOf(name);
    const type = BUNDLE_EXT.has("." + ext) ? "other" : TYPE_OF[ext] || "other";
    ctx.files.push({ id: idFor("x-", path.join(folder._abs, name)), folder: folder.id, name: name, ext: ext, type: type, bytes: bytes, modified: day(mtimeMs) });
    folder.direct.files++;
    folder.direct.bytes += bytes;
  };
  return ctx;
}

// ---------- roll the numbers up the tree, then find what needs tidying ----------
function finish(ctx, rootInfo) {
  const byId = new Map(ctx.folders.map((f) => [f.id, f]));
  const kids = new Map();
  ctx.folders.forEach((f) => { if (f.parent) { if (!kids.has(f.parent)) kids.set(f.parent, []); kids.get(f.parent).push(f); } });
  const filesIn = new Map();
  ctx.files.forEach((x) => { if (!filesIn.has(x.folder)) filesIn.set(x.folder, []); filesIn.get(x.folder).push(x); });
  // deepest first, so a folder is added to its parent after its own children were added to it
  const order = ctx.folders.slice().sort((a, b) => b.depth - a.depth || cmpStr(a.path, b.path));
  order.forEach((f) => {
    f.total.files += f.direct.files; f.total.bytes += f.direct.bytes;
    (filesIn.get(f.id) || []).forEach((x) => {
      f.types[x.type] = (f.types[x.type] || 0) + 1;
      if (f.newest === null || x.modified > f.newest) f.newest = x.modified;
      if (f.oldest === null || x.modified < f.oldest) f.oldest = x.modified;
    });
    if (f.parent) {
      const p = byId.get(f.parent);
      p.total.files += f.total.files; p.total.bytes += f.total.bytes;
      Object.keys(f.types).forEach((t) => { p.types[t] = (p.types[t] || 0) + f.types[t]; });
      if (f.newest !== null && (p.newest === null || f.newest > p.newest)) p.newest = f.newest;
      if (f.oldest !== null && (p.oldest === null || f.oldest < p.oldest)) p.oldest = f.oldest;
      if (f.deeper) p.deeper = true;
    }
  });
  // type counts must not double count: a folder's own files were added above, then children were added to the parent
  const cutoff = (n) => day(NOW.getTime() - n * DAY);
  const staleDay = cutoff(STALE_DAYS), dlDay = cutoff(DOWNLOAD_DAYS);
  const rank = (a, b) => b.bytes - a.bytes || cmpStr(a.id, b.id);
  const take = (list, sorter) => list.slice().sort(sorter).slice(0, LIST_CAP).map((x) => x.id);
  const sum = (list) => list.reduce((s, x) => s + x.bytes, 0);
  const folderOf = (x) => byId.get(x.folder);
  const inDownloads = (x) => { let f = folderOf(x); while (f) { if (f.root && f.name.toLowerCase() === "downloads") return true; f = f.parent ? byId.get(f.parent) : null; } return false; };

  const groups = new Map();
  ctx.files.forEach((x) => { if (x.bytes > 0) { const k = x.name.toLowerCase() + "|" + x.bytes; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); } });
  const dupGroups = [];
  groups.forEach((list) => { if (list.length > 1) dupGroups.push(list); });
  dupGroups.sort((a, b) => b[0].bytes * (b.length - 1) - a[0].bytes * (a.length - 1) || cmpStr(a[0].id, b[0].id));
  const dupAll = dupGroups.reduce((s, g) => s + g[0].bytes * (g.length - 1), 0);
  const big = ctx.files.filter((x) => x.bytes >= BIG_BYTES);
  const stale = ctx.files.filter((x) => x.bytes >= STALE_BYTES && x.modified < staleDay);
  const oldDl = ctx.files.filter((x) => x.modified < dlDay && inDownloads(x));
  const installers = ctx.files.filter((x) => x.type === "installer");
  const messy = ctx.files.filter((x) => MESSY.test(x.name));
  const emptyF = ctx.folders.filter((f) => !f.root && f.total.files === 0 && !f.deeper);
  const looseF = ctx.folders.filter((f) => f.direct.files >= LOOSE_FILES);
  const deepF = ctx.folders.filter((f) => f.depth >= DEEP_DEPTH);

  const findings = {
    dups: { groupCount: dupGroups.length, wastedBytes: dupAll, groups: dupGroups.slice(0, LIST_CAP).map((g) => ({ name: g[0].name, bytes: g[0].bytes, count: g.length, ids: g.slice().sort((a, b) => cmpStr(a.id, b.id)).slice(0, 12).map((x) => x.id) })) },
    big: { count: big.length, bytes: sum(big), ids: take(big, rank) },
    stale: { count: stale.length, bytes: sum(stale), ids: take(stale, rank) },
    oldDownloads: { count: oldDl.length, bytes: sum(oldDl), ids: take(oldDl, rank) },
    installers: { count: installers.length, bytes: sum(installers), ids: take(installers, rank) },
    messy: { count: messy.length, bytes: sum(messy), ids: take(messy, (a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : cmpStr(a.id, b.id))) },
    emptyFolders: { count: emptyF.length, ids: emptyF.slice().sort((a, b) => b.depth - a.depth || cmpStr(a.path, b.path)).slice(0, LIST_CAP * 2).map((f) => f.id) },
    looseFolders: { count: looseF.length, ids: looseF.slice().sort((a, b) => b.direct.files - a.direct.files || cmpStr(a.id, b.id)).slice(0, 50).map((f) => f.id) },
    deepFolders: { count: deepF.length, ids: deepF.slice().sort((a, b) => b.depth - a.depth || cmpStr(a.id, b.id)).slice(0, 50).map((f) => f.id) }
  };

  // Which files the saved map keeps: every file a finding names, then the biggest and newest in each folder, within a limit
  const keep = new Set();
  findings.dups.groups.forEach((g) => g.ids.forEach((i) => keep.add(i)));
  ["big", "stale", "oldDownloads", "installers", "messy"].forEach((k) => findings[k].ids.forEach((i) => keep.add(i)));
  const pick = (cap) => {
    const half = Math.ceil(cap / 2);
    const chosen = new Set(keep);
    filesIn.forEach((list) => {
      list.slice().sort(rank).slice(0, half).forEach((x) => chosen.add(x.id));
      list.slice().sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : cmpStr(a.id, b.id))).slice(0, half).forEach((x) => chosen.add(x.id));
    });
    return chosen;
  };
  let chosen = null;
  for (const cap of [300, 120, 50, 20, 8, 2, 0]) { chosen = pick(cap); if (chosen.size <= STORE_FILES) break; }
  const stored = ctx.files.filter((x) => chosen.has(x.id)).sort((a, b) => cmpStr(byId.get(a.folder).path, byId.get(b.folder).path) || cmpStr(a.name, b.name) || cmpStr(a.id, b.id));
  const folders = ctx.folders.slice().sort((a, b) => cmpStr(a.path, b.path)).map((f) => { const o = Object.assign({}, f); delete o._abs; o.types = sortKeys(o.types); return o; });
  return { folders, files: stored, findings, totals: { folders: folders.length, files: ctx.files.length, bytes: sum(ctx.files), storedFiles: stored.length } };
}
function sortKeys(o) { const r = {}; Object.keys(o).sort(cmpStr).forEach((k) => { r[k] = o[k]; }); return r; }

// ---------- put it together ----------
function scan() {
  const loaded = loadSettings();
  const settings = loaded.settings;
  const ctx = makeCtx(settings.ignore || []);
  const rootInfo = [];
  const seen = new Set();
  for (const raw of settings.roots) {
    const p = resolveRoot(raw);
    if (seen.has(p)) continue;
    seen.add(p);
    if (!isDir(p)) { ctx.warnings.push("The folder " + raw + " could not be found. Skipped."); rootInfo.push({ path: shortPath(p), label: path.basename(p) || p, found: false, files: 0, bytes: 0 }); continue; }
    const before = ctx.files.length;
    const beforeBytes = ctx.files.reduce((s, x) => s + x.bytes, 0);
    walk(p, ctx);
    const after = ctx.files.slice(before);
    rootInfo.push({ path: shortPath(p), label: path.basename(p) || p, found: true, files: after.length, bytes: after.reduce((s, x) => s + x.bytes, 0) });
    void beforeBytes;
  }
  if (ctx.truncated) ctx.warnings.push("A very large set of files was found, so the scan stopped early. Add smaller folders in Preferences for a full picture.");
  const done = finish(ctx, rootInfo);
  const prev = loaded.existing;
  return {
    version: 1,
    settings: settings,
    scan: { at: NOW.toISOString(), by: "scan-files.js", roots: rootInfo, warnings: ctx.warnings, totals: done.totals, truncated: ctx.truncated, previous: prev && prev.scan && prev.scan.totals ? prev.scan.totals : null },
    folders: done.folders,
    files: done.files,
    findings: done.findings,
    recommendations: prev && Array.isArray(prev.recommendations) ? prev.recommendations : []
  };
}

function save(result) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (exists(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE.replace(/\.json$/, ".backup.json"));
  const tmp = DATA_FILE + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(result, null, 2) + "\n");
  fs.renameSync(tmp, DATA_FILE);
}
function mb(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + " GB" : b >= 1048576 ? Math.round(b / 1048576) + " MB" : Math.round(b / 1024) + " KB"; }

function main() {
  const args = process.argv.slice(2);
  const known = ["--dry-run", "--out"];
  for (const a of args) if (a.startsWith("--") && known.indexOf(a) === -1) fail("Unknown option " + a + ". Options: --dry-run, --out <file>.");
  const r = scan();
  const t = r.scan.totals, f = r.findings;
  const lines = [
    "Looked through " + r.scan.roots.filter((x) => x.found).length + " folders: found " + t.folders + " folders and " + t.files + " files, " + mb(t.bytes) + " in all.",
    f.dups.groupCount + " sets of duplicate files (about " + mb(f.dups.wastedBytes) + " repeated), " + f.big.count + " files over 100 MB, " + f.oldDownloads.count + " old files in Downloads.",
    f.emptyFolders.count + " empty folders, " + f.messy.count + " files with untidy names, " + f.installers.count + " installers."
  ].concat(r.scan.warnings.map((w) => "Note: " + w));
  if (args.indexOf("--dry-run") !== -1) { process.stdout.write(lines.join("\n") + "\nNothing was saved (dry run).\n"); return; }
  const oi = args.indexOf("--out");
  if (oi !== -1) {
    if (!args[oi + 1]) fail("--out needs a file name.");
    fs.writeFileSync(args[oi + 1], JSON.stringify(r, null, 2) + "\n");
    process.stdout.write(lines.join("\n") + "\nSaved to " + args[oi + 1] + "\n");
    return;
  }
  save(r);
  process.stdout.write(lines.join("\n") + "\nSaved to apps/skill-map/data/filemap.json\n");
}

main();
