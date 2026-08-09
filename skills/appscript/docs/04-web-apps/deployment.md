# Deployment — 배포, 버전, 권한 옵션

> **출처**
> - https://developers.google.com/apps-script/concepts/deployments
> - https://developers.google.com/apps-script/guides/web
> - https://developers.google.com/apps-script/reference/script/script-app
>
> **최종 확인일**: 2026-07-22

## 개요

**Deployment(배포)** 는 Apps Script 프로젝트를 외부에서 사용할 수 있게 만드는 단위다. 공식 정의:

> *"A deployment is a release of your script that is available for use as a web app, Google Workspace add-on, or API executable."*

Deployment는 다음 정보를 묶는다:

- **Type** — Web app / API executable / Add-on / Library
- **Version** — 특정 코드 스냅샷 (또는 HEAD)
- **Configuration** — Web app의 경우 "Execute as" / "Who has access"

핵심 개념 분리:

- **Version**: *static snapshot* — 특정 시점의 코드 사본 (예: v1, v2, v3).
- **Deployment**: 특정 version을 외부에 노출하는 *release*.

> *"A version and a deployment are distinct concepts. ... A version is a static snapshot ... a deployment is a release that makes a specific version available for users."*

## Deployment 타입

| 타입 | 용도 |
| --- | --- |
| **Web app** | HTTP로 호출되는 `doGet`/`doPost` 엔드포인트 |
| **API executable** | Apps Script API(`scripts.run`)로 외부에서 함수 직접 호출 |
| **Add-on** | Editor add-on(Sheets/Docs/Slides/Forms), Workspace add-on(Gmail/Drive/Calendar) |
| **Library** | 다른 Apps Script 프로젝트에서 import해 사용 |
| **Executable API**(레거시) | Service-to-service 호출용 |

이 문서는 주로 **Web app**을 다룬다.

## HEAD vs Versioned Deployment

Apps Script 프로젝트는 두 종류의 deployment를 가진다:

### HEAD Deployment (테스트 배포)

- **저장된 최신 코드**를 자동으로 반영.
- 매번 새로 배포하지 않아도 코드 변경이 즉시 반영된다.
- URL은 **`/dev`**로 끝남.
- **편집 권한이 있는 사용자만** 접근 가능.
- 프로젝트마다 정확히 1개.

```
https://script.google.com/macros/s/{ID}/dev
```

> 공식: *"Each script project has exactly one head deployment."*

### Versioned Deployment (프로덕션 배포)

- **특정 version(코드 스냅샷)** 에 연결.
- 코드를 수정해도 새 deployment를 만들거나 기존 deployment를 update하기 전까지 반영되지 않는다.
- URL은 **`/exec`**로 끝남.
- "Who has access" 설정에 따라 외부에서 접근 가능.
- 여러 개를 동시에 운영 가능 (예: prod / staging / canary).

```
https://script.google.com/macros/s/{ID}/exec
```

## `/exec` vs `/dev` 비교

| 항목 | `/exec` | `/dev` |
| --- | --- | --- |
| 코드 | 배포된 version | 최신 저장 코드 (HEAD) |
| 접근 가능 사용자 | "Who has access" 설정 따름 | **프로젝트 편집자만** |
| 새 코드 반영 | 새 deployment 필요 | 자동 즉시 반영 |
| 외부 시스템 사용 권장 | O | X (테스트 전용) |
| `Anyone`(익명) 호출 | 가능 | 불가능 (편집자 로그인 필요) |

> **운영 코드의 URL은 반드시 `/exec`** 를 써야 한다. `/dev`는 비편집자에게 401/403을 반환한다.

## Web App 배포 옵션

IDE에서 **Deploy → New deployment → Type: Web app** 선택 시 두 가지 핵심 옵션이 노출된다.

### "Execute as" (누구의 권한으로 실행할지)

