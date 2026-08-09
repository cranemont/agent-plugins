#!/usr/bin/env bash
#
# build-toc.sh — DOCS_DIR을 스캔해 TOC.md의 자동 영역을 갱신
#
# 사용법 (저장소 루트에서):
#   scripts/appscript-docs/build-toc.sh            # TOC.md 갱신
#   scripts/appscript-docs/build-toc.sh --check    # 변경사항만 확인 (파일 변경 없음, exit 1 if drift)
#   scripts/appscript-docs/build-toc.sh --stdout   # stdout으로 생성 결과만 출력
#
# 자동 갱신 영역 (마커 사이):
#   <!-- BEGIN:auto-sections --> ~ <!-- END:auto-sections -->
#   <!-- BEGIN:auto-tree -->     ~ <!-- END:auto-tree -->
#
# 마커 외 영역(헤더, 라우팅 표, 출처 정책 등)은 수동 관리이므로 건드리지 않음.
# 대상 문서: skills/appscript/docs/ (APPSCRIPT_DOCS_DIR로 오버라이드 가능).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

cd "$DOCS_DIR"

MODE="write"
case "${1:-}" in
  --check)   MODE="check" ;;
  --stdout)  MODE="stdout" ;;
  -h|--help)
    sed -n '3,15p' "$0"
    exit 0
    ;;
esac

declare -a SECTIONS=(
  "01-overview|01. 개요 & 런타임"
  "02-services|02. 서비스 (Services)"
  "03-triggers|03. 트리거 (Triggers)"
  "04-web-apps|04. 웹 앱 (Web Apps)"
  "05-auth|05. 인증 & 권한"
  "06-quotas|06. Quota & 한계"
  "07-development|07. 개발 도구"
  "08-patterns|08. 패턴 & 실전"
)

extract_title() {
  local f="$1"
  head -1 "$f" | sed -E 's/^#[[:space:]]*//'
}

count_lines() { wc -l < "$1" | tr -d ' '; }

build_sections() {
  for entry in "${SECTIONS[@]}"; do
    local dir="${entry%%|*}"
    local label="${entry#*|}"
    [[ -d "$dir" ]] || continue

    printf '\n### %s\n\n' "$label"
    printf '| 파일 | 제목 | 줄 수 |\n'
    printf '|---|---|---|\n'

    while IFS= read -r f; do
      [[ -f "$f" ]] || continue
      local rel="${f#./}"
      local title
      title="$(extract_title "$f")"
      local lines
      lines="$(count_lines "$f")"
      printf '| [`%s`](%s) | %s | %s |\n' "$(basename "$f")" "$rel" "$title" "$lines"
    done < <(LC_ALL=C find "$dir" -maxdepth 1 -name "*.md" -type f | sort)
  done
}

# auto-tree: DOCS_DIR의 실제 구조를 반영.
# (유지보수 스크립트는 저장소 루트 scripts/appscript-docs/ 로 이동했으므로
#  docs 트리에는 표기하지 않는다.)
build_tree() {
  printf '```\n'
  printf 'skills/appscript/docs/\n'
  printf '├── TOC.md\n'
  local last_idx=$((${#SECTIONS[@]} - 1))
  for i in "${!SECTIONS[@]}"; do
    local entry="${SECTIONS[$i]}"
    local dir="${entry%%|*}"
    [[ -d "$dir" ]] || continue
    local count
    count=$(LC_ALL=C find "$dir" -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
    local prefix="├──"
    [[ "$i" -eq "$last_idx" ]] && prefix="└──"
    printf '%s %-22s (%s)\n' "$prefix" "$dir/" "$count"
  done
  printf '```\n'
}

replace_block() {
  local toc="$1" begin="$2" end="$3" body_file="$4"
  awk -v begin="$begin" -v end="$end" -v body_file="$body_file" '
    $0 ~ begin {
      print
      while ((getline line < body_file) > 0) print line
      close(body_file)
      skip=1
      next
    }
    $0 ~ end { skip=0; print; next }
    !skip    { print }
  ' "$toc"
}

TOC="TOC.md"
[[ -f "$TOC" ]] || { err "TOC.md not found at $DOCS_DIR/$TOC"; exit 1; }

if ! grep -q "BEGIN:auto-sections" "$TOC" || ! grep -q "END:auto-sections" "$TOC"; then
  err "TOC.md에 자동 생성 마커가 없습니다:"
  err "  <!-- BEGIN:auto-sections --> ... <!-- END:auto-sections -->"
  err "  <!-- BEGIN:auto-tree -->     ... <!-- END:auto-tree -->"
  err "마커를 추가하지 않으면 이 스크립트는 동작하지 않습니다."
  exit 1
fi

SECTIONS_FILE="$(mktemp)"
TREE_FILE="$(mktemp)"
TMP="$(mktemp)"
TMP2="$(mktemp)"
trap 'rm -f "$SECTIONS_FILE" "$TREE_FILE" "$TMP" "$TMP2" "$TMP2.final"' EXIT

build_sections > "$SECTIONS_FILE"
build_tree     > "$TREE_FILE"

replace_block "$TOC"  "BEGIN:auto-sections" "END:auto-sections" "$SECTIONS_FILE" > "$TMP"
replace_block "$TMP"  "BEGIN:auto-tree"     "END:auto-tree"     "$TREE_FILE"     > "$TMP2.final"

case "$MODE" in
  stdout)
    cat "$TMP2.final"
    ;;
  check)
    if diff -q "$TOC" "$TMP2.final" >/dev/null; then
      ok "TOC.md 최신 상태"
      exit 0
    else
      warn "TOC.md 갱신 필요. 변경사항:"
      diff -u "$TOC" "$TMP2.final" || true
      exit 1
    fi
    ;;
  write)
    if diff -q "$TOC" "$TMP2.final" >/dev/null; then
      ok "TOC.md 이미 최신 — 변경 없음"
    else
      cp "$TMP2.final" "$TOC"
      ok "TOC.md 갱신됨"
    fi
    ;;
esac
