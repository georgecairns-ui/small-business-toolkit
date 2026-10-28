---
name: get-updates
description: Bring this folder up to the latest version of the tools installed in it, keeping everything that is theirs: records, notes, documents, their own skills, their brand and every change they have made. Use when someone says "get the latest version", "any updates?", "update the app", "update my tools" or "Get AI Powers says there's a new version".
---

# Get updates

This folder is a plain copy. It is not linked to the version online, so nothing in it changes unless they ask. When they ask, you fetch the latest version, work out what is new, show them, and apply it once they say yes. Everything that is theirs stays exactly as it is.

Never use git in their folder. If it has a hidden `.git` folder, stop and say: "This folder is set up for someone building the kit, so it is updated a different way." Do nothing else.

Talk to them as the rest of this folder does: plain British English, short sentences, digits, no em dashes. Never say agent, repo, repository, artifact, JSON, schema, API or MCP.

## 1. What is in this folder

- `apps/installed.json`: the tools in this folder, in the order they were added. The first is the one they installed. Its own files (`CLAUDE.md`, `START-HERE.md`, `README.md`) are the folder's root files.
- `apps/shared/catalogue.json`: each tool's `repository` (its folder name online).
- `toolkit.json`: `version`, `sharedVersion` and `id`. If `id` is `small-business-toolkit`, this folder holds the whole toolkit as one piece: its `repository` is `small-business-toolkit` and it is fetched once, not tool by tool (step 2).
- `apps/shared/VERSION`: the shared version number.
- `setup/as-installed/<repository>.tar.gz`: the exact copy of each download as it was installed or last updated. It is how you tell their changes from the kit's. A download with none (copied another way, or attached before these were saved) is compared without it: see step 4.

## 2. Fetch the latest, outside this folder

Make **one** temporary folder outside their workspace, once, and fetch every tool into it. Say once what you are about to download, and ask them to allow it. Each command runs on its own, so run this first, note the path it prints, and start every later command with `T=` that same path (a new folder per tool would split the download):

- Mac: `T="$(mktemp -d)" || exit 1; echo "$T"`
- Windows (PowerShell): `$T = Join-Path $env:TEMP ("update-" + (Get-Random)); New-Item -ItemType Directory -Force $T | Out-Null; $T`

**Their GitHub sign-in.** Every tool is private: Get AI Powers gives access by inviting the person's GitHub account, and every download uses their own sign-in. Check it first with `gh auth status`. If they are not signed in, give them the one line `gh auth login -h github.com -p https -w`, say it opens GitHub in their browser to approve this computer, and wait. If `gh` is not installed, help them install it (Mac: `brew install gh`, or the installer from cli.github.com; Windows: `winget install --id GitHub.cli -e`, then open a new PowerShell window).

**The downloads.** For each tool in `apps/installed.json`, find its `repository` in the catalogue (for the whole toolkit, `small-business-toolkit`, once), and run, with `<T>` the path you noted:

- Mac: `T="<T>"; mkdir -p "$T/new/<repository>" && curl -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$T/new/<repository>.tar.gz" https://api.github.com/repos/georgecairns-ui/<repository>/tarball/main && tar -xzf "$T/new/<repository>.tar.gz" --strip-components 1 -C "$T/new/<repository>"`
- Windows (PowerShell): `$T = "<T>"; New-Item -ItemType Directory -Force "$T\new\<repository>" | Out-Null; curl.exe -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$T\new\<repository>.tar.gz" https://api.github.com/repos/georgecairns-ui/<repository>/tarball/main; if ($LASTEXITCODE -eq 0) { tar -xzf "$T\new\<repository>.tar.gz" --strip-components 1 -C "$T\new\<repository>" }`

`-f` makes curl stop with an error on a failed download instead of saving the error page as if it were the kit. If a download fails, say so in 1 sentence and stop:

- `error: 404`: their GitHub account cannot see that tool. Either they have not accepted the invitation from Get AI Powers yet, or they are signed in to a different GitHub account (`gh auth status` names it). Ask them to accept the invitation from the email GitHub sent them (it is also at github.com/notifications), then try again. If they never had an invitation, tell them to ask Get AI Powers.
- `error: 401`: the sign-in has expired. Ask them to sign in again with `gh auth login -h github.com -p https -w`.

Do not try another way in.

**The old copies.** Unpack each `setup/as-installed/*.tar.gz` the same way into `$T/old/<repository>` (`mkdir -p` it, then `tar -xzf <the file> --strip-components 1 -C <the folder>`).

## 3. Put together the new kit, and the old one

