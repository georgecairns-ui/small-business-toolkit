# Toolkit: standing instructions for Claude

This folder is the Toolkit app, the 8th section of the app in the Small Business Toolkit. It sits in the sidebar under the 7 tools as "Toolkit" and has 3 pages: **Connections**, **Set up** and **Build and customise**, plus 2 boxes on Home (**Next steps** and **Connections**). Its job is to make the kit proactive: every button hands you a job, so the person never has to know what to ask for. Read this file every time you work with the Toolkit or its data file.

The app runs at **http://localhost:4747/toolkit/**, served by the helper in `apps/server/`. You (Claude) and the app share one file, `data/toolkit.json`. **You fill it; the app only ever changes an idea's status** (Not now). Which apps are connected comes from the shared `apps/home/data/connections.json` (see "Connections live in the shared file" below). The app picks up your changes within a few seconds.

## How the buttons reach you

A button can't sign anyone in to Xero or Gmail: sign-in happens on each app's own screen, inside Claude. So every button opens the Claude desktop app's Code tab in this folder with the job already typed in, and the person presses Enter. Next to it is "Copy the prompt" for anyone not on the desktop app. The prompts are word for word in `app/model.js` (`prompt`). When one arrives, do the job it names, then update `data/toolkit.json` (or, for a connection, `apps/home/data/connections.json`) as below so the page shows the new state.

The one exception is **Find ideas** on Build and customise. It asks the helper to start you straight away with the `find-ideas` job in `claude-jobs.json` (the same work as `.claude/skills/whats-next`, adding up to 5 ideas). If the helper can't start you, the page says so and offers the same job through Open in Claude.

The skills the buttons point at: `.claude/skills/connect-a-tool` (with the guide in `setup/connections/<file>.md`), `.claude/skills/build-on-my-toolkit`, `.claude/skills/whats-next` and `.claude/skills/toolkit-check-in`. Setting up a tool follows that tool's part of `START-HERE.md`.

## The rules that never bend

- **Only ever write what is true.** A connection is `connected` only after you've used it in this folder and seen real data through it. If you haven't checked, it isn't connected.
- **Never store a password, key, token, login, sort code, account number or card number** in this file or in `apps/home/data/connections.json`. `how` says the route, never a key.
- **Never delete a record.** An idea is marked `done` or `dismissed`; a build stays in the list.
- **Never repeat a dismissed idea.** Before adding an idea, check its title and prompt against every idea already in the file, whatever its status.
- Connect nothing, send nothing and change nothing in another app unless the person asked for that one thing in this conversation.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your toolkit", "a connection", "a tool". Never say agent, repo, repository, artifact, JSON, schema, API or MCP.
- After every change, say what you changed in 1 or 2 lines.
- No em dashes. Digits for numbers. No exclamation marks. No hype.

## The data file: `data/toolkit.json`

Shipped blank:

```json
{
  "version": 1,
  "lastDailyRun": "",
  "tools": {},
  "ideas": [],
  "builds": []
}
```

Read the file immediately before you change it, change only the part you mean to, write the whole file back in one go, keep it valid and 2-space indented, and read it back to check it parses. Every date is `YYYY-MM-DD`. If the app finds a status it doesn't know, or a missing list, it stops and says the file needs a quick fix, so keep to the values below exactly.

### `version`

Always `1`.

### `lastDailyRun`

The date the daily check-in last ran: set by `.claude/skills/toolkit-check-in` after its once-a-day part. `""` until then. The app doesn't show it.

### Connections live in the shared file, not here

Since shared version 13, which apps Claude can reach is in `apps/home/data/connections.json`, the one file every tool reads (its format is in `setup/connections/README.md`, "Recording a connection"). The Connections page and the Home box read it. There is no `connections` part in `data/toolkit.json` any more: if an older copy still has one, leave it, the app ignores it.

The page shows a card for each app in `app/apps-list.js` (24 of them, from `gmail-and-google-calendar` to `calendly`), keyed by the guide's file name in `setup/connections/` without `.md`, the same key `connections.json` uses. An app with no row counts as Not connected.

```json
"xero": { "name": "Xero", "status": "connected", "how": "Claude connector: Xero", "checked": "2026-10-26", "note": "Read invoices, bills, contacts and reports." }
```

| Field | What it holds |
|---|---|
| `status` | `connected` (a real read worked on the `checked` date), `needs-attention` (it was connected and now fails, or needs the person to do something), `export-only` (no connector, or one that can only post; you read an export from `files/`), `no-connector` (no connector and they don't want to export), `not-connected`, `not-used` (the person said they don't use this app). |
| `how` | The route in a few words ("Claude connector: Xero", "CSV export into files/"). Never a key. |
| `note` | One plain line the person will read on the card, mostly for `needs-attention`: what's wrong and what they'll need ("Xero asked you to sign in again"). |
| `checked` | The date of the last real read that worked. Required for `connected`; the app refuses `connected` without one. |

