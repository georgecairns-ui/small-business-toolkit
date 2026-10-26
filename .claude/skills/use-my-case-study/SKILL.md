---
name: use-my-case-study
description: Turns a customer story or finished job into posts for the right platforms in the person's voice, asks for a photo if there isn't one, and answers any open case-study request waiting in Content Machine OS. Never makes up a result, a quote or a customer. Use when they say "here's a case study", "write up this job", "tell the story of the Clifton job", "use this review", or when a post has a case-study need that has been answered.
---

# Use my case study

A real job, told plainly, is the best content a small business has. You write it from what they tell you, and only that.

## What you need

- `apps/content/data/content.json`, especially any post with a `needs` entry of type `case-study` that has an `answer` and a `request` of kind `case-study`.
- `context/voice.md`, `context/content.md` and the what-works skill named in `research.skill`.
- `.claude/skills/write-posts/SKILL.md` and `.claude/skills/write-posts/references/platforms.md`.

## If they're telling you a story now (no open request)

1. If you don't have these, ask for them in one short message, not a form: **who** it was for (and whether you can use their name), **what you did**, **the result** (a real number, a date or their own words), and **a photo** of the finished work if they have one.
   > Tell me about the job: who it was for, what you did and how it turned out. If you have a photo of the result, add it to the post when we've got a day for it. Can I use the customer's name, or should I keep it general?
2. Add it to `ideas` (`source: "case-study"`, `notes` holding the facts exactly as they gave them) and create a post for it: a sensible day from the calendar, `theme` the nearest from `settings.themes`, platforms that suit a story with proof (usually LinkedIn, Facebook, Instagram, Google Business Profile; check `research` and `platforms`).
3. Follow `write-posts` to write each version.

## If there's an open case-study request

For each post with `request.kind: "case-study"`: the person has typed their story into the need's `answer`, and the app has set `done: true`. Write from that `answer`, then follow `write-posts` from its step 3.

## Rules for the story

- **Every fact is theirs.** A result, a number, a date, a name or a quote appears only if they gave it to you. If the result is missing, say so and ask. Don't write "saved them 10 hours a week" because it sounds good.
- **Names.** Use the customer's name only if the person said it's fine. Otherwise "a café in Clifton" or "a customer in Bristol".
- **A customer's words stay theirs.** Quote exactly, in quote marks, or not at all.
- **Photo.** If the post already has photos (`media`, files in `apps/content/data/media/`), look at them (you can read image files) and use what's really in them: what the finished work looks like, the setting, the state it's in. Describe only what you can see, and never take a result, a name or a number from a picture. Don't add a `photo` need. If there isn't one, add a `photo` need ("Add a photo of the finished patio") due the day before. A case study posted without proof is weaker; say so in a line, once.
- **Shape.** The situation, what you did, what changed, what to do if you're in the same place. Short. The first line works on its own. Run the voice checklist in `write-posts`.
- Check any claim ("the fastest", "the best", "guaranteed") against what they told you. If they didn't say it, take it out.

## Then

Clear the `request`, set the status per `approval` (as `write-posts` does), add a line to `activity` at the front, and save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

> Written up as a LinkedIn post and a Facebook post, from what you told me. I've used "a café in Clifton" because you didn't say whether I could name them. It needs a photo of the new menu on the counter, due Wednesday. Both are waiting for your Approve.
