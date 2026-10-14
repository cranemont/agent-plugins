# 권한 요청 흐름 (Permissions Flow)

> **출처**
> - https://developers.google.com/apps-script/guides/services/authorization
> - https://developers.google.com/apps-script/reference/script/script-app
> - https://developers.google.com/apps-script/reference/script/auth-mode
> - https://developers.google.com/apps-script/reference/script/authorization-info
> - https://developers.google.com/apps-script/reference/script/authorization-status
> - https://developers.google.com/apps-script/add-ons/concepts/editor-auth-lifecycle
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script는 사용자가 스크립트를 처음 실행할 때 OAuth 동의 화면을 띄운다. 그 흐름은 컨텍스트(에디터/web app/add-on/trigger)에 따라 다르다. 이 문서는 권한 흐름의 단계와 `AuthorizationMode`/`AuthorizationStatus` API로 흐름을 제어하는 방법을 정리한다.

## 권한 흐름 (일반)

1. **스코프 결정** — 자동 감지 또는 `oauthScopes` 매니페스트
2. **권한 상태 확인** — 사용자가 이전에 동의했나? (스코프 단위)
3. **동의 화면(OAuth consent screen)** — 미동의 시 사용자에게 표시
4. **사용자 선택** — 전체 동의 / 일부 동의(granular) / 거절
5. **스크립트 실행 또는 차단**

권한 동의는 **사용자 × 스크립트 × 스코프** 단위로 기록된다. 한 번 동의하면 사용자가 https://myaccount.google.com/permissions 에서 직접 취소할 때까지 유지.

## AuthMode (열거)

`ScriptApp.AuthMode`는 현재 실행이 어떤 권한 컨텍스트인지 나타낸다. 주로 `onOpen(e).authMode`와 `ScriptApp.getAuthorizationInfo(authMode)`에서 사용.

| AuthMode | 의미 | 호출 시점 |
|---|---|---|
| `NONE` | 권한 없음 — 가장 제한적 | Add-on 설치는 됐지만 활성화 안 됨 |
| `LIMITED` | 제한된 권한 | 대부분의 simple trigger (`onOpen`, `onEdit`) |
| `FULL` | 전체 권한 | 사용자가 메뉴 클릭, installable trigger, `onInstall`, `google.script.run`, 에디터 실행 |
| `CUSTOM_FUNCTION` | 사용자 정의 함수 | 시트 셀의 `=MYFUNC()` |

### AuthMode별 사용 가능 서비스 요약

| 서비스 | NONE | LIMITED | FULL | CUSTOM_FUNCTION |
|---|---|---|---|---|
| `Logger`, `console` | ✓ | ✓ | ✓ | ✓ |
| `Utilities` | ✓ | ✓ | ✓ | ✓ |
| `SpreadsheetApp` (메뉴/현재 시트) | 메뉴만 | ✓ | ✓ | 현재 시트만 |
| `PropertiesService` | ✗ | ✓ (제한적) | ✓ | ✗ |
| `UrlFetchApp` | ✗ | ✗ | ✓ | △ (제한적) |
| `MailApp` / `GmailApp` | ✗ | ✗ | ✓ | ✗ |
| 다른 파일 열기 | ✗ | ✗ | ✓ | ✗ |
| UI (Sidebar, Dialog) | ✗ | ✗ | ✓ | ✗ |

## AuthorizationStatus (열거)

`ScriptApp.AuthorizationStatus`는 `AuthorizationInfo.getAuthorizationStatus()` 반환 값.

| Status | 의미 |
|---|---|
| `REQUIRED` | 사용자 권한 필요 (재인증 필요) |
| `NOT_REQUIRED` | 모든 권한이 이미 부여됨 |

## ScriptApp.getAuthorizationInfo()

```javascript
const authInfo = ScriptApp.getAuthorizationInfo(authMode);
// 또는 특정 스코프만 체크
const authInfo = ScriptApp.getAuthorizationInfo(authMode, ['https://www.googleapis.com/auth/calendar']);
```

