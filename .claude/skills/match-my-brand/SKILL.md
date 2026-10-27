---
name: match-my-brand
description: Make the app look like the person's own business: their brand colours, font and logo, taken from their website or brand guidelines. Use during setup (step 5), or whenever someone says "make it match my brand", "use our colours", "put our logo on it" or "change the font to ours".
---
# Match my brand

The app should feel like theirs: their colour, their font, their logo, on the calm layout it already has. You change only the look. Their tasks, notes and settings are never touched.

## 1. Get their website (or guidelines)

If you already have their website (from setup step 1, `context/business.md` or their email signature), don't ask for it again. Say "I'll take your colours, font and logo from yourbusiness.co.uk" and go on.

Otherwise ask one question:

> What's your website? I'll take your colours, font and logo from it, so your app looks like your business. If you've got brand guidelines instead (a PDF or an image you can drop in here), those work too.

If they have neither, ask for their main brand colour, the sort of font they like (for example rounded, classic, or clean and modern), and their logo if they have one. Take whatever they give. Don't ask again for anything a source already answers.

## 2. Work out the brand

### From a website

The usual web page reader turns a page into plain text and throws the styling away, so it can't see colours, fonts or logos. Download the page and its stylesheets instead. Use a scratch folder outside this folder, and write every download to an absolute path inside it, so nothing can land in the person's folder. Each command runs on its own, so start each with the same `cd`:

- Mac: `mkdir -p "$TMPDIR/brand" && cd "$TMPDIR/brand"`
- Windows (PowerShell): `$B = Join-Path $env:TEMP "brand"; New-Item -ItemType Directory -Force $B | Out-Null; cd $B` (use `curl.exe`, not `curl`, which in PowerShell is a different command)

Claude Code may ask the person once whether it can download the page: tell them in one sentence what you're doing and that it's only reading their public website.

1. **The page:**
   - Mac: `mkdir -p "$TMPDIR/brand" && cd "$TMPDIR/brand" && curl -fsL --compressed -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: en-GB" "https://theirsite.co.uk" -o "$TMPDIR/brand/page.html"`
   - Windows (PowerShell): `$B = Join-Path $env:TEMP "brand"; New-Item -ItemType Directory -Force $B | Out-Null; cd $B; curl.exe -fsL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: en-GB" "https://theirsite.co.uk" -o "$B\page.html"`

   If they gave a page that redirects, curl follows it. Use the same `-A` on every download below: some sites (Shopify ones especially) turn away a short or missing browser name. If the page comes back tiny or as an error (with `-f`, curl stops with an error number), wait a minute and try once more.
2. **Its stylesheets:** find every `<link ... rel="stylesheet" href="...">` in the page that belongs to their site, even when it is served from another address of theirs (a shop's stylesheets often sit on its own `/cdn/` path under a different domain). Skip ones from other companies, such as payment, review or chat widgets and download each one into `site.css` in the scratch folder (the same `curl` line with the stylesheet's address and `-o "$TMPDIR/brand/site.css"`, or `-o "$B\site.css"` on Windows; add to the file with a second name such as `site2.css` rather than overwriting), adding `https:` to links that start with `//` and the site's address to links that start with `/`. Styles written inside the page in `<style>` blocks count too.
3. **The colours.** Look in this order, and take the first that gives a clear answer:
   - Named colour settings in the page or `site.css`: lines like `--color-accent: #3a9498`, `--color-button`, `--color-primary`, `--brand`, `--clay`. Website builders (Shopify, Squarespace, Wix, WordPress themes) almost always have these, and their names say what each is for.
   - The colour on buttons and links: the `background` of `button`, `.button`, `.btn` and `a` rules.
   - The colours used most often in the page and `site.css` (count the `#rrggbb` values), ignoring white, black, greys and very pale backgrounds.

   You want 1 main colour (buttons, links, highlights) and, if there is one, a darker partner colour for text. Note the page background colour too, but you won't use it.
4. **The fonts:** the `font-family` on headings (`h1`, `h2`, or settings like `--font-heading`) and on body text (`body`, `--font-body`). A link to `fonts.googleapis.com` names Google Fonts directly.
5. **The logo**, best first:
   - A square icon the site gives for phones and browser tabs: `<link rel="apple-touch-icon" href="...">` or `<link rel="icon" href="....svg">`. These are usually the logo mark on its own, which suits the app best.
   - The image in the header with "logo" in its name or alt text. On Shopify sites it is usually under `/cdn/shop/files/`; add `&width=400` to the address to get a sharp copy.
   - A logo drawn straight into the page (an `<svg>` inside the header link): copy that `<svg>` into a file.

   Download it into the scratch folder first (the same `curl` line, with an absolute `-o` path there), and look at it before you use it (open the image file). Note 2 things: is it **wide** (more than about twice as wide as it is tall: a wordmark), and is it **dark on a clear background** (it will disappear in dark mode)?
