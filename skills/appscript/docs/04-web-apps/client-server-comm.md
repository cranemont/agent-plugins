# Client-Server Communication — `google.script.*`

> **출처**
> - https://developers.google.com/apps-script/guides/html/communication
> - https://developers.google.com/apps-script/guides/html/reference
> - https://developers.google.com/apps-script/guides/html
>
> **최종 확인일**: 2026-07-22

## 개요

HtmlService로 만든 Web App / 사이드바 / 다이얼로그 안의 **클라이언트 JS**는 IFRAME sandbox에서 동작한다. 이 클라이언트 JS가 서버(Apps Script `.gs` 코드)와 통신할 때 사용하는 API가 **`google.script.*`** 이다.

| 네임스페이스 | 역할 |
| --- | --- |
| `google.script.run` | 서버 함수 호출 (가장 자주 씀) |
| `google.script.host` | 다이얼로그/사이드바 호스트 제어 (close, resize) |
| `google.script.url` | 현재 URL 정보 |
| `google.script.history` | 브라우저 history API 래퍼 |

이 API들은 **HtmlService가 서빙한 페이지 안에서만** 사용 가능하다. 외부 사이트에서 Apps Script Web App을 임베드한 경우에도 IFRAME 안의 페이지에서는 동작한다.

## `google.script.run` — 서버 함수 호출

### 기본 형태

```javascript
google.script.run
  .withSuccessHandler(onSuccess)
  .withFailureHandler(onFailure)
  .myServerFunction(arg1, arg2);
```

> *"calls are asynchronous and may not execute in the order you expect."*

- 호출은 **비동기**다. 반환 값은 `withSuccessHandler`로 받는다.
- 호출 즉시 `google.script.run` 자체는 `undefined`를 반환 (체이닝용 객체).
- 콜백 기반 — Promise를 직접 반환하지 않는다 (간단한 래퍼로 Promise화 가능, 아래 참고).

### Handler 메서드

| 메서드 | 설명 |
| --- | --- |
| `withSuccessHandler(fn)` | 서버 함수가 정상 반환 시 호출. 인자 = 서버 함수의 return 값. |
| `withFailureHandler(fn)` | 서버에서 예외 발생 시 호출. 인자 = `Error` 객체. |
| `withUserObject(obj)` | 두 핸들러에 **두 번째 인자**로 전달할 임의 객체. 함수/DOM 요소도 허용. |

> 공식: *"by default, if you don't specify a failure handler, failures are logged to the JavaScript console."*

### 직렬화 가능한 타입 (서버 호출 인자 / 반환값)

`google.script.run`이 직렬화/역직렬화하므로 다음 타입만 안전하게 주고받을 수 있다:

- **Primitives**: `Number`, `String`, `Boolean`, `null`
- **`Date`** (JSON 처리 후 ISO 문자열로 전달되며 클라이언트에서는 `Date`가 아닌 string으로 도착)
- **Plain Object / Array**: 위 primitive들의 조합
- **`Form` DOM 요소**: 인자로 폼 요소를 넘기면 폼 데이터가 객체로 변환되어 서버에 도착 (특수 케이스).

**전달 불가**:

> *"Date, Function, DOM element besides a form, or other prohibited type"*

(Date는 인자로는 넘길 수 있지만 서버에서 받을 때는 문자열이 되거나 다시 Date로 복원되지 않을 수 있어 권장되지 않음. `toISOString()`으로 명시적 변환 권장.)

- `Function`, 임의의 DOM 요소, 순환 참조 객체, `undefined`(배열 안에 들어가면 `null`로 변환), Spreadsheet/Document/Range 등 **Apps Script 서비스 객체**는 전달 불가.

### 동시성 제한

> *"The google.script.run API allows 10 concurrent calls to server functions."*

- 같은 클라이언트에서 **동시에 진행 중인 `google.script.run` 호출은 최대 10개**.
- 그 이상 호출하면 큐잉되어 대기.
- UI에서 빠르게 여러 호출을 발사하는 경우 디바운스/스로틀 또는 묶어서 보내는 것이 안전.

