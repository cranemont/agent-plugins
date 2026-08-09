# Spreadsheet 서비스 (SpreadsheetApp)

> **출처**
> - https://developers.google.com/apps-script/reference/spreadsheet (서비스 개요)
> - https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
> - https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
> - https://developers.google.com/apps-script/reference/spreadsheet/sheet
> - https://developers.google.com/apps-script/reference/spreadsheet/range
> - https://developers.google.com/apps-script/reference/spreadsheet/rich-text-value
> - https://developers.google.com/apps-script/reference/spreadsheet/data-validation
> - https://developers.google.com/apps-script/reference/spreadsheet/banding
> - https://developers.google.com/apps-script/reference/spreadsheet/pivot-table
> - https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart
> - https://developers.google.com/apps-script/reference/spreadsheet/filter
> - https://developers.google.com/apps-script/reference/spreadsheet/named-range
> - https://developers.google.com/apps-script/reference/spreadsheet/developer-metadata
> - https://developers.google.com/apps-script/advanced/sheets
> - https://developers.google.com/apps-script/guides/support/best-practices
>
> **최종 확인일**: 2026-07-22

---

## 개요

Spreadsheet 서비스는 Google Sheets를 Apps Script에서 다루는 가장 핵심적인 서비스이며, Workspace 자동화의 출발점이다. 진입점은 전역 객체 `SpreadsheetApp`이며, 여기서 `Spreadsheet` → `Sheet` → `Range`로 이어지는 계층 구조로 거의 모든 작업이 이루어진다.

이 서비스는 두 가지 형태로 제공된다:

1. **기본 서비스 (`SpreadsheetApp`)**: 객체 지향적인 API. 대부분의 작업에 충분하며, 직관적이다. 이 문서가 다루는 주된 대상이다.
2. **고급 서비스 (`Sheets`, Sheets API v4 래퍼)**: REST API를 그대로 노출. 한 번의 `batchUpdate` 호출에 수십~수백 개의 수정 요청을 묶을 수 있어, 대량 수정 시 기본 서비스보다 훨씬 빠르다. (마지막 섹션 참고)

> **성능의 본질**: Apps Script와 Sheets 사이의 모든 호출은 RPC다. 즉 `range.getValue()` 한 번도 네트워크 왕복을 일으킨다. 이 문서 전반에 걸쳐 강조되는 "배치 패턴"은 모두 이 사실에서 파생된다.

---

## 클래스 구조

```
SpreadsheetApp (전역 진입점)
├── Spreadsheet (스프레드시트 파일 1개)
│   ├── Sheet (시트 1개) ──────────────┐
│   │   ├── Range (셀 범위) ─── RichTextValue / DataValidation / Banding
│   │   ├── Filter / FilterCriteria
│   │   ├── PivotTable ── PivotGroup / PivotValue
│   │   ├── EmbeddedChart
│   │   ├── Protection
│   │   ├── ConditionalFormatRule
│   │   ├── Drawing / OverGridImage / Slicer
│   │   ├── Group (행/열 그룹)
│   │   └── DataSourceTable / DataSourcePivotTable
│   ├── NamedRange
│   ├── DeveloperMetadata / DeveloperMetadataFinder
│   ├── SpreadsheetTheme
│   └── Protection
└── (Builder factories) newDataValidation, newRichTextValue,
    newTextStyle, newConditionalFormatRule, newFilterCriteria,
    newColor, newCellImage, newDataSourceSpec
```

| 클래스 | 책임 |
|---|---|
| `SpreadsheetApp` | 진입점, 팩토리, 빌더, 활성 컨텍스트 |
| `Spreadsheet` | 파일 메타데이터, 시트 목록, 명명 범위, 공유 |
| `Sheet` | 단일 워크시트 — 행/열 관리, 동결, 정렬, 차트 |
| `Range` | 셀 범위에 대한 모든 읽기/쓰기, 서식, 검증 |
| `RangeList` | 한 시트의 여러 범위를 묶어 일괄 작업 |
| `RichTextValue` | 셀 내부에 부분 서식이 다른 텍스트 |
| `DataValidation` | 입력 검증 규칙 (드롭다운, 숫자 범위 등) |
| `Banding` | 행/열 줄무늬 색상 |
| `ConditionalFormatRule` | 조건부 서식 |
| `NamedRange` | 이름 붙은 범위 |
| `DeveloperMetadata` | 셀/시트/스프레드시트에 붙는 사용자 정의 키-값 |
| `Filter` / `FilterCriteria` | 시트의 기본 필터 |
| `PivotTable` | 피벗 테이블 |
| `EmbeddedChart` | 시트에 삽입된 차트 |
| `Protection` | 시트/범위 보호 |

---

## SpreadsheetApp (전역 진입점)

### 스프레드시트 열기/생성

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getActiveSpreadsheet()` | `Spreadsheet \| null` | 컨테이너 바운드 스크립트가 부착된 스프레드시트. 독립형 스크립트에서는 `null`. |
| `getActive()` | `Spreadsheet \| null` | `getActiveSpreadsheet()`의 별칭. |
| `openById(id)` | `Spreadsheet` | 파일 ID로 열기. ID는 URL의 `/d/{ID}/edit` 부분. |
| `openByUrl(url)` | `Spreadsheet` | 전체 URL로 열기. |
| `open(file)` | `Spreadsheet` | DriveApp의 `File` 객체로 열기. |
| `create(name)` | `Spreadsheet` | 새 스프레드시트 생성 (내 드라이브 루트에). |
| `create(name, rows, columns)` | `Spreadsheet` | 차원 지정 생성. |

### 활성 컨텍스트 (UI 트리거에서 주로 사용)

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getActiveSheet()` | `Sheet` | 현재 보이는 시트. |
| `setActiveSheet(sheet)` | `Sheet` | 시트를 활성화 (사용자 화면 이동). |
| `getActiveRange()` | `Range \| null` | 사용자가 선택한 범위. `onEdit`/`onSelectionChange`에서 유용. |
| `setActiveRange(range)` | `Range` | 범위를 활성 선택으로 만듦. |
| `getActiveRangeList()` | `RangeList \| null` | Ctrl+클릭으로 다중 선택된 범위 목록. |
| `getCurrentCell()` | `Range \| null` | 다중 선택 안에서 굵게 표시된 셀. |
| `getSelection()` | `Selection` | 활성 시트 + 활성 범위 + 현재 셀을 묶은 객체. |

### UI 및 빌더

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getUi()` | `Ui` | 메뉴/대화상자/Toast UI. **컨테이너 바인딩 + UI 컨텍스트에서만 동작.** |
| `flush()` | `void` | 보류 중인 모든 시트 변경 사항을 즉시 적용. |
| `newDataValidation()` | `DataValidationBuilder` | 입력 검증 규칙 빌더. |
| `newRichTextValue()` | `RichTextValueBuilder` | 부분 서식 텍스트 빌더. |
| `newTextStyle()` | `TextStyleBuilder` | 텍스트 스타일 빌더. |
| `newConditionalFormatRule()` | `ConditionalFormatRuleBuilder` | 조건부 서식 규칙 빌더. |
| `newFilterCriteria()` | `FilterCriteriaBuilder` | 필터 조건 빌더. |
| `newColor()` | `ColorBuilder` | RGB/테마 컬러 빌더. |
| `newCellImage()` | `CellImageBuilder` | 셀 내 이미지 빌더 (`IMAGE` 함수 대체용). |
| `newDataSourceSpec()` | `DataSourceSpecBuilder` | 연결된 시트(BigQuery 등) 사양. |

### 주요 Enum (전부 `SpreadsheetApp.XXX`로 접근)

| Enum | 대표 값 | 용도 |
|---|---|---|
| `Dimension` | `ROWS`, `COLUMNS` | `moveColumns`/`autoResize` 등에서 축 지정. |
| `Direction` | `UP`, `DOWN`, `PREVIOUS`, `NEXT` | `Range.getNextDataCell`. |
| `WrapStrategy` | `OVERFLOW`, `WRAP`, `CLIP` | 셀 텍스트 줄바꿈 전략. |
| `BorderStyle` | `SOLID`, `DOTTED`, `DASHED`, `DOUBLE`, `SOLID_THICK` | `setBorder` 스타일. |
| `BandingTheme` | `LIGHT_GREY`, `CYAN`, `GREEN`, `YELLOW` 등 | 줄무늬 테마. |
| `DataValidationCriteria` | `VALUE_IN_LIST`, `NUMBER_BETWEEN`, `DATE_IS_VALID_DATE`, `CHECKBOX` 등 | 검증 종류. |
| `BooleanCriteria` | `CELL_EMPTY`, `TEXT_CONTAINS`, `NUMBER_GREATER_THAN` 등 | 조건부 서식 조건. |
| `CopyPasteType` | `PASTE_NORMAL`, `PASTE_VALUES`, `PASTE_FORMAT`, `PASTE_FORMULA` 등 | `copyTo` 옵션. |
| `AutoFillSeries` | `DEFAULT_SERIES`, `ALTERNATE_SERIES` | `Range.autoFill`. |
| `SortOrder` | `ASCENDING`, `DESCENDING` | 정렬 방향. |
| `PivotTableSummarizeFunction` | `SUM`, `COUNTA`, `AVERAGE`, `MAX`, `MIN`, `MEDIAN`, `STDEV` 등 | 피벗 값. |
| `RecalculationInterval` | `ON_CHANGE`, `MINUTE`, `HOUR` | 휘발성 함수(`NOW`, `RAND`) 재계산 주기. |
| `ProtectionType` | `RANGE`, `SHEET` | 보호 종류. |
| `TextDirection` | `LEFT_TO_RIGHT`, `RIGHT_TO_LEFT` | 텍스트 방향. |
| `ColorType` | `RGB`, `THEME` | `Color` 객체 유형. |
| `ThemeColorType` | `TEXT`, `BACKGROUND`, `ACCENT1`~`ACCENT6` 등 | 시트 테마 컬러 슬롯. |
| `SheetType` | `GRID`, `OBJECT`, `DATASOURCE` | 시트 종류. |
| `ValueType` | `IMAGE` 등 | `getValueType` 반환. |

### 예제: 진입점들

```javascript
function entrypointExamples() {
  // 1) 컨테이너 바운드 스크립트
  const ssA = SpreadsheetApp.getActiveSpreadsheet();

  // 2) ID로 열기
  const ssB = SpreadsheetApp.openById('1AbCdEfGhIjKlMnOpQrStUvWxYz_example');

  // 3) URL로 열기
  const ssC = SpreadsheetApp.openByUrl(
    'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_example/edit'
  );

  // 4) 새로 만들기
  const ssD = SpreadsheetApp.create('Monthly Report 2026-05', 100, 26);
  Logger.log(ssD.getUrl());

  // 5) Drive 파일로 열기
  const file = DriveApp.getFileById('1AbCdEf...');
  const ssE = SpreadsheetApp.open(file);
}
```

---

## Spreadsheet 클래스

스프레드시트 파일 한 개에 대응하며, 시트 목록·공유·명명 범위·전체 보호를 다룬다.

### 식별자 / URL

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getId()` | `String` | 파일 ID. |
| `getUrl()` | `String` | 편집 URL. |
| `getName()` | `String` | 파일명. |
| `rename(newName)` | `void` | 파일명 변경. |
| `getFormUrl()` | `String \| null` | 응답을 받는 Google Form URL. 연결 없으면 `null`. |
| `getNumSheets()` | `Integer` | 시트 개수. |
| `getOwner()` | `User \| null` | 소유자 (개인 계정만; 공유 드라이브는 `null`). |

