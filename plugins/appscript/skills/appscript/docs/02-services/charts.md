# Charts 서비스

> **출처**
> - https://developers.google.com/apps-script/reference/charts
> - https://developers.google.com/apps-script/reference/charts/charts
> - https://developers.google.com/apps-script/reference/charts/data-table-builder
> - https://developers.google.com/apps-script/reference/charts/column-chart-builder
> - https://developers.google.com/apps-script/reference/charts/pie-chart-builder
> - https://developers.google.com/apps-script/reference/charts/line-chart-builder
> - https://developers.google.com/apps-script/reference/charts/chart
>
> **최종 확인일**: 2026-07-22

## 개요

`Charts` 서비스는 서버 사이드에서 데이터로 차트를 만들어 **정적 이미지(`Blob`)로 렌더**하는 내장 서비스다. 공식 소개 문장: "This service allows users to create charts using Google Charts Tools and render them server side." 만들어진 이미지는 Gmail 리포트, `HtmlService` 페이지, Docs/Slides 등에 임베드한다.

**EmbeddedChart와 구분** — 스프레드시트 셀 위에 얹히는 상호작용형 차트(`SpreadsheetApp`의 `EmbeddedChart`)와는 다르다. Charts 서비스는 시트에 종속되지 않고 임의의 데이터로 **PNG 이미지 한 장**을 만든다. 시트 안에 살아있는 차트를 박고 싶다면 `02-services/spreadsheet.md`의 `EmbeddedChart`를 쓴다.

**전형적인 흐름**

```text
데이터  →  DataTableBuilder(addColumn/addRow)  →  DataTable
        →  ChartBuilder(newColumnChart 등 + setter)  →  build()  →  Chart
        →  getBlob()  →  Gmail / Drive / HtmlService / Docs
```

**언제 쓰는가**
- 매일/매주 지표를 차트 이미지로 만들어 Gmail 리포트에 인라인 첨부
- 웹앱(`HtmlService`)에 서버에서 그린 차트 이미지를 표시
- Drive에 차트 스냅샷 PNG를 저장/아카이브

**OAuth 스코프** — Charts 서비스 자체는 순수 계산이라 사용자 데이터에 접근하지 않으므로 전용 스코프가 필요 없다. 실전에서 필요한 스코프는 결과물을 다루는 동반 서비스(`GmailApp`, `DriveApp`, `SpreadsheetApp` 등)에서 온다.

## Charts 클래스

팩토리 진입점이다. 데이터 테이블 빌더와 각 차트 빌더를 만든다.

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `newDataTable()` | `DataTableBuilder` | 빈 데이터 테이블 빌더 생성 |
| `newColumnChart()` | `ColumnChartBuilder` | 세로 막대(컬럼) 차트 빌더 |
| `newBarChart()` | `BarChartBuilder` | 가로 막대(바) 차트 빌더 |
| `newLineChart()` | `LineChartBuilder` | 선 차트 빌더 |
| `newAreaChart()` | `AreaChartBuilder` | 영역 차트 빌더 |
| `newPieChart()` | `PieChartBuilder` | 원형(파이) 차트 빌더 |
| `newScatterChart()` | `ScatterChartBuilder` | 산점도 차트 빌더 |
| `newTableChart()` | `TableChartBuilder` | 표 형태 차트 빌더 |
| `newTextStyle()` | `TextStyleBuilder` | 텍스트 스타일 빌더(제목/축/범례 글꼴) |
| `newDataViewDefinition()` | `DataViewDefinitionBuilder` | 데이터 뷰 정의 빌더(열 필터/재정렬) |

`Charts` 클래스에는 enum도 프로퍼티로 노출된다: `ChartType`, `ColumnType`, `CurveStyle`, `PointStyle`, `Position`, `ChartHiddenDimensionStrategy`, `ChartMergeStrategy`. 접근 경로는 `Charts.ColumnType.STRING`처럼 클래스 밑이다.

## DataTable / DataTableBuilder

`DataTableBuilder`로 열(컬럼)과 행(로우)을 정의하고 `build()`로 `DataTable`을 만든다. 이 `DataTable`을 차트 빌더의 `setDataTable()`에 넘긴다.

