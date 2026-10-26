# Connect Google Ads

One line: lets Claude read your Google Ads figures. It cannot create or change anything.

**Recommended route:** Google's own Google Ads connection, added in the Claude desktop app. **It reads only.** Claude can't create a campaign or change one through it, so for new Google campaigns Claude writes a file you import into Google Ads Editor, and it arrives switched off. Changes to a Google campaign are steps for you, with a link to Google Ads.

Nothing here has been clicked through by the person who wrote this guide, so every click is marked **to check**, and so is the connection's name and address. Ask the person what they see on their screen at each step, and correct this file afterwards.

Before you begin, say in plain words: "Claude can read your Google Ads figures. It can't change anything in your account, and Claude Code asks you before it reads anything."

## Route 1: add it in the Claude desktop app

1. Say "Let's connect your Google Ads". Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Open the Claude desktop app, then Settings, then **Connectors**. (To check.)
3. Look for **Google Ads** in the list of connectors and press **Connect**. (To check: whether Google's own connection is listed there, and what it is called. If it isn't listed, ask George for the address of Google's own connection and add it with **Add custom connector**.)
4. A Google window opens. Sign in with the Google account that manages your ads. (To check.)
5. Choose the ad account if Google asks. If you manage several, pick the one for this business. (To check.)
6. Allow reading your Google Ads data when the permission screen asks. (To check what it says. Allow nothing that says edit or manage if there's a choice.)
7. Back in Claude, the connection should say Connected. In Claude Code it should appear once Claude Code is signed in with the same Claude account. Check with `/mcp`. (To check.)

**Plans:** any Claude plan may work, and on Team or Enterprise plans an owner may need to add it first. (To check.)

## If you can't connect

- **Not listed, or Google says it isn't available for your account:** use Route 2. Tell George if it's missing: this guide needs updating.
- **You can't see your ad account after signing in:** the Google account you used doesn't have access to it. Ask whoever manages the account to add you, or sign in with theirs. (To check.)
- **Anything else:** tell Claude what the screen says.

## Route 2: a report you download

Follow `.claude/skills/update-my-ads/references/exports.md`, the Google Ads section. Claude will only see what you download and when.

## Check it works

Ask permission, then read only the account name and the campaigns. Say something like: "I can see the account Marlow Dental and 3 campaigns, 1 running." Check the name is right.

## Rules for Claude with Google Ads

- **Read** with read tools: campaigns, their status and budgets, daily figures.
- **Never** try to create, edit, pause or switch on anything, through this connection or any other route. Don't look for a way round: no other token, no other connection.
- New Google campaigns are written as an import file and a build sheet by `build-in-account` (`.claude/skills/build-in-account/references/google-ads-editor.md`), and the owner imports it.
- No Google Ads tool is pre-approved in `.claude/settings.json`: Claude Code asks before each call. Never ask them to change that.
- Never ask for a password or a token in chat.
- Rules for the connection are kept in one place: `.claude/skills/build-in-account/references/connections.md`.

## What to record

Add to `context/tools.md`: "Google Ads | Google's own connection (read only) | <today's date> | Read campaigns and figures | Create or change anything".

Then in `apps/ads/data/ads.json` set `platforms.google`: `on: true`, `how: "connected"`, `accountName`, `connectedAt`.

## Sources

Not yet verified against Google's own pages. To check before relying on this guide:
- Google's help page for its Google Ads connection for Claude (its name, address and what it can read).
- The connection's own tool list, once connected.
