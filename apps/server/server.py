#!/usr/bin/env python3
"""
THE HELPER: the little helper that runs this folder's tools on this computer (Python version)
---------------------------------------------------------------------------------------------
It calls itself by the folder's name: "name" in toolkit.json (for example "Ads OS").
The same as server.js, for computers that have Python 3 but not Node. Claude uses whichever
is available. It serves the app at http://localhost:4747 and lets it read and save
the data files of the tools listed in apps/installed.json (for example apps/task-list/data/tasks.json),
and Home's own files in apps/home/data: layout.json, braindump.json and connections.json.
For a tool marked "media": true there, it also keeps the photos and videos added to that tool's posts in
the tool's own data/media folder (only a safe file name, the right kind of file, up to 200 MB, never over a
file that is already there, no delete) and plays them back.

Safety: only listens on this computer (127.0.0.1), only serves the apps folder, only ever saves
the task file, attached tools' listed data files and Home's 3 files, keeps a backup (for example tasks.backup.json)
before every save, refuses requests from other websites, refuses a save that was based on an older copy
of the file (409) so a change made in between is never overwritten, and answers a badly formed request with
an error instead of stopping.

It can also run a small Claude job straight away (sort a voice note, update a deal from call notes),
one at a time, only when the app asks, and only for a job a tool lists in apps/<tool>/claude-jobs.json.

Run it:      python3 apps/server/server.py
Other port:  TLOS_PORT=4848 python3 apps/server/server.py
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

PORT = int(os.environ.get("TLOS_PORT", "4747"))
HOST = "127.0.0.1"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
APPS = os.path.join(ROOT, "apps")
DATA = os.path.join(APPS, "task-list", "data", "tasks.json")
INSTALLED = os.path.join(APPS, "installed.json")


def read_name():
    """The folder's name, for messages: toolkit.json's "name", else the first tool's in apps/installed.json."""
    for read in (lambda: json.load(open(os.path.join(ROOT, "toolkit.json"), encoding="utf-8"))["name"],
                 lambda: json.load(open(INSTALLED, encoding="utf-8"))["tools"][0]["name"]):
        try:
            name = read()
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            continue
        if isinstance(name, str) and name.strip():
            return name.strip()
    return "Your toolkit"


NAME = read_name()
# A tool's data file must live in its own data folder: apps/<tool>/data/<name>.json
HOME_LAYOUT = os.path.join(APPS, "home", "data", "layout.json")
BRAIN_DUMP = os.path.join(APPS, "home", "data", "braindump.json")  # the shared Brain dump, every tool's notes
CONNECTIONS = os.path.join(APPS, "home", "data", "connections.json")  # which apps Claude can reach, shared by every tool (shared v13)
DATA_FILE_RE = re.compile(r"^apps/[a-z0-9-]+/data/[a-z0-9-]+\.json$")
DATA_URL_RE = re.compile(r"^/api/data/([a-z0-9-]+)/([a-z0-9-]+\.json)(/meta)?$")
MAX_BODY = 10 * 1024 * 1024
# Photos and videos: apps/<tool>/data/media/<name>, for a tool marked "media": true in apps/installed.json
MEDIA_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$")
MEDIA_URL_RE = re.compile(r"^/api/media/([a-z0-9-]+)/([^/]+)$")
MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
               ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}
MAX_MEDIA = 200 * 1024 * 1024
MEDIA_CHUNK = 64 * 1024
# Asking Claude to do a small job: sort a voice note, update a deal (see server.js for the plain-English explanation)
AUTO_CLAUDE = os.environ.get("TLOS_AUTO_CLAUDE", "on") != "off"
_logs = os.path.join(os.path.expanduser("~"), "Library", "Logs")
# tempfile.gettempdir(), like os.tmpdir() in server.js: Windows has no TMPDIR and usually no C:\tmp
CLAUDE_LOG = os.path.join(_logs if os.path.isdir(_logs) else tempfile.gettempdir(),(re.sub(r"[^a-z0-9]+", "-", NAME.lower()).strip("-") or "toolkit") + "-claude.log")
RUN_LIMIT_S = 10 * 60
UNWATCHED = " Nobody is watching this run, so do not ask questions: make your best reading of anything unclear and say so in your notes."
SORT_JOB = {"key": "shared:brain-dump", "label": "sorting the brain dump",
            "prompt": ("A new brain dump has just been added. Follow .claude/skills/sort-brain-dump for the unsorted items in apps/home/data/braindump.json "
                       "(and any unsorted items in apps/task-list/data/tasks.json's dump). Be quick and change nothing else." + UNWATCHED)}
