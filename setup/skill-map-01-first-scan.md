# Step 1 of 5: the first scan

Goal: find every skill Claude can use on their computer and let them see the map for the first time.

## 1. Tell them what's about to happen

One plain sentence before you start:

> I'm going to look through your computer for every skill and command Claude can use, and build you a map of them. Nothing is changed or sent; I'm only reading. Tidying only happens later, if you press a Fix button.

## 2. Run the scan

- `node apps/skill-map/scan/scan.js`
- No Node? `python3 apps/skill-map/scan/scan.py`
- Neither installed? Say so plainly, then help them install Node:
  1. Go to **nodejs.org** in your browser.
  2. Click the big green button (the LTS version, it says "Recommended for most users").
  3. Open the file once it's downloaded and click Continue through the installer, using the defaults.
  4. Come back here and say "done".

  Then run the scan again.

## 3. Read the summary

The scan prints one line plus a few short ones under it. Tell them the numbers in plain words, not the raw line: how many skills and commands it found, how many places it looked, how many have been used in the last 90 days, how many names turned up twice, and any notes it printed (for example, if it couldn't find any Claude Code history).

If the scan found no Claude Code history, say so plainly: use counts will show as 0 for now, and nothing will be marked as unused until there's some history to go on.

## 4. Start the app and give them the link

Follow `.claude/skills/open-task-list` to start the app, then give them this link: **http://localhost:4747/skill-map/**

## 5. Walk them through the Map

In 4 short sentences:

> Claude sits in the middle. Each hub around it is a group of skills. The bigger the dot, the more that skill has been used in the last 90 days. A hollow dot means it hasn't been used in that time.

## 6. Ask about other places skills live

Ask once, in one message:

> Do any of your skills live somewhere else, a shared team folder, or only on claude.ai or in Cowork?

- A team folder or another folder on this computer: add it to `settings.extraFolders` in `apps/skill-map/data/skillmap.json`, then scan again.
- claude.ai or Cowork: the scan can't see those. Tell them to use the **Add a skill** button in the app to add each one by hand.

Tick this step in `setup/progress.md`. Next, step 2 maps their folders: follow `setup/skill-map-03-map-your-folders.md`.
