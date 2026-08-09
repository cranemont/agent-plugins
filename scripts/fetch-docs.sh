#!/usr/bin/env bash
# Download the Claude Code official docs mirror into .claude/docs/anthropic/,
# used by the repo-local claude-code-guide skill (.claude/skills/claude-code-guide).
#
# The mirror is intentionally NOT committed (see .gitignore) — Anthropic's docs
# are fetched fresh per machine from the llms.txt index they publish for
# machine consumption. Run this once after cloning, and re-run to update.
#
# Usage: scripts/fetch-docs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT/.claude/docs/anthropic"
LLMS_TXT_URL="https://code.claude.com/docs/llms.txt"

mkdir -p "$DOCS_DIR"

echo "Fetching documentation index from $LLMS_TXT_URL..."
LLMS_CONTENT="$(curl -s "$LLMS_TXT_URL")"
[ -n "$LLMS_CONTENT" ] || { echo "Error: failed to fetch $LLMS_TXT_URL" >&2; exit 1; }

printf '%s\n' "$LLMS_CONTENT" > "$DOCS_DIR/llms.md"

# All .md links from llms.txt (changelog.md excluded — redirects to GitHub HTML)
MD_URLS="$(printf '%s\n' "$LLMS_CONTENT" | grep -oE 'https://code\.claude\.com/docs/[^[:space:]]+\.md' | grep -v 'changelog\.md')"
[ -n "$MD_URLS" ] || { echo "Error: no markdown URLs found in llms.txt" >&2; exit 1; }

ok=0; failed=0
while IFS= read -r url; do
  relative_path="${url#https://code.claude.com/docs/en/}"
  local_path="$DOCS_DIR/$relative_path"
  mkdir -p "$(dirname "$local_path")"
  if curl -sfL "$url" -o "$local_path"; then
    ok=$((ok + 1))
  else
    echo "  failed: $url" >&2
    failed=$((failed + 1))
  fi
done <<< "$MD_URLS"

echo "fetch-docs: $ok files updated, $failed failed -> $DOCS_DIR"
