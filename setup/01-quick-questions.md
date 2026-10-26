# Step 1: quick questions

Goal: in one short exchange, learn what the person uses, so every later step is about their apps and nothing else.

## 1.1 Check what you can reach (quietly, before asking anything)

1. **This folder.** Read `setup/progress.md`, write a test line to its "Notes for next time" section, read it back and remove it. If you can't, stop and ask them to open this folder in Claude Code (`cd` into it and run `claude`), or give the Claude app access to it.
2. **Your connections.** List the tools you have right now. In Claude Code, the person can type `/mcp` to see them. Note any for email, calendar, call recording, files, accounts or CRM. Connectors added to their Claude account appear automatically in Claude Code when it's signed in with a Claude subscription.
3. **Where the folder lives.** From its path: Downloads or Desktop (suggest moving it to Documents first, because the task list app remembers the location), a cloud-synced folder (fine, it's backed up), or a folder shared with other people (point out that anyone with access can read their tasks).
4. **Their computer.** Mac or Windows, from the path or by running a harmless command.

## 1.2 Ask everything in one message

Open with what you found in 1.1, so they see you've already looked: "You've already got Gmail and Google Calendar connected to Claude, so I'll use those." Then send the questions as one friendly, numbered message. Skip anything you already know from 1.1 and say so. Tell them short answers are fine.

> To set this up properly I need to know a few things. Short answers are fine.
>
> 1. Your first name, your business's name, and in a sentence what it does.
> 2. Which email do you use for work? (Gmail or Google Workspace, Outlook with a work Microsoft account, Outlook.com or Hotmail, or something else.)
> 3. Which calendar? (Usually the same as your email.)
> 4. Do you record your calls or meetings? If so, with what? (For example Fathom, Fireflies, Otter, Granola, tl;dv, Read AI, Zoom, Microsoft Teams or Google Meet.)
> 5. Which other apps do you use for the business? For example accounts (Xero, QuickBooks, FreeAgent), customers and sales (HubSpot, Pipedrive, a spreadsheet), payments (Stripe), files (Google Drive, OneDrive), team chat (Slack, Teams), notes (Notion), bookings (Calendly).
> 6. Which days and hours do you usually work?
> 7. Is it just you, or do you hand work to anyone? (First names are enough.)
> 8. Would you like me to check your inbox, calls and calendar automatically every hour while you work, so your task list keeps itself up to date? (It uses a little of your Claude allowance and needs the Claude app open on your computer.)

## 1.3 Write it down

Fill in `context/tools.md`:
- "Your setup": computer, Claude version (Claude Code or the Claude app), workspace location, email provider, calendar provider, solo or team.
- "Connected apps": one row per app they named, with "How it's connected" left as "to do".
- Their answer to question 8 under "Notes".

Set `settings.yourName`, `settings.businessName`, `settings.dayStarts` and `settings.dayEnds` in `apps/task-list/data/tasks.json`, and `settings.emailProvider` (`gmail`, `outlook-work`, `outlook-personal` or `other`) and `settings.calendarProvider` (`google`, `outlook-work`, `outlook-personal` or `other`), so the app's Draft and Add to calendar buttons open the right place.

Tick step 1 in `setup/progress.md`.

## What to say

> Thanks Sam. Gmail and Google Calendar, Fathom for calls, Xero for accounts, and it's you plus Priya. I'll connect those in that order. Most of them are a couple of clicks: you sign in, I do the rest.
