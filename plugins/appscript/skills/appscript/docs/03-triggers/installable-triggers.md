# Installable Triggers (설치형 트리거)

> **출처**
> - https://developers.google.com/apps-script/guides/triggers/installable
> - https://developers.google.com/apps-script/guides/triggers/events
> - https://developers.google.com/apps-script/reference/script/script-app
> - https://developers.google.com/apps-script/reference/script/trigger-builder
> - https://developers.google.com/apps-script/reference/script/clock-trigger-builder
> - https://developers.google.com/apps-script/reference/script/spreadsheet-trigger-builder
>
> **최종 확인일**: 2026-07-22

## 개요

**Installable Trigger(설치형 트리거)** 는 `ScriptApp.newTrigger(functionName)` API 또는 Apps Script IDE의 트리거 화면을 통해 명시적으로 등록하는 자동 실행 함수다. Simple Trigger와 달리:

- **`FULL` 권한**으로 실행되므로 Gmail, UrlFetch, Drive 등 모든 서비스 호출이 가능하다.
- **time-driven**(시간 기반) 실행이 가능하다.
- **Form 제출**, **Calendar 이벤트 변경**, **Sheets 구조 변경** 같은 추가 이벤트를 지원한다.
- 실행 시간 한도가 Simple Trigger의 30초가 아닌 **스크립트 실행 한도(6분/30분)** 까지 늘어난다.

공식 문서의 핵심 표현:

> *"Installable triggers always run under the account of the person who created them."*

즉 **트리거를 만든 사용자의 권한**으로 실행된다. 다른 사용자가 시트를 편집해도 트리거 함수는 만든 사람의 컨텍스트에서 동작한다.

## Builder 패턴

기본 구조는 다음과 같다:

```javascript
ScriptApp.newTrigger("functionName") // 호출할 함수의 "이름(문자열)"
  .{source}()                          // forSpreadsheet / forDocument / forForm / forUserCalendar / timeBased
  .{event}()                           // onEdit / onOpen / onChange / onFormSubmit / atHour / everyMinutes ...
  .create();                           // Trigger 객체 반환
```

`TriggerBuilder`의 source 메서드는 각각 전용 빌더를 반환한다:

| 메서드 | 반환 | 호출 가능한 이벤트 |
| --- | --- | --- |
| `forSpreadsheet(spreadsheet \| id)` | `SpreadsheetTriggerBuilder` | `onOpen()`, `onEdit()`, `onChange()`, `onFormSubmit()` |
| `forDocument(document \| id)` | `DocumentTriggerBuilder` | `onOpen()` |
| `forForm(form \| id)` | `FormTriggerBuilder` | `onOpen()`, `onFormSubmit()` |
| `forUserCalendar(emailAddress)` | `CalendarTriggerBuilder` | `onEventUpdated()` |
| `timeBased()` | `ClockTriggerBuilder` | `everyMinutes()`, `everyHours()`, `atDate()`, `atHour()` 등 |

## 이벤트별 트리거

### 1. Spreadsheet Triggers

```javascript
function installSheetTriggers() {
  const ss = SpreadsheetApp.getActive();

  ScriptApp.newTrigger("handleEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  ScriptApp.newTrigger("handleChange")
    .forSpreadsheet(ss)
    .onChange()
    .create();

  ScriptApp.newTrigger("handleFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger("handleOpen")
    .forSpreadsheet(ss)
    .onOpen()
    .create();
}
```

#### `onEdit` (Installable) vs `onEdit` (Simple)

함수 이름이 같더라도 Installable로 등록하면 별개의 트리거가 된다. 둘 다 존재하면 둘 다 실행된다. 일반적으로:

- 외부 서비스 호출(`UrlFetchApp`, `GmailApp` 등) → Installable
- 단순한 UI/포맷팅 → Simple

#### `onChange` 이벤트 — Installable 전용

`e.changeType`은 다음 중 하나:

| 값 | 설명 |
| --- | --- |
| `EDIT` | 셀 편집 |
| `INSERT_ROW` / `REMOVE_ROW` | 행 추가/삭제 |
| `INSERT_COLUMN` / `REMOVE_COLUMN` | 열 추가/삭제 |
| `INSERT_GRID` / `REMOVE_GRID` | 시트 추가/삭제 |
| `FORMAT` | 셀 서식 변경 |
| `OTHER` | 그 외(예: 이름 정의 변경) |

