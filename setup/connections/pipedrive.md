# Connect Pipedrive

One line: fills People with contacts, and Review with deals going quiet.

**Recommended route:** the Pipedrive connector in Claude's connector directory. **Plans:** available on all paid Pipedrive plans; any Claude plan works for the connector.

## Route 1: connect Pipedrive

1. Say "Let's connect your sales pipeline" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Customize, Connectors. If "Pipedrive" is already listed, click Connect. If not, click the + button, Add custom connector, name it "Pipedrive MCP BETA", and use the URL `https://mcp.pipedrive.ai/mcp`.
3. Sign in to Pipedrive and approve.
4. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them). Backup if needed: `claude mcp add --transport http pipedrive https://mcp.pipedrive.ai/mcp`.

## Route 2: API key

In Pipedrive: account name (top right), Company settings, Personal preferences, API (app.pipedrive.com/settings/api). There's 1 active token per user per company, and it gives access to all that user's data; there's no read-only option. Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh PIPEDRIVE_API_TOKEN` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 PIPEDRIVE_API_TOKEN` (Windows), paste the token, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `x-api-token: $PIPEDRIVE_API_TOKEN`, for example: `curl -H "x-api-token: $PIPEDRIVE_API_TOKEN" "https://<companydomain>.pipedrive.com/api/v2/deals"`.

## If neither works

Ask the person to export a deals report as a CSV, and save it into `files/`.

## Check it works

Ask permission, then list recent deals. Say something like: "I can see 12 open deals; Greenway Café has gone quiet since 20 September."

## Rules for Claude with Pipedrive

The connector is read and write: it has `addDeal`, `addNote` and `updateActivity` alongside `getDeals`, `getActivities` and `searchDeals`. Never add or update a deal, note or activity unless the person asks for that one specific action in this conversation. Default to reading and suggesting tasks only.

## What to record

Add to `context/tools.md`: "Pipedrive | Claude connector (or API token) | 2026-10-06 | Read deals and activities | Add or update a deal, note or activity, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/pipedrive-mcp
- https://www.pipedrive.com/en/newsroom/pipedrive-mcp-connector-is-now-available-in-claudes-official-marketplace
- https://support.pipedrive.com/en/article/mcp-claude
- https://pipedrive.readme.io/docs/how-to-find-the-api-token
- https://pipedrive.readme.io/docs/core-api-concepts-authentication
