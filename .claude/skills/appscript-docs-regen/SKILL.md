---
name: appscript-docs-regen
description: |
  skills/appscript/docs/ 의 Google Apps Script 한국어 레퍼런스 문서를 공식 출처 기준으로 재작성한다. `claude` CLI shell-out(옛 regen.sh)을 대체하는 스킬 형태. 대상 문서의 '출처' URL을 WebFetch로 다시 확인해 변경분을 반영하고 '최종 확인일'을 갱신한다.
  사용 시점:
    - `scripts/appscript-docs/check-updates.sh` 가 변경된 출처를 보고한 뒤, 해당 문서를 최신화할 때
    - 사용자가 "앱스크립트 문서 최신화/재생성해줘", "이 doc 공식 문서 기준으로 다시 써줘" 라고 요청할 때
    - 새 문서를 추가하며 표준 포맷으로 초안을 만들 때
tools:
  - Read
  - Edit
  - Write
  - WebFetch
  - WebSearch
  - Bash
  - Glob
  - Grep
---

# appscript-docs 재생성 스킬

`skills/appscript/docs/` 의 Apps Script 레퍼런스 문서를 **공식 출처를 다시 읽어** 최신 상태로 재작성한다. 예전 `regen.sh`가 `claude` CLI를 shell-out 하던 것을, 세션 안에서 도는 스킬로 옮긴 것이다 — CLI 인증/권한/버전에 흔들리지 않고, 결과를 바로 검토·수정할 수 있다.

## 입력

- **대상 파일**: 재작성할 `.md` 경로 (예: `skills/appscript/docs/02-services/gmail.md`). 여러 개면 하나씩 순차 처리.
- 대상이 불명확하면 먼저 변경 감지로 목록을 만든다:

```bash
# 변경된/신규 출처를 가진 문서 경로만 출력 (DOCS_DIR 기준 상대경로)
scripts/appscript-docs/check-updates.sh --files
```

## 절차 (문서 1개당)

1. **현재 파일 전체를 `Read`** 한다. 구조·분량·톤을 파악한다.
2. 파일 상단 `> **출처**` 블록의 **모든 URL을 `WebFetch`** 로 다시 가져온다. (필요하면 `## 참고` 섹션 URL도.)
3. 공식 내용과 대조해 **변경분을 식별**: 새 API/메서드, deprecated 표기, enum·필드 값, quota 수치 변화 등.
4. **동일한 표준 포맷을 유지**하며 본문을 갱신하고, **`Edit`/`Write`로 덮어쓴다**. 기존 구조·분량에서 크게 벗어나지 않는다 (가독성 유지).
5. `최종 확인일`을 오늘 날짜로 갱신한다 (아래 규칙 참조).
6. 변경 요약을 사용자에게 보고한다.

## 작성 규칙 (필수)

- **언어**: 한국어 본문 + 영어 API/식별자/매니페스트 키.
- **런타임**: 모든 코드 예제는 V8 가정 (`const`/`let`/arrow 사용). Rhino 한정 동작은 별도 명시.
- **추측 금지**: 공식 문서에서 확인되지 않는 API 동작·필드·enum 값은 지어내지 말고 **"공식 문서 확인 필요"** 로 표기한다.
- **변경 가능 수치**: quota/한도 등은 출처를 명기하고 변경 가능성을 한 줄 덧붙인다.
- **표준 포맷**:

```markdown
# {제목}

> **출처**
> - {URL 목록}
>
> **최종 확인일**: {오늘 YYYY-MM-DD}

## 개요
...

## (서비스/주제별 핵심 섹션들)

## 일반적인 패턴 (해당되는 경우)

## 주의사항 / 함정 / Quota

## 참고
- {URL 목록}
```

## 날짜 갱신

재작성한 문서의 `최종 확인일`은 오늘로 맞춘다. 본문에서 직접 고쳐도 되고, 여러 문서를 한꺼번에 맞출 땐:

```bash
scripts/appscript-docs/bump-date.sh <상대경로>      # 단일
scripts/appscript-docs/bump-date.sh                 # 전체
```

오늘 날짜는 `date +%Y-%m-%d` 로 확인한다 (세션 컨텍스트의 날짜가 아니라 실제 시스템 날짜 기준).

## 마무리 (권장)

문서를 여러 개 재작성했다면:

1. `scripts/appscript-docs/build-toc.sh` — TOC 자동 영역(줄 수·인덱스) 갱신.
2. `scripts/appscript-docs/check-updates.sh --update` — 검토 끝난 출처의 baseline을 새 해시로 확정.
3. 필요하면 `scripts/appscript-docs/check-links.sh` 로 링크 점검.

## 백업/복원

별도 `.bak`를 만들지 않는다 — git이 백업이다. 잘못 재작성했으면 `git checkout -- <파일>` 로 되돌린다.

## 하지 말 것

- 대상 문서의 출처 URL 없이 기억/추론만으로 재작성 (반드시 WebFetch로 대조).
- 표준 포맷·언어 규칙 이탈.
- 한 번에 수십 개를 무비판적으로 재작성 — `check-updates`가 실제 변경을 보고한 문서 위주로.
