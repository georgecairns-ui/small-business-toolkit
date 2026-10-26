# Step 2 of 5: map your folders

Goal: map the folders they choose and let them see it for the first time.

## 1. Tell them what's about to happen

One plain sentence before you start:

> I'm going to look through some of your folders and build you a map of what's in them. I only read names, sizes and dates, never what's inside a file. Tidying only happens later, if you press a Fix button.

## 2. Choose the folders

Show them the default list, and ask once whether to change it:

> By default I look in Documents, Desktop and Downloads. Want to add anywhere else, a Google Drive or Dropbox folder, a folder on an external drive, or take any of those out?

Put the final list in `settings.roots` of `apps/skill-map/data/filemap.json`: read the file, change only that key, then write it back.

## 3. Run the scan

Follow `.claude/skills/scan-my-folders`.

## 4. Read the summary

Tell them the numbers in plain words, not the raw line: how many folders and files it found, how much space they take up, how many sets of duplicate files turned up, and how many old files are sitting in Downloads.

If a very large folder made the scan stop early, say so plainly, and offer to add smaller folders in its place rather than that one.

## 5. Walk them through the Files map

Open **http://localhost:4747/skill-map/** and walk them through the Files side, in 5 short sentences:

> Top left, the Skills | Files switch flips between the two maps. Click a folder to go inside it. Click the one in the middle to go back out. Click a file to see what it is, where it lives, its size and when it last changed. The Clean-up page shows what's worth tidying, biggest first.

Tick this step in `setup/progress.md`.
