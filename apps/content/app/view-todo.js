/*
  TO DO: everything waiting on the owner
  --------------------------------------
  Needs (a photo, a case study), posts to check and approve, and approved posts to put out today.
  The list itself comes from CM.model.todo, so Home and Task List OS read it the same way.
  Claude never posts: the owner copies the words, opens the platform and ticks "I've posted it".
*/
(function () {
  "use strict";

  window.CM = window.CM || {};
  CM.views = CM.views || {};
  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;

  const GROUPS = [
    { key: "overdue", label: "Overdue" },
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "later", label: "Later" }
  ];
  const ANSWERED_IN_APP = { "case-study": true, info: true };
  // A photo or video need is answered by adding the file to the post
  const FILE_NEEDS = { photo: true, video: true };

  // What has been typed in an answer box but not sent yet, by need id. Kept between redraws.
  const drafts = {};

  function findPost(data, id) { return data.posts.find(function (p) { return p.id === id; }); }

  function itemTitle(it, M) {
    if (it.kind === "need") return it.need.text;
    if (it.kind === "approve") return "Check and approve: " + M.titleOf(it.post);
    return "Post to " + M.platform(it.platform).label + ": " + M.titleOf(it.post);
  }

  function itemIcon(it) {
    const C = window.CM.components;
    if (it.kind === "need") return C.needIcon(it.need.type);
    if (it.kind === "approve") return icon("checkSquare");
    return C.platformTag(it.platform);
  }

  function actions(it, M) {
    const pid = esc(it.post.id);
    if (it.kind === "approve") return '<button type="button" class="btn btn--sm" data-action="open" data-post="' + pid + '">Review' + icon("arrowRight") + "</button>";
    if (it.kind === "need") {
      if (ANSWERED_IN_APP[it.need.type]) return "";
      const addFile = FILE_NEEDS[it.need.type] ? '<button type="button" class="btn btn--sm" data-action="add-file" data-post="' + pid + '">' + icon("plus") + "Add the file</button>" : "";
      return addFile + '<button type="button" class="btn btn--sm" data-action="need-done" data-post="' + pid + '" data-need="' + esc(it.need.id) + '">' + icon("check") + "Mark done</button>";
    }
    const p = M.platform(it.platform), key = esc(it.platform);
    return '<button type="button" class="btn btn--sm" data-action="copy" data-post="' + pid + '" data-platform="' + key + '">' + icon("fileText") + "Copy</button>" +
      (p.openUrl ? '<a class="btn btn--sm" href="' + esc(p.openUrl) + '" target="_blank" rel="noopener">Open ' + esc(p.label) + icon("external") + "</a>" : "") +
      '<button type="button" class="btn btn--sm btn--primary" data-action="posted" data-post="' + pid + '" data-platform="' + key + '">' + icon("check") + "I’ve posted it</button>";
  }

  function answerBox(it) {
    if (it.kind !== "need" || !ANSWERED_IN_APP[it.need.type]) return "";
    const label = it.need.type === "case-study" ? "Tell Claude about the job: who, what you did, the result" : "Tell Claude what it needs to know";
    return '<div class="todo-answer"><label class="field"><span class="field__label">' + esc(label) + '</span><textarea class="textarea" rows="3" maxlength="4000" data-draft="' + esc(it.need.id) + '">' + esc(drafts[it.need.id] || "") + "</textarea></label>" +
      '<div><button type="button" class="btn btn--sm btn--primary" data-action="send-answer" data-post="' + esc(it.post.id) + '" data-need="' + esc(it.need.id) + '">' + icon("sparkle") + "Send to Claude</button></div></div>";
  }

  function row(it, M) {
    return '<li class="todo-row todo-row--' + esc(it.kind) + '"><div class="todo-row__main"><span class="todo-row__icon">' + itemIcon(it) + "</span>" +
      '<div class="todo-row__text"><button type="button" class="todo-row__title" data-action="open" data-post="' + esc(it.post.id) + '">' + esc(itemTitle(it, M)) + "</button>" +
      '<span class="todo-row__sub">' + (it.kind === "need" ? esc(M.titleOf(it.post)) + " · " : "") + esc(ui.friendlyDue(it.due)) + "</span></div>" +
      '<div class="todo-row__actions">' + actions(it, M) + "</div></div>" + answerBox(it) + "</li>";
  }

  function group(g, items, M) {
    if (!items.length) return "";
    return '<section class="todo-group todo-group--' + g.key + '"><h2 class="todo-group__title">' + g.label + ' <span class="todo-group__count">' + items.length + '</span></h2><ul class="todo-list">' +
      items.map(function (it) { return row(it, M); }).join("") + "</ul></section>";
  }

  function markPosted(ctx, post, key) {
    const M = ctx.model, postId = post.id, before = post.status, label = M.platform(key).label, title = M.titleOf(post);
    ctx.update(function (d) { M.markPosted(findPost(d, postId), key, "", M.nowIso()); }, "Posted to " + label + ": " + title, postId).then(function () {
      ctx.toast("Marked as posted on " + label, function () {
        ctx.update(function (d) { M.unmarkPosted(findPost(d, postId), key, before, M.nowIso()); }, "Marked “" + title + "” as not posted on " + label, postId)
          .catch(function (err) { window.CM.components.reportFailure(ctx, err); });
      });
    }).catch(function (err) { window.CM.components.reportFailure(ctx, err); });
  }

  // Saves the answer, then asks Claude to write the post up. "Sent to Claude" is shown only once the answer is saved.
  function sendAnswer(ctx, button, postId, needId, text) {
    const C = window.CM.components, M = ctx.model;
    button.disabled = true;
    ctx.update(function (d) { M.answerNeed(findPost(d, postId), needId, text, M.nowIso()); },
      "Sent Claude the answer for: " + M.titleOf(findPost(ctx.data, postId)), postId)
      .then(function () {
        delete drafts[needId];
        ctx.toast("Sent to Claude");
        return ctx.runJob("write-posts");
      })
      .catch(function (err) { button.disabled = false; C.reportFailure(ctx, err); });
  }

  function onClick(ctx) {
    return function (e) {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const postId = el.getAttribute("data-post"), key = el.getAttribute("data-platform"), needId = el.getAttribute("data-need");
      const post = findPost(ctx.data, postId);
      switch (el.getAttribute("data-action")) {
        case "open":
          ctx.openPost(postId);
          break;
        case "add-file":
          ctx.openPost(postId, "media");
          break;
        case "copy": {
          const text = post.platforms[key].text;
          if (!text) { ctx.toast("There are no words for " + ctx.model.platform(key).label + " yet"); return; }
          ui.copyText(text).then(function (ok) { ctx.toast(ok ? "Copied" : "Couldn’t copy. Open the post and copy the words from there"); });
          break;
        }
        case "posted":
          markPosted(ctx, post, key);
          break;
        case "need-done":
          ctx.update(function (d) {
            findPost(d, postId).needs.find(function (n) { return n.id === needId; }).done = true;
          }, "Done: " + post.needs.find(function (n) { return n.id === needId; }).text, postId);
          break;
        case "send-answer": {
          const text = (drafts[needId] || "").trim();
          if (!text) { ctx.toast("Write a few words first"); return; }
          sendAnswer(ctx, el, postId, needId, text);
          break;
        }
      }
    };
  }

  // Remembers what is typed in an answer box, so a redraw never loses it
  function onInput(e) {
    const id = e.target.getAttribute("data-draft");
    if (id) drafts[id] = e.target.value;
  }

  CM.views.todo = {
    title: "To do",
    line: function (ctx) {
      const t = ctx.model.todo(ctx.data, ctx.today());
      const total = ctx.model.todoTotal(t);
      const urgent = t.overdue.length + t.today.length;
      if (!total) return "Nothing waiting on you";
      return total + (total === 1 ? " thing" : " things") + " waiting, " + urgent + " due today or overdue";
    },
    render: function (root, ctx) {
      const C = window.CM.components, M = ctx.model;
      const t = M.todo(ctx.data, ctx.today());
      const body = GROUPS.map(function (g) { return group(g, t[g.key], M); }).join("");
      root.innerHTML = '<div class="todo-page">' + (body || C.emptyState("Nothing waiting on you", "When Claude plans posts that need a photo, a check from you or posting on the day, they show here.")) + "</div>";
      root.onclick = onClick(ctx);
      root.oninput = onInput;
    }
  };
})();
