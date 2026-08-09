# OAuth Scopes

> **출처**
> - https://developers.google.com/apps-script/concepts/scopes
> - https://developers.google.com/apps-script/manifest
> - https://developers.google.com/apps-script/guides/cloud-platform-projects
> - https://developers.google.com/identity/protocols/oauth2/scopes
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script가 Google 사용자 데이터에 접근하려면 **OAuth 스코프(scope)** 가 필요하다. 스코프는 "어떤 데이터에, 어떤 수준으로 접근하는가"를 명시하는 URL이다. 예: `https://www.googleapis.com/auth/spreadsheets`.

Apps Script는 두 가지 방식으로 스코프를 결정한다.

1. **자동 감지(Automatic detection)** — Apps Script 런타임이 코드를 정적 분석해 사용된 서비스(SpreadsheetApp, GmailApp 등)로부터 필요한 스코프를 추론한다. **기본 동작**.
2. **명시적 선언(Explicit declaration)** — `appsscript.json` 매니페스트의 `oauthScopes` 배열에 직접 명기한다. 자동 감지를 **덮어쓰지** 않으며, 명시한 스코프 집합이 **최종 권한 요청 목록**이 된다.

> **중요**: `oauthScopes`를 한 번이라도 매니페스트에 적으면, 그 이후로는 **자동 감지가 비활성화되고 매니페스트가 권위(authoritative)** 가 된다. 코드에서 새 서비스를 호출해도 매니페스트에 스코프를 추가하지 않으면 권한 오류가 난다.

## 자동 감지 vs 명시적 선언

| 항목 | 자동 감지 | 명시적 선언 (`oauthScopes`) |
|---|---|---|
| 기본 동작 | 활성 | 매니페스트에 적기 전까지 비활성 |
| 권장 시점 | 빠른 프로토타입, 개인 스크립트 | 배포(add-on, web app), 검증(verification) 필요 시 |
| 최소 권한 보장 | 약함 (Apps Script가 보수적으로 잡음) | 강함 (개발자가 직접 좁힘) |
| 코드 변경 시 | 다음 실행에서 재인증 발생 | 매니페스트 수정 + 재인증 필요 |

### 매니페스트 예시

`appsscript.json`:

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

## 자주 쓰는 스코프 목록

> 전체 목록: https://developers.google.com/identity/protocols/oauth2/scopes

### Workspace 데이터

| 스코프 | 설명 | 등급 |
|---|---|---|
| `https://www.googleapis.com/auth/spreadsheets` | 모든 Sheets 읽기/쓰기 | Sensitive |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | 모든 Sheets 읽기 전용 | Sensitive |
| `https://www.googleapis.com/auth/spreadsheets.currentonly` | 컨테이너 바운드 — 현재 시트만 | Non-sensitive |
| `https://www.googleapis.com/auth/documents` | 모든 Docs 읽기/쓰기 | Sensitive |
| `https://www.googleapis.com/auth/documents.currentonly` | 현재 문서만 | Non-sensitive |
| `https://www.googleapis.com/auth/presentations` | 모든 Slides 읽기/쓰기 | Sensitive |
| `https://www.googleapis.com/auth/forms` | 모든 Forms 접근 | Sensitive |
| `https://www.googleapis.com/auth/forms.currentonly` | 현재 폼만 | Non-sensitive |

### Drive

| 스코프 | 설명 | 등급 |
|---|---|---|
| `https://www.googleapis.com/auth/drive` | 모든 Drive 파일 — **광범위, 신중히 사용** | Restricted |
| `https://www.googleapis.com/auth/drive.readonly` | 모든 Drive 읽기 전용 | Restricted |
| `https://www.googleapis.com/auth/drive.file` | 앱이 생성하거나 사용자가 명시적으로 연 파일만 | Non-sensitive |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | 메타데이터만 읽기 | Sensitive |

### Gmail

