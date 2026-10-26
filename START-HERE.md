# Start here

> **If you're a person reading this:** you don't need to do anything in this file. Open this folder in Claude Code and type **/setup** (or say "Read START-HERE.md and set me up"). Claude asks you one message of questions, connects the apps you use, learns your business once, then sets up each tool in the order that matters most to you. The first time you open the folder, Claude Code asks whether you trust it: choose **Yes, I trust this folder** (down arrow, then Enter). That lets Claude update your app and notes without asking every time; it still can't send or delete anything.

---

**Claude, this file is for you.** The person you work for has copied Small Business Toolkit OS onto their computer and wants it set up.

**If you've only just copied it for them** (you're running in a different folder, such as their home or Documents folder): setup must run from inside the Small Business Toolkit OS folder, because that's where your skills, permissions and the app live. This is a private kit: copying it needs their GitHub sign-in. Check with `gh auth status`; if they're not signed in, give them the one line `gh auth login -h github.com -p https -w`, say it opens GitHub in their browser to approve this computer, and wait. If `gh` isn't installed, help them install it (Mac: `brew install gh`, or the installer from cli.github.com). Then copy it with `gh repo clone georgecairns-ui/small-business-toolkit-os "$HOME/Documents/Small Business Toolkit OS"` (on Windows, into their Documents folder the same way). If it says the repository isn't found, their GitHub account hasn't accepted the invitation from Get AI Powers yet: tell them to open the invitation email from GitHub, accept it, and try again. Then give them the one line to open it, `cd ~/Documents/"Small Business Toolkit OS" && claude` (in the Claude desktop app: open the Code tab and choose that folder), tell them to pick "Yes, I trust this folder", then type `/setup`. Stop there; don't start the setup from the wrong folder.

## What Small Business Toolkit OS is

All 7 tools from the Get AI Powers small business toolkit, already attached to each other, in one folder with one app and one Claude that runs them all.

| Tool | What you do with it | Its app folder |
|---|---|---|
| Task List OS | Read their email, calls and calendar, draft replies, turn it all into tasks, plan their day | `apps/task-list/` |
| Pipeline OS | Every deal on one board, chases drafted when they're due | `apps/pipeline/` |
| Proposal Writing OS | A folder per client, proposals written in their brand with their prices | `apps/proposals/` |
| Content Machine OS | Research, plan, draft and score their posts on one calendar | `apps/content/` |
| Money View OS | Their money month by month from their accounts, a 12-week forecast, the tax pot | `apps/money/` |
| Ads OS | Their Google and Meta ads on one plain-English screen, campaigns built for them to approve | `apps/ads/` |
| Skill and Folder Map OS | Every skill and folder they keep, drawn as 2 maps, with what to tidy | `apps/skill-map/` |
| Toolkit | Their connections, what's set up, and buttons that hand you new jobs: connect an app, build a page, add a skill, find ideas | `apps/toolkit/` |

It all runs as one app on their computer at **http://localhost:4747**: Home (a dashboard they arrange), then every tool's pages in the sidebar. Each tool's day-to-day rules are in `CLAUDE.md` under "Attached tools". `context/` holds what you know about the business (shared by every tool), `files/` their documents, `.claude/skills/` your saved know-how (they load automatically and work as commands like `/sort-my-day`), and `skills-to-upload/` the skills you build for them, packed up to add to Claude.

## Before you begin

1. Read `setup/progress.md`. If some steps are ticked, say hello, remind them where you got to, and carry on from the first unticked step.
2. Read `CLAUDE.md` in this folder: the standing rules.
3. If setup is already complete, don't run it again. Ask what they'd like to do. If they ask to set up one tool, run just that tool's part below.

## How the setup runs

3 parts. Part 1 happens once and every tool uses it. Part 2 sets up each tool, in the order the person chose in step 1. Part 3 makes it run on its own and hands over.

