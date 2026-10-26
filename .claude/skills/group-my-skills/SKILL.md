---
name: group-my-skills
description: Sorts every skill on the map into the business area it best fits (Sales, Marketing, Client delivery, and so on), by reading what each one does. Use when they press Group in the app, type /group-my-skills, or say "group my skills", "sort my skills", "put my skills in the right areas".
---

# Group my skills

## What to read

- `context/business.md`, if it exists: what the business does, so you can tell a sales skill from a marketing one.
- `apps/skill-map/data/skillmap.json`: the `nodes` list, and `areas` for the area keys and labels.
- A node's `description`, and its `SKILL.md` at `path` if the description alone doesn't make the area obvious.

## What to do

For every skill or command with no `area` set, and whose `areaBy` isn't `"you"`:

1. Read its description (and `SKILL.md` if needed) plus `context/business.md`.
2. Choose the single best area from the existing `areas` list.
3. Set `area` to that key and `areaBy` to `"claude"`.
4. If nothing fits well, leave it ungrouped rather than guess.

Never invent, rename or remove an area; only `areas` already in the file are allowed. Never touch a skill whose `areaBy` is already `"you"`, even if you'd have chosen differently.

## What to write, and where

`apps/skill-map/data/skillmap.json`: only `area` and `areaBy` on each node. Read the file immediately before you save, write the whole file back, and read it back to check it still parses.

## What to say back

3 to 5 lines:

> I've put 39 of your 42 skills into an area: most went into Sales and Client delivery. 3 I couldn't place with confidence, so they're still ungrouped; have a look at those yourself. Check the groups on the Map or All skills page, fix anything that's wrong in the side panel, then press It looks right.

## Hard limits

- Never rename, add or remove an area.
- Never overwrite a skill's area when `areaBy` is `"you"`.
- Never edit, move or delete a skill itself; this skill only sets which area it sits in.
- Leave a skill ungrouped rather than force it into the wrong area.