RUN_URL_RE = re.compile(r"^/api/claude/run/([a-z0-9-]+)/([a-z0-9-]+)$")
# One run at a time. Asking again for a job that's already waiting doesn't queue it twice.
claude_run = {"running": False, "queued": False, "job": None, "startedAt": None, "lastRunAt": None, "lastResult": None, "lastJob": None}
claude_queue = []
claude_lock = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def find_claude():
    if os.environ.get("TLOS_CLAUDE"):
        return os.environ["TLOS_CLAUDE"]
    found = shutil.which("claude")
    if found:
        return found
    for d in (os.path.expanduser("~/.local/bin"), os.path.expanduser("~/.claude/local"), "/usr/local/bin", "/opt/homebrew/bin"):
        for name in ("claude", "claude.exe", "claude.cmd"):
            full = os.path.join(d, name)
            if os.access(full, os.X_OK):
                return full
    return None


def tool_job(tool_id, name):
    """A job a tool lists in apps/<tool>/claude-jobs.json, for tools in apps/installed.json only. None for anything else."""
    tool = next((t for t in installed_tools() if isinstance(t, dict) and t.get("id") == tool_id), None)
    app = tool.get("app") if tool and isinstance(tool.get("app"), str) else ""
    if not re.match(r"^apps/[a-z0-9-]+/$", app) or app in ("apps/shared/", "apps/server/"):
        return None
    try:
        with open(os.path.join(ROOT, *app.split("/"), "claude-jobs.json"), "r", encoding="utf-8") as f:
            jobs = json.load(f).get("jobs")
    except (OSError, ValueError, AttributeError):
        return None
    job = jobs.get(name) if isinstance(jobs, dict) else None
    if not isinstance(job, dict) or not isinstance(job.get("prompt"), str) or not job["prompt"].strip():
        return None
    label = job["label"][:80] if isinstance(job.get("label"), str) else name
    return {"key": tool_id + ":" + name, "label": label, "prompt": job["prompt"][:4000] + UNWATCHED}


def _claude_worker(binary):
    while True:
        with claude_lock:
            if not claude_queue:
                claude_run["running"] = False
                claude_run["queued"] = False
                claude_run["job"] = None
                return
            job = claude_queue.pop(0)
            claude_run["queued"] = len(claude_queue) > 0
            claude_run["job"] = job["key"]
            claude_run["startedAt"] = now_iso()
        # Anything that goes wrong (no log folder, a prompt Claude can't be started with) fails this job only,
        # so the loop carries on and running is set back to False: otherwise every later job just waits for ever
        try:
            with open(CLAUDE_LOG, "a", encoding="utf-8") as log:
                log.write("\n--- %s %s\n" % (claude_run["startedAt"], job["label"]))
                log.flush()
                result = subprocess.run([binary, "-p", job["prompt"]], cwd=ROOT, stdout=log, stderr=log, timeout=RUN_LIMIT_S)
                outcome = "ok" if result.returncode == 0 else "failed"
        except Exception:
            outcome = "failed"
        with claude_lock:
            claude_run["lastRunAt"] = now_iso()
            claude_run["lastResult"] = outcome
            claude_run["lastJob"] = job["key"]


def run_claude(job):
    binary = find_claude()
    with claude_lock:
        if not binary:
            claude_run["lastResult"] = "not-installed"
            return False
        # A job already running is queued once more, so it also sees anything added since it started
        if not any(j["key"] == job["key"] for j in claude_queue):
            claude_queue.append(job)
        if claude_run["running"]:
            claude_run["queued"] = True
            return True
        claude_run["running"] = True
    threading.Thread(target=_claude_worker, args=(binary,), daemon=True).start()
    return True


TYPES = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png",
    ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
}


def modified(path=DATA):
    try:
        return os.stat(path).st_mtime * 1000
    except OSError:
        return 0


def installed_tools():
    """The tools in this folder, from apps/installed.json. If it's missing or unreadable, just the task list."""
    try:
        with open(INSTALLED, "r", encoding="utf-8") as f:
            tools = json.load(f).get("tools")
    except (OSError, ValueError, AttributeError):
        tools = None
    return tools if isinstance(tools, list) else [{"id": "task-list", "app": "apps/task-list/", "dataFiles": ["apps/task-list/data/tasks.json"]}]


