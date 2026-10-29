# Connect Google Ads

What it gives your app: lets Claude read your Google Ads figures. It cannot create or change anything.

**Connector:** Google's own Google Ads connection, if Google has published one in Claude's connector directory. **It reads only.** Claude can't create a campaign or change one through it, so for new Google campaigns Claude writes a file they import into Google Ads Editor, and it arrives switched off. Changes to a Google campaign are steps for them, with a link to Google Ads. **Plans:** any Claude plan may work, and on Team or Enterprise plans an owner may need to add it first (to check).
**Route:** directory, only a connector published by Google itself. We have no Google address in this guide, so never add one by address, and never use another company's ads connector.

Nothing here has been clicked through by the person who wrote this guide, so every click is marked **to check**, and so is the connection's name. Check the connection's status yourself at each step (below), and correct this file afterwards.

Before you begin, say in plain words: "Claude can read your Google Ads figures. It can't change anything in your account, and Claude Code asks you before it reads anything."

## Connect

1. Say "Let's connect your Google Ads." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect"). If it isn't there, search Claude's connector directory (`search_mcp_registry` with "Google Ads") for a connector published by Google. If there isn't one, go to "If there's no connector".
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then **Google Ads**, then **Connect**. (To check: whether Google's own connection is listed there, and what it is called.)
4. A Google window opens. Sign in with the Google account that manages their ads. Choose the ad account if Google asks; if they manage several, pick the one for this business. (To check.)
5. Allow reading their Google Ads data when the permission screen asks. (To check what it says. Allow nothing that says edit or manage if there's a choice.)
6. Look up the connections again. When Google Ads is there and on, go to "Prove it".

If it won't connect:
- **They can't see their ad account after signing in:** the Google account they used doesn't have access to it. Ask whoever manages the account to add them, or sign in with theirs. (To check.)
- **It still won't connect after the loop in `connect-a-tool`:** record it as `needs-attention`, with what went wrong in `note`. The Connections box on Home shows a **Fix it** button for it.

## If there's no connector

Say exactly: "There's no Claude connector for Google Ads, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Then follow `.claude/skills/update-my-ads/references/exports.md`, the Google Ads section, for the exact clicks to download a daily campaign report, and ask them to save it into `files/04-marketing/ads/exports/`. Claude will only see what they download and when.

## Prove it

Ask permission, then read only the account name and its spend over the last 7 days. Say something like: "I can see the account Marlow Dental, which spent £148 in the last 7 days." Check the name is right.

## What Claude may and may not do

- **Read** with read tools: campaigns, their status and budgets, daily figures.
- **Never** try to create, edit, pause or switch on anything, through this connection or any other route. Don't look for a way round: no other token, no other connection.
- New Google campaigns are written as an import file and a build sheet by `build-in-account` (`.claude/skills/build-in-account/references/google-ads-editor.md`), and the owner imports it.
- No Google Ads tool is pre-approved in `.claude/settings.json`: Claude Code asks before each call. Never ask them to change that.
- Never ask for a password or a token in chat.
- Rules for the connection are kept in one place: `.claude/skills/build-in-account/references/connections.md`.

Pre-approve for check-ins: none. No Google Ads tool is pre-approved, not even a read tool, in `.claude/settings.json` or `.claude/settings.local.json`: Claude Code asks before each call.

Ads OS has no check-in setup and nothing here is pre-approved. After a Fix it, ignore the pre-approval check in connect-a-tool: there are no read tools to restore, so never add a Meta Ads or Google Ads tool to .claude/settings.json or .claude/settings.local.json, and never offer to.

## Record

`apps/home/data/connections.json`, key `google-ads`: name "Google Ads", status `connected`, how "Google's own connection (read only)", checked today, note "Read campaigns and figures. Never create or change anything."

`context/tools.md`: "Google Ads | Google's own connection (read only) | <today's date> | Read campaigns and figures | Create or change anything"

Then in `apps/ads/data/ads.json` set `platforms.google`: `on: true`, `how: "connected"`, `accountName`, `connectedAt`. With no connector, `how: "export"` instead.

## Sources

Not yet verified against Google's own pages; rewritten into the connected-onboarding shape on 2026-10-29. To check before relying on this guide:
- Google's help page for its Google Ads connection for Claude (its name, address and what it can read).
- The connection's own tool list, once connected.
- Checked on 2026-10-29: Claude's connector directory lists no Google Ads connector published by Google (only other companies' ads connectors, which don't count). Until one appears, a Google Ads account goes the "If there's no connector" way. The old advice to ask George for an address is removed: a connector is added by address only when the address is the app maker's own and is written in this guide.

For maintainers: if a person ever finds Google's own connector missing or different from this guide, this guide needs updating. Tell George.