- **The whole toolkit, or a folder with 1 tool:** the download is the kit. Nothing to assemble.
- **A folder with more than 1 tool** is built the way `ATTACHING.md` describes, so assemble it the same way:
  1. **Shared parts** (`apps/shared/`, `apps/server/`, `apps/home/`, `ATTACHING.md`, the shared skills, `setup/scripts/`, `setup/connections/README.md`, `docs/`): from whichever download has the highest number in `apps/shared/VERSION`.
  2. **The root files and setup steps** (`CLAUDE.md`, `START-HERE.md`, `README.md`, `LICENSE`, `toolkit.json`, `setup/0*.md`): from the first tool in `apps/installed.json`.
  3. **Each tool's own parts**, from that tool: its `apps/<tool>/` folder, the skills and setup steps named in its `toolkit.json`, and its connection guides.

Leave out of both: `maintainers/`, `.gitignore`, `dist/`. Do the same with the old copies, so you have an old kit and a new kit with the same paths.

If the new kit is the same as the old one, file for file, tell them "You're on the latest version", clean up the temporary folder and stop.

## 4. Take a fingerprint of their data, then sort every file

**Before you change anything**, take a SHA-256 of every data file, so you can prove afterwards that none of it moved. A data file is every file inside any `apps/<tool>/data/` folder (including `media/`) and `apps/home/data/`. Save the list outside their folder, in `$T`:

- Mac: `cd "<their folder>" && find apps -path "*/data/*" -type f ! -name "*.saving" -exec shasum -a 256 {} + | sort -k 2 > "$T/data-before.txt"`
- Windows (PowerShell): `cd "<their folder>"; Get-ChildItem apps -Recurse -File | Where-Object { $_.FullName -match '\\data\\' -and $_.Extension -ne '.saving' } | Sort-Object FullName | ForEach-Object { "{0}  {1}" -f (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLower(), $_.FullName.Substring((Get-Location).Path.Length + 1) } | Set-Content "$T\data-before.txt"`

**Theirs. Never replaced, never changed by an update:**
- `context/` (every file except `README.md`), `files/` (every file except the READMEs), `setup/progress.md`, `skills-to-upload/`
- `setup/as-installed/` (only step 7 changes it)
- every tool's `data/` folder (their records, photos and videos), and `apps/home/data/`
- `.claude/settings.local.json`
- any skill folder in `.claude/skills/` that is in neither the new kit nor the old one: those are the skills built for this business
- any skill folder of theirs with the same name as a skill in the new kit that was not in the old kit: it is theirs too (see the table)

For every other file in the new kit, compare 3 versions with `shasum -a 256` on a Mac or `Get-FileHash` on Windows: **old** (as installed), **now** (in their folder) and **new**.

| Old, now and new | What to do |
|---|---|
| Now is the same as new | Nothing |
| In the old kit, missing from their folder (they deleted it), and new is the same as old | Nothing |
| In the old kit, missing from their folder (they deleted it), and new differs from old | **Leave it deleted.** Mention it in step 5, so they can ask for it back |
| A skill folder in the new kit and not in the old one, and they already have a skill folder of that name | **Theirs. Keep it, untouched.** Say so in step 5 and ask whether they also want the kit's one. Only with their yes, add the kit's beside it as `<name>-kit` (change its `name:` line to match, and add a row to `.claude/skills/README.md`) |
| Not in their folder, and not in the old kit | **Add it** |
| Now is the same as old (they have not changed it) | **Replace it** with the new one |
| New is the same as old (only they changed it) | **Keep theirs** |
| All 3 differ, and it is a binary file (an image, a font, a logo, a PDF) | **Keep theirs.** It cannot be merged. List it in step 5 |
| All 3 differ | **Merge it**, below |
| There is no old copy, and now differs from new | **Merge it**. Where you cannot tell their change from the kit's, keep theirs and list it in step 5 |
| In the old kit, not in the new one | The kit dropped it. If now is the same as old, move it to the backup folder from step 6. If they changed it, leave it and mention it |

