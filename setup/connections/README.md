# Connecting apps: which guide to follow

Use `.claude/skills/connect-a-tool/SKILL.md` for the general method (find the route, check or switch on the connection, prove it with a real read, record it, and what to do when there's no connector). This folder has the specifics for each app. Follow the file for the app the person names. Every guide has the same 6 sections, in the same order: Connect, If there's no connector, Prove it, What Claude may and may not do, Record, Sources. (Gmail and Google Calendar always has a connector, so its guide leaves out the second; Microsoft 365's is called "If their email isn't a work account".)

| App | What it gives your toolkit | Recommended route | File |
|---|---|---|---|
| Gmail | The Inbox (drafted emails waiting to be sent) and new tasks in Review | Claude connector | `gmail-and-google-calendar.md` |
| Google Calendar | Calendar (today's and this week's meetings) | Claude connector | `gmail-and-google-calendar.md` |
| Microsoft 365 (Outlook mail and calendar) | The Inbox and the calendar in This week | Claude connector | `microsoft-365.md` |
| Microsoft Teams meeting transcripts | Calls entries and follow-up tasks in Review | Claude connector (Microsoft 365) | `microsoft-365.md` |
| Google Drive | Files found for Review and People | Claude connector | `google-drive.md` |
| Google Meet transcripts and Gemini notes | Calls entries and follow-up tasks in Review | Claude connector (Google Drive, reading the "Google Meet" folder) | `google-drive.md` |
| Fathom | Calls entries and follow-up tasks in Review | Claude connector | `fathom.md` |
| Fireflies | Calls entries and follow-up tasks in Review | Claude connector | `fireflies.md` |
| Otter | Calls entries and follow-up tasks in Review | Claude connector | `otter.md` |
| Granola | Calls entries and follow-up tasks in Review | Claude connector | `granola.md` |
| tl;dv | Calls entries and follow-up tasks in Review (covers Google Meet, Zoom and Teams recordings) | Claude connector | `tldv.md` |
| Read AI | Calls entries and follow-up tasks in Review | Claude connector | `read-ai.md` |
| Zoom | Calls entries and follow-up tasks in Review | Claude connector | `zoom.md` |
| Xero | Unpaid invoices and bills due in Review, plus cash position and profit and loss | Claude connector (read-only) | `xero.md` |
| QuickBooks Online | Unpaid invoices and estimates in Review | Claude connector ("Intuit QuickBooks", US customers only); a CSV or PDF export into `files/` for everyone else | `quickbooks.md` |
| FreeAgent | Unpaid invoices and bills due in Review | CSV export into `files/` (no connector in Claude's directory on 29 October 2026) | `freeagent.md` |
| HubSpot | Contacts in People, deals going quiet and tickets needing a reply in Review | Claude connector | `hubspot.md` |
| Pipedrive | Contacts in People, deals going quiet in Review | Claude connector | `pipedrive.md` |
| Slack | Requests from the team in Review | Claude connector | `slack.md` |
| Notion | Notes and project trackers in People and Review | Claude connector | `notion.md` |
| Stripe | Payments to follow up on and failed charges in Review | Claude connector (Stripe's own sign-in) | `stripe.md` |
| Calendly | Upcoming bookings in Calendar and People | Claude connector | `calendly.md` |
| Sage | Nothing for Money View yet; an export can be read in chat when asked | None: no connector in Claude's directory on 29 October 2026 | `sage.md` |
| Bank feeds | Business bank transactions for Money View, through the accounts app's own bank feed | Switched on inside the accounts app | `bank-feeds.md` |
| Meta Ads | Ad figures for Ads OS, new campaigns built switched off, and changes you approve in the app (Ads OS only) | Meta's own connection; a downloaded report where there's no connector | `meta-ads.md` |
| Google Ads | Ad figures for Ads OS (read only) | Google's own connection; a downloaded report where there's no connector | `google-ads.md` |
| Xero, to put invoices in as drafts (optional, only when the person asks; never offered in setup) | Money View can create a draft invoice for the person to check and send from Xero | Xero's own open source connection, its own guide (not the 6 sections above) | `xero-drafts.md` |

Default for every app: read, and prepare drafts where the app allows. Claude never sends, pays, deletes, posts, cancels or changes anything on the person's behalf unless they ask for that one specific action in that conversation. Record every connection once a real read has worked (see "Recording a connection" below).

## Recording a connection

`apps/home/data/connections.json`. Claude creates it in setup; it never ships.

```json
{
  "version": 1,
  "connections": {
    "gmail-and-google-calendar": {
      "name": "Gmail and Google Calendar",
      "status": "connected",
      "how": "Claude connectors: Gmail, Google Calendar",
      "checked": "2026-10-28",
      "note": "Read; prepare drafts. Never send, delete, archive or label."
    },
    "sage": {
      "name": "Sage",
      "status": "export-only",
      "how": "CSV export into files/",
      "checked": "",
      "note": "No Claude connector"
    }
  }
}
```

- Key: the guide's file name in `setup/connections/` without `.md`. For an app with no guide, the app's name in lower case with hyphens (`my-booking-system`).
- `status`: one of `connected`, `needs-attention`, `export-only`, `no-connector`, `not-connected`, `not-used`.
- `checked`: `YYYY-MM-DD` of the last successful read. Required when `status` is `connected`.

Rules:
- Write `connected` only after a real read worked, with that day's date in `checked`.
- When a check-in's read fails, set `needs-attention`, keep the old `checked`, and say so in the check-in summary.
- `context/tools.md` stays as the note the person can read; `connections.json` is what the app shows.
