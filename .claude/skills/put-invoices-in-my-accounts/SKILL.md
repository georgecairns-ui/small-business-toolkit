---
name: put-invoices-in-my-accounts
description: Puts the invoices the person has asked for into their accounts app as DRAFTS, through the connection that can create them (for Xero, the optional drafts connection; for QuickBooks, Intuit's connector). Never approves, sends or emails an invoice, never changes or deletes one, never creates a contact. If the connection can't create drafts, or the customer isn't already a contact in Xero, sets the invoice back to draft and says so in plain words. Use when the app asks (an invoice with a draft request), or when they say "put that in Xero", "add this invoice to my accounts", "send this to Xero as a draft" or "put the invoice in as a draft".
---

# Put invoices in my accounts, as drafts

The person wrote an invoice in Money View and pressed "Put it in <app> as a draft". You create it in their accounts app as a draft. They check it and send it from there. You never send, approve or email it.

## What you need

- `apps/money/data/money.json`: every invoice with `request.kind: "draft"` (or the one the person names), `settings` and `sources.accounts`.
- The connection that can create invoices for their accounts app. For Xero it is the optional drafts connection in `setup/connections/xero-drafts.md`, which has the `accounting.invoices` permission only (never `accounting.transactions`). For QuickBooks it is Intuit's connector (`setup/connections/quickbooks.md`). Look at the tools it offers before anything else.
- For Xero, the read-only Xero connection too (`setup/connections/xero.md`): it is how you check the customer is a contact.

## Steps

1. Read the data file now. Take every invoice with `request.kind: "draft"` and `status: "waiting"`. If there are none, say so.
2. **Can the connection create drafts?** Look at the tools you have. If there is a tool that creates an invoice and you can ask it for a draft, carry on. If not (only the read-only connection is there, or the connection is down), do this for every invoice you were asked about, then stop:
   - set `status` back to `draft` and `request` to `null`,
   - add a flag to `flags` (`kind: "other"`, `status: "open"`, `at` now, `invoiceId`) saying, in plain words: "Claude can't put invoices into your accounts app yet, because the drafts connection isn't set up. Raise it there yourself (Money View opens the page), or set the drafts connection up from setup/connections/xero-drafts.md."
   Never try another way of creating it.
3. **For each invoice:**
   - **Contacts: you never create one.** Find the customer in the accounts app's contacts, through the read-only connection (for Xero, `get_contacts`), matching the name exactly. If there is no match, don't create anything and don't pass a name Xero doesn't know (Xero could create a contact from it): set the invoice back to `draft`, clear `request`, set `updatedAt`, and add a flag (`kind: "other"`, `status: "open"`, `at` now, `invoiceId`) with this text: "Add <Customer> as a contact in Xero, then press Put it in Xero again". If there is a match, use that contact.
   - Create the invoice as a sales invoice with status **DRAFT** in Xero (never authorised or approved). In QuickBooks, create the invoice without sending or emailing it (whether QuickBooks keeps it unsent until they send it is still "to check"; say so to the person). Use the invoice's `issueDate` and `dueDate`, its lines as given (description, quantity, unit price before VAT), the Money View number as the reference (so the person can match them), and amounts before tax. Pick each line's tax rate from the rates the accounts app lists: 20, 5 or 0 (to check how each accounts app names them). If a rate doesn't match, don't guess: leave that invoice as `draft` with a flag saying which line.
   - Never email it, mark it sent, approve it, or set a status other than draft.
   - Set `ref` to the accounts app's own number or id for it, `status` to `in-accounts`, and clear `request`. Set `updatedAt`.
4. Add a line to `activity` at the front for each ("Put INV-0043 in Xero as a draft"), keeping 200.
5. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.
6. **Task list (only if attached).** Follow `apps/money/ATTACH-CLAUDE.md`: a suggested task "Send INV-0043 from Xero" for each invoice now sitting as a draft there. Don't add one that's already there.

## What to say back

> I've put INV-0043 in Xero as a draft. Open Xero, check it, and send it from there. Nothing has been sent.

If one couldn't go in, say which and why in a line.

## Rules

- Drafts only. Never approve, send, email, void, edit or delete an invoice in the accounts app, or take a payment.
- Every tool that creates something asks the person first: that's right, don't try to get round it.
- Never create a contact, a payment, a bill or anything else. Only the draft invoice, for a customer who is already a contact.
- Xero's drafts connection has the `accounting.invoices` permission only. If it seems to need more (contacts, transactions, payments), stop and say so: don't ask for more.
- Never change what the person wrote in Money View, except `status`, `ref` and `request`.
- Never write a total or a tax amount: the accounts app works out its own from the lines.
