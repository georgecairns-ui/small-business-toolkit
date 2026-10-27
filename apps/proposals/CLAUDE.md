# Proposals: standing instructions for Claude

This folder is the proposals app inside Proposal Writing OS. You (Claude) and the app share one file, `data/proposals.json`. The person you work for sees it as proper software: Proposals (every proposal by where it's up to), Clients (one card per client folder, with **Write proposal**), Packages (what they sell and what it costs), each proposal laid out like the finished document in their brand, and Preferences. Read this file every time you work with proposals.

The app runs at **http://localhost:4747/proposals/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-my-toolkit`). The helper reads and saves this same file, so you edit it directly as described below; the app picks up your changes within a few seconds.

The routines live as skills in `.claude/skills/`: `write-a-proposal` (the main one), `check-client-folders`, `change-a-proposal`, `follow-up-a-proposal`, `import-a-proposal-template`, `build-my-proposal-skill`, `proposals-check-in` and `sort-proposals-brain-dump`. This file is the reference for the data they read and write.

## The one rule: you write, they check and send

- **You do the writing.** Read everything about the client, write the whole proposal, recommend an option, write the covering email. Don't ask the person questions you can answer from the client's folder, their email, their calls or `context/`.
- **They decide what goes out.** You never send a proposal, an email or anything else. The person approves it, saves the PDF and sends it themselves. You never mark a proposal sent, won or lost by yourself; suggest it.
- **You never invent.** Every price comes from `packages` and `extras`, worked out by the app. A service they don't have a price for goes in `unpriced`, never into the proposal with a made-up number. Anything nobody said (a budget, a deadline, who signs it off) goes in `gaps`, never into the words as if it were true. Terms are only ever their own, word for word.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Never say agent, repo, repository, artifact, JSON, schema, MCP or API to them. Say "your proposals", "the app", "your packages", "the client's folder".
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers.

## The data file: `data/proposals.json`

```json
{
  "about": ["..."],
  "formatVersion": 1,
  "settings":  { ...their business, money, brand and the sections a proposal has... },
  "packages":  [ { ...what they sell, with its price... } ],
  "extras":    [ { ...optional add-ons, with prices... } ],
  "clients":   [ { ...one per client folder... } ],
  "proposals": [ { ...every proposal... } ],
  "requests":  [ { ...jobs waiting for you: write, change, scan... } ],
  "checkIn":   { "lastRunAt": null, "foldersChecked": 0, "proposalsWritten": 0 },
  "activity":  [ { "at": "...", "type": "status", "proposalId": "p-...", "from": "draft", "to": "approved" } ]
}
```

### Settings

| Field | What it means |
|---|---|
| `yourName`, `businessName` | Set in setup. |
| `currency` | `GBP`, `EUR` or `USD`. |
| `vatRegistered`, `vatRate` | If true, the app adds VAT at `vatRate` % to every price and says so under the prices. |
| `paymentTerms` | One or 2 sentences shown under the prices, in their words ("50% to start, 50% on launch"). |
| `validDays` | How long a proposal is valid. The app works out the date. |
| `chaseAfterDays` | Days after sending before you write a follow-up. |
| `autoWrite` | `true`: when you find a new client folder with enough in it, write the proposal straight away. `false`: mark it ready and leave it for them to press Write proposal. |
| `clientsFolder` | Where client folders live, inside this kit. Default `files/02-clients`. If their client folders are somewhere else (Google Drive, Dropbox, OneDrive), see "Client folders" below. |
| `emailProvider` | Where the covering email and follow-ups open: `gmail`, `outlook-work`, `outlook-personal` or `other`. |
| `proposalsSetUp` | `true` once setup has filled in their packages and how they write proposals. |
| `signOff` | `{ "name", "role", "email", "phone" }`: who signs the proposals. Shown on the cover, under the opening note and in Next steps. |
| `brand` | `{ "logo", "logoOnColour", "website", "cover", "setUp" }`. `logo` is a path inside `apps/`, for example `shared/images/brand-logo.svg` or `proposals/brand/logo.png`. `logoOnColour` is a light version for a coloured cover (optional). `cover` is `colour` (the cover filled with their main colour) or `light` (white with a band of colour). The colours and fonts are in `brand/brand.css` (see `.claude/skills/match-my-brand` and `setup/proposals-01-your-brand.md`). |
| `template` | `{ "name", "importedAt" }`: the proposal or template they gave you to copy, if any (`.claude/skills/import-a-proposal-template`). |
| `ownSkill` | The name of the proposal skill you built for this business (`.claude/skills/build-my-proposal-skill`), for example `fern-and-finch-proposals`. Read it before you write any proposal. |
| `sections` | The sections every proposal has, in order: `[{ "key", "label", "on" }]`. The keys are fixed: `about`, `challenge`, `solution`, `delivery`, `investment`, `next`, `terms`. They rename, reorder and switch them off in Preferences. Use their labels when you talk about a section. `terms` is off unless they have their own terms. |

Change settings only when the person asks, or in setup.

### A package

```json
{ "id": "pk-growth-website", "name": "Growth website", "summary": "A site built around one goal: turning visitors into booked appointments.",
  "bestFor": "Businesses that win work through bookings", "price": 7900, "billing": "one-off", "months": 0, "timeline": "8 weeks",
  "includes": ["Everything in Website refresh", "Online booking from your team's real diary"] }
```

- `id` is `pk-` plus a short slug of the name. Never change or reuse one: proposals point at it.
- `price` is a number in their currency, before VAT. `billing` is `one-off`, `monthly`, `yearly`, `per-day` or `per-hour`. For a monthly package with a fixed length, `months` is the number of months (the app shows the monthly price and the total); 0 means ongoing.
- Only ever from what they told you, their website, their price list or their past proposals. If you don't know a price, ask; never guess one.

An extra is the same, smaller: `{ "id": "x-photo-day", "name": "Photography day", "summary": "...", "price": 650, "billing": "one-off" }`.

### A client

```json
{ "id": "c-hollins", "name": "Hollins Lettings", "folder": "files/02-clients/Hollins Lettings",
  "contact": { "name": "Dev Patel", "role": "Operations lead", "email": "dev@hollins.example" },
  "summary": "Letting agent with 3 branches. Wants a website that books valuations online.",
  "sources": [ { "file": "2026-10 discovery call (Fathom).md", "kind": "call", "summary": "Discovery call with Dev" } ],
  "ready": true, "missing": [], "scannedAt": "<timestamp>", "pipelineDealId": "d-..." }
```

- One per client folder. `folder` is the path from the kit's top folder. `id` is `c-` plus a slug of the name.
- `sources` lists what's in the folder (and the emails and calls you saved there): `file` (the name inside the folder) and `kind`: `call`, `notes`, `email`, `brief`, `document`, `proposal` (an old proposal to them) or `other`. The app counts these on the card.
- `ready` is your judgement: is there enough to write a good proposal? Enough means you know who they are, what they need or what's hurting, and roughly what kind of work it is. When it's `false`, `missing` lists what you'd need, in plain words ("What they want help with", "Roughly what they'd like to spend"), and the card shows it.
- The app may add a client itself (New proposal, with a name the person typed): `addedBy: "you"`. Its folder may not exist yet: make it.
- `pipelineDealId` links the client to a deal in Pipeline OS, when attached.

### A proposal

```json
{ "id": "p-k3j9x2", "clientId": "c-hollins", "title": "New website for Hollins Lettings", "status": "draft",
  "createdAt": "...", "updatedAt": "...", "approvedAt": null, "sentAt": null, "closedAt": null, "lostReason": "",
  "cover": { "title": "A website that books valuations while you sleep", "subtitle": "A new website for Hollins Lettings",
             "preparedFor": { "name": "Dev Patel", "role": "Operations lead", "organisation": "Hollins Lettings" } },
  "intro": "A short opening note. Paragraphs split by a blank line.",
  "sections": {
    "about":      { "body": "...", "points": ["What they told you, in short lines"] },
    "challenge":  { "body": "...", "pains": [ { "title": "...", "detail": "...", "quote": "their exact words, optional" } ] },
    "solution":   { "body": "...", "points": [ { "title": "...", "detail": "..." } ] },
    "delivery":   { "body": "...", "phases": [ { "when": "Week 1", "name": "Discovery", "detail": "..." } ] },
    "investment": { "body": "...", "options": [ { "packageId": "pk-...", "recommended": true, "why": "..." } ], "extras": [ { "extraId": "x-...", "qty": 1 } ] },
    "next":       { "body": "...", "steps": [ { "title": "...", "detail": "..." } ] },
    "terms":      { "body": "" }
  },
  "coverEmail": { "to": "...", "subject": "...", "body": "..." },
  "followUp":   { "to": "...", "subject": "...", "body": "...", "why": "...", "createdAt": "..." },
  "gaps": ["Who signs off the budget"],
  "unpriced": [ { "what": "Moving 9 years of blog posts", "why": "Dev asked about it. It isn't on your price list." } ],
  "sources": [ { "file": "Hollins Lettings/discovery call.md", "what": "The problems and the 8 week timing" } ],
  "timeline": [ { "at": "...", "kind": "written", "by": "claude" } ]
}
```

| Field | What it means |
|---|---|
| `id` | `p-` plus 6 random lowercase letters or digits. Never change or reuse one. |
| `status` | `writing` (you've started), `draft` (ready for them to check), `approved`, `sent`, `won`, `lost`. You set `writing` and `draft`. Everything after that is theirs: the app sets it when they press the buttons. If they tell you in chat ("we won Hollins"), set it, with `closedAt` (and `lostReason` if lost), and add a `timeline` line. |
| `cover` | The title is a promise in the client's terms, not "Proposal for X". The subtitle says plainly what it is. |
| `intro` | 2 to 4 short paragraphs from the person to the client: thanks, what you heard (their pain, in their words), what this proposal does, and which option you recommend. The app adds "Dear <first name>," and the sign-off. |
| `sections.*.body` | Paragraphs split by a blank line. Short. Each section's lists are optional but make it scannable: 2 to 4 `pains`, 3 to 5 `solution.points`, 3 to 5 `delivery.phases`, 3 to 5 `next.steps`. |
| `investment.options` | 1 to 3 packages from `packages`, by `packageId`. Exactly one has `recommended: true`, with a `why` that ties back to their pain and goal. Never put a price here: the app works it out. `customPrice` is set only by the person, in the app; never set or change it. |
| `investment.extras` | Extras from `extras` that fit this client, by `extraId`, with `qty`. |
| `coverEmail` | The short email they send with the PDF, in their voice (`.claude/skills/human-email`, `context/voice.md`). They open it from the app and attach the PDF themselves. |
| `followUp` | Written by `follow-up-a-proposal` once a sent proposal has had no reply for `chaseAfterDays`. |
| `gaps` | Things a good proposal needs that nobody said. The app shows them for the person to fill in. |
| `unpriced` | What the client asked for that isn't on their price list. Leave it out of the options and say so here. |
| `sources` | What you read to write it: the file inside the client folder (or "Emails with Dev, Gmail") and one line on what it gave you. |
| `editedAt` | Set by the app when the person changes words on the page. If it's set, don't rewrite the proposal from scratch: change only what you're asked (`change-a-proposal`), or write a new one. |

### Requests: what the app is waiting for you to do

```json
{ "id": "r-a1b2c3", "kind": "write", "clientId": "c-hollins", "notes": "anything they typed or dropped in", "fileName": "", "status": "waiting", "addedAt": "..." }
{ "id": "r-d4e5f6", "kind": "change", "proposalId": "p-...", "instruction": "Make it shorter", "status": "waiting", "addedAt": "..." }
{ "id": "r-g7h8i9", "kind": "scan", "status": "waiting", "addedAt": "..." }
```

When the person presses **Write proposal**, **New proposal**, **Ask Claude** or **Check for new folders**, the app adds a request and asks the helper to start you (the jobs in `claude-jobs.json`). When you've finished one, set `status` to `done`, `doneAt` now, and, for `write`, `proposalId`. If you can't do it (not enough in the folder), set `status` to `done` and `note` to one plain sentence the app shows them ("There isn't enough in Bramble & Co's folder yet: I need what they want help with"). Never delete a request. `cancelled` ones are the person's; leave them.

## Client folders

Everything about a client goes in their own folder: `<clientsFolder>/<client name>/`. Call notes, transcripts, emails, briefs, photos, old proposals, anything. This is how the person works with Proposal Writing OS: drop things in a folder, press Write proposal.

- **You keep the folders tidy and complete.** When you find something about a client elsewhere (an email thread, a call recording, a note in the brain dump), save a short Markdown summary into their folder with a clear name (`2026-10-07 discovery call (Fathom).md`, `Emails with Dev Patel.md`), with the key facts and exact quotes that matter. Never paste whole private email threads; summaries and short quotes only. Add a line to the client's `sources`.
- **Never delete or move their files** in a client folder. Old things go to `files/99-archive/`.
- **Folders somewhere else.** If their client folders live in Google Drive, OneDrive or Dropbox, the simplest way is a synced folder on this computer: set `clientsFolder` to a folder inside this kit only. If the synced folder is elsewhere on the computer, read it there (with their permission) and keep the `folder` field as the full path; tell them the app's folder links will show that path. If it's only in the cloud (no sync), read it through the connection and save summaries into a local client folder here.
- **Your proposals go in the folder too.** After the person saves the PDF, suggest they save it in the client's folder; after you write a proposal, nothing else is needed from you there.

## Working with the other tools

When they're attached (in `apps/installed.json`):

- **Pipeline OS** (`apps/pipeline/data/pipeline.json`): read the client's deal before writing (summary, the deal check, calls, what's also needed) and link it with `pipelineDealId`. When a deal reaches its proposal stage and has no proposal, that client is ready: add the client (and a write request if `autoWrite` is on). When a proposal is marked sent, won or lost, add a suggestion to the pipeline (its `suggestions`, `kind: "task"`) to move the deal, unless the pipeline has already moved it. Never edit the pipeline's deals yourself.
- **Task List OS** (`apps/task-list/data/tasks.json`): a new proposal ready to check, and a follow-up that's due, become suggested tasks there, in its format (`apps/task-list/CLAUDE.md`), with `"source": { "tool": "proposals", "id": "<proposal id>" }`. Don't add a task you've already added.
- One check-in: if another tool has a check-in, `proposals-check-in` runs as part of it.

## Rules for editing the file safely

- Read the file immediately before you change it, and write the whole file back in one go. The app may have saved a click a moment ago.
- Keep it valid JSON, 2-space indented. Read it back after saving and check it parses.
- Keep every field you don't understand exactly as it is.
- Never touch `proposals.backup.json`; the helper writes it before every save. If `proposals.json` is ever broken, rebuild it from the backup.
- Full timestamps for the `...At` fields.

## What the person will ask, and what to do

| They say | Do |
|---|---|
| "Write a proposal for Hollins", "write the proposal for files/02-clients/Ellis Joinery" (and every write request) | `.claude/skills/write-a-proposal` |
| "Check my client folders", "anything new?" (and every scan request) | `.claude/skills/check-client-folders` |
| "Make it shorter", "change the price", "lead with the Growth package" (and every change request) | `.claude/skills/change-a-proposal` |
| "Chase Marlow", "who hasn't replied?" | `.claude/skills/follow-up-a-proposal` |
| "Here's our template", "copy this proposal" | `.claude/skills/import-a-proposal-template` |
| "Rebuild my proposal skill", "we've changed our packages" | `.claude/skills/build-my-proposal-skill` |
| "We won Hollins", "Marlow said no" | Set the status (above), ask why if lost (one question), and for a win offer a short thank-you email and the onboarding steps from `context/proposals.md`. |
| "What's out?", "how much have I won this month?" | Read the proposals and answer from them. The same numbers the app shows. Change nothing. |
| "Open my proposals", "it's not loading" | `.claude/skills/open-my-toolkit` (it starts the app for every tool in this folder) |

## If something goes wrong

- The app says "Your proposals file has a small mistake in it": the file isn't valid JSON. Fix it, using `data/proposals.backup.json` as reference, and tell the person it's sorted.
- A request is still waiting after a few minutes: do it yourself now, following the skill for its `kind`. The helper starts you as soon as a request is added; if Claude Code isn't where the helper can find it, requests wait for the next check-in or the Open in Claude button.
- The person says the app doesn't show your changes: check the file saved and parses, then ask them to click on the app window.
