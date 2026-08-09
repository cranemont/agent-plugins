# appsscript.json 매니페스트 레퍼런스

> **출처**
> - https://developers.google.com/apps-script/manifest
> - https://developers.google.com/apps-script/concepts/manifests
> - https://developers.google.com/apps-script/manifest/dependencies
> - https://developers.google.com/apps-script/manifest/web-app-api-executable
> - https://developers.google.com/apps-script/manifest/addons
> - https://developers.google.com/apps-script/concepts/scopes
>
> **최종 확인일**: 2026-07-22

## 개요

`appsscript.json`은 Apps Script 프로젝트의 매니페스트 파일이다. 시간대, 사용 라이브러리, 활성화된 advanced services, OAuth 스코프, URL fetch 화이트리스트, web app/executable/add-on 배포 설정 등 프로젝트의 거의 모든 메타데이터가 여기에 모인다. Apps Script가 자동으로 생성·갱신하지만, 일부 필드(특히 OAuth 스코프, web app 설정, add-on 설정)는 직접 편집해야 한다.

매니페스트는 기본적으로 에디터에 **숨겨져 있다**. **Project Settings > "Show 'appsscript.json' manifest file in editor"** 체크박스를 켜야 파일 목록에 노출된다. 공식 권고: "Hide the manifest when you are done editing." 그리고 "A poorly defined manifest can prevent you from saving a versioned deployment."

## 최소 매니페스트 예제

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

이 네 필드는 새 프로젝트에 자동 생성된다.

## 최상위 필드 전체 목록

