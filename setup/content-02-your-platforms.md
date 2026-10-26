# Step 3 of 6: your platforms

Goal: you know which platforms they'll post on, where to find each one, and a realistic number of posts a week for each. A rhythm they can keep beats a heavier one they drop after a month.

Claude never posts for them. They'll copy each post and post it themselves, so more platforms means more work for them. Say that once, kindly.

## 1. Ask, one question at a time

Ask one question, wait for the answer, save it, then ask the next.

1. **Which platforms are you on, or want to be on?** Show the list in plain words (Instagram, TikTok, LinkedIn, Facebook, YouTube Shorts, Google Business Profile, X, an email newsletter) and say they can pick any, including none of these yet. If they aren't sure, say what you'd suggest from what they sell and who to (for example, a business selling to other businesses often starts with LinkedIn and Google Business Profile; a local trade often does well with Facebook, Instagram and Google Business Profile) and why, in a sentence. Suggest 2 or 3 to start with, no more.
2. **For each one they pick: what's your handle or link?** Save it as `handle` and `url`. If they don't have an account yet, leave both empty and say it's fine, but they'll need one before they can post there.
3. **How many posts a week for each, realistically?** Offer the sensible starting point from `.claude/skills/write-posts/references/platforms.md` (usually 2 to 3 for the main platforms, 1 for Google Business Profile, 1 every 1 to 2 weeks for email), and let them go lower. Never push them higher.

## 2. Save as you go

In `apps/content/data/content.json`, `platforms.<key>` for each platform they chose: `on: true`, `handle`, `url`, `perWeek`, and your `recommended` and `why` (one line of reasoning). Set `settings.postsPerWeek` to the highest `perWeek`, which is how many separate posts a week they need to look at (one post can go to several platforms). Leave every platform they didn't pick out of `platforms`.

Also add a `recommended: true` entry with `on: false` and a `why` for up to 2 platforms you'd suggest but they didn't pick, so the Platforms page can show them. You'll refine these after the research.

## 3. Tell them what you'd recommend

In 3 or 4 plain lines: which you'd start with and why, and that the research in the next step will check whether their customers and competitors are really on those platforms. They can change any of this later on the Platforms page.

Tick this step in `setup/progress.md`.
