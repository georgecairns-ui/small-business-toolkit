---
name: review-my-skills
description: Looks over the skill map and suggests what to tidy up - duplicate names, skills nobody's used in 90 days, overlapping descriptions worth merging, a missing description, or an empty business area worth building a skill for. Only ever suggests; never edits, moves or deletes a skill. Use when they press Review in the app, type /review-my-skills, or say "review my skills", "what should I tidy up?", "any suggestions for my skills?".
---

# Review my skills

## What to read

- `apps/skill-map/data/skillmap.json`: `nodes`, `edges` (duplicate names are `type: "dup"`), `areas`, and `recommendations` already open or skipped, so you don't repeat yourself.
- `apps/installed.json`: whether Task List OS is attached (an entry with `id: "task-list"`).

## What to do

Add up to 8 new suggestions to `recommendations`, and never duplicate one that's already `open` or `skipped`:

- **Names used twice** (`dup` edges): which one looks like the one to keep, and why.
- **Not used in 90 days**, but only if `scan.usage.files > 0` (otherwise there's no history to judge by).
- **Overlapping descriptions**: 2 or more skills that sound like they do the same job, worth merging.
- **A missing description**: a skill with nothing to say what it does.
- **An empty area**: suggest building one skill for it, taken from that area's own `ideas`.

Each suggestion needs a plain `title`, a `why` of 1 or 2 sentences, and the `nodeIds` it's about. You only ever suggest: never edit, move, rename or delete a skill yourself.

## What to write, and where

`apps/skill-map/data/skillmap.json`: new entries in `recommendations` only (`id`, `kind`, `title`, `why`, `nodeIds`, `status: "open"`, `createdAt`). Read the file immediately before you save, write the whole file back, and read it back to check it still parses.

**If Task List OS is attached**, also add each new open suggestion as a suggested task there, in its own format (`apps/task-list/CLAUDE.md`), with `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. It appears on its Review page with a New tag, and needs their click there before anything happens. If Task List OS isn't attached, do nothing more; the suggestion just waits on the Review page in this app.

## What to say back

3 to 5 lines:

> I've gone through your skill map and left 5 suggestions on the Review page: 2 names clash (worth picking one), 3 skills haven't been used in 90 days, and marketing doesn't have a skill yet, so I've suggested one. Have a look and mark each Done or Not now.

## Hard limits

- Never edit, move, rename or delete a skill. You only ever suggest.
- Never add more than 8 suggestions in one run, and never repeat one that's open or skipped.
- Never suggest a skill is unused unless the scan actually has some usage history to go on.
