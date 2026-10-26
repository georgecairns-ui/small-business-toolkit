---
name: process-calls
description: Writes up the person's recorded calls from their call recorder (Fathom, Fireflies, Otter, Granola, tl;dv, Read AI, Zoom, Teams, Google Meet): a short summary, what was decided, the person's actions as suggested tasks, and a follow-up email draft. Shown on the app's Calls page. Use from check-in or first run, or when the person says "write up my calls", "what came out of my call with Tom?".
---

# Process calls

## What you need

- A connected call recorder (see `context/tools.md` and `setup/connections/`). For pasted notes or a transcript with no recorder, use `.claude/skills/meeting-follow-up` instead.
- `apps/task-list/data/tasks.json` and `apps/task-list/CLAUDE.md` (the `meetings` format).

## Steps

1. Read the task file. Note the `ref` of every call already in `meetings`.
2. List calls since the last check-in (or the last 14 days on the first run), at most 5, newest first. Skip ones already in `meetings`, and skip internal calls with no actions for the person unless they ask.
3. For each call, read the recorder's summary and, where needed, the transcript. Then add to `meetings`:
   - `id` (`m-` plus 6 characters), `title`, `date` (`"YYYY-MM-DDTHH:MM"` local), `source` (the recorder's name), `ref` (its id), `transcriptUrl` if available, `personIds` (link or add the people who matter).
   - `summary`: 2 or 3 plain sentences: what the call was for and what came out of it.
   - `decisions`: a short list of what was agreed.
   - `actionTaskIds`: for each action **the person** owns (or promised), add a suggested task with `source` `{ type: "meeting", from: <call title>, subject: <the moment it was agreed, in a few words>, date, ref }`, a due date if one was said, and `personId`. Actions other people own become `waiting` tasks only if the person will need to chase them. Link existing tasks too, if the call was about them.
   - `followUp` `{ to, subject, body }`: a short follow-up email in the person's voice, following `.claude/skills/human-email`: thanks, what was agreed, who does what by when. Only if a follow-up is normal for this kind of call.
4. Add the person's actions that are due today or tomorrow to today's plan as `proposed`, with a reason.
5. Save safely.

## Rules

- Read only. Never send a bot or note-taker to a meeting, share a recording, invite anyone or email anyone through the recorder, even if the connection allows it.
- Never put whole transcripts in the task file. Summaries and short quotes only.
- If the recorder's own summary is wrong (it misheard a name), trust the transcript.

## What to say

"I've written up 2 calls. From Ellis Joinery: 3 actions for you, including the questionnaire you promised today, and a follow-up email ready to send. They're on the Calls page."
