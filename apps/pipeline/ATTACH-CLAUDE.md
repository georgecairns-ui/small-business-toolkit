# Pipeline OS: what goes into CLAUDE.md when it's attached

When Pipeline OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Pipeline OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Pipeline OS's own setup steps: `setup/pipeline-01-your-customers.md` (required: what they sell, who to and the problems they solve, skipping anything `context/` already answers), `setup/pipeline-02-first-run.md` and `setup/pipeline-03-check-ins.md`.

---

### Pipeline OS

Every deal on one board. Claude writes up sales calls, checks every deal against 8 questions (based on MEDDPICC), sets the next steps, drafts the email back and the chases, and moves deals on when it's clear. Their deals are in `apps/pipeline/data/pipeline.json`; `apps/pipeline/CLAUDE.md` explains the format and the rules. How the business sells is in `context/sales.md`: read it before judging any deal, call or meeting. Open it at http://localhost:4747/pipeline/.

| They say something like | Use |
|---|---|
| "Update my pipeline", "anything new on my deals?" | `.claude/skills/pipeline-check-in` |
| Pastes call notes or a transcript, "here are my notes from the call with Tom" | `.claude/skills/update-a-deal` |
| "How qualified is this deal?", "is this deal real?" | `.claude/skills/qualify-a-deal` |
| "Prep me for my call with Mark" | `.claude/skills/prep-for-a-sales-call` |
| "Who should I chase?", "who's gone quiet?" | `.claude/skills/who-to-chase` |
| The sales part of a brain dump (handed over by the shared `sort-brain-dump`) | `.claude/skills/sort-pipeline-brain-dump` |

Day to day:

- **One check-in.** Every check-in, scheduled or asked for: after `.claude/skills/check-in`, follow `.claude/skills/pipeline-check-in` in the same run.
- **One write-up per call.** The task list's `process-calls` writes each call up on its Calls page. For a sales call, Pipeline OS reads that write-up and adds the sales side (the deal update, the deal check). Never write the same call up twice, and never edit the task list's records from the pipeline.
- **Actions land in the task list.** Call prep, chases and next steps due in the next 7 days become suggested tasks in the task list with `"source": { "tool": "pipeline", "id": "<deal id>" }`. The drafted email stays on the deal.
- **One list of people.** Contacts live in the task list (`people` in `apps/task-list/data/tasks.json`). Deals link to them by id; Pipeline OS's People page shows them with their deals.
- "Add a deal", "we won it", "they said no": see `apps/pipeline/CLAUDE.md`.
- Never mark a deal won or lost yourself, never send anything, and never guess a deal check answer, a value or a service.
