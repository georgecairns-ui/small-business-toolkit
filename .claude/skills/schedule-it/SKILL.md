---
name: schedule-it
description: Finds a good time for a task in the person's real calendar and suggests it for approval; once approved, it's in the task list's calendar and the app offers Add to calendar. Use when a task needs a time ("when should I do this?", "book time for the HMRC payment", "put it in my diary"), from sort-my-brain-dump, or when a task needs focused time before a deadline.
---

# Schedule it

## Steps

1. Read the task file. Check the calendar copy in `events` is fresh (copy it in again if `eventsSyncedAt` is more than an hour old).
2. Work out how long the task needs (`durationMinutes`, or a sensible guess) and when it must be done by (`due`).
3. Find free slots in working hours (`settings.dayStarts` to `settings.dayEnds`, weekdays unless they work weekends) that don't clash with `events` or other timed tasks. Prefer: before the deadline with a day to spare; mornings for focused work; not straight before an important meeting; not the last slot of a Friday.
4. Suggest the best one: set `proposedDate`, `proposedTime` and a one-line `proposedReason` on the task ("Tomorrow at 9 is free and it's due Friday"). It appears in Review and on This week as a dashed card. When they approve it, the app offers **Add to calendar**, which opens the event, filled in, in their Google or Outlook calendar for them to save.
5. If they ask in chat ("put it in my diary for Thursday at 10"), they've approved it: set `scheduledDate`, `scheduledTime` and `durationMinutes` directly, and tell them to press Add to calendar on the task, or offer to create the event in their calendar yourself.
6. Save safely.

## Creating real calendar events

Only create an event in their real calendar when they've said yes to that specific event in this conversation, and only if their calendar connection can create events. Use the task title, the time, and in the description the task notes and the "How to do this" summary if there is one. Then set `calendarAddedAt` on the task. Never invite other people, and never move or delete existing events.

## What to say

"Tomorrow at 9 is free and it's a 20 minute job, so I've suggested that. Approve it in Review, then press Add to calendar and it's booked."
