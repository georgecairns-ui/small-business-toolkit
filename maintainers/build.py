#!/usr/bin/env python3
"""
BUILD: assemble the Small Business Toolkit from the 7 tools
----------------------------------------------------------
Run it from anywhere:   python3 maintainers/build.py

What it does, in order:
  1. Takes each tool exactly as it is on GitHub (`git archive origin/main` of its repository in
     ~/Repos/getaipowers, after a `git fetch`), into a temporary folder. sources.json says where each one is.
  2. Runs each tool's own release check (maintainers/make-release.sh) on that copy. If any tool fails its
     own check, the build stops: nothing broken or holding real data ever reaches this kit.
  3. Checks the shared parts (apps/server, apps/shared, apps/home, ATTACHING.md) are identical in all 7.
  4. Starts from Task List OS's files (the first tool in the list is only the base the build copies first;
     it is not special in the product) and attaches the other 6, exactly as ATTACHING.md describes:
     their app folders, skills, setup steps, connection guides, notes templates and files folders (the
     base's copy wins when both have a file), their entry in apps/installed.json, their own permissions
     (by the rule in ATTACHING.md step 7) and their ATTACH-CLAUDE.md section in CLAUDE.md.
     Then it removes what makes one tool the front door: its opener file, its start scripts and its
     open-the-app skill (see drop_tool_entry_points).
  5. Copies maintainers/overlay/ on top: the files written for this kit alone (START-HERE.md, README.md,
     the toolkit's opener, start scripts and open-my-toolkit skill, the merged setup steps, the Toolkit
     app, the extra skills). Then points every reference at the toolkit's names (use_toolkit_names).
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

# The base the build copies first, then the others in the catalogue's order
TOOLS = ["task-list", "pipeline", "skill-map", "proposals", "content", "money", "ads"]
# Parts that must be byte-for-byte identical in every tool that ships them. A tool that doesn't
# ship one (Money View has no call-recording guides) is skipped for that part, not failed.
SHARED = [
    "apps/server", "apps/shared", "apps/home", "ATTACHING.md",
    "setup/scripts/start-app.sh", "setup/scripts/start-app.ps1",
    "setup/scripts/autostart-mac.sh", "setup/scripts/autostart-windows.ps1",
    "setup/scripts/save-key.sh", "setup/scripts/save-key.ps1",
    ".claude/skills/open-the-app", ".claude/skills/get-updates",
    "setup/connections/calendly.md", "setup/connections/fathom.md",
    "setup/connections/fireflies.md", "setup/connections/granola.md",
    "setup/connections/hubspot.md", "setup/connections/otter.md",
    "setup/connections/pipedrive.md", "setup/connections/stripe.md",
    "setup/connections/tldv.md",
]

# Files both the base and another tool ship with differing contents, where keeping the base's copy is
# right on purpose. The build fails on any other difference, so a tool that drifts gets caught.
DIFFER_ALLOW = {
    ".claude/settings.json": "merged separately: the base's is kept and each tool's extra permissions are added by ATTACHING.md step 7",
    "apps/installed.json": "merged separately: the base's is kept and each tool's own entry is appended",
    ".claude/skills/README.md": "regenerated after the build from the kit's own skills",
    ".claude/skills/setup/SKILL.md": "each tool tailors the setup skill; the base's runs the whole toolkit's setup",
    ".claude/skills/match-my-brand/SKILL.md": "Money View words it for invoices and its own step order; the base copy stands for the toolkit",
    ".claude/skills/connect-a-tool/SKILL.md": "Money View allows no exports; the base copy stands for the toolkit",
    ".claude/skills/keep-context-fresh/SKILL.md": "Money View's variant; the base copy stands for the toolkit",
    ".claude/skills/sort-brain-dump/SKILL.md": "Money View's variant; the base copy stands for the toolkit",
    "setup/connections/README.md": "the overlay replaces this table for the whole toolkit",
    "setup/connections/freeagent.md": "Money View's accounts guide; the overlay ships the toolkit's copy",
    "setup/connections/quickbooks.md": "Money View's accounts guide; the overlay ships the toolkit's copy",
    "setup/connections/xero.md": "Money View's accounts guide; the overlay ships the toolkit's copy",
    "setup/progress.md": "the overlay ships the blank toolkit progress file",
    "skills-to-upload/README.md": "per-tool folder note; the base's covers the toolkit",
    "setup/01-quick-questions.md": "the base's own setup step; the toolkit runs setup/toolkit-01..04 instead",
    "setup/02-connect-email-and-calendar.md": "the base's own setup step; shared by every tool",
    "setup/03-connect-call-recordings.md": "the base's own setup step; shared by every tool",
    "setup/04-connect-other-apps.md": "the base's own setup step; the overlay adjusts its wording",
    "setup/05-get-to-know-the-business.md": "the base's shared business step; every tool reuses it",
    "setup/06-build-your-skills.md": "the base's own setup step; the overlay adjusts its wording",
    "setup/09-check-and-hand-over.md": "the base's own hand-over step; the toolkit uses toolkit-04",
    "context/README.md": "shared context note; the base's covers the toolkit",
    "context/business.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/people.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/priorities.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/routines.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/tools.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/voice.md": "shared context, filled once for the whole toolkit; the base's is the blank one",
    "context/sales.md": "shared sales context used by Pipeline and Proposals; Pipeline's copy is attached first and stands for the toolkit",
    "files/02-clients/README.md": "per-folder note; the base's covers the toolkit",
    "files/05-finance/README.md": "per-folder note; the base's covers the toolkit",
    "files/99-archive/README.md": "per-folder note; the base's covers the toolkit",
    "files/README.md": "per-folder note; the base's covers the toolkit",
}


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
    base = work / TOOLS[0]
    for part in SHARED:
        a = base / part
        if not a.exists():
            fail("the base (task-list) has no %s, which the build treats as a shared part" % part)
        for tid in TOOLS[1:]:
            b = work / tid / part
            if not b.exists():
                continue  # a tool that doesn't ship this shared file (Money View has no call-recording guides)
            if a.is_file():
                same = b.is_file() and digest(a) == digest(b)
            else:
                fa, fb = files_under(a), files_under(b)
                same = fa == fb and all(digest(a / f) == digest(b / f) for f in fa)
            if not same:
                fail("%s differs between task-list and %s. Bring the shared parts level (same shared version) first." % (part, tid))
    print("  shared parts identical wherever present: server, shared, home, ATTACHING.md, the start/autostart/save-key scripts, open-the-app, get-updates and the connection guides")


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
    base = work / TOOLS[0]
    shutil.copytree(base, kit, dirs_exist_ok=True, ignore=lambda d, names: [n for n in names if pathlib.Path(d) == base and n in ("maintainers", "dist")])
    claude_md = (kit / "CLAUDE.md").read_text()
    marker = "None yet. When a tool is attached, its day-to-day instructions go here, copied from its `ATTACH-CLAUDE.md`."
    if marker not in claude_md:
        fail("Task List OS's CLAUDE.md (the base copy) no longer has the 'Attached tools' placeholder this build replaces")
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
                # Each tool's own privacy and customising guide says what that tool may do: keep it beside the base copy
                dest = kit / "docs" / tid / pathlib.Path(*parts[1:])
            if dest.exists():
                if digest(dest) != digest(src / rel) and str(rel) not in DIFFER_ALLOW:
                    fail("%s differs between task-list and %s, and isn't in build.py's allow list. The build would silently keep the base's copy. Add it to DIFFER_ALLOW with a one-line reason, or bring the tools level." % (rel, tid))
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
        # CLAUDE.md section: keep only the attached instructions, not the preamble written for maintainers.
        # ATTACH-CLAUDE.md is a preamble, then a "---" line, then the text that goes into CLAUDE.md.
        section_path = src / meta["claudeSection"]
        raw = section_path.read_text()
        parts_after = raw.split("\n---\n", 1)
        if len(parts_after) != 2:
            fail("%s has no '---' line separating its maintainer preamble from the attached instructions" % meta["claudeSection"])
        sections.append(parts_after[1].strip())
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
        new = FOLDER_NAME.sub(r"\1 Small Business Toolkit folder", text)
        if new != text:
            f.write_text(new)
            n += 1
    return n


# The ways in that belong to one tool. They are derived from the tools' own files, not fixed:
# every tool now ships an `open-the-app` skill, `start-app.*` scripts and its own `Open <name>.html`.
# The kit has its own (Open Small Business Toolkit.html, start-toolkit.*, the open-my-toolkit skill),
# added from the overlay, so the tools' are removed and every reference to them is renamed.
# These older names are still handled, so a tool not yet at shared version 11 is caught too.
LEGACY_OPENERS = ["Open Task List.html"]
LEGACY_START = ["start-task-list", "start-money-view"]
LEGACY_OPEN_SKILLS = ["open-task-list", "open-money-view"]


def tool_openers(work):
    """Each tool's own opener file at its root, for example 'Open Pipeline.html'."""
    names = set(LEGACY_OPENERS)
    for tid in TOOLS:
        for f in (work / tid).glob("Open *.html"):
            names.add(f.name)
    return names


