# Content Machine OS: what goes into CLAUDE.md when it's attached

When Content Machine OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Content Machine OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Content Machine OS's own setup steps: `setup/content-01-your-business.md` (required: what they sell, the problems they solve, what makes them different, who for and where, skipping anything `context/` already answers), `setup/content-02-your-platforms.md`, `setup/content-03-research.md` and `setup/content-04-first-plan.md`. It reuses the shared `setup/05-get-to-know-the-business.md` step rather than asking about the business twice.

---

### Content Machine OS

Plans their posts from what their customers search for and what works for their competitors, drafted in their voice and scored out of 10 for each platform. They approve every post and post it themselves: Claude never posts, messages, follows or logs in anywhere. Their plan is in `apps/content/data/content.json`; `apps/content/CLAUDE.md` explains the format and the rules. How the business sounds is in `context/voice.md` and what it offers in `context/content.md`: read both before writing anything. Open it at http://localhost:4747/content/.

| They say something like | Use |
|---|---|
| "Research my market", "what are people searching for?", "look at my competitors", "refresh my research" | `.claude/skills/research-my-market` (it ends by running `build-my-content-skill`) |
| "Update what works for us" | `.claude/skills/build-my-content-skill` |
| "Plan my content", "plan next week", "fill my calendar" | `.claude/skills/plan-my-content` |
| "Write my waiting posts", "write this up" | `.claude/skills/write-posts` |
| "I've got an idea", "turn this into a post", "make this into content" | `.claude/skills/turn-this-into-posts` |
| "Here's a case study", "write up this job" | `.claude/skills/use-my-case-study` |
| "What's due today?", "what do I need to post?", "what's outstanding?" | `.claude/skills/content-check-in` |
| "I've posted it", "that's gone out" | `.claude/skills/ive-posted-it` |
| The content part of a brain dump (handed over by the shared `sort-brain-dump`) | `.claude/skills/sort-content-brain-dump` |

Day to day:

- **Claude never posts.** "Automatic" on a post means Claude finishes and approves it without asking. "Ask me first" means it waits for their Approve. Either way they post it themselves, on the day it shows in To do, with Copy and Open buttons.
- **Words plus a shot list.** Claude writes the words and a picture or video idea. Photos and videos are things they supply, shown as "what Claude needs from you".
- **Scores come from 5 factors.** Claude fills fit, demand, hook, proof and timing (0, 1 or 2 each) and a one-line reason. The app adds them up. Claude never writes a total.
- **Research is the public web only.** Never log in, never follow or message anyone. If a page can't be read, say so.
- **Wins become ideas.** When Pipeline OS is attached (`apps/installed.json`, id `pipeline`), each deal newly in the `won` stage in `apps/pipeline/data/pipeline.json` becomes an idea (`source: "pipeline"`) with a case-study need, once per deal. Content Machine OS only reads these; it never edits a deal.
- **Actions land in the task list.** When Task List OS is attached (`apps/installed.json`, id `task-list`), these also become suggested tasks there, in its own format (`apps/task-list/CLAUDE.md`): a post due today ("Post to Instagram: Before and after, the Clifton café menu", due that day, with "The words are ready to copy in Content Machine OS" in the notes) and every open need ("Record a video for Tuesday's TikTok", due the day before the post). Each has `"suggested": true`, `"addedBy": "claude"` and `"source": { "tool": "content", "id": "<post id>" }`, using the need's id as `id` for a need and `<post id>:<platform>` for a post. It shows on the task list's Review page with a New tag, and needs the person's click there before anything happens. Don't add one that's already there (check `source.id` and the title), and don't add a task for a post already posted or a need already done. Content Machine OS keeps its own To do list either way.
- Never post, schedule, message or log in anywhere, never invent a result, quote or statistic, and never write a total score.
