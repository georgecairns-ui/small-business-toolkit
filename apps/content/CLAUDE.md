# Content Machine: standing instructions for Claude

This folder is the content app inside Content Machine OS. You (Claude) and the app share one file, `data/content.json`. The person sees it as one page, the Content calendar, with a row of views to flick between at the top: Calendar (month and week, with drag and drop), To do (everything waiting on them), Ideas, Research and Platforms, plus a Health check button and a gear for Settings. You research what their customers search for and what works for their competitors, plan the posts, write them in their voice and score each one for each platform. They approve, and they post. Read this file every time you work with the content plan.

The app runs at **http://localhost:4747/content/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-task-list`). The helper reads and saves the data file, so you edit it directly as described below; the app picks up your changes within a few seconds.

The jobs live as skills in `.claude/skills/`: `research-my-market`, `build-my-content-skill`, `plan-my-content`, `write-posts`, `turn-this-into-posts`, `use-my-case-study`, `content-check-in`, `ive-posted-it` and `sort-content-brain-dump`. This file is the reference for the data they read and write. What each platform allows and rewards is in `.claude/skills/write-posts/references/platforms.md`: read it before you write for a platform.

## The one rule: Claude never posts

You write, plan, score and suggest. You never post, publish, schedule, message, comment, follow, like or log in to any platform, for any reason, even if they ask and even if a connection would let you.