### 시트 관리

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getSheets()` | `Sheet[]` | 시트 배열 (탭 순서). |
| `getSheetByName(name)` | `Sheet \| null` | 이름으로 시트 찾기. |
| `getSheetById(id)` | `Sheet \| null` | 숫자 ID로 찾기 (탭 색깔 옆 gid). |
| `getActiveSheet()` | `Sheet` | 활성 시트. |
| `setActiveSheet(sheet)` | `Sheet` | 활성 시트 지정. |
| `insertSheet()` | `Sheet` | 마지막에 새 시트 추가. |
| `insertSheet(name)` | `Sheet` | 이름 지정 새 시트. |
| `insertSheet(index)` | `Sheet` | 위치 지정 새 시트. |
| `insertSheet(name, index, options)` | `Sheet` | `{template: sheet}` 옵션으로 복제. |
| `duplicateActiveSheet()` | `Sheet` | 활성 시트 복제. |
| `deleteSheet(sheet)` | `void` | 시트 삭제. |
| `deleteActiveSheet()` | `Sheet` | 활성 시트 삭제 후 다음 활성 시트 반환. |
| `moveActiveSheet(pos)` | `void` | 활성 시트의 탭 위치 이동 (1-인덱스). |
| `renameActiveSheet(newName)` | `void` | 활성 시트 이름 변경. |

### 명명 범위 (Named Range)

| 메서드 | 반환 | 설명 |
|---|---|---|
| `setNamedRange(name, range)` | `void` | 이름으로 등록. |
| `getNamedRanges()` | `NamedRange[]` | 모든 명명 범위. |
| `getRangeByName(name)` | `Range \| null` | 이름으로 `Range` 얻기. |
| `removeNamedRange(name)` | `void` | 이름 제거. |

### 보호 (Protection)

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getProtections(type)` | `Protection[]` | `SpreadsheetApp.ProtectionType.RANGE` 또는 `SHEET`. |

### 공유자 관리

| 메서드 | 반환 | 설명 |
|---|---|---|
| `addEditor(email)` / `addEditor(user)` | `Spreadsheet` | 편집자 추가. |
| `addEditors(emails)` | `Spreadsheet` | 다중 추가. |
| `removeEditor(email)` / `removeEditor(user)` | `Spreadsheet` | 편집자 제거. |
| `addViewer(email)` / `addViewers(emails)` | `Spreadsheet` | 뷰어 추가. |
| `removeViewer(email)` | `Spreadsheet` | 뷰어 제거. |
| `addCommenter(email)` | `Spreadsheet` | 댓글 작성자 추가. |
| `getEditors()` | `User[]` | 편집자 목록. |
| `getViewers()` | `User[]` | 뷰어 목록. |

### 테마 / 글로벌 옵션

| 메서드 | 반환 | 설명 |
|---|---|---|
| `setSpreadsheetTheme(theme)` | `SpreadsheetTheme` | 테마 적용. |
| `getSpreadsheetTheme()` | `SpreadsheetTheme \| null` | 현재 테마. |
| `resetSpreadsheetTheme()` | `SpreadsheetTheme` | 기본 테마로 리셋. |
| `getPredefinedSpreadsheetThemes()` | `SpreadsheetTheme[]` | 사전 정의 테마 목록. |
| `setSpreadsheetLocale(locale)` | `void` | 예: `'ko_KR'`. |
| `setSpreadsheetTimeZone(tz)` | `void` | 예: `'Asia/Seoul'`. **Date 객체 해석에 영향**. |
| `getSpreadsheetTimeZone()` | `String` | 현재 시간대 ID. |
| `setRecalculationInterval(interval)` | `Spreadsheet` | `NOW()`, `RAND()` 재계산 주기. |
| `setIterativeCalculationEnabled(b)` | `Spreadsheet` | 순환 참조 허용. |
| `setMaxIterativeCalculationCycles(n)` | `Spreadsheet` | 최대 반복 횟수. |

### 일괄 작업 (스프레드시트 레벨)

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getDataSources()` | `DataSource[]` | 연결된 데이터 소스 (BigQuery/Looker). |
| `refreshAllDataSources()` | `void` | 모든 데이터 소스 새로고침. |
| `getRangeList(a1Notations)` | `RangeList` | 활성 시트의 다중 범위 묶음. |

### 예제: 시트 생성 및 공유

```javascript
function setupMonthlyReport() {
  const ss = SpreadsheetApp.create('2026-05 매출 보고서');
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  ss.setSpreadsheetLocale('ko_KR');

  // 시트 정리
  const defaultSheet = ss.getSheets()[0];
  ss.insertSheet('Summary', 0);
  defaultSheet.setName('Raw');

  // 공유
  ss.addEditor('teammate@example.com');
  ss.addViewers(['reader1@example.com', 'reader2@example.com']);

  // 명명 범위
  ss.setNamedRange('SalesTable', ss.getSheetByName('Raw').getRange('A1:F1000'));

  Logger.log('생성 완료: ' + ss.getUrl());
}
```

---

## Sheet 클래스

단일 워크시트에 대한 거의 모든 작업. 행/열 추가, 동결, 정렬, 보호, 차트 등이 여기서 시작된다.

### 식별 및 메타

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getName()` | `String` | 시트 이름 (탭 이름). |
| `setName(name)` | `Sheet` | 이름 변경. 중복은 에러. |
| `getSheetId()` | `Integer` | 숫자 ID (URL의 `gid=`). |
| `getIndex()` | `Integer` | 탭 위치 (1-인덱스). |
| `getParent()` | `Spreadsheet` | 소속 스프레드시트. |
| `getType()` | `SheetType` | `GRID`, `OBJECT`, `DATASOURCE`. |
| `activate()` | `Sheet` | 활성화. |
| `copyTo(spreadsheet)` | `Sheet` | 다른 (또는 같은) 스프레드시트로 복제. 이름이 `"Copy of ..."`. |

### 차원 조회 — **핵심 함정 주의**

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getLastRow()` | `Integer` | **데이터가 있는 마지막 행** (1-인덱스). 빈 시트면 `0`. |
| `getLastColumn()` | `Integer` | 데이터가 있는 마지막 열. |
| `getMaxRows()` | `Integer` | **물리적 행 수** (빈 행 포함). 기본 시트는 1000. |
| `getMaxColumns()` | `Integer` | 물리적 열 수. 기본 26 (A–Z). |
| `getFrozenRows()` / `getFrozenColumns()` | `Integer` | 동결된 행/열 수. |

> **함정**: 시트 중간에 빈 행이 있고 그 아래 다시 데이터가 있다면, `getLastRow()`는 진짜 마지막 데이터 행을 반환한다. 하지만 "한 열만 채워진 마지막 행"을 알고 싶다면 `sheet.getRange('A:A').getValues()`를 직접 훑어야 한다.

### 범위 얻기 (Sheet → Range)

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getRange(row, col)` | `Range` | 단일 셀. **1-인덱스**. |
| `getRange(row, col, numRows)` | `Range` | 단일 열 범위. |
| `getRange(row, col, numRows, numCols)` | `Range` | 사각형 범위. |
| `getRange(a1Notation)` | `Range` | `'A1:C10'`, `'Sheet1!A:A'`, R1C1도 가능. |
| `getRangeList(a1Notations)` | `RangeList` | 한 시트의 여러 범위 묶음. |
| `getDataRange()` | `Range` | **데이터가 있는 영역만**. `A1`부터 `getLastRow/Column`까지. |
| `getActiveCell()` | `Range` | 현재 셀. |
| `getActiveRange()` | `Range \| null` | 활성 범위. |
| `getSheetValues(row, col, numRows, numCols)` | `Object[][]` | `Range` 객체 없이 값만 빠르게. |

