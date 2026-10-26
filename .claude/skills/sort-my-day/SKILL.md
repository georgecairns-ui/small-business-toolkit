---
name: sort-my-day
description: Builds the morning plan in the task list. Use when the person says "sort my day", "plan my day", "what should I do today" or just "morning". Reads the task list, pulls in any new emails or calendar items worth acting on, carries over yesterday's unfinished approved tasks, and proposes 5 to 10 plan items with clear reasons for the person to approve in the app.
---

# Sort my day

## When to use

The person says "sort my day", "plan my day", "what should I do today" or "morning". This is the main daily routine.

## What you need

- `apps/task-list/data/tasks.json`, the task list.
- Anything filled in under `context/` (business, people, priorities, routines). If a file still says "not filled in yet", carry on and just note that more detail there would sharpen your reasons.
- The `triage-inbox` skill, if email or calendar is connected (check `context/tools.md`).

## Steps

1. Run the check-in first (`.claude/skills/check-in`, steps 2 to 5): calendar, inbox, calls. Then read `apps/task-list/data/tasks.json` right now, not from memory.
2. Work out the plan date situation:
   - If `plan.date` is an earlier day than today, note which items have `status: "approved"` and whose task is still `open`. These carry over. Then start fresh: set `plan.date` to today, `plan.preparedAt` to now, write a new `note`, and empty `items`.
   - If `plan.date` is already today, leave every `approved` or `skipped` item exactly as it is. You only add or replace `proposed` items.
3. If a calendar is connected, copy in their events from yesterday to 14 days ahead, replacing the `events` list and setting `eventsSyncedAt` (format in `apps/task-list/CLAUDE.md`). The app shows them on Today, Home and This week's calendar. Keep any meeting the person added in the app (`"source": "app"`) until the real calendar has it (see `apps/task-list/CLAUDE.md`). Use today's meetings in your reasons ("The call is at 2pm, so do this first").
4. If email or calendar is connected, run `triage-inbox` to find new actions since the last plan. Add each as a task with `suggested: true`, `addedBy: "claude"` and a `source`, checking first that nothing with the same `ref` or sender and subject already exists, including dismissed tasks.
5. Look at every open task. Decide its category (`today`, `quick-win`, `delegate`, `waiting`, `later`). Overdue and due-today items, money coming in or owed, and promises the person made come first.
6. Build 5 to 10 `proposed` plan items: carried-over tasks, your new suggestions, waiting items worth a chase, and anything worth delegating. Give each a one-sentence reason that names a date, amount or person where you can. Leave everything else off the plan; it stays in the app's "everything else" list.
7. Write a 1 to 2 sentence `note` on the plan, your honest read of the day. Then follow `.claude/skills/spot-claude-tasks`, so the tasks you could do for them show "Claude can do this" with a ready prompt.
8. If there are 5 or more unsorted brain dump lines, mention it and offer `sort-my-brain-dump`. On a Monday, offer `plan-my-week` once.
9. Save: read the file immediately before writing, write the whole file back, keep it valid, 2-space indented, read it back and check it parses.
10. Tell the person what happened.

## Rules

- Never mark anything `approved` yourself. Everything you add is `proposed`.
- Never touch `tasks.backup.json`.
- Use the person's local date, not UTC, for `plan.date`.
- If `context/priorities.md` has something filled in, let it steer which `today` items you pick.

## Good and bad reasons (worked example)

Good: "12 days overdue. A polite nudge now saves an awkward one later."
Good: "Priya asked for this by Thursday and it only takes 10 minutes."
Bad: "Important task." (no date, amount or name, tells the person nothing they didn't already know)

## What to say to the person

"I've sorted your day. There are 7 suggestions waiting for you in the app, about 3 minutes to go through. The big ones: chasing Marlow Dental's overdue invoice, and replying to Tom at Greenway Café about the signed contract. I found 2 new things in your inbox worth adding."

## If something is missing

If no context files are filled in, say so once, briefly, and carry on with what the task list already holds. If no email or calendar is connected, skip step 3 and mention that connecting one would let you catch things automatically (point to `connect-a-tool`).
