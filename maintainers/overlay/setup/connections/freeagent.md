# Connect FreeAgent

One line: fills Review with unpaid invoices and bills due.

**Recommended route:** there is no Claude connector for FreeAgent and no simple API key. The only documented route is an OAuth app through FreeAgent's Developer Dashboard, which is technical; for most people the CSV export below is the practical route. **Plans:** not documented; FreeAgent's OAuth route does not depend on a Claude plan.

## Route 1: CSV export (recommended for this kit)

1. Say to the person: "I can't connect FreeAgent directly yet, but I can work from a report you export. Could you export your unpaid invoices from FreeAgent as a CSV, and save it into your `files/` folder?"
2. Ask them to do this as often as they'd like fresh figures, for example weekly.
3. Read the CSV from `files/` when it's there, and treat it as a snapshot from the date it was exported, not live.

## Route 2: OAuth app (technical, only with the person's agreement)

FreeAgent has no connector and no personal access token. The only route found is: create an app at the FreeAgent Developer Dashboard (https://dev.freeagent.com) to get an OAuth Client ID and Secret, authorise at `https://api.freeagent.com/v2/approve_app`, and exchange for a token at `https://api.freeagent.com/v2/token_endpoint` (access token lasts 1 hour, refresh token about 20 years; FreeAgent points to the Google OAuth 2.0 Playground for stepping through this by hand). No read-only scope is documented. This is beyond what `setup/scripts/save-key.sh` handles, since it needs a client ID, secret and refresh step rather than one pasted key, so only attempt it if the person is comfortable being technical, and explain plainly that it is more involved than a normal connection.

If set up, the header is `Authorization: Bearer TOKEN` with `Accept: application/json` and a `User-Agent`. Read-only test: `GET https://api.freeagent.com/v2/company`. Unpaid invoices: `GET https://api.freeagent.com/v2/invoices?view=open_or_overdue`.

## If neither works

Stick with the CSV export in Route 1. Not verified: whether a simpler read-only route exists; check FreeAgent's developer docs: https://dev.freeagent.com/docs/oauth.

## Check it works

Once a CSV is in `files/`, read it and say something like: "I can see 4 unpaid invoices in your last export, the oldest from 12 September."

## Rules for Claude with FreeAgent

Whichever route: read only. Never create, send or change an invoice, bill or any other FreeAgent record, and never attempt the OAuth app route without the person's explicit, informed agreement.

## What to record

Add to `context/tools.md`: "FreeAgent | CSV export into files/ (or an OAuth app, if the person set one up) | 2026-10-06 | Read the exported invoices | Nothing else".

## Sources

Verified on 2026-10-06.
- https://dev.freeagent.com/docs/oauth
- https://dev.freeagent.com/docs/introduction
- https://dev.freeagent.com/docs/invoices
- https://claude.com/connectors (FreeAgent absent)

## Money View OS

Money View OS can't use FreeAgent yet: it works only through a live connection to the accounts app, and there is no Claude connection for FreeAgent. When Money View's setup reaches FreeAgent, follow the "not supported yet" paragraph in `setup/money-01-your-accounts.md`. An export saved into `files/` still helps the task list chase unpaid invoices, but Money View never reads it.
