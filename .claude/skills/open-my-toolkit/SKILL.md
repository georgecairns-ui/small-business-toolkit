---
name: open-my-toolkit
description: Gets the person's Small Business Toolkit running on their computer and gives them the link (http://localhost:4747). Starts the helper if it isn't running, and can make it start with the computer. Use when they type /open-my-toolkit, say "open my toolkit", "open the app", "open my task list" (or open any of the 7 tools by name), "where's my toolkit?", "it isn't loading", or at the end of setup.
---

# Open my toolkit

The Small Business Toolkit runs from a small helper on the person's computer (`apps/server/`), so it opens like a normal web page at **http://localhost:4747**: no folder to pick, nothing to allow. One helper runs every tool, so this skill is the way in for all of them, the task list included. The helper only listens on this computer, only serves the app, and only ever saves the app's own data files.

Each tool has its own page: the task list is at `/task-list/`, Pipeline OS at `/pipeline/`, Skill and Folder Map OS at `/skill-map/`, Proposal Writing OS at `/proposals/`, Content Machine OS at `/content/`, Money View OS at `/money/` and Ads OS at `/ads/`. The link with nothing after it opens Home.

## Steps

1. **Is it running?** Run the start script. It does nothing if the helper is already running, and prints the link:
   - Mac or Linux: `bash setup/scripts/start-toolkit.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\start-toolkit.ps1`
2. **If it says Node or Python is missing**, tell them in one sentence that the toolkit needs a free program called Node to run, and offer to install it (the LTS version from nodejs.org; on a Mac with Homebrew, `brew install node`; on Windows, `winget install OpenJS.NodeJS.LTS`). Ask before installing anything. Then run step 1 again.
3. **Make it start with the computer** (once, with their yes), so the link always works, even after a restart:
   > Shall I make your toolkit start whenever your computer starts? Then the link always works and you can bookmark it.
   - Mac: `bash setup/scripts/autostart-mac.sh install`. If the folder is in Documents, Desktop, iCloud Drive or Google Drive, macOS may ask whether "node" can access it: tell them to click **Allow**.
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1`
   - Note it in `context/tools.md` ("Toolkit starts with the computer").
   - To undo: the same script with `remove` (Mac) or `-Remove` (Windows).
4. **Open it for them.** Ask, then open the link in their browser: `open http://localhost:4747` (Mac) or `start http://localhost:4747` (Windows). If they asked for one tool, add its page to the link (for example `http://localhost:4747/money/`). Any modern browser works.
5. Tell them:
   > Your toolkit is at **http://localhost:4747**. Bookmark it; that's your link from now on. You can also double-click **Open Small Business Toolkit** in your toolkit folder. Anything I do shows up there within a few seconds.

## If it doesn't load

- **"Port already in use"**: something else is using 4747. Check whether it's the toolkit already (`curl -s http://127.0.0.1:4747/api/alive.js` returns `window.tlosAlive = true;`). If it's something else, start the helper on another port with `TLOS_PORT=4848` (and use that port in the link and the autostart).
- **The page says it stopped running**: run step 1 again; the page reconnects by itself.
- **A page is empty or says a file has a mistake**: check that tool's data file is valid (see the `CLAUDE.md` inside its `apps/` folder).
- Logs: `~/Library/Logs/small-business-toolkit.log` on a Mac.

## Rules

- Never expose the helper beyond this computer (it listens on 127.0.0.1 only; don't change that).
- Ask before installing Node, setting it to start with the computer, or opening their browser.
