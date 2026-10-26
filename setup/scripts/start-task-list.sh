#!/bin/bash
#
# START THE TASK LIST (Mac and Linux)
# -----------------------------------
# Starts the little helper that runs your task list at http://localhost:4747, unless it's already
# running, then prints the link. Claude runs this for you; you never need to.
#   bash setup/scripts/start-task-list.sh
# It uses Node if the computer has it, otherwise Python 3.

set -euo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${TLOS_PORT:-4747}"
URL="http://localhost:$PORT"
LOG="$HOME/Library/Logs/task-list-os.log"
[ -d "$HOME/Library/Logs" ] || LOG="${TMPDIR:-/tmp}/task-list-os.log"

alive() { curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/api/alive.js"; }

if alive; then echo "Your task list is running: $URL"; exit 0; fi

if command -v node >/dev/null 2>&1; then
  nohup node "$DIR/apps/server/server.js" >>"$LOG" 2>&1 &
elif command -v python3 >/dev/null 2>&1; then
  nohup python3 "$DIR/apps/server/server.py" >>"$LOG" 2>&1 &
else
  echo "Your task list needs Node or Python 3 on this computer, and neither was found." >&2
  echo "Claude can help install Node from https://nodejs.org (the LTS version)." >&2
  exit 1
fi
disown 2>/dev/null || true

for _ in $(seq 1 20); do
  sleep 0.25
  if alive; then echo "Your task list is running: $URL"; exit 0; fi
done
echo "The task list didn't start. Details are in $LOG" >&2
tail -5 "$LOG" >&2 || true
exit 1
