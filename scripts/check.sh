#!/usr/bin/env bash
# Run every repo consistency check. Used by .githooks/pre-push; run any time.
#   1. lint-skills.sh          Agent Skills spec purity
#   2. gen-readme.sh --check   README catalog in sync with frontmatter
#   3. marketplace registry    lists every plugins/<name>/ exactly once, with
#                              source ./plugins/<name>
#   4. version lockstep        each plugin's three manifests agree on name and
#                              version
#   5. claude plugin validate  marketplace and every plugin (skipped when the
#                              claude CLI is not installed)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MKT="$ROOT/.claude-plugin/marketplace.json"
die() { echo "check: error: $*" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || die "jq not found (required)"

"$ROOT/scripts/lint-skills.sh"
"$ROOT/scripts/gen-readme.sh" --check

listed="$(jq -r '.plugins[].name' "$MKT" | sort)"
ondisk="$(for d in "$ROOT/plugins"/*/; do basename "$d"; done | sort)"
if [ "$listed" != "$ondisk" ]; then
  diff <(printf '%s\n' "$listed") <(printf '%s\n' "$ondisk") >&2 || true
  die "marketplace.json plugins (<) and plugins/ directories (>) differ"
fi

fail=0
for p in $ondisk; do
  src="$(jq -r --arg p "$p" '.plugins[] | select(.name == $p) | .source' "$MKT")"
  [ "$src" = "./plugins/$p" ] || { echo "check: $p: marketplace source is '$src', expected './plugins/$p'" >&2; fail=1; }

  spec="$ROOT/plugins/$p/plugin.json"
  claude="$ROOT/plugins/$p/.claude-plugin/plugin.json"
  [ -f "$spec" ] && [ -f "$claude" ] || { echo "check: $p: needs plugin.json and .claude-plugin/plugin.json" >&2; fail=1; continue; }

  n1="$(jq -r '.name' "$spec")"; n2="$(jq -r '.name' "$claude")"
  [ "$n1" = "$p" ] && [ "$n2" = "$p" ] \
    || { echo "check: $p: manifest names must match the directory (plugin.json=$n1, .claude-plugin/plugin.json=$n2)" >&2; fail=1; }

  v1="$(jq -r '.version' "$spec")"
  v2="$(jq -r '.version' "$claude")"
  v3="$(jq -r --arg p "$p" '.plugins[] | select(.name == $p) | .version' "$MKT")"
  if [ "$v1" != "$v2" ] || [ "$v1" != "$v3" ]; then
    echo "check: $p: version drift: plugin.json=$v1 .claude-plugin/plugin.json=$v2 marketplace.json=$v3" >&2
    echo "check: keep them in lockstep with scripts/bump-version.sh $p" >&2
    fail=1
  fi
done
[ "$fail" -eq 0 ] || exit 1
echo "check: marketplace and manifests agree ($(echo $ondisk | wc -w | tr -d ' ') plugins)"

if command -v claude >/dev/null 2>&1; then
  claude plugin validate "$ROOT"
  for p in $ondisk; do claude plugin validate "$ROOT/plugins/$p"; done
else
  echo "check: claude CLI not found — skipping manifest validation"
fi

echo "check: all checks passed"
