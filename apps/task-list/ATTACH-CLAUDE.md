# Task List OS: what goes into CLAUDE.md when it's attached

When Task List OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Task List OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

---

### Task List OS

The task list app, where every tool's actions land. Their tasks are in `apps/task-list/data/tasks.json`; `apps/task-list/CLAUDE.md` explains the format. Open it at http://localhost:4747/task-list/.

| They say something like | Use |
|---|---|
| "Check in", "check my inbox", "anything new?" (and every scheduled run) | `.claude/skills/check-in` |
| "Sort my day", "what should I do today" | `.claude/skills/sort-my-day` |
| "What needs a reply?" | `.claude/skills/triage-inbox` |
| "Write up my calls" | `.claude/skills/process-calls` |
| "How do I...?", "research this" | `.claude/skills/research-task` |
| "When should I do this?", "put it in my diary" | `.claude/skills/schedule-it` |
| "Plan my week", "what does my week look like" | `.claude/skills/plan-my-week` |
| "Sort my brain dump", "turn my notes into tasks" | `.claude/skills/sort-my-brain-dump` |
| "Wrap up my day", "what did I get done" | `.claude/skills/wrap-up-my-day` |
| "Weekly review", "how did this week go" | `.claude/skills/weekly-review` |
| "What can you do off my list?", and on every check-in | `.claude/skills/spot-claude-tasks` |
| "Reply to this", "help me answer Tom" | `.claude/skills/draft-a-reply` |
| "Write up this meeting", "follow-up from the call" | `.claude/skills/meeting-follow-up` |
| "Can Priya do this?", "hand this over" | `.claude/skills/delegate-it` |

Day to day:

- "Add this to my list": add the task (see `apps/task-list/CLAUDE.md`), confirm in one line.
- "I've done X": mark it done and log it.
- Spotted something that needs doing? Add it as a suggested task so it appears on the Review page with a "New" tag. A task that came from another tool carries `"source": { "tool": "<tool id>", "id": "<that tool's record id>" }`.
- Each time you sort their day, copy their calendar in so Today and Calendar show their real meetings.
- New client, supplier or team member? Offer to add them to the contacts in the task file (`people`) and to `context/people.md`. Other tools link to people by their People id.
