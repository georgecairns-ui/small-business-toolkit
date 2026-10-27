# Skill and Folder Map: standing instructions for Claude

This folder is the skill and folder map app inside Skill and Folder Map OS. You (Claude) and the app share 3 files: `data/skillmap.json` for the Skills side, `data/filemap.json` for the Files side, and `data/tidy.json` for the tidy-ups the person has asked for. The person sees it as one piece of software with a Skills | Files switch in the top bar. On the Skills side: Map (the network, Claude in the middle, a hub per area, a dot per skill), All skills (the same skills as a table), Overview (counts and the last scan), Gaps (every business area, with 3 ideas where there's no skill yet) and Review (your suggestions, plus what the scan spotted itself). On the Files side: Map (the same network look, a folder in the middle, click one to go inside it), All files (a sortable table, with a Files/Folders switch), Overview (counts, what it's made of, the biggest folders and files), Clean-up (what needs tidying, biggest first) and Review (your suggestions, plus the duplicate sets). Preferences is shared by both. Read this file every time you work with either map.

The app runs at **http://localhost:4747/skill-map/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-my-toolkit`). The helper reads and saves both data files, so you edit them directly as described below; the app picks up your changes within a few seconds.

The 6 jobs live as skills in `.claude/skills/`. Skills side: `scan-my-skills` (runs the scan), `group-my-skills` (sorts skills into areas) and `review-my-skills` (suggests tidy-ups). Files side: `scan-my-folders` (runs the folder scan) and `review-my-folders` (suggests what to tidy). Both sides: `tidy-up` (carries out a Fix button the person pressed). This file is the reference for the data they read and write.

## The one rule: nothing changes until the person presses a Fix button

It finds every skill and command Claude can use, and every folder and file in the folders the person has chosen, draws them as maps, and suggests what's worth tidying up. Scanning, grouping and reviewing only read. A skill, a file or a folder changes only when the person presses a Fix button and confirms in the plain-English box, and then only through the `tidy-up` job, which never deletes anything (every change is a move or a rename) and can be undone. Nothing is ever sent anywhere, and nothing leaves their computer. Outside a tidy-up, the only things Claude writes are the 3 data files, `context/`, `files/` and `setup/progress.md`.

- **The scans only read.** `apps/skill-map/scan/scan.js` (or `scan.py`) reads `~/.claude/skills`, `~/.claude/commands`, any extra folders added in Preferences, this kit's own `.claude/skills`, every installed plugin's skills and commands, and the skill names and dates in `~/.claude/projects` for use counts. Never what anyone typed. It writes only `data/skillmap.json`. `apps/skill-map/scan/scan-files.js` (or `scan-files.py`) reads the folders listed in `settings.roots` of `data/filemap.json` (Documents, Desktop and Downloads by default): names, sizes, kinds and last-changed dates only. It never opens a file or reads what's inside one, never follows a symlink, and skips hidden items, `node_modules`, a home folder's Library, and the inside of app bundles. It writes only `data/filemap.json`.
- **Scan, group and review only suggest.** `group-my-skills` sets a skill's area; `review-my-skills` and `review-my-folders` add to `recommendations`. None of them ever edits, renames, moves or deletes another skill's own files, or a person's own file or folder. The person decides everything else: approving an area, marking a suggestion Done or Not now, or pressing a Fix button.
- **Fixing is the one exception, and only on a button press.** The Clean-up and Review pages have Fix buttons (folders: "Move them out of the way", "Keep one copy of each", "Clear them away", "Give them clearer names", "Sort them out"; skills: "Keep one copy", "Retire them"). Pressing one shows a box saying exactly what will happen; the person presses the button in it, and the app queues the moves in `data/tidy.json` and asks Claude to run `tidy-up`. See "Tidying up: `data/tidy.json` and the script" below.
- **Never type a number by hand.** Every count, size and date (uses, totals, how many places) comes from a scan. Claude never invents or edits one.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your skill map", "your folder map", "the scan", "a skill", "a file on your computer", "a connection". Never say agent, repo, repository, artifact, JSON, schema, MCP or API.
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers.

## The data file: `data/skillmap.json`

