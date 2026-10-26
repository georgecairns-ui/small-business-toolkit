# Make it yours

Content Machine OS comes with a clean, calm look in light or dark (the moon or sun button at the top switches), but it's your workspace. During setup Claude offers to use your own colours, font and logo; you can ask again any time ("make it match my brand"). The easiest way to change anything is to ask Claude, for example:

- "Make the app use our brand colours: navy and orange."
- "Add a theme called 'Behind the scenes'."
- "Switch on TikTok and aim for 2 posts a week."
- "Plan 3 weeks at a time instead of 2."
- "Let Claude finish my posts without asking me first."
- "Rename 'Google Business Profile' to 'Google'."

## What Claude changes, and where

| You want to change | Claude edits |
|---|---|
| Colours, fonts, corner roundness, spacing | `apps/shared/theme.css` (every look-and-feel setting is in this one file, with a light set and a dark set). The `match-my-brand` skill does it for you from your website or brand guidelines |
| What Home shows | The **Customise** button on Home: show or hide boxes, drag them into order, make them wide. **Reset** puts it back |
| The Get AI Powers slab-serif headings | `apps/shared/theme.css`: follow the note at the bottom of the file |
| Your name, business name, posts a week, default time, which day your week starts on, how many weeks Plan fills | Settings in the app (the gear above the calendar), or `settings` in `apps/content/data/content.json` |
| Your themes (the things you want to be known for): add, rename, remove | Settings, under "Themes" (saved as `settings.themes`). 3 to 5 works best. Existing posts keep the theme they had |
| Whether posts wait for your approval | Settings, "New posts are" (Ask me first or Automatic): You can change it for one post in its editor. Automatic means Claude finishes the post without asking. It never means Claude posts it. You always post |
| Which platforms are on, your handles and links, posts a week for each | The Platforms page, or `platforms` in `apps/content/data/content.json` |
| What counts as Healthy, Watch or Needs action in the Health check | The numbers at the top of the "Health check" section of `apps/content/app/model.js` (weeks looked at, how many things waiting is fine, the score to aim for, the share one theme may take) |
| Where each platform's preview cuts a post and shows "see more" | `SEE_MORE_AT` in `apps/content/app/model.js` (125 characters for Instagram and Facebook, 210 for LinkedIn) |
| What the platforms are called, their character limits and the formats each allows | The platform list at the top of `apps/content/app/model.js` (`CM.PLATFORMS`). Each has a name, a 2 letter tag, a limit, a link the Open button goes to, and its formats. Change the label for a different name. If a platform changes its limit, change the number there and in `.claude/skills/write-posts/references/platforms.md` |
| Which kinds of photo and video can be added to a post, and how big a file can be (200 MB now) | `MEDIA_KINDS`, `MEDIA_MIME` and `MAX_MEDIA_BYTES` near the "Photos and videos" heading in `apps/content/app/model.js`, and `MEDIA_TYPES` and `MAX_MEDIA` at the top of both helper files (`apps/server/server.js` and `apps/server/server.py`). The helper refuses anything it doesn't list, so change all of them together |
| Where your photos and videos are kept | `apps/content/data/media/`. They stay on your computer. The post file only lists their names, so moving or renaming one in the folder breaks that post's picture |
| The colour of each platform's tag | `apps/content/app/app.css`, at the top, in both the light and the dark set. Tags are drawn from the theme, never from a platform's own logo |
| The logo in the sidebar | Ask Claude ("put our logo on it"). It saves your logo in `apps/shared/images/` and points the sidebar at it |
| Your folders | `files/` |
| How Claude writes for you | `context/voice.md`. Or ask Claude to learn how you write (`write-like-me`) |
| What your what-works skill says about your industry | Ask Claude to "refresh my research", or edit `.claude/skills/<your business>-what-works/SKILL.md` yourself |
| Hide the "More tools" list in the menu | Set `showMoreTools` to `false` in `apps/shared/catalogue.json`. The locked tools disappear; the tools you have stay |
| Where "Book a free call" goes | `url` and `button` under `booking` in `apps/shared/catalogue.json`. It's the only place the link lives |
| What Claude can do in your apps | `context/tools.md` |

## A version for your own clients

If Get AI Powers builds a version of the toolkit for your business or your clients, the menu can be made yours: switch off "More tools" so only the tools you've set up show, or point the booking button at your own calendar link. Both live in `apps/shared/catalogue.json`.

## Notes for Claude

- Change colours only through the variables in `apps/shared/theme.css`, in both the light and the dark set (or follow `.claude/skills/match-my-brand`). Keep text dark enough on the background to read easily: aim for a contrast ratio of at least 4.5 to 1 for normal text. If a brand colour is too light for buttons, use a darker shade of it for buttons and keep the original for decoration.
- A platform's tag colour is defined once in `apps/content/app/app.css`, in both the light and dark sets, reading from the theme where it can. Never colour a tag in JavaScript, and never use a platform's own logo.
- Fonts must be files inside `apps/shared/fonts/` (the app works without internet). If the person wants a font you can't add as a file, use the closest system font in the font list instead and tell them.
- Never switch a platform on or off, change a platform's posts a week, or change the default approval yourself unless they ask. If they ask for "Automatic", say once, in a line, that you will finish their posts without asking but they still post every one.
- After any change, ask them to reload the app and check it looks right.
- Keep the old values in a comment for one change, so it's easy to go back.
