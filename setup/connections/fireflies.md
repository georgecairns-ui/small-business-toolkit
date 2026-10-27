# Connect Fireflies

One line: turns call recordings into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the Fireflies connector in Claude's connector directory. **Plans:** Fireflies says the connector needs a paid Claude plan (Pro, Team or Enterprise); which Fireflies plan it needs is not verified, check Fireflies' help page.

## Route 1: connect Fireflies

1. Say "Let's connect your call recordings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "Fireflies", click Connect, sign in with Google or Microsoft (recommended), and approve.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them).

## Route 2: API key

If the connector is not available, Fireflies also has a public API. The person logs in at fireflies.ai, goes to Integrations, clicks Fireflies API, and copies the key. Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh FIREFLIES_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 FIREFLIES_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `Authorization: Bearer $FIREFLIES_API_KEY`, for example: `curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $FIREFLIES_API_KEY" --data '{ "query": "query Transcripts($userId: String) { transcripts(user_id: $userId) { title id } }" }' https://api.fireflies.ai/graphql`. The Free Fireflies plan allows 50 of these a day.

## If neither works

Ask the person whether Fireflies emails a summary after each call; if so, read it through the Gmail or Microsoft 365 connection instead.

## Check it works

Ask permission, then list the most recent transcripts. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with Fireflies

Read only: `get_user`, `get_transcript`, `get_transcripts`. There are no write tools documented for this connector.

## What to record

Add to `context/tools.md`: "Fireflies | Claude connector (or API key) | 2026-10-06 | Read call transcripts | Nothing else; Fireflies has no write tools".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/fireflies
- https://guide.fireflies.ai/articles/8272956938-learn-about-the-fireflies-mcp-server-model-context-protocol
- https://docs.fireflies.ai/fundamentals/authorization
- https://docs.fireflies.ai/fundamentals/limits
- https://docs.fireflies.ai/graphql-api/query/transcripts
