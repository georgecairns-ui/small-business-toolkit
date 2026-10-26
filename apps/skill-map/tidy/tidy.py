#!/usr/bin/env python3
"""
SKILL AND FOLDER MAP OS: the tidy-up (Python version)
------------------------------------------------------
Does the tidying the person asked for with a button press. The app writes what it wants done into
apps/skill-map/data/tidy.json (a list of moves, with the person's OK already given), and Claude runs
this once. It carries out each move, and records exactly what happened so it can be undone.

  python3 apps/skill-map/tidy/tidy.py              do everything waiting in tidy.json
  python3 apps/skill-map/tidy/tidy.py --dry-run    say what it would do, change nothing

tidy.js does the same job with Node. Both behave exactly the same (the test is in
maintainers/TESTING.md), so keep them in step.

THE RULES THIS SCRIPT HOLDS TO, whatever the file says:
  - It never deletes anything. Every change is a move or a rename, so every change can be undone.
  - It only touches things inside the folders the person chose in Preferences (the folder map), or
    inside their skill folders. Anything else is refused.
  - A move can only end up in the same chosen folder (folder map) or in the matching "-archive"
    folder next to the skill folder (skills). It never moves anything somewhere else.
  - It never overwrites: if the new name is taken it adds " (2)", " (3)" and so on.
  - It never opens a file, and it skips a file whose size has changed since the scan.
  - It never follows a shortcut (symbolic link) out of a chosen folder.

Environment overrides, for testing: SKILLMAP_HOME (stands in for the home folder), SKILLMAP_KIT
(stands in for this folder) and SKILLMAP_NOW (a fixed "now", as an ISO date).
"""
import json
import os
import sys
from datetime import datetime, timezone