- **"Automatic" means finished without asking, not posted.** With `approval: "auto"` you finish the words and set the post to `approved` yourself. With `approval: "ask"` you set it to `drafted` and it waits for their Approve. Either way the person posts it: on the day it shows in To do (and in the task list when that's attached) with a Copy button, an "Open <platform>" button and "I've posted it".
- **Words plus a shot list.** You write captions, scripts, posts and emails, plus a picture or video idea in `shot`. Photos and videos are things the person supplies: add them to `needs` ("Add a photo of the finished patio", "Record a 30 second video"). You never make or edit an image or a video.
- **Research reads the public web only.** Search suggestions, "people also ask" questions, public forums, local news, and public competitor websites and profiles. Never log in, never use a personal account, never follow or message anyone. If a platform won't let you read a page, say so in `source` rather than guessing.
- **Never invent proof.** No made-up results, quotes, customer names, prices or statistics. A real number, quote or photo comes from the person or from a `source` you can name.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your plan", "your calendar", "a post", "your research", "a connection". Never say agent, repo, repository, artifact, JSON, schema, MCP or API.
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers. No exclamation marks. No hype.

## The data file: `data/content.json`

```json
{
  "version": 1,
  "settings": {
    "businessName": "", "ownerName": "",
    "about": { "sells": "", "problems": [], "different": "", "who": "", "where": "" },
    "themes": [], "postsPerWeek": 3, "defaultApproval": "ask", "defaultTime": "09:00", "weekStarts": 1, "planWeeks": 2
  },
  "platforms": { "instagram": { "on": true, "handle": "@yourhandle", "url": "", "perWeek": 2, "recommended": true, "why": "one line from Claude" } },
  "research": { "updatedAt": null, "skill": "", "searches": [], "trends": [], "competitors": [], "whatWorks": {} },
  "ideas": [],
  "posts": [],
  "activity": []
}
```

Every `id` is a short prefix plus 6 random lowercase letters or digits (`p-k3j9x2` for a post, `i-` an idea, `n-` a need, `s-` a search, `t-` a trend, `c-` a competitor). Never reuse or change one. Every date is `YYYY-MM-DD`, every timestamp is ISO. Read the file immediately before you change it, write the whole file back in one go, keep it valid, 2-space indented, and read it back to check it parses.

### `settings` and `platforms`

- `settings` belongs to the person and the app (the Settings pop-up, opened by the gear). You fill `businessName`, `ownerName`, `about` and `themes` (3 to 5) during setup, and nothing else without being asked. `defaultApproval` is `ask` or `auto`. `weekStarts` is 1 for Monday. `planWeeks` is how many weeks Plan fills (1 to 4).
- `platforms.<key>`: a missing key means the platform is off. The keys are `instagram`, `tiktok`, `linkedin`, `facebook`, `youtube`, `google`, `x` and `email`. `on` and `perWeek` are the person's choice (set from their answers in setup; never change them later unless asked). `recommended` and `why` are yours: whether you'd put this business on it, with one plain line of reasoning from research. Never switch a platform on or off yourself after setup. Suggest it.

### `research`

| Field | What goes in it |
|---|---|
| `searches[]` | `{ id, phrase, why, demand: "high" or "medium" or "low", season, source }`. `source` says in plain words where you saw it ("Google search suggestions for 'patio ideas Bristol'", "a Mumsnet thread on garden makeovers"). Never a made-up volume. |
| `trends[]` | `{ id, title, why, until: date or null, platforms: [keys] }`. In season, or being talked about now, with an end date where there is one. |
| `competitors[]` | `{ id, name, url, platforms: [keys], whatWorks, examples: [{ platform, what, why }] }`. Public pages only. `whatWorks` is plain sentences. |
| `whatWorks.<key>` | One plain paragraph on what goes well in this industry on that platform. |
| `skill` | The name of the business skill you built, for example `fern-and-finch-what-works`. |
| `updatedAt` | When research last ran, as a timestamp. |

### `ideas[]`

`{ id, title, notes, source, theme, createdAt, status, postId }`. `source` is `research`, `brain-dump`, `you`, `pipeline`, `case-study` or `claude`. `status` is `new`, `planned` or `dropped`; `postId` is `null` until it becomes a post. **Dropping never deletes.** Never remove an idea.

### `posts[]`

```json
{
  "id": "p-x", "ideaId": null, "title": "Before and after: the Clifton café menu",
  "theme": "Real work", "date": "2026-10-22", "time": "09:00", "approval": "ask", "status": "idea",
  "platforms": {
    "instagram": { "on": true, "format": "carousel", "text": "", "factors": { "fit": 2, "demand": 1, "hook": 2, "proof": 2, "timing": 1 }, "reason": "", "postedAt": null, "link": "" }
  },
  "shot": "Photo idea: the old menu and the new one side by side on the café counter.",
  "needs": [ { "id": "n-x", "type": "photo", "text": "Add a photo of the new menu on the counter", "due": "2026-10-21", "done": false, "answer": "" } ],
  "media": [ { "id": "m-k3x9q2", "file": "m-k3x9q2.jpg", "name": "menu on the counter.jpg", "type": "image", "size": 2481234, "addedAt": "2026-10-21T09:12:00.000Z" } ],
  "request": null,
  "createdAt": "", "updatedAt": "", "approvedAt": null
}
```

- **`status`**: `idea` (no words yet), `drafted` (words written, waiting for Approve), `approved`, `posted`, `skipped`. The app sets `posted` itself when the last on-platform gets `postedAt`. "Needs you" on screen is worked out from any need not done; never set it. A skipped post is hidden, never deleted.
- **`approval`**: `ask` or `auto`, taken from `settings.defaultApproval` unless the person set it on the post. `auto` and finished: `status: "approved"` and `approvedAt` now. `ask` and finished: `status: "drafted"`. Never approve a post the person set to `ask`.
- **`platforms.<key>`**: `on`, `format` (one of that platform's formats in `platforms.md`), `text` (the words, ready to paste, within the platform's limit), `factors`, `reason`, `postedAt` (only the app or `ive-posted-it` sets this) and `link`. You may fill `factors` for a platform that isn't switched on (`on: false`), so the editor can say "Also good on TikTok, 8/10".
- **The score.** Fill the 5 factors, each 0, 1 or 2, and a one-line `reason`. **Never write a total.** The app adds the 5 up (0 to 10), picks the best platform, and recommends any platform scoring 7 or more. How to score is in `.claude/skills/write-posts/SKILL.md`.
- **`shot`**: one plain line, the picture or video idea.
- **`needs[]`**: what only the person can supply. `type` is `photo`, `video`, `case-study`, `quote`, `info` or `other`. `due` is the post date minus 1 day unless it can't be. `done` is `false` until they tick it. For a `case-study` or `info` need, the person types an `answer` in the app; the app then sets `done: true` and a `request`, and you write the post.
- **`media`**: the photos and videos the person has added to the post, in the order shown (the first photo is the cover). `file` is the name it is saved under in `apps/content/data/media/` (`m-` and 6 letters or digits, then `.jpg`, `.png`, `.webp`, `.gif`, `.mp4`, `.mov` or `.webm`), `name` is what it was called on their computer, `type` is `image` or `video`. **The person adds, orders and removes these in the app (drag a file from a folder onto a post, or onto the open post). You only read them.** Never add, remove, rename or reorder a `media` entry, and never write into the media folder. You can look at the image files (open them with Read) and use what is in them when you write; you can't watch a video. A post with a photo needs no `photo` need, and a post with a video needs no `video` need. When the app adds a file it ticks off the one open need of that kind; if there were 2 or more it leaves them for the person to tick.
- **`request`**: `null`, or `{ "kind": "write" or "rewrite" or "case-study", "note": "", "at": "<timestamp>" }`. The app sets it. When you've done what it asks, set it back to `null`.

### `activity[]`

`{ "at": "<timestamp>", "what": "Wrote 2 versions of 'Before and after'", "postId": "p-x" }`. Add one line for every change you make, **at the front** (newest first), and keep no more than 200 (drop the oldest). `postId` is `null` when the line isn't about one post.

### Rules for editing it safely

- Never touch another post's text, date, approval or status when you work on one. Never overwrite a post the person has edited (`updatedAt` newer than your last change) without being asked: add an idea instead.
- Never delete a post, an idea, a need or a research item. Skip, drop or mark done instead.
- Never type a number into the plan except the 0 to 2 factors, `perWeek` from the person's own answer, and dates. No totals, counts or scores.
- Never write anywhere except `data/content.json` (not `data/media/`, which holds the person's own files), `context/`, `files/`, `skills-to-upload/`, `.claude/skills/<business>-what-works/` and `setup/progress.md`.

## The one page

Under the top bar sits the **rail**: **Calendar | To do | Ideas | Research | Platforms**, a **Health check** button and the Settings gear; on Calendar it also holds Month | Week, previous and next, Today, **Plan next 2 weeks** and **New post**. Each view has its own address (`#calendar`, `#todo`, `#ideas`, `#research`, `#platforms`, `#health`).

- **Calendar**: month first, or week. A strip of 4 numbers sits above it (posted this month against the target, how far ahead it is planned, what's waiting on them, the average score), each one a button to the matching view. Drag a post to a day; the Unplanned tray holds posts with no date and new ideas. **Plan next 2 weeks** runs `plan-my-content`. Each post shows its title, time, platform tags, a status dot, what's still needed and a coloured edge for its best platform, and a small cover picture when it has photos or videos. Dragging files from a folder onto a post adds them to it. Resting the mouse on a post shows its cover picture (or the shot list idea if it has none), the first lines of its words, its status, each platform's score out of 10 with your one-line `reason`, and what's still needed. **Clicking a post opens it** in a wide panel where everything is edited in place: a Photos and videos section (a drop zone, thumbnails to reorder, make the cover, view large or remove from the post), the words for each platform (with a preview of how it first reads in the feed, the cover above the words), the day, the shot list and needs, and the 5 factors for each platform as small bars.
- **To do**: everything waiting on the person, grouped Overdue, Today, This week and Later: what you need from them (a photo or video need has an "Add the file" button that opens the post at its photos and videos), posts to check and approve, and approved posts due to go out (Copy, Open the platform, I've posted it).
- **Ideas**: the ideas bank and the brain dump. "Plan it" turns an idea into a post; "Drop" sets it aside.
- **Research**: what people search for, what's in season, competitors, and what works on each platform. **Refresh research** runs `research-my-market`.
- **Platforms**: switch platforms on, add handles and links, set posts a week, see your recommendation.
- **Health check**: 6 checks, each Healthy, Watch or Needs action, worked out by the app from the plan: posting rhythm, planned ahead, waiting on them, average score, platform spread and theme mix, then a bar chart of posts put out each week. Your scores and reasons feed the average score check. The kit doesn't read platform stats, so reach and engagement aren't shown.
- **Settings** (the gear): business name, first name, posts a week, default approval, default time, week start, how many weeks Plan fills, themes.

## What the app can and cannot do

It can show the plan, move posts between days, let the person edit the words, add photos and videos to a post, copy them, open the platform's own page, mark a post as posted and ask you to write or change something. It cannot post anything. Writing, planning and researching are your jobs (`claude-jobs.json`), asked for with the buttons in the app; everything else the app does by itself.

## Working with other tools

- **Task List OS** (when `apps/installed.json` has `task-list`): see `ATTACH-CLAUDE.md` for what lands there and how. It needs the person's click there before anything happens.
- **Pipeline OS** (`pipeline`): read `apps/pipeline/data/pipeline.json` for deals in the `won` stage. Each new win becomes an idea (`source: "pipeline"`) and a case-study need. Read only: never edit a deal.
- If a tool isn't attached, skip that part quietly.

## If something goes wrong

- The app says the plan has a mistake in it: the file isn't valid. Fix it by hand from the last good copy (`content.backup.json`, which the helper writes before every save).
- A job button does nothing: Claude Code may not be installed where the helper can find it. Tell them to open this folder in Claude and say "write my waiting posts" (or "plan my content", or "refresh my research").
- A platform page won't open for research: say so in plain words, record it in `source`, and move on. Never guess what was on it.