**Merging.** Start from the new file and put their changes back in. The usual ones:
- `apps/shared/theme.css` with a `/* Brand: ... */` line: keep the brand line, their colour and font values (in the light set and both dark sets) and their `@font-face` lines. Take everything else from the new file. Their fonts in `apps/shared/fonts/` stay.
- Each tool's `index.html` with their logo (`brand-logo`, `sidebar__brand--wordmark`, `sidebar__brand--chip`): keep their logo lines.
- `apps/shared/fonts/OFL.txt`: keep the lines they added for their fonts.
- `apps/shared/catalogue.json`: keep `showMoreTools` if they switched it off.
- `apps/installed.json`: keep their list of tools. Take any new fields for each tool from the new kit.
- `.claude/settings.json`: keep every entry they have. Add the new kit's entries they do not have yet. Take out an entry only when the old kit had it and the new kit does not. Never touch `deny` or `ask`.
- `CLAUDE.md`: take the new text, then put back their `Setup: complete on <date>` line, the "Attached tools" sections, and anything else about this business.
- `.claude/skills/README.md`: the new list, plus any rows they added for their own skills.
- A tool's blank data file is theirs. If the new kit's blank one has new fields, read that tool's `CLAUDE.md` for what they mean and add only those fields, with their starting values. Never remove or change what is there.

If you cannot tell what a change of theirs is for, keep their version and list it in step 5.

**No saved download.** Without `setup/as-installed/<repository>.tar.gz` there is no old copy, so you cannot tell their changes from the kit's. The first update then keeps every changed file of theirs and does little: it adds what is new and replaces only files that are identical to the new ones. Say that plainly in step 5. The update still saves a download in step 7, so the next one works properly.

## 5. Show them, then wait for a yes

Tell them in 1 short message:

- What is new, in their terms (look at what changed in the files: a new page, a fix, a new skill). Not a list of file names.
- "I'll keep everything that's yours: your records, notes, documents, your own skills and your brand." Then name each merge in 1 line, for example "Your colours and logo stay. The new layout around them comes in."
- Anything you will leave alone because you could not safely merge it.
- That you will save a copy of every file you change first, in `files/99-archive/`.
- If there is no saved download: "I don't have a copy of what you installed, so I can't tell your changes from ours. This first update keeps every file you've changed and does little. I'll save a copy now, so the next one does the whole job."
- That Claude Code will ask them to approve changes to the app's own files, because only their notes, records and files are pre-approved: "Say yes to each one, it is me updating the app."
- That you will stop the app for a few minutes, and that the hourly check-in must not run meanwhile: ask them not to start one, and to pause it in the Claude desktop app's scheduled tasks if one is set up. Say you will tell them when it is safe again.

Then ask: "Shall I update it?" Do nothing until they say yes.

## 6. Stop the helper, back up, then apply

**First, stop the helper**, so nothing writes to their data while you work, and say again that the hourly check-in must not run until you finish.

- If the app is set to start with the computer, switch that off for now, or it restarts at once: `bash setup/scripts/autostart-mac.sh remove` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1 -Remove` (Windows). Note that you did, to put it back in 4 below.
- Then make sure it is stopped: `pkill -f "apps/server/server\.(js|py)"` (Mac), or in PowerShell `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*apps\server\server.*" } | ForEach-Object { Stop-Process -Id $_.ProcessId }`.
- Take the fingerprint of their data again, the same way as in step 4, into `$T/data-start.txt`. If it differs from `data-before.txt`, they used the app while you were waiting for their yes: that is their work, so use `data-start.txt` from here.

Then:

1. Copy every file you will replace, merge or move into `files/99-archive/before-update-<YYYY-MM-DD>/`, keeping its path. Never delete anything.
2. Add, replace and merge as sorted in step 4.
3. Check:
   - every data file you touched still opens (`python3 -m json.tool <file>`, or `Get-Content <file> | ConvertFrom-Json` on Windows)
   - no em dash came in from a merge
   - their data is exactly what it was: take the fingerprint a third time into `$T/data-after.txt` and compare it with `data-start.txt` (`diff`, or `Compare-Object` on Windows). Any difference is a failure
4. Start the helper again with the `open-my-toolkit` skill (`.claude/skills/open-my-toolkit`: run its start script, and put autostart back with its `install` if you switched it off), open the link it gives, and check every tool in the sidebar opens, in light and dark. If they have a brand, check it still shows. Then tell them the hourly check-in is safe again.

If anything fails, put the backed-up files back, start the helper again so their app works, tell them what happened in 1 sentence, and stop.

## 7. Finish

1. Replace each `setup/as-installed/<repository>.tar.gz` with the one you just downloaded, so next time compares against this version. A download that had none gets one now.
2. Add a line to `setup/progress.md`: `Updated on <date> to shared version <N>`, then each merged file and anything left alone, in a few words.
3. Delete the temporary folder from step 2. It is outside their workspace and holds only downloads.
4. Tell them in 2 or 3 lines what is new and that everything of theirs is as it was. A new permission takes effect when Claude is next started in this folder: say so if you added one.
