---
name: can-i-afford-this
description: Works out a what if in Money View OS without touching the real figures: builds a scenario (a van at £450 a month, a hire at £2,400 a month from March, losing Greenway Café), switches it on, and explains what the What if view then shows, with a one-paragraph note. The numbers come from the app, never from Claude. Use when the app asks (an Ask Claude question on What if), or when they say "can I afford a van?", "what if I hire someone?", "what if I lose Greenway?", "what happens if I take a month off?" or "can I afford a pay rise?".
---

# Can I afford this

You turn a question into a what if. You add only the changes. The app works out what they do to the next 12 weeks. You never change the real invoices, bills or settings.

## What you need

- `apps/money/data/money.json`: `scenarios`, `settings`, `invoices`, `outgoings` and `expected`.
- `apps/money/app/model.js`: `scenarioCompare` and the other rules, to get the figures.
- `context/money.md`.
- Today's date, from the computer.

## Steps

1. Read the data file now. If a scenario has `request: { "question": ..., "at": ... }`, that is the question to answer. Otherwise use what the person said.
2. **Turn the question into changes.** Each change is `{ id, kind, name, amount, repeat, from, to, customer }`:
   - `out`: money going out ("A new van", 450, `monthly`, from next month).
   - `in`: money coming in ("A new retainer", 1,200, `monthly`).
   - `lose`: losing a customer: `customer` is their exact name as in `invoices`, `from` is the date.
   `repeat` is `none`, `weekly`, `monthly`, `quarterly` or `yearly`. `to` is `null` unless it ends. Use real dates in `YYYY-MM-DD`.
3. **Missing something?** In a chat, ask one short question ("How much a month, and from when?"). When the app started you, don't ask: make your best reading, and say what you assumed in the note.
4. **Save the scenario** in `scenarios`: a new id (`s-` and 6 random lowercase letters or digits), `name` in plain words, `on: true`, `changes`, `createdAt` now, `request: null`, and `note`. If the question came from a scenario with a `request`, fill that scenario in rather than adding a second one, then set its `request` to `null`.
5. **Get the figures from the app.** With Node, run `scenarioCompare(data, today, [the new id])` from `model.js` and use only what comes back: the lowest point and when, and the balance in 12 weeks, with and without. If you can't run Node, say the What if view shows them, and write the note without figures.
6. **Write the note**: one paragraph in plain words in `note`. What you assumed, what the app shows (the lowest point and the week, whether it goes under their nervous balance or below zero, the balance in 12 weeks against as things are), and one line: "This is an estimate. Check big decisions with your accountant."
7. Add a line to `activity` at the front ("Worked out: a new van at £450 a month"), keeping 200.
8. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

> I've added "A new van" to your What if view and switched it on: £450 a month from 1 November. On those numbers your tightest week moves to the week of 15 December at £310, which is under the £1,000 you said makes you nervous, so it's tight but not below zero. That's an estimate: please check it with your accountant before you sign anything.

## Rules

- Add changes only. Never edit, add or remove a real invoice, outgoing, expected item, account or setting.
- Never type a forecast, a balance or a total of your own: they come from `scenarioCompare` or the page.
- Never say yes or no to "can I afford it". Say what the numbers show and what it leaves them. This is not financial advice, and big decisions need their accountant.
- Never invent an amount or a date. If you assumed one, say so in the note.