HOME = os.path.abspath(os.environ.get("SKILLMAP_HOME") or os.path.expanduser("~"))
KIT = os.path.abspath(os.environ.get("SKILLMAP_KIT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
DATA = os.path.join(KIT, "apps", "skill-map", "data")
DRY = "--dry-run" in sys.argv
MAX_MOVES = 5000


def now():
    n = os.environ.get("SKILLMAP_NOW")
    if not n:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(n.replace("Z", "+00:00")).astimezone(timezone.utc) if "T" in n else datetime.strptime(n, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def iso(d):
    return d.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (d.microsecond // 1000)


def read_json(path):
    try:
        with open(path, encoding="utf8") as f:
            return json.load(f)
    except Exception:
        return None


def expand(p):
    p = str(p or "")
    if p == "~":
        return HOME
    if p.startswith("~/") or p.startswith("~\\"):
        return os.path.normpath(os.path.join(HOME, p[2:]))
    return os.path.abspath(p)


def real(p):
    try:
        return os.path.realpath(p) if os.path.exists(p) else None
    except Exception:
        return None


def inside(root, p):
    rel = os.path.relpath(p, root)
    return rel != "." and rel.split(os.sep)[0] != ".." and not os.path.isabs(rel)


def exists(p):
    return os.path.lexists(p)


def roots_for(lens):
    if lens == "files":
        fm = read_json(os.path.join(DATA, "filemap.json"))
        lst = fm["settings"]["roots"] if fm and isinstance(fm.get("settings"), dict) and isinstance(fm["settings"].get("roots"), list) else []
        if not lst:
            lst = ["~/Documents", "~/Desktop", "~/Downloads"]  # the same folders the scan starts with
        return [{"root": r, "archive": None} for r in map(expand, lst) if real(r)]
    sm = read_json(os.path.join(DATA, "skillmap.json"))
    extra = sm["settings"]["extraFolders"] if sm and isinstance(sm.get("settings"), dict) and isinstance(sm["settings"].get("extraFolders"), list) else []
    lst = [os.path.join(HOME, ".claude", "skills"), os.path.join(HOME, ".claude", "commands"), os.path.join(KIT, ".claude", "skills")] + [expand(e) for e in extra]
    return [{"root": r, "archive": r + "-archive"} for r in lst if real(r)]


def root_of(roots, p):
    for r in roots:
        if inside(r["root"], p):
            return r, r["root"]
        if r["archive"] and inside(r["archive"], p):
            return r, r["archive"]
    return None, None


def parent_inside(root, p):
    rp, rr = real(os.path.dirname(p)), real(root)
    return bool(rp) and bool(rr) and (rp == rr or inside(rr, rp))


def unique_to(to):
    if not exists(to):
        return to
    d, name = os.path.dirname(to), os.path.basename(to)
    base, ext = os.path.splitext(name)
    for n in range(2, 1000):
        t = os.path.join(d, "%s (%d)%s" % (base, n, ext))
        if not exists(t):
            return t
    return None


def do_move(lens, roots, mv, undo):
    src, wanted = expand(mv.get("from")), expand(mv.get("to"))
    r, base = root_of(roots, src)
    if not r:
        return {"status": "refused", "why": "It isn't inside a folder you chose"}
    if not parent_inside(base, src):
        return {"status": "refused", "why": "It sits behind a shortcut out of your chosen folder"}
    try:
        st = os.lstat(src)
    except OSError:
        return {"status": "skipped", "why": "It isn't there any more"}
    import stat
    if lens == "files":
        if stat.S_ISLNK(st.st_mode):
            return {"status": "refused", "why": "It's a shortcut, so it was left alone"}
        if mv.get("type") == "folder":
            if not stat.S_ISDIR(st.st_mode):
                return {"status": "skipped", "why": "It isn't a folder any more"}
            if [n for n in os.listdir(src) if not n.startswith(".")]:
                return {"status": "skipped", "why": "It has something in it now"}
        else:
            if not stat.S_ISREG(st.st_mode):
                return {"status": "skipped", "why": "It isn't a file any more"}
            b = mv.get("bytes")
            if isinstance(b, (int, float)) and not isinstance(b, bool) and st.st_size != b:
                return {"status": "skipped", "why": "It has changed since the scan"}
    allowed = r["root"] if (lens == "files" or undo) else r["archive"]
    if not inside(allowed, wanted):
        return {"status": "refused", "why": "That isn't somewhere it is allowed to go"}
    if wanted == src:
        return {"status": "skipped", "why": "It already has that name"}
    to = unique_to(wanted)
    if not to:
        return {"status": "skipped", "why": "Couldn't find a free name"}
    if DRY:
        return {"status": "would-move", "to": to}
    try:
        os.makedirs(os.path.dirname(to), exist_ok=True)
        if not parent_inside(allowed, to):
            return {"status": "refused", "why": "That isn't somewhere it is allowed to go"}
        os.rename(src, to)
    except OSError as e:
        import errno
        code = errno.errorcode.get(e.errno, "error")
        return {"status": "failed", "why": "It would have to move to another drive" if code == "EXDEV" else "The computer wouldn't let it move (%s)" % code}
    return {"status": "moved", "to": to}


def run_action(a, actions):
    lens = "skills" if a.get("lens") == "skills" else "files"
    roots = roots_for(lens)
    results = []
    if a.get("kind") == "undo":
        target = next((x for x in actions if x.get("id") == a.get("of")), None)
        if not target or not isinstance(target.get("results"), list):
            a["status"] = "failed"; a["note"] = "There is nothing to undo"; return
        if target.get("status") == "undone":
            a["status"] = "failed"; a["note"] = "That was already undone"; return
        moves = [{"from": m["to"], "to": m["from"], "type": m.get("type"), "back": m} for m in reversed([m for m in target["results"] if m.get("status") == "moved"])]
    else:
        moves = a.get("plan") if isinstance(a.get("plan"), list) else []
        if not moves:
            a["status"] = "failed"; a["note"] = "No new names were chosen" if a.get("needsPlan") else "There was nothing to do"; return
        if len(moves) > MAX_MOVES:
            a["status"] = "failed"; a["note"] = "That is more than %d things at once. Do it in smaller parts" % MAX_MOVES; return
    for mv in moves:
        res = do_move(lens, roots, mv, a.get("kind") == "undo")
        row = {"from": mv.get("from"), "to": res.get("to") or mv.get("to"), "status": res["status"]}
        if mv.get("type"):
            row["type"] = mv["type"]
        if res.get("why"):
            row["why"] = res["why"]
        results.append(row)
        if a.get("kind") == "undo" and res["status"] == "moved":
            mv["back"]["status"] = "undone"
    moved = len([m for m in results if m["status"] in ("moved", "would-move")])
    a["results"] = results
    a["summary"] = {"moved": moved, "left": len(results) - moved}
    a["status"] = "done" if moved == len(results) else ("partly" if moved else "failed")
    if a.get("kind") == "undo":
        target = next(x for x in actions if x.get("id") == a.get("of"))
        undone = len([m for m in target["results"] if m.get("status") == "undone"])
        total = len([m for m in target["results"] if m.get("status") in ("undone", "moved")])
        target["status"] = "undone" if undone == total else "partly-undone"


def brief(a):
    return {"id": a.get("id"), "status": a.get("status"), "summary": a.get("summary"), "note": a.get("note")}


def main():
    path = os.path.join(DATA, "tidy.json")
    d = read_json(path)
    if not d or not isinstance(d.get("actions"), list):
        sys.stderr.write("There is no tidy-up list to read at %s\n" % path)
        sys.exit(1)
    waiting = [a for a in d["actions"] if a.get("status") == "queued"]
    if not waiting:
        print(json.dumps({"done": 0, "note": "Nothing is waiting"}, ensure_ascii=False, separators=(",", ":")))
        return
    for a in waiting:
        run_action(a, d["actions"])
        if not DRY:
            a["finishedAt"] = iso(now())
    if DRY:
        print(json.dumps({"dryRun": True, "actions": [brief(a) for a in waiting]}, ensure_ascii=False, separators=(",", ":")))
        return
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        f.write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, path)
    print(json.dumps({"done": len(waiting), "actions": [brief(a) for a in waiting]}, ensure_ascii=False, separators=(",", ":")))


main()
