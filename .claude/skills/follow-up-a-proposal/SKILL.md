---
name: follow-up-a-proposal
description: Writes a friendly, specific follow-up for a proposal that's been sent and gone quiet, in the person's voice, ready for them to open and send. Use when they say "chase Marlow", "follow up the proposal", "who hasn't replied?", press Ask Claude for a follow-up in the app, and on every proposals check-in for proposals sent longer ago than chaseAfterDays.
---

# Follow up a proposal

A sent proposal with no reply is usually a busy client, not a no. A good follow-up gives them a real reason to reply and makes it easy.

## Steps

1. Read `apps/proposals/data/proposals.json`. Find proposals with `status: "sent"` where `sentAt` is at least `settings.chaseAfterDays` days ago (or the one they named).
2. For each one, check whether the client has already replied: if email is connected, search for messages from the contact since `sentAt`. If they replied, don't write a follow-up: tell the person what they said in one line, and if it's a clear yes or no, suggest marking it won or lost (never mark it yourself).
3. If there's no reply and no `followUp` written in the last `chaseAfterDays` days, write one into `followUp`: `{ "to", "subject", "body", "why", "createdAt" }`.
   - `subject`: a reply to the covering email's subject ("Re: Your website proposal").
   - `body`: short (under 80 words), warm, specific. A real reason to get in touch now: something from their folder or calls (a deadline they mentioned, the start date they wanted, a question they asked), not "just checking in". One easy next step ("Shall I hold the week of the 3rd for you?", "Would a 15 minute call help?"). Their voice, from `context/voice.md`, following `.claude/skills/human-email`. Their sign-off.
   - `why`: one sentence the app shows: why now.
   - The second follow-up (if a first was opened 7 or more days ago and still nothing): even shorter, and give them an easy way out ("If now isn't the right time, just say and I'll check back in the new year"). After 2, stop writing them and suggest they mark it lost or leave it.
4. If Task List OS is attached, add a suggested task "Follow up the proposal to <client>" with `source.tool: "proposals"` and the proposal id, unless one is already there.
5. Save safely: read right before writing, write the whole file, read it back and check it parses.
6. If someone is in the conversation, list who's due a follow-up, one line each, and tell them to press **Open the follow-up** on the proposal.

## Rules

- Never send it. The person opens it from the app, checks it and sends it.
- Never pressure, guilt or invent urgency. A discount or a deadline only if the person asked for one.
- No em dashes. Digits for numbers.
