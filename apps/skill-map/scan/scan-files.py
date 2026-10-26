#!/usr/bin/env python3
"""
SKILL AND FOLDER MAP OS: the folder scan (Python version)
---------------------------------------------------------
Walks the folders the person chose and saves what it found in apps/skill-map/data/filemap.json, for the app
to draw as a map of folders and files and to point out what needs tidying.

  python3 apps/skill-map/scan/scan-files.py              scan and save
  python3 apps/skill-map/scan/scan-files.py --dry-run    scan and print the summary, save nothing

scan-files.js does the same job with Node. Both write exactly the same file (the test is in
maintainers/TESTING.md), so keep them in step. Works with Python 3.8 or later.

What it reads: the NAME, size, type and last-changed date of every file and folder inside the folders listed
in Preferences (settings.roots). It never opens a file, never reads what is inside one, never follows a
shortcut out of a chosen folder, and never changes, moves or deletes anything.

It skips hidden items (names starting with a dot), node_modules, the "Tidied by Claude" folders it makes itself, the Library folder of a home folder and the
inside of app and photo-library bundles (they show up as one item).

A re-scan keeps the person's settings and the suggestions Claude left.

Environment overrides, for testing: SKILLMAP_HOME (stands in for the home folder), SKILLMAP_KIT (stands in
for this folder) and SKILLMAP_NOW (a fixed "now", as an ISO date).
"""
import datetime
import functools
import hashlib
import json
import os
import re
import shutil
import sys