| 값 | 의미 |
| --- | --- |
| **Me (배포자)** | 어떤 사용자가 호출하든 함수는 **배포자의 권한**으로 실행. `SpreadsheetApp.openById`, `GmailApp.sendEmail` 등이 배포자 계정의 데이터/할당량을 사용한다. |
| **User accessing the web app** | 함수가 **호출한 사용자의 권한**으로 실행. 사용자는 첫 호출 시 OAuth 동의 화면을 본다. |

#### 어떻게 골라야 하는가?

| 시나리오 | 권장 |
| --- | --- |
| 외부 웹훅, 익명 사용자가 호출하는 공개 API | **Me** |
| 사용자별로 다른 시트/메일에 접근해야 함 | **User accessing the web app** |
| 조직 구성원에게 공통 데이터 제공 | **Me** (데이터 단일 소스) |
| 사용자의 Gmail/Drive 등 개인 데이터를 다룸 | **User accessing the web app** |

> **"Me" + "Anyone"** 조합이 가장 흔한 공개 웹훅 구성. 단, **모든 호출이 배포자의 일일 quota를 소모**한다. (URL Fetch 20,000/100,000회, 메일 100/1,500통 등 — `trigger-quotas.md`)

#### 컨텍스트 함수 차이

| API | "Execute as: Me" | "Execute as: User" |
| --- | --- | --- |
| `Session.getEffectiveUser()` | 배포자 | 호출자 |
| `Session.getActiveUser()` | 호출자(권한 있을 때) | 호출자 |
| `SpreadsheetApp.getActive()` (Web app은 보통 standalone) | N/A | N/A |
| `DriveApp.getRootFolder()` | 배포자의 Drive | 호출자의 Drive |

### "Who has access" (누가 호출 가능한지)

옵션 명칭은 UI 영문 기준:

| 값 | 의미 |
| --- | --- |
| **Only myself** | 배포자만. |
| **Anyone with Google account** | Google 계정으로 로그인된 사용자라면 누구나. (과거 "Anyone with a Google account"). |
| **Anyone** | 인증 없이 누구나. URL만 알면 호출 가능. |

> Workspace 도메인에서는 위 옵션 외에 **"Only users in {domain}"** 같은 도메인 한정 옵션이 추가로 노출된다. 관리자 정책에 따라 외부 도메인 공개가 차단될 수 있다.

> 옵션 명칭은 IDE 버전/언어에 따라 약간씩 다를 수 있다. 본문에 적힌 영문이 공식 가이드에 등장하는 표현이며, 의미는 동일하다.

#### 보안 주의

- **`Anyone`** 은 URL만 알면 익명으로 호출 가능 — Quora/GitHub에 URL이 유출되면 즉시 남용된다. 반드시 **자체 토큰 검증**을 코드 내부에 둘 것.

```javascript
function doPost(e) {
  const token = (e.parameter && e.parameter.token) || JSON.parse(e.postData.contents || "{}").token;
  const expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
  if (token !== expected) {
    return ContentService.createTextOutput(JSON.stringify({ error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ...
}
```

## Deployment 생성/관리 흐름

### 1. 새 deployment 생성

IDE에서 **Deploy → New deployment** 클릭. 다음 정보가 묶여서 새 deployment ID가 생성된다:

- Type (Web app, API executable, etc.)
- Version (자동으로 새 version 생성됨)
- Description (자유 텍스트, 변경 이력 추적용)
- Execute as / Who has access (Web app 한정)

생성이 끝나면 다음을 받는다:

- **Deployment ID** — URL의 `s/...` 부분
- **Web app URL** — `/exec` 끝나는 URL
- **(웹 앱) Test URL** — `/dev`

### 2. 기존 deployment 업데이트

코드를 변경한 뒤 같은 URL을 유지하려면 **새 deployment**가 아니라 **기존 deployment를 update**한다:

- IDE → **Deploy → Manage deployments** → 해당 deployment 선택 → **Edit (연필)** → **Version: New version** → **Deploy**

같은 deployment ID = 같은 `/exec` URL을 유지한 채 코드만 갱신된다.

