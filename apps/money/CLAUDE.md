# Money View: standing instructions for Claude

This folder is the money app inside Money View OS. You (Claude) and the app share one file, `data/money.json`. The person sees it as one page, Money view, with a row of views to flick between at the top: Overview, Months, Invoices, In and out and What if, plus a Refresh numbers button, New invoice and a gear for Settings. You read their accounts software and its bank feed (read only), write what you find into the file, draft their reminders and put invoices into their accounts software as drafts. The app works out every total, forecast and tax figure. Read this file every time you work with the money view.

The app runs at **http://localhost:4747/money/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-money-view`). The helper reads and saves the data file, so you edit it directly as described below; the app picks up your changes within a few seconds.

The jobs live as skills in `.claude/skills/`: `update-my-money-view`, `raise-an-invoice`, `put-invoices-in-my-accounts`, `who-owes-me-money`, `whats-coming-in`, `can-i-afford-this`, `set-aside-for-tax` and `sort-money-brain-dump`. This file is the reference for the data they read and write. The app's own rules, which work out every figure, are in `app/model.js`: read the top of it for how each function is called.

Estimates to help you plan, not financial advice. Check big decisions with your accountant.

## The rules that never bend

- **You never move money.** The app suggests an amount to move to the tax pot and has a button that opens their bank. They move it and press "I've moved it". You never pay, transfer or log in to a bank.
- **You never send, approve or delete an invoice, and never create a contact.** Every invoice lives in the accounts software. "Put it in <app> as a draft" sets a `request` and asks you; you create it as a **draft** there, and they check and send it. Where the connection only reads, Money View opens the app's new invoice page and they raise it themselves. You never email a customer, and you only draft reminders.
- **Never type a total, a forecast or a tax figure.** You write records: lines, prices, dates, payments, balances read from the accounts software. To find a figure, run the app's own rules (`node -e` against `app/model.js`) or read what the page shows.
- **Never store bank details.** No login, sort code, account number or card number in the file. The bank is seen only through the accounts app's bank feed.
- **Never invent anything.** If a connection or file doesn't say, you don't know.
- **Never delete a record.** Cancel (`void`), drop (`dropped`), dismiss (`dismissed`) or mark done instead.
- **Never change or delete anything in their accounts software**, other than creating the draft they asked for.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your money view", "your invoices", "a connection". Never say agent, repo, repository, artifact, JSON, schema, MCP or API.
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers. No exclamation marks. No hype.
- Every figure you quote says where it came from and when ("From Xero, 21 Oct" or "Estimate").

## The data file: `data/money.json`

```json
{
  "version": 1,
  "settings": {
    "businessName": "", "ownerName": "", "currency": "GBP", "businessType": "", "yearStart": "04-06", "weekStarts": 1, "nervousBalance": 0,
    "vat": { "registered": false, "scheme": "standard", "rate": 20, "flatRate": 0, "quarterEnds": [3, 6, 9, 12], "cashAccounting": false },
    "tax": { "setAsidePercent": 0, "potAccountId": null, "note": "" },
    "invoice": { "prefix": "INV-", "nextNumber": 1, "termsDays": 30 },
    "bank": { "name": "", "link": "" }
  },
  "sources": {
    "accounts": { "app": "", "mode": "none", "checkedAt": null },
    "bank": { "mode": "none", "checkedAt": null }
  },
  "accounts": [], "invoices": [], "expected": [], "outgoings": [], "transactions": [],
  "potMoves": [], "scenarios": [], "flags": [], "imports": [], "activity": []
}
```

Every `id` is a short prefix, a hyphen, then 6 random lowercase letters or digits (`i-k3j9x2`): `a-` account, `i-` invoice, `l-` invoice line, `y-` payment, `e-` expected, `o-` outgoing, `t-` transaction, `m-` pot move, `s-` scenario, `c-` scenario change, `f-` flag, `n-` import. Never reuse or change one. Every date is `YYYY-MM-DD`, every timestamp is ISO, every amount is a number in pounds with up to 2 decimals and **positive**: direction is a separate field. Read the file immediately before you change it, write the whole file back in one go, keep it valid, 2-space indented, and read it back to check it parses.

### `settings`

