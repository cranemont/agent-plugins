# 웹 에디터와 로컬 개발

> **출처**
> - https://developers.google.com/apps-script/guides/projects
> - https://developers.google.com/apps-script/concepts/manifests
> - https://developers.google.com/apps-script/guides/clasp
> - https://github.com/google/clasp
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script의 1차 개발 환경은 `script.google.com`의 **브라우저 기반 에디터**다. 설치할 게 없고, 코드는 Drive에 저장되어 Google 서버에서 실행된다. 다만 협업·버전관리·TypeScript 같은 현대 개발 워크플로를 원한다면 공식 CLI인 **`clasp`**로 로컬 개발 환경을 꾸릴 수 있다.

이 문서는 두 환경(웹 에디터 / 로컬 + clasp)의 핵심 기능과 사용 흐름을 정리한다.

## 웹 에디터 (script.google.com)

### 진입 경로

- 직접 접속: `https://script.google.com`
- Drive에서: **New > More > Google Apps Script** (standalone 프로젝트)
- Docs/Sheets/Slides에서: **Extensions > Apps Script** (container-bound 프로젝트)
- Forms에서: 우상단 **More(⋮) > Script editor** (container-bound)

### 좌측 사이드바 메뉴

| 아이콘/메뉴 | 설명 |
|------------|------|
| **Files** | `.gs` 코드 파일, `.html` 파일, `appsscript.json` 매니페스트 트리. **Editor > Add** 로 파일 추가. |
| **Libraries** | 라이브러리 추가/제거. script ID와 버전을 입력해 import. 매니페스트 `dependencies.libraries`에 반영됨. |
| **Services** | Advanced Google Services 활성화/비활성화. 매니페스트 `dependencies.enabledAdvancedServices`에 반영됨. |
| **Executions** | 실행 이력(트리거, 수동 실행 포함), 실패한 실행의 stack trace, Cloud Logging 연동. |
| **Triggers** | Installable trigger 생성/관리(시간 기반, 이벤트 기반). |
| **Project Settings** | 시간대, 스크립트 ID, GCP 프로젝트 연결, V8 런타임 토글, **`appsscript.json` 표시** 토글. |

### 매니페스트 표시

`appsscript.json`은 기본 숨김이다. 편집하려면:

1. **Project Settings** 클릭
2. **"Show 'appsscript.json' manifest file in editor"** 체크
3. Files 트리에 `appsscript.json` 노출 → 직접 편집 가능

공식 권고: "Hide the manifest when you are done editing."

### 실행과 디버깅

- 에디터 상단 함수 드롭다운에서 함수 선택 → **Run** 또는 **Debug**
- Debug는 브레이크포인트·변수 검사 지원
- `console.log(...)`, `console.error(...)` 출력은 **Executions** 탭과 (`exceptionLogging: STACKDRIVER`인 경우) Cloud Logging으로 전송
- `Logger.log(...)`도 사용 가능 — 같은 위치에 표시됨

### 주요 단축키

웹 에디터에서 자주 쓰이는 키 바인딩(브라우저·OS에 따라 일부 차이):

| 동작 | macOS | Windows/Linux |
|------|-------|---------------|
| 저장 | ⌘S | Ctrl+S |
| 실행 | ⌘R | Ctrl+R |
| 디버그 실행 | ⌘D | Ctrl+D |
| 검색 | ⌘F | Ctrl+F |
| 검색·바꾸기 | ⌘⇧H | Ctrl+H |
| 코드 포맷팅 | ⌘⇧F | Ctrl+Shift+F |
| 줄 단위 이동 | Opt+↑/↓ | Alt+↑/↓ |
| 주석 토글 | ⌘/ | Ctrl+/ |
| 명령 팔레트 | ⌘⇧P | Ctrl+Shift+P |

> 단축키는 Google이 비공개로 변경할 수 있다. 정확한 현재 매핑은 에디터 **Help > Keyboard shortcuts**에서 확인.

### 프로젝트 구조 / 파일 종류

공식 인용: "A script project represents a collection of files and resources... one or more script files which can either be code files (having a `.gs` extension) or HTML files (a `.html` extension)."

- `*.gs` — JavaScript 코드. 같은 프로젝트의 모든 `.gs` 파일은 **동일한 전역 스코프**를 공유. 파일 이름은 단순한 정리 수단.
- `*.html` — HTML/CSS/JS 템플릿. `HtmlService.createHtmlOutputFromFile('index')` 등으로 로드.
- `appsscript.json` — 매니페스트.

> 삭제 주의: "Deleted files can't be recovered."

### 버전 / 배포

