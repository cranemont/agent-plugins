# 프로젝트 타입: Standalone vs Container-bound

> **출처**
> - https://developers.google.com/apps-script/guides/standalone
> - https://developers.google.com/apps-script/guides/bound
> - https://developers.google.com/apps-script/guides/projects
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script 프로젝트는 크게 두 가지로 나뉜다.

- **Standalone script** — 어떤 Google Workspace 문서에도 종속되지 않는 독립 프로젝트. Drive에 별도 파일로 존재한다.
- **Container-bound script** — Google Sheets/Docs/Slides/Forms 파일에 "묶여 있는(bound)" 프로젝트. 호스트 문서와 운명을 함께한다.

두 타입은 코드 문법이나 런타임은 동일하지만, **생성 방식·접근 가능한 API·트리거 동작·공유 방식**에서 차이가 크다. 잘못된 타입을 선택하면 나중에 옮기기 번거롭다(특히 bound → standalone은 수동 복사 필요).

## Standalone 스크립트

### 정의

공식 정의: "A standalone script is any script that is not bound to a Google Sheets, Google Docs, Google Slides, or Google Forms file."

### 위치 및 생성

- `script.google.com`에서 **New project**
- Google Drive에서 **New > More > Google Apps Script**
- `clasp create-script` (CLI)

Drive에서 일반 파일처럼 보이며, 공유·이동·복사가 가능하다.

### 주요 사용 사례

| 사용 사례 | 설명 |
|---------|------|
| Web app | `doGet` / `doPost`을 구현해 HTTPS 엔드포인트로 배포 |
| Time-driven automation | 매시간/매일 실행되는 installable time trigger |
| Library | 다른 프로젝트에 `userSymbol`로 import 되는 공용 코드 묶음 |
| Workspace add-on | Marketplace 배포용 애드온(공식 가이드는 큰 add-on의 경우 다른 런타임 환경 검토를 권장) |
| Sheets API 호출 | 외부 시스템이 Sheets API를 통해 트리거하는 utility |
| Drive 유틸리티 | 특정 폴더 정리, 권한 일괄 변경 등의 1회성/주기성 스크립트 |

공식 인용: "often utility scripts," 그리고 "lightweight add-on development for you, your team, or your organization."

### 제약

- 호스트 문서가 없으므로 `getActive*()` 계열 메서드(아래 표 참고)를 사용할 수 없다. 항상 ID나 URL로 문서를 열어야 한다.
- Sheets 셀에서 `=myFunction()` 형태의 **커스텀 함수로 직접 호출 불가**.
- Docs/Sheets 메뉴에 직접 메뉴를 추가하려면 add-on으로 배포해야 한다.

## Container-bound 스크립트

### 정의

공식 정의: "A script is bound to a Google Sheets, Google Docs, Google Slides, or Google Forms file if it was created from that document rather than as a standalone script."

호스트 컨테이너로 가능한 것: **Docs, Sheets, Slides, Forms** (그리고 Sites — 단 Sites bound script는 일반적으로 web app으로 배포된다).

### 생성

- Docs/Sheets/Slides: **Extensions > Apps Script**
- Forms: 우상단 **More(⋮) > Script editor**

### 특별한 기능

Bound script만 누릴 수 있는 기능들:

| 기능 | 설명 |
|------|------|
| `getActive*()` 메서드 | `SpreadsheetApp.getActiveSpreadsheet()`, `DocumentApp.getActiveDocument()`, `FormApp.getActiveForm()`, `SlidesApp.getActivePresentation()` 등 — 호스트 ID 없이 부모 문서 접근 |
| `Ui` 서비스 | `SpreadsheetApp.getUi()` 등으로 커스텀 메뉴·다이얼로그·사이드바 추가 |
| Simple triggers | `onOpen(e)`, `onEdit(e)`, `onSelectionChange(e)`, `onInstall(e)` 등이 자동 인식 (`onFormSubmit`은 installable 전용) |
| Installable triggers | 시간/이벤트 기반 트리거 등록 |
| **Sheets 커스텀 함수** | 시트 셀에서 `=MY_FUNCTION(A1:B10)` 형태로 호출 가능 (bound script 전용) |

공식 인용: "Bound scripts can customize Sheets, Docs, and Forms by adding custom menus and dialog boxes or sidebars."

### 제약

공식 인용: "They don't appear in Google Drive, they can't be detached from the file they are bound to" — 즉 Drive에 독립 파일로 보이지 않고, 호스트 문서에서 분리할 수 없다.

