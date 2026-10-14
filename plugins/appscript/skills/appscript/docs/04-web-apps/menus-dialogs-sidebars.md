# 메뉴 · 다이얼로그 · 사이드바 (Ui Service)

> **출처**
> - https://developers.google.com/apps-script/guides/menus
> - https://developers.google.com/apps-script/guides/dialogs
> - https://developers.google.com/apps-script/reference/base/ui (메서드 시그니처·사이드바 폭 확인용)
>
> **최종 확인일**: 2026-07-22

## 개요

편집기 애드온이나 컨테이너 바운드 스크립트는 **`Ui` 서비스**로 호스트 편집기(Sheets/Docs/Forms/Slides)에 UI를 붙일 수 있다. 붙일 수 있는 것은 세 종류다.

| 종류 | 메서드 | 내용물 | 서버 스크립트 |
| --- | --- | --- | --- |
| **커스텀 메뉴** | `ui.createMenu(...).addToUi()` | 메뉴/항목 (텍스트) | — |
| **알림·프롬프트** | `ui.alert(...)`, `ui.prompt(...)` | 미리 정의된 다이얼로그 | **열려 있는 동안 정지(suspend)** |
| **커스텀 다이얼로그·사이드바** | `ui.showModalDialog(...)`, `ui.showModelessDialog(...)`, `ui.showSidebar(...)` | `HtmlService`의 `HtmlOutput` (임의 HTML/CSS/JS) | 정지하지 않음 |

HTML 다이얼로그·사이드바의 내부 마크업/템플릿 세부는 [html-service.md](./html-service.md), 그 안에서 서버를 호출하는 `google.script.run`은 [client-server-comm.md](./client-server-comm.md)를 참고한다. 이 문서는 **UI를 띄우는 `Ui` 진입점**에 집중한다.

## `Ui` 진입점

각 호스트 앱의 서비스 객체에서 `getUi()`로 `Ui` 인스턴스를 얻는다.

| 호스트 앱 | 진입점 |
| --- | --- |
| Google Sheets | `SpreadsheetApp.getUi()` |
| Google Docs | `DocumentApp.getUi()` |
| Google Forms | `FormApp.getUi()` |
| Google Slides | `SlidesApp.getUi()` |

> `getUi()`는 **컨테이너 바운드 스크립트 / 편집기 애드온** 컨텍스트에서만 유효하다. standalone 스크립트나 웹앱(`doGet`)에는 붙일 편집기 UI가 없다.

## 커스텀 메뉴

### 기본 규칙

- 공식: *"Only bound scripts can create menus."* — **컨테이너 바운드 스크립트만** 메뉴를 만들 수 있다.
- 파일을 열 때 메뉴가 보이게 하려면 **`onOpen`** 함수 안에 메뉴 코드를 둔다(`onOpen`은 심플 트리거 → [simple-triggers.md](../03-triggers/simple-triggers.md)).

### `Menu` 빌더 메서드

```javascript
ui.createMenu('Custom Menu')
    .addItem('First item', 'menuItem1')
    .addSeparator()
    .addSubMenu(ui.createMenu('Sub-menu')
        .addItem('Second item', 'menuItem2'))
    .addToUi();
```

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `createMenu(caption)` | `Menu` | 메뉴 빌더 생성 |
| `createAddonMenu()` | `Menu` | 편집기의 **Extensions(확장 프로그램) 메뉴** 아래에 삽입할 하위 메뉴 빌더 생성 |
| `addItem(caption, functionName)` | `Menu` | 항목 추가. 클릭 시 `functionName`(문자열 이름)을 실행 |
| `addSeparator()` | `Menu` | 구분선 추가 |
| `addSubMenu(menu)` | `Menu` | 하위 메뉴 중첩 |
| `addToUi()` | `void` | 빌더 내용을 실제 편집기 메뉴로 렌더 |

> `addItem`의 두 번째 인자는 **함수 자체가 아니라 함수 이름 문자열**이다. `addToUi()`를 호출해야 비로소 메뉴가 나타난다.

### 코드 예제

#### 1) `onOpen`에서 메뉴 구성

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('내 도구')
    .addItem('데이터 정리', 'cleanData')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('내보내기')
      .addItem('CSV로', 'exportCsv')
      .addItem('PDF로', 'exportPdf'))
    .addToUi();
}

