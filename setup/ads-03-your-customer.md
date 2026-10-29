# Step 4 of 7: your customer

Goal: `context/ads.md` says who the ads are for, where they are, and what has been tried before. Every campaign Claude drafts starts here.

Ask one question, wait for the answer, save it, then ask the next. Skip anything `context/business.md` already answers: say you've got it and ask the next question.

## 1. Ask

1. **Who is your ideal customer?** Who they are, where they live or work, what they need, and what makes them pick you over someone else. Offer to draft it from `context/business.md` and their website so they only say yes or change it.
2. **Where are they when they'd want you?** Searching on Google for you, scrolling Facebook or Instagram, or somewhere else? This tells Claude where the money should go first.
3. **Have you run ads before?** If not, say that's fine and skip the next questions. If yes:
   - **Where**, and **roughly what did you spend**? A rough monthly figure is enough.
   - **What happened?** Enquiries, sales, nothing, a lot of the wrong people.
   - **What would you never do again?** Anything they hated. This goes in "What we never do" and Claude never drafts it.
4. **Are there times of year that matter?** Busy months, offers they run every year, dates when ads must stop. These become the seasons Claude guards.

## 2. Save it

Write what they said into `context/ads.md` under its headings, in their own words, short and factual. Don't invent anything: leave a heading empty if you don't know. Change its status line to `Status: filled in on <date>`.

Also save each season in `apps/ads/data/ads.json` under `settings.seasons`, as `{ "label": "Christmas", "from": "11-15", "to": "01-10" }` (month and day as `MM-DD`, and the dates may run over the new year). Ask for the dates if they only gave a month. Add to the list; never remove one that is already there. The To do tab uses these to suggest a campaign before each season starts.

The "Budget and limits" and "What counts as a result" headings are filled in the next step.

If claude-ads is installed and `ads-setup` keeps a profile, add the answers to it so they aren't asked twice. The profile lives under this folder's `.claude-ads/` folder, not in `context/`. It must hold no passwords, tokens or customer lists. Set its mutation authority to "draft only", and don't ask the owner about retention or deletion settings: fill those from what's known and tell them you've done it. (To check: the profile's exact file name and its fields, which weren't seen when this step was written.)

Tick this step in `setup/progress.md`.
