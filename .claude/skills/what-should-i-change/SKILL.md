---
name: what-should-i-change
description: Looks at how the ads are doing in Ads OS and adds up to 5 suggestions for changes worth making - pause this, move budget there, test this headline, tighten this audience, fix this landing page - each with a plain reason. Never makes a change itself and never touches an ad account: approved suggestions go to the owner (and Task List OS when attached). On Meta, an approved pause or budget suggestion becomes an account change only when the owner presses the button in the app and confirms it. Use when they press What should I change?, or say "what should I change", "what's wasting money", "any suggestions", "what would you do with my ads", "should I pause anything" or "where should the budget go".
---

# What should I change

You suggest. They decide. In this skill you never pause, edit, re-budget or switch on anything, and you never touch an ad account. What happens after they approve depends on the platform. On Meta, an approved pause or budget suggestion can become an action only when the owner presses the button for it in the app and confirms the exact change: then `make-account-change` does it. Without that click it stays a suggestion. On Google it is a task for them to do in Google Ads, with a link.

## What you need

- `apps/ads/data/ads.json`: `suggestions`, `campaigns`, `builds`, `settings`.
- `context/ads.md`: what they've tried before, and what they never do.
- The report: `node apps/ads/app/report.js week`. Use its numbers, and only its numbers.
- The claude-ads skills, if `.claude/skills/ads/SKILL.md` exists: `ads-optimize` in draft mode (its `--draft`) and `ads-audit`, to prompt ideas. Use them from the data in this folder. Don't point them at an account, don't run any step that applies a change, and don't use a figure of theirs that the report doesn't show. If they aren't installed, use the rules below.
- Today's date.

If there are fewer than 7 days of figures, or the report says "too early", say so and add no suggestion that depends on the figures.

## Steps

1. Run the report and read the open suggestions (status `new` or `approved`). Never duplicate an open one, even in different words.
2. Look for changes worth making, in this order, and stop at 5 in total:
   - a campaign whose light is red, with enough days to judge: pause it, or change its words or audience (`pause`, `words` or `audience`);
   - budget sitting in a campaign whose light is red while a green one has room: move it (`budget`);
   - a campaign with spend and no results for 14 days: check results are being counted before judging anything (`other`);
   - a headline, picture or offer worth testing against the best ad (`test`);
   - a landing page problem, such as high clicks and few results (`landing`);
   - a cap breach, or a pace that will go over the monthly budget (`budget`);
   - a season ending soon for a seasonal campaign (`other`).
3. Be careful about the evidence. Don't suggest pausing on a number that is a few days old, on fewer than 7 days of figures, or on a target the owner set recently. Don't compare Google to Meta. They count a result differently, so each is judged against its own target. If you can't tell, the suggestion is to wait, and say that.
4. Keep every suggestion within `settings.dailyCap`, `weeklyCap` and `monthlyBudget`. Never suggest spending more than the room.
5. Add each as `{ id, kind, platform, campaignId, title, why, status: "new", createdAt, decidedAt: null, taskId: null }` with a `g-` id. `kind` is one of `pause`, `budget`, `test`, `words`, `audience`, `landing` or `other`. `title` is something the owner can do ("Pause the summer whitening ad"), written so the owner can tell which platform it is on from `platform`. `why` is 1 or 2 plain sentences, quoting only numbers the report printed. `campaignId` is the id in this file (empty for something that isn't about one campaign).
6. **Task List OS (only if attached).** For every suggestion with status `approved` and no `taskId`, add a suggested task following `apps/ads/ATTACH-CLAUDE.md`, and set its `taskId`. Check first that it isn't there already. Never remove or edit a task.
7. Add a line at the front of `activity` ("Added 3 suggestions"), keeping no more than 200. Save safely: read the file right before writing, write the whole file back, then read it back and check it parses. Change nothing else.

## What to say back

2 to 5 lines, most useful first, then that they decide on This week and nothing has changed in their accounts.

> I've added 3 suggestions. The most useful: the Google whitening ad has spent £48 with no enquiries in 2 weeks, so check the enquiries are being counted before judging it. Second, the autumn check-up ad on Meta is under target, so there's room to give it more of the budget. Both are for you to decide on the This week page. I haven't changed anything in your ad accounts.

If nothing is worth changing: "Nothing I'd change this week. Cost per enquiry is under target on both platforms. The next thing to look at is the end of the autumn offer on 30 November."

## Rules

- Never make a change here. Never pause, edit, re-budget, switch on or delete anything, and never call an ad account tool. A suggestion is never an approval: only the owner's button and confirm in the app is.
- Never type a number the report didn't print.
- Never suggest something the owner told you they never do (`context/ads.md`).
- Never suggest deleting anything. The most you suggest is pausing.
- No hype, no em dashes, no hedging. Say what you'd do and why.
