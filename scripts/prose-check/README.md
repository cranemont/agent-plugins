# scripts/prose-check: prose-check 관리 도구

writing 플러그인의 `prose-check` 스킬을 관리하는 도구와 데이터다. 이 파일들은 플러그인 폴더 밖에 있다. Claude Code는 플러그인을 설치할 때 플러그인 폴더 전체를 사용자의 플러그인 캐시에 복사한다. 관리용 파일은 스킬을 실행할 때 필요 없으므로, 설치할 때 복사되지 않게 한다.

모든 명령은 저장소 최상위에서 실행한다. 형태소 분석기 Kiwi가 필요한 도구는 먼저 `node plugins/writing/skills/prose-check/scripts/check.mjs --setup`으로 Kiwi를 설치한다.

## 파일

| 파일 | 역할 |
|---|---|
| `test.mjs` · `fixtures/` | 규칙 회귀 시험. 고정 글의 줄마다 기대 후보와 실제 후보를 대조한다. Kiwi 모드와 정규식 모드를 둘 다 돌린다 |
| `check.test.mjs` | `check.mjs`의 동작 시험(`node --test`) |
| `excess.mjs` · `features.mjs` | AI 출력과 사람 글의 형태소 빈도를 비교해서, AI가 사람보다 훨씬 자주 사용하는 말을 찾는다 |
| `baseline.mjs` · `baseline.tsv` | 사람 글 기준 빈도를 만든다. `baseline.tsv`는 핵심 표다 |
| `precision.mjs` | `check.mjs --tsv`로 만든 판정 표에서 규칙별 정밀도를 계산한다 |
| `pairs.mjs` · `pairs/` | 검증 루프. 국립국어원이 고친 문장 쌍으로 탐지율과 고친 뒤 후보를 측정하고, 저장한 기준(`pairs/results.json`)과 비교한다 |
| `vocab.mjs` | 국립국어원 기초 어휘 등급 목록이 어려운 낱말을 가리는지 측정한다. 측정 도구이고, 검사 규칙에는 넣지 않았다 |
| `calibrate.mjs` · `calibration.tsv` | 12·15어절 기준을 다시 측정한다 |

## 돌리는 때

| 때 | 명령 |
|---|---|
| 규칙을 고친 뒤 | `node scripts/prose-check/test.mjs` · `node --test scripts/prose-check/check.test.mjs` · `node scripts/prose-check/pairs.mjs --human` |
| 탐지율이 나아지고 정밀도를 확인한 뒤 | `node scripts/prose-check/pairs.mjs --save --human` |
| 모델이 바뀐 뒤 | `node scripts/prose-check/excess.mjs --model=<모델> --since=<날짜> --examples` |
| 규칙의 오탐을 측정할 때 | `check.mjs --tsv=판정.tsv <글...>`로 판정 표를 만들고 label 칸을 채운 뒤 `node scripts/prose-check/precision.mjs 판정.tsv` |
| 어절 기준을 다시 잴 때 | `node scripts/prose-check/calibrate.mjs [표본.tsv]` |

판정 기준과 절차는 스킬의 `references/korean-patterns.md` 10절에 있다.

## 기준 빈도 표

| 표 | 위치 | 크기 | 읽는 명령 |
|---|---|---|---|
| 핵심 표 | `scripts/prose-check/baseline.tsv` (커밋함) | 명사가 아닌 한 형태소 1,801행, 약 29KB | `excess.mjs` 기본 실행 · `--under` |
| 전체 표 | 데이터 폴더의 `baseline-full.tsv` (커밋하지 않음) | 명사와 이웃한 두 형태소까지 22,565행, 약 500KB | `--nouns` · `--bigrams` |
| 원문 캐시 | 데이터 폴더의 `baseline-cache/` (커밋하지 않음) | 내려받은 글 379편 | `baseline.mjs` |

데이터 폴더는 Kiwi를 설치하는 폴더와 같다. `PROSE_CHECK_HOME` → `CLAUDE_PLUGIN_DATA/prose-check` → `XDG_CACHE_HOME/prose-check` → `~/.cache/prose-check` 차례로 정한다.

두 표를 다시 만들 때는 아래 명령을 돌린다. 원문 캐시가 없으면 글 379편을 내려받아서 몇 분이 걸린다.

```sh
node scripts/prose-check/baseline.mjs --wiki
```

핵심 표는 날짜 줄만 다르면 다시 저장하지 않는다. 그래서 같은 말뭉치로 다시 만들어도 diff가 생기지 않는다. 두 표는 형태소별 횟수만 담고 원문은 담지 않는다.

## 교정 쌍 자료

`pairs/`의 쌍은 국립국어원이 공개한 자료의 교정 예문을 옮긴 것이다. 두 자료 모두 공공누리 제1유형(출처 표시)이다. 이 자료는 공공누리 제1유형 조건에 따라 출처를 표시하고 사용한다.

| `source` 열 | 자료 | 펴낸 곳 | 주소 |
|---|---|---|---|
| `보도2011:쪽` | 「보도 자료 쓰기 길잡이」(2011) | 국립국어원 | https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=208&etc_seq=334 |
| `공공2014:쪽` | 「쉬운 공공언어 쓰기 길잡이」(2014) | 문화체육관광부·국립국어원 | https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=208&etc_seq=399 |

쪽 번호는 PDF 파일의 쪽이다.

| 파일 | 내용 |
|---|---|
| `pairs/style.tsv` | 문장 쌍. `kind`는 자료의 범주 이름이다. `expect`는 이 스킬에서 그 문제를 다루는 규칙이고, `-`는 다루지 않는 범주(맞춤법·조사·권위적 표현·차별 표현 등)다 |
| `pairs/words.tsv` | 낱말 쌍. 어려운 한자어·외국어와 다듬은 말이다. `vocab.mjs`가 사용한다 |
| `pairs/results.json` | `pairs.mjs --save`가 저장한 기준. 쌍마다 찾은 규칙과 사람 글의 1,000어절당 후보 수를 담는다 |

쌍을 더할 때는 공공누리 제1유형이나 그에 준하는 자료만 사용한다. 제4유형(변경 금지) 자료의 예문은 옮기지 않는다.

`vocab.mjs`가 읽는 기초 어휘 목록(40,000개, 공공누리 제1유형)은 저장소에 넣지 않는다. `node scripts/prose-check/vocab.mjs --build`가 국립국어원에서 내려받아 데이터 폴더의 `basic-vocab.tsv`로 저장한다.
