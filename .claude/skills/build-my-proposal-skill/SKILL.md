---
name: build-my-proposal-skill
description: Builds (or rebuilds) the business's own proposal skill, named after the business, from everything setup learned: their brand, packages and prices, how they write, their template, how they deliver and onboard, and when to recommend each package. Saved in this folder and packed up to add to Claude, so their proposals come out right everywhere. Use at the end of setup (step 10), and whenever they say "rebuild my proposal skill", "we've changed our packages", "update how you write proposals", or after importing a template.
---

# Build my proposal skill

`write-a-proposal` is general. This skill is about **their** business: it's what makes every proposal sound like them, price like them and run the way they work. `write-a-proposal` reads it first, and it wins wherever it's more specific.

## 1. Gather what you know

Read, and don't ask anything these already answer:

- `context/business.md`, `context/sales.md` (what they sell, who to, the problems they solve, who isn't a fit), `context/voice.md`, `context/proposals.md` (their template, standard wording, delivery and onboarding).
- `apps/proposals/data/proposals.json`: `packages`, `extras`, `settings` (sections, VAT, payment terms, valid days, sign-off, brand).
- Any proposals they've approved or won in `proposals`: what did they change after you wrote them? (Compare with `timeline` and `editedAt`.) Those changes are the best guide to what they like.

If you're missing either of these, ask in one short message (skip what you know):

> 2 quick things so I recommend the right package every time:
> 1. When do you recommend each of your packages? (For example: "Growth website for anyone who takes bookings", "Website refresh when the site's under 3 years old".)
> 2. What happens when someone says yes? The steps from yes to starting (agreement, deposit, kick-off call, what they need to send you).

Write their answers into `context/proposals.md`.

## 2. Write the skill

Name it after the business: `<business-name>-proposals` (lowercase letters, numbers and hyphens, 64 characters at most), for example `fern-and-finch-proposals`. If one already exists (`settings.ownSkill`), rewrite that one in place, keeping anything they've added by hand.

`.claude/skills/<name>/SKILL.md`, under 200 lines:

```
---
name: <name>
description: How <Business> writes proposals: <one line on what they sell and who to>. Use whenever writing, changing or reviewing a proposal, quote or scope of work for <Business>, including "write a proposal for...", "quote for...", "turn this call into a proposal".
---

# <Business> proposals

## Who we are                     (2 or 3 lines: what they do, for whom, where)
## Our packages and when to recommend each
                                   (every package: name, price and billing, what's included, timeline, who it's for,
                                    and the rule for recommending it. Extras and their prices. VAT, payment terms,
                                    how long a proposal is valid)
## The story every proposal tells (their section order and headings, what goes in each, how long)
## How we sound                    (tone, "we" or "I", phrases they use, phrases they never use, sign-off; 2 or 3 short examples of their own sentences)
## Our standard wording            (anything they reuse word for word: the opening, guarantee, why us, next steps)
## How we deliver                  (their process from yes to done, phases, who the client deals with, check-ins)
## When someone says yes           (their onboarding steps)
## Our look                        (main and accent colours with hex values, fonts, cover style, logo; for when a proposal is made outside the app)
## Rules                           (never invent a price, number or quote; prices only from the list above; anything not on it is flagged
                                    for pricing; legal terms only ever their own, word for word; no em dashes; British English)
## Example                         (a short example: a made-up client's pain, the recommended package and why, in their voice)
```

**Make it stand on its own.** Uploaded to Claude, a skill can't see this folder, so never point at `context/` or `apps/`. Copy the facts into the skill itself: the packages with prices, the steps, the tone, the wording. Use their real details, never placeholders.

## 3. Save it in both places

1. `.claude/skills/<name>/SKILL.md`: it works here straight away, and `write-a-proposal` reads it.
2. `skills-to-upload/<name>.zip`: a zip of the folder (the folder itself, with `SKILL.md` inside). On a Mac: `cd .claude/skills && zip -r "../../skills-to-upload/<name>.zip" "<name>"`. On Windows: `Compress-Archive -Path ".claude\skills\<name>" -DestinationPath "skills-to-upload\<name>.zip" -Force`. Replace an older zip of the same name.

Then:
- Set `settings.ownSkill` to `<name>` in `apps/proposals/data/proposals.json` (save safely).
- Add or update its line in `skills-to-upload/README.md` and in `context/tools.md` under "Your own skills".

## 4. Tell them

> I've built your own proposal skill, **<name>**. It holds your packages and when to recommend each, your proposal's story, your standard wording, how you deliver and how you sound, so every proposal I write comes out the way you'd write it. It already works here. To use it everywhere, including the Claude app on your phone, add it to Claude: **Customize**, then **Skills**, then **+**, **Create skill**, **Upload a skill**, and choose **<name>.zip** from the skills-to-upload folder.

Menus change: if what they see doesn't match, ask what they can see and help from there. Skills need a paid plan with code execution switched on (in **Settings**, under **Capabilities**).

When you rebuild it later, tell them in one line what changed, and that they should upload the new zip to Claude too (replacing the old one).
