# Connect Granola

One line: turns call notes into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the Granola connector in Claude's connector directory. **Plans:** the free Granola plan only gives personal notes from the last 30 days, with folders, search and transcript tools paid-only; any Claude plan works for the connector.

## Route 1: connect Granola

1. Say "Let's connect your call notes" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "Granola", click Connect, sign in to Granola in the browser window, and approve.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them).
4. Backup, inside Claude Code only: `claude mcp add granola --transport http https://mcp.granola.ai/mcp`, then open a new terminal, run `claude`, run `/mcp`, select Granola, and choose Authenticate.

## Route 2: API key

Needs a Granola Business plan. In the Granola desktop app: Settings, Connectors, API keys, Create new key, choose scopes, generate (keys start `grn_`). Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh GRANOLA_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 GRANOLA_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `Authorization: Bearer $GRANOLA_API_KEY`, for example: `curl -H "Authorization: Bearer $GRANOLA_API_KEY" "https://public-api.granola.ai/v1/notes"`.

## If neither works

Not verified: no summary-email fallback is documented for Granola. Ask the person to copy or export a note manually if needed.

## Check it works

Ask permission, then list the most recent meetings. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with Granola

Read only: `query_granola`, `list_meetings`, `get_meetings`, `get_meeting_transcript`. There are no write tools documented for this connector.

## What to record

Add to `context/tools.md`: "Granola | Claude connector (or API key) | 2026-10-06 | Read meeting notes and transcripts | Nothing else; Granola has no write tools in the connector".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/granola
- https://docs.granola.ai/help-center/sharing/integrations/mcp
- https://docs.granola.ai/introduction
- https://docs.granola.ai/api-reference/list-notes
