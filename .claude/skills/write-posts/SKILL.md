---
name: write-posts
description: Writes the words for posts in Content Machine OS, in the person's own voice and shaped for each platform, then scores each platform out of 10 with 5 simple factors and says what Claude needs from them (a photo, a video, a case study). Never posts anything. Use when the app asks for a post to be written or changed (a post with a request), or when they say "write my waiting posts", "write this up", "write this post", "make it shorter", "change this post", "rewrite it" or "try it again".
---

# Write posts

You turn a planned post, or a request from the app, into finished words for each platform. You never post it. The person checks it, copies it and posts it themselves.

## What you need

- `apps/content/data/content.json`: the posts, and `settings` and `platforms`.
- `context/voice.md` and `.claude/skills/write-like-me` (write mode): how this person writes.
- The business's own what-works skill, named in `research.skill` (for example `fern-and-finch-what-works`): what works for their audience, platform by platform. If it doesn't exist yet, use `research.whatWorks` and say so.
- `context/content.md`: what they sell, the problems they solve, what makes them different, who for and where.
- `.claude/skills/write-posts/references/platforms.md`: each platform's limit, formats and what it rewards. Read it every time.
- The post's photos and videos, if it has any: `media` on the post lists them, and each `file` is in `apps/content/data/media/`. The person adds them in the app.

## Which posts

Every post in `posts` with a `request` (`write`, `rewrite` or `case-study`), or the one the person names. For "write my waiting posts", also include posts with status `idea` and a date within the next 7 days. Leave every other post alone.

## Steps

1. Read the data file, the voice notes and the what-works skill now. If `context/voice.md` isn't filled in, say so, offer `write-like-me` learn mode, and write a plain, human draft anyway, saying it's a best guess.
2. For each post, look at `request`:
   - `write`: write each version from the title, theme and idea notes.
   - `rewrite`: change what `request.note` asks for. Keep what the person already edited (`text` that differs from your last version) unless the note says to replace it.
   - `case-study`: the person has answered a case-study need (in that need's `answer`). Write from their words, using `.claude/skills/use-my-case-study`.
3. **Look at the photos.** If the post has `media`, open each image file in `apps/content/data/media/` (you can read image files) and look at it before you write. Use what is really in the picture in the caption: the place, what was made or fixed, the colours, the state it's in. Describe only what you can see. Never name a person, a customer or a place from a picture unless the person has said so, and never invent a result, a number or what happened from it. If a picture is unclear, say what you can see and leave the rest out. You can't watch a video: for those, use the file name, the title and the shot list, and say so in a line to the person. If there are no photos yet, write from the idea as before.
4. Write a version for every on-platform (`platforms.<key>.on: true`), using a format from the platform's list in `platforms.md`. Change `format` if the post's current one isn't allowed there. With photos, use a photo format for 1 picture and a carousel for 2 or more where the platform has one; with a video, a video or reel format. Write for the platform, not the same text pasted four times: the length, the opening and the tone change.
5. Fit the limit. Count the characters. YouTube's first line is the title and must be within 100. If it won't fit, shorten it. Never cut mid-sentence.
6. Run the voice checklist below on every version before you save it.
7. **Score each platform**, including any platform not switched on that would also suit the post (so the editor can say "Also good on TikTok, 8/10"). Fill the 5 factors, each 0, 1 or 2, using the table at the end of `platforms.md`, and write one line of `reason` in plain words: "A how-to video suits TikTok and people search for patio costs, but you haven't got a video yet." **Never write a total.** The app adds the factors up.
8. **What you need from them.** If the post needs something only they can supply, add it to `needs` (type `photo`, `video`, `quote`, `case-study`, `info` or `other`, with a plain `text`, a `due` of the post date minus 1 day, `done: false`). Do not add one that's already there, and never add a `photo` need when the post already has a photo in `media`, or a `video` need when it already has a video. If a real result, name, number or story is missing, ask for it as a `case-study` or `info` need instead of making it up, and still write the version as far as you can without it, marking the gap in plain words in the need. Set `shot` to one plain line: the picture or video idea.
9. Set the status. A post with a `case-study` or `info` need still open stays `idea` (words can't be finished without it). Otherwise:
   - `approval: "ask"`: `status: "drafted"`.
   - `approval: "auto"`: `status: "approved"` and `approvedAt` now. Automatic means you finish it without asking. It does not mean you post it.
10. Clear `request` (set it to `null`), set `updatedAt`, and add a line to `activity` at the front ("Wrote 3 versions of 'Before and after: the Clifton café menu'"), keeping no more than 200.
11. Save safely: read the file right before writing, write the whole file back, read it back and check it parses. Never touch a post you weren't asked about.

## What to say back

2 to 4 lines: how many posts, which platforms, what's waiting on them, what's waiting for their approval.

> I've written 2 posts. 'Before and after' is on Instagram and Facebook and waiting for your Approve. The patio video is written too, but needs a 30 second clip from you, due Wednesday, before it can go out.

## The voice checklist

Run it on every version. People can tell machine writing now, and when they do they stop trusting the post. Fix the shape before the words.

1. **Say the point in the first line.** No warm-up, no "Excited to share", no restating the question.
2. **Zero em dashes.** Use a full stop, a comma or a hyphen.
3. **No "it's not X, it's Y"** contrasts.
4. **No list of 3 for effect.** Two items or four, or just say it.
5. **Vary the sentence length.** A short one next to a longer one.
6. **One real detail**: a name, a place, a number, a date or a customer's words, from the person or their research. Never invented.
7. **No hype**: no "game-changer", "unlock", "elevate", "seamless", "leverage", "delve", "robust", "transform", "revolutionise", "cutting-edge", no "In today's fast-paced world", no "Are you ready to...?".
8. **No hashtag walls.** At most 3 to 5 relevant ones, only where the platform uses them, and none for email or LinkedIn unless the person's own posts do.
9. **No emoji strings.** None, or one that the person would really use, matching `context/voice.md`.
10. **No flattery or fake questions as bait** ("Agree?", "Who else loves this?", "Drop a 🔥 below").
11. **A clear next step**, only if there is one, with a real date or place: "Message us before Friday to get on the October list."
12. **It sounds like them.** Greeting, sign-off, how formal, words they use and words they'd never use, from `context/voice.md`.
13. **Short.** Cut it down, then check it's still complete. Length is one of the biggest tells.

A before and after, so you know the target (an invented example, never reuse its details):

Before: "Are you ready to elevate your outdoor space? In today's fast-paced world, a beautiful patio is a game-changer. It's not just about looks, it's about lifestyle. ✨🌿🏡 #patio #garden #landscaping #outdoorliving #bristol"

After: "We finished the Clifton patio on Tuesday. It's 14 square metres of sandstone, and the drain the owner had been told was impossible to fix now works. Before and after photos below. If your garden floods every winter, message us and we'll tell you what it would take."

## Rules

- Never post, schedule, publish, message or log in to anything. You write. The person posts.
- Never invent a result, number, quote, customer, price, offer, event or statistic. If you don't have it, ask for it as a need.
- Never write a total score, and never put a number in the plan other than the factors (0 to 2).
- Only change the posts you were asked about. Never delete anything. A post the person has edited is theirs: don't overwrite their words unless they asked you to rewrite.
- Keep the person's own words for a customer's story. Don't quote a customer unless the person gave you the words, and never name a customer the person hasn't said can be named.
- Never copy a competitor's post. Learn from what works, then say it your own way.
