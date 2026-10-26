/*
  PHOTOS AND VIDEOS: adding files to a post
  -----------------------------------------
  The one way a file gets onto a post, used by the post editor (drop zone and button) and by the
  Calendar (a file dropped on a post). Each file is checked, saved into the media folder inside this
  tool's data folder through the helper (with progress), and then added to the post through
  ctx.update(), so it is saved, logged and shown everywhere. The files stay on this computer.

  The rules (what is allowed, the name a file is saved under, which need a file ticks off) are in
  model.js. This file does the saving and the messages.
*/
(function () {
  "use strict";

  const M = window.CM.model;

  const TRIES = 3;          // a stored name is random, so it only clashes by very rare chance
  const uploads = [];       // { postId, name, percent } for the files being saved right now
  const watchers = [];      // called whenever a progress figure changes

  function changed() { watchers.forEach(function (fn) { fn(); }); }
  function watch(fn) { watchers.push(fn); }
  function pending(postId) { return uploads.filter(function (u) { return u.postId === postId; }); }
  // A drag that carries files from the person's computer (not a post or a thumbnail dragged inside the app)
  function hasFiles(e) { return !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") > -1; }

  // A file dropped anywhere that isn't a drop zone would make the browser leave the app to open it.
  // Anything marked data-media-drop accepts files; everywhere else a drop does nothing.
  function guardPage() {
    document.addEventListener("dragover", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (!e.target.closest("[data-media-drop]")) e.dataTransfer.dropEffect = "none";
    });
    document.addEventListener("drop", function (e) { if (hasFiles(e)) e.preventDefault(); });
  }

  // ---------- Saving one file ----------
  function failure(status, name) {
    const quoted = "“" + name + "”";
    let message = "Couldn’t save " + quoted + " into your folder. Check there’s room on your computer and try again.";
    if (status === 0) message = "Couldn’t reach your content machine to save " + quoted + ". In Claude, say “open my content machine”, then try again.";
    else if (status === 413) message = quoted + " is over 200 MB, which is too big to add. Try a shorter or smaller version.";
    else if (status === 415) message = quoted + " isn’t a picture or video this can use.";
    else if (status === 403 || status === 404 || status === 405) message = "This copy of Content Machine OS can’t keep photos and videos yet. Ask Claude to update it, then try again.";
    const err = new Error(message);
    err.status = status;
    return err;
  }
  // Sends the file's bytes to the helper. Resolves when it is saved.
  function put(file, stored, onPercent) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", M.mediaUrl(stored));
      xhr.setRequestHeader("Content-Type", M.mediaMime(stored));
      xhr.upload.onprogress = function (e) { if (e.lengthComputable) onPercent(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = function () { if (xhr.status === 201) resolve(); else reject(failure(xhr.status, file.name)); };
      xhr.onerror = function () { reject(failure(0, file.name)); };
      xhr.send(file);
    });
  }
  // Saves under a fresh name. Resolves to the id the file was saved under (the name without its ending).
  function save(file, ext, onPercent, tries) {
    const id = M.makeId("m");
    return put(file, id + "." + ext, onPercent).then(function () { return id; }, function (err) {
      if (err.status === 409 && tries > 1) return save(file, ext, onPercent, tries - 1);
      throw err;
    });
  }

  // Saves a file and adds it to the post. Resolves to { item, ticked }, where ticked is the need it ticked off, or null.
  function addOne(ctx, postId, title, file, check) {
    const up = { postId: postId, name: file.name, percent: 0 };
    uploads.push(up);
    changed();
    return save(file, check.ext, function (percent) { up.percent = percent; changed(); }, TRIES).then(function (id) {
      const item = M.mediaItem(id, check.ext, file.name, file.size, M.nowIso());
      let ticked = null;
      return ctx.update(function (d) {
        const post = d.posts.find(function (p) { return p.id === postId; });
        if (!post) throw new Error("That post is no longer in your calendar.");
        ticked = M.attachMedia(post, item, item.addedAt);
      }, "Added the " + (check.kind === "image" ? "photo" : "video") + " “" + file.name + "” to “" + title + "”", postId).then(function () { return { item: item, ticked: ticked }; });
    }).finally(function () {
      uploads.splice(uploads.indexOf(up), 1);
      changed();
    });
  }

  // What was done, in one line, with an Undo that takes the files off again
  function tell(ctx, postId, title, added) {
    if (!added.length) return;
    const ticked = added.map(function (a) { return a.ticked; }).filter(Boolean);
    const words = M.mediaWords({ media: added.map(function (a) { return a.item; }) });
    const text = "Added " + words + " to “" + title + "”" + (ticked.length ? ". Ticked off: " + ticked[0].text + (ticked.length > 1 ? " and " + (ticked.length - 1) + " more" : "") : "");
    ctx.toast(text, function () {
      ctx.update(function (d) {
        const post = d.posts.find(function (p) { return p.id === postId; });
        if (post) M.undoAttach(post, added.map(function (a) { return a.item.id; }), ticked.map(function (n) { return n.id; }));
      }, "Undid adding " + words + " to “" + title + "”", postId).catch(function (err) { if (!err.shownToPerson) ctx.toast(err.message); });
    });
  }

  // Adds files (a list from a drop or from the file picker) to a post, one after another.
  // report(message) is called for each file that can't be added, in plain words.
  function addFiles(ctx, postId, fileList, report) {
    const post = ctx.data.posts.find(function (p) { return p.id === postId; });
    if (!post) { report("That post is no longer in your calendar."); return Promise.resolve([]); }
    const title = M.titleOf(post), added = [];
    let chain = Promise.resolve();
    Array.prototype.slice.call(fileList).forEach(function (file) {
      const check = M.checkMediaFile(file);
      if (!check.ok) { report(check.message); return; }
      chain = chain.then(function () { return addOne(ctx, postId, title, file, check); }).then(function (done) { added.push(done); }, function (err) {
        if (!err.shownToPerson) report(err.message);
      });
    });
    return chain.then(function () { tell(ctx, postId, title, added); return added; });
  }

  window.CM.media = { addFiles: addFiles, hasFiles: hasFiles, guardPage: guardPage, watch: watch, pending: pending };
})();
