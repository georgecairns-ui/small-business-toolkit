#!/usr/bin/env python3
"""
CHECK: is the built kit safe and complete to push?
--------------------------------------------------
Run after maintainers/build.py:   python3 maintainers/check.py
Exits 1 and says why if anything fails. It checks the kit at the repository root:
  1. It's a blank kit: no real data, setup not started, notes not filled in, nothing in skills-to-upload or
     files but the READMEs, no photos or videos, no backups, and the Toolkit's data file exactly blank.
  2. Every data and settings file is valid, and every script passes a syntax check.
  3. Every tool in apps/installed.json is there: its page, its menu, its data files, and its skills.
  4. Every setup step, skill and connection guide that START-HERE.md, the Toolkit app and the new skills
     point to exists.
  5. The words: no em dashes in anything written for this kit, and no tool still says "your <Tool> OS folder".
  6. maintainers/built-from.json says every tool came from GitHub's main, not a local folder.
"""
import ast, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OVERLAY = ROOT / "maintainers" / "overlay"
problems = []


def bad(msg):
    problems.append(msg)


def kit_files():
    for p in ROOT.rglob("*"):
        rel = p.relative_to(ROOT)
        if p.is_file() and rel.parts[0] not in ("maintainers", ".git", "dist"):
            yield p, rel


# ---------- 1. A blank kit ----------
if "Setup status: not started" not in (ROOT / "setup/progress.md").read_text():
    bad("setup/progress.md is not the blank one")
if "Setup: not done yet" not in (ROOT / "CLAUDE.md").read_text():
    bad("CLAUDE.md says setup is done")
for f in sorted((ROOT / "context").glob("*.md")):
    if f.name != "README.md" and "Status: not filled in yet" not in f.read_text():
        bad("context/%s is filled in" % f.name)
for f in (ROOT / "skills-to-upload").iterdir():
    if f.name != "README.md":
        bad("skills-to-upload/%s should not ship" % f.name)
for p, rel in kit_files():
    if rel.parts[0] == "files" and p.name != "README.md":
        bad("%s should not ship (only READMEs go in files/)" % rel)
    if p.name.endswith(".backup.json") or ("media" in rel.parts[2:4] and rel.parts[0] == "apps" and p.name != ".gitkeep"):
        bad("%s should not ship" % rel)
    if p.name in (".DS_Store", "settings.local.json", "launch.json"):
        bad("%s should not ship" % rel)
if (ROOT / "apps/home/data").exists():
    bad("apps/home/data should not ship (someone's Home layout)")
BLANK_TOOLKIT = {"version": 1, "lastDailyRun": "", "connections": {}, "tools": {}, "ideas": [], "builds": []}
try:
    if json.loads((ROOT / "apps/toolkit/data/toolkit.json").read_text()) != BLANK_TOOLKIT:
        bad("apps/toolkit/data/toolkit.json is not the blank file")
except FileNotFoundError:
    bad("apps/toolkit/data/toolkit.json is missing")

# ---------- 2. Valid files ----------
for p, rel in kit_files():
    if p.suffix == ".json":
        try:
            json.loads(p.read_text())
        except ValueError as e:
            bad("%s is not valid: %s" % (rel, e))
    elif p.suffix == ".js" and rel.parts[0] == "apps":
        r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
        if r.returncode:
            bad("%s fails a syntax check: %s" % (rel, r.stderr.strip().splitlines()[-1] if r.stderr.strip() else ""))
    elif p.suffix == ".py":
        try:
            ast.parse(p.read_text(), str(rel))
        except SyntaxError as e:
            bad("%s fails a syntax check: %s" % (rel, e))
    elif p.suffix == ".sh":
        r = subprocess.run(["bash", "-n", str(p)], capture_output=True, text=True)
        if r.returncode:
            bad("%s fails a syntax check" % rel)

