# Step 1: quick questions, for every tool at once

Goal: in one short exchange, learn everything the 7 tools need to know up front, so no later step asks it again, and so you can connect the right apps and set the tools up in the order that matters to them.

## 1.1 Check what you can reach (quietly, before asking anything)

1. **This folder.** Read `setup/progress.md`, write a test line to its "Notes for next time" section, read it back and remove it. If you can't, stop and ask them to open this folder in Claude Code (`cd` into it and run `claude`), or give the Claude app access to it.
2. **Your connections.** List the tools you have right now. In Claude Code, the person can type `/mcp` to see them. Note any for email, calendar, call recording, files, accounts, bank, customers and sales, ads, team chat and bookings. Connectors added to their Claude account appear automatically in Claude Code when it's signed in with a Claude subscription.
3. **Where the folder lives.** From its path: Downloads or Desktop (suggest moving it to Documents first, because the app remembers the location), a cloud-synced folder (fine, it's backed up), or a folder shared with other people (point out that anyone with access can read their tasks, deals and money figures).
4. **Their computer.** Mac or Windows, from the path or by running a harmless command.

## 1.2 Ask everything in one message

Open with what you found in 1.1, so they see you've already looked: "You've already got Gmail, Google Calendar and Xero connected to Claude, so I'll use those." Then send the questions as one friendly, numbered message. Skip anything you already know and say so. Tell them short answers are fine and they can drop files straight in.

> To set up your whole toolkit I need a few things, once. Short answers are fine, and you can drop files straight in here.
>
> 1. Your first name, your business's name, **your website**, and in a sentence what the business does.
> 2. **Your logo** (drop the file in, a PNG or SVG is best), and your brand colours or brand guidelines if you have them. If not, I'll take them from your website.
> 3. Which **email** and **calendar** do you use for work? (Gmail or Google Workspace, Outlook with a work Microsoft account, Outlook.com, or something else.)
> 4. Do you **record your calls**? If so, with what? (For example Fathom, Fireflies, Otter, Granola, tl;dv, Read AI, Zoom, Microsoft Teams or Google Meet.)
> 5. Where do your **customers and deals** live today? (A spreadsheet, HubSpot, Pipedrive, your inbox, your head.)
> 6. Which **accounts software** do you use, and which **bank** is the business account with? (Xero, QuickBooks, FreeAgent, Sage, or none yet.)
> 7. Do you run **ads**? On Meta (Facebook and Instagram), Google, or both? Roughly what a month?
> 8. Where do you **post** for the business, if anywhere? (LinkedIn, Instagram, Facebook, TikTok, a blog, a newsletter.)
> 9. Any other apps you use: files (Google Drive, OneDrive, Dropbox), team chat (Slack, Teams), notes (Notion), bookings (Calendly), payments (Stripe)?
> 10. Where do you keep things about each **client** today? And have you got a **proposal** you're proud of, or a template you always use? (Drop 1 to 3 in here if so.)
> 11. Which days and hours do you usually work? Is it just you, or do you hand work to anyone? (First names are enough.)
> 12. **Which of these matter most to you right now?** Your task list and pipeline go first because everything else feeds them. After that, put the rest in order, or tell me which can wait: proposals, content, money, ads, and a map of your skills and folders. Doing everything today takes about 2 hours; you can stop after any tool.
> 13. Would you like me to **check everything automatically** every hour while you work: your inbox, calls and calendar, your deals, your money and your ads? (It uses some of your Claude allowance and needs the Claude app open on your computer.)

If they skip a question, don't chase it now. The tool that needs it asks when its turn comes.

## 1.3 Write it down, everywhere it's needed

Each tool keeps a few of these answers in its own settings. Write them all now, so every tool's app greets them by name and no tool asks again. Save each data file safely: read it, change only these fields, write it back, and check it still reads cleanly.

**Notes**
- `setup/progress.md`, under a new heading `## Answers from step 1`: every answer, one short line each, in their words. Every later step reads this before asking anything.
- `context/tools.md`: "Your setup" (computer, Claude version, workspace location, email provider, calendar provider, solo or team) and "Connected apps" (one row per app they named, with "How it's connected" left as "to do"). Their answer to 13 under "Notes".
- `context/business.md`: business name, website, what it does.
- `context/people.md`: the people they hand work to, first names and roles.
- `context/routines.md`: their working days and hours.

**Each tool's settings** (only the fields named here)
- `apps/task-list/data/tasks.json`: `settings.yourName`, `settings.businessName`, `settings.dayStarts`, `settings.dayEnds`, `settings.emailProvider` (`gmail`, `outlook-work`, `outlook-personal` or `other`), `settings.calendarProvider` (`google`, `outlook-work`, `outlook-personal` or `other`).
- `apps/pipeline/data/pipeline.json`: `settings.yourName`, `settings.businessName`, `settings.emailProvider`, `settings.calendarProvider`.
- `apps/proposals/data/proposals.json`: `settings.yourName`, `settings.businessName`, `settings.emailProvider`, `settings.brand.website`.
- `apps/content/data/content.json`, `apps/money/data/money.json`, `apps/ads/data/ads.json`: `settings.ownerName`, `settings.businessName`.
- `apps/skill-map/data/skillmap.json`: `settings.yourName`, `settings.businessName`.

**Files they dropped in**
- Logo and brand guidelines into `files/04-marketing/brand/`, proposal templates into `files/03-sales/proposals/templates/`. Make the folders if needed. Don't open the templates yet (Proposal Writing OS does that).

**The Toolkit page** (`apps/toolkit/data/toolkit.json`)
- `tools`: every tool they chose for today as `not-yet` for now, and every tool they said can wait as `not-yet` with the note "Chose to wait". You'll change each to `set-up` as you finish it.
- `connections`: every app they named, as `not-connected` with the note "To connect in setup". Anything you found already connected in 1.1 as `connected`, with `how` set to "Claude connector" and today's date in `checked`.

Write their chosen order of tools into `setup/progress.md` under "Answers from step 1" as a numbered list, starting with Task List OS and Pipeline OS. Part 2 of setup follows it.

Tick step 1 in `setup/progress.md`.

## What to say

> Thanks Sam. Gmail and Google Calendar, Fathom for calls, deals in a spreadsheet, Xero with Starling, Meta ads at about £400 a month, and you post on LinkedIn and Instagram. It's you plus Priya. After your task list and pipeline we'll do money, then proposals, then ads; content and the skill map can wait. I'll connect your apps next, starting with your email.
