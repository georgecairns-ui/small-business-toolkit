/*
  BRAIN DUMP: one button, in every tool and on Home
  -------------------------------------------------
  SHARED by every tool in the toolkit (shared version 5). Press "Brain dump" (or V) anywhere and
  talk. Your words appear as you speak. Pick what it's about, or let Claude decide, and press Done.
  Claude sorts it straight away and passes each part to the right tool: tasks to the task list,
  sales to the pipeline, and so on.

  - Every note goes into one file, apps/home/data/braindump.json (saved by the helper; never shipped).
  - The helper starts Claude with the shared skill .claude/skills/sort-brain-dump.
  - "What's it about?" shows "Let Claude decide", every tool in this folder, and anything the page's
    own tool adds with register() (Pipeline OS adds "A deal..." and "A person...").
  - Any button with data-brain-dump opens it. V opens it too, unless someone is typing.

  A tool adds its own choices:
    window.TaskListOS.brainDump.register("pipeline", {
      pickers: function () { return [{ type: "deal", label: "A deal…", items: [{ id: "d-1", label: "Hollins Lettings" }] }]; },
      preset: function () { return null; }   // something to pick to start with, such as the deal that's open
    });

  The speech-to-text is the browser's own (Chrome uses Google's speech service, Edge Microsoft's,
  Safari Apple's). Nothing is kept as audio: only the text is saved. Without it (Firefox), people type.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const FILE = "/api/data/home/braindump.json";
  const JOB = "/api/claude/sort-brain-dump";
  const providers = {};
  let tools = [];
  let timer = null;
  const watching = [];

  function pageTool() { return document.body.getAttribute("data-tool") || "home"; }
  function recognition() { return window.SpeechRecognition || window.webkitSpeechRecognition; }
  function supported() { return typeof recognition() === "function"; }
  function makeId() { return "b-" + Math.random().toString(36).slice(2, 8).padEnd(6, "0"); }

  function register(toolId, provider) { providers[toolId] = provider || {}; }

  // ---------- "What's it about?" ----------
  function aboutRow() {
    const p = providers[pageTool()] || {};
    let pickers = [];
    try { pickers = p.pickers ? p.pickers() || [] : []; } catch (e) { pickers = []; }
    const chip = function (type, id, label) {
      return '<button type="button" class="about-chip" data-about-type="' + esc(type) + '" data-about-id="' + esc(id || "") + '" aria-pressed="false">' + esc(label) + "</button>";
    };
    return '<div class="about"><span class="about__label">What’s it about?</span><div class="about__chips">' +
      chip("auto", "", "Let Claude decide") +
      tools.map(function (t) { return chip("tool", t.id, t.name); }).join("") +
      pickers.filter(function (k) { return k && k.items && k.items.length; }).map(function (k) {
        return '<select class="select select--sm about__pick" data-about-pick="' + esc(k.type) + '" aria-label="' + esc(k.label) + '"><option value="">' + esc(k.label) + "</option>" +
          k.items.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.label) + "</option>"; }).join("") + "</select>";
      }).join("") +
      '</div><div class="about__picked" aria-live="polite"></div></div>';
  }
  function bindAbout(root) {
    const picked = [];
    const out = root.querySelector(".about__picked");
    const auto = root.querySelector('[data-about-type="auto"]');
    const p = providers[pageTool()] || {};
    let preset = null;
    try { preset = p.preset ? p.preset() : null; } catch (e) { preset = null; }
    if (preset) picked.push(preset);
    function draw() {
      auto.setAttribute("aria-pressed", String(!picked.length));
      root.querySelectorAll(".about-chip:not([data-about-type=auto])").forEach(function (b) {
        b.setAttribute("aria-pressed", String(picked.some(function (x) { return x.type === b.dataset.aboutType && x.id === b.dataset.aboutId; })));
      });
      const tags = picked.filter(function (x) { return x.type !== "tool"; });
      out.innerHTML = tags.map(function (x, i) {
        return '<span class="about-tag">' + esc(x.label) + '<button type="button" class="about-tag__x" data-about-remove="' + i + '" aria-label="Remove ' + esc(x.label) + '">' + icon("x") + "</button></span>";
      }).join("");
    }
    root.addEventListener("click", function (e) {
      const b = e.target.closest(".about-chip");
      if (b) {
        if (b.dataset.aboutType === "auto") picked.length = 0;
        else {
          const i = picked.findIndex(function (x) { return x.type === b.dataset.aboutType && x.id === b.dataset.aboutId; });
          if (i > -1) picked.splice(i, 1); else picked.push({ type: b.dataset.aboutType, id: b.dataset.aboutId, label: b.textContent });
        }
        draw();
        return;
      }
      const x = e.target.closest("[data-about-remove]");
      if (x) {
        const tags = picked.filter(function (t) { return t.type !== "tool"; });
        picked.splice(picked.indexOf(tags[Number(x.getAttribute("data-about-remove"))]), 1);
        draw();
      }
    });
    root.querySelectorAll("[data-about-pick]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        if (!sel.value) return;
        const item = { type: sel.dataset.aboutPick, id: sel.value, label: sel.options[sel.selectedIndex].textContent, tool: pageTool() };
        if (!picked.some(function (t) { return t.type === item.type && t.id === item.id; })) picked.push(item);
        sel.value = "";
        draw();
      });
    });
    draw();
    return function () { return picked.slice(); };
  }

  // ---------- The recorder ----------
  function open() {
    if (document.querySelector(".modal--voice")) return;
    const dlg = document.createElement("dialog");
    dlg.className = "modal modal--voice";
    dlg.setAttribute("aria-labelledby", "voiceTitle");
    document.body.appendChild(dlg);
    const typed = !supported();
    dlg.innerHTML = '<div class="voice">' +
      '<button type="button" class="voice__close icon-btn" data-voice="cancel" aria-label="Cancel">' + icon("x") + "</button>" +
      (typed ? '<h2 id="voiceTitle">Brain dump</h2><textarea class="textarea voice__type" rows="7" placeholder="Everything on your mind: things to do, people to chase, how a call went, a new lead. Claude sorts it out."></textarea>' :
        '<h2 id="voiceTitle" class="sr-only">Brain dump</h2>' +
        '<div class="voice__mic is-live" aria-hidden="true">' + icon("mic") + "</div>" +
        '<p class="voice__status" role="status">Listening… <span class="voice__time num">0:00</span></p>' +
        '<div class="voice__text" aria-live="polite"><span class="voice__final"></span><span class="voice__interim"></span>' +
        '<span class="voice__hint">Talk naturally. Everything on your mind: things to do, people to email, how a call went, a new lead. Claude sorts it out.</span></div>') +
      aboutRow() +
      '<div class="voice__actions"><button type="button" class="btn btn--lg" data-voice="cancel">Cancel</button>' +
      '<button type="button" class="btn btn--primary btn--lg" data-voice="done">' + icon("check") + "Done</button></div>" +
      '<p class="voice__small">' + (typed ? "This browser can’t turn speech into text, so type it instead. In Chrome, Edge or Safari you can talk." :
        "Your browser turns your speech into text (Chrome uses Google’s speech service). Only the text is saved.") + "</p></div>";
    const getAbout = bindAbout(dlg);

    let finish;
    if (typed) {
      const ta = dlg.querySelector(".voice__type");
      finish = function (save) {
        const text = ta.value.replace(/\s+/g, " ").trim();
        dlg.close(); dlg.remove();
        if (save && text) saveNote(text, getAbout(), "typed");
      };
      setTimeout(function () { ta.focus(); }, 30);
    } else {
      const finalEl = dlg.querySelector(".voice__final"), interimEl = dlg.querySelector(".voice__interim"), hintEl = dlg.querySelector(".voice__hint");
      const statusEl = dlg.querySelector(".voice__status"), micEl = dlg.querySelector(".voice__mic"), timeEl = dlg.querySelector(".voice__time");
      let finalText = "", listening = true, failed = false, typeBox = null;
      // No microphone (blocked, missing or offline): swap to a typing box, keeping anything heard so far
      const switchToTyping = function () {
        if (typeBox) return;
        clearInterval(clock);
        timeEl.hidden = true;
        const box = dlg.querySelector(".voice__text");
        typeBox = document.createElement("textarea");
        typeBox.className = "textarea voice__type";
        typeBox.rows = 6;
        typeBox.setAttribute("aria-label", "Type your brain dump");
        typeBox.placeholder = "Type it instead: things to do, people to chase, how a call went, a new lead. Claude sorts it out.";
        typeBox.value = (finalText + " " + interimEl.textContent).replace(/\s+/g, " ").trim();
        box.replaceWith(typeBox);
        dlg.querySelector(".voice__small").textContent = "Only the text is saved.";
        setTimeout(function () { typeBox.focus(); }, 30);
      };
      const started = Date.now();
      const clock = setInterval(function () { const s = Math.floor((Date.now() - started) / 1000); timeEl.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 500);
      const Recognition = recognition();
      const rec = new Recognition();
      rec.lang = "en-GB"; rec.continuous = true; rec.interimResults = true;
      rec.onresult = function (e) {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const piece = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += (finalText && !/\s$/.test(finalText) ? " " : "") + piece.trim();
          else interim += piece;
        }
        finalEl.textContent = finalText;
        interimEl.textContent = interim ? " " + interim : "";
        hintEl.hidden = !!(finalText || interim);
        const box = dlg.querySelector(".voice__text"); box.scrollTop = box.scrollHeight;
      };
      rec.onerror = function (e) {
        if (e.error === "no-speech" || e.error === "aborted") return;
        failed = true;
        micEl.classList.remove("is-live");
        const messages = {
          "not-allowed": "Your microphone is blocked for this page. Click the microphone or lock icon in the address bar, allow the microphone, then try again.",
          "service-not-allowed": "Your microphone is blocked for this page. Click the microphone or lock icon in the address bar, allow the microphone, then try again.",
          "audio-capture": "No microphone was found. Check one is connected, then try again.",
          "network": "Your browser couldn’t reach its speech service. Check your internet connection and try again."
        };
        statusEl.textContent = (messages[e.error] || "Something went wrong with the microphone. Please try again.") + " Or type it below.";
        statusEl.classList.add("is-error");
        switchToTyping();
      };
      // Browsers stop listening after a pause; carry on until Done
      rec.onend = function () { if (listening && !failed) { try { rec.start(); } catch (err) { /* already restarting */ } } };
      finish = function (save) {
        listening = false;
        clearInterval(clock);
        try { rec.stop(); } catch (err) { /* already stopped */ }
        const text = (typeBox ? typeBox.value : finalText + " " + interimEl.textContent).replace(/\s+/g, " ").trim();
        const about = getAbout();
        dlg.close(); dlg.remove();
        if (save && text) saveNote(text, about, typeBox ? "typed" : "voice");
        else if (save) ui.toast(typeBox ? "Nothing was typed, so nothing was saved" : "Nothing was heard, so nothing was saved", { icon: "info" });
      };
      try { rec.start(); } catch (err) { rec.onerror({ error: "audio-capture" }); }
    }
    dlg.addEventListener("click", function (e) { const b = e.target.closest("[data-voice]"); if (b) finish(b.getAttribute("data-voice") === "done"); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); finish(false); });
    dlg.showModal();
    if (!typed) dlg.querySelector('[data-voice="done"]').focus();
  }

  // ---------- Saving it, and asking Claude to sort it ----------
  function readFile() {
    return fetch(FILE, { cache: "no-store" }).then(function (r) {
      if (r.status === 404) return { about: "Brain dump notes from every tool. Claude sorts them with .claude/skills/sort-brain-dump.", items: [] };
      if (!r.ok) throw new Error("read");
      return r.json();
    }).then(function (d) { if (!Array.isArray(d.items)) d.items = []; return d; });
  }
  function saveNote(text, about, kind) {
    if (!/^https?:$/.test(location.protocol)) { ui.toast("Brain dump needs the app's link. Ask Claude to open it, then try again", { icon: "alert", duration: 8000 }); return; }
    const item = { id: makeId(), text: String(text).slice(0, 20000), kind: kind, from: pageTool(),
      about: (about || []).map(function (a) { return { type: a.type, id: a.id || "", label: a.label || "", tool: a.tool || (a.type === "tool" ? a.id : "") }; }),
      createdAt: new Date().toISOString(), status: "unsorted" };
    readFile().then(function (d) {
      d.items.push(item);
      if (d.items.length > 500) d.items = d.items.slice(-500);
      return fetch(FILE, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d, null, 2) });
    }).then(function (r) {
      if (!r.ok) throw new Error("save");
      return fetch(JOB, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    }).then(function (r) {
      if (r.status === 202) { watch(item.id); ui.toast("Got it. Claude is sorting your brain dump", { icon: "mic", duration: 6000 }); }
      else ui.toast("Saved. Say “sort my brain dump” to Claude and it sorts it out", { icon: "mic", duration: 8000 });
    }).catch(function () {
      ui.toast("Your brain dump couldn't be saved. Is the app running? Ask Claude to open it", { icon: "alert", duration: 8000 });
    });
  }
  function setStatus(text) {
    const el = document.getElementById("claudeStatus");
    if (!el) return;
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  function watch(id) {
    if (id && watching.indexOf(id) === -1) watching.push(id);
    setStatus("Claude is sorting your brain dump");
    clearInterval(timer);
    timer = setInterval(function () {
      fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
        if (st.running || st.queued) return;
        clearInterval(timer);
        setStatus(null);
        readFile().then(function (d) {
          watching.splice(0).forEach(function (wid) {
            const b = d.items.find(function (x) { return x.id === wid; });
            const review = document.querySelector('.nav__item[href="#review"]');
            if (b && b.status === "sorted") ui.toast("Claude has sorted your brain dump" + (b.summary ? ": " + b.summary : ""), { icon: "sparkle", duration: 12000,
              actionLabel: review ? "See Review" : null, onAction: review ? function () { review.click(); } : null });
            else ui.toast("Claude couldn't finish sorting it. It's saved; say “sort my brain dump” to Claude", { icon: "info", duration: 9000 });
          });
        }).catch(function () { /* the app will catch up on its own */ });
      }).catch(function () { /* helper briefly unavailable; keep watching */ });
    }, 3000);
  }

  // ---------- Start ----------
  document.addEventListener("click", function (e) { if (e.target.closest("[data-brain-dump]")) { e.preventDefault(); open(); } });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "v" && e.key !== "V") return;
    const el = document.activeElement;
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable || document.querySelector("dialog[open]")) return;
    if (document.getElementById("shell") && document.getElementById("shell").hidden) return;
    e.preventDefault();
    open();
  });
  if (/^https?:$/.test(location.protocol)) {
    fetch("../installed.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; }).then(function (inst) {
      tools = (inst.tools || []).filter(function (t) { return t && t.id && t.name; });
    }).catch(function () { tools = []; });
    // Carry on watching a sort that was already running when the page opened
    fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) { if ((st.running || st.queued) && st.job === "shared:brain-dump") watch(null); }).catch(function () {});
  }

  window.TaskListOS = window.TaskListOS || {};
  window.TaskListOS.brainDump = { open: open, register: register, supported: supported };
})();
