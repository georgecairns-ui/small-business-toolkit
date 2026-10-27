---
name: tidy-up
description: Does the tidying the person asked for with a Fix button in Skill and Folder Map OS - moves old or duplicate files into a "Tidied by Claude" folder, gives untidy files clearer names, sorts a crowded folder into sub-folders, retires unused skills into an archive folder, or undoes a tidy-up. Everything is a move, never a delete, and every tidy-up can be undone. Use when they press a Fix button, type /tidy-up, or say "tidy up what I asked for", "do the clean-up", "fix those", "undo that tidy-up".
---

# Tidy up

The person has already seen exactly what will happen and pressed the button, so you do not ask again. Your job is to carry it out safely and tell them plainly how it went.

## What to read

- `apps/skill-map/data/tidy.json`: the list of things they asked for. Each item in `actions` with `"status": "queued"` is waiting. An item is either a list of moves to make (`plan`), a request for you to work out the moves (`needsPlan: true`), or an undo (`kind: "undo"`).

## What to do

1. Read `tidy.json`. If nothing is queued, say so and stop.
2. For every queued item with `needsPlan: true` and an empty `plan`, work out the moves first, using names only. Never open a file.
   - `task: "rename"` (untidy names): for each entry in `items`, choose a clearer name in the same folder, keeping the file type (the ending after the dot). Take out "copy", "(1)", "final final", "new", "untitled" and the like, and make the name say what the file is, from its current name and date only. If you can't improve a name with confidence, leave that file out of the plan. Write each as `{ "from": <its path>, "to": <the folder and the new name>, "type": "file", "bytes": <its bytes> }`.
   - `task: "sort"` (crowded folders): for each folder in `items`, list its file names with `ls -1 <folder>` and decide on a few sub-folders that make sense (by kind of file such as Images, Documents and Spreadsheets, or by year or project when the names make it obvious). Move only loose files, never an existing sub-folder, never a name starting with a dot. Write each as `{ "from": <folder>/<name>, "to": <folder>/<Sub-folder>/<name>, "type": "file" }`. Leave a file where it is when it has no obvious home.
   - Put the moves into that item's `plan` list in `tidy.json` and leave everything else in the file as it is.
3. Run the tidy-up script once. It carries out every queued item and writes what happened into `tidy.json`:
   - `node apps/skill-map/tidy/tidy.js`
   - No Node? `python3 apps/skill-map/tidy/tidy.py`
   - Running the script is not pre-approved, so the person is asked to approve it. That is their last say. If you can't ask (you were started by the app's Fix button and the command is refused), don't try another way: tell them the tidy-up is waiting, and to open Claude in this folder and say "do the tidy-up", then approve the command when it asks.
4. Then refresh the map of whatever you tidied, so the app shows the new state: `node apps/skill-map/scan/scan-files.js` after a folder tidy-up, `node apps/skill-map/scan/scan.js` after a skills tidy-up (or the python versions). Run each once.
5. Stop there.

## What to say back

3 to 5 lines, in plain English, from the script's own summary and the results in `tidy.json`. Say how many things moved, where they went (a folder called "Tidied by Claude" in the same folder, or the "-archive" folder next to the skills), anything that was left alone and why (it had changed, it was a shortcut, it was somewhere it isn't allowed to touch), and that they can undo it from the Clean-up or Review page. If something failed, say what and that nothing was lost.

## Hard limits

- Never delete anything, and never run `rm`, `mv` or any command that changes files yourself. The script does every move. Your only changes are the plan you write into `tidy.json` and the two scans.
- Never move, rename or look inside anything that isn't in the person's `tidy.json`.
- Never open or read the contents of a file. Names, sizes and dates only.
- Never retire a skill that came with a plugin or with this toolkit; the script refuses and so should you.
- Never send anything.
