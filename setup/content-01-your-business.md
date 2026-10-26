# Step 2 of 6: your business, your voice and what you want to be known for (required)

Goal: you know what the business sells, the problems it solves for customers, what makes it different, who its customers are and where it works, and you have 3 to 5 themes to plan posts around. **Content Machine OS can't research or plan without this.** It's what you search for, what you write about and how you tell a useful post from a generic one. So this step is required: setup doesn't go past it until questions 1 to 3 are answered.

## 1. Work it out first

The person shouldn't start from a blank page. Before asking anything, quietly gather what you can:

- `context/business.md`, now filled in from step 1. Reuse it. Never ask something it already answers.
- Their **website**, if you can read web pages: services, who it's for, the town, case studies, how they describe themselves.
- Their public pages and posts, if they gave you a link in step 1.
- `context/sales.md`, if Pipeline OS is attached and it's filled in: what they sell, who to, the problems they solve.

Use what you find to draft answers. Mark anything you're unsure of "(my guess)".

## 2. Ask, one question at a time

Ask one question, wait for the answer, say what you've saved in one short line, then ask the next. Show your draft answer first where you have one, and let them correct it. Skip any question you already have a confident answer to, and say so.

1. **What do you sell?** "Each service or product, in plain words." (I've got: ...)
2. **What problems do your customers come to you with?** "In their words, as many as come to mind. What's usually going wrong when they get in touch?" (I've got: ...)
3. **What makes you different from the others who do the same thing?** "In your words. Why do people pick you?" (I've got: ...)
4. **Who are your customers?** "The kind of person or business, roughly how big, and who usually makes the decision." (I've got: ...)
5. **Where do you work?** "Your town, your area, or 'online, UK wide'."
6. **What's your name, and the business name?** Only if you don't already have them.

If they skip 1, 2 or 3, ask once more, kindly, and say why in one sentence:

> I do need these 3 before I can research your market: without them I don't know what your customers are searching for. A sentence each is plenty.

If they still don't want to answer, stop here. Note it in `setup/progress.md` ("Waiting for what they sell, the problems they solve and what makes them different") and leave this step unticked. The app shows "Let's set up your content machine" until it's done. Don't carry on with the rest of setup and pretend the plan works.

## 3. Save as you go

After each answer, save it, so nothing is lost if they stop:

- `context/content.md`: one section per question, in their words. If it doesn't exist (Content Machine OS was attached to another tool's folder), create it from this tool's `context/content.md` template first. Change its status line to `Status: filled in on <date>`.
- `apps/content/data/content.json`: `settings.businessName`, `settings.ownerName`, and `settings.about` (`sells`, `problems` as a list of short phrases, `different`, `who`, `where`).
- If `context/business.md` is still thin, add to it from the same answers. Never overwrite what's there.

## 4. Choose 3 to 5 themes

A theme is a thing they want to be known for. Suggest 4 from what they've told you, one line each, and ask what to change. Good themes are about the business, not about marketing: "Real work", "Questions customers ask", "Behind the scenes", "Local and seasonal", "Tips and how-tos". Save the final list to `settings.themes` and under "Themes" in `context/content.md`.

## 5. Your voice

Posts only work if they sound like the person. Check `context/voice.md`:

- Filled in: tell them you'll use it, and move on.
- Not filled in: offer `.claude/skills/write-like-me` in learn mode, once, in one sentence. It needs their permission to read 10 to 20 recent sent emails, or a few things they've written that they're proud of, such as past posts, their website text or a newsletter. They can paste examples instead. If they'd rather do it later, that's fine: say posts will use a plain, human default until they do, and note it in `setup/progress.md`.

## 6. Check it with them

Read it back in 4 or 5 lines and ask what's wrong:

> Here's how I understand your business. You design brand identities and websites for small independent businesses in Bristol. Customers come to you because their brand looks home-made next to their work. What's different is that you're 2 people and you do everything yourselves. I'll plan posts around 4 themes: real work, questions customers ask, behind the scenes and local news. Anything I've got wrong?

Fix what they correct. Tick this step in `setup/progress.md`.

## Keeping it current

From now on, `.claude/skills/keep-context-fresh` keeps `context/content.md` up to date: when a new service, kind of customer or what-makes-us-different turns up, suggest a one-line change and make it once they agree.
