# How the tools attach to each other

Version 3, 23 October 2026. This file is identical in every tool in the small business toolkit. If it changes, it changes in all of them at once.

## The idea

Every tool is a complete kit on its own, built exactly the way Task List OS is built. Someone can use just the task list, or just the pipeline, and it works. Attach a second tool and it slots into the same folder: one app at http://localhost:4747 with both tools in the sidebar, one set of business notes, one files folder, and one Claude that knows how to run both. Attach all 7 and they've got the whole toolkit.

There is no separate "whole toolkit" product. The whole toolkit is simply every tool attached to every other tool.

## Why: every tool is a free lead magnet

Every tool is free. Each one is a way into a conversation with Get AI Powers. Someone downloads one tool, it does a real job for them straight away, and the menu shows them everything else the toolkit can do. To get another tool, they book a free call and we set it up with them. On that call we see how their Claude is set up (folders, business notes, skills) and show them what it takes to get the most out of it. That's the conversation Joey and George want: we give the tools away because what we sell is getting it all working properly and keeping it working.

## The menu: every tool on show, the rest locked

- The shared sidebar always shows all 7 tools, from `apps/shared/catalogue.json`.
- Tools listed in `apps/installed.json` open as normal.
- Every other tool shows with a small padlock, readable but not openable. Clicking it opens a calm panel: the tool's name, what it does in 2 plain sentences, "Get AI Powers sets this up with you on a free call", and a **Book a free call** button.
- The button opens the booking page in a new tab. The link lives in one place, `apps/shared/catalogue.json`: https://calendly.com/d/d2bq-8jx-r39/claudit-audit with `utm_source` set to the tool they're using, `utm_medium=toolkit-app` and `utm_campaign` set to the locked tool they clicked, so we can see which tool brought each call in.
- No pop-ups, no countdowns, no nagging. The locked tools sit quietly in the menu until someone clicks one.
- `catalogue.json` has a `showMoreTools` setting. A paying client's customised version can switch the locked tools off.
- If the person asks their Claude for a locked tool, Claude explains what it does, says Get AI Powers sets it up with them on a free call, and gives the booking link. If they say they're on that call, or Get AI Powers has told them to go ahead, Claude attaches it as below.

## The toolkit

| Folder | Tool | App folder | What it does |
|---|---|---|---|
| `task-list-os` | Task List OS | `apps/task-list/` | The task list that does itself. Where every tool's actions land |
| `pipeline-os` | Pipeline OS | `apps/pipeline/` | The pipeline that chases itself: every deal on one board, follow-ups drafted for you |
| `skill-and-folder-map-os` | Skill and Folder Map OS | `apps/skill-map/` | See everything Claude could take off your plate, mapped across the business |
| `proposal-writing-os` | Proposal Writing OS | `apps/proposals/` | Put everything about a client in one folder, get a proposal in your brand |
| `content-machine-os` | Content Machine OS | `apps/content/` | A week of posts planned and drafted in your voice |
| `money-view-os` | Money View OS | `apps/money/` | Your money month by month from your accounts app, with a 12-week forecast and the tax to put aside |
| `ads-os` | Ads OS | `apps/ads/` | Google and Meta ads on one plain-English screen, with campaigns Claude builds and runs once you say yes |

## Same shape in every tool

Every tool copies Task List OS's layout. Shared parts are identical in every tool; tool parts belong to that tool alone.

```
CLAUDE.md, START-HERE.md, README.md, LICENSE   kit files (same structure, the tool's own words)
toolkit.json                                    what this tool is and what it adds when attached
apps/server/                                    SHARED: the helper that runs the app on this computer
apps/shared/                                    SHARED: look (theme.css), components, store.js, sidebar, catalogue.json, VERSION
apps/installed.json                             SHARED: the list of tools in this folder (the sidebar reads it)
apps/<tool>/                                    TOOL: index.html, app/, data/, CLAUDE.md, ATTACH-CLAUDE.md
context/                                        SHARED: business, people, priorities, routines, voice, tools
files/                                          SHARED: the numbered business folders
setup/                                          SHARED steps, plus TOOL steps named setup/<tool>-*.md
setup/connections/                              SHARED: one guide per app, merged when attaching
.claude/skills/                                 SHARED skills plus TOOL skills (listed in toolkit.json)
docs/, maintainers/                             kit docs
```

`apps/shared/VERSION` holds a version number and date. Whenever the shared parts change in any tool, the number goes up and the change is copied into every other tool.

## toolkit.json

Every tool has one at its root:

```json
{
  "id": "pipeline",
  "name": "Pipeline OS",
  "version": "1.0.0",
  "sharedVersion": "2",
  "attachingVersion": "1",
  "app": "apps/pipeline/",
  "dataFiles": ["apps/pipeline/data/pipeline.json"],
  "skills": ["update-my-pipeline", "who-to-chase"],
  "setupSteps": ["setup/pipeline-01-your-deals.md"],
  "connections": ["setup/connections/pipedrive.md", "setup/connections/hubspot.md"],
  "claudeSection": "apps/pipeline/ATTACH-CLAUDE.md",
  "reads": ["task-list"],
  "sends": [{ "to": "task-list", "what": "a suggested task for each chase that's due" }]
}
```

A tool that keeps photos or videos (Content Machine OS) adds `"media": true`. Step 5 below copies it into `apps/installed.json`, and the helper only stores and plays back files for a tool that has it (shared version 7).

## Attaching: what Claude does

Usually on a call with Get AI Powers (see the menu section above). When the person says "attach the proposal writer", "add the pipeline" or similar, and they're cleared to go ahead, their Claude:

1. Fetches the tool into a temporary folder outside their workspace (the same way they fetched the first kit).
2. Reads its `toolkit.json` and tells them in plain words what will be added.
3. Copies in the tool's own parts: its `apps/<tool>/` folder, its skills, its setup steps and any connection guides they don't already have. It never overwrites `context/`, `files/`, `setup/progress.md` or another tool's data.
4. Shared parts: if the incoming `sharedVersion` is newer, updates `apps/server/` and `apps/shared/`, keeping the person's own `theme.css` values (colours, fonts, logo).
5. Adds the tool to `apps/installed.json`, so it appears in the sidebar.
6. Adds the tool's `ATTACH-CLAUDE.md` lines (its skills table and day-to-day rules) to the main `CLAUDE.md` under "Attached tools".
7. Adds the tool's own permissions to the folder's `.claude/settings.json`, so Claude doesn't ask every time it uses the new tool. It reads the incoming tool's `permissions.allow` list and adds an entry only when all of these are true:
   - The folder's list doesn't already have it, letter for letter.
   - It belongs to the incoming tool: an `Edit(...)` or `Write(...)` inside `./apps/<tool>/` or on the skill folders the tool makes for itself (Content Machine OS's `./.claude/skills/*-what-works/**`), or a `Bash(...)` that runs a script in `apps/<tool>/` or a setup script the tool brings with it (`setup/scripts/`), or `WebSearch` or `WebFetch`. The entries every tool shares (`Read(./**)`, `context/`, `files/`, `apps/home/data/`, `skills-to-upload/`, `setup/progress.md`, the helper's start script) are already in the folder and are left alone.
   - It doesn't send, post, publish, upload or delete anything: no email, message or ad platform tool, no `git push`, `curl`, `rm` or the like, and no open-ended command such as `Bash(ls:*)`.

   It never removes or changes an entry already there, never touches `deny`, `ask` or any other setting, and never touches `.claude/settings.local.json` (the person's own). It tells the person in plain words what it added, and anything it left out so Claude will ask first. A new entry takes effect when Claude is next started in the folder.
8. Runs only the tool's own setup steps, and skips any question `context/` already answers. Nobody gets asked what their business does twice.
9. Restarts the helper, opens the app and shows the new tool in the sidebar.
10. Notes what it did in `setup/progress.md`, including each permission it added, letter for letter.

Detaching works the other way round. The tool's data moves to `files/99-archive/`, never deleted. The permissions it added (from `setup/progress.md`) come out of `.claude/settings.json`, unless another attached tool still has the same entry.

## Passing things between tools

- **Action lands in the task list.** Anything a tool turns up that the person has to do becomes a suggested task in Task List OS (its Review page, "New" tag), in the task list's own format (`apps/task-list/CLAUDE.md`), with a link back to where it came from: `"source": { "tool": "pipeline", "id": "d-x7k2m9" }`. If Task List OS isn't attached, the tool keeps it in its own list instead.
- **Reading is fine, writing is not.** An attached tool may read another tool's data file (the proposal writer reads the pipeline's deals). It never edits another tool's records. If it wants something changed elsewhere (move a deal to "Proposal sent"), it adds a suggestion to that tool's suggestions list and the person approves it there.
- **One list of people.** Task List OS already keeps People. Tools link to a person by their People id when Task List OS is attached, rather than keeping a second copy of contacts.
- **One set of notes, one files folder.** Every tool reads `context/` and files into `files/`. A tool only adds its own notes as a new section or a new file in `context/`.
- **Every handoff needs a click.** Nothing moves between tools on its own.
- **Every tool still works alone.** If the tool it would read or send to isn't attached, it does the job itself or skips that part quietly. No errors, no nagging.

## Who reads and sends what

| Tool | Reads, when attached | Sends, when attached |
|---|---|---|
| Task List OS | | Receives tasks from every tool |
| Pipeline OS | People and tasks (Task List OS), proposal status | Tasks: chases due. Proposal writer: "proposal needed" when a deal reaches that stage. Money view: expected income when a deal is won. Content machine: a case study idea when a deal is won |
| Skill and Folder Map OS | `context/`, which tools are installed (to show what's already covered) | Tasks: build the start-here skills |
| Proposal Writing OS | Pipeline deals | Tasks: follow up a sent proposal. Pipeline: move the deal's stage when a proposal is sent, won or lost. Money view: expected income when won |
| Content Machine OS | Pipeline wins, `context/voice.md` | Tasks: posts due today |
| Money View OS | Pipeline and proposal wins, ad spend | Tasks: chase overdue invoices (using the `polite-chaser` skill) |
| Ads OS | Pipeline (deals won from ads) | Tasks: approved ad changes, and campaigns waiting to be switched on. Pipeline: new Meta leads as suggested deals. Money view reads ad spend itself, as money going out |

## The helper and the sidebar

- The helper in `apps/server/` serves `apps/` and saves only the data files of tools listed in `apps/installed.json`, with the same backup and safe-save rules Task List OS uses. It still refuses everything else.
- The shared sidebar reads `apps/installed.json` and shows every attached tool, so attached tools feel like one app. Moving between tools keeps the same look and the same place in the sidebar.

## Repositories and copies

- **Where the work happens:** each tool is a git repository on George's computer at `~/Repos/getaipowers/<folder>`, next to `task-list-os`.
- **Public download:** each repository is published on GitHub at `github.com/georgecairns-ui/<folder>`. That's what customers copy.
- **Google Drive copy:** a plain copy of the published version (no git history) sits in the small business toolkit folder in the Get AI Powers Brain shared drive, one folder per tool. Joey and anyone else on the team install from there. It's refreshed every time a new version is published. Never edit it there: changes made in Drive are overwritten.
- **Licence:** every tool carries the same plain-English licence as Task List OS: free to use and change for your own business, not for resale.
