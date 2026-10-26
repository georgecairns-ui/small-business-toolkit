---
name: qualify-a-deal
description: The deal check - qualifies a deal in Pipeline OS against MEDDPICC's 8 questions, asked in plain English (what is the problem costing them, who signs it off, what will they judge it on, how and when will they decide, contracts or checks, what's hurting, who else they're considering, who's pushing for it). Each answer is Known, Partly known or Not known yet, with the evidence. Adds risks, buying signals and the questions to ask next time. Used by update-a-deal after every call, email or note, or when the person asks "how qualified is this deal?", "qualify the Hollins deal", "is this deal real?".
---

# Qualify a deal (the deal check)

Most small business owners never ask the questions that tell them whether a deal is real. This check asks them for every deal, every time something new happens, and tells the person what to ask next. Based on MEDDPICC, a standard way to qualify sales. Never use the word MEDDPICC or the field names with the person: say "the deal check" and name each question in plain words (their own wording is in `settings.checkLabels`).

## What you need

- The deal in `apps/pipeline/data/pipeline.json` (its `check`, `timeline` and notes) and the new evidence: a call, notes, an email thread.
- `context/sales.md`, so the questions fit what they sell, who usually signs off, how a sale usually goes and who they compete with.

## The 8 questions

| Key | Answer this from what was actually said |
|---|---|
| `metrics` | What is the problem costing them? Numbers they said: hours, money, lost customers, mistakes. Not numbers you work out. |
| `economicBuyer` | Who signs it off? Name and role. In a small firm usually the owner or a director. |
| `decisionCriteria` | What will they judge it on? Price, quality, speed, looks, trust, how easy it is. |
| `decisionProcess` | How and when will they decide? Who else is involved, what steps, what date. |
| `paperProcess` | What has to happen before they can buy? A contract review, a purchase order, a board meeting, a landlord's permission, finance. |
| `pain` | What's actually hurting, in their words? What made them get in touch now. |
| `competition` | Who or what else are they considering? Another firm, doing it themselves, doing nothing. |
| `champion` | Who on their side wants this to happen and will push for it when the person isn't in the room? |

## Status rules

- **known**: said plainly. You can quote or closely paraphrase it, and say who said it.
- **partly**: hinted at or half-answered. Say what's known and what's missing.
- **gap**: not covered. A gap is more useful than a guess. Never fill one by inference.

Never say something was said when it wasn't. Never infer a budget, a date or who decides. Put who said it in `evidence`.

An answer only gets better with new evidence. Something known stays known unless the new evidence contradicts it: then don't quietly change it. Keep it, add the contradiction to `risks` ("Dev said the directors decide, but today Sam the owner said she signs it off"), and make clearing it up the first question.

## Steps

1. Read the deal and everything new.
2. Update each of the 8 answers: `{ "status", "answer", "evidence" }`.
3. `risks`: anything that threatens the deal, most serious first. Include a contradiction, a missing decision-maker, a competitor, a price worry, going quiet.
4. `signals`: anything that shows they're ready to move. Asking about start dates, asking for a contract, bringing in the decision-maker, a deadline of their own.
5. `questions`: 3 to 5 questions for the next conversation, ordered by how much each would move the deal, closing the biggest gaps first. Write them the way the person would ask them, in plain words, fitted to the business ("Who else at Hollins needs to see the proposal before you decide?").
6. Set `checkedAt` to now. Never write a score: the app works it out (Known 1, Partly known 0.5, out of 8).
7. If the deal clearly doesn't fit who they sell to (`context/sales.md`, "Who isn't a good fit"), say so plainly in the deal's `coaching`, and suggest marking it lost or parking it.

## What to say, when asked

The score the app shows, the 1 or 2 biggest gaps and the first question to ask. "The Hollins deal is at 69%. You know what it's costing them and that Dev wants it, but not who signs it off. Ask Dev who else needs to see the proposal."
