# Connect Xero so Claude can put invoices in as drafts (optional)

One line: lets Money View put an invoice into Xero as a **draft**, so the person checks it and sends it from Xero. **This is optional.** Money View works without it: it opens Xero's new invoice page and they raise the invoice there.

**Route:** Xero's own open source connection (the XeroAPI `xero-mcp-server`, published by Xero). It is separate from the Xero connection in the Claude app, which only reads. It takes about 10 minutes, once. **Plans:** needs an active Xero subscription and permission to manage the organisation in Xero. **Cost:** whether a Xero custom connection costs extra: to check. Look at Xero's developer pricing before you tell the person it's free: https://developer.xero.com/pricing. Say "it may cost a small monthly fee, and I'll check the current price with you before you commit".

Before you start, say plainly, in your own words:

> This is the one step that's a bit fiddly. You'll make a small private connection inside Xero for Claude, save its 2 codes on this computer, and add it to Claude. It lets Claude create invoices as drafts. It can't send them: you check each draft in Xero and press send yourself. Want to do it now, or skip it and raise invoices in Xero yourself for now?

If they skip, set `sources.accounts.mode` to `read` and carry on. They can come back later by saying "put invoices in Xero".

## What you need first

- The read-only Xero connection from `setup/connections/xero.md`, working.
- Someone who can sign in to Xero as an adviser or admin for the organisation (usually them).
- The free program Node, which the app already needs (`.claude/skills/open-my-toolkit` installs it).

## Click by click

Ask what they see at each step and wait for the answer. Xero's screens change, so go by what they tell you.

1. In a web browser, go to https://developer.xero.com and sign in with the same login they use for Xero.
2. Choose **My apps**, then **New app**.
3. Give it a name they'll recognise, such as "Claude drafts". Under the type of app, choose **Custom connection**. Add any web address for the company website (their own is fine) and tick the box to agree to Xero's terms. Press **Create app**.
4. Xero asks which organisation to connect and which permissions to give it. **Tick one permission only: `accounting.invoices`.** Never `accounting.transactions` (it is wider: it covers payments, bank transactions and more), and nothing else: no contacts, payments, bank transactions, journals, reports or settings. If you're not sure whether to tick one, don't. If the only invoice permission Xero shows is `accounting.transactions`, stop: don't continue, leave the mode as `read`, and tell George (it's in the "To check" list in `maintainers/MAINTAINING.md`).
5. Xero asks someone with the right access to **authorise** the connection (it may send an email to the organisation's admin). Once that's done, the app's **Configuration** page shows a **Client ID**. Press **Generate a secret**: the **Client secret** shows once, so keep the window open until step 6 is done.
6. **Save both codes safely, on this computer, not in the chat.** Tell them:
   > I'll give you a line to paste into the Terminal app (on a Mac) or PowerShell (on Windows). It asks you to paste a code, and nothing shows while you paste: that's normal. Don't type the codes in here.
   - Mac, in this folder: `bash setup/scripts/save-key.sh XERO_CLIENT_ID`, then `bash setup/scripts/save-key.sh XERO_CLIENT_SECRET`.
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 XERO_CLIENT_ID`, then the same with `XERO_CLIENT_SECRET`.
   Each asks them to paste the code, then stores it in the computer's secure store. Then they close the terminal and open a new one.
7. **Add the connection to Claude.** Run, for them or in their terminal, from this folder:
   `claude mcp add xero --scope user --env 'XERO_CLIENT_ID=${XERO_CLIENT_ID}' --env 'XERO_CLIENT_SECRET=${XERO_CLIENT_SECRET}' -- npx -y @xeroapi/xero-mcp-server@latest`
   The `${...}` makes Claude read the codes from the secure store each time instead of storing them. Whether Claude Code fills those in for this kind of connection: to check. If it doesn't work, the fallback is to set the same 2 names as the computer's own environment variables before opening Claude Code, which `save-key` already does. Never paste the codes into this command.
8. Close Claude Code and open this folder again, so it picks the connection up.

## Check it works

1. Check the tools Claude now has. You should see a tool that creates an invoice (the name may be `create-invoice`: to check). Say what you found in plain words.
2. With their permission, use the read-only Xero connection from `xero.md` (not this one) to read their contacts. Say "I can see 38 contacts, including Greenway Café." Contacts are always read through that connection, because this one only has the invoices permission.
3. **Don't create a test invoice in their real books.** The first real draft is the test: when they press **Put it in Xero as a draft** on a real invoice, Claude creates it, and they check it in Xero. Before that, say which things you'll check with them: the customer, the lines, the dates, the VAT rate.
4. If the tools aren't there, say so plainly, don't try another way in, and leave the mode as `read`. Set `sources.accounts.mode` to `drafts` only once you've seen a tool that can create an invoice.

## Rules for Claude with this connection

- **Drafts only.** The only thing Claude may create is a **draft** sales invoice, and only for an invoice in Money View that has a draft request. Never approve, authorise, send, email, void or delete an invoice. Never record a payment, create a bill or touch bank transactions, accounts or settings.
- **Claude never creates a contact in Xero, ever.** Before it creates a draft, Claude checks that the customer is already a contact in Xero (through the read-only Xero connection) and uses that contact. A customer name Xero doesn't know can make Xero create a contact by itself, so Claude never passes one. If the customer isn't a contact yet, Claude sets the invoice back to draft, clears the request, and flags: "Add <customer> as a contact in Xero, then press Put it in Xero again". The person adds the contact in Xero themselves.
- **Every tool that creates something asks the person first.** Don't pre-approve any of these tools in `.claude/settings.json`, and never try to get round the question.
- Never ask for the codes in chat. Never write them in a file.
- If anything looks wrong in a draft (a customer that doesn't match, a rate that isn't right), stop and say so rather than guess.

## If they want to switch it off

Delete the app in the Xero developer area (My apps, open it, Delete), and remove the connection from Claude (`claude mcp remove xero`). Set `sources.accounts.mode` back to `read` in `apps/money/data/money.json`. The 2 saved codes can stay in the computer's secure store: they no longer work once the app is deleted.

## What to record

Add to `context/tools.md`: "Xero drafts | Xero's own open source connection (custom connection), codes in the computer's secure store | <date> | Create draft invoices, after the person's yes each time | Approve, send, email, void or delete an invoice, record a payment, anything else".

## To check

- What a Xero custom connection costs, and whether it's open to every UK organisation.
- That `accounting.invoices` alone is enough to create a draft invoice for an existing contact (we never use `accounting.transactions`), and the exact names of the permissions Xero offers today.
- That the codes can be passed as shown in step 7.
- The exact names of the connection's tools, and that an invoice made with it is always a draft. Once they're seen, add deny rules for every tool that approves, sends, emails, voids, deletes or takes a payment (`maintainers/MAINTAINING.md`).
- How the connection chooses a tax rate for a line.

## Sources

Read on 21 October 2026, not yet tried with a real Xero account.
- https://github.com/xeroapi/xero-mcp-server
- https://developer.xero.com/documentation/guides/oauth2/custom-connections
- https://developer.xero.com/pricing
