---
name: scan-my-skills
description: Finds every skill and command Claude can use on this computer, and how much each has been used in the last 90 days, and saves it to the skill map. Read-only, nothing is changed or sent. Use when they press Scan again in the app, type /scan-my-skills, or say "scan my skills", "find my skills", "what skills have I got?", "update my skill map".
---

# Scan my skills

## What to read

- `context/business.md`, if it exists, is not needed for this skill; it's for grouping, not scanning.

## What to do

1. Run the scan once:
   - `node apps/skill-map/scan/scan.js`
   - No Node? `python3 apps/skill-map/scan/scan.py`
   - Neither installed? Say so plainly and offer to help them install Node from nodejs.org.
2. Stop there. Don't group skills, don't add suggestions, don't change anything else. That's `.claude/skills/group-my-skills` and `.claude/skills/review-my-skills`.

## What to write, and where

Nothing. The scan itself writes `apps/skill-map/data/skillmap.json`; you only run it.

## What to say back

3 to 5 lines, in plain English, from the scan's own summary:

> I've looked through your computer for skills and commands. Found 42 skills and 6 commands in 7 places. 3 are new since the last scan. 18 have been used in the last 90 days. 2 names turned up twice; have a look at those in Review.

If the scan says it found no Claude Code history, say plainly that use counts will show as 0 and nothing will be marked unused until there's some history to go on.

## Hard limits

- Read-only. Never edit, move or delete a skill, a folder or a file anywhere on their computer.
- Never type a number into the skill map by hand; every count comes from the scan itself.
- Never run the scan more than once per request.
