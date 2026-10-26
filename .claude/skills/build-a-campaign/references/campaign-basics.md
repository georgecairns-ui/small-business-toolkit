# Campaign basics

What to use when the claude-ads skills aren't installed, and what to check even when they are. It is written for a small UK business spending a few hundred pounds a month. These are working rules, not the platforms' own rules, and they are not the last word: if the platform's own screen says otherwise, the screen wins.

Anything marked **to check** hasn't been confirmed against the platform's current help pages.

## Pick the objective from the result

`settings.result.kind` says what the owner wants.

| They want | Meta objective | Google Ads campaign |
|---|---|---|
| Enquiries from a form (lead) | Leads (an instant form, or send people to their site) | Search, with a form submission as the result |
| Phone calls | Leads or Traffic, with a call button (to check) | Search, with call results counted (to check) |
| Bookings | Leads, or Sales if the booking takes payment | Search, with a booking as the result |
| Online sales | Sales | Search first. Shopping or Performance Max only when there is a product feed and tracking already works |

Start with one campaign for one goal. Awareness and Engagement campaigns don't suit a business that needs results this month.

If results aren't being counted in the account (no tracking on the website, no conversion set up), say so before building anything. Spend with nothing counted can't be judged. Add "Check results are being counted" to the checks.

## Who sees it

**Meta (Facebook and Instagram)**
- Location first: a town and a radius, or a list of postcodes or towns. Keep it to where they can really serve.
- Age and gender only if the business has a real reason. Wide is fine: Meta finds the people.
- Interests are a nudge, not a wall. Use 0 to 3 that clearly match the customer. An empty list is allowed.
- Never write targeting by anything sensitive (health condition, religion, ethnicity, finances). Some businesses (credit, jobs, housing, and in some countries health and social issues) fall under Meta's special ad categories, which limit targeting. Ask the owner and check Meta's current rules before building one (to check).

**Google Ads (search)**
- Location as above, and ask whether to target people in the area or people interested in it. In the area is the safe default for a local trade.
- Keywords are what a customer types. Use a few that say what they want to buy, with the town where it helps ("emergency plumber Bristol"). Phrase match or exact match for a small budget: broad match spends fast on things they didn't mean.
- Negative keywords from the start: "free", "jobs", "careers", "course", "diy", "training", and anything the owner says brings the wrong people. Put what they never do (from `context/ads.md`) in here.
- One ad group per service. Don't mix "boiler repair" and "bathroom fitting" in one.

## The ads

- Say what it is, who it's for and what to do next, in that order. One idea per ad.
- Use the owner's own words and `context/voice.md`. Plain, specific, no hype.
- Real detail only: a town, a year, a real review quote the owner gave you, a price the owner gave you. Never invent one.
- Make the 2 or 3 ads different in the idea they lead with (the problem, the proof, the offer), not in the wording of the same line.
- The button (`cta`): Book now, Contact us, Call now, Learn more or Get quote, whichever suits. Check the platform has it (to check).

**Where the words are cut**

| Where | Limit | Note |
|---|---|---|
| Meta primary text | about 125 characters before "See more" | Longer is allowed. Put the point first. (To check.) |
| Meta headline | about 40 characters | (To check.) |
| Meta description | about 30 characters | Often not shown. (To check.) |
| Google headline | 30 characters | Up to 15 per search ad. |
| Google description | 90 characters | Up to 4 per search ad. In a build, the `primaryText` and `description` of ads 1 and 2 are the 4 Google descriptions. Ad 3 has a headline only. |

`AD.LIMITS` in `apps/ads/app/model.js` is what the app counts against. If it differs, it wins.

UK rules for the words: the Advertising Standards Authority's code applies. No claim you can't back up, no invented reviews or "up to" prices, and take particular care with health, money and anything about results. If the business is regulated (dental, legal, financial, health), say so in the checks and ask the owner to confirm the claims. (To check the detail for their trade.)

## How it's built

**Meta:** 1 campaign, 1 ad set (the audience, the budget, the dates), 2 or 3 ads. One ad set keeps the budget from being split too thin.

**Google:** 1 campaign, 1 ad group per service, 1 responsive search ad per group. A Google build has exactly 3 ads: ads 1 and 2 each have a `headline`, a `primaryText` and a `description`, and ad 3 has a `headline` only. Pooled, that is 3 headlines and 4 descriptions. Keywords and negatives as above.

## Budget

The app's guard compares the build with `settings.dailyCap` and `settings.monthlyBudget`. Use these working rules to choose a number.

1. Start from what a result may cost: `settings.targetCostPerResult` (or the platform's own target in `settings.platformTargets`). If it's empty, say so and use `ads-math` or ask.
2. Decide how many results a week would be a fair read: 3 to 5 for a small business. The daily budget is about `target cost x results wanted per week / 7`. Round to a clean number.
3. Never go over `dailyCap`. Count what live campaigns already spend per day (the average of the last 7 days, from the report) and subtract it from the cap. Never go over the room left.
4. Check the month: `daily x 30.4` plus what live campaigns spend must fit `monthlyBudget`.
5. If the room is too small for even 1 result at the target, say so plainly: "£5 a day is under what 1 enquiry costs you, so this would take weeks to tell you anything." Offer a longer run or a smaller audience. Don't pad the budget past the cap.
6. Meta has a smallest daily budget it will accept (it varies, to check) and works best with about 50 results a week per ad set (to check). A small business usually won't reach that. Say so once and don't promise what the ad set will learn.

Dates: a start at least 2 days ahead so the owner can review. An offer has an end date. An ongoing campaign has none, and the owner reviews it every week.

## The seasonal guard

A campaign that mentions a time of year must only run inside it.

- Set `build.season` to `{ label, from, to }` with `MM-DD` dates. It may cross the year end: `{ "label": "Christmas", "from": "11-15", "to": "01-10" }`.
- `start` and `end` must both fall inside the season. A season without an `end` is only allowed if the owner will end it: put "Switch off after 10 January" in the checks.
- If today is outside the season, don't build it to go on now. Draft it for the next one, with `start` there. A Christmas ad can never run in June.
- Holidays that move (Easter, Mother's Day, Father's Day, bank holidays) change every year: look up the date for the year you're building for, and don't copy last year's.
- Non-seasonal evergreen campaigns have no season (`null`). A word like "summer" in the ad words means it does have one.
- The wording in the ad and the landing page must still be true on the day it runs. Add "Check the landing page matches the offer on these dates" to the checks.

## What to avoid

- Two campaigns aimed at the same people with the same words.
- A big first budget. Start small, learn, then the owner decides to spend more.
- Anything that needs the owner's customer list. Never upload or store one.
- Changing a live campaign to "improve" it. Make a new draft or suggest a change; never edit a campaign that exists.
