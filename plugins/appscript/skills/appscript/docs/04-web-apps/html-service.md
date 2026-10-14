# HtmlService — HTML Output & Templates

> **출처**
> - https://developers.google.com/apps-script/guides/html
> - https://developers.google.com/apps-script/guides/html/templates
> - https://developers.google.com/apps-script/guides/html/restrictions
> - https://developers.google.com/apps-script/reference/html/html-service
>
> **최종 확인일**: 2026-07-22

## 개요

**`HtmlService`** 는 Apps Script가 HTML/CSS/JS를 반환할 수 있게 해 주는 서비스다. Web App, Editor add-on의 사이드바/다이얼로그, Gmail add-on(일부)에서 모두 쓰인다.

핵심 객체는 두 가지:

- **`HtmlOutput`** — 최종 응답 객체. `doGet`에서 반환.
- **`HtmlTemplate`** — 서버 측 스크립틀릿(`<? ?>`, `<?= ?>`)으로 동적 HTML을 만들어 `evaluate()`로 `HtmlOutput`을 얻는 객체.

또한 `HtmlService`는 모든 HTML을 **iframe sandbox** 안에서 실행한다. 보안과 격리를 보장하지만, 일부 브라우저 기능에 제약이 따른다.

## `HtmlService` 메서드

| 메서드 | 반환 | 용도 |
| --- | --- | --- |
| `createHtmlOutput()` | `HtmlOutput` | 빈 HtmlOutput 생성. `append()`로 채움. |
| `createHtmlOutput(html)` | `HtmlOutput` | 문자열에서 즉시 생성. |
| `createHtmlOutput(blob)` | `HtmlOutput` | `Blob`에서 생성. |
| `createHtmlOutputFromFile(filename)` | `HtmlOutput` | 프로젝트 내 `.html` 파일 로드 (확장자 생략). |
| `createTemplate(html)` | `HtmlTemplate` | 문자열에서 템플릿. |
| `createTemplateFromFile(filename)` | `HtmlTemplate` | 프로젝트 내 `.html` 파일을 템플릿으로 로드. |
| `getUserAgent()` | `string` | 호출자의 User-Agent (Web app 컨텍스트). |

## `HtmlOutput` 주요 메서드

| 메서드 | 설명 |
| --- | --- |
| `setTitle(title)` | 브라우저 탭 제목. Web App 전용. |
| `setFaviconUrl(url)` | favicon URL. |
| `addMetaTag(name, content)` | `<meta>` 추가. `viewport`, `description` 등. |
| `append(html)` | HTML 문자열을 끝에 덧붙임. |
| `appendUntrusted(html)` | escape된 텍스트로 덧붙임(안전). |
| `setContent(html)` | 기존 내용 교체. |
| `getContent()` | 현재 HTML 문자열 반환. |
| `setSandboxMode(mode)` | **historical** — 현재 IFRAME만 동작, 다른 값은 무시됨. |
| `setXFrameOptionsMode(mode)` | `ALLOWALL` 또는 `DEFAULT`. |
| `setWidth(px)` / `setHeight(px)` | 다이얼로그 크기(add-on 컨텍스트). |
| `clear()` | 내용 비우기. |
| `asTemplate()` | `HtmlTemplate`으로 변환. |

### `addMetaTag` 허용 목록

`addMetaTag`로 추가할 수 있는 태그는 제한되어 있다. 일반적으로 허용되는 것: `viewport`, `description`, `keywords`, `referrer`, `author`, `theme-color`. `<meta http-equiv=...>` 류는 IFRAME 내에서 작동하지만 추가 방법이 약간 다르다(아래 예제 참고).

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("My App")
    .setFaviconUrl("https://example.com/favicon.ico")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .addMetaTag("theme-color", "#1a73e8");
}
```

## Sandbox Mode — 현재 상태

공식 문서:

> Apps Script는 **IFRAME mode만** 사용한다. `NATIVE`, `EMULATED`는 **deprecated**이며 `setSandboxMode()`는 사실상 **no-op**다.

IFRAME sandbox에는 다음 키워드가 적용된다:

- `allow-same-origin`
- `allow-forms`
- `allow-scripts`
- `allow-popups`
- `allow-downloads`
- `allow-modals`
- `allow-popups-to-escape-sandbox`
- `allow-top-navigation-by-user-activation` (**standalone web app만**)

> 핵심 제약: **`allow-top-navigation` 자체는 빠져 있다.** 따라서 JavaScript에서 `top.location.href = ...`로 부모 페이지 이동을 강제할 수 없다. 사용자가 직접 링크를 클릭해야만 가능하다(아래 참고).

## XFrameOptionsMode

```javascript
HtmlService.createHtmlOutputFromFile("Index")
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
```

| 값 | 의미 |
| --- | --- |
| `DEFAULT` | Google이 정한 기본 제약. 외부 도메인에서 임베드 시 차단될 수 있음. |
| `ALLOWALL` | 모든 도메인에서 `<iframe>`으로 임베드 가능. |

> Web app을 외부 사이트(Notion, 인트라넷 등)에 임베드하려면 **`ALLOWALL`** 이 필요하다. 단, 그만큼 클릭재킹 등 보안 책임은 개발자에게 있다.

## 링크 클릭 동작

IFRAME sandbox에서는 링크가 sandbox 안에서 열리려고 시도한다. 외부로 새 창/탭을 열려면 `target` 속성을 명시해야 한다.

> 공식 문서: *"In the IFRAME mode you need to set the link target attribute to either `_top` or `_blank`."*

```html
<a href="https://example.com" target="_blank" rel="noopener">Open</a>
<a href="https://example.com" target="_top">Replace parent</a>
```

`target` 없는 링크는 sandbox 안에서 동작하지 않거나 차단된다.

## HTTPS 강제

> *"Active content like scripts, external stylesheets, and XmlHttpRequests must be loaded over HTTPS, not HTTP."*

`http://` CDN 자원은 mixed-content 차단된다. 모든 외부 자원은 `https://`로 참조.

