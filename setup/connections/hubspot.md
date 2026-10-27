# Connect HubSpot

One line: fills People with contacts, and Review with deals going quiet or tickets needing a reply.

**Recommended route:** the HubSpot connector in Claude's connector directory. **Plans:** needs a paid Claude plan (Pro, Max, Team or Enterprise); Super Admins and users with App Marketplace Access can connect directly, others need Super Admin approval.

## Route 1: connect HubSpot

1. Say "Let's connect your customer records" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Connectors, Browse, find "HubSpot", click Connect, authenticate, and choose permissions.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them). Backup if needed: `claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com`, then `/mcp` to sign in.
4. HubSpot recommends setting the connector to always ask before updates; choose that option if offered.

## Route 2: API key

If the connector isn't available, a legacy private app can give read-only access. In HubSpot: Development, Legacy apps, Create legacy app, Private, tick only read scopes (exact scope names not verified, check HubSpot's developer docs), then the Auth tab, Show token, Copy. Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh HUBSPOT_ACCESS_TOKEN` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 HUBSPOT_ACCESS_TOKEN` (Windows), paste the token, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `Authorization: Bearer $HUBSPOT_ACCESS_TOKEN`, for example: `curl -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" "https://api.hubapi.com/crm/v3/objects/contacts"`.

## If neither works

Ask the person to export a contacts or deals report as a CSV, and save it into `files/`.

## Check it works

Ask permission, then list recent contacts or deals. Say something like: "I can see 12 open deals; Greenway Café has gone quiet since 20 September."

## Rules for Claude with HubSpot

The connector is read and write: it can create and update contacts, deals and tickets. Never create or update anything unless the person asks for that one specific action in this conversation. Default to reading and suggesting tasks only.

## What to record

Add to `context/tools.md`: "HubSpot | Claude connector (or API key) | 2026-10-06 | Read contacts, deals and tickets | Create or update a contact, deal or ticket, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/hubspot
- https://knowledge.hubspot.com/integrations/set-up-and-use-the-hubspot-connector-for-claude
- https://developers.hubspot.com/docs/build-with-ai/remote-mcp-server
- https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview
- https://code.claude.com/docs/en/mcp
