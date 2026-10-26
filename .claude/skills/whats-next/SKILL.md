---
name: whats-next
description: Looks across the whole toolkit and finds the next few things that would save the person the most time or make them the most money - a tool not set up yet, an app worth connecting, a job they keep doing by hand that a skill or a page could take over - and adds each as an idea with a ready prompt on the Toolkit's Build and customise page. Use when they press Find ideas or Ask Claude what to do next, say "what should I do next?", "what else can you do for me?", "what am I missing?", and once a day from the toolkit check-in.
---

# What's next

You're the colleague who notices. Look at what's really happening in their business, then suggest the few things that would make the biggest difference next, each one ready to start with one button.

## Look first (read only)

- `apps/toolkit/data/toolkit.json`: which tools are set up, which apps are connected or need attention, the ideas already there (never suggest one that's `new`, `done` or `dismissed` again, in any wording), and what's been built.
- `context/`: the business, priorities, routines and tools.
- Each set-up tool's data file, for patterns:
  - **Task list:** tasks they keep adding by hand that look alike (the same report, the same chase, the same kind of reply); tasks marked "Claude can do this" they haven't used; things waiting on them for weeks.
  - **Pipeline:** deals gone quiet; how many enquiries come in and from where.
  - **Proposals:** how long proposals take; ones gone quiet after sending.
  - **Money:** overdue invoices, a tight point coming up, regular bills.
  - **Ads:** campaigns over their target cost, budget left unspent.
  - **Content:** posts waiting on a photo or approval for days.
  - **Skill map:** areas of the business with no skill (its Gaps page).

## Then choose

Up to the number you were asked for (5 from the button, 3 from the check-in), best first. A good idea is specific to them, comes from something you actually saw, and saves real time or money. Prefer, in this order:

1. **Something broken:** an app that needs attention, a tool half set up.
2. **A tool not set up yet** that their data says they need ("You've got 6 unpaid invoices over 30 days: Money View would chase them").
3. **A job they repeat by hand** that a skill, a page or a routine could take over ("You've added 'send the Friday report to Priya' 4 weeks running").
4. **An app worth connecting** that a tool they use would get more from.

Never suggest anything that would send, post, pay or delete on its own. Never suggest a paid product or service. If nothing is worth suggesting, add nothing and say so: an empty list beats a filler idea.

## Add each one

To `ideas` in `apps/toolkit/data/toolkit.json`, saved safely (read, add, write, check it reads back):

```json
{ "id": "i-<6 random letters or digits>", "title": "Chase the 6 overdue invoices automatically", "why": "6 invoices are over 30 days, £3,200 in all", "prompt": "Set up Money View OS for me. Follow the Money View part of START-HERE.md, and skip anything my notes already answer.", "status": "new", "added": "<today>" }
```

- `title`: what they'd get, in under 10 words.
- `why`: the evidence, in one line, with their real numbers.
- `prompt`: exactly what Claude should be asked to do it, naming the skill or setup part to follow. It must work on its own in a new conversation in this folder.

When you were asked in chat, tell them the ideas in a short list and say they're on the Toolkit's Build and customise page with a **Do it** button each.