## HtmlTemplate — 서버 스크립틀릿

`HtmlTemplate`은 EJS와 유사한 서버 측 템플릿이다. 세 가지 스크립틀릿 문법:

### 1. Standard scriptlet — `<? ... ?>`

코드만 실행, 출력 없음.

```html
<? var items = getItems(); ?>
<ul>
  <? for (var i = 0; i < items.length; i++) { ?>
    <li>...</li>
  <? } ?>
</ul>
```

### 2. Printing scriptlet — `<?= ... ?>`

**Contextual escaping(컨텍스트 인식 자동 escape)** 으로 출력. XSS 차단.

```html
<h1>Hello, <?= userName ?>!</h1>
<a href="<?= profileUrl ?>">Profile</a>
```

`userName`이 `<script>alert(1)</script>`면 `&lt;script&gt;alert(1)&lt;/script&gt;`로 escape된다. `href` 안에서는 URL escape, 일반 텍스트 영역에서는 HTML escape — **컨텍스트에 따라** 다른 escape를 적용한다.

### 3. Force-printing scriptlet — `<?!= ... ?>`

**Escape 없이** 그대로 출력. 신뢰할 수 있는 HTML 조각이거나 의도적으로 raw HTML/JS를 삽입할 때만 사용.

```html
<div>
  <?!= include("Stylesheet") ?>  <!-- 정의된 함수로 <style>...</style> 그대로 삽입 -->
</div>
```

> **보안 경고**: `<?!= userInput ?>`는 XSS에 직접 노출된다. 사용자 입력은 절대 `<?!= ?>`에 넣지 않는다.

### Template 평가

```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile("Page");
  t.userName = Session.getActiveUser().getEmail();
  t.items = readItems();
  return t.evaluate().setTitle("Items");
}
```

- 템플릿 객체에 **임의의 속성을 할당**하면 그 변수가 스크립틀릿 안에서 그대로 접근 가능.
- `evaluate()`는 `HtmlOutput`을 반환.

### `getCode()` / `getCodeWithComments()`

스크립틀릿이 어떻게 컴파일됐는지 확인 가능 — 디버깅 용도.

```javascript
const t = HtmlService.createTemplateFromFile("Page");
console.log(t.getCodeWithComments());
```

## `include` 패턴 (재사용 HTML)

Apps Script HTML 파일끼리 서로 `<link>` 임포트할 수 없으므로 **서버 함수로 inline include**를 한다. 거의 표준 패턴.

```javascript
// Code.gs
function doGet() {
  return HtmlService.createTemplateFromFile("Index").evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

```html
<!-- Index.html -->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <?!= include("Stylesheet") ?>
  </head>
  <body>
    <?!= include("Navbar") ?>
    <main>
      <h1>Dashboard</h1>
    </main>
    <?!= include("Footer") ?>
    <?!= include("AppJs") ?>
  </body>
</html>
```

```html
<!-- Stylesheet.html -->
<style>
  body { font-family: sans-serif; }
</style>
```

```html
<!-- AppJs.html -->
<script>
  google.script.run.withSuccessHandler(render).getData();
</script>
```

> 일반적인 컨벤션: CSS는 `Stylesheet.html`, JS는 `JavaScript.html` 또는 `AppJs.html` 같은 별도 파일에 두고 `<?!= include(...) ?>`로 인라인한다.

## `<base target="_top">`

거의 모든 Web App `<head>`에 들어가는 라인.

```html
<head>
  <base target="_top">
</head>
```

이게 없으면 모든 링크가 IFRAME 내에서 열리려다 차단되어 동작하지 않는 것처럼 보인다. 사이드바/다이얼로그에서는 이 라인이 없어도 되지만, **Web App에는 거의 필수**.

## 코드 예제

### 1. 기본 SPA 셸

```javascript
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Tasks")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getTasks() {
  return SpreadsheetApp.getActive()
    .getSheetByName("Tasks")
    .getDataRange()
    .getValues();
}
```

```html
<!-- Index.html -->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <?!= include("Css") ?>
  </head>
  <body>
    <h1>Tasks</h1>
    <table id="tasks"></table>
    <?!= include("Js") ?>
  </body>
