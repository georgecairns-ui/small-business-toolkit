#!/usr/bin/env node
/*
  SKILL MAP OS: the scan (Node version)
  --------------------------------------
  Finds every skill and command Claude can use on this computer, works out how they connect and how
  often each was used, and saves the result in apps/skill-map/data/skillmap.json for the app to draw.

    node apps/skill-map/scan/scan.js              scan and save
    node apps/skill-map/scan/scan.js --dry-run    scan and print the summary, save nothing

  scan.py does the same job with Python, for computers that have Python but not Node. Both write
  exactly the same file (the test is in maintainers/TESTING.md), so keep them in step.

  What it reads (and only reads):
    your skills       ~/.claude/skills and ~/.claude/commands, plus any folders you add in Preferences
    this toolkit      .claude/skills in this folder
    plugins           the skills and commands of every plugin Claude has installed
    use counts        the Skill tool calls and slash commands recorded in ~/.claude/projects
                      (the name of the skill and the date only: never what anyone typed)
  It never edits, moves or deletes a skill, and never sends anything anywhere.

  A re-scan keeps everything you added in the app: tags, areas you chose, skills added by hand,
  recommendations and settings.

  Environment overrides, for testing: SKILLMAP_HOME (stands in for the home folder), SKILLMAP_KIT
  (stands in for this folder) and SKILLMAP_NOW (a fixed "now", as an ISO date).
*/
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { StringDecoder } = require("string_decoder");

const HOME = path.resolve(process.env.SKILLMAP_HOME || os.homedir());
const KIT = path.resolve(process.env.SKILLMAP_KIT || path.join(__dirname, "..", "..", ".."));
const APP_DIR = path.join(KIT, "apps", "skill-map");
const DATA_FILE = path.join(APP_DIR, "data", "skillmap.json");
const NOW = process.env.SKILLMAP_NOW ? new Date(process.env.SKILLMAP_NOW) : new Date();
const USAGE_DAYS = 90;
const DESCRIPTION_LIMIT = 500;
const MAX_REFS_PER_SKILL = 20;
const RANK = { own: 0, toolkit: 1, plugin: 2, manual: 3 };

// ---------- small helpers ----------

