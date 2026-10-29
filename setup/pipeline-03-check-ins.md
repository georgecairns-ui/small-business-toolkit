# Step 9: make it automatic

Goal: the pipeline is up to date whenever they open it. You check in a few times a day on your own: read new sales calls and update the deals, spot new enquiries and replies, sort the calendar's sales meetings, prep tomorrow's calls and draft chases. The app picks it up within seconds.

The tools named in this step are often not loaded yet: search your tools for them first.

## 9.1 Agree the times

Suggest times from their working hours in `context/routines.md`, for example: "I'll check in at 7am, 12pm and 4pm on weekdays, so it's fresh when you start, after lunch and before you finish. Shall I use those, or would other times suit you better?" Say plainly: "It uses a little of your Claude allowance each time, and it only runs while your computer is on and the Claude app is open."

If they say no, tick this step in `setup/progress.md` with the note 'Check-ins: said no', tell them they can say "update my pipeline" (or type `/pipeline-check-in`) any time, and go to step 10. Call notes they add in the app are read straight away either way.

## 9.2 Let check-ins read without stopping

A check-in that runs on its own stops if it has to ask permission, and the pipeline quietly goes out of date. So, with their yes, allow the read-only tools of each connection that's `connected` in `apps/home/data/connections.json`:

1. From your own list of tools, collect the names of that connection's read tools: exactly the ones its guide in `setup/connections/` lists under "Pre-approve for check-ins". For an app without a guide, only names that start with `get_`, `list_`, `search_`, `read_`, `find_`, `fetch_` or `query_`, or end with `_search` or `_get`, and only if they only read. Never any name containing create, update, delete, send, mark, archive, add, remove, set, move, post, reply, label, trash or write, whatever else it matches.
2. Show them the list in one line per app, for example: "Gmail: search and read emails. Google Calendar: read events. Fathom: read your call summaries." Ask: "Can I let your check-ins do just these without asking each time?"
3. If they say no, tell them plainly: "Then the scheduled check-in will stop at each permission prompt and the pipeline will go out of date. If you'd rather, say 'update my pipeline' whenever you want one." Tick this step in `setup/progress.md` with the note 'Check-ins: said no', leave out 9.3 and go to step 10.
   With a yes, add them to `permissions.allow` in this folder's `.claude/settings.local.json` (create it if it isn't there, as `{ "permissions": { "allow": [] } }`), using the full tool names as they appear in your list (they start `mcp__`). Never add anything that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything. If they agreed in step 2 that you may send the emails they approve, their email's send tool is already in that file: leave it as it is.

`.claude/settings.local.json` stays on this computer and is never part of an update.

## 9.3 Create the check-in

Create it from this session, in this folder: a scheduled task runs in the folder it was made in.

First look with `list_scheduled_tasks` for an existing check-in task for this folder. If Task List OS is also in this folder, its check-in runs the pipeline's steps too, so use its task (its prompt names `.claude/skills/check-in/SKILL.md`) and don't make a second one. If there is one, update it to the agreed times rather than making another. If not, create it yourself with the desktop app's scheduled tasks tool (`create_scheduled_task`):
- **Title:** "<their business> check-in", for example "Harbour Bakery check-in".
- **Prompt:** `In <full path of this folder>, run /pipeline-check-in: follow .claude/skills/pipeline-check-in/SKILL.md. Never send anything except emails the person has already approved in the app; apart from those, never reply, forward, delete, archive, label, pay or post anything.` Fill in this folder's full path.
- **When:** the times they agreed, on their working days.

Then run it once now (`run_scheduled_task`) and check it finished without stopping to ask anything (`list_task_runs`). If it stopped at a permission, ask the person before adding that tool, and only if it is read-only under 9.2's rule; then run it again. If the stop is at a tool that isn't read-only, tell them and leave it. Only ever one check-in task for this folder.

Then look up that first run's session with the desktop app's session tools (for example `get_session` with the run's session id) and check 2 things:
- **It ran in this folder.** If it ran somewhere else, delete nothing: update the task's prompt so it opens with this folder's full path, and run it again. If it still runs elsewhere, tell the person plainly that the scheduled check-in can't find this folder, and offer the alternative: they say "update my pipeline" whenever they want one.
- **It didn't run in an Auto or Bypass permission mode.** If it did, tell the person in one line: "This session is set to act without asking, so the check-ins would too." Then ask them to switch this session to the normal permission mode, where Claude asks first. Once it is switched, delete that check-in task and create it again from this session, so there is still only one check-in task. (The "delete nothing" rule above is only for the wrong-folder case.)

## 9.4 Record it

Set `checkIn.nextRunAt` after each run to the next agreed time. Note the times in `context/tools.md` and `setup/progress.md`. Tick step 9.
