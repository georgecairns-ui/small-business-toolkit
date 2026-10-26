/*
  PICTURES AND VIDEOS: adding files to an ad
  ------------------------------------------
  The one way a file gets onto an ad, used by the campaign editor (drop zone and button). Each file is
  checked, saved into the media folder inside this tool's data folder through the helper (with
  progress), and then added to the ad through ctx.update(), so it is saved, logged and shown
  everywhere. The files stay on this computer.

  An ad keeps its files as a list of the names they are saved under (ad.media, for example
  "m-k3j9x2.jpg"). The rules (what is allowed, the address of a file) are in AD.model, the same
  as every toolkit tool that keeps pictures.
*/
(function () {
  "use strict";

  window.AD = window.AD || {};
  const M = window.AD.model;

  const TRIES = 3;          // a stored name is random, so it only clashes by very rare chance

  const uploads = [];       // { adId, name, percent } for the files being saved right now
  const watchers = [];      // called whenever a progress figure changes

  // The rules (what is allowed, the address of a file) are all in AD.model
  function url(file) { return M.mediaUrl(file); }
  function kind(file) { return M.mediaKind(file); }
  function check(file) { return M.checkMediaFile(file); }

  function changed() { watchers.forEach(function (fn) { fn(); }); }
  function watch(fn) { watchers.push(fn); }
  function pending(adId) { return uploads.filter(function (u) { return u.adId === adId; }); }
  // A drag that carries files from the person's computer (not a thumbnail dragged inside the app)
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
    if (status === 0) message = "Couldn’t reach Ads OS to save " + quoted + ". In Claude, say “open my ads”, then try again.";
    else if (status === 413) message = quoted + " is over 200 MB, which is too big to add. Try a shorter or smaller version.";
    else if (status === 415) message = quoted + " isn’t a picture or video this can use.";
    else if (status === 403 || status === 404 || status === 405) message = "This copy of Ads OS can’t keep pictures and videos yet. Ask Claude to update it, then try again.";
    const err = new Error(message);
    err.status = status;
    return err;
  }
  // Sends the file's bytes to the helper. Resolves when it is saved.
  function put(file, stored, onPercent) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url(stored));
      xhr.setRequestHeader("Content-Type", M.mediaMime(stored));
      xhr.upload.onprogress = function (e) { if (e.lengthComputable) onPercent(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = function () { if (xhr.status === 201) resolve(); else reject(failure(xhr.status, file.name)); };
      xhr.onerror = function () { reject(failure(0, file.name)); };
      xhr.send(file);
    });
  }
  // Saves under a fresh name. Resolves to the stored file name (the random id and the ending).
  function save(file, ext, onPercent, tries) {
    const stored = M.makeId("m") + "." + ext;
    return put(file, stored, onPercent).then(function () { return stored; }, function (err) {
      if (err.status === 409 && tries > 1) return save(file, ext, onPercent, tries - 1);
      throw err;
    });
  }

  function findAd(d, buildId, adId) {
    const build = d.builds.find(function (b) { return b.id === buildId; });
    return build ? build.ads.find(function (a) { return a.id === adId; }) : null;
  }
  function wordFor(k, n) { return k === "video" ? (n === 1 ? "video" : "videos") : (n === 1 ? "picture" : "pictures"); }

  // Saves a file and adds it to the ad. Resolves to { file, kind }.
  function addOne(ctx, buildId, adId, title, file, ok) {
    const up = { adId: adId, name: file.name, percent: 0 };
    uploads.push(up);
    changed();
    return save(file, ok.ext, function (percent) { up.percent = percent; changed(); }, TRIES).then(function (stored) {
      return ctx.update(function (d) {
        const ad = findAd(d, buildId, adId);
        if (!ad) throw new Error("That ad is no longer in your campaign.");
        if (!Array.isArray(ad.media)) ad.media = [];
        ad.media.push(stored);
        const build = d.builds.find(function (b) { return b.id === buildId; });
        build.updatedAt = M.nowIso();
      }, "Added the " + (ok.kind === "video" ? "video" : "picture") + " “" + file.name + "” to an ad in “" + title + "”", buildId).then(function () { return { file: stored, kind: ok.kind }; });
    }).finally(function () {
      uploads.splice(uploads.indexOf(up), 1);
      changed();
    });
  }

  // What was done, in one line, with an Undo that takes the files off the ad again
  function tell(ctx, buildId, adId, title, added) {
    if (!added.length) return;
    const photos = added.filter(function (a) { return a.kind !== "video"; }).length, videos = added.length - photos;
    const words = (photos ? photos + " " + wordFor("image", photos) : "") + (photos && videos ? " and " : "") + (videos ? videos + " " + wordFor("video", videos) : "");
    ctx.toast("Added " + words + " to the ad", function () {
      ctx.update(function (d) {
        const ad = findAd(d, buildId, adId);
        if (ad) ad.media = (ad.media || []).filter(function (f) { return added.every(function (a) { return a.file !== f; }); });
      }, "Undid adding " + words + " to an ad in “" + title + "”", buildId).catch(function (err) { if (!err.shownToPerson) ctx.toast(err.message); });
    });
  }

  // Adds files (a list from a drop or from the file picker) to one ad of a campaign, one after another.
  // report(message) is called for each file that can't be added, in plain words.
  function addFiles(ctx, buildId, adId, fileList, report) {
    const build = ctx.data.builds.find(function (b) { return b.id === buildId; });
    if (!build || !findAd(ctx.data, buildId, adId)) { report("That ad is no longer in your campaign."); return Promise.resolve([]); }
    const title = build.name || "Untitled campaign", added = [];
    let chain = Promise.resolve();
    Array.prototype.slice.call(fileList).forEach(function (file) {
      const ok = check(file);
      if (!ok.ok) { report(ok.message); return; }
      chain = chain.then(function () { return addOne(ctx, buildId, adId, title, file, ok); }).then(function (done) { added.push(done); }, function (err) {
        if (!err.shownToPerson) report(err.message);
      });
    });
    return chain.then(function () { tell(ctx, buildId, adId, title, added); return added; });
  }

  window.AD.media = { addFiles: addFiles, hasFiles: hasFiles, guardPage: guardPage, watch: watch, pending: pending, url: url, kind: kind, check: check };
})();
