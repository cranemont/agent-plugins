# internalize 스킬의 과학적 근거

이 스킬의 설계(인출 우선, 설명 시도, 답에서 확신도 읽기, 격차만 교정)가 어떤 연구에 기반하는지 정리한다. 조사일: 2026-07-30.

## 1. 문제가 실재한다는 실증 근거 (AI 코딩 특화)

### Anthropic RCT — AI 보조가 코딩 스킬 형성에 미치는 영향 (2026-01)
- https://www.anthropic.com/research/AI-assistance-coding-skills
- 요약 분석: https://blog.stephenturner.us/p/ai-assistance-coding-skills-anthropic
- 주니어 개발자 52명이 새 Python 라이브러리(Trio)를 학습하는 무작위 대조 실험. AI 사용군 이해도 퀴즈 50% vs 수동 코딩군 67% (17%p 격차). 디버깅 능력 하락이 가장 심함.
- **스킬에 반영된 부분:** 고득점자는 전부 위임하지 않고 "생성+이해 병행"(설명 요청, 개념 질문, 일부 직접 구현) 패턴을 보임. 이 스킬의 퀴즈 루프는 그 패턴을 사후에 강제로 재현하는 장치다.

### MIT Media Lab — Your Brain on ChatGPT (Kosmyna et al. 2025)
- https://arxiv.org/abs/2506.08872
- EEG 기반. LLM 사용군은 뇌 연결성이 가장 약했고 "인지 부채(cognitive debt)" — 생성 속도가 이해 속도를 앞지르며 누적되는 이해 적자 — 개념을 제시.

### METR RCT — 경험 개발자의 AI 도구 사용 (Becker et al. 2025)
- 경험 많은 OSS 개발자가 AI 도구 사용 시 실제로는 19% 느려졌으나 본인들은 20% 빨라졌다고 인식. 자기 인식과 실제의 격차가 속도 판단에서도 나타난다는 방증.

### Xia et al. — Measuring Program Comprehension (IEEE TSE 2018)
- https://baolingfeng.github.io/papers/tsecomprehension.pdf
- 전문 개발자 78명, 3,148 근무시간 필드 데이터. 업무 시간의 약 58%가 코드 이해 활동. 멘탈모델이 생산성의 최대 병목 자산이라는 근거.

### Naur — Programming as Theory Building (1985)
- 재조명 해설: https://www.nutrient.io/blog/peter-naur-legacy-mental-models-age-ai-coding/
- 프로그램의 본질은 코드가 아니라 개발자 머릿속의 "이론"(왜 이 구조인가, 무엇이 실세계 문제와 대응하는가). 이론 없이 수정하면 hacky해지고, 이론을 가진 팀이 해체되면 프로그램은 죽는다.
- **스킬에 반영된 부분:** 질문 유형 중 "설계 이유(design rationale)"와 마무리의 "핵심 한 줄"이 이 이론 복원을 겨냥한다.

## 2. 스킬 메커니즘의 인지과학 근거

### 설명 깊이의 착각 (IOED) — Rozenblit & Keil (Cognitive Science 2002)
- https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog2605_1
- 사람들은 인과 사슬이 있는 대상(장치, 시스템)에 대해 이해도를 과대평가하며, 직접 설명을 써보게 하면 자기평가가 크게 낮아진다.
- **반영:** "설명해보기"를 진단 도구로 사용. 요약을 보여주는 대신 설명을 시킨다.

### 인출 연습 / 테스트 효과 — Roediger & Karpicke (2006), 메타분석
- 원 연구: https://www.researchgate.net/publication/7270829_Test-Enhanced_Learning_Taking_Memory_Tests_Improves_Long-Term_Retention
- 개관: https://files.eric.ed.gov/fulltext/ED599273.pdf (Retrieval-Based Learning: A Decade of Progress)
- 다시 읽기보다 기억에서 꺼내기가 장기 보존에 압도적으로 유리 (1주 후 61% vs 40%). 메타분석 효과크기 g=0.50 (Rowland 2014), g=0.61 (Adesope et al. 2017).
- **반영:** 스킬의 제1원칙 "retrieval before re-reading". 코드를 보여주기 전에 먼저 답하게 한다.

### 자기설명 효과 — Chi et al. (Cognitive Science 1994)
- https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1803_3
- 스스로 설명을 생성하면 기존 지식과의 연결이 만들어지고 잘못된 지식이 교정된다. 프로그래밍 도메인에서도 검증됨.
- **반영:** 인과 설명("A에서 B까지 흐름을 설명해보라") 질문 유형.

### 생성 효과 / 바람직한 어려움 — Bjork & Bjork
- https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf
- 답을 받기 전에 먼저 생성/예측하면 학습이 깊어진다. 단, 인지부하가 이미 높은 자료에서는 역효과 가능(undesirable difficulty).
- **반영:** 예측 질문 유형 + 난이도 캘리브레이션 단계(연속 오답 시 구조로 줌아웃).