| 스코프 | 설명 | 등급 |
|---|---|---|
| `https://mail.google.com/` | 모든 Gmail 권한 (legacy, 가장 광범위) | Restricted |
| `https://www.googleapis.com/auth/gmail.readonly` | 메일 읽기 전용 | Restricted |
| `https://www.googleapis.com/auth/gmail.send` | 보내기만 | Sensitive |
| `https://www.googleapis.com/auth/gmail.modify` | 읽기/쓰기/수정 (영구 삭제 제외) | Restricted |
| `https://www.googleapis.com/auth/gmail.compose` | 초안 작성/수정/전송 | Restricted |

### Calendar / Contacts

| 스코프 | 설명 | 등급 |
|---|---|---|
| `https://www.googleapis.com/auth/calendar` | 모든 캘린더 읽기/쓰기 | Sensitive |
| `https://www.googleapis.com/auth/calendar.readonly` | 캘린더 읽기 전용 | Sensitive |
| `https://www.googleapis.com/auth/calendar.events` | 이벤트만 | Sensitive |
| `https://www.googleapis.com/auth/contacts` | 연락처 읽기/쓰기 | Restricted |

### Apps Script 자체

| 스코프 | 설명 |
|---|---|
| `https://www.googleapis.com/auth/script.external_request` | `UrlFetchApp` 사용 |
| `https://www.googleapis.com/auth/script.scriptapp` | 트리거 생성/삭제 (`ScriptApp.newTrigger`) |
| `https://www.googleapis.com/auth/script.storage` | `PropertiesService` |
| `https://www.googleapis.com/auth/script.send_mail` | `MailApp.sendEmail` (제한적) |
| `https://www.googleapis.com/auth/script.container.ui` | UI (Menu, Sidebar, Dialog) |
| `https://www.googleapis.com/auth/script.locale` | `Session.getActiveUserLocale()` |

### 사용자 정보

| 스코프 | 설명 |
|---|---|
| `https://www.googleapis.com/auth/userinfo.email` | `Session.getActiveUser().getEmail()` |
| `https://www.googleapis.com/auth/userinfo.profile` | 이름, 프로필 사진 |
| `openid` | OpenID Connect |

## 스코프 분류: Sensitive vs Restricted vs Non-sensitive

| 분류 | 정의 | 영향 |
|---|---|---|
| **Non-sensitive** | 사용자 데이터에 거의 접근하지 않음 (예: `drive.file`, `*.currentonly`) | 검증 불요, 100명 제한 없음 |
| **Sensitive** | 사용자 데이터 접근 (예: `spreadsheets`, `calendar`) | 외부 배포 시 **OAuth 검증** 필요 |
| **Restricted** | 매우 민감한 데이터 (예: `drive`, `gmail.readonly`) | 검증 + Google API Services User Data Policy 준수 + 보안 평가 가능성 |

> Apps Script의 자체 스코프(`script.*`)는 일반적으로 검증 대상에서 제외되지만, 함께 선언된 Sensitive/Restricted 스코프는 검증을 트리거한다.

## 권한 변경 시 재인증

- `oauthScopes`에 **새 스코프 추가** → 다음 실행 시 사용자에게 OAuth 동의 화면이 다시 뜬다.
- 기존 스코프 **제거** → 즉시 효력. 사용자에게 알리지 않음.
- 자동 감지 모드에서 코드에 **새 서비스 호출 추가** → 동일하게 재동의 필요.
- 사용자는 https://myaccount.google.com/permissions 에서 권한을 직접 취소할 수 있다.

## Cloud Platform 프로젝트: Default vs Standard

Apps Script 프로젝트는 항상 GCP 프로젝트와 연결되어 있다.

| 항목 | Default GCP | Standard GCP |
|---|---|---|
| 생성 | 자동 (스크립트 생성 시) | 사용자가 직접 GCP Console에서 생성 |
| OAuth 동의 화면 | 자동 생성, **편집 불가** | 앱 이름, 로고, ToS URL 등 **편집 가능** |
| OAuth 검증 | **불가능** (외부 배포에 부적합) | 가능 |
| Cloud 로그 보기 | 제한적 | Cloud Logging에서 전체 조회 |
| Advanced Services | 동작 | 동작 (전환 시 재활성화 필요) |
| 공유 | 1:1 (스크립트와 동시 삭제) | 여러 스크립트 공유 가능, 영속적 |
| 되돌리기 | — | **Standard → Default 불가능** |
| Marketplace 게시 | 불가 | 가능 |

