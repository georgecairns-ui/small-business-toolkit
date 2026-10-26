---
name: plan-my-content
description: Fills the next weeks of the Content Machine OS calendar with posts, using the research and new ideas first, hitting each platform's posts-a-week, mixing the themes, and setting the day, time, platforms, picture or video idea, what Claude needs from the person, and a score for each platform. Writes the words straight away for every post, including ones that need a photo or video, and holds back only the posts that need a case study or information from them. Never changes a post that already exists and never posts anything. Use when they press Plan next weeks, or say "plan my content", "plan next week", "fill my calendar", "what should I post?" or "plan the next 2 weeks".
---

# Plan my content

You fill the calendar so the person doesn't stare at a blank page. You propose; they approve; they post.

## What you need

- `apps/content/data/content.json`: `settings` (`postsPerWeek`, `defaultApproval`, `defaultTime`, `weekStarts`, `planWeeks`, `themes`), `platforms`, `research`, `ideas` and the `posts` already there.
- `context/content.md`, `context/voice.md` and the what-works skill named in `research.skill`.
- `.claude/skills/write-posts/references/platforms.md`.
- Today's date. Work out dates from it; never guess them.
- Optional, if attached (`apps/installed.json`): Pipeline OS (`pipeline`) and Task List OS (`task-list`).

If `research.updatedAt` is empty or `platforms` has no platform switched on, say so and offer to run `research-my-market` or the platforms step first. Don't plan from nothing.

## Steps

1. **Bring in wins (only if attached).** Pipeline OS: every deal in `apps/pipeline/data/pipeline.json` with `stage: "won"` that has no idea yet becomes an idea (`source: "pipeline"`, with the deal's id in `notes` so you can tell next time, and a plain note on what happened, from the deal's `summary`) and gets a `case-study` need when it becomes a post. Never edit a deal. If Pipeline OS isn't attached, skip this step quietly.
2. **Work out the window.** It starts on the next day with no post planned (today if today is empty and it's before the default time, otherwise tomorrow) and runs for `settings.planWeeks` weeks of 7 days. Take the weeks from the day `weekStarts` names when you work out where a week begins.
3. **Work out what each week needs.** For each platform that's on, the target is its `perWeek`. Count the posts already in that week that carry that platform (posts with a date, not skipped) and fill only the gap. A post can carry several platforms: that counts once for each. If `perWeek` is 0 for a platform, leave it out. Never go over a platform's `perWeek`.
4. **Choose what to say.** In this order:
   - ideas with `status: "new"` (the person's own, brain dumps and wins first),
   - `research.searches` with `demand: "high"`, then `medium`, matched to the themes,
   - `research.trends` that are in season or end soon, placed before their `until`,
   - then your own ideas (`source: "claude"`), only to fill gaps, grounded in `context/content.md`.
   Mix the `themes` across the week so no 2 posts in a row share a theme. Don't repeat a title or topic already planned. One idea can become several posts, in different formats.
5. **Place each post.** Pick a day (weekdays first; weekends only if the business really works then or the platform suits it), spread across the week, never 2 posts on the same platform on the same day, and give a trend its date. Set `time` to `settings.defaultTime`. Set `approval` to `settings.defaultApproval`. Set `theme`, `title` (plain, specific: "Before and after: the Clifton café menu") and `ideaId` when it came from an idea (then set that idea `status: "planned"` and its `postId`).
6. **Platforms and format.** For each platform that's on and suits the post, add `platforms.<key>` with `on: true` and a `format` from that platform's list in `platforms.md`. Add the platforms the post suits, not every platform for every post.
7. **Score every platform.** Fill the 5 factors (0, 1 or 2) and a one-line `reason` for each platform you added, and for any platform that isn't on but would also suit it (`on: false`), so the editor can say "Also good on TikTok, 8/10". Use the scoring table at the end of `platforms.md`. Never write a total.
8. **Shot list and needs.** Set `shot` to one plain line. Add a `needs` entry for everything only the person can supply: a `photo`, a `video`, a `quote`, a `case-study` or `info` (for a win or a story you can't write without them). `text` is plain and specific ("Record a 30 second video of the patio", "Add a photo of the finished patio"), `due` is the post date minus 1 day, `done: false`. Never promise an image; you can't make one. If a post already has `media` (photos or videos the person added), don't add a `photo` need for a post that has a photo, or a `video` need for one that has a video.
9. **Write the words now for every post you plan.** Follow `.claude/skills/write-posts` to write each version (looking at any photos the post already has and using what's in them), score it, and set the status (`drafted` for `ask`, `approved` for `auto`). A post that needs a photo or a video still gets its caption: the words are written and the photo or video stays an open need for the person to supply. Only a post with a `case-study` or `info` need holds back: leave it `status: "idea"` with no `text` until they answer. The person can press Ask Claude to write it, or say "write my waiting posts", and `write-posts` picks it up.
10. Set `createdAt` and `updatedAt`. Add a line to `activity` at the front per run ("Planned 6 posts for 22 October to 4 November"), keeping no more than 200.
11. **Task list (only if attached).** Follow the hand-off in `apps/content/ATTACH-CLAUDE.md`: a suggested task for every open need you just added. Don't duplicate one that's already there.
12. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

3 to 5 lines in plain words:

> I've planned 6 posts across the next 2 weeks: 4 for Instagram, 3 for LinkedIn and 2 for Facebook, a few of them sharing a post. 5 are written and waiting for your Approve, and 3 of those still need a photo or a video from you (they're on your To do list with dates). The other 1 needs a case study from you before I can write it.

## Rules

- Never change a post that already exists: not its date, words, platforms, approval or status. If the plan would clash with one, move yours.
- Never post, schedule or message anything. Never switch a platform on or off, or change `perWeek`.
- Never invent a case study, result, offer, event, price or customer. If a post needs one, it's a need.
- Never write a total score.
- Never plan more than `settings.planWeeks` weeks, or more posts than the platforms' `perWeek` allow.
- Dates are `YYYY-MM-DD`. Never put a post in the past.
