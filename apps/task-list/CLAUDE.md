# Task list: standing instructions for Claude

This folder is the task list app inside Task List OS. You (Claude) and the app share one file, `data/tasks.json`. The person you work for sees it as a proper piece of software: Home (a dashboard), Today, This week (a board, with a Calendar view inside), Inbox, Review, All tasks (with Waiting on and Done), Calls, Brain dump and People. They approve your suggestions there with one click. You keep it sorted and up to date. Read this file every time you work with the task list.

The app runs at **http://localhost:4747**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-task-list`). The helper reads and saves this same file, so you keep editing it directly as described below; the app picks up your changes within a few seconds. If setup has not happened yet (the tasks in `data/tasks.json` still have `"example": true`), follow `START-HERE.md` in the main folder first.

The routines live as skills in `.claude/skills/` in the main folder: `check-in` (the regular update), `triage-inbox`, `process-calls`, `sort-my-day`, `plan-my-week`, `sort-my-brain-dump`, `research-task`, `schedule-it` and `wrap-up-my-day`. This file is the reference for the data they read and write.

## The one rule: you propose, they approve

Nothing you suggest counts until the person approves it. You may add tasks they ask you to add, and update tasks when they tell you something changed. You never approve your own suggestions, never mark a task done unless they tell you it is done, and never delete a task unless they ask.

The same goes for their email, calendar and other connected apps: you read them to spot work and copy in their calendar, and you may prepare drafts. You never send, reply, delete, archive, pay, post, book or accept anything on their behalf, and you never change their real calendar.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your task list" or "the app", and "I've updated your list". Never say agent, repo, repository, artifact, JSON, schema or file format to them. If you must mention the file, call it "your task file".
- After every change, tell them in one or two lines what you changed and that the app shows it within a few seconds if it's open.
- No em dashes. Use digits for numbers.

## The data file: `data/tasks.json`

Everything lives in this one file. The app checks it every few seconds and saves the person's clicks back into it.

```json
{
  "about": ["..."],
  "formatVersion": 2,
  "settings": { "yourName": "Sam", "businessName": "Fern & Finch", "minutesSavedPerTask": 6, "minutesSavedPerPlan": 20, "dayStarts": "08:00", "dayEnds": "18:00", "emailProvider": "gmail", "calendarProvider": "google" },
  "tasks":  [ { ...task... } ],
  "plan":   { "date": "2026-10-06", "preparedAt": "2026-10-06T07:55:00.000Z", "note": "...", "items": [ { ...plan item... } ] },
  "week":   { "start": "2026-10-05", "goals": [ { "id": "g-a1b2c3", "text": "Get the Marlow invoice paid", "done": false, "addedBy": "claude" } ], "note": "" },
  "events": [ { ...calendar event... } ],
  "eventsSyncedAt": "2026-10-06T07:50:00.000Z",
  "people": [ { ...person... } ],
  "dump":   [ { ...brain dump line... } ],
  "replies":  [ { ...email that needs an answer, with a draft... } ],
  "meetings": [ { ...a call, written up... } ],
  "triage":   { "lastRunAt": "2026-10-06T10:30:00.000Z", "nextRunAt": "2026-10-06T11:30:00.000Z", "emailsScanned": 47, "needReply": 6, "newTasks": 4, "noAction": 37, "callsProcessed": 2 },
  "activity": [ { "at": "2026-10-06T09:15:00.000Z", "type": "task-done", "taskId": "t-k3j9x2", "minutes": 6 } ]
}
```

An older file with `formatVersion: 1` is fine. The app adds the missing sections the next time it saves; you can add them too.

### A task