def drop_tool_entry_points(kit, openers):
    """Remove every tool's own way in: its opener file, its start scripts and its open-the-app skill.
    The kit's own come from the overlay."""
    gone = []
    for name in sorted(openers):
        f = kit / name
        if f.exists():
            f.unlink()
            gone.append(name)
    for stem in ["start-app"] + LEGACY_START:
        for ext in (".sh", ".ps1"):
            f = kit / "setup/scripts" / (stem + ext)
            if f.exists():
                f.unlink()
                gone.append("setup/scripts/" + stem + ext)
    for name in ["open-the-app"] + LEGACY_OPEN_SKILLS:
        d = kit / ".claude" / "skills" / name
        if d.exists():
            shutil.rmtree(d)
            gone.append(".claude/skills/" + name)
    return gone


def rename_map(openers):
    """Old name -> the toolkit's name, in every file (the tools' docs, skills and CLAUDE.md sections point at them)."""
    pairs = [(name, "Open Small Business Toolkit.html") for name in sorted(openers)]
    pairs += [
        ("open-the-app", "open-my-toolkit"),
        ("open-task-list", "open-my-toolkit"),
        ("open-money-view", "open-my-toolkit"),
        ("start-app", "start-toolkit"),
        ("start-task-list", "start-toolkit"),
        ("start-money-view", "start-toolkit"),
    ]
    return pairs