공식 [Manifest structure](https://developers.google.com/apps-script/manifest)에 정의된 최상위 필드.

| 필드 | 타입 | 설명 |
|------|------|------|
| `timeZone` | string | 스크립트 실행 시간대. ZoneId 형식(예: `America/Denver`, `Asia/Seoul`). |
| `dependencies` | object | 사용 라이브러리(`libraries`)와 활성화된 advanced services(`enabledAdvancedServices`) 정의. |
| `exceptionLogging` | string | 예외 로그 위치. `NONE` 또는 `STACKDRIVER`. |
| `runtimeVersion` | string | JS 런타임. `V8`, `STABLE`, `DEPRECATED_ES5`. |
| `oauthScopes` | string[] | 프로젝트가 요구하는 OAuth 스코프 URL 목록. |
| `urlFetchWhitelist` | string[] | `UrlFetchApp` 호출이 일치해야 하는 HTTPS URL 접두어 목록. |
| `webapp` | object | Web app 배포 설정. |
| `executionApi` | object | Apps Script API 실행(executable) 배포 설정. |
| `addOns` | object | Workspace add-on 설정 (common + host별 설정). |
| `sheets` | object | Sheets 매크로 리소스 설정. |
| `chat` | object | Google Chat 앱 설정. 새 Chat 앱은 빈 객체로 두고 `addOns.chat`을 사용하라는 것이 공식 권고. |
| `dataStudio` | object | Looker Studio(구 Data Studio) 커넥터 전용 필드. 일반 manifest 레퍼런스에는 없고 커넥터 프로젝트에서만 사용. |

> Sites 등 일부 도메인별 설정은 시점에 따라 새 필드가 추가/이동될 수 있다. 정확한 최신 목록은 항상 [공식 Manifest structure](https://developers.google.com/apps-script/manifest) 페이지를 우선 확인할 것.

---

## 필드별 상세

### `timeZone`

ZoneId 형식의 시간대 문자열. Apps Script가 시간 기반 트리거 시각, `Utilities.formatDate` 기본 시간대 등에 사용한다.

```json
{ "timeZone": "Asia/Seoul" }
```

- `Date.now()`처럼 UTC epoch 값은 시간대 영향 없음. 영향 받는 것은 **포매팅·트리거 시각·시간 기반 비교**다.
- 함수 단위로 다른 시간대를 쓰려면 `Utilities.formatDate(new Date(), 'UTC', ...)`처럼 명시.

---

### `runtimeVersion`

| 값 | 의미 |
|----|------|
| `V8` | 현재 권장 런타임 |
| `STABLE` | 기본 런타임. 공식 레퍼런스 표기는 "currently Rhino". 신규 프로젝트 기본은 V8이나, V8 보장을 원하면 `V8` 명시 권장 |
| `DEPRECATED_ES5` | 옛 Rhino ES5 (deprecated) |

자세한 내용은 `runtime-v8.md` 참고.

---

### `exceptionLogging`

| 값 | 의미 |
|----|------|
| `STACKDRIVER` | Cloud Logging(구 Stackdriver)으로 예외 전송 (기본 권장) |
| `NONE` | 예외 자동 로깅 비활성화 |

`STACKDRIVER`를 설정하면 `console.log`, `console.error`, 미처리 예외가 GCP Cloud Logging에 기록된다.

---

### `dependencies`

```json
{
  "dependencies": {
    "libraries": [
      {
        "userSymbol": "MyLib",
        "libraryId": "1AbCDefGhIJklmNoPQRstuVWxyz0123456789",
        "version": "7",
        "developmentMode": false
      }
    ],
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v3"
      }
    ]
  }
}
```

#### `libraries[]` 필드

| 필드 | 설명 |
|------|------|
| `libraryId` | 라이브러리 프로젝트의 script ID. 프로젝트 URL이나 Project Settings에서 확인. |
| `userSymbol` | 현재 스크립트 코드에서 라이브러리를 참조할 식별자(예: `MyLib.run()`). |
| `version` | 사용 버전 번호 또는 `"stable"`. |
| `developmentMode` | `true`이면 `version`을 무시하고 라이브러리의 **현재 헤드 코드**를 사용. 개발 중에만 사용. |

#### `enabledAdvancedServices[]` 필드

| 필드 | 설명 |
|------|------|
| `userSymbol` | 코드에서 서비스에 접근할 식별자(예: `Drive`). |
| `serviceId` | API discovery 문서의 서비스 ID(예: `drive`, `calendar`, `bigquery`). |
| `version` | API 버전(예: `v3`, `v1`). |

Advanced service를 매니페스트에만 등록하면 안 되고, **GCP 프로젝트에서도 해당 API를 활성화**해야 한다 (Cloud Console 또는 Apps Script가 연결된 GCP 프로젝트).

---

### `oauthScopes`

프로젝트가 요청할 OAuth 스코프를 명시한다. 명시하지 않으면 Apps Script가 자동 감지하지만, **published add-on, web app, Chat app, Chat API 호출에는 명시적 선언이 필수**다.

공식 권고: "Always use the least permissive scope set possible."

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

자주 쓰이는 스코프(예시):

| 스코프 | 용도 |
|--------|------|
| `https://www.googleapis.com/auth/spreadsheets` | Sheets 읽기/쓰기 |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | Sheets 읽기 전용 |
| `https://www.googleapis.com/auth/documents` | Docs 읽기/쓰기 |
| `https://www.googleapis.com/auth/drive` | Drive 전체 |
| `https://www.googleapis.com/auth/drive.file` | 앱이 만든/연 파일만 |
| `https://mail.google.com/` | Gmail 전체 (sensitive/restricted) |
| `https://www.googleapis.com/auth/gmail.send` | Gmail 발신만 |
| `https://www.googleapis.com/auth/calendar` | Calendar 읽기/쓰기 |
| `https://www.googleapis.com/auth/script.external_request` | `UrlFetchApp` 사용 |
| `https://www.googleapis.com/auth/script.scriptapp` | 트리거 관리 |
| `https://www.googleapis.com/auth/userinfo.email` | 현재 사용자 이메일 |

**Sensitive / Restricted 스코프**는 게시(publishing) 전 Google OAuth 검수가 필요하다. 정확한 분류는 [scopes 가이드](https://developers.google.com/apps-script/concepts/scopes) 참고.

---

### `urlFetchWhitelist`

`UrlFetchApp.fetch()`가 호출할 수 있는 **HTTPS URL 접두어** 목록. 게시된 add-on에서 외부 호출 범위를 제한해 보안·검수 통과를 돕는다.

```json
{
  "urlFetchWhitelist": [
    "https://api.example.com/",
    "https://hooks.slack.com/services/"
  ]
}
```

- 모든 URL은 **HTTPS**여야 한다.
- 접두어 매칭이므로 끝의 `/`까지 정확히 일치하도록 작성.
- 미설정 시 자유롭게 호출 가능 (단, 마켓플레이스 게시 add-on은 명시 권장).

---

### `webapp`

Web app 배포 설정. `doGet(e)` / `doPost(e)`를 노출할 때 사용.

```json
{
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_DEPLOYING"
  }
}
```

#### `access` (string)

| 값 | 의미 |
|----|------|
| `MYSELF` | 배포한 본인만 |
| `DOMAIN` | 동일 Workspace 도메인 사용자 |
| `ANYONE` | 누구나(단, Google 계정 로그인 필요) |
| `ANYONE_ANONYMOUS` | 누구나(로그인 없이도) |

#### `executeAs` (string)

| 값 | 의미 |
|----|------|
| `USER_DEPLOYING` | 배포자의 권한·계정으로 실행. 호출자는 로그인되지 않아도 됨. |
| `USER_ACCESSING` | 호출자(접속자)의 권한·계정으로 실행. 사용자별 데이터 처리에 적합. |

> `executeAs: USER_DEPLOYING`은 강력한 권한 위임이다. 배포자의 Drive·Gmail 권한이 모든 호출자에 노출될 수 있으므로 보호 로직 필수.

---

### `executionApi`

Apps Script API의 `scripts.run`으로 외부에서 함수를 호출할 수 있게 하는 executable 배포 설정.

```json
{
  "executionApi": {
    "access": "DOMAIN"
  }
}
```

#### `access` (string)

`webapp.access`와 동일한 enum: `MYSELF`, `DOMAIN`, `ANYONE`, `ANYONE_ANONYMOUS`.

`webapp`과 달리 `executeAs`는 없다 — API executable은 항상 **호출 자격증명의 사용자**로 실행된다.

---

### `addOns`

Workspace add-on(Gmail / Calendar / Drive / Docs / Sheets / Slides / Meet / Chat)의 설정 컨테이너.

```json
{
  "addOns": {
    "common": {
      "name": "My Add-on",
      "logoUrl": "https://example.com/icon.png",
      "homepageTrigger": { "runFunction": "onHomepage" },
      "layoutProperties": {
        "primaryColor": "#3367d6",
        "secondaryColor": "#1a73e8"
      },
      "openLinkUrlPrefixes": ["https://example.com/"],
      "universalActions": [
        { "label": "Settings", "openLink": "https://example.com/settings" }
      ],
      "useLocaleFromApp": true
    },
    "gmail": { /* Gmail add-on 전용 트리거·UI */ },
    "calendar": { /* ... */ },
    "drive": { /* ... */ },
    "docs": { /* ... */ },
    "sheets": { /* ... */ },
    "slides": { /* ... */ },
    "meet": { /* ... */ },
    "chat": { /* Chat app 전용 */ }
  }
}
```

#### `addOns.common` 핵심 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | ✅ | 툴바에 표시되는 add-on 이름 |
| `logoUrl` | ✅ | 툴바 아이콘의 공개 HTTPS URL |
| `homepageTrigger` | | 홈페이지 카드를 생성하는 함수(`runFunction`) |
| `layoutProperties` | | `primaryColor`(기본 `#424242`), `secondaryColor`(기본은 primary 또는 `#2196F3`) |
| `openLinkUrlPrefixes` | | 외부 링크가 허용되는 HTTPS 접두어 목록 |
| `universalActions[]` | | 메뉴/툴바 어디서나 노출되는 액션. `label`(필수), `openLink` 또는 `runFunction` 중 하나 필요. |
| `useLocaleFromApp` | | `true`로 두면 사용자의 locale·timezone이 이벤트 객체에 포함됨 |

host별 섹션(`gmail`, `calendar`, ...) 각각의 세부 필드는 [공식 addons 매니페스트 문서](https://developers.google.com/apps-script/manifest/addons)에서 확인. 호스트마다 트리거 종류와 컨텍스트 객체가 달라 별도 문서를 참조해야 한다.

---

### `sheets`

Sheets 매크로 리소스 정의. 보통은 에디터의 **Macros > Manage macros** UI를 통해 자동 갱신되므로 직접 편집할 일은 드물다.

```json
{
  "sheets": {
    "macros": [
      { "menuName": "FormatReport", "functionName": "formatReport", "defaultShortcut": "Ctrl+Alt+Shift+1" }
    ]
  }
}
```

---

### `chat`

Google Chat 앱 설정. 신규 Chat 앱은 빈 객체로 두고 `addOns.chat`을 채우라는 것이 공식 권고:

```json
{ "chat": {} }
```

---

### `dataStudio`

Looker Studio(구 Data Studio) 커넥터 메타데이터. 커넥터 이름/제작사/지원 URL 등 마켓플레이스 게시 정보가 들어간다. 정확한 필드는 [Looker Studio 커넥터 문서](https://developers.google.com/looker-studio/connector/reference)에서 확인 필요.

---

## 종합 예제

전형적인 Sheets 자동화 + 외부 API 호출 web app 매니페스트:

```json
{
  "timeZone": "Asia/Seoul",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "dependencies": {
    "enabledAdvancedServices": [
      { "userSymbol": "Drive", "serviceId": "drive", "version": "v3" }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "urlFetchWhitelist": [
    "https://api.example.com/"
  ],
  "webapp": {
    "access": "DOMAIN",
    "executeAs": "USER_ACCESSING"
  }
}
```

## 주의사항 / 함정

- **매니페스트는 기본 숨김**. Project Settings에서 가시화한 뒤 편집하라.
- **잘못된 매니페스트는 배포 실패의 원인.** 공식 문장: "A poorly defined manifest can prevent you from saving a versioned deployment."
- **`oauthScopes`를 명시하면 자동 감지가 꺼진다.** 누락된 스코프가 있으면 런타임 권한 오류로 이어진다. 추가 API를 쓰기 시작했다면 매니페스트도 함께 업데이트.
- **`urlFetchWhitelist`는 접두어 매칭**이므로 동적 URL을 다 커버하지 못하면 호출이 차단된다.
- **`executeAs: USER_DEPLOYING` + `access: ANYONE_ANONYMOUS`** 조합은 사실상 익명 사용자에게 배포자의 Drive 권한을 위임하는 셈이다. 의도된 경우가 아니라면 절대 사용하지 말 것.
- **Advanced services는 두 번 활성화 필요**: 매니페스트 `enabledAdvancedServices` + GCP 프로젝트에서 해당 API 활성화.
- **`chat`과 `addOns.chat` 혼선**: 신규 Chat 앱은 `addOns.chat`을 사용하고, 최상위 `chat`은 빈 객체로 두는 것이 공식 권고.
- **변경 즉시 적용 아님**: web app·executable의 `webapp` / `executionApi` / `oauthScopes` 변경은 **새 버전을 배포해야** 라이브 환경에 반영된다.

## 참고

- https://developers.google.com/apps-script/manifest
- https://developers.google.com/apps-script/concepts/manifests
- https://developers.google.com/apps-script/manifest/dependencies
- https://developers.google.com/apps-script/manifest/web-app-api-executable
- https://developers.google.com/apps-script/manifest/addons
- https://developers.google.com/apps-script/concepts/scopes
