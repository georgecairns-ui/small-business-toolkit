# Step 10: your first proposal

Goal: a real proposal, for a real client, in their brand, before setup ends. This is the moment it all comes together.

## 10.1 Write it

1. Pick the client who's most ready: `ready: true`, a live conversation, and the most in their folder. Tell them which and why in one line ("Hollins Lettings: you had the discovery call last week and Dev's confirmed the budget by email").
2. Add a write request for them and follow `.claude/skills/write-a-proposal`, exactly as the app's Write proposal button would.
3. Start the app if it isn't running (`.claude/skills/open-my-toolkit`) and, with their yes, open **http://localhost:4747/proposals/** in their browser.

## 10.2 Walk them through it (briefly)

> Your first proposal is ready: **Hollins Lettings**, on the Proposals page. Have a read. A few things to try:
> - **Click any words** on the page to change them.
> - **Ask Claude to change it** on the right, for anything bigger ("make it shorter", "lead with the cheaper option").
> - **Needs a price** and **Claude couldn't find** show what I left out rather than guess.
> - **Approve it**, then **Save as PDF** (choose "Save as PDF" as the printer) and **Open the covering email** to send it with the PDF attached. Then press **I've sent it**, and I'll nudge you if they go quiet.

Ask what they'd change. Make the changes they ask for with `.claude/skills/change-a-proposal`, and if a change is about how they always want proposals (not just this one), update their proposal skill too (`build-my-proposal-skill`) and say so.

## 10.3 Make it automatic (if they said yes in step 1)

Explain the trade-off first, in one breath:

> I'll check for new client folders, emails and calls every hour during your working day, write proposals for new clients, and draft follow-ups for proposals gone quiet. It uses a little of your Claude allowance each time, and it only runs while your computer is on and the Claude app is open. You can pause it any time.

The Claude desktop app can run scheduled tasks on their computer, with access to this folder. Menus change, so describe what to look for and ask what they see:

1. In the Claude desktop app, find **Scheduled tasks** (in the sidebar or the Code area).
2. Create a new task: **Folder:** their Small Business Toolkit folder. **Prompt:** `Run /proposals-check-in`. If another toolkit tool with its own check-in is in this folder (Task List OS's `/check-in`), use that one instead: it runs the proposals check-in too, so there's only ever one. **When:** every hour, on their working days, during their working hours.
3. Save it, then run it once now to check it works.

If scheduled tasks aren't available, the simple alternative: they say "check my proposals" (or `/proposals-check-in`) when they've added something. Write proposal in the app works straight away either way.

When the check-in first uses each connection, Claude may ask for permission once. Approve the read tools only. Never pre-approve tools that send, delete, post or pay.

Note the schedule in `context/tools.md` and `setup/progress.md`. Tick step 10.
