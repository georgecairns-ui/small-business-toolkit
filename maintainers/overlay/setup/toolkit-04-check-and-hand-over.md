# Step 9: check and hand over

Goal: prove every tool you set up works, both ways, then leave them with one clear picture of what they've got and what's waiting for later.

## 9.1 Check each tool you set up

`setup/09-check-and-hand-over.md` is Task List OS's checklist: run its section 9.1 for the task list. For every other tool with status `set-up` in `apps/toolkit/data/toolkit.json`, check its data file reads back cleanly and has their real information in it, and that its settings have their name and business:

| Tool | Data file | Good looks like |
|---|---|---|
| Pipeline OS | `apps/pipeline/data/pipeline.json` | Real deals, each with a stage, a value where known and a next step |
| Proposal Writing OS | `apps/proposals/data/proposals.json` | Their packages and prices, brand set up, at least one proposal |
| Content Machine OS | `apps/content/data/content.json` | Themes, platforms, research filled in, a plan for the next weeks |
| Money View OS | `apps/money/data/money.json` | Accounts connected, the bank in, invoices and regular bills, the tax pot set |
| Ads OS | `apps/ads/data/ads.json` | Budget and limits, what a result is worth, figures for each campaign |
| Skill and Folder Map OS | `apps/skill-map/data/skillmap.json`, `filemap.json` | Skills scanned and grouped, the folders they chose mapped |

Fix anything that fails, then check again.

**The Toolkit page** (`apps/toolkit/data/toolkit.json`)
- [ ] Every app in `context/tools.md` is in `connections` with the right status and today's date.
- [ ] Every tool has a status. Anything they chose to leave for later says `not-yet`.
- [ ] Up to 3 ideas, from `.claude/skills/whats-next`, each with a ready prompt.
- [ ] `builds` lists the skills you built in step 7 and anything else you made for them.

**With them** (ask them to do these 4 things)
- [ ] They open **http://localhost:4747** (or their bookmark). Home greets them by name with boxes from their tools.
- [ ] On the task list's **Review**, they approve one suggestion. Read the task file again and check it changed. Tell them: "That's working both ways. I can see you approved [task]."
- [ ] They open **Toolkit**, then **Connections**, and see their apps marked Connected.
- [ ] They open **Toolkit**, then **Build and customise**, and press **Not now** on an idea they don't want. Read the file again and check it changed.

## 9.2 Note what's missing, gently

`setup/09-check-and-hand-over.md` section 9.2 says how. Mention it once, for the whole toolkit, never once per tool.

## 9.3 Hand over

1. In `setup/progress.md`, change "Setup status" to `complete on <date>` and tick step 9. In `CLAUDE.md`, change `Setup: not done yet` to `Setup: complete on <date>`.
2. Tell them what you did, as one short list with real numbers across every tool. For example: "Connected Gmail, Google Calendar, Fathom, Pipedrive and Xero. Sorted 143 emails and drafted 9 replies. Wrote up 4 calls. Put 23 deals on your pipeline. Wrote a proposal for Greenway. Your money view shows £8,400 owed to you. Built you 4 skills."
3. Their skills, in one line: they're in the **skills-to-upload** folder, and adding them to Claude (Customize, then Skills) means they work in every conversation, including on their phone.
4. Then, briefly:
   - Their link, **http://localhost:4747**, and whether it starts with their computer.
   - What's connected, and that you read and draft; each tool's exceptions (sending an approved email, a draft invoice, a paused campaign) only ever happen when they press the button and say yes.
   - Whether you're checking in automatically, and when.
   - **The Toolkit section** in the sidebar: Connections shows every app and connects new ones with one button; Set up has a **Set up now** button for each tool they left for later; Build and customise is where they ask for a new page, a new skill or a change, and where your ideas for what to do next appear. Every button opens Claude with the job already typed in.
   - The phrases that do most of the work: "sort my day", "check everything", "what's my pipeline?", "write a proposal for...", "how's cash looking?", "plan my content", "how did the ads do?". In Claude Code each skill also works as a command, for example `/sort-my-day`.
