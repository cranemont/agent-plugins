#!/usr/bin/env bash
# Run every repo consistency check. Used by .githooks/pre-push; run any time.
#   1. lint-skills.sh          Agent Skills spec purity
#   2. gen-readme.sh --check   README skills table in sync with frontmatter
#   3. version lockstep        all three manifests agree
#   4. claude plugin validate  (skipped when the claude CLI is not installed)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
die() { echo "check: error: $*" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || die "jq not found (required)"

"$ROOT/scripts/lint-skills.sh"
"$ROOT/scripts/gen-readme.sh" --check

v1="$(jq -r '.version' "$ROOT/plugin.json")"
v2="$(jq -r '.version' "$ROOT/.claude-plugin/plugin.json")"
v3="$(jq -r '.plugins[0].version' "$ROOT/.claude-plugin/marketplace.json")"
if [ "$v1" != "$v2" ] || [ "$v1" != "$v3" ]; then
  echo "check: version drift: plugin.json=$v1 .claude-plugin/plugin.json=$v2 marketplace.json=$v3" >&2
  echo "check: keep them in lockstep with scripts/bump-version.sh" >&2
  exit 1
fi
echo "check: versions in lockstep ($v1)"

if command -v claude >/dev/null 2>&1; then
  claude plugin validate "$ROOT"
else
  echo "check: claude CLI not found — skipping manifest validation"
fi

echo "check: all checks passed"