| Field | What it means |
|---|---|
| `id` | Unique. Make new ones as `t-` plus 6 random lowercase letters or digits, for example `t-k3j9x2`. Never reuse or change an id. |
| `title` | Short, starts with a verb where possible: "Chase Marlow Dental for the overdue invoice". |
| `notes` | Optional detail: names, amounts, phone numbers, links. |
| `category` | A category key from `settings.categories` (the standard ones: `today`, `quick-win`, `delegate`, `waiting`, `later`). |
| `inProgress` | `true` when the person has started it: the In progress column on the board. Leave it alone unless they say they've started or stopped. |
| `categoryBeforeWaiting` | Set by the app when a task is dragged to Waiting on, so it goes back to its old category when moved out. Don't change it. |
| `status` | `open`, `done`, or `dismissed` (a new suggestion the person said no to). |
| `due` | The deadline, `"YYYY-MM-DD"` or `null`. |
| `scheduledDate` | The day the person plans to do it, `"YYYY-MM-DD"` or `null`. The week board and calendar use this, falling back to `due`. |
| `scheduledTime` | A time slot on that day, `"HH:MM"` (24 hour) or `null`. Shows as a block on the calendar. |
| `durationMinutes` | Length of the time slot. Default 30. |
| `personId` | The `id` of the person this task is for, with or waiting on, from `people`. Or `null`. |
| `waitingOn` | Who they are waiting on, as text, when the category is `waiting`. Keep it even when `personId` is set. |
| `waitingSince` | `"YYYY-MM-DD"` when it started waiting. |
| `delegateTo` | Who should do it, when the category is `delegate`. |
| `addedBy` | `you` if the person added it, `claude` if you suggested it. |
| `created`, `doneAt` | Full timestamps, for example `"2026-10-06T09:15:00.000Z"`. `doneAt` is `null` until done. |
| `minutesSaved` | Optional. Overrides the default time-saved estimate for this task. |
| `suggested` | `true` on a new task you spotted yourself (email, calendar, a meeting, the brain dump) that the person has not approved yet. It shows in Review with a "New" tag and stays off their list until they approve it, which removes this field. |
| `source` | Where a suggested task came from: `{ "type": "email", "from": "Tom at Greenway Café", "subject": "Signed contract attached", "date": "2026-10-06", "ref": "<message id if you have one>" }`. `type` is `email`, `calendar`, `meeting`, `braindump` or `other` (add a `label` for other). Keep it after approval; it is how you avoid suggesting the same thing twice. |
| `proposedDate`, `proposedTime`, `proposedReason` | Your suggested day (and optionally time) for an existing task, from "plan my week". Shows as a dashed card on the week board and in Review. Approving moves it into `scheduledDate` and `scheduledTime`. Never set `scheduledDate` yourself unless the person asks for that specific task. |
| `guide` | "How to do this", from `research-task`: `{ "summary": "...", "steps": ["..."], "links": [{ "label": "Pay your Self Assessment tax bill (GOV.UK)", "url": "https://www.gov.uk/pay-self-assessment-tax-bill" }], "researchedAt": "<timestamp>" }`. Shown in the task's panel. |
| `replyId` | Links a task to the email in `replies` it came from, so the panel can open the draft. |
| `claude` | Written by `.claude/skills/spot-claude-tasks` when you could do this task: `{ "how": "one plain sentence", "uses": ["Gmail"], "prompt": "the full prompt", "checkedAt": "<now>" }`. The app shows "Claude can do this" and an Open in Claude button that opens a new Claude Code session in this folder with the prompt ready; the person presses send. Remove it when the task no longer fits. |
| `emailDraft` | An email the person needs to send for this task, drafted by you: `{ "to": "tom@greenway.example", "subject": "Quote for the menu boards", "body": "Hi Tom,..." }`. The task's panel shows it with a Draft button. |
| `dismissedAt`, `approvedAt`, `scheduledAt`, `calendarAddedAt` | Timestamps the app sets. Leave them alone. `calendarAddedAt` means the person pressed Add to calendar. |

### Where a task is (the board's columns)

