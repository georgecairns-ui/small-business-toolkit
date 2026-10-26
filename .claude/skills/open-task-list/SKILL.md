---
name: open-task-list
description: Gets the person's task list running on their computer and gives them the link (http://localhost:4747). Starts the task list helper if it isn't running, and can make it start with the computer. Use when they type /open-task-list, say "open my task list", "where's my task list?", "the task list isn't loading", or at the end of setup.
---

# Open the task list

The task list app runs from a small helper on the person's computer (`apps/server/`), so it opens like a normal web page at **http://localhost:4747**: no folder to pick, nothing to allow. The helper only listens on this computer, only serves the app, and only ever saves the task file.

## Steps

1. **Is it running?** Run the start script. It does nothing if the helper is already running, and prints the link:
   - Mac or Linux: `bash setup/scripts/start-task-list.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\start-task-list.ps1`
2. **If it says Node or Python is missing**, tell them in one sentence that the task list needs a free program called Node to run, and offer to install it (the LTS version from nodejs.org; on a Mac with Homebrew, `brew install node`; on Windows, `winget install OpenJS.NodeJS.LTS`). Ask before installing anything. Then run step 1 again.
3. **Make it start with the computer** (once, with their yes), so the link always works, even after a restart:
   > Shall I make your task list start whenever your computer starts? Then the link always works and you can bookmark it.
   - Mac: `bash setup/scripts/autostart-mac.sh install`. If the folder is in Documents, Desktop, iCloud Drive or Google Drive, macOS may ask whether "node" can access it: tell them to click **Allow**.
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1`
   - Note it in `context/tools.md` ("Task list starts with the computer").
   - To undo: the same script with `remove` (Mac) or `-Remove` (Windows).
4. **Open it for them.** Ask, then open the link in their browser: `open http://localhost:4747` (Mac) or `start http://localhost:4747` (Windows). Any modern browser works.
5. Tell them:
   > Your task list is at **http://localhost:4747**. Bookmark it; that's your link from now on. Anything I do, from sorting your inbox to writing up a call, shows up there within a few seconds.

## If it doesn't load

- **"Port already in use"**: something else is using 4747. Check whether it's the task list already (`curl -s http://127.0.0.1:4747/api/alive.js` returns `window.tlosAlive = true;`). If it's something else, start the helper on another port with `TLOS_PORT=4848` (and use that port in the link and the autostart).
- **The page says the task list stopped running**: run step 1 again; the page reconnects by itself.
- **The page is empty or says the file has a mistake**: check `apps/task-list/data/tasks.json` is valid (see `apps/task-list/CLAUDE.md`).
- Logs: `~/Library/Logs/task-list-os.log` on a Mac.

## Rules

- Never expose the helper beyond this computer (it listens on 127.0.0.1 only; don't change that).
- Ask before installing Node, setting it to start with the computer, or opening their browser.
