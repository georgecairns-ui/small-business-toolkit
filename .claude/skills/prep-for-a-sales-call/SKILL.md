---
name: prep-for-a-sales-call
description: Gets the person ready for a sales call in 2 minutes - who they're meeting, what's happened so far, what they promised, the deal check gaps to close and the exact questions to ask, plus any other problem worth raising. Saved as call prep in Review (and the task list when attached). Used by pipeline-check-in the day before a sales call, or when the person says "prep me for my call with Mark", "what do I need to know before the Hollins call?".
---

# Prep for a sales call

## What you need

- The deal in `apps/pipeline/data/pipeline.json`: `nextMeeting`, `timeline`, `check`, `alsoHelp`, `nextSteps`.
- `context/sales.md` for how a sale usually goes and who they compete with.
- If the deal is new and there's little to go on: their website (if you can read web pages) and the emails so far.

## Steps

1. Read the deal. If there's no deal yet for this meeting, add one first (see `pipeline-check-in`). If it has no `research` from the last 30 days, follow `.claude/skills/research-a-prospect` first.
2. Write the prep, short enough to read in 2 minutes:
   - **Who**: the people, their roles, how they found the business, and the fit score the app shows (from the research).
   - **So far**: 2 or 3 lines from the timeline.
   - **You promised**: anything the person said they'd do and hasn't done (from `nextSteps` and the timeline). Say if it's late.
   - **Find out**: the 2 or 3 biggest deal check gaps as plain questions, in the order to ask them (from `check.questions`, refreshed).
   - **Worth raising**: one `alsoHelp` item, if there is one, with its question.
   - **Watch for**: the top risk.
   - **How to run it**: the research's call plan, in one line per step.
3. Save it on the deal (`nextMeeting.prep`: the questions) and add a `prep` suggestion: `title` "Prep for your call with Mark Ellis tomorrow at 10am", `reason` one line (the single most important thing to find out), with the full prep in `notes` on the suggestion.
4. If Task List OS is attached, add a suggested task "Prep for your call with Mark Ellis", due the day of the call, with the prep in its notes and `source: { "tool": "pipeline", "id": "<deal id>" }`.
5. Save safely.

## What to say, when asked

The prep itself, as above, in chat. Under 150 words.
