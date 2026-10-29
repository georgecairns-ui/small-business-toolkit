# Connect HubSpot

What it gives your app: contacts in People, and deals going quiet or tickets needing a reply in Review.

**Connector:** "HubSpot" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.hubspot.com`. **Plans:** needs a paid Claude plan (Pro, Max, Team or Enterprise); Super Admins and users with App Marketplace Access can connect directly, others need Super Admin approval.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your customer records." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then Browse, then "HubSpot", then Connect, then authenticate and choose permissions.
   If "HubSpot" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "HubSpot" and use exactly `https://mcp.hubspot.com`. Then sign in and approve. Use no other address.
4. HubSpot recommends setting the connector to always ask before updates; choose that option if offered.
5. If they aren't a Super Admin and don't have App Marketplace Access, offer to draft a short message they can send their Super Admin. Claude never sends this itself.

## If there's no connector

Say exactly: "There's no Claude connector for HubSpot, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to export a contacts or deals report as a CSV and save it into the files folder.

## Prove it

Ask first, then list recent contacts or deals. Say: "I can see 12 open deals; Greenway Café has gone quiet since 20 September."

## What Claude may and may not do

The connector is read and write: it can create and update contacts, deals and tickets. Never create or update anything unless the person asks for that one specific action in this conversation. Default to reading and suggesting tasks only.

Pre-approve for check-ins: only names that start with `get_`, `list_`, `search_`, `read_`, `find_`, `fetch_` or `query_`, or end with `_search` or `_get`, and no others; never any name containing create, update, delete, send, mark, archive, add, remove, set, move, post, reply, label, trash or write, whatever else it matches. The exact read tool names could not be confirmed for HubSpot (it isn't in Claude's own tool list on 2026-10-29), so apply this rule to whatever the connector shows on the day.

## Record

`apps/home/data/connections.json`, key `hubspot`: name "HubSpot", status `connected`, how "Claude connector: HubSpot", checked today, note "Read contacts, deals and tickets. Never create or update anything."

`context/tools.md`: "HubSpot | Claude connector | <today> | Read contacts, deals and tickets | Create or update a contact, deal or ticket, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/hubspot
- https://knowledge.hubspot.com/integrations/set-up-and-use-the-hubspot-connector-for-claude
- https://developers.hubspot.com/docs/build-with-ai/remote-mcp-server
- https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview
- https://code.claude.com/docs/en/mcp
