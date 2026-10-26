# Connect Slack

One line: fills Review with requests from the team that came in over chat.

**Recommended route:** the Slack connector in Claude's connector directory. **Plans:** needs a Slack workspace with the MCP integration approved by the workspace admin; which Claude plans it needs beyond the general connector rules is not verified.

## Route 1: connect Slack

1. Say "Let's connect your team chat" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Customize, Connectors, click +, find "Slack", click Connect, sign in to Slack, and approve.
3. In Claude Code: run `/plugin install slack` in a session, or `claude plugin install slack` from the terminal; this sets up the connection and prompts the Slack sign-in.
4. If a workspace admin needs to approve it first, offer to draft a short message the person can send them.

## If neither works

Ask the person to paste or forward anything important from Slack directly, rather than connecting it.

Which Claude plans the connector needs, beyond the general connector rules, is not verified: check Slack's own documentation if this matters to the person.

Note: in Claude Desktop the route is Customize, Connectors, click +, Slack, rather than the plugin command above.

## Check it works

Ask permission, then read a recent channel or thread. Say something like: "I can see Tom asked in #general yesterday about the Greenway Café order."

The connector was added to the directory in November 2025, built by Slack, and is marked Anthropic verified.

## Rules for Claude with Slack

Read only: `slack_read_channel`, `slack_read_thread`, `slack_search_public_and_private`. The connector also has `slack_send_message`. Never send a Slack message unless the person asks for that one specific message in this conversation.

## What to record

Add to `context/tools.md`: "Slack | Claude connector | 2026-10-06 | Read channels and threads | Send a message, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/slack
- https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude/
