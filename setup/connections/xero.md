# Connect Xero

What it gives your app: unpaid invoices to chase and bills due in Review, and direct answers to money questions (cash position, profit and loss).

**Connector:** "Xero" in Claude's connector directory (built by Xero Limited, added in April 2026, marked Anthropic verified), read-only by design. **Plans:** needs an active Xero subscription; works with a free or paid Claude account.
**Route:** directory.

## Connect

1. Say "Let's connect your accounts." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Xero", then Connect, then sign in with the business Xero login and choose the organisation.

## If there's no connector

Say exactly: "There's no Claude connector for Xero, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to export an aged receivables or unpaid invoices report from Xero as a CSV or PDF and save it into the files folder. Claude then only sees what was exported, when it was exported, rather than live figures.

## Prove it

Ask first, then list unpaid invoices. Say: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

## What Claude may and may not do

Read only, by Xero's own design: "Claude connects with read-only access" and it "can't edit invoices, post transactions, or change anything in your books." Tools include `get_invoices`, `show_invoices_summary`, `get_aged_receivables`, `get_aged_payables`, `get_bills`, `get_contacts`, `get_profit_and_loss`, `get_cash_position` and `get_bank_account_transactions`. There is nothing to restrict beyond this; the connector cannot write.

A separate, developer-run version of the Xero connector exists (an open-source local server that can create invoices and post transactions). Never set it up or use it. Draft invoices in Xero are a separate optional extra (`setup/connections/xero-drafts.md`, which comes with Money View OS and the Small Business Toolkit), offered only when the person asks for them. If that file isn't in this folder, tell them it comes with Money View OS.

Pre-approve for check-ins: `get_connected_organisations`, `get_organisation_info`, `get_organisation_financial_year`, `get_invoices`, `show_invoices_summary`, `get_aged_receivables`, `get_aged_payables`, `get_bills`, `get_contacts`, `get_profit_and_loss`, `get_cash_position`, `get_financial_position`, `get_bank_account_transactions`, `get_chart_of_accounts`, `get_top_customers_by_revenue`, `get_purchase_orders`, `get_repeating_invoices`, `get_repeating_bills`, `get_tracking_categories`, `get_1099_report_summary`. These are every tool the connector had in Claude's own tool list on 2026-10-29, and all of them read.

## Record

`apps/home/data/connections.json`, key `xero`: name "Xero", status `connected`, how "Claude connector: Xero", checked today, note "Read invoices, bills, contacts and reports. The connector is read-only."

`context/tools.md`: "Xero | Claude connector | <today> | Read invoices, bills, contacts and reports | Nothing; the connector is read-only"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/xero
- https://www.xero.com/uk/ai-in-accounting/claude/
- https://www.xero.com/us/ai-in-accounting/claude/
- https://github.com/xeroapi/xero-mcp-server
- Tool names checked against Claude's own tool list on 2026-10-29.
