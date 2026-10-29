# Start here

> **If you're a person reading this:** you don't need to do anything in this file. Open this folder in the Claude desktop app (the Code tab) and type **/setup** (or say "Read START-HERE.md and set me up"). Claude asks you one message of questions, connects the apps you use, learns your business once, then sets up each tool in the order that matters most to you. The first time you open the folder, the app asks whether you trust it: choose **Yes, I trust this folder**. That lets Claude update your app and notes without asking every time; it still can't send or delete anything.

---

**Claude, this file is for you.** The person you work for has copied the Small Business Toolkit onto their computer and wants it set up.

**If you've only just copied it for them** (you're running in a different folder, such as their home or Documents folder): setup must run from inside the Small Business Toolkit folder, because that's where your skills, permissions and the app live. Copy it as a plain folder, so it's theirs alone and not linked to the copy online. Use the line for their computer:
  - Mac: `D="$HOME/Documents/Small Business Toolkit"; mkdir -p "$D/setup/as-installed" && curl -fsSL -o "$D/setup/as-installed/small-business-toolkit.tar.gz" https://github.com/georgecairns-ui/small-business-toolkit/archive/refs/heads/main.tar.gz && tar -xzf "$D/setup/as-installed/small-business-toolkit.tar.gz" --strip-components 1 -C "$D"`
  - Windows (PowerShell): `$d = "$HOME\Documents\Small Business Toolkit"; New-Item -ItemType Directory -Force "$d\setup\as-installed" | Out-Null; curl.exe -fsSL -o "$d\setup\as-installed\small-business-toolkit.tar.gz" https://github.com/georgecairns-ui/small-business-toolkit/archive/refs/heads/main.tar.gz; if ($LASTEXITCODE -eq 0) { tar -xzf "$d\setup\as-installed\small-business-toolkit.tar.gz" --strip-components 1 -C "$d" }`

  If the download fails, check their internet connection and run the line again. Don't try another way in.

  The download is kept in `setup/as-installed/` on purpose: it is what lets you bring this folder up to date later, without losing anything of theirs (the `get-updates` skill).

  If you've already copied it another way (for example with `git clone`, or into a different folder), that's fine: use that folder. Then give them the steps to open it: in the Claude desktop app, open the Code tab, choose that folder, pick "Yes, I trust this folder", then type `/setup`. Stop there; don't start the setup from the wrong folder.

## What the Small Business Toolkit is

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

1. **Check you're in the Claude desktop app.** Connector tools are often deferred, so they may not be in your visible tool list until you load them. First search your tools for `session_connectors_status` (for example with your tool search), then call it. If you can't find it, or the call fails, you're not in the desktop app's Code tab, and you can't check or switch on their connections. Then stop and say, in your own words: "Setup needs the Claude desktop app. Open it, choose the Code tab, pick this folder and type /setup." Do nothing else.
2. **Ask how much they've used Claude Code,** but only when it's needed. One question, on its own. Read `setup/progress.md` first. If it says setup is complete, skip the question. If it has `Guide mode: beginner`, `Guide mode: some` or `Guide mode: confident`, use that. If it says `Guide mode: not asked yet`, ask: "Before we start: how much have you used Claude Code? 1. Never 2. A few times 3. Most days." Write the answer in `setup/progress.md` in place of `not asked yet`, as `Guide mode: beginner`, `Guide mode: some` or `Guide mode: confident`, and guide them that way for the whole setup:

   | Guide mode | How you guide |
   |---|---|
   | beginner | One step per message. Say where every button is on their screen ("top left", "the + under the message box"). Plain words only: "connection", never MCP, API, JSON or repo. Check each thing worked before the next, and say what you just did |
   | some | 2 or 3 steps per message, and a check after each connection |
   | confident | Batch it, email and calendar first, then the rest: "Connect your email and calendar, then your accounts app and your ad accounts, in Connectors, and tell me when they're done", then check them all at once |

   The guide mode changes the pace and how much you explain. It never changes the rules: every connection is proven with a real read, and email and calendar come before any other connection.
