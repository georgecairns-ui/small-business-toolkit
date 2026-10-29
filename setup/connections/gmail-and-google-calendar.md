# Connect Gmail and Google Calendar

What it gives your app: the Inbox (draft emails waiting for a reply), the calendar in This week, and new tasks in Review.

**Connectors:** "Gmail" and "Google Calendar" in Claude's connector directory. **Plans:** free for both, on every Claude plan; on Team and Enterprise an Owner switches them on first.
**Route:** directory.

## Connect

1. Say "Let's connect your email and calendar." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Gmail", then Connect. They sign in with the business Google account and approve. Then the same for "Google Calendar".

## Prove it

Ask first: "Can I take a quick look at your last few emails and today's calendar?" Read the 5 most recent subjects and senders, and today's calendar. Say: "I can see your last 5 emails and 2 things on today's calendar, the first at 10am with Tom at Greenway Café."

## What Claude may and may not do

Gmail: read, and `create_draft` only when the person asks for that one email. Never `send_message`, `reply` or `forward` unless the person asks for that one specific email in this conversation. Attachments: metadata only.

Google Calendar: read only (`list_calendars`, `list_events`, `get_event`, `search_events`, `suggest_time`). Never `create_event`, `update_event`, `delete_event` or `respond_to_event` unless the person asks for that one event.

Pre-approve for check-ins: Gmail `search_threads`, `get_thread`, `get_message`, `list_labels`; Google Calendar `list_calendars`, `list_events`, `get_event`, `search_events`.

## Record

`apps/home/data/connections.json`, key `gmail-and-google-calendar`: name "Gmail and Google Calendar", status `connected`, how "Claude connectors: Gmail, Google Calendar", checked today, note "Read; prepare drafts. Never send, delete, archive or label."

`context/tools.md`: "Gmail | Claude connector | <today> | Read, prepare drafts | Send, delete, archive, label, unsubscribe" and "Google Calendar | Claude connector | <today> | Read | Create, change or accept events unless asked for that one event".

## Sources

Verified on 2026-10-06; the status check verified on 2026-10-28 in the Claude desktop app.
- https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- https://claude.com/connectors/gmail
- https://claude.com/connectors/google-calendar