### `private` 서버 함수

함수 이름이 **언더스코어(`_`)** 로 끝나면 `google.script.run`에서 호출 불가 — 헬퍼/내부 유틸을 숨기는 표준 패턴.

> *"Functions ending with underscore cannot be called via google.script.run and remain invisible to the client."*

```javascript
// Code.gs
function publicFn() {
  return helper_();
}

function helper_() {           // 클라이언트에서 호출 불가
  return "secret";
}
```

## 코드 예제 — `google.script.run`

### 1. 기본 호출

```html
<button id="load">Load</button>
<pre id="out"></pre>

<script>
  document.getElementById("load").onclick = () => {
    google.script.run
      .withSuccessHandler(data => {
        document.getElementById("out").textContent = JSON.stringify(data, null, 2);
      })
      .withFailureHandler(err => {
        document.getElementById("out").textContent = "Error: " + err.message;
      })
      .getDashboardData();
  };
</script>
```

```javascript
// Code.gs
function getDashboardData() {
  return {
    user: Session.getActiveUser().getEmail(),
    rows: SpreadsheetApp.getActive().getSheetByName("data").getDataRange().getValues(),
  };
}
```

### 2. `withUserObject`로 컨텍스트 전달

콜백에 button DOM 요소 자체를 함께 보내 클릭한 버튼을 다시 활성화하는 패턴.

```html
<button data-id="row-1">Save</button>
<button data-id="row-2">Save</button>

<script>
  document.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      btn.disabled = true;
      google.script.run
        .withSuccessHandler((result, originalBtn) => {
          originalBtn.disabled = false;
          originalBtn.textContent = "Saved";
        })
        .withFailureHandler((err, originalBtn) => {
          originalBtn.disabled = false;
          alert("Failed: " + err.message);
        })
        .withUserObject(btn)
        .saveRow(btn.dataset.id);
    };
  });
</script>
```

### 3. Promise 래퍼

콜백 지옥을 피하려면 한 줄 짜리 래퍼로 Promise화한다.

```javascript
// AppJs.html
function callServer(fnName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [fnName](...args);
  });
}

// 사용
async function refresh() {
  try {
    const data = await callServer("getDashboardData");
    render(data);
  } catch (err) {
    console.error(err);
  }
}
```

### 4. 폼 제출

`<form>` 자체를 인자로 넘기면 Apps Script가 자동으로 `{ name: value, ... }` 객체로 변환해 준다.

```html
<form id="contactForm">
  <input name="name" />
  <input name="email" />
  <button type="button" onclick="submit()">Send</button>
</form>

<script>
  function submit() {
    const form = document.getElementById("contactForm");
    google.script.run
      .withSuccessHandler(() => alert("Sent!"))
      .withFailureHandler(err => alert(err.message))
      .saveContact(form);
  }
</script>
```

```javascript
function saveContact(formObject) {
  // formObject = { name: "...", email: "..." }
  SpreadsheetApp.getActive()
    .getSheetByName("contacts")
    .appendRow([new Date(), formObject.name, formObject.email]);
}
```

### 5. 폴링 / 자동 새로고침

```html
<script>
  setInterval(() => {
    google.script.run
      .withSuccessHandler(render)
      .withFailureHandler(console.error)
      .getStatus();
  }, 10_000);
</script>
```

> `google.script.run`은 6분 타임아웃을 받으므로 폴링 함수는 가볍게 유지.

## `google.script.host` — 호스트 제어

다이얼로그/사이드바를 띄운 호스트(Sheets/Docs/Forms/Slides)와 상호작용.

| 메서드 | 설명 |
| --- | --- |
| `google.script.host.close()` | 현재 다이얼로그/사이드바를 닫음. **`window.close()`는 동작하지 않음** — 이 함수를 써야 한다. |
| `google.script.host.setWidth(width)` | 다이얼로그 너비(px). |
| `google.script.host.setHeight(height)` | 다이얼로그 높이(px). |
| `google.script.host.origin` | 현재 IFRAME의 origin 문자열 (drive.google.com 등). |
| `google.script.host.editor.focus()` | 부모 에디터(Docs/Sheets 본문)에 포커스를 되돌림. 텍스트 삽입 후 자주 사용. |

