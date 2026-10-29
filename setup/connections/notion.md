# Connect Notion

What it gives your app: People and Review filled from notes, pages and project trackers already kept in Notion.

**Connector:** "Notion" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.notion.com/mcp`. **Plans:** any Claude plan works for the connector.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your Notion workspace." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Notion", then Connect, then sign in to Notion and approve.
   If "Notion" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Notion" and use exactly `https://mcp.notion.com/mcp`. Then sign in and approve. Use no other address.
Notion's hosted connector only works through this sign-in ("Notion MCP currently requires you to complete the OAuth authorization flow"); a separate Notion integration token does not work with it.

## If there's no connector

Say exactly: "There's no Claude connector for Notion, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to export the relevant Notion page as Markdown or CSV and save it into the files folder.

## Prove it

Ask first, then search for a recent page. Say: "I can see a page called 'Greenway Café onboarding' updated yesterday."

## What Claude may and may not do

The connector is read and write: `search`, `fetch`, `create-pages`, `update-page` and more. Never create or update a page unless the person asks for that one specific page in this conversation. Default to reading only.

Pre-approve for check-ins: `search`, `fetch`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `notion`: name "Notion", status `connected`, how "Claude connector: Notion", checked today, note "Read pages and search the workspace. Never create or update a page."

`context/tools.md`: "Notion | Claude connector | <today> | Read pages and search the workspace | Create or update a page, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/notion
- https://developers.notion.com/guides/mcp/get-started-with-mcp
- https://developers.notion.com/docs/authorization
