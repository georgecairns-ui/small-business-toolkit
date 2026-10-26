# Make it yours

Ads OS comes with a clean, calm look in light or dark (the moon or sun button at the top switches), but it's your workspace. During setup Claude offers to use your own colours, font and logo; you can ask again any time ("make it match my brand"). The easiest way to change anything is to ask Claude, for example:

- "Make the app use our brand colours: navy and orange."
- "Change my target to £30 an enquiry."
- "Set my daily limit to £25."
- "Call a result a booking, not an enquiry."
- "Start my week on a Sunday."
- "Turn Google off, I only use Meta."

## What Claude changes, and where

| You want to change | Claude edits |
|---|---|
| Colours, fonts, corner roundness, spacing | `apps/shared/theme.css` (every look-and-feel setting is in this one file, with a light set and a dark set). The `match-my-brand` skill does it for you from your website or brand guidelines |
| What Home shows | The **Customize** button on Home: show or hide boxes, drag them into order, make them wide. **Reset** puts it back |
| The Get AI Powers slab-serif headings | `apps/shared/theme.css`: follow the note at the bottom of the file |
| Your name, business name, which day your week starts on, your target cost per result, your daily, weekly and monthly limits | Settings in the app (the gear on the Ads page), or `settings` in `apps/ads/data/ads.json` |
| What a result is called ("enquiry", "booking"), what a new customer is worth and how many results become customers | Settings, under the result. Saved as `settings.result` in `apps/ads/data/ads.json`. The screen uses the word everywhere, so "enquiry" gives you "Cost per enquiry". The worth and the share are what the "estimated" return is worked out from |
| A different target for Google or for Meta | Settings, or `settings.platformTargets` in `apps/ads/data/ads.json` (`meta` and `google`). Google and Meta count a result differently, so each can have its own |
| Which platforms are on, and how Claude reads each one | The `platforms` list in `apps/ads/data/ads.json` (`on`, `how`, the account name). Claude sets it up in setup, and it shows in the Settings |
| What the platforms are called, where "Open Google Ads" and the link to Meta's own page go, and how Claude builds on each | The platform list at the top of `apps/ads/app/model.js` (`PLATFORMS`). Each has a name, a short name, the name of its manager, a link and a line saying how Claude builds on it |
| How long each ad's headline, main words and description can be, before the count turns to a warning | `LIMITS` at the top of `apps/ads/app/model.js`. If a platform changes its limit, change the number there and in `.claude/skills/build-a-campaign/references/campaign-basics.md` |
| Where the preview of an ad cuts the main words and shows "See more" | `SEE_MORE_AT` at the top of `apps/ads/app/model.js` (125 characters for Meta) |
| The wording that appears on more than one screen, including the line about Google and Meta counting a result differently | `COPY` at the top of `apps/ads/app/model.js` (`countingNote` is that line) |
| What turns a campaign amber or red | The `light` function in `apps/ads/app/model.js`: green at or under your target, amber up to 25% over (the `0.25`), red beyond that or when there are no results and the spend is at least twice the target. `MIN_HISTORY_DAYS` (7) is how many days of figures it needs before it says more than "Too early to say" |
| What counts as ahead, on track or behind in a campaign's score against what Claude predicted | The `predictionScore` function in `apps/ads/app/model.js`: 110 or more is ahead, under 90 is behind, and 100 means exactly as predicted. Each half of the score (results a week, cost per result) is capped at twice the prediction. It says "Too early to score" until `MIN_HISTORY_DAYS` (7) days of figures, or while there are no results and the spend is under twice the predicted cost |
| What goes on the To do tab, and what shows its count | The `todoList` function in `apps/ads/app/model.js`. It builds both lists (what Claude can do, and what you need to do) and the count everywhere. The numbers are at the top of it: figures count as old after `FRESH_OK` (3 days), and a season you've noted in `context/ads.md` shows up `SEASON_LOOKAHEAD_DAYS` (45) days ahead. Claude can analyse a campaign when its light is red, its score is behind or it has no prediction, and look for changes when there are none in the last 7 days |
| What counts as Healthy, Watch or Needs action in the Health check | The numbers in the "Health check" section of `apps/ads/app/model.js`: how old the figures can be (`FRESH_OK`, 3 days, and `FRESH_WATCH`) and how long a campaign can wait on you (`WAITING_DAYS`, 7 days) |
| The 4 date ranges on the Ads page | `RANGES` at the top of `apps/ads/app/model.js` |
| Which kinds of photo and video can be added to an ad, and how big a file can be (200 MB now) | `MEDIA_KINDS`, `MEDIA_MIME` and `MAX_MEDIA_BYTES` near the "Pictures and videos" heading in `apps/ads/app/model.js`, and `MEDIA_TYPES` and `MAX_MEDIA` at the top of both helper files (`apps/server/server.js` and `apps/server/server.py`). The helper refuses anything it doesn't list, so change all of them together |
| Where your photos and videos are kept | `apps/ads/data/media/`. They stay on your computer. The ads file only lists their names, so moving or renaming one in the folder breaks that ad's picture |
| The colour of each platform's tag | `apps/ads/app/app.css`, at the top, in both the light and the dark set. Tags are drawn from the theme, never from a platform's own logo |
| The logo in the sidebar | Ask Claude ("put our logo on it"). It saves your logo in `apps/shared/images/` and points the sidebar at it |
| Your folders | `files/` |
| How Claude writes your ads | `context/voice.md`. Or ask Claude to learn how you write (`write-like-me`) |
| What Claude knows about your customer, your limits and your seasons | `context/ads.md`. Or just tell Claude |
| Hide the "More tools" list in the menu | Set `showMoreTools` to `false` in `apps/shared/catalogue.json`. The locked tools disappear; the tools you have stay |
| Where "Book a free call" goes | `url` and `button` under `booking` in `apps/shared/catalogue.json`. It's the only place the link lives |
| What Claude can do in your apps | `context/tools.md` |

