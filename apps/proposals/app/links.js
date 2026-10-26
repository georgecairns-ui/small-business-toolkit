/*
  LINKS: how the app reaches the outside world
  --------------------------------------------
  The app never sends anything and holds no passwords or keys. Instead it opens an email for the
  person to check and send themselves: the covering email for a proposal, or a follow-up. It
  opens in Gmail, Outlook or their email app, already written and addressed. They attach the PDF
  and press send. Which one is used comes from settings.emailProvider.
*/
(function () {
  "use strict";

  const enc = encodeURIComponent;

  function emailLabel(provider) {
    return { gmail: "Gmail", "outlook-work": "Outlook" }[provider] || "your email app";
  }

  // A new, filled-in email. draft = { to, cc, subject, body }
  function composeUrl(draft, provider) {
    const to = draft.to || "", cc = draft.cc || "", subject = draft.subject || "", body = draft.body || "";
    if (provider === "gmail") {
      return "https://mail.google.com/mail/?view=cm&fs=1&to=" + enc(to) + (cc ? "&cc=" + enc(cc) : "") + "&su=" + enc(subject) + "&body=" + enc(body);
    }
    // Outlook on the web, for work and school (Microsoft 365) accounts. Outlook.com has no
    // reliable link for this, so it falls through to the computer's email app below.
    if (provider === "outlook-work") {
      return "https://outlook.office.com/mail/deeplink/compose?to=" + enc(to) + "&subject=" + enc(subject) + "&body=" + enc(body) + (cc ? "&cc=" + enc(cc) : "");
    }
    return "mailto:" + enc(to).replace(/%40/g, "@").replace(/%2C/gi, ",") + "?" + (cc ? "cc=" + enc(cc) + "&" : "") + "subject=" + enc(subject) + "&body=" + enc(body);
  }

  function open(url) {
    if (/^mailto:/.test(url)) { window.location.href = url; return; }
    window.open(url, "_blank", "noopener");
  }

  window.PO = window.PO || {};
  window.PO.links = { emailLabel: emailLabel, composeUrl: composeUrl, open: open };
})();
