# Step 2 of 6: your accounts software (required)

Goal: Claude can read the person's accounts software, and you know whether it can also put invoices in as drafts. **Money View OS works on top of an accounts app, and it can't work without one, so this step is required.** Supported today: **Xero** (fully) and **QuickBooks** (only when the person's Claude shows Intuit's QuickBooks connector, which Intuit says is for US customers only for now; whether it opens to UK customers: to check). FreeAgent, Sage and any other accounts app are **not supported yet**.

## What the connections can really do

Say these plainly, once, when they matter. Don't promise more.

- **Xero:** the Xero connection in the Claude app **reads only**: invoices, bills, bank transactions, contacts, cash position and what customers owe. It can't create an invoice. Xero's own open source connection can create **drafts**, but takes about 10 minutes to set up and is optional.
- **QuickBooks:** Intuit's connector reads invoices, payments and bank transactions, and can also create invoices. Claude only ever creates one when the person presses the button, and never sends it.
- Whatever the app, Claude never sends, approves or deletes an invoice, and never moves money. Money View does not read exports, spreadsheets or reports: it works only through a live connection.

## 1. Ask, one question at a time

1. **"Have you got your accounts software connected to Claude already?"**

   **If yes:** check it now, with their permission, using whatever connection `context/tools.md` and the tools you have show. It must be Xero, or QuickBooks through Intuit's connector. Read their last 5 invoices. Say what you found in plain words ("I can see Xero. Your last invoice is INV-0042 to Greenway Café."). Then look at the tools you have and say whether it can also create invoices. If it can (for Xero, only the optional drafts connection), set `sources.accounts.mode` to `drafts`, otherwise `read`. If it's some other accounts app, go to the "not supported yet" paragraph below. Otherwise skip to question 3.

   **If no:** ask question 2.

2. **"Which accounts software do you use?"** Xero, QuickBooks, something else, or none. Don't suggest one yet.

   - **Xero:** connect it with `setup/connections/xero.md`. Say "a connection". Once it's connected, read their last 5 invoices to check it works.
   - **QuickBooks:** look at whether their Claude shows Intuit's QuickBooks connector (`setup/connections/quickbooks.md`). If it does, connect it and read their last 5 invoices to check it works. If it doesn't, say the "not supported yet" paragraph below.
   - **FreeAgent, Sage or anything else:** say this, in one plain paragraph, and stop:

     > Money View can't connect to your accounts app yet. It works with Xero today, and QuickBooks will work once Intuit's Claude connection reaches the UK. Once your accounts app is one of those, come back and type /setup and we'll carry on from here.

     Leave this step unticked, put "Waiting for a supported accounts app" in `setup/progress.md` and stop. Don't carry on with the rest of setup, and don't offer an export or any other way round it.
   - **None** (Word, Excel, a notebook): stop politely, in one plain paragraph:

     > Money View works on top of your accounts software, so it can see your invoices and your bank. Without one, there's nothing for it to read. I'd talk to your accountant about which one suits you. It works with Xero today, and QuickBooks will work once Intuit's Claude connection reaches the UK. Once you've got one, come back and type /setup and we'll carry on from here.

     Leave this step unticked, put "Waiting for an accounts app" in `setup/progress.md` and stop. Don't carry on with the rest of setup.

   **Xero only**, after the read-only connection works, say: "Want Claude to put invoices into Xero as drafts? It needs one more connection, about 10 minutes. You check each draft and send it from Xero. It's optional, and you can add it later." If they say yes, follow `setup/connections/xero-drafts.md`, click by click. If no, set the mode to `read` and carry on.
3. **"How many days do you usually give people to pay?"** Save as `settings.invoice.termsDays` (30 if they don't know). Mention that the invoice numbers come from their accounts software, so you don't ask about those.

## 2. Save as you go

- `apps/money/data/money.json`: `sources.accounts` (`app`, `mode`, `checkedAt` now), `settings.invoice.termsDays` and `settings.invoice.prefix` (from their last invoice number, as a default only).
- `context/money.md`: under "Accounts app and how we invoice", what they use, how invoices are sent, and the terms, in their words. Change its status line to `Status: filled in on <date>`.
- `context/tools.md`: the connection, as its guide says.

## 3. If it won't connect

Don't stall. Say what didn't work in a plain line and check the basics in the guide (signed in with the right login, the right organisation, an active subscription). If it still can't be read, treat it like having no supported accounts software: say so kindly, leave this step unticked and stop here. Never ask for an export, and never ask for a password or a key in chat.

Tick this step in `setup/progress.md`.
