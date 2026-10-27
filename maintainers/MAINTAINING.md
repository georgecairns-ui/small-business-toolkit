# Maintaining Small Business Toolkit

For George, Joey and anyone changing this kit for everyone. If you're a client using it, you don't need this folder.

## What this repository is

The 7 tools of the small business toolkit, already attached to each other, plus a Toolkit section of the app and one merged setup. It's **private**: Get AI Powers invites each client's GitHub account. The 7 tools stay public, each in its own repository, as free lead magnets.

**The kit is built, not written by hand.** Everything at the root of this repository is made by `maintainers/build.py` from:

1. **The 7 tools' repositories**, exactly as they are on GitHub's `main` (`sources.json` says where each one is on George's computer). The build copies Task List OS's files first as its base and attaches the other 6 the way `ATTACHING.md` describes. In the product Task List OS is 1 of the 7 tools and nothing more: never write "host" in anything a client or their Claude reads (`check.py` fails on it).
2. **`maintainers/overlay/`**: the files written for this kit alone. Plain files replace or add (`START-HERE.md`, `README.md`, `LICENSE`, the 4 `setup/toolkit-*.md` steps, the merged accounts guides, `apps/toolkit/`, the 3 new skills). Three special endings change a built file instead:
   - `<file>.append`: added to the end of the built file.
   - `<file>.patch-json`: merged into the built JSON file (`"allow+"` and `"tools+"` add to a list).
   - `<file>.replace-json`: a list of `[old, new]`; each `old` must appear exactly once, or the build stops. Used where a tool's own words don't fit here (Task List OS's `CLAUDE.md`, the privacy page).

So: **a change to a tool goes in that tool's repository**, gets merged there, then this kit is rebuilt. Only change the overlay for something that's about the whole toolkit. Never edit the built files at the root directly: the next build overwrites them.

## What the build does

`python3 maintainers/build.py`:

1. Fetches each tool and takes `origin/main` (`git archive`), into a temporary folder.
2. Runs each tool's own `maintainers/make-release.sh`. If any tool fails its own check, the build stops.
3. Checks the shared parts are identical wherever a tool ships them: `apps/server`, `apps/shared`, `apps/home`, `ATTACHING.md`, the shared `setup/scripts/` scripts (`start-app`, `autostart-*`, `save-key`), the shared skills `open-the-app` and `get-updates`, and the shared connection guides. A tool that doesn't ship one of these (Money View has no call-recording guides) is skipped for it, not failed. If a part differs, bring the tools level first. The full list is `SHARED` in `build.py`.
4. Attaches the 6 other tools: app folders, skills, setup steps, connection guides, notes templates and files folders, `apps/installed.json`, the permissions `ATTACHING.md` step 7 allows (it prints anything it left out), and each tool's `ATTACH-CLAUDE.md` in `CLAUDE.md` (only the text after its `---` line, not the maintainer preamble). The first copy of a file wins when both have one. A tool's own differing `docs/` page is kept under `docs/<tool>/`. Any other file that two tools ship differently **stops the build**, so a tool that has drifted gets caught, unless the file is in `DIFFER_ALLOW` in `build.py` (each entry has a one-line reason, for example Money View's own `connect-a-tool` wording or the shared context files the base holds blank). Then it **removes the way in that belongs to one tool**, worked out from the tools' own files: each tool's `Open <name>.html`, the shared `start-app.*` scripts and the `open-the-app` skill.
5. Applies the overlay (which adds the toolkit's own `Open Small Business Toolkit.html`, `setup/scripts/start-toolkit.sh` and `.ps1` and the `open-my-toolkit` skill), then points every remaining mention of a removed name at the toolkit's (`open-the-app` and `start-app`, plus the older `open-task-list`, `start-task-list`, `start-money-view` and each `Open <name>.html`, become `open-my-toolkit`, `start-toolkit` and `Open Small Business Toolkit.html`, and the permissions list is de-duplicated). It then writes `.claude/skills/README.md` fresh from the kit's own skill folders, sets `toolkit.json`'s `sharedVersion` and `attachingVersion` from the real files (`apps/shared/VERSION` and `ATTACHING.md`), makes the notes templates say "during setup" instead of a tool's own step numbers, and makes every "your Pipeline OS folder" (and so on) say "your Small Business Toolkit folder".
6. Replaces everything at the root except `maintainers/`, `.git` and `dist/`, and writes `maintainers/built-from.json` with the commit of each tool it used.

`--from <tool>=<folder>` builds one tool from a local folder instead (to try a change before it's merged). `check.py` refuses to pass a build made that way.

## One name, one way in

The product is the **Small Business Toolkit** (repository `small-business-toolkit`, no "OS"). A tool keeps its own name ("Task List OS", "Pipeline OS") only where the words mean that tool. The kit has exactly 1 opener, 1 start script pair and 1 open-the-app skill, all named for the toolkit. `check.py` enforces this with rules, not a fixed list of banned words: no skill folder named `open-*` other than `open-my-toolkit`; no `start-*` script other than `start-toolkit`; no `Open *.html` at the root other than the toolkit's; no reference anywhere to a `.claude/skills/<x>` or `setup/scripts/<x>` that isn't in the kit (this catches a rename the build missed, such as a leftover `open-the-app`); `toolkit.json`'s `sharedVersion` must match `apps/shared/VERSION`; and nothing says `Small Business Toolkit OS` or "the host" / "host tool". Ads OS's Claude Ads skills (`ads`, `ads-meta` and so on) are installed by the person at setup, so they are allowed to be absent.

From shared version 11 the helper (`apps/server/server.js` and `server.py`) reads its name from `toolkit.json`, so it prints "Small Business Toolkit is running at ..." in the kit and each tool's own name standalone. The old `server.js.replace-json` and `server.py.replace-json` overlays, and the `autostart-*.replace-json` overlays, are gone: the scripts take the name from `toolkit.json` too.

## Releasing

1. `git fetch` in each tool's repository is done by the build. Make sure any tool change you want is merged on GitHub first.
2. `python3 maintainers/build.py`, then `python3 maintainers/check.py`. Both must pass.
3. Test it in the browser: `node maintainers/test/livecheck.mjs <folder holding a copy of the kit>` from a terminal (it starts the helper, opens every page of every tool in headless Chrome and reports errors).
4. `git diff --stat` to see what changed since the last release, start a branch (`git switch -c claude/<name> origin/main`), commit, push it and open a pull request. George merges. Never push to `main` directly.

## Clients

- Invite a client: GitHub, this repository, Settings, Collaborators, Add people, their GitHub username, **Read** access. They accept from GitHub's email.
- Take access away: the same page, Remove.
- A client's copy never updates by itself. To give them a new version, on a call: "Fetch the latest Small Business Toolkit and update my copy, keeping my data, notes and settings": their Claude follows the same rules as attaching (`ATTACHING.md` steps 3 and 4: never overwrite `context/`, `files/`, `setup/progress.md`, any data file or their `theme.css`).

## Things to check

- **Licence:** `LICENSE` is the toolkit's licence adapted for a private client kit (no "for free", no passing it on). It has not been reviewed by a solicitor.
- **Shared version numbers:** the kit's `toolkit.json` `sharedVersion` and `attachingVersion` are written by the build from the real files, so they can't drift. `check.py` fails if `sharedVersion` and `apps/shared/VERSION` disagree. Keep each tool's own `toolkit.json` level in its own repository.
- **A real end-to-end setup** with live connections hasn't been run on this kit yet. The release checks and the browser check prove the files and the app; only a real `/setup` proves the questions.
