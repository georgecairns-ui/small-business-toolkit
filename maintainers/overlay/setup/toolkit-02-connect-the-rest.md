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

Social platforms (LinkedIn, Instagram, Facebook, TikTok and so on) wait for Content Machine OS's own platforms step (`setup/content-02-your-platforms.md`), which connects the ones with a connector, for reading only, and says the no-connector sentence once for all the rest. Leave them out of this list.

## 4.2 Connect each one

For each app on the list, follow its guide and `.claude/skills/connect-a-tool`: find the route (our guide, or a search of Claude's connector directory), check, switch on or point to Connect, then prove it with one harmless read ("I can see 4 unpaid invoices, the oldest from 12 September", "I can see 2 Meta campaigns, both running"). Use the guide mode from `setup/progress.md` for how much to explain at a time.

An app with no connector gets this sentence, word for word with its name: "There's no Claude connector for [app], so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. For FreeAgent, Sage and QuickBooks outside the US, say plainly too that Money View can't use an export: it needs a live connection to the accounts app.

Meta ads: connect for reading now. The tool's own step (`setup/ads-02-where-your-ads-are.md`) explains what building campaigns means and asks before anything more.

## 4.3 Record

Each app goes into `apps/home/data/connections.json` and `context/tools.md` (see `connect-a-tool`, part 3), with what you may and may not do. An app that still won't connect after the loop is `needs-attention`, with what went wrong in `note`: the Connections page and the Connections box on Home show a **Fix it** button for it, so setup doesn't stall on it. An app they decided to leave: `not-used`. Apps they named but chose to connect later stay `not-connected` with the note "Chose not to connect yet". Tick step 4.

## What to say

> Pipedrive, Xero and your Meta ads are connected. I can see 23 open deals, 4 unpaid invoices and 2 campaigns. Slack can wait, as you said. Next I'll fill in what I know about your business.
