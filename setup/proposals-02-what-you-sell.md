# Step 3: what you sell (required)

Goal: their packages with prices, the money rules (VAT, payment terms, how long a proposal is valid), how they deliver and what happens when someone says yes. Every proposal's options and next steps come from this, and you never make a price up, so it can't be skipped.

Do the work first; they correct it. Don't make them type a price list out.

## 3.1 Draft it yourself

From their website (services and pricing pages), their brand guidelines, any proposals they dropped in during step 1, and (if email is already connected) recent quotes in their sent email, draft:

1. **What they sell, who to, and the problems they solve.** 3 or 4 lines. (If `context/sales.md` is already filled in, for example by Pipeline OS, use it and skip this.)
2. **Their packages**: for each, a name, one sentence on what it is, who it's best for, what's included (3 to 6 short lines), how long it takes, and the price with how it's charged (one-off, a month, a year, a day, an hour). Only prices you actually found. If a price isn't public, leave it blank for them.
3. **Extras** they offer on top, with prices if you found them.
4. **How they deliver**: the stages from yes to done, roughly how long each takes, who the client deals with, how often they check in.
5. **When someone says yes**: the steps to get started (agreement, deposit or first invoice, kick-off call, what the client needs to send).

## 3.2 Check it with them (one message)

Show your draft, short and scannable, and ask:

> Here's what I found on your website. Please correct anything that's wrong and fill in the gaps:
>
> **Packages**
> - Website refresh: £4,800, 5 to 6 weeks. Up to 8 pages, built for phones, enquiry forms, Google reviews. Best for a site that's dated but has the right pages.
> - Growth website: price? 8 weeks. Everything in the refresh, plus online booking and connected to your booking software.
>
> **Extras:** photography day (£650), care plan (price?).
>
> And 4 quick ones:
> 1. Are you VAT registered? (Then I'll show prices plus VAT.)
> 2. Your payment terms, in a line? (For example "50% to start, 50% on completion, invoices due in 14 days".)
> 3. How long is a proposal valid? (30 days is common.)
> 4. Do you have standard terms and conditions you send with proposals? If so, drop them in. I'll include them word for word, never write my own, and you should have them checked by a solicitor if you haven't.

If they won't give prices at all, explain once that proposals need a price for each option and you never make one up; offer to carry on with the other steps and come back to this. Note it in `setup/progress.md` and don't tick this step.

## 3.3 Save it

1. **`apps/proposals/data/proposals.json`** (save safely):
   - `packages`: one per package, in the format in `apps/proposals/CLAUDE.md` ("A package"). `id` is `pk-` plus a slug of the name. Prices as numbers, before VAT.
   - `extras`, the same way, `id` `x-` plus a slug.
   - `settings`: `currency`, `vatRegistered`, `vatRate` (20 in the UK), `paymentTerms`, `validDays`.
   - `settings.sections`: if they have terms, switch `terms` on.
   - `settings.signOff`: their name, role, work email and phone (from their email signature if you can see it; otherwise ask in the same message).
   - `settings.proposalsSetUp: true`.
2. **`context/sales.md`**: what they sell, who to, the problems they solve, who isn't a good fit. Change its status line to `Status: filled in on <date>`.
3. **`context/proposals.md`**: "How we deliver" and "When someone says yes", from 3.1 and their corrections. If they gave you terms, save them as `files/03-sales/terms.md` (word for word) and point to it under "Our terms". Change its status line to `Status: filled in on <date>`.

Tell them they can change any of this on the app's **Packages** page, and that prices on a single proposal can be changed there too ("Price for this proposal").

Tick step 3 in `setup/progress.md`.
