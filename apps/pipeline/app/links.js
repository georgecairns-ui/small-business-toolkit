/*
  LINKS: the 2 ways the app reaches the outside world
  ---------------------------------------------------
  The app never sends anything and holds no passwords or keys. Instead it opens things for the
  person to check and finish themselves:
    - "Draft" opens a new email, already written and addressed, in Gmail, Outlook or their
      email app. They read it and press send.
    - "Add to calendar" opens a new calendar event, already filled in, in Google Calendar or
      Outlook. They press save. For other calendars (Apple and others) it downloads a standard
      calendar file (.ics) that any calendar app can open.
  Which one is used comes from settings.emailProvider and settings.calendarProvider.
*/
(function () {
  "use strict";

  const enc = encodeURIComponent;

  const EMAIL_PROVIDERS = [
    { key: "gmail", label: "Gmail or Google Workspace" },
    { key: "outlook-work", label: "Outlook (Microsoft 365, work or school)" },
    { key: "outlook-personal", label: "Outlook.com or Hotmail (opens your email app)" },
    { key: "other", label: "Your computer's email app" }
  ];
  const CALENDAR_PROVIDERS = [
    { key: "google", label: "Google Calendar" },
    { key: "outlook-work", label: "Outlook (Microsoft 365, work or school)" },
    { key: "outlook-personal", label: "Outlook.com" },
    { key: "other", label: "Apple Calendar or another app (.ics file)" }
  ];

  function emailLabel(provider) {
    return { gmail: "Gmail", "outlook-work": "Outlook" }[provider] || "your email app";
  }
  function calendarLabel(provider) {
    return { google: "Google Calendar", "outlook-work": "Outlook", "outlook-personal": "Outlook" }[provider] || "your calendar";
  }

  // A new, filled-in email. draft = { to, cc, subject, body }
  function composeUrl(draft, provider) {
    const to = draft.to || "", cc = draft.cc || "", bcc = draft.bcc || "", subject = draft.subject || "", body = draft.body || "";
    if (provider === "gmail") {
      return "https://mail.google.com/mail/?view=cm&fs=1&to=" + enc(to) + (cc ? "&cc=" + enc(cc) : "") + (bcc ? "&bcc=" + enc(bcc) : "") + "&su=" + enc(subject) + "&body=" + enc(body);
    }
    // Outlook on the web, for work and school (Microsoft 365) accounts. Outlook.com has no
    // reliable link for this, so it falls through to the computer's email app below.
    // Bcc on this link isn't documented by Microsoft; group emails also offer "Copy the addresses".
    if (provider === "outlook-work") {
      return "https://outlook.office.com/mail/deeplink/compose?to=" + enc(to) + "&subject=" + enc(subject) + "&body=" + enc(body) + (cc ? "&cc=" + enc(cc) : "") + (bcc ? "&bcc=" + enc(bcc) : "");
    }
    return "mailto:" + enc(to).replace(/%40/g, "@").replace(/%2C/gi, ",") + "?" + (cc ? "cc=" + enc(cc) + "&" : "") + (bcc ? "bcc=" + enc(bcc).replace(/%40/g, "@").replace(/%2C/gi, ",") + "&" : "") + "subject=" + enc(subject) + "&body=" + enc(body);
  }

  // "2026-10-06" + "14:30" + 45 minutes, as local date-time pieces
  function range(date, time, minutes) {
    const start = new Date(date + "T" + (time || "09:00") + ":00");
    const end = new Date(start.getTime() + (minutes || 30) * 60000);
    return { start: start, end: end };
  }
  const pad = function (n) { return String(n).padStart(2, "0"); };
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00"; }
  function localIso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00"; }

  // A new, filled-in calendar event. ev = { title, date, time, minutes, details, location }
  function calendarUrl(ev, provider) {
    const r = range(ev.date, ev.time, ev.minutes);
    if (provider === "google") {
      return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + enc(ev.title) +
        "&dates=" + stamp(r.start) + "/" + stamp(r.end) + "&details=" + enc(ev.details || "") + (ev.location ? "&location=" + enc(ev.location) : "") + (ev.guests ? "&add=" + enc(ev.guests) : "");
    }
    if (provider === "outlook-work" || provider === "outlook-personal") {
      const host = provider === "outlook-work" ? "https://outlook.office.com" : "https://outlook.live.com";
      return host + "/calendar/deeplink/compose?subject=" + enc(ev.title) + "&startdt=" + enc(localIso(r.start)) + "&enddt=" + enc(localIso(r.end)) +
        "&body=" + enc(ev.details || "") + (ev.location ? "&location=" + enc(ev.location) : "") + (ev.guests ? "&to=" + enc(ev.guests) : "");
    }
    return null; // other calendars use the .ics download below
  }

  // A standard calendar file any calendar app can open
  function downloadIcs(ev) {
    const r = range(ev.date, ev.time, ev.minutes);
    const esc = function (s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); };
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pipeline OS//EN", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@task-list-os", "DTSTAMP:" + stamp(new Date()),
      "DTSTART:" + stamp(r.start), "DTEND:" + stamp(r.end),
      "SUMMARY:" + esc(ev.title), "DESCRIPTION:" + esc(ev.details), ev.location ? "LOCATION:" + esc(ev.location) : "",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([lines], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (ev.title || "event").replace(/[^\w\s-]/g, "").trim().slice(0, 60) + ".ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // Open a link in a new tab (email and calendar sites), or the email app (mailto)
  function open(url) {
    if (/^mailto:/.test(url)) { window.location.href = url; return; }
    window.open(url, "_blank", "noopener");
  }

  window.PL = window.PL || {};
  window.PL.links = {
    EMAIL_PROVIDERS: EMAIL_PROVIDERS, CALENDAR_PROVIDERS: CALENDAR_PROVIDERS,
    emailLabel: emailLabel, calendarLabel: calendarLabel,
    composeUrl: composeUrl, calendarUrl: calendarUrl, downloadIcs: downloadIcs, open: open
  };
})();
