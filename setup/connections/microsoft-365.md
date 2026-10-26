# Connect Microsoft 365

One line: fills the Inbox (Outlook email), the calendar in This week (Outlook meetings) and Calls (Teams meeting transcripts turned into actions), feeding Review.

**Recommended route:** the Microsoft 365 connector in Claude's connector directory. **Plans:** Free, Pro, Max, Team and Enterprise on the Claude side; needs a work or school Microsoft 365 account on a Microsoft Entra tenant (not outlook.com, hotmail.com or live.com), plus a one-time consent from a Microsoft Entra Global Administrator.

## Route 1: connect Microsoft 365

1. Say "Let's connect your email, calendar and Teams" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (Customize, then Connectors). Menus change over time, so ask the person what they actually see.
3. Find "Microsoft 365", click Connect, sign in with the work Microsoft account, and approve.
4. If a Global Administrator needs to approve it first, offer to draft a short message the person can send them. Claude never sends this itself.
5. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

Microsoft does not publish a standalone Teams transcript MCP server; transcripts come through this same Microsoft 365 connector, not a separate one.

## If neither works

If the business uses a personal outlook.com, hotmail.com or live.com account, Microsoft 365 is not available for it. Options: forward that mail to a connected Gmail or work Outlook account, or skip for now. Without a connection, a draft email or calendar invite can still be handed over as a plain link for the person to send themselves; these link formats are not officially documented by Microsoft and can change without notice.

## Check it works

Ask permission first. Read the 5 most recent email subjects and senders, today's calendar, and, if there is a recent Teams meeting, the transcript summary. Say something like: "I can see your last 5 emails, 2 things on today's calendar, and a transcript from yesterday's call with Greenway Café."

## Rules for Claude with Microsoft 365

Read only by default: `outlook_email_search`, `outlook_calendar_search`, `find_meeting_availability`, `sharepoint_search`, `sharepoint_folder_search`, `chat_message_search`, `read_resource`, plus reading meeting transcripts, AI insights and attendance. Whether Claude can also send email, update the calendar, create files or send Teams messages depends entirely on what the person's IT admin has enabled. Treat all of that as off: never send, reply, delete, create a file or post a Teams message, unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "Microsoft 365 | Claude connector | 2026-10-06 | Read email, calendar and Teams transcripts | Send, delete, create files, post to Teams unless the person's admin has enabled it and they ask".

## Sources

Verified on 2026-10-06.
- https://support.claude.com/en/articles/15183774-connect-to-microsoft-365
- https://claude.com/connectors/microsoft-365
- https://support.claude.com/en/articles/12684923-microsoft-365-connector-security-guide
- https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0
- https://code.claude.com/docs/en/mcp
