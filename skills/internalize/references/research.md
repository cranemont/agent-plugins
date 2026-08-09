# internalize 스킬의 과학적 근거

이 스킬의 설계(인출 우선, 설명 시도, 확신도 태깅, 격차만 교정)가 어떤 연구에 기반하는지 정리한다. 조사일: 2026-07-30.

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
- **반영:** 답변마다 확신도(certain / roughly / guessing) 태깅 후, 확신-정답 불일치를 명시적으로 지적.
