---
name: adr
description: 되돌리기 비싼 결정을 불변 파일로 기록하고 자동 인덱스·supersede·작업 전 참조를 캐논 하나로 정하는 Architecture Decision Record(ADR) 워크플로우(docs/adr/NNNN-slug.md, status 없이 superseded_by로 상태 파생). Use when the user asks to record, initialize, or supersede an ADR / set up decision tracking in a repo, when a hard-to-reverse decision is reached in conversation (stack, architecture boundary, scope cuts, grilling 세션 합의), or before touching architecture in any repo that has docs/adr/.
---

# ADR — 설계 결정 기록·추적

이 스킬은 되돌리기 비싼 결정을 레포 안의 불변 마크다운 파일로 기록한다. 에이전트는 작업 전에 그 기록을 읽는다. 어떤 레포에서든 아래 캐논 하나만 사용한다. 각 규칙의 근거는 [references/research.md](references/research.md)에 있다. 규칙을 바꾸려면 그 근거를 먼저 반박한다.

## 캐논

| 항목 | 규칙 |
|---|---|
| 위치 | `docs/adr/` (레포 루트 기준) |
| 파일명 | `NNNN-english-kebab-slug.md`. 4자리 순차 번호이고, 번호는 다시 사용하지 않는다 |
| 언어 | 파일명은 영문, H1과 본문은 한국어 |
| frontmatter | `id: adr-NNNN`과 `created: YYYY-MM-DD`는 필수다. 새 ADR에는 `supersedes`를 넣을 수 있다. 생성 후에 추가할 수 있는 키는 `superseded_by`·`amended_by`뿐이다. `status`처럼 현재 상태를 기록하는 필드는 금지한다 |
| 상태 | 파일에 기록하지 않는다. `superseded_by`가 없으면 현행이다. 인덱스가 상태를 계산해서 표시한다 |
| 불변성 | 생성 후에는 본문을 수정하지 않는다(오타와 깨진 링크는 예외). 번복하려면 새 ADR을 만들고 옛 파일에 `superseded_by` 한 줄을 추가한다 |
| 섹션 | 맥락 → 결정 → 기각한 대안(사유 필수) → 결과(감수하는 것 필수) → 보류(선택, 재개 트리거 명시) |
| 인덱스 | `docs/adr/README.md`의 마커 블록. 스크립트가 생성하고, 손으로 수정하지 않는다 |
| 단위 | ADR 하나에 결정 하나. 서로 묶인 결정들만 결정 표 하나로 기록할 수 있다 |

도구는 이 스킬 디렉터리의 `scripts/adr.sh`이다(bash와 awk만 필요, BSD/GNU 겸용). 레포에 도구를 복사하지 않는다. 레포에는 마크다운 데이터만 있고, 도구의 원본은 이 스킬에만 있다.

```
scripts/adr.sh new <slug> [제목]   # 다음 번호로 스캐폴드 생성 + 인덱스 갱신
scripts/adr.sh index [--check]     # 인덱스 재생성 / 검증
scripts/adr.sh check               # 규약 검사 (frontmatter·섹션·참조·인덱스)
```

다른 위치를 사용하는 레포는 `ADR_DIR` 환경변수로 위치를 바꾼다.

## 라우팅

