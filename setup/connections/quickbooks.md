# Connect QuickBooks Online

One line: lets Claude read invoices, payments and bank transactions from QuickBooks, so Money View can show them, and (only when the person presses the button) create an invoice for them to check and send from QuickBooks. The task list also gets unpaid invoices to chase.

**Supported only when the person's Claude shows Intuit's QuickBooks connector.** **Recommended route:** the "Intuit QuickBooks" connector in Claude's connector directory. **Plans:** Intuit says it is for US QuickBooks customers only for now. Whether it is open to UK customers: to check. If the person's Claude doesn't show it, QuickBooks is not supported yet: follow the "not supported yet" paragraph in `setup/money-01-your-accounts.md` (Xero works today and QuickBooks will work once Intuit's Claude connection reaches the UK), leave Money View's accounts step unticked and stop. Don't suggest exports or a developer route.

## Connect Intuit QuickBooks

1. Say "Let's connect your accounts" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Connectors, find "Intuit QuickBooks", click Connect, and sign in with Intuit.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

Intuit's own steps: Claude.ai, Connectors, Intuit QuickBooks, Connect, sign in with Intuit. Their help page: https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US

## If it isn't there

If "Intuit QuickBooks" isn't in the person's list of connectors, or it won't connect, say so in one plain line. QuickBooks is not supported yet for them. Leave Money View's accounts step unticked. Don't use the separate developer-run version (Intuit's own `quickbooks-online-mcp-server` on GitHub): it needs a developer app, secrets and a public callback address, and is not suitable for this kit.

## Check it works

Ask permission, then list unpaid invoices. Say something like: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

The connector was added to the directory in March 2026, built by Intuit QuickBooks, and is marked Anthropic verified.

## Rules for Claude with QuickBooks

This connector is not read-only: Intuit says it can create, update and send invoices and estimates, and create payment links. Intuit asks for confirmation before destructive actions such as deleting an invoice, but not necessarily before creating one.

- **Create only.** Claude may create an invoice, and only for an invoice in Money View that has a request from the person pressing **Put it in QuickBooks as a draft**. Claude **never sends, emails, updates, approves, voids or deletes** an invoice or estimate, and never creates a payment link. The person checks the invoice in QuickBooks and sends it from there.
- If the connection's tools don't include one that creates an invoice, set `sources.accounts.mode` to `read`: Money View then opens QuickBooks' new invoice page for the person to raise it.
- Whether QuickBooks keeps a created invoice unsent until the person sends it: to check (see `maintainers/MAINTAINING.md`). Until that is seen with a real account, say to the person: "It's created in QuickBooks, but I don't send it. You check it there and send it."

## What it can and can't do for Money View

Can: read invoices, payments, bank accounts and bank transactions, and create an invoice (never send it) when the person asks. Can't: send, update or delete anything.

## What to record

Add to `context/tools.md`: "QuickBooks Online | Claude connector | <date> | Read invoices, payments and bank transactions; create an invoice only when the person presses the button | Send, email, update, approve, void or delete an invoice or estimate, create a payment link".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/intuit-quickbooks
- https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US
