---
name: proposals-check-in
description: The regular Proposal Writing OS check-in - finds new client folders and files, saves new client emails and calls into each client's folder, writes proposals that are waiting, and writes follow-ups for sent proposals gone quiet. Use when they say "check my proposals", "check in", "anything new?", for a scheduled check-in, and as part of another tool's check-in when Proposal Writing OS is attached.
---

# Proposals check-in

A short, regular sweep, so the person's only job is to drop things in client folders and check what you write. It runs a few times a day, at the times the person agreed in setup step 11, or whenever they ask. Be quick: do what's needed, change nothing else.

## Steps

1. Read `apps/proposals/CLAUDE.md` if you haven't this conversation, then `apps/proposals/data/proposals.json`.
2. **Anything waiting?** Do every request with `status: "waiting"`, oldest first: `write` with `.claude/skills/write-a-proposal`, `change` with `.claude/skills/change-a-proposal`, `scan` with `.claude/skills/check-client-folders`.
3. **New things about clients**, since `checkIn.lastRunAt` (or the last 7 days the first time), if their email and call recorder are connected (`context/tools.md`):
   - Emails to or from a client's contact or business: save a short summary into that client's folder (`Emails with <name>.md`, adding to it rather than making a new file each time). Look out for a client confirming something (budget, scope, a yes): note it at the top.
   - Calls with a client: save the write-up into their folder (`<date> <call title> (<recorder>).md`), with the pain and goals in their words.
   - A new prospect asking for a proposal or a quote, with no client folder yet: make the folder, save what you have, and add the client.
   - If Pipeline OS is attached, also read its calls and deals, so you don't save the same call twice.
4. **Folders**: follow `.claude/skills/check-client-folders` (it writes proposals for new ready clients when `autoWrite` is on).
5. **A reply to a sent proposal**: if a client has replied, tell the person in one line what they said. A clear yes or no: suggest marking it won or lost (never mark it yourself; with Task List OS attached, add a suggested task).
6. **Gone quiet**: follow `.claude/skills/follow-up-a-proposal` for sent proposals older than `chaseAfterDays` with no reply.
7. Update `checkIn.lastRunAt` and save safely (read right before writing, write the whole file, read it back and check it parses).
8. **Connections.** For each app you read from in this check-in, set its `checked` in `apps/home/data/connections.json` to today, and if its status was `needs-attention`, set it back to `connected` (the read just worked). If a read failed, set it to `needs-attention` with what went wrong in `note`, keep the old `checked`, and say so in one line of your summary ("Couldn't read Fathom this time: it may need signing in again. There's a Fix it button on Home."). Do this in a scheduled run too.
9. If someone is watching, a 1 to 3 line summary: "2 new files for Hollins, a proposal written for Ellis Joinery (ready to check), and a follow-up ready for Marlow Dental." If nothing changed, say so in one line. If this is a scheduled run, say nothing unless a connection read failed; that is worth one line.

## Rules

- Summaries and short quotes only, never whole emails or transcripts.
- Never send, reply, delete or archive anything in their email or call recorder.
- Never mark a proposal sent, won or lost by yourself.
- If a connection fails, carry on with the others and record the failure under step 8.
