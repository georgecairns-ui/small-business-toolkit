# Connect Read AI

What it gives your app: Calls entries and drafted follow-ups from meeting recordings, with the actions waiting in Review.

**Connector:** "Read AI" in Claude's connector directory (built by Read AI, added in May 2026, marked Anthropic verified; in open beta). **Plans:** available to all users regardless of plan or workspace; if the business is on a Read AI workspace, Downloads must be enabled in Workspace Settings, Reports and Sharing.
**Route:** directory.

## Connect

1. Say "Let's connect your meeting reports." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then search "Read AI", then Connect to Claude, then sign in and Allow Access.
Read AI says this connector works across Claude Desktop, Claude web and Claude Code once connected.

## If there's no connector

Say exactly: "There's no Claude connector for Read AI, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. If Read AI emails a report after each meeting, you can read those through the Gmail or Microsoft 365 connection.

## Prove it

Ask first, then list the most recent meetings. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `get_meeting_by_id`, `list_meetings`. Read AI's own connector also lists 2 write tools, "Create meeting agent" (sends a bot to join a call) and "Share meeting report" (can email an invite to a report). Never use either of these unless the person asks for that one specific action in this conversation.

Pre-approve for check-ins: `get_meeting_by_id`, `list_meetings`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `read-ai`: name "Read AI", status `connected`, how "Claude connector: Read AI", checked today, note "Read meeting reports. Never send a bot to a call or share a report."

`context/tools.md`: "Read AI | Claude connector | <today> | Read meeting reports | Create meeting agent, share meeting report, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/read-ai
- https://support.read.ai/hc/en-us/articles/49379985941523-Read-AI-API-and-MCP-Overview
- https://support.read.ai/hc/en-us/articles/54786334602003-Connecting-the-Read-AI-MCP-Server-to-Claude
- https://support.read.ai/hc/en-us/articles/49381158409491-MCP-Server
- https://support.read.ai/hc/en-us/articles/49380809380371-API-Keys-Authentication
- https://support.read.ai/hc/en-us/articles/49381161088659-API-Reference
