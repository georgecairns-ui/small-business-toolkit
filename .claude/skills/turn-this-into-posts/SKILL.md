---
name: turn-this-into-posts
description: Takes something the person says or pastes (an idea, a win, a customer's kind words, a question customers keep asking, a file) and adds it to Content Machine OS as an idea, or as a planned post if they say when. Use when they say "I've got an idea", "turn this into a post", "make this into content", "this would make a good post", "post about this", or paste a review, a testimonial or a note about something that happened.
---

# Turn this into posts

Capture what they've given you so it doesn't get lost. Keep it quick.

## What you need

- `apps/content/data/content.json` (`ideas`, `posts`, `settings.themes`, `platforms`).
- `context/content.md` and `context/voice.md`.
- `.claude/skills/write-posts/references/platforms.md`.

## Steps

1. Read what they gave you, or the file they pointed at. If it's a file, read only what you need for the idea; don't copy it anywhere.
2. Decide what it is: a single idea, or several. A win and a lesson from it are 2 ideas. Check `ideas` and `posts` first, and don't add one that's already there.
3. For each, add an entry to `ideas`: a plain `title`, `notes` (the facts, in their words, including any real number, name or quote they gave, so you never have to invent one later), `source` (`you` for what they told you, `case-study` if it's a story about a job, `research` or `claude` only if you came up with it), the nearest `theme` from `settings.themes`, `createdAt` now, `status: "new"`, `postId: null`.
4. **If they say when or where** ("post that on Thursday on LinkedIn"), also create the post: `title`, `theme`, `date`, `time` (`settings.defaultTime`), `approval` (`settings.defaultApproval`), platforms from what they said or the ones that suit it, `status: "idea"`, then set the idea `status: "planned"` and its `postId`. Then follow `.claude/skills/write-posts` if nothing is needed from them, so the words are ready.
5. **If the idea needs something from them** (a photo, a real result, the customer's name and whether you can use it), say so plainly and add it as a need on the post, if there is one. Never make it up.
6. Add a line to `activity` at the front ("Added the idea 'Why we stopped quoting by the hour'"), keeping no more than 200.
7. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.

## What to say back

1 or 2 lines: what you added, and what happens next.

> Added 2 ideas: 'The drain nobody could fix' and 'Why we show the full price first'. Both are in your Ideas list. Drag one onto a day in the Calendar, or say "plan my content" and I'll place them.

## Rules

- Keep their real details in `notes`: a number, a name, a quote. Never add one they didn't give you.
- Don't plan or write posts they didn't ask for beyond what step 4 says. An idea is enough.
- Never post or message anyone. Never name a customer unless they've said you can.
