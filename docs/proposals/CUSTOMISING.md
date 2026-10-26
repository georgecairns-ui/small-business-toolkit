# Make it yours

Proposal Writing OS is built to look and sound like your business. During setup Claude takes your logo, colours and fonts from your website or brand guidelines, copies your own proposal template if you have one, and builds a proposal skill named after your business. You can change any of it later. The easiest way is to ask Claude, for example:

- "Make my proposals match my brand: navy and orange, with our new logo."
- "Use a white cover, not a coloured one."
- "Rename 'What's getting in the way' to 'Where you are now'."
- "Here's our new template. Copy this one."
- "Add a Care plan at £180 a month."
- "We've changed how we onboard. Rebuild my proposal skill."
- "Nudge me after 5 days, not 7."

## What Claude changes, and where

| You want to change | Where it lives |
|---|---|
| **How your proposals look**: colours, fonts, the cover | `apps/proposals/brand/brand.css` (the first block: main colour, second colour, fonts) and the cover style and logo in Preferences or `settings.brand` in `apps/proposals/data/proposals.json`. Claude does it from your website: "make my proposals match my brand" |
| **Your logo** on proposals and in the app | `apps/shared/images/` (Claude saves it there). A light version for coloured covers is optional |
| **Your packages, prices and extras**, VAT, payment terms, how long a proposal is valid | The **Packages** page in the app |
| A price for **one proposal only** | "Price for this proposal" under that option, on the proposal itself |
| **The sections** of a proposal: rename, reorder, switch off | Preferences (the cog), under "The sections of a proposal". Every proposal opens with a cover, a short note and the contents |
| **Who signs** the proposals, your name and business name | Preferences |
| Whether Claude **writes a proposal by itself** when a new client folder appears | Preferences, under "How Claude works" |
| **Where client folders live** | Preferences (inside this folder), or ask Claude: "my client folders are in Google Drive" |
| **How Claude writes** proposals: when to recommend each package, how you deliver, your onboarding steps, your template and standard wording | `context/proposals.md` and your own proposal skill in `.claude/skills/` (Claude rebuilds it when you say "rebuild my proposal skill") |
| **Your terms** | Your own terms only, word for word, saved where `context/proposals.md` says. Switch the Terms section on in Preferences. Claude never writes terms; have yours checked by a solicitor |
| How you write generally | `context/voice.md` |
| The app's own colours and fonts | `apps/shared/theme.css` (a light set and a dark set). The `match-my-brand` skill does it for you |
| What Home shows | The **Customise** button on Home |
| Hide the "More tools" list in the menu | Set `showMoreTools` to `false` in `apps/shared/catalogue.json` |
| Where "Book a free call" goes | `url` and `button` under `booking` in `apps/shared/catalogue.json`. It's the only place the link lives |

## A version for your own clients

If Get AI Powers builds a version of the toolkit for your business or your clients, the menu can be made yours: switch off "More tools" so only the tools you've set up show, or point the booking button at your own calendar link. Both live in `apps/shared/catalogue.json`.

## Notes for Claude

- Proposal colours and fonts only through the first block of `apps/proposals/brand/brand.css`. Text on `--doc-primary` (the cover, the "Ready to go ahead?" box, the numbered steps) must pass 4.5 to 1 contrast with `--doc-on-primary`; use a darker shade of their colour if it doesn't. Keep the old values in a comment for one change.
- Fonts must be files inside `apps/shared/fonts/` (the app works without internet), with an `@font-face` line at the top of `brand.css`. Only fonts that are free to use.
- Proposals always print on white A4. After a change to the look, ask them to open a proposal and press Save as PDF to check it.
- The app's own look follows `.claude/skills/match-my-brand`.
