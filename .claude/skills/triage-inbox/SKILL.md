---
name: triage-inbox
description: Sorts the person's email like a good assistant would. Every new email is put in one of 4 piles; ones that need an answer get a reply drafted in the person's voice (shown in the app's Inbox with a Draft button), and requests become suggested tasks. Use from check-in or sort-my-day, or when the person says "triage my inbox", "check my email", "what needs a reply?".
---

# Triage the inbox

## What you need

- A connected email account (see `context/tools.md`). If there isn't one, say so and point to `setup/02-connect-email-and-calendar.md`.
- `apps/task-list/data/tasks.json` and `apps/task-list/CLAUDE.md` (the `replies` and task formats).
- `context/voice.md` and `context/people.md` for drafting.

## The 4 piles

| Pile | What it is | What you do |
|---|---|---|
| **Needs a reply** | Someone is waiting on an answer from the person: a question, a request for a quote, a date, an approval | Add to `replies` with a draft |
| **A task** | Something to do that isn't just a reply: an invoice to send, a document to sign, a booking to make, a promise the person made | Add a suggested task with `source` |
| **Just so you know** | Useful, nothing to do: a confirmation, a receipt worth keeping, news from a client | Count it. Mention it only if it changes something (a meeting moved) |
| **No action** | Newsletters, marketing, notifications, automated mail, CCs that ask nothing | Count it, nothing else |

An email can be both "needs a reply" and "a task" (Tom sends a signed contract: reply to thank him, and a task to send the deposit invoice). Link them with the task's `replyId`.

## Steps

1. Read the task file. Collect every `source.ref` and every reply `ref`, including dismissed ones, so you never repeat yourself.
2. Read new emails (since `triage.lastRunAt`, at most 50, newest first). Skip anything already handled.
3. Put each in a pile.
4. For **needs a reply**, add to `replies`:
   - `id` (`r-` plus 6 characters), `from` `{ name, email }`, `subject`, `receivedAt`, `personId` (link or add the person), `ref` (the message id), `threadUrl` if your connection gives a link to the email.
   - `why`: one line on what they need from the person ("Wants to move today's call to 2:30. You're free then.").
   - `summary`: 1 or 2 sentences in your own words. Never paste the whole email.
   - `urgency`: `high` if there's a deadline today or tomorrow, money is at stake, or it's from a key client and time-sensitive; `low` if it's a courtesy reply; otherwise `normal`.
   - `draft` `{ to, cc, subject, body }`: a reply that answers the actual question, in the person's voice (`context/voice.md`), following `.claude/skills/human-email`. Subject is "Re: " plus the original. If a fact only the person knows is missing (a price, a yes or no), leave a clear gap in square brackets, for example "[add the figure here]", rather than guessing.
   - `status: "waiting"`.
5. For **a task**, add a suggested task as described in `apps/task-list/CLAUDE.md`, with `source` `{ type: "email", from, subject, date, ref }`, a clear title, any amount or date in `notes` and `due`, and `personId`. At most 5 new tasks per run.
6. Count the piles into `triage` (see `.claude/skills/check-in` step 7).
7. Save safely.

## Rules

- Read only. Never send, reply, forward, delete, archive, label, mark as read or unsubscribe, even though the connection allows some of these. Drafts live in the task file; the person opens them with the app's Draft button.
- Save a draft into their mailbox only if they ask for that specific email.
- Be conservative with "needs a reply": if nobody is waiting on them, it isn't one. A short, accurate Inbox beats a long one.
- Never invent facts in a draft (prices, dates, promises). Use square-bracket gaps.

## What to say

"I've been through 23 new emails. 4 need a reply and I've drafted all of them (Dev's is urgent: he wants to move today's call). 2 have become tasks. The rest needed nothing from you."
