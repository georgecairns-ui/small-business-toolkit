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
  7. It is the Small Business Toolkit, not Task List OS with extras: one opener, one start script pair and one
     open-the-app skill, all named for the toolkit, and none of the old names or "host" wording left anywhere.
"""
import ast, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OVERLAY = ROOT / "maintainers" / "overlay"
# --allow-local lets a build made with build.py --from pass, for testing a change before it's merged.
# Never release such a build.
ALLOW_LOCAL = "--allow-local" in sys.argv
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
# Data files a tool gates on purpose: Claude writes them only with the owner's recorded yes, through a
# prompt, so they are not in the free-edit list (Ads OS's approvals file).
GATED_DATA = {"apps/ads/data/approvals.json"}
for t in installed:
    for d in t.get("dataFiles", []):
        if str(pathlib.Path(d)) in GATED_DATA:
            continue
        # A tool may allow its whole data folder (Edit(./apps/x/data/**)) or just the one file it narrows to.
        ok = ("Edit(./%s/**)" % pathlib.Path(d).parent in settings) or ("Edit(./%s)" % pathlib.Path(d) in settings)
        if not ok:
            bad(".claude/settings.json can't edit %s's data without asking (%s)" % (t["id"], d))

# ---------- 4. Everything pointed to exists ----------
pointers = re.compile(r"`((?:setup|\.claude/skills|apps|docs)/[A-Za-z0-9_./-]+?)`")
written_here = [ROOT / "START-HERE.md"] + [ROOT / rel for rel in (p.relative_to(OVERLAY) for p in OVERLAY.rglob("*.md")) if (ROOT / rel).exists()]
for f in written_here:
    for ref in pointers.findall(f.read_text()):
        ref = ref.rstrip(".")
        if "<" in ref or "*" in ref or ref.startswith("setup/as-installed/"):
            continue  # setup/as-installed/ is written when the person installs, not shipped
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
    if "folder" in b and not ALLOW_LOCAL:
        bad("%s was built from a local folder (%s), not GitHub's main: rebuild without --from before pushing (or run check.py --allow-local to test)" % (tid, b["folder"]))

# ---------- 7. One name, one way in ----------
# The toolkit's own way in is there and named for the toolkit.
for need in ("Open Small Business Toolkit.html", "setup/scripts/start-toolkit.sh", "setup/scripts/start-toolkit.ps1", ".claude/skills/open-my-toolkit/SKILL.md"):
    if not (ROOT / need).is_file():
        bad("%s is missing" % need)
if "<title>Opening Small Business Toolkit</title>" not in (ROOT / "Open Small Business Toolkit.html").read_text():
    bad("Open Small Business Toolkit.html is not titled 'Opening Small Business Toolkit'")
if not (ROOT / "setup/scripts/start-toolkit.sh").stat().st_mode & 0o111:
    bad("setup/scripts/start-toolkit.sh is not executable")

# Rule, not a fixed list: no skill folder named for one tool's way in.
for d in sorted((ROOT / ".claude/skills").iterdir()):
    if d.is_dir() and d.name.startswith("open-") and d.name != "open-my-toolkit":
        bad(".claude/skills/%s is one tool's own way in (only open-my-toolkit belongs in the kit)" % d.name)
# Rule: no start-* script other than start-toolkit.
for f in sorted((ROOT / "setup/scripts").glob("start-*")):
    if f.name not in ("start-toolkit.sh", "start-toolkit.ps1"):
        bad("setup/scripts/%s is one tool's own start script (only start-toolkit.* belongs in the kit)" % f.name)
# Rule: no "Open *.html" opener at the root other than the toolkit's.
for f in sorted(ROOT.glob("Open *.html")):
    if f.name != "Open Small Business Toolkit.html":
        bad("%s is one tool's own opener (only Open Small Business Toolkit.html belongs in the kit)" % f.name)

# Rule: no reference anywhere to a .claude/skills/<x> or setup/scripts/<x> that isn't in the kit.
# This catches a rename the build missed (for example a leftover open-the-app or start-app).
# Ads OS's Claude Ads skills are installed into .claude/skills/ by the person during setup, so they
# are allowed to be absent in a blank kit.
EXTERNAL_SKILLS = {"ads", "ads-audit", "ads-meta", "ads-google", "ads-math"}
ref_re = re.compile(r"(?:\.claude/skills|setup/scripts)/([A-Za-z0-9][A-Za-z0-9._-]*)")
for p, rel in kit_files():
    if p.suffix not in (".md", ".js", ".json", ".html", ".sh", ".ps1"):
        continue
    try:
        text = p.read_text()
    except UnicodeDecodeError:
        continue
    for m in ref_re.finditer(text):
        name = m.group(1).rstrip(".")  # drop a sentence-ending period
        if m.group(0).startswith("setup/scripts"):
            if not (ROOT / "setup/scripts" / name).exists():
                bad("%s points to setup/scripts/%s, which isn't in the kit" % (rel, name))
        elif name not in EXTERNAL_SKILLS:  # .claude/skills/<name>: a skill folder, or a file like README.md
            target = ROOT / ".claude/skills" / name
            if not (target.exists() or (target / "SKILL.md").exists()):
                bad("%s points to .claude/skills/%s, which isn't in the kit" % (rel, name))

# toolkit.json's shared version must match the real shared files.
tj = json.loads((ROOT / "toolkit.json").read_text())
version_file = (ROOT / "apps/shared/VERSION").read_text().splitlines()[0].strip()
if tj.get("sharedVersion") != version_file:
    bad("toolkit.json sharedVersion (%s) doesn't match apps/shared/VERSION (%s)" % (tj.get("sharedVersion"), version_file))

# The one name, and "host" (allowed only for the person who hosts a Google Meet).
HOST_WORDS = re.compile(r"\bthe host\b(?! after each meeting)|\bhost tool\b", re.I)
for p, rel in kit_files():
    try:
        text = p.read_text()
    except UnicodeDecodeError:
        continue  # fonts and images
    if "Small Business Toolkit OS" in text or "small-business-toolkit-os" in text:
        bad("%s still says \"Small Business Toolkit OS\" (the product is the Small Business Toolkit, no OS)" % rel)
    if HOST_WORDS.search(text):
        bad("%s still talks about \"the host\" or a \"host tool\"" % rel)

if problems:
    print("CHECK FAILED:")
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("All checks passed: blank kit, valid files, 8 sections installed, every pointer found, built from GitHub's main.")
