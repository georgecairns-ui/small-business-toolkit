# Connect Calendly

One line: fills Calendar and People with upcoming bookings, and flags meetings that need prepping for in Review.

**Recommended route:** the Calendly connector in Claude's connector directory. **Plans:** no paid Calendly plan is required, though some actions vary by plan; any Claude plan works for the connector.

## Route 1: connect Calendly

1. Say "Let's connect your bookings" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Customize, Connect your tools, search "Calendly", sign in, and Approve.
3. Then, in a chat, click the + button, Connectors, and toggle Calendly on.
4. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them). Backup if needed: `claude mcp add --transport http calendly https://mcp.calendly.com/`.

## Route 2: API key

In Calendly: Integrations page, API & Webhooks, Get a token now (or Generate new token), name it, Create Token, Copy (shown once only; scopes are chosen at creation). Ask the person to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh CALENDLY_TOKEN` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 CALENDLY_TOKEN` (Windows), paste the token, then restart Claude Code. Never ask for the key in chat.

The exact header format and a read-only test request are not verified: check Calendly's developer docs before relying on this route: https://developer.calendly.com/docs/authentication/how-to-authenticate-with-personal-access-tokens.

## If neither works

Ask the person to check their Calendly bookings page directly, or forward booking confirmation emails, readable through the Gmail or Microsoft 365 connection.

## Check it works

Ask permission, then list upcoming bookings. Say something like: "I can see 2 bookings this week; Tom at Greenway Café on Thursday at 2pm."

## Rules for Claude with Calendly

The connector has 36 tools, read ones such as `meetings-list_events` and `users-get_current_user`, and write ones such as `event_types-create_event_type` and `meetings-cancel_event`. Never create an event type, cancel a meeting, or change anything in Calendly unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "Calendly | Claude connector (or API token) | 2026-10-06 | Read bookings and event types | Create an event type, cancel or change a meeting, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/calendly
- https://calendly.com/help/connect-calendly-to-your-ai-tools
- https://developer.calendly.com/docs/authentication/how-to-authenticate-with-personal-access-tokens
