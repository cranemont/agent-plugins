# 실행 컨텍스트 (Execution Context)

> **출처**
> - https://developers.google.com/apps-script/reference/base/session
> - https://developers.google.com/apps-script/guides/web
> - https://developers.google.com/apps-script/guides/triggers
> - https://developers.google.com/apps-script/guides/triggers/installable
> - https://developers.google.com/apps-script/guides/services/authorization
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script에서 "**누가**(어떤 Google 계정으로) 코드를 실행하는가"는 항상 명확하지 않다. 같은 코드라도 web app으로 호출됐는지, 트리거로 호출됐는지, 에디터에서 직접 실행됐는지에 따라 실행 주체가 다르다. 이를 이해해야 권한·할당량·로그가 어디로 귀속되는지 파악할 수 있다.

핵심 개념 두 가지:

- **Active user**: 현재 스크립트와 상호작용 중인 사람 (UI 클릭, web app 요청자 등)
- **Effective user**: 스크립트가 실제로 어떤 계정의 권한으로 실행되는가 (API 호출 시 적용되는 신원)

## Session API: Active vs Effective

```javascript
const active = Session.getActiveUser();      // User object
const effective = Session.getEffectiveUser(); // User object
const tz = Session.getScriptTimeZone();
const locale = Session.getActiveUserLocale();
const key = Session.getTemporaryActiveUserKey(); // 30일마다 회전하는 익명 ID
```

`User.getEmail()`은 권한 컨텍스트에 따라 빈 문자열을 반환할 수 있다.

### Email 노출 매트릭스

| 시나리오 | `getActiveUser().getEmail()` | `getEffectiveUser().getEmail()` |
|---|---|---|
| 개발자가 에디터에서 직접 실행 | 본인 이메일 | 본인 이메일 |
| 같은 Workspace 도메인 사용자가 실행 | 사용자 이메일 | (web app 설정에 따라) |
| 외부(다른 도메인) 사용자 | **빈 문자열** | (web app 설정에 따라) |
| Simple trigger (`onOpen`, `onEdit`) | **빈 문자열** | 문서 소유자 |
| Custom function (`=MYFUNC(A1)`) | **빈 문자열** | 시트 사용자 |
| Web app — "Execute as me" | (외부 사용자면 빈 문자열) | 스크립트 소유자 |
| Web app — "Execute as user accessing" | 사용자 이메일 | 사용자 이메일 |
| Installable trigger | 빈 문자열 가능 | **트리거 생성자** |
| Add-on, `AuthMode.LIMITED` | 제한적 | 호출자 |

> `getActiveUser()`가 빈 문자열을 반환하는 정확한 조건은 권한 + 동일 도메인 여부 + 컨텍스트의 조합이다. 항상 `if (email)` 체크 필요.

## Web App "Execute as" 옵션

배포 시 두 가지 옵션을 선택한다.

### Execute as **me** (스크립트 소유자)

- 모든 요청이 **소유자의 권한·할당량**으로 실행됨
- 외부 사용자도 소유자의 Drive/Gmail/Sheets에 접근 가능 (소유자가 노출하는 만큼)
- 사용자 인증 부담 없음
- **위험**: `ScriptApp.getOAuthToken()`을 클라이언트로 노출하면 안 됨 — 소유자 전체 권한이 새어나감
- 사용 사례: 공용 데이터 조회, 폼 처리, 백오피스 자동화

### Execute as **user accessing the web app**

- 각 요청은 **요청한 사용자의 권한·할당량**으로 실행됨
- 사용자별 OAuth 동의 필요 (첫 접근 시)
- 사용자 본인의 데이터(개인 Drive 등)에 접근 가능
- Apps Script가 신규 사용자 인증 속도를 제한 (특히 Workspace 외부)
- 사용 사례: 사용자별 데이터 대시보드, 개인화된 도구

### Who has access (접근 권한)

