---
name: plan-my-week
description: Plans the week in the task list. Suggests a sensible day (and sometimes a time) for the tasks that need one, around the person's real calendar, for them to approve in Review. Use when the person says "plan my week", "what does my week look like", "help me plan the week" or on a Monday morning.
---

# Plan my week

## When to use

The person says "plan my week", "what does my week look like", "help me get on top of the week", or it's Monday and they say "sort my day" (offer to plan the week as well, once).

## What you need

- `apps/task-list/data/tasks.json` and `apps/task-list/CLAUDE.md` (the data format).
- Their calendar, if connected, so you plan around meetings. Check `context/tools.md`.
- `context/priorities.md` and `context/routines.md`, if filled in.

## Steps

1. Read `apps/task-list/data/tasks.json` right now.
2. Copy in their calendar for the week (see the calendar section of `apps/task-list/CLAUDE.md`), so you can see which days are full.
3. Work out what matters this week from deadlines, money, promises made and `context/priorities.md`. (The app no longer shows weekly goals: don't add any to `week.goals`.)
4. **Days for tasks.** Look at open tasks with no `scheduledDate`, and open tasks scheduled on a day that's now overloaded. For each that clearly belongs on a particular day this week, set `proposedDate` (and `proposedTime` only if a specific slot genuinely matters), with a one-line `proposedReason` naming the reason ("Thursday afternoon is clear", "Do it before Jo's call on Wednesday").
   - Respect their working days and hours from `settings` and `context/routines.md`.
   - Keep each day realistic: no more than about 5 hours of tasks on a day with 3 hours of meetings.
   - Put deadline work at least a day before the deadline.
   - Don't propose days for `waiting` tasks.
   - Limit yourself to about 10 proposals per week.
5. Save safely: read right before writing, write the whole file, read it back and check it parses.
6. Tell the person what you did.

## Rules

- Never set `scheduledDate` or `scheduledTime` yourself. Use `proposedDate` and `proposedTime`; the person approves them in Review.
- Never create or change events in their real calendar.
- If a task is already scheduled for a sensible day, leave it alone.
- Never re-propose a day the person has just skipped for the same task this week. If `proposedDate` was removed and the task is still unscheduled, leave it for them.

## What to say to the person

"I've planned your week: suggested days for 8 tasks around your meetings. Wednesday is your busiest day, so I've kept it light. They're waiting in Review; approve what works, then Tasks, This week shows the plan."

## If something is missing

If no calendar is connected, plan anyway and say so: "I can't see your calendar, so I've spread things evenly. Connect it and I'll plan around your meetings." Point to `.claude/skills/connect-a-tool`.
