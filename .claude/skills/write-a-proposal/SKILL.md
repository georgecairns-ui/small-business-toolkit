---
name: write-a-proposal
description: Writes a complete client proposal in the business's own brand, packages and voice, from everything in the client's folder plus their emails, call recordings and notes. Use when the person presses Write proposal or New proposal in the app (a write request), says "write a proposal for Hollins", "write the proposal for files/02-clients/Ellis Joinery", "turn this call into a proposal", pastes call notes and asks for a proposal, or when check-client-folders finds a new client folder that's ready.
---

# Write a proposal

This is the whole point of Proposal Writing OS: the person puts everything about a client in one folder, and you write the proposal. Do all of it yourself. Nobody is watching when the app starts you, so don't ask questions: make your best reading, and put anything you couldn't find in `gaps` so they see it.

The proposal follows one story, the same every time: **who they are, what's hurting, how we'll fix it, how we'll deliver it, the options (one recommended), and what happens next.** The client should finish it thinking "they really listened".

## 1. Read how this business writes proposals

1. `apps/proposals/CLAUDE.md`: the data format and the rules. Read it if you haven't this conversation.
2. The business's own proposal skill: `settings.ownSkill` in `apps/proposals/data/proposals.json` names it (`.claude/skills/<name>/SKILL.md`). It holds their tone, their section wording, their packages and when to recommend each, their onboarding steps and anything their template does. **Where it differs from this file, it wins** (except the rules at the end, which never bend).
3. `context/proposals.md` (how they write proposals and onboard clients), `context/sales.md` (what they sell, who to, the problems they solve), `context/voice.md` (how they write) and `context/business.md`.
4. `packages`, `extras` and `settings` in `apps/proposals/data/proposals.json`.

If there's no own skill yet, use `context/` and this file.

## 2. Find the client and everything about them

From the request (`clientId`), or from what they said ("Hollins", a folder path, a pasted note):

1. **The client record** in `clients`. If there isn't one, add it (see `apps/proposals/CLAUDE.md`, "A client"), with `folder` `<settings.clientsFolder>/<Client Name>`.
2. **The client's folder.** Make it if it doesn't exist. Read everything in it: notes, transcripts, emails saved as files, briefs, PDFs, Word documents, spreadsheets, images (look at them), old proposals. Read the newest first.
3. **Notes from the app.** If the request has `notes`, save them into the folder first as `<date> notes from the app.md` (with `fileName` in the title if there was one), so nothing lives only in the request. Then read them like any other file.
4. **Their email**, if connected (`context/tools.md`): search for threads with the client's contact and their business's domain from the last 6 months. Look especially for what they confirmed in writing: budget, scope, dates, who decides. Save a short summary into the folder as `Emails with <name>.md` (key facts and the exact words that matter, never whole threads).
5. **Their call recorder**, if connected: find calls with this client (by name, email or business). Read the transcripts. Save each as `<date> <call title> (<recorder>).md` in the folder: who was there, what they need, the pain in their own words (exact quotes), numbers, timing, objections, what was agreed.
6. **Pipeline OS**, if attached (`apps/installed.json`): the client's deal (summary, the deal check, calls, `alsoHelp`). Link it with `pipelineDealId`.
7. **Their website**, if you know it and can browse: a quick look at what they do, so "About you" is right.

Update the client's `sources`, `contact`, `summary` and `scannedAt` as you go.

**Is there enough?** You need: who they are, what they need or what's hurting, and roughly what kind of work it is. If you don't have that, don't write a thin proposal: set the client's `ready: false` and `missing` (plain words), mark the request `done` with a `note` saying what you need ("There isn't enough in Bramble & Co's folder yet. Add what they want help with and roughly their budget, then press Write proposal."), and stop.

## 3. Work it out before you write

