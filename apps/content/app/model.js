/*
  MODEL: the rules of Content Machine OS, as plain functions
  ----------------------------------------------------------
  No screen code in here. The pages, the post editor and the Home boxes all ask these functions,
  so every number and every status means the same thing everywhere. It also runs under Node,
  which is how maintainers/test-model.js checks it.

  The data file is apps/content/data/content.json. Dates are "YYYY-MM-DD" text; timestamps (postedAt,
  createdAt) are UTC text, turned into the person's own day by localDay. Nothing here changes the
  file by itself; the functions that edit (newPost, planIdea, markPosted, answerNeed, logActivity and
  so on) are used inside store.update() by the app.
*/
(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const DAY_MS = 86400000;

  // One list for the whole tool. The order is the display order. To rename a platform or change
  // a limit, change it here (docs/CUSTOMISING.md says how).
  const PLATFORMS = [
    { key: "instagram", label: "Instagram", short: "IG", limit: 2200, openUrl: "https://www.instagram.com/", formats: ["photo", "carousel", "reel", "story"] },
    { key: "tiktok", label: "TikTok", short: "TT", limit: 4000, openUrl: "https://www.tiktok.com/upload", formats: ["video"] },
    { key: "linkedin", label: "LinkedIn", short: "in", limit: 3000, openUrl: "https://www.linkedin.com/feed/?shareActive=true", formats: ["text", "photo", "carousel", "video"] },
    { key: "facebook", label: "Facebook", short: "FB", limit: 63206, openUrl: "https://www.facebook.com/", formats: ["text", "photo", "video", "reel"] },
    { key: "youtube", label: "YouTube Shorts", short: "YT", limit: 100, openUrl: "https://studio.youtube.com/", formats: ["video"] },
    { key: "google", label: "Google Business Profile", short: "GB", limit: 1500, openUrl: "https://business.google.com/", formats: ["update", "offer", "event"] },
    { key: "x", label: "X", short: "X", limit: 280, openUrl: "https://x.com/compose/post", formats: ["text", "photo"] },
    { key: "email", label: "Email newsletter", short: "EM", limit: null, openUrl: null, formats: ["email"] }
  ];

  const STATUS_LABELS = { idea: "Idea", drafted: "Drafted", "needs-you": "Needs you", approved: "Approved", posted: "Posted", skipped: "Skipped" };

  // Icon names come from shared/js/ui.js, which has no camera or film icon, so the closest ones are used.
  const NEED_TYPES = [
    { key: "photo", label: "Photo", icon: "layout" },
    { key: "video", label: "Video", icon: "columns" },
    { key: "case-study", label: "Case study", icon: "fileText" },
    { key: "quote", label: "Quote", icon: "pencil" },
    { key: "info", label: "Information", icon: "info" },
    { key: "other", label: "Other", icon: "flag" }
  ];

  const FACTORS = ["fit", "demand", "hook", "proof", "timing"];

  // ---------- Dates (worked in UTC so clock changes never move a day) ----------
  function parseIso(iso) {
    const p = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function toIso(d) { return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { return toIso(new Date(parseIso(iso).getTime() + n * DAY_MS)); }
  // A real calendar day written as YYYY-MM-DD (not "2026-02-31", not a timestamp), else null
  function validIso(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return toIso(parseIso(value)) === value ? value : null;
  }
  // A timestamp such as postedAt (UTC) as the person's own day, YYYY-MM-DD. Just after midnight in
  // summer is still the next day for them, so the date is never cut from the UTC text.
  function localDay(timestamp) {
    const d = new Date(timestamp);
    if (!timestamp || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayLabel(iso) {
    return parseIso(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }
  function dayOfWeek(iso) { return parseIso(iso).getUTCDay(); }
  function startOfWeek(iso, weekStarts) { return addDays(iso, -((dayOfWeek(iso) - weekStarts + 7) % 7)); }
  function daysBetween(fromIso, toIsoDate) { return Math.round((parseIso(toIsoDate) - parseIso(fromIso)) / DAY_MS); }

  function makeId(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8).padEnd(6, "0"); }
  function nowIso() { return new Date().toISOString(); }

  // ---------- Platforms ----------
  function titleOf(post) { return post.title || "Untitled post"; }
  function platform(key) {
    return PLATFORMS.find(function (p) { return p.key === key; }) || null;
  }
  function onPlatforms(data) {
    const on = data.platforms || {};
    return PLATFORMS.filter(function (p) { return on[p.key] && on[p.key].on === true; }).map(function (p) { return p.key; });
  }
  function isSetUp(data) {
    const name = data.settings && data.settings.businessName;
    return !!(name && String(name).trim()) || (data.posts || []).length > 0;
  }
  // The platforms a post is switched on for, in display order
  function onKeys(post) {
    return PLATFORMS.filter(function (p) { return post.platforms && post.platforms[p.key] && post.platforms[p.key].on === true; }).map(function (p) { return p.key; });
  }
  // Only Monday (1) and Sunday (0) are supported; anything else counts as Monday
  function weekStartsOf(data) {
    return Number(data.settings && data.settings.weekStarts) === 0 ? 0 : 1;
  }
  function weeklyTarget(data) {
    return onPlatforms(data).reduce(function (sum, key) { return sum + (Number(data.platforms[key].perWeek) || 0); }, 0);
  }

  // ---------- The score ----------
  function score(entry) {
    if (!entry || !entry.factors) return null;
    let sum = 0;
    for (let i = 0; i < FACTORS.length; i++) {
      const v = entry.factors[FACTORS[i]];
      if (typeof v !== "number" || !isFinite(v)) return null;
      sum += v;
    }
    return sum;
  }
  function postPlatformKeys(post) {
    return PLATFORMS.filter(function (p) { return post.platforms && post.platforms[p.key]; }).map(function (p) { return p.key; });
  }
  function bestPlatform(post) {
    let best = null;
    postPlatformKeys(post).forEach(function (key) {
      const entry = post.platforms[key];
      const s = entry.on === true ? score(entry) : null;
      if (s !== null && (best === null || s > best.score)) best = { key: key, score: s };
    });
    return best;
  }
  function recommended(post) {
    return postPlatformKeys(post).filter(function (key) {
      const s = score(post.platforms[key]);
      return s !== null && s >= 7;
    });
  }

  // ---------- Status ----------
  function openNeeds(post) {
    return (post.needs || []).filter(function (n) { return !n.done; });
  }
  function postStatus(post) {
    if (post.status === "skipped") return "skipped";
    if (post.status === "posted") return "posted";
    if (openNeeds(post).length) return "needs-you";
    return STATUS_LABELS[post.status] ? post.status : "idea";
  }

  // ---------- Days, weeks and months ----------
  function postsForDay(data, iso, filterKeys) {
    const keys = Array.isArray(filterKeys) ? filterKeys : [];
    return (data.posts || []).filter(function (p) {
      if (p.date !== iso || p.status === "skipped") return false;
      return !keys.length || keys.some(function (k) { return p.platforms && p.platforms[k] && p.platforms[k].on === true; });
    }).sort(function (a, b) { return String(a.time || "").localeCompare(String(b.time || "")); });
  }
  function weekDays(anchorIso, weekStarts) {
    const first = startOfWeek(anchorIso, weekStarts);
    return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(first, i); });
  }
  function monthGrid(anchorIso, weekStarts) {
    const month = anchorIso.slice(0, 7);
    const first = month + "-01";
    const last = toIso(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)));
    const weeks = [];
    let start = startOfWeek(first, weekStarts);
    // At least 5 weeks, so the grid doesn't jump in height from month to month
    while (weeks.length < 5 || start <= last) {
      weeks.push(weekDays(start, weekStarts).map(function (iso) { return { iso: iso, inMonth: iso.slice(0, 7) === month }; }));
      start = addDays(start, 7);
    }
    return weeks;
  }

  // ---------- Words ----------
  // YouTube's limit is for the title, which is the first line
  function charCount(key, text) {
    const p = platform(key);
    const value = String(text == null ? "" : text);
    const counted = key === "youtube" ? value.split("\n")[0] : value;
    const count = Array.from(counted).length;
    const limit = p ? p.limit : null;
    return { count: count, limit: limit, over: limit !== null && count > limit };
  }

  // Where each platform cuts a post and shows "see more". Other platforms show the whole post.
  const SEE_MORE_AT = { instagram: 125, facebook: 125, linkedin: 210 };
  // The words as the feed first shows them: cut near the limit at a word end
  function preview(key, text) {
    const chars = Array.from(String(text == null ? "" : text).trim()), limit = SEE_MORE_AT[key];
    if (!limit || chars.length <= limit) return { shown: chars.join(""), cut: false };
    const head = chars.slice(0, limit).join(""), space = head.lastIndexOf(" ");
    return { shown: (space > limit - 20 ? head.slice(0, space) : head).trimEnd(), cut: true };
  }

  // ---------- Making posts ----------
  function newPost(data, fields) {
    const s = data.settings || {};
    const at = nowIso();
    return Object.assign({
      id: makeId("p"), ideaId: null, title: "", theme: "", date: null,
      time: s.defaultTime || "09:00", approval: s.defaultApproval === "auto" ? "auto" : "ask",
      status: "idea", platforms: {}, shot: "", needs: [], media: [], request: null,
      createdAt: at, updatedAt: at, approvedAt: null
    }, fields || {});
  }
  function blankPlatform(key) {
    return { on: true, format: platform(key).formats[0], text: "", factors: null, reason: "", postedAt: null, link: "" };
  }
  // The platforms Claude recommends and the person has switched on; if none, every platform that is on
  function ideaPlatforms(data) {
    const on = onPlatforms(data);
    const picked = on.filter(function (k) { return data.platforms[k].recommended === true; });
    const keys = picked.length ? picked : on;
    const out = {};
    keys.forEach(function (k) { out[k] = blankPlatform(k); });
    return out;
  }
  function postFromIdea(data, idea, dateIso) {
    return newPost(data, {
      ideaId: idea.id, title: idea.title || "", theme: idea.theme || "",
      date: dateIso || null, platforms: ideaPlatforms(data)
    });
  }
  // Plans an idea on a day: the one rule behind Calendar and Ideas. newId is made by the caller so the
  // screen knows which post to open once the save is done. Returns the post.
  function planIdea(data, ideaId, dateIso, newId) {
    const idea = data.ideas.find(function (i) { return i.id === ideaId; });
    if (!idea) throw new Error("That idea is no longer in your list.");
    if (!validIso(dateIso)) throw new Error("Pick a real day to plan the idea on.");
    const post = postFromIdea(data, idea, dateIso);
    post.id = newId;
    data.posts.push(post);
    idea.status = "planned";
    idea.postId = newId;
    return post;
  }
  // The undo of planIdea: the post goes and the idea is waiting again
  function unplanIdea(data, ideaId, postId) {
    const idea = data.ideas.find(function (i) { return i.id === ideaId; });
    if (!idea) throw new Error("That idea is no longer in your list.");
    data.posts = data.posts.filter(function (p) { return p.id !== postId; });
    idea.status = "new";
    idea.postId = null;
  }
  // An idea already made from this research search (by id, or by title for the ones Claude made itself)
  function hasResearchIdea(data, search) {
    return data.ideas.some(function (i) {
      return i.status !== "dropped" && ((!!search.id && i.researchId === search.id) || (i.source === "research" && i.title === search.phrase));
    });
  }

  // ---------- Changes to a post (called inside an update) ----------
  // The owner posted it by hand on one platform. When every platform that is on is posted, the post is posted.
  function markPosted(post, key, link, nowStamp) {
    const entry = post.platforms[key];
    if (!entry) throw new Error("This post has no version for " + key + " to mark as posted.");
    entry.postedAt = nowStamp;
    entry.link = String(link || "").trim();
    post.updatedAt = nowStamp;
    const keys = onKeys(post);
    if (keys.length && keys.every(function (k) { return post.platforms[k].postedAt; })) post.status = "posted";
  }
  // statusBefore is what the post was before it was marked, when known
  function unmarkPosted(post, key, statusBefore, nowStamp) {
    const entry = post.platforms[key];
    if (!entry) throw new Error("This post has no version for " + key + ".");
    entry.postedAt = null;
    post.updatedAt = nowStamp;
    if (post.status === "posted") post.status = statusBefore && statusBefore !== "posted" ? statusBefore : (post.approvedAt ? "approved" : "drafted");
  }
  // The owner answered something Claude needs. Claude is asked to write it up: a case study needs its own write-up.
  function answerNeed(post, needId, answer, nowStamp) {
    const need = (post.needs || []).find(function (n) { return n.id === needId; });
    if (!need) throw new Error("That question is no longer on this post.");
    need.answer = answer;
    need.done = true;
    post.request = { kind: need.type === "case-study" ? "case-study" : "write", note: "", at: nowStamp };
    post.updatedAt = nowStamp;
  }

  // ---------- Photos and videos ----------
  // post.media is a list of { id, file, name, type, size, addedAt }. `file` is the name it is stored under in
  // apps/content/data/media (the helper, apps/server, only accepts the names this makes), `name` is what the
  // file was called on the person's computer. The order is the order shown; the first image is the cover.
  const MEDIA_KINDS = { jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", mp4: "video", mov: "video", webm: "video" };
  const MEDIA_MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
  const MEDIA_EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
  const MEDIA_NAME_RE = /^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/;
  const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
  const MEDIA_NEED = { image: "photo", video: "video" };   // the kind of need a file of each kind answers

  // Every place that shows a photo or video builds its address with this, so the folder is named once
  function mediaUrl(file) { return "/api/media/content/" + encodeURIComponent(file); }
  function extOf(name) { const m = /\.([A-Za-z0-9]+)$/.exec(String(name || "")); return m ? m[1].toLowerCase() : ""; }
  function mediaKind(file) { return MEDIA_KINDS[extOf(file)] || null; }
  function mediaMime(file) { return MEDIA_MIME[extOf(file)] || null; }

  // Whether a file from the person's computer can be added, in plain words if not. file is { name, type, size }.
  // Returns { ok: true, ext, kind } or { ok: false, message }.
  function checkMediaFile(file) {
    const name = file.name || "That file", ext = extOf(name);
    const known = MEDIA_KINDS[ext] ? (ext === "jpeg" ? "jpg" : ext) : MEDIA_EXT_BY_MIME[String(file.type || "").toLowerCase()];
    if (ext === "heic" || ext === "heif") return { ok: false, message: "“" + name + "” is a HEIC photo, which browsers can’t show. Save or export it as a JPG and add that instead." };
    if (!known) return { ok: false, message: "“" + name + "” isn’t a picture or video this can use. Photos can be JPG, PNG, WebP or GIF. Videos can be MP4, MOV or WebM." };
    if (!(file.size > 0)) return { ok: false, message: "“" + name + "” is empty." };
    if (file.size > MAX_MEDIA_BYTES) return { ok: false, message: "“" + name + "” is over 200 MB, which is too big to add. Try a shorter or smaller version." };
    return { ok: true, ext: known, kind: MEDIA_KINDS[known] };
  }
  // The new record for a file saved as <id>.<ext> (id from makeId("m"))
  function mediaItem(id, ext, original, size, nowStamp) {
    return { id: id, file: id + "." + ext, name: String(original || id + "." + ext).slice(0, 120), type: MEDIA_KINDS[ext], size: size, addedAt: nowStamp };
  }
  function mediaList(post) { return Array.isArray(post.media) ? post.media : []; }
  // The first image, else the first video, else null
  function cover(post) {
    const list = mediaList(post);
    return list.find(function (m) { return m.type === "image"; }) || list.find(function (m) { return m.type === "video"; }) || null;
  }
  function mediaCounts(post) {
    const list = mediaList(post), photos = list.filter(function (m) { return m.type === "image"; }).length;
    return { photos: photos, videos: list.length - photos };
  }
  // "2 photos and 1 video", for the words that go with a change
  function mediaWords(post, ids) {
    const items = mediaList(post).filter(function (m) { return !ids || ids.indexOf(m.id) > -1; });
    const photos = items.filter(function (m) { return m.type === "image"; }).length, videos = items.length - photos;
    return [photos ? counted(photos, "photo", "photos") : "", videos ? counted(videos, "video", "videos") : ""].filter(Boolean).join(" and ");
  }
  // Open photo or video needs that a file already on the post could answer
  function tickable(post) {
    const kinds = mediaList(post).map(function (m) { return MEDIA_NEED[m.type]; });
    return openNeeds(post).filter(function (n) { return kinds.indexOf(n.type) > -1; });
  }
  // Adds a file to the post. If exactly one open need of the matching kind (photo or video) is waiting,
  // it is ticked off and returned, so the screen can say so and offer Undo. Otherwise null.
  function attachMedia(post, item, nowStamp) {
    if (!Array.isArray(post.media)) post.media = [];
    const open = openNeeds(post).filter(function (n) { return n.type === MEDIA_NEED[item.type]; });
    post.media.push(item);
    post.updatedAt = nowStamp;
    if (open.length !== 1) return null;
    open[0].done = true;
    return open[0];
  }
  // The undo of attachMedia: the files come off the post and any need that was ticked off is open again
  function undoAttach(post, mediaIds, needIds) {
    post.media = mediaList(post).filter(function (m) { return mediaIds.indexOf(m.id) === -1; });
    (post.needs || []).forEach(function (n) { if (needIds.indexOf(n.id) > -1) n.done = false; });
  }
  // Takes a file off the post (the file itself stays in the folder). Returns where it was, for the undo.
  function detachMedia(post, id) {
    const at = mediaList(post).findIndex(function (m) { return m.id === id; });
    if (at === -1) throw new Error("That file is no longer on this post.");
    return { item: post.media.splice(at, 1)[0], at: at };
  }
  function restoreMedia(post, item, at) {
    if (mediaList(post).some(function (m) { return m.id === item.id; })) return;
    if (!Array.isArray(post.media)) post.media = [];
    post.media.splice(Math.min(at, post.media.length), 0, item);
  }
  // Makes a photo the first one, so it is the cover
  function makeCover(post, id) {
    const at = mediaList(post).findIndex(function (m) { return m.id === id; });
    if (at === -1) throw new Error("That file is no longer on this post.");
    post.media.unshift(post.media.splice(at, 1)[0]);
  }
  // Moves a file to sit just before another one (or to the end when beforeId is null)
  function moveMedia(post, id, beforeId) {
    const list = mediaList(post), from = list.findIndex(function (m) { return m.id === id; });
    if (from === -1 || id === beforeId) return;
    const item = list.splice(from, 1)[0], to = beforeId ? list.findIndex(function (m) { return m.id === beforeId; }) : -1;
    list.splice(to === -1 ? list.length : to, 0, item);
  }

  // ---------- To do ----------
  function bucketFor(due, todayIso) {
    if (due < todayIso) return "overdue";
    if (due === todayIso) return "today";
    return daysBetween(todayIso, due) <= 7 ? "week" : "later";
  }
  // A need is due on its own date, else the day before its post, else today
  function needDue(post, need, todayIso) {
    return need.due || (post.date ? addDays(post.date, -1) : todayIso);
  }
  function todo(data, todayIso) {
    const out = { overdue: [], today: [], week: [], later: [] };
    const live = (data.posts || []).filter(function (p) { return p.status !== "skipped"; });
    function add(item) { out[bucketFor(item.due, todayIso)].push(item); }
    live.forEach(function (post) {
      openNeeds(post).forEach(function (need) {
        add({ kind: "need", post: post, need: need, due: needDue(post, need, todayIso) });
      });
      // A post with no day yet isn't due, so it isn't asked for approval yet
      if (post.status === "drafted" && post.date) add({ kind: "approve", post: post, due: post.date });
      if (post.status === "approved" && post.date && post.date <= todayIso) {
        postPlatformKeys(post).forEach(function (key) {
          const entry = post.platforms[key];
          if (entry.on === true && !entry.postedAt) add({ kind: "post", post: post, platform: key, due: post.date });
        });
      }
    });
    Object.keys(out).forEach(function (k) {
      out[k].sort(function (a, b) { return a.due.localeCompare(b.due) || String(a.post.time || "").localeCompare(String(b.post.time || "")); });
    });
    return out;
  }

  // How many things are waiting across all of the To do groups
  function todoTotal(t) {
    return Object.keys(t).reduce(function (n, k) { return n + t[k].length; }, 0);
  }
  // How many posts sit on the given days (used for "posts this week")
  function postsOnDays(data, days) {
    return days.reduce(function (n, iso) { return n + postsForDay(data, iso).length; }, 0);
  }
  // The average percent saved across files that are still uploading, as a whole number
  function averagePercent(uploads) {
    return uploads.length ? Math.round(uploads.reduce(function (a, u) { return a + u.percent; }, 0) / uploads.length) : 0;
  }

  // ---------- What was posted, and the numbers behind the stats strip and the Health check ----------
  function postedDates(data) {
    const out = [];
    (data.posts || []).forEach(function (post) {
      postPlatformKeys(post).forEach(function (key) {
        const day = localDay(post.platforms[key].postedAt);
        if (day) out.push({ key: key, date: day, entry: post.platforms[key] });
      });
    });
    return out;
  }
  // How many posts were posted this month on each platform, as { instagram: 2 }
  function postedCounts(data, todayIso) {
    const month = todayIso.slice(0, 7), out = {};
    postedDates(data).forEach(function (x) { if (x.date.slice(0, 7) === month) out[x.key] = (out[x.key] || 0) + 1; });
    return out;
  }
  // Posts put out in each of the last `weeks` weeks, oldest first. The last one is this week so far.
  function weeklyPosted(data, todayIso, weeks) {
    const posted = postedDates(data), thisWeek = startOfWeek(todayIso, weekStartsOf(data)), out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i), end = addDays(start, 6);
      out.push({ start: start, posted: posted.filter(function (p) { return p.date >= start && p.date <= end; }).length });
    }
    return out;
  }

  function round1(n) { return Math.round(n * 10) / 10; }
  function average(list) { return list.length ? round1(list.reduce(function (a, b) { return a + b; }, 0) / list.length) : null; }
  function plain(n) { return String(round1(n)); }
  function counted(n, one, many) { return plain(n) + " " + (n === 1 ? one : many); }
  function livePosts(data) { return (data.posts || []).filter(function (p) { return p.status !== "skipped"; }); }

  // The posts on the calendar in the next 2 weeks, today included
  const LOOK_AHEAD_DAYS = 14;
  function comingUp(data, todayIso) {
    const last = addDays(todayIso, LOOK_AHEAD_DAYS - 1);
    return livePosts(data).filter(function (p) { return p.date && p.date >= todayIso && p.date <= last; });
  }
  // How many weeks ahead the calendar is filled: from today to the last planned post
  function weeksAhead(data, todayIso) {
    const dates = livePosts(data).filter(function (p) { return p.date && p.date >= todayIso; }).map(function (p) { return p.date; }).sort();
    return dates.length ? round1((daysBetween(todayIso, dates[dates.length - 1]) + 1) / 7) : 0;
  }
  // Average of every score Claude gave a platform the post goes to; null when nothing is scored
  function averageScore(posts) {
    const scores = [];
    posts.forEach(function (p) { onKeys(p).forEach(function (k) { const s = score(p.platforms[k]); if (s !== null) scores.push(s); }); });
    return average(scores);
  }
  // What the owner still has to do for Claude: needs and drafts, with overdue ones counted twice
  function waitingOnYou(data, todayIso) {
    const t = todo(data, todayIso);
    const open = function (list) { return list.filter(function (it) { return it.kind !== "post"; }).length; };
    const all = open(t.overdue) + open(t.today) + open(t.week) + open(t.later);
    return { count: all, weighted: all + open(t.overdue) };
  }

  // The 4 numbers in the strip under the rail. Posted is for this month against the target so far
  // (a week's target for every 7 days gone, rounded once).
  function stats(data, todayIso) {
    const dayOfMonth = Number(todayIso.slice(8, 10));
    return {
      posted: Object.values(postedCounts(data, todayIso)).reduce(function (a, b) { return a + b; }, 0),
      target: Math.round(weeklyTarget(data) * dayOfMonth / 7),
      plannedWeeks: weeksAhead(data, todayIso),
      waiting: waitingOnYou(data, todayIso).count,
      averageScore: averageScore(comingUp(data, todayIso))
    };
  }

  // ---------- Health check ----------
  const HEALTH_LABELS = { ok: "Healthy", warn: "Watch", bad: "Needs action" };
  const RHYTHM_WEEKS = 4;          // whole weeks looked at for the posting rhythm
  const WAITING_OK = 3, WAITING_WATCH = 6;
  const SCORE_OK = 7, SCORE_WATCH = 5;
  const MIX_MIN_POSTS = 4, MIX_OK = 50, MIX_WATCH = 70;   // theme share, in per cent

  function grade(ratio, okAt, watchAt) { return ratio >= okAt ? "ok" : ratio >= watchAt ? "warn" : "bad"; }
  function makeCheck(key, label, hint, state, value, target, valueText, targetText) {
    return { key: key, label: label, hint: hint, state: state, value: value, target: target, valueText: valueText, targetText: targetText };
  }

  // Posts a week over the last 4 whole weeks, leaving out weeks before the first post so a new start isn't marked down
  function rhythmCheck(data, todayIso) {
    const target = weeklyTarget(data), posted = postedDates(data);
    const first = posted.reduce(function (min, p) { return !min || p.date < min ? p.date : min; }, null);
    const firstWeek = first ? startOfWeek(first, weekStartsOf(data)) : null;
    const weeks = weeklyPosted(data, todayIso, RHYTHM_WEEKS + 1).slice(0, RHYTHM_WEEKS).filter(function (w) { return firstWeek && w.start >= firstWeek; });
    const value = weeks.length ? average(weeks.map(function (w) { return w.posted; })) : null;
    const state = !target || value === null ? "warn" : grade(value / target, 0.9, 0.5);
    return makeCheck("rhythm", "Posting rhythm", "Posts a week over the last 4 whole weeks.", state, value, target,
      value === null ? "Not enough weeks yet" : plain(value) + " a week", target ? plain(target) + " a week" : "Switch on a platform to set one");
  }
  function aheadCheck(data, todayIso) {
    const target = Number(data.settings.planWeeks) || 2, value = weeksAhead(data, todayIso);
    return makeCheck("ahead", "Planned ahead", "How far ahead your calendar is filled.", grade(value / target, 1, 0.5), value, target,
      counted(value, "week", "weeks"), counted(target, "week", "weeks"));
  }
  function waitingCheck(data, todayIso) {
    const w = waitingOnYou(data, todayIso);
    return makeCheck("waiting", "Waiting on you", "Things Claude needs and posts to approve. Overdue ones count double.",
      w.weighted <= WAITING_OK ? "ok" : w.weighted <= WAITING_WATCH ? "warn" : "bad", w.weighted, WAITING_OK,
      counted(w.count, "thing", "things"), WAITING_OK + " or fewer");
  }
  function scoreCheck(data, todayIso) {
    const value = averageScore(comingUp(data, todayIso));
    return makeCheck("score", "Average score", "Average score of the posts in the next 2 weeks.",
      value === null ? "warn" : value >= SCORE_OK ? "ok" : value >= SCORE_WATCH ? "warn" : "bad", value, SCORE_OK,
      value === null ? "Nothing scored yet" : plain(value) + "/10", SCORE_OK + "/10 or more");
  }
  function spreadCheck(data, todayIso) {
    const on = onPlatforms(data), posts = comingUp(data, todayIso);
    const covered = on.filter(function (k) { return posts.some(function (p) { return p.platforms[k] && p.platforms[k].on === true; }); }).length;
    return makeCheck("spread", "Platform spread", "Every platform you post to has a post in the next 2 weeks.",
      !on.length ? "warn" : grade(covered / on.length, 1, 0.5), covered, on.length,
      on.length ? covered + " of " + counted(on.length, "platform", "platforms") : "No platforms on", on.length ? "All of them" : "Switch on a platform");
  }
  function mixCheck(data, todayIso) {
    const posts = comingUp(data, todayIso), themes = {};
    posts.forEach(function (p) { if (p.theme) themes[p.theme] = (themes[p.theme] || 0) + 1; });
    const top = Math.max.apply(null, Object.values(themes).concat([0]));
    const enough = posts.length >= MIX_MIN_POSTS, value = enough ? Math.round(top / posts.length * 100) : null;
    return makeCheck("mix", "Theme mix", "No single theme takes more than half of the next 2 weeks.",
      value === null ? "warn" : value <= MIX_OK ? "ok" : value <= MIX_WATCH ? "warn" : "bad", value, MIX_OK,
      value === null ? "Not enough posts yet" : value + "% on one theme", MIX_OK + "% or less");
  }
  function health(data, todayIso) {
    return [rhythmCheck, aheadCheck, waitingCheck, scoreCheck, spreadCheck, mixCheck].map(function (f) { return f(data, todayIso); });
  }
  // The worst state among the checks
  function healthOverall(checks) {
    return checks.some(function (c) { return c.state === "bad"; }) ? "bad" : checks.some(function (c) { return c.state === "warn"; }) ? "warn" : "ok";
  }

  // ---------- Activity ----------
  function logActivity(data, what, postId) {
    if (!Array.isArray(data.activity)) data.activity = [];
    data.activity.unshift({ at: nowIso(), what: what, postId: postId || null });
    if (data.activity.length > 200) data.activity.length = 200;
  }

  // ---------- Reading the file ----------
  // Throws a plain message if the parts the app depends on are the wrong kind of thing
  function validate(d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error("The content file is empty or isn't set out the way the app expects.");
    if (d.posts !== undefined && !Array.isArray(d.posts)) throw new Error("The content file has a small mistake: posts should be a list.");
    if (d.ideas !== undefined && !Array.isArray(d.ideas)) throw new Error("The content file has a small mistake: ideas should be a list.");
    if (d.platforms !== undefined && (!d.platforms || typeof d.platforms !== "object" || Array.isArray(d.platforms))) throw new Error("The content file has a small mistake: platforms should be a group of settings, one per platform.");
  }
  const DEMAND_LEVELS = ["high", "medium", "low"];
  function knownKeys(list) { return Array.isArray(list) ? list.filter(function (k) { return !!platform(k); }) : []; }
  function eachObject(list, fn) { list.forEach(function (x) { if (x && typeof x === "object") fn(x); }); }

  // Fills in anything missing and fixes values Claude may have written badly, so a half-written file never
  // trips a screen: a bad date becomes null, an odd demand becomes "medium", an unknown platform is dropped.
  // It tidies what is in memory only.
  function normalise(d) {
    d.version = 1;
    d.settings = Object.assign({ businessName: "", ownerName: "", themes: [], postsPerWeek: 3, defaultApproval: "ask", defaultTime: "09:00", weekStarts: 1, planWeeks: 2 }, d.settings || {});
    d.settings.about = Object.assign({ sells: "", problems: [], different: "", who: "", where: "" }, d.settings.about || {});
    if (!Array.isArray(d.settings.themes)) d.settings.themes = [];
    d.settings.weekStarts = weekStartsOf(d);
    d.platforms = d.platforms || {};
    d.research = Object.assign({ updatedAt: null, skill: "", searches: [], trends: [], competitors: [], whatWorks: {} }, d.research || {});
    ["ideas", "posts", "activity"].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    normaliseResearch(d.research);
    eachObject(d.posts, normalisePost);
    return d;
  }
  function normaliseResearch(r) {
    ["searches", "trends", "competitors"].forEach(function (k) { if (!Array.isArray(r[k])) r[k] = []; });
    if (!r.whatWorks || typeof r.whatWorks !== "object" || Array.isArray(r.whatWorks)) r.whatWorks = {};
    eachObject(r.searches, function (s) { if (DEMAND_LEVELS.indexOf(s.demand) === -1) s.demand = "medium"; });
    eachObject(r.trends, function (t) { t.until = validIso(t.until); t.platforms = knownKeys(t.platforms); });
    eachObject(r.competitors, function (c) {
      c.platforms = knownKeys(c.platforms);
      c.examples = Array.isArray(c.examples) ? c.examples.filter(function (x) { return x && platform(x.platform); }) : [];
    });
  }
  // media missing becomes []; an item without a usable stored file name is dropped; the rest is filled in
  function normaliseMedia(p) {
    p.media = (Array.isArray(p.media) ? p.media : []).filter(function (m) {
      return m && typeof m === "object" && typeof m.file === "string" && MEDIA_NAME_RE.test(m.file);
    }).map(function (m) {
      return {
        id: typeof m.id === "string" && m.id ? m.id : m.file.replace(/\.[^.]+$/, ""),
        file: m.file, name: typeof m.name === "string" && m.name ? m.name : m.file, type: mediaKind(m.file),
        size: typeof m.size === "number" && isFinite(m.size) && m.size >= 0 ? m.size : 0,
        addedAt: typeof m.addedAt === "string" ? m.addedAt : ""
      };
    });
  }
  function normalisePost(p) {
    p.date = validIso(p.date);
    if (!p.platforms || typeof p.platforms !== "object") p.platforms = {};
    if (!Array.isArray(p.needs)) p.needs = [];
    eachObject(p.needs, function (n) { n.due = validIso(n.due); });
    normaliseMedia(p);
    Object.keys(p.platforms).forEach(function (k) {
      const entry = p.platforms[k];
      if (entry && typeof entry === "object" && entry.postedAt && !localDay(entry.postedAt)) entry.postedAt = null;
    });
  }

  const model = {
    PLATFORMS: PLATFORMS, STATUS_LABELS: STATUS_LABELS, NEED_TYPES: NEED_TYPES, FACTORS: FACTORS,
    platform: platform, onPlatforms: onPlatforms, onKeys: onKeys, isSetUp: isSetUp, score: score, bestPlatform: bestPlatform,
    recommended: recommended, openNeeds: openNeeds, postStatus: postStatus, postsForDay: postsForDay,
    weekDays: weekDays, monthGrid: monthGrid, weekStartsOf: weekStartsOf, charCount: charCount, weeklyTarget: weeklyTarget,
    newPost: newPost, postFromIdea: postFromIdea, planIdea: planIdea, unplanIdea: unplanIdea, hasResearchIdea: hasResearchIdea,
    blankPlatform: blankPlatform, markPosted: markPosted, unmarkPosted: unmarkPosted, answerNeed: answerNeed,
    needDue: needDue, todo: todo, todoTotal: todoTotal, postsOnDays: postsOnDays, averagePercent: averagePercent, postedCounts: postedCounts, weeklyPosted: weeklyPosted, stats: stats, health: health,
    healthOverall: healthOverall, HEALTH_LABELS: HEALTH_LABELS, preview: preview,
    mediaUrl: mediaUrl, mediaKind: mediaKind, mediaMime: mediaMime, checkMediaFile: checkMediaFile, mediaItem: mediaItem, cover: cover,
    mediaCounts: mediaCounts, mediaWords: mediaWords, tickable: tickable, attachMedia: attachMedia, undoAttach: undoAttach, detachMedia: detachMedia,
    restoreMedia: restoreMedia, makeCover: makeCover, moveMedia: moveMedia, MAX_MEDIA_BYTES: MAX_MEDIA_BYTES,
    logActivity: logActivity, validate: validate, normalise: normalise,
    addDaysIso: addDays, validIso: validIso, localDay: localDay, dayLabel: dayLabel, titleOf: titleOf, nowIso: nowIso, makeId: makeId
  };

  root.CM = root.CM || {};
  root.CM.model = model;
  if (typeof module !== "undefined") module.exports = model;
})();