3. Read `setup/progress.md`. If some steps are ticked, say hello, remind them where you got to, and carry on from the first unticked step.
4. Read `CLAUDE.md` in this folder: the standing rules.
5. If setup is already complete, don't run it again. Ask what they'd like to do. If they ask to set up one tool, run just that tool's part below. If steps 1 and 2 in `setup/progress.md` aren't ticked, run Part 1 from its first unticked step first, and say so in one line.

## How the setup runs

3 parts. Part 1 happens once and every tool uses it. Part 2 sets up each tool, in the order the person chose in step 1. Part 3 makes it run on its own and hands over.

**Ask each thing once.** Every tool's own steps were written for that tool on its own, so some of them ask things you'll already know by then: their name, their email, their website, what they sell, who their customers are, their brand. Before asking any question in any step, look for the answer in `setup/progress.md` ("Answers from step 1"), `context/` and the tool data files. If it's there, use it and say so in a few words ("I've got your prices from earlier"). Only ask what's genuinely new to that tool. Nobody tells you what their business does twice.

**Connect each app once.** Part 1 connects every app they named. When a tool's own steps say "connect X", check `apps/home/data/connections.json` and `context/tools.md` first: if it's `connected`, confirm with one harmless read that you can still reach it and go to the next step of that tool.

**Keep the Toolkit page true.** Whenever you connect, check or lose an app, update its row in `apps/home/data/connections.json` (the format is in `setup/connections/README.md`, "Recording a connection"), and only write `connected` after a real read works. Whenever you finish, part-finish or skip a tool's part, update its entry in `tools` in `apps/toolkit/data/toolkit.json` (the format is in `apps/toolkit/CLAUDE.md`). The person sees both on the Toolkit pages and on Home, with buttons to carry on.

**One check-in for everything.** Step 8 makes the only scheduled task in this folder. When a tool's own steps offer a check-in or a scheduled task of their own (Pipeline OS's check-ins step, Proposal Writing OS's check-in step, or the weekly plan, the money refresh or the weekly scan that Content Machine, Money View and Skill and Folder Map OS offer at their hand-over), don't make it: step 8 covers it.

### Part 1: once, for every tool

| Step | File | What happens | Their time |
|---|---|---|---|
| 1 | `setup/toolkit-01-quick-questions.md` | One message of questions covering every tool: email, calendar, calls, the apps they use, website, logo, hours, team, and which tools matter most to them now | 3 min |
| 2 | `setup/02-connect-email-and-calendar.md` | Connect email and calendar, prove both, and read the last 30 days once for every tool: the task list, the pipeline and the client folders. Nothing else happens until this is done | 5 to 10 min |
| 3 | `setup/03-connect-call-recordings.md` | Connect their call recorder, if they have one | 2 min |
| 4 | `setup/toolkit-02-connect-the-rest.md` | Connect every other app they named, once, through Claude's Connectors (no keys), and prove each: customers and sales, accounts and bank feed, ad accounts, files, team chat, bookings | 5 to 10 min |
| 5 | `setup/05-get-to-know-the-business.md` | Fill in your notes from their email, learn how they write, and make the app look like their brand (from their website or brand guidelines) | 5 min |
| 6 | `setup/pipeline-01-your-customers.md` | What they sell, who to, the problems they solve, who isn't a fit and how a sale goes. You draft it from their website and email; they correct it. Every tool uses this | 5 min |
| 7 | `setup/06-build-your-skills.md` | Build 3 to 5 skills for how their business works, saved here and packed in `skills-to-upload/` | 5 min |

### Part 2: each tool, in their order

Run the tools they chose in step 1, in the order they chose. Task List OS and Pipeline OS come first whatever they pick: they take a few minutes, and every other tool sends its actions to the task list. For each tool: tell them in one line what you're about to set up and how long it takes, run its steps in order, then update `tools` in `apps/toolkit/data/toolkit.json` and tick it in `setup/progress.md`. A tool they said can wait gets status `not-yet`; tell them it's on the Toolkit's Set up page with a **Set up now** button whenever they're ready.

**Task List OS** (1 min)
- `setup/07-first-run.md`: fill the task list from their real inbox, calls and calendar. Start the app and give them the link now, so they can watch the rest arrive.

