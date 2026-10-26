# Step 6: build their own skills

Goal: 3 to 5 skills written for this business, saved twice: in `.claude/skills/` so they work here straight away, and as files in `skills-to-upload/` that they add to Claude, so the same know-how works in every Claude conversation, on their phone and on the web. This is the moment they see Claude learn their business, so make it feel like a gift, not homework.

A skill is a short set of instructions Claude follows for one job. The ones that come with Task List OS are general. These are about **their** services, **their** prices and **their** way of doing things.

## 6.1 Ask about their services

You already know a lot from step 5. Ask only what you don't know, in one friendly message:

> Now I'd like to build you a few skills: saved instructions that teach me how your business works, so I can quote, reply and plan the way you would. A few quick questions. Short answers are fine.
>
> 1. What are your main services or products? For each one: who it's for, roughly what it costs, and what's included.
> 2. When someone new gets in touch, what happens from the first message to the work being done?
> 3. What do you find yourself writing or explaining again and again? (Quotes, follow-ups, how you work, what to expect, chasing payment.)
> 4. Anything that always catches you out or takes longer than it should?

Write their answers into `context/business.md` (under "Services") and `context/routines.md`, so everything else you do uses them too.

## 6.2 Suggest the skills

From their answers and what you learned in step 5, suggest 3 to 5 skills, one line each, and ask which to build (the default is all of them). Choose from what this business actually does. Good candidates:

- **Their services**: what they sell, who for, prices and what's included, and how to answer an enquiry about each one.
- **Write a quote** (or proposal) in their format, with their prices and terms.
- **Reply to a new enquiry**: the questions they always ask and the next step they always offer.
- **Welcome a new client**: the steps and messages when someone says yes.
- **Their recurring process**: whatever they named in question 4 or `context/routines.md` (month-end invoicing, a weekly report, a booking confirmation).
- **Write like them**: their tone, phrases and sign-off from `context/voice.md`, so drafts sound like them anywhere.

Name each skill in plain words with hyphens, for example `fern-and-finch-quotes`. Lowercase letters, numbers and hyphens only, 64 characters at most.

## 6.3 Write each skill

For each one, write a folder with a `SKILL.md` inside, following the format of the skills in `.claude/skills/` (for example `.claude/skills/polite-chaser/SKILL.md`):

```
---
name: <skill-name>
description: <what it does and when to use it, in 1 or 2 sentences, under 1,000 characters. Include the phrases they'd actually say, such as "quote for a website".>
---

# <Title>

## When to use
## What you need to know   (the facts: services, prices, steps, tone, in full)
## Steps
## Rules
## Example
```

**Make each one stand on its own.** Uploaded to Claude, a skill can't see this folder, so never point at `context/` or `apps/`. Copy the facts it needs into the skill itself: the prices, the steps, the tone. Use their real details, never placeholders. If you don't know a price, write what they told you ("priced per project, usually £800 to £1,500") rather than inventing one. Keep each skill under 200 lines.

Save each skill in 2 places:

1. `.claude/skills/<skill-name>/SKILL.md`: it works in Claude Code in this folder straight away, and as a command, `/<skill-name>`.
2. `skills-to-upload/<skill-name>.zip`: a zip of the `<skill-name>` folder (the folder itself, with `SKILL.md` inside). On a Mac: `cd .claude/skills && zip -r "../../skills-to-upload/<skill-name>.zip" "<skill-name>"`. On Windows: `Compress-Archive -Path ".claude\skills\<skill-name>" -DestinationPath "skills-to-upload\<skill-name>.zip"`. Tell them in one sentence that you're packing the skills up so they can add them to Claude.

Add each skill to the table in `skills-to-upload/README.md` (name and one line on what it does), and list them in `context/tools.md` under "Your own skills".

## 6.4 Show them, then tell them how to add them to Claude

Try one straight away on something real, so they see it work. For example, draft a quote for a recent enquiry from their inbox using the new quotes skill, and show it in chat.

Then tell them, in your own words:

> I've built you 4 skills: your services, quotes, replying to new enquiries and welcoming a new client. They already work here. I've also saved them in the **skills-to-upload** folder inside Task List OS, so you can add them to Claude and use them everywhere, including the Claude app on your phone.
>
> To add them: open Claude (claude.ai or the Claude app) and go to **Customize**, then **Skills**. Press **+**, then **Create skill**, then **Upload a skill**, and choose a file from the skills-to-upload folder. Do it once for each file. It takes about a minute.

Menus change. If what they see doesn't match, ask them to describe it and help them find Skills from there. Skills need a paid plan with code execution switched on (in **Settings**, under **Capabilities**). If they can't see Skills, help them switch that on. Either way, the skills already work here in Claude Code.

Offer once: "Want me to open the folder for you?" If yes, open it in Finder or File Explorer.

Tick step 6, noting which skills you built.
