---
name: update-my-money-view
description: Brings Money View OS up to date from the person's accounts app. Reads the connected accounts app (invoices, payments, bills, the business bank feed's transactions, balances) and updates the accounts, the bank lines, the invoices, the payments it can match, the regular bills it spots and any flags worth raising. Never types a total, a forecast or a tax figure. Use when they press Refresh numbers, or say "update my money view", "refresh my numbers", "what's in the bank?", "check my accounts", "has anyone paid me?" or "bring my figures up to date".
---

# Update my money view

You bring the person's money view up to date from their accounts app. You read; you never move money, send, approve, pay or delete anything, anywhere. The app works out every total, forecast and tax figure. You only write the records it works from.

## What you need

- `apps/money/data/money.json` and `apps/money/CLAUDE.md` (the format and the rules).
- `context/money.md`, `context/business.md` and `context/tools.md`: how they invoice, which bank, VAT, what the accountant says.
- Today's date, from the computer. Never guess it.
- `sources` in the data file: `sources.accounts.mode` (`none`, `read` or `drafts`) and `sources.bank.mode` (`none` or `accounts-feed`) say what is set up.
- Optional, if attached (`apps/installed.json`): Task List OS (`task-list`). See `apps/money/ATTACH-CLAUDE.md`.

If the accounts mode is `none`, say Money View needs an accounts app connected first and offer `/setup`. If the bank mode is `none`, say so and offer `setup/money-02-your-bank.md`. Don't invent anything.

## Steps

1. Read the data file and the context notes now.
2. **Read the accounts app** (the connection in `context/tools.md` and `setup/connections/`). Read only:
   - Invoices: unpaid ones and those paid in the last 90 days.
   - The business bank accounts it holds, their balances, and the bank feed's transactions (the last 60 days, or since the last import).
   - Bills to pay, if the connection shows them.
   Money View works only through a live connection. If you can't read the accounts app (the connection is down, or it isn't Xero or QuickBooks), say so in one line and stop: don't ask for or read an export, and never guess what the connection would have said.
3. **Is the bank feed working?** If `sources.bank.mode` is `accounts-feed` and you see no recent bank transactions, say so plainly and point to `setup/connections/bank-feeds.md`: the feed may have stopped and need reconnecting in the accounts app.
4. **Bank accounts and pots.** Treat each bank account the accounts app shows as an account here. The tax pot is one of them, or it isn't fed in at all (then the sum of `potMoves` is used).
5. **Accounts.** For each bank account, card and pot you can see, update the matching entry in `accounts` (match on `name`) or add one: `balance`, `asAt` (the date the figure is from, never today unless it is), `source: "accounts"`. Leave entries with `source: "you"` alone unless the new figure is newer, then update the balance and say so. Never write a sort code, an account number or a card number anywhere.
6. **Transactions.** Add each new bank line to `transactions`, newest first: `date`, `text` (the description, as the bank gives it), `amount` (a positive number), `dir` (`in` or `out`), `accountId`, `source: "accounts"`, `category` (`tax` for a payment to HMRC, keeping the word VAT in `text` for a VAT payment as the bank gives it; `transfer` for a move between the person's own accounts; otherwise empty). A line is a duplicate when another has the same date, amount and text: skip it. Keep the list to 3000, dropping the oldest.
7. **Invoices read from the accounts app.** These are the main list. Add any invoice you can see that isn't in `invoices` yet with `where: "accounts"`, `ref` (the accounts app's own number), `source: "accounts"`, the real lines (or one line for the total if the connection doesn't give lines), real dates, and a `status` of `sent` (or `in-accounts` if the accounts app shows it as a draft that hasn't been sent). An invoice already in the data (matched on `ref`, then on `number`) is updated only for `payments` and dates. Never change what the person typed in an invoice. Use the accounts app's own number, never one of your own. If a draft note made in Money View (`where: "here"`, status `draft`) has the same customer and total as an invoice that has now arrived, set the note's `ref` to the invoice's number, set its status to `linked` (never `void`: `linked` is hidden and never shown as Cancelled) and add a line to `activity` saying it was linked, so it isn't counted twice.
8. **Payments come from the accounts app, only.** Add to an invoice's `payments` (`{ id, date, amount, source: "accounts" }`) only the payments the accounts app itself shows against that invoice, once each, never twice, and when part is paid add the part. A bank line never creates a payment and never counts as income on its own: the app counts money received only from invoice payments, so a loan, a refund or a transfer is never counted. For a transaction with `dir: "in"`, set its `invoiceId` only when the accounts app shows it paying that invoice, or the invoice number or the customer's name is in the text and the amount equals a payment the accounts app shows. If a bank line in has no matching payment, leave it unmatched and say so in the summary (flag it as `other` if it looks like an invoice payment the accounts app hasn't reconciled yet). Never mark anything paid by changing a status: paid and part paid are worked out by the app.
9. **Regular outgoings.** Look for payments out that repeat: the same payee, a similar amount (within about 10%) and a steady gap (weekly, monthly, quarterly or yearly) at least 3 times, or twice for an annual one. Add each as an `outgoings` entry with `status: "suggested"`, a `name` in plain words, `amount`, `repeat`, the next `date`, `source: "accounts"`, a `category` and `vatIncluded` true only if the connection says VAT was on it. Don't suggest one that matches an outgoing already there, confirmed, suggested or dropped. Never confirm one for the person.
10. **Flags.** Add to `flags` only what the app can't work out itself: a payment that looks like a duplicate (`duplicate`), an unusually large or odd payment out (`unusual`), a customer paying much later than their usual, a payment you couldn't match (`other`). One plain sentence each, in `text`, with `at` now, `status: "open"` and `invoiceId` when it's about one. The app already flags overdue invoices, a low balance ahead, a short tax pot and old figures, so don't repeat those.
11. **Log it.** Set `sources.accounts.checkedAt` (and `sources.bank.checkedAt` if you saw bank transactions) to now. Add one `imports` entry at the front (`at`, `source`, `what` in plain words such as "Xero: 4 invoices and 31 bank lines", `count`), keeping 100. Add a line to `activity` at the front ("Refreshed from Xero"), keeping 200.
12. If a job asked for this (the app's Refresh numbers button), there may be an invoice with `request.kind: "check"`. Refresh that one first, then clear its `request` (set it to `null`).
13. **Task list (only if attached).** Follow the hand-off in `apps/money/ATTACH-CLAUDE.md`. Don't add one that's already there.
14. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

3 to 5 plain lines, with only what you read and not a single total of your own:

> I've brought your money view up to date from Xero, as at 21 October. I added 31 bank lines and 4 invoices, and matched Greenway Café's payment to INV-0042. I spotted 3 regular payments you might want to confirm: they're waiting in In and out. 1 payment from Marlow Dental didn't match an invoice, so I've flagged it for you.

Tell them to look at the Overview for the figures: you never say a forecast, a total or a tax figure yourself.

## Rules

- Read only. Never move money, pay a bill, send, approve, void, edit or delete anything in the accounts app or the bank, even if the connection would let you.
- Never write a total, a forecast, a tax figure, a VAT figure or a balance you worked out yourself. Balances come from the connection, with the date they are from.
- Never store a bank login, a sort code, an account number or a card number, in the data file or anywhere else in this folder. If a file or a connection shows one, leave it out.
- Never invent an invoice, a payment, a customer or an amount. If you can't read something, say so.
- Never delete a record. Never change something the person typed (an invoice they wrote, an outgoing they confirmed, a setting).
- Only write to `apps/money/data/money.json` and `context/`. Keep every id, date and shape as `apps/money/CLAUDE.md` says.
