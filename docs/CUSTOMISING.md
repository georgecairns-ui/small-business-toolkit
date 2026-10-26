# Make it yours

Task List OS comes with a clean, calm look in light or dark (the moon or sun button at the top switches), but it's your workspace. During setup Claude offers to use your own colours, font and logo; you can ask again any time ("make it match my brand"). The easiest way to change anything is to ask Claude, for example:

- "Make the task list use our brand colours: navy and orange."
- "Change the font to something rounder."
- "Rename 'Quick wins' to 'Small jobs'."
- "Count 10 minutes saved per task instead of 6."
- "Add a folder for stock to my files."

## What Claude changes, and where

| You want to change | Claude edits |
|---|---|
| Colours, fonts, corner roundness, spacing | `apps/shared/theme.css` (every look-and-feel setting is in this one file, with a light set and a dark set). The `match-my-brand` skill does it for you from your website or brand guidelines |
| What Home shows | The **Customise** button on Home: show or hide boxes, drag them into order, make them wide. **Reset** puts it back |
| The Get AI Powers slab-serif headings | `apps/shared/theme.css`: follow the note at the bottom of the file |
| Your name, business name, time saved per task and per plan | The Settings button (the cog) in the app, or `settings` in your task file |
| The words on the category labels | `CATEGORIES` near the top of `apps/task-list/app/model.js` |
| The logo in the sidebar | Ask Claude ("put our logo on it"). It saves your logo in `apps/shared/images/` and points the sidebar at it |
| Your folders | `files/` |
| How Claude writes for you | `context/voice.md` |
| Hide the "More tools" list in the menu | Set `showMoreTools` to `false` in `apps/shared/catalogue.json`. The locked tools disappear; the tools you have stay |
| Where "Book a free call" goes | `url` and `button` under `booking` in `apps/shared/catalogue.json`. It's the only place the link lives |
| What Claude can do in your apps | `context/tools.md` |

## A version for your own clients

If Get AI Powers builds a version of the toolkit for your business or your clients, the menu can be made yours: switch off "More tools" so only the tools you've set up show, or point the booking button at your own calendar link. Both live in `apps/shared/catalogue.json`.

## Notes for Claude

- Change colours only through the variables in `apps/shared/theme.css`, in both the light and the dark set (or follow `.claude/skills/match-my-brand`). Keep text dark enough on the background to read easily: aim for a contrast ratio of at least 4.5 to 1 for normal text. If a brand colour is too light for buttons, use a darker shade of it for buttons and keep the original for decoration.
- Fonts must be files inside `apps/shared/fonts/` (the app works without internet). If the person wants a font you can't add as a file, use the closest system font in the font list instead and tell them.
- After any change, ask them to reload the app and check it looks right.
- Keep the old values in a comment for one change, so it's easy to go back.
