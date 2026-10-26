---
name: sort-proposals-brain-dump
description: Handles the proposals part of a Brain dump note, handed over by the shared sort-brain-dump skill - saves what was said about a client into their folder, asks for or writes a proposal, changes one, or records that one was sent, won or lost. Use only when sort-brain-dump passes a part to Proposal Writing OS.
---

# Sort the proposals part of a brain dump

The shared `sort-brain-dump` skill has handed you the part of a note that's about proposals or clients, with the person's own words and what they said it was about (a client, a proposal, or Proposal Writing OS). Nobody is watching, so make your best reading.

## What to do with each thing

| They said something like | Do |
|---|---|
| Anything about a client: what they need, what's hurting, budget, timing, who decides ("Hollins want it live before Christmas, Nadia signs it off") | Save it into the client's folder as `<date> brain dump.md` (adding to today's file if there is one), with their exact words. Add the client if they're new (`.claude/skills/check-client-folders` explains how). |
| "Write a proposal for Ellis", "do a proposal for the florist I met" | Save what they said into the folder, add a write request, then follow `.claude/skills/write-a-proposal`. |
| A change to a proposal ("make the Hollins one shorter", "lead with the cheaper option for Marlow") | Add a change request with their words as the `instruction`, then follow `.claude/skills/change-a-proposal`. |
| "I sent the Hollins proposal", "Marlow said yes", "Rowe went with someone else" | Set the status (`sent`, `won` or `lost`, with `sentAt` or `closedAt`, and `lostReason` from their words), add a `timeline` line with `by: "you"` (they told you), and save. A win with Task List OS attached: add a suggested task for the onboarding steps from `context/proposals.md`. |
| A new price, package or change to how they deliver | Don't change `packages` from a voice note. Add a suggested task (Task List OS) or say in the summary: "You mentioned a new price for the care plan. Update it on the Packages page, or tell me and I'll do it." |

## Then

Read and save `apps/proposals/data/proposals.json` safely (read right before writing, write the whole file, read it back and check it parses), and give `sort-brain-dump` one plain line for its summary: "Saved Dev's Christmas deadline to Hollins Lettings and started a proposal for Ellis Joinery."

Never send anything, never invent a price, and never delete anything.