When you update it:

- **Connect** (the button, or the person asks): follow the app's guide and `.claude/skills/connect-a-tool`: check the connection status yourself, switch it on or point them to Connect, prove it with one harmless read, then record it. Set `connected` only after that read worked. An app with no connector gets the no-connector sentence from `connect-a-tool` and `export-only`. If it still won't connect after the loop, `needs-attention` with a `note`. If they say they don't use it, `not-used`.
- **Check it**: use the connection, tell them in 1 or 2 lines what you can see, and set `checked` to today. If it fails, set `needs-attention` with a `note` and keep the old `checked`.
- **Fix it**: follow `connect-a-tool` and the guide to fix it, then `connected` with today's `checked`, and clear the `note`.
- **Whenever a connection fails during any other job** (a tool's check-in, a refresh), set it to `needs-attention` with a `note`, so Home shows it first.
- **Connect something else** (an app not in the list): connect it with `.claude/skills/connect-a-tool` and record it in `connections.json` and `context/tools.md`, keyed by its name in lower case with hyphens. The page only shows a card for the apps in `app/apps-list.js`; for another to have a card, it needs a guide in `setup/connections/` and a line in `app/apps-list.js`.

### `tools`

Keyed by tool id: `task-list`, `pipeline`, `skill-map`, `proposals`, `content`, `money`, `ads`. A tool with no entry counts as Not yet.

```json
"money": { "status": "part-done", "date": "2026-10-26", "note": "Accounts connected. The bank feed is next." }
```

| Field | What it holds |
|---|---|
| `status` | `set-up` (every step of its part of START-HERE.md done), `part-done` (started, not finished), `not-yet`, `skipped` (the person chose to leave it for now). |
| `date` | When it was set up, started or skipped. |
| `note` | One plain line shown instead of the tool's description: where it's up to, or what's next. `""` otherwise. |

When you update it: at the end of every setup session for a tool (from the Set up page, Next steps or `/setup`), and when the person says to skip one. Set `part-done` as soon as a setup step for that tool is done, `set-up` when the last one is. "Run it again" goes through the same part of START-HERE.md: leave it `set-up` and update `date` and `note` when you finish.

### `ideas`

Ideas you add for the person, shown under **Ideas from Claude** (status `new`) and in Next steps on Home.

```json
{ "id": "i-k3j9x2", "title": "Send your invoice reminders on Mondays", "why": "3 invoices went overdue last month while you were busy.", "prompt": "Set up a Monday routine that drafts my invoice reminders. Follow .claude/skills/build-on-my-toolkit.", "status": "new", "added": "2026-10-26" }
```

| Field | What it holds |
|---|---|
| `id` | `i-` then 6 random lowercase letters or digits. Never reuse or change one. |
| `title` | What to do, in under 10 words. |
| `why` | One line on why, from something real in their files or tools. |
| `prompt` | The words that open in Claude when they press **Do it**. Written to you, complete, and naming the skill to follow. |
| `status` | `new`, `done` or `dismissed`. The app sets `dismissed` (Not now) and can put it back to `new` (Undo). You set `done` when you've done it. |
| `added` | The date you added it. |

When you add them: when the person presses Find ideas, from `.claude/skills/whats-next` and `.claude/skills/toolkit-check-in`, and whenever you spot something worth doing during another job. Keep no more than 5 `new` at once, and never repeat one that's `dismissed` or `done`.

### `builds`

Everything you've built into their toolkit, shown under **What Claude has built for you**, newest first.

```json
{ "id": "b-p2m8q1", "title": "A page for your stock levels", "what": "Shows what's running low each Monday.", "date": "2026-10-26" }
```

| Field | What it holds |
|---|---|
| `id` | `b-` then 6 random lowercase letters or digits. |
| `title` | What it is, in their words. |
| `what` | One line on what it does for them. |
| `date` | When you finished it. |

When you add one: when you finish a job from Build and customise (`.claude/skills/build-on-my-toolkit`): a new page, a skill, a change, a new look, a routine or the team. Add it only once the person has seen it working. If the job came from an idea, also set that idea to `done`.

## The app's own files

- `app/apps-list.js`: the 24 apps (one per guide in `setup/connections/`, README.md aside), their group, which tools use each one and one line on what connecting it does; the 7 tools; and the key apps Next steps suggests.
- `app/model.js`: the rules (statuses, counts, Next steps) and every prompt, word for word. The connection statuses are the shared ones in `apps/shared/js/connections.js`.
- `app/view-connections.js`, `app/view-setup.js`, `app/view-build.js`: the 3 pages. `app/app.js` ties them together.
- `home-boxes.js`: the 2 Home boxes. `claude-jobs.json`: the `find-ideas` job.