| 상황 | 플로우 |
|---|---|
| 레포에 ADR 설정 요청, 또는 docs/adr/가 없는 레포의 첫 기록 요청 | [init](#init--레포-부트스트랩) |
| 결정 기록 요청, 또는 대화에서 결정이 난 순간을 감지 | [new](#new--결정-기록) |
| 기존 결정을 번복하거나 일부 수정 | [supersede](#supersede--번복) |
| 다른 규약의 기존 ADR을 캐논으로 전환 | [adopt](#adopt--기존-레포-전환) |
| docs/adr/가 있는 레포에서 아키텍처 작업 시작 | [consult](#consult--작업-전-참조). 요청이 없어도 항상 한다 |

## consult — 작업 전 참조

docs/adr/가 있는 레포에서 아키텍처를 바꾸는 작업을 시작할 때 따른다. 구조 변경, 의존성 추가·교체, 인터페이스 변경이 그런 작업이다.

1. `docs/adr/README.md`의 목록을 읽는다. 작업할 영역의 현행 ADR은 본문까지 읽는다.
2. 이미 결정한 것을 다시 논의하지 않는다. ADR에 답이 있으면 따른다.
3. 작업이 현행 ADR과 충돌하면 멈추고 사용자에게 알린다. 번복하려면 실행 전에 supersede부터 한다. 코드를 먼저 바꾸고 나중에 문서화하지 않는다.
4. 커밋·PR 설명에 따른 ADR과 새로 만든 ADR을 인용한다(예: `ADR-0012에 따라 …`).

## new — 결정 기록

**기록 대상**

- 기록한다: 되돌리기 비싼 결정(스택, 아키텍처 경계, 외부 의존성 채택), 진지한 대안이 있었던 결정, 범위를 줄이는 결정(지원하지 않기로 한 것), 그릴링 세션의 합의
- 기록하지 않는다: 구현 세부, 이름 짓기, 코드 스타일, 포매터 선택

기준은 "6개월 뒤에 '왜 이렇게 했지?'라고 물을 결정인가"이다.

**감지와 동의**

사용자가 명시적으로 요청하면 바로 진행한다. 대화에서 결정이 난 신호를 감지하면 "ADR로 기록할까요?"라고 제안만 한다. 승인 없이 파일을 만들지 않는다. 신호의 예는 다음과 같다.

- 프레임워크나 DB를 비교하고 결론을 냈다.
- 스키마나 인증 전략을 선택했다.
- 설계 논쟁에서 합의했다.

**절차**

1. 기존 목록에서 관련 결정과 중복 결정을 확인한다. 링크할 ADR을 정한다.
2. 근거 자료를 읽는다. 맥락과 기각 사유는 자료에서 나온다.
   - 요청에 파일·URL·텍스트가 있으면 전부 읽는다. 없으면 대화에서 근거로 사용한 파일과 링크를 고른다.
   - 맥락이나 기각 사유의 근거가 모자라면 작성하기 전에 사용자에게 자료를 요청한다. 지어내지 않는다.
   - 읽은 자료는 맥락 절에 링크한다.
3. `scripts/adr.sh new <slug> ["제목"]`으로 스캐폴드를 생성한다.
4. 본문을 작성한다. 템플릿의 안내 문구는 전부 실제 내용으로 바꾼다.
   - 기각한 대안마다 기각 사유를 작성한다. 장단점 목록은 사유가 아니다. 선택하지 않은 이유를 작성한다.
   - 결과에는 감수하는 것(부정적 결과)을 반드시 작성한다. 감수하는 것이 없는 글은 결정이 아니고 홍보문이다.
   - 2분 안에 읽을 수 있는 길이로 작성한다. 긴 조사와 논의는 노트로 옮기고 링크한다.
   - 구체적으로 작성한다. "ORM 도입" 대신 "Prisma를 ORM으로 채택"으로 작성한다.
5. `scripts/adr.sh check`를 실행한다.
6. ADR은 그 결정을 구현하는 변경(커밋/PR)에 함께 넣는다. 구현한 뒤에 따로 문서화하지 않는다.

## supersede — 번복

1. 새 ADR을 new 절차로 작성한다. frontmatter에 `supersedes: adr-NNNN`을 넣는다. 리드에는 무엇을 왜 대체하는지 밝힌다.
2. 옛 ADR의 frontmatter에 `superseded_by: adr-MMMM` 한 줄을 추가한다. 본문은 수정하지 않는다. 생성 후에는 이런 한 줄 추가만 허용한다.
3. 부분 번복은 옛 결정의 일부 조항만 번복하는 경우다.
   - 옛 파일에는 `amended_by: adr-MMMM`을 추가한다. 이 값은 누적된다. 덮어쓰지 말고 공백으로 이어 붙인다(`amended_by: adr-MMMM adr-NNNN`, 번호순).
   - 새 ADR의 리드에 blockquote로 범위를 밝힌다. 예: "adr-NNNN의 결정 중 X만 번복한다. 나머지는 유효하다."
4. `scripts/adr.sh check`를 실행한다(인덱스 검증 포함).

옛 ADR이 [레거시](#adopt--기존-레포-전환)이면 2·3단계를 건너뛴다. 레거시 파일은 frontmatter도 수정하지 않는다.

## init — 레포 부트스트랩

1. `docs/adr/`를 만든다. `README.md`는 [references/repo-readme.md](references/repo-readme.md) 내용으로 생성한다.
2. 첫 ADR에는 ADR 도입 결정을 기록한다. 명령은 `scripts/adr.sh new record-decisions-as-adrs "설계 결정을 ADR로 기록한다"`이다. 맥락에는 이 레포가 왜 지금 도입하는지와 기록 대상을 작성한다.
3. 레포의 CLAUDE.md에 [references/agents-snippet.md](references/agents-snippet.md) 블록을 추가한다. CLAUDE.md가 없으면 AGENTS.md에 추가한다. 둘 다 없으면 CLAUDE.md를 새로 만든다. 이 블록이 있으면 이 스킬이 없는 에이전트도 consult를 따른다.
4. `scripts/adr.sh check`를 실행한다.

## adopt — 기존 레포 전환

기존 ADR이 있는 레포를 캐논으로 전환할 때 따른다. 기존 파일은 불변이다. 이름과 본문을 수정하지 않는다.

1. 기존 규약을 파악한다. 위치, 번호 체계, status 사용 여부를 확인한다.
2. 위치가 다르면 파일은 그대로 둔다. 새 `docs/adr/README.md`의 legacy 절에서 그 파일들을 링크한다. 파일을 옮기면 기존 링크가 깨진다. 그래서 사용자가 명시적으로 원할 때만 옮긴다(`git mv`를 하고 옛 경로에 리다이렉트 스텁을 만든다).
3. 기존 파일명이 `NNNN-`이면 그 번호에 이어서 번호를 붙인다. 날짜식(`YYYYMMDD-`)이면 그대로 두고 0001부터 시작한다. 파일명 패턴이 달라서 충돌하지 않는다.
4. 기존 파일의 status 필드는 제거하지 않는다(불변). 새 파일부터 캐논을 적용한다.
5. 전환 결정을 첫 캐논 ADR로 기록한다. 그다음 init 3단계(CLAUDE.md 블록)를 따른다.
6. 기존 파일이 `docs/adr/`에 있으면 `adr.sh`가 레거시 범위를 계산한다. `adr.sh`는 frontmatter `id`가 `adr-<번호>`와 맞는 첫 파일을 캐논의 시작으로 판단한다. 그보다 앞 번호는 레거시다. `check`는 레거시를 검사하지 않고, 인덱스는 상태 칸에 `레거시`로 표시한다. 그래서 전환 ADR은 반드시 `adr.sh new`로 만든다.
7. 레거시를 번복할 때는 새 ADR에 `supersedes`만 넣는다. 인덱스는 새 ADR의 `supersedes`를 읽고 레거시 행에 "대체됨"을 표시한다. 일부만 번복하면 새 ADR 리드의 blockquote가 유일한 기록이다.

## 흔한 실수

| 실수 | 올바른 방법 |
|---|---|
| 인덱스를 손으로 고친다 | 스크립트가 덮어쓴다. 항상 `adr.sh index`를 실행한다 |
| 기존 ADR 본문을 고쳐서 최신으로 맞춘다 | 금지한다. supersede와 amend만 사용한다 |
| 결정이 나기 전에 파일부터 만든다 | 합의한 뒤에 작성한다. 캐논에는 Proposed 상태가 없다. 논의 중인 내용은 대화나 노트에 기록한다 |
| 사소한 결정까지 기록한다 | ADR은 인지 부하를 줄이면 성공하고 늘리면 실패한다 |
