---
name: sort-my-brain-dump
description: Turns the person's brain dump (lines they typed, or voice notes they recorded with the Voice note button in the task list) into proper suggested tasks for them to approve, with clear titles, the right list, dates and people. Use when the person says "sort my brain dump", "deal with my notes", "turn that into tasks", or pastes a messy list and says "sort this out".
---

# Sort my brain dump

## When to use

The person says "sort my brain dump", "deal with my notes", "go through what I wrote", or pastes a messy list into the chat and asks you to sort it. Also offer it during "sort my day" when there are 5 or more unsorted lines.

## What you need

- `apps/task-list/data/tasks.json` and `apps/task-list/CLAUDE.md` (the data format, especially `dump`, `people` and suggested tasks).
- `context/people.md` and the `people` list, so "ask Priya" links to the right person.

## Steps

1. Read `apps/task-list/data/tasks.json` right now. Take what you've been given: the part of a shared brain dump note that `.claude/skills/sort-brain-dump` handed you (from `apps/home/data/braindump.json`; use its id as `source.ref`), and every `dump` item here with `"status": "unsorted"`. If the person pasted a list instead, add each line to `dump` first, as unsorted.
2. **Voice notes** (`"kind": "voice"`) are one long, spoken paragraph, not neat lines. Read the whole thing first, then pull out every separate thing they mentioned, in the order they said it. Ignore filler ("um", "so anyway", "what else"). People ramble; one sentence can hold 3 jobs, and a job can be spread across several sentences.
3. For each line (or each thing pulled from a voice note), decide what it is:
   - **A task.** Write a clear title that starts with a verb ("ask Priya if she can do 4 days in November" becomes "Ask Priya about 4 days a week in November"). Choose a category. Pull out any date ("before the 20th" becomes `due`), amount or name into `notes`, `due` and `personId`.
   - **Several tasks.** Split it ("sort the van and the insurance" is 2 tasks).
   - **A bigger aim**, not a task ("get on top of invoicing"). Turn it into the first clear task towards it ("Send the 3 overdue invoices"), and mention the aim in your summary in case it belongs in `context/priorities.md`.
   - **Already on the list.** Don't duplicate it. Link the line to the existing task.
   - **Nothing to do** (a thought, a worry, a reminder that's already handled). Mark the line `dismissed` and mention it in your summary.
   - **Personal** ("Mum's birthday, book the restaurant"). It's still a task if they wrote it down. Category `later` or with its date, never shared with anyone.
   - **An email or message to send** ("email Tom about the quote", "tell Priya I can't do Thursday"). Make it a task ("Email Tom about the quote") and add an `emailDraft` `{ to, subject, body }` to the task, written in their voice following `.claude/skills/human-email`, with the address from `people` or their email if you can find it. The task's panel in the app shows it with a **Draft** button that opens it, written and addressed, in their email. Leave square-bracket gaps for facts only they know. Never send it.
4. Add each new task with `"suggested": true`, `"addedBy": "claude"` and `"source": { "type": "braindump", "from": "Your brain dump", "subject": "<the original line>", "date": "<today>", "ref": "<the dump item's id>" }`. They appear in Review with a "New" tag.
5. Mark each line `"status": "sorted"`, with `sortedAt` now and `taskIds` listing the tasks it became.
6. **Know-how.** If a task needs know-how the person may not have (anything involving HMRC, Companies House, banks, licences, software they don't use), follow `.claude/skills/research-task` and attach a short guide.
7. **When.** For each task with a deadline or that clearly needs doing soon, follow `.claude/skills/schedule-it` to suggest a time from their free calendar slots. The app shows the suggested time on the card, and once approved offers Add to calendar. Their brain dump said "pay my tax to HMRC"; they should end up with a task, a guide, a suggested slot and one click to put it in their diary.
8. If something is clearly for today, also add a `proposed` item to today's plan with a reason (create today's plan with `preparedAt` now if it doesn't exist).
9. Save safely: read right before writing, write the whole file, read it back and check it parses.
10. Tell the person, including any time you suggested. If nobody is watching (the task list asked you to sort a voice note), keep going without questions and put any doubts in the task's `notes`; the app tells them when you've finished.

## Rules

- Everything you make is a suggestion. The person approves it in Review.
- Keep their meaning. If a line is ambiguous, make your best reading and put the original line in `notes`, rather than asking about every line. Ask at most one question, for the line that really can't be guessed.
- Never drop a line silently. Every line ends up as a task, linked to an existing task, or dismissed with a mention.

## What to say to the person

"I've sorted your brain dump. 6 lines became 6 tasks, all waiting in Review. I left 'feeling behind on admin' off the list, as it's a feeling rather than a task, but sorting your day each morning should help with that one."

## If something is missing

If there's nothing unsorted, say so and suggest they use Brain dump whenever their head's full: "Type everything in, one thing per line, and say 'sort my brain dump'."
