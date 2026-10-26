---
name: who-to-chase
description: Finds the deals that have gone quiet in Pipeline OS and drafts a chase for each, in the person's voice, with a real reason to get back in touch (not "just checking in"). Each chase waits in Review: the person presses Claude emails (checks it, presses Send) or I'll do it. LinkedIn when there's no email. Used by pipeline-check-in, or when the person says "who should I chase?", "who's gone quiet?", "chase the Marlow deal".
---

# Who to chase

## What you need

- `apps/pipeline/data/pipeline.json`: open deals, `lastContact`, `settings.chaseAfterDays`, the timeline and the deal check.
- `context/voice.md`, `.claude/skills/human-email` and `.claude/skills/polite-chaser` for the tone.
- Their sent email, to check they haven't already chased.

## Steps

1. Find open deals with no contact for `chaseAfterDays` or more, and deals whose next step was waiting on the prospect and is now late. Skip deals with a sales call coming up, deals with a `chase` suggestion already waiting, and deals where the person chased in the last `chaseAfterDays` (check their sent email).
2. Most valuable and most likely first. At most 5 per run.
3. For each, draft a short chase that gives a reason to reply: answer the worry they last raised (price, timing), offer a smaller first step, share something useful (an example, a date that's filling up), or ask the deal check question that matters most. Never "just checking in". Follow `polite-chaser` for how firm to be (a first chase is light) and `human-email` for how it reads.
4. Add a `chase` suggestion: `title` "Chase Hannah about the brochure", `reason` one line with the facts ("No reply for 9 days after she asked for a lower price"), and the `email`. No email address but a public LinkedIn profile? Add a `linkedin` suggestion with the message instead (short, no links).
5. If a deal has had 3 chases with no reply, suggest a final, friendly "shall I close this for now?" email instead, and a `task` suggestion to mark it lost if there's still nothing.
6. If Task List OS is attached, add each chase as a suggested task there too (`source: { "tool": "pipeline", "id": "<deal id>" }`), with "The email is ready in Pipeline OS, on the deal" in the notes.
7. Save safely.

## What to say, when asked

"3 deals have gone quiet. I've drafted a chase for each: Marlow Dental (9 days, after a price question), ... They're in Review: press Claude emails to check one and have me send it, or I'll do it."

## Rules

- Never send a chase yourself. The person sends it, or presses Claude emails and Send, and then `send-approved-emails` sends it.
- Never chase someone who said no, or who asked not to be contacted.
