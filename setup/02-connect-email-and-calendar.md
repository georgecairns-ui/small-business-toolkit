# Step 2: connect email and calendar

Goal: you can read their email and calendar, proven with a real read, and you've read the last 30 days once for every tool. This fills the task list's Inbox (emails that need an answer, each with your draft), Review (new tasks from email) and the calendar in This week, starts the pipeline with the people and deals in their email, and saves a summary for each client the proposals need. Nothing else in setup happens until this step is done.

## 2.1 One sentence on why

> This is the big one. I'll read your inbox each time I check in, pick out what needs a reply, draft it for you, and turn requests into tasks. I only read and draft. I never send, delete or tidy anything.

## 2.2 Connect, and check for yourself

Find their provider's guide:

| They use | Guide |
|---|---|
| Gmail or Google Workspace, Google Calendar | `setup/connections/gmail-and-google-calendar.md` |
| Outlook or Microsoft 365 with a work account | `setup/connections/microsoft-365.md` |
| Outlook.com, Hotmail, iCloud, Yahoo or another provider | There's no Claude connector for it. Go to 2.5 |

Email and calendar can come from different providers (for example iCloud mail with Google Calendar). Find the guide for each half separately. A half with no connector goes to 2.5; the other half still goes through 2.2 and 2.3 and must be proven.

Then look up this session's connections (`session_connectors_status`) and act on what you find, for the email connector and the calendar connector separately:

| What you find | What you do |
|---|---|
| It's there and on | Go to 2.3 |
| It's there but switched off for this session | Switch it on (`set_session_connector_enabled`). They'll be asked to approve: tell them that's expected. It works from your next message, so end this message by saying you've switched it on and will check it next |
| It isn't there | Give them the path from the guide, in their guide mode: in the Claude desktop app, Customize, then Connectors, then the app's name, then Connect, then sign in on Google's or Microsoft's own page and approve. Ask them to tell you when it's done, then look again |
| It needs signing in (`needs_auth`) | Tell them the one thing to do: open Connectors (or type `/mcp` in this chat), choose it and sign in. Then look again |
| It's not working (`failed`) | Reconnect it (`reconnect_session_connector`). It's ready from your next message; end this one by saying so, then look again |

Keep going round this table until both are on. Never ask for their email password: they sign in on Google's or Microsoft's own screen.

## 2.3 Prove it

With their permission, read the subjects and senders of the 5 most recent emails and today's calendar, and say what you see in one line, without quoting anything private:

> I can see your inbox (last email from Tom at Greenway Café, 20 minutes ago) and 3 things in your calendar today.

If the read fails, look up the connection status again and go back to 2.2. A connection only counts once a read has worked.

## 2.4 Read the last 30 days

Tell them first: "I'll now read the last 30 days of your email once, for every tool, so your task list, your pipeline and your client folders all start full. On a busy inbox this takes a few minutes. I'll keep you posted."

Read it once and fill every tool from the same read: no later step reads these 30 days again. Read `apps/task-list/CLAUDE.md` and `apps/pipeline/CLAUDE.md` first: they explain each file and how to edit it safely.

1. List every thread from the last 30 days, sent and received, by sender and subject only.
2. Leave out newsletters, receipts, automatic notifications and no-reply senders.
3. Open only the threads from real people, in batches. After each batch, one progress line: "Read 140 of 380 conversations, 12 need a reply and 6 look like deals so far."
4. **Task List OS:** follow `.claude/skills/triage-inbox` for what you read: threads still waiting on them go into `replies` with a draft; requests and promises become suggested tasks. Fill in `triage` with the counts.
5. **Pipeline OS:** fill `apps/pipeline/data/pipeline.json` from the same threads:
   - **People:** everyone they're talking to about buying, and their existing customers, go into `people` with the right `role` (`prospect`, `client` or `customer`), linked to the task list's contacts (see "People" in `apps/pipeline/CLAUDE.md`).
   - **Open deals:** each conversation with a prospect becomes a deal (if it isn't one already) with the person, `source`, `summary`, the conversations on the `timeline` and `lastContact`, at the stage the evidence shows. Proposals and quotes in their sent email tell you a lot. A conversation with an existing customer is a deal only when it's about selling them something more.
   - You don't know how they sell yet (that's step 6, `setup/pipeline-01-your-customers.md`), so add a deal straight to the board only when someone plainly wants to buy what the business sells (they asked for a quote, a price or a call about buying, or the business sent them a proposal or quote). Anything you're not sure is a deal goes in as a suggested deal (`suggested: true`, with a one-line `suggestReason`), not straight onto the board.
   - Don't run the deal check or write emails yet: Pipeline OS's first run (`setup/pipeline-02-first-run.md`) does that for every deal.
   - Set `checkIn.emailsRead` to the number of emails you read. Save, read the file back and check it's valid.