### 행 / 열 삽입·삭제·이동

| 메서드 | 반환 | 설명 |
|---|---|---|
| `insertRowBefore(pos)` / `insertRowAfter(pos)` | `Sheet` | 1행 삽입. |
| `insertRows(rowIndex)` / `insertRows(rowIndex, n)` | `void` | 다수 행 삽입. |
| `insertRowsBefore(pos, n)` / `insertRowsAfter(pos, n)` | `Sheet` | 위치 기준 다수 삽입. |
| `deleteRow(pos)` / `deleteRows(pos, n)` | `Sheet` / `void` | 삭제. |
| `moveRows(rowSpec, destIdx)` | `void` | 범위 단위 이동. |
| `appendRow(rowContents)` | `Sheet` | **데이터 영역 다음 행에 추가**. 동시성 안전. |
| 열 메서드 | — | `insertColumnBefore`, `insertColumns`, `deleteColumn`, `moveColumns` 등 동일 패턴. |

### 행/열 숨기기·표시

| 메서드 | 설명 |
|---|---|
| `hideRow(range)` / `hideRows(idx, n)` / `showRows(idx, n)` | 행 숨김 토글. |
| `hideColumn(range)` / `hideColumns(idx, n)` / `showColumns(idx, n)` | 열 숨김 토글. |
| `isRowHiddenByUser(pos)` / `isRowHiddenByFilter(pos)` | 사용자가 숨겼는지 vs 필터로 숨겼는지 구분. |
| `isColumnHiddenByUser(pos)` | 열 숨김 여부. |

### 크기

| 메서드 | 설명 |
|---|---|
| `setColumnWidth(pos, px)` / `setColumnWidths(start, n, px)` | 열 너비 (픽셀). |
| `setRowHeight(pos, px)` / `setRowHeights(start, n, px)` | 행 높이. |
| `setRowHeightsForced(start, n, px)` | 줄바꿈 무시 강제 높이. |
| `autoResizeColumn(pos)` / `autoResizeColumns(start, n)` | 내용에 맞게 자동 조정. |
| `autoResizeRows(start, n)` | 행 자동 조정. |
| `getColumnWidth(pos)` / `getRowHeight(pos)` | 현재 크기. |

### 동결 / 정렬 / 클리어

| 메서드 | 설명 |
|---|---|
| `setFrozenRows(n)` / `setFrozenColumns(n)` | 동결. `0`으로 해제. |
| `sort(col)` / `sort(col, ascending)` | 시트 전체 정렬 (1-인덱스 컬럼). |
| `clear()` | 내용 + 서식 + 노트 모두. |
| `clear({contentsOnly, formatOnly, validationsOnly, commentsOnly})` | 옵션. |
| `clearContents()` | 내용만. |
| `clearFormats()` / `clearNotes()` | 서식만 / 노트만. |
| `clearConditionalFormatRules()` | 조건부 서식 전체. |

### 외관 / 색

| 메서드 | 설명 |
|---|---|
| `setTabColor(cssOrNull)` | 탭 색 (deprecated; `setTabColorObject` 권장). |
| `setTabColorObject(color)` | `Color` 객체로. |
| `setHiddenGridlines(b)` | 격자선 표시 토글. |
| `setRightToLeft(b)` | RTL 레이아웃. |
| `hideSheet()` / `showSheet()` / `isSheetHidden()` | 시트 숨김. |

### 필터·차트·이미지·슬라이서

| 메서드 | 설명 |
|---|---|
| `getFilter()` | 기본 필터 (없으면 `null`). |
| `newChart()` | `EmbeddedChartBuilder` 시작. |
| `insertChart(chart)` / `updateChart(chart)` / `removeChart(chart)` | 차트 CRUD. |
| `getCharts()` | 시트의 모든 차트. |
| `insertImage(blobOrUrl, col, row, offsetX?, offsetY?)` | 그리드 위 이미지. |
| `getImages()` / `getDrawings()` | 이미지/도형 목록. |
| `insertSlicer(range, row, col)` | 슬라이서 삽입. |
| `getSlicers()` | 슬라이서 목록. |

### 보호 / 메타데이터

| 메서드 | 설명 |
|---|---|
| `protect()` | 시트 전체 보호 `Protection` 생성. |
| `getProtections(type)` | 범위/시트 보호 목록. |
| `addDeveloperMetadata(key, value?, visibility?)` | 개발자 메타데이터 추가. |
| `getDeveloperMetadata()` | 시트에 직접 부착된 메타데이터. |
| `createDeveloperMetadataFinder()` | 검색기 생성. |

### 예제: 데이터 영역만 깔끔히 다루기

```javascript
function processSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Raw');
  if (!sheet) throw new Error('Raw 시트를 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return; // 헤더만 있거나 비어있음

  // 헤더 제외 데이터만 (2행부터)
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  Logger.log('데이터 행 수: ' + data.length);
}
```

---

## Range 클래스 (가장 핵심)

Sheets 자동화의 90% 이상은 `Range`다. **모든 좌표는 1-인덱스이며, 모든 2차원 배열은 `[row][col]` 순서**다.