- **Deploy > New deployment** — Web app, Executable(API), Library, Add-on 타입 선택
- 각 배포는 **버전 번호**(immutable snapshot)에 연결된다
- 헤드(최신 저장 본)는 **Test deployment**로만 호출 가능. 운영용 URL은 항상 versioned deployment여야 함
- 매니페스트 변경(특히 OAuth scope, `urlFetchWhitelist`, `webapp`/`executionApi`)은 **새 버전 배포 후에야 라이브 반영**됨

### 다중 계정(멀티로그인) 미지원

공식 인용: "Multi-login, or being logged into multiple Google Accounts at once, isn't supported for Apps Script, add-ons, or web apps."

여러 계정에 동시에 로그인된 브라우저에서는 에디터·web app·add-on이 비정상 동작할 수 있다. 별도 프로필 또는 시크릿 창을 사용하는 것이 안전하다.

---

## 로컬 개발 — `clasp`

### `clasp`란?

공식 정의: "an open-source tool that allows you to develop and manage Apps Script projects from your terminal instead of the Apps Script editor."

GitHub: https://github.com/google/clasp

이름은 **C**ommand **L**ine **A**pps **S**cript **P**rojects의 머리글자 조합으로 알려져 있다.

### 설치

```bash
npm install @google/clasp -g
```

- Node.js **22.0.0 이상** 필요(clasp v3 기준; v2는 20+).
- 글로벌 설치 후 `clasp` 명령 사용 가능.

### 사전 준비

1. Apps Script API 활성화: `https://script.google.com/home/usersettings` 에서 **Google Apps Script API: ON** 으로 토글.
2. `clasp login` 으로 OAuth 인증.

### 핵심 명령어

> clasp **v3**에서 명령어 이름이 대거 바뀌었다(`create`→`create-script`, `clone`→`clone-script`, `open`→`open-script`, `version`→`create-version`, `deploy`→`create-deployment`, `run`→`run-function` 등). 아래는 v3 기준이며, 전체 명령·옵션은 [clasp.md](../07-development/clasp.md) 참고.

| 명령 | 설명 |
|------|------|
| `clasp login` | Google 계정으로 인증. 토큰은 홈 디렉터리 `~/.clasprc.json`에 저장됨. |
| `clasp logout` | 인증 해제. |
| `clasp create-script [--title <t>]` | 새 프로젝트 생성. `--type` 플래그로 `standalone`, `webapp`, `api`, `sheets`, `docs`, `slides`, `forms` 지정 가능. |
| `clasp clone-script <scriptId>` | 기존 프로젝트를 로컬로 복제. script ID는 Project Settings에서 확인. |
| `clasp pull` | Drive의 현재 프로젝트 코드를 로컬로 내려받음. |
| `clasp push` | 로컬 변경을 Drive 프로젝트로 업로드. `--watch`로 변경 감지 자동 push 가능. |
| `clasp open-script` | 브라우저에서 해당 프로젝트 에디터 열기. (`open-web-app`/`open-container`도 있음) |
| `clasp create-version [description]` | 새 버전(immutable snapshot) 생성. |
| `clasp create-deployment [--versionNumber <n>] [--description <d>]` | 새 배포 생성. 버전을 생략하면 HEAD 기반. |
| `clasp list-deployments` | 배포 목록(deployment ID, version, description) 확인. |
| `clasp delete-deployment [deploymentId]` | 배포 제거. `--all`로 전체 삭제. |
| `clasp tail-logs` | Cloud Logging의 최근 로그 출력. `--watch` 지원. |
| `clasp run-function <functionName>` | (Apps Script API executable로 배포되어 있어야 함) 함수 원격 실행. |

### 로컬 디렉터리 구조

`clasp clone-script` 후 디렉터리에는 다음이 생긴다.

```
my-script/
├── .clasp.json          # scriptId, rootDir 등 clasp 설정 (커밋하지 말 것)
├── appsscript.json      # 매니페스트
├── Code.js              # .gs 파일은 push 시 .gs로 변환됨
└── ui/
    └── Sidebar.html
```

- `.gs` 파일은 로컬에서는 `.js`로 저장되며, `clasp push` 시 자동으로 `.gs`로 업로드된다.
- 디렉터리 구조는 보존된다(공식 인용: "organize your code into directories, which are preserved when you upload them to script.google.com.").
- `.claspignore` 파일로 push 제외 패턴을 지정할 수 있다(`.gitignore`와 유사).

### TypeScript 지원

clasp **v3는 더 이상 TypeScript를 자체 트랜스파일하지 않는다.** `.ts`를 그대로 push할 수 없으므로 Rollup 등 번들러로 먼저 GAS 호환 `.js`로 변환한 뒤 `clasp push`한다. (v2.x는 `.ts`를 자동으로 `.gs`로 변환했다.)