function cleanData() { /* ... */ }
function exportCsv() { /* ... */ }
function exportPdf() { /* ... */ }
```

#### 2) 애드온 메뉴 (Extensions 메뉴 아래)

```javascript
function onOpen() {
  DocumentApp.getUi()
    .createAddonMenu()        // Extensions > (애드온 이름) 아래에 붙음
    .addItem('사이드바 열기', 'showSidebar')
    .addToUi();
}
```

## 알림 (`ui.alert`)

미리 정의된 알림 다이얼로그. **열려 있는 동안 서버 측 스크립트가 정지(suspend)** 되며, 사용자가 누른 버튼을 `Button`으로 반환한다.

### 오버로드

| 시그니처 | 반환 |
| --- | --- |
| `alert(prompt)` | `Button` |
| `alert(prompt, buttons)` | `Button` |
| `alert(title, prompt, buttons)` | `Button` |

### `ButtonSet` (표시할 버튼 조합)

| `ButtonSet` | 표시 버튼 |
| --- | --- |
| `OK` | 확인 |
| `OK_CANCEL` | 확인 · 취소 |
| `YES_NO` | 예 · 아니오 |
| `YES_NO_CANCEL` | 예 · 아니오 · 취소 |

### `Button` (반환값으로 분기)

| `Button` | 발생 상황 |
| --- | --- |
| `OK` | 확인 클릭 |
| `CANCEL` | 취소 클릭 |
| `YES` | 예 클릭 |
| `NO` | 아니오 클릭 |
| `CLOSE` | 다이얼로그의 닫기(X)로 닫음 |

```javascript
function confirmDelete() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Please confirm',
    'Are you sure you want to continue?',
    ui.ButtonSet.YES_NO);

  if (result === ui.Button.YES) {
    ui.alert('Confirmation received.');
  } else {
    // NO 또는 CLOSE
    ui.alert('Cancelled.');
  }
}
```

> `alert`는 **모달**이며 열려 있는 동안 서버 실행이 멈춘다. 즉 응답을 받은 다음 줄부터 이어서 실행된다.

## 프롬프트 (`ui.prompt`)

텍스트 입력을 받는 다이얼로그. `alert`와 마찬가지로 **열려 있는 동안 서버 스크립트가 정지**되며, `PromptResponse`를 반환한다.

### 오버로드

| 시그니처 | 반환 |
| --- | --- |
| `prompt(prompt)` | `PromptResponse` |
| `prompt(prompt, buttons)` | `PromptResponse` |
| `prompt(title, prompt, buttons)` | `PromptResponse` |

### `PromptResponse`

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getResponseText()` | `String` | 사용자가 입력한 텍스트 |
| `getSelectedButton()` | `Button` | 사용자가 누른 버튼 (`OK`/`CANCEL`/`CLOSE` 등) |

```javascript
function askName() {
  const ui = DocumentApp.getUi();
  const result = ui.prompt(
    "Let's get to know each other!",
    'Please enter your name:',
    ui.ButtonSet.OK_CANCEL);

  const button = result.getSelectedButton();
  const text = result.getResponseText();

  if (button === ui.Button.OK) {
    ui.alert('Your name is ' + text + '.');
  } else if (button === ui.Button.CANCEL) {
    ui.alert('I didn\'t get your name.');
  } else {
    // CLOSE
    ui.alert('You closed the dialog.');
  }
}
```

> 버튼을 먼저 확인하고(`OK`인지) 그 다음에 `getResponseText()`를 신뢰하는 것이 안전하다. 취소/닫기 시 입력값은 의미가 없다.

## 커스텀 다이얼로그

`HtmlService`로 만든 `HtmlOutput`을 다이얼로그로 띄운다. 알림/프롬프트와 달리 **서버 측 스크립트를 정지시키지 않는다**(다이얼로그와 서버는 `google.script.run`으로 비동기 통신).

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `showModalDialog(userInterface, title)` | `void` | **모달** 다이얼로그. 열려 있는 동안 사용자는 편집기 본문과 상호작용할 수 없음 |
| `showModelessDialog(userInterface, title)` | `void` | **모덜리스** 다이얼로그. 열린 채로도 편집기를 계속 사용할 수 있음 |

```javascript
function showDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Page')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'My custom dialog');
}
```

- 다이얼로그 안의 클라이언트 JS에서 서버 함수를 호출하려면 `google.script.run`을 쓴다 → [client-server-comm.md](./client-server-comm.md).
- 다이얼로그를 닫는 것은 **클라이언트 측** `google.script.host.close()`다. (`window.close()`는 동작하지 않는다 — client-server-comm.md 참고.)
- 크기는 `HtmlOutput`의 `setWidth`/`setHeight`(px)로 지정 → 세부는 [html-service.md](./html-service.md).

## 사이드바

편집기 오른쪽에 붙는 패널. 다이얼로그와 마찬가지로 `HtmlOutput`을 받고, **서버 스크립트를 정지시키지 않는다**.

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `showSidebar(userInterface)` | `void` | 편집기에 사이드바 표시 |

