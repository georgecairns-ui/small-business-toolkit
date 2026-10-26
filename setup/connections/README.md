# Connecting apps: which guide to follow

Use `skills/connect-a-tool/SKILL.md` for the general method (order of preference, safety rules, never ask for a key in chat). This folder has the specifics for each app. Follow the file for the app the person names.

| App | What it gives Task List OS | Recommended route | File |
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
| QuickBooks Online | Unpaid invoices and estimates in Review (US customers only) | Claude connector | `quickbooks.md` |
| FreeAgent | Unpaid invoices and bills due in Review | CSV export into `files/` (no official connector) | `freeagent.md` |
| HubSpot | Contacts in People, deals going quiet and tickets needing a reply in Review | Claude connector | `hubspot.md` |
| Pipedrive | Contacts in People, deals going quiet in Review | Claude connector | `pipedrive.md` |
| Slack | Requests from the team in Review | Claude connector | `slack.md` |
| Notion | Notes and project trackers in People and Review | Claude connector | `notion.md` |
| Stripe | Payments to follow up on and failed charges in Review | Claude connector | `stripe.md` |
| Calendly | Upcoming bookings in Calendar and People | Claude connector | `calendly.md` |

Default for every app: read, and prepare drafts where the app allows. Claude never sends, pays, deletes, posts, cancels or changes anything on the person's behalf unless they ask for that one specific action in that conversation. Record every connection in `context/tools.md` once it is working.
