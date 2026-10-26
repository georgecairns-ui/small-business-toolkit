---
name: set-aside-for-tax
description: Explains the tax pot figure in Money View OS (what the app says should be set aside, what's in the pot, and what's left to move), how the app works it out, and reminds the person that they move the money themselves. Logs the move when they say they've done it. Never moves money and never chooses a percentage. Use when they say "how much should I put aside?", "tax pot", "what do I need to move?", "I've moved it", "I moved £640 to my tax pot" or "how's my VAT looking?".
---

# Set aside for tax

You explain what the app shows and you record what the person tells you they've done. You never move money, anywhere, ever.

## What you need

- `apps/money/data/money.json`: `settings.tax`, `settings.vat`, `accounts`, `potMoves`, `settings.bank`.
- `apps/money/app/model.js`: `taxPot` and `vatQuarter`, the app's own rules.
- `context/money.md` ("Tax" and "VAT": what their accountant says).
- Today's date, from the computer.

## Steps

1. Read the data file now.
2. **Get the figures from the app's rules.** Run Node against `model.js` for `taxPot` and `vatQuarter` (read the top of the file for the call). They give: what should be set aside, what's in the pot, what's been moved and what's left to move. If you can't run Node, read them from the Overview's Tax pot box. Never work them out yourself.
3. **Explain it in plain words**, using only those figures:
   - What the app counts: the VAT on money received this VAT quarter (if they're registered), plus their own set-aside percentage of what they've been paid after VAT since the start of the tax year, less any tax already paid.
   - What's in the pot: the pot account's balance and when it's from, or, if they haven't told the app which account is the pot, what they've logged as moved.
   - What's left to move.
   Label it an estimate. It is not their tax bill.
4. **The percentage is theirs.** If `settings.tax.setAsidePercent` is 0, say the app is only counting VAT, and that their accountant can tell them what to put aside for income or corporation tax. Never choose, suggest or compare a percentage. If they ask what's normal, say it depends on their profit and their type of business, and to ask their accountant.
5. **Remind them they move it.** "I can't move money. The app shows you the amount and has a button that opens <their bank>. You make the move, then press I've moved it."
6. **Logging a move.** When they tell you they've moved an amount, add to `potMoves` `{ id, date, amount, note }`: a new id (`m-` and 6 random lowercase letters or digits), `date` today unless they said otherwise, `amount` exactly as they said it (positive for into the pot, negative for taking out), and `note` in their words. Add a line to `activity` at the front ("Logged £640 moved to the tax pot"), keeping 200. Save safely: read the file right before writing, write the whole file back, read it back and check it parses. Only log what they tell you: never because the figure says they should have.

## What to say back

> The app says you should have £3,980 set aside and your pot has £3,340, so £640 is left to move. That's VAT on what you've been paid this quarter plus the percentage you chose for the rest. It's an estimate. I can't move money for you: the Tax pot box has a button that opens your bank, and an I've moved it button to log it.

(Use the figures the app shows, never these.)

## Rules

- Never move, transfer, pay or request money. Never open or log in to a bank.
- Never type a figure the app works out, and never pick or suggest a tax percentage.
- Never say what they owe HMRC. The tax pot is a plan for putting money aside, not a tax bill. Their accountant works out the bill.
- Only log a move they have told you about, with their amount.
