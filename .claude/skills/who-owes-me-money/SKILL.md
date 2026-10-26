---
name: who-owes-me-money
description: Lists who owes the person money in Money View OS, which invoices are overdue and by how many days, and drafts a polite reminder for each overdue invoice using the polite-chaser skill, saved in the invoice for them to copy. When Task List OS is attached, adds a chase task for each, waiting for a click. Never sends anything. Use when the app asks (Chase on an invoice), or when they say "who owes me money?", "chase my invoices", "who hasn't paid?", "what's overdue?" or "nudge Greenway about the invoice".
---

# Who owes me money

You find what's unpaid and overdue and write the reminders. The person sends them. You never send, email or message anyone.

## What you need

- `apps/money/data/money.json`: `invoices` and `settings`.
- `context/money.md` ("Customers who pay late") and `context/people.md`: how formal to be with each customer.
- `.claude/skills/polite-chaser` (the ladder), `.claude/skills/human-email` and `.claude/skills/write-like-me` with `context/voice.md`.
- Today's date, from the computer.

## Steps

1. Read the data file now.
2. **Work out who owes what with the app's own rules.** Run `node -e` against `apps/money/app/model.js` (`owed`, `invoiceState`, `daysOverdue`, `invoiceTotals`, `invoicePaid`) if you can: it gives the unpaid ones, the overdue ones and how many days. Never add it up yourself. If you can't run Node, read the Invoices view's list and work from the figures it shows. **Only invoices that have been sent can be chased**: `status` is `sent` and the state is sent, part paid or overdue. Never draft a reminder for a draft, one still waiting for Claude (`waiting`), one that is only a draft in the accounts app (`in-accounts`: the person hasn't sent it yet, so say "INV-0043 is still a draft in Xero, so there's nothing to chase yet: send it from there"), a cancelled one (`void`) or a linked note (`linked`).
3. **Say it in plain words**, most overdue first: who, which invoice, how much is unpaid, how many days late, and what's not yet due.
4. **Draft a reminder** for each sent invoice the person named, or if they named none, each overdue sent invoice. Use `.claude/skills/polite-chaser`:
   - Pick the step from how late it is and what the notes say: up to a week late is step 1, up to 3 weeks step 2, up to 5 weeks step 3, longer step 4, going gentler for a customer who normally pays on time and firmer for one who is often late.
   - Include the specifics: invoice number, amount unpaid, the original due date, who it's to.
   - Run the human-email checklist, and write in the person's voice.
   - Save it in the invoice as `chaser: { "text": "<the draft>", "at": "<now>" }`, replacing an older draft only if the person asked for a new one. Clear the invoice's `request` if it was asking for this reminder. The Invoices drawer shows it with Copy and Open email buttons.
5. Add a line to `activity` at the front ("Drafted a reminder for INV-0042"), keeping 200.
6. **Task list (only if attached).** Follow `apps/money/ATTACH-CLAUDE.md`: a suggested task for each overdue invoice ("Chase Greenway Café for INV-0042, £850, 12 days late"), using the amounts the app shows. Check `source.id` and the title first. Never edit or remove anything already in the task list.
7. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

> 2 invoices are overdue. Greenway Café's INV-0042 (£850) is 12 days late, and Marlow Dental's INV-0039 (£400) is 31 days late. I've drafted a friendly nudge for Greenway and a firmer one with a date for Marlow. They're in the invoices for you to copy. Nothing has been sent.

## Rules

- Never send, email or message anyone, even if they ask: draft it, and they send it. Never chase anyone automatically.
- Never type a total or a day count the app works out. Quote the app's figures.
- Late payment interest and compensation come up only at step 4, as `polite-chaser` says, never as a number.
- Never change an invoice's status, payments or dates. Only the `chaser` and `request`.