### 프로테제 효과 — Nestojko et al. (2014)
- 해설: https://thelearnerlab.com/protege-effect/
- 가르칠 것을 기대하기만 해도 더 위계적·구조적으로 학습하고 핵심 개념에 집중한다.
- **반영:** "신규 팀원에게 한 문단으로 설명한다면?" 질문 유형.

### 구글 효과 / transactive memory — Sparrow et al. (Science 2011)
- https://www.science.org/doi/abs/10.1126/science.1207745
- 나중에 다시 접근할 수 있다고 기대하면 내용 대신 접근 위치만 기억한다.
- **반영:** 문제 메커니즘의 설명. AI를 외부 기억으로 쓰는 한 내재화는 자동으로 일어나지 않으므로, 의도적 인출 세션이 필요하다.

### 확신도 캘리브레이션
- IOED 연구 및 METR 인식-실제 격차가 공통으로 가리키는 지점: 자기평가는 신뢰할 수 없고, 평가와 실제를 명시적으로 대조시켜야 교정된다.
- **반영:** 확신도는 답의 단정·정밀도·근거로 읽고, 답으로 판단이 안 서면 꼬리 질문("왜요?" 또는 구체 사례) 하나로 확인한다. 확신-정답 불일치는 명시적으로 지적한다.

## 3. 층을 오가는 질문의 근거

조사일: 2026-11-16. 스킬은 불변식 하나를 목적, 코드, 상태, 실행 층으로 따라 내려갔다가 다시 올라온다. 이 설계의 근거를 정리한다.

### 프로그램 이해 모델 — Pennington (1987), von Mayrhauser & Vans (1995)
- https://www.cs.kent.edu/~jmaletic/cs69995-PC/papers/von_mayrhauser97.pdf
- 개관: https://arxiv.org/pdf/2310.11301
- Pennington은 이해를 두 모델로 나눈다. 프로그램 모델은 제어 흐름이고, 상황 모델은 데이터 흐름과 목적이다.
- von Mayrhauser와 Vans의 통합 모델은 도메인 층을 더한다. 숙련자는 한 방향으로 읽지 않고, 단서가 나올 때마다 층을 바꾼다.
- **반영:** 네 층과 스레드. 질문 하나는 한 층만 묻고, 다음 질문은 이웃한 층으로 옮긴다.

### 새는 추상화의 법칙 — Spolsky (2002)
- https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/
- 사소하지 않은 추상화는 모두 샌다. 추상화가 새면 아래 층을 아는 사람만 원인을 설명한다.
- **반영:** "층 연결" 질문 유형. 코드 한 줄이 어떤 쿼리와 락이 되는지 묻는다.

### Google eng-practices — What to look for in a code review
- https://google.github.io/eng-practices/review/reviewer/looking-for.html
- 리뷰에서 가장 중요한 것은 전체 설계다. 리뷰어는 엣지 케이스와 동시성 문제도 함께 찾는다.

### 실무 리뷰 글 (블로그, 근거 수준 낮음)
- https://www.devx.com/technology/why-race-conditions-pass-reviews-but-fail-at-scale/
- https://blog.devgenius.io/i-reviewed-340-spring-boot-prs-these-8-patterns-always-break-in-production-73fefc2c4a03
- https://ai.plainenglish.io/your-ai-generated-code-works-until-production-17-failure-modes-senior-engineers-need-to-catch-2a84a8dfef01
- 개인 경험을 정리한 글이고 수치는 검증되지 않았다. 다만 주장은 서로 일치한다.
  - 리뷰는 나쁜 코드를 잘 찾고 나쁜 타이밍은 놓친다. 그래서 불변식을 기준으로 읽는다.
  - 값을 읽고 메모리에서 검사한 뒤 다시 저장하는 코드는 동시 요청에서 깨진다.
  - 트랜잭션 안에서 외부 서비스를 호출하면 두 쪽의 상태가 어긋난다.
  - 캐시는 무효화 시점과 부하 중 캐시 미스를 확인한다.
  - 의존 대상마다 "느리면, 죽으면, 틀리면"을 묻는다.
- **반영:** 스레드의 출발점을 불변식으로 정했다. "동시 실행", "상태 위치", "부분 실패", "부하" 질문 유형도 여기서 나왔다.

### 한계
- "시니어 개발자는 층을 오가며 리뷰한다"를 직접 측정한 연구는 찾지 못했다. 위 모델과 실무 글에서 추론한 설계다.
- 질문 유형을 점검표처럼 돌리면 다시 표면만 묻는다. 그래서 스킬은 답안에 근거가 있는 층만 묻는다.
