# internalize 스킬의 과학적 근거

이 문서는 스킬의 설계가 어떤 연구에서 나왔는지 정리한다. 설계의 요소는 인출 우선, 설명 시도, 답에서 확신도 읽기, 격차만 교정, 층을 오가는 질문이다. 1절과 2절의 조사일은 2026-07-30이다.

## 1. 문제가 실제로 있다는 근거 (AI 코딩)

### Anthropic RCT — AI 보조가 코딩 스킬 형성에 미치는 영향 (2026-01)
- https://www.anthropic.com/research/AI-assistance-coding-skills
- 요약 분석: https://blog.stephenturner.us/p/ai-assistance-coding-skills-anthropic
- 주니어 개발자 52명이 새 Python 라이브러리(Trio)를 배우는 무작위 대조 실험이다. 이해도 퀴즈 점수는 AI 사용군이 50%, 직접 코딩한 군이 67%였다(17%p 차이). 디버깅 능력이 가장 크게 낮아졌다.
- 고득점자는 작업을 전부 맡기지 않았다. 설명을 요청하고, 개념을 질문하고, 일부를 직접 구현했다.
- **반영:** 퀴즈 루프는 고득점자의 이 방식을 작업이 끝난 뒤에 다시 하게 한다.

### MIT Media Lab — Your Brain on ChatGPT (Kosmyna et al. 2025)
- https://arxiv.org/abs/2506.08872
- EEG로 측정한 연구다. LLM 사용군은 뇌 연결성이 가장 약했다.
- 논문은 이 현상을 "인지 부채(cognitive debt)"로 부른다. 생성 속도가 이해 속도보다 빨라서 쌓이는 이해 부족이다.

### METR RCT — 경험 개발자의 AI 도구 사용 (Becker et al. 2025)
- 경험 많은 오픈소스 개발자는 AI 도구를 사용할 때 실제로 19% 느려졌다. 그런데 본인들은 20% 빨라졌다고 답했다.
- 개발자는 자기 속도도 실제와 다르게 판단한다.

### Xia et al. — Measuring Program Comprehension (IEEE TSE 2018)
- https://baolingfeng.github.io/papers/tsecomprehension.pdf
- 전문 개발자 78명의 근무 3,148시간을 현장에서 측정했다. 업무 시간의 약 58%가 코드를 이해하는 활동이었다.
- 코드를 이해하는 시간이 생산성을 가장 크게 좌우한다.

### Naur — Programming as Theory Building (1985)
- 해설: https://www.nutrient.io/blog/peter-naur-legacy-mental-models-age-ai-coding/
- 프로그램의 본질은 코드가 아니라 개발자가 아는 "이론"이다. 이론은 왜 이 구조인지, 코드의 무엇이 실세계의 무엇에 대응하는지에 대한 이해다.
- 이론을 모르고 고치면 코드가 땜질이 된다. 이론을 아는 팀이 흩어지면 프로그램은 죽는다.
- **반영:** "설계 이유" 질문 유형과 마무리의 "핵심 한 줄"은 이 이론을 다시 세우려고 넣었다.

## 2. 스킬 메커니즘의 인지과학 근거

### 설명 깊이의 착각 (IOED) — Rozenblit & Keil (Cognitive Science 2002)
- https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog2605_1
- 사람들은 인과 사슬이 있는 대상(장치, 시스템)을 실제보다 잘 안다고 생각한다. 직접 설명하게 하면 자기평가가 크게 낮아진다.
- **반영:** 스킬은 요약을 보여 주지 않고 설명을 시킨다. 설명이 진단 도구다.

