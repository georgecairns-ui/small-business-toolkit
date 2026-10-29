/*
  MODEL: the rules of the Toolkit, as plain functions
  ---------------------------------------------------
  No screen code in here. The app's 3 pages and the Home boxes ask these functions, so a status, a count
  or a prompt means the same thing everywhere.

  The data file is apps/toolkit/data/toolkit.json. Claude fills it; the app only ever changes an idea's
  status (Not now). Every button hands Claude a job: the prompts are written here, word for word, so the
  person never has to know what to ask for.

  Which apps are connected comes from the shared file every tool reads, apps/home/data/connections.json
  (shared version 13). app.js and home-boxes.js load it and hand it over with setConnections.

  Needs ../shared/js/connections.js (window.TaskListOS.connections) and app/apps-list.js first (window.TK.list).
*/
(function () {
  "use strict";

  const L = window.TK.list;
  const FILE = "apps/toolkit/data/toolkit.json";
  const CONN_FILE = "apps/home/data/connections.json";

  const CONNS = window.TaskListOS.connections;
  const CONN = CONNS.STATUS;
  const TOOL = {
    "set-up": { label: "Set up", chip: "chip--success", button: "Run it again" },
    "part-done": { label: "Part done", chip: "chip--info", button: "Carry on" },
    "not-yet": { label: "Not yet", chip: "", button: "Set up now" },
    "skipped": { label: "Skipped for now", chip: "chip--outline", button: "Set up now" }
  };
  const IDEA = ["new", "done", "dismissed"];

  // ---------- Checking the file ----------
  // Throws (with a plain reason) if the file isn't in the shape the app reads. The store then says the file needs a quick fix.
  function isObject(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function validate(d) {
    if (!isObject(d)) throw new Error("The toolkit file isn't a list of settings");
    if (!isObject(d.tools)) throw new Error("tools must be an object keyed by tool id");
    if (!Array.isArray(d.ideas)) throw new Error("ideas must be a list");
    if (!Array.isArray(d.builds)) throw new Error("builds must be a list");
    Object.keys(d.tools).forEach(function (id) {
      const t = d.tools[id];
      if (!isObject(t) || !TOOL[t.status]) throw new Error("tools." + id + " has an unknown status");
    });
    d.ideas.forEach(function (i, n) {
      if (!isObject(i) || typeof i.id !== "string" || IDEA.indexOf(i.status) === -1) throw new Error("ideas[" + n + "] needs an id and a known status");
    });
    d.builds.forEach(function (b, n) {
      if (!isObject(b) || typeof b.id !== "string") throw new Error("builds[" + n + "] needs an id");
    });
    return d;
  }

  // ---------- Reading it ----------
  function appById(id) { return L.APPS.find(function (a) { return a.id === id; }) || null; }
  function toolById(id) { return L.TOOLS.find(function (t) { return t.id === id; }) || null; }
  // Connections come from the shared file, apps/home/data/connections.json (shared v13), not from toolkit.json.
  // An app with no entry counts as Not connected
  let shared = {};
  let sharedProblem = "";   // why connections.json couldn't be read, shown on the Connections page and the Home box
  function setConnections(obj) { shared = obj && typeof obj === "object" ? obj : {}; sharedProblem = ""; }
  function setConnectionsProblem(text) { sharedProblem = text || ""; }
  function connectionsProblem() { return sharedProblem; }
  // Rows in connections.json for apps that aren't cards on the page (LinkedIn, Instagram, an iCloud email row,
  // anything added through Connect something else), in the shared order: needing attention first. Not-used rows are
  // left out, as in the shared Home box
  function extras(d) { return CONNS.list({ connections: shared }).filter(function (x) { return !appById(x.id) && x.status !== "not-used"; }); }
  // A no-connector row for their email provider (step 2 keys it by the provider, for example icloud-mail or icloud,
  // and says why in its note). It answers "connect your email": there is nothing more to connect. Kept simple on purpose:
  // the key names a mail provider, or the note mentions email.
  function emailHasNoConnector() {
    return extras().some(function (x) {
      return x.status === "no-connector" && (/mail|icloud|outlook|hotmail|yahoo/i.test(x.id) || /e-?mail/i.test(x.note));
    });
  }
  function conn(d, id) { return shared[id] || { status: "not-connected", how: "", note: "", checked: "" }; }
  function connStatus(d, id) { return conn(d, id).status; }
  function tool(d, id) { return d.tools[id] || { status: "not-yet", date: "", note: "" }; }
  function toolStatus(d, id) { return tool(d, id).status; }

  // connected and attention come from the shared count, the same as every tool's Home box: every row in the file,
  // including the Other connections
  function counts(d) {
    const s = CONNS.counts({ connections: shared });
    const connected = s.connected, attention = s.attention;
    let setUp = 0;
    L.TOOLS.forEach(function (t) { if (toolStatus(d, t.id) === "set-up") setUp++; });
    return { connected: connected, attention: attention, apps: L.APPS.length, setUp: setUp, tools: L.TOOLS.length };
  }
  // The shared count: only apps Claude reads live or that need fixing, so export-only and the rest never show as a gap
  function connectedLine(d) {
    const s = CONNS.counts({ connections: shared });
    return s.total ? s.connected + " of " + s.total + " connected" : "Nothing connected yet";
  }
  function setUpLine(d) { const c = counts(d); return c.setUp + " of " + c.tools + " tools set up"; }

  function newIdeas(d) { return d.ideas.filter(function (i) { return i.status === "new"; }); }
  // Newest first
  function builds(d) { return d.builds.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }); }
  // "A, B and C"
  function andList(names) { return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; }
  // Every tool that uses any of these apps, in sidebar order
  function union(apps) { return L.TOOLS.map(function (t) { return t.id; }).filter(function (id) { return apps.some(function (a) { return a.usedBy.indexOf(id) !== -1; }); }); }
  function toolNames(ids) { return ids.map(function (id) { const t = toolById(id); return t ? t.name : id; }); }

  // ---------- The prompts (word for word from the spec) ----------
  function guideFile(app) { return app.guide; }
  const prompt = {
    connect: function (app) { return "Connect " + app.name + " for me. Follow " + guideFile(app) + " and .claude/skills/connect-a-tool, then update " + CONN_FILE + "."; },
    check: function (app) { return "Check my " + app.name + " connection still works and tell me what you can see. Update " + CONN_FILE + "."; },
    fix: function (app) { return "My " + app.name + " connection needs attention. Follow " + guideFile(app) + " to fix it, then update " + CONN_FILE + "."; },
    // Export only, or no Claude connector when they last looked: one may have arrived since
    lookAgain: function (app) { return "Check whether there's a Claude connector for " + app.name + " now. Follow " + guideFile(app) + " and .claude/skills/connect-a-tool, then update " + CONN_FILE + "."; },
    // A row with no card (Other connections): no guide of its own, so connect-a-tool
    checkOther: function (name) { return "Check my " + name + " connection still works and tell me what you can see. Follow .claude/skills/connect-a-tool, then update " + CONN_FILE + "."; },
    fixOther: function (name) { return CONNS.fixPrompt(name); },
    lookAgainOther: function (name) { return "Check whether there's a Claude connector for " + name + " now. Follow .claude/skills/connect-a-tool, then update " + CONN_FILE + "."; },
    connectElse: function () { return "I'd like to connect another app to my toolkit. Ask me which one, then use .claude/skills/connect-a-tool."; },
    // Several apps would do (Gmail or Microsoft 365): Claude asks which one they use
    connectOneOf: function (label, apps) {
      return "Connect " + label + " for me. Ask me which I use: " + apps.map(function (a) { return a.name; }).join(" or ") +
        ". Then follow its guide in setup/connections/ and .claude/skills/connect-a-tool, and update " + CONN_FILE + ".";
    },
    setUp: function (t) { return "Set up " + t.name + " for me. Follow the \"" + t.name + "\" part of START-HERE.md, and skip anything my notes in context/ already answer."; },
    build: function (job, sentence) {
      const s = String(sentence || "").trim();
      return job + ". " + (s ? s + (/[.?!]$/.test(s) ? "" : ".") + " " : "") + "Follow .claude/skills/build-on-my-toolkit.";
    },
    // The same job as the Find ideas button, for when the helper can't start Claude itself
    findIdeas: function () { return "Find new ideas for my toolkit. Follow .claude/skills/whats-next: read " + FILE + ", context/ and every installed tool's data file, then add up to 5 new ideas to the ideas list in " + FILE + " (never repeat a dismissed one). Connect nothing, send nothing, change nothing else."; },
    whatsNext: function () { return "Look at my toolkit and tell me the 3 things that would save me the most time next. Follow .claude/skills/whats-next."; }
  };

  // The one button on a connection card
  function connButton(d, app) {
    const s = connStatus(d, app.id);
    if (s === "connected") return { label: "Check it", prompt: prompt.check(app) };
    if (s === "needs-attention") return { label: "Fix it", prompt: prompt.fix(app) };
    if (s === "export-only" || s === "no-connector") return { label: "Look again", prompt: prompt.lookAgain(app) };
    return { label: "Connect", prompt: prompt.connect(app) };
  }
  function toolButton(d, t) { return { label: TOOL[toolStatus(d, t.id)].button, prompt: prompt.setUp(t) }; }

  // ---------- Next steps (Home) ----------
  // In this order: tools not set up yet, key apps not connected (and any connection needing attention), then new ideas.
  function nextSteps(d, max) {
    const out = [];
    L.TOOLS.forEach(function (t) {
      const s = toolStatus(d, t.id);
      if (s !== "not-yet" && s !== "part-done") return;
      out.push({ kind: "tool", title: (s === "part-done" ? "Finish setting up " : "Set up ") + t.name, sub: t.what, label: TOOL[s].button, prompt: prompt.setUp(t) });
    });
    L.APPS.forEach(function (a) {
      if (connStatus(d, a.id) === "needs-attention") out.push({ kind: "connection", title: a.name + " needs attention", sub: a.what, label: "Fix it", prompt: prompt.fix(a) });
    });
    L.KEY_APPS.forEach(function (need) {
      if (need.tool && ["set-up", "part-done"].indexOf(toolStatus(d, need.tool)) === -1) return;
      const apps = need.anyOf.map(appById);
      const statuses = apps.map(function (a) { return connStatus(d, a.id); });
      // Done, already listed as needing attention, or the person has said they don't use any of them
      if (statuses.indexOf("connected") !== -1 || statuses.indexOf("needs-attention") !== -1) return;
      // Read from an export, or there's no Claude connector for it: nothing more to connect (shared v13)
      if (statuses.indexOf("export-only") !== -1 || statuses.indexOf("no-connector") !== -1) return;
      // Their email provider has no Claude connector (a row of its own, such as icloud-mail): nothing more to ask for
      if (need.anyOf.indexOf("gmail-and-google-calendar") !== -1 && emailHasNoConnector()) return;
      const open = apps.filter(function (a, i) { return statuses[i] !== "not-used"; });
      if (!open.length) return;
      const usedBy = andList(toolNames(need.tool ? [need.tool] : union(open)));
      if (open.length === 1) out.push({ kind: "connection", title: "Connect " + open[0].name, sub: "Used by " + usedBy, label: "Connect", prompt: prompt.connect(open[0]) });
      else out.push({ kind: "connection", title: "Connect " + need.label, sub: open.map(function (a) { return a.name; }).join(" or ") + ", used by " + usedBy, label: "Connect", prompt: prompt.connectOneOf(need.label, open) });
    });
    newIdeas(d).forEach(function (i) {
      out.push({ kind: "idea", id: i.id, title: i.title || "An idea from Claude", sub: i.why || "", label: "Do it", prompt: i.prompt || prompt.whatsNext() });
    });
    return typeof max === "number" ? out.slice(0, max) : out;
  }

  // Connections needing attention first, then connected, then the rest, in list order
  function connectionsByUrgency(d) {
    const rank = { "needs-attention": 0, "connected": 1, "export-only": 2, "no-connector": 3, "not-connected": 4, "not-used": 5 };
    return L.APPS.map(function (a, i) { return { app: a, i: i, status: connStatus(d, a.id) }; })
      .sort(function (x, y) { return rank[x.status] - rank[y.status] || x.i - y.i; });
  }

  // ---------- Opening Claude ----------
  // The Claude desktop app's Code tab, in this folder, with the job typed in. Without the folder there is no link (null):
  // the page offers Copy the prompt instead and says so.
  function claudeLink(text, folder) {
    if (!folder) return null;
    return "claude://code/new?q=" + encodeURIComponent(String(text || "").slice(0, 12000)) + "&folder=" + encodeURIComponent(folder);
  }

  window.TK.model = {
    FILE: FILE, CONN: CONN, TOOL: TOOL, validate: validate, appById: appById, toolById: toolById,
    setConnections: setConnections, setConnectionsProblem: setConnectionsProblem, connectionsProblem: connectionsProblem, extras: extras, conn: conn, connStatus: connStatus, tool: tool, toolStatus: toolStatus, counts: counts, connectedLine: connectedLine, setUpLine: setUpLine,
    newIdeas: newIdeas, builds: builds, toolNames: toolNames, andList: andList, prompt: prompt, connButton: connButton, toolButton: toolButton,
    nextSteps: nextSteps, connectionsByUrgency: connectionsByUrgency, claudeLink: claudeLink
  };
})();