HOME = os.path.abspath(os.environ.get("SKILLMAP_HOME") or os.path.expanduser("~"))
KIT = os.path.abspath(os.environ.get("SKILLMAP_KIT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
DATA_FILE = os.path.join(KIT, "apps", "skill-map", "data", "filemap.json")
DAY = 86400

MAX_DEPTH = 10
MAX_ITEMS = 400000
STORE_FILES = 15000
LIST_CAP = 100
BIG_BYTES = 100 * 1024 * 1024
STALE_BYTES = 10 * 1024 * 1024
STALE_DAYS = 730
DOWNLOAD_DAYS = 90
LOOSE_FILES = 100
DEEP_DEPTH = 7

SKIP_DIRS = {"node_modules", "__pycache__", ".git", ".trash", "$recycle.bin", "venv", ".venv", "tidied by claude"}
BUNDLE_EXT = {".app", ".photoslibrary", ".xcodeproj", ".bundle", ".framework", ".rtfd", ".pages", ".numbers", ".key", ".sketch"}
TYPES = {
    "document": ["doc", "docx", "pdf", "txt", "md", "rtf", "odt", "pages", "gdoc", "epub"],
    "spreadsheet": ["xls", "xlsx", "csv", "numbers", "ods", "gsheet", "tsv"],
    "slides": ["ppt", "pptx", "key", "odp", "gslides"],
    "image": ["jpg", "jpeg", "png", "gif", "heic", "webp", "svg", "tif", "tiff", "bmp", "raw", "cr2", "nef"],
    "design": ["psd", "ai", "fig", "sketch", "indd", "xd", "afdesign", "afphoto", "eps"],
    "video": ["mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv"],
    "audio": ["mp3", "wav", "m4a", "aac", "flac", "aiff", "ogg"],
    "code": ["js", "ts", "jsx", "tsx", "py", "html", "css", "json", "sh", "rb", "php", "java", "swift", "go", "c", "cpp"],
    "archive": ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2"],
    "installer": ["dmg", "pkg", "exe", "msi", "iso", "apk"],
}
TYPE_OF = {}
for _t, _exts in TYPES.items():
    for _e in _exts:
        TYPE_OF[_e] = _t
MESSY = re.compile(r"(\bfinal[ _-]*final\b|\bcopy of\b|\(\d+\)(\.[a-z0-9]+)?\Z|\bcopy( \d+)?(\.[a-z0-9]+)?\Z|^untitled|^new folder|^document\d*\.|\bfinal[ _-]*v?\d+\b|\bscreenshot \d{4}-\d\d-\d\d)", re.I | re.A)


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
NOW_MS = NOW.timestamp() * 1000


# ---------- helpers ----------

def fail(message):
    sys.stderr.write("Folder scan: " + message + "\n")
    sys.exit(1)


def ckey(s):
    return s.encode("utf-8", "surrogatepass")


def is_dir(p):
    return os.path.isdir(p)


def slash(p):
    return p.replace(os.sep, "/")


def short_path(p):
    rel = os.path.relpath(p, HOME)
    if rel == ".":
        return "~"
    if rel and not rel.startswith("..") and not os.path.isabs(rel):
        return "~/" + slash(rel)
    return slash(p)


def id_for(prefix, p):
    return prefix + hashlib.sha1(short_path(p).encode("utf-8", "surrogatepass")).hexdigest()[:10]


def day(ms):
    return datetime.datetime.fromtimestamp(int(ms // 1000), datetime.timezone.utc).strftime("%Y-%m-%d")


def ext_of(name):
    i = name.rfind(".")
    return name[i + 1:].lower() if 0 < i < len(name) - 1 else ""


def iso_millis(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + ("%03d" % (dt.microsecond // 1000)) + "Z"


def read_json(p):
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    except OSError:
        return None
    try:
        return json.loads(text)
    except ValueError as e:
        fail(p + " is not valid JSON (" + str(e) + "). Fix or move it, then scan again.")


def load_settings():
    existing = read_json(DATA_FILE)
    prev = existing["settings"] if isinstance(existing, dict) and isinstance(existing.get("settings"), dict) else {}
    roots = [r for r in prev["roots"] if isinstance(r, str) and r.strip()] if isinstance(prev.get("roots"), list) else None
    if not roots:
        roots = ["~/" + n for n in ["Documents", "Desktop", "Downloads"] if is_dir(os.path.join(HOME, n))]
    settings = {"roots": [], "setUp": False, "ignore": []}
    settings.update(prev)
    settings["roots"] = roots
    return (existing if isinstance(existing, dict) else None), settings


def resolve_root(r):
    return os.path.abspath(re.sub(r"^~(?=$|[\\/])", lambda _m: HOME, str(r)))


def mtime_ms(p):
    try:
        return os.lstat(p).st_mtime * 1000
    except OSError:
        return NOW_MS


# ---------- the walk ----------

class Ctx:
    def __init__(self, ignore_list):
        self.folders = []
        self.files = []
        self.warnings = []
        self.items = 0
        self.truncated = False
        self.ignore = set(str(s).lower() for s in ignore_list)

    def add_file(self, folder, name, nbytes, ms):
        ext = ext_of(name)
        typ = "other" if ("." + ext) in BUNDLE_EXT else TYPE_OF.get(ext, "other")
        self.files.append({"id": id_for("x-", os.path.join(folder["_abs"], name)), "folder": folder["id"], "name": name, "ext": ext, "type": typ, "bytes": nbytes, "modified": day(ms)})
        folder["direct"]["files"] += 1
        folder["direct"]["bytes"] += nbytes


def walk(root_path, ctx):
    stack = [{"dir": root_path, "id": id_for("f-", root_path), "parent": None, "depth": 0}]
    while stack:
        cur = stack.pop()
        base = os.path.basename(cur["dir"])
        folder = {"id": cur["id"], "path": short_path(cur["dir"]), "name": (base or cur["dir"]) if cur["parent"] is None else base, "parent": cur["parent"], "depth": cur["depth"], "root": cur["parent"] is None,
                  "direct": {"files": 0, "bytes": 0}, "total": {"files": 0, "bytes": 0}, "newest": None, "oldest": None, "types": {}, "subfolders": 0, "deeper": False, "_abs": cur["dir"]}
        ctx.folders.append(folder)
        try:
            entries = sorted(os.scandir(cur["dir"]), key=lambda e: ckey(e.name))
        except OSError as e:
            ctx.warnings.append("Could not open " + short_path(cur["dir"]) + " (" + (errno_name(e)) + "). Skipped.")
            continue
        for e in entries:
            if ctx.items >= MAX_ITEMS:
                ctx.truncated = True
                break
            name = e.name
            if name.startswith("."):
                continue
            full = os.path.join(cur["dir"], name)
            if name.lower() in ctx.ignore:
                continue
            if e.is_symlink():
                continue
            ext = "." + ext_of(name)
            if e.is_dir(follow_symlinks=False):
                if name.lower() in SKIP_DIRS:
                    continue
                if cur["depth"] == 0 and name == "Library" and os.path.abspath(cur["dir"]) == HOME:
                    continue
                if ext in BUNDLE_EXT:
                    ctx.add_file(folder, name, 0, mtime_ms(full))
                    continue
                if cur["depth"] + 1 > MAX_DEPTH:
                    folder["deeper"] = True
                    continue
                folder["subfolders"] += 1
                ctx.items += 1
                stack.append({"dir": full, "id": id_for("f-", full), "parent": cur["id"], "depth": cur["depth"] + 1})
            elif e.is_file(follow_symlinks=False):
                try:
                    st = os.lstat(full)
                except OSError:
                    continue
                ctx.items += 1
                ctx.add_file(folder, name, st.st_size, st.st_mtime * 1000)


def errno_name(e):
    import errno
    code = getattr(e, "errno", None)
    return errno.errorcode.get(code, "error") if code else "error"


# ---------- roll the numbers up the tree, then find what needs tidying ----------

def finish(ctx):
    by_id = {f["id"]: f for f in ctx.folders}
    files_in = {}
    for x in ctx.files:
        files_in.setdefault(x["folder"], []).append(x)
    order = sorted(ctx.folders, key=lambda f: (-f["depth"], ckey(f["path"])))
    for f in order:
        f["total"]["files"] += f["direct"]["files"]
        f["total"]["bytes"] += f["direct"]["bytes"]
        for x in files_in.get(f["id"], []):
            f["types"][x["type"]] = f["types"].get(x["type"], 0) + 1
            if f["newest"] is None or x["modified"] > f["newest"]:
                f["newest"] = x["modified"]
            if f["oldest"] is None or x["modified"] < f["oldest"]:
                f["oldest"] = x["modified"]
        if f["parent"]:
            p = by_id[f["parent"]]
            p["total"]["files"] += f["total"]["files"]
            p["total"]["bytes"] += f["total"]["bytes"]
            for t, n in f["types"].items():
                p["types"][t] = p["types"].get(t, 0) + n
            if f["newest"] is not None and (p["newest"] is None or f["newest"] > p["newest"]):
                p["newest"] = f["newest"]
            if f["oldest"] is not None and (p["oldest"] is None or f["oldest"] < p["oldest"]):
                p["oldest"] = f["oldest"]
            if f["deeper"]:
                p["deeper"] = True

    def cutoff(n):
        return day(NOW_MS - n * DAY * 1000)

    stale_day, dl_day = cutoff(STALE_DAYS), cutoff(DOWNLOAD_DAYS)
    rank_key = lambda x: (-x["bytes"], ckey(x["id"]))

    def newest_cmp(a, b):
        if a["modified"] != b["modified"]:
            return -1 if a["modified"] > b["modified"] else 1
        ka, kb = ckey(a["id"]), ckey(b["id"])
        return -1 if ka < kb else (1 if ka > kb else 0)

    newest_key = functools.cmp_to_key(newest_cmp)

    def take(lst, key):
        return [x["id"] for x in sorted(lst, key=key)[:LIST_CAP]]

    def total_bytes(lst):
        return sum(x["bytes"] for x in lst)

    def in_downloads(x):
        f = by_id[x["folder"]]
        while f:
            if f["root"] and f["name"].lower() == "downloads":
                return True
            f = by_id[f["parent"]] if f["parent"] else None
        return False

    groups = {}
    for x in ctx.files:
        if x["bytes"] > 0:
            groups.setdefault(x["name"].lower() + "|" + str(x["bytes"]), []).append(x)
    dup_groups = [g for g in groups.values() if len(g) > 1]
    dup_groups.sort(key=lambda g: (-(g[0]["bytes"] * (len(g) - 1)), ckey(g[0]["id"])))
    dup_all = sum(g[0]["bytes"] * (len(g) - 1) for g in dup_groups)
    big = [x for x in ctx.files if x["bytes"] >= BIG_BYTES]
    stale = [x for x in ctx.files if x["bytes"] >= STALE_BYTES and x["modified"] < stale_day]
    old_dl = [x for x in ctx.files if x["modified"] < dl_day and in_downloads(x)]
    installers = [x for x in ctx.files if x["type"] == "installer"]
    messy = [x for x in ctx.files if MESSY.search(x["name"])]
    empty_f = [f for f in ctx.folders if not f["root"] and f["total"]["files"] == 0 and not f["deeper"]]
    loose_f = [f for f in ctx.folders if f["direct"]["files"] >= LOOSE_FILES]
    deep_f = [f for f in ctx.folders if f["depth"] >= DEEP_DEPTH]

    findings = {
        "dups": {"groupCount": len(dup_groups), "wastedBytes": dup_all, "groups": [{"name": g[0]["name"], "bytes": g[0]["bytes"], "count": len(g), "ids": [x["id"] for x in sorted(g, key=lambda x: ckey(x["id"]))[:12]]} for g in dup_groups[:LIST_CAP]]},
        "big": {"count": len(big), "bytes": total_bytes(big), "ids": take(big, rank_key)},
        "stale": {"count": len(stale), "bytes": total_bytes(stale), "ids": take(stale, rank_key)},
        "oldDownloads": {"count": len(old_dl), "bytes": total_bytes(old_dl), "ids": take(old_dl, rank_key)},
        "installers": {"count": len(installers), "bytes": total_bytes(installers), "ids": take(installers, rank_key)},
        "messy": {"count": len(messy), "bytes": total_bytes(messy), "ids": take(messy, newest_key)},
        "emptyFolders": {"count": len(empty_f), "ids": [f["id"] for f in sorted(empty_f, key=lambda f: (-f["depth"], ckey(f["path"])))[:LIST_CAP * 2]]},
        "looseFolders": {"count": len(loose_f), "ids": [f["id"] for f in sorted(loose_f, key=lambda f: (-f["direct"]["files"], ckey(f["id"])))[:50]]},
        "deepFolders": {"count": len(deep_f), "ids": [f["id"] for f in sorted(deep_f, key=lambda f: (-f["depth"], ckey(f["id"])))[:50]]},
    }

    keep = set()
    for g in findings["dups"]["groups"]:
        keep.update(g["ids"])
    for k in ["big", "stale", "oldDownloads", "installers", "messy"]:
        keep.update(findings[k]["ids"])

    def pick(cap):
        half = -(-cap // 2)
        chosen = set(keep)
        for lst in files_in.values():
            for x in sorted(lst, key=rank_key)[:half]:
                chosen.add(x["id"])
            for x in sorted(lst, key=newest_key)[:half]:
                chosen.add(x["id"])
        return chosen

    chosen = None
    for cap in [300, 120, 50, 20, 8, 2, 0]:
        chosen = pick(cap)
        if len(chosen) <= STORE_FILES:
            break
    stored = [x for x in ctx.files if x["id"] in chosen]
    stored.sort(key=lambda x: (ckey(by_id[x["folder"]]["path"]), ckey(x["name"]), ckey(x["id"])))
    folders = []
    for f in sorted(ctx.folders, key=lambda f: ckey(f["path"])):
        o = dict(f)
        del o["_abs"]
        o["types"] = {k: o["types"][k] for k in sorted(o["types"], key=ckey)}
        folders.append(o)
    return {"folders": folders, "files": stored, "findings": findings, "totals": {"folders": len(folders), "files": len(ctx.files), "bytes": total_bytes(ctx.files), "storedFiles": len(stored)}}


# ---------- put it together ----------

def scan():
    existing, settings = load_settings()
    ctx = Ctx(settings.get("ignore") or [])
    root_info = []
    seen = set()
    for raw in settings["roots"]:
        p = resolve_root(raw)
        if p in seen:
            continue
        seen.add(p)
        if not is_dir(p):
            ctx.warnings.append("The folder " + raw + " could not be found. Skipped.")
            root_info.append({"path": short_path(p), "label": os.path.basename(p) or p, "found": False, "files": 0, "bytes": 0})
            continue
        before = len(ctx.files)
        walk(p, ctx)
        after = ctx.files[before:]
        root_info.append({"path": short_path(p), "label": os.path.basename(p) or p, "found": True, "files": len(after), "bytes": sum(x["bytes"] for x in after)})
    if ctx.truncated:
        ctx.warnings.append("A very large set of files was found, so the scan stopped early. Add smaller folders in Preferences for a full picture.")
    done = finish(ctx)
    prev_totals = existing["scan"]["totals"] if existing and isinstance(existing.get("scan"), dict) and existing["scan"].get("totals") else None
    return {
        "version": 1,
        "settings": settings,
        "scan": {"at": iso_millis(NOW), "by": "scan-files.py", "roots": root_info, "warnings": ctx.warnings, "totals": done["totals"], "truncated": ctx.truncated, "previous": prev_totals},
        "folders": done["folders"],
        "files": done["files"],
        "findings": done["findings"],
        "recommendations": existing["recommendations"] if existing and isinstance(existing.get("recommendations"), list) else [],
    }


def dump(result):
    return json.dumps(result, indent=2, ensure_ascii=False) + "\n"


def save(result):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if os.path.exists(DATA_FILE):
        shutil.copyfile(DATA_FILE, re.sub(r"\.json$", ".backup.json", DATA_FILE))
    tmp = DATA_FILE + ".tmp-" + str(os.getpid())
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(dump(result))
    os.replace(tmp, DATA_FILE)


def mb_js(b):
    import math
    if b >= 1073741824:
        return "%.1f GB" % (b / 1073741824)
    if b >= 1048576:
        return "%d MB" % int(math.floor(b / 1048576 + 0.5))
    return "%d KB" % int(math.floor(b / 1024 + 0.5))


def main():
    args = sys.argv[1:]
    known = ["--dry-run", "--out"]
    for a in args:
        if a.startswith("--") and a not in known:
            fail("Unknown option " + a + ". Options: --dry-run, --out <file>.")
    r = scan()
    t, f = r["scan"]["totals"], r["findings"]
    lines = [
        "Looked through %d folders: found %d folders and %d files, %s in all." % (len([x for x in r["scan"]["roots"] if x["found"]]), t["folders"], t["files"], mb_js(t["bytes"])),
        "%d sets of duplicate files (about %s repeated), %d files over 100 MB, %d old files in Downloads." % (f["dups"]["groupCount"], mb_js(f["dups"]["wastedBytes"]), f["big"]["count"], f["oldDownloads"]["count"]),
        "%d empty folders, %d files with untidy names, %d installers." % (f["emptyFolders"]["count"], f["messy"]["count"], f["installers"]["count"]),
    ] + ["Note: " + w for w in r["scan"]["warnings"]]
    if "--dry-run" in args:
        sys.stdout.write("\n".join(lines) + "\nNothing was saved (dry run).\n")
        return
    if "--out" in args:
        i = args.index("--out")
        if i + 1 >= len(args):
            fail("--out needs a file name.")
        with open(args[i + 1], "w", encoding="utf-8", newline="\n") as fh:
            fh.write(dump(r))
        sys.stdout.write("\n".join(lines) + "\nSaved to " + args[i + 1] + "\n")
        return
    save(r)
    sys.stdout.write("\n".join(lines) + "\nSaved to apps/skill-map/data/filemap.json\n")


main()
