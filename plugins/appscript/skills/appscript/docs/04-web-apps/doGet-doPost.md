# doGet / doPost — Web App 진입점

> **출처**
> - https://developers.google.com/apps-script/guides/web
> - https://developers.google.com/apps-script/concepts/deployments
> - https://developers.google.com/apps-script/reference/content/content-service
> - https://developers.google.com/apps-script/reference/html/html-service
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script 프로젝트는 두 가지 진입점 함수 — **`doGet(e)`** 와 **`doPost(e)`** — 를 정의하고 **Web App**으로 배포하면 외부에서 HTTP로 호출되는 서비스가 된다.

공식 문서가 명시한 요구 조건:

> *"It contains a `doGet` or `doPost` function. The function returns an `HtmlOutput` object or a `TextOutput` object."*

즉:

1. 함수 이름은 정확히 `doGet` 또는 `doPost`.
2. 반환값은 **`HtmlOutput`(HtmlService)** 또는 **`TextOutput`(ContentService)** 둘 중 하나.
3. Web app으로 **배포**되어야 한다([deployment.md](./deployment.md)).

배포 후 두 가지 URL이 생긴다:

- **`/exec`** — 배포된 버전. 공개 URL.
- **`/dev`** — HEAD(최신 저장 코드). 편집자만 접근 가능. 테스트용.

## 함수 시그니처

```javascript
function doGet(e) {
  return HtmlService.createHtmlOutput("<h1>Hello</h1>");
}

function doPost(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

`e`는 요청 정보를 담은 이벤트 객체다.

## 이벤트 객체 `e`

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| `e.queryString` | `string \| null` | URL의 쿼리스트링 원본 (예: `"name=alice&age=20"`). 없으면 `null`. |
| `e.parameter` | `Object<string, string>` | 쿼리/폼 파라미터. **중복 키는 첫 번째 값만** 사용. |
| `e.parameters` | `Object<string, string[]>` | 중복 키도 배열로 받음 (예: `?id=1&id=2` → `{ id: ["1","2"] }`). |
| `e.pathInfo` | `string` | `/exec` 또는 `/dev` **이후의 path 부분**. |
| `e.contextPath` | `string` | 사용되지 않음(빈 문자열). 호환용. |
| `e.contentLength` | `number` | POST body 길이. GET은 `-1`. |
| `e.postData.type` | `string` | POST body의 MIME 타입 (예: `"application/json"`). |
| `e.postData.length` | `number` | POST body 길이. |
| `e.postData.contents` | `string` | POST body의 raw 문자열 본문. |
| `e.postData.name` | `string` | 일반적으로 `"postData"` 고정. |

> **예약 파라미터**: 공식 문서가 명시한다 — *"`c`와 `sid`는 사용하지 말 것. HTTP 405 오류를 유발할 수 있다."*

### 쿼리 예시

요청: `GET /exec?lang=ko&tag=ai&tag=ml`

```javascript
e.parameter   // { lang: "ko", tag: "ai" }              ← 첫 번째 값만
e.parameters  // { lang: ["ko"], tag: ["ai", "ml"] }    ← 배열
e.queryString // "lang=ko&tag=ai&tag=ml"
e.pathInfo    // ""
```

### `e.pathInfo` 예시

요청: `GET /exec/users/42/profile?expand=full`

```javascript
e.pathInfo    // "users/42/profile"  (앞 슬래시 없음)
e.parameter   // { expand: "full" }
```

## 반환값

### `HtmlOutput` (HTML 응답)

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("My App")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
```

### `TextOutput` (JSON/CSV/XML 등)

```javascript
function doGet(e) {
  const data = { hello: "world" };
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**그 외 반환 타입은 허용되지 않는다.** `String`을 반환하면 오류, JSON 객체를 그대로 반환해도 오류.

## 라우팅 패턴

Apps Script Web App은 path 기반 라우팅이 약하다(`/exec/users/42` 형태는 가능하지만 URL이 길어지고 캐싱 문제가 있다). 일반적으로 **`?action=...`** 쿼리 파라미터로 라우팅한다.

### 패턴 1: 단순 action dispatch

```javascript
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "home";
  switch (action) {
    case "home":
      return render("Home", { user: Session.getActiveUser().getEmail() });
    case "search":
      return jsonResponse(search(e.parameter.q));
    case "user":
      return jsonResponse(getUser(e.parameter.id));
    default:
      return jsonResponse({ error: "unknown action" }, 400);
  }
}

function render(filename, params) {
  const t = HtmlService.createTemplateFromFile(filename);
  Object.entries(params).forEach(([k, v]) => (t[k] = v));
  return t.evaluate().setTitle(filename);
}

