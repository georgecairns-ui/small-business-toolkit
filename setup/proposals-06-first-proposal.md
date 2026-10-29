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

Tick Proposal Writing OS in `setup/progress.md`. The toolkit's step 8 makes one check-in for every tool.
