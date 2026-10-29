# Connect QuickBooks Online

What it gives your app: unpaid invoices and estimates in Review.

**Connector:** "Intuit QuickBooks" in Claude's connector directory (built by Intuit QuickBooks, added in March 2026, marked Anthropic verified). **Plans:** currently available to US QuickBooks customers only, on any Claude account.
**Route:** directory for US QuickBooks customers; export for everyone else.

## Connect

1. If they're not a US QuickBooks customer, there's no Claude connector for them: go to "If there's no connector".
2. Say "Let's connect your accounts." Say "connect" and "a connection", never MCP, API, JSON or repo.
3. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
4. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Intuit QuickBooks", then Connect, then sign in with Intuit and approve.
5. Use only the connector named "Intuit QuickBooks". Claude's directory also lists other QuickBooks connectors from third parties (searched 2026-10-29); they can create and change records, so don't use them.

## If there's no connector

Say exactly: "There's no Claude connector for QuickBooks, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. This is the route for a UK business, or anyone whose QuickBooks isn't a US one: the Intuit connector is US customers only, and no non-developer route for UK QuickBooks users is verified (check QuickBooks' help page: https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US). Ask them to export an unpaid invoices or aged receivables report as a CSV or PDF and save it into the files folder.

## Prove it

Ask first, then list unpaid invoices. Say: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

## What Claude may and may not do

This connector is not read-only: Intuit says it can create, update and send invoices and estimates, and create payment links. Intuit asks for confirmation before destructive actions such as deleting an invoice, but not necessarily before creating one. Treat it as read-only: never create, update or send an invoice or estimate, and never create a payment link, unless the person asks for that one specific action in this conversation.

A separate, developer-run version exists too (Intuit's own `quickbooks-online-mcp-server` on GitHub), but it needs an Intuit Developer app with a client ID, secret and refresh token, and a public HTTPS callback. Never set it up or use it.

Pre-approve for check-ins: only names that start with `get_`, `list_`, `search_`, `read_`, `find_`, `fetch_` or `query_`, or end with `_search` or `_get`, and no others; never any name containing create, update, delete, send, mark, archive, add, remove, set, move, post, reply, label, trash or write, whatever else it matches. The exact read tool names could not be confirmed for QuickBooks (it isn't in Claude's own tool list on 2026-10-29, and the names its directory listing shows don't follow the pattern), so apply this rule to whatever the connector shows on the day.

## Record

`apps/home/data/connections.json`, key `quickbooks`: name "QuickBooks Online", status `connected`, how "Claude connector: Intuit QuickBooks", checked today, note "Read invoices and estimates. Never create, update or send an invoice or estimate, or create a payment link." (For an export, status `export-only`, how "CSV or PDF export into files/", note "No Claude connector for this QuickBooks".)

`context/tools.md`: "QuickBooks Online | Claude connector | <today> | Read invoices and estimates | Create, update or send an invoice or estimate, create a payment link, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/intuit-quickbooks
- https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US
- https://github.com/intuit/quickbooks-online-mcp-server
- Claude's connector directory searched for "QuickBooks" on 2026-10-29: found "Intuit QuickBooks" (Intuit's own), plus third-party QuickBooks connectors ("Meridian Connector for QuickBooks", "NumbersGame MCP", "Breezing"), "Intuit Developer" (for building integrations) and an unrelated project tool. Only "Intuit QuickBooks" is used, so the route is directory for US customers and export for everyone else. The read-only tool names of the Intuit connector could not be confirmed from the directory listing (its listed names such as `profit-loss-generator` and `quickbooks-transaction-import` do not follow the get, list, search, read, find, fetch or query pattern), so check-ins use the mechanical rule above.