- **접근 제어 종속**: "Only users who have permission to edit a container can run its bound script." — 호스트 문서의 편집 권한이 있어야 스크립트도 실행 가능.
- **`getActive*()`의 제한**: 같은 스크립트를 **web app으로 배포**하거나 **Apps Script API**로 외부에서 실행하면 active document 컨텍스트가 없으므로 해당 메서드는 사용 불가.
- **복제 어려움**: 호스트 문서를 "Make a copy"하면 bound script도 함께 복제된다(편리). 그러나 스크립트만 따로 떼어 공유할 수는 없다.
- **버전 관리 어려움**: 한 문서당 하나의 프로젝트이므로 협업·코드 리뷰 워크플로가 standalone보다 어렵다 (clasp 사용 권장).

## 한눈에 비교

| 항목 | Standalone | Container-bound |
|------|-----------|-----------------|
| Drive에 독립 파일로 보임 | ✅ | ❌ |
| 호스트 문서 권한과 분리된 ACL | ✅ | ❌ (호스트와 동일) |
| `getActive*()` 사용 | ❌ | ✅ |
| `Ui` 서비스로 호스트 UI 확장 | ❌ | ✅ |
| `onOpen`, `onEdit` simple trigger | ❌ | ✅ |
| Sheets 커스텀 함수 (`=FUNC()`) | ❌ | ✅ |
| Time-driven trigger | ✅ | ✅ |
| Web app 배포 (`doGet`/`doPost`) | ✅ | ✅ (단 `getActive*()`는 실행 컨텍스트에서 동작 안 함) |
| Library로 사용 | ✅ | ✅ (하지만 권장은 standalone) |
| Workspace add-on으로 게시 | ✅ | ⚠️ (가능하나 일반적이지 않음) |
| 호스트 문서 복제 시 함께 복제 | ❌ | ✅ |
| `clasp` 워크플로 적합도 | 높음 | 가능하지만 script ID를 알아내야 함 |

## 코드 예제

### Standalone — 외부 시트 ID로 접근

```javascript
// standalone에서는 문서 ID를 반드시 지정해야 한다
function appendRowToExternalSheet() {
  const sheet = SpreadsheetApp
    .openById('1AbCDefGhIJklmNoPQRstuVWxyz0123456789')
    .getSheetByName('Logs');
  sheet.appendRow([new Date(), 'standalone job ran']);
}
```

### Container-bound — onOpen으로 커스텀 메뉴 추가

```javascript
// Sheets에 묶인 스크립트. 파일이 열릴 때 자동으로 메뉴가 추가된다.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Reports')
    .addItem('Build weekly report', 'buildWeeklyReport')
    .addToUi();
}

function buildWeeklyReport() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Report');
  sheet.getRange('A1').setValue('Generated at ' + new Date());
}
```

### Container-bound — 시트에서 직접 호출되는 커스텀 함수

```javascript
/**
 * 두 숫자의 합을 반환한다.
 * @customfunction
 */
function MY_SUM(a, b) {
  return a + b;
}
// 시트 셀에서: =MY_SUM(A1, B1)
```

## 선택 기준

다음 질문 순서로 결정하면 명확하다.

1. **시트의 셀에서 직접 함수처럼 호출해야 하나?** → bound 필수.
2. **호스트 문서 열림/편집 이벤트를 처리해야 하나?** → bound 필수.
3. **여러 문서/사용자에 걸쳐 도는 자동화인가, 또는 외부 HTTP 엔드포인트가 필요한가?** → standalone 선호.
4. **다른 프로젝트에서 import할 라이브러리인가?** → standalone.
5. **Marketplace에 배포할 add-on인가?** → standalone (add-on 배포 매니페스트 구성).

## 주의사항 / 함정

- **Bound script는 호스트 문서를 따라간다.** 호스트 문서를 삭제하면 스크립트도 함께 사라진다.
- **권한 위임**: bound script에서 `onEdit`를 등록하면, 실제 편집한 사용자의 권한이 아닌 **트리거 소유자**의 권한으로 실행된다 (installable trigger). simple trigger인 `onEdit`는 권한이 매우 제한되어 있어 `UrlFetchApp` 같은 외부 API를 호출할 수 없다.
- **공유 그룹과 ACL**: bound script는 호스트 문서의 ACL을 그대로 따른다. 외부에 문서를 공유하면 스크립트도 같이 보일 수 있어 민감 코드/토큰을 넣지 말아야 한다.
- **버전 / 배포**: bound script도 versioned deployment·web app·executable API 배포가 가능하지만, 운영용 코드는 standalone에서 관리하고 bound는 얇은 어댑터로만 두는 패턴이 흔하다.

## 참고

- https://developers.google.com/apps-script/guides/standalone
- https://developers.google.com/apps-script/guides/bound
- https://developers.google.com/apps-script/guides/projects
- https://developers.google.com/apps-script/guides/triggers (simple/installable triggers 상세)