`onChange`는 `range`를 제공하지 않는다(어디서 변경됐는지 알 수 없음). 어떤 시트가 추가됐는지 추적하려면 `PropertiesService`에 직전 상태를 저장해 비교해야 한다.

#### `onFormSubmit` (Sheets 컨테이너에서)

응답이 시트에 기록된 직후 발화한다. 이벤트 객체:

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| `authMode` | `ScriptApp.AuthMode` | `FULL` |
| `namedValues` | `Object<string, string[]>` | 질문명 → 답변 배열 |
| `values` | `string[]` | 시트 컬럼 순서대로 답변 배열 |
| `range` | `Range` | 새로 추가된 행 |
| `triggerUid` | `string` | 트리거 식별자 |

```javascript
function handleFormSubmit(e) {
  const email = e.namedValues["Email"][0];
  const score = Number(e.namedValues["Score"][0]);
  if (score >= 80) {
    GmailApp.sendEmail(email, "합격 안내", "축하합니다!");
  }
}
```

### 2. Form Triggers

`forForm()`은 폼 자체에서 발화한다. 시트 컨테이너의 `onFormSubmit`과 이벤트 객체가 다르다.

```javascript
ScriptApp.newTrigger("onFormResponse")
  .forForm(FormApp.getActiveForm())
  .onFormSubmit()
  .create();
```

| 속성 | 타입 |
| --- | --- |
| `authMode` | `ScriptApp.AuthMode` |
| `response` | `FormResponse` |
| `source` | `Form` |
| `triggerUid` | `string` |

```javascript
function onFormResponse(e) {
  const response = e.response;
  const itemResponses = response.getItemResponses();
  itemResponses.forEach((ir) => {
    console.log(ir.getItem().getTitle(), "=", ir.getResponse());
  });
}
```

### 3. Document Triggers

Docs는 `onOpen`만 지원한다.

```javascript
ScriptApp.newTrigger("onDocOpen")
  .forDocument(DocumentApp.getActiveDocument())
  .onOpen()
  .create();
```

> Docs에는 `onEdit` Installable이 없다. 텍스트 변경 감지는 일반적으로 사이드바 + `google.script.run` 폴링으로 구현한다.

### 4. Calendar Triggers — `onEventUpdated`

캘린더 이벤트가 생성/수정/삭제되면 발화한다.

```javascript
function installCalendarTrigger() {
  ScriptApp.newTrigger("syncCalendarChange")
    .forUserCalendar(Session.getEffectiveUser().getEmail())
    .onEventUpdated()
    .create();
}

function syncCalendarChange(e) {
  // e.calendarId, e.triggerUid, e.authMode 만 제공된다
  const calendar = CalendarApp.getCalendarById(e.calendarId);
  // 변경 사항은 Advanced Calendar Service의 Events: list + syncToken으로 직접 조회해야 한다
}
```

> 이벤트 객체에 **무엇이 어떻게 변경됐는지**는 들어 있지 않다. 변경 사항을 알려면 Calendar API의 `syncToken`을 사용해 증분 조회해야 한다.

### 5. Time-driven Triggers (Clock)

`ClockTriggerBuilder`의 주요 메서드:

| 메서드 | 의미 |
| --- | --- |
| `after(durationMillis)` | 지정한 시간(ms) 후 1회 실행 |
| `at(date)` | 특정 `Date` 시각에 1회 실행 |
| `atDate(year, month, day)` | 특정 날짜에 1회 실행 (월은 1~12) |
| `atHour(hour)` | 매일/매주 특정 시(0~23)에 실행 — 빈도 메서드와 함께 사용 |
| `nearMinute(minute)` | 시간 단위 실행 시 분 지정(0~59) — 빈도 메서드와 함께 사용 |
| `everyMinutes(n)` | n분마다 실행. **`n`은 1, 5, 10, 15, 30만 허용** |
| `everyHours(n)` | n시간마다 실행 |
| `everyDays(n)` | n일마다 실행 |
| `everyWeeks(n)` | n주마다 실행 |
| `onMonthDay(day)` | 매월 day일에 실행(1~31) |
| `onWeekDay(day)` | 특정 요일에 실행 (`ScriptApp.WeekDay.MONDAY` 등) |
| `inTimezone(tz)` | 위 메서드들의 타임존 기준(예: `"Asia/Seoul"`) |
| `create()` | 트리거 생성 |