The Tasks page shows each task in one of 4 columns, worked out from the task: **Done** (`status: "done"`), **Waiting on** (`category: "waiting"`), **In progress** (`inProgress: true`), otherwise **To do**. The person can rename the columns (`settings.stageLabels`); the order stays.

### The categories

The person can rename, recolour, add and remove categories in Preferences; the list is `settings.categories` (`[{ "key": "today", "label": "Do today", "colour": "" }, ...]`, where `colour` "" means the standard colour). Use their keys and labels. If it's missing, the standard 5 below apply. `waiting` always exists.


| Key | Shown as | Use it for |
|---|---|---|
| `today` | Do today | Needs the person soon: deadlines, money, promises made, anything that gets worse if it waits. Keep today's to 3 to 5. |
| `quick-win` | Quick wins | Under about 10 minutes each. Clearing them builds momentum. |
| `delegate` | Delegate | Someone else could do it. Fill in `delegateTo` and `personId` if you know who. |
| `waiting` | Waiting on someone | The ball is in someone else's court. Fill in `waitingOn`, `waitingSince` and `personId`. |
| `later` | Can wait | Nothing depends on it this week. |

### The plan for today

`plan` holds one day only. Each item points at a task:

```json
{ "taskId": "t-k3j9x2", "category": "today", "reason": "12 days overdue. A polite nudge now saves an awkward one later.", "status": "proposed" }
```

- `status` is `proposed` (waiting for the person), `approved` (they clicked Approve, or added it themselves) or `skipped` (they clicked Skip).
- `reason` is one short sentence explaining why. Make it specific: a date, an amount, a name. This is what makes the person trust the plan.
- `note` on the plan is your 1 or 2 sentence read on the day as a whole.
- The app only shows plan suggestions when `plan.date` is today and `plan.preparedAt` is set.
- Today's list in the app shows approved plan items plus any open task whose `scheduledDate` (or `due`) is today.

### Calendar events

Copies of the person's real calendar, so the app can show their day and week. Read only in the app.

```json
{ "id": "ev-<calendar's own id>", "title": "Website kick-off with Hollins Lettings", "start": "2026-10-06T14:00", "end": "2026-10-06T15:00", "allDay": false, "location": "Video call", "calendar": "Work", "source": "google", "ref": "<the calendar's event id>" }
```

- `start` and `end` are the person's local time, without a time zone. For all-day events use `"start": "2026-10-10"`, `"end": "2026-10-10"`, `"allDay": true`.
- Copy events from yesterday to 14 days ahead. Replace the whole `events` list each time you copy (it is a mirror, not a record), then set `eventsSyncedAt` to now.
- **Meetings the person added in the app** have `"source": "app"` (plus `guests` and `notes`). The app opened them in their calendar to save. When you copy the calendar, keep each one until the real calendar has an event with the same title on the same day, then drop the app copy. Never remove one otherwise: they may not have saved it yet.
- Leave out events they've declined and anything marked private, unless they ask. Keep titles as they are; don't copy attendee lists or descriptions into the file.

### People

The person's contacts: clients, customers, suppliers, team and advisers. Tasks link to them for "Who's it for". There's no People page in Task List OS (that's part of Pipeline OS); the app adds a person or company here when they type a new name in "Who's it for", with `role: "other"`.

```json
{ "id": "p-tom", "name": "Tom Ashby", "organisation": "Greenway Café", "role": "client", "email": "tom@greenway.example", "phone": "", "notes": "Owner. Prefers calls for anything big.", "lastContact": "2026-10-06T08:10:00.000Z" }
```

- `role` is `client`, `customer`, `supplier`, `team`, `adviser` or `other`.
- `id` is `p-` plus a short lowercase name or 6 random characters. Never change one; tasks point at it.
- You may add a person when the person asks, or during setup, or when a suggestion you're adding involves someone who clearly matters to the business (tell them you've added them). Keep `context/people.md` in step: it holds the softer notes (tone, history), this list holds the facts the app needs.
- Update `lastContact` when you see a recent email or meeting with them.
- Never store more personal detail than the work needs.

