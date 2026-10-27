# Connect Fathom

One line: turns call recordings into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the Fathom connector in Claude's connector directory. **Plans:** needs a paid Fathom plan (Premium, Team, Business or Enterprise; not Free); any Claude plan works for the connector.

## Route 1: connect Fathom

1. Say "Let's connect your call recordings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (menus change over time, so ask the person what they see), find "Fathom - Your Meeting Intelligence Layer", click Connect, sign in to Fathom, and approve.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them).
4. Backup, inside Claude Code only, if the connector is not available: `claude mcp add fathom -- npx mcp-remote@latest https://api.fathom.ai/mcp`, then follow the sign-in prompt.

## Route 2: API key

If neither of the above works, Fathom also has a public API. The person finds their key in Fathom under User Settings, API Access section (fathom.video/customize#api-access-header), then generates an API key. Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh FATHOM_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 FATHOM_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `X-Api-Key: $FATHOM_API_KEY`, for example a read-only test: `curl https://api.fathom.ai/external/v1/meetings -H "X-Api-Key: $FATHOM_API_KEY"`.

## If neither works

Ask the person whether Fathom emails a summary after each call; if so, read it through the Gmail or Microsoft 365 connection instead.

## Check it works

Ask permission, then list the most recent meetings. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with Fathom

Read only: `get_identity`, `list_teams`, `list_meetings`, `get_meeting_summary`, `get_meeting_transcript`, `find_person`, `search_meetings`. There are no write tools documented for this connector.

## What to record

Add to `context/tools.md`: "Fathom | Claude connector (or API key) | 2026-10-06 | Read meeting summaries and transcripts | Nothing else; Fathom has no write tools".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/fathom
- https://developers.fathom.ai/mcp-docs/claude
- https://developers.fathom.ai/quickstart
- https://developers.fathom.ai/api-reference/meetings/list-meetings
- https://www.fathom.ai/pricing
