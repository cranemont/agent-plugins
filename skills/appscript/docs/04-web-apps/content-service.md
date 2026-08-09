# ContentService — JSON / Text API 응답

> **출처**
> - https://developers.google.com/apps-script/reference/content
> - https://developers.google.com/apps-script/reference/content/content-service
> - https://developers.google.com/apps-script/guides/web
>
> **최종 확인일**: 2026-07-22

## 개요

**`ContentService`** 는 Apps Script Web App에서 **HTML이 아닌 텍스트 응답(JSON, CSV, XML 등)** 을 반환할 때 사용한다. `doGet`/`doPost`가 반환할 수 있는 두 타입 중 하나인 `TextOutput`을 만든다(다른 하나는 `HtmlOutput`).

공식 문서의 핵심 표현:

> *"Due to security considerations, scripts cannot directly return content to a browser. Instead, they must serve the content from a different URL."*

따라서 `/exec` URL은 보통 `script.googleusercontent.com` 같은 별도 도메인으로 302 리다이렉트되며, 클라이언트는 `followRedirects`(`UrlFetchApp`의 기본값) 또는 브라우저의 자동 리다이렉트로 응답을 받게 된다.

## 핵심 API

### `ContentService` 메서드

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `createTextOutput()` | `TextOutput` | 빈 출력 |
| `createTextOutput(content)` | `TextOutput` | 초기 문자열로 생성 |

### `TextOutput` 메서드

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `setContent(content)` | `TextOutput` | 내용 교체 (체이닝) |
| `append(content)` | `TextOutput` | 내용 추가 |
| `clear()` | `TextOutput` | 내용 비우기 |
| `setMimeType(mimeType)` | `TextOutput` | MIME 타입 지정 |
| `setFileName(fileName)` | `TextOutput` | 다운로드 파일명 (Content-Disposition) |
| `downloadAsFile(filename)` | `TextOutput` | 파일로 다운로드 응답 강제 |
| `getContent()` | `string` | 현재 내용 |
| `getMimeType()` | `MimeType` | 현재 MIME 타입 |
| `getFileName()` | `string` | 현재 파일명 |

## `ContentService.MimeType` enum

| 값 | Content-Type | 비고 |
| --- | --- | --- |
| `TEXT` | `text/plain` | 기본값 |
| `JSON` | `application/json` | JSON API |
| `JAVASCRIPT` | `application/javascript` | JSONP, JS 페이로드 |
| `CSV` | `text/csv` | CSV 다운로드 |
| `XML` | `application/xml` | XML 페이로드 |
| `ATOM` | `application/atom+xml` | Atom 피드 |
| `RSS` | `application/rss+xml` | RSS 피드 |
| `ICAL` | `text/calendar` | iCal (.ics) |
| `VCARD` | `text/vcard` | vCard (.vcf) |

> Apps Script Web App은 응답 헤더(`Content-Type`)를 사용자가 직접 지정할 수 없다. `setMimeType`이 사실상 유일한 헤더 제어 수단이다.

## 기본 패턴

### JSON 응답

```javascript
function doGet() {
  const payload = { ok: true, now: new Date().toISOString() };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### CSV 응답 (다운로드 강제)

```javascript
function doGet() {
  const rows = [
    ["name", "email"],
    ["alice", "alice@example.com"],
    ["bob", "bob@example.com"],
  ];
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");

  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV)
    .downloadAsFile("users.csv");
}