6. **Proposal Writing OS:** anyone they're quoting, scoping or discussing work with gets a short summary in `files/02-clients/_found-in-email/<Client Name>.md`: who they are, the contact (name, role, email), what they asked for, and what they **confirmed in writing** (budget, scope, dates, who decides) at the top, with their exact words where they matter. Add any proposal or quote they've already sent that client (the date sent, the file name, what it offered and the prices as written, and whether the client has replied since). Don't add it to the app: it isn't one of the proposals you wrote. If the file already exists (a resumed setup), add to it instead of overwriting it. Never whole threads. The folder starts with `_`, so the app doesn't treat it as a client; `setup/proposals-04-your-client-folders.md` moves each summary into the right client's folder.
7. **Calendar:** copy events from yesterday to 14 days ahead into the task list's `events` (see `apps/task-list/CLAUDE.md`). Read the last 30 days of the calendar only to learn who they meet and what's recurring (people, routines), without copying it into `events`: add "met on <date>" to the summary of any client they met, and note their usual working days and hours in `context/routines.md`. Pipeline OS sorts its sales meetings in its first run.

Keep the counts for the hand-over (emails read, replies drafted, deals found, clients found, proposals already sent). Drafts stay drafts: nothing is sent, labelled, archived or marked as read.

## 2.5 The only ways past this step

- **Proven:** 2.3 worked for email and calendar, and 2.4 (the 30-day read) is done. Record them (2.6) and go on.
- **No Claude connector for their provider** (Outlook.com, Hotmail, iCloud, Yahoo, a hosting company's email). Say plainly: "There's no Claude connector for [provider], so I can't connect to your email live." Offer the one alternative: forward work email to a Gmail account and connect that. Record it as `no-connector` (2.6) and go on. The task list still works from their brain dump.
  This exit covers only the half that has no connector. If their email has no connector but their calendar does (or the other way round), the other half still goes through 2.2 and 2.3, must be proven, and gets its part of 2.4.

If they don't want to connect email, say in one line what won't work without it ("I won't be able to find emails that need a reply or draft them for you"), and ask once if they'd like to go ahead. If they still say no, stop setup here, note it in `setup/progress.md`, and tell them they can type `/setup` whenever they're ready. Don't go on to step 3 without email.

If they're waiting on someone else first (for example their IT administrator has to approve the connector, or they need a password reset), stop in the same way: note it in `setup/progress.md` and tell them to type `/setup` when it's sorted. Don't go on to step 3.

## 2.6 Record it

In `apps/home/data/connections.json` (format: `setup/connections/README.md`, "Recording a connection"): `"status": "connected"` and today's date in `checked` for each one proven, or `no-connector`. Email and calendar from the same provider share 1 row, keyed `gmail-and-google-calendar` or `microsoft-365`, the same row step 1 started. From different providers, each has its own row: a no-connector email row is keyed by the provider's name in lower case with hyphens (for example `icloud-mail`), and a proven calendar keeps its guide's key (`gmail-and-google-calendar` or `microsoft-365`). The same goes the other way round. When email and calendar come from the same provider and neither has a Claude connector (for example iCloud), they share 1 row keyed by the provider's name, for example `icloud`.

In `context/tools.md` ("Connected apps"): app, how connected, today's date, "Read; prepare drafts", and "Never send, reply, forward, delete, archive, label or unsubscribe". Tick step 2 in `setup/progress.md`.

## Rules for their inbox, from now on

- Read only to understand work. Don't read more than you need.
- Never send, reply, forward, delete, archive, label, mark as read, unsubscribe or accept an invite, even though the connection technically allows some of these.
- Drafts live in the task file (`replies`), and the person opens them with the app's Draft button. Save a draft into their mailbox only if they ask you to for that specific email.
- Don't copy whole private emails into the task file. A one-line summary, the reason it needs a reply, and your draft are enough.
