# Connect Google Drive

One line: fills People and Review with files the business already keeps, and turns Google Meet transcripts and Gemini "take notes for me" summaries into Calls entries and follow-up tasks.

**Recommended route:** the Google Drive connector in Claude's connector directory, used to read the "Google Meet" folder Google saves transcripts and notes into. **Plans:** the Google Drive connector is free for all Claude and Claude Desktop users. Meet transcripts need a Workspace edition that includes them (Business Standard, Business Plus, Enterprise Starter, Enterprise Standard, Enterprise Plus, Teaching and Learning Upgrade, Education Plus, or Workspace Individual); Gemini notes need an eligible Workspace edition or Google AI plan (exact list not verified: check Google's help page).

## Route 1: connect Google Drive

1. Say "Let's connect your Google Drive" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (Customize, then Connectors). Menus change over time, so ask the person what they actually see.
3. Find "Google Drive", click Connect, sign in with the business Google account, and approve.
4. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.
5. For a call held on Google Meet, search Drive for the "Google Meet" folder (there is a sub-folder per meeting) for the transcript or the Gemini notes document for that meeting.

Google Drive connectors follow the same plan rules as Gmail: free for all Claude and Claude Desktop users, with a Team or Enterprise Owner needing to switch it on first.

## If neither works

Not verified: no confirmed Google Meet-specific connector or public API route was found, so Drive is the only route found. If Drive cannot be connected, ask the meeting organiser to share the transcript or notes document directly, or forward the automated email Google sends the host after each meeting, readable through the Gmail connector.

From July 2026 Google renamed the old "Meet recordings" folder to "Legacy Meet recordings"; a very old transcript might be in that folder instead.

## Check it works

Ask permission first, then search for a recent file. Say something like: "I can see a file called 'Greenway Café catch-up, transcript' from yesterday in your Google Meet folder."

## Rules for Claude with Google Drive

Read only: `search_files`, `read_file_content`, `list_recent_files`. Never use `share_file`, `trash_file`, `create_file` or `update_file` unless the person asks for that one specific action in this conversation. The connector already asks for approval before those, but treat them as off by default.

## What to record

Add to `context/tools.md`: "Google Drive | Claude connector | 2026-10-06 | Read files, read Google Meet transcripts and Gemini notes | Share, move, trash, create or edit a file unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/google-drive
- https://support.claude.com/en/articles/10166901-use-google-workspace-connectors
- https://support.google.com/meet/answer/12849897?hl=en-GB
- https://support.google.com/meet/answer/14754931?hl=en-GB
