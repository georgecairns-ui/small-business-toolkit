# Connect Xero

One line: lets Claude read invoices, bills, bank transactions, contacts and what customers owe from Xero, so Money View can show them, and so the task list gets unpaid invoices to chase and bills due.

**Recommended route:** the Xero connector in Claude's connector directory, read-only by design. **Plans:** needs an active Xero subscription; works with a free or paid Claude account.

## Route 1: connect Xero

1. Say "Let's connect your accounts" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "Xero", click Connect, sign in with the business Xero login, and choose the organisation.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

## If Claude can't see Xero

Say so in one plain line and check the basics with them: they signed in with the business Xero login, they chose the right organisation, and their Xero subscription is active. Money View only works through this live connection, so until Claude can see Xero, leave Money View's accounts step (`setup/money-01-your-accounts.md`) unticked. Don't ask for exports and don't try another way in.

A separate version exists that can create draft invoices (Xero's own open source connection). It is optional and needs a Xero custom connection: see `setup/connections/xero-drafts.md`. Don't set it up unless the person wants Money View to put invoices into Xero as drafts.

Xero's own wording: "Claude connects with read-only access" and it "can't edit invoices, post transactions, or change anything in your books."

## Check it works

Ask permission, then list unpaid invoices. Say something like: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

The connector was added to the directory in April 2026, built by Xero Limited, and is marked Anthropic verified.

## Rules for Claude with Xero

Read only, by Xero's own design: "Claude connects with read-only access" and "can't edit invoices, post transactions, or change anything in your books." Tools include `get_invoices`, `show_invoices_summary`, `get_aged_receivables`, `get_aged_payables`, `get_bills`, `get_contacts`, `get_profit_and_loss`, `get_cash_position`, `get_bank_account_transactions`. There is nothing to restrict beyond this; the connector cannot write.

## What it can and can't do for Money View

Can: read invoices, payments, bills, bank transactions and balances, contacts, cash position and what customers owe, so Money View shows what's owed and what's in the bank (Xero's bank feed is the bank route). Xero is fully supported through this connection. Can't: create an invoice. For drafts the person adds the optional connection in `xero-drafts.md`, or raises the invoice in Xero themselves from the link Money View gives.

This connection is also how Claude checks that a customer is already a contact in Xero before the drafts connection creates an invoice for them (see `xero-drafts.md`).

## What to record

Add to `context/tools.md`: "Xero | Claude connector | 2026-10-06 | Read invoices, bills, contacts and reports | Nothing; the connector is read-only".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/xero
- https://www.xero.com/uk/ai-in-accounting/claude/
- https://www.xero.com/us/ai-in-accounting/claude/
- https://github.com/xeroapi/xero-mcp-server
