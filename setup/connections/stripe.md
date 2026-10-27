# Connect Stripe

One line: fills Review with payments to follow up on and failed charges.

**Recommended route:** the Stripe connector in Claude's connector directory, OAuth sign-in. **Plans:** any Claude plan works for the connector; Team and Enterprise need an owner to add it first.

## Route 1: connect Stripe

1. Say "Let's connect your payments" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the + button, Connectors, enable "Stripe".
3. Sign in to Stripe in the window that opens, and set permissions per environment (for example live or test) in that sign-in screen.
4. In Claude Code: it appears once Claude Code is signed in with a claude.ai subscription. Check your own list of connections; if it isn't there yet, ask them to close Claude Code and open it again (in the Terminal, `/mcp` also lists them). Backup if needed: `claude mcp add --transport http stripe https://mcp.stripe.com/` then `/mcp` for sign-in, or Stripe's own route, `npm install -g @stripe/cli@latest` then `stripe agent setup`.

## Route 2: API key

From 31 October 2026, Stripe's connector only accepts an Agent API key (full secret keys and restricted keys without the Agent tag are rejected). Where to create an Agent API key and how to set it to read-only is not verified: check https://docs.stripe.com/keys. Once the person has the key, ask them to open the Terminal app (Mac) or PowerShell (Windows) in this folder and run `bash setup/scripts/save-key.sh STRIPE_API_KEY` (Mac) or `powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 STRIPE_API_KEY` (Windows), paste the key, then restart Claude Code. Never ask for the key in chat.

Then: `claude mcp add --transport http stripe https://mcp.stripe.com/ --header "Authorization: Bearer ${STRIPE_API_KEY}"`.

## If neither works

Ask the person to export a payments or payouts report as a CSV from the Stripe Dashboard, and save it into `files/`.

## Check it works

Ask permission, then list recent payments. Say something like: "I can see 3 payments from this week; one from Greenway Café failed on Tuesday."

## Rules for Claude with Stripe

The connector has both `stripe_api_read` and `stripe_api_write` tools. Stripe requires human confirmation for some writes such as refunds, but treat all writes as off by default. Never create, change, refund or cancel anything in Stripe unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "Stripe | Claude connector (or Agent API key) | 2026-10-06 | Read payments and payouts | Anything that creates, changes or refunds a payment, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/stripe
- https://docs.stripe.com/mcp