</html>
```

```html
<!-- Js.html -->
<script>
  google.script.run.withSuccessHandler(rows => {
    const table = document.getElementById("tasks");
    table.innerHTML = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  }).getTasks();
</script>
```

### 2. 서버에서 데이터 미리 주입 (SSR)

```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile("Page");
  t.tasks = getTasks();
  t.userEmail = Session.getActiveUser().getEmail();
  return t.evaluate().setTitle("Tasks");
}
```

```html
<h2>안녕하세요, <?= userEmail ?>님</h2>
<ul>
  <? for (var i = 0; i < tasks.length; i++) { ?>
    <li><?= tasks[i].title ?> (<?= tasks[i].status ?>)</li>
  <? } ?>
</ul>
```

### 3. 외부 임베드용 (`ALLOWALL`)

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Widget")
    .setTitle("Status Widget")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

### 4. 다이얼로그 / 사이드바 (add-on / 컨테이너 스크립트)

```javascript
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Tools")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Dialog")
    .setWidth(600)
    .setHeight(400);
  DocumentApp.getUi().showModalDialog(html, "Settings");
}
```

> 다이얼로그/사이드바 안에서는 `<base target="_top">` 없이도 동작하지만, 추가하면 안전하다.

### 5. JSON 데이터를 HTML에 임베드

```html
<script>
  const SERVER_DATA = <?!= JSON.stringify(tasks) ?>; <!-- force-print: JSON 그대로 -->
  console.log(SERVER_DATA);
</script>
```

> `<?= JSON.stringify(tasks) ?>`로 쓰면 따옴표가 escape되어 JS 문법 에러가 난다. **JSON 임베드는 `<?!= ?>` + `JSON.stringify` 조합이 표준**이다. 단, `tasks`에 사용자 입력이 들어있으면 `<script>` 종료 태그 인젝션 위험이 있으므로 별도 sanitize.

## 제약 사항 (Restrictions)

### 1. IFRAME sandbox

- `top.location` 직접 변경 불가 (사용자 클릭에 의한 `<a target="_top">`은 가능).
- 외부 도메인 임베드는 `setXFrameOptionsMode(ALLOWALL)` 필요.
- `allow-popups`는 켜져 있으므로 `window.open()`은 동작.

### 2. HTTPS 강제

- HTTP 자원은 mixed-content 차단. 모든 CDN/이미지/스크립트는 HTTPS.

### 3. Cookies / Storage

- IFRAME 컨텍스트에서 `document.cookie`, `localStorage`, `sessionStorage`는 일부 브라우저에서 third-party cookie 정책에 따라 차단될 수 있다.
- 사용자 상태는 **`PropertiesService.getUserProperties()`** 로 서버에 저장하는 것이 안전.

### 4. 빠른 캐싱

- `/exec` URL은 일정 시간 캐싱될 수 있다. 캐시를 우회하려면 query string에 timestamp/version을 붙인다.

### 5. 다이얼로그 크기 한도

- `setWidth`/`setHeight`는 일반적으로 1000px 이내로 작동. 너무 큰 값은 무시될 수 있다.

### 6. 응답 크기

- 정확한 한도는 공식 문서에 명시돼 있지 않다. 실측상 수십 MB까지 가능하나, **수 MB를 넘기면 평가/전송 시간이 급격히 길어진다.** 대용량 데이터는 `google.script.run`으로 분할 로드.

## 주의사항 / 함정

- **`<base target="_top">` 빠지면 링크가 죽는다** — Web App 디버깅 1순위.
- **`<?!= ?>`에 사용자 입력 절대 금지** — XSS 직격.
- **`createHtmlOutput(html)` vs `createTemplateFromFile`**: 전자는 스크립틀릿을 평가하지 않는다. 동적 데이터를 넣으려면 반드시 `createTemplate*`.
- **JSON 임베드**는 `<?!= JSON.stringify(obj) ?>` (force-print) — 그렇지 않으면 따옴표가 깨진다.
- **`setSandboxMode`는 deprecated** — 호출해도 동작에 영향 없음. 새 코드에서는 빼는 것이 깔끔.
- **개발 중 변경이 반영 안 되는 듯 보이면** `/dev` URL을 확인하거나, `/exec`라면 새 deployment를 만들어야 한다.
- **External CSS 프레임워크(예: Tailwind CDN)** 사용 시 첫 로딩이 느려진다. `<style>` 인라인 + `<?!= include("Css") ?>` 패턴이 일반적.
- **IFRAME 내 `console.log`** 는 부모 페이지의 콘솔에 잘 안 보이는 경우가 있다. 개발자 도구의 **Top frame** 대신 **iframe 컨텍스트**로 전환 필요.

## 참고

- https://developers.google.com/apps-script/guides/html
- https://developers.google.com/apps-script/guides/html/templates
- https://developers.google.com/apps-script/guides/html/restrictions
- https://developers.google.com/apps-script/reference/html/html-service
- [doGet-doPost.md](./doGet-doPost.md)
- [client-server-comm.md](./client-server-comm.md)
- [content-service.md](./content-service.md)
