---
name: commit-semantic
description: Analyze uncommitted changes and create semantic commits — group changes into meaningful units (feat/fix/refactor/docs/test/chore) and commit them in dependency order. Use when the user asks to commit changes semantically, split the working tree into well-formed commits, or clean up uncommitted changes into logical commits. Supports a dry-run preview and per-commit interactive confirmation.
---

# Semantic Commit

커밋되지 않은 변경사항을 분석하여 의미있는 단위로 나누어 순서대로 커밋합니다.

## Options

사용자의 요청에 다음 옵션이 포함될 수 있습니다:

- `--dry-run` (또는 "미리보기만"): 실제 커밋 없이 어떻게 나눌지 미리보기만 표시
- `--interactive` (또는 "하나씩 확인받아"): 각 커밋 전 사용자에게 확인 요청

## Instructions

### 1. 현재 상태 확인

다음 명령어들을 실행하여 변경사항을 파악합니다:

```bash
git status --short
git diff --stat
git diff --cached --stat
git log --oneline -5
```

### 2. 변경사항 분석

변경된 파일들을 다음 기준으로 그룹화합니다:

**그룹화 기준 (우선순위 순):**
1. **기능 단위**: 하나의 기능을 구성하는 관련 파일들
2. **타입 단위**: feat, fix, refactor, docs, test, chore 등
3. **디렉토리 단위**: 같은 모듈/패키지에 속한 파일들

**코드베이스 맥락 파악:**

변경된 파일들의 관계와 기능을 정확히 파악하기 위해, 다음 상황에서는 직접 코드베이스를 탐색하세요 (서브에이전트나 백그라운드 탐색을 지원하는 환경이라면 적극 활용하고, 탐색 범위가 넓으면 병렬로 실행하세요):

- 변경된 파일이 5개 이상이거나 여러 디렉토리에 분산된 경우
- 파일 간의 의존성이나 관계를 파악해야 하는 경우
- 변경 내용이 어떤 기능에 영향을 미치는지 이해가 필요한 경우
- 커밋을 어떤 기준으로 나눌지 판단하기 어려운 경우

**커밋 타입 분류:**
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `docs`: 문서 변경
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등 기타 변경
- `style`: 포맷팅, 세미콜론 등 (코드 변경 없음)

각 파일의 변경 내용을 `git diff <file>` 명령으로 확인하여 적절한 그룹에 배치합니다.

### 3. 커밋 계획 수립

분석 결과를 바탕으로 커밋 순서를 결정합니다:

**권장 커밋 순서:**
1. 인프라/설정 변경 (chore)
2. 리팩토링 (refactor)
3. 새 기능 (feat)
4. 버그 수정 (fix)
5. 테스트 (test)
6. 문서 (docs)

`--dry-run` 옵션이 있으면 여기서 계획만 보여주고 종료합니다.

### 4. 순차적 커밋 실행

각 그룹에 대해:

```bash
# 1. 해당 그룹의 파일들만 스테이징
git add <file1> <file2> ...

# 2. 변경 내용 확인
git diff --cached --stat

# 3. 커밋 생성
git commit -m "<type>: <description>"
```

`--interactive` 옵션이 있으면 각 커밋 전에 사용자에게 확인을 요청하세요.

**커밋 메시지 작성 규칙:**
- 첫 줄: `<type>: <간결한 설명>` (50자 이내)
- 본문 (선택): 변경 이유와 영향 설명
- 한글 또는 영어로 일관되게 작성 (기존 커밋 스타일 따름)

### 5. 결과 보고

모든 커밋 완료 후 다음을 보고합니다:

```bash
git log --oneline -<n>  # n = 생성된 커밋 수
```

**보고 내용:**
- 생성된 커밋 목록 (해시 + 메시지)
- 각 커밋에 포함된 파일 수
- 총 변경 통계

## Error Handling

- **No changes**: 커밋할 변경사항이 없으면 안내하고 종료
- **Staged changes exist**: 이미 스테이징된 변경이 있으면 먼저 커밋할지 물어보기
- **Merge conflict markers**: 충돌 마커가 있는 파일은 경고하고 제외
- **Binary files**: 바이너리 파일은 별도 그룹으로 분류

## Notes

- 이미 스테이징된 변경사항이 있다면 먼저 처리 방법을 물어보세요
- 하나의 파일이 여러 목적의 변경을 포함하면 분리가 어려우므로 사용자에게 안내하세요
- 커밋 순서는 의존성을 고려하여 조정할 수 있습니다
