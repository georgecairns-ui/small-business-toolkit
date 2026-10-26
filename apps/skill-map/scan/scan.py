#!/usr/bin/env python3
"""
SKILL MAP OS: the scan (Python version)
---------------------------------------
Finds every skill and command Claude can use on this computer, works out how they connect and how
often each was used, and saves the result in apps/skill-map/data/skillmap.json for the app to draw.

  python3 apps/skill-map/scan/scan.py              scan and save
  python3 apps/skill-map/scan/scan.py --dry-run    scan and print the summary, save nothing

scan.js does the same job with Node, for computers that have Node. Both write exactly the same file
(the test is in maintainers/TESTING.md), so keep them in step. Works with Python 3.8 or later.

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
"""
import datetime
import hashlib
import json
import os
import re
import shutil
import sys

HOME = os.path.abspath(os.environ.get("SKILLMAP_HOME") or os.path.expanduser("~"))
KIT = os.path.abspath(os.environ.get("SKILLMAP_KIT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
APP_DIR = os.path.join(KIT, "apps", "skill-map")
DATA_FILE = os.path.join(APP_DIR, "data", "skillmap.json")
USAGE_DAYS = 90
DESCRIPTION_LIMIT = 500
MAX_REFS_PER_SKILL = 20
RANK = {"own": 0, "toolkit": 1, "plugin": 2, "manual": 3}


def parse_now():
    raw = os.environ.get("SKILLMAP_NOW")
    if not raw:
        return datetime.datetime.now(datetime.timezone.utc)
    raw = raw.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    parsed = datetime.datetime.fromisoformat(raw)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime.timezone.utc)
    return parsed.astimezone(datetime.timezone.utc)


NOW = parse_now()


# ---------- small helpers ----------

def fail(message):
    sys.stderr.write("Skill Map scan: " + message + "\n")
    sys.exit(1)


def exists(p):
    return os.path.exists(p)


def is_dir(p):
    return os.path.isdir(p)


def is_file(p):
    return os.path.isfile(p)


def list_dir(p):
    try:
        return sorted(os.listdir(p))
    except OSError:
        return []


def read_text(p):
    with open(p, "r", encoding="utf-8", errors="replace", newline="") as f:
        return f.read()


def read_json_file(p):
    try:
        text = read_text(p)
    except OSError:
        return None
    try:
        return json.loads(text)
    except ValueError as e:
        fail(p + " is not valid JSON (" + str(e) + "). Fix or move it, then scan again.")


def slash(p):
    return p.replace(os.sep, "/")


def short_path(p):
    rel = os.path.relpath(p, HOME)
    if rel and not rel.startswith("..") and not os.path.isabs(rel):
        return "~/" + slash(rel)
    return slash(p)


def id_for(p):
    return "s-" + hashlib.sha1(short_path(p).encode("utf-8")).hexdigest()[:10]


def day_of(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%d")


def clean_text(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def clip(s):
    return s[:DESCRIPTION_LIMIT] + "…" if len(s) > DESCRIPTION_LIMIT else s


def iso_millis(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + ("%03d" % (dt.microsecond // 1000)) + "Z"


FRONT = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|\Z)")
KEY = re.compile(r"^([A-Za-z0-9_-]+):[ \t]*(.*)$")
INDENTED = re.compile(r"^[ \t]+\S")
BLOCK = re.compile(r"^[>|][+-]?$")
QUOTED = re.compile(r"^([\"'])([\s\S]*)\1$")


def parse_frontmatter(text):
    """The top of a skill file: --- name: ... description: ... ---, then the instructions."""
    text = re.sub(r"^﻿", "", text)
    m = FRONT.match(text)
    if not m:
        return {}, text
    fm = {}
    lines = re.split(r"\r?\n", m.group(1))
    i = 0
    while i < len(lines):
        k = KEY.match(lines[i])
        if k:
            value = k.group(2)
            parts = []
            if BLOCK.match(value.strip()):
                value = ""
            while i + 1 < len(lines) and (INDENTED.match(lines[i + 1]) or lines[i + 1].strip() == ""):
                parts.append(lines[i + 1])
                i += 1
            joined = (value + " " + " ".join(parts)).strip()
            q = QUOTED.match(joined)
            if q:
                joined = q.group(2)
            fm[k.group(1)] = clean_text(joined)
        i += 1
    return fm, text[len(m.group(0)):]


# ---------- the settings and what the person already added ----------

def load_existing():
    data = read_json_file(DATA_FILE)
    return data if isinstance(data, dict) else None


def default_areas():
    d = read_json_file(os.path.join(APP_DIR, "areas-default.json"))
    if not d or not isinstance(d.get("areas"), list):
        fail("apps/skill-map/areas-default.json is missing, so the starting areas can't be set up.")
    return d["areas"]


# ---------- finding skills ----------

def toolkit_skill_owners():
    """Which tool each toolkit skill belongs to, from toolkit.json at the root and in attached tools."""
    owners = {}
    files = [os.path.join(KIT, "toolkit.json")]
    for name in list_dir(os.path.join(KIT, "apps")):
        files.append(os.path.join(KIT, "apps", name, "toolkit.json"))
    for f in files:
        j = read_json_file(f) if is_file(f) else None
        if not isinstance(j, dict) or not isinstance(j.get("skills"), list):
            continue
        for s in j["skills"]:
            if s not in owners:
                owners[s] = j.get("name") or "Toolkit"
    return owners


def discover(existing, warnings):
    found = []
    seen_real = set()
    sources = []

    def real_of(p):
        try:
            return os.path.realpath(p)
        except OSError:
            return None

    def add_skill_folder(d, origin, source, plugin):
        f = os.path.join(d, "SKILL.md")
        if not is_file(f):
            return False
        real = real_of(d)
        if not real or real in seen_real:
            return True
        seen_real.add(real)
        found.append({"file": f, "dir": d, "kind": "skill", "origin": origin, "source": source, "plugin": plugin, "fallback": os.path.basename(d)})
        return True

    def add_command_file(f, origin, source, plugin):
        if not is_file(f):
            return
        real = real_of(f)
        if not real or real in seen_real:
            return
        seen_real.add(real)
        found.append({"file": f, "dir": os.path.dirname(f), "kind": "command", "origin": origin, "source": source, "plugin": plugin, "fallback": re.sub(r"\.md$", "", os.path.basename(f), flags=re.I)})

    def scan_skills_folder(root, origin, source, plugin):
        n = 0
        for name in list_dir(root):
            if name.startswith("."):
                continue
            d = os.path.join(root, name)
            if os.path.islink(d) and not exists(d):
                warnings.append("A link in " + short_path(root) + " points nowhere: " + name + ". Skipped.")
                continue
            if is_dir(d) and add_skill_folder(d, origin, source, plugin):
                n += 1
        return n

    def scan_commands_folder(root, origin, source, plugin):
        n = 0
        for name in list_dir(root):
            if not re.search(r"\.md$", name, flags=re.I) or name.startswith("."):
                continue
            f = os.path.join(root, name)
            if not exists(f):
                warnings.append("A link in " + short_path(root) + " points nowhere: " + name + ". Skipped.")
                continue
            add_command_file(f, origin, source, plugin)
            n += 1
        return n

    # 1. The person's own skills and commands
    own = os.path.join(HOME, ".claude", "skills")
    n_own = scan_skills_folder(own, "own", "My skills", None)
    n_cmd = scan_commands_folder(os.path.join(HOME, ".claude", "commands"), "own", "My skills", None)
    sources.append({"id": "own", "label": "My skills", "path": short_path(own), "count": n_own + n_cmd})

    # 2. Extra folders they added in Preferences
    extra = []
    if existing and isinstance(existing.get("settings"), dict) and isinstance(existing["settings"].get("extraFolders"), list):
        extra = existing["settings"]["extraFolders"]
    for raw in extra:
        raw = str(raw)
        d = os.path.abspath(re.sub(r"^~(?=$|[\\/])", lambda _m: HOME, raw))
        if not is_dir(d):
            warnings.append("The folder you added, " + raw + ", could not be found. Skipped.")
            continue
        label = os.path.basename(d)
        n = scan_skills_folder(d, "own", label, None)
        if is_file(os.path.join(d, "SKILL.md")) and add_skill_folder(d, "own", label, None):
            n += 1
        n += scan_commands_folder(d, "own", label, None)
        sources.append({"id": "folder:" + short_path(d), "label": label, "path": short_path(d), "count": n})

    # 3. The toolkit's own skills (this folder's .claude/skills)
    owners = toolkit_skill_owners()
    kit_skills = os.path.join(KIT, ".claude", "skills")
    n_kit = 0
    for name in list_dir(kit_skills):
        if name.startswith("."):
            continue
        d = os.path.join(kit_skills, name)
        if is_dir(d) and add_skill_folder(d, "toolkit", owners.get(name) or "Toolkit", None):
            n_kit += 1
    sources.append({"id": "toolkit", "label": "Toolkit", "path": short_path(kit_skills), "count": n_kit})

    # 4. Plugins Claude has installed
    installed = read_json_file(os.path.join(HOME, ".claude", "plugins", "installed_plugins.json"))
    plugins = installed.get("plugins") if isinstance(installed, dict) and isinstance(installed.get("plugins"), dict) else {}
    for pid in sorted(plugins.keys()):
        entries = plugins[pid] if isinstance(plugins[pid], list) else [plugins[pid]]
        entry = entries[0] if entries else None
        root = entry.get("installPath") if isinstance(entry, dict) else None
        if not root or not is_dir(root):
            warnings.append("The plugin " + pid + " is installed but its folder could not be found. Skipped.")
            continue
        plugin_name = pid.split("@")[0]
        n = scan_skills_folder(os.path.join(root, "skills"), "plugin", plugin_name, plugin_name) + \
            scan_commands_folder(os.path.join(root, "commands"), "plugin", plugin_name, plugin_name)
        sources.append({"id": "plugin:" + pid, "label": plugin_name, "path": short_path(root), "count": n})
    return found, sources


def read_node(f, existing_by_id, warnings):
    try:
        text = read_text(f["file"])
    except OSError as e:
        warnings.append("Could not read " + short_path(f["file"]) + " (" + str(e.errno) + "). Skipped.")
        return None
    st = os.stat(f["file"])
    fm, body = parse_frontmatter(text)
    name = fm.get("name") or f["fallback"]
    description = fm.get("description") or ""
    if not description:
        for line in re.split(r"\r?\n", body):
            t = re.sub(r"^#+\s*", "", line).strip()
            if t:
                description = clean_text(t)
                break
    nid = id_for(f["dir"] if f["kind"] == "skill" else f["file"])
    before = existing_by_id.get(nid) or {}
    kept_area = bool(before.get("areaBy")) and before.get("areaBy") != "scan"
    node = {
        "id": nid,
        "name": name,
        "kind": f["kind"],
        "origin": f["origin"],
        "source": f["source"],
        "plugin": f["plugin"],
        "path": short_path(f["dir"] if f["kind"] == "skill" else f["file"]),
        "description": clip(description),
        "area": (before.get("area") or None) if kept_area else None,
        "areaBy": before["areaBy"] if kept_area else "scan",
        "tags": before["tags"] if isinstance(before.get("tags"), list) else [],
        "uses": {"total": 0, "last90": 0, "lastUsed": None, "byMonth": {}},
        "modified": day_of(datetime.datetime.fromtimestamp(int(st.st_mtime), datetime.timezone.utc)),
        "lines": len(text.split("\n")),
        "bytes": st.st_size,
    }
    if before.get("note"):
        node["note"] = before["note"]
    return node, body


# ---------- links between skills ----------

HYPHENATED = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+(?![A-Za-z0-9_-])")
TICKED = re.compile(r"`([A-Za-z0-9][A-Za-z0-9_-]*)`")
SLASHED = re.compile(r"(?:^|[\s(])/([A-Za-z0-9][A-Za-z0-9_-]*)(?![A-Za-z0-9_/-])", re.M)


def rank_key(n):
    return (RANK[n["origin"]], n["id"])


def build_edges(nodes, bodies):
    by_name = {}
    for n in nodes:
        by_name.setdefault(n["name"].lower(), []).append(n)

    def best(lst):
        return sorted(lst, key=rank_key)[0]

    edges = []
    # Same name in 2 or more places
    for lst in by_name.values():
        if len(lst) < 2:
            continue
        main = best(lst)
        for n in lst:
            if n is not main:
                edges.append({"s": n["id"], "t": main["id"], "type": "dup"})

    # One skill naming another: a hyphenated name anywhere, a single word only in `backticks` or as a /command
    for n in nodes:
        body = bodies.get(n["id"], "")
        hits = set()
        for m in HYPHENATED.finditer(body):
            hits.add(m.group(0).lower())
        for m in TICKED.finditer(body):
            hits.add(m.group(1).lower())
        for m in SLASHED.finditer(body):
            hits.add(m.group(1).lower())
        targets = []
        for h in hits:
            if h not in by_name:
                continue
            t = best(by_name[h])
            if t["id"] != n["id"] and t["name"].lower() != n["name"].lower():
                targets.append(t["id"])
        targets = sorted(set(targets))[:MAX_REFS_PER_SKILL]
        for t in targets:
            edges.append({"s": n["id"], "t": t, "type": "ref"})
    edges.sort(key=lambda e: (e["type"], e["s"], e["t"]))
    return edges


# ---------- how often each skill was used ----------

def jsonl_files(root):
    out = []
    cutoff = NOW.timestamp() - 400 * 86400

    def walk(d):
        try:
            entries = sorted(os.scandir(d), key=lambda e: e.name)
        except OSError:
            return
        for e in entries:
            if e.is_dir():
                walk(e.path)
            elif e.is_file() and e.name.endswith(".jsonl"):
                if os.stat(e.path).st_mtime >= cutoff:
                    out.append(e.path)

    walk(root)
    return out


COMMAND = re.compile(r"<command-name>/?([^<\s]+)</command-name>")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}")


def count_usage(nodes):
    root = os.path.join(HOME, ".claude", "projects")
    summary = {"files": 0, "events": 0, "from": None, "to": None, "note": "Claude Code only"}
    if not is_dir(root):
        summary["note"] = "No Claude Code history was found on this computer"
        return summary
    by_name = {}
    for n in nodes:
        by_name.setdefault(n["name"].lower(), []).append(n)

    def best(lst, prefix):
        srt = sorted(lst, key=rank_key)
        if prefix:
            for n in srt:
                if n["plugin"] and n["plugin"].lower() == prefix:
                    return n
        return srt[0]

    cutoff = day_of(NOW - datetime.timedelta(days=USAGE_DAYS))
    seen = set()
    files = jsonl_files(root)
    summary["files"] = len(files)
    for file in files:
        with open(file, "r", encoding="utf-8", errors="replace", newline="\n") as fh:
            for line in fh:
                skill_call = '"Skill"' in line
                slash_cmd = "<command-name>" in line
                if not skill_call and not slash_cmd:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(rec, dict):
                    continue
                ts = rec.get("timestamp") if isinstance(rec.get("timestamp"), str) else ""
                if not DATE.match(ts):
                    continue
                message = rec.get("message")
                content = message.get("content") if isinstance(message, dict) else None
                raws = []
                if rec.get("type") == "assistant" and isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "Skill" and isinstance(c.get("input"), dict) and isinstance(c["input"].get("skill"), str):
                            raws.append((c["input"]["skill"], c.get("id") or rec.get("uuid")))
                elif rec.get("type") == "user" and isinstance(content, str):
                    m = COMMAND.search(content)
                    if m:
                        raws.append((m.group(1), rec.get("uuid")))
                for raw_name, key in raws:
                    raw = raw_name.lower()
                    colon = raw.rfind(":")
                    name = raw if colon == -1 else raw[colon + 1:]
                    prefix = "" if colon == -1 else raw[:colon]
                    lst = by_name.get(name)
                    if not lst:
                        continue
                    if key:
                        if key in seen:
                            continue
                        seen.add(key)
                    node = best(lst, prefix)
                    day = ts[:10]
                    u = node["uses"]
                    u["total"] += 1
                    if day >= cutoff:
                        u["last90"] += 1
                    if not u["lastUsed"] or day > u["lastUsed"]:
                        u["lastUsed"] = day
                    month = day[:7]
                    u["byMonth"][month] = u["byMonth"].get(month, 0) + 1
                    summary["events"] += 1
                    if not summary["from"] or day < summary["from"]:
                        summary["from"] = day
                    if not summary["to"] or day > summary["to"]:
                        summary["to"] = day
    # Keep the last 12 months, in order
    months = []
    for i in range(11, -1, -1):
        total = NOW.year * 12 + (NOW.month - 1) - i
        months.append("%04d-%02d" % (total // 12, total % 12 + 1))
    for n in nodes:
        kept = {}
        for m in months:
            if n["uses"]["byMonth"].get(m):
                kept[m] = n["uses"]["byMonth"][m]
        n["uses"]["byMonth"] = kept
    return summary


# ---------- put it together ----------

def scan(use_usage):
    existing = load_existing()
    warnings = []
    existing_nodes = existing["nodes"] if existing and isinstance(existing.get("nodes"), list) else []
    existing_by_id = {n["id"]: n for n in existing_nodes if isinstance(n, dict) and "id" in n}

    found, sources = discover(existing, warnings)
    nodes = []
    bodies = {}
    for f in found:
        r = read_node(f, existing_by_id, warnings)
        if r:
            nodes.append(r[0])
            bodies[r[0]["id"]] = r[1]
    # Skills the person added by hand (for example ones that live on claude.ai) stay as they are
    manual = []
    for n in existing_nodes:
        if n.get("origin") == "manual":
            c = dict(n)
            c["uses"] = {"total": 0, "last90": 0, "lastUsed": None, "byMonth": {}}
            manual.append(c)
    all_nodes = nodes + manual
    all_nodes.sort(key=lambda n: (n["name"].lower(), n["id"]))

    usage = count_usage(all_nodes) if use_usage else {"files": 0, "events": 0, "from": None, "to": None, "note": "Use counts were not counted this time"}
    edges = build_edges(all_nodes, bodies)

    before = set(n["id"] for n in existing_nodes if n.get("origin") != "manual")
    now_ids = set(n["id"] for n in nodes)
    removed = sorted(n["name"] for n in existing_nodes if n.get("origin") != "manual" and n["id"] not in now_ids)
    added = len([n for n in nodes if n["id"] not in before])

    settings = {"yourName": "", "businessName": "", "setUp": False, "areasApproved": False, "extraFolders": [], "usageDays": USAGE_DAYS}
    if existing and isinstance(existing.get("settings"), dict):
        settings.update(existing["settings"])
    areas = existing["areas"] if existing and isinstance(existing.get("areas"), list) and existing["areas"] else default_areas()

    return {
        "version": 1,
        "settings": settings,
        "scan": {
            "at": iso_millis(NOW),
            "by": "scan.py",
            "sources": sources,
            "warnings": warnings,
            "usage": usage,
            "changes": {"added": added, "removed": removed},
        },
        "areas": areas,
        "nodes": all_nodes,
        "edges": edges,
        "tags": existing["tags"] if existing and isinstance(existing.get("tags"), list) else [],
        "recommendations": existing["recommendations"] if existing and isinstance(existing.get("recommendations"), list) else [],
    }


def dump(result):
    return json.dumps(result, indent=2, ensure_ascii=False) + "\n"


def save(result):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if exists(DATA_FILE):
        shutil.copyfile(DATA_FILE, re.sub(r"\.json$", ".backup.json", DATA_FILE))
    tmp = DATA_FILE + ".tmp-" + str(os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(dump(result))
    os.replace(tmp, DATA_FILE)


def main():
    args = sys.argv[1:]
    known = ["--dry-run", "--no-usage", "--out"]
    for a in args:
        if a.startswith("--") and a not in known:
            fail("Unknown option " + a + ". Options: --dry-run, --no-usage, --out <file>.")
    result = scan("--no-usage" not in args)
    skills = len([n for n in result["nodes"] if n["kind"] == "skill"])
    commands = len(result["nodes"]) - skills
    places = len([s for s in result["scan"]["sources"] if s["count"] > 0])
    used = len([n for n in result["nodes"] if n["uses"]["last90"] > 0])
    removed = result["scan"]["changes"]["removed"]
    lines = [
        "Found %d %s and %d %s in %d %s." % (skills, "skill" if skills == 1 else "skills", commands, "command" if commands == 1 else "commands", places, "place" if places == 1 else "places"),
        "%d new since last time%s" % (result["scan"]["changes"]["added"], (", %d gone." % len(removed)) if removed else "."),
        "%d used in the last %d days (%s)." % (used, USAGE_DAYS, result["scan"]["usage"]["note"]),
        "%d links between skills, %d duplicates." % (len([e for e in result["edges"] if e["type"] == "ref"]), len([e for e in result["edges"] if e["type"] == "dup"])),
    ] + ["Note: " + w for w in result["scan"]["warnings"]]
    if "--dry-run" in args:
        sys.stdout.write("\n".join(lines) + "\nNothing was saved (dry run).\n")
        return
    if "--out" in args:
        i = args.index("--out")
        if i + 1 >= len(args):
            fail("--out needs a file name.")
        with open(args[i + 1], "w", encoding="utf-8", newline="\n") as f:
            f.write(dump(result))
        sys.stdout.write("\n".join(lines) + "\nSaved to " + args[i + 1] + "\n")
        return
    save(result)
    sys.stdout.write("\n".join(lines) + "\nSaved to apps/skill-map/data/skillmap.json\n")


main()
