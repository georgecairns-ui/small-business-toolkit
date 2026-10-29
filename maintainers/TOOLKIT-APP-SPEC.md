# The Toolkit app: spec

The 8th section of the app in Small Business Toolkit, at `apps/toolkit/`. It sits in the sidebar under the 7 tools as "Toolkit". Its job: make the kit proactive. Every button hands Claude a job, so the person never has to know what to ask for.

## Why buttons open Claude

A button can't sign anyone in to Xero or Gmail: sign-in happens on each app's own screen, inside Claude. So every button opens the Claude desktop app's Code tab in this folder with the job already typed in (`claude://code/new?q=<prompt>&folder=<folder>`, the folder from the helper's `GET /api/info`, the same link Task List OS builds for "Open in Claude" in `apps/task-list/app/components.js`). Next to it, a quiet "Copy the prompt" for anyone not on the desktop app. The first time, a one-line note says what happens: "Opens Claude with this typed in. Press Enter to start."

## Pages (menu.json)

1. **Connections** (`#connections`, icon `link` or nearest available): every app the toolkit can connect to, grouped (Email and calendar, Calls, Sales and customers, Money, Ads, Files and notes, Team and bookings). Each card: name, one plain line on what connecting it does, "Used by" chips naming the tools that use it, a status pill (Connected, Not connected, Needs attention, Not used), and one button: **Connect** (not connected), **Check it** (connected), **Fix it** (needs attention). Top of the page: "6 of 24 connected" and a **Connect something else** button. Filter: All, Connected, Not connected.
2. **Set up** (`#setup`, icon `checkSquare` or similar): the 7 tools, each with its status (Set up, Part done, Not yet, Skipped for now), the date, and **Set up now** / **Carry on** / **Run it again**. A line at the top: how many of 7 are set up.
3. **Build and customise** (`#build`, icon `sparkle`): action cards, each opening a small dialog with an optional "Describe it in a sentence" box, then Open in Claude / Copy the prompt:
   - Build me a new page (a new screen in this app for something they track)
   - Add a skill for a job I repeat
   - Change how something works
   - Change the look (their brand)
   - Automate a routine (something Claude checks on a schedule)
   - Add my team (who does what, so tasks and drafts go to the right person)
   - Ask Claude what to do next
   Below the cards: **Ideas from Claude** (`data.ideas` with status `new`): title, why in one line, **Do it** (opens Claude with the idea's own prompt) and **Not now** (sets status `dismissed`, saved). Then **What Claude has built for you** (`data.builds`): title, what it does, date.

## Home boxes (home-boxes.js, `defaultOn: true`, because this kit is always installed fresh)

- **Next steps** (size 2): up to 4 items, in this order: tools not set up yet, key apps not connected (email, calendar, and any app another tool needs), then new ideas. Each with its button. When everything is done: "Everything's set up. Claude adds ideas here as it spots them."
- **Connections** (size 1): "6 of 24 connected", the ones needing attention first, link to the page.

## Data file: `apps/toolkit/data/toolkit.json`

Shipped blank exactly as:

```json
{
  "version": 1,
  "tools": {},
  "ideas": [],
  "builds": []
}
```

Claude fills it; the app only ever changes an idea's status.

- `connections`: **moved in shared version 13.** Which apps are connected now lives in `apps/home/data/connections.json`, the file every tool shares (format in `setup/connections/README.md`, "Recording a connection"), keyed by the same app ids. The Connections page and the Home box read it; `toolkit.json` ships without a `connections` part.
- `tools`: keyed by tool id (`task-list`, `pipeline`, `skill-map`, `proposals`, `content`, `money`, `ads`): `{ "status": "set-up" | "part-done" | "not-yet" | "skipped", "date": "YYYY-MM-DD", "note": "" }`.
- `ideas`: `{ "id": "i-xxxxxx", "title": "", "why": "", "prompt": "", "status": "new" | "done" | "dismissed", "added": "YYYY-MM-DD" }`.
- `builds`: `{ "id": "b-xxxxxx", "title": "", "what": "", "date": "YYYY-MM-DD" }`.

## The list of apps: `apps/toolkit/app/apps-list.js`

One entry per guide in `setup/connections/` (not README.md): `{ id, name, group, guide: "setup/connections/<file>.md", usedBy: [tool ids], what: "one plain line" }`. `xero-drafts` and `bank-feeds` are Money View extras: list them under Money. The prompts:

- Connect: `Connect <name> for me. Follow setup/connections/<file>.md and .claude/skills/connect-a-tool, then update apps/home/data/connections.json.`
- Check it: `Check my <name> connection still works and tell me what you can see. Update apps/home/data/connections.json.`
- Fix it: `My <name> connection needs attention. Follow setup/connections/<file>.md to fix it, then update apps/home/data/connections.json.`
- Connect something else: `I'd like to connect another app to my toolkit. Ask me which one, then use .claude/skills/connect-a-tool.`
- Set up a tool: `Set up <Tool name> for me. Follow the "<Tool name>" part of START-HERE.md, and skip anything my notes in context/ already answer.`
- Build cards: `<the card's job>. <their sentence, if any> Follow .claude/skills/build-on-my-toolkit.`
- Ask Claude what to do next: `Look at my toolkit and tell me the 3 things that would save me the most time next. Follow .claude/skills/whats-next.`

## How to build it

Copy the structure of an existing small tool exactly (Money View OS's `apps/money/index.html` is a good model: the same sidebar markup with `data-tool="toolkit"`, the gate, topbar with theme toggle and Brain dump, the rail, `../shared/` files, `TaskListOS.createStore` for the data file, `TaskListOS.ui` for `esc`, `icon`, `toast`, `copyText`). Use only the shared tokens in `apps/shared/theme.css`, so the person's brand colours apply. No new fonts, no external scripts. Light and dark both work. Phone width: no sideways scroll. Customer-facing words never say agent, repo, repository, artifact, JSON, schema, API or MCP. British English, no em dashes, digits for numbers, no exclamation marks.

The helper saves a tool's data file only if it's listed in `apps/installed.json`; the build adds `{ "id": "toolkit", "name": "Toolkit", "icon": "<icon>", "app": "apps/toolkit/", "dataFiles": ["apps/toolkit/data/toolkit.json"] }` there.
