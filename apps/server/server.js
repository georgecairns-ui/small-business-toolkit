#!/usr/bin/env node
/*
  THE HELPER: the little helper that runs this folder's tools on this computer
  ----------------------------------------------------------------------------
  It calls itself by the folder's name: "name" in toolkit.json (for example "Ads OS").
  Claude starts this during setup. It does 2 things:
    1. Serves the app at http://localhost:4747 so it opens like any web page.
    2. Lets the app read and save your data files (for example apps/task-list/data/tasks.json), so there's
       no folder to pick and nothing to allow. Claude's changes appear within seconds.
       If other tools from the toolkit are attached, it saves their data files too, but only the
       ones listed for each tool in apps/installed.json. It also saves Home's own files in apps/home/data:
       layout.json, braindump.json and connections.json.
    3. For a tool marked "media": true in apps/installed.json, keeps the photos and videos a person
       adds to their posts in that tool's own data/media folder, and plays them back.

  Safety:
    - It only listens on this computer (127.0.0.1). Nothing on the internet or your network can reach it.
    - It only serves the app (the apps folder) and only ever saves the task file, the data files
      of attached tools listed in apps/installed.json, and Home's layout.json, braindump.json and
      connections.json in apps/home/data. Nothing else can be written.
    - Photos and videos are saved only for a tool marked "media": true, only with a safe file name and the
      right kind of file, up to 200 MB, and never over a file that is already there. Nothing can delete them.
    - It keeps a backup (for example tasks.backup.json) before every save, and saves in a way that
      can't leave a half-written file.
    - It refuses requests from other websites.
    - A save based on an older copy of the file is refused (409) instead of overwriting a change made in between.
    - A badly formed request gets an error answer. It never stops the helper.

  It can also ask Claude to do a small job straight away, such as sorting a new voice note or
  updating a deal from call notes: it runs Claude Code on this computer ("claude -p ...") in this
  folder, one run at a time. Only the app itself can ask, and only for a job a tool lists in its
  own apps/<tool>/claude-jobs.json (the app sends the job's name, never the words Claude follows).
  Turn it off with TLOS_AUTO_CLAUDE=off.

  Run it:        node apps/server/server.js
  Other port:    TLOS_PORT=4848 node apps/server/server.js
  No libraries needed. Works with Node 16 or newer.
*/
"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { pipeline } = require("stream");
const crypto = require("crypto");

const PORT = Number(process.env.TLOS_PORT || 4747);
const HOST = "127.0.0.1";
const ROOT = path.resolve(__dirname, "..", "..");           // the tool's folder
const APPS = path.join(ROOT, "apps");                         // the only folder it serves
const DATA = path.join(APPS, "task-list", "data", "tasks.json");
const INSTALLED = path.join(APPS, "installed.json");
// The folder's name, for messages: toolkit.json's "name", else the first tool's in apps/installed.json
function readName() {
  try { const n = JSON.parse(fs.readFileSync(path.join(ROOT, "toolkit.json"), "utf8")).name; if (typeof n === "string" && n.trim()) return n.trim(); } catch (e) { /* try installed.json */ }
  try { const n = JSON.parse(fs.readFileSync(INSTALLED, "utf8")).tools[0].name; if (typeof n === "string" && n.trim()) return n.trim(); } catch (e) { /* no name */ }
  return "Your toolkit";
}
const NAME = readName();
const HOME_LAYOUT = path.join(APPS, "home", "data", "layout.json");
const BRAIN_DUMP = path.join(APPS, "home", "data", "braindump.json");   // the shared Brain dump, every tool's notes
const CONNECTIONS = path.join(APPS, "home", "data", "connections.json");   // which apps Claude can reach, shared by every tool (shared v13)
// A tool's data file must live in its own data folder: apps/<tool>/data/<name>.json
const DATA_FILE_RE = /^apps\/[a-z0-9-]+\/data\/[a-z0-9-]+\.json$/;
const MAX_BODY = 10 * 1024 * 1024;
// Photos and videos: apps/<tool>/data/media/<name>, for a tool marked "media": true in apps/installed.json
const MEDIA_NAME_RE = /^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/;
const MEDIA_URL_RE = /^\/api\/media\/([a-z0-9-]+)\/([^/]+)$/;
const MEDIA_TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
const MAX_MEDIA = 200 * 1024 * 1024;

