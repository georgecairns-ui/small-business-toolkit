---
name: wrap-up-my-day
description: Gives a short end-of-day summary of what got done, what rolls over and who's being waited on. Use when the person says "wrap up my day", "end of day" or "what did I get done".
---

# Wrap up my day

## When to use

The person says "wrap up my day", "end of day", "what did I get done" or similar, usually late afternoon or evening.

## What you need

- `apps/task-list/data/tasks.json`.
- `settings.minutesSavedPerTask` and `settings.minutesSavedPerPlan` from the task list, to estimate time saved.

## Steps

1. Read `apps/task-list/data/tasks.json`.
2. Look at today's plan items and their tasks:
   - Done: tasks marked `status: "done"` with a `doneAt` today.
   - Rolls over: plan items that are `approved` but whose task is still `open`.
   - Waiting on someone: open tasks in the `waiting` category, with `waitingOn` and how long.
3. Work out time saved today from the `activity` log: count `task-done` lines from today and add their `minutes`, plus `minutesSavedPerPlan` if a `plan-approved` line exists for today.
4. Give a short, kind summary in plain English. Lead with what got done.
5. Offer, do not assume, to note anything for tomorrow. If they give you something, add it as a task with `addedBy: "you"` and ask if it should go in tomorrow's plan.

## Rules

- Change nothing in the file unless the person explicitly asks you to (for example, marking something done they forgot to tick, or adding a note for tomorrow).
- Do not editorialise about tasks that did not get done. State it plainly, no judgement.
- Keep the summary to a few sentences unless they ask for more detail.

## What to say to the person

"Good day. You got 4 things done, including chasing the Marlow Dental invoice. 2 tasks roll over to tomorrow: the website photos and booking the accountant call. You're still waiting on a quote from your supplier, 6 days now. Looks like about 34 minutes saved today. Want me to note anything for tomorrow before you go?"

## If something is missing

If no plan was prepared today (`plan.date` is not today), say so and summarise from the task list generally: what is marked done today, what is still open, what is waiting. Still offer to note something for tomorrow.
