# Connect Notion

One line: fills People and Review with notes, pages and project trackers already kept in Notion.

**Recommended route:** the Notion connector in Claude's connector directory, OAuth sign-in only. **Plans:** any Claude plan works for the connector.

## Route 1: connect Notion

1. Say "Let's connect your Notion workspace" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Customize, Connectors, find "Notion", click Connect, sign in to Notion, and approve.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`. Backup if needed: `claude mcp add --transport http notion https://mcp.notion.com/mcp`, then `/mcp` to sign in.

## Route 2: API key

Not usually needed, and not usually possible: Notion's hosted connector only works through the OAuth sign-in above. "Notion MCP currently requires you to complete the OAuth authorization flow", and a separate integration token does not work with it. If the person already has a developer-style integration token for another purpose, check Notion's docs before relying on it here: https://developers.notion.com/docs/authorization.

## If neither works

Ask the person to export the relevant Notion page as Markdown or CSV, and save it into `files/`.

If a technical team member later sets up a separate developer integration token outside this connector, the headers it uses are `Authorization: Bearer <token>` and `Notion-Version: 2026-03-11`; this is not part of the recommended route for this kit.

## Check it works

Ask permission, then search for a recent page. Say something like: "I can see a page called 'Greenway Café onboarding' updated yesterday."

## Rules for Claude with Notion

The connector is read and write: `search`, `fetch`, `create-pages`, `update-page` and more. Never create or update a page unless the person asks for that one specific page in this conversation. Default to reading only.

## What to record

Add to `context/tools.md`: "Notion | Claude connector | 2026-10-06 | Read pages and search the workspace | Create or update a page, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/notion
- https://developers.notion.com/guides/mcp/get-started-with-mcp
- https://developers.notion.com/docs/authorization
