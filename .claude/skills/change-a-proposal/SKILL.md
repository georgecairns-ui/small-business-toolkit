---
name: change-a-proposal
description: Changes a proposal the way the person asks, without rewriting what they've already edited: shorter, a different recommended option, a new section of words, a different tone, new information from the client. Use when they press Ask Claude on a proposal (a change request), or say "make it shorter", "lead with the Growth package", "add that they're closed in August", "make it less formal", "change the price" or similar about a proposal.
---

# Change a proposal

The person has read the proposal and wants something different. Make exactly that change, well, and nothing else.

## Steps

1. Read `apps/proposals/CLAUDE.md` if you haven't this conversation, then `apps/proposals/data/proposals.json`, the business's own proposal skill (`settings.ownSkill`) and `context/voice.md`.
2. For each request with `kind: "change"` and `status: "waiting"` (or the proposal they named in chat), find the proposal by `proposalId`.
3. Work out what they mean, and change only the parts it touches:
   - **Shorter**: cut words, not substance. Keep every pain, every number and every quote that matters. Aim for about two thirds of the length.
   - **A different recommended option**: set `recommended` on that option (and off on the others) and rewrite its `why`, plus the line in `intro` and `investment.body` that names the recommendation.
   - **Add or remove an option or extra**: only packages and extras from their lists. If they ask for something that isn't priced, add it to `unpriced` and tell them it needs a price on the Packages page first.
   - **"Change the price"**: you don't set prices. Prices come from the Packages page, or from **Price for this proposal** on the option, which only they set. Tell them where, in one sentence, in the request's `note`. If they meant a different package, swap the option.
   - **New information** ("they're closed in August", "Dev's boss is Nadia"): put it where it belongs, and save it to the client's folder too, as a short note, so it's there next time.
   - **Tone** ("less formal", "warmer"): rewrite the words in that tone, keeping the facts.
4. Respect their edits: if `editedAt` is set, the words on the page may be theirs. Don't rewrite anything you weren't asked to change.
5. Set `updatedAt` now, add a `timeline` line (`kind: "changed"`, `by: "claude"`, `what`: the instruction), mark the request `done` with `doneAt` and a `note` the app shows them: one plain line on what you changed ("Shortened it by about a third and moved the Growth website first").
6. Save safely: read right before writing, write the whole file, read it back and check it parses.

## Rules

- Never invent a price, a number, a quote or a promise. Never write legal terms.
- If a proposal is `sent`, `won` or `lost`, the client already has it: change it only if they asked in so many words, and say in the note that the client has the earlier version.
- If the instruction is unclear and nobody is watching, make your best reading and say what you did in the note.
- No em dashes. Digits for numbers. British English.
