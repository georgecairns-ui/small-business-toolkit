# Ads: standing instructions for Claude

This folder is the ads app inside Ads OS. You (Claude) and the app share one file, `data/ads.json`. The person sees it as one page, Ads, with a row of views to flick between at the top: Overview, Campaigns, New campaigns and This week, plus a Health check button and a gear for Settings. You read their ad figures and ads into the file, draft new campaigns, build the approved ones switched off, analyse a campaign, write the weekly summary and suggest changes. They approve. On Meta, when they press a button in the app and confirm one exact change, you make that one change in their account. They run their ads from the app, and you do the work. Read this file every time you work with the ads data.

The app runs at **http://localhost:4747/ads/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-my-toolkit`). The helper reads and saves the data file, so you edit it directly as described below; the app picks up your changes within a few seconds.

The jobs live as skills in `.claude/skills/`: `update-my-ads`, `build-a-campaign`, `build-in-account`, `analyse-campaign`, `make-account-change`, `how-did-the-ads-do`, `what-should-i-change` and `my-ads-check-in`. This file is the reference for the data they read and write. The connection rules are in `.claude/skills/build-in-account/references/connections.md`. Read both before you touch an ad account.

## The rules that never bend

- **Nothing spends until the owner says yes.** A campaign you build is paused. On Meta, you switch a campaign on, pause a campaign or an ad, or change a daily budget **only** when the owner pressed the button in the app and confirmed that exact change in the pop-up. That shows up as an entry in `actions` with status `requested`. You do that one change, read it back, and record what you found. You never act on your own, never on something said in chat, and never on a suggestion or a To do item alone.
- **Never go over their limits.** Before any change run `node apps/ads/app/report.js action <action id>`. If it says BLOCKED, change nothing.
- **Never delete.** Nothing in an ad account, ever. Pausing is the furthest you go.
- **Google is read only.** Google's own connection only reads, so every Google change stays a click-by-click task for the owner with a link to Google Ads, and a new Google campaign is an import file. Never find another route into a Google account.
- **Create paused only, then read back and confirm.** On Meta, every campaign, ad set and ad you create is paused in the same call that creates it. Then you read each one back and check it's paused. If any isn't, stop, tell them in plain words and set nothing live.
- **Only the approved change.** You never touch a campaign, ad set or ad that the action doesn't name, including one you built earlier. A change you'd suggest is a suggestion for the owner to approve in the app.
- **No ad account tool is pre-approved.** Claude Code asks before every call to a Meta or Google tool, so the owner approves twice for a change: in the app, then in Claude Code. Say what you're about to do, and never ask them to change that.
- **Never type a total.** You write raw figures. `model.js` works out spend, results, cost per result, return, lights and pace.
- **Never store tokens, passwords or customer lists.** Lead details Meta returns are used only for Pipeline OS suggested deals, and never kept anywhere else.
- **Never invent proof.** No made-up results, prices, offers, reviews, numbers or customer names.
- **Pictures and videos are theirs.** You never make, edit, add, remove or reorder one.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your campaign", "your ad account", "your figures", "a connection", "the app". Never say agent, repo, repository, artifact, JSON, schema, MCP or API.
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers. No exclamation marks. No hype.
- Money is pounds, shown as £1,234 (pence only under £10, such as £4.37).

## The data file: `data/ads.json`

```json
{
  "version": 1,
  "settings": {
    "businessName": "", "ownerName": "", "currency": "GBP", "weekStarts": 1,
    "result": { "name": "", "plural": "", "kind": "", "worth": null, "closeRate": null },
    "targetCostPerResult": null, "platformTargets": {},
    "monthlyBudget": null, "dailyCap": null, "weeklyCap": null,
    "seasons": []
  },
  "platforms": {},
  "campaigns": [],
  "figures": [],
  "adFigures": [],
  "builds": [],
  "analyses": [],
  "actions": [],
  "summaries": [],
  "suggestions": [],
  "wins": [],
  "imports": [],
  "activity": []
}
```

Every `id` is a short prefix plus 6 random lowercase letters or digits, made the way the app makes them (`c-k3j9x2`). The prefixes: `cp-` campaign, `b-` build, `a-` ad, `c-` check, `s-` summary, `g-` suggestion, `v-` win, `i-` import, `an-` analysis, `ac-` action. Never reuse or change one. Every date is `YYYY-MM-DD`, every timestamp is ISO. Read the file immediately before you change it, write the whole file back in one go, keep it valid, 2-space indented, and read it back to check it parses.