#### 매일 오전 9시(서울 기준)

```javascript
ScriptApp.newTrigger("dailyDigest")
  .timeBased()
  .atHour(9)
  .everyDays(1)
  .inTimezone("Asia/Seoul")
  .create();
```

#### 5분마다

```javascript
ScriptApp.newTrigger("poll")
  .timeBased()
  .everyMinutes(5)
  .create();
```

> `everyMinutes(2)`처럼 1/5/10/15/30 외의 값을 주면 트리거 생성 시 예외가 발생한다.

#### 매주 월요일 오전 8시

```javascript
ScriptApp.newTrigger("weeklyReport")
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(8)
  .inTimezone("Asia/Seoul")
  .create();
```

#### Time-driven 이벤트 객체

| 속성 | 타입/값 |
| --- | --- |
| `authMode` | `FULL` |
| `year`, `month`(1~12), `hour`(0~23), `minute`(0~59), `second`(0~59) | number |
| `"day-of-month"` | 1~31 — **bracket 접근 필요** |
| `"day-of-week"` | 1(월)~7(일) — **bracket 접근 필요** |
| `"week-of-year"` | 1~52 — **bracket 접근 필요** |
| `timezone` | `string` |
| `triggerUid` | `string` |

```javascript
function dailyDigest(e) {
  const dow = e["day-of-week"]; // 하이픈 때문에 dot notation 불가
  console.log("Day of week:", dow);
}
```

## 트리거 조회/삭제

### 모든 프로젝트 트리거 조회

```javascript
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((t) => {
    console.log({
      id: t.getUniqueId(),
      handler: t.getHandlerFunction(),
      eventType: t.getEventType(), // EventType enum
      source: t.getTriggerSource(), // TriggerSource enum
      sourceId: t.getTriggerSourceId(),
    });
  });
}
```

### 특정 함수의 트리거만 삭제

```javascript
function deleteTriggersByName(fnName) {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === fnName)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
```

### `ScriptApp.EventType` enum

| 값 | 의미 |
| --- | --- |
| `CLOCK` | Time-driven |
| `ON_OPEN` | 파일 열기 |
| `ON_EDIT` | 셀 편집 |
| `ON_CHANGE` | 구조 변경 |
| `ON_FORM_SUBMIT` | 폼 제출 |
| `ON_EVENT_UPDATED` | Calendar 이벤트 변경 |

### `ScriptApp.TriggerSource` enum

`SPREADSHEETS`, `DOCUMENTS`, `FORMS`, `CALENDAR`, `CLOCK`, `ADDRESSABLE`.

## 코드 예제

### 1. Idempotent installer (중복 방지 설치)

```javascript
function installTriggers() {
  const ss = SpreadsheetApp.getActive();
  const existing = ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());

  if (!existing.includes("handleEdit")) {
    ScriptApp.newTrigger("handleEdit").forSpreadsheet(ss).onEdit().create();
  }
  if (!existing.includes("dailyDigest")) {
    ScriptApp.newTrigger("dailyDigest")
      .timeBased()
      .atHour(9)
      .everyDays(1)
      .inTimezone("Asia/Seoul")
      .create();
  }
}
```

### 2. Web App 배포 시 모든 사용자에게 설치 안내

폼 컨테이너 등은 첫 진입 시 `installable trigger`를 만들도록 유도한다:

```javascript
function onOpen() {
  // Simple trigger
  SpreadsheetApp.getUi()
    .createMenu("Sync")
    .addItem("Install hourly sync", "installHourlySync")
    .addItem("Uninstall", "uninstallHourlySync")
    .addToUi();
}

function installHourlySync() {
  uninstallHourlySync();
  ScriptApp.newTrigger("hourlySync").timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert("Installed.");
}

function uninstallHourlySync() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "hourlySync")
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
```