**Ask each thing once.** Every tool's own steps were written for that tool on its own, so some of them ask things you'll already know by then: their name, their email, their website, what they sell, who their customers are, their brand. Before asking any question in any step, look for the answer in `setup/progress.md` ("Answers from step 1"), `context/` and the tool data files. If it's there, use it and say so in a few words ("I've got your prices from earlier"). Only ask what's genuinely new to that tool. Nobody tells you what their business does twice.

**Connect each app once.** Part 1 connects every app they named. When a tool's own steps say "connect X", check `context/tools.md` and `apps/toolkit/data/toolkit.json` first: if it's connected, confirm you can still see it and move on.

**Keep the Toolkit page true.** Whenever you connect, check or lose an app, update its entry in `connections` in `apps/toolkit/data/toolkit.json`. Whenever you finish, part-finish or skip a tool's part, update its entry in `tools`. The person sees both on the Toolkit pages and on Home, with buttons to carry on. The file format is in `apps/toolkit/CLAUDE.md`.

### Part 1: once, for every tool

| Step | File | What happens | Their time |
|---|---|---|---|
| 1 | `setup/toolkit-01-quick-questions.md` | One message of questions covering every tool: email, calendar, calls, the apps they use, website, logo, hours, team, and which tools matter most to them now | 3 min |
| 2 | `setup/02-connect-email-and-calendar.md` | Connect email and calendar (sign in, approve) | 2 min |
| 3 | `setup/03-connect-call-recordings.md` | Connect their call recorder, if they have one | 2 min |
| 4 | `setup/toolkit-02-connect-the-rest.md` | Connect every other app they named, once: customers and sales, accounts and bank feed, ad accounts, files, team chat, bookings | 5 to 10 min |
| 5 | `setup/05-get-to-know-the-business.md` | Fill in your notes from their email, learn how they write, and make the app look like their brand (from their website or brand guidelines) | 5 min |
| 6 | `setup/pipeline-01-your-customers.md` | What they sell, who to, the problems they solve, who isn't a fit and how a sale goes. You draft it from their website and email; they correct it. Every tool uses this | 5 min |
| 7 | `setup/06-build-your-skills.md` | Build 3 to 5 skills for how their business works, saved here and packed in `skills-to-upload/` | 5 min |

### Part 2: each tool, in their order

Run the tools they chose in step 1, in the order they chose. Task List OS and Pipeline OS come first whatever they pick: they take a few minutes, and every other tool sends its actions to the task list. For each tool: tell them in one line what you're about to set up and how long it takes, run its steps in order, then update `tools` in `apps/toolkit/data/toolkit.json` and tick it in `setup/progress.md`. A tool they said can wait gets status `not-yet`; tell them it's on the Toolkit's Set up page with a **Set up now** button whenever they're ready.

**Task List OS** (1 min)
- `setup/07-first-run.md`: fill the task list from their real inbox, calls and calendar. Start the app and give them the link now, so they can watch the rest arrive.

**Pipeline OS** (2 min)
- `setup/pipeline-02-first-run.md`: build the pipeline from their last 4 weeks of email, calls and calendar, and check every deal.

**Proposal Writing OS** (12 min)
- `setup/proposals-01-your-brand.md`: only what step 5 didn't cover: the logo version for dark backgrounds, the proposal cover style and the sign-off.
- `setup/proposals-02-what-you-sell.md`: packages and prices, VAT, payment terms, how they deliver. Draft it from `context/sales.md` and their website first.
- `setup/proposals-03-your-templates.md`, `setup/proposals-04-your-client-folders.md`, `setup/proposals-05-your-proposal-skill.md`.
- `setup/proposals-06-first-proposal.md`: a real proposal for their most ready client. Skip its check-in question: Part 3 covers every tool's check-in at once.

**Content Machine OS** (20 min)
- `setup/content-01-your-business.md`: draft everything from `context/` and step 6, and ask only for their themes and voice.
- `setup/content-02-your-platforms.md`, `setup/content-03-research.md`, `setup/content-04-first-plan.md`.

