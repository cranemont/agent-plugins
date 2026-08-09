#!/usr/bin/env bash
# Lint every skills/*/SKILL.md for Agent Skills spec purity — the portability
# contract this repo exists for (see agentskills.io/specification).
#
# Errors (exit 1):
#   - SKILL.md missing, frontmatter missing/unclosed, or name/description absent
#   - top-level frontmatter keys outside the open spec (name, description,
#     license, compatibility, metadata). This includes `allowed-tools`, which
#     the spec marks experimental and some packagers reject outright.
#   - name != directory name, not ^[a-z0-9]+(-[a-z0-9]+)*$, or over 64 chars
#   - description empty, over 1024 chars, or not a single line (multi-line YAML
#     would also break gen-readme.sh)
# Warnings (non-fatal):
#   - SKILL.md over 500 lines (spec recommends staying under)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0
err() { echo "lint-skills: error: $*" >&2; fail=1; }
warn() { echo "lint-skills: warning: $*" >&2; }

for d in "$ROOT/skills"/*/; do
  dir="$(basename "$d")"
  f="${d}SKILL.md"
  [ -f "$f" ] || { err "skills/$dir has no SKILL.md"; continue; }

  [ "$(head -n1 "$f")" = "---" ] || { err "skills/$dir: SKILL.md must start with '---' frontmatter"; continue; }
  awk '/^---$/{n++} END{exit !(n>=2)}' "$f" || { err "skills/$dir: frontmatter never closed"; continue; }
  fm="$(awk '/^---$/{n++; next} n==1{print} n>1{exit}' "$f")"

  while IFS= read -r key; do
    case "$key" in
      name|description|license|compatibility|metadata) ;;
      *) err "skills/$dir: non-spec frontmatter key '$key' breaks portability" ;;
    esac
  done < <(printf '%s\n' "$fm" | grep -E '^[A-Za-z][A-Za-z0-9_-]*:' | sed 's/:.*//')

  name="$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p')"
  desc="$(printf '%s\n' "$fm" | sed -n 's/^description:[[:space:]]*//p')"

  [ -n "$name" ] || err "skills/$dir: missing 'name'"
  [ "$name" = "$dir" ] || err "skills/$dir: name '$name' must match its directory name"
  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || err "skills/$dir: name must be lowercase alphanumerics and single hyphens"
  [ "${#name}" -le 64 ] || err "skills/$dir: name over 64 chars"

  case "$desc" in
    "") err "skills/$dir: missing or empty 'description' (Codex refuses to load the skill without it)" ;;
    "|"*|">"*) err "skills/$dir: description must be a single line, not YAML block style" ;;
  esac
  [ "${#desc}" -le 1024 ] || err "skills/$dir: description over 1024 chars (spec cap)"

  lines="$(wc -l < "$f")"
  [ "$lines" -le 500 ] || warn "skills/$dir: SKILL.md is $lines lines (spec recommends <500 — move detail into references/)"
done

[ "$fail" -eq 0 ] && echo "lint-skills: all skills spec-pure"
exit "$fail"