```html
<button onclick="google.script.host.close()">닫기</button>
<button onclick="google.script.host.setHeight(600)">크게</button>
```

```html
<script>
  function insertAndReturn() {
    google.script.run
      .withSuccessHandler(() => {
        google.script.host.editor.focus();
        google.script.host.close();
      })
      .insertSelectedTemplate();
  }
</script>
```

> Web App(standalone)에서는 호스트가 없으므로 `host.close()` / `host.editor.focus()`는 의미가 없다 (호출해도 무시).

## `google.script.url`

| 메서드 | 설명 |
| --- | --- |
| `google.script.url.getLocation(callback)` | 부모 페이지의 location 정보를 비동기로 받음. callback에 `{ hash, parameter, parameters }` 형태 객체 전달. |

```html
<script>
  google.script.url.getLocation((location) => {
    console.log("hash:", location.hash);
    console.log("parameter:", location.parameter); // 첫 번째 값만
    console.log("parameters:", location.parameters); // 배열
  });
</script>
```

> IFRAME 내부에서 `window.location.search`로는 부모의 query string을 직접 읽을 수 없다 — `google.script.url`이 안전한 통로.

## `google.script.history` — Browser History API

Web App 내에서 클라이언트 라우팅이나 뒤로 가기 처리를 할 때 사용. (다이얼로그/사이드바에서는 의미가 적다.)

| 메서드 | 설명 |
| --- | --- |
| `push(stateObject, params, hash)` | 새 히스토리 엔트리 추가 |
| `replace(stateObject, params, hash)` | 현재 엔트리 교체 |
| `setChangeHandler(fn)` | 뒤로/앞으로 이동 시 호출되는 핸들러 등록. 인자 = `{ state, location }` |

```html
<script>
  // 페이지 진입 시 history 변경 감시
  google.script.history.setChangeHandler((e) => {
    console.log("nav:", e.state, e.location);
    renderRoute(e.location.parameter.page);
  });

  // 라우트 변경
  function go(page) {
    google.script.history.push({ page }, { page }, "");
    renderRoute(page);
  }
</script>
```

`params`로 넣은 객체는 부모 URL의 query string에 반영되며, `getLocation`/`setChangeHandler`로 읽을 수 있다.

> Apps Script Web App URL은 일반 SPA와 달리 path를 자유롭게 변경할 수 없다 — `google.script.history`는 **query/hash 영역만** 조작한다.

## 직렬화 함정 정리

### Date 처리

```javascript
// 서버
function getCreatedAt() {
  return new Date(); // 클라이언트는 ISO string으로 받음 (직렬화)
}
```

```html
<script>
  google.script.run.withSuccessHandler(value => {
    // value는 string ("2026-05-11T...") 또는 환경에 따라 Date
    const d = new Date(value);
    console.log(d.getFullYear());
  }).getCreatedAt();
</script>
```

명시적으로 `.toISOString()`을 호출해 string으로 보내는 것이 더 안정적.

### undefined → null

배열 안에 `undefined`가 있으면 `null`이 된다.

```javascript
function vals() { return [1, undefined, 3]; }
// 클라이언트: [1, null, 3]
```

### Apps Script 서비스 객체 전달 불가

```javascript
function bad() {
  return SpreadsheetApp.getActive(); // ERROR — 직렬화 불가
}

function good() {
  const ss = SpreadsheetApp.getActive();
  return { id: ss.getId(), name: ss.getName() };
}
```

### 순환 참조 / 함수

```javascript
function bad() {
  const a = {};
  a.self = a; // 순환
  return a;
}

function bad2() {
  return { fn: function() {} }; // 함수 — 통과 불가
}
```

## 일반적인 패턴 / Recipe

### 패턴 1: 로딩 상태 표시

