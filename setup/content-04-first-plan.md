# Step 5 of 6: your first plan

Goal: the Calendar has its first posts, they know who posts what, and they've decided whether to approve each post or let Claude finish them.

## 1. Ask about approval

Ask once, in plain words:

> For each post, do you want to approve it before it's final, or let me finish it without asking? Either way I never post anything: you always post it yourself, using the Copy and Open buttons. I'd start with "Ask me first" so you see every post, and you can change it later or for one post at a time.

Save the answer as `settings.defaultApproval` (`ask` or `auto`) in `apps/content/data/content.json`. If they don't mind, leave it as `ask`.

## 2. Make the first plan

Follow `.claude/skills/plan-my-content`. It fills the next `settings.planWeeks` weeks (2 unless they've changed it), writes the words for every post (a post that needs a photo or video still gets its caption), and lists what it needs from them (a photo, a video, a case study). Only a post that needs a case study or information waits for their answer before it is written.

If Pipeline OS is attached, `plan-my-content` also brings in the wins as ideas. If Task List OS is attached, it adds what you need from them as suggested tasks there.

## 3. Open the Calendar and show them how it works

Open **http://localhost:4747/content/** (follow `.claude/skills/open-task-list` if it isn't running) and walk through it in a few plain lines:

- **Drag a post** to another day, or press its Move button.
- **Open a post** to see each platform's version, its score and why, and to edit the words.
- **To do** lists what's waiting on them: what Claude needs from them, posts to approve, and posts to post today.
- **To post**, press **Copy**, then **Open <platform>**, paste, post, then **I've posted it**. Claude never posts.
- **Ideas** holds ideas, and **Brain dump** (top bar) turns something they say into an idea.

Ask them to open one post and say whether it sounds like them. If not, press **Ask Claude to change it** and say what's off. If it keeps missing, offer to learn their voice properly with `.claude/skills/write-like-me`.

## 4. Get one thing done now

Pick the first post due and help them post it, so they've done the whole loop once. If it needs a photo, say what to take.

Tick this step in `setup/progress.md`. Next, step 6: follow `setup/09-check-and-hand-over.md`.
