# Privacy and safety

Plain answers to the questions people ask before running the scan.

## Where is my information kept?

In this folder on your computer. Skill and Folder Map OS has no account, no server and no database. Your skills map is one file, `apps/skill-map/data/skillmap.json`, and your folder map is another, `apps/skill-map/data/filemap.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your map and notes too, so keep it in a private part of your drive.

## What does the scan actually read?

Only places where a skill or command could live:

- `~/.claude/skills` and `~/.claude/commands`, your own saved know-how
- any extra folders you add in Preferences
- this kit's own `.claude/skills`
- every plugin you've installed (found through `~/.claude/plugins/installed_plugins.json`), and that plugin's own skills and commands
- your Claude Code history in `~/.claude/projects`, to work out how often a skill has been used. It reads only the name of the skill and the date it was used, never anything you typed

That's everything. It doesn't read your email, calendar, documents or any file outside those places.

## What does it store about each skill?

A skill's name, its description (from its own `SKILL.md`, usually a sentence or two), where it lives, which business area it's in, a tag or two if you've added any, and how many times it's been used and when. It never stores what you typed when you used a skill, and never stores the body of a skill beyond its own description.

## What does the folder scan actually read?

Only the folders you've chosen to map (Documents, Desktop and Downloads to start, or whatever you set in Preferences). For every folder and file inside them, it reads the name, the size, the kind (document, image, spreadsheet and so on, worked out from the file extension) and the date it was last changed. That's all.

It never opens a file and never reads what's inside one. It never reads hidden items (names starting with a dot), `node_modules`, the Library folder in your home folder, or the inside of an app, so a program on your computer shows up as one item, not everything inside it. It never follows a shortcut (a symlink) out of a chosen folder, and it never looks at anything outside the folders you've chosen. Nothing is deleted, moved, renamed or changed.

## What does it store about each folder and file?

The same as it reads: names, sizes, kinds and dates, plus a count of how many files of each kind are in each folder. For very large folders, it keeps the biggest and newest files in full and keeps an exact total for everything else, so your overall counts and sizes are always accurate even when the saved list is not every single file.

## Does it ever use anyone's information in Cowork or claude.ai?

No, and it can't see it either. A skill used only in Cowork or on claude.ai doesn't show up in Claude Code's history, so the scan has no way to count it. If a skill you use often looks unused on the map, that's usually why: say so plainly rather than let it mislead you. "Add a skill" in the app's top bar lets you add one by hand so it shows on the map anyway.

## Does Skill and Folder Map OS change any of my skills, files or folders?

Not on its own. Scanning and reviewing only read: Claude looks at names, sizes and dates and never opens a file. When Claude thinks something should change (two skills sharing a name, one worth retiring, a set of duplicate files, an old file worth archiving), it adds a suggestion and a Fix button. Nothing changes until you press the button and confirm in the box that tells you exactly what will happen.

When you do press one, Claude only moves or renames: it never deletes anything. Files go into a folder called "Tidied by Claude" inside the same folder you chose, and retired skills go into an archive folder next to their own. It never overwrites anything, never touches a skill that came from a plugin or from this toolkit, and never leaves the folders you chose. Every tidy-up is listed under **Tidied so far** with an Undo button.

## Does it send anything anywhere?

No. Both scans run entirely on your computer and write to files also on your computer. Nothing is uploaded, and there's nothing for Get AI Powers to see.

## What about passwords and keys?

Skill and Folder Map OS doesn't need a sign-in to anything: it only works with files already on your computer. It never asks for a password or a key, and none should ever go into this folder or into the chat. Other tools in the toolkit connect apps through Claude's Connectors, signed in on each app's own page, with no keys; an app with no Claude connector is read from a CSV or PDF export you drop in the files folder.

## What is the helper?

Your app runs from a small program in your Small Business Toolkit folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your map files, keeping a backup before every save. When you press Scan, Group or Review in the app, on either side, it can start Claude Code on your computer to do that one job, and only when the app itself asks.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Skill and Folder Map OS, can't see your folder or your maps.

## The approve button

Nothing Claude suggests on the Review page changes anything until you mark it, on either side of the app. Mark something Not now and it stays closed; mark it Done once you've acted on it yourself. That's deliberate: you stay in charge of your own skills, files and folders.
