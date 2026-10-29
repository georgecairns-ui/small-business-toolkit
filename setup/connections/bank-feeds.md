# Switch on the business bank feed

What it gives Money View: the business bank's transactions and balances. Money View sees the bank only through the bank feed inside the person's accounts app. Claude then reads the transactions through the accounts connection, read only. It never gets a bank login, a sort code, an account number or a card number.

**Connector:** none of its own. The bank feed is switched on inside the accounts app (Xero or QuickBooks), and Claude reads it through that app's connection (`xero.md` or `quickbooks.md`). **Plans:** whatever the accounts app's subscription includes.
**Route:** switched on inside the accounts app.

Used by `setup/money-02-your-bank.md`. The bank feed is required: Money View doesn't go on to the next setup step without it. **Nothing here has been tried with a real account by us.** Menus change often, so every click below is the usual route as we understand it, and is "to check" until someone has walked through it with a real account.

## Connect

The same idea in every accounts app:

1. In the accounts app, find the bank accounts area and choose to add a bank account or connect to a bank.
2. Search for their bank and choose the **business** account (not a personal one).
3. The accounts app sends them to their own bank's page to say yes. They sign in there. The accounts app only gets a read-only view of transactions.
4. They choose the account, and how far back to bring transactions in.
5. Transactions arrive within a few minutes to a day. The bank may ask them to renew their yes every so often (to check how often for each bank and app).

These clicks happen inside the accounts app, where you can't look. Give them in their guide mode, ask them to tell you when each part is done, and check the result yourself with the read in "Prove it" rather than asking what's on their screen.

**Xero**
- **Clicks (to check):** Accounting, then Bank accounts, then Add bank account. Search for the bank, choose it, choose the account type, and follow the steps to sign in at the bank. Choose the bank feed (not just a statement upload).
- **Banks (to check):** Xero lists the UK banks it connects to on its own page. Confirm theirs before you start.
- **What Claude reads:** the Xero connection shows bank accounts, balances and bank transactions.

**QuickBooks**
- **Clicks (to check):** Transactions, then Bank transactions (called Banking in some versions), then Link account or Connect account. Search for the bank, choose it, and follow the steps to sign in at the bank.
- **Banks (to check):** QuickBooks lists the UK banks it connects to. Money View supports QuickBooks only when Claude shows Intuit's QuickBooks connector, which is for US customers only for now (`quickbooks.md`).

FreeAgent and Sage are not supported yet, so they have no section here.

**Which UK banks:** business accounts at the big UK banks (Barclays, HSBC, Lloyds, NatWest, Santander, Nationwide) and at the business banks (Starling, Monzo, Tide, Revolut, Metro, Co-operative, Mettle) are usually offered. **Each is "to check" per accounts app**: look at the accounts app's own list.

## If there's no connector

There's no bank feed for their bank when their accounts app doesn't offer it. Say so plainly and stop, as `setup/money-02-your-bank.md` says: Money View needs the bank feed and has no other way to see the bank, so setup waits until their bank is offered. Never suggest an export, a statement upload or another way in.

## Prove it

Ask the accounts connection for recent bank transactions (for Xero, its bank transactions tool) and say what came back in plain words: "I can see 31 transactions on your business current account since 1 September." If there are none, the feed may still be catching up: say so and check again later, as `setup/money-02-your-bank.md` says.

## What Claude may and may not do

Read only, through the accounts connection. Never ask for or store a bank login, sort code, account number or card number: they sign in at their bank's own page, not here. Never move money, add a payee or change anything at the bank or in the accounts app.

Pre-approve for check-ins: nothing of its own. The bank feed is read with the accounts app's read tools, which its guide (`xero.md` or `quickbooks.md`) lists.

## Record

`apps/home/data/connections.json`: no row of its own. The bank feed is read through the accounts connection, so the accounts app's row (`xero` or `quickbooks`) covers it.

`apps/money/data/money.json`: `sources.bank` with `mode: "accounts-feed"` and `checkedAt`, only once you've seen real transactions.

`context/tools.md`: "Business bank feed | Inside <accounts app>, read through its connection | <today> | Read bank accounts, balances and transactions | Move money, add a payee or change anything at the bank"

## Sources

Rewritten into the connected-onboarding shape on 2026-10-29. Every click and bank above is "to check" until seen with a real account (`maintainers/MAINTAINING.md` keeps the list).
