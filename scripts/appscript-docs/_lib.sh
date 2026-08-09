#!/usr/bin/env bash
# 공통 라이브러리 — appscript-docs 유지보수 스크립트에서 source 해서 사용.
#
# 이 툴체인은 claude-plugins 저장소 "루트"에서 skills/appscript/docs/ 를
# 대상으로 동작한다 (플러그인 안에 붙지 않는다).
#
# 문서 "재생성"처럼 Claude(LLM)가 필요한 작업은 `claude` CLI 를 직접 호출하지
# 않고 `.claude/skills/appscript-docs-regen` 스킬로 처리한다. 그래서 이 라이브러리는
# 표준 Unix 도구(curl/awk/sed/find)만 사용하며 claude 바이너리에 의존하지 않는다.

# 색상 (터미널일 때만)
if [[ -t 1 ]]; then
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'
else
  C_RED=; C_GREEN=; C_YELLOW=; C_BLUE=; C_DIM=; C_RESET=
fi

log()  { printf '%s[*]%s %s\n' "$C_BLUE"  "$C_RESET" "$*"; }
ok()   { printf '%s[✓]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[!]%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err()  { printf '%s[✗]%s %s\n' "$C_RED"   "$C_RESET" "$*" >&2; }

# 저장소 루트 (이 파일 기준: scripts/appscript-docs/ 에서 두 단계 위)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 관리 대상 문서 디렉토리. 환경변수로 오버라이드 가능.
DOCS_DIR="${APPSCRIPT_DOCS_DIR:-$REPO_ROOT/skills/appscript/docs}"

# 변경 감지 baseline 저장 위치. 플러그인 배포물에 섞이지 않도록 저장소 루트 밑
# (.gitignore 처리)에 둔다. 환경변수로 오버라이드 가능.
SNAP_DIR="${APPSCRIPT_SNAP_DIR:-$REPO_ROOT/.snapshots/appscript-docs}"

today()   { date +%Y-%m-%d; }
now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# 단일 .md 파일에서 출처/참고 블록의 텍스트만 출력 (URL 추출 전 단계)
# 추출 대상:
#   1. '> **출처**' 인용 블록 (다음 비-인용 라인까지)
#   2. '## 참고' 헤더 ~ 다음 '## ' 헤더 또는 파일 끝까지
extract_source_block() {
  awk '
    /^>[[:space:]]*\*\*출처\*\*/ { in_src=1; next }
    in_src && /^>/             { print; next }
    in_src                     { in_src=0 }

    /^##[[:space:]]+참고/      { in_ref=1; next }
    in_ref && /^##[[:space:]]/ { in_ref=0 }
    in_ref                     { print }
  ' "$1"
}

# 텍스트에서 URL 추출 + 정규화 + 필터링
filter_urls() {
  grep -oE 'https?://[a-zA-Z0-9][^[:space:])"<>'"'"'`]*' \
    | sed -E 's/[.,;:)`]+$//' \
    | grep -E '://[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}' \
    | grep -Ev '[{}…]|\.{3}' \
    | grep -Ev 'example\.(com|org|net)'
}

# 한 디렉토리 안의 모든 .md 파일에서 출처 URL만 추출 (정렬·중복 제거)
collect_source_urls() {
  local target="$1"
  local f
  find "$target" -type f -name "*.md" | while IFS= read -r f; do
    extract_source_block "$f"
  done | filter_urls | sort -u
}

# 주어진 URL이 출처/참고 블록에 등장하는 .md 파일들 (쉼표 구분)
files_for_url() {
  local url="$1" target="${2:-.}"
  local f
  find "$target" -type f -name "*.md" | while IFS= read -r f; do
    if extract_source_block "$f" | grep -qF "$url"; then
      printf '%s\n' "${f#./}"
    fi
  done | paste -sd, -
}
