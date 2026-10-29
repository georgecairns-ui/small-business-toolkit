# Connect Fathom

What it gives your app: Calls entries and drafted follow-ups from call recordings, with the actions waiting in Review.

**Connector:** "Fathom - Your Meeting Intelligence Layer" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://api.fathom.ai/mcp`. **Plans:** needs a paid Fathom plan (Premium, Team, Business or Enterprise; not Free); any Claude plan works for the connector.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your call recordings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Fathom - Your Meeting Intelligence Layer", then Connect, then sign in to Fathom and approve.
   If it isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Fathom" and use exactly `https://api.fathom.ai/mcp`. Then sign in and approve. Use no other address.

## If there's no connector

Say exactly: "There's no Claude connector for Fathom, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. On the Free Fathom plan the connector isn't available, so this section applies. If Fathom emails a summary after each call, you can read those through the Gmail or Microsoft 365 connection.

## Prove it

Ask first, then list the most recent meetings. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `get_identity`, `list_teams`, `list_meetings`, `get_meeting_summary`, `get_meeting_transcript`, `find_person`, `search_meetings`. There are no write tools documented for this connector.

Pre-approve for check-ins: `get_identity`, `list_teams`, `list_meetings`, `get_meeting_summary`, `get_meeting_transcript`, `find_person`, `search_meetings`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `fathom`: name "Fathom", status `connected`, how "Claude connector: Fathom", checked today, note "Read meeting summaries and transcripts. Fathom has no write tools."

`context/tools.md`: "Fathom | Claude connector | <today> | Read meeting summaries and transcripts | Nothing else; Fathom has no write tools"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/fathom
- https://developers.fathom.ai/mcp-docs/claude
- https://developers.fathom.ai/quickstart
- https://developers.fathom.ai/api-reference/meetings/list-meetings
- https://www.fathom.ai/pricing
