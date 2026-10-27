# Step 8: make it automatic

Goal: the task list keeps itself up to date. Every hour while they work, Claude checks in: copies the calendar, sorts new email, writes up new calls, and adds anything new to Review. The app picks it up within seconds.

Only do this if they said yes in step 1, question 8. Explain the trade-off first, in one breath:

> I'll check in every hour during your working day. It uses a little of your Claude allowance each time, and it only runs while your computer is on and the Claude app is open. You can pause it any time.

## 8.1 Set up a scheduled task

The Claude desktop app can run scheduled tasks on their computer, with access to this folder. Menus change, so describe what to look for and ask what they see:

1. In the Claude desktop app, find **Scheduled tasks** (in the sidebar or the Code area).
2. Create a new task:
   - **Folder:** their Small Business Toolkit folder.
   - **Prompt:** `Run /check-in`
   - **When:** every hour, on their working days, between their start and end times from `settings`.
3. Save it, then run it once now to check it works.

If they use Claude Code without the desktop app, or scheduled tasks aren't available to them, offer the simple alternative: they say "check in" (or type `/check-in`) a few times a day, for example after lunch. Don't set up anything that runs outside Claude without explaining it and getting a clear yes.

## 8.2 Pre-approve what the check-in needs

So a scheduled check-in doesn't stop to ask permission, this folder's `.claude/settings.json` already allows Claude to read anything here and edit the task file and the `context/` notes. When the check-in first uses each connection (Gmail, Google Calendar, Fathom and so on), Claude may ask for permission once. Approve the read tools only. Never pre-approve tools that send, delete, post or pay.

## 8.3 Record it

Set `triage.nextRunAt` after each run so the app shows "Next check 2pm". Note the schedule in `context/tools.md` and `setup/progress.md`. Tick step 8.
