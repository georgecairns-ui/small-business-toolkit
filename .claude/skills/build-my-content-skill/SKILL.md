---
name: build-my-content-skill
description: Builds or updates the business's own "what works for us" skill from its research - what its audience searches for, what does well in its industry on each platform, hooks and formats that work, how often to post, and words to avoid - and packs it up as a zip for the Claude app. Run at the end of research-my-market. Use when they say "update what works for us", "build my content skill" or "save what you learned".
---

# Build my content skill

Research is only useful if every later job starts from it. You save what you learned as a skill written for this business, so planning and writing use it in Claude Code, and, packed as a zip, in every Claude conversation including the phone app.

## What you need

- `apps/content/data/content.json`: `research`, `settings` and `platforms`.
- `context/content.md` and `context/voice.md`.
- `.claude/skills/write-posts/references/platforms.md` for the platform limits and formats.
- Any what-works skill that already exists for this business (name in `research.skill`), so you update it rather than start again.

## Name it

The business name in lowercase letters, numbers and hyphens, plus `-what-works`: `fern-and-finch-what-works`. 64 characters at most. Use `research.skill` if it's already set.

## What goes in it

Write `.claude/skills/<name>/SKILL.md` in the same format as the other skills here: a `name` and a `description` (what it is and when to use it, with the phrases people would say, under 1,000 characters) and sections:

- **Who we're talking to**: who the audience is and where, in a few lines, from `settings.about`.
- **What they search for and ask**: the best `searches`, as plain phrases, with the season where there is one.
- **What works in this industry, platform by platform**: a short paragraph each from `research.whatWorks`, for the platforms that are on.
- **Hooks that work**: 5 to 8 opening lines or patterns drawn from what you saw working, written as patterns, never copied from a competitor's post.
- **Formats that work**: which formats do well on which platform for this business.
- **How often to post**: the rhythm from `platforms.<key>.perWeek`, and any season note.
- **Words and habits to avoid**: from `context/voice.md` and the voice checklist in `.claude/skills/write-posts/SKILL.md`.
- **What we won't do**: never post for them, never invent proof, never copy a competitor.

**Make it stand on its own.** Uploaded to Claude, a skill can't see this folder, so never point at `context/` or `apps/`. Copy the facts it needs into it: the audience, the searches, the platform notes, the voice habits. Use their real details; if you don't know something, leave it out rather than making it up. Keep it under 200 lines.

## Save it in 3 places

1. `.claude/skills/<name>/SKILL.md`. It works in Claude Code in this folder straight away.
2. `skills-to-upload/<name>.zip`: a zip of the `<name>` folder (the folder itself, with `SKILL.md` inside). On a Mac: `cd .claude/skills && zip -r "../../skills-to-upload/<name>.zip" "<name>"`. On Windows: `Compress-Archive -Path ".claude\skills\<name>" -DestinationPath "skills-to-upload\<name>.zip" -Force`. Claude Code may ask them to approve that command; it only packs the one folder. If it's not approved, say so and carry on.
3. `research.skill` in `apps/content/data/content.json`: the skill's name. Add a line to `activity` at the front ("Updated your what-works skill").

Add (or update) its row in the table in `skills-to-upload/README.md` and list it in `context/tools.md` under "Your own skills".

## What to say back

One or 2 lines: the skill's name, that it works here already, and that the zip is in `skills-to-upload` if they'd like to add it to the Claude app (the steps are in that folder's README). Don't make them do it now.

## Rules

- Never copy a competitor's words into the skill. Patterns, not quotes.
- Never put a figure in it that isn't in the research with a source.
- Don't delete an older version of the skill: if the name changes, leave the old folder and say so.
- Never commit or share it: it's about their business. (`.gitignore` already keeps it out of the kit.)
