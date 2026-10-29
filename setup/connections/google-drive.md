# Connect Google Drive

What it gives your app: People and Review filled from files the business already keeps, and Calls entries and follow-up tasks from Google Meet transcripts and Gemini "take notes for me" summaries.

**Connector:** "Google Drive" in Claude's connector directory, used to read the "Google Meet" folder Google saves transcripts and notes into. **Plans:** the Google Drive connector is free for all Claude and Claude Desktop users, with a Team or Enterprise Owner needing to switch it on first (the same plan rules as Gmail). Meet transcripts need a Workspace edition that includes them (Business Standard, Business Plus, Enterprise Starter, Enterprise Standard, Enterprise Plus, Teaching and Learning Upgrade, Education Plus, or Workspace Individual); Gemini notes need an eligible Workspace edition or Google AI plan (exact list not verified: check Google's help page).
**Route:** directory.

## Connect

1. Say "Let's connect your Google Drive." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Google Drive", then Connect, then sign in with the business Google account and approve.

## If there's no connector

Say exactly: "There's no Claude connector for Google Drive, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Not verified: no confirmed Google Meet-specific connector or public route was found, so Drive is the only route found. If Drive cannot be connected, ask the meeting organiser to share the transcript or notes document directly (saved into the files folder), or forward the automated email Google sends the host after each meeting, which you can read through the Gmail connector.

## Prove it

Ask first, then search for a recent file. For a call held on Google Meet, search Drive for the "Google Meet" folder (there is a sub-folder per meeting) for the transcript or the Gemini notes document for that meeting. From July 2026 Google renamed the old "Meet recordings" folder to "Legacy Meet recordings", so a very old transcript might be in that folder instead. Say: "I can see a file called 'Greenway Café catch-up, transcript' from yesterday in your Google Meet folder."

## What Claude may and may not do

Read only: `search_files`, `read_file_content`, `list_recent_files`, `get_file_metadata`. Never use `share_file`, `trash_file`, `create_file`, `update_file` or `copy_file` unless the person asks for that one specific action in this conversation. The connector already asks for approval before those, but treat them as off by default.

Pre-approve for check-ins: `search_files`, `read_file_content`, `list_recent_files`, `get_file_metadata`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `google-drive`: name "Google Drive", status `connected`, how "Claude connector: Google Drive", checked today, note "Read files, Google Meet transcripts and Gemini notes. Never share, move, trash, create or edit a file."

`context/tools.md`: "Google Drive | Claude connector | <today> | Read files, read Google Meet transcripts and Gemini notes | Share, move, trash, create or edit a file unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/google-drive
- https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- https://support.google.com/meet/answer/12849897?hl=en-GB
- https://support.google.com/meet/answer/14754931?hl=en-GB
- Tool names checked against Claude's own tool list on 2026-10-29.