### 3. Archive (삭제 대용)

> *"Versioned deployments cannot be deleted but can be archived instead."*

Versioned deployment는 영구 삭제할 수 없다. **Archive** 처리하면 URL이 비활성화되어 호출 시 오류를 반환한다. Archive된 deployment는 IDE의 "Show archived"에서 다시 볼 수 있다.

### 4. Deployment 개수 한도

공식 문서가 상한을 명시하지 않지만, 실측상 프로젝트당 수십 개까지 가능하다. 과도하게 쌓이면 IDE가 느려질 수 있으니 오래된 것은 archive.

## 새 deployment vs 기존 update — 의사결정

| 상황 | 권장 |
| --- | --- |
| 외부 시스템에 이미 URL이 배포돼 있고, 그 URL을 그대로 유지하고 싶다 | **기존 deployment Update** |
| 큰 변경이라 별도 staging/canary가 필요하다 | **새 deployment** |
| OAuth scope이 추가됐다 | **기존 deployment Update** (재동의 필요) — 또는 새 배포 |
| "Execute as" 또는 "Who has access"를 바꾸고 싶다 | **기존 update**(option 변경 가능) 또는 **새 deployment** |

## OAuth Scope과 재인증

- 코드에서 사용하는 API에 따라 Apps Script가 **필요한 scope을 자동 감지**한다.
- 새 scope이 추가되면(예: `UrlFetchApp` 도입), 기존 deployment를 update하거나 새 deployment를 만들 때 **모든 사용자(또는 배포자)의 OAuth 재동의가 필요**하다.
- "Execute as: Me" 모드에서는 **배포자만 한 번 동의**하면 된다.
- "Execute as: User" 모드에서는 **각 사용자가 모두 다시 동의**해야 한다.
- `appsscript.json`의 `oauthScopes` 필드를 명시해 자동 감지 결과를 고정할 수 있다(권장).

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

> `oauthScopes`를 명시하면 의도하지 않은 scope이 자동 추가되는 것을 막을 수 있어, **재동의 트리거를 통제**하기 쉽다.

## API Executable Deployment

`doGet`/`doPost` 없이 함수를 외부에서 호출하려면 **API executable**로 배포한다.

- 외부에서 Google Cloud project + OAuth 2.0으로 Apps Script API의 `scripts.run`을 호출.
- 배포 시 GCP 프로젝트와 연결돼야 한다.
- Web app과 달리 **인증 없는 호출 불가** — 항상 OAuth 토큰 필요.
- "Execute as": Me / User accessing 옵션은 비슷하게 적용.

```bash
# OAuth 토큰을 받아서:
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"function":"myFunc","parameters":[42],"devMode":false}' \
  "https://script.googleapis.com/v1/scripts/{SCRIPT_ID}:run"
```

## Library Deployment

다른 Apps Script 프로젝트에서 `Library` 메뉴를 통해 import.

- 배포된 version의 함수만 노출된다. HEAD를 import하면 개발 중 코드까지 즉시 보인다.
- Library는 **`Library.functionName()`** 형태로 호출.
- Library의 트리거(Simple/Installable)는 호출 측 프로젝트에서 자동 발화하지 않는다 — 호출 측에서 직접 등록해야 한다.

## 코드 / 설정 예제

### `appsscript.json` 전체 예시 (Web app)

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Calendar",
        "version": "v3",
        "serviceId": "calendar"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

`webapp.executeAs` 값:

- `USER_ACCESSING` → "User accessing the web app"
- `USER_DEPLOYING` → "Me"

`webapp.access` 값:

- `MYSELF` → "Only myself"
- `DOMAIN` → Workspace 도메인 내 사용자
- `ANYONE` → "Anyone with Google account"
- `ANYONE_ANONYMOUS` → "Anyone"

### `clasp`로 배포 자동화

```bash
clasp create-version "v3 - 라우터 추가"
clasp update-deployment {DEPLOYMENT_ID} --versionNumber 3 --description "v3 deploy"
```

