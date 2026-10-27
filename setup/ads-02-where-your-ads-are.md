# Step 3 of 7: where your ads are

Goal: Claude knows which of Meta (Facebook and Instagram) and Google Ads they use or want to use, and can read their figures, either through a connection or from a report they download.

Say this once, in plain words:

> Claude needs at least one connected account to build campaigns for you. Without one, it can still read your figures from a report you download.

> **Already answered in step 1.** The quick questions in `setup/toolkit-01-quick-questions.md` already asked whether the business runs ads and on which platforms (Meta, Google, or both). Read that answer from `setup/progress.md` (under "Answers from step 1") and from `apps/ads/data/ads.json` first. Confirm it back in a sentence rather than asking again, and go straight to naming the ad accounts and connecting them.

## 1. Ask, one question at a time

1. **Where are your ads, or where do you want them?** Meta (Facebook and Instagram), Google Ads, both, or none yet. Save each they pick as `platforms.<key>` with `on: true` in `apps/ads/data/ads.json` (`meta`, `google`). If they have no ad account yet on a platform they want, say they'll need one before Claude can build there, and that the first campaign can still be drafted.
2. **For each one: what is the ad account called?** Save it as `accountName`. Never ask for an account password, and never ask them to paste a token. Account ids are fine if they want to give one (`accountId`).

## 2. Connect Meta (skippable)

Offer it if they use Meta. It's their choice and they can skip it.

> Want to connect your Meta ad account? Claude can then read your figures and your ads, and build new campaigns for you in your account, switched off. It switches one on, pauses one or changes a daily budget only when you press the button in the app and confirm that exact change. It never acts on its own. It takes about 5 minutes.

Follow `setup/connections/meta-ads.md`, click by click. It is Meta's own connection, in open beta, so it may not have reached their account yet: if it hasn't, say so and move on to the report.

## 3. Connect Google Ads (skippable)

> Want to connect your Google Ads account? Claude can then read your figures. Google's own connection only reads, so Claude can't change anything on Google Ads. For new campaigns it writes a file you import into Google Ads Editor, and it arrives switched off. Changes to a Google campaign are steps for you, with a link to Google Ads.

Follow `setup/connections/google-ads.md`.

## 4. Test each connection with one read

For each connection they made, follow `.claude/skills/build-in-account/references/connections.md` (read only), say what you're about to read, and read **only** the account name and the list of campaigns. Say what you found ("I can see the ad account Marlow Dental, with 4 campaigns, 2 running"). Check the account name matches. If it doesn't read, say what went wrong in plain words and offer the report instead.

Save in `apps/ads/data/ads.json`, for each platform: `how` (`connected`, `export` or `none`), `accountName`, and `connectedAt` (now) for a connection. Don't write `lastRefresh` yet: the first look does.

Say once: "Claude Code also asks you before every call to your ad account, so you approve twice for any change: in the app, then here. After you press Yes in the app, it opens Claude on screen with the job typed in, and Claude asks before each step."

Record each connection in `context/tools.md` as `.claude/skills/connect-a-tool` says: what Claude may do (read; for Meta, create campaigns that are paused, and make one change you approved in the app: switch on, pause or change a daily budget) and what it never does (act on its own, go over your limits, delete, or change anything on Google).

## 5. If neither is connected: the report

For each platform they use, walk them through the exact clicks in `.claude/skills/update-my-ads/references/exports.md` to download a daily campaign report, and ask them to save it into `files/04-marketing/ads/exports/`. Set `how: "export"`. Say plainly: this means Claude only sees what they download and when, and can't build campaigns in the account. It can still draft them, and for Google it still writes the import file.

Tick this step in `setup/progress.md`.
