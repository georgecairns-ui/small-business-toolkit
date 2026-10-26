---
name: build-in-account
description: Builds an approved campaign for the owner, switched off. On Meta it creates the campaign, ad set and ads in their ad account with every one set to paused, reads them back and confirms each is paused. On Google Ads, whose own connection only reads, it writes a Google Ads Editor import file with everything paused, plus a click-by-click build sheet. Never switches anything on in this skill and never touches a campaign that already exists. Use when they press "Build it in my account, paused" or "Make the import file", or say "build my approved campaigns", "put it in my account", "make the Google import file" or "build the campaign I approved".
---

# Build in account

The owner has approved a draft and asked you to build it. You build it switched off. They review it, and switching it on is a separate step: on Meta they press Switch it on in the app and confirm, and `make-account-change` does it. Nothing spends until they do.

## The hard rules

These never bend, even if the person asks, and even if the connection would let you.

1. **Create paused only.** Every campaign, ad set and ad you create has its status set to paused in the same call that creates it. If a tool has no way to say paused, don't use it.
2. **Read back and confirm.** After you create anything, read it back and check every object is paused, and that the budget, dates and words match the build. Say what you saw.
3. **Never switch anything on in this skill.** Never call a tool that activates, enables or publishes. Switching on is `make-account-change`, after the owner's click and confirm in the app.
4. **Never change, pause, re-budget or delete anything that exists.** Never call a tool that updates, edits, pauses, re-budgets or deletes. If you can't tell what a tool does, treat it as one of these. You create new things; you never edit old ones, even ones you made earlier. (Changes to existing campaigns are `make-account-change`, only for a change the owner approved in the app.)
5. **Never touch a campaign that exists.** Build only from the build you were asked about. If its `refs.campaignId` is already filled, it has been built: stop and tell the owner.
6. **No ad account tool is pre-approved.** Claude Code asks the owner before each call. Say in one line what you're about to create before the first call.
7. **Never store tokens, passwords or customer lists.**
8. **A guard that fails means no build.** If the budget guard or the seasonal guard fails, refuse and say why.

## What you need

- `apps/ads/data/ads.json`: the build, `settings`, `platforms`, `campaigns`, `figures`.
- `.claude/skills/build-in-account/references/connections.md`: how each connection behaves, which tools create, which tools are off limits. Read it every time and check the connection's actual tool list against it.
- `.claude/skills/build-in-account/references/google-ads-editor.md`: the import file's columns (Google).
- `context/ads.md` and `context/business.md`.
- Today's date, from the computer.

## Which builds

Every build with `status: "approved"` and `request.kind: "build"`, or the one the person names. Leave every other build alone.

## Steps, all platforms

1. **Read the data file and the connection notes now.** Check the build is complete: audience, 2 or 3 ads with words and a link, a budget and start date.
2. **Check the guards.** Run `node apps/ads/app/report.js checks <build id>`. It prints the budget room per day and per month, each warning (budget and season) and a last line, `Result: OK` or `Result: BLOCKED`. Do no sums of your own. If it says BLOCKED, stop: change nothing, clear `request`, leave the build `approved`, and say why in plain words from its warnings ("This would take your spend to £34 a day and your limit is £30"). Never lower the budget yourself here: the owner decides in the app.
3. **Mark it building.** Set `status: "building"` while you work.

## Steps, Meta

