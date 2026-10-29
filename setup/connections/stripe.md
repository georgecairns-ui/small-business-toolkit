# Connect Stripe

What it gives your app: payments to follow up on and failed charges, in Review.

**Connector:** "Stripe" in Claude's connector directory, which signs in on Stripe's own page, or, if it isn't listed, a custom connector at `https://mcp.stripe.com/`. **Plans:** any Claude plan works for the connector; Team and Enterprise need an owner to add it first.
**Route:** directory (custom-address if it isn't listed).

## Connect

1. Say "Let's connect your payments." Say "connect" and "a connection", never MCP, API, JSON or repo.
2. Look up this session's connections (`session_connectors_status`) and follow the table in `.claude/skills/connect-a-tool` ("Check, switch on, or point to Connect").
3. If they need to add it: in the Claude desktop app, Customize, then Connectors, then "Stripe", then Connect (or, in a chat, the + button, then Connectors, then enable "Stripe"). A Stripe window opens: sign in to Stripe there and set permissions per environment (for example live or test) on that sign-in screen.
   If "Stripe" isn't listed: Customize, then Connectors, then the + button, then Add custom connector. Name it "Stripe" and use exactly `https://mcp.stripe.com/`. Then sign in and approve. Use no other address.
4. If it won't connect, an administrator in Stripe's Dashboard settings can switch off access for AI tools for the whole team, and a managed network can block Stripe's connection address: say so plainly and offer to draft a short message to the person's administrator. Claude never sends this itself.

## If there's no connector

Say exactly: "There's no Claude connector for Stripe, so I can't connect to it live. If you export a CSV or PDF from it and drop it in the files folder, I'll read it whenever you ask." Record it as `export-only`. Ask the person to export a payments or payouts report as a CSV from the Stripe Dashboard and save it into the files folder.

## Prove it

Ask first, then list recent payments. Say: "I can see 3 payments from this week; one from Greenway Café failed on Tuesday."

## What Claude may and may not do

The connector has both `stripe_api_read` and `stripe_api_write` tools. Stripe requires human confirmation for some writes such as refunds, but treat all writes as off by default. Never create, change, refund or cancel anything in Stripe unless the person asks for that one specific action in this conversation.

Pre-approve for check-ins: `stripe_api_read`. Nothing that sends, replies, forwards, deletes, archives, labels, pays, posts, books or changes anything is pre-approved.

## Record

`apps/home/data/connections.json`, key `stripe`: name "Stripe", status `connected`, how "Claude connector: Stripe", checked today, note "Read payments and payouts. Never create, change, refund or cancel anything."

`context/tools.md`: "Stripe | Claude connector | <today> | Read payments and payouts | Anything that creates, changes or refunds a payment, unless asked"

## Sources

Verified on 2026-10-06; rewritten into the connected-onboarding shape on 2026-10-29.
- https://claude.com/connectors/stripe
- https://docs.stripe.com/mcp
- Checked on 2026-10-29 at https://docs.stripe.com/mcp: Claude's directory connector still signs in through Stripe's own OAuth page, with permissions set per environment. Its notice about keys (use an Agent API key, or sign in, by 30 November 2026) applies only to access by key, which setup does not use. The earlier note that the connector would accept only an Agent API key from 31 October 2026 was never confirmed and is removed. So Stripe stays on the directory route.
