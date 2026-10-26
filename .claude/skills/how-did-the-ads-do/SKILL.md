---
name: how-did-the-ads-do
description: Writes the short plain-English summary of how the ads did this week in Ads OS - what happened, what worked, what didn't and what to watch - using only the numbers the app itself works out. Saves it as this week's summary, replacing an earlier one for the same week. Never changes anything in an ad account. Use when they press Write this week's summary, or say "how did the ads do", "ads this week", "weekly ads summary", "how are my ads doing", "write up last week's ads" or "what happened with the ads".
---

# How did the ads do

You say what happened this week in a few plain sentences. The app shows that week's figures beside your words, so your job is the sense of them, not the sums.

## What you need

- `apps/ads/data/ads.json`: `summaries`, `settings` (the result's name, the targets, the caps), `campaigns`.
- `context/ads.md`, for what the owner cares about and what they've tried.
- The report: run `node apps/ads/app/report.js week` from this folder. It prints the app's own numbers for the week: this week against last, by platform and by campaign, the lights, the pace against the monthly budget, and any day or week over a cap. For an earlier week, give it a date: `node apps/ads/app/report.js week 2026-10-12`.
- Today's date, from the computer.

If the report says there are no figures, stop and say so: offer `update-my-ads`. If the newest figure is more than 3 days old, say so and offer to refresh first. Don't write about stale numbers as if they were current.

## Steps

1. Run the report. Read all of it. Note the week it covers (its first day is the summary's `weekStart`).
2. Write **4 to 6 sentences** in the owner's voice (`context/voice.md`, `write-like-me`, `human-email`):
   - what happened: spend, results (use the result's own word, such as enquiries) and cost per result against the target;
   - what worked: the best campaign by cost per result, and why that matters;
   - what didn't: the worst, or one with spend and no results (check the report says it's long enough to judge);
   - what to watch: a cap, the pace for the month, a campaign still "too early to say", or a build waiting on them.
3. **Quote only numbers the report printed**, exactly as printed. Never add, subtract, round, average or compare in a way that makes a new number. If you want a figure the report doesn't print, leave it out. Never write a total yourself.
4. Where Google and Meta both appear, don't set one against the other. They count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target. If you compare them at all, use that sentence's idea in plain words.
5. If a return is marked estimated in the report, say "estimated" and what it rests on. If the report has a return from customers they've won, say that's from customers they've won.
6. Add or replace this week's summary in `summaries`: `{ id, weekStart, text, createdAt }` with an `s-` id, one per week, newest first. If there's already one for this `weekStart`, replace its `text` and `createdAt` and keep its id. Never delete an earlier week.
7. Add a line at the front of `activity` ("Wrote the summary for the week of 13 October"), keeping no more than 200.
8. Save safely: read the file right before writing, write the whole file back, then read it back and check it parses. Change nothing else.

## What to say back

The summary itself, then one line: where it is in the app (This week), and that you haven't changed anything in their ad accounts.

> Your 2 campaigns spent £310 and brought in 14 enquiries, £22.14 each against your £25 target, so you're on track. The autumn check-up ad on Meta did best. The Google whitening ad spent £48 and has no enquiries yet, so keep an eye on whether results are being counted. You're a little ahead on spend for the month. Nothing needs switching on this week.

(Those figures are examples of the shape. Use only what the report printed.)

## Rules

- Never type a number the report didn't print.
- No hype, no em dashes, no list of 3 for effect, no hedging. Say what happened.
- Never change anything in an ad account. Never switch anything on or pause anything.
- Never say a campaign is bad on fewer than 7 days of figures: say it's too early to say.
- Never invent a reason for a change in results. If you don't know why, say you don't.