function fail(message) { process.stderr.write("Skill Map scan: " + message + "\n"); process.exit(1); }
function exists(p) { try { fs.statSync(p); return true; } catch (e) { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }
function listDir(p) { try { return fs.readdirSync(p).sort(); } catch (e) { return []; } }
function readJsonFile(p) {
  let text;
  try { text = fs.readFileSync(p, "utf8"); } catch (e) { return null; }
  try { return JSON.parse(text); } catch (e) { fail(p + " is not valid JSON (" + e.message + "). Fix or move it, then scan again."); }
}
function slash(p) { return p.split(path.sep).join("/"); }
function shortPath(p) {
  const rel = path.relative(HOME, p);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return "~/" + slash(rel);
  return slash(p);
}
function idFor(p) { return "s-" + crypto.createHash("sha1").update(shortPath(p)).digest("hex").slice(0, 10); }
function dayOf(date) { return date.toISOString().slice(0, 10); }
function cleanText(s) { return String(s).replace(/\s+/g, " ").trim(); }
function clip(s) {
  const chars = Array.from(s);
  return chars.length > DESCRIPTION_LIMIT ? chars.slice(0, DESCRIPTION_LIMIT).join("") + "…" : s;
}

// The top of a skill file: --- name: ... description: ... ---, then the instructions
function parseFrontmatter(text) {
  text = text.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const k = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[i]);
    if (!k) continue;
    let value = k[2];
    const parts = [];
    if (/^[>|][+-]?$/.test(value.trim())) {
      value = "";
    }
    while (i + 1 < lines.length && (/^[ \t]+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) { parts.push(lines[i + 1]); i++; }
    let joined = (value + " " + parts.join(" ")).trim();
    const q = /^(["'])([\s\S]*)\1$/.exec(joined);
    if (q) joined = q[2];
    fm[k[1]] = cleanText(joined);
  }
  return { fm: fm, body: text.slice(m[0].length) };
}

// ---------- the settings and what the person already added ----------

function loadExisting() {
  const data = readJsonFile(DATA_FILE);
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
}
function defaultAreas() {
  const d = readJsonFile(path.join(APP_DIR, "areas-default.json"));
  if (!d || !Array.isArray(d.areas)) fail("apps/skill-map/areas-default.json is missing, so the starting areas can't be set up.");
  return d.areas;
}

// ---------- finding skills ----------

function toolkitSkillOwners() {
  // Which tool each toolkit skill belongs to, from toolkit.json at the root and in attached tools
  const owners = new Map();
  const files = [path.join(KIT, "toolkit.json")];
  for (const name of listDir(path.join(KIT, "apps"))) files.push(path.join(KIT, "apps", name, "toolkit.json"));
  for (const f of files) {
    const j = isFile(f) ? readJsonFile(f) : null;
    if (!j || !Array.isArray(j.skills)) continue;
    for (const s of j.skills) if (!owners.has(s)) owners.set(s, j.name || "Toolkit");
  }
  return owners;
}

function discover(existing, warnings) {
  const found = [];
  const seenReal = new Set();
  const sources = [];

  function realOf(p) { try { return fs.realpathSync(p); } catch (e) { return null; } }
  function addSkillFolder(dir, origin, source, plugin) {
    const file = path.join(dir, "SKILL.md");
    if (!isFile(file)) return false;
    const real = realOf(dir);
    if (!real || seenReal.has(real)) return true;
    seenReal.add(real);
    found.push({ file: file, dir: dir, kind: "skill", origin: origin, source: source, plugin: plugin || null, fallbackName: path.basename(dir) });
    return true;
  }
  function addCommandFile(file, origin, source, plugin) {
    if (!isFile(file)) return;
    const real = realOf(file);
    if (!real || seenReal.has(real)) return;
    seenReal.add(real);
    found.push({ file: file, dir: path.dirname(file), kind: "command", origin: origin, source: source, plugin: plugin || null, fallbackName: path.basename(file).replace(/\.md$/i, "") });
  }
  // Every folder in a skills folder that holds a SKILL.md (a broken link is reported, not hidden)
  function scanSkillsFolder(root, origin, source, plugin) {
    let n = 0;
    for (const name of listDir(root)) {
      if (name.startsWith(".")) continue;
      const dir = path.join(root, name);
      let lst = null;
      try { lst = fs.lstatSync(dir); } catch (e) { continue; }
      if (lst.isSymbolicLink() && !exists(dir)) { warnings.push("A link in " + shortPath(root) + " points nowhere: " + name + ". Skipped."); continue; }
      if (isDir(dir) && addSkillFolder(dir, origin, source, plugin)) n++;
    }
    return n;
  }
  function scanCommandsFolder(root, origin, source, plugin) {
    let n = 0;
    for (const name of listDir(root)) {
      if (!/\.md$/i.test(name) || name.startsWith(".")) continue;
      const file = path.join(root, name);
      if (!exists(file)) { warnings.push("A link in " + shortPath(root) + " points nowhere: " + name + ". Skipped."); continue; }
      addCommandFile(file, origin, source, plugin);
      n++;
    }
    return n;
  }

  // 1. The person's own skills and commands
  const own = path.join(HOME, ".claude", "skills");
  const nOwn = scanSkillsFolder(own, "own", "My skills", null);
  const nCmd = scanCommandsFolder(path.join(HOME, ".claude", "commands"), "own", "My skills", null);
  sources.push({ id: "own", label: "My skills", path: shortPath(own), count: nOwn + nCmd });

  // 2. Extra folders they added in Preferences
  const extra = existing && existing.settings && Array.isArray(existing.settings.extraFolders) ? existing.settings.extraFolders : [];
  for (const raw of extra) {
    const dir = path.resolve(String(raw).replace(/^~(?=$|[\\/])/, HOME));
    if (!isDir(dir)) { warnings.push("The folder you added, " + raw + ", could not be found. Skipped."); continue; }
    const label = path.basename(dir);
    let n = scanSkillsFolder(dir, "own", label, null);
    if (isFile(path.join(dir, "SKILL.md")) && addSkillFolder(dir, "own", label, null)) n++;
    n += scanCommandsFolder(dir, "own", label, null);
    sources.push({ id: "folder:" + shortPath(dir), label: label, path: shortPath(dir), count: n });
  }

  // 3. The toolkit's own skills (this folder's .claude/skills)
  const owners = toolkitSkillOwners();
  const kitSkills = path.join(KIT, ".claude", "skills");
  let nKit = 0;
  for (const name of listDir(kitSkills)) {
    if (name.startsWith(".")) continue;
    const dir = path.join(kitSkills, name);
    if (isDir(dir) && addSkillFolder(dir, "toolkit", owners.get(name) || "Toolkit", null)) nKit++;
  }
  sources.push({ id: "toolkit", label: "Toolkit", path: shortPath(kitSkills), count: nKit });

  // 4. Plugins Claude has installed
  const installed = readJsonFile(path.join(HOME, ".claude", "plugins", "installed_plugins.json"));
  const plugins = installed && installed.plugins && typeof installed.plugins === "object" ? installed.plugins : {};
  for (const id of Object.keys(plugins).sort()) {
    const entries = Array.isArray(plugins[id]) ? plugins[id] : [plugins[id]];
    const entry = entries[0];
    const root = entry && entry.installPath;
    if (!root || !isDir(root)) { warnings.push("The plugin " + id + " is installed but its folder could not be found. Skipped."); continue; }
    const pluginName = id.split("@")[0];
    const n = scanSkillsFolder(path.join(root, "skills"), "plugin", pluginName, pluginName) +
      scanCommandsFolder(path.join(root, "commands"), "plugin", pluginName, pluginName);
    sources.push({ id: "plugin:" + id, label: pluginName, path: shortPath(root), count: n });
  }
  return { found: found, sources: sources };
}

function readNode(f, existingById, warnings) {
  let text;
  try { text = fs.readFileSync(f.file, "utf8"); } catch (e) { warnings.push("Could not read " + shortPath(f.file) + " (" + e.code + "). Skipped."); return null; }
  const st = fs.statSync(f.file);
  const parsed = parseFrontmatter(text);
  const name = parsed.fm.name || f.fallbackName;
  let description = parsed.fm.description || "";
  if (!description) {
    for (const line of parsed.body.split(/\r?\n/)) {
      const t = line.replace(/^#+\s*/, "").trim();
      if (t) { description = cleanText(t); break; }
    }
  }
  const id = idFor(f.kind === "skill" ? f.dir : f.file);
  const before = existingById.get(id) || {};
  const node = {
    id: id,
    name: name,
    kind: f.kind,
    origin: f.origin,
    source: f.source,
    plugin: f.plugin,
    path: shortPath(f.kind === "skill" ? f.dir : f.file),
    description: clip(description),
    area: before.areaBy && before.areaBy !== "scan" ? before.area || null : null,
    areaBy: before.areaBy && before.areaBy !== "scan" ? before.areaBy : "scan",
    tags: Array.isArray(before.tags) ? before.tags : [],
    uses: { total: 0, last90: 0, lastUsed: null, byMonth: {} },
    modified: dayOf(new Date(Math.floor(st.mtimeMs / 1000) * 1000)),
    lines: text.split("\n").length,
    bytes: st.size
  };
  if (before.note) node.note = before.note;
  return { node: node, body: parsed.body };
}

// ---------- links between skills ----------

function buildEdges(nodes, bodies) {
  const byName = new Map();
  for (const n of nodes) {
    const k = n.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(n);
  }
  const best = (list) => list.slice().sort((a, b) => RANK[a.origin] - RANK[b.origin] || (a.id < b.id ? -1 : 1))[0];
  const edges = [];

  // Same name in 2 or more places
  for (const list of byName.values()) {
    if (list.length < 2) continue;
    const main = best(list);
    for (const n of list) if (n !== main) edges.push({ s: n.id, t: main.id, type: "dup" });
  }

  // One skill naming another: a hyphenated name anywhere, a single word only in `backticks` or as a /command
  const hyphenated = /(?<![A-Za-z0-9_-])[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+(?![A-Za-z0-9_-])/g;
  const ticked = /`([A-Za-z0-9][A-Za-z0-9_-]*)`/g;
  const slashed = /(?:^|[\s(])\/([A-Za-z0-9][A-Za-z0-9_-]*)(?![A-Za-z0-9_\/-])/gm;
  for (const n of nodes) {
    const body = bodies.get(n.id) || "";
    const hits = new Set();
    for (const m of body.matchAll(hyphenated)) hits.add(m[0].toLowerCase());
    for (const m of body.matchAll(ticked)) hits.add(m[1].toLowerCase());
    for (const m of body.matchAll(slashed)) hits.add(m[1].toLowerCase());
    const targets = [];
    for (const h of hits) {
      if (!byName.has(h)) continue;
      const t = best(byName.get(h));
      if (t.id !== n.id && t.name.toLowerCase() !== n.name.toLowerCase()) targets.push(t.id);
    }
    targets.sort();
    for (const t of Array.from(new Set(targets)).slice(0, MAX_REFS_PER_SKILL)) edges.push({ s: n.id, t: t, type: "ref" });
  }
  edges.sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.s < b.s ? -1 : a.s > b.s ? 1 : a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  return edges;
}

// ---------- how often each skill was used ----------

function eachLine(file, onLine) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(1 << 20);
  const dec = new StringDecoder("utf8");
  let rest = "";
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      const parts = (rest + dec.write(buf.subarray(0, n))).split("\n");
      rest = parts.pop();
      for (const line of parts) onLine(line);
    }
    rest += dec.end();
    if (rest) onLine(rest);
  } finally { fs.closeSync(fd); }
}

function jsonlFiles(root) {
  const out = [];
  const cutoff = NOW.getTime() - 400 * 86400000;
  (function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".jsonl")) { if (fs.statSync(full).mtimeMs >= cutoff) out.push(full); }
    }
  })(root);
  return out;
}