function jsonResponse(obj) {
  // Apps Script는 status code 설정이 불가능 — 항상 200을 반환한다
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 패턴 2: GET = 페이지, POST = API

```javascript
function doGet(e) {
  return HtmlService.createTemplateFromFile("App").evaluate();
}

function doPost(e) {
  const body = parseBody(e);
  switch (body.action) {
    case "saveTask":
      return jsonResponse(saveTask(body.payload));
    case "deleteTask":
      return jsonResponse(deleteTask(body.id));
    default:
      return jsonResponse({ error: "unknown action" });
  }
}

function parseBody(e) {
  if (!e.postData) return {};
  if (e.postData.type === "application/json") {
    return JSON.parse(e.postData.contents || "{}");
  }
  // application/x-www-form-urlencoded — e.parameter에 이미 파싱돼 있음
  return e.parameter;
}
```

### 패턴 3: `pathInfo` 기반 REST-ish 라우팅

```javascript
function doGet(e) {
  const parts = (e.pathInfo || "").split("/").filter(Boolean);
  // GET /exec/users        → ["users"]
  // GET /exec/users/42     → ["users","42"]

  if (parts[0] === "users") {
    if (parts.length === 1) return jsonResponse(listUsers());
    if (parts.length === 2) return jsonResponse(getUser(parts[1]));
  }
  return notFound();
}
```

> `pathInfo` 라우팅은 외부 도구가 `/exec/users/42`처럼 호출하기는 쉽지만, **HTTP 메서드 구분(`GET/PUT/DELETE`)** 이 불가능하다는 한계가 있다(Web App은 GET/POST만 받는다).

## HTTP 메서드 / 상태 코드 제약

- **`doGet`/`doPost`만 지원**. `PUT`/`PATCH`/`DELETE`는 별도 함수가 없다 — POST body에 method를 넣거나 query string으로 우회.
- **HTTP 상태 코드 설정 불가**. 오류 응답도 항상 `200 OK`로 나가며, body 안에 `{"error": ...}` 형태로 구분해야 한다.
- 명시적으로 호출자에게 `redirect` 응답을 보내는 표준 방법은 없다. HTML 응답 안에서 `<meta http-equiv="refresh">`나 `window.location.href` 사용.

## CORS

- Web App URL은 기본적으로 **CORS Same-origin이 적용되지 않는 별도 도메인**에서 호스팅되며, **모든 origin의 GET/POST 요청을 허용**한다(공식 문서가 별도로 보장하지는 않지만 사실상 그렇게 동작한다).
- 단, **브라우저의 preflight(OPTIONS) 요청은 처리할 수 없다.** Apps Script는 `OPTIONS`를 받을 수 없으므로 다음을 강제하는 요청은 실패한다:
  - `Content-Type: application/json`을 명시한 `fetch` 요청 → preflight 발생 → 실패
- 해결책:
  - 클라이언트에서 `Content-Type: text/plain;charset=utf-8`로 보내고, body는 그대로 JSON 문자열을 넣는다 → preflight 발생하지 않음. 서버는 `e.postData.contents`를 `JSON.parse`.
  - 또는 `application/x-www-form-urlencoded`로 보내고 `e.parameter`로 받음.

```javascript
// 브라우저
await fetch(WEB_APP_URL, {
  method: "POST",
  body: JSON.stringify({ action: "save", payload }),
  // Content-Type을 명시하지 말 것 → preflight 회피
});
```

```javascript
// 서버
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  // ...
}
```

> 일부 케이스에서 응답 헤더 `Access-Control-Allow-Origin: *`가 자동 설정되지만, **사용자가 응답 헤더를 직접 설정할 방법은 없다.**

## 인증 모드와 호출

Web app 배포 시 두 가지 옵션이 핵심이다([deployment.md](./deployment.md) 참고):

- **Execute as**:
  - `Me` — 누가 호출하든 **배포자의 권한**으로 실행. `Session.getActiveUser()`는 호출자, `Session.getEffectiveUser()`는 배포자.
  - `User accessing the web app` — 호출한 사용자의 권한으로 실행. 사용자가 OAuth 동의를 거쳐야 한다.
- **Who has access**:
  - `Only myself` — 배포자만.
  - `Anyone with Google account` — 모든 Google 계정 로그인 사용자.
  - `Anyone` — 익명 호출 가능. **외부 시스템(웹훅, 모바일 앱 등)에서 호출하려면 이 옵션이어야 한다.**

> "Anyone" + "Execute as Me" 조합이 가장 흔한 공개 웹훅 구성이다. 단, 이 경우 모든 외부 호출이 **배포자의 quota를 소모**한다.

## URL 형태

```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec   ← 배포(공개)
https://script.google.com/macros/s/{DEPLOYMENT_ID}/dev    ← HEAD(편집자만)
```

Workspace 도메인에서 배포한 경우 `https://script.google.com/a/macros/{domain}/s/{ID}/exec` 형태가 될 수 있다.

## 리다이렉트 동작

- Web app URL을 처음 호출하면 Google이 **다른 도메인(`script.googleusercontent.com`)** 으로 302 리다이렉트한다.
- `UrlFetchApp.fetch()`로 외부에서 Web app을 호출할 때는 `followRedirects: true`(기본값)를 유지해야 한다.

```javascript
const res = UrlFetchApp.fetch(WEB_APP_URL + "?action=ping", {
  method: "get",
  followRedirects: true,
  muteHttpExceptions: true,
});
```

## 코드 예제

### 1. JSON 핑/퐁

```javascript
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      now: new Date().toISOString(),
      query: e.parameter,
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```

### 2. 외부 웹훅 수신 (POST + JSON)

```javascript
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "invalid JSON" });
  }

  // 토큰 검증 — Anyone 배포 시 필수
  if (payload.token !== PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN")) {
    return jsonResponse({ error: "unauthorized" });
  }

  SpreadsheetApp.openById(LOG_ID)
    .getSheetByName("webhooks")
    .appendRow([new Date(), JSON.stringify(payload)]);

  return jsonResponse({ ok: true });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3. action 라우터 + HTML/JSON 혼합

```javascript
function doGet(e) {
  const action = e.parameter.action;
  if (action === "api") {
    return jsonResponse(handleApi(e));
  }
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Dashboard")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function handleApi(e) {
  switch (e.parameter.endpoint) {
    case "summary":
      return { rows: getSummary() };
    case "user":
      return { user: getUser(e.parameter.id) };
    default:
      return { error: "unknown endpoint" };
  }
}
```

### 4. Form POST 수신 (브라우저 `<form>`)

```html
<!-- HTML -->
<form method="POST" action="https://script.google.com/macros/s/AKfy.../exec">
  <input name="name" />
  <input name="email" />
  <button>Send</button>
</form>
```

```javascript
function doPost(e) {
  // application/x-www-form-urlencoded — e.parameter로 자동 파싱
  const name = e.parameter.name;
  const email = e.parameter.email;
  MailApp.sendEmail("admin@example.com", "New signup", `${name} <${email}>`);
  return ContentService.createTextOutput("ok");
}
```

### 5. `pathInfo`로 SPA 클라이언트 라우팅 매칭

```javascript
function doGet(e) {
  // 어떤 path든 동일한 SPA 셸을 반환 — 클라이언트 JS가 path 파싱
  return HtmlService.createTemplateFromFile("App")
    .evaluate()
    .setTitle("App");
}
```

```html
<!-- App.html -->
<script>
  const path = "<?= e.pathInfo ?>"; // 서버에서 주입
  console.log("Server path:", path);
</script>
```

## 주의사항 / 함정

- **HTTP 상태 코드 설정 불가**: 오류도 200으로 나간다 → 모니터링/에러 처리 코드는 body 내용으로 판단해야 한다.
- **`PUT`/`DELETE`/`PATCH` 미지원**: 외부 API 클라이언트가 RESTful 메서드를 요구하면 우회 라우팅 필요.
- **CORS preflight 불가**: `Content-Type: application/json`로 보내면 막힌다. `text/plain` + `JSON.parse(e.postData.contents)` 패턴이 사실상 표준.
- **`Anyone`(익명) 배포는 보안 위험**: URL이 노출되면 누구나 호출할 수 있으므로 반드시 자체 토큰(Script Properties 등) 검증을 추가한다.
- **`/exec`는 배포된 버전만 반영**: 코드를 수정해도 새 deployment를 만들거나 기존 deployment를 update하기 전까지 반영되지 않는다.
- **HTML 안에서 `<?= e.parameter.x ?>`는 자동 escape**되어 XSS는 차단되지만, 어쨌든 신뢰할 수 없는 입력은 검증해야 한다.
- **응답 크기 제한**: `HtmlOutput`/`TextOutput`은 수십 MB까지 가능하지만, 실제 운영에서는 수 MB 이하로 유지하는 것이 안정적이다. 대용량은 GCS/Drive 링크로 우회.
- **`e.parameter`는 항상 문자열**: 숫자/불리언은 `Number()`/`=== "true"`로 직접 변환.
- **타임아웃**: Web App 요청도 6분 한도를 받는다. 긴 작업은 트리거로 미루고 즉시 응답.

## 참고

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/concepts/deployments
- https://developers.google.com/apps-script/reference/content/content-service
- https://developers.google.com/apps-script/reference/html/html-service
- [html-service.md](./html-service.md)
- [content-service.md](./content-service.md)
- [deployment.md](./deployment.md)
- [client-server-comm.md](./client-server-comm.md)