def data_file_for(tool_id, file_name):
    """The file behind /api/data/<tool>/<file>, or None if that tool isn't installed or the file isn't one of its own."""
    # Home's own file: which boxes show, in what order and how wide
    if tool_id == "home":
        return {"layout.json": HOME_LAYOUT, "braindump.json": BRAIN_DUMP, "connections.json": CONNECTIONS}.get(file_name)
    for tool in installed_tools():
        if not isinstance(tool, dict) or tool.get("id") != tool_id or not isinstance(tool.get("dataFiles"), list):
            continue
        # A tool may only save inside its own app folder, never another tool's data or the shared parts
        app = tool.get("app") if isinstance(tool.get("app"), str) else ""
        if not re.match(r"^apps/[a-z0-9-]+/$", app) or app in ("apps/shared/", "apps/server/"):
            continue
        for rel in tool["dataFiles"]:
            if not isinstance(rel, str) or not DATA_FILE_RE.match(rel) or rel.endswith(".backup.json") or not rel.startswith(app + "data/"):
                continue
            if rel.rsplit("/", 1)[-1] == file_name:
                return os.path.join(ROOT, *rel.split("/"))
    return None


def media_dir_for(tool_id):
    """The folder a tool keeps photos and videos in, or None if that tool isn't installed or isn't marked "media": true."""
    tool = next((t for t in installed_tools() if isinstance(t, dict) and t.get("id") == tool_id), None)
    app = tool.get("app") if tool and isinstance(tool.get("app"), str) else ""
    if not tool or tool.get("media") is not True or not re.match(r"^apps/[a-z0-9-]+/$", app) or app in ("apps/shared/", "apps/server/"):
        return None
    return os.path.join(ROOT, *app.split("/"), "data", "media")


def home_page():
    """The page http://localhost:4747 opens: Home, or (in an older copy without it) the first tool in apps/installed.json."""
    if os.path.exists(os.path.join(APPS, "home", "index.html")):
        return "/home/"
    tools = installed_tools()
    app = tools[0].get("app") if tools and isinstance(tools[0], dict) else None
    return "/" + app[5:] if isinstance(app, str) and re.match(r"^apps/[a-z0-9-]+/$", app) else "/task-list/"


# A fingerprint of a file's contents, sent as the ETag header on every read and every save. A save that
# sends it back in If-Match is only accepted while the file is still exactly that (otherwise 409), so an
# edit made in between, for example by Claude, is never overwritten. A save without it works as before.
save_lock = threading.Lock()
IF_MATCH_RE = re.compile(r'^\s*(?:W/)?"?([0-9a-f]{8,64})"?\s*$', re.I)


def version_of(text):
    data = text if isinstance(text, bytes) else text.encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:24]


def version_header(text):
    return {"ETag": '"%s"' % version_of(text)}


