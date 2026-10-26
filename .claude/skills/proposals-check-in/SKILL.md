---
name: proposals-check-in
description: The regular Proposal Writing OS check-in - finds new client folders and files, saves new client emails and calls into each client's folder, writes proposals that are waiting, and writes follow-ups for sent proposals gone quiet. Use when they say "check my proposals", "check in", "anything new?", on every scheduled run, and as part of another tool's check-in when Proposal Writing OS is attached.
---

# Proposals check-in

A short, regular sweep, so the person's only job is to drop things in client folders and check what you write. Be quick: do what's needed, change nothing else.

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
8. If someone is watching, a 1 to 3 line summary: "2 new files for Hollins, a proposal written for Ellis Joinery (ready to check), and a follow-up ready for Marlow Dental." If nothing changed, say so in one line.

## Rules

- Summaries and short quotes only, never whole emails or transcripts.
- Never send, reply, delete or archive anything in their email or call recorder.
- Never mark a proposal sent, won or lost by yourself.
