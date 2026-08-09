---
name: adr
description: Architecture Decision Record(ADR) 워크플로우 — 되돌리기 비싼 결정을 불변 파일로 기록하고(docs/adr/NNNN-slug.md, status 없이 superseded_by로 상태 파생), 자동 인덱스·supersede·작업 전 참조까지 하나의 캐논으로 관리한다. Use when the user asks to record, initialize, or supersede an ADR / set up decision tracking in a repo, when a hard-to-reverse decision is reached in conversation (stack, architecture boundary, scope cuts, grilling 세션 합의), or before touching architecture in any repo that has docs/adr/.
---

# ADR — 설계 결정 기록·추적

되돌리기 비싼 결정을 레포 안의 불변 마크다운으로 남기고, 에이전트가 작업 전에 그 기록을 소비하게 만드는 워크플로우. 어떤 레포에서든 아래 캐논 하나만 쓴다. 각 규칙의 근거는 [references/research.md](references/research.md) — 규칙을 바꾸려면 근거를 먼저 반박한다.

## 캐논

| 항목 | 규칙 |
|---|---|
| 위치 | `docs/adr/` (레포 루트 기준) |
| 파일명 | `NNNN-english-kebab-slug.md` — 4자리 순차, 번호 재사용 금지 |
| 언어 | 파일명 영문, H1·본문 한국어 |
| frontmatter | `id: adr-NNNN`, `created: YYYY-MM-DD` 필수. 새 ADR엔 `supersedes` 선택. 사후 추가 가능한 키는 `superseded_by`·`amended_by`뿐. **status류 현재시제 필드 금지** |
| 상태 | 파일에 쓰지 않는다 — `superseded_by` 부재 = 현행. 인덱스가 자동 파생해 표시 |
| 불변성 | 생성 후 본문 수정 금지 (오타·깨진 링크 예외). 번복 = 새 ADR + 옛 파일에 `superseded_by` 한 줄 |
| 섹션 | 맥락 → 결정 → 기각한 대안(사유 필수) → 결과(감수하는 것 필수) → 보류(선택, 재개 트리거 명시) |
| 인덱스 | `docs/adr/README.md`의 마커 블록 — 스크립트가 생성, 손으로 수정 금지 |
| 단위 | 하나의 ADR = 하나의 결정 (응집된 결정 묶음만 결정 표로 예외 허용) |

도구는 이 스킬 디렉터리의 `scripts/adr.sh` (bash+awk만 필요, BSD/GNU 겸용). **레포에 도구를 복사하지 않는다** — 레포는 순수 마크다운 데이터만 갖고, 도구는 스킬에 단일 소스로 산다.

```
scripts/adr.sh new <slug> [제목]   # 다음 번호로 스캐폴드 생성 + 인덱스 갱신
scripts/adr.sh index [--check]     # 인덱스 재생성 / 검증
scripts/adr.sh check               # 규약 검사 (frontmatter·섹션·참조·인덱스)
```

다른 위치를 쓰는 레포는 `ADR_DIR` 환경변수로 재정의한다.

## 라우팅

