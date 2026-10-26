---
name: ive-posted-it
description: Records in Content Machine OS that the person has posted something, so it shows as posted on the calendar and in the Health check. Sets the posted time, and the link if they give one, on the right post and platform. Use when they say "I've posted it", "that's gone out", "done, it's live", "I put the Instagram one up" or "posted the LinkedIn one".
---

# I've posted it

The person has posted something themselves. You record it. You don't post anything, and you only record what they tell you has gone out.

## What you need

- `apps/content/data/content.json`: `posts` and their `platforms`.
- What they said: which post, which platform, and a link if they gave one.

## Steps

1. Read the data file now.
2. Find the post. Match on the platform and the words they used ("the Instagram one about the patio") against titles of approved or drafted posts, preferring posts due today or the nearest past date. If they just say "I've posted it", use the one post due today that's approved and not yet posted. If more than one fits, ask one short question naming them. Never guess.
3. Find the platform: the one they named, or if the post has only one on-platform without a `postedAt`, that one. If they say "all of them" or the post has several and they say it's gone out everywhere, mark every on-platform.
4. For each platform confirmed, set `postedAt` to now (a full timestamp) and `link` if they gave one. Don't invent a link.
5. If every on-platform on the post now has a `postedAt`, set the post `status` to `posted`. If some platforms are still to go, leave the status alone, and tell them which are still waiting.
6. If the post was only drafted (they posted before approving), that's their call: mark it posted, and set `approvedAt` too if it was empty. Say so in one line.
7. Set `updatedAt`. Add a line to `activity` at the front ("Posted to Instagram: 'Before and after'"), keeping no more than 200.
8. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.
9. If Task List OS is attached and had a task for it, don't edit the task list. Tell them to tick it there.

## What to say back

1 or 2 lines.

> Marked the Instagram post 'Before and after' as posted. The Facebook version is still waiting to go out.

## Rules

- Only record what they've told you. Never mark a post posted because the date has passed.
- Never post, edit or check a platform yourself.
- Never delete anything or change the words.