def use_toolkit_names(kit, openers):
    """Every reference to a tool's own opener, start script or open-the-app skill now names the toolkit's.
    The permissions list is de-duplicated afterwards (two tools' start scripts were two entries)."""
    n = 0
    renames = rename_map(openers)
    for f in kit.rglob("*"):
        if not f.is_file() or f.suffix not in (".md", ".js", ".html", ".sh", ".ps1", ".json", ".py"):
            continue
        rel = f.relative_to(kit)
        if rel.parts[0] in ("maintainers", ".git"):
            continue
        text = f.read_text()
        new = text
        for old, name in renames:
            new = new.replace(old, name)
        if new != text:
            f.write_text(new)
            n += 1
    sp = kit / ".claude/settings.json"
    settings = json.loads(sp.read_text())
    allow = settings["permissions"]["allow"]
    settings["permissions"]["allow"] = list(dict.fromkeys(allow))
    sp.write_text(json.dumps(settings, indent=2) + "\n")
    return n


def skill_description(skill_md):
    """The `description:` line from a SKILL.md's front matter, as one line."""
    text = skill_md.read_text()
    m = re.search(r"(?m)^description:[ \t]*(.+?)[ \t]*$", text)
    return m.group(1).strip() if m else ""


def write_skills_readme(kit):
    """The skills README lists Task List's skills only. Write it fresh from the kit's own skill folders,
    each with the description from its SKILL.md, so it matches what actually ships."""
    skills_dir = kit / ".claude/skills"
    rows = []
    for d in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
        sm = d / "SKILL.md"
        if not sm.is_file():
            fail(".claude/skills/%s has no SKILL.md" % d.name)
        rows.append("| `%s` | %s |" % (d.name, skill_description(sm)))
    header = (
        "# Skills\n\n"
        "Saved know-how for the jobs small businesses ask Claude for most. You don't need to remember any "
        "of this: ask in your own words and Claude picks the right one.\n\n"
        "Each skill is a folder with a `SKILL.md` inside. Claude reads them from here whenever this folder "
        "is open. In setup, Claude also writes you skills of your own, about your services, prices and way "
        "of working. They're saved here, and packed up in the `skills-to-upload` folder so you can add them "
        "to Claude and use them in every conversation.\n\n"
        "In Claude Code, every skill is also a command: type `/` and its name, for example `/check-in`.\n\n"
        "| Skill | What it does |\n|---|---|\n"
    )
    (skills_dir / "README.md").write_text(header + "\n".join(rows) + "\n")
    return len(rows)


