# Connect Pipedrive

What it gives your app: contacts in People, and deals going quiet in Review.

**Connector:** "Pipedrive" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.pipedrive.ai/mcp`. **Plans:** available on all paid Pipedrive plans; any Claude plan works for the connector.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your sales pipeline." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Pipedrive", then Connect, then sign in to Pipedrive and approve.
   If "Pipedrive" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Pipedrive MCP BETA" and use exactly `https://mcp.pipedrive.ai/mcp`. Then sign in and approve. Use no other address.

## If there's no connector

Say exactly: "There's no Claude connector for Pipedrive, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to export a deals report as a CSV and save it into the files folder.

## Prove it

Ask first, then list recent deals. Say: "I can see 12 open deals; Greenway Café has gone quiet since 20 September."

## What Claude may and may not do

The connector is read and write: it has `addDeal`, `addNote` and `updateActivity` alongside `getDeals`, `getActivities` and `searchDeals`. Never add or update a deal, note or activity unless the person asks for that one specific action in this conversation. Default to reading and suggesting tasks only.

Pre-approve for check-ins: `getDeals`, `getActivities`, `searchDeals`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `pipedrive`: name "Pipedrive", status `connected`, how "Claude connector: Pipedrive", checked today, note "Read deals and activities. Never add or update a deal, note or activity."

`context/tools.md`: "Pipedrive | Claude connector | <today> | Read deals and activities | Add or update a deal, note or activity, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/pipedrive-mcp
- https://www.pipedrive.com/en/newsroom/pipedrive-mcp-connector-is-now-available-in-claudes-official-marketplace
- https://support.pipedrive.com/en/article/mcp-claude
- https://pipedrive.readme.io/docs/how-to-find-the-api-token
- https://pipedrive.readme.io/docs/core-api-concepts-authentication
