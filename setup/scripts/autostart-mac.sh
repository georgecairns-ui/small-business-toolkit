#!/bin/bash
#
# START THE TOOLKIT WITH YOUR MAC
# -------------------------------
# Makes the Small Business Toolkit helper start whenever you log in, and restarts it if it ever stops, so
# http://localhost:4747 always works. Claude runs this with your permission. It remembers where
# Claude Code is installed, so voice notes can be sorted straight away.
#   bash setup/scripts/autostart-mac.sh install
#   bash setup/scripts/autostart-mac.sh remove      (to undo)
#
# If your Small Business Toolkit folder is in Documents, Desktop, iCloud Drive or Google Drive, macOS may ask
# once whether "node" (or "python3") can access that folder. Click Allow, or the toolkit can't load.

set -euo pipefail
ACTION="${1:-install}"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LABEL="com.getaipowers.small-business-toolkit"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/small-business-toolkit.log"
PORT="${TLOS_PORT:-4747}"
DOMAIN="gui/$(id -u)"

if [ "$ACTION" = "remove" ]; then
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
  [ -f "$PLIST" ] && mv "$PLIST" "$PLIST.removed"
  echo "The Small Business Toolkit will no longer start by itself. (The setting was moved to $PLIST.removed.)"
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  RUNTIME="$(command -v node)"; SERVER="$DIR/apps/server/server.js"
elif command -v python3 >/dev/null 2>&1; then
  RUNTIME="$(command -v python3)"; SERVER="$DIR/apps/server/server.py"
else
  echo "Your Small Business Toolkit needs Node or Python 3 on this computer, and neither was found." >&2
  exit 1
fi

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
    echo "Done. Your Small Business Toolkit starts by itself from now on: http://localhost:$PORT"
    exit 0
  fi
done
echo "It's set to start with your Mac, but it isn't answering yet. If macOS asked to allow access to a folder, click Allow, then run this again. Details: $LOG" >&2
exit 1
