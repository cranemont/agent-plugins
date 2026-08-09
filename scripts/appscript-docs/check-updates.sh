#!/usr/bin/env bash
#
# check-updates.sh — appscript-docs 출처 URL의 변경 감지 (LLM 미사용)
#
# 각 .md 파일의 '> **출처**' 블록과 '## 참고' 섹션 URL에 대해 본문 콘텐츠 해시와
# Last-Modified 헤더를 저장·비교해서 어떤 출처가 바뀌었는지 보고한다. LLM은
# 호출하지 않는다. 대상 문서: skills/appscript/docs/ (DOCS_DIR).
#
# 일반 흐름 (저장소 루트에서 실행):
#   1. scripts/appscript-docs/check-updates.sh --init     # 첫 baseline 저장
#   2. (시간이 지난 후)
#   3. scripts/appscript-docs/check-updates.sh            # 변경된 출처 확인
#   4. 변경된 문서를 appscript-docs-regen 스킬로 재작성
#      (Claude Code에서:  변경된 파일 경로를 주고 /appscript-docs-regen 실행,
#       또는 --files 출력으로 대상 목록 확보)
#   5. scripts/appscript-docs/check-updates.sh --update   # 새 해시로 baseline 갱신
#
# 옵션:
#   --init             baseline 새로 생성 (기존 무시, 모든 URL fetch)
#   --update           비교 후 새 해시로 baseline 갱신
#   --files            변경된/신규 출처를 가진 .md 파일 경로만 stdout (xargs/스킬 입력용)
#   --json             기계 판독용 JSON 결과
#   --no-color
#
# 환경변수:
#   APPSCRIPT_DOCS_DIR   대상 문서 디렉토리 (기본: skills/appscript/docs)
#   APPSCRIPT_SNAP_DIR   baseline 저장 위치 (기본: .snapshots/appscript-docs)
#   PARALLEL             동시 fetch 수 (기본 8)
#   TIMEOUT              URL 당 timeout 초 (기본 20)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

cd "$DOCS_DIR"

INDEX="$SNAP_DIR/sources.tsv"   # url \t content_sha256 \t last_modified \t last_checked
PARALLEL="${PARALLEL:-8}"
TIMEOUT="${TIMEOUT:-20}"

MODE="check"
SHOW_FILES=0
JSON=0

for arg in "$@"; do
  case "$arg" in
    -h|--help) sed -n '3,33p' "$0"; exit 0 ;;
    --init)    MODE="init" ;;
    --update)  MODE="update" ;;
    --files)   SHOW_FILES=1 ;;
    --json)    JSON=1 ;;
    --no-color) C_RED=; C_GREEN=; C_YELLOW=; C_BLUE=; C_DIM=; C_RESET= ;;
    *) err "알 수 없는 옵션: $arg"; exit 2 ;;
  esac
done

mkdir -p "$SNAP_DIR"

# 단일 URL → "url<TAB>hash<TAB>last_modified" 출력
fetch_one() {
  local url="$1" timeout="${2:-20}"
  local body_tmp hdr_tmp hash lm
  body_tmp="$(mktemp)"
  hdr_tmp="$(mktemp)"
  if curl -sL --compressed --max-time "$timeout" \
        -A "Mozilla/5.0 (compatible; appscript-docs-update-check)" \
        -D "$hdr_tmp" -o "$body_tmp" "$url" 2>/dev/null; then
    hash="$(shasum -a 256 "$body_tmp" | cut -d' ' -f1)"
  else
    hash="FETCH_FAILED"
  fi
  lm="$(grep -i '^last-modified:' "$hdr_tmp" 2>/dev/null | tail -1 \
        | tr -d '\r\n' | sed -E 's/^[Ll]ast-[Mm]odified:[[:space:]]*//')"
  [[ -z "$lm" ]] && lm="-"
  printf '%s\t%s\t%s\n' "$url" "$hash" "$lm"
  rm -f "$body_tmp" "$hdr_tmp"
}
export -f fetch_one

fetch_all() {
  local urls_file="$1"
  xargs -P "$PARALLEL" -I {} bash -c 'fetch_one "$@"' _ {} "$TIMEOUT" < "$urls_file"
}

# 1) 현재 출처 URL 수집
URLS_FILE="$(mktemp)"
trap 'rm -f "$URLS_FILE" "$URLS_FILE".fetched "$URLS_FILE".new' EXIT
collect_source_urls . > "$URLS_FILE"
TOTAL=$(wc -l < "$URLS_FILE" | tr -d ' ')

if [[ "$TOTAL" -eq 0 ]]; then
  warn "출처 URL을 찾지 못함 (DOCS_DIR=$DOCS_DIR)"
  exit 0
fi

# --init: baseline 생성하고 종료
if [[ "$MODE" == "init" ]]; then
  log "Baseline 생성: $TOTAL 개 URL fetch (병렬 $PARALLEL)..."
  NOW="$(now_utc)"
  fetch_all "$URLS_FILE" \
    | awk -v ts="$NOW" -F'\t' '{ printf "%s\t%s\t%s\t%s\n", $1, $2, $3, ts }' \
    | sort > "$INDEX"
  ok "Baseline 저장: $INDEX ($TOTAL 항목)"
  exit 0