**Pipeline OS** (2 min)
- `setup/pipeline-02-first-run.md`: build the pipeline from the people and deals step 2 found in 30 days of email, their calls and calendar, and check every deal. Skip `setup/pipeline-03-check-ins.md`: step 8 covers it.

**Proposal Writing OS** (12 min)
- `setup/proposals-01-your-brand.md`: only what step 5 didn't cover: the logo version for dark backgrounds, the proposal cover style and the sign-off.
- `setup/proposals-02-what-you-sell.md`: packages and prices, VAT, payment terms, how they deliver. Draft it from `context/sales.md` and their website first.
- `setup/proposals-03-your-templates.md`, `setup/proposals-04-your-client-folders.md`, `setup/proposals-05-your-proposal-skill.md`.
- `setup/proposals-06-first-proposal.md`: a real proposal for their most ready client. Its check-in step isn't run here: step 8 covers every tool's check-in at once.

**Content Machine OS** (20 min)
- `setup/content-01-your-business.md`: draft everything from `context/` and step 6, and ask only for their themes and voice.
- `setup/content-02-your-platforms.md`, `setup/content-03-research.md`, `setup/content-04-first-plan.md`.

**Money View OS** (17 min)
- `setup/money-01-your-accounts.md`: their accounts software should already be connected from step 4; confirm it with one harmless read. Don't offer Xero draft invoices: that optional extra (`setup/connections/xero-drafts.md`) is only for when they ask.
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
| 8 | `setup/toolkit-03-make-it-automatic.md` | You agree the check-in times (or they skip it), Claude lets check-ins read without stopping, creates the one check-in for every tool and proves it runs | 2 min |
| 9 | `setup/toolkit-04-check-and-hand-over.md` | Check every tool works, then hand over with one summary of everything you did and a tour of the Toolkit page | 3 min |

Start by telling them what's about to happen, in 3 short lines: one message of questions, then you connect what they use and learn the business once, then you set up each tool in the order that matters to them, starting with their task list. Say the whole toolkit takes about 2 hours if they do everything today, and that they can stop after any tool and pick up where they left off another day: their app works from the first tool onwards. Then begin step 1.

This setup is their first proper look at what Claude can do. Do as much as you can yourself, ask as little as possible, and keep a running count of what you've done (emails sorted, drafts written, calls written up, deals found, proposals written, posts planned, skills built) for the hand-over.

After each step: tick it in `setup/progress.md` with a one-line note, tell them in one sentence what you set up and what's next. If they want to stop, stop; next time they say "carry on setting up" or type `/setup`.

## Ground rules for the whole setup

These don't bend, whatever is asked later.

- **Read and draft only, unless a tool's own rules say otherwise.** You read their email, calendar, calls and apps, and prepare drafts. You never send, reply, forward, delete, archive, pay, post, book, accept or change anything in a connected app on their behalf. The few exceptions are each tool's own, written in `CLAUDE.md` under that tool, and each needs the person's yes for that exact change: Pipeline OS sends an email only after they approve it, Money View OS puts an invoice into their accounts as a draft, and Ads OS builds Meta campaigns switched off and makes one approved change at a time. Nothing ever moves money.
- **You propose, they approve.** Every suggestion goes through the app (Approve, Edit, Skip) or a clear yes in chat.
- **No passwords or keys in chat or in this folder.** People sign in on each app's own screen, through Claude's Connectors. Setup never uses keys. (The one optional extra that does, Xero draft invoices, has its own guide, `setup/connections/xero-drafts.md`. It is only offered when they ask for it.) This folder may be synced or shared, so nothing secret is ever written here.
- **Only connect what helps.** Ask before connecting anything. If an app doesn't help any tool they've chosen, say so and leave it.
- **Be honest about what you can reach.** Check the connection status yourself rather than asking what's on their screen, and prove every connection with a real read before you rely on it. If you're not sure a connector exists, search Claude's connector directory and say what you found.

## How to talk to them

They run a business; they're not learning software. Talk like a capable colleague: warm, plain British English, short sentences. Batch questions only where a step says to.

Never say agent, repo, repository, artifact, JSON, schema, MCP (say "a connection") or API to them. If a step needs a command run, run it yourself and tell them in one sentence what it does.

No em dashes. Digits for numbers. No exclamation marks.
