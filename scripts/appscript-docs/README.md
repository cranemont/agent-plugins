# scripts/appscript-docs — Apps Script 문서 유지보수 툴체인

`skills/appscript/docs/` 의 Google Apps Script 한국어 레퍼런스를 **저장소 루트에서** 관리·갱신하는 스크립트 모음. 

핵심 원칙:
- **비-LLM 작업은 스크립트**로 (변경 감지·TOC·링크·날짜). 표준 Unix 도구(`curl`/`awk`/`sed`/`find`)만 사용.
- **LLM(Claude)이 필요한 문서 재생성은 스킬로** — `.claude/skills/appscript-docs-regen`. (`claude` CLI 를 shell-out 하지 않는다.)

모든 스크립트는 **저장소 루트에서** 실행한다. 대상 문서 디렉토리와 baseline 위치는 환경변수로 오버라이드 가능:
- `APPSCRIPT_DOCS_DIR` (기본 `skills/appscript/docs`)
- `APPSCRIPT_SNAP_DIR` (기본 `.snapshots/appscript-docs`, gitignore됨)

## 정기 갱신 흐름

```bash
# 1. 첫 실행 — 출처 페이지 baseline 저장
scripts/appscript-docs/check-updates.sh --init

# 2. (시간이 지난 후) 공식 페이지가 바뀌었는지 감지 (LLM 없음)
scripts/appscript-docs/check-updates.sh

# 3. 변경된 문서를 Claude로 재작성 — Claude Code에서 스킬 실행
#    appscript-docs-regen 스킬에 대상 파일 경로를 넘긴다.
#    (대상 목록만 뽑기:  scripts/appscript-docs/check-updates.sh --files)

# 4. 검토 후 baseline 갱신 (변경 확정)
scripts/appscript-docs/check-updates.sh --update

# 5. TOC 자동 영역 갱신 + 링크 점검
scripts/appscript-docs/build-toc.sh
scripts/appscript-docs/check-links.sh
```

## 스크립트 일람

| 스크립트 | LLM | 역할 |
|---|---|---|
| `check-updates.sh` | ✗ | 출처 URL의 `Last-Modified`/본문 해시를 baseline과 비교해 변경 감지. `--init`/`--update`/`--files`/`--json`. |
| `build-toc.sh` | ✗ | `TOC.md`의 `<!-- BEGIN:auto-* -->` 마커 영역(섹션 인덱스·트리)을 디렉토리 스캔으로 갱신. `--check`/`--stdout`. |
| `check-links.sh` | ✗ | 출처/참고 URL의 HTTP 상태 점검. 깨진 링크 보고. `--report=<file>`. |
| `bump-date.sh` | ✗ | 문서의 '최종 확인일' 메타를 일괄 갱신. `--date=`/`--dry-run`. |
| `_lib.sh` | — | 공통 라이브러리 (경로·색상·URL 추출). 직접 실행하지 않음. |
| **문서 재생성** | ✓ | **스크립트 아님** → `.claude/skills/appscript-docs-regen` 스킬. 출처 URL을 WebFetch로 다시 확인해 문서를 재작성. |

## 왜 재생성만 스킬인가

문서 재작성은 공식 페이지를 읽고 판단해 다시 쓰는 LLM 작업이다. 예전에는 `regen.sh`가 `claude` CLI(`claude -p ... --permission-mode acceptEdits`)를 shell-out 했는데, CLI 호출 방식이 버전·인증·권한 모드에 민감해 불안정했다. Claude Code 세션 안에서 도는 스킬로 옮기면 그 취약점이 사라지고, 사용자가 결과를 바로 검토·수정할 수 있다.

## 참고

- 대상 문서 스킬: `skills/appscript/SKILL.md`
- baseline/백업/리포트는 `.gitignore` 처리됨 (`.snapshots/`, `*.bak`, `link-report.md`).
