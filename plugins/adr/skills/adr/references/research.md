# ADR 캐논의 근거

이 스킬의 모든 규칙은 아래 근거에서 나왔다 (2026-08 조사: 웹 문헌 + 실사용 레포 6곳의 규약 수렴·발산 분석). 규칙을 바꾸려면 이 문서의 근거를 먼저 반박하라.

## 캐논 ↔ 근거 매핑

| 캐논 | 근거 |
|---|---|
| Nygard 계열 경량 섹션 (맥락→결정→대안→결과) | 5개 템플릿 실증 비교에서 Nygard가 이해도·사용성 통계적 우세 (p=0.002, Cliff's Δ=0.636). MADR식 상세 구조는 논쟁적 대형 결정 외엔 마찰만 추가 |
| 기각한 대안 + 기각 사유 (중립적 장단점 나열 아님) | "옹호문서화"(단점 없는 Consequences) 실패 패턴 방지 — 트레이드오프 없는 ADR은 리뷰에서 거부하라는 권고 |
| 결과에 부정적 결과 필수 | 동일. "대가 없는 결정처럼 읽히면 안 된다" |
| 생성 후 불변, supersede-don't-edit | AWS 프로세스 표준: Accepted 이후 불변, 변경은 새 ADR로 대체 + 양방향 링크. 실사용 6개 레포 전원 명문화 |
| status 필드 금지, `superseded_by` 부재 = 현행 | "사후 수정" 실패 패턴(승인 후 몰래 편집)의 원천 차단. status는 과거시제 기록에 새긴 현재시제 주장이며, 파생 가능한 데이터를 원본에 쓰면 드리프트한다. 명시적 status는 "Accepted 후에도 status 줄은 고친다"는 예외를 만들어 불변성에 구멍을 낸다 |
| `NNNN-` 4자리 순차, 번호 재사용 금지 | MADR 파일명 규격·adr-tools 관행. 날짜 파일명 대비 인용이 짧다("ADR-0012"). 팀 병렬 브랜치의 번호 충돌 문제는 솔로 워크플로우에 해당 없음 |
| 파일명 영문 kebab, 본문 한국어 | 한글 슬러그로 BSD sed 문자클래스가 오작동한 실사용 기록. URL·크로스플랫폼 도구 호환. 목록 가독성은 인덱스의 제목 열이 담당 |
| `docs/adr/` 레포 내 저장 | ThoughtWorks Tech Radar (2016)부터의 원칙. 위키·노션 분리 보관은 실패 패턴 중 최다 — "레포로 옮기는 것이 가장 레버리지 높은 단일 개선" |
| 인덱스 자동 생성 (마커 블록) | 수동 인덱스는 "한 분기 안에 드리프트". 인덱스 부재 시 디렉터리는 파일명 벽이 된다 |
| ADR은 같은 변경(커밋/PR) 안의 산출물 | 에이전트 시대의 핵심 규칙: "ADR을 작업의 산출물로 다뤄라, 사람이 나중에 하는 별도 활동이 아니라". 사후 문서화는 기록보다 드리프트를 빨리 생산한다 |
| 작업 전 consult (목록 → 본문 → 인용) | 에이전트는 결정의 "왜"에 대한 제도적 기억이 없어 agentic drift(개별로는 합리적인 리팩터들의 누적이 아키텍처 의도를 침식)를 일으킨다. 계획 단계에서 관련 ADR을 검색·인용하면 stateless 변환기가 제약된 계획자가 된다 |
| 결정 감지는 제안만, 파일 생성은 승인 후 | 선행 스킬(ECC architecture-decision-records)의 검증된 원칙: "명시적 동의 없이 파일을 만들지 않는다" |
| 스코프 기준: 되돌리기 비싼 결정만 | "잘못된 스코프" 실패 패턴(사소한 건 기록, 정작 중요한 건 누락). "ADR은 인지 부하를 줄일 때 성공하고, 더할 때 실패한다" |
| 보류 항목 + 재개 트리거 절 | 실사용 조사에서 반복 검증된 독자 패턴 (웹 표준에는 없음). 미결정을 명시하면 재논의 낭비와 암묵적 확정을 모두 막는다 |
| 도구는 스킬에 단일 소스, 레포는 데이터만 | 도구 생태계 부패: adr-tools 장기 미유지보수, log4brains low-maintenance 모드. 레포마다 스크립트를 복사하면 N벌이 드리프트한다 — 크로스레포 불일치는 정확히 이렇게 생겼다 |

## 실패 패턴 7 (설계가 방어하는 대상)

1. 모멘텀 소실 — 몇 개 쓰고 침묵 → 결정 감지를 에이전트 워크플로우에 내장
2. 잘못된 스코프 → "언제 쓰나" 기준을 README와 스킬에 명문화
3. 옹호문서화 → 기각 사유·부정적 결과 필수, check가 절 존재를 검사
4. 사후 수정 → status 제거 + 불변 규칙, 허용된 사후 변이는 `superseded_by`/`amended_by` 한 줄뿐
5. 코드와 분리된 저장 → `docs/adr/` 고정
6. 결정 드리프트 (코드는 바뀌는데 ADR은 그대로) → consult의 충돌 시 정지 규칙 + 같은 변경 안 ADR
7. 단일 소유자 의존 → 규약·도구·근거를 스킬로 이식 가능하게 패키징

## 출처

- Nygard, [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (2011) — 원형
- [One Size Fits All? An Empirical Comparison of ADR Templates](https://arxiv.org/html/2604.27333v1) — 템플릿 실증 비교
- [AWS Prescriptive Guidance — ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html) — 라이프사이클·불변성·리뷰 프로세스
- [MADR](https://adr.github.io/madr/) — frontmatter·파일명 규격
- [ADR Templates and Operational Patterns](https://hidekazu-konishi.com/entry/architecture_decision_records_templates_and_operations.html) — 실패 패턴 7, 인덱스 자동화, 운영 패턴
- [The ADR Comeback: Anchoring Agentic Engineering Teams](https://rickpollick.com/blog/adr-comeback-anchoring-agentic-engineering-teams) — agentic drift, ADR-as-deliverable
- [Why ADRs Get Written and Never Read](https://www.javacodegeeks.com/2026/05/the-reason-most-architecture-decision-records-get-written-and-never-read-is-architectural-not-cultural.html) — 발견가능성 실패 분석
- [calcipy ADR tooling comparison](https://calcipy.kyleking.me/docs/adr-research/comparison-and-recommendations/) — 도구 생태계 현황
- [ECC architecture-decision-records skill](https://github.com/affaan-m/ECC/blob/main/skills/architecture-decision-records/SKILL.md) — 결정 감지·동의 원칙의 선행 사례
