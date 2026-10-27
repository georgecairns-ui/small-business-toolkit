#!/bin/bash
#
# INSTALL CLAUDE ADS (Mac and Linux)
# ----------------------------------
# Adds the claude-ads skills to this folder, for Ads OS to use when it plans and builds campaigns.
# Claude runs this for you during setup; you never need to.
#   bash setup/scripts/install-claude-ads.sh
#
# What it does:
#   1. Fetches George's copy of claude-ads at one fixed, tested version (tag v2.0.1) into a
#      temporary folder outside this folder, with git, or as a zip download if git isn't installed.
#   2. Checks it is exactly the tested commit (a zip must also match its recorded SHA-256). If not, it stops and installs nothing.
#   3. Runs claude-ads' own installer, skills and agents only (no Python packages), into this
#      folder's .claude/skills and .claude/agents. Nothing is installed anywhere else.
#   4. Copies the MIT licence and third-party notices in beside it, and writes a note saying where it came from.
#   5. Removes its temporary folder.
#
# claude-ads is by AgriciDaniel (https://github.com/AgriciDaniel/claude-ads), MIT licence.
#
# For testing only: CLAUDE_ADS_SOURCE=/path/to/a/local/clone uses that clone instead of GitHub, and
# CLAUDE_ADS_ZIP_URL=<address> uses that address instead of the GitHub zip, with CLAUDE_ADS_ZIP_SHA256=<hash> for that file. Leave all unset normally.

set -euo pipefail

FORK_URL="https://github.com/georgecairns-ui/claude-ads"
UPSTREAM_URL="https://github.com/AgriciDaniel/claude-ads"
TAG="v2.0.1"
COMMIT="669c7608ecb50dd95c941a71fa3ca0a1c0e40512"
ZIP_URL="${CLAUDE_ADS_ZIP_URL:-$FORK_URL/archive/refs/tags/$TAG.zip}"
# SHA-256 of GitHub's zip of tag v2.0.1, worked out on 27 October 2026 from a download of the real tag (twice, same result).
# A zip's own comment names a commit but proves nothing, so the zip route trusts only this hash.
ZIP_SHA256="${CLAUDE_ADS_ZIP_SHA256:-40fb78610d8618e7f23db4d62e52f87f1b8cba0c83457c2394b08b5df49f67f6}"

KIT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ads-os-claude-ads.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

fail() { echo "claude-ads was not installed: $1" >&2; exit 1; }

# Never install into a folder that sits inside the temporary one, or the other way round
case "$KIT" in "$WORK"*) fail "this folder is inside the temporary folder" ;; esac

SRC="$WORK/claude-ads"

if [ -n "${CLAUDE_ADS_SOURCE:-}" ]; then
  [ -d "$CLAUDE_ADS_SOURCE" ] || fail "CLAUDE_ADS_SOURCE is not a folder: $CLAUDE_ADS_SOURCE"
  command -v git >/dev/null 2>&1 || fail "git is needed to use CLAUDE_ADS_SOURCE"
  echo "Using the local copy at $CLAUDE_ADS_SOURCE (testing only)."
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" "file://$(cd "$CLAUDE_ADS_SOURCE" && pwd)" "$SRC" \
    || fail "could not read tag $TAG from $CLAUDE_ADS_SOURCE"
  FOUND="$(git -C "$SRC" rev-parse HEAD)"
elif command -v git >/dev/null 2>&1; then
  echo "Fetching claude-ads $TAG with git."
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" "$FORK_URL.git" "$SRC" \
    || fail "could not fetch $FORK_URL at $TAG. Check the internet connection and try again"
  FOUND="$(git -C "$SRC" rev-parse HEAD)"
else
  command -v curl >/dev/null 2>&1 || fail "neither git nor curl is installed"
  command -v unzip >/dev/null 2>&1 || fail "unzip is not installed"
  echo "git isn't installed, so downloading claude-ads $TAG as a zip."
  curl -fsSL --max-time 120 -o "$WORK/claude-ads.zip" "$ZIP_URL" \
    || fail "could not download $ZIP_URL. Check the internet connection and try again"
  # The zip must be byte for byte the one we tested. Its own comment proves nothing, so the hash is what is trusted.
  if command -v sha256sum >/dev/null 2>&1; then ZIP_HASH="$(sha256sum "$WORK/claude-ads.zip" | cut -d' ' -f1)"
  elif command -v shasum >/dev/null 2>&1; then ZIP_HASH="$(shasum -a 256 "$WORK/claude-ads.zip" | cut -d' ' -f1)"
  else fail "neither sha256sum nor shasum is installed, so the download can't be checked. Install git and run this again"; fi
  [ "$ZIP_HASH" = "$ZIP_SHA256" ] || fail "the download is not the tested file (expected SHA-256 $ZIP_SHA256 but got $ZIP_HASH). Nothing was installed. Install git and run this again"
  # The commit named in the zip's comment must also match
  FOUND="$(unzip -z "$WORK/claude-ads.zip" 2>/dev/null | tail -n 1 | tr -d '[:space:]')"
  mkdir "$WORK/unzipped"
  unzip -q "$WORK/claude-ads.zip" -d "$WORK/unzipped"
  INNER="$(find "$WORK/unzipped" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [ -n "$INNER" ] || fail "the download had nothing in it"
  mv "$INNER" "$SRC"
fi

if [ "$FOUND" != "$COMMIT" ]; then
  fail "it is not the tested version. Expected commit $COMMIT but found '${FOUND:-nothing}'. Nothing was installed"
fi
echo "Checked: commit $COMMIT."

[ -f "$SRC/install.sh" ] || fail "install.sh is missing from the download"
[ -f "$SRC/LICENSE" ] || fail "LICENSE is missing from the download"

mkdir -p "$KIT/.claude/skills" "$KIT/.claude/agents"
(cd "$SRC" && bash install.sh --source=local --no-deps \
  --skill-dir="$KIT/.claude/skills" --agent-dir="$KIT/.claude/agents") \
  || fail "claude-ads' own installer stopped. Read what it printed above"

DEST="$KIT/.claude/skills/ads"
[ -d "$DEST" ] || fail "the installer ran but $DEST is not there"
cp "$SRC/LICENSE" "$DEST/LICENSE"
[ -f "$SRC/THIRD_PARTY_NOTICES.md" ] && cp "$SRC/THIRD_PARTY_NOTICES.md" "$DEST/THIRD_PARTY_NOTICES.md"

cat > "$DEST/INSTALLED-BY-ADS-OS.md" <<NOTE
# Installed by Ads OS

These claude-ads skills and agents were added to this folder by Ads OS during setup.

- Made by: AgriciDaniel, $UPSTREAM_URL
- Installed from: $FORK_URL
- Version: $TAG (commit $COMMIT)
- Installed on: $(date +%Y-%m-%d)
- Licence: MIT, Copyright (c) 2026 agricidaniel. The full licence is in LICENSE beside this file.
- Installed skills only. No Python packages were added.

To move to a newer version, a maintainer changes the version and commit at the top of
setup/scripts/install-claude-ads.sh (and .ps1), then runs the script again.
NOTE

SKILLS="$(find "$KIT/.claude/skills" -maxdepth 1 -type d \( -name 'ads' -o -name 'ads-*' \) | wc -l | tr -d ' ')"
AGENTS="$(find "$KIT/.claude/agents" -maxdepth 1 -type f | wc -l | tr -d ' ')"
echo "claude-ads $TAG is installed: $SKILLS skills and $AGENTS agents."