| 옵션 | 의미 |
|---|---|
| Only myself | 소유자만 |
| Anyone with Google account | 로그인된 누구나 |
| Anyone | 익명 허용 (`getActiveUser()` 빈 문자열) |
| Anyone within {도메인} | Workspace 도메인 내부만 |

### 보안 요약 표

| Execute as | Who has access | Active user email | Effective user email | 권한 출처 |
|---|---|---|---|---|
| me | Anyone | 빈 문자열 | 소유자 | 소유자 |
| me | Anyone within domain | 도메인 내부면 노출 | 소유자 | 소유자 |
| User accessing | Anyone with Google account | 사용자 | 사용자 | 사용자 |
| User accessing | Anyone within domain | 사용자 | 사용자 | 사용자 |

## Trigger 실행 컨텍스트

### Simple triggers — `onOpen(e)`, `onEdit(e)`, `onSelectionChange(e)`, `doGet(e)`, `doPost(e)`

| 항목 | 내용 |
|---|---|
| 실행 계정 | 파일을 사용 중인 사용자 (이벤트 발생자) |
| 권한 | **제한적** — 권한이 필요한 서비스 호출 시 실패 |
| 사용 가능 서비스 | `SpreadsheetApp` (현재 시트), `Logger`, `Utilities`, `console` |
| 사용 불가 | `UrlFetchApp`, `MailApp`, `GmailApp`, 외부 파일 접근 등 |
| `getActiveUser().getEmail()` | 빈 문자열 (외부 도메인이면) |
| `getEffectiveUser().getEmail()` | 시트 소유자 |
| `e.authMode` | `LIMITED` 또는 `NONE` |

### Installable triggers (시간 기반, edit, form submit 등)

| 항목 | 내용 |
|---|---|
| 실행 계정 | **트리거를 만든 사람** (사용자가 누구든 무관) |
| 권한 | `FULL` — 모든 서비스 사용 가능 |
| `getEffectiveUser()` | **트리거 생성자** |
| 할당량 귀속 | 트리거 생성자 |
| 최대 개수 | 사용자당 스크립트당 **20개** |
| 최소 간격 | 시간 기반 트리거 1분 (Add-on은 1시간) |
| API 호출로 트리거됨? | **아니오** — 스크립트가 다른 스크립트를 호출해도 트리거 발화 안 됨 |

> **함정**: A가 만든 시간 트리거가 B의 시트를 수정해도 "최근 수정자"는 A가 된다. 다중 사용자 환경에서 디버깅 시 혼란 주의.

### Custom functions (`=MYFUNC()`)

| 항목 | 내용 |
|---|---|
| 실행 계정 | 익명 (effective user 없음) |
| 권한 | `AuthMode.CUSTOM_FUNCTION` — 매우 제한적 |
| 사용 불가 | `UrlFetchApp`(일부 가능), `MailApp`, 사용자 데이터, 외부 API 인증 |
| 런타임 한계 | **30초** |
| 캐시 | 결과를 시트에 캐싱 (인자가 같으면 재실행 안 함) |

## Add-on / AuthMode

`onOpen(e)` 같은 simple trigger의 `e.authMode`로 현재 권한 수준을 알 수 있다.

| AuthMode | 트리거 컨텍스트 | 사용 가능 서비스 |
|---|---|---|
| `NONE` | 설치만 됐고 활성화 안 됨 | 메뉴 추가, `Logger`, `Utilities`만 |
| `LIMITED` | `onOpen`/`onEdit` 등 simple trigger 일반 | 메뉴, 현재 문서 R/W, 로케일 |
| `FULL` | 사용자가 메뉴 클릭, `onInstall`, installable trigger, `google.script.run` | 전체 권한 |
| `CUSTOM_FUNCTION` | `=MYFUNC()` 호출 | 매우 제한 |