fi

if [[ ! -f "$INDEX" ]]; then
  err "Baseline이 없습니다. 먼저 실행: scripts/appscript-docs/check-updates.sh --init"
  exit 1
fi

# 2) 현재 상태 fetch
log "현재 상태 fetch 중: $TOTAL 개 URL (병렬 $PARALLEL)..."
fetch_all "$URLS_FILE" | sort > "$URLS_FILE.fetched"

# 3) baseline과 비교
NOW="$(now_utc)"
NEW_INDEX="$URLS_FILE.new"
: > "$NEW_INDEX"

CHANGED=()         # Last-Modified로 확정된 변경
MAYBE_CHANGED=()   # hash만 다름 — 동적 컨텐츠일 가능성 있음
NEW_URLS=()
FAILED=()
UNCHANGED=0

while IFS=$'\t' read -r url hash lm; do
  old_line="$(grep -F "${url}"$'\t' "$INDEX" 2>/dev/null | head -1 || true)"
  if [[ "$hash" == "FETCH_FAILED" ]]; then
    FAILED+=("$url")
    [[ -n "$old_line" ]] && printf '%s\n' "$old_line" >> "$NEW_INDEX"
    continue
  fi
  if [[ -z "$old_line" ]]; then
    NEW_URLS+=("$url")
    printf '%s\t%s\t%s\t%s\n' "$url" "$hash" "$lm" "$NOW" >> "$NEW_INDEX"
    continue
  fi

  old_hash="$(printf '%s' "$old_line" | cut -f2)"
  old_lm="$(printf '%s' "$old_line" | cut -f3)"
  old_checked="$(printf '%s' "$old_line" | cut -f4)"

  if [[ "$lm" != "-" && "$old_lm" != "-" ]]; then
    if [[ "$lm" == "$old_lm" ]]; then
      UNCHANGED=$((UNCHANGED+1))
    else
      CHANGED+=("$url|$old_lm|$lm|$old_checked")
    fi
  else
    if [[ "$hash" == "$old_hash" ]]; then
      UNCHANGED=$((UNCHANGED+1))
    else
      MAYBE_CHANGED+=("$url|${old_hash:0:12}|${hash:0:12}|$old_checked")
    fi
  fi
  printf '%s\t%s\t%s\t%s\n' "$url" "$hash" "$lm" "$NOW" >> "$NEW_INDEX"
done < "$URLS_FILE.fetched"

REMOVED=()
while IFS=$'\t' read -r url _; do
  if ! grep -qF "${url}"$'\t' "$URLS_FILE.fetched"; then
    REMOVED+=("$url")
  fi
done < "$INDEX"

affected_files() {
  local urls=()
  # bash 3.2(set -u)에서 빈 배열 값-전개는 unbound 에러 → ${arr[@]+..} 가드
  for entry in ${CHANGED[@]+"${CHANGED[@]}"};             do urls+=("${entry%%|*}"); done
  for entry in ${MAYBE_CHANGED[@]+"${MAYBE_CHANGED[@]}"}; do urls+=("${entry%%|*}"); done
  for url   in ${NEW_URLS[@]+"${NEW_URLS[@]}"};           do urls+=("$url");          done
  [[ "${#urls[@]}" -eq 0 ]] && return
  local u all=""
  for u in "${urls[@]}"; do
    f="$(files_for_url "$u" .)"
    [[ -n "$f" ]] && all+="$f,"
  done
  printf '%s\n' "${all%,}" | tr ',' '\n' | sort -u | grep -v '^$' || true
}

if [[ "$SHOW_FILES" -eq 1 ]]; then
  affected_files
  exit 0
fi

if [[ "$JSON" -eq 1 ]]; then
  printf '{'
  printf '"total":%d,' "$TOTAL"
  printf '"unchanged":%d,' "$UNCHANGED"
  printf '"changed":['
  first=1
  for entry in "${CHANGED[@]}"; do
    [[ $first -eq 0 ]] && printf ','
    url="${entry%%|*}"; rest="${entry#*|}"
    old_h="${rest%%|*}"; rest="${rest#*|}"
    new_h="${rest%%|*}"; old_t="${rest#*|}"
    printf '{"url":"%s","old":"%s","new":"%s","since":"%s"}' "$url" "$old_h" "$new_h" "$old_t"
    first=0
  done
  printf '],'
  printf '"new":['
  first=1
  for u in "${NEW_URLS[@]}"; do
    [[ $first -eq 0 ]] && printf ','
    printf '"%s"' "$u"; first=0
  done
  printf '],'
  printf '"removed":['
  first=1
  for u in "${REMOVED[@]}"; do
    [[ $first -eq 0 ]] && printf ','
    printf '"%s"' "$u"; first=0
  done
  printf '],'
  printf '"failed":['
  first=1
  for u in "${FAILED[@]}"; do
    [[ $first -eq 0 ]] && printf ','
    printf '"%s"' "$u"; first=0
  done
  printf ']'
  printf '}\n'
