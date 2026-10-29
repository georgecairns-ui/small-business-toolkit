# Small Business Toolkit

**Your whole business, run with Claude, in one app.** All 7 tools from the [Get AI Powers](https://getaipowers.com) small business toolkit, already joined up, for clients of Get AI Powers.

Claude reads your email and drafts the replies, writes up your calls, keeps your pipeline moving, writes your proposals in your brand, plans your posts, shows you your money month by month and keeps an eye on your ads. Everything lands in one calm app on your computer for you to approve with a click.

Nothing goes out without you. Claude reads and drafts; you decide and you send.

## What's in it

| Tool | What it does for you |
|---|---|
| **Task List OS** | Your inbox sorted with replies drafted, your calls written up, your brain dump turned into tasks, and a plan for today. Every other tool's actions land here |
| **Pipeline OS** | Every deal on one board by stage. Claude spots the chases that are due and drafts each one |
| **Proposal Writing OS** | A folder per client, and proposals written in your brand with your packages and prices |
| **Content Machine OS** | Research on what your customers search for, then your posts planned, drafted and scored on one calendar |
| **Money View OS** | What's invoiced, paid and due, a 12-week forecast and the tax to put aside, from your accounts app. It never moves money |
| **Ads OS** | Your Google and Meta ads on one plain-English screen, with campaigns built for you to approve |
| **Skill and Folder Map OS** | Every skill Claude has and every folder you keep, drawn as 2 maps, with what to tidy first |
| **Toolkit** | Your connections, what's set up, and buttons that hand Claude the next job |

## The Toolkit section

The last part of the app's menu is where your toolkit grows with you. You don't need to know what to ask Claude for:

- **Connections:** every app the toolkit can use (email, calendar, call recorder, CRM, accounts, ads, files, team chat), whether it's connected, which tools use it, and a **Connect** button.
- **Set up:** each tool's status. Anything you left for later has a **Set up now** button.
- **Build and customise:** **Build me a new page**, **Add a skill for a job I repeat**, **Change how something works**, **Change the look**, **Automate a routine**, **Add my team**. Below them, Claude's own ideas for what would save you the most time next, each with a **Do it** button.

Every button opens Claude with the job already typed in. Press Enter and it gets on with it.

## What happens when you type /setup

Claude asks **one message of questions** covering every tool: your email, calls, the apps you use, your website and logo, and which tools matter most to you right now. Then it:

- **Connects your apps once.** Email and calendar first, then your call recorder, CRM, accounts, ad accounts and the rest, one by one, mostly sign in and approve. Claude checks each connection itself and proves it with a real read, then reads your last 30 days of email once, so your task list, pipeline and client folders all start full.
- **Learns your business once.** What you sell, who to, how a sale goes, how you write, your brand. Every tool uses the same notes, so you never answer the same question twice.
- **Builds you your own skills** for how your business works, saved so you can add them to Claude everywhere.
- **Sets up each tool in your order.** Your task list and pipeline first, then the rest. Each one fills with your real work as it goes.
- **Makes it run on its own, if you'd like.** One check-in for every tool at once, a few times a day, at times you choose. You can skip it.

Doing everything takes about 2 hours. You can stop after any tool: the app works from the first one, and the Toolkit page has a **Set up now** button for the rest.

## What you need

- **The Claude desktop app** (setup runs in its Code tab).
- **A paid Claude plan (Pro or Max)**, signed in to the desktop app. Your email, calendar and app connections come from your Claude account, so Claude can only use them when you're signed in.
- Nothing else to install in most cases. The app runs on your own computer using Node (Claude installs it for you if it's missing, with your permission).

## Get started

1. **Open the Claude desktop app and choose the Code tab.** Any folder will do for this first step.
2. **Ask Claude to fetch the kit.** Paste this:
   > Copy the Small Business Toolkit from https://github.com/georgecairns-ui/small-business-toolkit into a folder called "Small Business Toolkit" in my Documents, using the copy line in its START-HERE.md (not git), then tell me how to open it and set it up.

   Claude copies everything onto your computer and tells you how to open the new folder. In the desktop app, you choose the folder in the Code tab.

   *For Claude, if this README is all you have:* read START-HERE.md on the repository page at https://github.com/georgecairns-ui/small-business-toolkit, then copy the folder with the Mac or Windows line in it.
3. **In the Code tab, choose the Small Business Toolkit folder and pick "Yes, I trust this folder".** The first time, the app asks whether you trust the folder and warns that it pre-approves some permissions. Those permissions only let Claude update your app, your business notes and your files folder, search the web and start the app, without stopping to ask each time. It still can't send, delete or change anything in your email or other apps.
4. **Type `/setup`.**

When it's done, your app is at **http://localhost:4747**. Bookmark it.

Apps connect through Claude's Connectors: each one asks you to sign in on that app's own page, and you never paste a password or a key anywhere. An app with no Claude connector is read from a CSV or PDF export that you drop in the files folder.

## Every day

| Say (or type the command) | What happens |
|---|---|
| "Check everything" (`/toolkit-check-in`) | Anything new across every tool. If you'd like, it runs on its own a few times a day, at times you choose |
| "Sort my day" (`/sort-my-day`) | Your plan for today, from your list, inbox, calls and calendar |
| "Who should I chase?" | The deals and proposals that need a nudge, with drafts |
| "Write a proposal for Greenway" | A proposal in your brand, for you to check |
| "How's cash looking?" | Cash today, what's owed to you and your tightest point ahead |
| "Plan my content" | Your next weeks of posts, drafted in your voice |
| "How did the ads do?" | Each campaign against what you're aiming for, in plain words |
| "What should I do next?" | Claude's ideas for what would save you the most time, on the Toolkit page |

## Your information

Everything lives in this folder on your computer. Claude reads your apps through the connections you approve and only ever reads and drafts, apart from the few things a tool does when you press its button and say yes (sending an email you approved, putting an invoice into your accounts as a draft, building an ad campaign switched off). Nothing ever moves money. There's no account or server; Get AI Powers can't see any of it. Read [docs/PRIVACY-AND-SAFETY.md](docs/PRIVACY-AND-SAFETY.md) for the detail.

## Licence

For Get AI Powers clients, to use and change for your own business. Not for resale or sharing outside your business. See [LICENSE](LICENSE).
