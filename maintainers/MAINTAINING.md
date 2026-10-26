# Maintaining Small Business Toolkit OS

For George, Joey and anyone changing this kit for everyone. If you're a client using it, you don't need this folder.

## What this repository is

The 7 tools of the small business toolkit, already attached to each other, plus a Toolkit section of the app and one merged setup. It's **private**: Get AI Powers invites each client's GitHub account. The 7 tools stay public, each in its own repository, as free lead magnets.

**The kit is built, not written by hand.** Everything at the root of this repository is made by `maintainers/build.py` from:

1. **The 7 tools' repositories**, exactly as they are on GitHub's `main` (`sources.json` says where each one is on George's computer). Task List OS is the host; the other 6 are attached to it the way `ATTACHING.md` describes.
2. **`maintainers/overlay/`**: the files written for this kit alone. Plain files replace or add (`START-HERE.md`, `README.md`, `LICENSE`, the 4 `setup/toolkit-*.md` steps, the merged accounts guides, `apps/toolkit/`, the 3 new skills). Three special endings change a built file instead:
   - `<file>.append`: added to the end of the built file.
   - `<file>.patch-json`: merged into the built JSON file (`"allow+"` and `"tools+"` add to a list).
   - `<file>.replace-json`: a list of `[old, new]`; each `old` must appear exactly once, or the build stops. Used where a tool's own words don't fit here (Task List OS's `CLAUDE.md`, the privacy page).

So: **a change to a tool goes in that tool's repository**, gets merged there, then this kit is rebuilt. Only change the overlay for something that's about the whole toolkit. Never edit the built files at the root directly: the next build overwrites them.

## What the build does

`python3 maintainers/build.py`:

1. Fetches each tool and takes `origin/main` (`git archive`), into a temporary folder.
2. Runs each tool's own `maintainers/make-release.sh`. If any tool fails its own check, the build stops.
3. Checks the shared parts (`apps/server`, `apps/shared`, `apps/home`, `ATTACHING.md`) are identical in all 7. If not, bring the tools level first.
4. Attaches the 6 tools to Task List OS: app folders, skills, setup steps, connection guides, notes templates and files folders (the host's copy wins when both have a file; a tool's own differing `docs/` page is kept under `docs/<tool>/`), `apps/installed.json`, the permissions `ATTACHING.md` step 7 allows (it prints anything it left out), and each tool's `ATTACH-CLAUDE.md` in `CLAUDE.md`.
5. Applies the overlay, then makes the notes templates say "during setup" instead of a tool's own step numbers, and makes every "your Pipeline OS folder" (and so on) say "your Small Business Toolkit OS folder".
6. Replaces everything at the root except `maintainers/`, `.git` and `dist/`, and writes `maintainers/built-from.json` with the commit of each tool it used.

`--from <tool>=<folder>` builds one tool from a local folder instead (to try a change before it's merged). `check.py` refuses to pass a build made that way.

## Releasing

1. `git fetch` in each tool's repository is done by the build. Make sure any tool change you want is merged on GitHub first.
2. `python3 maintainers/build.py`, then `python3 maintainers/check.py`. Both must pass.
3. Test it in the browser: `node maintainers/test/livecheck.mjs <folder holding a copy of the kit>` from a terminal (it starts the helper, opens every page of every tool in headless Chrome and reports errors).
4. `git diff --stat` to see what changed since the last release, start a branch (`git switch -c claude/<name> origin/main`), commit, push it and open a pull request. George merges. Never push to `main` directly.

## Clients

- Invite a client: GitHub, this repository, Settings, Collaborators, Add people, their GitHub username, **Read** access. They accept from GitHub's email.
- Take access away: the same page, Remove.
- A client's copy never updates by itself. To give them a new version, on a call: "Fetch the latest Small Business Toolkit OS and update my copy, keeping my data, notes and settings": their Claude follows the same rules as attaching (`ATTACHING.md` steps 3 and 4: never overwrite `context/`, `files/`, `setup/progress.md`, any data file or their `theme.css`).

## Things to check

- **Licence:** `LICENSE` is the toolkit's licence adapted for a private client kit (no "for free", no passing it on). It has not been reviewed by a solicitor.
- **Shared version numbers:** 4 tools' `toolkit.json` still say `"sharedVersion": "6"` while their `apps/shared/VERSION` (identical in all 7) says 7. Harmless today; worth levelling in the tools.
- **A real end-to-end setup** with live connections hasn't been run on this kit yet. The release checks and the browser check prove the files and the app; only a real `/setup` proves the questions.
