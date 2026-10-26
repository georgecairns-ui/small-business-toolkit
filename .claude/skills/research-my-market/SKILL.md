---
name: research-my-market
description: Researches what the person's customers search for and talk about, what's in season, and what their competitors do on each platform, using public web pages only, and saves it to the Research page in Content Machine OS. Then builds or updates the business's own what-works skill. Never logs in anywhere, never follows or messages anyone. Use when they press Refresh research, or say "research my market", "what are people searching for?", "refresh my research", "look at my competitors", "what's trending for us?" or "what works in my industry?".
---

# Research my market

You find out what the person's customers are looking for and what works for the businesses they compete with, from public pages only, and you record it with where you found it. Posts are planned from this, so be honest about what you saw and what you couldn't see.

## What you need

- `context/content.md` (what they sell, the problems they solve, what makes them different, who for, where) and `apps/content/data/content.json` (`settings.about`, `settings.themes`, `platforms`, and any research already there).
- The competitors they've named (`research.competitors`), or names from setup. If there are none, you will suggest some.
- WebSearch and WebFetch. Nothing else.

## The rules for research

- **Public web only.** Read pages anyone can read without an account. Never log in, never use a personal account, never follow, like, message or comment on anyone, never join a group.
- **No private profiles, no scraping behind a login.** If a page asks you to sign in, or a platform blocks reading, say so ("Instagram wouldn't let me read their profile without signing in") and record that in `source`. Don't guess what was on it.
- **Say where it came from.** Every finding gets a `source` in plain words: "Google's search suggestions for 'garden design Bristol'", "a Mumsnet thread on small gardens", "the Bristol Post, 12 October", "Fern Studio's website, their blog page".
- **Never invent numbers.** No search volumes, follower counts, engagement rates or percentages unless you read them on a public page, and then say which page. `demand` is "high", "medium" or "low", and comes from how often and how widely you saw it, not from a made-up figure.
- **Keep private things private.** Competitors' public posts are fine to describe. Don't record anything about private individuals, such as the names of people who commented.

## Steps

1. Read the context and the data file. Tell the person in one line what you're about to do ("I'm going to look at what people search for around landscaping in Bristol, and what 4 competitors are posting").
2. **What people search for.** For each of their main services and problems (from `settings.about`), look at:
   - search suggestions (the suggestions that appear as you type, found through searching the phrase and its variations),
   - "People also ask" style questions,
   - public forums and communities (Reddit, Mumsnet, local Facebook group pages that are public, trade forums),
   - local news and councils for anything seasonal or local.
   Record up to 12 `searches`: a plain `phrase` the way a customer would type it, `why` it matters to this business, `demand`, `season` (a month or "all year", or empty) and `source`. Replace what's there only if it's older than what you found; keep ones that are still true and add `id`s for new ones.
3. **In season and trending.** Record up to 6 `trends`: an event, a season, a regulation, a news story or a local happening that this business can say something useful about. `until` is the date it stops being relevant, or `null`. `platforms` are the platforms it suits. Only what you saw, with a date.
4. **Competitors.** For each of 3 to 5 competitors (the ones they named, or ones you find by searching their trade and area; say plainly which you chose and why), read their public website and any public profile that opens without a login. Record `name`, `url`, `platforms` (where they're active), `whatWorks` (plain sentences: what they post, how often, which posts clearly get the most response, if the platform shows it publicly) and up to 3 `examples` of `{ platform, what, why }`. Never record a made-up result.
5. **What works on each platform.** For every platform that's on in `platforms`, write one plain paragraph in `research.whatWorks.<key>`: what goes well in this industry there, from what you saw. If you couldn't see enough to say, write that and keep it short.
6. **Recommendations.** For each platform, set `recommended` and a one-line `why` in `platforms.<key>`: whether you'd put this business there, from what you found ("Your competitors are all on Instagram and their photo posts get the replies"). A platform not switched on can have `recommended: true`, but never switch one on yourself.
7. Set `research.updatedAt` to now. Add a line to `activity` at the front ("Refreshed your research: 9 searches, 4 trends, 4 competitors"), keeping no more than 200.
8. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.
9. **Build the business skill.** Follow `.claude/skills/build-my-content-skill` so what you learned is saved for planning and writing, and in the Claude app.
10. Add any good new topic as an idea: for each search with `demand: "high"` that doesn't already have an idea, add one to `ideas` (`source: "research"`, `status: "new"`, `postId: null`), up to 5 at a time.

## What to say back

3 to 5 lines in plain words: what people are searching for, what's in season, what the competitors do well, and what you couldn't read.

> I found 9 things people search for around garden design, led by "how much does a patio cost". It's spring planting time, and 2 of your 4 competitors do well with before and after photos on Instagram. Facebook wouldn't let me read one competitor's page without signing in, so I've left that one out. I've saved what I learned as a skill, so every plan starts from it.

## Hard limits

- Never log in, follow, like, comment, message, join or sign up to anything.
- Never invent a search, a trend, a competitor, a number or an example. If you couldn't find it, say so.
- Never write anywhere but `apps/content/data/content.json`, `context/` and the business skill (through `build-my-content-skill`).
- Never copy a competitor's text or images into a post. Research is for learning.