// ---------- Asking Claude to do a small job (sort a voice note, update a deal) ----------
const AUTO_CLAUDE = (process.env.TLOS_AUTO_CLAUDE || "on") !== "off";
const CLAUDE_LOG = path.join(fs.existsSync(path.join(os.homedir(), "Library", "Logs")) ? path.join(os.homedir(), "Library", "Logs") : os.tmpdir(), (NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "toolkit") + "-claude.log");
const RUN_LIMIT_MS = 10 * 60 * 1000;
const UNWATCHED = " Nobody is watching this run, so do not ask questions: make your best reading of anything unclear and say so in your notes.";
const SORT_JOB = { key: "shared:brain-dump", label: "sorting the brain dump",
  prompt: "A new brain dump has just been added. Follow .claude/skills/sort-brain-dump for the unsorted items in apps/home/data/braindump.json " +
    "(and any unsorted items in apps/task-list/data/tasks.json's dump). Be quick and change nothing else." + UNWATCHED };
// One run at a time. Asking again for a job that's already waiting doesn't queue it twice.
const claudeRun = { running: false, queued: false, job: null, startedAt: null, lastRunAt: null, lastResult: null, lastJob: null };
const claudeQueue = [];

// Find the "claude" command on this computer, if Claude Code is installed
function findClaude() {
  if (process.env.TLOS_CLAUDE) return process.env.TLOS_CLAUDE;
  const names = process.platform === "win32" ? ["claude.exe", "claude.cmd"] : ["claude"];
  const dirs = (process.env.PATH || "").split(path.delimiter).concat([path.join(os.homedir(), ".local", "bin"), path.join(os.homedir(), ".claude", "local"), "/usr/local/bin", "/opt/homebrew/bin"]);
  for (const dir of dirs) {
    for (const name of names) {
      const full = path.join(dir, name);
      try { fs.accessSync(full, fs.constants.X_OK); return full; } catch (e) { /* keep looking */ }
    }
  }
  return null;
}

// A job a tool lists in apps/<tool>/claude-jobs.json: { "jobs": { "<name>": { "label": "...", "prompt": "..." } } }
// Only for tools in apps/installed.json. Returns null for anything else.
function toolJob(toolId, name) {
  const tool = installedTools().find(function (t) { return t && t.id === toolId; });
  const app = tool && typeof tool.app === "string" ? tool.app : "";
  if (!/^apps\/[a-z0-9-]+\/$/.test(app) || app === "apps/shared/" || app === "apps/server/") return null;
  let jobs = null;
  try { jobs = JSON.parse(fs.readFileSync(path.join(ROOT, ...app.split("/"), "claude-jobs.json"), "utf8")).jobs; } catch (e) { return null; }
  const job = jobs && Object.prototype.hasOwnProperty.call(jobs, name) ? jobs[name] : null;
  if (!job || typeof job.prompt !== "string" || !job.prompt.trim()) return null;
  return { key: toolId + ":" + name, label: typeof job.label === "string" ? job.label.slice(0, 80) : name, prompt: job.prompt.slice(0, 4000) + UNWATCHED };
}

function runClaude(job) {
  if (!findClaude()) { claudeRun.lastResult = "not-installed"; return false; }
  // A job already running is queued once more, so it also sees anything added since it started
  if (!claudeQueue.some(function (j) { return j.key === job.key; })) claudeQueue.push(job);
  if (claudeRun.running) claudeRun.queued = true; else startNext();
  return true;
}