- 타입 정의 패키지: `npm install -D @types/google-apps-script` — `SpreadsheetApp`, `DriveApp` 등 GAS 전역에 타입 힌트가 붙는다.
- 권장 스택: TypeScript + Rollup + clasp (예: `google/aside` 템플릿). 번들 산출물(`build/main.js` 등)을 push한다.
- 자세한 v3 TypeScript 워크플로는 [typescript.md](../07-development/typescript.md) 참고.

```typescript
// 예: 타입이 적용된 GAS 함수
function logFirstRow(sheetName: string): void {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  console.log(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
}
```

### 권장 워크플로

```bash
# 1. 기존 프로젝트 가져오기
clasp clone-script 1AbCDefGhIJklmNoPQRstuVWxyz0123456789

# 2. 로컬에서 편집 (VS Code 등)
#    .ts 파일 사용, @types/google-apps-script로 타입 체크

# 3. git으로 버전 관리
git init && git add . && git commit -m "init"
echo ".clasp.json" >> .gitignore
echo "node_modules/" >> .gitignore

# 4. 변경 푸시
clasp push

# 5. 빠른 확인용 watch
clasp push --watch

# 6. 새 배포
clasp create-version "v1.2.0 - add weekly report"
clasp create-deployment --description "v1.2.0"

# 7. 운영 로그 확인
clasp tail-logs
```

### 로컬 개발의 한계

- **`clasp run-function`은 미리 executable API로 배포되어 있어야** 동작한다. 자유롭게 임의 함수를 원격 실행하는 기능은 아니다.
- **에디터 전용 기능**: 트리거 관리 GUI, 실행 이력 상세 뷰, 라이브러리/Services 추가 UI 등은 여전히 web 에디터에서 제어해야 편하다.
- **로컬 단위 테스트는 한계가 크다.** GAS 전역(`SpreadsheetApp` 등)을 mock하지 않으면 실제 실행은 Drive에 push해서 해야 한다. Jest + 수동 mock 또는 `gas-mock-globals` 같은 서드파티 도구를 활용.
- **OAuth 인증 토큰**(`~/.clasprc.json`)은 절대 커밋하지 말 것.
- **`.clasp.json`은 script ID를 포함**한다 — public repo에 올릴지 신중히 결정.

---

## 코드 예제 — 로컬 프로젝트 부트스트랩

```bash
# 새 프로젝트를 standalone web app 타입으로 생성
clasp create-script --type webapp --title "My Web App"

# 생성된 디렉터리로 이동 후 매니페스트 편집
# (이미 cwd에 만들어졌다면 생략)
```

`appsscript.json`:

```json
{
  "timeZone": "Asia/Seoul",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

`Code.js`:

```javascript
// HTTP GET 요청에 JSON으로 응답하는 최소 web app
function doGet(e) {
  const payload = { ok: true, params: e.parameter, ts: new Date().toISOString() };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

푸시 및 배포:

```bash
clasp push
clasp create-deployment --description "initial"
clasp list-deployments   # 출력된 Web app URL로 호출 가능
```

## 주의사항 / 함정

- **Apps Script API를 끈 상태**에서는 `clasp push`가 401을 반환한다. `https://script.google.com/home/usersettings`에서 활성화.
- **로컬에서 만든 `appsscript.json`이 더 적게/잘못 정의되면 push 후 배포에 실패**할 수 있다. 공식 가이드: "A poorly defined manifest can prevent you from saving a versioned deployment."
- **bound script와 clasp**: bound 프로젝트도 clone 가능하지만 script ID를 알아야 한다(Project Settings에서 확인).
- **버전 vs 배포 혼동**: `clasp create-version`은 immutable snapshot 생성, `clasp create-deployment`는 그 버전을 사용자가 접근 가능한 URL/엔드포인트에 연결. 운영에는 항상 새 version → 새 deployment 흐름을 유지.
- **로컬 빌드 결과물을 push하는 패턴(Webpack 등)** 도 가능하지만, 단일 번들 파일이 GAS 함수 드롭다운에 모든 함수 노출이 안 될 수 있다(트리거/메뉴 함수는 top-level `function name() {}` 선언이 안전).
- **`Logger.log` vs `console.log`**: V8에서는 `console`이 권장. `Logger`는 호환을 위해 남아 있다.

## 참고

- https://developers.google.com/apps-script/guides/projects
- https://developers.google.com/apps-script/concepts/manifests
- https://developers.google.com/apps-script/guides/clasp
- https://github.com/google/clasp
