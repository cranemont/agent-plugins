# Simple Triggers (단순 트리거)

> **출처**
> - https://developers.google.com/apps-script/guides/triggers
> - https://developers.google.com/apps-script/guides/triggers/events
> - https://developers.google.com/apps-script/reference/script/script-app
>
> **최종 확인일**: 2026-07-22

## 개요

**Simple Trigger(단순 트리거)** 는 Apps Script가 사용자의 별도 등록 없이 자동으로 인식하는 **예약된 이름의 함수**다. 함수 이름이 `onOpen`, `onEdit`, `onSelectionChange` 등과 일치하면 호스트 애플리케이션(Sheets, Docs 등)에서 해당 이벤트가 발생할 때 자동으로 실행된다.

Simple Trigger의 가장 큰 특징은 **사용자 동의(OAuth) 없이도 동작**한다는 점이다. 대신 권한이 매우 제한적이라 본격적인 자동화에는 부적합하며, 가벼운 UI 변경(메뉴 추가, 셀 변환 등) 용도로 쓰인다. 본격적인 자동화는 [Installable Trigger](./installable-triggers.md)를 사용한다.

## Simple Trigger 함수 목록

| 함수명 | 발생 시점 | 지원 호스트 |
| --- | --- | --- |
| `onOpen(e)` | 파일을 편집 권한으로 열 때 | Sheets, Docs, Slides, Forms |
| `onInstall(e)` | 사용자가 Editor add-on을 설치할 때 | Sheets, Docs, Slides, Forms |
| `onEdit(e)` | 스프레드시트 셀 값이 변경될 때 | Sheets |
| `onSelectionChange(e)` | 스프레드시트 선택 영역이 바뀔 때 | Sheets |
| `doGet(e)` | Web App URL에 HTTP GET 요청이 도달할 때 | Standalone Script (Web App) |
| `doPost(e)` | Web App URL에 HTTP POST 요청이 도달할 때 | Standalone Script (Web App) |

> `doGet`/`doPost`는 [Web Apps 문서](../04-web-apps/doGet-doPost.md)에서 별도로 다룬다.

Form 제출에 대한 Simple Trigger는 존재하지 않는다. 즉 **`onFormSubmit`은 Installable Trigger 전용**이다. Calendar 이벤트 변경(`onEventUpdated`)과 Sheets 구조 변경(`onChange`)도 Installable 전용이다.

## 제약 사항 (Simple Trigger Limitations)

공식 문서에서 명시한 제약은 다음과 같다:

1. **30초 실행 제한**
   - 공식: *"They can't run for longer than 30 seconds."*
   - Installable Trigger의 6분 제한보다 훨씬 짧다.

2. **권한 필요한 서비스 호출 불가**
   - 공식: *"They can't access services that require authorization. For example, a simple trigger can't send an email because the Gmail service requires authorization, but a simple trigger can translate a phrase with the Language service, which is anonymous."*
   - 따라서 `GmailApp`, `DriveApp`(다른 파일), `UrlFetchApp`(외부 호출), `CalendarApp`(타인 캘린더) 등은 사용할 수 없다.
   - 익명/공개 서비스인 `LanguageApp`, `Utilities`, 현재 컨텍스트의 `SpreadsheetApp`(자기 자신) 정도만 안전하게 쓸 수 있다.

3. **다른 사용자 데이터 접근 불가**
   - `Session.getActiveUser().getEmail()`이 익명 사용자에게는 빈 문자열을 반환할 수 있다.

4. **읽기 전용/댓글 전용 모드에서는 발화하지 않음**
   - 사용자에게 편집 권한이 없으면 트리거가 실행되지 않는다.

5. **스크립트/API 실행으로는 발화하지 않음**
   - `Range.setValue()`를 다른 스크립트가 호출해도 `onEdit`는 트리거되지 않는다(사용자의 직접 편집만 인정). 단, `Form.submitGrades()`는 예외다.

## 권한 모드 (AuthMode)

`e.authMode` 속성은 `ScriptApp.AuthMode` enum 값이다.

| 값 | 의미 |
| --- | --- |
| `NONE` | 권한 정보가 전혀 없음(Custom Function 등). |
| `CUSTOM_FUNCTION` | Sheets 셀에서 호출된 Custom Function. 익명/읽기 전용. |
| `LIMITED` | Simple Trigger(예: `onOpen`, `onEdit`). 권한 제한적. |
| `FULL` | Installable Trigger, 메뉴/대화상자에서 직접 실행. 모든 서비스 접근 가능. |

