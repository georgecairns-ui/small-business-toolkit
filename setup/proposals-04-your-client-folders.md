# Step 8: your client folders

Goal: a folder for every current client or prospect who might need a proposal, each with everything about them in it, so Write proposal works with one click. You do the gathering; they don't have to file anything.

## 8.1 Where the folders live

From step 1, question 7:

- **Nowhere in particular, or a mix**: use `files/02-clients/` in this folder (the default, `settings.clientsFolder`).
- **A folder per client already, on this computer** (Documents, Desktop, a synced Google Drive, OneDrive or Dropbox folder): ask whether to use it where it is or copy it in.
  - Copy in (simplest, and the app's folder links just work): copy each client folder into `files/02-clients/`. Copy, never move.
  - Use it where it is: read it there (with their permission), and set each client's `folder` to the full path. Note it under "Where things really live" in `files/README.md`. `settings.clientsFolder` stays `files/02-clients` for new clients.
- **Only in the cloud** (Google Drive, OneDrive or Dropbox, not synced): connect that app first (8.2), then read through the connection and save summaries into folders in `files/02-clients/` (see 8.3).

## 8.2 Connect their cloud drive (only if client files live only in the cloud)

Skip this part if their client folders are on this computer or nowhere in particular.

| They use | Guide |
|---|---|
| Google Drive | `setup/connections/google-drive.md` |
| OneDrive or SharePoint with a work Microsoft account | `setup/connections/microsoft-365.md` (its SharePoint and OneDrive search) |
| Dropbox or anything else | No guide: find the route with `.claude/skills/connect-a-tool` (search Claude's connector directory for it) |

Follow the guide and `.claude/skills/connect-a-tool`: look up this session's connections (`session_connectors_status`), switch it on, reconnect it or point them to Connect, then prove it with one harmless read ("I can see a folder called 'Clients' with 9 folders in it").

An app with no connector gets this sentence, word for word with its name: "There's no Claude connector for [app], so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`, and ask them to download the client folders they want into `files/02-clients/` (or drop the files in), then use those.

Record it in `apps/home/data/connections.json` and `context/tools.md` (see `connect-a-tool`, part 3): `connected` with today's date in `checked` only after the read worked. If it still won't connect after the loop, record it as `needs-attention` (the Connections box on Home shows a Fix it button for it, so setup doesn't stall) and work from anything they can download or drop in for now.

## 8.3 Fill the folders

Find their current clients and prospects. Step 2 (`setup/02-connect-email-and-calendar.md`) already read the last 30 days of their email and saved a summary for each client or prospect it found in `files/02-clients/_found-in-email/`, with any proposal they've already sent. Don't read their email again for this: use those summaries, plus their calls, Pipeline OS if it's attached, and any client folders they already have. If step 5 found no email (their email was recorded `no-connector`, or they declined to connect it), there are no summaries: ask them "Who are you writing proposals for at the moment?" and use the names they give, with their calls, Pipeline OS and any client folders. Show them the list in one message, saying which ones already had a proposal from them, and ask which are live:

> I've found 6 people you're talking to about work: Hollins Lettings, Marlow Dental (you sent them a proposal on 14 October), Ellis Joinery, Bramble & Co, Kingsdown Physio and Rowe Accountants. Which of these might need a proposal? I'll set up a folder for each and fill it in.

For each one they say yes to:

1. Make `files/02-clients/<Client Name>/` (if it isn't there), or use their own folder for that client from 8.1.
2. Save in what you find about them, as short Markdown summaries with their key facts and exact words (never whole threads or transcripts):
   - `Emails with <name>.md`: move that client's summary from `files/02-clients/_found-in-email/` into their folder under this name. If the folder already has one, add the new summary to it. What they asked for, and what they **confirmed in writing** (budget, scope, dates, who decides), stay at the top, with any proposal they already sent.
   - `<date> <call title> (<recorder>).md` for each call: who was there, what they need, the pain in their words, numbers, timing, what was agreed.
   - Any files from the cloud (briefs, specs): a copy if they're small and it's allowed, otherwise a summary with a link.
3. Follow `.claude/skills/check-client-folders` to add them to the app, with what's in each folder and whether there's enough to write a proposal.

When every live client has its summary, move what's left in `files/02-clients/_found-in-email/` (the ones they said aren't live) into `files/99-archive/found-in-email/`, so nothing is lost, and remove the empty `_found-in-email` folder.

## 8.4 Tell them the habit

> From now on, anything about a client goes in their folder: notes after a call, their brief, a screenshot, anything. Or just tell me, or press Brain dump in the app and talk. When you want a proposal, press **Write proposal** on the Clients page. That's it.

Tick step 8 in `setup/progress.md`, noting how many client folders you set up.
