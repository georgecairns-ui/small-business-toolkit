# Step 2: connect email and calendar

Goal: you can read their email and calendar. This is what fills the Inbox (emails that need an answer, each with your draft), Review (new tasks from email) and the calendar in This week.

## 2.1 One sentence on why

> This is the big one. I'll read your inbox each time I check in, pick out what needs a reply, draft it for you, and turn requests into tasks. I only read and draft. I never send, delete or tidy anything.

If they'd rather not connect email, note it in `context/tools.md` and move on. The task list still works from what they tell you and their brain dump.

## 2.2 Connect

Follow the guide for their provider, exactly:

| They use | Follow |
|---|---|
| Gmail or Google Workspace, Google Calendar | `setup/connections/gmail-and-google-calendar.md` |
| Outlook or Microsoft 365 with a work account | `setup/connections/microsoft-365.md` |
| Outlook.com, Hotmail, iCloud, Yahoo or another provider | Read the "If neither works" section of `setup/connections/microsoft-365.md`, then offer: forward work email to a Gmail account they connect, or skip email for now and use the brain dump |

Menus in the Claude app change. Describe what to look for, ask what they can see, and adapt. Never ask for their email password; they sign in on Google's or Microsoft's own screen.

## 2.3 Check it works

With their permission, read the subjects and senders of the 5 most recent emails and today's calendar, and say what you see in one line, without quoting anything private:

> I can see your inbox (last email from Tom at Greenway Café, 20 minutes ago) and 3 things in your calendar today.

If it fails, try once more, then note it in `setup/progress.md` and carry on. It can be fixed later.

## 2.4 Record it

Add a row for each to `context/tools.md` ("Connected apps"): app, how connected, today's date, "Read; prepare drafts", and "Never send, reply, forward, delete, archive, label or unsubscribe". Tick step 2 in `setup/progress.md`.

## Rules for their inbox, from now on

- Read only to understand work. Don't read more than you need.
- Never send, reply, forward, delete, archive, label, mark as read, unsubscribe or accept an invite, even though the connection technically allows some of these.
- Drafts live in the task file (`replies`), and the person opens them with the app's Draft button. Save a draft into their mailbox only if they ask you to for that specific email.
- Don't copy whole private emails into the task file. A one-line summary, the reason it needs a reply, and your draft are enough.
