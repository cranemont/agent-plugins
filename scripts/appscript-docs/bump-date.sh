#!/usr/bin/env bash
#
# bump-date.sh — 문서의 '최종 확인일' 메타를 오늘 또는 지정 날짜로 갱신
#
# 사용법 (저장소 루트에서):
#   scripts/appscript-docs/bump-date.sh                             # 전체 .md 파일
#   scripts/appscript-docs/bump-date.sh 02-services/spreadsheet.md  # 단일 파일
#   scripts/appscript-docs/bump-date.sh --date=2026-06-01           # 특정 날짜
#   scripts/appscript-docs/bump-date.sh --dry-run                   # 변경 미리보기
#
# 대상 문서: skills/appscript/docs/ (APPSCRIPT_DOCS_DIR로 오버라이드 가능).
# 매치 패턴: '**최종 확인일**: YYYY-MM-DD' / '**최종 갱신**: YYYY-MM-DD' / '최종 검증'

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

cd "$DOCS_DIR"

DATE="$(today)"
DRY_RUN=0
TARGET=""

for arg in "$@"; do
  case "$arg" in
    -h|--help) sed -n '3,13p' "$0"; exit 0 ;;
    --date=*)  DATE="${arg#--date=}" ;;
    --dry-run) DRY_RUN=1 ;;
    -*) err "알 수 없는 옵션: $arg"; exit 2 ;;
    *)  TARGET="$arg" ;;
  esac
done

if ! [[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  err "유효하지 않은 날짜 형식 (YYYY-MM-DD 필요): $DATE"; exit 2
fi

FILES=()
if [[ -n "$TARGET" ]]; then
  [[ -f "$TARGET" ]] || { err "파일 없음: $TARGET"; exit 1; }
  FILES=("$TARGET")
else
  while IFS= read -r line; do
    FILES+=("$line")
  done < <(find . -name "*.md" -type f | sort)
fi

SED_EXPR="s/(최종 (확인일|갱신|검증))([^0-9]*)[0-9]{4}-[0-9]{2}-[0-9]{2}/\1\3${DATE}/g"

CHANGED=0
UNCHANGED=0
SKIPPED=0

for f in "${FILES[@]}"; do
  if ! grep -qE '최종 (확인일|갱신|검증)' "$f"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  NEW_CONTENT="$(sed -E "$SED_EXPR" "$f")"
  if [[ "$NEW_CONTENT" == "$(cat "$f")" ]]; then
    UNCHANGED=$((UNCHANGED+1))
    continue
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    printf '%s%s%s\n' "$C_YELLOW" "$f" "$C_RESET"
    diff -u <(cat "$f") <(printf '%s\n' "$NEW_CONTENT") | grep -E '^[-+]' | grep -v '^[+-]{3}' || true
  else
    sed -E -i.bak "$SED_EXPR" "$f"
    rm -f "$f.bak"
    ok "$f"
  fi
  CHANGED=$((CHANGED+1))
done

echo
log "결과: 변경 $CHANGED / 동일 $UNCHANGED / 메타없음 $SKIPPED"
[[ $DRY_RUN -eq 1 ]] && warn "(--dry-run: 실제 파일은 변경되지 않음)"