function countUsage(nodes) {
  const root = path.join(HOME, ".claude", "projects");
  const summary = { files: 0, events: 0, from: null, to: null, note: "Claude Code only" };
  if (!isDir(root)) { summary.note = "No Claude Code history was found on this computer"; return summary; }
  const byName = new Map();
  for (const n of nodes) {
    const k = n.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(n);
  }
  const best = (list, prefix) => {
    const sorted = list.slice().sort((a, b) => RANK[a.origin] - RANK[b.origin] || (a.id < b.id ? -1 : 1));
    return (prefix && sorted.find((n) => n.plugin && n.plugin.toLowerCase() === prefix)) || sorted[0];
  };
  const cutoff = dayOf(new Date(NOW.getTime() - USAGE_DAYS * 86400000));
  const seen = new Set();
  const files = jsonlFiles(root);
  summary.files = files.length;
  for (const file of files) {
    eachLine(file, function (line) {
      const skillCall = line.indexOf('"Skill"') !== -1;
      const slash = line.indexOf("<command-name>") !== -1;
      if (!skillCall && !slash) return;
      let rec;
      try { rec = JSON.parse(line); } catch (e) { return; }
      const ts = typeof rec.timestamp === "string" ? rec.timestamp : "";
      if (!/^\d{4}-\d{2}-\d{2}/.test(ts)) return;
      const content = rec.message && rec.message.content;
      const raws = [];
      if (rec.type === "assistant" && Array.isArray(content)) {
        for (const c of content) {
          if (c && c.type === "tool_use" && c.name === "Skill" && c.input && typeof c.input.skill === "string") raws.push([c.input.skill, c.id || rec.uuid]);
        }
      } else if (rec.type === "user" && typeof content === "string") {
        const m = /<command-name>\/?([^<\s]+)<\/command-name>/.exec(content);
        if (m) raws.push([m[1], rec.uuid]);
      }
      for (const pair of raws) {
        const raw = pair[0].toLowerCase();
        const colon = raw.lastIndexOf(":");
        const name = colon === -1 ? raw : raw.slice(colon + 1);
        const prefix = colon === -1 ? "" : raw.slice(0, colon);
        const list = byName.get(name);
        if (!list) continue;
        const key = pair[1];
        if (key) { if (seen.has(key)) continue; seen.add(key); }
        const node = best(list, prefix);
        const day = ts.slice(0, 10);
        node.uses.total++;
        if (day >= cutoff) node.uses.last90++;
        if (!node.uses.lastUsed || day > node.uses.lastUsed) node.uses.lastUsed = day;
        const month = day.slice(0, 7);
        node.uses.byMonth[month] = (node.uses.byMonth[month] || 0) + 1;
        summary.events++;
        if (!summary.from || day < summary.from) summary.from = day;
        if (!summary.to || day > summary.to) summary.to = day;
      }
    });
  }
  // Keep the last 12 months, in order
  const months = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - i, 1)); months.push(d.toISOString().slice(0, 7)); }
  for (const n of nodes) {
    const kept = {};
    for (const m of months) if (n.uses.byMonth[m]) kept[m] = n.uses.byMonth[m];
    n.uses.byMonth = kept;
  }
  return summary;
}

