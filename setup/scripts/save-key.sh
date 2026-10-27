#!/bin/bash
#
# SAVE A KEY (Mac and Linux)
# --------------------------
# Saves a key for one of your apps (for example your Fireflies API key) safely on this computer,
# so Claude Code can use it, without the key ever appearing in a chat or in this folder.
#
# How to use it: open the Terminal app and run, for example:
#   bash "setup/scripts/save-key.sh" FIREFLIES_API_KEY
# Then paste your key when asked and press Enter. Nothing shows while you paste; that's normal.
#
# What it does:
#   On a Mac:   stores the key in your Keychain (the Mac's encrypted password store), and adds one
#               line to your shell profile that reads it from the Keychain when a terminal opens.
#               The key itself is never written into a file.
#   On Linux:   stores the key in ~/.config/<folder>/<NAME>, readable only by you, and adds one
#               line to your shell profile that reads it.
# Afterwards: close the terminal, open a new one, and start Claude Code again from your folder.

set -euo pipefail

# The folder's name, for the closing message: "name" in toolkit.json, else the first tool's in apps/installed.json
HERE="$(cd "$(dirname "$0")/../.." && pwd)"
name_in() { [ -f "$1" ] && sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1 || true; }
FOLDER_NAME="$(name_in "$HERE/toolkit.json")"
[ -n "$FOLDER_NAME" ] || FOLDER_NAME="$(name_in "$HERE/apps/installed.json")"
[ -n "$FOLDER_NAME" ] || FOLDER_NAME="toolkit"

# Where saved keys live. These names are kept as they are, because keys saved before now are found there.
SERVICE="task-list-os"

NAME="${1:-}"
if [[ ! "$NAME" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
  echo "Please give the name of the key in capitals, for example: bash setup/scripts/save-key.sh FIREFLIES_API_KEY" >&2
  exit 1
fi

printf "Paste your key for %s, then press Enter (it won't show on screen): " "$NAME"
IFS= read -r -s KEY
echo
KEY="$(printf '%s' "$KEY" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [ -z "$KEY" ]; then
  echo "No key was pasted, so nothing was saved. Run the command again when you have it." >&2
  exit 1
fi

# Which shell profile to add the line to
case "$(basename "${SHELL:-/bin/zsh}")" in
  zsh)  PROFILE="$HOME/.zshrc" ;;
  bash) PROFILE="$HOME/.bashrc"; [ "$(uname)" = "Darwin" ] && PROFILE="$HOME/.bash_profile" ;;
  *)    PROFILE="$HOME/.profile" ;;
esac
touch "$PROFILE"

if [ "$(uname)" = "Darwin" ] && command -v security >/dev/null 2>&1; then
  # -U updates the key if it was saved before
  security add-generic-password -U -s "$SERVICE" -a "$NAME" -w "$KEY" >/dev/null
  LINE="export $NAME=\"\$(security find-generic-password -s $SERVICE -a $NAME -w 2>/dev/null)\""
  WHERE="your Mac's Keychain"
else
  DIR="$HOME/.config/$SERVICE"
  mkdir -p "$DIR"
  chmod 700 "$DIR"
  (umask 077 && printf '%s' "$KEY" > "$DIR/$NAME")
  LINE="export $NAME=\"\$(cat \"$DIR/$NAME\" 2>/dev/null)\""
  WHERE="$DIR/$NAME (only you can read it)"
fi
unset KEY

# The same line is only ever added once (also for a key saved before, whatever its comment said)
if ! grep -qxF "$LINE" "$PROFILE"; then
  printf '\n%s\n%s\n' "# Key: $NAME" "$LINE" >> "$PROFILE"
fi

echo "Saved $NAME in $WHERE."
echo "Next: close this window, open a new Terminal, go to your \"$FOLDER_NAME\" folder and start Claude again with:  claude"