On a scratch basis (don't save this anywhere), answer:

- **Who are they?** Business, size, people, what they're proud of, where they're heading.
- **What's hurting, in their words?** 2 to 4 pains. For each: what's happening, what it's costing them (their numbers if they gave any), and an exact quote if there is a good one. This is the heart of the proposal.
- **What do they want to be true?** The goal, in their terms.
- **What fixes it?** How the business's services solve each pain, one by one.
- **Which packages fit?** 1 to 3 from `packages`. Recommend the one that actually gets them to their goal, using the rules in their own skill or `context/proposals.md`. Not the cheapest or the dearest by default. If only one package makes sense, offer one.
- **Anything they asked for that isn't priced?** It goes in `unpriced`, not in the options.
- **What's missing?** Budget, decision-maker, deadline, a detail you'd need: `gaps`.

## 4. Write it

Add the proposal to `proposals` with `status: "writing"` first (so the app shows it's on its way), then fill it in and set `status: "draft"`. Follow the format in `apps/proposals/CLAUDE.md`, "A proposal".

- **Cover.** `title`: a promise in the client's terms ("A website that books valuations while you sleep"), never "Proposal for X". `subtitle`: what it is, plainly. `preparedFor`: the contact's name, role and business.
- **Opening note (`intro`).** From the person to the contact, 2 to 4 short paragraphs: thanks for the conversation, what you heard (the pain in their words), what this proposal sets out, and which option you recommend. Warm and specific. The app adds "Dear <first name>," and the sign-off.
- **About you.** Who they are and where they're heading, in 2 short paragraphs, plus 3 to 4 `points` of what they told you matters. Show you listened; don't flatter.
- **What's getting in the way (`challenge`).** One line on the big picture, then 2 to 4 `pains`: a short title, the detail with their numbers, and their exact words in `quote` when you have them. Never make up a quote or a number.
- **How we'll fix it (`solution`).** One line on the approach, then 3 to 5 `points`, each tied to a pain.
- **How we'll deliver it (`delivery`).** How the work runs from yes to done: 3 to 5 `phases` (`when`, `name`, `detail`), from their process in `context/proposals.md` and the package's `timeline`. Who they'll deal with, how often you'll check in, what they need to do.
- **Your options (`investment`).** One or 2 sentences on the choice and why you recommend the one you do. `options` by `packageId`, exactly one `recommended: true`, with a `why` tied to their pain and goal. Add `extras` that genuinely fit. **No numbers in the words**: the app shows every price, VAT, total and the date it's valid until.
- **Next steps (`next`).** What happens when they say yes: 3 to 5 `steps` from their onboarding process in `context/proposals.md` (agreement, invoice, kick-off, what to send). The app adds "Ready to go ahead?" with the sign-off's contact details.
- **Terms.** Only if `terms` is on: their own standard terms, word for word, from `context/proposals.md` or the file it points to. Never write or change legal terms. If they have none, leave it empty.
- **Covering email (`coverEmail`).** To the contact, short, in their voice: here's the proposal (attached), the one-line version, an easy next step. Follow `.claude/skills/human-email`.
- **`sources`, `gaps`, `unpriced`, `timeline`** (`{ "at": now, "kind": "written", "by": "claude" }`).

Use their section labels (`settings.sections`) when you refer to a section, and leave out any section that's switched off. Write in their voice from `context/voice.md`: British English, plain words, short sentences, digits for numbers, no em dashes, no hype ("transformative", "cutting-edge", "seamless", "game-changer"). Keep it short: most sections fit half a page. If they gave you a template (`settings.template`), follow its order, headings and phrasing as their own skill describes.

If this client already has a proposal: write a new one (a new id), don't overwrite the old one, unless the request says to change it.

## 5. Finish

1. Set the proposal's `status` to `draft`, `createdAt` and `updatedAt` now.
2. Mark the request `done`, with `doneAt` and `proposalId`.
3. Update `checkIn.proposalsWritten` (add 1) and add an `activity` line (`type: "written"`).
4. Save safely (read right before writing, write the whole file, read it back and check it parses).
5. If Task List OS is attached, add a suggested task: "Check the proposal for <client>" with `source.tool: "proposals"` and the proposal id.
6. If someone is in the conversation with you, tell them in 2 lines: it's ready on the Proposals page, which option you recommended and why, and anything in "Needs a price" or "Claude couldn't find" for them to look at.

## Rules that never bend

- Never invent a price, a number, a quote, a date or a promise. Prices come only from their packages (the app works them out); anything else nobody said goes in `gaps`.
- Never write or change legal terms. Only their own terms, word for word.
- Never send anything. The person approves it, saves the PDF and sends it.
- Never put whole emails or transcripts into the proposal or the data file. Summaries and short quotes only.
- Never name or criticise a competitor unless the client did and it helps them decide.
- No em dashes. Digits for numbers. British English.