## What you can't change

Some things are fixed on purpose.

- On Meta, Claude switches a campaign on, pauses a campaign or an ad, or changes a daily budget only when you press the button in the app and confirm that exact change. It never acts on its own, never goes over your limits and never deletes anything.
- Claude never changes anything on Google Ads. Its connection only reads, so every Google change stays with you.
- No Meta or Google tool is pre-approved in `.claude/settings.json`. Claude Code asks you before each one. Leave that as it is.
- The app works out every total, cost and return itself. Claude never types one.

## A version for your own clients

If Get AI Powers builds a version of the toolkit for your business or your clients, the menu can be made yours: switch off "More tools" so only the tools you've set up show, or point the booking button at your own calendar link. Both live in `apps/shared/catalogue.json`.

## Notes for Claude

- Change colours only through the variables in `apps/shared/theme.css`, in both the light and the dark set (or follow `.claude/skills/match-my-brand`). Keep text dark enough on the background to read easily: aim for a contrast ratio of at least 4.5 to 1 for normal text. If a brand colour is too light for buttons, use a darker shade of it for buttons and keep the original for decoration.
- A platform's tag colour is defined once in `apps/ads/app/app.css`, in both the light and dark sets, reading from the theme where it can. Never colour a tag in JavaScript, and never use a platform's own logo.
- Fonts must be files inside `apps/shared/fonts/` (the app works without internet). If the person wants a font you can't add as a file, use the closest system font in the font list instead and tell them.
- A campaign's prediction belongs to the person's record: never rewrite one to make a score look better. A new prediction is made only for a campaign that has none, or for a new build.
- Never change the person's limits, their target or what counts as a result unless they ask. If they ask you to raise a limit, say once, in a line, that it changes what you'll draft and build, and what the app flags.
- Never edit `settings` to make a warning go away. If a guard is in the way, say so and let them decide.
- After any change, ask them to reload the app and check it looks right.
- Keep the old values in a comment for one change, so it's easy to go back.
