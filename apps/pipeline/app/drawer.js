/*
  DRAWER: the record panel that slides in from the right
  ------------------------------------------------------
  A deal: what's going on, the call notes box (paste or drop notes in and Claude fills the deal
  in), next steps and Claude's tip, the email to send, the deal check, other ways you could
  help, and everything that has happened. A person: their details and deals. A call: the write-up.
  Changes save as soon as you make them.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PL.model, C = window.PL.c;

  function prop(label, control) {
    return '<div class="prop"><span class="prop__label">' + esc(label) + '</span><div class="prop__value">' + control + "</div></div>";
  }
  function head(label) {
    return '<div class="drawer__head"><span class="label">' + esc(label) + '</span><span class="drawer__spacer"></span>' +
      '<button type="button" class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon("x") + "</button></div>";
  }
  function when(at) { return new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
  function safeUrl(url) { return /^https?:\/\//i.test(String(url || "")) ? url : "#"; }

  // ---------- A deal ----------
  function banner(ctx, x) {
    if (x.suggested) {
      return '<div class="drawer__banner"><span>' + icon("sparkle") + "Claude spotted this deal. It isn't on your board until you add it." + (x.suggestReason ? " " + esc(x.suggestReason) : "") + "</span>" +
        '<span class="drawer__banner-actions"><button type="button" class="btn btn--approve btn--sm" data-action="approve-deal">' + icon("check") + 'Add to pipeline</button><button type="button" class="btn btn--sm" data-action="skip-deal">Not a deal</button></span></div>';
    }
    if (x.moved && M.daysSince(x.moved.at) <= 7) {
      return '<p class="moved-line">' + icon("sparkle") + "<span>Claude moved this from " + esc(M.stageLabel(x.moved.from)) + " to " + esc(M.stageLabel(x.moved.to)) + "." + (x.moved.reason ? " " + esc(x.moved.reason) : "") +
        ' <button type="button" class="link-btn" data-action="undo-move">Move it back</button></span></p>';
    }
    return "";
  }

  // The box for call notes: type or paste, or drop a file. Claude reads them straight away.
  function notesBox(ctx, x) {
    const waiting = M.notesWaiting(x);
    const busy = ctx.claude && ctx.claude.dealIds.indexOf(x.id) > -1;
    let status = "";
    if (waiting.length) {
      status = busy ? '<p class="notes__status is-busy">' + icon("loader", "spin") + "Claude is reading your notes and updating this deal. It takes a minute or 2.</p>" :
        '<div class="notes__status">' + icon("info") + "<span>" + waiting.length + (waiting.length === 1 ? " set of notes is" : " sets of notes are") + " waiting for Claude.</span>" +
        '<a class="btn btn--sm" href="' + esc(C.claudeLink("Update the " + x.title + " deal in Pipeline OS from the call notes I've just added. Follow .claude/skills/update-a-deal.")) + '">' + icon("external") + "Open in Claude</a></div>";
    }
    return '<section class="drawer__section notes" data-dropzone>' +
      '<h3 class="label"><label for="dealNotes">Add call notes</label></h3>' +
      '<textarea class="textarea notes__text" id="dealNotes" data-keep rows="4" maxlength="60000" placeholder="Paste your notes or the transcript, or drop a file here. Rough notes are fine."></textarea>' +
      '<div class="notes__actions"><button type="button" class="btn btn--primary" data-action="save-notes">' + icon("sparkle") + "Update the deal</button>" +
      '<label class="btn btn--ghost notes__file">' + icon("folder") + 'Choose a file<input type="file" accept=".txt,.md,.vtt,.srt,.csv,text/plain" data-notes-file hidden></label>' +
      '<span class="muted drawer__small">Claude fills in the deal check, next steps and a reply for you.</span></div>' + status + "</section>";
  }

  function nextSteps(ctx, x) {
    const steps = x.nextSteps;
    if (!steps.length && !x.coaching) return "";
    return '<section class="drawer__section"><h3 class="label">Next steps</h3>' +
      (steps.length ? '<ul class="steps" role="list">' + steps.map(function (s, i) {
        const late = !s.done && s.due && s.due < M.todayISO();
        return '<li class="step' + (s.done ? " is-done" : "") + '"><button type="button" class="check check--sm" role="checkbox" aria-checked="' + !!s.done + '" data-action="step-done" data-step="' + i + '" aria-label="' + (s.done ? "Mark not done: " : "Mark done: ") + esc(s.text) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></button>' +
          '<span class="step__text">' + esc(s.text) + "</span>" + (s.due ? '<span class="chip' + (late ? " chip--danger" : "") + '">' + esc(M.whenLabel(s.due)) + "</span>" : "") + "</li>";
      }).join("") + "</ul>" : "") +
      (x.coaching ? '<blockquote class="claude-note coach"><span class="label">' + icon("sparkle") + "Claude's tip</span><p>" + esc(x.coaching) + "</p></blockquote>" : "") + "</section>";
  }

  function emailBox(ctx, x) {
    const e = x.email;
    if (!e || !e.body) return "";
    const L = window.PL.links;
    return '<section class="drawer__section draft"><h3 class="label">Email to send' + (e.sentAt ? ' <span class="chip chip--success">' + icon("check") + "Sent</span>" : "") + "</h3>" +
      (e.why ? '<p class="muted drawer__small">' + esc(e.why) + "</p>" : "") +
      '<div class="draft__fields"><label class="draft__field"><span>To</span><input class="input input--bare" data-efield="to" value="' + esc(e.to || "") + '"></label>' +
      '<label class="draft__field"><span>Subject</span><input class="input input--bare" data-efield="subject" value="' + esc(e.subject || "") + '"></label></div>' +
      '<textarea class="textarea draft__body" data-efield="body" rows="8" aria-label="Email to send">' + esc(e.body) + "</textarea>" +
      '<div class="draft__actions">' + C.emailActions(ctx.d, "deal", x.id, e) + (e.sentAt || e.sendStatus === "sent" ? "" : '<button type="button" class="btn btn--ghost" data-action="copy-email">' + icon("list") + "Copy</button>") + "</div>" +
      (e.sentAt || e.sendStatus ? "" : '<p class="muted drawer__small">Claude emails: you check it, press Send, and Claude sends it for you. I\'ll do it: it opens in ' + esc(L.emailLabel(ctx.d.settings.emailProvider)) + " for you to send.</p>") + "</section>";
  }

  // LinkedIn: Claude writes the message; the person pastes and sends it
  function linkedinBox(ctx, x) {
    const m = x.linkedin;
    if (!m || !m.body) return "";
    return '<section class="drawer__section draft"><h3 class="label">LinkedIn message</h3>' + (m.why ? '<p class="muted drawer__small">' + esc(m.why) + "</p>" : "") +
      '<p class="peek__body">' + esc(m.body) + '</p><div class="draft__actions">' + C.linkedinActions("deal", x.id, m) + "</div>" +
      (m.sentAt ? "" : '<p class="muted drawer__small">Copies the message and opens their profile: press Message, paste and send. LinkedIn doesn\'t allow messages to be sent for you.</p>') + "</section>";
  }

  // Who they're meeting: Claude's research, how well they fit the ideal client, and how to run the call
  function research(ctx, x) {
    const r = x.research;
    const busy = ctx.claude && ctx.claude.research.indexOf(x.id) > -1;
    const btn = busy ? '<p class="notes__status is-busy">' + icon("loader", "spin") + "Claude is researching them. It takes a minute or 2.</p>" :
      '<button type="button" class="btn btn--sm" data-action="research-deal">' + icon("search") + (r ? "Research them again" : "Research them") + "</button>";
    if (!r) {
      return '<section class="drawer__section"><h3 class="label">Who you\'re meeting</h3><p class="muted">Claude looks the person and their business up (their website, Google, their public LinkedIn), scores how well they fit your ideal client, and suggests how to run the call. It does this by itself before every booked call.</p>' + btn + "</section>";
    }
    const f = M.fitScore(x);
    const pr = r.person || {}, co = r.company || {};
    const crit = (r.fit || []).map(function (c) {
      const res = M.FIT[c.result] || M.FIT.unknown;
      return '<li class="fitrow fitrow--' + esc(c.result) + '"><span class="fitrow__q">' + esc(c.criterion) + '</span><span class="kstatus kstatus--' + (c.result === "yes" ? "known" : c.result === "partly" ? "partly" : "gap") + '">' + esc(res.label) + "</span>" +
        (c.why ? '<span class="fitrow__why">' + esc(c.why) + "</span>" : "") + "</li>";
    }).join("");
    const plan = (r.callPlan || []).map(function (st) {
      return "<li><strong>" + esc(st.step) + "</strong>" + (st.minutes ? ' <span class="muted">' + esc(st.minutes) + " min</span>" : "") + (st.detail ? "<span>" + esc(st.detail) + "</span>" : "") + "</li>";
    }).join("");
    return '<section class="drawer__section research"><div class="dcheck__head"><h3 class="label">Who you\'re meeting</h3>' + (f ? '<span class="fit-score fit-score--' + (f.dealBreaker || f.score < 50 ? "low" : f.score < 75 ? "mid" : "high") + '">' + f.score + "% fit</span>" : "") + "</div>" +
      '<div class="research__who"><p><strong>' + esc(pr.name || "") + "</strong>" + (pr.role ? ", " + esc(pr.role) : "") + (co.name ? " at " + esc(co.name) : "") + "</p>" +
      (pr.summary ? "<p>" + esc(pr.summary) + "</p>" : "") +
      (co.summary ? '<p class="muted">' + esc(co.summary) + "</p>" : "") + "</div>" +
      (crit ? '<div class="dcheck__list"><h4>' + icon("target") + "How well they fit your ideal client" + (f ? ' <span class="muted">(based on ' + f.assessed + " of " + f.of + ")</span>" : "") + '</h4><ul class="fitrows" role="list">' + crit + "</ul></div>" : "") +
      (plan ? '<div class="dcheck__ask"><h4>' + icon("list") + "How to run the call</h4><ol class=\"callplan\">" + plan + "</ol></div>" : "") +
      ((r.sources || []).length ? '<p class="muted drawer__small">From: ' + r.sources.map(function (src) { return '<a href="' + esc(safeUrl(src.url)) + '" target="_blank" rel="noopener">' + esc(src.label || src.url) + "</a>"; }).join(", ") + ". Researched " + esc(C.ago(r.researchedAt)) + ". Check anything important yourself.</p>" : "") +
      btn + "</section>";
  }

  function dealCheck(ctx, x) {
    const d = ctx.d;
    if (!M.hasBeenChecked(x)) {
      return '<section class="drawer__section dcheck"><h3 class="label">Deal check</h3><p class="muted">' +
        (x.noTranscript ? "There's no recording of the last call. Add a few lines on how it went above, and Claude checks the deal." :
          "Claude checks every deal against 8 questions after each call or email. Add your call notes above and it starts.") + "</p></section>";
    }
    const k = x.check;
    const list = function (title, items, ic) { return items.length ? '<div class="dcheck__list"><h4>' + icon(ic) + esc(title) + "</h4><ul>" + items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>" : ""; };
    return '<section class="drawer__section dcheck"><div class="dcheck__head"><h3 class="label">Deal check</h3>' + C.checkMeter(x) + "</div>" +
      (k.questions.length ? '<div class="dcheck__ask"><h4>' + icon("target") + "Ask next time</h4><ol>" + k.questions.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol></div>" : "") +
      '<ul class="kfields" role="list">' + M.CHECK.map(function (c) {
        const a = k[c.key] || {};
        return '<li class="kfield kfield--' + esc(a.status) + '"><div class="kfield__top"><span class="kfield__q">' + esc(M.checkLabel(d, c.key)) + "</span>" + C.statusChip(a.status) + "</div>" +
          (a.answer ? '<p class="kfield__a">' + esc(a.answer) + "</p>" : "") + (a.evidence ? '<p class="kfield__e">' + esc(a.evidence) + "</p>" : "") + "</li>";
      }).join("") + "</ul>" +
      list("Risks", k.risks, "alert") + list("Buying signals", k.signals, "trendingUp") +
      '<p class="muted drawer__small">Based on MEDDPICC, a standard way to qualify sales. Checked ' + esc(C.ago(k.checkedAt)) + ". Claude never guesses: anything not said stays “Not known yet”.</p></section>";
  }

  function alsoHelp(ctx, x) {
    if (!x.alsoHelp.length) return "";
    return '<section class="drawer__section"><h3 class="label">Also could help with</h3><ul class="also" role="list">' + x.alsoHelp.map(function (a) {
      return '<li class="also__item"><p class="also__problem">“' + esc(a.problem) + "”</p>" + (a.service ? '<p><span class="chip chip--accent">' + icon("sparkle") + esc(a.service) + "</span></p>" : "") +
        (a.question ? '<p class="muted">Ask: ' + esc(a.question) + "</p>" : "") + "</li>";
    }).join("") + "</ul></section>";
  }

  function timeline(ctx, x) {
    const items = x.timeline.slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    if (!items.length) return "";
    const icons = { email: "mail", call: "phone", meeting: "users", note: "pencil", stage: "arrowRight", won: "check", lost: "x", created: "plus" };
    return '<section class="drawer__section"><h3 class="label">What\'s happened</h3><ol class="history tline">' + items.map(function (e) {
      return '<li><span class="history__dot"></span><span class="tline__body"><span class="tline__title">' + icon(icons[e.kind] || "info") + esc(e.title) + "</span>" +
        (e.summary ? '<span class="tline__sum">' + esc(e.summary) + "</span>" : "") + '</span><span class="muted num">' + esc(when(e.at)) + "</span></li>";
    }).join("") + "</ol></section>";
  }

  function dealHTML(ctx, x) {
    const d = ctx.d;
    const people = x.personIds.map(function (id) { return M.personById(d, id); }).filter(Boolean);
    const meeting = M.upcomingMeeting(x);
    const closed = x.stage === "won" || x.stage === "lost";
    return head("Deal") +
      '<div class="drawer__body" data-deal="' + esc(x.id) + '">' + banner(ctx, x) +
      '<textarea class="input-bare drawer__title" data-field="title" rows="1" maxlength="160" aria-label="Deal name">' + esc(x.title) + "</textarea>" +
      (x.summary ? '<p class="deal-summary">' + esc(x.summary) + "</p>" : "") +
      (meeting ? '<div class="drawer__banner drawer__banner--quiet"><span>' + icon("phone") + "<strong>Call booked: " + esc(M.meetingLabel(meeting.start)) + "</strong>&nbsp;" + esc(meeting.title || "Sales call") + "</span></div>" : "") +
      '<div class="props">' +
      prop("Stage", '<select class="select select--bare" data-field="stage" aria-label="Stage">' + C.stageOptions(x.stage) + "</select>") +
      prop("Value", '<input class="input input--bare num" type="number" min="0" step="50" data-field="value" value="' + esc(x.value || "") + '" placeholder="0" aria-label="Value">') +
      prop("Business", '<input class="input input--bare" data-field="organisation" maxlength="80" value="' + esc(x.organisation || "") + '" placeholder="Business or organisation" aria-label="Business">') +
      prop("People", '<span class="deal-people">' + people.map(function (p) { return '<button type="button" class="who who--btn" data-action="open-person" data-person="' + esc(p.id) + '">' + C.avatar(p) + '<span class="who__name">' + esc(p.name) + "</span></button>"; }).join("") +
        '<input class="input input--bare deal-people__add" data-add-person list="drawerPeople" maxlength="80" placeholder="Add a person" aria-label="Add a person"><datalist id="drawerPeople">' +
        M.allPeople(d).map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.organisation || "") + "</option>"; }).join("") + "</datalist></span>") +
      prop("Came from", '<input class="input input--bare" data-field="source" maxlength="80" value="' + esc(x.source || "") + '" placeholder="Referral, website, email" aria-label="Where it came from">') +
      (x.stage === "lost" ? prop("Why lost", '<input class="input input--bare" data-field="lostReason" maxlength="160" value="' + esc(x.lostReason || "") + '" aria-label="Why it was lost">') : "") +
      "</div>" +
      (closed ? "" : notesBox(ctx, x)) + nextSteps(ctx, x) + emailBox(ctx, x) + linkedinBox(ctx, x) + (closed ? "" : research(ctx, x)) + dealCheck(ctx, x) + alsoHelp(ctx, x) + timeline(ctx, x) +
      "</div>" +
      '<div class="drawer__foot" data-deal="' + esc(x.id) + '"><button type="button" class="btn btn--ghost btn--danger btn--sm" data-action="delete-deal">' + icon("trash") + 'Delete</button><span class="drawer__spacer"></span>' +
      (closed ? '<button type="button" class="btn" data-action="reopen-deal">' + icon("undo") + "Reopen</button>" :
        '<button type="button" class="btn" data-action="mark-lost">Mark lost</button><button type="button" class="btn btn--approve" data-action="mark-won">' + icon("check") + "Mark won</button>") + "</div>";
  }

  // ---------- A person ----------
  function personHTML(ctx, p) {
    const d = ctx.d;
    const deals = M.dealsForPerson(d, p.id);
    const ro = !!p.fromTaskList;
    const roles = M.ROLES.map(function (r) { return '<option value="' + r.key + '"' + (p.role === r.key ? " selected" : "") + ">" + r.label + "</option>"; }).join("");
    const input = function (field, type, placeholder) { return '<input class="input input--bare" type="' + type + '" data-pfield="' + field + '" maxlength="120" value="' + esc(p[field] || "") + '" placeholder="' + placeholder + '"' + (ro ? " readonly" : "") + ">"; };
    return head("Person") +
      '<div class="drawer__body" data-person="' + esc(p.id) + '">' +
      '<div class="person-head">' + C.avatar(p, "lg") + '<div class="person-head__text">' +
      '<input class="input-bare person-head__name" data-pfield="name" maxlength="80" value="' + esc(p.name) + '" aria-label="Name"' + (ro ? " readonly" : "") + ">" +
      '<input class="input-bare person-head__org" data-pfield="organisation" maxlength="80" value="' + esc(p.organisation || "") + '" placeholder="Business or organisation" aria-label="Organisation"' + (ro ? " readonly" : "") + "></div></div>" +
      (ro ? '<p class="muted drawer__small">From your task list. Change their details there.</p>' : "") +
      '<div class="props">' +
      prop("Type", '<select class="select select--bare" data-pfield="role" aria-label="Type"' + (ro ? " disabled" : "") + ">" + roles + "</select>") +
      prop("Email", input("email", "email", "Add email")) + prop("Phone", input("phone", "tel", "Add phone")) + prop("LinkedIn", input("linkedin", "url", "Add their LinkedIn link")) + "</div>" +
      (ro ? (p.notes ? '<section class="drawer__section"><h3 class="label">Notes</h3><p>' + esc(p.notes) + "</p></section>" : "") :
        '<section class="drawer__section"><h3 class="label"><label for="personNotes">Notes</label></h3><textarea class="textarea" id="personNotes" data-pfield="notes" rows="3" maxlength="2000" placeholder="How you know them, what they care about">' + esc(p.notes || "") + "</textarea></section>") +
      '<section class="drawer__section"><h3 class="label">Deals <span class="badge">' + deals.length + "</span></h3>" +
      (deals.length ? '<div class="mini-deals">' + deals.map(function (x) { return C.dealCard(d, x, {}); }).join("") + "</div>" : '<p class="muted">No deals yet.</p>') + "</section>" +
      "</div>" +
      '<div class="drawer__foot" data-person="' + esc(p.id) + '"><span class="drawer__spacer"></span><button type="button" class="btn btn--primary" data-action="add-deal-person">' + icon("plus") + "New deal with " + esc(p.name.split(" ")[0]) + "</button></div>";
  }

  // ---------- A call not linked to a deal ----------
  function callHTML(ctx, c) {
    return head("Call") + '<div class="drawer__body"><p class="mail-head__subject">' + esc(c.title) + '</p><p class="muted">' + esc(M.whenLabel(c.date)) + (c.source ? " · " + esc(c.source) : "") + "</p>" +
      (c.summary ? '<section class="drawer__section"><h3 class="label">Summary</h3><p>' + esc(c.summary) + "</p></section>" : "") +
      (c.transcriptUrl ? '<section class="drawer__section"><a class="btn btn--ghost btn--sm" href="' + esc(safeUrl(c.transcriptUrl)) + '" target="_blank" rel="noopener">' + icon("external") + "Open the recording</a></section>" : "") +
      '<p class="muted drawer__small">Not linked to a deal yet. Tell Claude which deal it belongs to, or that it wasn\'t a sales call.</p></div>';
  }

  function render(ctx, target) {
    if (target.kind === "deal") { const x = M.dealById(ctx.d, target.id); return x ? dealHTML(ctx, x) : null; }
    if (target.kind === "person") { const p = M.personById(ctx.d, target.id); return p ? personHTML(ctx, p) : null; }
    if (target.kind === "call") { const c = M.callById(ctx.d, target.id); return c ? callHTML(ctx, c) : null; }
    return null;
  }

  // Save each field as soon as it changes
  function bind(root, ctx, target) {
    root.querySelectorAll("[data-field]").forEach(function (el) {
      el.addEventListener("change", function () {
        const field = el.getAttribute("data-field");
        let value = el.value;
        if (field === "stage") return ctx.actions.setStage(target.id, value);
        if (field === "title") { value = value.replace(/\s+/g, " ").trim(); if (!value) { el.value = M.dealById(ctx.d, target.id).title; return; } }
        if (field === "value") value = Math.max(0, Number(value) || 0);
        const fields = {}; fields[field] = value;
        ctx.actions.updateDeal(target.id, fields);
      });
    });
    root.querySelectorAll("[data-add-person]").forEach(function (el) {
      el.addEventListener("change", function () { const v = el.value.trim(); if (v) ctx.actions.addPersonToDeal(target.id, v); });
    });
    root.querySelectorAll("[data-efield]").forEach(function (el) {
      el.addEventListener("change", function () {
        const x = M.dealById(ctx.d, target.id);
        const email = Object.assign({}, x.email); email[el.getAttribute("data-efield")] = el.value; email.editedAt = new Date().toISOString();
        ctx.actions.updateDeal(target.id, { email: email });
      });
    });
    root.querySelectorAll("[data-pfield]").forEach(function (el) {
      el.addEventListener("change", function () {
        const field = el.getAttribute("data-pfield");
        const value = el.value.trim();
        if (field === "name" && !value) { el.value = M.personById(ctx.d, target.id).name; return; }
        const fields = {}; fields[field] = value;
        ctx.actions.updatePerson(target.id, fields);
      });
    });
    // Notes from a file: read on this computer, never uploaded anywhere
    const file = root.querySelector("[data-notes-file]");
    if (file) file.addEventListener("change", function () { if (file.files[0]) ctx.actions.notesFromFile(target.id, file.files[0]); file.value = ""; });
    const zone = root.querySelector("[data-dropzone]");
    if (zone) {
      zone.addEventListener("dragover", function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") > -1) { e.preventDefault(); zone.classList.add("is-over"); } });
      zone.addEventListener("dragleave", function () { zone.classList.remove("is-over"); });
      zone.addEventListener("drop", function (e) {
        zone.classList.remove("is-over");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) { e.preventDefault(); ctx.actions.notesFromFile(target.id, e.dataTransfer.files[0]); }
      });
    }
    root.querySelectorAll(".draft__body, .notes__text").forEach(function (ta) {
      const fit = function () { ta.style.height = "auto"; ta.style.height = Math.min(520, ta.scrollHeight + 2) + "px"; };
      fit(); ta.addEventListener("input", fit);
    });
    const title = root.querySelector(".drawer__title");
    if (title) {
      const fit = function () { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; };
      fit();
      title.addEventListener("input", fit);
      title.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); title.blur(); } });
    }
  }

  window.PL.drawer = { render: render, bind: bind };
})();
