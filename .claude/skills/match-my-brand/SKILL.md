---
name: match-my-brand
description: Make the app look like the person's own business: their brand colours, font and logo, taken from their website or brand guidelines. Use during setup (step 5), or whenever someone says "make it match my brand", "use our colours", "put our logo on it" or "change the font to ours".
---
# Match my brand

The app should feel like theirs: their colour, their font, their logo, on the calm layout it already has. You change only the look. Their tasks, notes and settings are never touched.

## 1. Ask for what they already have (one message)

> I can make your task list look like your business: your colours, font and logo. Have you got brand guidelines I can look at (a PDF or an image you can drop in here), or a website? If not, no problem: just tell me your main brand colour, the sort of font you like (for example rounded, classic, or clean and modern), and add your logo if you have one.

Take whatever they give. Don't ask again for anything a source already answers.

## 2. Work out the brand

From **brand guidelines**: the main colour and any second colour (hex values), the heading and body fonts, and the logo. Guidelines usually say which colour is main; follow them.

From **a website** (read the page if you can browse; otherwise ask them for the colour): the colour used on its buttons and links, the font its headings use, and the logo in its header. If you can't read the site, say so and fall back to the 3 questions.

From **their answers**: use them as given. A colour name ("navy") becomes a sensible hex value; tell them which one you picked.

Write what you found at the end of `context/business.md` under a `## Brand` heading (colours with hex values, fonts, where the logo file is), so every tool uses the same values.

## 3. Apply it

Change only these files:

- **Colours: `apps/shared/theme.css`.** Their main colour goes in the accent settings, for light and for dark: `--color-accent`, `--color-accent-hover` (a little darker), `--color-accent-text` (dark enough to read as small text on white: at least 4.5 to 1), `--color-accent-soft` (a very light tint for highlights), `--color-accent-line` (a light tint for borders), `--color-on-accent`, `--focus-ring`, `--cat-today` and the `--block-` pair. In the dark set, use a lighter version of the same colour so it stands out on dark grey, and a deep tint for `--color-accent-soft`. Keep the white and grey surfaces as they are: the brand colour is a touch, not a coat of paint. Only change `--color-primary` (the main buttons) if they want coloured buttons; check white text on it passes 4.5 to 1, and use a darker shade if it doesn't.
- **Font: `apps/shared/fonts/` and `apps/shared/theme.css`.** The app works offline, so a font must be a file in that folder. If their font is free to use (Google Fonts and other open licences), download its `.woff2` file there, add an `@font-face` line next to Figtree's, and put it first in `--font-ui` (or only in `--font-display` for headings). If it's a paid font, don't download it: use the closest free match or a system font, and tell them why.
- **Logo: `apps/shared/images/`.** Save it as `brand-logo.svg` (or `.png`), then point the sidebar's brand image at it: the `<img>` inside `.sidebar__brand` in `apps/task-list/index.html` and `apps/home/index.html` (and any other tool's `index.html` in `apps/`). Keep it square-ish and at least 56 pixels high; if their logo is a wide wordmark, use their icon or monogram if they have one, and ask if not.

Leave the "by Get AI Powers" line, the Claude character pictures and the layout as they are. Keep the previous values in a comment in `theme.css` for one change, so going back is easy.

## 4. Show them

> Done. Reload the app (press Cmd and R, or Ctrl and R on Windows) and have a look in light and dark (the moon or sun button at the top). Your colour is on the selected page, the counts and the highlights; your logo is top left. Want anything stronger, softer or different?

Make the changes they ask for. If they don't like it, put the previous values back.

## Rules

- Change only `theme.css`, the fonts and images folders, and the sidebar logo line. Never their data, notes or settings.
- Only download fonts and images that are free for them to use, and only from their own site or the font's official home.
- Text must stay easy to read in light and dark: 4.5 to 1 contrast for normal text.
- Never say JSON, schema, API or MCP to them. "Your colours", "the look", "the app" are fine.