# ---------- 3. Every installed tool is there ----------
installed = json.loads((ROOT / "apps/installed.json").read_text())["tools"]
ids = [t["id"] for t in installed]
for want in ["task-list", "pipeline", "skill-map", "proposals", "content", "money", "ads", "toolkit"]:
    if want not in ids:
        bad("apps/installed.json has no %s" % want)
for t in installed:
    app = ROOT / t["app"]
    for need in ("index.html", "menu.json"):
        if not (app / need).is_file():
            bad("%s has no %s" % (t["app"], need))
    for d in t.get("dataFiles", []):
        if not (ROOT / d).is_file():
            bad("%s lists %s, which is missing" % (t["id"], d))
settings = json.loads((ROOT / ".claude/settings.json").read_text())["permissions"]["allow"]
for t in installed:
    for d in t.get("dataFiles", []):
        want = "Edit(./%s/**)" % str(pathlib.Path(d).parent)
        if want not in settings:
            bad(".claude/settings.json can't edit %s's data without asking (%s)" % (t["id"], want))

# ---------- 4. Everything pointed to exists ----------
pointers = re.compile(r"`((?:setup|\.claude/skills|apps|docs)/[A-Za-z0-9_./-]+?)`")
written_here = [ROOT / "START-HERE.md"] + [ROOT / rel for rel in (p.relative_to(OVERLAY) for p in OVERLAY.rglob("*.md")) if (ROOT / rel).exists()]
for f in written_here:
    for ref in pointers.findall(f.read_text()):
        ref = ref.rstrip(".")
        if "<" in ref or "*" in ref:
            continue
        if not (ROOT / ref).exists():
            bad("%s points to %s, which is missing" % (f.relative_to(ROOT), ref))
apps_list = ROOT / "apps/toolkit/app/apps-list.js"
if apps_list.exists():
    # Each entry's guide is setup/connections/<id>.md
    listed = {i + ".md" for i in re.findall(r"\{ id: \"([a-z0-9-]+)\", name: \"[^\"]+\", group:", apps_list.read_text())}
    guides = {p.name for p in (ROOT / "setup/connections").glob("*.md")} - {"README.md"}
    for g in sorted(guides - listed):
        bad("the Toolkit's Connections page has no card for setup/connections/%s" % g)
    for g in sorted(listed - guides):
        bad("the Toolkit's Connections page points to setup/connections/%s, which is missing" % g)
for p, rel in kit_files():
    if p.suffix in (".js", ".json", ".md") and rel.parts[:2] == ("apps", "toolkit"):
        for skill in re.findall(r"\.claude/skills/([a-z0-9-]+)", p.read_text()):
            if not (ROOT / ".claude/skills" / skill / "SKILL.md").is_file():
                bad("%s points to the skill %s, which is missing" % (rel, skill))

# ---------- 5. The words ----------
for p in OVERLAY.rglob("*"):
    if p.is_file() and p.suffix in (".md", ".js", ".html", ".css", ".json", ".append", ".replace-json") and "—" in p.read_text():
        bad("an em dash in maintainers/overlay/%s" % p.relative_to(OVERLAY))
folder = re.compile(r"\b(?:your|their|the) (?:Task List|Pipeline|Proposal Writing|Content Machine|Money View|Ads|Skill and Folder Map) OS folder\b")
for p, rel in kit_files():
    if p.suffix in (".md", ".js", ".html", ".sh", ".ps1") and folder.search(p.read_text()):
        bad("%s still names a single tool's folder" % rel)

# ---------- 6. Built from GitHub ----------
built = json.loads((ROOT / "maintainers/built-from.json").read_text())["tools"]
for tid, b in built.items():
    if "folder" in b:
        bad("%s was built from a local folder (%s), not GitHub's main: rebuild without --from before pushing" % (tid, b["folder"]))

if problems:
    print("CHECK FAILED:")
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("All checks passed: blank kit, valid files, 8 sections installed, every pointer found, built from GitHub's main.")
