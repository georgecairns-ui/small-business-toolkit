# Connect tl;dv

What it gives your app: Calls entries and drafted follow-ups from Google Meet, Zoom and Teams meeting recordings, with the actions waiting in Review.

**Connector:** "tldv" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.tldv.io/mcp`. **Plans:** whether the connector needs a paid Claude plan is not verified, check tl;dv's help page; the tl;dv public API needs a Pro, Business or Enterprise plan for whoever organised the meeting.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your call recordings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "tldv", then Connect, then sign in to tl;dv and approve.
   If "tldv" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "tldv" and use exactly `https://mcp.tldv.io/mcp`. Then sign in and approve. Use no other address.

## If there's no connector

Say exactly: "There's no Claude connector for tl;dv, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Not verified: no summary-email fallback is documented for tl;dv. Ask the person to share or export the meeting recap into the files folder if they want it read.

## Prove it

Ask first, then list the most recent meetings. Say: "I can see your last 3 calls; the most recent was Discovery call with Greenway Café yesterday."

## What Claude may and may not do

Read only: `get-meeting-metadata`, `get-meeting-notes`, `get-meeting-transcript`, `get-user-profile`, `search-meetings`. There are no write tools documented for this connector.

Pre-approve for check-ins: `get-meeting-metadata`, `get-meeting-notes`, `get-meeting-transcript`, `get-user-profile`, `search-meetings`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `tldv`: name "tl;dv", status `connected`, how "Claude connector: tldv", checked today, note "Read meeting notes and transcripts. tldv has no write tools in the connector."

`context/tools.md`: "tldv | Claude connector | <today> | Read meeting notes and transcripts | Nothing else; tldv has no write tools in the connector"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/tldv
- https://github.com/tldv-public/tldv-mcp-server
- https://intercom.help/tldv/en/articles/11583137-api
- https://doc.tldv.io/index.html
