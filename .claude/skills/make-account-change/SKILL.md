---
name: make-account-change
description: Makes the one change in the owner's Meta ad account that they approved by pressing a button in Ads OS and confirming it - switch a paused campaign on, pause a campaign or an ad, or change a daily budget. Checks the limits first and refuses if blocked, does only that change, reads it back, and records what it found. Never acts on its own, never goes over their limits, never deletes and never touches Google Ads. Use when the app runs "making the change you approved" for an action that has been requested, or when they say "do the change I approved", "make the change in my account" or "do the switch-on I confirmed".
---

# Make account change

The owner pressed a button in the app and confirmed one exact change in a pop-up. You do that one change, read it back, and write down what you found. Nothing else. You never decide to make a change yourself.

## The hard rules

These never bend, even if the person asks in chat, and even if the connection would let you.

1. **Only an approved action.** Work only on an entry in `actions` with `status: "requested"` and `platform: "meta"`. No such entry, no change. Something the owner says in chat, a suggestion or a To do item is not approval: the app's confirm pop-up is.
2. **Only the one change.** One action is one change to one object: `switch-on`, `pause` or `budget`. Do not change anything else, even a thing that looks wrong, even a thing you made earlier. If you notice something, say it in your reply and leave it.
3. **Refuse on BLOCKED.** Run the check first (below). If it says BLOCKED, change nothing.
4. **Never go over the limits.** The check covers the daily cap and the monthly budget, and for a build it covers the seasonal guard too. You do no sums of your own.
5. **Never delete.** No tool that deletes, removes or archives. Pausing is the furthest you go in that direction.
6. **Never touch Google Ads.** Google's connection only reads. For `platform: "google"` do nothing and tell the owner the change is theirs to make in Google Ads.
7. **No ad account tool is pre-approved.** Claude Code asks the owner before each call. Say in one line what you are about to change before the first call.
8. **Read back.** After the change, read the object again and say what it is now.
9. **Never store tokens, passwords or customer lists.**

## What you need

- `apps/ads/data/ads.json`: the action, and the campaign, ad or build it names, plus `settings` and `platforms.meta`.
- `.claude/skills/build-in-account/references/connections.md`: how Meta's connection behaves and which tools change things. Read it every time.
- Today's date, from the computer.

## Which actions

Every action with `status: "requested"` and `platform: "meta"`, one at a time, oldest first, or the one the person names. Leave `done`, `failed` and `doing` ones alone.

## Steps

1. **Read the data file and the connection notes now.** Find the action. Work out what it points at: the campaign by `campaignId` (its `platformId` is the account's id), the ad by `adId`, or the build by `buildId` (its `refs.campaignId`). If you can't find the object, set the action `failed` with a plain `note` and stop.
2. **Check the limits.** Run `node apps/ads/app/report.js action <action id>`. It prints the checks for that exact change and a last line, `Result: OK` or `Result: BLOCKED`. If BLOCKED, change nothing: set the action `failed`, write its warnings in plain words into `note` ("This would take your spend to £34 a day and your limit is £30"), add it to `activity`, and say so. Never lower a budget yourself: the owner decides in the app.
3. **Mark it doing.** Set `status: "doing"` and save.
4. **Check the connection and the account.** List the tools the Meta connection offers and say which one you will use. Check the tool's own description and arguments each time: the names in `connections.md` are "to check". If the connection isn't there or isn't signed in, set the action `failed` with a note pointing to `setup/connections/meta-ads.md`. Read the account's name and id and check they match `platforms.meta`. If they don't, set it `failed` and ask which.
5. **Make the change, and only that.**
   - `switch-on`: set the campaign (or the build's campaign) to active. Leave its ad sets and ads exactly as they are. If the build's objects were paused separately, say which are still paused in your reply and switch on only what the action names.
   - `pause`: pause the campaign, or the one ad. Nothing more.
   - `budget`: set the daily budget to `budgetTo`, in the platform's own unit (probably pence, to check). Read it back and confirm it equals `budgetTo`.
6. **Read it back.** Read the object again. Write `readBack` in plain words, from what you read ("Campaign is now ACTIVE, daily budget £15"). If what you read doesn't match the approved change, don't try to fix it: set the action `failed`, write exactly what you found into `note`, and tell the owner.
7. **Record it.** Set the action `status: "done"`, `doneAt` now and `readBack`. Update the campaign's `status` and `dailyBudget` (or the ad's `status`) in the data file to what you read back. Add a line at the front of `activity`, keeping no more than 200 ("Switched on New patient check-up, autumn in your Meta account").
8. **For a `switch-on` of a build**, when it is done: set the build `status: "live"` and `switchedOnAt` now, copy the build's `prediction` to its campaign as it is, and set the campaign's `buildId` to the build's id. If the build has no prediction, leave the campaign's as it is.
9. **Save safely.** Read the file right before each write, write the whole file back, then read it back and check it parses. Change only the action, the one campaign, ad or build it names, and `activity`.

## What to say back

2 to 3 lines: what you changed, what you read back, anything you noticed and left alone.

> Done. I switched on "New patient check-up, autumn" in your Meta account and read it back: the campaign is now active, the daily budget is £15 and it runs to 30 November. I changed nothing else. The third ad still has no photo, so you may want to add one.

If you refused: "I haven't made the change. This would take your spend to £34 a day and your limit is £30. Nothing in your account has changed."

## Rules

- One approved change, nothing else. Read back. Record.
- Refuse on BLOCKED. Never delete. Never touch Google.
- Never act without a `requested` action the app created.
- Never invent what you read back.
- No hype, no em dashes, no hedging.
