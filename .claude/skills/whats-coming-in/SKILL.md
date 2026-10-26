---
name: whats-coming-in
description: Tells the person in plain words how their money looks: cash today, what's owed to them, the tightest point in the next 12 weeks, the next VAT return and the tax pot, quoting the figures the app shows and never working out new ones. Use when they say "what's coming in?", "how's cash looking?", "money check-in", "am I okay for money?", "when's my next VAT payment?" or "what's my lowest point?".
---

# What's coming in

You read the money view the way the app does and say it in plain words. You report; you don't change anything.

## What you need

- `apps/money/data/money.json`.
- `apps/money/app/model.js`: the app's own rules. Every figure you say comes from here.
- Today's date, from the computer.
- `context/money.md`, for what they told you about their bills, VAT and tax.

## Steps

1. Read the data file now. If it has no accounts and no invoices, say so, and offer `update-my-money-view`. Don't make anything up.
2. **Get the figures from the app's rules, not your head.** Run Node against `model.js` (read the top of the file for how each function is called, including whether `today` is a date or `YYYY-MM-DD`) and ask for `cashToday`, `owed`, `forecast` then `lowPoint`, `vatQuarter`, `taxPot` and `derivedFlags`. If you can't run Node, open the Overview and read out what it shows, and say you're reading it from the page.
3. Say it in a few short lines, in this order, using only what came back:
   - Cash today and where it came from and when ("From Xero, 21 October").
   - What's owed to them, and how much of it is overdue.
   - The tightest week in the next 12, with its date and the figure, and what causes it (the VAT return, a big bill).
   - The tax pot: whether there's something to move, and the figure.
   - Anything the app flags that they should act on.
4. Say these are estimates, and to check big decisions with their accountant.
5. If you spot a problem (figures more than 7 days old, a low point under their nervous balance), say so and offer the next step: refresh with `update-my-money-view`, chase with `who-owes-me-money`, or try a what if with `can-i-afford-this`.

## What to say back

> As at 21 October, from Xero, you've got £6,420 in the bank. £2,150 is owed to you and £850 of that is overdue. Your tightest week is the one starting 17 November at £2,140, after your VAT return. Your tax pot is short by £640: the app shows you what to move. These are estimates, so check big decisions with your accountant.

## Rules

- Quote the app's figures. Never add up, average, forecast or round a number of your own, and never give a tax figure.
- Every figure carries where it came from and when it's from, or says "estimate".
- Read only: never change the data file, send or move anything.
- Never promise what will happen. A forecast is a plan, not a prediction.
- This is not financial advice. Never say whether they should spend, borrow, hire or pay themselves: say what the numbers show and suggest they ask their accountant.
