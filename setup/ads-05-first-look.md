# Step 6 of 7: your first look

Goal: they see their real ads on one screen, with a plain summary and a few things worth changing, and they've been offered a first campaign. Nothing is changed in an ad account.

## 1. Bring in the figures

If anything is connected or they've downloaded a report, follow `.claude/skills/update-my-ads`. It reads only, and it says what it's reading before each call to Meta or Google. Say what you read and how many days.

If nothing is connected and nothing is downloaded, say so, and go to step 4 (the first campaign).

## 2. Summarise

Follow `.claude/skills/how-did-the-ads-do`. Then follow `.claude/skills/what-should-i-change`. Both use only the numbers the app works out. If there are fewer than 7 days of figures, say so: the app says "too early to say" and that is the right answer.

## 3. Open the app and show them round

Open **http://localhost:4747/ads/** (follow `.claude/skills/open-my-toolkit` if it isn't running) and walk through it in a few plain lines:

- **Overview:** spend, results, cost per result against their target, return and the pace this month. The coloured light is green at or under target, amber up to a quarter over and red beyond that.
- **Campaigns:** each campaign with its light. Click one to see how it's doing against what Claude predicted, its last 12 weeks and each of its ads, and to analyse it, run it again or, on Meta, switch it on or pause it.
- **New campaigns:** where Claude's drafts wait for them.
- **This week:** the summary and the suggestions.
- **To do:** what you need to do, and what Claude can do for you with one press of Do it.
- **Health check:** one button that says how it's all going.

Say once: Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other.

## 4. Offer the first campaign

> Want Claude to draft your first campaign? It stays a draft until you approve it, and even then it goes into your account switched off. Nothing spends until you say yes.

If yes, follow `.claude/skills/build-a-campaign` with what they say it's for. Then show them the draft in New campaigns. Explain the next steps in plain words: Approve, then Build it in my account, paused (Meta) or Make the import file (Google), then check it, then switch it on: on Meta by pressing Switch it on in the app and confirming, on Google by switching it on themselves in Google Ads.

If no, that's fine. Tell them they can say "make me a campaign" any time.

Tick this step in `setup/progress.md`. Next: the next tool in `START-HERE.md`'s Part 2.
