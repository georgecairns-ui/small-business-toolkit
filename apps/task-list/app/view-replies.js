/*
  REPLIES: emails that need an answer, each with Claude's draft
  -------------------------------------------------------------
  Claude reads the inbox, works out which emails need a reply, and writes a draft for each.
  "Draft" opens that email, written and addressed, in Gmail, Outlook or the email app.
  The person checks it and presses send. Claude never sends anything.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.TL.model, C = window.TL.c, L = window.TL.links;

  function ago(iso) {
    if (!iso) return "";
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (mins < 60) return Math.max(1, mins) + " min ago";
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
    const days = Math.round(hrs / 24);
    return days === 1 ? "Yesterday" : days + " days ago";
  }

  // "Claude checked your inbox at 10:30: 47 emails, 6 need a reply..."
  function triageStrip(d, compact) {
    const t = d.triage;
    if (!t.lastRunAt) {
      return '<div class="triage triage--empty">' + icon("mail") + "<span>Claude hasn't checked your inbox yet. Once your email is connected, it sorts every new email and drafts the replies for you.</span>" + C.say("Check my inbox") + "</div>";
    }
    const when = new Date(t.lastRunAt);
    const today = ui.isoDate(when) === M.todayISO();
    const time = when.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
    const bits = [
      ["mail", t.emailsScanned, t.emailsScanned === 1 ? "email sorted" : "emails sorted"],
      ["pencil", t.needReply, t.needReply === 1 ? "needs a reply" : "need a reply"],
      ["plus", t.newTasks, t.newTasks === 1 ? "new task" : "new tasks"],
      ["users", t.callsProcessed, t.callsProcessed === 1 ? "call written up" : "calls written up"]
    ].filter(function (b) { return b[1]; });
    return '<div class="triage' + (compact ? " triage--compact" : "") + '"><span class="triage__pulse" aria-hidden="true"></span>' +
      '<span class="triage__when">Claude checked ' + (today ? "at " + esc(time) : esc(when.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + ", " + time)) + "</span>" +
      bits.map(function (b) { return '<span class="triage__bit">' + icon(b[0]) + '<strong class="num">' + b[1] + "</strong> " + esc(b[2]) + "</span>"; }).join("") +
      (t.nextRunAt && new Date(t.nextRunAt) > new Date() ? '<span class="triage__next">Next check ' + esc(new Date(t.nextRunAt).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })) + "</span>" : "") +
      "</div>";
  }

  function replyRow(ctx, r, opts) {
    const d = ctx.d;
    const p = M.personById(d, r.personId);
    const sender = r.from ? (r.from.name || r.from.email) : "Unknown sender";
    const done = r.status !== "waiting";
    return '<li class="reply' + (done ? " is-done" : "") + (r.urgency === "high" ? " is-urgent" : "") + ctx.anim("reply-" + r.id + (opts && opts.suffix || "")) + '" data-reply="' + esc(r.id) + '">' +
      (p ? C.avatar(p, "md") : '<span class="avatar avatar--md" style="--av:' + C.colourFor(sender) + '">' + esc(C.initials(sender)) + "</span>") +
      '<button type="button" class="reply__main" data-action="open-reply">' +
      '<span class="reply__top"><span class="reply__from">' + esc(sender) + "</span>" + (r.urgency === "high" && !done ? '<span class="chip chip--danger">Urgent</span>' : "") + '<span class="reply__when">' + esc(ago(r.receivedAt)) + "</span></span>" +
      '<span class="reply__subject">' + esc(r.subject || "(no subject)") + "</span>" +
      (r.why ? '<span class="reply__why">' + esc(r.why) + "</span>" : "") +
      "</button>" +
      '<span class="reply__actions">' + (done ? '<span class="chip chip--success">' + icon("check") + (r.status === "replied" ? "Replied" : "Not needed") + '</span><button type="button" class="btn btn--ghost btn--sm" data-action="reply-reopen">Undo</button>' :
        '<button type="button" class="btn btn--primary btn--sm" data-action="reply-draft" title="Opens the drafted reply in ' + esc(L.emailLabel(d.settings.emailProvider)) + '">' + icon("pencil") + "Draft</button>" +
        '<button type="button" class="icon-btn icon-btn--sm is-approve" data-action="reply-done" aria-label="Mark as replied">' + icon("check") + "</button>" +
        '<button type="button" class="icon-btn icon-btn--sm is-skip" data-action="reply-dismiss" aria-label="No reply needed">' + icon("x") + "</button>") +
      "</span></li>";
  }

  function render(ctx) {
    const d = ctx.d;
    const open = M.openReplies(d);
    const urgent = open.filter(function (r) { return r.urgency === "high"; });
    const normal = open.filter(function (r) { return r.urgency !== "high"; });
    const recent = d.replies.filter(function (r) { return r.status !== "waiting"; })
      .sort(function (a, b) { return String(b.repliedAt || b.dismissedAt || "").localeCompare(String(a.repliedAt || a.dismissedAt || "")); }).slice(0, 8);

    let html = '<div class="page page--narrow">' + triageStrip(d);
    if (!open.length) {
      html += d.triage.lastRunAt ? C.empty("celebrate", "Nothing needs a reply.", "Every email that needs an answer from you has one. New ones appear here, with a draft, as Claude finds them.")
        : C.empty("thinking", "No emails yet.", "Connect your email during setup and Claude will list every email that needs a reply here, each with a draft ready to send.", '<div class="empty__actions">' + C.say("Connect my email") + "</div>");
    }
    if (urgent.length) html += '<section class="panel panel--flush">' + C.sectionHead("Urgent", { icon: "alert", count: urgent.length }) + '<ul class="replies" role="list">' + urgent.map(function (r) { return replyRow(ctx, r); }).join("") + "</ul></section>";
    if (normal.length) html += '<section class="panel panel--flush">' + C.sectionHead("Needs a reply", { icon: "mail", count: normal.length }) + '<ul class="replies" role="list">' + normal.map(function (r) { return replyRow(ctx, r); }).join("") + "</ul></section>";
    if (recent.length) html += '<details class="panel panel--flush sorted"><summary class="sorted__summary sorted__summary--pad">' + icon("check") + 'Dealt with <span class="badge">' + recent.length + '</span></summary><ul class="replies" role="list">' + recent.map(function (r) { return replyRow(ctx, r, { suffix: "-done" }); }).join("") + "</ul></details>";
    if (open.length) html += '<p class="muted page-foot">Draft opens the reply in ' + esc(L.emailLabel(d.settings.emailProvider)) + ", written and addressed. Check it, change anything you like, and press send. Claude never sends email for you.</p>";
    return html + "</div>";
  }

  window.TL.views = window.TL.views || {};
  window.TL.views.replies = {
    title: function () { return "Inbox"; },
    sub: function (ctx) { const n = M.openReplies(ctx.d).length; return n ? n + (n === 1 ? " email needs" : " emails need") + " an answer" : "Nothing waiting"; },
    render: render,
    triageStrip: triageStrip,
    replyRow: replyRow
  };
})();
