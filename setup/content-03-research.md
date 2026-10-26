# Step 4 of 6: research

Goal: you know what their customers search for and ask, what's in season, and what their competitors do well on each platform, saved on the Research page, and you've built them a skill of their own from it.

## 1. Ask about competitors

Ask once, in one message:

> Who are your main competitors? 3 to 5 names or links is perfect: businesses that do what you do, near you or online. If you're not sure, say so and I'll suggest some, and you can tell me which are right.

- They give names or links: save them in `apps/content/data/content.json` under `research.competitors` (name, url if you have it) and in `context/content.md` under "Competitors".
- They have none: search the public web for their trade and area, and suggest 4 or 5 (name and what they do). Ask which to keep. Say honestly if you're not sure a business is a real competitor.

## 2. Say what's about to happen

Plainly, in 2 sentences:

> I'm going to look at what people search for and ask about what you do, what's in season, and what your competitors post. I only read public pages: I never log in anywhere, follow anyone or message anyone. It takes a few minutes.

## 3. Run the research

Follow `.claude/skills/research-my-market`. It reads the public web only, fills the Research page, records where each finding came from, and ends by running `.claude/skills/build-my-content-skill`, which builds their own skill. If a platform wouldn't let you read a page, tell them which and that you've left it out. Never guess.

## 4. Show them

Open the app (follow `.claude/skills/open-task-list` if it isn't running), go to Research, and walk through it in a few plain lines: what people search for (and the one or 2 that stand out), what's in season, what the competitors do well, and what works on each of their platforms. Point at "Make it an idea" on a search, and at the Platforms page, where any platform you'd suggest is marked "Recommended for you".

## 5. The skill

Tell them in one or 2 sentences:

> I've saved what I learned as a skill of your own, called [name]. It already works here. I've also packed it up in the skills-to-upload folder, so you can add it to the Claude app and use it anywhere. The steps are in that folder.

Don't make them do it now. Offer once to open the folder.

Tick this step in `setup/progress.md`.
