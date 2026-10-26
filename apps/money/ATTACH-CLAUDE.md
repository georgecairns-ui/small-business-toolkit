# Money View OS: what goes into CLAUDE.md when it's attached

When Money View OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Money View OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Money View OS's own setup steps: `setup/money-01-your-accounts.md` (required: an accounts app connected), `setup/money-02-your-bank.md`, `setup/money-03-money-out.md` and `setup/money-04-first-view.md`. It reuses the shared `setup/05-get-to-know-the-business.md` step rather than asking about the business twice.

---

### Money View OS

Their money month by month: what's invoiced, paid and due, a forecast of the next 12 weeks, invoices they raise and put into their accounts software as drafts, and a tax pot the app works out. Claude never moves money, never sends, approves or deletes an invoice, and never types a total, a forecast or a tax figure: the app works them out. Their data is in `apps/money/data/money.json`; `apps/money/CLAUDE.md` explains the format and the rules. What they told Claude about their money is in `context/money.md`: read it before doing anything. Open it at http://localhost:4747/money/.

| They say something like | Use |
|---|---|
| "Update my money view", "refresh my numbers", "what's in the bank?" | `.claude/skills/update-my-money-view` |
| "Is the bank feed working?" | `.claude/skills/update-my-money-view` (and `setup/connections/bank-feeds.md`) |
| "Invoice Greenway Café for the menu, £850", "raise an invoice" | `.claude/skills/raise-an-invoice` |
| "Put that in Xero", "add this invoice to my accounts" | `.claude/skills/put-invoices-in-my-accounts` |
| "Who owes me money?", "chase my invoices" | `.claude/skills/who-owes-me-money` |
| "What's coming in?", "how's cash looking?", "money check-in" | `.claude/skills/whats-coming-in` |
| "Can I afford a van?", "what if I hire someone?", "what if I lose Greenway?" | `.claude/skills/can-i-afford-this` |
| "How much should I put aside?", "tax pot", "I've moved it" | `.claude/skills/set-aside-for-tax` |
| The money part of a brain dump (handed over by the shared `sort-brain-dump`) | `.claude/skills/sort-money-brain-dump` |

Day to day:

- **Claude never moves money.** The app shows "Move £X to your Tax pot" with a button that opens their bank, and an "I've moved it" button. They make the move.
- **Claude never sends, approves or deletes an invoice.** "Put it in Xero as a draft" creates a draft only, through a connection that can, and they check and send it from there. Otherwise Money View opens the accounts app's new invoice page and they raise it there.
- **Figures come from the app.** Claude writes the records (lines, prices, dates, balances from the accounts software), never a total, a forecast or a tax figure, and never chooses a tax percentage. Every figure says where it came from and when.
- **No bank details.** Never a login, sort code, account number or card number, in any file or in chat. The bank is seen only through the bank feed inside the accounts app.
- **Suggestions wait for a click.** Regular payments Claude spots, and income from other tools, arrive as `suggested` and count only once the person confirms them.
- **Reads from other tools.** When Pipeline OS is attached (`apps/installed.json`, id `pipeline`), each deal in the `won` stage in `apps/pipeline/data/pipeline.json` becomes an `expected` item (`source: "pipeline"`, `status: "suggested"`, the deal's id in `note`), once per deal. Likewise approved or won proposals from Proposal Writing OS (id `proposals`, its data file is listed in `apps/installed.json`) become `expected` items (`source: "proposals"`, `status: "suggested"`), and advertising spend from Ads OS (id `ads`, its data file is listed in `apps/installed.json`) becomes `outgoings` (`source: "ads"`, `category: "ads"`, `status: "suggested"`). For Ads OS that means one monthly outgoing per platform in its `platforms` (named "Meta ads" or "Google Ads"): the amount is the spend of the last full month, added up from the raw `figures[].spend` rows for that platform (`apps/ads/data/ads.json`), or `settings.monthlyBudget` split by platform when there are no figures yet; `repeat: "monthly"`. Ads OS keeps no billing dates, so say the date is an estimate. Money View OS only reads these; it never edits a deal, a proposal or an ad.
- **Actions land in the task list.** When Task List OS is attached (`apps/installed.json`, id `task-list`), these also become suggested tasks there, in its own format (`apps/task-list/CLAUDE.md`): a chase for each overdue invoice that has been sent ("Chase Greenway Café for INV-0042, £850, 12 days late", due that day; never for a draft or an invoice still waiting in the accounts app to be sent), "Send INV-0043 from Xero" for each invoice sitting as a draft in their accounts software, and "Move £640 to your Tax pot" when the app's tax pot says more than £50 is left to move. The amounts are the ones the app shows. Each has `"suggested": true`, `"addedBy": "claude"` and `"source": { "tool": "money", "id": "<invoice id>" }` (for the tax pot, `"tax-pot:<date>"`). It shows on the task list's Review page with a New tag, and needs the person's click there before anything happens. Don't add one that's already there (check `source.id` and the title), and don't add a task for an invoice already paid or a draft already sent, and no chase for an invoice that hasn't been sent. Money View OS keeps its own flags either way.
- Estimates to help them plan, not financial advice. Check big decisions with their accountant.
