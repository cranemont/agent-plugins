# prose-check의 근거

이 스킬의 규칙이 어디서 왔는지 정리한다. 조사일은 2026-10-06~07이다. 모든 URL은 조사 당일 접속을 확인했다. 확인하지 못한 항목은 (미확인)으로 표시한다.

## 1. 규칙별 근거

| 규칙 | 근거 |
|---|---|
| STE에서 옮긴 규칙 (`rules.md` 2절) | ASD-STE100 Issue 9 공식 PDF. 효과 연구와 반론은 4·5절 |
| 문장 길이 12·15어절 | STE 5.1·6.3과, 공식 예문 43개로 측정한 어절 비율 0.62 (`calibration.md`) |
| K1 네 질문 | STE 1.8·1.10·1.11·3.7, 미국 연방 쉬운 글 지침 "Avoid jargon" |
| K2 영어 직역 동사, K6 직역투 문형 | 김순영(2012). K6은 국립국어원 공공언어 자료(2011·2013·2014)와 ko-po-check도 근거다. 9절 |
| STE 3.4의 `~게 되다` | `rules.md` 3.4 예문, 국립국어원 「보도 자료 쓰기 길잡이」(2011). 9절 |
| K3 지어낸 비유 | STE 1.11 |
| K4 요점 먼저 | 미국 연방 쉬운 글 지침 "Have a topic sentence", "Place the main idea before exceptions and conditions" |
| K5 그림 글자 | STE 1.11·3.7 |
| K7 일괄 치환 금지 | STE 9.1 |
| K8 개수 문장 | STE 4.3 |
| K9 높임 등급 | 최주희(2013), 일본 공용문 지침(2022), LoCar(2026), 기업 문서 지침. 8절 |
| K10 구어 형태 | 이해영(2006), Kim·Biber(1994), Microsoft 한국어 현지화 지침. 8절 |
| K11 담화 틀 | 위키백과 "Signs of AI writing", im-not-ai 말뭉치 비교, 토스 테크니컬 라이팅. 8절 |
| K12 형식 | 위키백과 "Signs of AI writing". 8절 |
| 쉬운 글말이라는 목표 | 표준국어대사전, 토스 라이팅 원칙, 강주헌(2012), Reinhart 외(2025). 8절 |

한국어 고유 규칙은 국어 연구와 쉬운 글 지침에 기댄다. 그러나 이 스킬의 형태로 효과를 실험한 적은 없다. 검사 스크립트가 전문가의 교정을 얼마나 찾는지는 9절에서 측정했다.

## 2. 한국어 번역투와 쉬운 글 지침

### 영한 번역투

- 김순영(2012), 「영한 번역에 나타난 번역투 문장」, 『새국어생활』 제22권 제1호, 국립국어원, 67~79쪽 — https://www.korean.go.kr/nkview/nklife/2012_1/22_0105.pdf
  - 번역투의 정의(김정우 2007 인용): "어떤 글에 원본이 아닌 번역이라는 흔적이 일정하게 반복적으로 출현하는 텍스트상의 특성"
  - 기본 대응어 직역: `She has a sweet voice` → 직역 "그녀는 아름다운 목소리를 가지고 있다", 대안 "그녀는 목소리가 아름답다". "'have'의 여러 의미 중에서 가장 기본적인 '가지다'라는 표현만을 대응시키다 보니 부자연스러운 번역투가 발생한 경우이다." → K2, K6
  - 수동태: "수동태 구문의 형태가 그대로 전이된 직역의 경우 우리말로서는 매우 어색한 번역투 문장이 되고 만다. … 능동형으로 바꾸어 주면 훨씬 자연스러운 우리말 표현이 된다." → STE 3.6의 한국어 적용
  - 전치사구: "'~에 관하여', '~로부터', '~에 의해' 등과 같은 표현들이 이제는 익숙하게 느껴질 만큼 영어의 전치사구는 우리말 문장에 많은 영향을 끼쳤다." 예: "이번 기회를 통해"(through) → "이번 기회에", "폭격에 의해"(by) → "폭격으로" → K6
  - 이 글이 기대는 연구: 김정우(2007) 「번역투의 성격 규명을 위한 다차원적 접근」, 《번역학연구》 8(1). 이근희(2005) 「영-한 번역에서의 번역투 연구」, 세종대 박사학위논문. 이희재(2009) 『번역의 탄생』, 교양인.
- 김한식(2012), 「일한 번역에 나타난 번역투 문장」, 같은 호 81~98쪽 — https://www.korean.go.kr/nkview/nklife/2012_1/22_0106.pdf — 번역투의 여러 정의를 비교한다.

### 미국 연방 쉬운 글 지침 (Federal Plain Language Guidelines)

plainlanguage.gov는 지금 https://digital.gov/guides/plain-language 로 옮겨졌다. 지침 원문은 GSA 저장소에 보존돼 있다. 아래 인용은 각 파일 첫 부분이다.