기존 deployment ID를 지정해 갱신하려면 `update-deployment`, 새 배포를 만들려면 `create-deployment`를 쓴다.

### 배포자 컨텍스트 확인

```javascript
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    effectiveUser: Session.getEffectiveUser().getEmail(),
    activeUser: Session.getActiveUser().getEmail(),
    scriptOwner: DriveApp.getFileById(ScriptApp.getScriptId()).getOwner().getEmail(),
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## 도메인 / 정책 제약

- Workspace 도메인 관리자는 다음을 차단할 수 있다:
  - 외부 도메인으로의 Web app 공개 (`Anyone` 옵션 비활성화)
  - 외부 OAuth 동의 (다른 도메인 사용자의 `Execute as: User` 호출 차단)
  - Advanced Services 활성화 제한
- 결과적으로 같은 코드가 개인 Gmail에서는 동작하고 조직 Workspace에서는 동작하지 않을 수 있다 — 운영 환경에서 항상 도메인 정책을 확인.

## 일반 패턴 / Recipe

### 패턴 1: Staging / Production 분리

- 같은 코드 프로젝트에서 **두 개의 deployment** 운영:
  - `prod` — version 5 고정
  - `staging` — version 6 (테스트 중)
- 각각 별도 URL을 가지므로 외부 시스템이 staging에만 먼저 호출하도록 설정 가능.

### 패턴 2: 새 코드 = 기존 deployment update

운영 URL을 유지하려면 새 deployment를 만들지 말고 기존 것을 **Edit → New version → Deploy**.

### 패턴 3: 매뉴얼 토큰 인증

`Anyone` 배포에는 항상 자체 토큰을 둔다:

```javascript
function authorize(e) {
  const token = (e.parameter && e.parameter.token)
    || (e.postData ? (JSON.parse(e.postData.contents || "{}").token) : null);
  const expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
  if (!token || token !== expected) throw new Error("unauthorized");
}
```

### 패턴 4: Deployment ID를 코드에 노출 X

- Deployment URL은 GitHub/README 등에 적지 않는다 (특히 `Anyone` 배포).
- 환경변수 / Script Properties로 관리.

## 주의사항 / 함정

- **`/exec`는 캐싱될 수 있다.** 같은 query에 대한 응답을 일정 시간 캐싱하는 경우가 보고되었다. `?_=Date.now()` 등 cache buster를 붙이는 것이 안전.
- **새 deployment를 만들면 URL이 바뀐다.** 외부 시스템이 URL을 하드코딩하면 깨진다 → update를 우선 사용.
- **OAuth scope 변경 후 동의 안 하면 트리거/Web app이 조용히 실패.**
- **`Execute as: User`인데 Anyone에 배포는 의미 없다.** 익명 사용자는 OAuth 토큰이 없어 사용자 권한 실행이 불가능 → 자동으로 막힌다.
- **Workspace 도메인 안에서는 `Anyone` 옵션 자체가 비활성화**될 수 있다.
- **Archive된 deployment의 URL은 영구히 무효** — 운영 URL 절대 archive 금지.
- **개인 Gmail 계정의 quota는 매우 낮다.** 메일 100/일, 트리거 90분/일. 운영은 Workspace 계정 권장.
- **`appsscript.json`의 `webapp` 블록**이 누락되면 배포 시 기본값(My/Only myself)로 떨어진다 → 명시적으로 작성.
- **HTTP 상태 코드 200 고정** — 401/403/404를 보낼 수 없다. body로 식별.
- **OPTIONS preflight 미지원** — 브라우저 fetch에서 `Content-Type: application/json` 강제 시 차단됨. `text/plain` 우회.

## 참고

- https://developers.google.com/apps-script/concepts/deployments
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/script/script-app
- [doGet-doPost.md](./doGet-doPost.md)
- [html-service.md](./html-service.md)
- [content-service.md](./content-service.md)
- [client-server-comm.md](./client-server-comm.md)
