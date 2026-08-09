#!/usr/bin/env bash
#
# check-links.sh — DOCS_DIR의 모든 .md 출처/참고 URL을 추출해 HTTP 체크
#
# 사용법 (저장소 루트에서):
#   scripts/appscript-docs/check-links.sh                    # 전체 검사
#   scripts/appscript-docs/check-links.sh 02-services/       # 특정 하위 디렉토리만
#   scripts/appscript-docs/check-links.sh --report=links.md  # 결과를 markdown으로 저장
#
# 대상 문서: skills/appscript/docs/ (APPSCRIPT_DOCS_DIR로 오버라이드 가능).
# 출력: 깨진 URL (4xx/5xx 또는 timeout) 목록 + 발견된 파일 위치
# Exit code: 깨진 링크가 있으면 1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

cd "$DOCS_DIR"

PARALLEL="${PARALLEL:-8}"
TIMEOUT="${TIMEOUT:-12}"
TARGET_DIR="."
REPORT=""

for arg in "$@"; do
  case "$arg" in
    -h|--help) sed -n '3,13p' "$0"; exit 0 ;;
    --report=*) REPORT="${arg#--report=}" ;;
    *) TARGET_DIR="$arg" ;;
  esac
done

[[ -d "$TARGET_DIR" ]] || { err "디렉토리 없음: $TARGET_DIR (DOCS_DIR=$DOCS_DIR 기준)"; exit 1; }

check_one() {
  local url="$1"
  local code
  code=$(curl -sIL --max-time "$TIMEOUT" -o /dev/null -w '%{http_code}' \
    -A "Mozilla/5.0 (compatible; appscript-docs-linkcheck)" "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "405" || "$code" == "403" || "$code" == "000" ]]; then
    code=$(curl -sL --max-time "$TIMEOUT" -o /dev/null -w '%{http_code}' \
      -A "Mozilla/5.0 (compatible; appscript-docs-linkcheck)" "$url" 2>/dev/null || echo "000")
  fi
  printf '%s\t%s\n' "$code" "$url"
}
export -f check_one
export TIMEOUT

log "출처/참고 블록에서 URL 추출 중..."
URLS=()
while IFS= read -r line; do
  URLS+=("$line")
done < <(collect_source_urls "$TARGET_DIR")
TOTAL="${#URLS[@]}"
[[ "$TOTAL" -eq 0 ]] && { warn "URL을 찾지 못함"; exit 0; }

log "총 $TOTAL 개 URL, 동시 $PARALLEL 개로 체크 (timeout=${TIMEOUT}s)"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

printf '%s\n' "${URLS[@]}" \
  | xargs -n 1 -P "$PARALLEL" -I {} bash -c 'check_one "$@"' _ {} \
  > "$TMP"

BROKEN=$(awk -F'\t' '$1 ~ /^(0|4|5)/ {print}' "$TMP" | sort)
OK_COUNT=$(awk -F'\t' '$1 ~ /^(2|3)/' "$TMP" | wc -l | tr -d ' ')
BROKEN_COUNT=$(printf '%s' "$BROKEN" | grep -c . || true)

echo
ok "정상 (2xx/3xx): $OK_COUNT"
if [[ "$BROKEN_COUNT" -gt 0 ]]; then
  err "문제 발견: $BROKEN_COUNT"
  echo
  echo "$BROKEN" | while IFS=$'\t' read -r code url; do
    files="$(files_for_url "$url" "$TARGET_DIR")"
    printf '%s%s%s  %s\n' "$C_RED" "$code" "$C_RESET" "$url"
    [[ -n "$files" ]] && printf '       %s↳ %s%s\n' "$C_DIM" "$files" "$C_RESET"
  done
fi

if [[ -n "$REPORT" ]]; then
  {
    echo "# Link Check Report"
    echo
    echo "- 생성: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "- 총 URL: $TOTAL"
    echo "- 정상: $OK_COUNT"
    echo "- 문제: $BROKEN_COUNT"
    echo
    if [[ "$BROKEN_COUNT" -gt 0 ]]; then
      echo "## 깨진 URL"
      echo
      echo "$BROKEN" | while IFS=$'\t' read -r code url; do
        files="$(files_for_url "$url" "$TARGET_DIR")"
        echo "- \`$code\` $url"
        [[ -n "$files" ]] && echo "  - 위치: $files"
      done
    fi
  } > "$REPORT"
  ok "리포트 저장: $REPORT"
fi

[[ "$BROKEN_COUNT" -gt 0 ]] && exit 1 || exit 0
