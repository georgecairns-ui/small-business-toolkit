/*
  MODEL: the skill map data and everything you can ask of it or do to it
  ----------------------------------------------------------------------
  The whole map lives in one file, data/skillmap.json, shared with Claude. The scan
  (apps/skill-map/scan/scan.js or scan.py) writes the skills, links and use counts; the app and
  Claude add areas, tags and recommendations. This file knows the shape. Screens ask questions
  here ("which skills haven't been used lately?") and every click that changes something is a
  function here. app.js saves those changes through the store.

  Sections of skillmap.json (version 1):
    settings          name, business, extra folders to scan, whether the areas have been approved
    scan              when the last scan ran, where it looked, what it noted, how use was counted
    areas             what the business does (Sales, Marketing...). Skills are grouped into these
    nodes             every skill and command: where it lives, what it says it does, how often it was used
    edges             links between skills: "ref" (one names another) and "dup" (same name twice)
    tags              the person's own labels
    recommendations   what Claude suggests doing about a skill (it suggests; a Fix button acts)

  Every number on screen (how many skills, how many unused, use per month) is worked out here from
  the raw scan, never typed in by Claude.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const DAY = 86400000;

  const ORIGINS = [
    { key: "own", label: "My skills", plural: "My skills" },
    { key: "toolkit", label: "Toolkit", plural: "Toolkit skills" },
    { key: "plugin", label: "Plugin", plural: "Plugin skills" },
    { key: "manual", label: "Added by hand", plural: "Added by hand" }
  ];
  const ORIGIN = {};
  ORIGINS.forEach(function (o) { ORIGIN[o.key] = o; });

  const DEFAULT_SETTINGS = { yourName: "", businessName: "", setUp: false, areasApproved: false, extraFolders: [], usageDays: 90 };

  // Group colours come from the theme (see map.js), in this order
  const GROUP_COLOURS = ["--color-accent", "--color-info", "--color-success", "--color-warning", "--cat-waiting", "--cat-delegate", "--cat-quick", "--color-danger", "--cat-later"];

  function arr(v) { return Array.isArray(v) ? v : []; }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }

  // ---------- Reading the file ----------
  function validate(d) {
    if (!d || typeof d !== "object") throw new Error("The file is empty.");
    if (!Array.isArray(d.nodes)) throw new Error('The file has no "nodes" list.');
  }

  // Fill in anything missing so the screens never trip over a half-written or older file.
  // Only tidies what is in memory; it is saved the next time something changes.
  function normalise(d) {
    d.version = 1;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    d.settings.extraFolders = arr(d.settings.extraFolders);
    ["areas", "nodes", "edges", "tags", "recommendations"].forEach(function (k) { d[k] = arr(d[k]); });
    if (!d.scan || typeof d.scan !== "object") d.scan = null;
    d.areas = d.areas.filter(function (a) { return a && a.key && a.label; });
    d.areas.forEach(function (a) { a.blurb = a.blurb || ""; a.ideas = arr(a.ideas); });
    const areaKeys = {};
    d.areas.forEach(function (a) { areaKeys[a.key] = true; });
    d.nodes = d.nodes.filter(function (n) { return n && n.id && n.name; });
    d.nodes.forEach(function (n) {
      n.kind = n.kind === "command" ? "command" : "skill";
      if (!ORIGIN[n.origin]) n.origin = "own";
      n.source = n.source || ORIGIN[n.origin].label;
      n.description = n.description || "";
      n.tags = arr(n.tags);
      n.areaBy = n.areaBy || "scan";
      if (n.area && !areaKeys[n.area]) n.area = null;
      const u = n.uses && typeof n.uses === "object" ? n.uses : {};
      n.uses = { total: Number(u.total) || 0, last90: Number(u.last90) || 0, lastUsed: u.lastUsed || null, byMonth: u.byMonth && typeof u.byMonth === "object" ? u.byMonth : {} };
    });
    const ids = {};
    d.nodes.forEach(function (n) { ids[n.id] = true; });
    d.edges = d.edges.filter(function (e) { return e && ids[e.s] && ids[e.t] && (e.type === "ref" || e.type === "dup"); });
    d.tags = d.tags.filter(function (t) { return t && t.id && t.label; });
    d.recommendations = d.recommendations.filter(function (r) { return r && r.id && r.title; });
    d.recommendations.forEach(function (r) { r.nodeIds = arr(r.nodeIds).filter(function (id) { return ids[id]; }); r.status = r.status || "open"; });
    cache.delete(d);
    return d;
  }

  // ---------- Indexes, built once per version of the data ----------
  const cache = new WeakMap();
  function index(d) {
    let ix = cache.get(d);
    if (ix) return ix;
    ix = { byId: {}, out: {}, into: {}, dups: {}, areaOf: {} };
    d.nodes.forEach(function (n) { ix.byId[n.id] = n; ix.out[n.id] = []; ix.into[n.id] = []; ix.dups[n.id] = []; });
    d.edges.forEach(function (e) {
      if (e.type === "ref") { ix.out[e.s].push(e.t); ix.into[e.t].push(e.s); }
      else { ix.dups[e.s].push(e.t); ix.dups[e.t].push(e.s); }
    });
    d.areas.forEach(function (a) { ix.areaOf[a.key] = a; });
    cache.set(d, ix);
    return ix;
  }
  function nodeById(d, id) { return index(d).byId[id] || null; }
  function areaByKey(d, key) { return index(d).areaOf[key] || null; }
  function touch(d) { cache.delete(d); }

  // ---------- Questions the screens ask ----------
  function notSetUp(d) { return !d.scan || !d.nodes.length; }
  function usageKnown(d) { return !!(d.scan && d.scan.usage && d.scan.usage.files > 0); }
  function usageDays(d) { return Number(d.settings.usageDays) || 90; }
  function isUnused(d, n) { return usageKnown(d) && n.origin !== "manual" && n.uses.last90 === 0; }
  function hasAreas(d) { return d.nodes.some(function (n) { return !!n.area; }); }

  // The small notes a skill can carry. The app works these out; they are suggestions to look, never verdicts.
  function flagsFor(d, n) {
    const out = [];
    if (isUnused(d, n)) out.push({ key: "unused", label: "Not used lately", tone: "warning", why: "No use recorded in Claude Code in the last " + usageDays(d) + " days." });
    if (index(d).dups[n.id].length) out.push({ key: "duplicate", label: "Same name twice", tone: "danger", why: "Another skill has the same name, so Claude may pick the wrong one." });
    if (n.kind === "skill" && n.origin !== "manual" && !n.description) out.push({ key: "nodesc", label: "No description", tone: "info", why: "Claude decides when to use a skill from its description, and this one has none." });
    return out;
  }
  function needsLook(d, n) { return flagsFor(d, n).length > 0; }

  function numbers(d) {
    const skills = d.nodes.filter(function (n) { return n.kind === "skill"; }).length;
    const used = d.nodes.filter(function (n) { return n.uses.last90 > 0; });
    const unused = d.nodes.filter(function (n) { return isUnused(d, n); });
    const dupGroups = duplicateGroups(d);
    const withSkills = {};
    d.nodes.forEach(function (n) { if (n.area) withSkills[n.area] = true; });
    const filled = d.areas.filter(function (a) { return withSkills[a.key]; }).length;
    return {
      total: d.nodes.length, skills: skills, commands: d.nodes.length - skills,
      used90: used.length, unused90: unused.length, uses90: used.reduce(function (s, n) { return s + n.uses.last90; }, 0),
      usesTotal: d.nodes.reduce(function (s, n) { return s + n.uses.total; }, 0),
      dupGroups: dupGroups.length, links: d.edges.filter(function (e) { return e.type === "ref"; }).length,
      areas: d.areas.length, areasFilled: filled, areasEmpty: d.areas.length - filled,
      unassigned: d.nodes.filter(function (n) { return !n.area; }).length,
      attention: d.nodes.filter(function (n) { return needsLook(d, n); }).length
    };
  }

  function duplicateGroups(d) {
    const by = {};
    d.nodes.forEach(function (n) { const k = n.name.toLowerCase(); (by[k] = by[k] || []).push(n); });
    return Object.keys(by).filter(function (k) { return by[k].length > 1; }).sort().map(function (k) { return by[k]; });
  }

  // Groups for the map and the lists: by area ("what it's for") or by source ("where it's from")
  function groups(d, mode) {
    const list = [];
    if (mode === "area") {
      d.areas.forEach(function (a) { list.push({ key: "area:" + a.key, label: a.label, blurb: a.blurb, area: a, nodes: [] }); });
      const none = { key: "area:none", label: "Not grouped yet", blurb: "Skills that are not in an area yet.", nodes: [] };
      const by = {}; list.forEach(function (g) { by[g.key] = g; });
      d.nodes.forEach(function (n) { (n.area && by["area:" + n.area] ? by["area:" + n.area] : none).nodes.push(n); });
      if (none.nodes.length) list.push(none);
      return list.filter(function (g) { return g.nodes.length; });
    }
    const by = {};
    d.nodes.forEach(function (n) {
      const k = "source:" + n.origin + ":" + n.source;
      if (!by[k]) { by[k] = { key: k, label: n.source, blurb: n.origin === "plugin" ? "From the plugin " + n.source + "." : n.origin === "toolkit" ? "Skills that come with " + (n.source === "Toolkit" ? "the toolkit" : n.source) + "." : n.origin === "manual" ? "Skills you added by hand." : "Skills in your own folders.", nodes: [] }; list.push(by[k]); }
      by[k].nodes.push(n);
    });
    return list.sort(function (a, b) { return b.nodes.length - a.nodes.length || (a.label < b.label ? -1 : 1); });
  }

  function search(d, q) {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return [];
    const scored = [];
    d.nodes.forEach(function (n) {
      const name = n.name.toLowerCase();
      let score = 0;
      if (name === s) score = 100; else if (name.indexOf(s) === 0) score = 80; else if (name.indexOf(s) > -1) score = 60;
      else if (n.description.toLowerCase().indexOf(s) > -1) score = 30; else if (n.path.toLowerCase().indexOf(s) > -1) score = 20;
      if (score) scored.push({ n: n, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score || (a.n.name < b.n.name ? -1 : 1); });
    return scored.slice(0, 8).map(function (x) { return x.n; });
  }

  function refsOf(d, id) {
    const ix = index(d);
    function list(ids) { return ids.map(function (i) { return ix.byId[i]; }).filter(Boolean).sort(function (a, b) { return a.name < b.name ? -1 : 1; }); }
    return { uses: list(ix.out[id] || []), usedBy: list(ix.into[id] || []), same: list(ix.dups[id] || []) };
  }

  function topUsed(d, count) {
    return d.nodes.filter(function (n) { return n.uses.last90 > 0; }).sort(function (a, b) { return b.uses.last90 - a.uses.last90 || (a.name < b.name ? -1 : 1); }).slice(0, count || 8);
  }
  function unusedList(d) {
    return d.nodes.filter(function (n) { return isUnused(d, n); }).sort(function (a, b) { return (a.uses.lastUsed || "") < (b.uses.lastUsed || "") ? -1 : a.name < b.name ? -1 : 1; });
  }
  // Use per month for the last 12 months, summed over every skill
  function monthTotals(d) {
    const now = new Date();
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      out.push({ month: dt.toISOString().slice(0, 7), n: 0 });
    }
    d.nodes.forEach(function (n) { out.forEach(function (m) { m.n += Number(n.uses.byMonth[m.month]) || 0; }); });
    return out;
  }
  function monthsOf(n) {
    const now = new Date();
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = dt.toISOString().slice(0, 7);
      out.push({ month: key, n: Number(n.uses.byMonth[key]) || 0 });
    }
    return out;
  }
  function monthLabel(key) {
    const p = key.split("-");
    return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  }

  function openRecs(d) { return d.recommendations.filter(function (r) { return r.status === "open"; }); }
  function doneRecs(d) { return d.recommendations.filter(function (r) { return r.status === "done"; }); }
  // What needs a person's look on the Review page: Claude's open suggestions, plus what the app spotted itself
  function reviewCount(d) { return openRecs(d).length; }

  function daysSince(iso) {
    const t = iso ? new Date(String(iso).length === 10 ? iso + "T12:00:00Z" : iso).getTime() : NaN;
    return isNaN(t) ? null : Math.floor((Date.now() - t) / DAY);
  }
  function usedLabel(iso) {
    const n = daysSince(iso);
    if (n === null) return "Never";
    if (n <= 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n < 31) return n + " days ago";
    if (n < 365) return Math.round(n / 30) + (Math.round(n / 30) === 1 ? " month ago" : " months ago");
    return "Over a year ago";
  }
  function scanLabel(d) {
    if (!d.scan || !d.scan.at) return "Not scanned yet";
    const n = daysSince(d.scan.at);
    const t = new Date(d.scan.at);
    const clock = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (n <= 0) return "Scanned today at " + clock;
    if (n === 1) return "Scanned yesterday";
    return "Scanned " + n + " days ago";
  }

  // The map's data: a centre, one hub per group, one dot per skill, and the links between skills
  function graph(d, mode) {
    const gs = groups(d, mode);
    const nodes = [{ id: "core", kind: "core", label: "Claude", r: 17, group: -1 }];
    const links = [];
    gs.forEach(function (g, gi) {
      const hub = { id: "hub:" + g.key, kind: "hub", label: g.label, r: 13 + Math.min(12, Math.sqrt(g.nodes.length) * 2), group: gi, count: g.nodes.length, key: g.key };
      nodes.push(hub);
      links.push({ s: "core", t: hub.id, type: "hub" });
      g.nodes.slice().sort(function (a, b) { return b.uses.last90 - a.uses.last90 || (a.name < b.name ? -1 : 1); }).forEach(function (n) {
        nodes.push({ id: n.id, kind: "skill", label: n.name, r: 3.4 + Math.min(6, Math.sqrt(n.uses.last90) * 1.1), group: gi, uses: n.uses.last90, hub: hub.id, skillKind: n.kind });
        links.push({ s: hub.id, t: n.id, type: "spoke" });
      });
    });
    d.edges.forEach(function (e) { links.push({ s: e.s, t: e.t, type: e.type }); });
    return { nodes: nodes, links: links, groups: gs.map(function (g, i) { return { key: g.key, label: g.label, count: g.nodes.length, colour: GROUP_COLOURS[i % GROUP_COLOURS.length], shade: Math.floor(i / GROUP_COLOURS.length) }; }) };
  }

  // ---------- Changes the person makes (each edits the data; app.js saves it) ----------
  const mut = {
    setArea: function (d, id, area) {
      const n = nodeById(d, id);
      if (!n) return;
      n.area = area || null;
      n.areaBy = "you";
    },
    addTag: function (d, id, label) {
      const n = nodeById(d, id);
      const text = String(label || "").trim().slice(0, 30);
      if (!n || !text) return;
      let tag = d.tags.find(function (t) { return t.label.toLowerCase() === text.toLowerCase(); });
      if (!tag) { tag = { id: slug(text) || ui.makeId("t"), label: text }; if (d.tags.some(function (t) { return t.id === tag.id; })) tag.id = ui.makeId("t"); d.tags.push(tag); }
      if (n.tags.indexOf(tag.id) === -1) n.tags.push(tag.id);
    },
    removeTag: function (d, id, tagId) {
      const n = nodeById(d, id);
      if (!n) return;
      n.tags = n.tags.filter(function (t) { return t !== tagId; });
    },
    addManual: function (d, f) {
      const name = String(f.name || "").trim();
      if (!name) return null;
      const node = {
        id: ui.makeId("m"), name: name, kind: "skill", origin: "manual", source: "Added by hand", plugin: null, path: String(f.where || "Added by hand").trim() || "Added by hand",
        description: String(f.description || "").trim().slice(0, 500), area: f.area || null, areaBy: f.area ? "you" : "scan", tags: [],
        uses: { total: 0, last90: 0, lastUsed: null, byMonth: {} }, modified: ui.isoDate(), lines: 0, bytes: 0
      };
      d.nodes.push(node);
      touch(d);
      return node;
    },
    updateManual: function (d, id, f) {
      const n = nodeById(d, id);
      if (!n || n.origin !== "manual") return;
      if (f.name != null && String(f.name).trim()) n.name = String(f.name).trim();
      if (f.description != null) n.description = String(f.description).trim().slice(0, 500);
      if (f.where != null && String(f.where).trim()) n.path = String(f.where).trim();
    },
    removeManual: function (d, id) {
      const n = nodeById(d, id);
      if (!n || n.origin !== "manual") return;
      d.nodes = d.nodes.filter(function (x) { return x.id !== id; });
      d.edges = d.edges.filter(function (e) { return e.s !== id && e.t !== id; });
      d.recommendations.forEach(function (r) { r.nodeIds = r.nodeIds.filter(function (i) { return i !== id; }); });
      touch(d);
    },
    decideRec: function (d, id, status) {
      const r = d.recommendations.find(function (x) { return x.id === id; });
      if (r) { r.status = status; r.decidedAt = new Date().toISOString(); }
    },
    approveAreas: function (d) { d.settings.areasApproved = true; },
    setSettings: function (d, values, areas) {
      d.settings.yourName = values.yourName;
      d.settings.businessName = values.businessName;
      d.settings.extraFolders = values.extraFolders;
      // Areas: keep the key, change the words; new ones get a key; removed ones free their skills
      const keep = {};
      const next = areas.map(function (a) {
        let key = a.key;
        if (!key) { key = slug(a.label) || ui.makeId("a"); if (keep[key] || d.areas.some(function (x) { return x.key === key; })) key = key + "-" + Math.random().toString(36).slice(2, 5); }
        keep[key] = true;
        const old = d.areas.find(function (x) { return x.key === key; });
        return { key: key, label: a.label, blurb: a.blurb, ideas: old ? old.ideas : [] };
      });
      d.nodes.forEach(function (n) { if (n.area && !keep[n.area]) { n.area = null; n.areaBy = "scan"; } });
      d.areas = next;
      touch(d);
    }
  };

  window.SM = window.SM || {};
  window.SM.model = {
    ORIGINS: ORIGINS, ORIGIN: ORIGIN, GROUP_COLOURS: GROUP_COLOURS, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    validate: validate, normalise: normalise, nodeById: nodeById, areaByKey: areaByKey,
    notSetUp: notSetUp, usageKnown: usageKnown, usageDays: usageDays, isUnused: isUnused, hasAreas: hasAreas,
    flagsFor: flagsFor, needsLook: needsLook, numbers: numbers, duplicateGroups: duplicateGroups, groups: groups,
    search: search, refsOf: refsOf, topUsed: topUsed, unusedList: unusedList, monthTotals: monthTotals, monthsOf: monthsOf, monthLabel: monthLabel,
    openRecs: openRecs, doneRecs: doneRecs, reviewCount: reviewCount, usedLabel: usedLabel, scanLabel: scanLabel, graph: graph, mut: mut
  };
})();
