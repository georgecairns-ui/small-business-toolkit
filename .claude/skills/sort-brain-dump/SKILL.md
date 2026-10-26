---
name: sort-brain-dump
description: Sorts the shared Brain dump - the notes people record or type with the Brain dump button on any page of the app (Home, Task List OS, Pipeline OS and every other tool) - and passes each part to the right tool, using what they said it's about as a strong hint. Tasks go to the task list, sales to the pipeline, and so on. The helper starts this straight away when a note is added; also use when the person says "sort my brain dump", "deal with my notes" or "turn that into tasks".
---

# Sort the brain dump

Shared by every tool in the toolkit. The person pressed **Brain dump** somewhere in the app, talked or typed, said what it's about (or left it to you) and pressed Done. You work out what they meant and get each part done by the tool it belongs to. Nobody is watching when the app starts you, so don't ask questions: make your best reading and say so in the summary.

## Where the notes are

`apps/home/data/braindump.json`:

```json
{ "items": [ { "id": "b-x7k2p9", "text": "the whole note", "kind": "voice", "from": "pipeline", "status": "unsorted", "createdAt": "...",
  "about": [ { "type": "tool", "id": "task-list", "label": "Task List OS" }, { "type": "deal", "id": "d-hollins", "label": "...", "tool": "pipeline" } ] } ] }
```

- `from` is the page they were on (`home` or a tool's id). It's a hint, not an instruction.
- `about` is what they picked under "What's it about?". Empty means "Let Claude decide". `tool` items name a tool; other items (a deal, a person, a task) carry the `tool` they belong to.
- Older copies of Task List OS also kept notes in `apps/task-list/data/tasks.json` (`dump`, `status: "unsorted"`). Sort those too, with Task List OS's own skill.

## Steps

1. Read `apps/home/data/braindump.json` now, and `apps/installed.json` to see which tools are in this folder. Take every item with `status: "unsorted"`.
2. Read the whole note. Voice notes are one long spoken paragraph: pull out every separate thing, in order, ignoring filler.
3. For each thing, decide which tool it belongs to:
   - What they picked under "What's it about?" first, unless the thing is clearly about something else (they picked a deal but also said "and renew the domain").
   - Otherwise the content: something to do, a reminder, an errand, someone to reply to, goes to **Task List OS**. A deal, a prospect, a sales call, a quote, a lead, chasing a sale goes to **Pipeline OS**. Other tools: what their `toolkit.json` and `ATTACH-CLAUDE.md` say they're for.
   - If the tool it belongs to isn't in this folder, give it to the nearest tool that is (usually the task list, as a task, or the pipeline for anything about selling) and say so in the summary.
4. Hand each part to that tool's own brain dump skill, with the original words and what it was about:
   - Task List OS: `.claude/skills/sort-my-brain-dump` (suggested tasks, with `source.type` `braindump` and `source.ref` the item's id).
   - Pipeline OS: `.claude/skills/sort-pipeline-brain-dump` (updates and adds deals, moves them on, writes emails).
   - Any other tool: the skill its `ATTACH-CLAUDE.md` names for brain dumps, or its everyday skills.
   Follow each tool's own rules for its data file. Never write one tool's records in another tool's way.
5. Mark the item `status: "sorted"`, `sortedAt` now, `tools` (the ids you used), and `summary`: one plain line of what happened, which the app shows them. "Added 2 tasks to your list, moved Hollins to Negotiating and wrote a reply to Dev."
6. Save safely: read right before writing, write the whole file, read it back and check it parses. Same for every tool's file you changed.

## Rules

- Never drop anything silently. Every part ends up done, suggested, or mentioned in the summary.
- Everything a tool's skill says about approval still applies: tasks are suggestions, nothing is sent, no deal is closed.
- Never delete a note. The full text stays in the brain dump file; tools keep summaries.

## If there's nothing to sort

Say so, and remind them: "Press Brain dump on any page (or press V) and talk. I'll sort it out."
