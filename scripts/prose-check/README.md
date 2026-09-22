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
| `calibrate.mjs` · `calibration.tsv` | 12·15어절 기준을 다시 측정한다 |

## 돌리는 때

| 때 | 명령 |
|---|---|
| 규칙을 고친 뒤 | `node scripts/prose-check/test.mjs` · `node --test scripts/prose-check/check.test.mjs` |
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
