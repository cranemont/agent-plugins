#!/usr/bin/env bash
# Bump one plugin's version in lockstep across its three manifests:
#   plugins/<name>/plugin.json   plugins/<name>/.claude-plugin/plugin.json
#   its entry in .claude-plugin/marketplace.json
#
# Usage: scripts/bump-version.sh <plugin> [major|minor|patch]   (default: patch)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN="${1:-}"
BUMP="${2:-patch}"

die() { echo "bump-version: error: $*" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || die "jq not found (required)"
[ -n "$PLUGIN" ] || die "usage: scripts/bump-version.sh <plugin> [major|minor|patch] — plugins: $(ls "$ROOT/plugins" | tr '\n' ' ')"
[ -d "$ROOT/plugins/$PLUGIN" ] || die "no plugin '$PLUGIN' under plugins/"

SPEC="$ROOT/plugins/$PLUGIN/plugin.json"
CLAUDE="$ROOT/plugins/$PLUGIN/.claude-plugin/plugin.json"
MKT="$ROOT/.claude-plugin/marketplace.json"

v1="$(jq -r '.version' "$SPEC")"
v2="$(jq -r '.version' "$CLAUDE")"
v3="$(jq -r --arg p "$PLUGIN" '.plugins[] | select(.name == $p) | .version' "$MKT")"
[ -n "$v3" ] || die "'$PLUGIN' has no entry in marketplace.json"
[ "$v1" = "$v2" ] && [ "$v1" = "$v3" ] \
  || die "$PLUGIN manifests disagree before bump (plugin.json=$v1, .claude-plugin/plugin.json=$v2, marketplace.json=$v3) — fix by hand first"

IFS='.' read -r MAJOR MINOR PATCH <<< "$v1"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) die "invalid bump type '$BUMP' (use major, minor, or patch)" ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
jq --arg v "$NEW" '.version = $v' "$SPEC" > "$tmp" && cat "$tmp" > "$SPEC"
jq --arg v "$NEW" '.version = $v' "$CLAUDE" > "$tmp" && cat "$tmp" > "$CLAUDE"
jq --arg p "$PLUGIN" --arg v "$NEW" '(.plugins[] | select(.name == $p) | .version) = $v' "$MKT" > "$tmp" && cat "$tmp" > "$MKT"

echo "bump-version: $PLUGIN $v1 -> $NEW (all three manifests)"
