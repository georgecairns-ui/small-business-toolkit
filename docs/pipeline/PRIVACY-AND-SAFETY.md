# Privacy and safety

Plain answers to the questions people ask before connecting their email.

## Where is my information kept?

In this folder on your computer, and in the apps you already use. Pipeline OS has no account, no server and no database. Your deals are one file: `apps/pipeline/data/pipeline.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your deals and notes too, so keep it in a private part of your drive.

## What can Claude do with my email?

Read it, to spot enquiries and replies, and write emails for you to check. Claude only sends an email when you've pressed **Claude emails**, checked it and pressed **Send**, and only if you agreed to that during setup (you can turn it off in Preferences). It sends exactly what you saw, from your own email. It never replies, forwards, deletes, archives or tidies anything by itself.

The same goes for your calendar, accounts and other apps: Claude reads and drafts. It doesn't pay, book, post, accept or change anything for you. If you ever ask it to do one specific thing (for example "add this meeting to my calendar"), it confirms the exact thing first.

## What about my call recordings?

If you connect your call recorder, Claude reads the summaries and transcripts of your sales calls to update each deal: a short write-up, the deal check, your next steps and a follow-up email draft. It never sends a note-taker to a meeting, shares a recording or invites anyone. Full transcripts stay in your recorder; only the short write-up goes into your pipeline.

Call notes you paste into a deal are kept on that deal in your pipeline file, so Claude can read them. A text file you choose is read on your computer; it isn't uploaded anywhere.

## What happens when I press Draft or Add to calendar?

Draft opens a new email in Gmail, Outlook or your email app, already written and addressed. Nothing is sent until you press send there. Emailing a group from People works the same way, with everyone in Bcc so nobody sees anyone else's address. Add to calendar opens a new event, already filled in, for you to save. The pipeline app itself never sends anything and holds no passwords: it asks Claude, on your computer, to send the emails you approve.

## Does Claude look people up?

Before a sales call, Claude looks up the person and their business on the web: their own website, a web search, Companies House, and what's public on LinkedIn. It never signs in to LinkedIn or uses your account to look, and it sticks to work facts (their role, their business), never anything personal. It notes its sources so you can check. LinkedIn messages are written for you to paste and send yourself; LinkedIn doesn't allow them to be sent automatically.

## Does Claude keep copies of my emails?

No. When Claude spots an enquiry or a reply from a prospect, it adds a one-line summary to the deal and notes where it came from (who it was from, the subject and the date). It doesn't copy the email into this folder. When it learns your writing style, it keeps notes on your style, not your emails.

## What about passwords and keys?

Claude never asks for your passwords. When you connect an app, you sign in on that app's own screen. If an app needs a key (a long code for a direct connection), Claude gives you one line to paste into the Terminal. It asks for the key and stores it in your computer's secure keychain (on Windows, your user settings). The key never goes into the chat or into this folder.

## Can I see what's connected and switch it off?

Yes. `context/tools.md` lists every connected app and what Claude may do in each. To disconnect an app, remove it in the Claude app's settings (usually under Connectors), and ask Claude to update the list.

## What is the helper?

Your pipeline app runs from a small program in your Small Business Toolkit OS folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your pipeline file, keeping a backup before every save. When you add call notes, it can start Claude Code on your computer to read them, for that one job only, and only when the app itself asks. Claude can make it start with your computer, and you can turn that off any time by asking Claude.

## Does it run when I'm not there?

Only if you turn on hourly check-ins during setup. Then the Claude app checks your inbox, calls and calendar every hour during your working day, while your computer is on and the app is open. It uses a little of your Claude allowance each time. You can pause it in the Claude app.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Pipeline OS, can't see your folder, your deals or your email.

## The approve button

Nothing Claude suggests goes on your list until you click Approve. Skip something and it's gone, and Claude won't suggest it again. That's deliberate: you stay in charge of your day.
