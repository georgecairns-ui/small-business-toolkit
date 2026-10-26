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
| Something else | Ask whether it emails a summary after each call. If it does, you'll read those through their email (step 2). Otherwise ask them to save transcripts into `files/08-projects/calls/` as they happen. |

Most recorders have a Claude connector: the person signs in, approves, done. Only use an API key if the guide says the connector isn't available on their plan.

## 3.2 Check it works

Read the list of their 3 most recent calls (titles and dates only) and tell them:

> I can see your calls. The latest was "Discovery call with Ellis Joinery" yesterday. In the first run I'll write up the last 2 weeks of calls and pull out the actions.

## 3.3 Record it

Add the row to `context/tools.md` with "Read transcripts and summaries" and "Never send a bot to a meeting, share a recording or invite anyone". Tick step 3 in `setup/progress.md`.