def attaching_version(kit):
    """The version number from the top of ATTACHING.md (for example 'Version 4, 27 October 2026.')."""
    m = re.search(r"(?mi)^Version[ \t]+(\d+)\b", (kit / "ATTACHING.md").read_text())
    if not m:
        fail("ATTACHING.md has no 'Version N' line at the top to read the attaching version from")
    return m.group(1)


def write_versions_and_skills(kit):
    """Write toolkit.json's sharedVersion and attachingVersion from the real files, never hard-coded,
    and its skills list from the kit's own toolkit skills."""
    shared = (kit / "apps/shared/VERSION").read_text().splitlines()[0].strip()
    attaching = attaching_version(kit)
    tj_path = kit / "toolkit.json"
    tj = json.loads(tj_path.read_text())
    tj["sharedVersion"] = shared
    tj["attachingVersion"] = attaching
    # The toolkit's own skills come from the overlay; keep only those that really ship, in order
    tj["skills"] = [s for s in tj.get("skills", []) if (kit / ".claude/skills" / s / "SKILL.md").is_file()]
    tj_path.write_text(json.dumps(tj, indent=2) + "\n")
    return shared, attaching


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
        print("4. Attaching the 6 other tools to the base (Task List OS's files)")
        report = []
        attach(kit, work, report)
        for r in report:
            print("  %-10s %d files added, %d already there, %d permissions added%s" % (
                r["tool"], r["filesAdded"], r["alreadyThere"], len(r["permissionsAdded"]),
                (", left out: " + ", ".join(r["permissionsLeftOut"])) if r["permissionsLeftOut"] else ""))
        openers = tool_openers(work)
        print("  removed one tool's way in: " + ", ".join(drop_tool_entry_points(kit, openers)))
        print("5. Adding this kit's own files")
        print("  %d files from maintainers/overlay" % apply_overlay(kit))
        print("  step numbers made neutral in %d notes templates" % neutral_step_numbers(kit))
        print("  folder name made one in %d files" % one_folder_name(kit))
        print("  opener, start script and open-the-app skill named for the toolkit in %d files" % use_toolkit_names(kit, openers))
        print("  skills README written from %d skill folders" % write_skills_readme(kit))
        sv, av = write_versions_and_skills(kit)
        print("  toolkit.json: shared version %s, attaching version %s (from the real files)" % (sv, av))
        print("6. Writing the kit")
        write_kit(kit)
    (HERE / "built-from.json").write_text(json.dumps({"tools": got, "attach": report}, indent=2) + "\n")
    local = [t for t, g in got.items() if "folder" in g]
    print("Built Small Business Toolkit." + (" WARNING: built from local folders (" + ", ".join(local) + "), not for release." if local else ""))


if __name__ == "__main__":
    main()