| 상황 | 플로우 |
|---|---|
| 레포에 ADR 셋업 요청, 또는 docs/adr/ 없는 레포의 첫 기록 요청 | [init](#init--레포-부트스트랩) |
| 결정 기록 요청, 또는 대화에서 결정 순간 감지 | [new](#new--결정-기록) |
| 기존 결정을 뒤집거나 일부 수정 | [supersede](#supersede--번복) |
| 다른 규약의 기존 ADR을 캐논으로 전환 | [adopt](#adopt--기존-레포-전환) |
| docs/adr/ 있는 레포에서 아키텍처성 작업 시작 | [consult](#consult--작업-전-소비) — 요청 없어도 항상 |

## consult — 작업 전 소비

docs/adr/가 있는 레포에서 아키텍처에 닿는 작업(구조 변경, 의존성 추가·교체, 인터페이스 변경)을 시작할 때:

1. `docs/adr/README.md` 목록을 읽고, 건드리는 영역의 현행 ADR 본문까지 읽는다.
2. 결정된 것을 재논의하지 않는다. ADR에 답이 있으면 따른다.
3. 작업이 현행 ADR과 충돌하면 **멈추고 사용자에게 알린다**. 번복하려면 실행 전에 supersede부터 — 코드를 먼저 바꾸고 나중에 문서화하지 않는다.
4. 커밋·PR 설명에 따른/신설한 ADR을 인용한다 (예: `ADR-0012에 따라 …`).

## new — 결정 기록

**무엇이 ADR감인가**

- 쓴다: 되돌리기 비싼 결정(스택, 아키텍처 경계, 외부 의존성 채택), 진지한 대안이 있었던 결정, 스코프를 자르는 결정(지원하지 않기로 한 것), 그릴링 세션의 합의
- 안 쓴다: 구현 디테일, 네이밍, 코드 스타일, 포매터 선택. 기준: "6개월 뒤 '왜 이렇게 했지?'가 나올 결정인가"

**감지와 동의** — 사용자가 명시적으로 요청하면 바로 진행한다. 대화 중 암묵 신호(프레임워크·DB 비교 후 결론 도달, 스키마·인증 전략 선택, 설계 논쟁의 합의)를 감지하면 "ADR로 남길까요?"라고 **제안만** 하고, 승인 없이 파일을 만들지 않는다.

**절차**

1. 기존 목록을 훑어 관련·중복 결정을 확인하고 링크할 ADR을 정한다.
2. `scripts/adr.sh new <slug> ["제목"]`로 스캐폴드 생성.
3. 본문 작성 — 템플릿의 안내 문구는 전부 실제 내용으로 대체:
   - 기각한 대안에는 반드시 기각 사유 — "장단점 나열"이 아니라 "왜 안 했나"
   - 결과에 감수하는 것(부정적 결과) 필수 — 없으면 결정이 아니라 홍보문이다
   - 2분 안에 읽히는 길이. 긴 조사·논의는 노트로 빼고 링크
   - 구체적으로: "ORM 도입"이 아니라 "Prisma를 ORM으로 채택"
4. `scripts/adr.sh check`.
5. ADR은 그 결정을 구현하는 **같은 변경(커밋/PR) 안에** 포함한다 — 사후 문서화 금지.

## supersede — 번복

1. 새 ADR을 new 절차로 작성. frontmatter에 `supersedes: adr-NNNN`, 리드에 무엇을 왜 대체하는지 명시.
2. 옛 ADR frontmatter에 `superseded_by: adr-MMMM` 한 줄 추가 — 허용된 유일한 사후 변이. 본문은 건드리지 않는다.
3. **부분 번복**(옛 결정의 일부 조항만 뒤집을 때): 옛 파일엔 `amended_by: adr-MMMM`, 새 ADR 리드에 blockquote로 범위 선언 — "adr-NNNN의 결정 중 X만 번복한다. 나머지는 유효."
4. `scripts/adr.sh check` (인덱스 검증 포함).

## init — 레포 부트스트랩

1. `docs/adr/`를 만들고 `README.md`를 [references/repo-readme.md](references/repo-readme.md) 내용으로 생성.
2. 첫 ADR로 도입 결정 자체를 기록: `scripts/adr.sh new record-decisions-as-adrs "설계 결정을 ADR로 기록한다"` — 이 레포에서 왜 지금, 무엇을 대상으로 하는지를 맥락에 쓴다.
3. 레포의 CLAUDE.md(없으면 AGENTS.md, 둘 다 없으면 CLAUDE.md 신설)에 [references/agents-snippet.md](references/agents-snippet.md) 블록 추가 — 이게 있어야 이 스킬 없이 도는 에이전트도 consult를 수행한다.
4. `scripts/adr.sh check`.

## adopt — 기존 레포 전환

기존 ADR이 있는 레포를 캐논으로 옮길 때. **기존 파일은 불변이다 — 이름도 본문도 고쳐 쓰지 않는다.**

1. 기존 규약을 파악한다: 위치, 번호 체계, status 사용 여부.
2. 위치가 다르면 파일은 그대로 두고 새 `docs/adr/README.md`에 legacy 절로 링크한다. 이동은 기존 링크를 깨므로 사용자가 명시적으로 원할 때만 (`git mv` + 옛 경로에 리다이렉트 스텁).
3. 번호: 기존이 `NNNN-`이면 이어서 쓴다. 날짜식(`YYYYMMDD-`)이면 그대로 두고 0001부터 시작 — 파일명 패턴이 달라 충돌하지 않는다.
4. 기존 파일의 status 필드는 제거하지 않는다 (불변). 신규부터 캐논 적용.
5. 전환 결정 자체를 첫 캐논 ADR로 기록하고, init 3단계(CLAUDE.md 블록)를 수행한다.

## 흔한 실수

- 인덱스를 손으로 고침 → 스크립트가 덮어쓴다. 항상 `adr.sh index`.
- 기존 ADR 본문을 "업데이트" → 금지. supersede/amend가 유일한 경로.
- 결정이 나기 전에 파일부터 생성 → 합의된 뒤에 쓴다. Proposed 상태는 캐논에 없다 — 논의 중인 것은 파일이 아니라 대화·노트다.
- 사소한 결정까지 기록 → ADR은 인지 부하를 줄일 때 성공하고, 더할 때 실패한다.