// ---------- put it together ----------

function scan(options) {
  const existing = loadExisting();
  const warnings = [];
  const existingNodes = existing && Array.isArray(existing.nodes) ? existing.nodes : [];
  const existingById = new Map(existingNodes.map((n) => [n.id, n]));

  const d = discover(existing, warnings);
  const nodes = [];
  const bodies = new Map();
  for (const f of d.found) {
    const r = readNode(f, existingById, warnings);
    if (r) { nodes.push(r.node); bodies.set(r.node.id, r.body); }
  }
  // Skills the person added by hand (for example ones that live on claude.ai) stay as they are
  const manual = existingNodes.filter((n) => n.origin === "manual").map((n) => Object.assign({}, n, { uses: { total: 0, last90: 0, lastUsed: null, byMonth: {} } }));
  const all = nodes.concat(manual);
  all.sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const usage = options.usage ? countUsage(all) : { files: 0, events: 0, from: null, to: null, note: "Use counts were not counted this time" };
  const edges = buildEdges(all, bodies);

  const before = new Set(existingNodes.filter((n) => n.origin !== "manual").map((n) => n.id));
  const nowIds = new Set(nodes.map((n) => n.id));
  const removed = existingNodes.filter((n) => n.origin !== "manual" && !nowIds.has(n.id)).map((n) => n.name).sort();
  const added = nodes.filter((n) => !before.has(n.id)).length;

  const settings = Object.assign({ yourName: "", businessName: "", setUp: false, areasApproved: false, extraFolders: [], usageDays: USAGE_DAYS },
    existing && existing.settings ? existing.settings : {});
  const areas = existing && Array.isArray(existing.areas) && existing.areas.length ? existing.areas : defaultAreas();

  return {
    version: 1,
    settings: settings,
    scan: {
      at: NOW.toISOString(),
      by: "scan.js",
      sources: d.sources,
      warnings: warnings,
      usage: usage,
      changes: { added: added, removed: removed }
    },
    areas: areas,
    nodes: all,
    edges: edges,
    tags: existing && Array.isArray(existing.tags) ? existing.tags : [],
    recommendations: existing && Array.isArray(existing.recommendations) ? existing.recommendations : []
  };
}

