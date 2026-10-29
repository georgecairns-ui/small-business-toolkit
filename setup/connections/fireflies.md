# Connect Fireflies

What it gives your app: Calls entries and drafted follow-ups from call recordings, with the actions waiting in Review.

**Connector:** "Fireflies" in Claude's connector directory. **Plans:** Fireflies says the connector needs a paid Claude plan (Pro, Team or Enterprise); which Fireflies plan it needs is not verified, check Fireflies' help page.
**Route:** directory.

## Connect

1. Say "Let's connect your call recordings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Fireflies", then Connect, then sign in with Google or Microsoft (recommended) and approve.

## If there's no connector

Say exactly: "There's no Claude connector for Fireflies, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. If Fireflies emails a summary after each call, you can read those through the Gmail or Microsoft 365 connection.

## Prove it

Ask first, then list the most recent transcripts. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `get_user`, `get_transcript`, `get_transcripts`. There are no write tools documented for this connector.

Pre-approve for check-ins: `get_user`, `get_transcript`, `get_transcripts`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `fireflies`: name "Fireflies", status `connected`, how "Claude connector: Fireflies", checked today, note "Read call transcripts. Fireflies has no write tools."

`context/tools.md`: "Fireflies | Claude connector | <today> | Read call transcripts | Nothing else; Fireflies has no write tools"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/fireflies
- https://guide.fireflies.ai/articles/8272956938-learn-about-the-fireflies-mcp-server-model-context-protocol
- https://docs.fireflies.ai/fundamentals/authorization
- https://docs.fireflies.ai/fundamentals/limits
- https://docs.fireflies.ai/graphql-api/query/transcripts
