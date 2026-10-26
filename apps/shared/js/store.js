/*
  STORE: how a tool reads and saves its data file
  -----------------------------------------------
  Every tool keeps its data in a plain JSON file inside its own "data" folder, for example
  apps/task-list/data/tasks.json. The customer's Claude edits that same file.

  Usually the helper on this computer (apps/server) does the reading and saving: the page asks it
  through opts.api, so there's nothing to pick or allow. Steps 1 and 2 below are the fallback for
  when the page is opened straight from the folder in Chrome or Edge.

  How it works, in plain English:
  1. The first time, the customer clicks "Connect" and picks the folder. Chrome asks
     "Let this page edit files?" and they click Allow. This uses the browser's built-in
     File System Access feature, so nothing needs installing.
  2. The folder is remembered in the browser. Next time it opens straight away, or after one click.
  3. Every few seconds the app checks whether the file changed (because Claude edited it)
     and refreshes the screen if so.
  4. Every save re-reads the file first, applies just the one change, then writes it back.
     That way the app never overwrites something Claude has just written.
     The previous version is kept as "<name>.backup.json" next to it, as a safety net.

  Works in Chrome and Microsoft Edge (Mac and Windows). Safari and Firefox do not support
  editing local files from a web page, so they get a friendly message saying what to do.
  There is no demo mode: a fresh install shows the person's own (empty) list and guides them.
*/
(function () {
  "use strict";

  const POLL_MS = 2500;

  // ---------- Tiny wrapper around the browser's built-in IndexedDB, used only to remember the folder ----------
  function idb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open("task-list-os", 1);
      req.onupgradeneeded = function () { req.result.createObjectStore("folders"); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbRun(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction("folders", mode);
        const req = fn(tx.objectStore("folders"));
        tx.oncomplete = function () { resolve(req && req.result); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  const remembered = {
    get: function (key) { return idbRun("readonly", function (s) { return s.get(key); }); },
    set: function (key, val) { return idbRun("readwrite", function (s) { return s.put(val, key); }); },
    remove: function (key) { return idbRun("readwrite", function (s) { return s.delete(key); }); }
  };

  // A friendly error with a "kind" the screens can react to
  function StoreError(kind, message, cause) {
    const err = new Error(message);
    err.kind = kind;
    err.cause = cause;
    return err;
  }

  function isSupported() {
    return typeof window.showDirectoryPicker === "function";
  }

  /*
    createStore(options)
      moduleId     e.g. "task-list" (used to remember which folder belongs to which app)
      fileName     e.g. "tasks.json"
      dataPaths    where to look for the file inside the folder the person picks
      api          the helper's address for the task file, for example "/api/tasks" (see apps/server)
      validate     function(data) that throws if the file is not in the expected shape
      onData       function(data, reason) called whenever data arrives. reason is
                   "load", "save" or "external" (Claude changed the file)
      onStatus     function(status, detail) called when the connection state changes:
                   "checking", "unsupported", "needs-helper", "needs-connect", "needs-permission", "ready", "error"
  */
  function createStore(options) {
    const opts = options;
    const backupName = opts.fileName.replace(/\.json$/, "") + ".backup.json";
    const state = {
      mode: "none",          // "helper" or "file"
      folder: null,          // the folder the customer picked
      dataDir: null,         // the folder that actually holds the data file
      lastModified: 0,       // when the file last changed, so we can spot Claude's edits
      data: null,
      writing: Promise.resolve(),
      busy: false,
      pollTimer: null
    };

    function setStatus(status, detail) { state.lastStatus = status; opts.onStatus(status, detail || {}); }

    // Find the data folder inside whatever folder the customer picked.
    // opts.dataPaths lists the places to look, relative to the picked folder,
    // for example ["data", "", "apps/task-list/data"]. "" means the picked folder itself.
    async function findDataDir(picked) {
      async function hasFile(dir) {
        try { await dir.getFileHandle(opts.fileName); return true; } catch (e) { return false; }
      }
      async function child(dir, name) {
        try { return await dir.getDirectoryHandle(name); } catch (e) { return null; }
      }
      const paths = opts.dataPaths || ["data", ""];
      for (const path of paths) {
        let dir = picked;
        for (const part of path.split("/").filter(Boolean)) {
          dir = await child(dir, part);
          if (!dir) break;
        }
        if (dir && await hasFile(dir)) return dir;
      }
      throw StoreError("wrong-folder", "That folder does not contain " + opts.fileName + ".");
    }

    async function readFile() {
      let handle, file, text;
      try {
        handle = await state.dataDir.getFileHandle(opts.fileName);
        file = await handle.getFile();
        text = await file.text();
      } catch (e) {
        if (e && e.name === "NotAllowedError") throw StoreError("needs-permission", "Permission to the folder was removed.", e);
        throw StoreError("missing", "The data file could not be found. It may have been moved or renamed.", e);
      }
      let data;
      try {
        data = JSON.parse(text);
        if (opts.validate) opts.validate(data);
      } catch (e) {
        throw StoreError("bad-file", "The data file has a mistake in it, so it could not be read.", e);
      }
      return { data: data, text: text, lastModified: file.lastModified };
    }

    async function writeText(name, text) {
      const handle = await state.dataDir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
    }

    async function openFolder(folder) {
      state.folder = folder;
      state.dataDir = await findDataDir(folder);
      const result = await readFile();
      state.mode = "file";
      state.data = result.data;
      state.lastModified = result.lastModified;
      setStatus("ready", { folderName: folder.name });
      opts.onData(state.data, "load");
      startWatching();
    }

    // ---------- The helper on this computer (http://localhost:4747) ----------
    // When the app is opened from the helper's link, it reads and saves through the helper:
    // no folder to pick and nothing to allow. opts.api is the helper's address for the task file.
    async function helperAvailable() {
      if (!opts.api || !/^https?:$/.test(location.protocol)) return false;
      try { const r = await fetch(opts.api + "/meta", { cache: "no-store" }); return r.ok; } catch (e) { return false; }
    }
    async function helperRead() {
      let r;
      try { r = await fetch(opts.api, { cache: "no-store" }); } catch (e) { throw StoreError("helper-stopped", "The task list helper isn't running.", e); }
      if (r.status === 404) throw StoreError("missing", "The data file could not be found.");
      if (!r.ok) throw StoreError("helper-stopped", "The task list helper didn't answer.");
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); if (opts.validate) opts.validate(data); } catch (e) { throw StoreError("bad-file", "The data file has a mistake in it, so it could not be read.", e); }
      return { data: data, text: text, lastModified: Number(r.headers.get("X-Modified")) || 0 };
    }
    async function helperWrite(data) {
      let r;
      try {
        r = await fetch(opts.api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } catch (e) { throw StoreError("helper-stopped", "The task list helper isn't running.", e); }
      if (!r.ok) throw StoreError("save-failed", "Your change could not be saved.");
      return (await r.json()).modified;
    }
    async function openHelper() {
      const result = await helperRead();
      state.mode = "helper";
      state.data = result.data;
      state.lastModified = result.lastModified;
      setStatus("ready", { folderName: "Task List OS", helper: true });
      opts.onData(state.data, "load");
      startWatching();
    }

    // ---------- Watching for Claude's edits ----------
    function startWatching() {
      stopWatching();
      state.pollTimer = setInterval(checkForChanges, POLL_MS);
      document.addEventListener("visibilitychange", onVisible);
    }
    function stopWatching() {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
    function onVisible() { if (document.visibilityState === "visible") checkForChanges(); }

    async function checkForChanges() {
      if (state.busy || document.visibilityState !== "visible") return;
      if (state.mode === "helper") return checkHelper();
      if (state.mode !== "file") return;
      try {
        const handle = await state.dataDir.getFileHandle(opts.fileName);
        const file = await handle.getFile();
        if (file.lastModified === state.lastModified) return;
        const result = await readFile();
        state.data = result.data;
        state.lastModified = result.lastModified;
        setStatus("ready", { folderName: state.folder.name });
        opts.onData(state.data, "external");
      } catch (e) {
        const err = e.kind ? e : StoreError("missing", "The data file could not be read.", e);
        // Keep showing the last good data, but tell the customer something needs fixing
        setStatus(err.kind === "needs-permission" ? "needs-permission" : "error", { error: err, folderName: state.folder && state.folder.name });
        if (err.kind === "needs-permission") stopWatching();
      }
    }

    async function checkHelper() {
      try {
        const r = await fetch(opts.api + "/meta", { cache: "no-store" });
        if (!r.ok) throw StoreError("helper-stopped", "The task list helper didn't answer.");
        const meta = await r.json();
        if (meta.modified === state.lastModified) {
          if (state.lastStatus === "error") setStatus("ready", { folderName: "Task List OS", helper: true });
          return;
        }
        const result = await helperRead();
        state.data = result.data;
        state.lastModified = result.lastModified;
        setStatus("ready", { folderName: "Task List OS", helper: true });
        opts.onData(state.data, "external");
      } catch (e) {
        const err = e.kind ? e : StoreError("helper-stopped", "The task list helper isn't running.", e);
        setStatus("error", { error: err, folderName: "Task List OS", helper: true });
      }
    }

    // ---------- Public actions ----------
    async function start() {
      setStatus("checking");
      // Opened from the helper's link: everything just works, no folder to pick
      if (await helperAvailable()) {
        try { return await openHelper(); } catch (e) { return setStatus("error", { error: e, folderName: "Task List OS", helper: true }); }
      }
      // Opened as a file without the helper running: ask Claude to start it
      if (location.protocol === "file:" && opts.api) return setStatus("needs-helper");
      if (!isSupported()) return setStatus("unsupported");
      let folder = null;
      try { folder = await remembered.get(opts.moduleId); } catch (e) { folder = null; }
      if (!folder) return setStatus("needs-connect");
      const permission = await folder.queryPermission({ mode: "readwrite" });
      if (permission !== "granted") return setStatus("needs-permission", { folderName: folder.name });
      try {
        await openFolder(folder);
      } catch (e) {
        setStatus("error", { error: e, folderName: folder.name });
      }
    }

    // Opens the folder picker. Must be called from a click.
    async function connect() {
      let folder;
      try {
        folder = await window.showDirectoryPicker({ id: "task-list-os-" + opts.moduleId, mode: "readwrite" });
      } catch (e) {
        if (e && e.name === "AbortError") return false; // they closed the picker, no harm done
        throw e;
      }
      await openFolder(folder); // throws "wrong-folder" if they picked the wrong one
      await remembered.set(opts.moduleId, folder);
      return true;
    }

    // One click to re-open the remembered folder. Must be called from a click.
    async function reconnect() {
      const folder = state.folder || await remembered.get(opts.moduleId);
      if (!folder) return setStatus("needs-connect");
      const permission = await folder.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") return setStatus("needs-permission", { folderName: folder.name });
      await openFolder(folder);
    }

    // Forget the folder (used by "Use a different folder")
    async function forget() {
      stopWatching();
      await remembered.remove(opts.moduleId);
      state.folder = null; state.dataDir = null; state.data = null; state.mode = "none";
      setStatus("needs-connect");
    }

    /*
      update(change): the only way the app changes data.
      "change" is a function that edits the data it is given. In file mode we re-read the latest
      file first, apply the change, keep a backup and save. Saves run one at a time, in order.
    */
    function update(change) {
      if (state.mode === "helper") {
        const runHelper = async function () {
          state.busy = true;
          try {
            const latest = await helperRead();   // fresh copy, including anything Claude just wrote
            const data = latest.data;
            change(data);
            state.lastModified = await helperWrite(data);
            state.data = data;
            setStatus("ready", { folderName: "Task List OS", helper: true, savedAt: new Date() });
            opts.onData(state.data, "save");
            return data;
          } catch (e) {
            const err = e.kind ? e : StoreError("save-failed", "Your change could not be saved.", e);
            setStatus("error", { error: err, folderName: "Task List OS", helper: true });
            throw err;
          } finally {
            state.busy = false;
          }
        };
        const queued = state.writing.then(runHelper, runHelper);
        state.writing = queued.catch(function () {});
        return queued;
      }
      if (state.mode !== "file") return Promise.reject(StoreError("not-connected", "No folder is connected yet."));

      const run = async function () {
        state.busy = true;
        try {
          const latest = await readFile();      // fresh copy, including anything Claude just wrote
          const data = latest.data;
          change(data);
          const text = JSON.stringify(data, null, 2) + "\n";
          await writeText(backupName, latest.text);
          await writeText(opts.fileName, text);
          const saved = await (await state.dataDir.getFileHandle(opts.fileName)).getFile();
          state.lastModified = saved.lastModified;
          state.data = data;
          setStatus("ready", { folderName: state.folder.name, savedAt: new Date() });
          opts.onData(state.data, "save");
          return data;
        } catch (e) {
          const err = e.kind ? e : StoreError("save-failed", "Your change could not be saved.", e);
          setStatus(err.kind === "needs-permission" ? "needs-permission" : "error", { error: err, folderName: state.folder && state.folder.name });
          throw err;
        } finally {
          state.busy = false;
        }
      };
      // Queue behind any save already in progress
      const next = state.writing.then(run, run);
      state.writing = next.catch(function () {});
      return next;
    }

    function retry() {
      if (state.mode === "helper" || (opts.api && /^https?:$/.test(location.protocol))) return start();
      if (state.folder) return openFolder(state.folder).catch(function (e) { setStatus("error", { error: e, folderName: state.folder.name }); });
      return start();
    }

    return {
      start: start, connect: connect, reconnect: reconnect, forget: forget, update: update,
      retry: retry,
      isHelper: function () { return state.mode === "helper"; },
      isSupported: isSupported,
      getData: function () { return state.data; },
      folderName: function () { return state.folder ? state.folder.name : ""; }
    };
  }

  window.TaskListOS = window.TaskListOS || {};
  window.TaskListOS.createStore = createStore;
})();
