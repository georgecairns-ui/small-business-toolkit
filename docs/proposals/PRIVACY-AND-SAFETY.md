# Privacy and safety

Plain answers to the questions people ask before connecting their email.

## Where is my information kept?

In this folder on your computer, and in the apps you already use. Proposal Writing OS has no account, no server and no database. Your proposals, packages and client list are one file: `apps/proposals/data/proposals.json`. Everything about each client is in their folder in `files/02-clients/`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your proposals and client folders too, so keep it in a private part of your drive.

## What can Claude do with my email?

Read it, so it knows what each client asked for and confirmed in writing, and write emails for you: the covering email for a proposal and a follow-up when a client goes quiet. Claude never sends anything. You open each email from the app in Gmail, Outlook or your email app, attach the PDF, check it and press send yourself. Claude never replies, forwards, deletes, archives or tidies anything.

The same goes for your other apps: Claude reads. It doesn't pay, book, post, accept or change anything for you. If you ever ask it to do one specific thing, it confirms the exact thing first.

## What about my call recordings?

If you connect your call recorder, Claude reads the summaries and transcripts of your calls with clients, and saves a short write-up into each client's folder: what they need, what's hurting, in their own words, and what was agreed. It never sends a note-taker to a meeting, shares a recording or invites anyone. Full transcripts stay in your recorder.

## Does Claude keep copies of my emails?

No. It saves a short summary of the emails with each client into their folder, with the key facts and the exact words that matter (for example what they confirmed about budget or dates). It doesn't copy whole emails. When it learns your writing style, it keeps notes on your style, not your emails.

## Will Claude make up prices or promises?

No. Every price in a proposal comes from your own packages on the Packages page, and the app works out the VAT and totals. If a client asks for something that isn't on your price list, Claude leaves it out and flags it for you to price. Anything a client didn't tell you (a budget, a deadline, who decides) is listed for you to fill in, never guessed. Claude never writes legal terms: a proposal only includes your own terms, word for word, and you should have them checked by a solicitor.

## What happens when I press Save as PDF or Open the covering email?

Save as PDF opens your computer's print window: choose "Save as PDF" and save it (in the client's folder is best). Open the covering email opens a new email in Gmail, Outlook or your email app, already written and addressed. Nothing is sent until you press send there. The app itself never sends anything and holds no passwords.

## What about passwords and keys?

Claude never asks for your passwords, and setup uses no keys. Apps connect through Claude's Connectors: you sign in on each app's own page, never in the chat or in this folder. If an app has no Claude connector, Claude reads a CSV or PDF export of it instead: you drop the export in the files folder and Claude reads it whenever you ask.

## Can I see what's connected and switch it off?

Yes. `context/tools.md` lists every connected app and what Claude may do in each. To disconnect an app, remove it in the Claude app's settings (usually under Connectors), and ask Claude to update the list.

## What is the helper?

Your proposals app runs from a small program in your Small Business Toolkit folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your proposals file, keeping a backup before every save. When you press Write proposal, Ask Claude or Check for new folders, it starts Claude Code on your computer for that one job only, and only when the app itself asks. Claude can make it start with your computer, and you can turn that off any time by asking Claude.

## Does it run when I'm not there?

Only if you choose check-ins during setup; you can skip them. Then the Claude app checks your client folders, emails and calls a few times a day, at the times you agreed, while your computer is on and the app is open. It uses a little of your Claude allowance each time, and it only reads your apps; it never sends or changes anything in them. You can pause it in the Claude app.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Proposal Writing OS, can't see your folder, your proposals or your email.