```json
{
  "version": 1,
  "settings": { "yourName": "Sam", "businessName": "Fern & Finch", "setUp": true, "areasApproved": true, "extraFolders": [], "usageDays": 90 },
  "scan": { "at": "2026-10-17T09:00:00.000Z", "by": "scan.js", "sources": [{ "label": "...", "count": 12 }], "warnings": [], "usage": { "files": 40, "events": 310, "note": "..." }, "changes": { "added": 3, "removed": [] } },
  "areas": [ { "key": "sales", "label": "Sales", "blurb": "...", "ideas": ["...", "...", "..."] } ],
  "nodes": [ { "id": "...", "name": "who-to-chase", "kind": "skill", "origin": "own", "source": "My skills", "path": "...", "description": "...", "area": "sales", "areaBy": "claude", "tags": [], "uses": { "total": 8, "last90": 3, "lastUsed": "...", "byMonth": {} } } ],
  "edges": [ { "s": "<id>", "t": "<id>", "type": "ref" } ],
  "tags": [ { "id": "t-...", "label": "..." } ],
  "recommendations": [ { "id": "r-...", "kind": "review", "title": "...", "why": "...", "nodeIds": ["..."], "status": "open", "createdAt": "..." } ]
}
```

### Rules for editing it safely

- **`settings`, `tags` and manual nodes** (`origin: "manual"`) belong to the app and the person. Claude only changes `settings.setUp` and `settings.areasApproved` when a setup step or the app's own button says to.
- **`scan`, `nodes` (other than `area`/`areaBy`), `edges`**: only the scan writes these. Claude never hand-edits a count, a use, or a node's description.
- **`area` and `areaBy`**: only Claude sets these, and only `areaBy: "claude"`. Never overwrite a node whose `areaBy` is already `"you"`. Never add, rename or remove an entry in `areas`.
- **`recommendations`**: only Claude writes these, as suggestions. Never more than 8 new ones in a single run, never a duplicate of one that's `open` or `skipped`.
- Read the file immediately before you change it, and write the whole file back in one go. Keep it valid JSON, 2-space indented, and read it back to check it parses.
- Never touch `skillmap.backup.json`; the scan writes it before every save.

## The data file: `data/filemap.json`

```json
{
  "version": 1,
  "settings": { "roots": ["~/Documents", "~/Desktop", "~/Downloads"], "setUp": true, "ignore": [] },
  "scan": { "at": "2026-10-17T09:00:00.000Z", "by": "scan-files.js", "roots": ["..."], "warnings": [], "totals": { "folders": 612, "files": 12408, "bytes": 44040192000 }, "truncated": false, "previous": { "folders": 600, "files": 12200 } },
  "folders": [ { "id": "f-...", "path": "...", "name": "...", "parent": "f-...", "depth": 2, "root": "...", "direct": { "files": 4, "bytes": 1200 }, "total": { "files": 40, "bytes": 900000 }, "newest": "...", "oldest": "...", "types": {}, "subfolders": 3, "deeper": false } ],
  "files": [ { "id": "d-...", "folder": "f-...", "name": "...", "ext": "pdf", "type": "document", "bytes": 120000, "modified": "..." } ],
  "findings": { "dups": { "groups": [] }, "big": [], "stale": [], "oldDownloads": [], "installers": [], "messy": [], "emptyFolders": [], "looseFolders": [], "deepFolders": [] },
  "recommendations": [ { "id": "r-...", "kind": "keep-one", "title": "...", "why": "...", "fileIds": [], "folderIds": [], "status": "open", "createdAt": "..." } ]
}
```

### Rules for editing it safely

- **`settings.roots`**: belongs to the person. Claude changes it only when they ask to add or take out a folder, and only that key, during setup or in Preferences.
- **`settings.setUp` and `settings.ignore`**: only changed when a setup step or the app's own button says to.
- **`scan`, `folders`, `files`**: only the scan writes these. Claude never hand-edits a count, a size or a date.
- **`findings`**: only the scan writes these; it decides what counts as a duplicate, a big file or a messy name. Claude never works one out itself.
- **`recommendations`**: only Claude writes these, as suggestions. Never more than 8 new ones in a single run, never a duplicate of one that's `open` or `skipped`. Use `id`s exactly as they appear in `folders` and `files`; never make one up or type a size or count that isn't in the scan.
- Read the file immediately before you change it, and write the whole file back in one go. Keep it valid JSON, 2-space indented, and read it back to check it parses.

## The pages