Belongs to the person and the app (the Settings pop-up, opened by the gear). During setup you fill `businessName`, `ownerName`, `businessType` (`sole-trader`, `partnership` or `limited`), `yearStart` (`MM-DD`: 6 April for the UK tax year, or the day after a limited company's year end), `nervousBalance`, the `vat` answers, `tax.setAsidePercent` and `tax.note` (only what the person or their accountant says: you never choose it), `tax.potAccountId`, `invoice` (`prefix`, `nextNumber`, `termsDays`, `from`) and `bank` (`name`, `link`). Nothing else without being asked.

- `invoice.prefix`, `nextNumber` and `termsDays` are defaults for the drawer only. Numbering belongs to the accounts app: use its own number.
- `vat.scheme` is `standard` or `flat`. `quarterEnds` are the months their quarters end. `cashAccounting` means VAT counts when paid.

### `sources`

`accounts.mode`: `none`, `read` (connected, reads only) or `drafts` (connected and can create draft invoices). `accounts.app` is its name ("Xero"). `bank.mode`: `none` or `accounts-feed` (the business bank feed inside the accounts app, seen through the connection). `checkedAt` is when you last really read it.

### `accounts[]`

`{ id, name, kind: "current"|"savings"|"pot"|"card", balance, asAt, source, isTaxPot }`. `source` is `accounts` (read from the accounts app, whose name is in `sources.accounts.app`), or `you` if the owner typed it. `asAt` is the date the balance is from. A card balance is money owed. Only change a `you` account if your figure is newer, and say so.

### `invoices[]`

```json
{
  "id": "i-x", "number": "INV-0042", "customer": "Greenway Café", "email": "",
  "issueDate": "2026-10-01", "dueDate": "2026-10-31",
  "lines": [ { "id": "l-x", "text": "Menu redesign", "qty": 1, "price": 850, "vatRate": 20 } ],
  "status": "draft",
  "payments": [ { "id": "y-x", "date": "2026-10-20", "amount": 500, "source": "accounts" } ],
  "where": "here", "ref": "", "request": null, "chaser": null,
  "source": "you", "notes": "", "createdAt": "", "updatedAt": ""
}
```

- `lines[].price` is before VAT, `vatRate` is 20, 5 or 0 (0 for "no VAT" when they aren't registered). The app works out net, VAT and gross: never write them.
- `status` (stored): `draft`, `waiting` (asked you to put it in the accounts software), `in-accounts` (a draft there, the owner still has to send it), `sent`, `void` (cancelled by the owner) and `linked` (a draft note whose real invoice has arrived from the accounts app: you set it, the app hides it and leaves it out of every count, and it is never shown as Cancelled). **Paid, part paid and overdue are worked out by the app from `payments` and `dueDate`: never store them.** You set `status` only as the skills say.
- `where`: `here` (raised in Money View) or `accounts` (read from their accounts software). `ref` is the accounts software's own number or id.
- `request`: `null`, or `{ "kind": "draft", "at": "<timestamp>" }` (put it in the accounts software) or `{ "kind": "check", "at": "<timestamp>" }` (refresh this one). The app sets it. When you've done what it asks, set it back to `null`.
- `chaser`: `null` or `{ "text": "", "at": "" }`: your drafted reminder. The person copies it and sends it.
- `source`, here and on every record: `accounts` (read from the accounts app), `you`, `ads`, `pipeline`, `proposals` or `claude`. Older files may say "xero", "statement" or "bank": the app reads those as `accounts`.
- Chase (a reminder) is only for an invoice with status `sent` that isn't fully paid. Never draft one for a draft, a `waiting` one, an `in-accounts` one the owner hasn't sent, or a `linked` note. The app hides Cancel for invoices with `where: "accounts"`: those are cancelled in the accounts app.

### `expected[]` (money coming in that isn't invoiced yet)

`{ id, who, what, amount, date, chance: "likely"|"maybe", source: "you"|"pipeline"|"proposals"|"claude", status: "suggested"|"confirmed"|"invoiced"|"dropped", invoiceId, note }`. Only `confirmed` counts in the forecast; a `maybe` counts only when the person switches maybes on. **You add items as `suggested`** unless the person has just told you directly (setup, a chat). Never confirm one for them.

### `outgoings[]`

`{ id, name, amount, category: "bills"|"staff"|"rent"|"software"|"suppliers"|"loan"|"tax"|"ads"|"other", repeat: "none"|"weekly"|"monthly"|"quarterly"|"yearly", date, endDate, vatIncluded, source: "you"|"accounts"|"ads"|"claude", status: "suggested"|"confirmed"|"dropped", note }`. `date` is the next (or only) date. Only `confirmed` counts. You add what you spot as `suggested`.

### `transactions[]`

Bank lines read from the accounts app's feed, newest first, 3000 at most: `{ id, date, text, amount, dir: "in"|"out", accountId, source, invoiceId, category }`. `source` is `accounts`. `category` is `tax` for a payment to HMRC (keep "VAT" in `text` for a VAT payment: the app uses it to take VAT already paid off the tax pot), `transfer` for a move between the owner's own accounts, otherwise empty. **A bank line never adds income on its own**: money received is counted only from invoice payments, which come from the accounts app, so a loan, a refund or a transfer is never counted. A line is a duplicate when another has the same date, amount and text. You match money in to an invoice (`invoiceId`) only when the number or name and the amount agree.

### `potMoves[]`

`{ id, date, amount, note }`: what the person says they moved to the tax pot (positive) or took out (negative). Only log what they tell you.

### `scenarios[]`

`{ id, name, on, changes: [ { id, kind: "out"|"in"|"lose", name, amount, repeat, from, to, customer } ], createdAt, request, note }`. `lose` removes every confirmed expected item and unpaid invoice for `customer` from `from`, and stops its repeating income. `request` is `null` or `{ "question": "", "at": "" }` (the Ask Claude box); you answer it with `can-i-afford-this`, write a one-paragraph `note` and clear it. You add changes only: never touch real records.

### `flags[]`

`{ id, kind: "overdue"|"unusual"|"low"|"tax"|"duplicate"|"other", text, at, status: "open"|"done"|"dismissed", invoiceId }`. The app works out its own flags (overdue invoices, a low point ahead, a short tax pot, old figures, suggested items waiting), so never repeat one. You write what it can't see: a possible duplicate, something unusual, a payment you couldn't match, a missing tax percentage, a connection that couldn't do what was asked. One plain sentence in `text`.

### `imports[]` and `activity[]`

`imports`: `{ id, at, source, what, count }`, newest first, 100 at most. `activity`: `{ at, what, ref }`, newest first, 200 at most; add one line for every change you make, at the front.

### Rules for editing it safely

- Never change something the person typed (an invoice they wrote, an outgoing they confirmed, a setting) without being asked.
- Never delete an invoice, an item, a payment, a transaction or a note.
- Never type a number into the file that the app works out (totals, VAT, balances you added up, forecasts, tax). Amounts come from the accounts software or the person.
- Never write anywhere except `data/money.json`, `context/`, `files/` and `setup/progress.md`.

## The one page

Under the top bar sits the **rail**: **Overview | Months | Invoices | In and out | What if**, **Refresh numbers**, **New invoice** and the Settings gear. Each view has its own address (`#overview`, `#months`, `#invoices`, `#inout`, `#whatif`, `#invoice/<id>`). The footer on every view says: "Estimates to help you plan, not financial advice. Check big decisions with your accountant."

- **Overview**: 4 numbers (cash today, lowest point in the next 12 weeks, owed to you, tax pot), the 12 week forecast chart, the tax pot box (with **Open <bank>** and **I've moved it**), the flags tray, and the next 14 days.
- **Months**: a row per month, actual for the past and estimate for the future.
- **Invoices**: filter chips, search, and a drawer to start an invoice (the app works out the totals and the VAT), then **Put it in <app> as a draft** (drafts mode) or **Open <app> to raise it** (read mode), plus Chase and Cancel. The main list is read from the accounts software.
- **In and out**: money coming in, money going out and tax and VAT dates. Your suggested items wait here for **Confirm** or **Drop**.
- **What if**: scenarios on the same chart, and the Ask Claude box.
- **Settings**: business, VAT, tax, invoice and bank details.

## What the app can and cannot do

It can show the money view, work out every figure, let the person start an invoice, record the moves they tell it about, open their bank's page and their accounts app's pages, and ask you to do a job. It cannot move money, send an invoice or read the bank itself. Refreshing, putting an invoice in as a draft, drafting reminders and working out a what if are your jobs (`claude-jobs.json`), asked for with buttons in the app; everything else the app does by itself.

## Working with other tools

- **Task List OS** (`task-list` in `apps/installed.json`): see `ATTACH-CLAUDE.md` for what lands there and how. It needs the person's click there before anything happens.
- **Pipeline OS** (`pipeline`), **Proposal Writing OS** (`proposals`) and **Ads OS** (`ads`): read only, see `ATTACH-CLAUDE.md`. Never edit another tool's records.
- If a tool isn't attached, skip that part quietly.

## If something goes wrong

- The app says the money view has a mistake in it: the file isn't valid. Fix it by hand from the last good copy (`money.backup.json`, which the helper writes before every save).
- A job button does nothing: Claude Code may not be installed where the helper can find it. Tell them to open this folder in Claude and say "update my money view".
- A connection can't be read: say so in plain words, carry on with the other routes and never guess what it would have said.
- The bank feed shows no recent transactions: say so, and point to `setup/connections/bank-feeds.md`. The feed may need reconnecting in the accounts app.
