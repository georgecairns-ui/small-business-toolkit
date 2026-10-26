# Connect Gmail and Google Calendar

One line: fills the Inbox (draft emails waiting for a reply), the calendar in This week (today's and this week's meetings) and feeds new tasks into Review.

**Recommended route:** the Gmail and Google Calendar connectors in Claude's connector directory. **Plans:** free for both, available on Claude and Claude Desktop for all users; Team and Enterprise need an Owner to switch them on first.

## Route 1: connect Gmail and Google Calendar

1. Say "Let's connect your email and calendar" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (Customize, then Connectors, or the + button then Connectors in a chat). Menus change over time, so ask the person what they actually see on their screen.
3. Find "Gmail", click Connect, sign in with the business Google account, and approve.
4. Repeat for "Google Calendar".
5. In Claude Code: both appear automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

## If neither works

If the business uses a different email provider (iCloud, Yahoo, a hosting company's email), there is no ready-made connector. Options, in order: forward that mail to a Gmail or Outlook account that is already connected, or skip connecting email for now and ask the person to forward or paste anything important.

## Check it works

Ask permission first: "Can I take a quick look at your last few emails and today's calendar?" Then read the 5 most recent subjects and senders, and today's calendar. Say something like: "I can see your last 5 emails and 2 things on today's calendar, the first at 10am with Tom at Greenway Café."

## Rules for Claude with Gmail and Google Calendar

Gmail: read and `create_draft` only. Never use `send_message`, `reply` or `forward`, unless the person asks for that one specific email in this conversation. Attachments: metadata only, not content.

Google Calendar: read only (`list_calendars`, `list_events`, `get_event`, `search_events`, `suggest_time`). Never use `create_event`, `update_event`, `delete_event` or `respond_to_event` unless the person asks for that one specific event.

## What to record

Add to `context/tools.md`:
- "Gmail | Claude connector | 2026-10-06 | Read, prepare drafts | Send, delete, archive, label, unsubscribe"
- "Google Calendar | Claude connector | 2026-10-06 | Read | Create, change or accept events unless asked for that one event"

## Sources

Verified on 2026-10-06.
- https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- https://claude.com/connectors/gmail
- https://claude.com/connectors/google-calendar
- https://code.claude.com/docs/en/mcp
