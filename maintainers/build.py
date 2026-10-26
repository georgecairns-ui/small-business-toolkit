#!/usr/bin/env python3
"""
BUILD: assemble Small Business Toolkit OS from the 7 tools
----------------------------------------------------------
Run it from anywhere:   python3 maintainers/build.py

What it does, in order:
  1. Takes each tool exactly as it is on GitHub (`git archive origin/main` of its repository in
     ~/Repos/getaipowers, after a `git fetch`), into a temporary folder. sources.json says where each one is.
  2. Runs each tool's own release check (maintainers/make-release.sh) on that copy. If any tool fails its
     own check, the build stops: nothing broken or holding real data ever reaches this kit.
  3. Checks the shared parts (apps/server, apps/shared, apps/home, ATTACHING.md) are identical in all 7.
  4. Starts from Task List OS and attaches the other 6 to it, exactly as ATTACHING.md describes:
     their app folders, skills, setup steps, connection guides, notes templates and files folders (the
     host's copy wins when both have a file), their entry in apps/installed.json, their own permissions
     (by the rule in ATTACHING.md step 7) and their ATTACH-CLAUDE.md section in CLAUDE.md.
  5. Copies maintainers/overlay/ on top: the files written for this kit alone (START-HERE.md, README.md,
     the merged setup steps, the Toolkit app, the extra skills).
  6. Writes everything into the kit (the repository root), replacing the last build. maintainers/, .git
     and anything listed in KEEP are left alone. Then records which version of each tool it used in
     maintainers/built-from.json.

Options:
  --from <tool>=<folder>   use a local folder (any branch, uncommitted changes included) for one tool,
                           for testing a change before it's merged. Never release a build made this way.
  --no-fetch               don't `git fetch` first (offline)
"""
import argparse, hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OVERLAY = HERE / "overlay"
KEEP = {"maintainers", ".git", "dist"}

# The host first, then the others in the catalogue's order
TOOLS = ["task-list", "pipeline", "skill-map", "proposals", "content", "money", "ads"]
SHARED = ["apps/server", "apps/shared", "apps/home", "ATTACHING.md"]


def fail(msg):
    print("BUILD STOPPED: " + msg, file=sys.stderr)
    sys.exit(1)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        fail(" ".join(map(str, cmd)) + "\n" + (r.stdout + r.stderr)[-2000:])
    return r.stdout


