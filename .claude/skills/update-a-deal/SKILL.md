---
name: update-a-deal
description: Turns call notes, a transcript or a call recording into an up-to-date deal in Pipeline OS - a write-up on the deal's timeline, the deal check filled in, the next steps, a coaching tip, other problems the business could solve, and the email back to the client drafted in the person's voice. Moves the deal on when it's clear. Use when notes are waiting on a deal (the app starts this straight away), from pipeline-check-in for each new sales call, or when the person pastes notes or says "here are my notes from the call with Tom", "update the Hollins deal", "write up my sales call".
---

# Update a deal

This is what makes the pipeline run itself. The person drops in rough notes, a transcript, or just has a recorded call, and the deal comes back filled in with what to do next and the email ready to send.

## What you need

- `apps/pipeline/data/pipeline.json` and `apps/pipeline/CLAUDE.md` (the format and the rules).
- `context/sales.md`: what they sell, who to, the problems they solve, their prices and who's a bad fit. Without it, say so and do what you can.
- `context/voice.md` and `.claude/skills/human-email` for the email.
- The source: notes waiting on the deal (`notesInbox` with `status: "waiting"`), notes pasted in chat, or a call from their recorder (via `pipeline-check-in`).

## Steps

1. Read `apps/pipeline/data/pipeline.json` now. For notes pasted in chat, add them to the deal's `notesInbox` first (create the deal if it's new), so they're kept.
2. For each deal with notes waiting (or the call you were given), read everything new: the notes, and the transcript and recorder summary if there's a recording. If the recorder's summary and the transcript disagree, trust the transcript.
3. **Who and what.** Link the people on the call (`personIds`; add new people, or use the task list's contacts when attached). Fill in `organisation`, `source` and `summary` if they're empty or out of date. Set `value` only from a figure that was said or one you can work out from their prices in `context/sales.md`; otherwise leave it.
4. **Write it up.** Add one `timeline` line (`kind: "call"` for a call, `"note"` for notes): a short title and a 1 or 2 sentence summary of what was learned and agreed. For a recorded sales call, also add it to `calls` (see `apps/pipeline/CLAUDE.md`), unless Task List OS has already written it up, in which case link to that (`taskListMeetingId`) rather than writing it twice. Update `lastContact`.
5. **The deal check.** Follow `.claude/skills/qualify-a-deal`: update the 8 answers from the new evidence, the risks, the buying signals and the 3 to 5 questions for next time.
6. **Also could help with.** Listen for problems they mentioned that aren't part of this deal. Compare each with the services in `context/sales.md`. Where one fits, add it to `alsoHelp` with the problem in their words, the service, and a natural question to raise it. If nothing they sell fits, keep the problem with `service: ""`. Never invent a service.
7. **Next steps.** Replace the undone `nextSteps` with 1 to 3 actions for the person, most important first, each with a due date if one was agreed or is obvious ("send the proposal by Friday"). Take them from what was promised on the call, then from the biggest gap in the deal check.
8. **Coaching.** Write `coaching`: 1 or 2 sentences that make them better at selling, about this deal. What they did well, the most important thing they missed (usually the biggest deal check gap), and exactly what to do about it. Kind, specific, never generic. "You got the numbers: 6 hours a week. You didn't find out who signs off; ask Dev who else needs to see the proposal."
9. **The email back.** Draft `email` (`to`, `subject`, `body`, `why`) following `.claude/skills/human-email`, in their voice from `context/voice.md`: thank them, recap what was agreed in their words, who does what by when, and one question that closes the biggest gap. Short. If the person has edited the current draft (`editedAt` set and not sent), don't overwrite it: add the new one as a `task` suggestion instead.
10. **Move it on.** If the evidence clearly moves the deal forward and `settings.autoMove` is true, move it as `apps/pipeline/CLAUDE.md` describes, with `moved` and a reason. Notes or a recording from a first sales call move a deal still at New enquiry to Call completed; a later conversation moves it to Talking. If they clearly said yes or no, don't close it: add a `task` suggestion ("Mark as won? Tom signed the contract on the call").
11. **Bad fit.** If the deal clearly matches who they *don't* sell to in `context/sales.md`, say so in `coaching` and add a `task` suggestion to mark it lost or park it, with the reason.
12. Mark each note you read `status: "done"` with `readAt`. Remove `noTranscript` if these were notes for a call without a recording.
13. **Task list.** If Task List OS is attached, add the next steps that are due in the next 7 days as suggested tasks there (`source: { "tool": "pipeline", "id": "<deal id>" }`), unless already there.
14. Save safely (read right before writing, write the whole file, read it back, check it parses).

## What to say

If the person is there: 2 or 3 lines. "I've updated the Hollins deal. The deal check is at 69%: you still don't know who signs off. 3 next steps, and a reply to Dev is ready to send. I've moved it to Proposal sent."
If nobody is watching (the app started you), say nothing: the app shows the result.

## Rules

- Never send anything. The email is a draft on the deal.
- Never fill a deal check gap with a guess, and never invent a value, a date or a service.
- Summaries and short quotes only. Never copy a whole transcript or email into the file.
- Never delete notes, deals or timeline lines.
