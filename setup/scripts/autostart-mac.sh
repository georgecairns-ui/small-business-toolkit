#!/bin/bash
#
# START THE APP WITH YOUR MAC
# ---------------------------
# Makes the helper that runs your app start whenever you log in, and restarts it if it ever stops, so
# http://localhost:4747 always works. Claude runs this with your permission. It remembers where
# Claude Code is installed, so voice notes can be sorted straight away. The name in the messages, the
# log file and the launch agent is the folder's own name, from toolkit.json.
#   bash setup/scripts/autostart-mac.sh install
#   bash setup/scripts/autostart-mac.sh remove      (to undo)
#
# If this folder is in Documents, Desktop, iCloud Drive or Google Drive, macOS may ask
# once whether "node" (or "python3") can access that folder. Click Allow, or the app can't load.

set -euo pipefail
ACTION="${1:-install}"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# The folder's name: "name" in toolkit.json, else the first tool's in apps/installed.json
name_in() { [ -f "$1" ] && sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1 || true; }
NAME="$(name_in "$DIR/toolkit.json")"
[ -n "$NAME" ] || NAME="$(name_in "$DIR/apps/installed.json")"
[ -n "$NAME" ] || NAME="Your toolkit"
SLUG="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9][^a-z0-9]*/-/g' -e 's/^-//' -e 's/-$//')"
[ -n "$SLUG" ] || SLUG="toolkit"

LABEL="com.getaipowers.$SLUG"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/$SLUG.log"
PORT="${TLOS_PORT:-4747}"
DOMAIN="gui/$(id -u)"

# Turns off a launch agent and moves its setting aside (never deletes it)
retire() {
  launchctl bootout "$DOMAIN/$(basename "$1" .plist)" 2>/dev/null || launchctl unload "$1" 2>/dev/null || true
  mv "$1" "$1.removed"
}
# An agent made by an earlier copy of these scripts under another name, for this same folder, would fight for the port
retire_old() {
  for old in "$HOME"/Library/LaunchAgents/com.getaipowers.*.plist; do
    [ -f "$old" ] && [ "$old" != "$PLIST" ] && grep -qF "$DIR/apps/server/" "$old" && retire "$old" || true
  done
}

if [ "$ACTION" = "remove" ]; then
  retire_old
  if [ -f "$PLIST" ]; then
    retire "$PLIST"
    echo "$NAME will no longer start by itself. (The setting was moved to $PLIST.removed.)"
  else
    echo "$NAME wasn't set to start by itself."
  fi
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  RUNTIME="$(command -v node)"; SERVER="$DIR/apps/server/server.js"
elif command -v python3 >/dev/null 2>&1; then
  RUNTIME="$(command -v python3)"; SERVER="$DIR/apps/server/server.py"
else
  echo "$NAME needs Node or Python 3 on this computer, and neither was found." >&2
  exit 1
fi

retire_old
# Stop a copy started by hand, so the background one can take the port
pkill -f "apps/server/server\.(js|py)" 2>/dev/null || true

xml() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$(xml "$RUNTIME")</string><string>$(xml "$SERVER")</string></array>
  <key>WorkingDirectory</key><string>$(xml "$DIR")</string>
  <key>EnvironmentVariables</key><dict><key>TLOS_PORT</key><string>$PORT</string><key>PATH</key><string>$(xml "$PATH")</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$(xml "$LOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$LOG")</string>
</dict>
</plist>
PLIST

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"

for _ in $(seq 1 20); do
  sleep 0.25
  if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/api/alive.js"; then
    echo "Done. $NAME starts by itself from now on: http://localhost:$PORT"
    exit 0
  fi
done
echo "It's set to start with your Mac, but it isn't answering yet. If macOS asked to allow access to a folder, click Allow, then run this again. Details: $LOG" >&2
exit 1
