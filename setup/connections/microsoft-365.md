# Connect Microsoft 365

What it gives your app: the Inbox (Outlook email), the calendar in This week (Outlook meetings) and Calls (Teams meeting transcripts turned into actions), feeding Review.

**Connector:** "Microsoft 365" in Claude's connector directory. **Plans:** Free, Pro, Max, Team and Enterprise on the Claude side; needs a work or school Microsoft 365 account on a Microsoft Entra tenant (not outlook.com, hotmail.com or live.com), plus a one-time consent from a Microsoft Entra Global Administrator.
**Route:** directory.

## Connect

1. Say "Let's connect your email, calendar and Teams." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Microsoft 365", then Connect. They sign in with the work Microsoft account and approve.
4. If a Global Administrator needs to approve it first, offer to draft a short message the person can send them. Claude never sends this itself.

Microsoft does not publish a standalone Teams transcript connector; transcripts come through this same Microsoft 365 connector.

## If their email isn't a work account

If the business uses a personal outlook.com, hotmail.com or live.com account, Microsoft 365 is not available for it, and there's no Claude connector for it. Say plainly: "There's no Claude connector for [provider], so I can't connect to your email live." Offer the one alternative: forward work email to a Gmail account and connect that (`setup/connections/gmail-and-google-calendar.md`). Record it as `no-connector`. The rest of setup still works without email.

## Prove it

Ask first: "Can I take a quick look at your last few emails and today's calendar?" Read the 5 most recent subjects and senders, today's calendar, and, if there is a recent Teams meeting, the transcript summary. Say: "I can see your last 5 emails, 2 things on today's calendar, and a transcript from yesterday's call with Greenway Café."

## What Claude may and may not do

Read only by default: `outlook_email_search`, `outlook_calendar_search`, `find_meeting_availability`, `sharepoint_search`, `sharepoint_folder_search`, `chat_message_search`, `read_resource`, plus reading meeting transcripts, AI insights and attendance. Whether Claude can also send email, update the calendar, create files or send Teams messages depends entirely on what the person's IT admin has enabled. Treat all of that as off: never send, reply, forward, delete, move, create a file or post a Teams message, unless the person asks for that one specific action in this conversation.

Pre-approve for check-ins, read-only tools only: `outlook_email_search`, `outlook_calendar_search`, `find_meeting_availability`, `sharepoint_search`, `sharepoint_folder_search`, `chat_message_search`, `read_resource`. Nothing that sends, replies, forwards, deletes, moves, creates or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `microsoft-365`: name "Microsoft 365", status `connected`, how "Claude connector: Microsoft 365", checked today, note "Read email, calendar and Teams transcripts. Never send, delete, create files or post to Teams."

`context/tools.md`: "Microsoft 365 | Claude connector | <today> | Read email, calendar and Teams transcripts | Send, delete, create files, post to Teams unless the person's admin has enabled it and they ask".

## Sources

Verified on 2026-10-06.
- https://support.claude.com/en/articles/15183774-connect-to-microsoft-365
- https://claude.com/connectors/microsoft-365
- https://support.claude.com/en/articles/12684923-microsoft-365-connector-security-guide
- https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0
