---
name: content-check-in
description: Tells the person in plain words what's waiting on them in Content Machine OS - what to post today, what to check and approve, and what Claude still needs from them (a photo, a video, a case study) - worked out the same way the To do view does. Use when they say "what's due today?", "what do I need to post?", "what's outstanding?", "what's on my content list?", "what's waiting for me?" or "content check-in".
---

# Content check-in

Read To do the way the app does and say it in plain words. You report; you don't post, tick or approve anything. It runs whenever they ask, and as part of a scheduled run if they agreed one in setup.

## What you need

- `apps/content/data/content.json`: `posts`, `settings` and `platforms`.
- Today's date, from the computer. Never guess it.
- `apps/installed.json`, to see whether Task List OS is attached.
- `apps/home/data/connections.json`, if it's there: the platforms you connected in setup.

## Steps

1. Read the data file now. Ignore posts with status `skipped` or `posted`.
2. Build the same list the To do view shows, each item with a due date:
   - **Open needs**: every `needs` entry with `done: false` on a post that isn't skipped: `due` (or the post's date minus 1 day if there's no `due`), the `text`, and which post it's for.
   - **Posts to check and approve**: posts with `status: "drafted"`, due on the post's `date`.
   - **Posts to post**: posts with `status: "approved"` whose `date` is today or earlier, one line for each on-platform with no `postedAt`.
   A photo or video need on a post that already has a photo or video in `media` is probably answered. Say so ("the photo for Friday is already on the post") and offer to tick it off. Don't tick it yourself.
3. Group them as **Overdue** (due before today), **Today**, **This week** (the next 7 days) and **Later**.
4. Say it in a few short lines, most urgent first, naming the real posts and platforms. Lead with what to post today, then what's overdue.
5. **Task list (only if Task List OS is attached).** Add a suggested task for each post due today ("Post to Instagram: <title>") and each open need not already there, following the hand-off in `apps/content/ATTACH-CLAUDE.md`. Check `source.id` and the title first so you never add one twice. Never edit or remove anything already in the task list.
6. Don't change the content plan itself. If you spot a problem (a post with no words and a date this week), say so and offer to run `write-posts`.
7. **Connections.** For each app that is `connected` or `needs-attention` in `apps/home/data/connections.json`, do one small read through its connection (the same kind of read that proved it in setup, such as the name of their page). If it works, set its `checked` to today, and if its status was `needs-attention`, set it back to `connected` (the read just worked). If a read failed, set it to `needs-attention` with what went wrong in `note`, keep the old `checked`, and say so in one line of your summary ("Couldn't read your LinkedIn page this time: it may need signing in again. There's a Fix it button on Home."). Do this in a scheduled run too. If the file isn't there, or no app in it is `connected` or `needs-attention`, there is nothing to do here.

## What to say back

> 3 things for today. Post to Instagram: "Before and after, the Clifton café menu", it's approved and the words are ready to copy in the Calendar. Check and approve the LinkedIn post about the drain, it's drafted. And the patio video is overdue by a day: Claude needs a 30 second clip to finish the TikTok.
> Later this week: a photo for Friday's Facebook post.

If nothing is waiting: "Nothing's due today. The next thing is a photo for Friday's post."

If this is a scheduled run, say nothing unless a connection read failed; that is worth one line.

## Rules

- Read only, apart from the dates and statuses in step 7. Never mark a post posted, a need done or a post approved: that's theirs.
- Never post, publish, schedule, message, comment, follow or like anything through a connection.
- If a connection fails, carry on with the others and record the failure under step 7.
- Never invent a post or a due date.
- If the plan is empty, say so and offer "plan my content".
