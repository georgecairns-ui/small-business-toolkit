---
name: sort-money-brain-dump
description: Turns the money part of a brain dump (handed over by the shared sort-brain-dump skill, from the Brain dump button on any page) into things waiting for a click in Money View OS: money they expect to come in, bills and payments going out, and invoices to raise as drafts. Uses what the person said it's about as a strong hint. Used by sort-brain-dump; also use when the person pastes a messy note about money, invoices, bills or who owes them.
---

# Sort a money brain dump

The person pressed **Brain dump**, talked or typed and pressed Done. You turn the money part of it into suggestions in Money View without asking them anything. Nothing you add counts until they click it.

## What you need

- `apps/money/data/money.json` and `apps/money/CLAUDE.md` (the format and the rules).
- `context/money.md`.
- When Task List OS is attached: `apps/task-list/CLAUDE.md`.

## Where it comes from

The shared skill `.claude/skills/sort-brain-dump` reads the note from `apps/home/data/braindump.json` and hands you its money part, with `about`: what the person picked under "What's it about?" (an invoice or a customer in this tool, or empty for "Let Claude decide"). Treat `about` as a strong hint, not a cage. Anything that isn't about money, hand back to `sort-brain-dump` for the right tool, or, if Task List OS is attached, add it there as a suggested task.

## Steps

1. Read the data file and the part of the note you were handed. If the person pasted a note in chat instead, add it to `apps/home/data/braindump.json` first, as unsorted, so it's kept.
2. Voice notes are one long spoken paragraph. Read it all, then pull out every separate thing, in order. Ignore filler.
3. For each thing, decide what it is and do it. Never type a total, a forecast or a tax figure: you record the amount they said.
   - **Money they expect** ("Greenway will pay about £850 at the end of the month", "the Hollins job is worth £2,000 in January"): add to `expected` with a new id (`e-` and 6 random lowercase letters or digits), `who`, `what`, `amount` and `date` as they said (ask nothing: if there's no date, use the end of the month they mean and say so), `chance: "likely"` unless they said maybe, `source: "claude"`, `status: "suggested"`, `invoiceId: null`, `note` with their words.
   - **Money going out** ("the insurance is £400 in January", "I pay the accountant £120 a month"): add to `outgoings` with a new id (`o-` and 6 random lowercase letters or digits), `name`, `amount`, `category`, `repeat` (`none` if they gave one date), `date`, `endDate: null`, `vatIncluded: false` unless they said, `source: "claude"`, `status: "suggested"`, `note` with their words.
   - **An invoice to raise** ("invoice Marlow £600 for the website changes"): follow `.claude/skills/raise-an-invoice` as far as a draft, using what they said, and `source: "claude"`. If the customer or the amount is missing, add it as an `expected` item instead and say what's missing.
   - **A payment they received** ("Greenway paid me"): don't mark anything paid. Say in the summary that you can see it after `update-my-money-view` reads the bank, and add it to nothing.
   - **A worry or a what if** ("could I afford a new van?"): follow `.claude/skills/can-i-afford-this`.
   - **A task that isn't about money** ("book the van in for its MOT"): if Task List OS is attached, add a suggested task there with `source: { "type": "braindump", "from": "Your brain dump", "subject": "<what they said>", "ref": "<the brain dump note id>" }`. If it isn't, mention it in the summary.
   - **Nothing to do** (a thought, a worry): leave it and mention it in the summary.
4. Add a line to `activity` at the front for each change ("From your brain dump: suggested the insurance payment in January"), keeping no more than 200.
5. Tell `sort-brain-dump` in one plain line what you did, for the note's `summary`: "Suggested 1 payment coming in and 1 going out, and drafted an invoice for Marlow Dental."
6. Save safely: read the file right before writing, write the whole file back, read it back and check it parses. When you add a task to the task list, save that file the same way.

## Rules

- Decide for yourself; don't ask questions. If something is ambiguous, make your best reading and say so in the summary.
- Never drop anything silently. Every thing ends up done, suggested, or mentioned in the summary.
- Everything you add is `suggested` or `draft`: it never counts in the forecast until the person confirms it. Never confirm, send, pay or move anything.
- Never invent an amount, a date, a customer or a payment. Keep their real words in `note`; never delete a note.
