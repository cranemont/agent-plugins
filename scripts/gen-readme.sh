#!/usr/bin/env bash
# Regenerate (or check) the auto-managed skills table in README.md.
#
# Source of truth: skills/*/SKILL.md frontmatter. Each row is the skill name
# (linked) plus the first sentence of its description, so the README can never
# drift from what the agents actually read. Only the text between the
# <!-- BEGIN:catalog --> ... <!-- END:catalog --> markers is touched.
#
#   scripts/gen-readme.sh            rewrite README.md in place (default)
#   scripts/gen-readme.sh --check    exit 1 (+ diff) if README.md is out of sync
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT/README.md"
MODE="${1:---write}"

die() { echo "gen-readme: error: $*" >&2; exit 2; }

rows() {
  local d name desc
  for d in "$ROOT/skills"/*/; do
    [ -f "${d}SKILL.md" ] || continue
    name="$(basename "$d")"
    desc="$(awk '/^---$/{n++; next} n==1{print} n>1{exit}' "${d}SKILL.md" \
            | sed -n 's/^description:[[:space:]]*//p')"
    [ -n "$desc" ] || die "skills/$name/SKILL.md has no description"
    desc="$(printf '%s' "$desc" | sed -e 's/\([.!?]\) .*/\1/' -e 's/|/\\|/g')"
    printf '| [%s](skills/%s/SKILL.md) | %s |\n' "$name" "$name" "$desc"
  done
}

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
{ echo '| Skill | Description |'; echo '|---|---|'; rows; } > "$TMP"

grep -q '^<!-- BEGIN:catalog' "$README" || die "marker BEGIN:catalog not found in README.md"

NEW="$(awk -v bf="$TMP" '
  /^<!-- BEGIN:catalog/     { print; while ((getline l < bf) > 0) print l; close(bf); skip=1; next }
  /^<!-- END:catalog -->/   { skip=0; print; next }
  skip { next }
  { print }
' "$README")"

case "$MODE" in
  --write)
    if [ "$NEW" != "$(cat "$README")" ]; then
      printf '%s\n' "$NEW" > "$README"; echo "gen-readme: README.md updated"
    else
      echo "gen-readme: README.md already up to date"
    fi ;;
  --check)
    if [ "$NEW" != "$(cat "$README")" ]; then
      diff -u "$README" <(printf '%s\n' "$NEW") || true
      echo "gen-readme: README.md is OUT OF SYNC. Run: scripts/gen-readme.sh" >&2
      exit 1
    fi
    echo "gen-readme: README.md is in sync" ;;
  *) die "unknown mode '$MODE' (use --write or --check)" ;;
esac
