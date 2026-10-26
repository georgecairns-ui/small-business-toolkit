# Step 8: your client folders

Goal: a folder for every current client or prospect who might need a proposal, each with everything about them in it, so Write proposal works with one click. You do the gathering; they don't have to file anything.

## 8.1 Where the folders live

From step 1, question 7:

- **Nowhere in particular, or a mix**: use `files/02-clients/` in this folder (the default, `settings.clientsFolder`).
- **A folder per client already, on this computer** (Documents, Desktop, a synced Google Drive, OneDrive or Dropbox folder): ask whether to use it where it is or copy it in.
  - Copy in (simplest, and the app's folder links just work): copy each client folder into `files/02-clients/`. Copy, never move.
  - Use it where it is: read it there (with their permission), and set each client's `folder` to the full path. Note it under "Where things really live" in `files/README.md`. `settings.clientsFolder` stays `files/02-clients` for new clients.
- **Only in the cloud** (Google Drive or OneDrive, not synced): read through the connection, and save summaries into folders in `files/02-clients/` (see 8.2).

## 8.2 Fill the folders

Find their current clients and prospects: from their sent email (the last 8 weeks: anyone they're quoting, scoping or discussing work with), their calls, Pipeline OS if it's attached, and any client folders they already have. Show them the list in one message and ask which ones are live:

> I've found 6 people you're talking to about work: Hollins Lettings, Marlow Dental, Ellis Joinery, Bramble & Co, Kingsdown Physio and Rowe Accountants. Which of these might need a proposal? I'll set up a folder for each and fill it in.

For each one they say yes to:

1. Make `files/02-clients/<Client Name>/` (if it isn't there).
2. Save in what you find about them, as short Markdown summaries with their key facts and exact words (never whole threads or transcripts):
   - `Emails with <name>.md`: what they asked for, and what they **confirmed in writing** (budget, scope, dates, who decides) at the top.
   - `<date> <call title> (<recorder>).md` for each call: who was there, what they need, the pain in their words, numbers, timing, what was agreed.
   - Any files from the cloud (briefs, specs): a copy if they're small and it's allowed, otherwise a summary with a link.
3. Follow `.claude/skills/check-client-folders` to add them to the app, with what's in each folder and whether there's enough to write a proposal.

## 8.3 Tell them the habit

> From now on, anything about a client goes in their folder: notes after a call, their brief, a screenshot, anything. Or just tell me, or press Brain dump in the app and talk. When you want a proposal, press **Write proposal** on the Clients page. That's it.

Tick step 8 in `setup/progress.md`, noting how many client folders you set up.
