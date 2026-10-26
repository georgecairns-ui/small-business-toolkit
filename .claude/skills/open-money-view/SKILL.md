---
name: open-money-view
description: Gets Money View OS running on the person's computer and gives them the link (http://localhost:4747/money/). Starts the helper if it isn't running, and can make it start with the computer. Use when they type /open-money-view, say "open my money view", "where's my money view?", "it isn't loading", or at the end of setup.
---

# Open Money View

Money View runs from a small helper on the person's computer (`apps/server/`), so it opens like a normal web page at **http://localhost:4747/money/**: no folder to pick, nothing to allow. The helper only listens on this computer, only serves the app, and only ever saves the app's data files.

## Steps

1. **Is it running?** Run the start script. It does nothing if the helper is already running, and prints the link:
   - Mac or Linux: `bash setup/scripts/start-money-view.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\start-money-view.ps1`
2. **If it says Node or Python is missing**, tell them in one sentence that Money View needs a free program called Node to run, and offer to install it (the LTS version from nodejs.org; on a Mac with Homebrew, `brew install node`; on Windows, `winget install OpenJS.NodeJS.LTS`). Ask before installing anything. Then run step 1 again.
3. **Make it start with the computer** (once, with their yes), so the link always works, even after a restart:
   > Shall I make Money View start whenever your computer starts? Then the link always works and you can bookmark it.
   - Mac: `bash setup/scripts/autostart-mac.sh install`. If the folder is in Documents, Desktop, iCloud Drive or Google Drive, macOS may ask whether "node" can access it: tell them to click **Allow**.
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1`
   - Note it in `context/tools.md` ("Money View starts with the computer").
   - To undo: the same script with `remove` (Mac) or `-Remove` (Windows).
4. **Open it for them.** Ask, then open the link in their browser: `open http://localhost:4747/money/` (Mac) or `start http://localhost:4747/money/` (Windows). Any modern browser works.
5. Tell them:
   > Your money view is at **http://localhost:4747/money/**. Bookmark it; that's your link from now on. When you press Refresh numbers, I bring it up to date and it shows there within a few seconds.

## If it doesn't load

- **"Port already in use"**: something else is using 4747. Check whether it's Money View already (`curl -s http://127.0.0.1:4747/api/alive.js` returns `window.tlosAlive = true;`). If it's something else, start the helper on another port with `TLOS_PORT=4848` (and use that port in the link and the autostart).
- **The page says it stopped running**: run step 1 again; the page reconnects by itself.
- **The page is empty or says the file has a mistake**: check `apps/money/data/money.json` is valid (see `apps/money/CLAUDE.md`).
- Logs: `~/Library/Logs/money-view-os.log` on a Mac.

## Rules

- Never expose the helper beyond this computer (it listens on 127.0.0.1 only; don't change that).
- Ask before installing Node, setting it to start with the computer, or opening their browser.
