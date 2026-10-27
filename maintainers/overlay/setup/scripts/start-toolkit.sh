#!/bin/bash
#
# START THE APP (Mac and Linux)
# -----------------------------
# Starts the little helper that runs your app at http://localhost:4747, unless it's already
# running, then prints the link. Claude runs this for you; you never need to.
#   bash setup/scripts/start-toolkit.sh
# It uses Node if the computer has it, otherwise Python 3. The name in the messages and the log
# file is the folder's own name, from toolkit.json.

set -euo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${TLOS_PORT:-4747}"
URL="http://localhost:$PORT"

# The folder's name: "name" in toolkit.json, else the first tool's in apps/installed.json
name_in() { [ -f "$1" ] && sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1 || true; }
NAME="$(name_in "$DIR/toolkit.json")"
[ -n "$NAME" ] || NAME="$(name_in "$DIR/apps/installed.json")"
[ -n "$NAME" ] || NAME="Your toolkit"
SLUG="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9][^a-z0-9]*/-/g' -e 's/^-//' -e 's/-$//')"
[ -n "$SLUG" ] || SLUG="toolkit"

LOG="$HOME/Library/Logs/$SLUG.log"
[ -d "$HOME/Library/Logs" ] || LOG="${TMPDIR:-/tmp}/$SLUG.log"

alive() { curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/api/alive.js"; }

if alive; then echo "$NAME is running: $URL"; exit 0; fi

if command -v node >/dev/null 2>&1; then
  nohup node "$DIR/apps/server/server.js" >>"$LOG" 2>&1 &
elif command -v python3 >/dev/null 2>&1; then
  nohup python3 "$DIR/apps/server/server.py" >>"$LOG" 2>&1 &
else
  echo "$NAME needs Node or Python 3 on this computer, and neither was found." >&2
  echo "Claude can help install Node from https://nodejs.org (the LTS version)." >&2
  exit 1
fi
disown 2>/dev/null || true

for _ in $(seq 1 20); do
  sleep 0.25
  if alive; then echo "$NAME is running: $URL"; exit 0; fi
done
echo "$NAME didn't start. Details are in $LOG" >&2
tail -5 "$LOG" >&2 || true
exit 1
