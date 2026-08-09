#!/usr/bin/env bash
# Bump the plugin version in lockstep across all three manifests:
#   plugin.json   .claude-plugin/plugin.json   .claude-plugin/marketplace.json
#
# Usage: scripts/bump-version.sh [major|minor|patch]   (default: patch)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUMP="${1:-patch}"

die() { echo "bump-version: error: $*" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || die "jq not found (required)"

SPEC="$ROOT/plugin.json"
CLAUDE="$ROOT/.claude-plugin/plugin.json"
MKT="$ROOT/.claude-plugin/marketplace.json"

v1="$(jq -r '.version' "$SPEC")"
v2="$(jq -r '.version' "$CLAUDE")"
v3="$(jq -r '.plugins[0].version' "$MKT")"
[ "$v1" = "$v2" ] && [ "$v1" = "$v3" ] \
  || die "manifests disagree before bump (plugin.json=$v1, .claude-plugin/plugin.json=$v2, marketplace.json=$v3) — fix by hand first"

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
jq --arg v "$NEW" '.plugins[0].version = $v' "$MKT" > "$tmp" && cat "$tmp" > "$MKT"

echo "bump-version: $v1 -> $NEW (all three manifests)"