function startNext() {
  const job = claudeQueue.shift();
  claudeRun.queued = claudeQueue.length > 0;
  if (!job) return;
  const bin = findClaude();
  if (!bin) { claudeRun.lastResult = "not-installed"; claudeQueue.length = 0; claudeRun.queued = false; return; }
  claudeRun.running = true;
  claudeRun.job = job.key;
  claudeRun.startedAt = new Date().toISOString();
  let log = null, child = null, limit = null;
  let done = false;
  function finished(result) {
    if (done) return;
    done = true;
    clearTimeout(limit);
    if (log !== null) try { fs.closeSync(log); } catch (e) { /* already closed */ }
    claudeRun.running = false;
    claudeRun.lastJob = job.key;
    claudeRun.job = null;
    claudeRun.lastRunAt = new Date().toISOString();
    claudeRun.lastResult = result;
    startNext();
  }
  // If the log can't be opened or Claude can't be started (a prompt with a NUL character), this job fails and the next
  // one runs. Left as a throw, running stayed true for ever, and from a finished run it stopped the helper.
  try {
    log = fs.openSync(CLAUDE_LOG, "a");
    fs.writeSync(log, "\n--- " + claudeRun.startedAt + " " + job.label + "\n");
    const isCmd = /\.cmd$/i.test(bin);
    child = spawn(isCmd ? "cmd.exe" : bin, isCmd ? ["/d", "/c", bin, "-p", job.prompt] : ["-p", job.prompt],
      { cwd: ROOT, stdio: ["ignore", log, log], windowsHide: true });
  } catch (e) {
    return finished("failed");
  }
  limit = setTimeout(function () { child.kill(); }, RUN_LIMIT_MS);
  child.on("error", function () { finished("failed"); });
  child.on("exit", function (code) { finished(code === 0 ? "ok" : "failed"); });
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon"
};

// Only answer requests addressed to this computer (stops "DNS rebinding" tricks by websites)
function hostOk(req) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(req.headers.host || "");
}
// Saves must come from the app itself, never from another website
function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === "http://localhost:" + PORT || origin === "http://127.0.0.1:" + PORT;
}

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }, extra || {}));
  res.end(body);
}
function sendJson(res, status, obj) { send(res, status, JSON.stringify(obj), TYPES[".json"]); }

function modified(file) {
  try { return fs.statSync(file || DATA).mtimeMs; } catch (e) { return 0; }
}

// A fingerprint of a file's contents, sent as the ETag header on every read and every save. A save that
// sends it back in If-Match is only accepted while the file is still exactly that (otherwise 409), so
// an edit made in between, for example by Claude, is never overwritten. A save without it works as before.
function versionOf(text) { return crypto.createHash("sha256").update(text).digest("hex").slice(0, 24); }
function versionHeader(text) { return { ETag: '"' + versionOf(text) + '"' }; }
// null: no version sent (an older app). undefined: one was sent but it is not a version this helper gave out.
function sentVersion(req) {
  const header = req.headers["if-match"];
  if (header === undefined || String(header).trim() === "") return null;
  const m = /^\s*(?:W\/)?"?([0-9a-f]{8,64})"?\s*$/i.exec(header);
  return m ? m[1].toLowerCase() : undefined;
}

// The tools in this folder, from apps/installed.json. If it's missing or unreadable, just the task list.
function installedTools() {
  let list = null;
  try { list = JSON.parse(fs.readFileSync(INSTALLED, "utf8")).tools; } catch (e) { /* use the default */ }
  return Array.isArray(list) ? list : [{ id: "task-list", app: "apps/task-list/", dataFiles: ["apps/task-list/data/tasks.json"] }];
}