else
  echo
  ok    "변경 없음:        $UNCHANGED"
  printf '%s[Δ]%s 변경됨 (확정):    %d  (Last-Modified 헤더 기준)\n' "$C_YELLOW" "$C_RESET" "${#CHANGED[@]}"
  printf '%s[?]%s 변경됨 (의심):    %d  (본문 해시 기준 — 동적 페이지 가능성)\n' "$C_YELLOW" "$C_RESET" "${#MAYBE_CHANGED[@]}"
  printf '%s[+]%s 신규:            %d\n' "$C_BLUE" "$C_RESET" "${#NEW_URLS[@]}"
  printf '%s[−]%s 제거됨:          %d\n' "$C_DIM"  "$C_RESET" "${#REMOVED[@]}"
  [[ "${#FAILED[@]}" -gt 0 ]] && \
    printf '%s[!]%s fetch 실패:     %d\n' "$C_RED" "$C_RESET" "${#FAILED[@]}"
  echo

  if [[ "${#CHANGED[@]}" -gt 0 ]]; then
    echo "── 변경된 출처 (Last-Modified 확정) ──"
    for entry in "${CHANGED[@]}"; do
      url="${entry%%|*}"; rest="${entry#*|}"
      old_v="${rest%%|*}"; rest="${rest#*|}"
      new_v="${rest%%|*}"; old_t="${rest#*|}"
      printf '%sΔ%s %s\n' "$C_YELLOW" "$C_RESET" "$url"
      printf '  %sbase: %s (since %s)%s\n' "$C_DIM" "$old_v" "$old_t" "$C_RESET"
      printf '  %snow:  %s%s\n'             "$C_DIM" "$new_v" "$C_RESET"
      files="$(files_for_url "$url" .)"
      [[ -n "$files" ]] && printf '  %s↳ %s%s\n' "$C_DIM" "$files" "$C_RESET"
    done
    echo
  fi

  if [[ "${#MAYBE_CHANGED[@]}" -gt 0 ]]; then
    echo "── 변경 의심 (본문 해시만 다름) ──"
    echo "  ※ Last-Modified 헤더가 없거나 동적 컨텐츠로 false positive 가능. 수동 확인 권장."
    for entry in "${MAYBE_CHANGED[@]}"; do
      url="${entry%%|*}"; rest="${entry#*|}"
      old_v="${rest%%|*}"; rest="${rest#*|}"
      new_v="${rest%%|*}"; old_t="${rest#*|}"
      printf '%s?%s %s\n' "$C_YELLOW" "$C_RESET" "$url"
      printf '  %sbase: %s (since %s)%s\n' "$C_DIM" "$old_v" "$old_t" "$C_RESET"
      printf '  %snow:  %s%s\n'             "$C_DIM" "$new_v" "$C_RESET"
      files="$(files_for_url "$url" .)"
      [[ -n "$files" ]] && printf '  %s↳ %s%s\n' "$C_DIM" "$files" "$C_RESET"
    done
    echo
  fi

  if [[ "${#NEW_URLS[@]}" -gt 0 ]]; then
    echo "── 신규 출처 ──"
    for u in "${NEW_URLS[@]}"; do
      printf '%s+%s %s\n' "$C_BLUE" "$C_RESET" "$u"
      files="$(files_for_url "$u" .)"
      [[ -n "$files" ]] && printf '  %s↳ %s%s\n' "$C_DIM" "$files" "$C_RESET"
    done
    echo
  fi

  if [[ "${#REMOVED[@]}" -gt 0 ]]; then
    echo "── 제거된 출처 (baseline에만 존재) ──"
    for u in "${REMOVED[@]}"; do printf '%s−%s %s\n' "$C_DIM" "$C_RESET" "$u"; done
    echo
  fi

  if [[ "${#FAILED[@]}" -gt 0 ]]; then
    echo "── fetch 실패 (네트워크/timeout/봇 차단) ──"
    for u in "${FAILED[@]}"; do printf '%s?%s %s\n' "$C_RED" "$C_RESET" "$u"; done
    echo
  fi

  if [[ "${#CHANGED[@]}" -gt 0 || "${#MAYBE_CHANGED[@]}" -gt 0 || "${#NEW_URLS[@]}" -gt 0 ]]; then
    echo "── 영향받는 문서 ──"
    affected_files | sed 's/^/  /'
    echo
    log "변경된 문서만 재작성하려면 (Claude Code에서):"
    echo "  → appscript-docs-regen 스킬을 실행하고 위 파일 경로를 대상으로 지정"
    echo "  → 대상 목록만 뽑으려면: scripts/appscript-docs/check-updates.sh --files"
    echo
    log "위 변경 사항을 검토했다면 baseline 갱신:"
    echo "  scripts/appscript-docs/check-updates.sh --update"
  fi
fi

if [[ "$MODE" == "update" ]]; then
  mv "$NEW_INDEX" "$INDEX"
  ok "Baseline 갱신: $INDEX"
fi

if [[ "${#CHANGED[@]}" -gt 0 || "${#MAYBE_CHANGED[@]}" -gt 0 || "${#NEW_URLS[@]}" -gt 0 ]]; then
  exit 1
fi
exit 0