6. If none of this works (the site blocks downloads, or it's all drawn by scripts), and you have a browser you can use, open the site there and read the button colour and fonts from the page. If that fails too, say so plainly and fall back to the 3 questions in section 1.

Tell them in one or two lines what you found, with the hex values ("Your main colour is teal, #3A9498, with a darker teal, #065F67, for text. Headings are Montserrat and body text is Josefin Sans.") before you change anything.

### From brand guidelines

The main colour and any second colour (hex values), the heading and body fonts, and the logo. Guidelines usually say which colour is main; follow them.

### From their answers

Use them as given. A colour name ("navy") becomes a sensible hex value; tell them which one you picked.

Write what you found at the end of `context/business.md` under a `## Brand` heading (colours with hex values, fonts, where the logo file is, and where it came from), so every tool uses the same values.

## 3. Apply it

Change only these files.

- **Colours: `apps/shared/theme.css`.**
  - First add one line just above Figtree's `@font-face {` lines (not inside the comment at the top of the file): `/* Brand: from <website or guidelines>, <date>. Previous: accent #D97757, fonts Figtree */` (with the real previous values). Keep it there: it is how anyone can tell the look has been changed, and it keeps going back easy.
  - Their main colour goes in the accent settings: `--color-accent`, `--color-accent-hover` (a little darker), `--color-accent-text` (dark enough to read as small text on white: at least 4.5 to 1; their darker partner colour is often right), `--color-accent-soft` (a very light tint for highlights), `--color-accent-line` (a light tint for borders), `--color-on-accent` (whichever of near-black or white reads better on the main colour), `--focus-ring`, `--cat-today` and the `--block-` pair.
  - **Dark mode is written twice** in `theme.css`: once under `:root[data-theme="dark"]` (the switch in the top bar) and once under `@media (prefers-color-scheme: dark)` (a computer set to dark). Change both, the same way: a lighter version of their colour so it stands out on dark grey, a lighter text version, and a deep tint for `--color-accent-soft`, `--color-accent-line` and `--block-bg`.
  - Keep the cream and grey surfaces as they are: the brand colour is a touch, not a coat of paint. Only change `--color-primary` (the main buttons) if they want coloured buttons; check white text on it passes 4.5 to 1, and use a darker shade if it doesn't.
- **Font: `apps/shared/fonts/` and `apps/shared/theme.css`.** The app works offline, so a font must be a file in that folder. If their font is free to use (Google Fonts and other open licences), download its `.woff2` files there (for Google Fonts, ask `fonts.googleapis.com/css2?family=<Name>:wght@400;700` with a browser-like `-A` and take the `latin` files), add an `@font-face` line for each next to Figtree's, and put the body font first in `--font-ui` and the heading font in `--font-display`. Keep Figtree after it as the fallback. Add the font's copyright line to the top of `apps/shared/fonts/OFL.txt`. If it's a paid font, don't download it: use the closest free match or a system font, and tell them why.
- **Logo: `apps/shared/images/` and the sidebar.** Save it as `brand-logo.svg` (or `.png`), then point the sidebar's brand image at it: the `<img>` inside `.sidebar__brand` in every `index.html` under `apps/` (each tool's, and `apps/home/index.html`). Set its `alt` to the business name. Then, on the same `.sidebar__brand` element:
  - A square-ish logo or icon: leave the size as it is (30 by 30); the business name shows next to it.
  - A **wide** logo (a wordmark): add the class `sidebar__brand--wordmark`. The logo then shows at its own shape, up to 176 pixels wide, and takes the place of the business name.
  - A logo that is **dark on a clear background**: add the class `sidebar__brand--chip`, so in dark mode it sits on a small light card instead of disappearing. If they have a light version of their logo, ask whether they'd rather use that.

Leave the "by Get AI Powers" line, the Claude character pictures and the layout as they are.

## 4. Check it, then show them

Reload the app yourself if you can see it, in light and in dark, and check: the colour is on the selected page, the counts and the highlights; small text in the accent colour is easy to read; the headings use their font; the logo is sharp, not squashed, and visible in both modes. Fix anything that isn't right before showing them.

> Done. Reload the app (press Cmd and R, or Ctrl and R on Windows) and have a look in light and dark (the moon or sun button at the top). Your colour is on the selected page, the counts and the highlights; your logo is top left. Want anything stronger, softer or different?

Make the changes they ask for. If they don't like it, put the previous values back (they're in the `/* Brand: ... */` line).

## Rules

- Change only `theme.css`, the fonts and images folders, `OFL.txt` and the sidebar logo line. Never their data, notes or settings.
- Only download fonts and images that are free for them to use, and only from their own site or the font's official home. Downloaded pages and stylesheets go in a scratch folder outside this folder, never in it.
- Text must stay easy to read in light and dark: 4.5 to 1 contrast for normal text.
- Never say JSON, schema, API, MCP or CSS to them. "Your colours", "the look", "the app" are fine.
