# Connect Sage

What it gives Money View: nothing yet. Money View OS can't connect to Sage yet, because there is no Claude connection for Sage that we can verify, and Money View builds the money view only through a live connection to the accounts app, never from exports, spreadsheets or reports saved into a folder.

**Connector:** none. Claude's connector directory has no Sage connector (searched 29 October 2026). **Plans:** not applicable.
**Route:** none for Money View; Claude can read an export in chat when asked.

## Connect

1. Say "Let's connect your accounts." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Search Claude's connector directory for "Sage" (`search_mcp_registry`) in case one has been added since 29 October 2026. If one from Sage itself appears, tell the person Money View hasn't been checked with it yet, and follow "If there's no connector" from its second paragraph. Don't set anything up.
3. If none appears, go to "If there's no connector".

## If there's no connector

Say exactly: "There's no Claude connector for Sage, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only` (or `no-connector` if they don't want to export).

Then follow the "If there's no connector" part of `setup/money-01-your-accounts.md`: say in one plain paragraph that Money View can't connect to their accounts app yet, leave step 2 unticked and stop. Don't set anything up and don't suggest a workaround. An export they drop in the files folder is only read in chat when they ask; Money View never builds the money view from it.

## Prove it

Nothing to prove for Money View: with no connector there is no live read. If they drop an export in `files/` and ask about it, read it and say what you found, treating it as a snapshot from the date it was exported, not live.

## What Claude may and may not do

Read only. Never create, send or change an invoice, bill or any other Sage record.

Pre-approve for check-ins: none. There is no connector to read from.

## Record

`apps/home/data/connections.json`, key `sage`: name "Sage", status `export-only` (or `no-connector`), how "CSV or PDF export into files/", checked "" (an export is not a live read), note "No Claude connector in the directory on 2026-10-29; Money View needs a live connection".

`context/tools.md`: "Sage | No Claude connector | <today> | Read an export only when asked | Nothing else; Money View can't use it yet"

## Sources

Rewritten into the connected-onboarding shape on 2026-10-29.
- Claude's connector directory searched for "Sage" and "Sage Accounting" on 2026-10-29 (`search_mcp_registry`): no Sage connector. This is why Money View doesn't support it yet.
- To check: whether a Claude connection for Sage has appeared in Claude's connector directory (https://claude.com/connectors). When one has, and someone has tried it with a real Sage account, this guide becomes a proper connection guide like `xero.md`.
