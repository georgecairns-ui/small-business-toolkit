---
name: research-a-prospect
description: Researches the person and business a deal is with before a sales call - who they are, their role, what the company does, how big it is and where - then checks them against the business's ideal client (settings.fitCriteria, from setup) and suggests how to structure the call. Saved on the deal as "Who you're meeting", with sources. Used by pipeline-check-in for every booked sales call, when the person presses Research them in the app, or when they say "research my call with Mark", "who am I meeting tomorrow?", "is Copper Kettle a good fit?".
---

# Research a prospect

## What you need

- The deal in `apps/pipeline/data/pipeline.json`: its people, organisation, timeline and any emails.
- `settings.fitCriteria` (what makes an ideal client for this business, built from setup) and `context/sales.md` (what they sell, who to, who isn't a fit).
- Web search. Their own emails with this person.

## Where to look

1. What you already have: their emails with this person, the enquiry, the booking form, the email signature (role, phone, website).
2. The company's own website: what they do, where, how many staff or sites, news.
3. A web search for the person and the company: their role, how long they've been there, press, reviews, Companies House for UK companies (when it was set up, the directors).
4. LinkedIn: only what's public in search results or the public profile page. Never sign in, never use the person's own LinkedIn account to look, and never use a tool that scrapes LinkedIn.

Stick to what helps the sale: their job, their business, public facts. Nothing personal (family, home, health, politics), even if it's out there.

## Steps

1. Read the deal and `settings.fitCriteria`. If there are no criteria yet, write them from `context/sales.md` (who they sell to, who isn't a fit) as 4 to 6 short lines, save them to `settings.fitCriteria` (`{ "text", "dealBreaker" }`), and tell the person in one line.
2. Research as above. Keep a note of each source you used.
3. Write `research` on the deal:
   - `person`: `{ "name", "role", "summary" }`. The summary is 1 or 2 sentences that help the call ("Runs day-to-day operations across 3 branches. Joined from a larger agency 2 years ago.").
   - `company`: `{ "name", "summary" }`: what they do, where, size, anything changing (a new site, a funding round, a new owner).
   - `fit`: one entry per criterion, in order: `{ "criterion": "<the criterion's text>", "result": "yes" | "partly" | "no" | "unknown", "why": "a few words of evidence", "dealBreaker": <from the criterion> }`. Use `unknown` when you couldn't find out: never guess. **Never write a score**: the app works it out from these.
   - `callPlan`: 3 to 5 steps for the call, each `{ "step", "minutes", "detail" }`, fitted to this person and to the deal check's biggest gaps (`qualify-a-deal`). Usually: open with something about them, find the real problem and what it costs, who decides and the budget, raise anything from "Also could help with", agree the next step.
   - `sources`: `[{ "label", "url" }]`, the pages you used.
   - `researchedAt`: now.
4. Fill in anything you found that the deal was missing: `organisation`, the person's `linkedin` URL (public profile only), the deal `summary`. Never change `value` from research.
5. If a must-have criterion is a clear `no`, say so in the deal's `coaching` ("Pennywell is outside the South West, which you said is a must. Worth a quick call to check before you spend time on a proposal.").
6. Save safely (read right before writing, write the whole file, read it back, check it parses).

## What to say, when asked

3 or 4 lines: who they are, the fit score the app shows and why, and the one thing to get out of the call. "Mark Ellis co-owns Ellis Joinery in Keynsham, 6 staff. An 80% fit: everything matches except you don't know the budget yet. Go in to find out whether his brother Joe has a say."