// The file behind /api/data/<tool>/<file>, or null if that tool isn't installed or the file isn't one of its own
function dataFileFor(toolId, fileName) {
  // Home's own file: which boxes show, in what order and how wide
  if (toolId === "home") return fileName === "layout.json" ? HOME_LAYOUT : fileName === "braindump.json" ? BRAIN_DUMP : fileName === "connections.json" ? CONNECTIONS : null;
  for (const tool of installedTools()) {
    if (!tool || tool.id !== toolId || !Array.isArray(tool.dataFiles)) continue;
    // A tool may only save inside its own app folder, never another tool's data or the shared parts
    const app = typeof tool.app === "string" ? tool.app : "";
    if (!/^apps\/[a-z0-9-]+\/$/.test(app) || app === "apps/shared/" || app === "apps/server/") continue;
    for (const rel of tool.dataFiles) {
      if (typeof rel !== "string" || !DATA_FILE_RE.test(rel) || /\.backup\.json$/.test(rel) || !rel.startsWith(app + "data/")) continue;
      if (path.posix.basename(rel) === fileName) return path.join(ROOT, ...rel.split("/"));
    }
  }
  return null;
}

// The folder a tool keeps photos and videos in, or null if that tool isn't installed or isn't marked "media": true
function mediaDirFor(toolId) {
  const tool = installedTools().find(function (t) { return t && t.id === toolId; });
  const app = tool && typeof tool.app === "string" ? tool.app : "";
  if (!tool || tool.media !== true || !/^apps\/[a-z0-9-]+\/$/.test(app) || app === "apps/shared/" || app === "apps/server/") return null;
  return path.join(ROOT, ...app.split("/"), "data", "media");
}

// Saves an upload: checks it, writes it to a temporary file, then swaps it in. Never replaces a file that is there.
function writeMedia(req, res, dir, name) {
  const type = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (type !== MEDIA_TYPES[path.extname(name)]) return sendJson(res, 415, { error: "wrong kind of file" });
  const length = Number(req.headers["content-length"]);
  if (!Number.isInteger(length) || length < 1) return sendJson(res, 411, { error: "length needed" });
  if (length > MAX_MEDIA) return sendJson(res, 413, { error: "too large" });
  const file = path.join(dir, name), tmp = file + ".saving";
  if (fs.existsSync(file)) return sendJson(res, 409, { error: "already there" });
  const failed = function (status, error) { fs.unlink(tmp, function () { sendJson(res, status, { error: error }); }); };
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { return sendJson(res, 500, { error: "save failed" }); }
  const out = fs.createWriteStream(tmp, { flags: "wx" });
  pipeline(req, out, function (err) {
    if (err) return err.code === "EEXIST" ? sendJson(res, 409, { error: "already there" }) : failed(500, "save failed");
    if (out.bytesWritten !== length) return failed(400, "incomplete");
    if (fs.existsSync(file)) return failed(409, "already there");
    try { fs.renameSync(tmp, file); } catch (e) { return failed(500, "save failed"); }
    return sendJson(res, 201, { file: name });
  });
}