def save_file(path, text):
    """Keep a backup, write a temporary file, then swap it in, so a save is never half-written."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        with open(path, "rb") as src, open(path[:-5] + ".backup.json", "wb") as dst:
            dst.write(src.read())
    tmp = path + ".saving"
    with open(tmp, "w", encoding="utf-8", newline="") as f:  # newline="": the file holds exactly what its version is taken from
        f.write(text)
    os.replace(tmp, path)


class Handler(BaseHTTPRequestHandler):
    server_version = "ToolkitHelper"

    def log_message(self, *args):  # keep the terminal quiet
        pass

    def send(self, status, body, ctype="text/plain; charset=utf-8", extra=None):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def send_json(self, status, obj):
        self.send(status, json.dumps(obj), TYPES[".json"])

    def host_ok(self):
        return re.match(r"^(localhost|127\.0\.0\.1)(:\d+)?$", self.headers.get("Host", ""), re.I) is not None

    def origin_ok(self):
        origin = self.headers.get("Origin")
        return origin is None or origin in ("http://localhost:%d" % PORT, "http://127.0.0.1:%d" % PORT)

    def read_file(self, path):
        try:
            # errors="replace": a byte that isn't UTF-8 (a £ saved by Windows PowerShell 5.1) reads as U+FFFD, as in server.js,
            # instead of an error that drops the connection and makes the app say the helper isn't running
            with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:
                text = f.read()
        except OSError:
            return self.send_json(404, {"error": "missing"})
        return self.send(200, text, TYPES[".json"], dict({"X-Modified": str(modified(path))}, **version_header(text)))

    def get_media(self, directory, name):
        """Plays a saved photo or video back. Supports Range requests, which browsers use to play and skip around a video."""
        path = os.path.join(directory, name)
        size = os.path.getsize(path) if os.path.isfile(path) else 0
        if not size:
            return self.send_json(404, {"error": "missing"})
        start, end, status = 0, size - 1, 200
        wanted = re.match(r"^bytes=(\d*)-(\d*)$", self.headers.get("Range", ""))
        if wanted and (wanted.group(1) or wanted.group(2)):
            start = int(wanted.group(1)) if wanted.group(1) else max(0, size - int(wanted.group(2)))
            if wanted.group(1) and wanted.group(2):
                end = min(end, int(wanted.group(2)))
            if start > end:
                return self.send(416, "Range not satisfiable", extra={"Content-Range": "bytes */%d" % size})
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", MEDIA_TYPES[os.path.splitext(name)[1]])
        self.send_header("Cache-Control", "private, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Accept-Ranges", "bytes")
        if status == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        if self.command == "HEAD":
            return
        try:
            with open(path, "rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(MEDIA_CHUNK, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser stopped early, which is normal for video

    def put_media(self, directory, name):
        """Saves an upload: checks it, writes a temporary file, then swaps it in. Never replaces a file that is there."""
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != MEDIA_TYPES[os.path.splitext(name)[1]]:
            return self.send_json(415, {"error": "wrong kind of file"})
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            length = 0
        if length < 1:
            return self.send_json(411, {"error": "length needed"})
        if length > MAX_MEDIA:
            return self.send_json(413, {"error": "too large"})
        path = os.path.join(directory, name)
        tmp = path + ".saving"
        if os.path.exists(path):
            self.skip_body(length)  # so the browser gets this answer instead of a dropped connection
            return self.send_json(409, {"error": "already there"})
        try:
            os.makedirs(directory, exist_ok=True)
            with open(tmp, "xb") as out:
                left = length
                while left > 0:
                    chunk = self.rfile.read(min(MEDIA_CHUNK, left))
                    if not chunk:
                        break
                    out.write(chunk)
                    left -= len(chunk)
            if left:
                return self.drop_upload(tmp, 400, "incomplete")
            if os.path.exists(path):
                return self.drop_upload(tmp, 409, "already there")
            os.replace(tmp, path)
        except FileExistsError:
            return self.send_json(409, {"error": "already there"})
        except OSError:
            return self.drop_upload(tmp, 500, "save failed")
        self.send_json(201, {"file": name})

    def skip_body(self, length):
        """Reads and throws away what the browser is still sending."""
        while length > 0:
            chunk = self.rfile.read(min(MEDIA_CHUNK, length))
            if not chunk:
                break
            length -= len(chunk)

    def drop_upload(self, tmp, status, error):
        """Throws away a half-saved upload and says why."""
        try:
            os.remove(tmp)
        except OSError:
            pass
        self.send_json(status, {"error": error})

    def do_GET(self):
        if not self.host_ok():
            return self.send(403, "Not allowed")
        url = self.path.split("?")[0]
        if url == "/api/alive.js":
            return self.send(200, "window.tlosAlive = true;", TYPES[".js"])
        if url == "/api/info":  # where this folder is and its name, so "Open in Claude" can start Claude Code right here
            return self.send_json(200, {"folder": ROOT, "name": NAME})
        if url == "/api/tasks/meta":
            return self.send_json(200, {"modified": modified()})
        if url == "/api/tasks":
            return self.read_file(DATA)
        m = DATA_URL_RE.match(url)
        if m:
            path = data_file_for(m.group(1), m.group(2))
            if not path:
                return self.send_json(404, {"error": "not an installed tool's data file"})
            if m.group(3):
                return self.send_json(200, {"modified": modified(path)})
            return self.read_file(path)
        media = MEDIA_URL_RE.match(url)
        if media:
            directory = media_dir_for(media.group(1))
            if not directory:
                return self.send_json(404, {"error": "not a tool that keeps photos and videos"})
            if not MEDIA_NAME_RE.match(media.group(2)):
                return self.send_json(400, {"error": "file name not allowed"})
            return self.get_media(directory, media.group(2))
        if url == "/api/claude/status":
            with claude_lock:
                snapshot = dict(claude_run)
            return self.send_json(200, dict(snapshot, available=AUTO_CLAUDE and bool(find_claude())))
        if url.startswith("/api/"):
            return self.send_json(404, {"error": "not found"})
        if url in ("/", ""):
            self.send_response(302)
            self.send_header("Location", home_page())
            self.end_headers()
            return
        try:
            if re.search(r"%(?![0-9a-fA-F]{2})", url):
                raise ValueError("bad percent sign")  # for example GET /%
            rel = unquote(url, errors="strict")
        except (ValueError, UnicodeDecodeError):
            return self.send(400, "Bad request")
        if "\0" in rel:
            return self.send(400, "Bad request")
        if rel.endswith("/"):
            rel += "index.html"
        path = os.path.abspath(os.path.join(APPS, "." + rel))
        if not path.startswith(APPS + os.sep) or path.endswith(".backup.json") or path.endswith(".saving"):
            return self.send(403, "Not allowed")
        try:
            with open(path, "rb") as f:
                body = f.read()
        except OSError:
            return self.send(404, "Not found")
        self.send(200, body, TYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream"))

    do_HEAD = do_GET

    def refuse(self):
        self.send(405, "Not allowed")

    def do_POST(self):
        if not self.host_ok():
            return self.send(403, "Not allowed")
        url = self.path.split("?")[0]
        run = RUN_URL_RE.match(url)
        if url != "/api/claude/sort-brain-dump" and not run:
            return self.refuse()
        if not self.origin_ok() or "application/json" not in self.headers.get("Content-Type", ""):
            return self.send_json(403, {"error": "forbidden"})
        job = tool_job(run.group(1), run.group(2)) if run else SORT_JOB
        if not job:
            return self.send_json(404, {"error": "no such job"})
        if not AUTO_CLAUDE:
            return self.send_json(503, {"error": "turned off"})
        if run_claude(job):
            return self.send_json(202, {"started": True})
        return self.send_json(503, {"error": "claude not installed"})

    do_DELETE = do_PATCH = do_OPTIONS = refuse

    def do_PUT(self):
        if not self.host_ok() or not self.origin_ok():
            return self.send_json(403, {"error": "forbidden"})
        url = self.path.split("?")[0]
        media = MEDIA_URL_RE.match(url)
        if media:
            directory = media_dir_for(media.group(1))
            if not directory:
                return self.send_json(404, {"error": "not a tool that keeps photos and videos"})
            if not MEDIA_NAME_RE.match(media.group(2)):
                return self.send_json(400, {"error": "file name not allowed"})
            return self.put_media(directory, media.group(2))
        if url == "/api/tasks":
            path = DATA
        else:
            m = DATA_URL_RE.match(url)
            if not m:
                return self.send_json(404, {"error": "not found"})
            if m.group(3):
                return self.send_json(405, {"error": "not allowed"})
            path = data_file_for(m.group(1), m.group(2))
            if not path:
                return self.send_json(404, {"error": "not an installed tool's data file"})
        if "application/json" not in self.headers.get("Content-Type", ""):
            return self.send_json(415, {"error": "json only"})
        try:
            length = int(self.headers.get("Content-Length", "0") or 0)
        except ValueError:
            return self.send_json(400, {"error": "not valid"})
        if length < 0:
            return self.send_json(400, {"error": "not valid"})
        if length > MAX_BODY:
            return self.send_json(413, {"error": "too large"})
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "not valid"})
        if not isinstance(data, dict):
            return self.send_json(400, {"error": "not valid"})
        if path == DATA and not isinstance(data.get("tasks"), list):
            return self.send_json(400, {"error": "no tasks list"})
        # Check and save under one lock, so 2 saves can't both pass the check
        sent = (self.headers.get("If-Match") or "").strip()
        m = IF_MATCH_RE.match(sent) if sent else None
        if sent and not m:
            return self.send_json(400, {"error": "not valid"})  # a version this helper never gave out
        based = m.group(1).lower() if m else None
        out = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
        try:
            with save_lock:
                if based is not None:
                    try:
                        with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:  # read as read_file does, so the versions match
                            current = f.read()
                    except OSError:
                        current = None  # the file is gone: also a change
                    if current is None or version_of(current) != based:
                        return self.send_json(409, {"error": "changed since you read it"})
                save_file(path, out)
        except OSError:
            return self.send_json(500, {"error": "save failed"})
        self.send(200, json.dumps({"modified": modified(path), "version": version_of(out)}), TYPES[".json"], version_header(out))


if __name__ == "__main__":
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print("%s: port %d is already in use. It may already be running: open http://localhost:%d" % (NAME, PORT, PORT), file=sys.stderr)
        sys.exit(1)
    print("%s is running at http://localhost:%d" % (NAME, PORT))
    httpd.serve_forever()
