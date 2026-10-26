# Switching on the business bank feed

Money View sees the bank only through the bank feed inside the person's accounts app. Claude then reads the transactions through the accounts connection, read only. It never gets a bank login, a sort code, an account number or a card number.

Used by `setup/money-02-your-bank.md`. The bank feed is required: Money View doesn't carry on without it. **Nothing here has been tried with a real account by us.** Menus change often, so ask the person what they see at each step and go by that. Every click below is the usual route as we understand it, and is "to check" until someone has walked through it with a real account.

## The same idea in every accounts app

1. In the accounts app, find the bank accounts area and choose to add a bank account or connect to a bank.
2. Search for their bank and choose the **business** account (not a personal one).
3. The accounts app sends them to their own bank's page to say yes. They sign in there. The accounts app only gets a read-only view of transactions.
4. They choose the account, and how far back to bring transactions in.
5. Transactions arrive within a few minutes to a day. The bank may ask them to renew their yes every so often (to check how often for each bank and app).

## Xero

- **Clicks (to check):** Accounting, then Bank accounts, then Add bank account. Search for the bank, choose it, choose the account type, and follow the steps to sign in at the bank. Choose the bank feed (not just a statement upload).
- **Banks (to check):** Xero lists the UK banks it connects to on its own page. Confirm theirs before you start.
- **What Claude reads:** the Xero connection shows bank accounts, balances and bank transactions.

## QuickBooks

- **Clicks (to check):** Transactions, then Bank transactions (called Banking in some versions), then Link account or Connect account. Search for the bank, choose it, and follow the steps to sign in at the bank.
- **Banks (to check):** QuickBooks lists the UK banks it connects to. Money View supports QuickBooks only when Claude shows Intuit's QuickBooks connector, which is for US customers only for now (`quickbooks.md`).

FreeAgent and Sage are not supported yet, so they have no section here.

## Which UK banks

Business accounts at the big UK banks (Barclays, HSBC, Lloyds, NatWest, Santander, Nationwide) and at the business banks (Starling, Monzo, Tide, Revolut, Metro, Co-operative, Mettle) are usually offered. **Each is "to check" per accounts app**: look at the accounts app's own list. If their bank isn't offered by the accounts app, say so plainly and stop: Money View needs the bank feed and has no other way to see the bank, so setup waits until their bank is offered.

## Checking that Claude can see it

Ask the accounts connection for recent bank transactions (for Xero, its bank transactions tool) and say what came back in plain words: "I can see 31 transactions on your business current account since 1 September." If there are none, the feed may still be catching up: wait and ask again.

## Rules

- Never ask for or store a bank login, sort code, account number or card number. They sign in at their bank's own page, not here.
- Read only. Never move money, add a payee or change anything at the bank or in the accounts app.
