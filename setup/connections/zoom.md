# Connect Zoom

One line: turns Zoom cloud recordings and AI Companion meeting summaries into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the "Zoom for Claude" connector in Claude's connector directory. **Plans:** needs a licensed Zoom Workplace Pro, Pro Plus, Business, Business Plus, Enterprise, Enterprise Plus or Enterprise Bundle account, with Smart Recording and Meeting Summary (AI Companion) turned on, and a Zoom account owner or admin with the right privileges.

## Route 1: connect Zoom for Claude

1. Say "Let's connect your Zoom recordings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "Zoom for Claude", click Connect, sign in to Zoom, and approve.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.
4. If the person is not a Zoom admin, they may need an admin to turn on the connector first; offer to draft a short message they can send that admin.

Zoom's own connector page does not publish a URL or a Claude Code command for this connector; use the claude.ai connector route above and it will appear in Claude Code once signed in.

## If neither works

Zoom's API needs a Server-to-Server OAuth app set up in the Zoom App Marketplace, which is too technical for this setup; skip it. Instead, check whether AI Companion emails a summary after each meeting ends; if so, read it through the Gmail or Microsoft 365 connection instead.

## Check it works

Ask permission, then list the most recent recordings. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with Zoom

Read only: `search_meetings`, `recordings_list`, `get_meeting_assets`, `get_recording_resource`, `search_zoom`, `get_file_content`. The connector also has 3 write tools, `create_new_file_with_markdown`, `hub_create_file_from_content` and `hub_get_file_content`. Never use any of these to create a file unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "Zoom | Claude connector | 2026-10-06 | Read recordings and AI Companion summaries | Create files, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/zoom-for-claude
- https://developers.zoom.us/docs/mcp/plug-ins-and-connectors/claude-connector/
- https://developers.zoom.us/api-hub/meetings/methods/endpoints.json
- https://developers.zoom.us/docs/internal-apps/create/
- https://developers.zoom.us/docs/internal-apps/s2s-oauth/
- https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960