### Weekly goals

Older files have a `week` section with goals. The app no longer shows weekly goals, so don't add any; leave what's there.

### Brain dump

**Brain dump** (the button at the top of every page, shared by every tool) saves what the person says to `apps/home/data/braindump.json`, and the helper starts `.claude/skills/sort-brain-dump`, which hands the task list's part to `sort-my-brain-dump`. The `dump` list below is older: anything they asked you to note in chat, and notes from older copies. One item per note or line:

```json
{ "id": "b-x7k2p9", "text": "ask Priya if she can do 4 days in November", "createdAt": "2026-10-06T07:20:00.000Z", "status": "unsorted" }
```

- `status` is `unsorted`, `sorted` (you or the person turned it into tasks; `taskIds` lists them) or `dismissed` (removed, or nothing to do).
- `"kind": "voice"` marks a voice note: one long spoken paragraph. New voice notes go to the shared brain dump file instead (see above).
- See `.claude/skills/sort-my-brain-dump` for how to turn lines into suggested tasks.

### Replies: emails that need an answer (the Inbox page)

From `triage-inbox`. The app's Inbox page lists those `waiting`, urgent first, each with a **Draft** button that opens the draft, written and addressed, in Gmail, Outlook or their email app (from `settings.emailProvider`). The person checks it and sends it.

```json
{ "id": "r-k3j9x2", "from": { "name": "Dev Patel", "email": "dev@hollins.example" }, "subject": "Can we move today's kick-off to 2:30?",
  "receivedAt": "2026-10-06T09:12:00.000Z", "ref": "<message id>", "threadUrl": "<link to the email, if you have one>", "personId": "p-dev",
  "why": "Wants to move today's 2pm call by half an hour. You're free at 2:30.", "summary": "Dev's viewing is running over...",
  "urgency": "high", "status": "waiting",
  "draft": { "to": "dev@hollins.example", "cc": "", "subject": "Re: Can we move today's kick-off to 2:30?", "body": "Hi Dev,\n\n2:30 works fine..." } }
```

- `urgency` is `high`, `normal` or `low`. `status` is `waiting`, `replied` (the person marked it, or you saw their reply in the thread) or `dismissed` (no reply needed).
- The person can edit the draft in the app; keep their edits (`draftEditedAt` is set). Don't overwrite a draft they've edited.
- Never re-add a reply for a message `ref` that's already here, whatever its status.

### Meetings: calls, written up

From `process-calls` (or `meeting-follow-up` for pasted notes). Shown on the Calls page.

```json
{ "id": "m-x7k2p9", "title": "Discovery call with Ellis Joinery", "date": "2026-10-05T15:00", "source": "Fathom", "ref": "<recording id>", "transcriptUrl": "<link>",
  "personIds": ["p-mark"], "summary": "Mark wants a logo that...", "decisions": ["3 logo routes by Friday"], "actionTaskIds": ["t-a1b2c3"],
  "followUp": { "to": "mark@ellisjoinery.example", "subject": "Great to talk today", "body": "Hi Mark,..." } }
```

### Triage: when you last checked

`triage` powers the line at the top of Today and the Inbox ("Claude checked at 10:30: 47 emails sorted, 6 need a reply..."). `check-in` updates it every run. Counts are for today; start them from zero on a new day. `nextRunAt` is when the next scheduled check-in is due, or `null`.

### Settings for the app's buttons

The person changes these in Preferences (the cog). Besides those below: `defaultScope` (`today`, `week` or `all`) and `defaultView` (`board`, `list` or `calendar`) are how the Tasks page first opens; `stageLabels` renames the board's columns; `categories` is their category list (see above).


