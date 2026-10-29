/*
  CONNECTIONS: which of the person's apps Claude can reach, shared by every tool (shared version 13)
  ------------------------------------------------------------------------------------------------
  The file is apps/home/data/connections.json. Claude writes it in setup and refreshes it on every
  check-in; the app only reads it. "connected" means Claude actually read from that app on the
  date in "checked", so a green tick can be trusted. Rules only: no screen code in here.
*/
(function () {
  "use strict";

  const TL = window.TaskListOS = window.TaskListOS || {};
  const FILE = "apps/home/data/connections.json";
  const API = "/api/data/home/connections.json";

  const STATUS = {
    "needs-attention": { label: "Needs attention", chip: "chip--warning", rank: 0 },
    "connected": { label: "Connected", chip: "chip--success", rank: 1 },
    "export-only": { label: "Export only", chip: "chip--info", rank: 2 },
    "no-connector": { label: "Can't connect", chip: "chip--outline", rank: 3 },
    "not-connected": { label: "Not connected", chip: "", rank: 4 },
    "not-used": { label: "Not used", chip: "chip--outline", rank: 5 }
  };

  function isObject(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

  // Throws (with a plain reason) if the file isn't in the shape the app reads
  function validate(d) {
    if (!isObject(d)) throw new Error("The connections file isn't a list of apps");
    if (!isObject(d.connections)) throw new Error("connections must be an object keyed by app id");
    Object.keys(d.connections).forEach(function (id) {
      const c = d.connections[id];
      if (!isObject(c) || !STATUS[c.status]) throw new Error("connections." + id + " has an unknown status");
      if (c.status === "connected" && !/^\d{4}-\d{2}-\d{2}/.test(String(c.checked || ""))) {
        throw new Error("connections." + id + " is connected but has no date it was last checked");
      }
    });
    return d;
  }

  function nameOf(id, c) {
    if (c.name) return String(c.name);
    const words = id.replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  // Needs attention first, then connected, then the rest; by name within each
  function list(d) {
    return Object.keys(d.connections).map(function (id) {
      const c = d.connections[id];
      return { id: id, name: nameOf(id, c), status: c.status, how: c.how || "", checked: c.checked || "", note: c.note || "" };
    }).sort(function (a, b) { return STATUS[a.status].rank - STATUS[b.status].rank || a.name.localeCompare(b.name); });
  }

  // "N of M connected" counts only apps Claude reads live or that need fixing: export-only, no-connector,
  // not-connected and not-used rows are still listed in the box, but never show as a permanent gap
  function counts(d) {
    let connected = 0, attention = 0, total = 0;
    list(d).forEach(function (x) {
      if (x.status !== "connected" && x.status !== "needs-attention") return;
      total++;
      if (x.status === "connected") connected++;
      if (x.status === "needs-attention") attention++;
    });
    return { connected: connected, attention: attention, total: total };
  }

  function fixPrompt(name) {
    return "My " + name + " connection needs attention. Follow .claude/skills/connect-a-tool to fix it, then update " + FILE + ".";
  }

  TL.connections = { FILE: FILE, API: API, STATUS: STATUS, validate: validate, list: list, counts: counts, fixPrompt: fixPrompt };
})();
