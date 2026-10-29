# Connect Granola

What it gives your app: Calls entries and drafted follow-ups from call notes, with the actions waiting in Review.

**Connector:** "Granola" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.granola.ai/mcp`. **Plans:** the free Granola plan only gives personal notes from the last 30 days, with folders, search and transcript tools paid-only; any Claude plan works for the connector.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your call notes." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Granola", then Connect, then sign in to Granola in the browser window that opens and approve.
   If "Granola" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Granola" and use exactly `https://mcp.granola.ai/mcp`. Then sign in and approve. Use no other address.

## If there's no connector

Say exactly: "There's no Claude connector for Granola, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Not verified: no summary-email fallback is documented for Granola. Ask the person to copy or export a note into the files folder if they want it read.

## Prove it

Ask first, then list the most recent meetings. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `query_granola_meetings`, `search_meetings`, `list_meetings`, `get_meetings`, `get_meeting_transcript` (also `list_meeting_folders`, `get_meeting_attachment` and `get_account_info`). The connector also has tools that change folders (`add_note_to_folder`, `create_folder`, `remove_note_from_folder`, `update_folder`), `sign_out` and `give_feedback`: never use any of them unless the person asks for that one specific action in this conversation. The earlier guide called the first tool `query_granola`; Claude's own tool list on 2026-10-29 calls it `query_granola_meetings`.

Pre-approve for check-ins: `query_granola_meetings`, `search_meetings`, `list_meetings`, `get_meetings`, `get_meeting_transcript`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `granola`: name "Granola", status `connected`, how "Claude connector: Granola", checked today, note "Read meeting notes and transcripts. Never change folders or sign out."

`context/tools.md`: "Granola | Claude connector | <today> | Read meeting notes and transcripts | Change or create folders, sign out, send feedback, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/granola
- https://docs.granola.ai/help-center/sharing/integrations/mcp
- https://docs.granola.ai/introduction
- https://docs.granola.ai/api-reference/list-notes
- Tool names checked against Claude's own tool list on 2026-10-29.
