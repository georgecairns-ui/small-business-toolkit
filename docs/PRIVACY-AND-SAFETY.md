# Privacy and safety

Plain answers to the questions people ask before connecting their email.

## Where is my information kept?

In this folder on your computer, and in the apps you already use. The Small Business Toolkit has no account, no server and no database. Your tasks are one file: `apps/task-list/data/tasks.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your tasks and notes too, so keep it in a private part of your drive.

## What can Claude do with my email?

Read it, to spot things that need doing, and prepare draft replies for you to check. Claude never replies, forwards, deletes, archives or tidies your email by itself. The one exception is in Pipeline OS: if you agree to it during setup, Claude sends an email you've checked and pressed **Send** on, exactly as you saw it, from your own email. You can turn that off in Pipeline OS's Preferences.

The same goes for your calendar, accounts and other apps: Claude reads and drafts. It doesn't pay, book, post, accept or change anything for you, apart from the few things a tool does when you press its button and confirm: Money View OS puts an invoice into your accounts as a draft, and Ads OS builds a Meta campaign switched off or makes the one change you approved. Nothing ever moves money. If you ever ask it to do one specific thing (for example "add this meeting to my calendar"), it confirms the exact thing first.

## What about my call recordings?

If you connect your call recorder, Claude reads the summaries and transcripts to write each call up: a short summary, what was decided, your actions and a follow-up email draft. It never sends a note-taker to a meeting, shares a recording or invites anyone. Full transcripts stay in your recorder; only the short write-up goes into your task list.

## What happens when I press Draft or Add to calendar?

Draft opens a new email in Gmail, Outlook or your email app, already written and addressed. Nothing is sent until you press send there. Add to calendar opens a new event, already filled in, for you to save. The task list app itself never sends anything and holds no passwords.

## Does Claude keep copies of my emails?

No. When Claude spots a task in an email, it writes a short task title and notes where it came from (who it was from, the subject and the date). It doesn't copy the email into this folder. When it learns your writing style, it keeps notes on your style, not your emails.

## What about passwords and keys?

Claude never asks for your passwords. When you connect an app, you sign in on that app's own screen. If an app needs a key (a long code for a direct connection), Claude gives you one line to paste into the Terminal. It asks for the key and stores it in your computer's secure keychain (on Windows, your user settings). The key never goes into the chat or into this folder.

## Can I see what's connected and switch it off?

Yes. `context/tools.md` lists every connected app and what Claude may do in each. To disconnect an app, remove it in the Claude app's settings (usually under Connectors), and ask Claude to update the list.

## What happens to my voice notes?

When you press Voice note, your browser turns your speech into text as you talk. Chrome does this with Google's speech service, Edge with Microsoft's and Safari with Apple's, so your words pass through that company to become text, as they do with any dictation. No audio is kept: only the text is saved, in your brain dump. Claude then sorts the text into tasks on your computer. If you'd rather not use your browser's speech service, type into Brain dump instead.

## What is the task list helper?

Your task list app runs from a small program in your Small Business Toolkit folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your task file, keeping a backup before every save. Claude can make it start with your computer, and you can turn that off any time by asking Claude.

## Does it run when I'm not there?

Only if you turn on hourly check-ins during setup. Then the Claude app checks your inbox, calls and calendar every hour during your working day, while your computer is on and the app is open. It uses a little of your Claude allowance each time. You can pause it in the Claude app.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Task List OS, can't see your folder, your tasks or your email.

## The approve button

Nothing Claude suggests goes on your list until you click Approve. Skip something and it's gone, and Claude won't suggest it again. That's deliberate: you stay in charge of your day.

## Each tool's own answers

Every tool in your toolkit has its own page of plain answers, about what it reads and what it may and may not do:

- Pipeline OS: [docs/pipeline/PRIVACY-AND-SAFETY.md](pipeline/PRIVACY-AND-SAFETY.md)
- Skill and Folder Map OS: [docs/skill-map/PRIVACY-AND-SAFETY.md](skill-map/PRIVACY-AND-SAFETY.md)
- Proposal Writing OS: [docs/proposals/PRIVACY-AND-SAFETY.md](proposals/PRIVACY-AND-SAFETY.md)
- Content Machine OS: [docs/content/PRIVACY-AND-SAFETY.md](content/PRIVACY-AND-SAFETY.md)
- Money View OS: [docs/money/PRIVACY-AND-SAFETY.md](money/PRIVACY-AND-SAFETY.md)
- Ads OS: [docs/ads/PRIVACY-AND-SAFETY.md](ads/PRIVACY-AND-SAFETY.md)

Where a tool's page is stricter than this one, the stricter answer is the one Claude follows for that tool.