### 반환 객체: `AuthorizationInfo`

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getAuthorizationStatus()` | `AuthorizationStatus` | 권한 필요 여부 |
| `getAuthorizationUrl()` | `String` | 사용자가 권한 부여할 URL |
| `getAuthorizedScopes()` | `String[]` | 실제로 부여된 OAuth 스코프 목록 |

> `getAuthorizationInfo(authMode)`는 일반적으로 `AuthMode.FULL`로 호출한다. `LIMITED`/`NONE`은 권한 부여가 의미 없는 모드라 status가 항상 `NOT_REQUIRED`다.

## 사용 예: 트리거 만료 알림 (대표 패턴)

시간 트리거가 권한 갱신 없이 6개월이 지나면 비활성화될 수 있다. 사전에 사용자에게 알림.

```javascript
function checkAuth() {
  const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);

  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    const template = HtmlService.createTemplate(
      '<p>스크립트가 더 이상 정상 작동하지 않습니다.</p>' +
      '<p><a href="<?= url ?>" target="_blank">권한 재부여</a></p>'
    );
    template.url = authInfo.getAuthorizationUrl();
    const message = template.evaluate().getContent();

    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: '스크립트 재인증 필요',
      htmlBody: message,
    });
  }
}
```

## Granular permissions 대응

2023년 이후 OAuth 동의 화면에서 사용자가 **스코프를 개별 선택**할 수 있다. 일부만 동의된 상태로 스크립트가 실행될 수 있으므로, 특정 기능 시작 전에 해당 스코프의 동의를 확인해야 한다.

```javascript
function runReport() {
  const authInfo = ScriptApp.getAuthorizationInfo(
    ScriptApp.AuthMode.FULL,
    ['https://www.googleapis.com/auth/calendar.readonly']
  );

  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '권한 부족',
      '캘린더 읽기 권한이 필요합니다.\n다음 URL에서 권한을 부여하세요:\n' + authInfo.getAuthorizationUrl(),
      ui.ButtonSet.OK
    );
    return;
  }

  // 권한 OK, 작업 진행
  const events = CalendarApp.getEvents(new Date(), new Date());
}
```

### Add-on에서 (CardService)

Workspace add-on은 `CardService.newAuthorizationException()`을 던져 카드 UI로 권한 재요청 흐름을 트리거할 수 있다.

```javascript
function someAction() {
  const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    throw CardService.newAuthorizationException()
      .setAuthorizationUrl(authInfo.getAuthorizationUrl())
      .setResourceDisplayName('Calendar')
      .throwException();
  }
  // ...
}
```

## 첫 실행 OAuth 화면 흐름

### 사용자가 직접 실행 (에디터)

1. 에디터에서 함수 실행 클릭
2. "Authorization required" 다이얼로그
3. 계정 선택
4. (Default GCP 프로젝트면) "Google hasn't verified this app" 경고 → "Advanced" → "Go to {script name} (unsafe)"
5. 스코프 목록 표시 → 개별 체크 (granular)
6. "Allow" → 실행

### Web app — Execute as me

- 소유자가 이미 권한 부여된 상태로 배포
- 외부 사용자는 별도 동의 불요 (소유자 권한으로 실행)

### Web app — Execute as user accessing

- 사용자가 첫 접근 시 동의 화면
- 소유자의 이메일이 화면에 노출됨

### Installable trigger

- **트리거를 만드는 사람**이 동의 화면 통과
- 이후 트리거는 그 사람의 권한으로 자동 실행

### Add-on

- 사용자가 Marketplace에서 설치 → `onInstall(e)` 실행 (`AuthMode.FULL`)
- 첫 사용 시 추가 권한 동의 가능 (granular)

## onOpen(e)에서 권한 안전 처리

```javascript
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Tools');

  // e가 없는 경우 (직접 실행) FULL로 가정
  const authMode = (e && e.authMode) || ScriptApp.AuthMode.FULL;

  if (authMode === ScriptApp.AuthMode.NONE) {
    menu.addItem('Activate', 'activate');
  } else {
    menu
      .addItem('Run report', 'runReport')
      .addItem('Settings', 'showSettings');
  }
  menu.addToUi();
}

function activate() {
  // 사용자가 클릭 → AuthMode.FULL
  // 권한이 자동으로 부여됨
  SpreadsheetApp.getUi().alert('Activated.');
}
```

## 권한 흐름 의사결정 트리

```
스크립트 실행 시작
  │
  ├─ AuthMode 확인 (e.authMode 또는 컨텍스트로 추론)
  │   ├─ NONE      → 메뉴/로그만, 다른 작업 불가
  │   ├─ LIMITED   → 현재 문서/로케일만
  │   ├─ FULL      → 전체 사용 가능
  │   └─ CUSTOM_FN → 매우 제한
  │
  ├─ 필요 스코프 보유?
  │   ├─ ScriptApp.getAuthorizationInfo(FULL, [scopes])
  │   │   ├─ NOT_REQUIRED → 진행
  │   │   └─ REQUIRED     → getAuthorizationUrl() 사용자에게 안내
  │   │
  └─ 작업 수행 → 실패 시 try/catch
```

## 주의 / 함정

- **`getAuthorizationInfo()`는 호출 자체에 스코프가 필요 없다**. 권한 부족 상태에서도 호출 가능.
- **`LIMITED`/`NONE`에서는 `getAuthorizationStatus()`가 항상 `NOT_REQUIRED`** 를 반환 (그 모드에서 가능한 것만 보기 때문). 의미 있는 체크는 `FULL`로.
- **트리거 비활성화**: Google은 사용자가 6개월 이상 스크립트와 상호작용 없으면 시간 트리거를 자동 비활성화할 수 있다 (정확한 기준은 공식 페이지 확인 필요). `checkAuth()` 같은 주기적 점검 필수.
- **재인증 빈도**: "Apps Script does not enforce the re-authentication frequency configured in Google Cloud service settings"(공식). 자동 트리거는 별도 정책.
- **Granular의 함정**: 매니페스트에 5개 스코프를 적어도 사용자는 3개만 체크할 수 있다. 부분 동의 상태 처리 안 하면 런타임 예외.
- **OAuth URL 캐싱 금지**: `getAuthorizationUrl()`이 반환하는 URL은 일회성/단기 유효. 저장하지 말 것.
- **글로벌 스코프 함정**: 전역에서 `SpreadsheetApp.getActive()` 같은 호출이 있으면 `NONE` 모드에서 `onOpen`이 통째로 실패해 메뉴가 안 뜬다.
- **Custom function**에서는 `getAuthorizationInfo()`도 사용 불가에 가깝다. `CUSTOM_FUNCTION` 모드는 인증 흐름과 분리됨.
- **`onInstall(e)`** 은 add-on 설치 시 `AuthMode.FULL`로 1회 실행. 초기 설정 코드를 여기 둔다.

## 참고

- https://developers.google.com/apps-script/guides/services/authorization
- https://developers.google.com/apps-script/reference/script/script-app
- https://developers.google.com/apps-script/reference/script/auth-mode
- https://developers.google.com/apps-script/reference/script/authorization-info
- https://developers.google.com/apps-script/reference/script/authorization-status
- https://developers.google.com/apps-script/add-ons/concepts/editor-auth-lifecycle