| 메서드 | 시그니처 | 반환 | 설명 |
| --- | --- | --- | --- |
| `addColumn` | `addColumn(type, label)` | `DataTableBuilder` | 열 추가 (`type`은 `ColumnType`, `label`은 문자열) |
| `addRow` | `addRow(values)` | `DataTableBuilder` | 행 추가 (열 순서에 맞춘 값 배열) |
| `setValue` | `setValue(row, column, value)` | `DataTableBuilder` | 특정 셀 값 설정 |
| `build` | `build()` | `DataTable` | 데이터 테이블 완성 |

> 공식 문서에 `addRows()`(복수형)는 **없다**. 여러 행은 `addRow(...)`를 반복 호출한다.

첫 열은 보통 카테고리(도메인 축) 라벨, 이후 열들은 각각 하나의 데이터 시리즈다. 값 타입은 열의 `ColumnType`과 맞춰야 한다 — `DATE` 열에는 `Date` 객체, `NUMBER` 열에는 숫자를 넣는다.

공식 예제:

```javascript
const data = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, 'Month')
    .addColumn(Charts.ColumnType.NUMBER, 'In Store')
    .addColumn(Charts.ColumnType.NUMBER, 'Online')
    .addRow(['January', 10, 1])
    .addRow(['February', 12, 1])
    .addRow(['March', 20, 2])
    .build();
```

## 차트 빌더 — 공통 setter

모든 차트 빌더는 `Charts.newXxxChart()`로 만들고, setter를 체이닝한 뒤 `build()`로 `Chart`를 얻는다. 아래는 `ColumnChartBuilder` 기준의 대표 setter다(대부분의 축 기반 빌더 — Column/Bar/Line/Area/Scatter — 가 동일하게 가진다).

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `setDataTable(table)` | `ColumnChartBuilder` | 사용할 `DataTable`(또는 `DataTableBuilder`) 지정 |
| `setTitle(chartTitle)` | `ColumnChartBuilder` | 차트 제목 |
| `setDimensions(width, height)` | `ColumnChartBuilder` | 이미지 크기(px) |
| `setColors(cssValues)` | `ColumnChartBuilder` | 시리즈 색상 배열(CSS 색상 문자열) |
| `setBackgroundColor(cssValue)` | `ColumnChartBuilder` | 배경색 |
| `setLegendPosition(position)` | `ColumnChartBuilder` | 범례 위치(`Position` enum) |
| `setLegendTextStyle(textStyle)` | `ColumnChartBuilder` | 범례 글꼴(`TextStyle`) |
| `setTitleTextStyle(textStyle)` | `ColumnChartBuilder` | 제목 글꼴 |
| `setXAxisTitle(title)` | `ColumnChartBuilder` | 가로축 제목 |
| `setYAxisTitle(title)` | `ColumnChartBuilder` | 세로축 제목 |
| `setXAxisTextStyle(textStyle)` | `ColumnChartBuilder` | 가로축 눈금 글꼴 |
| `setYAxisTextStyle(textStyle)` | `ColumnChartBuilder` | 세로축 눈금 글꼴 |
| `setXAxisTitleTextStyle(textStyle)` | `ColumnChartBuilder` | 가로축 제목 글꼴 |
| `setYAxisTitleTextStyle(textStyle)` | `ColumnChartBuilder` | 세로축 제목 글꼴 |
| `setRange(start, end)` | `ColumnChartBuilder` | 값 축 범위 |
| `setStacked()` | `ColumnChartBuilder` | 시리즈 누적(스택) 표시 |
| `useLogScale()` | `ColumnChartBuilder` | 값 축 로그 스케일(모든 값이 양수여야 함) |
| `reverseCategories()` | `ColumnChartBuilder` | 도메인 축 시리즈 그리기 순서 반전 |
| `setDataSourceUrl(url)` | `ColumnChartBuilder` | 외부 데이터 소스 URL로 데이터 주입 |
| `setDataViewDefinition(def)` | `ColumnChartBuilder` | 데이터 뷰 정의 적용 |
| `setOption(option, value)` | `ColumnChartBuilder` | Google Charts의 고급 옵션 직접 지정 |
| `build()` | `Chart` | 차트 생성 |

