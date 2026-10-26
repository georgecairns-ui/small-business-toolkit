# Connect Read AI

One line: turns meeting recordings into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the Read AI connector in Claude's connector directory. **Plans:** available to all users regardless of plan or workspace; if the business is on a Read AI workspace, Downloads must be enabled in Workspace Settings, Reports and Sharing.

## Route 1: connect Read AI

1. Say "Let's connect your meeting reports" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Customize, Connectors, search "Read AI", click Connect to Claude, sign in, and Allow Access.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

Read AI says this connector works across Claude Desktop, Claude web and Claude Code once connected; it is in open beta.

## If neither works

There is no documented API key route: Read AI's API uses OAuth 2.1 with access tokens that expire after 10 minutes, which is not suitable for this setup. If the connector is not available, ask the person whether Read AI emails a report after each meeting; if so, read it through the Gmail or Microsoft 365 connection instead.

## Check it works

Ask permission, then list the most recent meetings. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

The connector, built by Read AI, was added to the directory in May 2026 and is marked Anthropic verified.

## Rules for Claude with Read AI

Read only: `get_meeting_by_id`, `list_meetings`. Read AI's own MCP also lists 2 write tools, "Create meeting agent" (sends a bot to join a call) and "Share meeting report" (can email an invite to a report). Never use either of these unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "Read AI | Claude connector | 2026-10-06 | Read meeting reports | Create meeting agent, share meeting report, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/read-ai
- https://support.read.ai/hc/en-us/articles/49379985941523-Read-AI-API-and-MCP-Overview
- https://support.read.ai/hc/en-us/articles/54786334602003-Connecting-the-Read-AI-MCP-Server-to-Claude
- https://support.read.ai/hc/en-us/articles/49381158409491-MCP-Server
- https://support.read.ai/hc/en-us/articles/49380809380371-API-Keys-Authentication
- https://support.read.ai/hc/en-us/articles/49381161088659-API-Reference
