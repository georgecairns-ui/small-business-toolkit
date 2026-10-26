---
name: raise-an-invoice
description: Writes a draft invoice in Money View OS with the right VAT and the person's payment terms, asks for anything missing (one question at a time), then puts it into their accounts app as a draft through the drafts connection, or, when the connection only reads, opens the accounts app's new invoice page so they raise it there. Never works out a total, never sends it. Use when they say "invoice Greenway Café for the menu, £850", "raise an invoice", "make an invoice for Marlow Dental", "bill them for the website" or "I need to invoice someone".
---

# Raise an invoice

Every invoice lives in the person's accounts app. You write the details down so they don't fill in a form twice. The app works out the totals and the VAT. You never send anything.

## What you need

- `apps/money/data/money.json`: `settings` (`invoice`, `vat`), `invoices` (to reuse a customer's email) and `sources.accounts` (`app` and `mode`).
- `apps/money/app/model.js`: `APPS` has each accounts app's name and its new invoice link.
- `context/money.md`, for how they invoice and what they usually charge.
- Today's date, from the computer.

## Steps

1. Read the data file now. If `sources.accounts.mode` is `none`, say Money View needs an accounts app connected first and offer `/setup`. Stop there.
2. Pull out what they said: the customer, what for, the amount, how many, and any date. If something is missing (the customer, what it's for, or the amount), ask one short question for the first thing missing, wait, then ask the next. Never guess an amount.
3. **With or without VAT?** If `settings.vat.registered` is true and they didn't say, ask: "Is that £850 before VAT or including it?" Lines hold the price before VAT, so a price including VAT is divided by `1 + rate/100` and rounded to the penny: say what you did, and use the app's rules in `model.js` if you can run Node. If they aren't VAT registered, every line has `vatRate: 0`.
4. **Create the draft** in `invoices` with a new id (`i-` and 6 random lowercase letters or digits): `customer`, `email` (from an earlier invoice to the same customer, otherwise empty), `issueDate` today (or the date they gave), `dueDate` the issue date plus `settings.invoice.termsDays` (or their date), `lines` (each with an id `l-`, `text`, `qty`, `price`, `vatRate`), `status: "draft"`, `payments: []`, `where: "here"`, `ref: ""`, `request: null`, `chaser: null`, `source: "claude"`, `notes: ""`, `createdAt` and `updatedAt` now. Leave `number` empty for the accounts app's own number. Only when `sources.accounts.mode` is `drafts`, fill it with the number `nextInvoiceNumber` suggests (the app does the same); in `read` mode never invent one. Add a line to `activity` at the front, keeping 200.
5. Save safely: read the file right before writing, write the whole file back, read it back and check it parses.
6. **What next:**
   - `mode: "drafts"`: "Shall I put it in Xero as a draft? You check it and send it from there." If they say yes, set `status: "waiting"` and `request` to `{ "kind": "draft", "at": "<now>" }`, then follow `.claude/skills/put-invoices-in-my-accounts`.
   - `mode: "read"`: "Your connection reads only, so you raise it in Xero. Here's the link." Give the new invoice link for their app from `APPS`. The draft stays here as a note until the invoice arrives from the accounts app on the next refresh: `update-my-money-view` links it then (same customer and total) and sets its status to `linked`, which hides it so it isn't counted twice.

## What to say back

> I've noted an invoice for Marlow Dental: the website changes, 1 line at £600 plus VAT, due on 20 November. Shall I put it in Xero as a draft, so you can check it and send it from there? The total is on the invoice in your money view.

Say a total only by reading it from the app (or `invoiceTotals`). Never add it up in your head.

## Rules

- Never send an invoice, email it or tell the customer. The person sends it from their accounts app.
- Never type a total, VAT amount or any figure the app works out. You write lines (quantity, price, VAT rate).
- Never set a status other than `draft` or `waiting`. Never make up what the invoice is for, or the amount. Ask.
- Never write bank details anywhere.
