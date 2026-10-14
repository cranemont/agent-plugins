# clasp (Command Line Apps Script Projects)

> **출처**
> - https://developers.google.com/apps-script/guides/clasp
> - https://github.com/google/clasp
> - https://script.google.com/home/usersettings (Apps Script API 활성화)
>
> **최종 확인일**: 2026-07-22

## 개요

`clasp`는 Google이 공식 배포하는 오픈소스 CLI다. 브라우저 에디터(script.google.com)를 거치지 않고 로컬 파일시스템에서 Apps Script 프로젝트를 관리할 수 있다.

핵심 가치:
- 로컬 에디터(VS Code, JetBrains, vim 등) 사용
- Git 등 일반 버전 관리
- CI/CD 파이프라인에 통합
- 폴더 구조로 코드 분리 (브라우저 에디터의 평면 파일 리스트가 폴더로 보존됨)

**중요 변경 (v3.x)**: clasp v3는 더 이상 TypeScript를 자체 트랜스파일하지 않는다. TS 워크플로는 Rollup 등 외부 번들러로 `.js`/`.gs`를 만든 뒤 push해야 한다. v2.x는 `.ts` 파일을 자동으로 `.gs`로 변환했다(아래 [TypeScript 섹션](#typescript-지원) 참고).

## 설치

요구사항: **Node.js 22.0.0 이상** (v3 기준; v2는 20+).

```bash
npm install -g @google/clasp
```

설치 확인:

```bash
clasp --version
```

### Apps Script API 활성화 (필수)

처음 사용 전 사용자 설정에서 Apps Script API를 켜야 한다. 켜지 않으면 `clasp create-script` 등 모든 API 호출이 다음과 같이 실패한다:

```
User has not enabled the Apps Script API.
Enable it by visiting https://script.google.com/home/usersettings
```

링크에서 토글을 **ON**으로 바꾼다. 계정마다 1회.

## 인증

### 로그인

```bash
clasp login
```

브라우저가 열리며 Google OAuth 흐름이 진행된다. 완료되면 `~/.clasprc.json`에 refresh token이 저장된다. 이 파일은 **credentials이므로 절대 커밋하지 말 것**.

옵션:

- `--no-localhost`: 헤드리스 환경(SSH) — URL을 출력하고 인증코드를 붙여넣는 방식
- `--creds <file>`: 사전 발급된 OAuth client 사용
- `--use-project-scopes`: 매니페스트의 `oauthScopes`만 요청
- `--user <name>`: 여러 계정을 이름별로 관리

### 로그아웃

```bash
clasp logout
```

`~/.clasprc.json` 삭제.

### 현재 인증 사용자 확인

```bash
clasp show-authorized-user
```

## 프로젝트 생성 / 클론

### `clasp create-script`

빈 디렉터리에서 신규 스크립트를 만든다.

```bash
mkdir my-script && cd my-script
clasp create-script --title "My Script" --type standalone
```

타입(`--type`):

| 값 | 의미 |
|----|------|
| `standalone` | Drive 루트에 단독 프로젝트 |
| `docs` | Doc에 컨테이너 바인딩 |
| `sheets` | Sheet에 컨테이너 바인딩 |
| `slides` | Slides에 컨테이너 바인딩 |
| `forms` | Form에 컨테이너 바인딩 |
| `webapp` | 웹앱 템플릿으로 생성 |
| `api` | API executable 템플릿 |

기존 컨테이너에 붙이려면 `--parentId <driveFileId>`.

### `clasp clone-script`

기존 Apps Script 프로젝트를 가져온다. **Script ID**는 에디터의 Project Settings → IDs에서 확인.

```bash
clasp clone-script 1abc...xyz
```

특정 버전 클론: `clasp clone-script 1abc...xyz 5`

`--rootDir`로 소스 폴더 분리 가능: `clasp clone-script 1abc...xyz --rootDir ./src`

### `clasp list-scripts`

내 계정의 Apps Script 프로젝트 나열.

```bash
clasp list-scripts
```

## 동기화

### `clasp push`

로컬 파일 → 원격 업로드.

```bash
clasp push
```

- `--watch`: 파일 변경 감지하여 자동 push (개발 편의)
- `--force`: 이미 원격이 더 새로워도 덮어쓰기 (CI에서 자주 사용)

올라가는 파일 종류: 매니페스트 `appsscript.json` + JS/TS/HTML. TS는 v3에서 그대로 푸시되지 않으므로 사전 번들 필요.

### `clasp pull`

원격 → 로컬 다운로드.

```bash
clasp pull
```

- `--versionNumber <n>`: 특정 버전 받기
- `--deleteUnusedFiles`: 원격에 없는 로컬 파일 삭제(주의)

### `clasp show-file-status`

푸시될/스킵될 파일 목록만 미리 본다.

```bash
clasp show-file-status
```

## 에디터 / 컨테이너 열기

| 명령 | 설명 |
|------|------|
| `clasp open-script` | 브라우저 Apps Script 에디터 열기 |
| `clasp open-web-app` | 배포된 웹앱 URL 열기 |
| `clasp open-container` | 바인딩된 Doc/Sheet/Slide 열기 |
| `clasp open-credentials-setup` | OAuth client 설정 페이지 |

## 버전과 배포

### 버전 (immutable snapshot)

```bash
clasp create-version "v1.0.0 - 첫 릴리스"
clasp list-versions
```

버전은 **불변(immutable)**. 한번 만들면 수정 불가. 코드는 동결되고, 배포가 가리키는 대상이 된다.

### 배포

```bash
# 최신 버전으로 새 배포 생성
clasp create-deployment --description "production"

# 특정 버전으로 배포
clasp create-deployment --versionNumber 3 --description "rollback"

# 기존 배포를 다른 버전으로 업데이트 (배포 URL 유지)
clasp update-deployment <deploymentId> --versionNumber 5

# 배포 목록
clasp list-deployments

# 배포 삭제 (전체 삭제)
clasp delete-deployment <deploymentId>
clasp delete-deployment --all
```

자세한 버전/배포 모델은 [version-deployment.md](./version-deployment.md) 참고.

## 로그

### `clasp tail-logs`

배포된 스크립트의 실행 로그(GCP Cloud Logging)를 콘솔로 스트리밍.

```bash
clasp tail-logs --watch
```

- `--simplified`: 메시지만 표시
- `--json`: JSON 출력 (파이프 처리용)

처음 사용 시 `clasp setup-logs`로 표준 GCP 프로젝트와 연결해야 풍부한 로그가 나온다.

## 원격 실행 (run-function)

API executable로 배포된 함수를 CLI에서 실행.

```bash
clasp run-function myFunction --params '["arg1", 42]'
```

`--nondev`: 배포된 버전 실행(기본은 HEAD).

요구사항: 매니페스트 `executionApi` 활성, OAuth 동의 완료, `clasp login --creds`로 client 인증 등록.

## 설정 파일

### `.clasp.json`

`create-script`/`clone-script` 시 자동 생성. **Script ID를 담고 있으므로 일반적으로 gitignore.** (CI에서는 시크릿으로 주입.)

```json
{
  "scriptId": "1abc...xyz",
  "rootDir": "./src",
  "projectId": "my-gcp-project",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "filePushOrder": ["src/main.js"],
  "skipSubdirectories": false
}
```

주요 필드:

| 필드 | 의미 |
|------|------|
| `scriptId` | (필수) Apps Script 프로젝트 식별자 |
| `rootDir` | 로컬 소스 루트 |
| `projectId` | 연결된 GCP project ID (logs/cloud 통합용) |
| `scriptExtensions` | 푸시할 스크립트 확장자 (기본 `.js`, `.gs`) |
| `htmlExtensions` | 푸시할 HTML 확장자 (기본 `.html`) |
| `filePushOrder` | 푸시 순서 강제 (의존 순서에 민감한 경우) |
| `skipSubdirectories` | true면 하위 폴더 무시 |

### `.clasprc.json`

`~/.clasprc.json`에 저장. **refresh token이 들어 있다.** 절대 커밋 금지, CI에서는 secret으로.

### `.claspignore`

업로드에서 제외할 패턴(`.gitignore` 스타일, multimatch 문법).

```
# 기본 제외 외에 추가로
**/node_modules/**
**/*.test.js
**/__tests__/**
docs/**
README.md
```

기본적으로 다음만 푸시된다:
- `appsscript.json`
- `**/*.gs`, `**/*.js`, `**/*.ts`, `**/*.html`

## TypeScript 지원

### v2.x (legacy)

`.ts` 파일을 clasp가 직접 `.gs`로 트랜스파일했다. ES 모듈은 전역 스코프로 풀어지며 `import`/`export`는 제거됐다.

### v3.x (현재)

> Clasp no longer transpiles typescript code. For typescript projects, use typescript with a bundler like Rollup to transform code prior to pushing with clasp.

권장 워크플로:

1. 소스: `src/**/*.ts`
2. `tsc` 또는 Rollup으로 번들 → `build/main.js`
3. `.claspignore`에 `src/**` 제외, `build/**`만 푸시
4. `.clasp.json`의 `rootDir`을 `./build`로

자세한 설정은 [typescript.md](./typescript.md) 참고.

## CI/CD 통합 (GitHub Actions 예시)

GitHub Actions secrets:
- `CLASPRC_JSON`: `~/.clasprc.json`의 내용
- `CLASP_JSON`: `.clasp.json`의 내용

```yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build         # TS 번들
      - name: Setup clasp credentials
        run: |
          echo '${{ secrets.CLASPRC_JSON }}' > ~/.clasprc.json
          echo '${{ secrets.CLASP_JSON }}' > .clasp.json
      - run: npx @google/clasp push --force
      - run: npx @google/clasp create-version "$(git rev-parse --short HEAD)"
      - run: npx @google/clasp create-deployment --description "prod ${{ github.sha }}"
```

### 환경 분리

dev/staging/prod별 별도 Apps Script 프로젝트를 만들고 secret을 다르게 주입. 같은 코드베이스에서 `.clasp.json`만 환경별로 교체하는 방식이 일반적이다.

## 자주 보는 오류

| 메시지 | 원인 / 해결 |
|--------|-------------|
| `User has not enabled the Apps Script API` | https://script.google.com/home/usersettings 에서 활성화 |
| `401 Unauthorized` / `invalid_grant` | refresh token 만료 → `clasp login` 재실행, CI는 `CLASPRC_JSON` 갱신 |
| `ENOENT .clasp.json` | 현재 디렉터리에 `.clasp.json` 없음. `clone-script` 또는 secret 주입 누락 |
| `Script API has not been used` | GCP 표준 프로젝트 연결한 경우 해당 GCP 프로젝트에서 Apps Script API 활성화 |
| Push 후 코드가 그대로 | `scriptId` 다른 프로젝트를 가리킴 / `.claspignore`로 파일이 누락 |
| `403 PERMISSION_DENIED` (clone) | 본인 소유 아니거나 공유 권한 부족 |
| `Web app's developer mode is not enabled` | `clasp run-function` 시 — HEAD 배포는 본인 계정만 호출 가능. `--nondev`로 정식 배포 호출 |

## 함정 / 한계

- **에디터와 충돌**: 동료가 브라우저 에디터에서 직접 수정하고 본인이 `push`하면 덮어쓰기. 단일 소스(레포)를 약속해야 한다.
- **HEAD vs 배포**: `clasp push`는 HEAD만 갱신. 사용자가 보는 웹앱은 배포된 버전이므로 `create-version` + `update-deployment` 필요.
- **OAuth scope 변경**: 매니페스트 `oauthScopes`를 바꿔도 사용자는 다시 동의해야 한다. `--use-project-scopes` 토큰은 새 scope에 대해 무효.
- **GCP 프로젝트 연결**: 기본은 default(consumer) GCP 프로젝트로 묶임. 로그 권한·OAuth client 발급·Cloud APIs 통합을 위해 standard GCP 프로젝트로 연결해야 한다.
- **컨테이너 바인딩 스크립트**: 부모 Doc/Sheet가 삭제되면 스크립트도 휴지통으로 같이 간다.
- **rate limit**: `clasp push`를 1분에 수십 번 호출하면 Apps Script API quota에 막힌다. CI에서 워치 패턴 금지.
- **v2 → v3 마이그레이션**: 명령어 이름이 바뀜 (`open` → `open-script`, `deploy` → `create-deployment`, `version` → `create-version` 등). 기존 스크립트와 CI 워크플로 점검 필요.

## 참고

- https://developers.google.com/apps-script/guides/clasp
- https://github.com/google/clasp
- https://github.com/google/clasp (v3 README — v2→v3 마이그레이션 표 포함)
- https://github.com/google/aside (TS + Rollup 템플릿)
