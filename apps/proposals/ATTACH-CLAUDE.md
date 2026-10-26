# Proposal Writing OS: what goes into CLAUDE.md when it's attached

When Proposal Writing OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Proposal Writing OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Proposal Writing OS's own setup steps, skipping anything `context/` already answers: `setup/proposals-01-your-brand.md` (skip it if the app already has their brand, and only do "The proposal's look"), `setup/proposals-02-what-you-sell.md` (required: packages and prices; `context/sales.md` may already be filled in by Pipeline OS), `setup/proposals-03-your-templates.md`, `setup/proposals-04-your-client-folders.md`, `setup/proposals-05-your-proposal-skill.md` and `setup/proposals-06-first-proposal.md`. Also copy `context/proposals.md` into `context/` if it isn't there.

---

### Proposal Writing OS

Proposals that write themselves. Everything about a client goes in their folder (`files/02-clients/<client>/`); the person presses **Write proposal** and Claude writes the whole proposal in their brand, with their packages and prices: who the client is, what's hurting, how it'll be fixed, how it'll be delivered, the options with one recommended, and next steps. Their proposals, packages and client list are in `apps/proposals/data/proposals.json`; `apps/proposals/CLAUDE.md` explains the format and the rules. How they write proposals is in `context/proposals.md` and their own proposal skill (`settings.ownSkill`). Open it at http://localhost:4747/proposals/.

| They say something like | Use |
|---|---|
| "Write a proposal for Hollins" (and when they press Write proposal or New proposal) | `.claude/skills/write-a-proposal` |
| "Check my client folders" (and when they press Check for new folders) | `.claude/skills/check-client-folders` |
| "Make it shorter", "lead with the cheaper option" (and when they press Ask Claude on a proposal) | `.claude/skills/change-a-proposal` |
| "Chase Marlow", "who hasn't replied?" | `.claude/skills/follow-up-a-proposal` |
| "Here's our template" | `.claude/skills/import-a-proposal-template` |
| "Rebuild my proposal skill" | `.claude/skills/build-my-proposal-skill` |
| The proposals part of a brain dump (handed over by the shared `sort-brain-dump`) | `.claude/skills/sort-proposals-brain-dump` |

Day to day:

- **One check-in.** Every check-in, scheduled or asked for: after the folder's main check-in, follow `.claude/skills/proposals-check-in` in the same run.
- **Pipeline OS.** Read the client's deal before writing (summary, the deal check, calls) and link it with `pipelineDealId`. A deal that reaches its proposal stage with no proposal makes that client ready. When a proposal is sent, won or lost, add a suggestion to the pipeline to move the deal; never edit the pipeline's deals. One write-up per call: if Pipeline OS or Task List OS already wrote a call up, read theirs and save a short summary into the client's folder.
- **Task List OS.** A proposal ready to check and a follow-up that's due become suggested tasks there, with `"source": { "tool": "proposals", "id": "<proposal id>" }`. Contacts live in the task list; link to them rather than keeping a second copy.
- Never send anything, never invent a price, number or quote, and never write legal terms.