코드에서 분기 처리할 때 자주 쓰인다:

```javascript
function onOpen(e) {
  const menu = SpreadsheetApp.getUi().createMenu("Tools");
  if (e && e.authMode === ScriptApp.AuthMode.NONE) {
    menu.addItem("Authorize", "showAuthorizationPrompt");
  } else {
    menu.addItem("Run report", "runReport");
  }
  menu.addToUi();
}
```

## 이벤트 객체 (Event Object) 구조

각 트리거 함수는 `e` 객체를 받는다. 핵심 속성은 다음과 같다.

### `onOpen(e)`

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| `authMode` | `ScriptApp.AuthMode` | 권한 모드 |
| `source` | `Spreadsheet`/`Document`/`Presentation`/`Form` | 호스트 객체 |
| `user` | `User` | 파일을 연 사용자(권한이 있을 때만) |

```javascript
function onOpen(e) {
  const ss = e.source; // SpreadsheetApp.getActive()와 동일
  ss.toast("환영합니다, " + (e.user ? e.user.getEmail() : "사용자") + "님");
}
```

### `onEdit(e)` (Sheets)

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| `authMode` | `ScriptApp.AuthMode` | 권한 모드 |
| `source` | `Spreadsheet` | 편집된 스프레드시트 |
| `range` | `Range` | 편집된 영역 |
| `value` | `String`/`undefined` | **단일 셀** 새 값. 비어 있으면 `undefined` |
| `oldValue` | `String`/`undefined` | **단일 셀** 이전 값. 비어 있던 경우 `undefined` |
| `user` | `User` | 편집한 사용자 |

> `value`와 `oldValue`는 **단일 셀 편집**에서만 채워진다. 여러 셀을 한 번에 붙여넣은 경우 두 속성 모두 `undefined`이고, `range.getValues()`로 직접 읽어야 한다.

```javascript
function onEdit(e) {
  // A열에 "done"이 입력되면 행 색깔을 초록색으로
  if (e.range.getColumn() !== 1) return;
  if (e.value !== "done") return;
  e.range.getSheet()
    .getRange(e.range.getRow(), 1, 1, e.range.getSheet().getLastColumn())
    .setBackground("#d9ead3");
}
```

### `onSelectionChange(e)` (Sheets)

`onEdit`와 동일한 구조지만 `value`, `oldValue`가 없다. 매우 자주 발화하므로 무거운 작업을 넣지 말 것.

| 속성 | 타입 |
| --- | --- |
| `authMode` | `ScriptApp.AuthMode` |
| `source` | `Spreadsheet` |
| `range` | `Range` (새 선택 영역) |
| `user` | `User` |

### `onChange(e)` — **Installable 전용**

Simple Trigger가 아니지만 자주 혼동되므로 같이 정리한다. `INSERT_ROW`, `REMOVE_ROW`, `INSERT_COLUMN`, `REMOVE_COLUMN`, `INSERT_GRID`, `REMOVE_GRID`, `EDIT`, `FORMAT`, `OTHER` 중 하나를 `e.changeType`으로 받는다. 자세한 내용은 [installable-triggers.md](./installable-triggers.md).

### `onInstall(e)` (Editor add-on)

Add-on이 설치된 직후 한 번 호출된다. 일반적으로 `onOpen(e)`을 그대로 호출해 메뉴를 즉시 만든다.

```javascript
function onInstall(e) {
  onOpen(e);
}
```

## 코드 예제

### 1. Sheets 커스텀 메뉴 추가

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("리포트")
    .addItem("오늘자 요약", "summarizeToday")
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu("내보내기")
        .addItem("CSV로", "exportCsv")
        .addItem("PDF로", "exportPdf"),
    )
    .addToUi();
}
```

### 2. Docs 사이드바 메뉴

```javascript
function onOpen() {
  DocumentApp.getUi()
    .createMenu("Tools")
    .addItem("Show sidebar", "showSidebar")
    .addToUi();
}

