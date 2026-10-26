# Step 4 of 6: your regular payments, VAT and tax

Goal: the money going out is confirmed, the person's VAT and tax details are saved, and the app knows the balance that makes them nervous. This is what turns the money view from a list into a forecast.

## 1. Bring the numbers up to date

Follow `.claude/skills/update-my-money-view`. It reads the connected accounts software and its bank feed, adds the bank lines and invoices, and suggests the regular payments it spotted. Tell them what's about to happen in one sentence: "I'm going to read what's in your accounts software and its bank feed, then show you the regular payments I think I've spotted." Read only: it moves nothing and sends nothing.

## 2. Confirm the regular payments

Show the suggested payments (the `outgoings` with `status: "suggested"`), most expensive first: name, amount, how often, next date. Say where each came from ("From your Xero bank feed: Adobe, £54.99 on the 12th each month"). Ask:

> Do you want to go through these one at a time, or confirm them all at once?

- They confirm: set `status: "confirmed"`. They can change the name, amount, how often or the category as you go.
- They say it's not a regular payment: `status: "dropped"`. Never delete it.
- Anything missing: **"Is there a regular payment I've missed?"** (rent, wages, a loan, insurance, software, an accountant.) Add each as a confirmed outgoing, with `source: "you"`, the amount and day as they say.

Only confirmed payments count in the forecast. Say so.

## 3. Big ones coming

**"Is there anything big coming up in the next few months, a one-off or a loan that ends?"** Add each as a confirmed outgoing: `repeat: "none"` and its date for a one-off, or `endDate` for a loan that ends. Never guess the amount. If they don't know a date, leave it out and say so.

## 4. Tax, one question at a time

1. **"Are you registered for VAT?"** Save `settings.vat.registered`.
   - If yes: **"Do you use the standard scheme or the flat rate scheme?"** (`standard` or `flat`.) For flat rate: **"What flat rate percentage are you on?"** (`settings.vat.flatRate`, from their own VAT letter or accountant, never from you.) **"Which months do your VAT quarters end in?"** (`quarterEnds`, for example 3, 6, 9 and 12.) **"Do you pay VAT when you invoice, or when you're paid?"** (`cashAccounting` true if when paid.)
   - If no: `registered: false`, and leave the rest.
2. **"Are you a sole trader, a partnership or a limited company?"** Save `settings.businessType` (`sole-trader`, `partnership` or `limited`).
3. **The year.** For a sole trader or a partnership, the tax year starts 6 April: leave `settings.yearStart` as `04-06`. For a limited company: **"When does your company's financial year end?"** and set `yearStart` to the day after it, as `MM-DD`.
4. **"What does your accountant tell you to put aside for tax?"** Save the percentage they give you in `settings.tax.setAsidePercent`, and anything else they said in `settings.tax.note`. You never choose, suggest or compare a percentage. If they don't know: leave it at 0, say "That's fine. Ask your accountant, and you can type it into Settings later. Until then the tax pot only counts VAT.", and add a flag: `kind: "tax"`, `text: "Ask your accountant what to put aside for income or corporation tax, then set it in Settings."`, `status: "open"`, `at` now.
5. **"What balance in the bank would make you nervous?"** Save `settings.nervousBalance` as the number they say (0 if they don't mind). The chart draws a line at it.

## 5. Save as you go

- `apps/money/data/money.json`: `outgoings`, `settings.vat`, `settings.businessType`, `settings.yearStart`, `settings.tax`, `settings.nervousBalance`, `flags`.
- `context/money.md`: "VAT", "Tax (what the accountant says)" and "Regular bills", in their words, and "Customers who pay late" if they mention any.

Don't tell them what they owe. The app works the figures out, and it labels them estimates.

Tick this step in `setup/progress.md`.