### `settings` and `platforms`

- `settings` belongs to the person and the app (the Settings pop-up, opened by the gear). Setup fills `businessName`, `ownerName`, `result`, the targets and the caps from their answers. Never change them afterwards unless asked. `weekStarts` is 1 for Monday.
- `settings.result`: `name` is "enquiry" and `plural` "enquiries" (every label on screen uses them, so it reads "Cost per enquiry"). `kind` is `lead`, `call`, `booking` or `sale`. `worth` is what one new customer is worth in pounds and `closeRate` is how many results become customers, 0 to 1. Both are `null` for `sale`.
- `settings.targetCostPerResult` is what they'd like a result to cost, and `platformTargets.<key>` overrides it for one platform. `monthlyBudget`, `dailyCap` and `weeklyCap` are their limits.
- `settings.seasons`: `[{ "label": "Christmas", "from": "11-15", "to": "01-10" }]`, in `MM-DD`, which may cross the year end. Setup fills it from the "times of year that matter" answer, and the owner can change it in Settings. The To do list reads it to suggest drafting a campaign ahead of each season.
- `platforms.<key>`: `{ "on": true, "how": "connected" or "export" or "none", "accountName": "", "accountId": "", "connectedAt": null, "lastRefresh": null }`. The keys are `meta` and `google`. A missing key means the platform is off. Setup sets these from their answers. `update-my-ads` sets `lastRefresh`. Never switch a platform on or off yourself after setup. Suggest it.

### `campaigns[]`

`{ id, platform, platformId, name, status: "on" or "paused" or "ended", objective, dailyBudget, startedAt, builtBy: "claude" or "you", buildId: null, url, ads: [], prediction: null, request: null }`. Campaigns as they are in the account, copied in by `update-my-ads` (and by `build-in-account` for one it just built). `platformId` is the platform's own id. `builtBy` is `claude` for a campaign built from a build, with `buildId` set. `url` opens it in Meta's or Google's own page. Never remove one: a campaign gone from the account is `ended`.

- **`ads[]`**: `{ id, platformId, name, headline, primaryText, description, cta, url, media: [file names], status: "on" or "paused" }`. The campaign's ads as they are in the account, read by `update-my-ads` each time it refreshes. `media` holds file names in `apps/ads/data/media/`, saved the same way as every picture (`m-k3x9q2.jpg`), and only when the connection hands the picture over (to check). Otherwise the ad is words only and `media` stays empty.
- **`prediction`**: `null`, or `{ costPerResult, resultsPerWeek, spendPerWeek, from: date, madeAt, basis: "plan" or "analysis", assumptions: [plain sentences] }`. What Claude expects the campaign to do. `build-a-campaign` writes it with every build (`basis: "plan"`, from `ads-math`), and it is copied to the campaign when the build goes live. `analyse-campaign` writes one (`basis: "analysis"`, `from` is the analysis date) only for a campaign that has none. Never overwrite one that exists: the app scores the campaign against it.
- **`request`**: `null`, or `{ "kind": "analyse", "note": "", "at": "<timestamp>" }`. The app sets it when the owner presses Analyse campaign. You clear it.

### `figures[]`

`{ date, platform, campaignId, spend, results, value, clicks, impressions }`, one row per campaign per day, as the platform reports it. `campaignId` is this file's id for the campaign. `value` is `null` unless the platform reports a value. **You never write a total.** The same campaign and date replaces the row: the app keeps the last of any duplicate, but never leave one. A day with no row means no spend.

### `adFigures[]`

`{ date, platform, campaignId, adId, spend, results, value, clicks, impressions }`, one row per ad per day, written by `update-my-ads`, used only for the per-ad figures beside each ad. **A campaign's totals always come from `figures`, never from adding these up.** `adId` is the ad's `id` in this file. The same ad and date replaces the row.

### `builds[]`

