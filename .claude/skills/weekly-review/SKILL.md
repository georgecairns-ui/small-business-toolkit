---
name: weekly-review
description: The Friday look-back and look-ahead. Use when the person says "weekly review", "how was this week" or it's Friday and they ask for a wrap-up. Covers what got done, what slipped, who's waited too long, and next week's top priorities, and offers to update context/priorities.md with the person's approval.
---

# Weekly review

## When to use

Fridays, or whenever the person asks for a weekly review, "how did this week go" or similar.

## What you need

- `apps/task-list/data/tasks.json`, especially `activity` for the week and tasks in the `waiting` category.
- `context/priorities.md`, to compare against what actually happened and to propose updates.
- The `polite-chaser` skill for anything waited on too long.

## Steps

1. Read the task list. Gather:
   - Done this week: tasks with `doneAt` in the last 7 days.
   - Slipped: open tasks that were due this week, or carried over more than twice in plans.
   - Waiting too long: `waiting` category tasks where `waitingSince` is more than 5 days ago.
2. For each item waiting too long, offer a polite chaser message, a short draft the person can send, not something you send yourself.
3. Look at `context/priorities.md` if it is filled in. Note anything that seems to have changed, based on what actually happened this week.
4. Say how the week went, honestly and briefly. Then propose next week's top 3 to 5 priorities, in plain English, based on what is open, due soon or waited on. If they agree, offer `plan-my-week` on Monday to give those tasks days.
5. If you think `context/priorities.md` should change, say exactly what you'd write and ask for a yes before touching the file.
6. Change nothing in the task list or context files until the person says yes to something specific.

## Rules

- Do not mark anything done, dismissed or chased without the person telling you to.
- Keep the "what slipped" section factual and kind, not critical.
- Only draft chaser messages; never send them.
- Only edit `context/priorities.md` after an explicit yes, and only the part discussed.

## What to say to the person

"This week: 11 done, including the website photos. 2 things slipped, the accountant call and the supplier quote chase, both just ran out of time rather than anything going wrong. You've been waiting on Greenway Café for 8 days now, want me to draft a polite nudge? For next week, the 3 that matter most look like: the VAT return, following up Marlow Dental, and planning the autumn newsletter. Want me to update your priorities notes to reflect that?"

## If something is missing

If `context/priorities.md` says "not filled in yet", skip the comparison step and just propose next week's priorities from the task list alone. Mention that filling in priorities would make this sharper over time.