> **폭은 300px 고정.** 공식: *"All sidebars shown by scripts are 300 pixels wide."* — `HtmlOutput`에서 `setWidth`를 줘도 스크립트 사이드바의 폭은 300px로 고정된다.

```javascript
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Page')
      .setTitle('My custom sidebar');
  SlidesApp.getUi().showSidebar(html);
}
```

- 제목은 `HtmlOutput.setTitle(...)`로 지정한다(사이드바 상단 타이틀 바).
- 내부 서버 호출은 `google.script.run`, 닫기는 `google.script.host.close()` → [client-server-comm.md](./client-server-comm.md).

## 심플 `onOpen`의 제약과 컨텍스트 차이

`onOpen`은 **심플 트리거**다. 심플 트리거는 권한(authorization)이 필요한 서비스에 접근할 수 없다는 제약이 있다([simple-triggers.md](../03-triggers/simple-triggers.md) 참고).

- **메뉴 추가 자체는 권한이 필요 없으므로** 심플 `onOpen`에서 문제없이 할 수 있다. 메뉴 **항목을 클릭했을 때 실행되는 함수**는 일반 함수처럼 동작하므로, 그 함수 안에서는 권한이 필요한 작업(Gmail 발송, 다른 파일 접근 등)을 해도 된다.
- 반면 **파일을 여는 순간 자동으로** 권한이 필요한 작업(예: 외부 API 호출, 권한 요구 서비스 접근)이나 사용자별 상태에 따른 UI를 띄우려면, 심플 `onOpen`만으로는 부족하다. **설치형 트리거(installable trigger)** 나 **편집기 애드온** 컨텍스트가 필요하다.
- **애드온 컨텍스트**의 `onOpen`은 실행 환경(authMode)이 다르며, 애드온 설치 여부·권한 승인 상태에 따라 접근 가능한 API가 달라진다. 애드온에서는 보통 `createAddonMenu()`로 Extensions 메뉴 아래에 항목을 붙인다.

## 주의사항 / 함정

1. **`getUi()`는 편집기 컨텍스트 전용** — standalone 스크립트/웹앱에는 UI가 없어 사용할 수 없다.
2. **메뉴는 바운드 스크립트만** 만들 수 있다(*"Only bound scripts can create menus."*).
3. **같은 이름 메뉴는 하나만** — *"can only contain one menu with a given name. If the same script or another script adds a menu with the same name, the new menu replaces the old."* 같은 이름을 다시 추가하면 기존 메뉴를 덮어쓴다.
4. **Forms 메뉴는 편집자에게만 보인다** — *"In Forms, custom menus are visible only to an editor who opens the form to modify it, not to a user who opens the form to respond."* 응답자에게는 보이지 않는다.
5. **`addItem`의 두 번째 인자는 문자열** — 함수 참조가 아니라 함수 **이름**. 오타 시 클릭해도 실행되지 않는다.
6. **`addToUi()`를 빠뜨리면** 빌더만 만들고 메뉴가 화면에 나타나지 않는다.
7. **`alert`/`prompt`는 서버를 정지시킨다** — 응답을 받아야 다음 줄이 실행된다. 반대로 **커스텀 다이얼로그·사이드바는 정지시키지 않으므로** 값 전달은 반드시 `google.script.run`으로 한다.
8. **프롬프트 값은 버튼 확인 후에** — `CANCEL`/`CLOSE`일 때의 `getResponseText()`는 의미 없다. `getSelectedButton()`으로 먼저 분기.
9. **`CLOSE` 케이스를 잊지 말 것** — X로 닫으면 `OK`/`YES`가 아니라 `Button.CLOSE`가 온다. `else`로 뭉뚱그리면 취소와 구분이 안 될 수 있다.
10. **사이드바 폭은 300px 고정** — 넓은 레이아웃이 필요하면 사이드바 대신 모달/모덜리스 다이얼로그를 쓰고 `setWidth`로 크기를 준다.
11. **다이얼로그/사이드바 닫기는 `google.script.host.close()`** — `window.close()`는 동작하지 않는다(→ client-server-comm.md).
12. **심플 `onOpen`은 권한 필요 작업 불가** — 자동 실행되는 권한 요구 로직은 설치형 트리거/애드온으로.

## 참고

- https://developers.google.com/apps-script/guides/menus
- https://developers.google.com/apps-script/guides/dialogs
- https://developers.google.com/apps-script/reference/base/ui
- 관련 문서:
  - [html-service.md](./html-service.md) — 다이얼로그/사이드바의 HTML·템플릿 세부
  - [client-server-comm.md](./client-server-comm.md) — `google.script.run` / `google.script.host.close()`
  - [simple-triggers.md](../03-triggers/simple-triggers.md) — `onOpen` 심플 트리거와 권한 제약
