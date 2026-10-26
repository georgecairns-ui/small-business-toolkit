# Step 4: connect everything else, once

Goal: every app they named in step 1 that a tool needs is connected now, in one sitting, so no tool's own steps have to stop and connect it later. Email, calendar and calls are already done (steps 2 and 3).

## 4.1 Make the list, with them

Go through their answers in `setup/progress.md` ("Answers from step 1") and put each app they named in this table's order. Say the list back in one message, with a one-line reason each, and ask if anything should wait. Leave out anything no tool uses.

| What it is | Apps | What it gives the toolkit | Guide |
|---|---|---|---|
| Customers and deals | HubSpot, Pipedrive | Deals come into Pipeline OS; follow-ups and quiet deals become tasks; contacts fill People | `setup/connections/hubspot.md`, `setup/connections/pipedrive.md` |
| Accounts | Xero, QuickBooks | Money View OS reads invoices, bills and the bank; unpaid invoices become tasks to chase | `setup/connections/xero.md`, `setup/connections/quickbooks.md` |
| Accounts not supported by Money View yet | FreeAgent, Sage | An export still helps the task list; say plainly that Money View can't use it yet | `setup/connections/freeagent.md`, `setup/connections/sage.md` |
| The business bank | (inside their accounts app) | Money View sees the bank balance and payments; switched on later in Money View's own bank step | `setup/connections/bank-feeds.md` |
| Ads | Meta, Google | Ads OS reads the figures; on Meta it can build campaigns switched off | `setup/connections/meta-ads.md`, `setup/connections/google-ads.md` |
| Payments | Stripe | Failed payments and disputes become tasks | `setup/connections/stripe.md` |
| Files | Google Drive | Client folders for proposals, documents filed, Meet transcripts | `setup/connections/google-drive.md` |
| Team chat | Slack | Requests from the team become suggestions | `setup/connections/slack.md` |
| Notes | Notion | Their existing notes and to-dos | `setup/connections/notion.md` |
| Bookings | Calendly | New bookings on the calendar with prep tasks | `setup/connections/calendly.md` |

`setup/connections/README.md` lists every guide. If their app isn't listed, follow `.claude/skills/connect-a-tool`.

Social platforms (LinkedIn, Instagram and so on) are not connected: Content Machine OS researches the public web and they post themselves. Say so if they ask.

## 4.2 Connect each one

Follow its guide exactly, one app at a time. The order is always: a Claude connector (sign in, approve), then the app maker's own connection, then a key. An export is a last resort, and never for Money View.

**If a key is needed**, never ask for it in chat. Tell them where to find it (the guide says), then:

> Open the Terminal app (on Windows, PowerShell) in your Small Business Toolkit OS folder and paste this line, then press Enter:
> `bash setup/scripts/save-key.sh PIPEDRIVE_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 PIPEDRIVE_API_KEY` (Windows)
> It asks for your key. Paste it and press Enter (it won't show on screen). Then close and reopen Claude so it can see it.

The script keeps the key in the computer's own secure store (Keychain on a Mac). Nothing is written into this folder. Afterwards, check it's visible without printing it: `[ -n "$PIPEDRIVE_API_KEY" ] && echo found` (Mac) or `if ($env:PIPEDRIVE_API_KEY) { "found" }` (Windows).

Meta ads: connect for reading now. The tool's own step (`setup/ads-02-where-your-ads-are.md`) explains what building campaigns means and asks before anything more.

## 4.3 Check and record

For each app, one harmless read ("I can see 4 unpaid invoices, the oldest from 12 September", "I can see 2 Meta campaigns, both running"). Then:
- `context/tools.md`: a row per app, with what you may and may not do.
- `apps/toolkit/data/toolkit.json`, under `connections`: its status (`connected`, or `needs-attention` with a one-line note if it half works), `how` ("Claude connector" or "key saved"), and today's date in `checked`. An app they decided to leave: `not-used`.

If something gets fiddly, note it in `setup/progress.md`, set it to `needs-attention` and move on: a partly connected setup that works beats a long afternoon, and the Toolkit's Connections page has a **Fix it** button for later. Tick step 4.

## What to say

> Pipedrive, Xero and your Meta ads are connected. I can see 23 open deals, 4 unpaid invoices and 2 campaigns. Slack can wait, as you said. Next I'll fill in what I know about your business.