```html
<button id="load">Load</button>
<div id="spinner" style="display:none">Loading...</div>

<script>
  const btn = document.getElementById("load");
  const spinner = document.getElementById("spinner");

  btn.onclick = () => {
    btn.disabled = true;
    spinner.style.display = "";
    google.script.run
      .withSuccessHandler(data => {
        btn.disabled = false;
        spinner.style.display = "none";
        render(data);
      })
      .withFailureHandler(err => {
        btn.disabled = false;
        spinner.style.display = "none";
        alert(err.message);
      })
      .getData();
  };
</script>
```

### 패턴 2: 동시 호출 묶기 (Batching)

10개 동시 호출 제한을 피하기 위해 서버 측에서 한 번에 여러 작업을 처리하는 batch 엔드포인트를 노출.

```javascript
// Code.gs
function batch(operations) {
  // operations: [{op: "getUser", args: ["1"]}, {op: "getOrder", args: ["42"]}, ...]
  return operations.map(({ op, args }) => {
    try {
      return { ok: true, value: HANDLERS[op](...args) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

const HANDLERS = {
  getUser: (id) => readUser(id),
  getOrder: (id) => readOrder(id),
};
```

### 패턴 3: 자동 재시도

```javascript
async function callServerWithRetry(fnName, args, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await callServer(fnName, ...args);
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
}
```

### 패턴 4: 다이얼로그에서 입력 → 닫기

```html
<input id="text" />
<button onclick="apply()">Apply</button>

<script>
  function apply() {
    const v = document.getElementById("text").value;
    google.script.run
      .withSuccessHandler(() => {
        google.script.host.editor.focus();
        google.script.host.close();
      })
      .withFailureHandler(err => alert(err.message))
      .applyInsertion(v);
  }
</script>
```

### 패턴 5: 페이지 전환 (Web App SPA)

```html
<script>
  google.script.history.setChangeHandler(e => navigate(e.location.parameter.page));

  function go(page) {
    google.script.history.push({ page }, { page }, "");
    navigate(page);
  }

  function navigate(page) {
    document.querySelectorAll(".page").forEach(el => el.hidden = true);
    document.getElementById("page-" + (page || "home")).hidden = false;
  }

  // 초기 라우트 — 부모의 query string 읽기
  google.script.url.getLocation(loc => navigate(loc.parameter.page));
</script>
```

## 주의사항 / 함정

- **`google.script.run`은 Promise를 반환하지 않는다.** `await google.script.run.xxx()`로 쓰면 `undefined`를 받는다 — Promise 래퍼 필요.
- **순서 보장 없음.** 두 호출을 연달아 발사하면 늦게 시작한 호출이 먼저 끝날 수 있다 — 순서가 중요하면 chain 또는 await.
- **10개 동시 호출 한도** — 위 batch 패턴으로 묶을 것.
- **`undefined`는 안 넘어간다.** 배열 안에서는 `null`로, 객체 속성으로는 누락된다.
- **함수 / Apps Script 서비스 객체 / 순환 참조 / 임의 DOM은 직렬화 불가.**
- **`Date`는 한 방향 직렬화만 안전** — string으로 보내는 게 명시적.
- **서버 함수의 예외**는 `Error` 객체로 클라이언트에 전달되지만, **stack trace는 일반적으로 사라진다.** 서버에서 `console.error`로 별도 로깅 권장.
- **`window.close()`는 다이얼로그에서 동작하지 않는다** — 반드시 `google.script.host.close()`.
- **`google.script.run`에서 호출하는 서버 함수도 6분 타임아웃** — UI 측에서 무한 대기하지 않게 client-side timeout 추가.
- **`underscore_` 함수는 클라이언트에서 호출 불가** — 내부 유틸 보호용.
- **`google.script.history`는 path가 아닌 query/hash만 변경.** 진정한 history routing은 불가능.
- **외부 사이트에 임베드된 Web App 안에서도 `google.script.*`는 정상 동작**한다(IFRAME sandbox 내). 단, `host.close()`는 호스트가 없어 무의미.

## 참고

- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/guides/html/reference
- https://developers.google.com/apps-script/guides/html
- [html-service.md](./html-service.md)
- [doGet-doPost.md](./doGet-doPost.md)
- [content-service.md](./content-service.md)
- [deployment.md](./deployment.md)
