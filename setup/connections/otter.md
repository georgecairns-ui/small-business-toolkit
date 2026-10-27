# Connect Otter

One line: turns call recordings into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the Otter.ai connector in Claude's connector directory. **Plans:** which Claude plan the connector needs is not verified, check Otter's help page; Otter's own public API is Enterprise-workspace only, so most people should use the connector.

## Route 1: connect Otter.ai

1. Say "Let's connect your call recordings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Settings, Connectors, Browse connectors (ask the person what they see if this differs), find "Otter.ai", click Connect, sign in to Otter, and Authorize access.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them).

## Route 2: API key

Only available on Otter Enterprise workspaces. If the business is on Otter Enterprise, the person signs in to Otter.ai, opens Integrations in the left navigation, then the Developer tab, and creates a key (maximum 2 per user, shown once). Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh OTTER_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 OTTER_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `Authorization: Bearer $OTTER_API_KEY`, for example: `curl -X GET "https://api.otter.ai/v1/conversations?include_shared=false&limit=20" -H "Authorization: Bearer $OTTER_API_KEY"`.

## If neither works

Ask the person whether Otter emails a summary after each call; if so, read it through the Gmail or Microsoft 365 connection instead.

## Check it works

Ask permission, then list the most recent conversations. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with Otter

Read only: `get_user_info`, `search`, `fetch`. There are no write tools documented for this connector.

## What to record

Add to `context/tools.md`: "Otter.ai | Claude connector | 2026-10-06 | Read call transcripts | Nothing else; Otter has no write tools in the connector".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/otter-ai
- https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server
- https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API
