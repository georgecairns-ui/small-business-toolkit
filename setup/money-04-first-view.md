# Step 5 of 6: your first money view

Goal: the Overview shows real figures, they know what the 4 numbers at the top and the chart mean, and they know how to raise an invoice.

## 1. Anything coming in that isn't invoiced yet?

Ask once:

> Is there any money coming in that you haven't invoiced yet? A job you've finished, or one you've agreed.

For each, add an `expected` item: `who`, `what`, `amount`, `date` (when they expect the money, as they say it), `chance: "likely"` (or `maybe` if they say so), `source: "you"`, `status: "confirmed"` (they've just told you), `invoiceId: null`. Never guess an amount. If they don't know, skip it and say they can add it in In and out later.

If Pipeline OS or Proposal Writing OS is attached, check `apps/money/ATTACH-CLAUDE.md`: won deals and approved proposals come in as suggested items, waiting for their click.

## 2. Open the app

Open **http://localhost:4747/money/** (follow `.claude/skills/open-my-toolkit` if it isn't running) on the Overview, and walk through it in a few plain lines:

- **The 4 numbers at the top**: cash today (and where it's from), your lowest point in the next 12 weeks, what's owed to you, and your tax pot. Each is a button to the page behind it.
- **The chart**: the balance week by week for the next 12 weeks. The dashed line is the balance that makes you nervous. Rest the mouse on a week to see what's coming in and going out.
- **The tax pot box**: how much should be set aside, how much is in the pot, and what's left to move. It has a button that opens your bank, and one that says I've moved it. The app never moves money. Neither does Claude.
- **Months** shows each month: invoiced, paid, due and going out. **In and out** is where you add or confirm money coming in and going out. **What if** lets you try things, like a new van or losing a customer.
- Every figure says where it came from and when. These are estimates to help you plan, not financial advice. Check big decisions with your accountant.

## 3. Raise an invoice together

Offer to raise one now, so they've done the whole loop once. Every invoice lives in their accounts software:

> Want to raise an invoice now, to see how it works? Tell me who it's for and what for.

Follow `.claude/skills/raise-an-invoice`. Then show them the invoice in the Invoices view. If `sources.accounts.mode` is `drafts`, show **Put it in Xero as a draft** and say they'd check and send it from Xero. If it's `read`, show **Open <app> to raise it** and say it shows in Money View on the next refresh. Don't put anything in their accounts software or send anything unless they say so for that invoice.

If they don't want to raise one, that's fine.

## 4. Say how to refresh

"When you want fresh numbers, press Refresh numbers, or say 'update my money view'."

Tick this step in `setup/progress.md`. Next, step 6: follow `setup/09-check-and-hand-over.md`.