`emailProvider` decides where Draft opens: `gmail`, `outlook-work` (Microsoft 365), `outlook-personal` (Outlook.com, opens the computer's email app) or `other` (the computer's email app). `calendarProvider` decides where Add to calendar opens: `google`, `outlook-work`, `outlook-personal` or `other` (downloads a calendar file any calendar app can open).

### The activity log

The app adds a line to `activity` when a task is ticked off (`task-done`), added (`task-added`) or a whole plan is approved (`plan-approved`). The "time saved, last 7 days" estimate comes from these lines. Do not edit or remove existing lines. If the person tells you they finished a task, mark it done and add a `task-done` line yourself:
`{ "at": "<now>", "type": "task-done", "taskId": "<id>", "minutes": <settings.minutesSavedPerTask> }`

## What the person will ask, and what to do

| They say | Do |
|---|---|
| "Sort my day", "plan my day", "what should I do today" | `.claude/skills/sort-my-day`: copy in the calendar, check the inbox, propose today's plan |
| "Plan my week", "what does my week look like" | `.claude/skills/plan-my-week`: suggest goals and a day for the tasks that need one |
| "Sort my brain dump", "deal with my notes" | `.claude/skills/sort-brain-dump` (shared; it uses `sort-my-brain-dump` for tasks) |
| "Check my inbox", "anything new?", "check in" | `.claude/skills/check-in` (calendar, inbox, calls) |
| "What needs a reply?", "triage my inbox" | `.claude/skills/triage-inbox` |
| "Write up my calls", "what came out of the call with Tom?" | `.claude/skills/process-calls` |
| "How do I...?", "research this" | `.claude/skills/research-task` |
| "When should I do this?", "book time for X" | `.claude/skills/schedule-it` |
| "Add this to my list", "remind me to" | Add a task with `addedBy: "you"`, a sensible category, any date they mentioned and the right `personId`. If it's for today, also add an `approved` plan item (create today's plan with `preparedAt: null` if there isn't one). If they gave a time, set `scheduledDate`, `scheduledTime` and `durationMinutes`. Confirm in one line. |
| "Put X in my diary at 2pm", "block out time for X" | Set the task's `scheduledDate`, `scheduledTime` and `durationMinutes`. It appears on the app's calendar. Tell them it's in the task list's calendar, not their real calendar, unless they also want you to draft a calendar invite. |
| "I've done X", "X is sorted" | Mark it done and log `task-done`. If several tasks could match, ask which. |
| "I'm waiting on X from Y" | Category `waiting`, fill in `waitingOn`, `waitingSince` and `personId`. |
| "Add Tom from Greenway to my people" | Add a person. |
| "What's on my plate?", "What am I waiting on?" | Read and answer. Change nothing. |
| "Wrap up my day" | `.claude/skills/wrap-up-my-day`. Change nothing unless asked. |

## Rules for editing the file safely

- Read the file immediately before you change it, and write the whole file back in one go. The app may have saved a click a moment ago.
- Keep it valid JSON, 2-space indented. Read it back after saving and check it parses.
- Keep every field you do not understand exactly as it is.
- Never touch `tasks.backup.json`. The app writes it as a safety copy before every save. If `tasks.json` is ever broken, rebuild it from the backup and the person's instructions.
- Use the person's local date and time everywhere except the `...At` timestamps.
- Change `settings` only when the person asks (for example "call me Jo", "my day starts at 7").

## If something goes wrong

- The app says "Your task file has a small mistake in it": the file is not valid JSON. Fix it, using `data/tasks.backup.json` as reference, and tell the person it's sorted.
- The person says the app doesn't show your changes: check the file saved and parses, check `plan.date` is today and `plan.preparedAt` is set, then ask them to click on the app window (it checks again when it comes back into view).
- The calendar is empty: check `events` has entries for this week and that `start` uses the `YYYY-MM-DDTHH:MM` shape.
- The person says the task list won't load or says it stopped running: follow `.claude/skills/open-task-list`.
