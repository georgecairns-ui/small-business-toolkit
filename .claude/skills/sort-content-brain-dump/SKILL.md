---
name: sort-content-brain-dump
description: Turns the content part of a brain dump (handed over by the shared sort-brain-dump skill, from the Brain dump button on any page) into content ideas, planned posts and updates in Content Machine OS - an idea, a win, a customer's kind words, a case study, "I've posted it", or "I've added the photo". Uses what the person said it's about as a strong hint. Used by sort-brain-dump; also use when the person pastes a messy note about their posts or content.
---

# Sort a content brain dump

The person pressed **Brain dump**, talked or typed and pressed Done. You turn the content part of it into the right changes without asking them anything.

## What you need

- `apps/content/data/content.json` and `apps/content/CLAUDE.md` (the format and the rules).
- `context/content.md` and `context/voice.md`.
- When Task List OS is attached: `apps/task-list/CLAUDE.md`.

## Where it comes from

The shared skill `.claude/skills/sort-brain-dump` reads the note from `apps/home/data/braindump.json` and hands you its content part, with `about`: what the person picked under "What's it about?" (an idea or a post in this tool, or empty for "Let Claude decide"). Treat `about` as a strong hint, not a cage. Anything that isn't about content, hand back to `sort-brain-dump` for the right tool (or, if Task List OS is attached, add it there as a suggested task).

## Steps

1. Read the data file and the part of the note you were handed. If the person pasted a note in chat instead, add it to `apps/home/data/braindump.json` first, as unsorted, so it's kept.
2. Voice notes are one long spoken paragraph. Read it all, then pull out every separate thing, in order. Ignore filler. One sentence can hold 3 things.
3. For each thing, decide what it is and do it:
   - **An idea or a topic** ("we should do something on winter drainage"): follow `.claude/skills/turn-this-into-posts` (an idea in `ideas`, `source: "brain-dump"`).
   - **When and where it goes** ("post the Clifton job on LinkedIn on Thursday"): an idea and a planned post, as `turn-this-into-posts` step 4 says.
   - **A job, a win or a story** ("finished the café menu job, they were thrilled, 40 percent more covers"): keep their real details in `notes` exactly as said, add the idea (`source: "case-study"`) and, if they gave you enough, follow `.claude/skills/use-my-case-study`. If a result or a name is missing, add a `case-study` need rather than inventing it.
   - **A customer's words, a review**: an idea with the exact words in `notes`, and a `quote` need for permission to use them if they didn't say they could.
   - **"I've posted it", "the Instagram one went out"**: follow `.claude/skills/ive-posted-it`.
   - **"I've added the photo", "the video's done"**: find the matching open need and set `done: true` (it's their word). Leave `answer` empty.
   - **A change to a post** ("make Thursday's one shorter"): set `request` to `{ "kind": "rewrite", "note": "<what they said>", "at": "<now>" }` on that post, then follow `.claude/skills/write-posts`.
   - **A task that isn't content** ("renew the domain"): if Task List OS is attached, add a suggested task there with `source: { "type": "braindump", "from": "Your brain dump", "subject": "<what they said>", "ref": "<the brain dump note id>" }`. If it isn't, mention it in the summary.
   - **Nothing to do** (a thought, a worry): leave it and mention it in the summary.
4. Add a line to `activity` at the front for each change ("From your brain dump: added the idea 'Winter drainage'"), keeping no more than 200.
5. Tell `sort-brain-dump` in one plain line what you did, for the note's `summary`: "Added 2 ideas, planned the Clifton job for Thursday on LinkedIn and marked the café photo as done."
6. Save safely: read right before writing, write the whole file back, read it back and check it parses. When you add a task to the task list, save that file the same way.

## Rules

- Decide for yourself; don't ask questions. If something is ambiguous, make your best reading and say so in the summary.
- Never drop anything silently. Every thing ends up done, suggested, or mentioned in the summary.
- Never post, message or log in anywhere. Never invent a result, number, quote, name or date.
- Keep their real words in `notes`; never delete a note.