| 지침 | 인용 | 대응 규칙 |
|---|---|---|
| [Have a topic sentence](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/organize/have-a-topic-sentence.md) | "Move it up front and let users know where you're going." | K4 |
| [Place the main idea before exceptions and conditions](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/organize/place-the-main-idea-before-exceptions-and-conditions.md) | "In general, the main point of the sentence should be as close to the beginning as possible." | K4, STE 5.4 |
| [Avoid jargon](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/words/avoid-jargon.md) | "writers often fail to realize that terms they know well may be difficult or meaningless to their audience." | K1, STE 1.10 |
| [Use the same terms consistently](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/words/use-the-same-terms-consistently.md) | "You will confuse your audience if you use different terms for the same concept or object." | STE 1.11 |
| [Avoid hidden verbs](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/words/avoid-hidden-verbs.md) | "A hidden verb (or nominalization) is a verb converted into a noun." | STE 3.7 |
| [Avoid noun strings](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/words/avoid-noun-strings.md) | "Once you get past three, the string becomes unbearable." | STE 2.1 |
| [Use active voice](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/conversational/use-active-voice.md) | "Active voice makes it clear who is supposed to do what." | STE 3.6 |
| [Write short sentences](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/concise/write-short-sentences.md) | "Express only one idea in each sentence." | STE 4.1 |
| [Write short paragraphs](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/concise/write-short-paragraphs.md) | "Write short paragraphs and cover one topic per paragraph." | STE 6.5 |
| [Use transition words](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/organize/use-transition-words.md) | 연결어가 문단 사이의 관계를 알린다 | STE 4.4, 6.2 |
| [Use lists](https://github.com/GSA/plainlanguage.gov/blob/main/_pages/guidelines/organize/use-lists.md) | "Lists highlight a series of steps, requirements, or pieces of information in a visually clear way." | STE 4.3 |

## 3. 표준 자체
- 공식 사이트(STEMG) — https://www.asd-ste100.org/ · About — https://www.asd-ste100.org/about_STE.html · FAQ — https://www.asd-ste100.org/STE_faq.html
  - Issue 9 (2025-01-15)부터 "standard". 53개 규칙 / 9개 섹션. 승인 단어 약 900개, 비승인 약 1,200개. PDF 무료 배포. 다음 판 2028-01.
  - "STE has two parts: a set of writing rules (part 1) and a controlled dictionary (part 2)."
  - 기술 명사·기술 동사는 사전 밖 허용: "Writers can also use noun terms and verb terms that are applicable to their companies, industries, or subject fields."
- ASD Europe 뉴스 — https://www.asd-europe.org/news-media/news-events/news/simplified-technical-english-asd-ste100-issue-9
- tcworld 칼럼 (Issue 9 변경점: 53개 중 31개 규칙 재서술, 사전 555항목 갱신, 신규 규칙 없음) — https://www.tcworld.info/e-magazine/column/asd-ste100-issue-9-setting-a-standard-for-technical-documentation
- Zambrini & Chiarello (2025), CEUR-WS Vol-3990 — https://ceur-ws.org/Vol-3990/short24.pdf — 승인 875 / 비승인 ~1,400 (Issue 9 정확 수치), 9.3 구동사 금지.
- 규칙 원문 목록(TechScribe, Issue 9) — https://simplified-english.co.uk/rules-ste9.html — 5.1(20단어), 5.2(지시 하나), 5.3(명령문), 3.6(능동), 3.2(동사형), 3.5(-ing), 2.1(명사 3개), 4.5(관사), 4.3(세로 목록), 7.1–7.3(안전), 8.1(세미콜론 금지). 섹션 6은 이 목록에 없어서 공식 PDF로 확인했다.
- **공식 Issue 9 PDF** — https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf (434쪽, 2026-10-07 내려받아 본문 확인). 섹션 6(설명문): 6.1 "Give information gradually." · 6.2 "Use key words and key phrases to give your text a logical structure." · 6.3 "Write short sentences. Use a maximum of 25 words in each sentence." · 6.4 "Use paragraphs to show related information." · 6.5 "Make sure that each paragraph has only one topic." · 6.6 "Make sure that no paragraph has more than six sentences." 섹션 5: 5.1 "Write short sentences. Use a maximum of 20 words in each sentence."
- Wikipedia — https://en.wikipedia.org/wiki/Simplified_Technical_English — "no more than 20 words in instructions (procedures) and 25 words in descriptive texts" / "Do not write more than six sentences in each paragraph."

## 4. 효과 근거
- Chervak, Drury & Ouellette (1996), HFES — https://researchconnect.buffalo.edu/en/publications/simplified-english-for-aircraft-workcards/ — 정비사 175명. "Comprehension was significantly improved with Simplified English, particularly for the Difficult workcards and for non-native English speakers."
- Shubert, Holmback, Spyridakis & Coney (1995), IEEE IPCC, DOI 10.1109/IPCC.1995.554896 — 존재는 확인, 초록은 접근 불가 (결과 미확인).
- STEMG 공식 주장: 번역 용이성 — "easier to translate … whether by translators, neural machine translation engines, or Large Language Models (LLMs)." (FAQ)

## 5. 반론과 한계
- Bergstrom, "The great STE myth", ISTC Communicator 2018 — https://techscribe.co.uk/techw/the-great-ste-myth-bergstrom.pdf — "STE IS NOT CHEAPER TO TRANSLATE THAN PLAIN ENGLISH" / 도입 효과 증거가 "curiously elusive".
- Wang & Friginal (2025), JEAL 4(2) — https://animorepository.dlsu.edu.ph/jeal/vol4/iss2/1 — 820만 단어 통시 코퍼스. 단순화는 "double-edged sword".
- **반영:** 구조 규칙은 지키고 어휘 규칙은 푸는 "80%" 정의(`rules.md` 2·6절). 문장을 나눌 때 연결어를 지우지 않는다는 규칙(STE 6.2).

## 6. LLM과 STE
- STEMG & AITT 백서 "ASD-STE100 and AI" (2026-06) — https://www.asd-ste100.org/assets/files/WhitePaper-ASD-STE100_and_AI.pdf — "AI tools can support STE-compliant writing and translation but cannot replace human oversight."
- SimpleEnglish 스킬 — https://github.com/AminBlg/SimpleEnglish — Claude 9개 모델·144회 생성, STE 위반 100단어당 4.09 → 0.91 (78% 감소). 자체 보고치.
- OneRead 검사기 — https://github.com/zorost/oneread — "Type-check AI prose against ASD-STE100 Issue 9."
- dsebastien 해설 (2026-08) — https://www.dsebastien.net/asd-ste100-simplified-technical-english/ — "a strict rulebook is exactly the kind of constraint they follow well."

## 7. 인접 표준
- ISO 24495-1:2023 Plain language Part 1 — https://www.iso.org/standard/78907.html (ISO 사이트는 봇 차단으로 직접 확인하지 못했다. 요약은 https://accessible-eu-centre.ec.europa.eu/content-corner/digital-library/iso-24495-12023-plain-language-part-1-governing-principles-and-guidelines_en 과 https://www.iplfederation.org/iso-standard/ 에서 확인). 네 원칙: relevant · findable · understandable · usable.
- 미국 Plain Language 가이드라인 — https://digital.gov/guides/plain-language (plainlanguage.gov 전체가 여기로 301 리다이렉트) · 원문 아카이브 https://github.com/GSA/plainlanguage.gov/tree/main/_pages/guidelines

## 8. 쉬운 글말 규칙(K9~K12)의 근거

조사일은 2026-10-14다. 처음 가설은 이랬다. 구어체와 직역투가 섞이면 AI가 작성한 글로 읽히고 흐름이 끊긴다. 그러니 문어체 위주로 작성하게 한다. 조사 결과 가설의 일부만 맞았고, 규칙을 아래처럼 정했다.

| 조사 결과 | 규칙에 반영한 것 |
|---|---|
| LLM 글의 본문은 사람 글보다 격식적이고 명사가 많다 | 목표를 "문어체"가 아닌 쉬운 글말로 정했다 |
| 격식과 비격식의 섞임은 AI 판별 신호로 약하다 | 섞임은 읽기 문제로만 다룬다 |
| `~를 통해` 같은 문법 번역투는 AI 글보다 사람 글에 흔하다 | K6은 밀도(S2)로만 본다 |
| LLM은 높임 등급을 섞고, 어미 겉모양 검사가 LLM 판정보다 정확하다 | K9를 코드로 검사한다 |
| 모델마다 표지가 다르고, 판이 바뀌면 표지도 바뀐다 | 낱말 목록을 측정으로 갱신한다(`excess.mjs`) |

### LLM 글의 문체

- Reinhart 외(2025), "Do LLMs write like humans? Variation in grammatical and rhetorical styles", *PNAS* 122(8) e2422455122 — https://doi.org/10.1073/pnas.2422455122
  - 지시 학습 모델은 현재분사절을 사람의 2~5배, 명사화를 1.5~2배 사용한다. 기본 모델은 사람에 가깝다. 문체 차이는 사후 학습에서 생긴다.
  - 반영: 쉬운 글말은 명사화를 줄인다. "문어체"로 밀지 않는다.
- 위키백과 "Signs of AI writing" — https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing (2026-10-14 원문 확인)
  - 부정 병렬("Not only … but …", "It's not …, it's …"), 기계적인 굵게, 대화 인사("I hope this helps")를 신호로 든다.
  - "Ineffective indicators" 절은 "Combination of casual and formal registers"를 효과 없는 신호로 분류한다. 이유: "This may indicate the casual writing of a person in a technical field, such as computer science."
  - "Historical indicators" 절은 "Overuse of em dashes (2022–September 2026)"를 지난 신호로 옮겼다.
  - 같은 글은 신호를 고칠 문제로만 다루지 말라고 한다: "Please do not merely treat these signs as the problems to be fixed; that could just make detection harder."
  - 반영: K11·K12. 섞임을 AI 판별 신호로 사용하지 않는다.
- Russell·Karpinska·Iyyer(2025), "People who frequently use ChatGPT for writing tasks are accurate and robust detectors of AI-generated text", ACL — https://arxiv.org/abs/2501.15654
  - LLM을 자주 사용하는 사람 다섯 명의 다수결은 300편 가운데 299편을 맞혔다. 가장 자주 언급한 단서는 어휘(53.1%)와 문장 구조(35.9%)였다.
- Jakesch·Hancock·Naaman(2023), "Human heuristics for AI-generated language are flawed", *PNAS* — https://pmc.ncbi.nlm.nih.gov/articles/PMC10089155/
  - 사람은 축약형과 1인칭을 사람 글의 단서로 여기지만, 이 단서는 틀렸다. 이 단서에 맞춰 만든 AI 글이 사람 글보다 더 사람 글로 판정됐다.
  - 반영: 구어 형태를 넣어 AI 티를 숨기지 않는다.
- Kobak 외(2025), "Delving into LLM-assisted writing in biomedical publications through excess vocabulary", *Science Advances* 11(27) — https://arxiv.org/abs/2406.07016
- Paech 외(2025), "Antislop: A Comprehensive Framework for Identifying and Eliminating Repetitive Patterns in Language Models" — https://arxiv.org/abs/2510.15061
  - 두 연구 모두 LLM 빈도를 사람 빈도와 비교해 과대 출현 낱말을 찾는다. Antislop은 이 방법이 영역마다 다르다고("domain-specific") 밝힌다.
  - 반영: `excess.mjs`와 `baseline.tsv`.

### 비영어 생성의 번역투

- Guo 외(2025), "Do Large Language Models Have an English Accent?", ACL — https://arxiv.org/abs/2410.15956
  - 영어와 거리가 먼 언어일수록 LLM 글의 어휘·통사 자연스러움이 사람 글과 더 멀다.
- Valentini 외(2026), COLM — https://arxiv.org/abs/2608.17399
  - 분류기는 직접 생성한 독일어 글의 상당수를 번역 글로 판정했지만, 원어민 평가자는 번역 글로 보지 않았다. 통계로 찾은 번역투와 독자가 느끼는 번역투는 다르다.

### 한국어 LLM 글

- Park 외(2025), "KatFishNet: Detecting LLM-Generated Korean Text through Linguistic Feature Analysis", ACL — https://aclanthology.org/2025.acl-long.1030
  - LLM 한국어 글은 명사에 많이 기대고 어미·서술어를 적게 사용한다. 에세이에서 연결 어미 뒤 쉼표는 사람 4.10%, LLM 19.83%였다(GPT-4o·Solar·Qwen2·Llama-3.1).
  - 이 쉼표 표지는 모델마다 다를 수 있어서 규칙에 넣지 않았다.
- Jeong 외(2026), "LoCar", ACL 산업 트랙 — https://arxiv.org/abs/2605.21086
  - 모델 11개가 모든 문장에서 한 높임 등급을 지킨 비율은 평균 합쇼체 0.66, 해요체 0.55였다. 인용: "Models frequently conflate haeyo and hapsyo."
  - LLM 판정도 두 등급을 헷갈렸다. 어미 겉모양 규칙으로 거르자 사람 판정과의 일치도가 0.69에서 0.94로 올랐다.
  - 반영: K9를 정규식과 형태소로 검사한다.
- Go 외(2025), "XDAC", ACL — https://aclanthology.org/2025.acl-long.1108
  - 비격식으로 쓰라고 지시해도 LLM 댓글에는 격식 구조와 `~에 대해`가 그대로 나왔다.
- im-not-ai(오픈 소스, MIT, 동료 심사 없음) — https://github.com/epoko77-ai/im-not-ai
  - AI 글 60편과 2022 이전 사람 글 60편을 비교했다. `A가 아니라 B`는 1천 자당 5.8 대 0.6으로 AI 쪽에 9.2배 많았다.
  - `~를 통해`는 AI 글에 거의 없어서 규칙에서 뺐다.
  - 신호 하나로 "높음"을 주자 사람 글 532편 가운데 285편이 높음이 됐다. 그 뒤 독립 신호 두 계열을 요구하도록 고쳤다.
  - 반영: K11의 `X가 아니라`, K6의 밀도 판정, S1·S2 심각도.

### 한국어 문체 이론과 지침

- 표준국어대사전 "문어체": "일상적인 대화에서 쓰는 말투가 아닌, 글에서 주로 쓰는 말투." — https://stdict.korean.go.kr
- 김자유(2022), 「토스의 8가지 라이팅 원칙들」 — https://toss.tech/article/8-writing-principles-of-toss
  - 소리 내어 읽기 어색한 글의 예로 "한자어를 쓰거나, 문어체를 쓰거나, 호흡이 지나치게 긴 문장들"을 든다.
  - 반영: "문어체"라는 이름을 사용하지 않는다.
- 이해영(2006), 「구어의 특징과 구조」, 『새국어생활』 16(2) — https://www.korean.go.kr/nkview/nklife/2006_2/2006_0212.pdf
  - 구어 특징으로 축약("그것은 → 그건"), 구어체 어미, 담화 표지("글쎄, 뭐, 자"), 정도 부사("되게, 무지, 참, 진짜")를 든다.
  - 반영: K10 목록.
- Kim·Biber(1994), "A corpus-based analysis of register variation in Korean", *Sociolinguistic Perspectives on Register*, OUP — https://academic.oup.com/book/53733/chapter/422174969
  - 한국어 레지스터 22개를 다차원 분석했다. 축약형, 격식 종결 어미, 직접 의문문, 조각 문장이 말과 글을 가르는 자질에 속한다.
- 최주희(2013), 『한국언어문화학』 10(1) — https://m.earticle.net/Article/A200656
  - 합쇼체와 해라체, 해요체와 해라체의 섞임을 허용되지 않는 섞임으로 분류한다.
- 文化審議会(2022), 「公用文作成の考え方（建議）」 — https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93731901_01.pdf
  - "一つの文書内では、文末表現に敬体と常体とを混合して用いない。…ただし、引用や従属節、箇条書にする部分に異なる文末表現が現れるのは問題ない。"
  - 반영: K9의 예외(인용·목록).
- Eun·Strauss(2004), *Language Sciences* 26(3) · 이정화(2004), 이화여대 교육대학원 석사논문
  - 한국어 화자는 해요체와 합쇼체를 한 글에서 일부러 섞기도 한다.
  - 반영: 해요체 본문 속 합쇼체는 S2로 분류한다.
- 기업 지침
  - 카카오 개발자 문서 가이드: "서술형 문장은 니다.로 마칩니다." — https://developers.kakao.com/docs/ko/documentation-guideline/document-style-open
  - 토스 테크니컬 라이팅: 해요체와 합쇼체를 섞어 사용한다. 메타 담화(`결론적으로`·`솔직히 말하면`)를 줄인다. — https://technical-writing.dev
  - Microsoft 한국어 현지화 지침: "use—세요 instead of—십시오". "Do not literally replace the source colloquialism with a Korean colloquialism." — https://download.microsoft.com/download/5/b/6/5b62389f-4e3b-4c77-bc18-94efba2fa7bb/kor-kor-StyleGuide.pdf
  - 반영: 합쇼체 글의 명령은 `-세요`(K9). 영어식 구어를 옮기지 않는다(K10).
- 강주헌(2012), 「국어다운 번역을 위하여」, 『새국어생활』 22(1) — https://www.korean.go.kr/nkview/nklife/2012_1.html
  - "언중의 말에서 '-로부터'를 듣기는 무척 힘들다." 번역은 "입말에 가까울수록 좋다."
  - 반영: 구어 형태를 지우다가 책말로 가지 않는다(K10).
- 오미형(2015), 『통역과 번역』 17(1) — https://www.earticle.net/Article/A257372
  - 대학생 31명은 번역투 문장을 일관되게 덜 읽기 쉽다고 평가하지 않았다.
  - 반영: 번역투는 밀도로 본다(K6).

### 도구

- Kiwi(kiwipiepy 0.24.0, Apache-2.0) — https://github.com/bab2min/Kiwi
  - 큰 모델 cong-global은 WASM 판(kiwi-nlp)에서 일부 문장에 "memory access out of bounds"로 멈췄고, 파이썬 판에서는 멈추지 않았다(2026-10-14 시험).
  - 이 저장소의 한국어 문서 2,320문장에서 정규식과 Kiwi의 문장 끝 판정은 93~96%가 같았다. 형태소가 더 나은 곳은 해체와 명사의 구분, 명사형 `-ㅁ`, 어절이 나뉜 축약형(`할 게`), `사실`의 품사다.
  - 반영: 문장 끝은 정규식으로 먼저 가리고, 못 가린 문장만 형태소로 가린다.
- textlint-rule-no-mix-dearu-desumasu — https://github.com/textlint-ja/textlint-rule-no-mix-dearu-desumasu
  - 일본어 경체·상체 섞임을 검사한다. 제목·본문·목록을 따로 센다.
  - 반영: K9에서 제목·본문·목록·표를 따로 센다.
- Sadowski 외(2015), "Tricorder: Building a Program Analysis Ecosystem", ICSE — https://research.google/pubs/pub43322/
  - 정적 분석 결과의 유효 오탐률 10% 미만을 기준으로 삼는다.
  - 반영: `precision.mjs`의 기준.

### 반론과 한계

- 한 글 안의 섞임이 독해를 늦춘다는 직접 실험은 찾지 못했다. 간접 근거는 높임 불일치에 대한 뇌파 연구다(『Communication Sciences & Disorders』 22(1), 2017).
- 대화체 교수 글은 학습 효과가 있다. Ginns·Martin·Marsh(2013, *Educational Psychology Review* 25(4))의 메타분석에서 기억 d = 0.30, 전이 d = 0.54였다. 그래서 해요체와 독자 호명 자체는 막지 않는다.
- 표지는 모델 판마다 바뀐다. 목록에는 측정한 날짜를 기록하고 다시 측정한다.
- `baseline.tsv`는 블로그·뉴스레터·백과 세 종류라 장르가 좁다. 주제가 다르면 주제 명사가 과대 출현으로 올라온다. 그래서 `excess.mjs`는 일반 명사를 기본으로 빼고 보인다.


## 9. 기존 도구, 선행 연구, 검증 루프

조사일은 2026-10-23이다. 질문은 두 가지였다. 하나는 이 스킬의 한국어 규칙이 이미 정의된 국어 문법을 다시 만든 것인지다. 다른 하나는 가져다 사용할 한국어 규칙 코드가 있는지다.

| 조사 결과 | 반영한 것 |
|---|---|
| 규칙이 기대는 개념(높임 등급, 준말, 종결 어미, 피동)은 국어 문법에 있다. 어떤 형태를 금지할지는 문법이 정하지 않는다 | 문법 층은 Kiwi 품사로 재사용한다. 금지 목록은 이 스킬이 정한다 |
| 공개된 한국어 문체 검사 엔진은 찾지 못했다. 맞춤법 검사기는 대상이 다르다 | 맞춤법 검사기를 연동하지 않는다 |
| 국립국어원 공공언어 진단 기준과 통제 한국어 연구가 이 스킬과 같은 범주를 다룬다 | K6과 STE 3.4의 근거로 추가했다 |
| 국립국어원이 고친 문장 쌍이 공공누리 제1유형으로 공개돼 있다 | 탐지율을 측정하는 검증 루프를 만들었다 |
| 기초 어휘 등급 목록은 기술 용어를 어려운 말로 가린다 | 쉬운 낱말(STE 1.9) 규칙으로 채택하지 않는다 |

### 문법 검사와 문체 검사

- 맞춤법·문법 검사기는 글이 어문 규범에 맞는지 검사한다. `이건`, `~거든요`, `~를 통해`, 합쇼체와 해요체의 섞임은 모두 규범에 맞는 말이다. 그래서 맞춤법 검사기는 이 스킬의 후보를 대부분 찾지 않는다.
- 영어도 같다. 문법 검사기와 STE 검사기는 서로 다른 도구다.
- 이 스킬의 문법 층은 이미 기존 코드를 사용한다. Kiwi의 품사(종결 어미 EF, 명사형 어미 ETN 등)로 높임 등급과 축약형을 가린다.

### 기존 검사기

| 도구 | 하는 일 | 이 스킬에 사용할 수 있는지 |
|---|---|---|
| 부산대 맞춤법 검사기(바른한글) | 1991년 발표, 2001년 서비스 시작. 형태소 분석, 오류 형태 약 40만 개, 문맥 규칙 약 8만 개 | 엔진 비공개. 공개 API 문서를 찾지 못했다. 대상이 맞춤법이다 |
| 바른(Bareun) | 형태소 분석과 맞춤법 검사 API | 외부 서비스라 검토할 글을 밖으로 보낸다 |
| LanguageTool | 다국어 문법·문체 검사 | 한국어를 지원하지 않는다 |
| Acrolinx | STE 검사를 포함한 상용 문체 검사 | 언어 지원표에 한국어가 없다 |
| Kiwi | 형태소 분석, 문장 분리, 띄어쓰기·오타 교정 | 이미 사용한다. 높임 등급을 판정하는 기능은 없다 |

- 부산대 검사기: 요즘IT, 「'부산대 맞춤법 검사기'는 누가 만들었을까?」 — https://yozm.wishket.com/magazine/detail/3087
- LanguageTool 포럼의 한국어 지원 요청 — https://forum.languagetool.org/t/support-new-language-to-languagetool/1468
- Acrolinx 언어 지원표 — https://support.markup.ai/hc/en-us/articles/10211264809490-Acrolinx-Language-Support-Matrix
- Kiwi 기능 목록 — https://github.com/bab2min/kiwipiepy

### 한국어 문체를 검사하는 공개 코드

- ko-po-check(GPL-3.0) — https://github.com/changwoo/ko-po-check
- Pology 한국어 규칙(GPLv3+, 2019, ko-po-check에서 옮김) — https://invent.kde.org/sdk/pology/-/blob/master/lang/ko/rules/language.rules
  - 번역 파일(PO)의 한국어를 검사한다. 문체 규칙은 아래와 같다.
    - `~에 의해` → 능동, `필요가 있다` → `~해야`, `~기 위하여` → `~하려면`
    - `필요로 하다` → `필요하다`, `존재하지 않다` → `없다`, `~할 것입니다` → `~합니다`
    - 세미콜론 금지
  - 이 스킬과 겹치는 것: `~에 의해`·`~할 필요가 있다`(K6), 세미콜론(STE 8.1). 다른 사람이 따로 만든 목록이 같은 형태를 골랐다.
  - 반영: GPL이라 코드는 옮기지 않았다. `필요로 하다`·`존재하지 않다`는 근거가 이 한 갈래뿐이라 규칙에 넣지 않았다. Pology 규칙은 ko-po-check에서 왔으므로 독립된 근거로 세지 않는다.

### 국립국어원 공공언어 진단

- 민현식(2010), 「공공언어 요건 정립 및 진단 기준 개발 연구」, 국립국어원 — https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=486
  - 공공언어의 요건을 정확성과 소통성으로 나눈다.
- 국립국어원(2013), 「2013년 행정기관 공공언어 진단 및 진단 자동화 도구 개발」, 공공누리 제1유형 — https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=719
  - 진단 자동화 도구를 규칙 기반과 기계 학습(CRF)으로 만들었다. 도구는 공개되지 않았다.
  - 진단 항목 1.2.3 "문장을 우리말답게 표현하였는가?"의 세부 기준은 아래를 포함한다.
    - 과도한 명사화 구성, 과도한 관형화 구성
    - 불필요한 피동·사동 표현
    - 번역 투 표현
  - 항목 2.3.2의 각주는 어조의 일관성을 든다. "'하십시오체'를 썼다면 일관되게 '하십시오체'를 쓰고 높임말을 썼다면 일관되게 높임말을 썼는가를 진단하는 것"
  - 반영: 명사화는 STE 3.7·4.2, 피동은 STE 3.6, 번역 투는 K6, 어조 일관성은 K9에 대응한다.

### 통제 한국어 연구

- Hong·Kim(2008), "Controlled Korean for Korean-English MT", PACLIC 22, 391~396쪽 — https://aclanthology.org/Y08-1040.pdf
  - 한영 기계 번역용 통제 한국어다. 번역 쌍 4만 개를 검토해 작성 오류 8종을 골랐다. 구어 표현, 경동사 구문, `-로`·`하다`·`대하다` 같은 모호한 말, 문두 주제 표지, 이중 주어·목적어 구문 등이다.
  - 승인 낱말 제한은 포기했다. "We therefore gave up introducing the restricted Korean lexicon and rather focussed on the writing rules"
  - 검사기는 손으로 만든 어휘 규칙과 메타 규칙 약 6,000개를 사용했다. 공개되지 않았다.
  - 반영: 사전 없이 작성 규칙만 지키는 이 스킬의 "80%" 선택과 같은 판단이다. 구어 표현은 K10, 경동사 구문은 STE 3.7, `대하다`는 K6에 대응한다.
- 박아름·지은별·홍문표(2012), 「제품 설명서에 나타나는 중의적 명사 수식 구문 연구」 — https://koreascience.kr/article/CFKO201208355727433.pdf
  - 제품 설명서의 통제 규칙으로 `의` 중복과 모호한 명사 병렬을 다룬다. STE 2.1의 한국어 적용(`A의 B의 C`)과 같은 방향이다.
- KS A 0001(표준의 서식과 작성방법)의 부속서에 요구·권고·허용을 나타내는 문장 끝 표현표가 있다고 한다(미확인). 원문을 열람하지 못했다.

### 같은 시기의 비슷한 프로젝트

2026년에 STE를 한국어에 옮긴 공개 프로젝트가 여럿 나왔다. 모두 직접 만든 규칙으로 검사하고, 기존 문법 검사기를 재사용한 곳은 없다. 수치는 모두 자체 보고치다.

- STE-KO(MIT) — https://github.com/junwonkim07/ste-ko
- KSTE(코드 MIT) — https://github.com/HHSic/kste
  - 국립국어원 편집자가 고친 문장·구 709쌍으로 검사기를 평가했다. 기본 표시에서 탐지율 26.1%·오탐률 14.1%, 모든 후보를 보이면 55.1%·30.0%였다.
- SimpleKorean의 조사 보고서(통제 한국어 자원) — https://github.com/say8425/SimpleKorean/blob/main/docs/research/korean-controlled-language.md
  - 국립국어원 자료와 오픈 소스 용어집의 라이선스를 항목마다 판정했다. 이 절의 자료 일부를 이 보고서에서 찾았다.

### 검증 루프: 교정 쌍 측정

국립국어원이 고친 문장 쌍으로 검사 스크립트를 측정한다. 도구, 자료, 쌍별 측정 기록은 원본 저장소의 `scripts/prose-check/`에 있다(`pairs.mjs`, `pairs/`, `README.md`의 "측정 기록").

- 자료: 국립국어원(2011) 「보도 자료 쓰기 길잡이」와 문화체육관광부·국립국어원(2014) 「쉬운 공공언어 쓰기 길잡이」의 문장 쌍 52개다. 둘 다 공공누리 제1유형이다.
- 결과: 이 스킬이 다루는 범주의 쌍 26개 가운데, 규칙을 더하기 전에는 4개, 더한 뒤에는 7개를 찾았다. 고친 뒤 문장에 새 후보는 생기지 않았다.
- 국립국어원도 고친 문장에서 `~을 통해`와 `~할 필요가 있다`를 고치지 않았다. K6을 밀도(S2)로만 보는 근거다.
- 새 문형(`~에 대해서는`·`~로부터`·`~에 있어서`·`~하게 된다`)은 표본 판정에서 정밀도가 90%를 넘었다. `~하게 된다`의 오탐 꼴 둘(`이렇게 된다`·`~할 수 있게 되었다`)은 규칙에서 뺐다.
- 2022년 이전 사람 글은 이 번역투 문형을 최근 Claude 응답보다 훨씬 많이 사용했다. 이 문형은 AI 글의 표지가 아니므로 쉬운 글 규칙(K6)으로만 본다.
- 검사 스크립트가 아직 찾지 못하는 것: 불필요한 피동(3.6), 명사만 이은 압축 말투(4.2), 사물 주어(K2). 다음에 규칙으로 만들 후보다.

### 모델 판정 측정

검사 스크립트와 모델 판정을 합친 스킬 전체를 같은 쌍으로 측정한다. 도구는 원본 저장소의 `scripts/prose-check/judge.mjs`와 저장소 스킬 `prose-check-eval`이다.

- 방법: 쌍마다 고치기 전 문장과 고친 뒤 문장을 서로 다른 글에 넣는다. 하위 에이전트가 글을 하나씩 SKILL.md 절차대로 검토한다. 에이전트는 정답과 짝 문장을 보지 못한다.
- 결과(Claude Opus 5.5, 실행 3번): 26쌍 가운데 기대한 규칙으로 찾은 쌍은 실행마다 14·17·13개였다. 검사 스크립트만으로는 7개다. 규칙과 상관없이 고치기 전 문장을 지적한 쌍은 20~23개였다.
- 태그만 달라서 놓친 것으로 센 쌍이 있다. 모델은 긴 문장을 6.3 대신 4.1(한 문장에 주제 둘)로 판정했다. 이 스킬은 문장 길이를 판정 기준이 아니라 읽어 볼 이유로 본다. `~에 의해`를 K6 대신 3.6으로 판정한 실행도 있었다.
- 모델도 놓친 것: 두 낱말 조각(`우선 실시`, `집중 관리`), 짧은 피동(`해제된다`), 빠진 목적어.
- 고친 뒤 문장에서도 실행마다 평균 19건을 지적했다. 국립국어원은 쌍마다 한 범주만 고쳐서, 다른 문제가 남은 문장이 많다(`도모할 필요가 있다`, `점검을 실시하여`). 그래서 이 값을 모델의 오탐률로 읽지 않는다.

### 쉬운 낱말 시험: 「국어 기초 어휘 등급 목록」

- 국립국어원(2024), 「2023년 국어 기초 어휘 선정 및 어휘 등급화 연구」 목록 파일, 40,000개, 1~5등급, 공공누리 제1유형 — https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=1160
- 결과: 3등급 밖 낱말로 가리면 고치기 전 낱말을 대부분 가렸다. 그러나 다듬은 말도 절반을 가렸다. 기술 글에서 가려진 낱말은 대부분 `함수`·`서버`·`배포` 같은 기술 용어였다. 측정 수치는 원본 저장소의 `scripts/prose-check/README.md`에 있다.
- 반영: 규칙으로 채택하지 않는다. 기술 용어는 STE 1.5가 허용하는 말이고, 다듬은 말도 절반이 3등급 밖이다. 쉬운 낱말은 K1의 네 질문으로 판정한다.

### 국립국어원 기준과 다르게 정한 것

- 「보도 자료 쓰기 길잡이」(2011)는 구어 표현을 고치는 예로 `하지만` → `그러나`, `도와줬고` → `도움을 주었고`를 든다. 이 스킬은 `하지만`·`그런데`와 준말 `줬`을 고치지 않는다. 쉬운 글말은 일상 낱말을 고르는 문체이기 때문이다(`rules.md` 3절, K10).
- 같은 자료는 권위적 표현, 차별 표현, 맞춤법과 띄어쓰기도 다룬다. 이 스킬은 이 범주를 다루지 않는다.
