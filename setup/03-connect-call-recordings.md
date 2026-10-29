# Step 3: connect call recordings

Goal: if they record calls, you can read the transcripts and summaries. Each call becomes a write-up on the Calls page, with the actions as tasks to approve and a follow-up email drafted.

If they said in step 1 that they don't record calls, say one sentence ("If you ever start recording calls, with Fathom or Fireflies for example, I can write them up and pull out the actions for you") and skip to step 4.

## 3.1 Connect their recorder

| They use | Follow |
|---|---|
| Fathom | `setup/connections/fathom.md` |
| Fireflies | `setup/connections/fireflies.md` |
| Otter | `setup/connections/otter.md` |
| Granola | `setup/connections/granola.md` |
| tl;dv | `setup/connections/tldv.md` |
| Read AI | `setup/connections/read-ai.md` |
| Zoom | `setup/connections/zoom.md` |
| Microsoft Teams | `setup/connections/microsoft-365.md` |
| Google Meet | `setup/connections/google-drive.md` |
| Something else | Find the route with `.claude/skills/connect-a-tool` (search Claude's connector directory for it). If there is no connector, say the no-connector sentence from that skill and record `export-only`; if the recorder emails a summary after each call, you'll read those through their email (step 2), otherwise ask them to save transcripts into `files/08-projects/calls/` as they happen. |

Follow the recorder's guide and `.claude/skills/connect-a-tool` (check, switch on or point to Connect, prove, record). Most recorders have a Claude connector: the person signs in, approves, done.

## 3.2 Check it works

Read the list of their 3 most recent calls (titles and dates only) and tell them:

> I can see your calls. The latest was "Discovery call with Ellis Joinery" yesterday. In the first run I'll write up the last 2 weeks of calls and pull out the actions.

If the read fails, go back to the loop. If it still won't connect, record it as `needs-attention` and carry straight on to step 4.

## 3.3 Record it

Record it only after that read worked: `apps/home/data/connections.json` (format in `setup/connections/README.md`, "Recording a connection") with `"status": "connected"` and today's date in `checked`, and the row in `context/tools.md` with "Read transcripts and summaries" and "Never send a bot to a meeting, share a recording or invite anyone". Tick step 3 in `setup/progress.md`.
