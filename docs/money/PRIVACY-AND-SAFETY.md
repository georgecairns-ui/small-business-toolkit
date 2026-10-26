# Privacy and safety

Plain answers to the questions people ask before connecting their accounts and bank.

## Where is my information kept?

In this folder on your computer. Money View OS has no account, no server and no database. Your money view (your invoices, payments, bank lines, regular bills and settings) is one file, `apps/money/data/money.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your money view and notes too, so keep it in a private part of your drive.

## Does Claude see my bank details?

No. Claude never asks for your bank login, your card number, your sort code or your account number, and it never stores them. It sees what's in your accounts software, including the business bank feed inside it: balances and payments, with the names and amounts. You sign in to your own bank on the bank's own page when you switch the feed on, and Claude never sees that.

Claude never types or reads bank details for your invoices: they come from your accounts software.

## Can Claude move my money?

No. Claude can't move money, pay a bill, set up a payment or log in to your bank, and the read-only view it has couldn't do it anyway. The tax pot works like this: the app works out how much should be set aside and shows "Move £X to your Tax pot", with a button that opens your bank's website or app. You make the move yourself, then press "I've moved it" so the app knows.

## Can Claude send an invoice?

No. Every invoice lives in your accounts software. You start one in Money View, and the app works out the totals and the VAT. If you've set up the optional drafts connection for Xero, "Put it in Xero as a draft" asks Claude to create it as a **draft** in Xero. You check it and send it from Xero. Otherwise Money View opens your accounts software's new invoice page and you raise it there. Claude never sends, approves or deletes an invoice, and never emails a customer. Reminders for late invoices are drafts for you to copy and send.

## Is it read only?

Reading your accounts software and its bank feed is read only. The Xero connection in the Claude app is read only by design. The only thing Claude can ever create is the draft invoice you asked for, and only if you've set up the optional drafts connection. Every time Claude is about to create something, it asks you first.



## What about passwords and keys?

Claude never asks for a password, and no key should ever go into this folder or into the chat. If you set up the optional Xero drafts connection, its 2 codes are saved with a small script that puts them in your computer's secure store: the Keychain on a Mac, or the equivalent on Windows. Claude then uses them without ever showing them.

## Who does the sums?

The app. Claude never types a total, a forecast or a tax figure: it writes down the records (an invoice's lines, a balance from your accounts software) and the app works out everything else. Every figure on screen says where it came from and when, such as "From Xero, 21 Oct" or "Estimate".

## Is this financial advice?

No. The figures are estimates to help you plan. They are not financial, tax or legal advice, and your tax pot figure is a plan for putting money aside, not your tax bill. The percentage to put aside is yours, or your accountant's: Claude never chooses it. Check big decisions with your accountant.

## Will Claude make things up?

It's told never to invent an invoice, a payment, a customer or an amount. If it can't read something, it says so. You should still glance at what it adds: regular payments it spots wait for your Confirm, and nothing it suggests counts in the forecast until you click it.

## What is the helper?

Your app runs from a small program in your Small Business Toolkit OS folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your money view file, keeping a backup before every save. When you press Refresh numbers, Chase, Put it in Xero as a draft or Ask Claude in the app, it can start Claude Code on your computer to do that one job, and only when the app itself asks.

## Does it send anything anywhere?

No. It doesn't send emails, messages or invoices. Your money view is saved in files on your computer. There's nothing for Get AI Powers to see.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. If you connect your accounts software or bank, what Claude reads goes through your own Claude account, in the usual way. Get AI Powers, who made Money View OS, can't see your folder or your money view.

## Late payment and the law

Claude drafts polite reminders, and at the firmest step it may mention that interest and compensation can apply to late payment of business debts. It doesn't quote a rate or amount. Check what applies to you with your accountant or on GOV.UK. Claude never sends the reminder: you do.
