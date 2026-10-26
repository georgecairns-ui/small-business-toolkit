---
name: toolkit-check-in
description: The one regular check-in for the whole toolkit. Runs every set-up tool's own check-in in one go, in the right order, so there is only ever one scheduled task. Hourly - email, calls, calendar, deals and proposals. Once a day - money, ads, content due, and a look at the connections and new ideas on the Toolkit page. Use for scheduled runs ("Run /toolkit-check-in"), or when the person says "check in", "check everything", "anything new?" or "what's come in?".
---

# Toolkit check-in

One run keeps every tool up to date. Each tool's own check-in still does its own job, by its own rules; this skill only decides which ones run and in what order, so nothing is read twice and nothing is missed.

## Before you start

1. Read `apps/toolkit/data/toolkit.json`. Only run the part for a tool whose `tools` entry says `set-up` or `part-done`. A tool that isn't set up yet is skipped quietly.
2. Work out whether this is the **first run today**: `apps/toolkit/data/toolkit.json` has `lastDailyRun`; if it isn't today's date, this is the first run today.

## Every run

In this order, because each one uses what the one before found:

1. **Task List OS:** `.claude/skills/check-in` (calendar, new email, new calls, the plan for today). It reads the inbox and the calls once, for every tool.
2. **Pipeline OS:** `.claude/skills/pipeline-check-in`, using the emails and calls step 1 has just read rather than reading them again.
3. **Proposal Writing OS:** `.claude/skills/proposals-check-in`.

`CLAUDE.md` tells the task list's check-in to run steps 2 and 3 in the same run when those tools are attached. That's the same thing: run each once per check-in, never twice.

## First run of the day only

These use more of their Claude allowance and change slowly, so once a day is plenty:

4. **Money View OS:** `.claude/skills/update-my-money-view`. Then anything overdue to chase goes to the task list as a suggestion, by Money View's own rules.
5. **Ads OS:** `.claude/skills/update-my-ads`, read only. Anything waiting on them goes to the task list as a suggestion, by Ads OS's own rules. Never switch on, pause or change anything from a check-in.
6. **Content Machine OS:** what's due to post today, by `.claude/skills/content-check-in`'s rules, as suggestions in the task list. Write nothing new and post nothing.
7. **The Toolkit page:** for each app under `connections` marked `connected`, make one harmless read through its connection. If it fails, set it to `needs-attention` with a one-line note ("Signed out of Xero") and add a suggested task: "Reconnect Xero (the Toolkit's Connections page has a Fix it button)". If one marked `needs-attention` works again, set it back to `connected`. Update `checked`.
8. **Ideas:** if the ideas list has fewer than 3 with status `new`, follow `.claude/skills/whats-next` to add up to 3.
9. Set `lastDailyRun` in `apps/toolkit/data/toolkit.json` to today.

Skill and Folder Map OS doesn't check in: it scans when they press Scan again.

## Rules

- Each tool's own rules apply to its own part, word for word. Nothing here loosens them: you read and draft, you never send, pay, post, delete or switch anything on.
- Save every data file safely: read it, change only what you need, write it back, check it reads cleanly.
- If one part fails (a connection is down, a file won't read), note it, carry on with the rest, and say so in the summary. Never stop the whole run for one tool.
- Finish with one short summary across the tools, only what's new: "3 emails need a reply (drafted). Greenway moved to Proposal sent. £1,240 came in. 1 post due today." On a scheduled run with nothing new, say nothing new.
