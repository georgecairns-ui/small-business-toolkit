# Step 5 of 7: your budget and what counts as a result

Goal: Ads OS knows how much they're willing to spend, what a result is, what a result is worth, and what they'd like one to cost. The app uses these for every light, every limit and every warning.

You suggest. They decide. Say that once.

## 1. Ask, one question at a time

1. **What's your monthly ad budget?** The most they'd spend across all ads in a month. Save it as `settings.monthlyBudget` in `apps/ads/data/ads.json`. If they don't know, offer a way to decide: what they'd spend to win 1 new customer, times how many they'd like.
2. **Daily and weekly limits.** Suggest limits from the budget: a daily limit of about the monthly budget divided by 30 (a bit more is fine for busy days), and a weekly limit of about the monthly budget divided by 4. Show the sums, say they decide, and save `settings.dailyCap` and `settings.weeklyCap` as they say. Explain: Claude never builds a campaign that would take them over a limit, and the app flags any day or week that goes over.
3. **What counts as a result?** A form filled in, a phone call, a booking, a sale. Save the plain word as `settings.result.name` (such as "enquiry") and `plural` ("enquiries"). The screen uses it everywhere ("Cost per enquiry"). Save `kind` as `lead`, `call`, `booking` or `sale`.
4. **What is a new customer worth, and how many results become customers?** Ask only for `lead`, `call` and `booking`:
   - `settings.result.worth`: roughly what one new customer is worth in pounds.
   - `settings.result.closeRate`: roughly how many results become customers, as a number from 0 to 1 (3 in 10 is 0.3).
   For `sale`, leave both empty: each sale carries its own value. Say these are estimates, and the app marks any return worked out from them as "estimated".
5. **What would you like a result to cost?** Work out a sensible starting point and show your sums, then let them decide. If claude-ads is installed, use `ads-math` for it. If not, start from what a customer is worth: `worth x closeRate` is the most a result can cost before it loses money, and a target should sit well under that, such as half. Save it as `settings.targetCostPerResult`. If one platform should have its own target (Google and Meta count a result differently), save `settings.platformTargets.<key>`.

Money is pounds. If their accounts use another currency, say so and ask what they want.

## 2. Save it

Write each answer to `settings` as you go. Also fill `context/ads.md` under "Budget and limits" and "What counts as a result", in plain words.

If `ads-setup` keeps a profile (see `setup/ads-03-your-customer.md`), add the conversion definition, the target and the economics to it.

## 3. Say it back

> Here's what I've saved. You'll spend up to £600 a month, with limits of £20 a day and £150 a week. A result is an enquiry. A new customer is worth about £400 and 3 in 10 enquiries become one, so an enquiry is worth about £120. You'd like an enquiry to cost £25. The app will show a green light at £25 or under, amber up to £31.25, and red above that.

Use their real numbers. The light bands come from the app (up to 25 per cent over target is amber): say them, don't work out any other.

Tick this step in `setup/progress.md`.
