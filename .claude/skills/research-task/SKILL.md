---
name: research-task
description: Works out how to do a task the person isn't sure how to do (pay a tax bill, renew a licence, register for something, set up a supplier) and adds a short "How to do this" guide to the task, with official links. Shown in the task's panel in the app. Use when a brain dump or suggested task needs know-how, or when the person says "how do I...", "research this", "help me do this".
---

# Research a task

## When to use

- Sorting the brain dump or inbox turns up a task that needs know-how (anything involving HMRC, Companies House, insurance, licences, banks, software they haven't used).
- The person asks "how do I...?" or presses "Ask Claude how to do this" in the app.

## Steps

1. Work out exactly what they need to do, from the task and `context/business.md` (sole trader or limited company, UK or elsewhere, VAT registered or not). If one fact changes the answer completely, ask one question.
2. Research it from **official sources first**: GOV.UK for UK tax and company matters (HMRC, Companies House), the provider's own help pages for software and services. Use web search if you have it. Never rely on memory alone for anything involving tax, law, deadlines or money; if you can't check a source, say so in the guide.
3. Add a `guide` to the task in `apps/task-list/data/tasks.json`:
   - `summary`: 1 or 2 sentences: what it involves and what to have ready.
   - `steps`: 3 to 6 short steps, in order, in plain English.
   - `links`: the official pages you used, `{ label, url }`, most useful first.
   - `researchedAt`: now.
4. Estimate how long it takes and set `durationMinutes` if it isn't set, so `schedule-it` can find a slot.
5. Save safely.

## Rules

- Accuracy over completeness. If the rules depend on their situation, say so in the summary and link the page that explains it.
- No personal financial, tax or legal advice: you explain the official process; for judgement calls, suggest their accountant or adviser (check `context/people.md` for who that is).
- Never log in, pay, submit or register anything for them.

## What to say

"I've added a short guide to paying your Self Assessment bill: what you need (your UTR), the 4 steps and the GOV.UK pages. It's about a 20 minute job. Want me to find a time for it?"
