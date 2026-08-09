#!/usr/bin/env bash
# ADR 캐논 도구: new(생성) / index(목록 재생성) / check(규약 검사)
# 의존성: bash 3.2+, awk, find. BSD(macOS)/GNU 겸용.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage:
  adr.sh new <english-kebab-slug> [한국어 제목]   다음 번호로 새 ADR 스캐폴드 생성
  adr.sh index [--check]                          README.md 목록 블록 재생성 (--check는 검증만)
  adr.sh check                                    규약 검사 (frontmatter·섹션·참조·목록)
환경변수: ADR_DIR (기본: <git root>/docs/adr)
EOF
  exit 2
}

script_dir=$(cd "$(dirname "$0")" && pwd)
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
adr_dir=${ADR_DIR:-$repo_root/docs/adr}
readme=$adr_dir/README.md
begin_mark='<!-- BEGIN:adr-index -->'
end_mark='<!-- END:adr-index -->'

adr_files() {
  [ -d "$adr_dir" ] || return 0
  find "$adr_dir" -maxdepth 1 -name '[0-9][0-9][0-9][0-9]-*.md' | sort
}

# frontmatter에서 key 값을 읽는다 (뒤따르는 주석 제거)
fm_value() {
  awk -v key="$2" '
    NR == 1 { if ($0 != "---") exit; next }
    /^---[[:space:]]*$/ { exit }
    index($0, key ":") == 1 {
      sub(/^[^:]*:[[:space:]]*/, ""); sub(/[[:space:]]+#.*$/, ""); sub(/[[:space:]]+$/, "")
      print; exit
    }
  ' "$1"
}

adr_title() {
  awk '/^# / { sub(/^# ADR-[0-9]+:[[:space:]]*/, ""); print; exit }' "$1"
}

id_to_file() { # adr-0012 → 0012-slug.md (basename, 없으면 빈 값)
  local num=${1#adr-}
  find "$adr_dir" -maxdepth 1 -name "$num-*.md" -exec basename {} \; | head -1
}

cmd_new() {
  local slug=${1:-} title=${2:-}
  [ -n "$slug" ] || usage
  printf '%s' "$slug" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' \
    || { echo "error: 슬러그는 영문 kebab-case여야 한다: $slug" >&2; exit 1; }
  mkdir -p "$adr_dir"
  local last next file today
  last=$(adr_files | awk -F/ '{ print substr($NF, 1, 4) }' | sort -n | tail -1)
  next=$(printf '%04d' $((10#${last:-0} + 1)))
  file=$adr_dir/$next-$slug.md
  [ -n "$title" ] || title=$slug
  today=$(date +%F)
  awk -v n="$next" -v d="$today" -v t="$title" '
    { gsub(/NNNN/, n); gsub(/YYYY-MM-DD/, d) }
    /^# ADR-/ { print "# ADR-" n ": " t; next }
    { print }
  ' "$script_dir/../references/template.md" > "$file"
  if [ -f "$readme" ]; then cmd_index; fi
  echo "created: $file"
}

cmd_index() {
  local mode=${1:-}
  [ -f "$readme" ] || { echo "error: $readme 없음 — init 플로우로 README부터 만든다" >&2; return 1; }
  grep -qF "$begin_mark" "$readme" || { echo "error: $readme 에 '$begin_mark' 마커가 없다" >&2; return 1; }
  local tmp_rows tmp_new
  tmp_rows=$(mktemp)
  tmp_new=$(mktemp)
  # shellcheck disable=SC2064 — 지역변수라 종료 시점엔 사라지므로 지금 확장해 박는다
  trap "rm -f '$tmp_rows' '$tmp_new'" EXIT
  {
    echo '| # | 제목 | 상태 | 날짜 |'
    echo '|---|---|---|---|'
    local f base num title created sb ab state ref
    for f in $(adr_files); do
      base=$(basename "$f")
      num=${base%%-*}
      title=$(adr_title "$f" | sed 's/|/\\|/g')
      created=$(fm_value "$f" created)
      sb=$(fm_value "$f" superseded_by)
      ab=$(fm_value "$f" amended_by)
      if [ -n "$sb" ]; then
        ref=$(id_to_file "$sb"); state="[$sb](${ref:-#})로 대체됨"
      elif [ -n "$ab" ]; then
        ref=$(id_to_file "$ab"); state="현행 · [$ab](${ref:-#})로 일부 번복"
      else
        state='현행'
      fi
      echo "| [$num]($base) | $title | $state | $created |"
    done
  } > "$tmp_rows"
  awk -v begin="$begin_mark" -v end="$end_mark" -v rowsfile="$tmp_rows" '
    $0 == begin { print; while ((getline line < rowsfile) > 0) print line; inblock = 1; next }
    $0 == end { inblock = 0 }
    !inblock { print }
  ' "$readme" > "$tmp_new"
  if [ "$mode" = "--check" ]; then
    diff -q "$readme" "$tmp_new" >/dev/null \
      || { echo "error: 목록이 낡았다 — adr.sh index 실행" >&2; return 1; }
    echo "index: OK"
  else
    mv "$tmp_new" "$readme"
    echo "index: 재생성 완료 ($readme)"
  fi
}

cmd_check() {
  local errors=0 files f base num v sec dup
  files=$(adr_files)
  if [ -z "$files" ]; then echo "check: ADR 없음 ($adr_dir)"; return 0; fi
  err() { echo "error: ${base:-$adr_dir} — $1" >&2; errors=$((errors + 1)); }
  base=''
  dup=$(printf '%s\n' $files | awk -F/ '{ print substr($NF, 1, 4) }' | sort | uniq -d)
  [ -z "$dup" ] || err "번호 중복: $(echo $dup)"
  for f in $files; do
    base=$(basename "$f")
    num=${base%%-*}
    printf '%s' "$base" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$' \
      || err "파일명이 NNNN-english-kebab.md 형식이 아니다"
    [ "$(head -1 "$f")" = "---" ] || err "frontmatter가 없다"
    v=$(awk '
      NR == 1 { next }
      /^---[[:space:]]*$/ { exit }
      /^[A-Za-z_-]+:/ {
        key = $0; sub(/:.*/, "", key)
        if (key !~ /^(id|created|supersedes|superseded_by|amended_by)$/) print key
      }
    ' "$f")
    [ -z "$v" ] || err "허용되지 않는 frontmatter 키: $(echo $v) — 캐논은 id/created/supersedes/superseded_by/amended_by만 (status류 현재시제 필드 금지)"
    [ "$(fm_value "$f" id)" = "adr-$num" ] || err "id가 adr-$num 이 아니다"
    printf '%s' "$(fm_value "$f" created)" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' \
      || err "created가 YYYY-MM-DD가 아니다"
    grep -q "^# ADR-$num: " "$f" || err "H1이 '# ADR-$num: 제목' 형식이 아니다"
    for sec in '## 맥락' '## 결정' '## 기각한 대안' '## 결과'; do
      grep -q "^$sec" "$f" || err "필수 절 없음: $sec"
    done
    for v in supersedes superseded_by amended_by; do
      v=$(fm_value "$f" "$v")
      [ -z "$v" ] || [ -n "$(id_to_file "$v")" ] || err "참조 대상 파일이 없다: $v"
    done
  done
  base=''
  if [ -f "$readme" ]; then cmd_index --check || errors=$((errors + 1)); fi
  if [ "$errors" -eq 0 ]; then echo "check: OK"; else echo "check: ${errors}건 실패" >&2; exit 1; fi
}

cmd=${1:-}
[ $# -gt 0 ] && shift
case $cmd in
  new) cmd_new "$@" ;;
  index) cmd_index "${1:-}" ;;
  check) cmd_check ;;
  *) usage ;;
esac
