# Step 3 of 6: your platforms

Goal: you know which platforms they'll post on, where to find each one, and a realistic number of posts a week for each. A rhythm they can keep beats a heavier one they drop after a month.

Claude never posts for them. They'll copy each post and post it themselves, so more platforms means more work for them. Say that once, kindly.

> **Already answered in step 1.** The quick questions in `setup/toolkit-01-quick-questions.md` already asked where the business posts. Read that answer from `setup/progress.md` (under "Answers from step 1") and from `apps/content/data/content.json` first. Confirm it back in a sentence rather than asking again, and only ask about anything left blank or anything below it didn't cover (handles, how many posts a week).

## 1. Ask, one question at a time

Ask one question, wait for the answer, save it, then ask the next.

1. **Which platforms are you on, or want to be on?** Show the list in plain words (Instagram, TikTok, LinkedIn, Facebook, YouTube Shorts, Google Business Profile, X, an email newsletter) and say they can pick any, including none of these yet. If they aren't sure, say what you'd suggest from what they sell and who to (for example, a business selling to other businesses often starts with LinkedIn and Google Business Profile; a local trade often does well with Facebook, Instagram and Google Business Profile) and why, in a sentence. Suggest 2 or 3 to start with, no more.
2. **For each one they pick: what's your handle or link?** Save it as `handle` and `url`. If they don't have an account yet, leave both empty and say it's fine, but they'll need one before they can post there.
3. **How many posts a week for each, realistically?** Offer the sensible starting point from `.claude/skills/write-posts/references/platforms.md` (usually 2 to 3 for the main platforms, 1 for Google Business Profile, 1 every 1 to 2 weeks for email), and let them go lower. Never push them higher.

## 2. Save as you go

In `apps/content/data/content.json`, `platforms.<key>` for each platform they chose: `on: true`, `handle`, `url`, `perWeek`, and your `recommended` and `why` (one line of reasoning). Set `settings.postsPerWeek` to the highest `perWeek`, which is how many separate posts a week they need to look at (one post can go to several platforms). Leave every platform they didn't pick out of `platforms`.

Also add a `recommended: true` entry with `on: false` and a `why` for up to 2 platforms you'd suggest but they didn't pick, so the Platforms page can show them. You'll refine these after the research.

## 3. Connect each platform that has a connector

For each platform they picked (for an email newsletter, the tool they send it with), find out whether Claude can connect to it, and connect it if it can. A connection only reads: it lets you read their own account when they ask (for example their recent posts and how they did). Connections never post, and a connection never changes rule 1: you never post, publish, schedule, message, comment, follow or like anything, whatever the connection allows. The research reads public web pages either way and never uses a connection.

Follow `.claude/skills/connect-a-tool` for each one. These platforms have no guide in `setup/connections/`, so search Claude's connector directory with the platform's name: only a connector from the platform's maker or listed in Claude's directory counts. Never guess.

Check every platform first, before you say anything about any of them, then report once. Connect and prove the ones that have a connector, one at a time. For the ones with no connector, say the sentence once for all of them, listing them: "There's no Claude connector for Instagram, TikTok and Facebook, so I can't connect to them live. If you export a CSV or PDF from any of them and drop it in the files folder, I'll read it whenever you ask." If only one has no connector, use the sentence exactly as written for that app: "There's no Claude connector for [app], so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." This replaces `connect-a-tool`'s one message per app for this step.

- **No account on it yet:** don't look for a connector. Record it as `not-connected` with the note "No account yet", and tell them it can be connected once they have one.
- **There's a connector:** check it yourself (`session_connectors_status`), switch it on or point them to Connect, as `connect-a-tool` says. Never ask them what's on their screen. Then prove it with one harmless read of their own account (for example the name of their page and the date of their last post) and say what you found in one line. Only then record it as `connected`, with today's date in `checked`.
- **The connector can only post:** if its only tools would post, schedule or change something and none only read, don't switch it on. Record it as `export-only` with the note "Connector can only post", and say in your one report that its connection could only post, so you'll read an export instead.
- **There's no connector:** it's in the one no-connector sentence above. Record each one as `export-only`.
- **It still won't connect after the loop:** record it as `needs-attention`, with what went wrong in `note`. The Connections box on Home shows a **Fix it** button for it, so setup doesn't stall on it: go to section 4.

Record each platform in `apps/home/data/connections.json` (create it if it isn't there; the format is in `setup/connections/README.md`, "Recording a connection"), keyed by the platform's name in lower case with hyphens (`instagram`, `google-business-profile`), and in `context/tools.md`: how it's connected, today's date, that you may only read, and that you must never post, schedule, message or change anything there.

## 4. Tell them what you'd recommend

In 3 or 4 plain lines: which you'd start with and why, which platforms you connected and which can be read from an export, and that the research in the next step will check whether their customers and competitors are really on those platforms. They can change any of this later on the Platforms page.

Tick this step in `setup/progress.md`.