### 언제 Standard로 전환하나

- 외부 사용자에게 Add-on / Web App 배포
- OAuth 검증이 필요한 Sensitive/Restricted 스코프 사용
- Google Workspace Marketplace 게시
- Apps Script API의 `scripts.run` 사용
- GCP 로그/오류 보고 통합

### 전환 방법

1. GCP Console에서 새 프로젝트 생성 (또는 기존 프로젝트 사용)
2. Apps Script Editor → **프로젝트 설정** → **Google Cloud Platform (GCP) 프로젝트** → **프로젝트 변경**
3. GCP 프로젝트 번호 입력
4. **모든 사용자가 재인증**해야 함
5. Advanced Services는 새 프로젝트에서 다시 활성화

## Verified app vs Unverified

OAuth 검증을 받지 않은 외부 배포 앱은 다음 제약을 받는다.

| 항목 | Unverified | Verified |
|---|---|---|
| 인증 가능 사용자 수 | **누적 100명** | 무제한 |
| 화면 표시 | "Google hasn't verified this app" 경고 | 정상 동의 화면 |
| 신규 사용자 차단 | 100명 초과 시 신규 사용자 차단 | 없음 |
| Workspace 내부 배포 | 무관 (도메인 내부면 검증 불요) | 무관 |

> 같은 Workspace 도메인 내부에서만 사용한다면 검증이 필요 없다. Workspace 관리자는 내부 앱을 신뢰(trusted)로 마킹할 수 있다.

## 활용 패턴

### 1. 최소 권한 명시 (보안 베스트 프랙티스)

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

→ 현재 시트만 접근, UI만 사용. Drive 전체 권한을 요구하지 않으므로 사용자 신뢰도 상승.

### 2. `@OnlyCurrentDoc` 어노테이션 (자동 감지 좁히기)

JSDoc 형식으로 코드 최상단에 적으면 자동 감지가 `*.currentonly` 스코프로 좁혀진다.

```javascript
/**
 * @OnlyCurrentDoc
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Tools').addToUi();
}
```

### 3. 권한 확인 (런타임)

```javascript
const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
  const url = authInfo.getAuthorizationUrl();
  // 사용자에게 url 안내
}
```

자세한 내용은 [permissions-flow.md](./permissions-flow.md) 참고.

## 주의 / 함정

- **자동 감지의 함정**: 코드 경로상 실행되지 않는 함수의 import도 스코프 감지에 포함된다. 사용하지 않는 서비스 import는 제거할 것.
- **`https://mail.google.com/`** 는 가장 광범위한 Gmail 스코프다. 단순히 메일을 보내는 용도라면 `gmail.send`로 좁힐 것. 둘 다 Restricted라는 점은 동일.
- **`drive` vs `drive.file`**: 가능한 한 `drive.file`을 사용. 사용자가 picker로 직접 연 파일만 접근 가능해 검증 부담이 크게 줄어든다.
- **매니페스트와 자동 감지의 동시 작성 금지에 가까운 권장**: 매니페스트에 `oauthScopes`를 적기 시작했다면, 코드에서 호출하는 모든 서비스의 스코프를 빠짐없이 적어야 한다. 누락 시 `Authorization is required to perform that action`.
- **새 사용자 동의 한도**: Workspace 외부 사용자 web app은 Apps Script가 자체적으로 신규 인증 속도를 제한한다 (정확한 수치 비공개, 공식 페이지 확인 필요).
- **`oauthScopes` 순서**는 동의 화면 순서에 영향을 줄 수 있지만 의미 차이는 없다.
- **Granular permissions**: 2023년 이후 사용자가 동의 화면에서 스코프를 **개별 선택**할 수 있다. 일부만 동의된 상태로 실행될 수 있으므로 `ScriptApp.getAuthorizationInfo(mode, scopes)`로 체크.

## 참고

- https://developers.google.com/apps-script/concepts/scopes
- https://developers.google.com/apps-script/manifest
- https://developers.google.com/apps-script/guides/cloud-platform-projects
- https://developers.google.com/identity/protocols/oauth2/scopes
- https://support.google.com/cloud/answer/9110914 (OAuth 검증)
