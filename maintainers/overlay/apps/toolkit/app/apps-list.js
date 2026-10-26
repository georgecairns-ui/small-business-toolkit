/*
  THE LIST: every app the toolkit can connect to, and the 7 tools
  ---------------------------------------------------------------
  One entry per guide in setup/connections/ (README.md aside). If a guide is added there, add it here
  too, with the same file name as its id. The ids are the keys Claude uses in data/toolkit.json
  under "connections".

    { id, name, group, guide, usedBy: [tool ids], what: "one plain line on what connecting it does" }

  KEY_APPS is what Next steps on Home and the "needs" lines lean on: email and calendar for everyone,
  then what each tool can't work without. Each need is a list of apps where any one of them will do.

  Loaded by the app and by Home (menu.json "home.scripts"), before app/model.js.
*/
(function () {
  "use strict";

  const GROUPS = ["Email and calendar", "Calls", "Sales and customers", "Money", "Ads", "Files and notes", "Team and bookings"];

  const CALLS_USED_BY = ["task-list", "pipeline", "proposals"];
  const APPS = [
    // Email and calendar
    { id: "gmail-and-google-calendar", name: "Gmail and Google Calendar", group: "Email and calendar", usedBy: ["task-list", "pipeline", "proposals"], what: "Claude reads your email and meetings, drafts replies for you to send and turns requests into tasks." },
    { id: "microsoft-365", name: "Microsoft 365", group: "Email and calendar", usedBy: ["task-list", "pipeline", "proposals"], what: "The same for Outlook email and calendar, plus Teams call transcripts." },
    // Calls
    { id: "fathom", name: "Fathom", group: "Calls", usedBy: CALLS_USED_BY, what: "Your call recordings become notes, follow-ups and tasks." },
    { id: "fireflies", name: "Fireflies", group: "Calls", usedBy: CALLS_USED_BY, what: "Your call recordings become notes, follow-ups and tasks." },
    { id: "granola", name: "Granola", group: "Calls", usedBy: CALLS_USED_BY, what: "Your call notes become follow-ups and tasks." },
    { id: "otter", name: "Otter", group: "Calls", usedBy: CALLS_USED_BY, what: "Your call recordings become notes, follow-ups and tasks." },
    { id: "read-ai", name: "Read AI", group: "Calls", usedBy: CALLS_USED_BY, what: "Your meeting reports become follow-ups and tasks." },
    { id: "tldv", name: "tl;dv", group: "Calls", usedBy: CALLS_USED_BY, what: "Your Google Meet, Zoom and Teams recordings become follow-ups and tasks." },
    { id: "zoom", name: "Zoom", group: "Calls", usedBy: CALLS_USED_BY, what: "Your Zoom recordings and meeting summaries become follow-ups and tasks." },
    // Sales and customers
    { id: "hubspot", name: "HubSpot", group: "Sales and customers", usedBy: ["task-list", "pipeline"], what: "Claude sees your contacts and deals, and spots the ones going quiet." },
    { id: "pipedrive", name: "Pipedrive", group: "Sales and customers", usedBy: ["task-list", "pipeline"], what: "Claude sees your contacts and deals, and spots the ones going quiet." },
    // Money
    { id: "xero", name: "Xero", group: "Money", usedBy: ["task-list", "money"], what: "Claude reads your invoices, bills and cash, so your money view stays up to date." },
    { id: "xero-drafts", name: "Xero drafts", group: "Money", usedBy: ["money"], what: "Optional: lets Claude put an invoice into Xero as a draft for you to check and send." },
    { id: "bank-feeds", name: "Bank feed", group: "Money", usedBy: ["money"], what: "Switches on your business bank feed in your accounts app, so Claude sees what's in the bank. Read only." },
    { id: "quickbooks", name: "QuickBooks", group: "Money", usedBy: ["task-list", "money"], what: "Claude reads your invoices, payments and bank, so your money view stays up to date. Only where Claude offers the QuickBooks connection." },
    { id: "freeagent", name: "FreeAgent", group: "Money", usedBy: ["task-list"], what: "Claude works from a report you save into your files folder." },
    { id: "sage", name: "Sage", group: "Money", usedBy: ["money"], what: "Not supported yet. Claude can tell you where things stand." },
    { id: "stripe", name: "Stripe", group: "Money", usedBy: ["task-list"], what: "Claude spots payments to follow up and failed charges." },
    // Ads
    { id: "meta-ads", name: "Meta Ads", group: "Ads", usedBy: ["ads"], what: "Claude reads your Facebook and Instagram ads and builds new ones switched off." },
    { id: "google-ads", name: "Google Ads", group: "Ads", usedBy: ["ads"], what: "Claude reads your Google Ads figures. It can't change anything." },
    // Files and notes
    { id: "google-drive", name: "Google Drive", group: "Files and notes", usedBy: ["task-list", "proposals"], what: "Claude finds the files you already keep, and your Google Meet notes." },
    { id: "notion", name: "Notion", group: "Files and notes", usedBy: ["task-list"], what: "Claude reads your notes, pages and project trackers." },
    // Team and bookings
    { id: "slack", name: "Slack", group: "Team and bookings", usedBy: ["task-list"], what: "Requests from your team in chat turn into tasks." },
    { id: "calendly", name: "Calendly", group: "Team and bookings", usedBy: ["task-list", "pipeline"], what: "Claude sees who has booked a call, so you're prepared for it." }
  ].map(function (a) { return Object.assign({ guide: "setup/connections/" + a.id + ".md" }, a); });

  // The 7 tools, in the sidebar's order. "part" is the heading of the tool's part of START-HERE.md.
  const TOOLS = [
    { id: "task-list", name: "Task List OS", icon: "checkSquare", what: "Your tasks, inbox and calls in one place." },
    { id: "pipeline", name: "Pipeline OS", icon: "trendingUp", what: "Every deal, where it's up to and what's next." },
    { id: "skill-map", name: "Skill and Folder Map OS", icon: "map", what: "A map of your skills and folders, and what to tidy." },
    { id: "proposals", name: "Proposal Writing OS", icon: "fileText", what: "Proposals written in your words, from your client folders." },
    { id: "content", name: "Content Machine OS", icon: "megaphone", what: "Your posts planned, written and scored." },
    { id: "money", name: "Money View OS", icon: "wallet", what: "Your money month by month, and what's coming." },
    { id: "ads", name: "Ads OS", icon: "barChart", what: "How your ads are doing, and new ones built switched off." }
  ];

  // What Next steps suggests connecting. anyOf: any one of these will do. tool: only once that tool is set up or part done.
  const KEY_APPS = [
    { label: "your email and calendar", anyOf: ["gmail-and-google-calendar", "microsoft-365"] },
    { label: "your accounts app", anyOf: ["xero", "quickbooks"], tool: "money" },
    { label: "your bank feed", anyOf: ["bank-feeds"], tool: "money" },
    { label: "your ad account", anyOf: ["meta-ads", "google-ads"], tool: "ads" }
  ];

  window.TK = window.TK || {};
  window.TK.list = { GROUPS: GROUPS, APPS: APPS, TOOLS: TOOLS, KEY_APPS: KEY_APPS };
})();
