# Connect Calendly

What it gives your app: upcoming bookings in Calendar and People, and meetings that need prepping in Review.

**Connector:** "Calendly" in Claude's connector directory, or, if it isn't listed, a custom connector at `https://mcp.calendly.com/`. **Plans:** no paid Calendly plan is required, though some actions vary by plan; any Claude plan works for the connector.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your bookings." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Calendly" (search for it), then Connect, then sign in to Calendly and approve.
   If "Calendly" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Calendly" and use exactly `https://mcp.calendly.com/`. Then sign in and approve. Use no other address.
4. Once added, it is switched on per chat (the + button, then Connectors, then Calendly); Claude switches it on for this session itself (the table).

## If there's no connector

Say exactly: "There's no Claude connector for Calendly, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to check their Calendly bookings page directly, or forward booking confirmation emails, which you can read through the Gmail or Microsoft 365 connection.

## Prove it

Ask first: "Can I take a quick look at your upcoming bookings?" List the upcoming bookings and who booked them. Say: "I can see 2 bookings this week; Tom at Greenway Café on Thursday at 2pm."

## What Claude may and may not do

The connector has 36 tools, read ones such as `meetings-list_events` and `users-get_current_user`, and write ones such as `event_types-create_event_type` and `meetings-cancel_event`. Never create an event type, cancel a meeting, or change anything in Calendly unless the person asks for that one specific action in this conversation.

Pre-approve for check-ins: `users-get_current_user`, `meetings-list_events`, `meetings-get_event`, `meetings-list_event_invitees`, `meetings-get_event_invitee`, `event_types-list_event_types`, `event_types-get_event_type`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `calendly`: name "Calendly", status `connected`, how "Claude connector: Calendly", checked today, note "Read bookings and event types. Never create an event type, cancel or change a meeting."

`context/tools.md`: "Calendly | Claude connector | <today> | Read bookings and event types | Create an event type, cancel or change a meeting, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/calendly
- https://calendly.com/help/connect-calendly-to-your-ai-tools
- https://developer.calendly.com/docs/authentication/how-to-authenticate-with-personal-access-tokens
- Tool names and the count of 36 checked against Claude's own tool list on 2026-10-29.