> `setColors`의 공식 설명은 "Sets the colors for the **lines** in the chart."이지만 컬럼/바 등 다른 차트 타입에도 시리즈 색상으로 적용된다(Google 문서 표현이 빌더마다 복붙되어 있음).

### 빌더별 고유/차이

| 빌더 | 고유 메서드 | 비고 |
| --- | --- | --- |
| `LineChartBuilder` | `setCurveStyle(style)`, `setPointStyle(style)` | 곡선 스타일(`CurveStyle`), 점 스타일(`PointStyle`) |
| `PieChartBuilder` | `set3D()` | 3D 파이. **축 관련 메서드 없음** — `setXAxisTitle`/`setYAxisTitle`/`setRange`/`setStacked`/`useLogScale` 미제공 |
| `AreaChartBuilder` / `BarChartBuilder` | `setStacked()` 등 축 setter 공통 | 방향만 다름(바는 가로) |
| `ScatterChartBuilder` | 축 setter 공통 | X/Y 모두 수치 축 |

## Chart 클래스

`build()`가 반환하는 완성된 차트. 이미지 추출이 핵심이다.

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getBlob()` | `Blob` | 차트를 이미지 Blob(PNG)로 반환 |
| `getAs(contentType)` | `Blob` | 지정한 MIME 타입으로 변환한 Blob 반환 |
| `getOptions()` | `ChartOptions` | 높이/색상/축 등 현재 설정된 옵션 조회 |

> 공식 Chart 레퍼런스에는 위 3개만 문서화되어 있다. `getId()`/`modify()`는 확인되지 않았다(공식 문서 확인 필요). 이미지가 필요하면 `getBlob()` 또는 `getAs(contentType)`를 쓴다.

## Enum 정리

| Enum | 접근 경로 | 값 |
| --- | --- | --- |
| **ColumnType** | `Charts.ColumnType` | `STRING`, `NUMBER`, `DATE` |
| **Position** (범례) | `Charts.Position` | `TOP`, `RIGHT`, `BOTTOM`, `NONE` |
| **CurveStyle** | `Charts.CurveStyle` | `NORMAL`(직선), `SMOOTH`(부드러운 곡선) |
| **PointStyle** | `Charts.PointStyle` | `NONE`, `TINY`, `MEDIUM`, `LARGE`, `HUGE` |
| **ChartType** | `Charts.ChartType` | `AREA`, `BAR`, `BUBBLE`, `CANDLESTICK`, `COLUMN`, `COMBO`, `GAUGE`, `GEO`, `HISTOGRAM`, `LINE`, `ORG`, `PIE`, `RADAR`, `SCATTER`, `SPARKLINE`, `STEPPED_AREA`, `TABLE`, `TIMELINE`, `TREEMAP`, `WATERFALL` |

`ChartType`은 주로 내부/고급 옵션 식별용이며, 실제 차트 생성은 `newColumnChart()` 같은 전용 팩토리로 한다. 이 밖에 `ChartHiddenDimensionStrategy`, `ChartMergeStrategy`, `Orientation`, `PickerValuesLayout`, `MatchType` 등이 있으나 서버사이드 이미지 렌더에는 거의 쓰이지 않는다(세부 값은 공식 문서 확인 필요).

## 코드 예제

### 1) DataTable 구성 (DATE 열 포함)

```javascript
function buildSalesTable() {
  return Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, '월')
    .addColumn(Charts.ColumnType.NUMBER, '매장')
    .addColumn(Charts.ColumnType.NUMBER, '온라인')
    .addRow(['1월', 120, 80])
    .addRow(['2월', 135, 110])
    .addRow(['3월', 150, 160])
    .addRow(['4월', 140, 190])
    .build();
}
```

`DATE` 열을 쓸 때는 값에 `Date` 객체를 넣는다.

```javascript
const data = Charts.newDataTable()
  .addColumn(Charts.ColumnType.DATE, '날짜')
  .addColumn(Charts.ColumnType.NUMBER, '방문자')
  .addRow([new Date(2026, 6, 20), 1240]) // 월은 0-based (6 = 7월)
  .addRow([new Date(2026, 6, 21), 1580])
  .build();
