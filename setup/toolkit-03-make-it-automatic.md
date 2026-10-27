# Step 8: make it automatic

Goal: the whole toolkit keeps itself up to date with one scheduled task. Every hour while they work, Claude runs `/toolkit-check-in`: email, calls, calendar, deals and proposals every time, and money, ads, posts due and the connections once a day. The app picks it up within seconds.

Only do this if they said yes in step 1 (question 13). Explain the trade-off first, in one breath:

> I'll check in every hour during your working day, for every tool at once. Money, ads and your connections only get looked at in the first check of the day, to save your Claude allowance. It only runs while your computer is on and the Claude app is open. You can pause it any time.

## 8.1 Set up one scheduled task

The Claude desktop app can run scheduled tasks on their computer, with access to this folder. Menus change, so describe what to look for and ask what they see:

1. In the Claude desktop app, find **Scheduled tasks** (in the sidebar or the Code area).
2. Create a new task:
   - **Folder:** their Small Business Toolkit folder.
   - **Prompt:** `Run /toolkit-check-in`
   - **When:** every hour, on their working days, between their start and end times (from `context/routines.md`).
3. Save it, then run it once now to check it works.

Only ever one. If a tool's own setup step offered its own scheduled check-in, don't make it: this one covers it.

If they use Claude Code without the desktop app, or scheduled tasks aren't available to them, offer the simple alternative: they say "check everything" (or type `/toolkit-check-in`) a few times a day, for example first thing and after lunch. Don't set up anything that runs outside Claude without explaining it and getting a clear yes.

## 8.2 Pre-approve what the check-in needs

So a scheduled check-in doesn't stop to ask permission, this folder's `.claude/settings.json` already allows Claude to read anything here and edit every tool's data file and the `context/` notes. When the check-in first uses each connection (Gmail, Google Calendar, Fathom, Xero, Meta and so on), Claude may ask for permission once. Approve the read tools only. Never pre-approve tools that send, delete, post, pay or change an ad.

## 8.3 Record it

Set `triage.nextRunAt` in the task file after each run, so the app shows "Next check 2pm". Note the schedule in `context/tools.md` and `setup/progress.md`. Tick step 8.
