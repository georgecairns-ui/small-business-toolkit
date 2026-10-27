/*
  PREFERENCES: the person's own settings
  --------------------------------------
  Their name and business, who signs the proposals, the sections a proposal has (rename,
  reorder, switch off), whether Claude writes a proposal as soon as a new client folder appears,
  when to nudge a sent proposal, where emails open, and the look.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.PO.model, C = window.PO.c;
  window.PO.views = window.PO.views || {};

  const EMAIL = [
    { key: "gmail", label: "Gmail" }, { key: "outlook-work", label: "Outlook (work account)" },
    { key: "outlook-personal", label: "Outlook.com or Hotmail" }, { key: "other", label: "Another email app" }
  ];

  function sectionRow(s, i, total) {
    return '<li class="pref-cat sec-row" data-key="' + esc(s.key) + '">' +
      '<label class="switch" title="Include this section"><input type="checkbox" name="on"' + (s.on ? " checked" : "") + '><span class="switch__track"></span></label>' +
      '<input class="input pref-cat__label" name="label" maxlength="60" value="' + esc(s.label) + '" aria-label="Section name">' +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="sec-up" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">" + '<span class="rot">' + icon("chevronDown") + "</span></button>" +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="sec-down" aria-label="Move down"' + (i === total - 1 ? " disabled" : "") + ">" + icon("chevronDown") + "</button>" +
      (s.key === "terms" ? '<span class="pref-cat__note">Your own terms only</span>' : "") + "</li>";
  }

  window.PO.views.preferences = {
    title: function () { return "Preferences"; },
    sub: function () { return "How your proposals work"; },
    render: function (c) {
      const d = c.d, s = d.settings, so = s.signOff;
      const info = c.storeInfo();
      return '<div class="page page--narrow"><form class="prefs" data-form="preferences" autocomplete="off">' +
        '<section class="panel pref"><h2 class="pref__title">You and your business</h2><div class="pref__body">' +
        '<div class="field-row"><label class="field"><span class="field__label">Your first name</span><input class="input" name="yourName" maxlength="40" value="' + esc(s.yourName) + '"></label>' +
        '<label class="field"><span class="field__label">Business name</span><input class="input" name="businessName" maxlength="80" value="' + esc(s.businessName) + '"></label></div>' +
        '<h3 class="pref__sub-title">Who signs the proposals</h3>' +
        '<div class="field-row"><label class="field"><span class="field__label">Name</span><input class="input" name="soName" maxlength="80" value="' + esc(so.name) + '"></label>' +
        '<label class="field"><span class="field__label">Role</span><input class="input" name="soRole" maxlength="80" value="' + esc(so.role) + '" placeholder="Founder"></label></div>' +
        '<div class="field-row"><label class="field"><span class="field__label">Email</span><input class="input" type="email" name="soEmail" maxlength="120" value="' + esc(so.email) + '"></label>' +
        '<label class="field"><span class="field__label">Phone</span><input class="input" name="soPhone" maxlength="40" value="' + esc(so.phone) + '"></label></div>' +
        "</div></section>" +

        '<section class="panel pref"><h2 class="pref__title">The sections of a proposal</h2><p class="pref__intro muted">Every proposal opens with a cover, a short note and the contents, then these, in this order. Rename them in your own words. Claude follows them every time.</p>' +
        '<ol class="pref-cats" id="prefSections">' + s.sections.map(function (x, i) { return sectionRow(x, i, s.sections.length); }).join("") + "</ol></section>" +

        '<section class="panel pref"><h2 class="pref__title">How Claude works</h2><div class="pref__body">' +
        '<div class="pref-row"><span><strong>Write a proposal when a new client folder appears</strong><span class="muted"> When Claude checks your client folders and finds a new one with enough in it</span></span><label class="switch"><input type="checkbox" name="autoWrite"' + (s.autoWrite ? " checked" : "") + '><span class="switch__track"></span></label></div>' +
        '<div class="field-row"><label class="field"><span class="field__label">Nudge a sent proposal after (days)</span><input class="input num" type="number" name="chaseAfterDays" min="1" max="60" value="' + esc(s.chaseAfterDays) + '"></label>' +
        '<label class="field"><span class="field__label">Emails open in</span><select class="select" name="emailProvider">' + EMAIL.map(function (e) { return '<option value="' + e.key + '"' + (s.emailProvider === e.key ? " selected" : "") + ">" + esc(e.label) + "</option>"; }).join("") + "</select></label></div>" +
        '<label class="field"><span class="field__label">Where your client folders live</span><input class="input" name="clientsFolder" maxlength="200" value="' + esc(s.clientsFolder) + '"><span class="field__hint">Inside this folder. To use folders somewhere else, such as Google Drive, ask Claude: “my client folders are in Google Drive”.</span></label>' +
        "</div></section>" +

        '<section class="panel pref"><h2 class="pref__title">The look</h2><div class="pref__body">' +
        '<div class="pref-row"><span><strong>Light or dark</strong><span class="muted"> For the app. Proposals always print on white</span></span><button type="button" class="btn btn--sm" data-theme-toggle>' + icon("moon") + "Switch</button></div>" +
        '<div class="pref-row"><span><strong>Your brand on every proposal</strong><span class="muted"> Your logo, colours and fonts, from your website or brand guidelines</span></span>' + C.say("Make my proposals match my brand") + "</div>" +
        '<div class="pref-row"><span><strong>Your own proposal skill</strong><span class="muted"> ' + esc(s.ownSkill ? "Claude follows /" + s.ownSkill + " for every proposal" : "Claude builds it in setup, from your answers and templates") + "</span></span>" + C.say("Rebuild my proposal skill") + "</div>" +
        '<div class="pref-row"><span><strong>Copy a proposal you like</strong><span class="muted"> ' + esc(s.template.name ? "Using " + s.template.name : "Drop in an old proposal or a template, and Claude follows its layout and wording") + "</span></span>" + C.say("Import my proposal template") + "</div>" +
        "</div></section>" +

        '<section class="panel pref"><h2 class="pref__title">Where it’s saved</h2><div class="settings-folder"><p>' + esc(info.folder) + "</p>" +
        (info.canChange ? '<button type="button" class="btn btn--sm" data-action="change-folder">' + icon("folder") + "Use a different folder</button>" : "") + "</div></section>" +
        '<div class="prefs__save"><button type="submit" class="btn btn--primary">Save preferences</button></div></form></div>';
    },
    move: function (btn, dir) {
      const li = btn.closest("li"), list = li.parentNode;
      if (dir < 0 && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
      if (dir > 0 && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
      const items = list.querySelectorAll("li");
      items.forEach(function (x, i) {
        x.querySelector('[data-action="sec-up"]').disabled = i === 0;
        x.querySelector('[data-action="sec-down"]').disabled = i === items.length - 1;
      });
    },
    collect: function (form) {
      const e = form.elements;
      const sections = [];
      let error = "";
      form.querySelectorAll(".sec-row").forEach(function (li) {
        const label = li.querySelector('[name="label"]').value.trim();
        if (!label) error = "Give every section a name.";
        sections.push({ key: li.getAttribute("data-key"), label: label, on: li.querySelector('[name="on"]').checked });
      });
      if (!sections.some(function (s) { return s.on; })) error = "Keep at least one section switched on.";
      const folder = e.clientsFolder.value.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "").replace(/\/+$/, "");
      if (!folder || /(^|\/)\.\.(\/|$)/.test(folder)) error = "The client folders need to be inside your Small Business Toolkit folder.";
      return { error: error, sections: sections, values: {
        yourName: e.yourName.value.trim(), businessName: e.businessName.value.trim(),
        signOff: { name: e.soName.value.trim(), role: e.soRole.value.trim(), email: e.soEmail.value.trim(), phone: e.soPhone.value.trim() },
        autoWrite: e.autoWrite.checked, chaseAfterDays: Math.max(1, Math.round(Number(e.chaseAfterDays.value) || 7)),
        emailProvider: e.emailProvider.value, clientsFolder: folder } };
    }
  };
})();