// Plays a saved photo or video back. Supports Range requests, which browsers use to play and skip around a video.
function serveMedia(req, res, dir, name) {
  const file = path.join(dir, name);
  let size;
  try { const stat = fs.statSync(file); size = stat.isFile() ? stat.size : 0; } catch (e) { size = 0; }
  if (!size) return sendJson(res, 404, { error: "missing" });
  let start = 0, end = size - 1, status = 200;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    if (range[1] && range[2]) end = Math.min(end, Number(range[2]));
    if (start > end) return send(res, 416, "Range not satisfiable", null, { "Content-Range": "bytes */" + size });
    status = 206;
  }
  const headers = { "Content-Type": MEDIA_TYPES[path.extname(name)], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes", "Content-Length": end - start + 1 };
  if (status === 206) headers["Content-Range"] = "bytes " + start + "-" + end + "/" + size;
  res.writeHead(status, headers);
  if (req.method === "HEAD") return res.end();
  pipeline(fs.createReadStream(file, { start: start, end: end }), res, function () { /* the browser may stop early; nothing to do */ });
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on("data", function (c) {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

// Save safely: keep a backup of the current file, write a temporary file, then swap it in
function saveFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, file.replace(/\.json$/, ".backup.json"));
  const tmp = file + ".saving";
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

function readFile(res, file) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { return sendJson(res, 404, { error: "missing" }); }
  return send(res, 200, text, TYPES[".json"], Object.assign({ "X-Modified": String(modified(file)) }, versionHeader(text)));
}

// Checks and saves a PUT. The task file must keep its task list; any other data file must be a JSON object.
async function writeFile(req, res, file) {
  if (!originOk(req)) return sendJson(res, 403, { error: "forbidden" });
  if (!/application\/json/i.test(req.headers["content-type"] || "")) return sendJson(res, 415, { error: "json only" });
  let text;
  try { text = await readBody(req); } catch (e) { return sendJson(res, 413, { error: "too large" }); }
  let data;
  try { data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(text)); } catch (e) { return sendJson(res, 400, { error: "not valid" }); }   // bytes that aren't text are refused, never "repaired"
  if (!data || typeof data !== "object" || Array.isArray(data)) return sendJson(res, 400, { error: "not valid" });
  if (file === DATA && !Array.isArray(data.tasks)) return sendJson(res, 400, { error: "no tasks list" });
  // Check and save in one go (nothing else runs in between), so 2 saves can't both pass the check
  const based = sentVersion(req);
  if (based === undefined) return sendJson(res, 400, { error: "not valid" });
  const out = JSON.stringify(data, null, 2) + "\n";
  try {
    if (based !== null) {
      let current = null;
      try { current = fs.readFileSync(file, "utf8"); } catch (e) { /* the file is gone: also a change */ }
      if (current === null || versionOf(current) !== based) return sendJson(res, 409, { error: "changed since you read it" });
    }
    saveFile(file, out);
  } catch (e) { return sendJson(res, 500, { error: "save failed" }); }
  return send(res, 200, JSON.stringify({ modified: modified(file), version: versionOf(out) }), TYPES[".json"], versionHeader(out));
}

async function handleApi(req, res, url) {
  if (url === "/api/alive.js") {
    // Used by the launcher page at the top of the folder to check the helper is running
    return send(res, 200, "window.tlosAlive = true;", TYPES[".js"]);
  }
  // Where this folder is and its name, so the app can open Claude Code right here ("Open in Claude" on a task)
  if (url === "/api/info" && req.method === "GET") {
    return sendJson(res, 200, { folder: ROOT, name: NAME });
  }
  if (url === "/api/tasks/meta" && req.method === "GET") {
    return sendJson(res, 200, { modified: modified() });
  }
  if (url === "/api/tasks" && req.method === "GET") return readFile(res, DATA);
  if (url === "/api/tasks" && req.method === "PUT") return writeFile(req, res, DATA);
  // Attached tools: /api/data/<tool>/<file>.json, and /meta for when it last changed
  const m = /^\/api\/data\/([a-z0-9-]+)\/([a-z0-9-]+\.json)(\/meta)?$/.exec(url);
  if (m) {
    const file = dataFileFor(m[1], m[2]);
    if (!file) return sendJson(res, 404, { error: "not an installed tool's data file" });
    if (m[3] && req.method === "GET") return sendJson(res, 200, { modified: modified(file) });
    if (!m[3] && req.method === "GET") return readFile(res, file);
    if (!m[3] && req.method === "PUT") return writeFile(req, res, file);
    return sendJson(res, 405, { error: "not allowed" });
  }
  // Photos and videos: /api/media/<tool>/<name>. There is no delete.
  const media = MEDIA_URL_RE.exec(url);
  if (media) {
    if (req.method === "PUT" && !originOk(req)) return sendJson(res, 403, { error: "forbidden" });
    const dir = mediaDirFor(media[1]);
    if (!dir) return sendJson(res, 404, { error: "not a tool that keeps photos and videos" });
    if (!MEDIA_NAME_RE.test(media[2])) return sendJson(res, 400, { error: "file name not allowed" });
    if (req.method === "GET" || req.method === "HEAD") return serveMedia(req, res, dir, media[2]);
    if (req.method === "PUT") return writeMedia(req, res, dir, media[2]);
    return sendJson(res, 405, { error: "not allowed" });
  }
  if (url === "/api/claude/status" && req.method === "GET") {
    return sendJson(res, 200, { available: AUTO_CLAUDE && !!findClaude(), running: claudeRun.running, queued: claudeRun.queued,
      job: claudeRun.job, startedAt: claudeRun.startedAt, lastRunAt: claudeRun.lastRunAt, lastResult: claudeRun.lastResult, lastJob: claudeRun.lastJob });
  }
  // /api/claude/sort-brain-dump (the shared Brain dump) or /api/claude/run/<tool>/<job>
  const run = /^\/api\/claude\/run\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(url);
  if ((url === "/api/claude/sort-brain-dump" || run) && req.method === "POST") {
    // Only the app may ask: same origin, and a JSON request (other websites can't send one without permission)
    if (!originOk(req) || !/application\/json/i.test(req.headers["content-type"] || "")) return sendJson(res, 403, { error: "forbidden" });
    const job = run ? toolJob(run[1], run[2]) : SORT_JOB;
    if (!job) return sendJson(res, 404, { error: "no such job" });
    if (!AUTO_CLAUDE) return sendJson(res, 503, { error: "turned off" });
    return runClaude(job) ? sendJson(res, 202, { started: true }) : sendJson(res, 503, { error: "claude not installed" });
  }
  return sendJson(res, 404, { error: "not found" });
}

