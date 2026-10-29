# Connect Zoom

What it gives your app: Calls entries and drafted follow-ups from Zoom cloud recordings and AI Companion meeting summaries, with the actions waiting in Review.

**Connector:** "Zoom for Claude" in Claude's connector directory. **Plans:** needs a licensed Zoom Workplace Pro, Pro Plus, Business, Business Plus, Enterprise, Enterprise Plus or Enterprise Bundle account, with Smart Recording and Meeting Summary (AI Companion) turned on, and a Zoom account owner or admin with the right privileges.
**Route:** directory.

## Connect

1. Say "Let's connect your Zoom recordings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Zoom for Claude", then Connect, then sign in to Zoom and approve.
4. If the person is not a Zoom admin, they may need an admin to turn on the connector first; offer to draft a short message they can send that admin. Claude never sends this itself.

Zoom doesn't publish a web address for this connector, so there is no custom-address option: it has to be added from Claude's directory.

## If there's no connector

Say exactly: "There's no Claude connector for Zoom, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Check whether AI Companion emails a summary after each meeting ends; if so, you can read those through the Gmail or Microsoft 365 connection.

## Prove it

Ask first, then list the most recent recordings. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `search_meetings`, `recordings_list`, `get_meeting_assets`, `get_recording_resource`, `search_zoom`, `get_file_content`. The connector also has 3 write tools, `create_new_file_with_markdown`, `hub_create_file_from_content` and `hub_get_file_content`. Never use any of these to create a file unless the person asks for that one specific action in this conversation.

Pre-approve for check-ins: `search_meetings`, `recordings_list`, `get_meeting_assets`, `get_recording_resource`, `search_zoom`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved. `get_file_content` is left out on purpose: the old guide calls its neighbour `hub_get_file_content` a write tool, so ask the person before using it.

## Record

`apps/home/data/connections.json`, key `zoom`: name "Zoom", status `connected`, how "Claude connector: Zoom for Claude", checked today, note "Read recordings and AI Companion summaries. Never create files."

`context/tools.md`: "Zoom | Claude connector | <today> | Read recordings and AI Companion summaries | Create files, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/zoom-for-claude
- https://developers.zoom.us/docs/mcp/plug-ins-and-connectors/claude-connector/
- https://developers.zoom.us/api-hub/meetings/methods/endpoints.json
- https://developers.zoom.us/docs/internal-apps/create/
- https://developers.zoom.us/docs/internal-apps/s2s-oauth/
- https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960
