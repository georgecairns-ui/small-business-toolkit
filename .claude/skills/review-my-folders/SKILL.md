---
name: review-my-folders
description: Looks over the folder map and suggests what to tidy first - duplicates to keep one of, big old files to archive, downloads to clear, untidy names, crowded or empty folders. Only ever suggests; never moves, renames, edits or deletes a file or folder. Use when they press Review in the Files map, type /review-my-folders, or say "review my folders", "what should I tidy?", "clean up my files", "what's taking up space?".
---

# Review my folders

## What to read

- `apps/skill-map/data/filemap.json`: `findings` (what the scan spotted: `dups`, `big`, `stale`, `oldDownloads`, `installers`, `messy`, `emptyFolders`, `looseFolders`, `deepFolders`), `folders` (sizes, newest and oldest change, what kinds of file are in each), `files` (the biggest and newest files, and every file a finding names), and `recommendations` already open or skipped, so you don't repeat yourself.
- `context/business.md` and `context/routines.md` if they exist, so you know what the business keeps and what it can let go of (for example, tax records are kept for years).
- `apps/installed.json`: whether Task List OS is attached (an entry with `id: "task-list"`).

## What to do

Add up to 8 new suggestions to `recommendations`, most useful first, never duplicating one that's already `open` or `skipped`. Think like a tidy-minded colleague, in this order:

1. **Duplicates** (`findings.dups.groups`): for a set of copies, say which one looks like the one to keep (the one in the most sensible folder), kind `keep-one`.
2. **Downloads and installers** (`oldDownloads`, `installers`): suggest clearing what has sat for 90 days, kind `tidy`.
3. **Big files nobody has touched** (`stale`, `big`): suggest an archive or a backup drive, kind `archive`. Be careful about anything that looks like a contract, a tax record or a client deliverable: suggest archiving those, never clearing them.
4. **Untidy names** (`messy`): suggest a naming habit and name a few examples, kind `rename`.
5. **Crowded, empty and buried folders** (`looseFolders`, `emptyFolders`, `deepFolders`): suggest sub-folders for a crowded one, tidying away empty ones, kind `tidy` or `merge`.

Each suggestion needs a plain `title`, a `why` of 1 or 2 sentences that says what would be gained (use the real counts and sizes from the scan, never invented ones), and the `fileIds` or `folderIds` it's about (ids exactly as they appear in the file). You only ever suggest.

## What to write, and where

`apps/skill-map/data/filemap.json`: new entries in `recommendations` only (`id`, `kind`, `title`, `why`, `fileIds`, `folderIds`, `status: "open"`, `createdAt`). Read the file immediately before you save, write the whole file back, and read it back to check it still parses.

**If Task List OS is attached**, also add each new open suggestion as a suggested task there, in its own format (`apps/task-list/CLAUDE.md`), with `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. It appears on its Review page with a New tag and needs their click there before anything happens. If it isn't attached, do nothing more; the suggestion waits on the Review page in this app.

## What to say back

3 to 5 lines:

> I've gone through your folders and left 6 suggestions on the Review page. The biggest win is keeping one copy of 18 duplicate files (about 2.1 GB), then clearing 140 old files from Downloads. Nothing has been moved or deleted: have a look and mark each one Done or Not now.

## Hard limits

- Never move, rename, edit, open or delete a file or folder. You only ever suggest.
- Never add more than 8 suggestions in one run, and never repeat one that's open or skipped.
- Never type a size or count that isn't in the scan.
- Never suggest clearing anything that looks like a legal, tax or client record. Suggest archiving it.