def files_under(base):
    return sorted(p.relative_to(base) for p in base.rglob("*") if p.is_file())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch_sources(sources, overrides, fetch, work):
    got = {}
    for tid in TOOLS:
        src = sources[tid]
        dest = work / tid
        dest.mkdir(parents=True)
        if tid in overrides:
            folder = pathlib.Path(overrides[tid]).expanduser()
            shutil.copytree(folder, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".git", "dist", ".DS_Store"))
            got[tid] = {"folder": str(folder), "commit": "LOCAL FOLDER, NOT FOR RELEASE"}
            continue
        repo = pathlib.Path(src["local"]).expanduser()
        if fetch:
            run(["git", "-C", str(repo), "fetch", "-q", "origin"])
        sha = run(["git", "-C", str(repo), "rev-parse", "origin/main"]).strip()
        tar = subprocess.run(["git", "-C", str(repo), "archive", "origin/main"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", str(dest)], input=tar, check=True)
        got[tid] = {"repository": src["repository"], "commit": sha}
    return got


def release_checks(work):
    for tid in TOOLS:
        out = run(["bash", "maintainers/make-release.sh"], cwd=work / tid)
        line = [l for l in out.strip().splitlines() if l][-1:] or ["(no output)"]
        print("  %-10s own release check passed: %s" % (tid, line[0]))
        shutil.rmtree(work / tid / "dist", ignore_errors=True)


def check_shared(work):
    host = work / TOOLS[0]
    for part in SHARED:
        for tid in TOOLS[1:]:
            a, b = host / part, work / tid / part
            if a.is_file():
                same = b.is_file() and digest(a) == digest(b)
            else:
                fa, fb = files_under(a), files_under(b)
                same = fa == fb and all(digest(a / f) == digest(b / f) for f in fa)
            if not same:
                fail("%s differs between task-list and %s. Bring the shared parts level (same shared version) first." % (part, tid))
    print("  shared parts identical in all 7: " + ", ".join(SHARED))


# ---------- ATTACHING.md step 7: which of a tool's own permissions come across ----------
NEVER = re.compile(r"git push|curl|wget|\brm\b|send|post|publish|upload|delete|mcp__", re.I)


def allowed_permission(entry, tool_app):
    if NEVER.search(entry):
        return False
    if entry in ("WebSearch", "WebFetch"):
        return True
    m = re.fullmatch(r"(Edit|Write)\((.+)\)", entry)
    if m:
        target = m.group(2)
        return target.startswith("./" + tool_app) or re.fullmatch(r"\./\.claude/skills/\*-[a-z-]+/\*\*", target) is not None
    m = re.fullmatch(r"Bash\((.+)\)", entry)
    if m:
        cmd = m.group(1)
        if cmd.endswith(":*") and len(cmd.split()) == 1:
            return False  # open-ended, such as Bash(ls:*)
        return (tool_app in cmd.replace("\\", "/")) or ("setup/scripts/" in cmd.replace("\\", "/"))
    return False


def attach(kit, work, report):
    host = work / TOOLS[0]
    shutil.copytree(host, kit, dirs_exist_ok=True, ignore=lambda d, names: [n for n in names if pathlib.Path(d) == host and n in ("maintainers", "dist")])
    claude_md = (kit / "CLAUDE.md").read_text()
    marker = "None yet. When a tool is attached, its day-to-day instructions go here, copied from its `ATTACH-CLAUDE.md`."
    if marker not in claude_md:
        fail("Task List OS's CLAUDE.md no longer has the 'Attached tools' placeholder this build replaces")
    sections = []
    installed = json.loads((kit / "apps/installed.json").read_text())
    settings = json.loads((kit / ".claude/settings.json").read_text())
    allow = settings["permissions"]["allow"]

    for tid in TOOLS[1:]:
        src = work / tid
        meta = json.loads((src / "toolkit.json").read_text())
        app = meta["app"]
        added, skipped_same = [], 0
        for rel in files_under(src):
            parts = rel.parts
            if len(parts) == 1 or parts[0] in ("maintainers",):
                continue  # root files are the tool's own kit files; maintainers are its own
            dest = kit / rel
            if dest.exists() and parts[0] == "docs" and digest(dest) != digest(src / rel):
                # Each tool's own privacy and customising guide says what that tool may do: keep it beside the host's
                dest = kit / "docs" / tid / pathlib.Path(*parts[1:])
            if dest.exists():
                skipped_same += 1
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src / rel, dest)
            added.append(str(rel))
        # installed.json: the tool's own entry, as its kit lists it
        entry = next(t for t in json.loads((src / "apps/installed.json").read_text())["tools"] if t["id"] == tid)
        installed["tools"].append(entry)
        # Permissions, by the rule in ATTACHING.md step 7
        theirs = json.loads((src / ".claude/settings.json").read_text())["permissions"]["allow"]
        took, left = [], []
        for p in theirs:
            if p in allow:
                continue
            (took if allowed_permission(p, app) else left).append(p)
        allow.extend(took)
        # CLAUDE.md section
        sections.append((src / meta["claudeSection"]).read_text().strip())
        report.append({"tool": tid, "filesAdded": len(added), "alreadyThere": skipped_same, "permissionsAdded": took, "permissionsLeftOut": left})

    (kit / "CLAUDE.md").write_text(claude_md.replace(marker, "\n\n".join(sections)))
    (kit / "apps/installed.json").write_text(json.dumps(installed, indent=2) + "\n")
    (kit / ".claude/settings.json").write_text(json.dumps(settings, indent=2) + "\n")


def apply_overlay(kit):
    n = 0
    special = (".append", ".patch-json", ".replace-json")
    for rel in sorted(files_under(OVERLAY), key=lambda r: (r.suffix in special, str(r))):
        if rel.name == ".DS_Store":
            continue
        dest = kit / rel
        if rel.suffix not in special:
            dest.parent.mkdir(parents=True, exist_ok=True)
        if rel.suffix == ".append":
            # <file>.append: add these lines to the end of the built file
            target = kit / rel.with_suffix("")
            target.write_text(target.read_text().rstrip("\n") + "\n\n" + (OVERLAY / rel).read_text())
        elif rel.suffix == ".replace-json":
            # <file>.replace-json: [[old, new], ...]; each old must appear exactly once, or the build stops
            target = kit / rel.with_suffix("")
            text = target.read_text()
            for old, new in json.loads((OVERLAY / rel).read_text()):
                if text.count(old) != 1:
                    fail("%s: expected to find this exactly once, found it %d times (did the tool change?):\n%s" % (rel.with_suffix(""), text.count(old), old[:300]))
                text = text.replace(old, new)
            target.write_text(text)
        elif rel.suffix == ".patch-json":
            # <file>.patch-json: merge these keys into the built JSON file
            target = kit / rel.with_suffix("")
            data = json.loads(target.read_text())
            patch = json.loads((OVERLAY / rel).read_text())
            merge(data, patch)
            target.write_text(json.dumps(data, indent=2) + "\n")
        else:
            shutil.copy2(OVERLAY / rel, dest)
        n += 1
    return n


def merge(data, patch):
    for k, v in patch.items():
        if k == "allow+" and isinstance(v, list):
            for x in v:
                if x not in data.setdefault("allow", []):
                    data["allow"].append(x)
        elif k == "tools+" and isinstance(v, list):
            data.setdefault("tools", []).extend(v)
        elif isinstance(v, dict) and isinstance(data.get(k), dict):
            merge(data[k], v)
        else:
            data[k] = v


def neutral_step_numbers(kit):
    """The notes templates name the step that fills them by its number in that tool's own setup. The numbers
    are different here, so they just say "during setup" (the step's file name, where given, stays)."""
    n = 0
    for f in sorted((kit / "context").glob("*.md")):
        text = f.read_text()
        new = re.sub(r"(?:in|during) (?:setup )?steps? \d+(?: (?:and|to) \d+)?", "during setup", text)
        new = re.sub(r"(?:set|filled in) in setup during setup", "set during setup", new)
        if new != text:
            f.write_text(new)
            n += 1
    return n


FOLDER_NAME = re.compile(r"\b(your|their|the) (Task List|Pipeline|Proposal Writing|Content Machine|Money View|Ads|Skill and Folder Map) OS folder\b")


def one_folder_name(kit):
    """Each tool tells the person to open "your Pipeline OS folder" and so on. Here it's all one folder."""
    n = 0
    for f in kit.rglob("*"):
        if not f.is_file() or f.suffix not in (".md", ".js", ".html", ".sh", ".ps1") or "maintainers" in f.relative_to(kit).parts:
            continue
        text = f.read_text()
        new = FOLDER_NAME.sub(r"\1 Small Business Toolkit OS folder", text)
        if new != text:
            f.write_text(new)
            n += 1
    return n


def write_kit(kit):
    for item in ROOT.iterdir():
        if item.name in KEEP:
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()
    for item in kit.iterdir():
        target = ROOT / item.name
        if item.is_dir():
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="overrides", action="append", default=[])
    ap.add_argument("--no-fetch", action="store_true")
    args = ap.parse_args()
    overrides = dict(o.split("=", 1) for o in args.overrides)
    sources = json.loads((HERE / "sources.json").read_text())

    with tempfile.TemporaryDirectory(prefix="sbt-build-") as tmp:
        work, kit = pathlib.Path(tmp) / "tools", pathlib.Path(tmp) / "kit"
        print("1. Taking each tool from GitHub's main")
        got = fetch_sources(sources, overrides, not args.no_fetch, work)
        print("2. Running each tool's own release check")
        release_checks(work)
        print("3. Checking the shared parts")
        check_shared(work)
        print("4. Attaching the 6 tools to Task List OS")
        report = []
        attach(kit, work, report)
        for r in report:
            print("  %-10s %d files added, %d already there, %d permissions added%s" % (
                r["tool"], r["filesAdded"], r["alreadyThere"], len(r["permissionsAdded"]),
                (", left out: " + ", ".join(r["permissionsLeftOut"])) if r["permissionsLeftOut"] else ""))
        print("5. Adding this kit's own files")
        print("  %d files from maintainers/overlay" % apply_overlay(kit))
        print("  step numbers made neutral in %d notes templates" % neutral_step_numbers(kit))
        print("  folder name made one in %d files" % one_folder_name(kit))
        print("6. Writing the kit")
        write_kit(kit)
    (HERE / "built-from.json").write_text(json.dumps({"tools": got, "attach": report}, indent=2) + "\n")
    local = [t for t, g in got.items() if "folder" in g]
    print("Built Small Business Toolkit OS." + (" WARNING: built from local folders (" + ", ".join(local) + "), not for release." if local else ""))


if __name__ == "__main__":
    main()