function showSidebar() {
  // showSidebar는 Installable이 아닌 사용자 직접 호출이므로 FULL 권한 사용 가능
  const html = HtmlService.createHtmlOutputFromFile("Sidebar").setTitle("Tools");
  DocumentApp.getUi().showSidebar(html);
}
```

### 3. 셀 값에 따른 자동 포맷팅

```javascript
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== "Tasks") return;
  if (e.range.getColumn() !== 3) return; // 상태 컬럼

  const colorMap = {
    Todo: "#fff2cc",
    Doing: "#cfe2f3",
    Done: "#d9ead3",
    Blocked: "#f4cccc",
  };
  const color = colorMap[e.value];
  if (color) {
    sheet
      .getRange(e.range.getRow(), 1, 1, sheet.getLastColumn())
      .setBackground(color);
  }
}
```

### 4. `onSelectionChange`로 우측 정보 패널 갱신 (developer console로만 출력)

```javascript
function onSelectionChange(e) {
  const a1 = e.range.getA1Notation();
  console.log("Selected:", a1, "Sheet:", e.range.getSheet().getName());
}
```

## Simple vs Installable 비교

| 항목 | Simple Trigger | Installable Trigger |
| --- | --- | --- |
| 등록 방법 | 예약된 이름의 함수만 정의 | `ScriptApp.newTrigger()` 또는 UI에서 등록 |
| 권한 모드 | `LIMITED`(또는 `NONE`) | `FULL` |
| OAuth 필요? | X (대부분) | O (생성 시 사용자 인증 필요) |
| 외부 서비스 호출 (Gmail, UrlFetch 등) | X | O |
| 실행 시간 한도 | **30초** | 6분(소비자)/30분(Workspace, 일부 시나리오) |
| Time-driven 지원 | X | O |
| Form 제출 (`onFormSubmit`) | X | O |
| Calendar 이벤트 (`onEventUpdated`) | X | O |
| Sheets 구조 변경 (`onChange`) | X | O |
| 실행 주체 | 이벤트를 발생시킨 사용자 | **트리거를 만든 사용자** |
| 트리거 실패 시 알림 메일 | X (사용자 화면 오류만) | O (스크립트 소유자에게) |

## 일반적인 패턴 / Recipe

### 패턴 1: Simple → Installable로 승격

Simple Trigger 안에서 외부 서비스를 써야 한다면, Simple은 메뉴만 만들고 실제 작업은 Installable로 등록한다.

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Sync")
    .addItem("Enable hourly sync", "installHourlySync")
    .addToUi();
}

function installHourlySync() {
  // 사용자가 한 번 클릭하면 FULL 권한으로 트리거가 등록됨
  ScriptApp.newTrigger("syncToExternal")
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getUi().alert("Sync 설정 완료");
}
```

### 패턴 2: `onEdit` 가드 절

```javascript
function onEdit(e) {
  if (!e || !e.range) return;            // 직접 실행 방어
  if (e.value === e.oldValue) return;    // 의미 없는 호출
  // ...
}
```

> `onEdit`를 IDE의 ▶ Run 버튼으로 직접 실행하면 `e`가 `undefined`다.

### 패턴 3: PropertiesService로 사용자별 상태 저장

Simple Trigger 자체는 권한이 약하지만, `PropertiesService.getDocumentProperties()`는 문서 단위로 사용할 수 있다.

```javascript
function onSelectionChange(e) {
  const props = PropertiesService.getDocumentProperties();
  props.setProperty("lastCell", e.range.getA1Notation());
}
```

## 주의사항 / 함정

- **`onEdit`은 사용자 키 입력에만 발화**한다. 다른 스크립트의 `range.setValue()`나 Apps Script API 호출에는 발화하지 않는다.
- 같은 이름의 함수를 여러 번 정의하면 마지막 정의만 살아남는다. 라이브러리에서 `onOpen`을 정의해도 호출되지 않는다 — **컨테이너 스크립트(container-bound)** 의 `onOpen`만 호출된다.
- Simple Trigger에서 30초를 초과하면 실행이 중단되고, 사용자에게 별도 알림 메일이 가지 않는다(소유자가 로그를 직접 봐야 한다).
- `e.user`는 도메인 외부 사용자나 권한 설정에 따라 `null`/이메일 없음으로 올 수 있다.
- Editor add-on의 `onOpen`은 **호스트의 `onOpen`**과 동시에 호출된다 — 컨테이너 스크립트와 add-on이 동일 메뉴 항목을 만들면 중복될 수 있다.
- `onInstall(e)`은 **add-on**에서만 의미가 있다. 일반 컨테이너 스크립트에서는 호출되지 않는다.

## 참고

- https://developers.google.com/apps-script/guides/triggers
- https://developers.google.com/apps-script/guides/triggers/events
- https://developers.google.com/apps-script/reference/script/script-app
- [installable-triggers.md](./installable-triggers.md)
- [trigger-quotas.md](./trigger-quotas.md)