```

### 2) ColumnChart → Gmail 리포트 (inlineImage + 첨부)

```javascript
function sendSalesReport() {
  const chart = Charts.newColumnChart()
    .setDataTable(buildSalesTable())
    .setTitle('월별 매출')
    .setXAxisTitle('월')
    .setYAxisTitle('매출(백만원)')
    .setColors(['#4285F4', '#34A853'])
    .setLegendPosition(Charts.Position.BOTTOM)
    .setDimensions(640, 400)
    .build();

  const blob = chart.getBlob().setName('sales.png');

  const htmlBody =
    '<h2>월별 매출 리포트</h2>' +
    '<img src="cid:salesChart" width="640">' + // cid로 인라인 참조
    '<p>자세한 수치는 첨부 파일 참고.</p>';

  GmailApp.sendEmail('team@example.com', '주간 매출 리포트', '', {
    htmlBody: htmlBody,
    inlineImages: { salesChart: blob }, // cid 키와 일치
    attachments: [blob],
  });
}
```

### 3) PieChart → Drive 저장

```javascript
function savePieToDrive() {
  const data = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, '채널')
    .addColumn(Charts.ColumnType.NUMBER, '비중')
    .addRow(['검색', 45])
    .addRow(['직접', 25])
    .addRow(['소셜', 20])
    .addRow(['기타', 10])
    .build();

  const chart = Charts.newPieChart()
    .setDataTable(data)
    .setTitle('유입 채널 비중')
    .set3D()
    .setLegendPosition(Charts.Position.RIGHT)
    .setDimensions(500, 400)
    .build();

  const blob = chart.getBlob().setName('channels.png');
  const file = DriveApp.createFile(blob);
  console.log(file.getUrl());
}
```

### 4) LineChart (CurveStyle/PointStyle) → HtmlService에 임베드

`HtmlService` 페이지에는 파일을 첨부할 수 없으므로, 이미지 바이트를 base64 data URI로 인라인한다.

```javascript
function doGet() {
  const data = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, '주')
    .addColumn(Charts.ColumnType.NUMBER, 'DAU')
    .addRow(['W1', 3200])
    .addRow(['W2', 3600])
    .addRow(['W3', 4100])
    .addRow(['W4', 4800])
    .build();

  const chart = Charts.newLineChart()
    .setDataTable(data)
    .setTitle('주간 DAU')
    .setCurveStyle(Charts.CurveStyle.SMOOTH)
    .setPointStyle(Charts.PointStyle.MEDIUM)
    .setDimensions(600, 360)
    .build();

  const bytes = chart.getBlob().getBytes();
  const dataUri = 'data:image/png;base64,' + Utilities.base64Encode(bytes);

  return HtmlService.createHtmlOutput(
    `<h3>대시보드</h3><img src="${dataUri}">`
  );
}
```

### 5) 외부 데이터 소스 URL 사용 (setDataSourceUrl)

`setDataTable` 대신 Google Visualization API 쿼리 URL로 데이터를 직접 끌어올 수 있다(공개 접근 가능한 시트여야 함).

```javascript
function chartFromDataSource() {
  const dataSourceUrl =
    'https://docs.google.com/spreadsheet/tq?range=A1:B8&key=SPREADSHEET_KEY&gid=0&headers=-1';

  const chart = Charts.newPieChart()
    .setTitle('World Population by Continent')
    .setDimensions(600, 500)
    .set3D()
    .setDataSourceUrl(dataSourceUrl)
    .build();

  return chart.getBlob();
}
```

## 일반적인 패턴

### 시트 데이터로 리포트 차트

`SpreadsheetApp`으로 범위를 읽어 `DataTable`을 채운 뒤 이미지로 렌더해 메일로 보내는 흐름이 흔하다. 시트 안에 상호작용 차트를 유지할 필요가 없고 "한 장의 이미지"만 필요할 때 Charts 서비스가 적합하다.

```javascript
function chartFromSheet() {
  const rows = SpreadsheetApp.getActive().getSheetByName('data')
    .getDataRange().getValues();
  const [header, ...body] = rows; // 첫 행은 헤더

  const builder = Charts.newDataTable()
    .addColumn(Charts.ColumnType.STRING, header[0])
    .addColumn(Charts.ColumnType.NUMBER, header[1]);
  body.forEach(r => builder.addRow([String(r[0]), Number(r[1])]));

  return Charts.newColumnChart()
    .setDataTable(builder.build())
    .setDimensions(640, 400)
    .build()
    .getBlob();
}
```

### 정기 리포트 자동화

시간 기반 트리거로 위 함수를 돌려 매일/매주 차트 이미지를 메일링한다(`03-triggers/installable-triggers.md` 참고).

## 주의사항 / 함정

1. **EmbeddedChart와 혼동 금지**
   Charts 서비스는 시트에 얹히는 상호작용 차트가 아니라 **정적 이미지(Blob)** 를 만든다. 셀 위 차트는 `SpreadsheetApp`의 `EmbeddedChart`/`EmbeddedChartBuilder`다(`02-services/spreadsheet.md`).

2. **정적 이미지 = 상호작용 없음**
   결과는 PNG 한 장이다. 툴팁·확대·클릭 같은 상호작용이 필요하면 클라이언트 사이드 Google Charts를 `HtmlService`에서 직접 로드해야 한다(이 서비스와 별개).

3. **값 타입과 ColumnType 일치**
   `DATE` 열에는 `Date` 객체, `NUMBER` 열에는 숫자를 넣는다. 문자열 `"10"`을 `NUMBER` 열에 넣으면 의도대로 안 그려질 수 있으니 `Number(...)`로 변환한다.

4. **`addRows()`는 없다**
   복수 행 추가 메서드는 없다. `addRow(...)`를 반복하거나 `forEach`로 돌린다.

5. **빌더마다 가진 setter가 다르다**
   `PieChartBuilder`에는 축 관련 메서드(`setXAxisTitle`/`setRange`/`setStacked`/`useLogScale`)가 없다. 파이 차트에 축 setter를 호출하지 않는다.

6. **`setColors` 설명의 'lines'는 문서 표현일 뿐**
   컬럼/바/영역 차트에도 시리즈 색상으로 적용된다.

7. **HtmlService에는 첨부 대신 base64 임베드**
   웹앱 HTML에는 `Blob` 첨부가 안 된다. `Utilities.base64Encode(chart.getBlob().getBytes())`로 `data:image/png;base64,...` URI를 만들어 `<img>`에 넣는다.

8. **Gmail 인라인 이미지는 cid 키 일치**
   `htmlBody`의 `<img src="cid:KEY">`와 `inlineImages: { KEY: blob }`의 키가 정확히 같아야 표시된다.

9. **이미지 포맷**
   `getBlob()`은 PNG 이미지 Blob을 준다. 다른 포맷이 필요하면 `getAs(contentType)`로 변환을 시도하되 지원 여부는 대상 타입에 따른다.

10. **미확인 API**
    `getId()`/`modify()`, `ChartType`을 제외한 일부 enum의 세부 값·동작은 공식 Chart/enum 레퍼런스에서 확인되지 않았다(공식 문서 확인 필요).

## 참고

- Charts 서비스 인덱스: https://developers.google.com/apps-script/reference/charts
- Charts 클래스: https://developers.google.com/apps-script/reference/charts/charts
- DataTableBuilder: https://developers.google.com/apps-script/reference/charts/data-table-builder
- ColumnChartBuilder: https://developers.google.com/apps-script/reference/charts/column-chart-builder
- Chart: https://developers.google.com/apps-script/reference/charts/chart
- 관련 문서: `02-services/spreadsheet.md`(EmbeddedChart), `02-services/gmail.md`, `04-web-apps/html-service.md`
