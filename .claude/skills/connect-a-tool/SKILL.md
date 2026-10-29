---
name: connect-a-tool
description: Connects any app (email, calendar, accounts, customer records, call recorder and so on) so Claude can read it and help with it, checking the connection for itself and proving it with a real read. Use during setup, or any time the person says "connect my Xero", "can you see my calendar", "hook up my email", or when a connection needs attention.
---

# Connect a tool

## When to use

Setup, or whenever the person wants to connect an app or fix one, for example "connect my Xero", "can you see my calendar", "hook up my email", or a **Fix it** button.

## What you need

- The connector status tool in the Claude desktop app (`session_connectors_status`). Connector tools are often not loaded until you search for them, so before deciding you're not in the desktop app, search your tools for `session_connectors_status` and call it. Only if it can't be found or the call fails, say "Connecting apps needs the Claude desktop app. Open it, choose the Code tab, pick this folder and ask me again." and stop.
- The other tools named here (`set_session_connector_enabled`, `reconnect_session_connector`, `search_mcp_registry`, `suggest_connectors`) may need searching for first in the same way.
- `apps/home/data/connections.json` and `context/tools.md`, to check what's already connected and to record the result.
- The guide mode in `setup/progress.md` (beginner, some or confident), for how much to explain.

## 1. Find the route, never guess

1. If `setup/connections/<app>.md` exists, follow it exactly. `setup/connections/README.md` lists them.
2. If there's no guide, search Claude's connector directory (`search_mcp_registry` with the app's name, or `suggest_connectors`). A connector published by the app's maker or listed in Claude's directory counts. Anything else doesn't.
3. Nothing found: go to 4.

## 2. Check, switch on, or point to Connect

Look up this session's connections (`session_connectors_status`) and act on what you find:

| What you find | What you do |
|---|---|
| It's there and on | Go to 3 |
| It's there but switched off for this session | Switch it on (`set_session_connector_enabled`). They'll be asked to approve. It works from your next message: end this one by saying what you switched on and that you'll check it next |
| It isn't there | Give them the path from the guide: in the Claude desktop app, Customize, then Connectors, then the app's name, then Connect, then sign in on the app's own page and approve. For a custom-address connector, only the address in our guide. Ask them to say when it's done, then look again |
| It needs signing in (`needs_auth`) | Tell them to open Connectors (or type `/mcp` here), choose it and sign in. Then look again |
| It's not working (`failed`) | Reconnect it (`reconnect_session_connector`). It's ready from your next message: say so, then look again |

Keep going round until it's on. Describe where things are in their guide mode, and never ask them what's on their screen: you can see the status yourself.

## 3. Prove it, then record it

Do one harmless read from the guide (for example "show me the last 3 emails" or "what's my next calendar event") and say what you found in one line, without quoting anything private. Only then record it:
- `apps/home/data/connections.json` (format in `setup/connections/README.md`, "Recording a connection"): `"status": "connected"`, today's date in `checked`.
- `context/tools.md`: the app, how it's connected, today's date, what you may do (read and draft only, unless they say otherwise), and what you must never do.

If the read fails, go back to 2.

After a **Fix it** that reconnected or re-added an app, check that `.claude/settings.local.json` still lists that app's read tools under their current names (the names include an id that may change). If it doesn't, redo the pre-approval step of this folder's check-in setup for that app, using the rule in its guide.

## 4. No connector

Say exactly this, with the app's name: "There's no Claude connector for <app>, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only` (or `no-connector` if they don't want to export), with the reason in `note`.

## 5. If it still won't connect

Outside the email and calendar step of setup (email and calendar, which don't move on until proven or there's no connector), an app that still won't connect after the loop is recorded as `needs-attention`, with what went wrong in `note`. The Connections box shows a **Fix it** button, which brings you back here.

## Rules

- Never ask the person to paste a password, key or token into the chat, or anywhere in this folder.
- Never add a connector address that isn't in our guide, and never set up a server outside Claude's Connectors screen.
- Default access is read and draft only. Anything that sends, pays, deletes or posts needs the person's say-so each time, even once connected.
- Xero draft invoices (`setup/connections/xero-drafts.md`) is an optional extra that comes with Money View OS and the Small Business Toolkit: only when the person asks for Claude to put invoices into Xero. Never offer it in setup. If that file isn't in this folder, tell them it comes with Money View OS.
