# ADR 캐논의 근거

이 스킬의 모든 규칙은 아래 근거에서 나왔다. 조사 시기는 2026-08이다. 웹 문헌을 읽었고, 실제로 사용 중인 레포 6곳의 규약을 비교했다. 규칙을 바꾸려면 이 문서의 근거를 먼저 반박한다.

## 캐논과 근거

| 캐논 | 근거 |
|---|---|
| Nygard 계열의 가벼운 섹션(맥락 → 결정 → 대안 → 결과) | 템플릿 5개를 실험으로 비교한 연구에서 Nygard 템플릿의 이해도와 사용성이 통계적으로 높았다(p=0.002, Cliff's Δ=0.636). MADR식 상세 구조는 논쟁이 큰 대형 결정에만 도움이 된다. 그 밖의 결정에서는 작성 부담만 늘린다 |
| 기각한 대안과 기각 사유(중립적인 장단점 목록은 사유가 아니다) | 단점 없는 결과만 기록한 ADR은 홍보문이 된다. 문헌은 트레이드오프가 없는 ADR을 리뷰에서 거부하라고 권한다 |
| 결과에 부정적 결과 필수 | 위와 같다. ADR이 대가 없는 결정처럼 읽히면 안 된다 |
| 생성 후 불변, 수정 대신 supersede | AWS 프로세스 표준은 Accepted 이후의 ADR을 수정하지 않는다. 변경은 새 ADR로 대체하고, 두 ADR을 서로 링크한다. 조사한 레포 6곳이 모두 이 규칙을 명시했다 |
| status 필드 금지, `superseded_by`가 없으면 현행 | 승인 후에 ADR을 몰래 수정하는 실패를 처음부터 막는다. ADR은 과거의 결정을 기록한 글인데, status는 현재 상태를 주장한다. 계산할 수 있는 값을 원본에 기록하면 그 값은 실제와 달라진다. status를 허용하면 "Accepted 후에도 status 줄은 고친다"는 예외가 생기고, 불변 규칙이 깨진다 |
| `NNNN-` 4자리 순차 번호, 번호 재사용 금지 | MADR 파일명 규격과 adr-tools의 관행이다. 날짜 파일명보다 인용이 짧다("ADR-0012"). 번호 충돌은 여러 사람이 브랜치를 나눠 작업할 때 생긴다. 혼자 작업하는 흐름에는 이 문제가 없다 |
| 파일명은 영문 kebab, 본문은 한국어 | 한글 슬러그 때문에 BSD sed의 문자 클래스가 잘못 동작한 기록이 있다. 영문 파일명은 URL과 여러 플랫폼의 도구에서 문제가 없다. 목록에서는 인덱스의 제목 열이 한국어 제목을 보여 준다 |
| `docs/adr/`에 저장(레포 안) | ThoughtWorks Tech Radar(2016)부터 이어진 원칙이다. 가장 흔한 실패는 위키나 노션에 따로 보관하는 것이다. 문헌은 레포로 옮기는 것을 효과가 가장 큰 개선으로 꼽는다 |
| 인덱스 자동 생성(마커 블록) | 손으로 고치는 인덱스는 한 분기 안에 실제와 달라진다. 인덱스가 없으면 독자는 파일명만 읽고 결정을 찾아야 한다 |
| ADR은 같은 변경(커밋/PR)의 산출물 | 에이전트와 작업할 때의 핵심 규칙이다. 문헌은 ADR을 작업의 산출물로 다루라고 한다. 사람이 나중에 따로 문서화하면 기록이 코드와 달라진다 |
| 작업 전 consult(목록 → 본문 → 인용) | 에이전트는 결정의 이유를 기억하지 못한다. 그래서 하나씩은 합리적인 리팩터가 쌓여 아키텍처의 의도를 무너뜨린다(agentic drift). 에이전트가 계획 단계에서 관련 ADR을 검색하고 인용하면, 그 제약 안에서 계획한다 |
| 결정을 감지하면 제안만, 파일 생성은 승인 후 | 선행 스킬(ECC architecture-decision-records)이 검증한 원칙이다. 명시적 동의 없이 파일을 만들지 않는다 |
| 기록 범위는 되돌리기 비싼 결정만 | 범위를 잘못 정하면 사소한 결정은 기록하고 중요한 결정은 빠뜨린다. ADR은 인지 부하를 줄이면 성공하고 늘리면 실패한다 |
| 보류 항목과 재개 트리거 절 | 조사한 레포에서 여러 번 확인한 방식이다. 웹 표준에는 없다. 결정하지 않은 것을 명시하면 같은 논의를 반복하지 않는다. 결정하지 않은 것을 결정한 것으로 오해하는 일도 막는다 |
| 도구의 원본은 스킬 하나, 레포에는 데이터만 | 기존 도구는 유지보수가 멈췄다. adr-tools는 오랫동안 갱신이 없고, log4brains는 low-maintenance 모드다. 레포마다 스크립트를 복사하면 사본들이 서로 달라진다. 조사한 레포 사이의 불일치도 이렇게 생겼다 |

## 실패 패턴 7개와 대응

| 번호 | 실패 | 대응 |
|---|---|---|
| 1 | 기록 중단. ADR 몇 개를 작성한 뒤 더 작성하지 않는다 | 결정 감지를 에이전트 워크플로우에 넣었다 |
| 2 | 잘못된 기록 범위 | 기록 기준을 README와 스킬에 명시했다 |
| 3 | 홍보문 | 기각 사유와 부정적 결과가 필수다. check가 해당 절이 있는지 검사한다 |
| 4 | 승인 후 수정 | status를 없애고 불변 규칙을 정했다. 생성 후에는 `superseded_by`·`amended_by` 한 줄만 추가할 수 있다 |
| 5 | 코드와 떨어진 저장 위치 | `docs/adr/`로 고정했다 |
| 6 | 결정과 코드의 불일치. 코드는 바뀌고 ADR은 그대로다 | consult는 충돌하면 멈춘다. ADR은 같은 변경에 넣는다 |
| 7 | 한 사람에게 의존 | 규약·도구·근거를 스킬에 넣어서 다른 레포에서도 사용할 수 있다 |

## 출처

- Nygard, [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (2011): 원형
- [One Size Fits All? An Empirical Comparison of ADR Templates](https://arxiv.org/html/2604.27333v1): 템플릿 실험 비교
- [AWS Prescriptive Guidance — ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html): 라이프사이클, 불변성, 리뷰 프로세스
- [MADR](https://adr.github.io/madr/): frontmatter와 파일명 규격
- [ADR Templates and Operational Patterns](https://hidekazu-konishi.com/entry/architecture_decision_records_templates_and_operations.html): 실패 패턴 7개, 인덱스 자동화, 운영 방식
- [The ADR Comeback: Anchoring Agentic Engineering Teams](https://rickpollick.com/blog/adr-comeback-anchoring-agentic-engineering-teams): agentic drift, 산출물인 ADR
- [Why ADRs Get Written and Never Read](https://www.javacodegeeks.com/2026/05/the-reason-most-architecture-decision-records-get-written-and-never-read-is-architectural-not-cultural.html): ADR을 찾지 못하는 실패의 분석
- [calcipy ADR tooling comparison](https://calcipy.kyleking.me/docs/adr-research/comparison-and-recommendations/): 도구 현황
- [ECC architecture-decision-records skill](https://github.com/affaan-m/ECC/blob/main/skills/architecture-decision-records/SKILL.md): 결정 감지와 동의 원칙의 선행 사례
