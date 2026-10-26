---
name: check-client-folders
description: Looks through the client folders, adds new clients to the Proposal Writing OS app, notes what's in each folder and whether there's enough to write a proposal, and (if the person switched it on) writes proposals for new ready folders straight away. Use when they press Check for new folders (a scan request), say "check my client folders", "I've added a client", "anything new in my folders?", and on every proposals check-in.
---

# Check the client folders

The person's habit is simple: a folder per client, with everything about that client in it. Your job here is to notice new folders and new files, and keep the Clients page true.

## Steps

1. Read `apps/proposals/CLAUDE.md` if you haven't this conversation, then `apps/proposals/data/proposals.json`. Note `settings.clientsFolder` and `settings.autoWrite`.
2. **List the folders** in `settings.clientsFolder` (one level down; each folder is a client). Skip folders whose name starts with `_` or `.`, and `99-archive`. If their folders live elsewhere (see "Client folders" in `apps/proposals/CLAUDE.md`), list those.
3. **For each folder:**
   - Match it to a client in `clients` by `folder` (or by name, ignoring case). A new folder becomes a new client: `id` `c-` plus a slug of the name, `name` from the folder name (tidied: "hollins-lettings" becomes "Hollins Lettings"), `folder`, empty `contact`.
   - List its files. Any file that isn't in the client's `sources` yet: read it, and add it to `sources` with its `kind` (`call`, `notes`, `email`, `brief`, `document`, `proposal`, `other`) and a few words of `summary`.
   - Fill in what you've learned: `contact` (name, role, email), `summary` (one or 2 sentences: who they are and what they need).
   - Decide `ready`: is there enough to write a good proposal (who they are, what they need or what's hurting, roughly what kind of work)? If not, `ready: false` and `missing` in plain words. If yes, `ready: true` and `missing: []`.
   - Set `scannedAt` now.
4. **A client whose folder has gone** (moved or renamed): don't delete the client. Look for a folder with a similar name and update `folder`; if there isn't one, leave it and mention it.
5. **Write the new ones.** If `autoWrite` is true: for each client that is `ready`, has no proposal and no waiting write request, add a write request (`kind: "write"`, `clientId`, `status: "waiting"`, `addedAt`, `notes: ""`) and then follow `.claude/skills/write-a-proposal` for it. If `autoWrite` is false, leave them ready for the person to press Write proposal.
   - A client that **already has a proposal** but has new files since it was written: don't rewrite it. Mention it in your note ("2 new files in Hollins Lettings since the proposal was written").
6. Update `checkIn`: `lastRunAt` now, `foldersChecked` (how many folders you looked at).
7. Mark any waiting `scan` request `done`, `doneAt` now, with a `note` the app shows them: one plain line. "Found 2 new clients: Ellis Joinery (proposal written) and Bramble & Co (needs what they want help with)." Or "Checked 7 client folders. Nothing new."
8. Save safely: read right before writing, write the whole file, read it back and check it parses.

## Rules

- Never move, rename or delete anything in their folders. Never open anything that isn't in a client folder unless they asked.
- Summaries only in the data file. Never copy whole documents in.
- If a folder holds something sensitive that has nothing to do with a proposal (bank details, passwords, ID documents), don't read it further and don't list it; mention it once so they can move it.