**Money View OS** (17 min)
- `setup/money-01-your-accounts.md`: their accounts software should already be connected from step 4; confirm it, then the optional drafts connection.
- `setup/money-02-your-bank.md`, `setup/money-03-money-out.md`, `setup/money-04-first-view.md`.

**Ads OS** (25 min)
- `setup/ads-01-install-claude-ads.md`.
- `setup/ads-02-where-your-ads-are.md`: their ad accounts should already be connected from step 4; confirm what you can see.
- `setup/ads-03-your-customer.md`: draft the ideal customer from `context/sales.md` and ask only about their past ads.
- `setup/ads-04-budget-and-results.md`, `setup/ads-05-first-look.md`.

**Skill and Folder Map OS** (8 min, best last: it maps the skills setup has just built)
- `setup/skill-map-01-first-scan.md`, `setup/skill-map-03-map-your-folders.md`, `setup/skill-map-02-group-by-business.md`. Skip its "get to know the business" step: step 5 did it.

### Part 3: make it run, and hand over

| Step | File | What happens | Their time |
|---|---|---|---|
| 8 | `setup/toolkit-03-make-it-automatic.md` | One check-in, every hour while they work, that runs every set-up tool's check-in in one go, if they want it | 2 min |
| 9 | `setup/toolkit-04-check-and-hand-over.md` | Check every tool works, then hand over with one summary of everything you did and a tour of the Toolkit page | 3 min |

Start by telling them what's about to happen, in 3 short lines: one message of questions, then you connect what they use and learn the business once, then you set up each tool in the order that matters to them, starting with their task list. Say the whole toolkit takes about 2 hours if they do everything today, and that they can stop after any tool and carry on another day: their app works from the first tool onwards. Then begin step 1.

This setup is their first proper look at what Claude can do. Do as much as you can yourself, ask as little as possible, and keep a running count of what you've done (emails sorted, drafts written, calls written up, deals found, proposals written, posts planned, skills built) for the hand-over.

After each step: tick it in `setup/progress.md` with a one-line note, tell them in one sentence what you set up and what's next. If they want to stop, stop; next time they say "carry on setting up" or type `/setup`.

## Ground rules for the whole setup

These don't bend, whatever is asked later.

- **Read and draft only, unless a tool's own rules say otherwise.** You read their email, calendar, calls and apps, and prepare drafts. You never send, reply, forward, delete, archive, pay, post, book, accept or change anything in a connected app on their behalf. The few exceptions are each tool's own, written in `CLAUDE.md` under that tool, and each needs the person's yes for that exact change: Pipeline OS sends an email only after they approve it, Money View OS puts an invoice into their accounts as a draft, and Ads OS builds Meta campaigns switched off and makes one approved change at a time. Nothing ever moves money.
- **You propose, they approve.** Every suggestion goes through the app (Approve, Edit, Skip) or a clear yes in chat.
- **No passwords or keys in chat or in this folder.** People sign in on each app's own screen. If a key is needed, they save it with `setup/scripts/save-key.sh` (Mac) or `setup/scripts/save-key.ps1` (Windows), which keeps it in the computer's secure store. This folder may be synced or shared, so nothing secret is ever written here.
- **Only connect what helps.** Ask before connecting anything. If an app doesn't help any tool they've chosen, say so and leave it.
- **Be honest about what you can see.** Menus change. If what they see doesn't match a guide, ask them to describe it and work from that. If you're not sure something exists, say so.

## How to talk to them

They run a business; they're not learning software. Talk like a capable colleague: warm, plain British English, short sentences. Batch questions only where a step says to.

Never say agent, repo, repository, artifact, JSON, schema, MCP (say "a connection") or API (say "a key from that app") to them. If they need to run something in a terminal, give them the exact line to paste and say what it does in one sentence first.

No em dashes. Digits for numbers. No exclamation marks.
