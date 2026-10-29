# Step 8: first run

Goal: the moment it all comes together. You build their pipeline from their real email, calendar and calls, check every deal, and they open the app to find it already full, with the next step and an email ready on each deal.

Read `apps/pipeline/CLAUDE.md` first: it explains the pipeline file and how to edit it safely. Read `context/sales.md`: every judgement below depends on it.

## 1. Build the pipeline

Edit `apps/pipeline/data/pipeline.json`:

1. **Settings.** Check `yourName`, `businessName`, `emailProvider`, `calendarProvider`, `stages`, `chaseAfterDays` and `salesSetUp` are set (steps 1 and "your customers").
2. **Deals they already track.** If they keep deals in a spreadsheet, Pipedrive or HubSpot (step "your customers", question 7), bring the open ones in: title, business, contact, value, stage (mapped to their stages), last contact. Pipedrive and HubSpot: read through the connection (`setup/connections/pipedrive.md`, `setup/connections/hubspot.md`). A spreadsheet: ask them to drop it in `files/03-sales/` or share it, then read it. Never change anything in their CRM.
3. **Email:** already read in step 2 (2.4) from the last 30 days, which added the people and deals it found. Check `checkIn.emailsRead` is there. Deals placed in step 2 were staged before the person chose their stages, so re-stage them now using the stages they chose in step 4 (`settings.stages`), mapping each to the closest of their stages. Now that you know who they sell to (`context/sales.md`, `settings.fitCriteria`), go through those deals again: each one is a conversation with a prospect, with the person, `source`, `summary`, the conversations on the `timeline` and `lastContact`, at the stage the evidence shows (proposals and quotes in their sent email tell you a lot). A suggested deal that now clearly fits goes onto the board (remove `suggested`); one that clearly isn't a deal by their own rules, don't keep it as a deal: it was only Claude's suggestion and the person hasn't seen it. A conversation step 2 missed that is clearly with a prospect becomes a deal now. If step 2 ended at "no connector" for email, there's nothing to go through here.
4. **Calls, last 4 weeks** (at most 10, if a recorder is connected): for each sales call, follow `.claude/skills/update-a-deal` with the recording.
5. **Calendar, last 2 weeks and next 2:** sort the meetings as `.claude/skills/pipeline-check-in` describes. Sales calls coming up go on the deal as `nextMeeting`. Ask the "not sure" ones as `question` suggestions.
6. **Every open deal:** follow `.claude/skills/qualify-a-deal`, then set `nextSteps`, `coaching` and, where a reply or follow-up is due, the `email`. Skip what `update-a-deal` already did.
7. **Prep and chases:** follow `.claude/skills/prep-for-a-sales-call` for the next 2 days' sales calls and `.claude/skills/who-to-chase` for deals gone quiet.
8. **Recent wins and losses** (last 90 days) go in as `won` or `lost` with `closedAt`, so the win rate means something from day 1.
9. **Your judgement calls:** anything you weren't sure was a deal goes in as a suggested deal (`suggested: true`), not straight onto the board.
10. Update `checkIn` with the counts. Save, read the file back and check it's valid.

Keep a count as you go: emails read, calls written up, deals found, deals checked, emails drafted, chases ready.

## 2. Open it for them

Follow `.claude/skills/open-my-toolkit`: it starts the app for every tool in this folder, offers to make it start with the computer, then (with their yes) opens **http://localhost:4747** in their browser.

Then tell them what's waiting, in this shape and in your own words:

> Your pipeline is open, and it's already full. I read 30 days of email and 6 sales calls and found 9 open deals worth £31,400. Each one has a deal check, the next steps and, where one's due, an email ready to send. 2 deals have gone quiet; the chases are drafted.
>
> Your link is **http://localhost:4747**. Bookmark it.
>
> Start on the **Pipeline** page and open your biggest deal: you'll see what to ask next time and the email to send. Then **Review**, to approve the new deals I spotted. After your next sales call, paste your notes into the deal (or let your recorder do it) and it fills itself in.

Tick this step in `setup/progress.md`.
