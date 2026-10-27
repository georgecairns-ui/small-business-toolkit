# Step 9: make it automatic

Goal: the pipeline keeps itself up to date. Every hour while they work, Claude checks in: reads new sales calls and updates the deals, spots new enquiries and replies, sorts the calendar's sales meetings, preps tomorrow's calls and drafts chases. The app picks it up within seconds.

Only do this if they said yes in step 1. Explain the trade-off first, in one breath:

> I'll check in every hour during your working day. It uses a little of your Claude allowance each time, and it only runs while your computer is on and the Claude app is open. You can pause it any time.

## 1. Set up a scheduled task

The Claude desktop app can run scheduled tasks on their computer, with access to this folder. Menus change, so describe what to look for and ask what they see:

1. In the Claude desktop app, find **Scheduled tasks** (in the sidebar or the Code area).
2. Create a new task:
   - **Folder:** their Small Business Toolkit folder.
   - **Prompt:** `Run /pipeline-check-in`. If Task List OS is also in this folder, use its check-in instead (`Run /check-in`): it runs the pipeline's steps too, so there's only ever one check-in.
   - **When:** every hour, on their working days, during their working hours.
3. Save it, then run it once now to check it works.

If scheduled tasks aren't available to them, offer the simple alternative: they say "update my pipeline" (or type `/pipeline-check-in`) a couple of times a day. Call notes they add in the app are read straight away either way.

## 2. Pre-approve what the check-in needs

So a scheduled check-in doesn't stop to ask permission, this folder's `.claude/settings.json` already allows Claude to read anything here and edit the pipeline file and the `context/` notes. When the check-in first uses each connection (Gmail, Google Calendar, Fathom and so on), Claude may ask for permission once. Approve the read tools only. Never pre-approve tools that send, delete, post or pay.

## 3. Record it

Set `checkIn.nextRunAt` after each run. Note the schedule in `context/tools.md` and `setup/progress.md`. Tick this step.