### 좌표 / 메타데이터

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getRow()` | `Integer` | 시작 행 (1-인덱스). |
| `getColumn()` | `Integer` | 시작 열 (1-인덱스, A=1). |
| `getLastRow()` | `Integer` | 끝 행 (포함). |
| `getLastColumn()` | `Integer` | 끝 열. |
| `getNumRows()` | `Integer` | 행 개수. |
| `getNumColumns()` | `Integer` | 열 개수. |
| `getA1Notation()` | `String` | 예: `"B2:D10"`. |
| `getSheet()` | `Sheet` | 소속 시트. |
| `getGridId()` | `Integer` | 시트 gid. |
| `isBlank()` | `Boolean` | 모든 셀이 비어있는지. |

### 값 읽기

| 메서드 | 반환 | 설명 |
|---|---|---|
| `getValue()` | `Object` | 좌상단 셀의 값. 타입: `String`, `Number`, `Boolean`, `Date`, `''`(빈 셀). |
| `getValues()` | `Object[][]` | **사각형 그리드**. 비어있는 셀은 빈 문자열 `''`. **`null` 아님**. |
| `getDisplayValue()` | `String` | 화면에 보이는 그대로 (서식 적용 후 문자열). |
| `getDisplayValues()` | `String[][]` | 표시값 그리드. |
| `getFormula()` | `String` | 수식 (예: `"=SUM(A1:A10)"`). 수식이 없으면 `""`. |
| `getFormulas()` | `String[][]` | 수식 그리드. |
| `getFormulaR1C1()` | `String` | R1C1 표기법. |
| `getRichTextValue()` | `RichTextValue \| null` | 부분 서식. |
| `getRichTextValues()` | `RichTextValue[][] \| null[][]` | 그리드. |
| `getNote()` / `getNotes()` | `String` / `String[][]` | 노트 (셀 메모). |
| `getBackground()` / `getBackgrounds()` | `String` / `String[][]` | 배경색 hex. |
| `getBackgroundObject()` / `getBackgroundObjects()` | `Color` / `Color[][]` | RGB+테마 컬러 포함. |
| `getFontColor()` / `getFontColors()` | 동일 | 텍스트 색. |
| `getFontFamily()` / `getFontFamilies()` | `String` / `String[][]` | 폰트 패밀리. |
| `getFontSize()` / `getFontSizes()` | `Integer` / `Integer[][]` | 포인트. |
| `getFontWeight()` / `getFontWeights()` | `"normal" \| "bold"` | |
| `getFontStyle()` / `getFontStyles()` | `"normal" \| "italic"` | |
| `getFontLine()` / `getFontLines()` | `"none" \| "underline" \| "line-through"` | |
| `getNumberFormat()` / `getNumberFormats()` | `String` | 예: `"0.00"`, `"yyyy-mm-dd"`. |
| `getHorizontalAlignment()` / `getVerticalAlignment()` | `String` | `"left"\|"center"\|"right"`, `"top"\|"middle"\|"bottom"`. |
| `getWrap()` / `getWraps()` | `Boolean` | |
| `getWrapStrategy()` / `getWrapStrategies()` | `WrapStrategy` | |
| `getTextStyle()` / `getTextStyles()` | `TextStyle` | 폰트 통합 객체. |
| `getTextRotation()` / `getTextRotations()` | `TextRotation` | 회전. |
| `getDataValidation()` / `getDataValidations()` | `DataValidation \| null` | 검증 규칙. |
| `getValueType()` / `getValueTypes()` | `ValueType` | 예: `IMAGE`. |
| `getMergedRanges()` | `Range[]` | 이 범위와 겹치는 병합 영역들. |
| `isPartOfMerge()` | `Boolean` | |
| `getNextDataCell(direction)` | `Range` | Ctrl+화살표 동작 (빈 셀까지). |

### 값 쓰기

| 메서드 | 반환 | 설명 |
|---|---|---|
| `setValue(value)` | `Range` | 단일 값. Number/String/Boolean/Date. |
| `setValues(values)` | `Range` | **차원이 정확히 일치**해야 함. 안 맞으면 에러. |
| `setFormula(formula)` | `Range` | `'='`로 시작. |
| `setFormulas(formulas)` | `Range` | 그리드. |
| `setFormulaR1C1(formula)` / `setFormulasR1C1` | `Range` | R1C1. |
| `setRichTextValue(rich)` / `setRichTextValues(richs)` | `Range` | 부분 서식. |
| `setNote(note)` / `setNotes(notes)` | `Range` | 셀 메모. `null` 또는 `""`로 지우기. |
| `setNumberFormat(fmt)` / `setNumberFormats(fmts)` | `Range` | `"#,##0"`, `"0.00%"`, `"yyyy-mm-dd hh:mm"` 등. |

> **함정 — 차원 일치**: `setValues`에 전달하는 2차원 배열은 행수·열수가 범위와 **정확히** 일치해야 한다. JS는 길이가 다른 내부 배열도 허용하지만, Sheets는 그것도 거부한다.

### 서식

| 메서드 | 설명 |
|---|---|
| `setBackground(css)` / `setBackgrounds(matrix)` | `'#ff0000'`, `'red'`, `null`로 해제. |
| `setBackgroundObject(color)` / `setBackgroundObjects(matrix)` | `Color` 객체 (테마 컬러 사용 시 필수). |
| `setBackgroundRGB(r, g, b)` | 0–255. |
| `setFontColor(css)` / `setFontColorObject(color)` | |
| `setFontFamily('Arial')` / `setFontFamilies` | |
| `setFontSize(n)` / `setFontSizes` | |
| `setFontWeight('bold' \| 'normal')` | |
| `setFontStyle('italic' \| 'normal')` | |
| `setFontLine('underline' \| 'line-through' \| 'none')` | |
| `setHorizontalAlignment('left' \| 'center' \| 'right' \| 'normal')` | |
| `setVerticalAlignment('top' \| 'middle' \| 'bottom')` | |
| `setWrap(boolean)` / `setWrapStrategy(strategy)` | |
| `setTextRotation(deg)` / `setTextDirection(dir)` | |
| `setVerticalText(b)` | 세로쓰기. |
| `setTextStyle(style)` / `setTextStyles(matrix)` | `TextStyleBuilder`로 생성한 통합 스타일. |
| `setBorder(top, left, bottom, right, vertical, horizontal)` | 각 인자는 `true/false/null` (`null`=변경 안 함). |
| `setBorder(top, left, bottom, right, vertical, horizontal, color, style)` | `BorderStyle` 사용. |

### 범위 조작

| 메서드 | 반환 | 설명 |
|---|---|---|
| `offset(rowOff, colOff)` | `Range` | 같은 크기로 이동. 음수 가능. |
| `offset(rowOff, colOff, numRows)` | `Range` | 행수 변경. |
| `offset(rowOff, colOff, numRows, numCols)` | `Range` | 크기 모두 변경. |
| `getCell(row, col)` | `Range` | **범위 내부 상대 좌표 (1-인덱스)**. |
| `merge()` / `mergeAcross()` / `mergeVertically()` | `Range` | 병합. |
| `breakApart()` | `Range` | 병합 해제. |
| `copyTo(destination)` | `void` | 일반 복사 붙여넣기. |
| `copyTo(dest, copyPasteType, transposed)` | `void` | `CopyPasteType.PASTE_VALUES` 등. |
| `copyTo(dest, options)` | `void` | `{contentsOnly: true}` 또는 `{formatOnly: true}`. |
| `copyFormatToRange(sheet, c1, c2, r1, r2)` | `void` | 서식만 복제. |
| `copyValuesToRange(sheet, c1, c2, r1, r2)` | `void` | 값만 복제. |
| `moveTo(target)` | `void` | 잘라내기+붙여넣기. |
| `autoFill(destination, series)` | `void` | 채우기 핸들 동작. `AutoFillSeries.DEFAULT_SERIES`. |
| `randomize()` | `Range` | 행 순서 무작위. |
| `sort(spec)` | `Range` | `{column, ascending}` 또는 그 배열. **컬럼은 절대 시트 좌표**. |
| `createFilter()` | `Filter` | 기본 필터 생성. 시트당 1개만. |
| `createTextFinder(text)` | `TextFinder` | 범위 내 찾기/바꾸기. |

### 클리어 / 검증

| 메서드 | 설명 |
|---|---|
| `clear()` / `clear(options)` | 옵션: `{contentsOnly, formatOnly, validationsOnly, commentsOnly}`. |
| `clearContent()` | 값만. |
| `clearFormat()` | 서식만. |
| `clearNote()` | 노트만. |
| `clearDataValidations()` | 검증만. |
| `setDataValidation(rule)` / `setDataValidations(rules)` | 검증 적용 (`null`로 제거). |
| `removeCheckboxes()` | 체크박스 검증 해제. |
| `insertCheckboxes()` / `insertCheckboxes(checkedVal)` / `insertCheckboxes(checkedVal, uncheckedVal)` | 체크박스 삽입. |

### Banding / 메타데이터

| 메서드 | 설명 |
|---|---|
| `applyRowBanding(theme?, showHeader?, showFooter?)` | `Banding` 반환. |
| `applyColumnBanding(theme?, ...)` | 열 줄무늬. |
| `getBandings()` | 이 범위에 적용된 줄무늬. |
| `addDeveloperMetadata(key, value?, visibility?)` | 범위에 메타데이터. |
| `getDeveloperMetadata()` | 이 범위 메타데이터. |
| `createDeveloperMetadataFinder()` | 검색기. |

### 활성화 / 액션

| 메서드 | 설명 |
|---|---|
| `activate()` | 사용자 선택을 이 범위로. |
| `activateAsCurrentCell()` | 범위 내 좌상단 셀을 현재 셀로. |
| `setShowHyperlink(b)` | 하이퍼링크 표시 토글. |
| `getMergedRanges()` | 병합된 부분 범위들. |

### 핵심 예제

#### 1) 가장 중요한 패턴: 한 번에 읽고, 메모리에서 처리, 한 번에 쓰기

```javascript
function batchTransform() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Data');
  const range = sheet.getDataRange();

  // 1번의 RPC로 모든 값 읽기
  const values = range.getValues();

  // 메모리에서 변환 (헤더 행은 건너뛰기)
  for (let i = 1; i < values.length; i++) {
    const price = Number(values[i][2]);
    values[i][3] = price * 1.1; // 10% 인상
  }

  // 1번의 RPC로 모든 값 쓰기
  range.setValues(values);
}
```

#### 2) `offset()`으로 헤더 분리

```javascript
function offsetExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();
  // 첫 행(헤더) 제외
  const body = dataRange.offset(1, 0, dataRange.getNumRows() - 1);
  Logger.log('본문 셀 개수: ' + body.getNumRows() * body.getNumColumns());
}
```

#### 3) 서식 일괄 적용

```javascript
function formatTable() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Summary');
  const header = sheet.getRange('A1:F1');
  header
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  // 본문 테두리
  const lastRow = sheet.getLastRow();
  sheet.getRange(1, 1, lastRow, 6)
    .setBorder(true, true, true, true, true, true,
               '#cccccc', SpreadsheetApp.BorderStyle.SOLID);

  // 가격 컬럼 숫자 서식
  sheet.getRange(2, 4, lastRow - 1, 1).setNumberFormat('₩#,##0');
}
```

#### 4) 마지막 빈 행 찾아 추가 (동시성 안전 패턴)

```javascript
function appendLogEntry(message) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Logs');
  // appendRow는 lastRow를 내부에서 안전하게 처리한다
  sheet.appendRow([new Date(), Session.getActiveUser().getEmail(), message]);
}
```

> **함정**: `sheet.getRange(sheet.getLastRow() + 1, 1).setValues(...)` 패턴은 동시 실행 시 race condition을 만든다. `appendRow`는 Sheets 내부적으로 락을 잡으므로 안전하다.

#### 5) 체크박스

```javascript
function addCheckboxColumn() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const last = sheet.getLastRow();
  sheet.getRange(2, 6, last - 1, 1).insertCheckboxes();
}
```

---

## RichTextValue / TextStyle

셀 한 칸 안에서 부분마다 다른 서식을 줄 때 사용한다. 단순 `setFontWeight`는 셀 전체에 적용되므로 부분 서식이 필요하면 RichText가 유일한 방법이다.

### TextStyleBuilder

| 메서드 | 설명 |
|---|---|
| `setBold(b)` / `setItalic(b)` | 굵게/이탤릭. |
| `setUnderline(b)` / `setStrikethrough(b)` | 밑줄/취소선. |
| `setForegroundColor(css)` / `setForegroundColorObject(color)` | 글자색. |
| `setFontFamily(family)` | |
| `setFontSize(size)` | |
| `build()` | `TextStyle`. |

### RichTextValueBuilder

| 메서드 | 설명 |
|---|---|
| `setText(text)` | 전체 텍스트 설정. |
| `setTextStyle(style)` | 전체에 스타일. |
| `setTextStyle(startOffset, endOffset, style)` | **부분 적용**. 인덱스는 0-인덱스, end exclusive. |
| `setLinkUrl(url)` | 전체를 하이퍼링크로. |
| `setLinkUrl(startOffset, endOffset, url)` | 부분 링크. |
| `build()` | `RichTextValue`. |

### 예제: 부분 굵게 + 링크

```javascript
function richTextExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const bold = SpreadsheetApp.newTextStyle().setBold(true).build();
  const linkStyle = SpreadsheetApp.newTextStyle()
    .setForegroundColor('#1155cc')
    .setUnderline(true)
    .build();

  const rich = SpreadsheetApp.newRichTextValue()
    .setText('주문 #1234가 배송되었습니다. 추적')
    .setTextStyle(3, 8, bold)        // "#1234"
    .setTextStyle(20, 22, linkStyle) // "추적"
    .setLinkUrl(20, 22, 'https://example.com/track/1234')
    .build();

  sheet.getRange('A1').setRichTextValue(rich);
}
```

> **함정**: `setRichTextValue`로 값을 설정하면 `setValue`로 다시 평범한 문자열을 쓰지 않는 한 RichText가 유지된다. 그러나 새 값을 `setValue`로 덮어쓰면 모든 부분 서식이 날아간다.

---

## DataValidation (입력 검증)

드롭다운, 숫자 범위, 날짜, 체크박스 등을 셀에 강제한다.

### DataValidationBuilder

| 메서드 | 설명 |
|---|---|
| `requireValueInList(values)` | 인라인 드롭다운. |
| `requireValueInList(values, showDropdown)` | `showDropdown=false`면 화살표 숨김. |
| `requireValueInRange(range)` | 다른 시트 범위 참조 드롭다운. |
| `requireValueInRange(range, showDropdown)` | |
| `requireNumberBetween(min, max)` / `requireNumberNotBetween` | |
| `requireNumberGreaterThan(n)` / `requireNumberGreaterThanOrEqualTo(n)` | |
| `requireNumberLessThan(n)` / `requireNumberLessThanOrEqualTo(n)` | |
| `requireNumberEqualTo(n)` / `requireNumberNotEqualTo(n)` | |
| `requireDate()` | 어떤 날짜든. |
| `requireDateAfter(date)` / `requireDateBefore(date)` / `requireDateBetween(start, end)` | |
| `requireDateEqualTo(date)` / `requireDateNotBetween` / `requireDateOnOrAfter` / `requireDateOnOrBefore` | |
| `requireTextContains(s)` / `requireTextDoesNotContain` / `requireTextEqualTo` | |
| `requireTextIsEmail()` / `requireTextIsUrl()` | |
| `requireCheckbox()` / `requireCheckbox(checkedValue)` / `requireCheckbox(checkedValue, uncheckedValue)` | |
| `requireFormulaSatisfied(formula)` | 커스텀 수식 (`=ISNUMBER(A1)` 등). |
| `setAllowInvalid(b)` | `false`면 위반 시 거부, `true`면 경고만. |
| `setHelpText(text)` | 셀 클릭 시 도움말. |
| `build()` | `DataValidation`. |

### 예제: 드롭다운 + 숫자 검증

```javascript
function setupValidations() {
  const sheet = SpreadsheetApp.getActiveSheet();

  // 상태 컬럼: 드롭다운
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['대기', '진행 중', '완료', '취소'], true)
    .setAllowInvalid(false)
    .setHelpText('상태를 선택하세요')
    .build();
  sheet.getRange('C2:C1000').setDataValidation(statusRule);

  // 점수 컬럼: 0~100
  const scoreRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D2:D1000').setDataValidation(scoreRule);

  // 동의 컬럼: 체크박스
  const checkRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange('E2:E1000').setDataValidation(checkRule);
}
```

> **함정**: `setDataValidation(null)` 또는 `clearDataValidations()`로 명시적으로 지워야 검증이 제거된다. `clear()`도 `validationsOnly: true` 옵션과 함께 써야 한다.

---

## Banding (줄무늬)

`Range.applyRowBanding(theme?, showHeader?, showFooter?)` 또는 `applyColumnBanding`로 생성한다. 테마는 `SpreadsheetApp.BandingTheme.*`.

### Banding 메서드

| 메서드 | 설명 |
|---|---|
| `getRange()` / `setRange(range)` | 범위 조회/변경. |
| `copyTo(range)` | 다른 범위로 복제. |
| `remove()` | 줄무늬 제거. |
| `setHeaderRowColor(css)` / `setHeaderRowColorObject(color)` | 헤더 행 색. |
| `setFooterRowColor(...)` | 푸터 행 색. |
| `setFirstRowColor(...)` / `setSecondRowColor(...)` | 교대로 칠하는 색. |
| 열 방향 동일 패턴: `setFirstColumnColor`, `setSecondColumnColor`, `setHeaderColumnColor`, `setFooterColumnColor` | |

### 예제

```javascript
function applyBanding() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Summary');
  const range = sheet.getDataRange();
  const banding = range.applyRowBanding(
    SpreadsheetApp.BandingTheme.CYAN,
    true,   // showHeader
    false   // showFooter
  );
  banding.setHeaderRowColor('#0b5394');
  banding.setFirstRowColor('#e8f0fe');
  banding.setSecondRowColor('#ffffff');
}
```

> **함정**: 한 범위에 줄무늬는 1개만 적용된다. 이미 있는데 다시 적용하면 에러. 기존 것을 `remove()`하거나 `setRange`로 갱신해야 한다.

---

## ConditionalFormatRule (조건부 서식)

```javascript
function conditionalFormatExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange('D2:D1000');

  // 80 이상이면 초록색 강조
  const highRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(80)
    .setBackground('#b7e1cd')
    .setFontColor('#0b5394')
    .setRanges([range])
    .build();

  // 60 미만이면 빨강
  const lowRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(60)
    .setBackground('#f4cccc')
    .setRanges([range])
    .build();

  const rules = sheet.getConditionalFormatRules();
  rules.push(highRule, lowRule);
  sheet.setConditionalFormatRules(rules); // 항상 전체 교체
}
```

`ConditionalFormatRuleBuilder`의 주요 조건 메서드: `whenCellEmpty`, `whenCellNotEmpty`, `whenDateAfter`, `whenDateBefore`, `whenDateEqualTo`, `whenFormulaSatisfied(formula)`, `whenNumberBetween`, `whenNumberEqualTo`, `whenNumberGreaterThan`, `whenNumberGreaterThanOrEqualTo`, `whenNumberLessThan`, `whenNumberLessThanOrEqualTo`, `whenNumberNotBetween`, `whenTextContains`, `whenTextDoesNotContain`, `whenTextEqualTo`, `whenTextStartsWith`, `whenTextEndsWith`, `setGradientMinpoint`, `setGradientMidpoint`, `setGradientMaxpoint`.

> **함정**: `setConditionalFormatRules`는 시트의 전체 규칙을 **교체**한다. 기존 규칙을 유지하려면 반드시 `getConditionalFormatRules()`로 가져온 배열에 추가해서 다시 넘긴다.

---

## NamedRange (명명 범위)

수식에서 `=SUM(SalesTable)`처럼 쓸 수 있도록 범위에 이름을 붙인다.

```javascript
function namedRangeExample() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Data');

  // 등록
  ss.setNamedRange('SalesTable', sheet.getRange('A2:F1000'));

  // 사용
  const range = ss.getRangeByName('SalesTable');
  Logger.log(range.getA1Notation());

  // 변경
  const nr = ss.getNamedRanges().find(n => n.getName() === 'SalesTable');
  if (nr) nr.setRange(sheet.getRange('A2:F2000'));

  // 삭제
  ss.removeNamedRange('SalesTable');
}
```

`NamedRange` 메서드: `getName()`, `setName(name)`, `getRange()`, `setRange(range)`, `remove()`.

---

## DeveloperMetadata (개발자 메타데이터)

셀/시트/스프레드시트에 사용자 정의 키-값을 붙인다. **눈에 보이지 않으면서도** 검색 가능하다는 점이 노트와 다르다. 사용 예: 행에 외부 시스템 ID 매핑, 마이그레이션용 마커, 다른 스크립트와의 협업.

```javascript
function metadataExample() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Orders');

  // 시트에 부착
  sheet.addDeveloperMetadata(
    'lastSyncedAt',
    new Date().toISOString(),
    SpreadsheetApp.DeveloperMetadataVisibility.PROJECT
  );

  // 특정 행에 부착 (전체 행 범위에 메타데이터)
  sheet.getRange('A2:A2').addDeveloperMetadata('externalOrderId', 'EXT-789');

  // 검색
  const finder = SpreadsheetApp.getActive()
    .createDeveloperMetadataFinder()
    .withKey('externalOrderId')
    .withValue('EXT-789');
  const matches = finder.find();
  matches.forEach(md => {
    Logger.log(md.getKey() + ' @ ' + md.getLocation().getLocationType());
  });
}
```

`DeveloperMetadata` 메서드: `getId()`, `getKey()`, `getValue()`, `getVisibility()`, `getLocation()`, `setKey`, `setValue`, `setVisibility`, `moveToRow`, `moveToColumn`, `moveToSheet`, `moveToSpreadsheet`, `remove()`.

`Visibility`: `DOCUMENT` (모든 스크립트 접근 가능), `PROJECT` (현재 스크립트 프로젝트만).

---

## Filter / FilterCriteria (시트 필터)

시트에는 동시에 하나의 기본 필터만 존재한다. **필터 뷰는 Apps Script 기본 서비스에서 지원되지 않으며**, 그게 필요하면 고급 서비스를 써야 한다.

### Filter 메서드

| 메서드 | 설명 |
|---|---|
| `getRange()` | 필터가 적용된 범위. |
| `remove()` | 필터 제거. |
| `getColumnFilterCriteria(col)` | 컬럼의 필터 조건 (없으면 `null`). |
| `setColumnFilterCriteria(col, criteria)` | 컬럼 필터 적용. |
| `removeColumnFilterCriteria(col)` | 컬럼 필터 해제. |
| `sort(col, ascending)` | 헤더 제외 정렬. |

### FilterCriteriaBuilder 메서드

`whenTextContains`, `whenTextDoesNotContain`, `whenTextEqualTo`, `whenTextNotEqualTo`, `whenTextStartsWith`, `whenTextEndsWith`, `whenNumberBetween`, `whenNumberEqualTo`, `whenNumberGreaterThan`, `whenNumberLessThan`, `whenNumberNotBetween`, `whenCellEmpty`, `whenCellNotEmpty`, `whenDateAfter`, `whenDateBefore`, `whenDateEqualTo`, `whenFormulaSatisfied`, `setHiddenValues(values)`, `setVisibleValues(values)`, `setVisibleBackgroundColor` / `setVisibleForegroundColor`, `copy()`, `build()`.

### 예제

```javascript
function applyFilter() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Orders');

  // 기존 필터 제거
  const existing = sheet.getFilter();
  if (existing) existing.remove();

  // 새로 만들기
  const range = sheet.getDataRange();
  const filter = range.createFilter();

  // 컬럼 3(상태)에서 '완료'만 보이게
  const statusCriteria = SpreadsheetApp.newFilterCriteria()
    .whenTextEqualTo('완료')
    .build();
  filter.setColumnFilterCriteria(3, statusCriteria);

  // 컬럼 5(금액) 내림차순 정렬
  filter.sort(5, false);
}
```

---

## PivotTable / PivotGroup / PivotValue

피벗 테이블은 `Range.createPivotTable(sourceData)`로 생성한다.

### PivotTable 메서드

| 메서드 | 설명 |
|---|---|
| `addRowGroup(sourceColumn)` | 행 그룹 추가. `PivotGroup` 반환. |
| `addColumnGroup(sourceColumn)` | 열 그룹 추가. |
| `addPivotValue(sourceColumn, summarizeFunction)` | 집계 값 추가. |
| `addCalculatedPivotValue(name, formula)` | 계산된 필드. |
| `addFilter(sourceColumn, filterCriteria)` | 필터. |
| `getRowGroups()` / `getColumnGroups()` / `getPivotValues()` / `getFilters()` | 조회. |
| `getSourceDataRange()` | 원본 데이터 범위. |
| `getAnchorCell()` | 좌상단 셀. |
| `setValuesDisplayOrientation(dim)` | `Dimension.ROWS` 또는 `COLUMNS`. |
| `remove()` | 피벗 제거. |

### PivotGroup 메서드 (행/열 그룹)

`addManualGroupingRule`, `getDimension`, `getGroupLimit`, `getIndex`, `getOffset`, `getSortOrder`, `hideRepeatedLabels`, `isSortAscending`, `remove`, `resetDisplayName`, `setDisplayName`, `setGroupLimit`, `showTotals(b)`, `sortAscending`, `sortDescending`, `sortBy(value, oppositeGroupValues)`, `totalsAreShown`.

### PivotValue 메서드

`getDisplayName`, `getFormula`, `getPivotTable`, `getSourceDataColumn`, `getSummarizedBy`, `remove`, `setDisplayName(name)`, `setFormula(formula)`, `summarizeBy(fn)`, `setDisplayType(type)` (예: `PivotValueDisplayType.PERCENT_OF_GRAND_TOTAL`).

### 예제: 매출 피벗

```javascript
function createSalesPivot() {
  const ss = SpreadsheetApp.getActive();
  const source = ss.getSheetByName('Raw');
  const target = ss.getSheetByName('Pivot') || ss.insertSheet('Pivot');

  const sourceRange = source.getDataRange();
  const anchor = target.getRange('A1');

  // 기존 피벗 제거
  target.getPivotTables().forEach(p => p.remove());

  const pivot = anchor.createPivotTable(sourceRange);

  // 1열(지역) 행 그룹
  pivot.addRowGroup(1);
  // 2열(상품) 열 그룹
  pivot.addColumnGroup(2);
  // 4열(매출액) 합계
  pivot.addPivotValue(4, SpreadsheetApp.PivotTableSummarizeFunction.SUM);
  // 5열(수량) 합계
  pivot.addPivotValue(5, SpreadsheetApp.PivotTableSummarizeFunction.SUM);
}
```

---

## EmbeddedChart

### EmbeddedChartBuilder 메서드

| 메서드 | 설명 |
|---|---|
| `addRange(range)` | 데이터 범위 추가. 여러 번 호출 가능. |
| `removeRange(range)` | 제거. |
| `setChartType(Charts.ChartType.X)` | `COLUMN`, `BAR`, `LINE`, `AREA`, `PIE`, `SCATTER`, `HISTOGRAM`, `TABLE`, `COMBO` 등. |
| `setPosition(anchorRow, anchorCol, offsetX, offsetY)` | 위치 (픽셀 오프셋). |
| `setOption(key, value)` | 차트 옵션 (제목, 색상, 축 등). [차트 옵션 키는 Charts 서비스 문서 참조] |
| `setHiddenDimensionStrategy(strategy)` | 숨겨진 행/열 처리. |
| `setMergeStrategy(strategy)` | 다중 범위 결합 전략. |
| `setNumHeaders(n)` | 헤더 행 수. |
| `setTransposeRowsAndColumns(b)` | 전치. |
| `asColumnChart()` / `asBarChart()` / `asLineChart()` / `asPieChart()` 등 | 타입별 빌더로 캐스팅 (`setColors`, `setStacked` 같은 추가 옵션 노출). |
| `build()` | `EmbeddedChart`. |

### EmbeddedChart 메서드

`getChartId()`, `getRanges()`, `getOptions()`, `getContainerInfo()`, `getMergeStrategy()`, `getNumHeaders()`, `getHiddenDimensionStrategy()`, `getTransposeRowsAndColumns()`, `asDataSourceChart()`, `getChartType()`, `modify()` (변경용 빌더).

### 예제: 컬럼 차트 만들기

```javascript
function createColumnChart() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Summary');
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange('A1:B13'))
    .setNumHeaders(1)
    .setOption('title', '2026년 월별 매출')
    .setOption('legend', { position: 'top' })
    .setOption('hAxis.title', '월')
    .setOption('vAxis.title', '매출 (KRW)')
    .setOption('colors', ['#1a73e8'])
    .setPosition(2, 4, 0, 0)
    .build();

  sheet.insertChart(chart);
}