```javascript
function onOpen(e) {
  const menu = SpreadsheetApp.getUi().createMenu('Tools');
  if (e && e.authMode === ScriptApp.AuthMode.LIMITED) {
    menu.addItem('Enable advanced features', 'enableAdvanced');
  } else {
    menu.addItem('Run report', 'runReport');
  }
  menu.addToUi();
}
```

> **글로벌 코드의 함정**: AuthMode에 허용되지 않은 서비스를 **전역 스코프**에서 호출하면 전체 스크립트 로딩이 실패한다 (메뉴조차 안 뜸). 권한 필요 호출은 반드시 함수 내부로.

## 패턴: 실행 컨텍스트 확인

### 패턴 1: 누구로 실행 중인지 로깅

```javascript
function whoAmI() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  console.log({ active: active || '(empty)', effective });
  return { active, effective };
}
```

### 패턴 2: Web app에서 익명 사용자 거르기

```javascript
function doGet(e) {
  const email = Session.getActiveUser().getEmail();
  if (!email) {
    return HtmlService.createHtmlOutput('Sign in with a Workspace account.');
  }
  return HtmlService.createHtmlOutputFromFile('app');
}
```

> **주의**: `Execute as me` + `Anyone` 배포에서는 외부 사용자 이메일이 빈 문자열이다. 사용자 식별이 필요하면 `Execute as user accessing`로 배포.

### 패턴 3: 트리거 안전 호출

```javascript
function safeTriggerHandler() {
  try {
    // installable trigger는 트리거 생성자 권한이므로 모든 서비스 사용 가능
    const sheet = SpreadsheetApp.openById('...');
    UrlFetchApp.fetch('https://api.example.com');
  } catch (err) {
    // 트리거 생성자에게 에러 메일
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Trigger failed', err.stack);
  }
}
```

### 패턴 4: 임시 사용자 키 (PII 회피)

`getTemporaryActiveUserKey()`는 30일마다 회전하는 사용자 식별자. 이메일을 저장하지 않고 사용자 단위 통계를 낼 때 유용.

```javascript
function trackUsage() {
  const key = Session.getTemporaryActiveUserKey();
  const cache = CacheService.getScriptCache();
  cache.put(`usage:${key}`, '1', 600);
}
```

## 주의 / 함정

- **Web app `Execute as me` + `UrlFetchApp`**: 외부 API 호출도 소유자 IP/계정으로 나간다. 사용자별 분리가 필요하면 OAuth 라이브러리로 별도 토큰 관리.
- **OAuth 토큰 누출 금지**: `ScriptApp.getOAuthToken()`은 소유자 토큰이다. 클라이언트(HTML)로 넘기면 소유자 모든 권한이 노출됨. 항상 서버사이드에서만 사용.
- **`onEdit` simple trigger에서 메일 보내기 불가능**: simple trigger는 권한 부족. installable `onEdit` 트리거를 만들어야 함.
- **할당량은 effective user에게 귀속**: web app `Execute as me`로 1만 사용자가 동시에 메일 보내면 소유자 1일 메일 quota가 즉시 소진됨.
- **트리거 생성 계정 확인**: 다른 사람이 만든 스크립트의 트리거를 내가 직접 만들면, 트리거는 **내** 권한으로 돈다. 코드 작성자 ≠ 트리거 실행자일 수 있다.
- **Shared Drive 위 스크립트**: 소유자가 없어서 `Execute as me`가 "배포한 사용자"가 된다.
- **Simple trigger는 인증 동의 화면을 띄울 수 없다**: 권한이 필요한 작업은 사용자가 메뉴를 클릭하는 시점(`FULL` mode)에 수행.
- **`Session.getActiveUserLocale()`** 사용 시 `script.locale` 스코프 필요.

## 참고

- https://developers.google.com/apps-script/reference/base/session
- https://developers.google.com/apps-script/guides/web#deploying_web_apps
- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/guides/services/authorization
- https://developers.google.com/apps-script/add-ons/concepts/editor-auth-lifecycle