4. **Check the connection.** Follow `connections.md`. List the tools the Meta connection offers. Say which you will use (the ones that create) and which you won't (anything that activates, updates, pauses, re-budgets or deletes, including `ads_activate_entity` and `ads_update_entity`, names to check in `connections.md`). If the connection isn't there, or isn't signed in, stop: set the build back to `approved`, clear `request`, and tell them to follow `setup/connections/meta-ads.md`.
5. **Check the account.** Read the ad account's name and id and check they match `platforms.meta.accountName` and `accountId`. If they don't, or there's more than one, stop and ask which. Never build in an account they haven't named.
6. **Create the campaign** with the build's `name` and objective, status paused. Read it back. Then **the ad set**: audience, budget, start and end dates, status paused, inside that campaign. Read it back. Then **each ad**, status paused, inside that ad set. Read each back. Budgets go in the platform's own unit (probably pence, to check): read the budget back and confirm it equals the build's `budget.daily`.
7. **Pictures and videos.** The files the owner added are in `apps/ads/data/media/`. If the connection can take a picture (to check), use it. If it can't, create everything that doesn't need the picture, say plainly that the ad needs its picture adding in Meta's own tools, and add that to the checks. Never skip a step silently.
8. **Confirm every object is paused.** If any object is not paused, stop at once. Call nothing else. Don't try to fix it with a tool that updates or pauses: that is off limits. Tell the owner in plain words which object it is, that it may spend, and the link to switch it off themselves in Meta's Ads Manager (https://adsmanager.facebook.com/), and that you won't use a tool to fix it: pausing is only done for a change they approve in the app. Set `status` back to `approved`, add the problem to `activity`, and clear `request`. Never set `in-account` for an object that isn't paused.
9. **Record it.** Set `refs.campaignId` (the platform's id), `refs.url` (the campaign's address in Ads Manager if you can read it, else https://adsmanager.facebook.com/), `status: "in-account"`, `builtAt` now, clear `request` to `null`, update `updatedAt`. Add the campaign to `campaigns` with `platform: "meta"`, `platformId`, `status: "paused"`, `objective`, `dailyBudget`, `startedAt` as the start date, `builtBy: "claude"`, `buildId` and `url`. Add to `activity`: "Built 'New patient check-up, autumn' in your Meta account, paused".
10. **Task List OS (only if attached).** The app asks for the task "Switch on: <build name>" itself as soon as you finish, so leave it. If you are asked to add it, follow `apps/ads/ATTACH-CLAUDE.md` and write the task's id into the build's `taskId`.

## Steps, Google Ads

Google's own connection only reads, so you never create anything in the account. You write 2 files and the owner imports one.

4. **Write the import file** `files/04-marketing/ads/<build-name>-google-ads-editor.csv` from `references/google-ads-editor.md`: the campaign, its budget and dates, the ad group, the keywords and negative keywords, the responsive search ad and the locations, with the campaign, ad group and ad status all Paused. Use the build's words exactly, mapped as that file says (3 ads: 3 headlines and 4 descriptions). If the build has more words than the file can hold, stop and tell the owner what doesn't fit: never drop any. Check the file reads back with every row Paused, every headline within 30 characters and every description within 90. File names use the build's name in lower case with hyphens.
5. **Write the build sheet** `files/04-marketing/ads/<build-name>-build-sheet.md`: what is in the campaign in plain words, the click-by-click steps to import the file into Google Ads Editor and post it, and the click-by-click steps to build the same campaign by hand in Google Ads instead. The pattern is in `google-ads-editor.md`. Mark any click you haven't seen yourself "to check".
6. **Record it.** Set `refs.file` and `refs.sheet` to the 2 paths, `status: "ready-to-import"`, `builtAt` now, clear `request` to `null`, update `updatedAt`. Add to `activity`: "Wrote the Google Ads Editor file for 'New patient check-up, autumn'".
7. **Task List OS (only if attached).** The app asks for the task "Import and switch on: <build name>" itself as soon as you finish, so leave it. If you are asked to add it, follow `apps/ads/ATTACH-CLAUDE.md` and write the task's id into the build's `taskId`.

## Save safely

Read the data file right before each write, write the whole file back, then read it back and check it parses. Change only the build you were asked about, `campaigns` and `activity`.

## What to say back

Meta:

> It's in your Meta account, switched off. I made the campaign, 1 ad set and 3 ads and read them back: all 5 are paused, the budget is £15 a day and the dates are 3 to 30 November. Nothing will spend. When you've checked it, press Switch it on in the app and confirm, and I'll switch it on and read it back. 1 thing first: the ads need their photos adding.

Google:

> I've written the file for Google Ads Editor and a sheet that walks you through it. Everything in it is paused, so it arrives switched off. Open the sheet in New campaigns, follow steps 1 to 5, and when it looks right switch it on in Google Ads yourself: Google's connection only reads, so I can't.

## Rules

- Create paused. Read back. Confirm. In this skill, never activate, update, pause, re-budget or delete.
- Never touch a campaign that exists, and never build the same build twice.
- Never store a token or a customer list.
- Never invent a result, a price or an offer. Use the words in the build.
- If anything surprises you, stop and tell the owner in plain words. Do not carry on.