function csvEscape(v) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
```

`downloadAsFile`을 호출하면 응답 헤더에 `Content-Disposition: attachment; filename=...`이 자동 부여되어 브라우저가 다운로드 다이얼로그를 띄운다.

### Plain text 응답

```javascript
function doGet() {
  return ContentService.createTextOutput("pong");
  // setMimeType 생략 → text/plain
}
```

### XML / iCal / RSS

```javascript
function doGet() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:abc@example.com",
    "DTSTART:20260601T090000Z",
    "DTEND:20260601T100000Z",
    "SUMMARY:Standup",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return ContentService.createTextOutput(ics)
    .setMimeType(ContentService.MimeType.ICAL)
    .setFileName("standup.ics");
}
```

## JSONP 패턴

브라우저에서 CORS preflight를 피해야 하는 레거시 환경(또는 OPTIONS를 처리할 수 없는 Apps Script의 한계)을 우회하기 위해 JSONP를 쓸 수 있다.

### 서버

```javascript
function doGet(e) {
  const data = { ok: true, items: getItems() };
  const callback = (e.parameter && e.parameter.callback) || null;

  if (callback) {
    // JSONP: 클라이언트의 callback 함수로 감싸서 JS로 반환
    if (!/^[A-Za-z_$][\w$]*$/.test(callback)) {
      // 함수명 형식 검증 — 코드 인젝션 방지
      return ContentService.createTextOutput("invalid callback")
        .setMimeType(ContentService.MimeType.TEXT);
    }
    const body = `${callback}(${JSON.stringify(data)});`;
    return ContentService.createTextOutput(body)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 클라이언트 (브라우저)

```html
<script>
  function handleData(data) {
    console.log("Got:", data);
  }
  const s = document.createElement("script");
  s.src = "https://script.google.com/macros/s/AKfy.../exec?callback=handleData";
  document.body.appendChild(s);
</script>
```

> JSONP는 `<script>` 태그 로딩이므로 **GET만 가능**하고, 함수 이름 인젝션에 주의해야 한다 (정규식으로 검증). 신규 프로젝트라면 `fetch` + `text/plain` body 패턴이 더 안전하다 (`doGet-doPost.md` 참고).

## REST-ish JSON API 만들기

### 라우터

```javascript
const HANDLERS = {
  GET: {
    "users": listUsers,
    "user": getUser,
    "search": search,
  },
  POST: {
    "user": createUser,
    "user.update": updateUser,
    "user.delete": deleteUser,
  },
};

function doGet(e) {
  return handle("GET", e);
}

function doPost(e) {
  return handle("POST", e);
}

function handle(method, e) {
  try {
    const action = (e.parameter && e.parameter.action) || "";
    const fn = HANDLERS[method][action];
    if (!fn) return jsonError(404, "unknown action");

    const params = method === "POST" ? parseBody(e) : e.parameter;
    const result = fn(params);
    return json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    return jsonError(500, err.message);
  }
}

function parseBody(e) {
  if (!e.postData) return {};
  const type = e.postData.type || "";
  if (type.indexOf("application/json") === 0 || type.indexOf("text/plain") === 0) {
    return JSON.parse(e.postData.contents || "{}");
  }
  return e.parameter;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(code, message) {
  // HTTP 상태 코드는 항상 200이므로 body 안에 code 명시
  return json({ ok: false, error: { code, message } });
}
```

### 클라이언트 예시 (`UrlFetchApp`에서)

```javascript
const URL = "https://script.google.com/macros/s/AKfy.../exec";

function callApi(action, body) {
  const res = UrlFetchApp.fetch(URL + "?action=" + encodeURIComponent(action), {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
    followRedirects: true,
  });
  return JSON.parse(res.getContentText());
}
```

> 외부 시스템(`UrlFetchApp`이 아닌 일반 HTTP 클라이언트)에서는 `application/json` Content-Type이 브라우저 preflight를 유발한다. 브라우저에서 호출할 때는 `Content-Type` 헤더를 명시하지 말고 `text/plain` 기본값을 사용하라.

## 코드 예제

### 1. 응답 캐싱

`CacheService`로 자주 조회되는 응답을 캐시:

```javascript
function doGet(e) {
  const key = "api:" + (e.parameter.action || "default");
  const cache = CacheService.getScriptCache();
  let body = cache.get(key);
  if (!body) {
    body = JSON.stringify(buildPayload(e));
    cache.put(key, body, 60); // 60초
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
```

`CacheService` 값의 최대 크기는 100KB 정도이므로 큰 응답은 분할 저장하거나 `PropertiesService`/`DriveApp`로 우회.

### 2. 페이지네이션

```javascript
function listUsers({ page = 1, pageSize = 50 }) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("users");
  const start = (Number(page) - 1) * Number(pageSize) + 2;
  const range = sheet.getRange(start, 1, pageSize, sheet.getLastColumn());
  return {
    page: Number(page),
    pageSize: Number(pageSize),
    rows: range.getValues(),
  };
}
```

### 3. CSV 동적 export

```javascript
function doGet(e) {
  const sheetName = e.parameter.sheet || "Sheet1";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) {
    return ContentService.createTextOutput("not found")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  const csv = sheet
    .getDataRange()
    .getValues()
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV)
    .downloadAsFile(`${sheetName}.csv`);
}
```

### 4. RSS 피드

```javascript
function doGet() {
  const items = readPosts(); // [{title, link, pubDate, description}, ...]
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Feed</title>
    <link>https://example.com</link>
    <description>Latest posts</description>
    ${items
      .map(
        (i) => `
    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <pubDate>${i.pubDate.toUTCString()}</pubDate>
      <description>${esc(i.description)}</description>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;
  return ContentService.createTextOutput(rss)
    .setMimeType(ContentService.MimeType.RSS);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

## CORS / 헤더 한계

- **응답 헤더 사용자 지정 불가.** `Access-Control-Allow-Origin`을 직접 추가할 수 없다 — Google이 자동으로 `*`를 붙여 주지만 보장되는 것은 아니다.
- **HTTP 상태 코드 항상 200.** 오류 상태도 200으로 나가며, body 내용으로 구분해야 한다.
- **preflight(OPTIONS) 미지원.** `Content-Type: application/json` 브라우저 요청은 막힐 수 있다 → `text/plain` 우회.

## 주의사항 / 함정

- **`TextOutput`은 `HtmlOutput`이 아니다.** `setTitle`, `addMetaTag` 같은 HTML 관련 메서드는 없다.
- **`setMimeType` 잊으면 `text/plain`이 되어** 클라이언트가 JSON으로 파싱하지 않는다.
- **`JSON.stringify(undefined)`는 `undefined`** → 응답이 비고 JSON 파싱 에러. 항상 객체로 감싸서 반환.
- **`downloadAsFile`은 GET 응답에만 의미가 있다.** XHR/`fetch`로 받으면 단순 텍스트로 들어옴.
- **응답 크기는 명시된 한도가 없지만**, 수십 MB 단위가 되면 안정성이 떨어진다 → 페이지네이션.
- **`/exec`는 redirect를 한다.** `UrlFetchApp`은 기본적으로 따라가지만 외부 HTTP 클라이언트가 redirect를 따라가지 않으면 빈 응답으로 보일 수 있다.
- **타임존**: `JSON.stringify(new Date())`는 항상 UTC ISO string. 클라이언트에서 로컬 변환 필요.

## 참고

- https://developers.google.com/apps-script/reference/content
- https://developers.google.com/apps-script/reference/content/content-service
- https://developers.google.com/apps-script/guides/web
- [doGet-doPost.md](./doGet-doPost.md)
- [html-service.md](./html-service.md)