### 인출 연습 / 테스트 효과 — Roediger & Karpicke (2006), 메타분석
- 원 연구: https://www.researchgate.net/publication/7270829_Test-Enhanced_Learning_Taking_Memory_Tests_Improves_Long-Term_Retention
- 개관: https://files.eric.ed.gov/fulltext/ED599273.pdf (Retrieval-Based Learning: A Decade of Progress)
- 기억에서 꺼내는 연습은 다시 읽기보다 오래 기억하게 한다(1주 후 61% 대 40%). 메타분석의 효과크기는 g=0.50(Rowland 2014)과 g=0.61(Adesope et al. 2017)이다.
- **반영:** 스킬의 첫째 원칙 "retrieval before re-reading"이다. 스킬은 코드를 보여 주기 전에 먼저 답하게 한다.

### 자기설명 효과 — Chi et al. (Cognitive Science 1994)
- https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1803_3
- 스스로 설명하는 사람은 새 내용을 기존 지식과 잇고, 잘못 안 것을 고친다. 프로그래밍 학습에서도 같은 효과를 확인했다.
- **반영:** 인과 설명 질문 유형("A에서 B까지의 흐름을 설명해 보라").

### 생성 효과 / 바람직한 어려움 — Bjork & Bjork
- https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf
- 답을 듣기 전에 먼저 답을 만들거나 예측하면 더 깊이 배운다. 다만 인지 부하가 이미 높은 자료에서는 역효과가 날 수 있다.
- **반영:** 예측 질문 유형과 난이도 조절 단계. 연속으로 틀리면 한 층 올라간다.

### 프로테제 효과 — Nestojko et al. (2014)
- 해설: https://thelearnerlab.com/protege-effect/
- 나중에 가르쳐야 한다고 알기만 해도 내용을 더 체계적으로 익히고 핵심 개념에 집중한다.
- **반영:** "신규 팀원에게 한 문단으로 설명한다면?" 질문 유형.

### 구글 효과 / transactive memory — Sparrow et al. (Science 2011)
- https://www.science.org/doi/abs/10.1126/science.1207745
- 나중에 다시 찾을 수 있다고 예상하면, 사람은 내용을 기억하지 않고 찾는 위치만 기억한다.
- **반영:** 이 연구는 문제가 생기는 원리를 설명한다. AI를 외부 기억으로 사용하면 내재화는 저절로 일어나지 않는다. 그래서 일부러 인출하는 세션이 필요하다.

### 확신도와 실제의 대조
- IOED 연구와 METR 실험의 결론은 같다. 자기평가는 믿을 수 없다. 평가와 실제를 나란히 대조해야 자기평가가 고쳐진다.
- **반영:** 스킬은 확신도를 답의 단정, 정밀도, 근거에서 읽는다. 답으로 판단할 수 없으면 꼬리 질문("왜요?" 또는 구체 사례) 하나로 확인한다. 확신과 정답이 어긋나면 그 사실을 말한다.

## 3. 층을 오가는 질문의 근거

조사일은 2026-11-16이다. 스킬은 불변식 하나를 목적, 코드, 상태, 실행 층으로 따라 내려갔다가 다시 올라온다. 이 설계의 근거를 정리한다.

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
  - 리뷰는 잘못 짠 코드는 찾지만, 요청이 겹칠 때 생기는 문제는 놓친다. 그래서 불변식을 기준으로 읽는다.
  - 값을 읽고 메모리에서 검사한 뒤 다시 저장하는 코드는 동시 요청에서 깨진다.
  - 트랜잭션 안에서 외부 서비스를 호출하면 두 쪽의 상태가 어긋난다.
  - 캐시는 무효화 시점과 부하 중 캐시 미스를 확인한다.
  - 호출하는 외부 서비스마다 "느리면, 죽으면, 틀리면"을 묻는다.
- **반영:** 스레드의 출발점을 불변식으로 정했다. "동시 실행", "상태 위치", "부분 실패", "부하" 질문 유형도 여기서 나왔다.

### 한계
- "시니어 개발자는 층을 오가며 리뷰한다"를 직접 측정한 연구는 찾지 못했다. 위 모델과 실무 글에서 추론한 설계다.
- 질문 유형을 점검표처럼 차례로 물으면 다시 표면만 묻는다. 그래서 스킬은 답안에 근거가 있는 층만 묻는다.
