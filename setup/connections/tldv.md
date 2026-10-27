# Connect tl;dv

One line: turns Google Meet, Zoom and Teams meeting recordings into Calls entries and drafted follow-ups, with the actions waiting in Review.

**Recommended route:** the tldv connector in Claude's connector directory. **Plans:** whether the connector needs a paid Claude plan is not verified, check tl;dv's help page; the tl;dv public API needs a Pro, Business or Enterprise plan for whoever organised the meeting.

## Route 1: connect tldv

1. Say "Let's connect your call recordings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "tldv", click Connect, sign in to tl;dv, and approve.
3. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them). Backup if needed: `claude mcp add --transport http tldv https://mcp.tldv.io/mcp`, then `/mcp` to sign in.

## Route 2: API key

The person finds their key in tl;dv under Settings, Personal Settings, API Keys (tldv.io/app/settings/personal-settings/api-keys). Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh TLDV_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 TLDV_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Claude then uses it with the header `x-api-key: $TLDV_API_KEY`, for example: `curl -H "x-api-key: $TLDV_API_KEY" "https://pasta.tldv.io/v1alpha1/meetings?page=1&limit=50"`.

## If neither works

Not verified: no summary-email fallback is documented for tl;dv. Ask the person to share the meeting recap manually if needed.

## Check it works

Ask permission, then list the most recent meetings. Say something like: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## Rules for Claude with tldv

Read only: `get-meeting-metadata`, `get-meeting-notes`, `get-meeting-transcript`, `get-user-profile`, `search-meetings`. There are no write tools documented for this connector.

## What to record

Add to `context/tools.md`: "tldv | Claude connector (or API key) | 2026-10-06 | Read meeting notes and transcripts | Nothing else; tldv has no write tools in the connector".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/tldv
- https://github.com/tldv-public/tldv-mcp-server
- https://intercom.help/tldv/en/articles/11583137-api
- https://doc.tldv.io/index.html
