---
name: my-ads-check-in
description: Tells the person in plain words what is waiting in Ads OS - what they need to do and what Claude can do for them, from the To do lists the app works out. Reads only. Use when they say "what's waiting on me in ads", "anything to switch on", "ads check-in", "what do I need to do with my ads", "is anything waiting for me in Ads OS" or "what's outstanding on the ads".
---

# My ads check-in

Say what's waiting, the way the To do tab does. You report. You don't approve, switch on, pause or change anything.

## What you need

- The app's own list: run `node apps/ads/app/report.js todo` from this folder. It prints the To do lists, worked out by the app: what **Claude can do** and what **you need to** do, each item with a short reason, and it ends with a line such as "Newest figures: 2 days old".
- `apps/installed.json`, to see whether Task List OS is attached.
- `apps/home/data/connections.json`, if it exists: whether each ad account's connection works (step 6).
- Today's date, from the computer.

## Steps

1. Run the report. Read everything it prints.
2. Say it in a few short lines, naming the real campaigns, starting with what the owner needs to do, then what Claude can do for them:
   - **You need to.** Drafts to review, photos to add, a Google campaign to import, a Google change to make, a question Claude left, what a new customer is worth, or connecting an account. Say what to give Claude for each.
   - **Claude can do.** Refreshing figures, analysing a campaign, the weekly summary, looking for changes, drafting a seasonal campaign, switching on a build, pausing a campaign. Say each can be done from the To do tab with its **Do it** button.
   - **Figures out of date.** Read the report's last line, "Newest figures: N days old". If N is more than 3, say how old they are and offer `update-my-ads`. If it says "none yet", offer `update-my-ads` too.
3. Use only the report's words and numbers. Never work out or guess one yourself.
4. **Switching on and pausing are the owner's button.** If a campaign is waiting to be switched on, or a pause is approved, tell them to press the button for it in the app (**Switch it on**, **Pause campaign**) and confirm. Don't do it because they said "yes" in chat: it needs their click and confirm in the app. On Google, say it is theirs to do in Google Ads.
5. **Task List OS (only if attached).** Add a suggested task for each campaign waiting to be switched on ("Switch on: New patient check-up, autumn"), following `apps/ads/ATTACH-CLAUDE.md`. Skip any build that already has a `taskId`, and check `source.id` and the title so you never add one twice. Don't add one for a campaign that's already live. Never edit or remove a task.
6. **Connections.** If `apps/home/data/connections.json` exists, read the rows for `meta-ads` and `google-ads`. You don't call an ad account tool to check them: `update-my-ads` reads the accounts and keeps these rows up to date (its step 14). For a row that says `needs-attention`, say in one line which account needs attention and what its `note` says, and that the **Fix it** button on Home, or "connect my Meta ads" (or Google Ads), puts it right. For a `connected` row whose `checked` date is more than 7 days old, offer `update-my-ads`, which checks it again. Say nothing about `export-only`, `not-connected` or `not-used` rows unless they ask. If the file doesn't exist, skip this step.
7. Don't change the data file apart from that task's id, and don't change `connections.json`. If something looks wrong, say so and offer the skill that fixes it.

## What to say back

> 3 things need you. The Google whitening campaign is a draft waiting for your Approve. The autumn ad needs a photo, and Claude needs to know what a new customer is worth. Claude can do 2 things for you: analyse the whitening campaign, which is behind what it predicted, and switch on "New patient check-up, autumn", which is built and paused in your Meta account. Press Do it on the To do tab for either, and confirm the switch-on.

If nothing is waiting: "Nothing's waiting on you. The next thing I'd look at is the autumn offer ending on 30 November."

## Rules

- Read only. Never approve, switch on, pause, edit or delete anything. Never call an ad account tool, not even to check a connection: that is `update-my-ads`'s job. A yes in chat is not the owner's button in the app.
- Never invent a campaign or a number.
- If the app has no figures or no builds, say so and offer "update my ads" or "make me a campaign".