- **Map**: the network. Group by "What it's for" (business areas) or "Where it's from" (my skills, toolkit, each plugin). Click a dot or a hub for a side panel.
- **All skills**: a sortable, filterable table of the same skills.
- **Overview**: counts, most used, use by month, where skills come from, the last scan.
- **Gaps**: every area as a card: its skills, or "Nothing here yet" with 3 ideas. Ends with a "Want these built for you?" link to getaipowers.com.
- **Review**: Claude's suggestions, plus what the scan spotted itself (duplicate names, unused skills). The person marks each Done or Not now, or presses Keep one copy or Retire them. Claude never acts on its own suggestion; only the person's button press does. A "Tidied so far" list shows each tidy-up with an Undo button.
- **Files Map**: the same network look, a folder in the middle with its files and subfolders around it. Click one to go inside it; click the middle to go back out; breadcrumbs and an Up button do the same.
- **All files**: a sortable table of every folder and file, with a Files/Folders switch.
- **Files Overview**: counts, what it's made of, the biggest folders and files, the last scan.
- **Clean-up**: what the scan found worth tidying, biggest first, each with See them (the table), Find on the map and a Fix button. A "Tidied so far" list shows each tidy-up with an Undo button.
- **Files Review**: Claude's suggestions, plus the duplicate sets the scan found. The person marks each Done or Not now, or presses a Fix button; Claude never acts on its own suggestion.
- **Preferences**: name, business, extra folders to scan (both sides), renaming or adding areas.

## What the app can and cannot do

It can show, sort, filter and group what a scan found, let the person add a skill by hand (for claude.ai or Cowork, which the scan can't see), tag skills, approve or change an area, act on a suggestion, and browse their folders down to any file. It cannot run a skill, open a skill's own file or the person's own file, delete anything, or reach anywhere beyond this computer. It never moves or renames anything itself: a Fix button only queues the moves in `data/tidy.json`. Scanning, grouping, suggesting and tidying are Claude's jobs (`claude-jobs.json`), asked for with the Scan again, Group, Review and Fix buttons; everything else the app does by itself.

## Tidying up: `data/tidy.json` and the script

`apps/skill-map/data/tidy.json` is the third data file. It ships empty (`{"version":1,"actions":[]}`) and holds every tidy-up: queued, done and undone. The app writes a queued action when the person confirms a Fix button; Claude runs the `tidy-up` job (`.claude/skills/tidy-up/SKILL.md`), which runs `apps/skill-map/tidy/tidy.js` (or `tidy.py` if there is no Node). The script carries out the moves and records what it did so it can be undone.

- **Never delete.** Every change is a move or a rename.
- **The owner approves each run.** Running the tidy script is not pre-approved in `.claude/settings.json`, so Claude Code asks before every run. If the helper's own Claude is told to tidy up, it can't be asked and stops with the moves still queued; tell the person plainly, and ask them to open Claude in this folder and say "do the tidy-up", then approve the command when it asks.
- **Only the chosen places.** Folder fixes touch only the folders chosen in Preferences; skill fixes touch only the person's own skill folders, never a skill from a plugin or from this toolkit.
- **Where things go.** Files go into a folder called "Tidied by Claude" inside the same chosen folder, in a dated sub-folder. A retired skill goes into a folder next to its own folder with "-archive" on the end, and only a skill sitting directly in a skills folder can be retired. A rename stays in its own folder; a sort goes into a sub-folder of the folder it is in.
- **Careful by design.** It never overwrites (it adds " (2)"), never opens a file, skips a file whose size changed since the scan, and never follows a shortcut out of a chosen folder.
- **Two fixes need Claude's judgement**: clearer names for untidy files, and sorting a crowded folder into sub-folders. Claude works the moves out from file names only, writes them into the action, and the script then does them.
- **Undo** is another queued action. The folder scan skips folders called "Tidied by Claude".
- Never edit `tidy.json` by hand, apart from adding the moves a judgement fix asks for.

## If something goes wrong

- The app says a map file has a mistake in it: it isn't valid JSON. Fix the skills map using `data/skillmap.backup.json` as reference; for the folder map, fix it by hand or run the scan again.
- A skill looks like it hasn't been used, but the person knows they use it: it's probably only used in Cowork or on claude.ai, which the scan can't see. Say so.
- A very large folder made the folder scan stop early: say so plainly, and offer to add smaller folders in its place.
- "Scan again" does nothing, on either side: Claude Code may not be installed where the helper can find it. Tell them to ask Claude to run it instead.