// The page http://localhost:4747 opens: Home, or (in an older copy without it) the first tool in apps/installed.json
function homePage() {
  if (fs.existsSync(path.join(APPS, "home", "index.html"))) return "/home/";
  const first = installedTools()[0];
  const app = first && typeof first.app === "string" ? first.app : "";
  return /^apps\/[a-z0-9-]+\/$/.test(app) ? "/" + app.slice(5) : "/task-list/";
}

function handleFile(req, res, url) {
  if (url === "/" || url === "") { res.writeHead(302, { Location: homePage() }); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url); } catch (e) { return send(res, 400, "Bad request"); }   // for example GET /%
  if (rel.indexOf("\0") !== -1) return send(res, 400, "Bad request");
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(APPS, "." + rel);
  // Never serve anything outside the apps folder, and never the data backups
  if (!file.startsWith(APPS + path.sep) || /\.backup\.json$|\.saving$/.test(file)) return send(res, 403, "Not allowed");
  fs.readFile(file, function (err, buf) {
    if (err) return send(res, 404, "Not found");
    send(res, 200, buf, TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
}

const server = http.createServer(function (req, res) {
  try {
    if (!hostOk(req)) return send(res, 403, "Not allowed");
    const url = (req.url || "/").split("?")[0];
    if (url.startsWith("/api/")) {
      handleApi(req, res, url).catch(function () { if (!res.headersSent) sendJson(res, 500, { error: "unexpected" }); else res.end(); });
    } else if (req.method === "GET" || req.method === "HEAD") {
      handleFile(req, res, url);
    } else {
      send(res, 405, "Not allowed");
    }
  } catch (e) {
    // Whatever a request contains, it must never stop the helper for everyone else
    if (!res.headersSent) sendJson(res, 500, { error: "unexpected" }); else res.end();
  }
});

server.on("error", function (err) {
  if (err.code === "EADDRINUSE") {
    console.error(NAME + ": port " + PORT + " is already in use. It may already be running: open http://localhost:" + PORT);
  } else {
    console.error(NAME + ": could not start: " + err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, function () {
  console.log(NAME + " is running at http://localhost:" + PORT);
});