function save(result) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (exists(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE.replace(/\.json$/, ".backup.json"));
  const tmp = DATA_FILE + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(result, null, 2) + "\n");
  fs.renameSync(tmp, DATA_FILE);
}

function main() {
  const args = process.argv.slice(2);
  const known = ["--dry-run", "--no-usage", "--out"];
  for (const a of args) if (a.startsWith("--") && known.indexOf(a) === -1) fail("Unknown option " + a + ". Options: --dry-run, --no-usage, --out <file>.");
  const outIndex = args.indexOf("--out");
  const result = scan({ usage: args.indexOf("--no-usage") === -1 });
  const skills = result.nodes.filter((n) => n.kind === "skill").length;
  const commands = result.nodes.length - skills;
  const places = result.scan.sources.filter((s) => s.count > 0).length;
  const used = result.nodes.filter((n) => n.uses.last90 > 0).length;
  const lines = [
    "Found " + skills + (skills === 1 ? " skill" : " skills") + " and " + commands + (commands === 1 ? " command" : " commands") + " in " + places + (places === 1 ? " place." : " places."),
    result.scan.changes.added + " new since last time" + (result.scan.changes.removed.length ? ", " + result.scan.changes.removed.length + " gone." : "."),
    used + " used in the last " + USAGE_DAYS + " days (" + result.scan.usage.note + ").",
    result.edges.filter((e) => e.type === "ref").length + " links between skills, " + result.edges.filter((e) => e.type === "dup").length + " duplicates."
  ].concat(result.scan.warnings.map((w) => "Note: " + w));
  if (args.indexOf("--dry-run") !== -1) { process.stdout.write(lines.join("\n") + "\nNothing was saved (dry run).\n"); return; }
  if (outIndex !== -1) {
    if (!args[outIndex + 1]) fail("--out needs a file name.");
    fs.writeFileSync(args[outIndex + 1], JSON.stringify(result, null, 2) + "\n");
    process.stdout.write(lines.join("\n") + "\nSaved to " + args[outIndex + 1] + "\n");
    return;
  }
  save(result);
  process.stdout.write(lines.join("\n") + "\nSaved to apps/skill-map/data/skillmap.json\n");
}

main();
