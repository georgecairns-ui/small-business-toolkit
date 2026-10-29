# Step 3 of 7: where your ads are

Goal: Claude knows which of Meta (Facebook and Instagram) and Google Ads they use or want to use, and can read their figures: through a connection proven with a real read, or, where there's no connector, from a report they download. Every platform they use ends this step with a recorded status, never a silent gap.

The connector tools named in this step are often not loaded yet: search your tools for them first.

Say this once, in plain words:

> Claude needs at least one connected account to build campaigns for you. Where there's no connector for your account, it can still read your figures from a report you download.

> **Already answered in step 1.** The quick questions in `setup/toolkit-01-quick-questions.md` already asked whether the business runs ads and on which platforms (Meta, Google, or both). Read that answer from `setup/progress.md` (under "Answers from step 1") and from `apps/ads/data/ads.json` first. Confirm it back in a sentence rather than asking again, and go straight to naming the ad accounts and connecting them.

## 1. Ask, one question at a time

1. **Where are your ads, or where do you want them?** Meta (Facebook and Instagram), Google Ads, both, or none yet. Save each they pick as `platforms.<key>` with `on: true` in `apps/ads/data/ads.json` (`meta`, `google`). If they have no ad account yet on a platform they want, say they'll need one before Claude can build there, and that the first campaign can still be drafted.
2. **For each one: what is the ad account called?** Save it as `accountName`. Never ask for an account password, and never ask them to paste a token. Account ids are fine if they want to give one (`accountId`).

Check `apps/home/data/connections.json` and `context/tools.md` too: if a platform is already recorded there, say so and check it in part 2 rather than starting again.

## 2. Connect each platform they use

Meta first, then Google. Offer each one in a line first. It's their choice: if they'd rather not connect a platform yet, record it in part 5 as `not-connected` with the note "Chose not to connect yet", and offer the report for it (part 4).

- **Meta:** "Want to connect your Meta ad account? Claude can then read your figures and your ads, and build new campaigns for you in your account, switched off. It switches one on, pauses one or changes a daily budget only when you press the button in the app and confirm that exact change. It never acts on its own. It takes about 5 minutes." Follow `setup/connections/meta-ads.md`. It is Meta's own connection, in open beta, so it may not have reached their account yet.
- **Google:** "Want to connect your Google Ads account? Claude can then read your figures. Google's own connection only reads, so Claude can't change anything on Google Ads. For new campaigns it writes a file you import into Google Ads Editor, and it arrives switched off. Changes to a Google campaign are steps for you, with a link to Google Ads." Follow `setup/connections/google-ads.md`.

For each, follow its guide and `.claude/skills/connect-a-tool`: look up this session's connections (`session_connectors_status`), then switch it on, reconnect it or point them to Connect, by the table in `connect-a-tool` ("Check, switch on, or point to Connect"). Never ask what's on their screen: you can see the status yourself. Keep going round until it's on. Say "a connection", never MCP, API, JSON or repo. Use only the connector or address in the guide, never another company's ads connector.

## 3. Prove each connection with one read

For each connection, follow `.claude/skills/build-in-account/references/connections.md` (read only), say what you're about to read, and read **only** the account name and its spend over the last 7 days. Say what you found ("I can see the ad account Marlow Dental, which spent £312 in the last 7 days"). Check the account name matches. Only after a read works, record it (part 5).

Save in `apps/ads/data/ads.json`, for each platform: `how` (`connected`, `export` or `none`), `accountName`, and `connectedAt` (now) for a connection. Don't write `lastRefresh` yet: the first look does.

Say once: "Claude Code also asks you before every call to your ad account, so you approve twice for any change: in the app, then here. After you press Yes in the app, it opens Claude on screen with the job typed in, and Claude asks before each step."

## 4. If there's no connector: the report

Where a platform has no connector for them (Meta's beta hasn't reached their account, or Google's own connection isn't in Claude's directory), say this sentence, word for word with the platform's name:

> There's no Claude connector for [app], so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask.

Record it as `export-only` (part 5). Then walk them through the exact clicks in `.claude/skills/update-my-ads/references/exports.md` to download a daily campaign report, and ask them to save it into `files/04-marketing/ads/exports/`. Set `how: "export"`. Say plainly: this means Claude only sees what they download and when, and can't build campaigns in the account. It can still draft them, and for Google it still writes the import file.

Use the same report for a platform they chose not to connect yet.

## 5. Record it

- `apps/home/data/connections.json` (format in `setup/connections/README.md`, "Recording a connection"): create it if it isn't there, as `{ "version": 1, "connections": {} }`. One row per platform, with the key and wording its guide gives (`meta-ads`, `google-ads`): `connected` with today's date in `checked` only after the read in part 3 worked; `export-only` where there's no connector; `not-connected` with the note "Chose not to connect yet" if they'd rather not connect it now; `not-used` for a platform they don't use.
- `context/tools.md`: each connection as its guide says: what Claude may do (read; for Meta, create campaigns that are paused, and make one change you approved in the app: switch on, pause or change a daily budget) and what it never does (act on its own, go over your limits, delete, or change anything on Google).

## 6. If it still won't connect

If a platform's connector is there but still won't connect after the loop in `connect-a-tool`, say what went wrong in one plain line and record its row as `needs-attention`, with what went wrong in `note`. The Connections box on Home shows a **Fix it** button for it. Fix it only reconnects. It never pre-approves anything. Offer the report for that platform (part 4) in the meantime, so the first look has figures. Never ask for a password or a token in chat.

Tick this step in `setup/progress.md`, with a one-line note of each platform's status (for example "Meta connected, Google export-only").
