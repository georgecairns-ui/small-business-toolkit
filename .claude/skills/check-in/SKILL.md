---
name: check-in
description: The regular check-in that keeps the task list up to date on its own. Copies the calendar in, sorts new email (drafting replies), writes up new calls, and adds new suggestions to Review. Use for scheduled runs ("Run /check-in"), or when the person says "check in", "check my inbox", "anything new?" or "what's come in?".
---

# Check in

The routine that makes the task list feel live. It runs every hour if setup step 7 scheduled it, or whenever the person asks. It adds and updates; it never removes anything the person has approved.

## What you need

- `apps/task-list/data/tasks.json` and `apps/task-list/CLAUDE.md` (the data format).
- The connections listed in `context/tools.md`.

## Steps

1. Read `apps/task-list/data/tasks.json` now. Note `triage.lastRunAt`: everything since then is new.
2. **Calendar.** If a calendar is connected, copy events from yesterday to 14 days ahead into `events`, replacing the list, and set `eventsSyncedAt`.
3. **Inbox.** If email is connected, follow `.claude/skills/triage-inbox` for emails since `triage.lastRunAt` (or the last 24 hours if it's empty).
4. **Calls.** If a call recorder is connected, follow `.claude/skills/process-calls` for calls since the last run.
5. **Replies already dealt with.** For each reply still `waiting`, check the thread: if the person has since replied themselves, set its `status` to `replied`.
6. **Today's plan.** If it's the first check-in of the day and there's no plan for today, follow `.claude/skills/sort-my-day`. Otherwise, add any new suggestion that clearly belongs on today as a `proposed` plan item with a reason; don't rewrite the plan.
7. **What Claude can do.** Follow `.claude/skills/spot-claude-tasks` for new or changed open tasks, so the ones you could do carry a "Claude can do this" tag and a ready prompt.
8. Update `triage`: `lastRunAt` now, `nextRunAt` (now plus the schedule interval, or null if this was a one-off), and add this run's counts to `emailsScanned`, `needReply`, `newTasks`, `noAction` and `callsProcessed` if `lastRunAt` was today (start from zero if it was an earlier day).
9. Save safely: read the file right before writing, write the whole file, read it back and check it parses.
10. Make sure the task list is running, so the person sees the update: `bash setup/scripts/start-task-list.sh` (Mac or Linux) or `powershell -ExecutionPolicy Bypass -File setup\scripts\start-task-list.ps1` (Windows). It does nothing if it's already running.

## What to say

If the person asked: one or two lines. "2 new emails need a reply (both drafted, in your Inbox), 1 new task from your call with Tom, nothing else urgent."
If this is a scheduled run, say nothing unless something is urgent (an email marked urgent, a call action due today); then one line.

## Rules

- Read and draft only. Never send, reply, delete, archive, accept or post anything.
- Never re-add something the person dismissed (check `source.ref` and dismissed tasks and replies).
- Keep each run quick: at most 50 emails and 5 calls per run. If there's more, do the newest and note the rest for next time.
- If a connection fails, carry on with the others and note the failure in `setup/progress.md`.