function updateChartTitle() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const charts = sheet.getCharts();
  if (charts.length === 0) return;
  const updated = charts[0].modify()
    .setOption('title', '업데이트된 제목')
    .build();
  sheet.updateChart(updated);
}
```

---

## Protection (보호)

```javascript
function protectExample() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Settings');

  // 시트 전체 보호 + 일부 범위 예외
  const protection = sheet.protect().setDescription('관리자만 수정');
  protection.removeEditors(protection.getEditors());
  protection.addEditor('admin@example.com');

  // 일부 범위는 누구나 수정 가능
  protection.setUnprotectedRanges([sheet.getRange('A2:B100')]);

  // 범위 단위 보호 (경고만)
  const range = sheet.getRange('C2:C100');
  const rangeProtection = range.protect()
    .setDescription('이 컬럼은 수식이므로 수정 금지')
    .setWarningOnly(true);
}
```

`Protection` 주요 메서드: `setDescription`, `getDescription`, `addEditor`, `addEditors`, `removeEditor`, `removeEditors`, `getEditors`, `setUnprotectedRanges`, `getUnprotectedRanges`, `setWarningOnly(b)`, `canEdit()`, `canDomainEdit()`, `getRange()`, `getRangeName()`, `getProtectionType()`, `remove()`, `setRange(range)`, `setRangeName(name)`, `setDomainEdit(b)`.

---

## RangeList (다중 범위)

같은 시트의 여러 범위에 동일 작업을 한 번에 적용한다.

```javascript
function rangeListExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rl = sheet.getRangeList(['A1', 'C5:C10', 'E1:E20']);
  rl.setBackground('#fff2cc');
  rl.setFontWeight('bold');
}
```

> **주의**: `RangeList`는 `getValues` 같은 읽기 메서드가 없다. 오직 일괄 적용용이다.

---

## 고급: Sheets Advanced Service (`Sheets.Spreadsheets.batchUpdate`)

기본 서비스가 한 호출에 하나의 변경만 보내는 반면, 고급 서비스는 **여러 변경 요청을 묶어 한 번에** Sheets API v4 서버로 보낼 수 있다. 다음 상황에서 필수다:

- 대량의 셀에 서식·검증·차트 변경이 섞여 있을 때
- 필터 뷰(Filter View) 같은 기본 서비스 미지원 기능
- 시트 ID·DeveloperMetadata 검색 등 저수준 제어가 필요할 때
- 한 번의 API 호출로 끝내야 할 때 (성능 + Quota 절감)

### 활성화 방법

1. Apps Script 편집기 → 좌측 **서비스 +** 클릭
2. **Google Sheets API** 선택 → 식별자 그대로 `Sheets`로 추가
3. `appsscript.json`의 `dependencies.enabledAdvancedServices`에 `Sheets v4` 추가
4. (선택) Cloud Console 프로젝트의 Sheets API 활성화 (Workspace 도메인 정책에 따라 다름)

### 예제: 한 번에 시트 추가 + 행 삽입 + 서식

```javascript
function batchUpdateExample(spreadsheetId) {
  const requests = [
    // 새 시트 추가
    {
      addSheet: {
        properties: {
          title: 'Deposits',
          gridProperties: { rowCount: 20, columnCount: 12 },
          tabColor: { red: 1.0, green: 0.3, blue: 0.4 },
        },
      },
    },
    // 행 삽입 (시트 ID 알고 있다고 가정)
    {
      insertDimension: {
        range: {
          sheetId: 0,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: 3, // 2개 행 삽입 (0-인덱스, end exclusive)
        },
        inheritFromBefore: false,
      },
    },
    // 헤더 행 굵게
    {
      repeatCell: {
        range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    },
  ];

  const response = Sheets.Spreadsheets.batchUpdate(
    { requests: requests },
    spreadsheetId
  );
  Logger.log(JSON.stringify(response.replies));
}
```

### `values` 컬렉션 (대량 읽기/쓰기)

```javascript
function batchGetValues(spreadsheetId) {
  const response = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
    ranges: ['Sheet1!A1:B10', 'Sheet2!A1:A100'],
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  response.valueRanges.forEach(vr => Logger.log(vr.range + ': ' + (vr.values || []).length + ' rows'));
}

function batchUpdateValues(spreadsheetId) {
  Sheets.Spreadsheets.Values.batchUpdate({
    valueInputOption: 'USER_ENTERED', // 또는 'RAW'
    data: [
      { range: 'Sheet1!A1', values: [['Hello']] },
      { range: 'Sheet2!B2', values: [['World']] },
    ],
  }, spreadsheetId);
}
```

### 0-인덱스 차이 주의

고급 서비스 (REST API)는 **0-인덱스이며 end exclusive**다. 기본 서비스는 1-인덱스이고 end inclusive다. 두 서비스를 섞어 쓸 때 자주 실수한다.

| 기준 | 기본 서비스 | 고급 서비스 (API) |
|---|---|---|
| 행/열 인덱스 | 1-인덱스 | 0-인덱스 |
| 범위 끝 | 포함 (inclusive) | 제외 (exclusive) |
| `A1` | `getRange(1, 1)` | `{startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1}` |

---

## 자주 발생하는 함정 (반드시 알아야 함)

### 1. 1-인덱스 vs 0-인덱스

- `Sheet.getRange(row, col, ...)`, `Range.getCell(row, col)`, 시트 정렬의 컬럼 번호: **모두 1-인덱스**.
- `getValues()`로 얻은 2차원 배열은 **0-인덱스**. 즉 A2의 값은 `values[0][0]`이 아니라 `getValues()` 시작 범위 기준의 첫 행/열.

### 2. 빈 셀 — `""` (빈 문자열), `null` 아님

`getValues()`의 빈 셀은 항상 빈 문자열이다. `null`이나 `undefined`로 비교하면 안 된다.

```javascript
// 잘못된 방법
if (row[2] === null) { ... }
// 올바른 방법
if (row[2] === '') { ... }
// 또는
if (!row[2]) { ... } // 0과 false도 잡힘 — 의도에 맞춰 신중히
```

### 3. Date 객체와 시트 시간대

셀에 날짜를 쓸 때 Apps Script는 JS `Date` 객체를 사용한다. JS는 항상 UTC 기준이지만 시트는 **스프레드시트의 시간대 (`getSpreadsheetTimeZone()`)** 로 해석한다. 시간대가 일치하지 않으면 9시간씩 어긋난다.

```javascript
function dateGotcha() {
  const ss = SpreadsheetApp.getActive();
  Logger.log(ss.getSpreadsheetTimeZone()); // 'Asia/Seoul' 인지 확인

  const sheet = ss.getActiveSheet();
  // 항상 시트 시간대에 맞춘 Date를 만들어야 함
  const formatted = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm');
  sheet.getRange('A1').setValue(formatted);
}
```

### 4. `setValues` 차원 불일치

행수·열수가 정확히 일치해야 한다. `getValues`로 5×3을 받았으면 `setValues`도 정확히 5×3이어야 한다. 한 행만 갱신해도 `[[val1, val2, val3]]` (1×3) 형태여야 한다.

### 5. `getLastRow()` 함정

`getLastRow()`는 "**전체** 시트에서 데이터가 있는 마지막 행"이다. 특정 컬럼에 대한 마지막 데이터를 알고 싶으면 그 컬럼만 따로 조사해야 한다.

```javascript
function lastRowInColumn(sheet, columnIndex) {
  const column = sheet.getRange(1, columnIndex, sheet.getMaxRows(), 1).getValues();
  for (let i = column.length - 1; i >= 0; i--) {
    if (column[i][0] !== '') return i + 1;
  }
  return 0;
}
```

### 6. `flush()`의 의미

Apps Script는 가능하면 여러 쓰기를 한 번에 묶어 서버로 보낸다. `flush()`는 **지금 즉시 보내라**는 명령. 시각 효과(진행 중 표시)나, 외부 서비스가 시트의 현재 상태를 봐야 하는 경우에 호출한다.

```javascript
function progressIndicator() {
  const cell = SpreadsheetApp.getActiveSheet().getRange('A1');
  for (let i = 1; i <= 10; i++) {
    cell.setValue('진행 중: ' + i + '/10');
    SpreadsheetApp.flush(); // 사용자에게 즉시 보이도록
    Utilities.sleep(500);
  }
  cell.setValue('완료');
}
```

대부분의 경우 `flush`는 **필요 없다**. 성능에는 오히려 해롭다.

### 7. 알파벳 컬럼 ↔ 숫자 변환

```javascript
function colLetterToNumber(letter) {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result;
}
function colNumberToLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
// 또는 Range를 만들어 getA1Notation() 사용
SpreadsheetApp.getActiveSheet().getRange(1, 27).getA1Notation(); // "AA1"
```

### 8. `appendRow` vs `setValues` (동시성)

여러 트리거가 동시에 실행될 수 있는 환경(웹앱, 폼 응답)에서 마지막 행에 추가하려면 `appendRow`를 써라. 직접 `getLastRow() + 1`을 계산하면 두 실행이 동시에 같은 행에 쓸 수 있다.

### 9. 수식 vs 값

`getValue()`는 평가된 값(`135`)을 돌려준다. 수식 자체(`=A1+B1`)가 필요하면 `getFormula()`를 써라. 수식과 정적 값이 섞인 그리드에서 `getValues`만 호출하면 수식은 사라지므로 주의.

### 10. 시트가 보호되어 있으면

`Protection`이 있는 셀에 쓰기를 시도하면 예외가 발생한다. 자기 자신이 편집자에 포함되어야 한다. `protection.canEdit()`로 미리 확인하라.

---

## 성능 / Quota

### 가장 중요한 원칙: API 호출을 최소화하라

> **Google 공식 권장**: "Read all data into an array with one command, perform operations on the array data, and write the data out with one command." 같은 작업이 루프 안의 `setValue`로 **70초**가 걸리고, 한 번의 `setValues`로 **1초**가 걸린다.

#### 나쁜 패턴

```javascript
// 안티 패턴: 1만 셀 = 1만 RPC = 분 단위 소요
for (let r = 1; r <= 100; r++) {
  for (let c = 1; c <= 100; c++) {
    sheet.getRange(r, c).setValue(r * c);
  }
}
```

#### 좋은 패턴

```javascript
// 1번의 RPC
const matrix = [];
for (let r = 0; r < 100; r++) {
  const row = [];
  for (let c = 0; c < 100; c++) row.push((r + 1) * (c + 1));
  matrix.push(row);
}
sheet.getRange(1, 1, 100, 100).setValues(matrix);
```

### 절대 인터리브하지 말 것

```javascript
// 잘못된 예: 읽기와 쓰기 교차
for (let r = 1; r <= n; r++) {
  const v = sheet.getRange(r, 1).getValue();
  sheet.getRange(r, 2).setValue(v.toUpperCase()); // 매 행마다 RPC 2번
}

// 좋은 예: 읽기 한 번, 쓰기 한 번
const values = sheet.getRange(1, 1, n, 1).getValues();
const transformed = values.map(row => [row[0].toString().toUpperCase()]);
sheet.getRange(1, 2, n, 1).setValues(transformed);
```

### 캐싱 (`CacheService`)

같은 데이터를 반복 조회한다면 `CacheService.getScriptCache()`에 저장한다. 특히 사용자 정의 함수(custom function) 안에서 외부 API를 호출하는 경우 필수.

### 셀 개수 제한

스프레드시트당 **최대 1천만 개 셀** (2022년부터 상향, 이전엔 500만). 행/열 둘 다 합쳐서 계산된다.

### URL Fetch 함정

사용자 정의 함수 안에서 `UrlFetchApp.fetch`를 호출하면 시트가 다시 열릴 때마다, 또는 값이 바뀌면 또 호출된다. **반드시 `CacheService`로 감싸야** Quota 초과를 피할 수 있다.

### Quota 일일 한도 (2026년 기준)

| 항목 | 일반 계정 | Workspace 계정 |
|---|---|---|
| Apps Script 일일 실행 시간 | 90분 | 6시간 |
| URL Fetch 호출 | 20,000 | 100,000 |
| 트리거 총 실행 시간 | 90분 | 6시간 |

> 구체적인 수치는 Google 공식 "Quotas for Google Services" 페이지에서 최신 값을 확인할 것.

---

## 트리거 (간단 언급)

자세한 내용은 `03-triggers/` 참고. 시트와 가장 자주 엮이는 트리거:

- `onOpen(e)`: 스프레드시트가 열릴 때. 메뉴 추가용.
- `onEdit(e)`: 셀이 편집될 때. `e.range`, `e.value`, `e.oldValue` 포함. **단순 트리거는 권한이 제한된다** (다른 파일 접근 불가).
- `onChange(e)`: 구조 변경(행/열 삽입, 시트 추가) 시. **설치형 트리거 전용**.
- `onSelectionChange(e)`: 선택이 바뀔 때. 빈번하므로 가벼운 작업만.
- `onFormSubmit(e)`: 연결된 폼의 응답 수신.
- 시간 기반 트리거: 정해진 주기 (`ScriptApp.newTrigger(...).timeBased()...`).

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('자동화')
    .addItem('월간 보고서 생성', 'generateMonthlyReport')
    .addSeparator()
    .addItem('데이터 새로고침', 'refreshData')
    .addToUi();
}

function onEdit(e) {
  if (!e || e.range.getSheet().getName() !== 'Tasks') return;
  if (e.range.getColumn() !== 3) return;
  // C열이 '완료'로 바뀌면 D열에 타임스탬프
  if (e.value === '완료') {
    e.range.offset(0, 1).setValue(new Date());
  }
}
```

---

## 일반적인 패턴 (Recipes)

### 1) 헤더 행 기반으로 데이터를 객체 배열로

```javascript
function sheetToObjects(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// 사용
const orders = sheetToObjects(SpreadsheetApp.getActive().getSheetByName('Orders'));
orders.forEach(o => Logger.log(o.id + ': ' + o.amount));
```

### 2) 객체 배열을 시트에 쓰기

```javascript
function objectsToSheet(sheet, objects, headers) {
  if (objects.length === 0) {
    sheet.clearContents();
    return;
  }
  const cols = headers || Object.keys(objects[0]);
  const rows = objects.map(o => cols.map(c => o[c] ?? ''));
  sheet.clearContents();
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
  sheet.getRange(2, 1, rows.length, cols.length).setValues(rows);
}
```

### 3) 특정 컬럼만 빠르게 읽기

```javascript
function getColumnValues(sheet, columnLetter) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(`${columnLetter}2:${columnLetter}${last}`)
              .getValues()
              .map(r => r[0])
              .filter(v => v !== '');
}
```

### 4) 시트에 데이터 누적 (멱등성 있게)

```javascript
function upsertRows(sheet, keyColumnLetter, newRows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30 * 1000);
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyIdx = headers.indexOf(keyColumnLetter);
    const existingMap = new Map();
    for (let i = 1; i < data.length; i++) {
      existingMap.set(data[i][keyIdx], i + 1); // 1-인덱스 행 번호
    }
    const toAppend = [];
    newRows.forEach(row => {
      const k = row[keyIdx];
      const existingRow = existingMap.get(k);
      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      } else {
        toAppend.push(row);
      }
    });
    if (toAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
    }
  } finally {
    lock.releaseLock();
  }
}
```

### 5) 두 시트 비교해서 차이만 추출

```javascript
function diffSheets(sheetA, sheetB, keyColumn) {
  const a = new Map(sheetA.getDataRange().getValues().slice(1).map(r => [r[keyColumn], r]));
  const b = new Map(sheetB.getDataRange().getValues().slice(1).map(r => [r[keyColumn], r]));
  const onlyInA = [];
  const onlyInB = [];
  const changed = [];
  a.forEach((row, key) => {
    if (!b.has(key)) onlyInA.push(row);
    else if (JSON.stringify(row) !== JSON.stringify(b.get(key))) changed.push({ key, a: row, b: b.get(key) });
  });
  b.forEach((row, key) => { if (!a.has(key)) onlyInB.push(row); });
  return { onlyInA, onlyInB, changed };
}
```

### 6) 시트 → CSV / JSON

```javascript
function sheetToCsv(sheet) {
  return sheet.getDataRange().getValues()
    .map(row => row.map(cell => {
      const s = String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
}
```

### 7) 새 시트에 템플릿 복제

```javascript
function cloneTemplate(templateName, newName) {
  const ss = SpreadsheetApp.getActive();
  const template = ss.getSheetByName(templateName);
  if (!template) throw new Error('템플릿 시트 없음');
  const copy = template.copyTo(ss);
  copy.setName(newName);
  ss.moveActiveSheet(2);
  return copy;
}
```

### 8) `LockService`와 결합한 안전한 쓰기

여러 사용자/트리거가 동시에 같은 시트에 쓸 때:

```javascript
function safeAppend(values) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) {
    throw new Error('다른 작업이 진행 중입니다.');
  }
  try {
    SpreadsheetApp.getActive().getSheetByName('Log').appendRow(values);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}
```

---

## 빠른 참조: 자주 헷갈리는 메서드 비교

| | 단일 (스칼라) | 그리드 (2D) |
|---|---|---|
| 값 읽기 | `getValue()` | `getValues()` |
| 표시값 | `getDisplayValue()` | `getDisplayValues()` |
| 수식 | `getFormula()` | `getFormulas()` |
| 부분 서식 | `getRichTextValue()` | `getRichTextValues()` |
| 노트 | `getNote()` | `getNotes()` |
| 배경 | `getBackground()` | `getBackgrounds()` |
| 숫자 서식 | `getNumberFormat()` | `getNumberFormats()` |

| 작업 | 메서드 |
|---|---|
| 전체 시트 지우기 | `Sheet.clear()` (서식 포함) / `clearContents()` (값만) |
| 시트의 데이터 영역만 | `Sheet.getDataRange()` |
| 마지막 행 (전체) | `Sheet.getLastRow()` |
| 마지막 행 (특정 컬럼) | 직접 순회 (위 레시피 참고) |
| 다음 빈 행에 추가 | `Sheet.appendRow(...)` |
| 한 번에 여러 범위 서식 | `Sheet.getRangeList(['A1', 'C3'])` → `setBackground(...)` |
| 차원 일치 setValues | 행수 = 범위 행수, 열수 = 범위 열수 |
| 검증 제거 | `Range.clearDataValidations()` 또는 `setDataValidation(null)` |

---

## 참고 (출처 URL)

- Spreadsheet 서비스 개요: https://developers.google.com/apps-script/reference/spreadsheet
- SpreadsheetApp: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
- Spreadsheet: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
- Sheet: https://developers.google.com/apps-script/reference/spreadsheet/sheet
- Range: https://developers.google.com/apps-script/reference/spreadsheet/range
- RichTextValue: https://developers.google.com/apps-script/reference/spreadsheet/rich-text-value
- RichTextValueBuilder: https://developers.google.com/apps-script/reference/spreadsheet/rich-text-value-builder
- TextStyle: https://developers.google.com/apps-script/reference/spreadsheet/text-style
- DataValidation: https://developers.google.com/apps-script/reference/spreadsheet/data-validation
- DataValidationBuilder: https://developers.google.com/apps-script/reference/spreadsheet/data-validation-builder
- Banding: https://developers.google.com/apps-script/reference/spreadsheet/banding
- ConditionalFormatRule: https://developers.google.com/apps-script/reference/spreadsheet/conditional-format-rule
- NamedRange: https://developers.google.com/apps-script/reference/spreadsheet/named-range
- DeveloperMetadata: https://developers.google.com/apps-script/reference/spreadsheet/developer-metadata
- DeveloperMetadataFinder: https://developers.google.com/apps-script/reference/spreadsheet/developer-metadata-finder
- Filter: https://developers.google.com/apps-script/reference/spreadsheet/filter
- FilterCriteriaBuilder: https://developers.google.com/apps-script/reference/spreadsheet/filter-criteria-builder
- PivotTable: https://developers.google.com/apps-script/reference/spreadsheet/pivot-table
- PivotGroup: https://developers.google.com/apps-script/reference/spreadsheet/pivot-group
- PivotValue: https://developers.google.com/apps-script/reference/spreadsheet/pivot-value
- EmbeddedChart: https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart
- EmbeddedChartBuilder: https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart-builder
- Protection: https://developers.google.com/apps-script/reference/spreadsheet/protection
- Sheets Advanced Service: https://developers.google.com/apps-script/advanced/sheets
- Apps Script 모범 사례: https://developers.google.com/apps-script/guides/support/best-practices
- Quota: https://developers.google.com/apps-script/guides/services/quotas
