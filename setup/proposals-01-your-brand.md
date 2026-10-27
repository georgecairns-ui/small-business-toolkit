# Step 2: your brand

Goal: every proposal looks like it came from their business (their logo, colours and fonts), and the app does too. You do the work from their website, logo and guidelines; they say yes or tweak it.

## 2.1 Learn the brand

Use what step 1 gave you, in this order of trust: brand guidelines, then their logo file, then their website, then what they told you.

- **Website** (read the home page and one or 2 others): the main colour (buttons, headings, the header), a second colour used for small touches, the heading font and the body font (from the page's styles if you can see them), the logo in the header (its image file), and the overall feel (calm and classic, bold and modern, warm and friendly).
- **Logo file**: save it as `apps/shared/images/brand-logo.svg` (or `.png`), keeping their original in `files/04-marketing/brand/`. If they gave a version for dark backgrounds, save it as `apps/shared/images/brand-logo-light.svg` (or `.png`). If they didn't and the logo is dark, and the cover will be a colour, you can make a light version only from an SVG (change its fill colours to white); otherwise use the light cover style below.
- **Guidelines**: their main and second colours (hex values), fonts, and any rules about the logo.

If you can't read their site and they have no guidelines, ask one question: "What's your main brand colour, and do you like a classic look or a clean modern one?"

Write what you found under `## Brand` at the end of `context/business.md`: colours with hex values, fonts, where the logo files are, and the feel.

## 2.2 The app's look

Follow `.claude/skills/match-my-brand`, step 3 only (you already have the brand): their colour on the app's accents in light and dark, their font if it's free to use, their logo in the sidebar of `apps/proposals/index.html` and `apps/home/index.html`.

## 2.3 The proposal's look

This is what their clients see, so take care. Change only these:

1. **`apps/proposals/brand/brand.css`**, the first block only (between the 2 lines of dashes):
   - `--doc-primary`: their main colour. Used for the cover, headings, the recommended option and the "Ready to go ahead?" box. It must be dark enough for white text: check `--doc-on-primary` on it passes 4.5 to 1 contrast, and use a darker shade of their colour if it doesn't (or set `--doc-on-primary` to a dark colour for a light brand colour).
   - `--doc-accent`: their second colour, for small touches (section numbers, ticks, the Recommended badge). If they have only one colour, use a warmer or lighter shade of it.
   - `--doc-tint`: a very light tint of their main colour (or a warm off-white), for soft boxes.
   - `--doc-font-heading` and `--doc-font-body`: their fonts, if they're free to use and you've saved the `.woff2` files in `apps/shared/fonts/` with an `@font-face` line at the top of `brand.css` (fonts are files, because the app works offline). Otherwise the closest free match: Source Serif 4 (classic) and Figtree (clean) come with the kit. Never download a paid font.
   - `--doc-heading-weight` and `--doc-radius` if their style is noticeably bolder or squarer.
   Keep the old values in a comment for one change, so going back is easy.
2. **`settings.brand`** in `apps/proposals/data/proposals.json` (save safely): `logo` (`shared/images/brand-logo.svg`), `logoOnColour` (`shared/images/brand-logo-light.svg`, if there is one), `website`, and `cover`: `colour` (a full page of their main colour, which looks best when there's a light logo) or `light` (white with a band of colour, for a dark logo with no light version). Set `setUp: true`.

## 2.4 Show them

Start the app (`.claude/skills/open-my-toolkit`) if it isn't running. There are no proposals yet, so describe it and offer to show them after step 10, or, if they'd like to see it now, tell them:

> Done. Your proposals will use your green and copper, Source Serif for headings, and your logo on a green cover. The app has your colour and logo too: have a look at http://localhost:4747. You'll see a real proposal in your brand before we finish. Anything you'd like different?

Make the changes they ask for. If they'd rather keep the standard look, that's fine.

Tick step 2 in `setup/progress.md`.

## Rules

- Change only `brand.css`'s first block (and its font lines), the images and fonts folders, `settings.brand`, and what `match-my-brand` changes. Never their data or notes.
- Only download fonts and images that are free for them to use, and only from their own site or the font's official home.
- Text must stay easy to read: 4.5 to 1 contrast for normal text, on the cover and in the boxes.
