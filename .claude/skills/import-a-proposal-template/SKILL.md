---
name: import-a-proposal-template
description: Learns from the person's own proposal template or past proposals (Word, PDF, Pages, Google Docs, Canva, a link or a screenshot) so every proposal follows their exact order, headings, wording and look. Saves what it learns, sets up the app's sections and look to match, then rebuilds their proposal skill. Use during setup (step 4), or when they say "here's our template", "copy this proposal", "make it look like this one", "use our old proposal format".
---

# Import a proposal template

Many businesses already have a proposal they're proud of, or a template their clients know. Copy what makes it theirs: the order, the headings, the standard wording, the look. Their template wins over Proposal Writing OS's defaults.

## 1. Get the files

Ask once, in one message (skip it if they've already given you something):

> Have you got a proposal you're proud of, or a template you always use? Drop it in here, put it in the **files/03-sales/proposals** folder, or send me a link. Word, PDF, Pages, Google Docs or Canva are all fine. 2 or 3 recent ones are even better.

- Save copies in `files/03-sales/proposals/templates/` (make the folder). Never move or change their originals.
- A Google Docs, OneDrive or Canva link: read it through the connection if there is one; otherwise ask them to download it as a PDF or Word file and drop it in.
- Word: if you can't read `.docx` directly, unzip it and read `word/document.xml`, or convert it to text with what's on the computer (`textutil -convert txt` on a Mac). Pages: ask for a PDF export.
- If they have none, say that's fine (Proposal Writing OS's layout is a good start) and stop here.

## 2. Learn from it

Read every file properly, and look at it (open the PDF pages, or screenshots) for the look. Work out:

- **The order and headings** of their sections, mapped to Proposal Writing OS's 7: `about` (who the client is), `challenge` (the problem), `solution` (how they'll fix it), `delivery` (how it's run), `investment` (options and prices), `next` (next steps), `terms` (their terms). Use their headings as the labels ("Your situation", "Our approach", "Investment"). A section they never have: switch it off. A section of theirs that doesn't map (case studies, team bios, "Why us"): note it, and fold it into the nearest section as their own skill will describe (case studies usually sit in `solution`; team bios in `delivery`).
- **Standard wording** they reuse word for word: how they open, their guarantee, their "why us" paragraph, their sign-off, their next steps, their terms. Copy these exactly.
- **How they price**: packages, tiers, day rates, a fixed fee, monthly. Check every package and price they show against `packages` in `apps/proposals/data/proposals.json`; add any that are missing **only if they confirm the price is current** (old proposals often have old prices).
- **Tone and length**: formal or friendly, "we" or "I", how long each section runs.
- **The look**: main and accent colours (hex values), heading and body fonts, whether the cover is a full colour page or white, where the logo sits, any rules or boxes they use.

## 3. Save it and set it up

1. **`context/proposals.md`**: fill in "Your template" with the order and headings, the standard wording (exactly), how they price, tone and length, and anything that doesn't map. Change the status line to `Status: filled in on <date>`.
2. **The sections**, in `settings.sections` of `apps/proposals/data/proposals.json`: their order, their labels, theirs on and the rest off. Tell them they can change these in Preferences.
3. **The look**: follow "The proposal's look" in `setup/proposals-01-your-brand.md` (it sets `apps/proposals/brand/brand.css` and `settings.brand`), using the template's colours, fonts and cover style. If the template's look differs from their website, ask once which they want proposals to follow.
4. `settings.template`: `{ "name": "<their file name>", "importedAt": "<now>" }`.
5. Save safely: read right before writing, write the whole file, read it back and check it parses.
6. **Rebuild their proposal skill**: follow `.claude/skills/build-my-proposal-skill`, so the template is in it.

## 4. Show them

Tell them in 3 or 4 lines what you learned ("Your proposals open with 'Your situation', price as 3 tiers with the middle one marked as most popular, and always end with your 30 day guarantee. I've set the app up the same way."), and offer to write a proposal for a real client now so they can compare it with their template.

## Rules

- Never copy another client's name, details or prices from an old proposal into a new one. Templates teach the shape and the standard wording, not the contents.
- Never change their legal terms. Copy them exactly, or not at all.
- Only use fonts that are free to use (see `match-my-brand`).
- No em dashes. Digits for numbers.
