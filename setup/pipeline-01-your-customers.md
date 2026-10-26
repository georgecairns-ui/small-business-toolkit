# Step 4: your customers and what you sell (required)

Goal: you know what the business sells, who it sells to and the problems it solves for them, written down in `context/sales.md`. **Pipeline OS can't do its job without this.** It's how you tell a sales call from any other meeting, how you check whether a deal is real, and how you spot other problems the business could solve. So this step is required: setup doesn't go past it until questions 1 to 3 are answered.

## 1. Work it out first

The person shouldn't start from a blank page. Before asking anything, quietly gather what you can:

- Their **website** (from their email signature or `context/business.md`), if you can read web pages: services, prices, who it's for, case studies.
- Their **sent email** (last 4 weeks): what they quote for, who they quote, the questions prospects ask, who says yes.
- Their **calendar** and **calls**: who they meet before work starts, how a sale usually goes.
- Their **CRM or spreadsheet**, if connected: deal sizes, stages, where deals come from.
- `context/business.md`, if it's already filled in (for example when Pipeline OS was attached to Task List OS): reuse it. Never ask something it already answers.

Use what you find to draft answers. Don't present guesses as facts: mark anything you're unsure of with "(my guess)".

## 2. Ask, in one message

Say why in one line, then show your draft answers and ask them to correct and fill the gaps. Short answers are fine. Skip any question you already have a confident answer to and say so.

> Before I build your pipeline I need to understand how you sell. This is what lets me spot your sales calls, check every deal and tell you what to ask next. Here's what I've worked out so far; correct anything that's wrong and fill in the gaps. Short answers are fine.
>
> 1. **What do you sell?** Each service or product, with a rough price or typical job size. (I've got: ...)
> 2. **Who do you sell to?** The kind of business or person, how big, what sector, what area. And who usually says yes: the owner, a manager, a committee? (I've got: ...)
> 3. **What problems do they come to you with?** In their words, as many as come to mind. What's usually going wrong when they get in touch? (I've got: ...)
> 4. **Who isn't a good fit?** Too small, wrong area, wants something you don't do. (I've got: ...)
> 5. **How does a sale usually go?** Where enquiries come from, the steps from first chat to yes, roughly how long it takes. What do you call each stage? I'll use New enquiry, Call completed, Talking, Proposal sent, Negotiating, Won and Lost unless you'd like your own.
> 6. **Who else do they usually consider?** Another firm, doing it themselves, or doing nothing.
> 7. **Where do your deals live today?** A spreadsheet, Pipedrive, HubSpot, your inbox, your head. I'll bring them in.
> 8. **How many days before you'd chase someone who's gone quiet?** (I'll use 7 unless you say otherwise.)

If they skip 1, 2 or 3, ask once more, kindly, and say why in one sentence:

> I do need these 3 before I can build your pipeline: without them I can't tell a sales call from any other meeting, or check whether a deal is real. A sentence each is plenty.

If they still don't want to answer, stop here. Note it in `setup/progress.md` ("Waiting for what they sell, who to and the problems they solve") and leave this step unticked. The app shows "Tell Claude what you sell" until it's done. Don't carry on with the rest of setup and pretend the pipeline works.

## 3. Write it down

- Fill in `context/sales.md`, one section per question, in their words. If it doesn't exist (Pipeline OS was attached to another tool's folder), create it from Pipeline OS's `context/sales.md` template first. Change its status line to `Status: filled in on <date>`.
- If `context/business.md` is still empty, fill its first lines from the same answers (name, what you do, who for, what you sell). Never overwrite what's there; add.
- In `apps/pipeline/data/pipeline.json`, set `settings.stages` (their stages, keeping `won` and `lost` last; keys are lowercase words with hyphens), `settings.chaseAfterDays`, `settings.currency` if not pounds, and `settings.salesSetUp` to `true`.
- Add their main competitors and their usual decision-maker to `context/sales.md`, not `people.md`.
- **Their ideal client, as a checklist.** From questions 2 and 4, write 4 to 6 short criteria into `settings.fitCriteria`, `[{ "text": "Independent business in the South West", "dealBreaker": true }]`: where, what kind of business, how big, who decides, the budget, what they need. Mark a criterion `dealBreaker` only if they said so ("we never work outside the South West"). Show them the list in one message and fix what they change. Claude checks every prospect against it before a call, and the app turns it into a fit score.

## 4. Check it with them

Read it back in 4 or 5 lines and ask what's wrong:

> Here's how I understand your sales. You sell branding (from £1,200) and websites (from £3,500) to independent hospitality, health and property businesses in the South West, usually to the owner. They come to you because their brand looks home-made next to their work, or their website can't be updated. Not a fit: anyone wanting just a logo for under £500. Deals usually take 2 to 4 weeks from first call. Anything I've got wrong?

Fix what they correct. Tick this step in `setup/progress.md`.

## Keeping it current

From now on, `.claude/skills/keep-context-fresh` keeps `context/sales.md` up to date: when a new service, price, kind of customer or competitor turns up in their email or calls, suggest a one-line change and make it once they agree.
