# Step 2 of 7: add the claude-ads skills

Goal: Claude has the claude-ads skills to plan and draft campaigns with. It is a free set of ad-planning skills by AgriciDaniel (MIT licence), and Ads OS installs a tested copy of it into this folder. Nothing is installed anywhere else on the computer.

If it fails, or they'd rather skip it, Ads OS still works: Claude uses `.claude/skills/build-a-campaign/references/campaign-basics.md` instead. Say so in one line; setup goes on without the extra skill.

## 1. Tell them what's about to happen

In 2 short lines:

> I'm going to add a set of ad-planning skills to this folder. It comes from a copy of an open-source set that George has tested, it takes about a minute, and I check it's the exact version he tested before I install anything. Nothing goes anywhere else on your computer.

## 2. Run it

- Mac and Linux: `bash setup/scripts/install-claude-ads.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\install-claude-ads.ps1`

It needs an internet connection. It fetches the tested version into a temporary folder, checks it's the right one, installs the skills and their helpers into `.claude/skills` and `.claude/agents` in this folder, adds the licence beside them, and tidies up after itself.

Tell them what was installed as "34 skills and 25 helpers" (the tested version), even though the installer prints "agents" for the helpers. Never say "agents" to them.

## 3. If it stops

- **"could not fetch" or "could not download":** the internet is down or GitHub is blocked. Ask them to check their internet connection, then run it again. If it still fails, tell them in plain words what it said; setup goes on without the extra skill.
- **"it is not the tested version":** stop. Install nothing. Tell them in plain words that the copy didn't match what was tested; setup goes on without the extra skill. Tell George.
- **Anything else:** read what it printed and tell them in plain words what it said; setup goes on without the extra skill.

If they don't have `git`, the script downloads a zip instead. If a computer prompt asks to install command line developer tools, that is fine.

## 4. Check it

- `.claude/skills/ads/SKILL.md` exists, with `LICENSE` and `INSTALLED-BY-ADS-OS.md` beside it.
- There are folders called `ads-plan`, `ads-create`, `ads-launch`, `ads-math`, `ads-dna`, `ads-optimize`, `ads-audit` and `ads-setup` in `.claude/skills`.

Note the result in `setup/progress.md` ("claude-ads installed" or "claude-ads not installed: using the basics"). Don't write about it in `context/`.

Tell them: Claude uses these skills to plan and draft. It never uses them to change an ad account.

Tick this step in `setup/progress.md`.
