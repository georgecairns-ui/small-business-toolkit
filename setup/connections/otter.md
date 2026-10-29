# Connect Otter

What it gives your app: Calls entries and drafted follow-ups from call recordings, with the actions waiting in Review.

**Connector:** "Otter.ai" in Claude's connector directory. **Plans:** which Claude plan the connector needs is not verified, check Otter's help page.
**Route:** directory.

## Connect

1. Say "Let's connect your call recordings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then Browse connectors, then "Otter.ai", then Connect, then sign in to Otter and Authorize access.

## If there's no connector

Say exactly: "There's no Claude connector for Otter, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. If Otter emails a summary after each call, you can read those through the Gmail or Microsoft 365 connection.

## Prove it

Ask first, then list the most recent conversations. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `get_user_info`, `search`, `fetch`. There are no write tools documented for this connector.

Pre-approve for check-ins: `get_user_info`, `search`, `fetch`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `otter`: name "Otter.ai", status `connected`, how "Claude connector: Otter.ai", checked today, note "Read call transcripts. Otter has no write tools in the connector."

`context/tools.md`: "Otter.ai | Claude connector | <today> | Read call transcripts | Nothing else; Otter has no write tools in the connector"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/otter-ai
- https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server
- https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API
