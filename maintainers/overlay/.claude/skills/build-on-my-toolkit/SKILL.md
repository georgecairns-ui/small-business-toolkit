---
name: build-on-my-toolkit
description: Builds something new on top of the Small Business Toolkit for the person - a new page in the app for something they track, a skill for a job they repeat, a change to how a tool works, their brand on the app, a routine Claude checks on a schedule, or their team set up - safely, without breaking the 7 tools or their data. Use when they press a card on the Toolkit's Build and customise page, or say "build me a page for...", "add a skill for...", "can you change how...", "automate...", "make it do...".
---

# Build on my toolkit

The toolkit is theirs to grow. You build what they ask, in the same shape as everything else here, so it looks and works like part of the app and survives updates. Start by saying in 2 lines what you'll build and where, and get a yes.

## What they can ask for, and how you build it

**A new page** (something they track: jobs, stock, bookings, suppliers, a checklist)
1. Ask the 3 things you need, in one message: what each item is called and what they need to see about it, what they do with it (tick off, move along stages, total up), and where the information comes from (they type it, or you fill it from a connected app or their email).
2. Build it as its own tool in `apps/<name>/`, copying the shape of a small existing one (`apps/money/` is a good model): `index.html` with the shared sidebar markup and `data-tool="<name>"`, `menu.json`, `app/`, `data/<name>.json`, and a `CLAUDE.md` saying what the data file holds and how you keep it up to date. Use only the shared look in `apps/shared/` (so their brand applies) and the shared store for saving.
3. Add it to `apps/installed.json` with `id`, `name`, `icon`, `app` and `dataFiles`, so it appears in the sidebar and the helper saves it. Add `Edit(./apps/<name>/data/**)` and `Write(./apps/<name>/data/**)` to `.claude/settings.json` so you can keep it up to date without asking.
4. If you fill it from a connected app, add that to `.claude/skills/toolkit-check-in` as a once-a-day step, and say so.
5. Open it, show them, and adjust until they're happy.

**A skill for a job they repeat** (a quote, a reply to a type of enquiry, a weekly report)
- Follow `setup/06-build-your-skills.md` section by section for just this one skill: interview briefly, write `.claude/skills/<name>/SKILL.md`, pack it into `skills-to-upload/`.

**A change to how something works** (a tool's stages, categories, how often it chases, what counts as a result)
- Most of it is a setting: look in the tool's `CLAUDE.md` and its app's Preferences or Settings first, and change it there. Only change a tool's code when a setting can't do it, and keep the change small. Never change `apps/server/`, `apps/shared/js/` or another tool's data.

**Their brand on the app**
- Follow `.claude/skills/match-my-brand`.

**A routine Claude checks on a schedule** (a Monday report, a reminder before VAT is due, a check on a supplier's site)
- Write it as a skill, then add it to `.claude/skills/toolkit-check-in`: under "Every run", or under "First run of the day only", with a day or date in it for something weekly or monthly ("on Mondays", "7 days before VAT is due"). The toolkit keeps one scheduled task (`setup/toolkit-03-make-it-automatic.md`), so never make another. If the routine reads an app the check-in can't read without asking, tell them it will stop to ask on a scheduled run. Never anything that sends, posts, pays or deletes on its own.

**Their team** (who does what)
- Add each person to `context/people.md` and the task list's people, and ask who should get which kind of task, so `.claude/skills/delegate-it` routes work to the right person.

## Every time

- **Their data is never touched** unless the build needs it, and then only after a yes. Never delete anything: move it to `files/99-archive/`.
- **Nothing new sends, posts, pays, deletes or changes anything in a connected app.** The toolkit's ground rules in `START-HERE.md` apply to everything you build.
- **Record it.** Add an entry to `builds` in `apps/toolkit/data/toolkit.json`: a short title, what it does in one plain line, today's date. It shows on the Toolkit's Build and customise page. If it came from an idea, set that idea's status to `done`.
- **Check it works**, both ways where it saves anything, before you say it's done.
- Talk to them the way `START-HERE.md` says: plain words, never agent, repo, JSON, schema, API or MCP.
