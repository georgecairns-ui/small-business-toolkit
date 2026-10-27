---
name: spot-claude-tasks
description: Look through the person's open tasks and mark the ones Claude could do for them, with what it would do, which connections it would use, and a ready-to-send prompt. The app shows these as "Claude can do this" with an "Open in Claude" button. Use on every check-in and sort-my-day, and when the person says "what can you do for me?", "which of these can you take?" or "what can Claude do off my list?".
---
# Spot the tasks Claude can do

The person's list is full of jobs Claude could do or mostly do: drafting an email, chasing an invoice, researching a supplier, writing a post, working out a figure from their accounts. This skill finds them and writes, for each one, the exact prompt that gets it done. The app shows a "Claude can do this" tag on those tasks. Pressing **Open in Claude** opens a new Claude Code session in their Small Business Toolkit folder with the prompt typed in, ready for them to read and send. Nothing runs until they press send.

## What you need

- `apps/task-list/data/tasks.json` (read it now, not from memory).
- `context/tools.md`: what's connected and what Claude may do in each app.
- `context/business.md`, `context/people.md` and `context/voice.md`, so the prompt carries the right names and facts.

## Steps

1. Look at every open task that isn't a suggestion (`status: "open"`, no `suggested: true`). Skip tasks that already have a `claude` entry with `checkedAt` in the last 7 days and whose title and notes haven't changed since.
2. For each one, decide: **could Claude do this, or do most of it, with what's connected today?** Yes when the work is reading, writing, researching, working something out or preparing a file, and anything it needs is in a connected app, the folder, or the web. Good fits:
   - Draft an email, reply, chaser, proposal, post or document (Claude drafts; the person sends or posts).
   - Research something and write up the answer or a comparison.
   - Work out a figure from connected accounts or files, and show the working.
   - Turn notes or a call into a summary, a list or a plan.
   - Prepare a file: a spreadsheet, a letter, a brief, a checklist.
3. **No** when it needs something Claude must never do or can't reach: paying, sending without the person, booking, signing, accepting, making a phone call, being somewhere in person, or an app that isn't connected. Don't mark those. When a task is a mix, mark it only if Claude can do the main part, and say which part is left for them.
4. For each yes, write on the task:

   ```json
   "claude": {
     "how": "One plain sentence the person sees: what Claude will do and what's left for them.",
     "uses": ["Gmail", "Xero"],
     "prompt": "The full prompt (see below).",
     "checkedAt": "2026-10-07T08:00:00.000Z"
   }
   ```

   For a task that's a no, remove any old `claude` entry, so the tag never shows on something Claude can't do.
5. Save safely: read the file right before writing, write the whole file, read it back and check it parses.

## Writing the prompt

The prompt is read by a fresh Claude Code session in their folder, which has their skills, connections and notes but none of this conversation. Make it stand on its own:

- Say what the job is, for whom, with the names, amounts, dates, email addresses and file locations from the task, its notes, `context/` and the connected apps.
- Name the skill to use when there is one (`polite-chaser`, `draft-a-reply`, `meeting-follow-up`, `research-task`, `write-like-me`).
- Say where the result goes: a draft in their email app, a file in a named `files/` folder, or shown in the chat.
- End with the safety line that fits: "Don't send it: show me the draft first", "Don't post anything", "Don't change anything in Xero". Never write a prompt that sends, pays, books, deletes or posts.
- Keep it under 1,500 characters. Plain British English, in the person's own terms. No em dashes.

Example:

> Use the polite-chaser skill. Marlow Dental (Hannah Price, hannah@marlowdental.example) hasn't paid invoice FF-1042 for £1,850, sent 12 days ago. Check my email for anything they've said about it since, then draft a friendly but clear chaser in my voice as a Gmail draft. Don't send it: show me the draft first.

## What to say

Only when asked, or once at the end of sort-my-day if there are new ones: "I can do 3 things on your list for you (the Marlow chaser, the VAT figure and the newsletter draft). They're tagged in your task list: press Open in Claude on any of them."

## Rules

- Mark only what Claude really can do with today's connections. A tag that leads nowhere costs trust.
- The person always presses send in Claude. Never act on a task from this skill.
- Never copy private email or document contents into the prompt beyond the few facts needed.
