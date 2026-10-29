// Live check: start the helper in each kit folder, open Home and every page of every tool in headless Chrome,
// and report console errors, dialogs, pages that stop responding and sideways scrolling.
// Usage: node maintainers/test/livecheck.mjs <folder holding one or more kit copies> [kit folder name ...]
// Needs Google Chrome and a local port, so run it from a terminal, not a sandbox.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.argv[2];
const only = process.argv.slice(3);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 50) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await sleep(200); }
  return false;
}

async function chrome() {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "lc-chrome-"));
  const p = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", "--user-data-dir=" + prof, "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
  await waitFor("http://127.0.0.1:9333/json/version");
  return p;
}

async function openPage(url) {
  const t = await (await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") errors.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n")[0]);
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("console: " + d.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200));
    if (d.method === "Page.javascriptDialogOpening") { errors.push("dialog: " + d.params.type + " " + d.params.message.slice(0, 200)); ws.send(JSON.stringify({ id: 99999, method: "Page.handleJavaScriptDialog", params: { accept: false } })); }
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") errors.push("log: " + d.params.entry.text.slice(0, 200) + " " + (d.params.entry.url || ""));
  });
  const send = (method, params = {}) => new Promise((r) => { id++; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => r({ timedOut: true }), 8000); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  await send("Page.navigate", { url });
  await sleep(2500);
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); if (r.timedOut) errors.push("PAGE NOT RESPONDING (script busy for 8s)"); return r?.result?.value; };
  const info = await ev(`(() => { const s = document.querySelector('nav, .sidebar, aside'); const main = document.querySelector('main') || document.body;
    return { title: document.title, sidebar: s ? s.innerText.replace(/\\s+/g,' ').slice(0,400) : '(no sidebar)', main: main.innerText.replace(/\\s+/g,' ').slice(0,200), wide: document.documentElement.scrollWidth > innerWidth + 1 }; })()`);
  ws.close();
  await fetch("http://127.0.0.1:9333/json/close/" + t.id);
  return { errors, info };
}

const tools = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, "apps/installed.json")) && (!only.length || only.includes(d)));
const ch = await chrome();
let port = 4901, failures = 0;
for (const tool of tools) {
  const kit = path.join(ROOT, tool);
  const installed = JSON.parse(fs.readFileSync(path.join(kit, "apps/installed.json"), "utf8")).tools;
  const p = port++;
  const srv = spawn("node", ["apps/server/server.js"], { cwd: kit, env: { ...process.env, TLOS_PORT: String(p), TLOS_AUTO_CLAUDE: "off", TLOS_CLAUDE: "/usr/bin/false" }, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; srv.stdout.on("data", (d) => (log += d)); srv.stderr.on("data", (d) => (log += d));
  const up = await waitFor(`http://127.0.0.1:${p}/`);
  console.log(`\n=== ${tool} (helper ${up ? "up" : "DID NOT START"} on ${p})`);
  if (!up) { console.log(log); failures++; srv.kill(); continue; }
  const pages = [["home", `http://127.0.0.1:${p}/`]];
  for (const t of installed) {
    const menu = JSON.parse(fs.readFileSync(path.join(kit, t.app, "menu.json"), "utf8"));
    for (const pg of menu.pages) pages.push([`${t.id}#${pg.id}`, `http://127.0.0.1:${p}/${t.app.replace(/^apps\//, "")}#${pg.id}`]);
  }
  for (const [name, url] of pages) {
    const r = await openPage(url);
    // A fresh copy has no saved Home layout and no connections file yet (Claude writes it in setup, shared v13)
    const bad = r.errors.filter((e) => !/favicon|home\/(layout|connections)\.json/.test(e));
    if (bad.length || r.info?.wide) failures++;
    console.log(`${bad.length ? "FAIL" : "ok  "} ${name} | ${r.info?.title} ${r.info?.wide ? "| SCROLLS SIDEWAYS" : ""}`);
    if (name === "home") console.log("     menu: " + r.info?.sidebar);
    console.log("     shows: " + r.info?.main);
    bad.forEach((e) => console.log("     " + e));
  }
  srv.kill();
}
ch.kill();
console.log(`\n${failures ? failures + " problem(s)" : "No problems"}`);
process.exit(failures ? 1 : 0);
