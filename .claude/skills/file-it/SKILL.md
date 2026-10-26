---
name: file-it
description: Files a document or attachment into the right place in the files folder, with a sensible name. Use when the person says "file this", "save this somewhere", "where should this go" or shares an attachment that needs a home.
---

# File it

## When to use

The person shares a document, attachment or file and wants it put away properly, or asks "where should this go".

## What you need

- The `files/` folder structure: `01-admin`, `02-clients`, `03-sales`, `04-marketing`, `05-finance`, `06-operations`, `07-team`, `08-projects`, `99-archive`. Each has a `README.md` describing what belongs there.
- `files/README.md`, which says where documents really live if they are actually kept in Google Drive, OneDrive or similar rather than this folder.
- `context/people.md` and `context/business.md`, to recognise client names and match them to existing folders under `02-clients`.

## Steps

1. Work out what the document is and who it is about. If it is client work, it belongs under `files/02-clients/<Client Name>/`. Otherwise, match it to the closest category folder, checking that folder's `README.md` if unsure.
2. Build the name: `YYYY-MM-DD short description.ext`, using the date on the document if there is one, otherwise today's date.
3. Check `files/README.md` first. If documents for this area are actually kept in a connected cloud drive rather than this folder, tell the person where to put it there instead of pretending to move anything.
4. Propose the destination and name to the person in plain English and wait for a yes.
5. Once they say yes, move or save the file there. If a file with that exact name already exists, do not overwrite it; add " v2" (then " v3" and so on) to the new one.
6. Confirm where it ended up.

## Rules

- Never delete a file, whatever the situation.
- Never overwrite an existing file.
- Never move a file before the person has said yes to the destination and name.
- If you are not sure which client a document belongs to, ask rather than guessing.

## What to say to the person

"This looks like the signed contract from Tom at Greenway Café. I'd file it as files/02-clients/Greenway Café/2026-10-06 signed contract.pdf, shall I go ahead?"

Or, if the real storage is elsewhere: "Your client files actually live in Google Drive, not this folder. I'd put this in the Greenway Café folder there, under 'Contracts'."

## If something is missing

If `files/README.md` has no entry for a cloud drive and the person says documents are actually stored elsewhere, ask them to confirm where, then suggest they add a line to `files/README.md` so this is clear next time. If no `02-clients` folder exists yet for a client, propose creating one, named after the client, and wait for a yes.
