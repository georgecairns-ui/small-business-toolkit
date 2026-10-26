---
name: connect-a-tool
description: Walks the person through connecting any app (email, calendar, accounting software, and so on) so Claude can read it and help with it. Use during setup, or any time later when the person says "connect my Xero", "can you see my calendar" or "hook up my email".
---

# Connect a tool

## When to use

Setup, or whenever the person wants to connect a new app, for example "connect my Xero", "can you see my calendar" or "hook up my email".

## What you need

- `context/tools.md`, to record the result and check what is already connected.
- Whatever settings screen is open in front of the person; you will need them to tell you what they see.

## Start with the app's own guide

If `setup/connections/<app>.md` exists for this app, follow it exactly; it has the verified steps, the connector's exact name, plan requirements and which of the connector's tools are off limits. `setup/connections/README.md` lists them. Use the general approach below only for apps without a guide.

## Order of preference

1. **A connector from Claude's own connector directory.** Check Settings, then Connectors, for the app. Menus change over time, so describe what to look for (an icon or name for the app) and ask the person what they actually see on their screen, rather than assuming the exact wording.
2. **The app maker's own official server**, set up in the Claude desktop app or Claude Code. Only use one published by the app itself or a well-known publisher. If you are not sure who published it, say so and let the person decide whether to trust it; explain the risk of using an unknown one plainly (it could see or do more than intended).
3. **The app's own programming interface with a key**, only if neither of the above exists and the person agrees to it. Ask for read-only or the smallest level of access first. The person pastes the key into the system's own secure storage (the keychain, an environment variable, or the tool's own settings screen) themselves. Never into this chat, and never into any file in this folder, because this folder may be shared or synced.
4. **A plain export**, a CSV or PDF saved into `files/`, as the fallback when nothing above is possible.

## Steps

1. Ask which app they want connected.
2. Check `context/tools.md` to see if it is already connected another way.
3. Work through the order of preference above, checking with the person at each step rather than assuming.
4. Once connected, test it with one harmless read (for example, "show me the last 3 emails" or "what's my next calendar event") before relying on it for anything.
5. Record it in `context/tools.md`: the app, how it is connected, today's date, what Claude may do by default (read and draft only, unless the person says otherwise), and anything it must never do.

## Rules

- Never ask the person to paste a password, key or token into the chat.
- Default access is read and draft only. Anything that sends, pays, deletes or posts needs the person's say-so each time, even once connected.
- If you are not sure whether a connector exists for an app, say so and check, rather than guessing.
- Do not install or trust an unofficial server without telling the person plainly who published it and what that means.

## What to say to the person

"Let's connect your email. Can you open Settings in Claude and tell me what you see under Connectors? If there's a Gmail or Outlook option there, that's the easiest route. If not, I'll check whether Google or Microsoft publish their own official setup for this instead."

## If something is missing

If no connector or official server exists for the app, say so and move to the API key option or the CSV fallback, explaining the trade-off (a CSV means you only see what they export, when they export it, rather than live).