### 3. `onChange`로 시트 삭제 감지

```javascript
function trackSheets(e) {
  if (e.changeType !== "REMOVE_GRID") return;
  const props = PropertiesService.getDocumentProperties();
  const known = JSON.parse(props.getProperty("sheetNames") || "[]");
  const current = SpreadsheetApp.getActive()
    .getSheets()
    .map((s) => s.getName());
  const removed = known.filter((n) => !current.includes(n));
  console.log("Removed sheets:", removed);
  props.setProperty("sheetNames", JSON.stringify(current));
}
```

### 4. 폼 제출 후 자동 회신 메일

```javascript
function autoReplyOnFormSubmit(e) {
  const email = e.namedValues["Email Address"][0];
  if (!email) return;
  GmailApp.sendEmail(email, "응답이 접수되었습니다", "감사합니다. 24시간 이내 회신드립니다.");
}
```

## 권한과 실행 주체

- **트리거를 만든 사용자(소유자)** 의 권한으로 실행된다.
- 다른 편집자가 시트를 편집해 트리거가 발화해도, 트리거 함수 내부의 `Session.getActiveUser()`는 **트리거 소유자**를, `Session.getEffectiveUser()`는 **실행 컨텍스트 사용자**를 반환한다.
- 트리거 생성 시점에 함수가 사용하는 **모든 OAuth scope**에 대해 동의해야 한다. 코드 변경으로 scope가 추가되면 트리거가 동작하지 않으며, 소유자가 다시 동의해야 한다.
- Workspace 도메인 정책으로 외부 호출이 차단되면 트리거가 조용히 실패할 수 있다.

## `onInstall`과 Installable Edit 트리거의 차이

- `onInstall(e)`: **add-on 설치 직후 1회**만 호출되는 Simple Trigger. 권한 제한.
- Installable `onEdit`: `ScriptApp.newTrigger().onEdit().create()`로 명시적으로 등록한 트리거. `FULL` 권한.

흔한 패턴:

```javascript
function onInstall(e) {
  onOpen(e); // 메뉴를 즉시 만든다
  // 필요한 경우 여기에서 Installable trigger 생성 안내 alert
}
```

## 주의사항 / 함정

- **`everyMinutes(n)`은 1, 5, 10, 15, 30만 허용.** 다른 값은 예외를 던진다.
- **트리거 1개당 사용자당 최대 20개** (참고: `trigger-quotas.md`).
- **소비자 계정 90분/일, Workspace 6시간/일**의 트리거 총 실행 시간 한도. (참고: `trigger-quotas.md`)
- Time-driven 트리거의 실행 시각은 **정확하지 않다.** `atHour(9)`는 9시 정각이 아니라 "9시 ~ 10시 사이"에 실행된다. 정확한 시각이 필요하면 함수 내부에서 다시 체크해야 한다.
- `onChange`는 `range`를 제공하지 않는다 — 어디서 무엇이 바뀌었는지 알려면 별도 상태 추적 필요.
- Form Installable `onFormSubmit`은 폼 컨테이너에서는 `e.response`(FormResponse), 시트 컨테이너에서는 `e.namedValues`/`e.values`/`e.range`로 구조가 다르다.
- Calendar `onEventUpdated`는 변경 내용 자체를 주지 않는다 — Advanced Calendar API의 `syncToken`을 함께 사용해야 한다.
- 트리거가 실패하면 소유자 이메일로 "Summary of failures for Google Apps Script" 메일이 발송된다(끄는 옵션은 IDE에서 알림 설정으로 가능).
- 동일 트리거가 짧은 시간에 중첩 발화할 수 있으므로 `LockService`로 보호하는 게 안전하다.

```javascript
function safeHandler(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    // 실제 작업
  } finally {
    lock.releaseLock();
  }
}
```

## 참고

- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/guides/triggers/events
- https://developers.google.com/apps-script/reference/script/script-app
- https://developers.google.com/apps-script/reference/script/trigger-builder
- https://developers.google.com/apps-script/reference/script/clock-trigger-builder
- [simple-triggers.md](./simple-triggers.md)
- [trigger-quotas.md](./trigger-quotas.md)
