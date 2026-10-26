---
name: scan-my-folders
description: Looks through the folders they chose and saves a map of every folder and file (names, sizes and dates only) for the folder map. Read-only, nothing is opened, changed, moved or sent. Use when they press Scan in the Files map, type /scan-my-folders, or say "scan my folders", "map my files", "what's in my folders?", "update my folder map".
---

# Scan my folders

## What to read

- `apps/skill-map/data/filemap.json`, only to see which folders are listed in `settings.roots`. If none are listed, the scan starts with Documents, Desktop and Downloads.

## What to do

1. First time only: tell them in one plain sentence which folders you're about to look in, and that you only read names, sizes and dates, never what is inside a file. If they want a different list, put it in `settings.roots` of the map file (or have them use Preferences in the app), then scan.
2. Run the scan once:
   - `node apps/skill-map/scan/scan-files.js`
   - No Node? `python3 apps/skill-map/scan/scan-files.py`
   - Neither installed? Say so plainly and offer to help them install Node from nodejs.org.
3. Stop there. Don't add suggestions, don't move or rename or delete anything, don't open any file. Suggestions are `.claude/skills/review-my-folders`.

## What to write, and where

Nothing. The scan itself writes `apps/skill-map/data/filemap.json`; you only run it. Never type a number into that file.

## What to say back

3 to 5 lines, in plain English, from the scan's own summary:

> I've looked through your Documents, Desktop and Downloads. Found 612 folders and 12,408 files, 41 GB in all. 18 sets of duplicate files are using about 2.1 GB, and there are 140 old files sitting in Downloads. Open the Files map to click into any folder, or the Clean-up page to see what to tidy first.

Use the real numbers from the scan, never the example. If the scan printed notes (a folder it couldn't find or open), pass them on in plain words.

## Hard limits

- Never open, read, copy, move, rename or delete a file or folder.
- Never scan a folder they haven't listed.
- Never send anything.