```json
{
  "id": "b-x", "platform": "meta", "name": "New patient check-up, autumn",
  "objective": "leads", "status": "draft",
  "audience": { "locations": ["Marlow", "15 miles"], "ageMin": 25, "ageMax": 65, "interests": [], "keywords": [], "negativeKeywords": [], "notes": "" },
  "budget": { "daily": 15, "start": "2026-11-03", "end": "2026-11-30" },
  "season": { "label": "Autumn", "from": "09-01", "to": "11-30" },
  "ads": [ { "id": "a-x", "headline": "", "primaryText": "", "description": "", "cta": "Book now", "url": "", "media": [] } ],
  "why": "one or two plain sentences from Claude",
  "checks": [ { "id": "c-x", "text": "Check the landing page shows the autumn offer", "done": false } ],
  "refs": { "campaignId": "", "url": "", "file": "", "sheet": "" },
  "request": null, "taskId": null,
  "createdAt": "", "updatedAt": "", "approvedAt": null, "builtAt": null, "switchedOnAt": null
}
```

- **`status`**: `draft` (you wrote it, waiting for the owner), `approved` (they pressed Approve), `building` (the job is running), `in-account` (Meta: paused in the account), `ready-to-import` (Google: the file is written), `live` (it is switched on: they pressed Switch it on in the app and `make-account-change` did it, or they pressed "I've switched it on" after doing it themselves) and `dropped` (hidden, never deleted). You set `draft`, `building`, `in-account` and `ready-to-import`. **You never set `approved` or `dropped`**: they are the owner's buttons. You set `live` and `switchedOnAt` in one case only: when `make-account-change` has switched a build on for an approved action and read it back. Never write `approvedAt`.
- **`audience`**: Meta fills `locations`, `ageMin`, `ageMax`, `interests` and `notes`. Google fills `locations`, `keywords`, `negativeKeywords` and `notes`.
- **`budget`**: `daily` is a number in pounds you propose, inside their caps once live campaigns are counted. `end` is empty for an ongoing campaign.
- **`season`**: `null`, or `{ label, from, to }` in `MM-DD`, which may cross the year end (`11-15` to `01-10`). Start and end dates must fall inside it. The seasonal guard is in `.claude/skills/build-a-campaign/references/campaign-basics.md`.
- **`ads[]`**: 2 or 3 per build on Meta. A Google build has exactly 3 ads, pooled into one responsive search ad. Ads 1 and 2 each have a `headline` (30 characters at most), `primaryText` and `description` (90 at most each), which are the 2 descriptions. Ad 3 has a `headline` only, so a Google build has 3 headlines and 4 descriptions. Leave ad 3's `primaryText` and `description` empty. The limits the app counts against are `LIMITS` in `app/model.js`. `media` lists the photos and videos the owner added, as ids like `m-k3x9q2.jpg`, saved in `apps/ads/data/media/`. Leave it empty. The owner adds, orders and removes them in the app, and you only read them. You can look at the image files (open them with Read) and use what is in them in the words. You can't watch a video.
- **`prediction`**: `{ costPerResult, resultsPerWeek, spendPerWeek, from, madeAt, basis: "plan", assumptions }`, written by `build-a-campaign` from claude-ads' `ads-math` with the assumptions listed in plain sentences. It is copied to the campaign when the build goes live.
- **`fromCampaignId`** and **`brief`**: set by the app's Run campaign questions. `fromCampaignId` is the campaign being run again. `brief` is `{ audience: "same" or "change", audienceNote, budget: "same" or "change", daily, start, end, words: "keep" or "fresh" or "mix", note }`. `build-a-campaign` follows them: reuse that campaign's audience and best ads as asked.
- **`checks`**: things only the owner can confirm. They tick them in the app.
- **`refs`**: Meta: `campaignId` (the platform's id) and `url`. Google: `file` and `sheet` (the import file and the build sheet, in `files/04-marketing/ads/`). Filled by `build-in-account`.
- **`taskId`**: `null`, or the id of the switch-on task in Task List OS. `send-to-task-list` writes it when it adds that task, so a build is never sent twice. Nothing else sets it.
- **`request`**: `null`, or `{ "kind": "write" or "rewrite" or "build", "note": "", "at": "<timestamp>" }`. The app sets it and asks for a job. When you've done what it asks, set it back to `null`. `write` and `rewrite` are for `build-a-campaign`, `build` is for `build-in-account`.

### `analyses[]`

`{ id, campaignId, at, summary, working: [text], wasting: [text], couldNotSee: [text] }`, newest first, written by `analyse-campaign`. Words only: the figures beside it come from the app. Any suggestions it makes go into `suggestions` with that `campaignId`. Run `node apps/ads/app/report.js campaign <campaignId>` for the campaign's own numbers.

### `actions[]`

The account changes the owner approved. `{ id, kind: "switch-on" or "pause" or "budget", platform: "meta", campaignId, buildId, adId, budgetFrom, budgetTo, status: "requested" or "doing" or "done" or "failed", requestedAt, doneAt, readBack: "", note: "" }`.

- **The app creates it** with status `requested` after the owner confirms the pop-up. It also saves the owner's yes in its own file, `apps/ads/data/approvals.json` (`{ version, approvals: [{ id, kind, platform, campaignId, buildId, adId, budgetFrom, budgetTo, confirmedAt, closedAt }] }`), which you never write, and then opens Claude Code on screen with the `make-account-change` job typed in, so the owner sees Claude Code's own question before each Meta call. It is never run as a background job. You never create an action. Act only on a `requested` action that has a matching, unclosed entry in `approvals.json`; `report.js action <id>` checks that and prints BLOCKED without it.
- A missing or unknown `status` is read as `failed` ("unclear entry, not acted on"). If a change is still `requested` or `doing` after 30 minutes the owner can mark it failed in the campaign panel; never put a finished action back to `requested`.
- You set `doing`, then `done` with `readBack` ("Campaign is now ACTIVE, daily budget £15") or `failed` with a plain `note`.
- Only `platform: "meta"`. Run `node apps/ads/app/report.js action <id>` first and refuse on BLOCKED.
- A `switch-on` of a build also sets the build `live` with `switchedOnAt`, copies its `prediction` to the campaign and sets the campaign's `buildId`.

### `summaries[]`

`{ id, weekStart, text, createdAt }`, one per week, newest first. Your words only. The app shows that week's figures beside them, so the text must not contain a figure the app doesn't show. Get figures by running `node apps/ads/app/report.js week [YYYY-MM-DD]`, which prints the app's own numbers. `report.js todo` also says how old the newest figures are, and `report.js checks <buildId>` prints the budget and season checks for a build, ending OK or BLOCKED, `report.js campaign <campaignId>` prints one campaign's totals, weekly figures, light and prediction score, and `report.js action <actionId>` prints the limit checks for an approved account change, ending OK or BLOCKED.

### `suggestions[]`

`{ id, kind: "pause" or "budget" or "test" or "words" or "audience" or "landing" or "other", platform, campaignId, title, why, status: "new" or "approved" or "dismissed" or "done", createdAt, decidedAt, taskId: null }`. The person's Approve makes it a task for them. **You never carry one out yourself.** On Meta, an approved pause or budget suggestion can become an account change only when the owner presses the button in the app and confirms it: that creates an action, and `make-account-change` does it. On Google it stays a task with a link. Never re-add one they dismissed for the same campaign and reason.

### `wins[]`

`{ id, dealId, name, value, wonAt, campaignId: null }`. Copied, read only, from Pipeline OS deals in the `won` stage whose source is ads. The app uses them for "from customers you've won".

### `imports[]`

`{ id, at, platform, how: "connected" or "export", file, from, to, rows, note }`. One per refresh.

### `activity[]`

`{ "at": "<timestamp>", "what": "Refreshed Meta figures for 14 July to 20 October", "ref": "" }`. Add one line for every change you make, **at the front** (newest first), and keep no more than 200 (drop the oldest). `ref` is the id it's about, or empty.

### Rules for editing it safely

- Never touch another build's words, dates or status when you work on one. Never overwrite a draft the person has edited (`updatedAt` newer than your last change) without being asked.
- Never delete a build, a campaign, a figure row, a suggestion or a summary. Drop, end, dismiss or replace for the same week.
- Never type a number into the file except raw figures from a platform, a build's proposed budget and ages, a prediction's figures from `ads-math`, and dates.
- Never write anywhere except `data/ads.json` (`data/media/` only to save an ad's picture the connection handed over, and never to change or remove the owner's own files), `context/`, `files/`, `skills-to-upload/` and `setup/progress.md`.

## The page

Under the top bar sits the **rail**: **Overview | Campaigns | New campaigns | This week | To do** (with its count), a **Health check** button and the Settings gear. On the right of the rail: a date range switch, a platform switch (**All | Meta | Google Ads**, as coloured name tags), **Refresh figures** (runs `update-my-ads`) and **New campaign** (runs `build-a-campaign` after a short "What's it for?" box). Each view has its own address (`#overview`, `#campaigns`, `#builds`, `#week`, `#todo`, `#health`).

- **Overview**: tiles for spend, results, cost per result against the target (with its light), return on ad spend (marked "estimated" when it's worked out from the owner's estimate) and the pace this month. A card per platform and the 12-week trend. A strip of what's waiting on the person, which links to To do.
- **Campaigns**: a table with a light for each. Click a row for the campaign panel: its prediction score ("Claude predicted £24 per enquiry and 4 a week; it's doing £21 and 5 a week"), its 12 weeks, a carousel of its ads with each ad's own figures, and the buttons **Analyse campaign**, **Run campaign** and, on Meta, **Pause campaign** or **Switch on** and **Change daily budget** (each opens a confirm pop-up). On Google: **Open Google Ads** and **Add to my task list**.
- **New campaigns**: your drafts and builds in groups: Waiting for you, Ready to build, Switch it on and Running. Click one to edit it in place. The buttons depend on its status (see "What the app can and cannot do").
- **This week**: your summary beside the week's figures, then the suggestions (Approve or Not now) and **What should I change?**.
- **To do**: 2 columns. **Claude can do this** has a **Do it** button for each item (refresh figures, analyse a campaign, write the summary, look for changes, draft a seasonal campaign, switch on a build, pause a campaign). **You need to** has each item's own button and a line on what to give Claude. It is worked out by `todoList` in `app/model.js`, and `node apps/ads/app/report.js todo` prints it.
- **Health check**: 5 or 6 checks, each Healthy, Watch or Needs action, worked out by the app from the data.

The light, the prediction score, the pace, the budget guard and the seasonal guard are all worked out in `apps/ads/app/model.js`. The thresholds are in `docs/CUSTOMISING.md`.

## What the app can and cannot do

It can show the figures, let the person edit a draft, approve it, drop it, tick the checks, add photos and videos, copy and open the platform's own page, ask you to refresh, draft, change, build, analyse, summarise or suggest, and, on Meta, ask for one account change at a time through its confirm pop-up. It **cannot** read an ad account, create a campaign, or change one. Those jobs are yours: the background ones are in `claude-jobs.json`, and an account change is never one of them but runs on screen in Claude Code, only on the buttons and the rules above. Everything else the app does by itself.

- **Switch it on** (a Meta build that is `in-account`, or a paused Meta campaign): the pop-up says the exact change and the limits check. **Yes, do it** saves the owner's confirmation, creates an action and opens Claude Code on screen with `make-account-change` typed in (with a copy-the-words fallback). "I've switched it on myself" stays as a small link for people who did it in Meta's own page. A Google build keeps "I've switched it on".
- **Run campaign**: 5 questions (who sees it, budget, dates, the ads, anything else) create a new draft build with `fromCampaignId` and `brief`, and run `build-a-campaign`.

## Working with other tools

- **Task List OS** (when `apps/installed.json` has `task-list`): see `ATTACH-CLAUDE.md` for what lands there and how. It needs the person's click there before anything happens. The app asks for it straight away (the `send-to-task-list` job) after they approve a suggestion and after a campaign is built.
- **Pipeline OS** (`pipeline`): read `apps/pipeline/data/pipeline.json` for deals in the `won` stage whose source is ads, into `wins` (read only: never edit a deal). New Meta leads can become suggested deals there: see `ATTACH-CLAUDE.md`.
- **Money View OS** (`money`): it reads this tool's `figures` and `settings.monthlyBudget` itself. You write nothing into it.
- If a tool isn't attached, skip that part quietly.

## If something goes wrong

- The app says the file has a mistake in it: it isn't valid. Fix it by hand from the last good copy (`ads.backup.json`, which the helper writes before every save).
- A job button does nothing: Claude Code may not be installed where the helper can find it. Tell them to open this folder in Claude and say what the button says ("update my ads", "make me a campaign", "build my approved campaigns", "analyse my campaign", "do the change I approved", "how did the ads do", "what should I change").
- A connection says it can't do something, or its sign-in has run out: say so in plain words and point to `setup/connections/meta-ads.md` or `google-ads.md`. Never work round it.
- Something in an account isn't paused when it should be: stop at once, call nothing else, and tell them which one and how to switch it off in Meta's Ads Manager. Don't fix it with a tool unless it's an approved change.
