# Connect FreeAgent

What it gives your app: unpaid invoices and bills due, in Review.

**Connector:** none. Claude's connector directory has no FreeAgent connector (searched 29 October 2026). **Plans:** not applicable; FreeAgent has no connector and no personal access token, so this works from an export.
**Route:** export.

## Connect

1. Say "Let's connect your accounts." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Search Claude's connector directory for "FreeAgent" (`search_mcp_registry`) in case one has been added since 29 October 2026, and follow `.claude/skills/connect-a-tool` if one appears (with its name, the table "Check, switch on, or point to Connect", then prove and record).
3. If none appears, go to "If there's no connector".

## If there's no connector

Say exactly: "There's no Claude connector for FreeAgent, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Then:

1. Ask them to export their unpaid invoices from FreeAgent as a CSV and save it into the `files/` folder, and to do this as often as they'd like fresh figures, for example weekly.
2. Read the CSV from `files/` when it's there, and treat it as a snapshot from the date it was exported, not live.

## Prove it

Once a CSV is in `files/`, read it and say: "I can see 4 unpaid invoices in your last export, the oldest from 12 September."

## What Claude may and may not do

Read only. Never create, send or change an invoice, bill or any other FreeAgent record.

Pre-approve for check-ins: none. With an export there is no connector to read from; Claude reads the files in `files/`.

## Record

`apps/home/data/connections.json`, key `freeagent`: name "FreeAgent", status `export-only`, how "CSV export into files/", checked "" (an export is not a live read), note "No Claude connector in the directory on 2026-10-29".

`context/tools.md`: "FreeAgent | CSV export into files/ | <today> | Read the exported invoices | Nothing else"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- Claude's connector directory searched for "FreeAgent" on 2026-10-29 (`search_mcp_registry`): no results. This is why the route is export.
- https://dev.freeagent.com/docs/oauth
- https://dev.freeagent.com/docs/introduction
- https://dev.freeagent.com/docs/invoices
- https://claude.com/connectors (FreeAgent absent)
