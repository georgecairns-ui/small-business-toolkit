# Connect Slack

What it gives your app: requests from the team that came in over chat, in Review.

**Connector:** "Slack" in Claude's connector directory (built by Slack, added in November 2025, marked Anthropic verified). **Plans:** needs a Slack workspace with the connector's integration approved by the workspace admin; which Claude plans it needs beyond the general connector rules is not verified, check Slack's own documentation if this matters to the person.
**Route:** directory.

## Connect

1. Say "Let's connect your team chat." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then the + button, then "Slack", then Connect, then sign in to Slack and approve.
4. If a workspace admin needs to approve it first, offer to draft a short message the person can send them. Claude never sends this itself.

## If there's no connector

Say exactly: "There's no Claude connector for Slack, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to paste or forward anything important from Slack directly.

## Prove it

Ask first, then read a recent channel or thread. Say: "I can see Tom asked in #general yesterday about the Greenway Café order."

## What Claude may and may not do

Read only: `slack_read_channel`, `slack_read_thread`, `slack_search_public_and_private`. The connector also has `slack_send_message`. Never send a Slack message unless the person asks for that one specific message in this conversation.

Pre-approve for check-ins: `slack_read_channel`, `slack_read_thread`, `slack_search_public_and_private`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `slack`: name "Slack", status `connected`, how "Claude connector: Slack", checked today, note "Read channels and threads. Never send a message."

`context/tools.md`: "Slack | Claude connector | <today> | Read channels and threads | Send a message, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/slack
- https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude/
