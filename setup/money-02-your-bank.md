# Step 3 of 6: your bank

Goal: Claude can see recent transactions in the business bank account, read only, through the bank feed inside their accounts app. Claude never gets a login, a card number, a sort code or an account number, and it can't move money. **This is the only way Money View sees the bank, and the bank feed is required: don't carry on without it.**

## 1. Ask, one question at a time

The questions below come in order. Questions 4 and 5 happen only once you've seen real bank transactions.

1. **"Which bank do you use for the business?"** Save the name in `settings.bank.name`.

   Say the read-only part in one sentence: "Claude can see balances and payments, never your login or card, and it can't move money."

2. **Is the bank feed already on?** Look at what the accounts connection shows: are there business bank accounts with recent transactions? If yes, say what you can see ("I can see your business current account, with transactions up to yesterday.") and go to question 4.
3. **Switch the feed on.** Walk them through it click by click, using the section for their accounts app in `setup/connections/bank-feeds.md`. Ask what they see at each step and wait. Say clearly that they sign in to their own bank on the bank's own page, which Claude never sees, and that it can take a few minutes to a day for transactions to arrive. Then check: ask the connection for recent bank transactions and say what came back. If nothing yet, say so, note "Bank feed switched on, waiting for transactions" in `setup/progress.md`, and offer to check again when they next type /setup. Don't tick the step until you've seen real transactions, and don't go on to step 4 of setup (`setup/money-03-money-out.md`) without them. If their bank isn't offered by their accounts app, say so kindly and stop: "Your bank isn't one your accounts app can connect to yet, and Money View needs the bank feed to work. Once your bank is offered, come back and type /setup and we'll carry on from here." Put "Waiting for a bank feed" in `setup/progress.md`. The feed list is in the accounts app, and their bank's help page will say. Never suggest an export or another way in.
4. **The link to their online banking.** "What's the web address you use to get to your bank's sign-in page? Paste it if you've got it." It goes in `settings.bank.link` so the app can open it with one click. If they don't know, leave it empty. It's a web address only, never anything about their login.
5. **"Do you keep a separate pot or savings account for tax?"**
   - Yes: **"Which one is it?"** If the accounts app shows it as a bank account, use that: set `isTaxPot: true` on it and `settings.tax.potAccountId` to its id. If it isn't fed into the accounts app, add it as an account with `kind: "pot"`, `source: "you"` and a balance and `asAt` only if they tell you. Money View then also counts what they log as moved.
   - No: suggest, kindly, that they make one in their bank's app themselves ("A separate pot makes it easier to see what's yours and what's the tax man's. Your bank's app will have a way to make one. I can't do that for you.") and carry on.

## 2. Save as you go

- `apps/money/data/money.json`: `sources.bank` (`mode: "accounts-feed"` once you've seen transactions, `checkedAt`), `settings.bank` (`name`, `link`), `accounts` (the bank accounts the accounts app shows), `settings.tax.potAccountId`.
- `context/money.md`: under "Bank and pots", the bank, that it's read through the accounts app's feed, and which pot is for tax, in their words. Never a sort code, account number or card number.

## 3. Show them what you can see

Say it back in 2 or 3 lines, with the figures the connection gave: "I can see your business current account with £4,210 as at 20 October, from Xero." That figure comes from the connection, not from you adding things up.

Tick this step in `setup/progress.md`.
