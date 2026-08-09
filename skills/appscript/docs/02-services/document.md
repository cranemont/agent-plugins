# Google Apps Script — Document 서비스

> **출처**
> - https://developers.google.com/apps-script/reference/document
> - https://developers.google.com/apps-script/reference/document/document-app
> - https://developers.google.com/apps-script/reference/document/document
> - https://developers.google.com/apps-script/reference/document/body
> - https://developers.google.com/apps-script/reference/document/paragraph
> - https://developers.google.com/apps-script/reference/document/text
> - https://developers.google.com/apps-script/reference/document/table
>
> **최종 확인일**: 2026-07-22

## 개요

Document 서비스(`DocumentApp`)는 Google Docs 문서를 프로그래밍 방식으로 생성, 열기, 수정할 수 있게 해주는 내장 서비스다.

다음과 같은 작업에 적합하다.

- 템플릿 문서에 데이터를 채워 보고서 자동 생성 (영업 보고서, 청구서, 인증서 등)
- 헤더/푸터 일괄 변경, 정책 문구 일괄 갱신
- 본문 텍스트 검색·치환 (`replaceText` 정규식 지원)
- 표(Table) 데이터 채우기 — 스프레드시트 데이터를 문서 표로 export
- 목록(ListItem) 자동 생성 — 회의록, 체크리스트
- 본문을 순회하며 요소 타입별로 다르게 처리 (예: 이미지만 추출, 표만 변환)
- 명명된 범위(`NamedRange`)를 활용한 안정적 문서 자동화 (텍스트가 바뀌어도 위치 유지)

**적합하지 않은 경우**:
- 매우 큰 문서(수만 개 요소): 6분 실행 한도 때문에 배치 처리 필요
- 픽셀 단위 정밀 레이아웃: Docs는 흐름 기반(flow-based) 모델
- 실시간 협업 편집: 스크립트 변경은 트랜잭션이 아님

**권한 스코프**:
- `https://www.googleapis.com/auth/documents` — 임의 문서 열기/생성
- `https://www.googleapis.com/auth/documents.currentonly` — 컨테이너 바인딩 문서만

## 클래스 계층

```
DocumentApp (진입점)
└── Document
    ├── Body (메인 본문)
    │   └── ContainerElement
    │       ├── Paragraph
    │       │   └── Text (또는 InlineImage, Equation, PageBreak, RichLink ...)
    │       ├── ListItem
    │       │   └── Text
    │       ├── Table
    │       │   └── TableRow
    │       │       └── TableCell
    │       │           └── Paragraph (또는 다른 ContainerElement)
    │       ├── HorizontalRule
    │       ├── PageBreak
    │       ├── InlineImage
    │       ├── InlineDrawing
    │       └── TableOfContents
    ├── HeaderSection
    ├── FooterSection
    ├── FootnoteSection
    │   └── Footnote
    ├── NamedRange (이름/ID로 식별되는 Range)
    │   └── Range
    └── Bookmark / Position
```

핵심 추상화 두 가지:

- **Element**: 모든 문서 구성요소의 부모 인터페이스. `getType()`, `getParent()`, `copy()`, `getAttributes()` 등을 제공.
- **ContainerElement**: 다른 요소를 자식으로 가질 수 있는 Element (Paragraph, ListItem, TableCell, Body 등).

## DocumentApp 진입점

| 메서드 | 반환 | 설명 |
|---|---|---|
| `create(name: String)` | `Document` | 새 문서 생성 후 반환 |
| `getActiveDocument()` | `Document` | 컨테이너 바인딩 스크립트의 현재 문서 |
| `openById(id: String)` | `Document` | ID로 문서 열기 |
| `openByUrl(url: String)` | `Document` | URL로 문서 열기 |
| `getUi()` | `Ui` | 문서 편집기 UI (메뉴/다이얼로그/사이드바) |

```javascript
function exampleOpenDoc() {
  // 1) 컨테이너 바인딩 (문서에 부착된 스크립트)
  const docA = DocumentApp.getActiveDocument();

  // 2) ID로 열기
  const docB = DocumentApp.openById('1AbCdEfGhIjKlMnOpQrStUvWxYz_-1234567890');

  // 3) URL로 열기
  const docC = DocumentApp.openByUrl('https://docs.google.com/document/d/.../edit');

  // 4) 새 문서 생성
  const docD = DocumentApp.create('2026-05 월간 보고서');
  console.log(docD.getId(), docD.getUrl());
}
```

### 주요 enum

#### ElementType

본문을 순회할 때 가장 자주 쓰는 enum.

| 값 | 대응 클래스 |
|---|---|
| `BODY_SECTION` | `Body` |
| `PARAGRAPH` | `Paragraph` |
| `LIST_ITEM` | `ListItem` |
| `TABLE` | `Table` |
| `TABLE_ROW` | `TableRow` |
| `TABLE_CELL` | `TableCell` |
| `TEXT` | `Text` |
| `INLINE_IMAGE` | `InlineImage` |
| `INLINE_DRAWING` | `InlineDrawing` |
| `HORIZONTAL_RULE` | `HorizontalRule` |
| `PAGE_BREAK` | `PageBreak` |
| `HEADER_SECTION` | `HeaderSection` |
| `FOOTER_SECTION` | `FooterSection` |
| `FOOTNOTE` | `Footnote` |
| `FOOTNOTE_SECTION` | `FootnoteSection` |
| `EQUATION` | `Equation` |
| `EQUATION_FUNCTION` | `EquationFunction` |
| `EQUATION_SYMBOL` | `EquationSymbol` |
| `EQUATION_FUNCTION_ARGUMENT_SEPARATOR` | `EquationFunctionArgumentSeparator` |
| `RICH_LINK` | `RichLink` (스마트 칩) |
| `DATE` | `Date` (스마트 칩) |
| `PERSON` | `Person` (스마트 칩) |
| `TABLE_OF_CONTENTS` | `TableOfContents` |
| `COMMENT_SECTION` | 댓글 영역 (전용 요소 클래스 없음) |
| `UNSUPPORTED` | `UnsupportedElement` |

#### ParagraphHeading

| 값 | 의미 |
|---|---|
| `NORMAL` | 일반 본문 |
| `TITLE` | 제목 |
| `SUBTITLE` | 부제 |
| `HEADING1` ~ `HEADING6` | 표제 1~6 |

#### HorizontalAlignment / VerticalAlignment / TextAlignment

- `HorizontalAlignment`: `LEFT`, `CENTER`, `RIGHT`, `JUSTIFY`
- `VerticalAlignment`: `TOP`, `CENTER`, `BOTTOM` (TableCell에서 사용)
- `TextAlignment`: `NORMAL`, `SUPERSCRIPT`, `SUBSCRIPT`

#### GlyphType

`ListItem.setGlyphType()`에서 사용. 대표 값: `BULLET`, `HOLLOW_BULLET`, `SQUARE_BULLET`, `NUMBER`, `LATIN_UPPER`, `LATIN_LOWER`, `ROMAN_UPPER`, `ROMAN_LOWER`.

#### Attribute

`getAttributes()` / `setAttributes()`의 키. 대표 값: `BOLD`, `ITALIC`, `UNDERLINE`, `STRIKETHROUGH`, `FONT_FAMILY`, `FONT_SIZE`, `FOREGROUND_COLOR`, `BACKGROUND_COLOR`, `LINK_URL`, `HEADING`, `HORIZONTAL_ALIGNMENT`, `LINE_SPACING`, `SPACING_BEFORE`, `SPACING_AFTER`, `INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE`, `MARGIN_TOP`, `MARGIN_BOTTOM`, `MARGIN_LEFT`, `MARGIN_RIGHT`, `PAGE_HEIGHT`, `PAGE_WIDTH`, `BORDER_COLOR`, `BORDER_WIDTH`, `LIST_ID`, `NESTING_LEVEL`, `GLYPH_TYPE`, `VERTICAL_ALIGNMENT`, `WIDTH`, `HEIGHT`, `LEFT_TO_RIGHT`, `MINIMUM_HEIGHT`, `PADDING_TOP`, `PADDING_BOTTOM`, `PADDING_LEFT`, `PADDING_RIGHT`, `CODE`.

#### FontFamily (deprecated)

V8 런타임에서는 폰트명을 문자열로 직접 넘기는 것을 권장. (`setFontFamily('Noto Sans KR')`)

---

## 주요 클래스별 정리

### Document

문서 전체를 나타낸다. 본문(`Body`), 헤더/푸터, 메타데이터, 권한 등을 다룬다.

| 메서드 | 반환 |
|---|---|
| `getBody()` | `Body` |
| `getHeader()` | `HeaderSection \| null` |
| `getFooter()` | `FooterSection \| null` |
| `addHeader()` | `HeaderSection` |
| `addFooter()` | `FooterSection` |
| `getFootnotes()` | `Footnote[]` |
| `getId()` | `String` |
| `getName()` | `String` |
| `setName(name)` | `Document` |
| `getUrl()` | `String` |
| `getLanguage()` | `String \| null` |
| `setLanguage(languageCode)` | `Document` |
| `getCursor()` | `Position \| null` |
| `setCursor(position)` | `Document` |
| `getSelection()` | `Range \| null` |
| `setSelection(range)` | `Document` |
| `newPosition(element, offset)` | `Position` |
| `newRange()` | `RangeBuilder` |
| `addNamedRange(name, range)` | `NamedRange` |
| `getNamedRangeById(id)` | `NamedRange \| null` |
| `getNamedRanges()` | `NamedRange[]` |
| `getNamedRanges(name)` | `NamedRange[]` |
| `addBookmark(position)` | `Bookmark` |
| `getBookmark(id)` | `Bookmark \| null` |
| `getBookmarks()` | `Bookmark[]` |
| `getActiveTab()` | `Tab \| null` |
| `getTab(tabId)` | `Tab \| null` |
| `getTabs()` | `Tab[]` |
| `setActiveTab(tabId)` | `void` |
| `addEditor(emailAddress)` | `Document` |
| `addEditor(user)` | `Document` |
| `addEditors(emailAddresses)` | `Document` |
| `addViewer(emailAddress)` | `Document` |
| `addViewers(emailAddresses)` | `Document` |
| `removeEditor(emailAddress)` | `Document` |
| `removeViewer(emailAddress)` | `Document` |
| `getEditors()` | `User[]` |
| `getViewers()` | `User[]` |
| `getAs(contentType)` | `Blob` |
| `getBlob()` | `Blob` |
| `getSupportedLanguageCodes()` | `String[]` |
| `saveAndClose()` | `void` |

```javascript
function exampleDocumentBasics() {
  const doc = DocumentApp.getActiveDocument();
  console.log('ID:', doc.getId());
  console.log('이름:', doc.getName());
  console.log('URL:', doc.getUrl());

  // PDF로 export
  const pdfBlob = doc.getAs('application/pdf');
  DriveApp.createFile(pdfBlob).setName(doc.getName() + '.pdf');
}
```

> **참고 — Tab API**
> 2024년 이후 Docs는 한 문서가 여러 탭을 가질 수 있다. `getBody()`는 활성 탭의 본문을 반환한다. 모든 탭을 처리하려면 `getTabs()`로 순회하고 각 `Tab`에서 `asDocumentTab().getBody()`를 호출한다.

---

### Body

문서 본문. 단락, 표, 이미지 등을 추가/조회한다.

#### Append/Insert

| 메서드 | 반환 |
|---|---|
| `appendParagraph(text: String)` | `Paragraph` |
| `appendParagraph(paragraph: Paragraph)` | `Paragraph` |
| `appendListItem(text: String)` | `ListItem` |
| `appendListItem(listItem: ListItem)` | `ListItem` |
| `appendTable()` | `Table` |
| `appendTable(cells: String[][])` | `Table` |
| `appendTable(table: Table)` | `Table` |
| `appendImage(image: BlobSource)` | `InlineImage` |
| `appendImage(image: InlineImage)` | `InlineImage` |
| `appendHorizontalRule()` | `HorizontalRule` |
| `appendPageBreak()` | `PageBreak` |
| `appendPageBreak(pageBreak: PageBreak)` | `PageBreak` |
| `insertParagraph(childIndex, text)` | `Paragraph` |
| `insertParagraph(childIndex, paragraph)` | `Paragraph` |
| `insertListItem(childIndex, text)` | `ListItem` |
| `insertTable(childIndex, cells)` | `Table` |
| `insertImage(childIndex, image)` | `InlineImage` |
| `insertHorizontalRule(childIndex)` | `HorizontalRule` |
| `insertPageBreak(childIndex)` | `PageBreak` |

#### 조회

| 메서드 | 반환 |
|---|---|
| `getChild(childIndex)` | `Element` |
| `getChildIndex(child)` | `Integer` |
| `getNumChildren()` | `Integer` |
| `getParagraphs()` | `Paragraph[] \| null` |
| `getListItems()` | `ListItem[] \| null` |
| `getTables()` | `Table[] \| null` |
| `getImages()` | `InlineImage[] \| null` |
| `getText()` | `String` |
| `editAsText()` | `Text` |
| `findElement(elementType)` | `RangeElement \| null` |
| `findElement(elementType, from)` | `RangeElement \| null` |
| `findText(searchPattern)` | `RangeElement \| null` |
| `findText(searchPattern, from)` | `RangeElement \| null` |
| `replaceText(searchPattern, replacement)` | `Element` |

#### 페이지 설정

| 메서드 | 반환 |
|---|---|
| `setMarginTop(n)` / `setMarginBottom(n)` / `setMarginLeft(n)` / `setMarginRight(n)` | `Body` |
| `getMarginTop()` / `getMarginBottom()` / `getMarginLeft()` / `getMarginRight()` | `Number \| null` |
| `setPageHeight(n)` / `setPageWidth(n)` | `Body` |
| `getPageHeight()` / `getPageWidth()` | `Number \| null` |
| `setAttributes(attributes)` | `Body` |
| `setHeadingAttributes(heading, attributes)` | `Body` |
| `setTextAlignment(textAlignment)` | `Body` |
| `clear()` | `Body` |
| `copy()` | `Body` |
| `setText(text)` | `Body` |
| `removeChild(child)` | `Body` |
| `getType()` | `ElementType` |

```javascript
function exampleBodyFill() {
  const body = DocumentApp.getActiveDocument().getBody();
  body.clear();

  body.appendParagraph('2026년 5월 보고서').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('요약').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('이번 달 매출은 전월 대비 12% 증가했습니다.');

  body.appendParagraph('주요 지표').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendListItem('매출: 1.2억').setGlyphType(DocumentApp.GlyphType.BULLET);
  body.appendListItem('신규 고객: 134명').setGlyphType(DocumentApp.GlyphType.BULLET);

  body.appendTable([
    ['지표', '값', '전월비'],
    ['매출',  '1.2억', '+12%'],
    ['MAU',   '52만',  '+3%'],
  ]);
}
```

---

### Paragraph

단락 요소. `ListItem`은 사실상 Paragraph의 일종(번호/글머리표가 있는 단락).

| 메서드 | 반환 |
|---|---|
| `setHeading(heading: ParagraphHeading)` | `Paragraph` |
| `getHeading()` | `ParagraphHeading` |
| `setAlignment(alignment: HorizontalAlignment)` | `Paragraph` |
| `getAlignment()` | `HorizontalAlignment` |
| `setIndentStart(indentStart: Number)` | `Paragraph` |
| `setIndentEnd(indentEnd: Number)` | `Paragraph` |
| `setIndentFirstLine(indentFirstLine: Number)` | `Paragraph` |
| `setLineSpacing(multiplier: Number)` | `Paragraph` |
| `setSpacingBefore(n: Number)` | `Paragraph` |
| `setSpacingAfter(n: Number)` | `Paragraph` |
| `appendText(text: String)` | `Text` |
| `appendText(text: Text)` | `Text` |
| `getText()` | `String` |
| `setText(text: String)` | `void` |
| `editAsText()` | `Text` |
| `clear()` | `Paragraph` |
| `copy()` | `Paragraph` |
| `replaceText(searchPattern, replacement)` | `Element` |
| `setAttributes(attributes)` | `Paragraph` |
| `getAttributes()` | `Object` |

```javascript
function exampleParagraph() {
  const body = DocumentApp.getActiveDocument().getBody();
  const p = body.appendParagraph('중요 공지');
  p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setSpacingBefore(12).setSpacingAfter(12);
  p.editAsText().setBold(true).setForegroundColor('#cc0000');
}
```

---

### Text

리치 텍스트 영역. 단락 안에서 글자 단위 서식을 다룬다.

대부분의 setter는 **전체 적용 버전**과 **부분 적용 버전**(start/end offset) 두 가지가 있다.

| 메서드 | 반환 |
|---|---|
| `setBold(bold)` / `setBold(startOffset, endOffsetInclusive, bold)` | `Text` |
| `setItalic(...)` | `Text` |
| `setUnderline(...)` | `Text` |
| `setStrikethrough(...)` | `Text` |
| `setFontFamily(fontFamilyName)` / `setFontFamily(start, end, name)` | `Text` |
| `setFontSize(size)` / `setFontSize(start, end, size)` | `Text` |
| `setForegroundColor(color)` / `setForegroundColor(start, end, color)` | `Text` |
| `setBackgroundColor(color)` / `setBackgroundColor(start, end, color)` | `Text` |
| `setLinkUrl(url)` / `setLinkUrl(start, end, url)` | `Text` |
| `setTextAlignment(textAlignment)` / `setTextAlignment(start, end, ...)` | `Text` |
| `appendText(text)` | `Text` |
| `insertText(offset, text)` | `Text` |
| `deleteText(startOffset, endOffsetInclusive)` | `Text` |
| `setText(text)` | `Text` |
| `getText()` | `String` |
| `findText(searchPattern)` | `RangeElement \| null` |
| `findText(searchPattern, from)` | `RangeElement \| null` |
| `replaceText(searchPattern, replacement)` | `Element` |
| `getTextAttributeIndices()` | `Integer[]` |
| `editAsText()` | `Text` |
| `copy()` | `Text` |

```javascript
function exampleTextStyling() {
  const body = DocumentApp.getActiveDocument().getBody();
  const p = body.appendParagraph('이 단어는 빨강이고 굵게 처리됩니다.');
  const t = p.editAsText();

  // 0~4번 인덱스(이 단어)에 서식
  t.setBold(0, 4, true);
  t.setForegroundColor(0, 4, '#cc0000');
  t.setFontFamily('Noto Sans KR');
  t.setFontSize(11);
}
```

색상은 `#rrggbb` 형식 문자열. `setForegroundColor(null)`로 색 해제.

---

### Table / TableRow / TableCell

| Table 메서드 | 반환 |
|---|---|
| `appendTableRow()` | `TableRow` |
| `appendTableRow(tableRow)` | `TableRow` |
| `insertTableRow(childIndex)` | `TableRow` |
| `insertTableRow(childIndex, tableRow)` | `TableRow` |
| `removeRow(rowIndex)` | `TableRow` |
| `getRow(rowIndex)` | `TableRow \| null` |
| `getNumRows()` | `Integer` |
| `getCell(rowIndex, cellIndex)` | `TableCell \| null` |
| `setBorderColor(color)` | `Table` |
| `setBorderWidth(width)` | `Table` |
| `setColumnWidth(columnIndex, width)` | `Table` |
| `getColumnWidth(columnIndex)` | `Number \| null` |
| `getText()` / `editAsText()` | `String` / `Text` |
| `findText` / `replaceText` | (검색·치환) |
| `clear()` / `copy()` | `Table` |

`TableCell`은 `ContainerElement`이므로 내부에 Paragraph, ListItem, 또 다른 Table을 넣을 수 있다.

```javascript
function exampleTable() {
  const body = DocumentApp.getActiveDocument().getBody();
  const table = body.appendTable([
    ['이름', '점수'],
    ['Alice', '95'],
    ['Bob',   '88'],
  ]);
  table.setBorderColor('#cccccc').setBorderWidth(1);
  table.setColumnWidth(0, 200);

  // 헤더 행 굵게
  const headerRow = table.getRow(0);
  for (let i = 0; i < 2; i++) {
    headerRow.getCell(i).editAsText().setBold(true);
  }

  // 행 추가
  table.appendTableRow().appendTableCell('Carol').getParent().appendTableCell('77');
}
```

---

### ListItem

번호/글머리 목록 항목. Paragraph의 모든 메서드를 포함하고, 추가로:

| 메서드 | 반환 |
|---|---|
| `setGlyphType(glyphType: GlyphType)` | `ListItem` |
| `getGlyphType()` | `GlyphType` |
| `setNestingLevel(level: Integer)` | `ListItem` |
| `getNestingLevel()` | `Integer` |
| `setListId(listItem: ListItem)` | `ListItem` |
| `getListId()` | `String` |

같은 목록에 속하게 하려면 `setListId(otherListItem)`로 묶는다. 새 `appendListItem()`은 새 목록을 시작할 수 있으니 주의.

```javascript
function exampleNestedList() {
  const body = DocumentApp.getActiveDocument().getBody();
  const item1 = body.appendListItem('1단계').setGlyphType(DocumentApp.GlyphType.NUMBER);
  body.appendListItem('1.1단계').setListId(item1).setNestingLevel(1);
  body.appendListItem('1.2단계').setListId(item1).setNestingLevel(1);
  body.appendListItem('2단계').setListId(item1);
}
```

---

### HeaderSection / FooterSection

`HeaderSection`과 `FooterSection`은 사실상 `Body`와 동일한 API(append/insert/find/replace)를 갖는 컨테이너다.

```javascript
function exampleHeaderFooter() {
  const doc = DocumentApp.getActiveDocument();
  const header = doc.getHeader() || doc.addHeader();
  header.clear();
  const p = header.appendParagraph('© 2026 Acme Corp.');
  p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  p.editAsText().setFontSize(9).setForegroundColor('#888888');

  const footer = doc.getFooter() || doc.addFooter();
  footer.clear();
  footer.appendParagraph('기밀문서 — 외부 공유 금지')
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}
```

---

### Range / RangeElement / NamedRange

- **Range**: 문서 안의 요소 묶음(연속/비연속 가능).
- **RangeElement**: 하나의 Element + 선택적 start/end offset(부분 텍스트 선택).
- **NamedRange**: 이름과 ID를 갖는 영구 저장 Range. 사용자가 문서를 편집해도 ID는 유지된다.

```javascript
function exampleNamedRange() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const found = body.findText('총액'); // RangeElement|null
  if (!found) return;

  const rangeBuilder = doc.newRange();
  rangeBuilder.addElement(found.getElement(), found.getStartOffset(), found.getEndOffsetInclusive());
  const named = doc.addNamedRange('TOTAL_AMOUNT', rangeBuilder.build());
  console.log('NamedRange ID:', named.getId());
}

function exampleFindNamedRange() {
  const ranges = DocumentApp.getActiveDocument().getNamedRanges('TOTAL_AMOUNT');
  ranges.forEach(nr => {
    nr.getRange().getRangeElements().forEach(re => {
      const el = re.getElement().asText();
      el.setText('1,234,567원');
    });
  });
}
```

---

## 자주 쓰는 패턴

### 1. 본문 순회하며 ElementType별 처리

`getNumChildren()` + `getChild(i).getType()`은 본문을 처리하는 정석이다.

```javascript
function walkBody() {
  const body = DocumentApp.getActiveDocument().getBody();
  const ET = DocumentApp.ElementType;
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    switch (el.getType()) {
      case ET.PARAGRAPH:
        handleParagraph(el.asParagraph());
        break;
      case ET.LIST_ITEM:
        handleListItem(el.asListItem());
        break;
      case ET.TABLE:
        handleTable(el.asTable());
        break;
      case ET.INLINE_IMAGE:
        handleImage(el.asInlineImage());
        break;
      default:
        // HORIZONTAL_RULE, PAGE_BREAK 등
        break;
    }
  }
}

function handleParagraph(p) { console.log('P:', p.getText()); }
function handleListItem(li) { console.log('LI:', li.getText()); }
function handleTable(t)     { console.log('TABLE rows:', t.getNumRows()); }
function handleImage(img)   { console.log('IMG width:', img.getWidth()); }
```

### 2. 텍스트 검색/치환 (정규식 가능)

`replaceText(pattern, replacement)`은 **RE2 기반 정규식**을 받는다 (백트래킹 제한). `findText`는 RangeElement를 반환해 위치 기반 작업에 쓸 수 있다.

```javascript
function templateFill() {
  const body = DocumentApp.getActiveDocument().getBody();
  body.replaceText('\\{\\{customer\\}\\}', '김민수 고객님');
  body.replaceText('\\{\\{amount\\}\\}',   '1,234,567원');
  body.replaceText('\\{\\{date\\}\\}',     '2026-05-11');
}

function highlightAllOccurrences() {
  const body = DocumentApp.getActiveDocument().getBody();
  let found = body.findText('TODO');
  while (found) {
    const el = found.getElement().asText();
    const start = found.getStartOffset();
    const end = found.getEndOffsetInclusive();
    el.setBackgroundColor(start, end, '#fff59d');
    found = body.findText('TODO', found);
  }
}
```

`replaceText`는 헤더/푸터/표/리스트 안까지 재귀적으로 적용된다(컨테이너에서 호출 시).

### 3. 템플릿 복제 후 데이터 채우기

```javascript
function generateReport(template_id, data) {
  const copy = DriveApp.getFileById(template_id).makeCopy(
    `${data.month} 보고서 - ${data.team}`
  );
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  Object.entries(data).forEach(([key, value]) => {
    body.replaceText(`\\{\\{${key}\\}\\}`, String(value));
  });

  // 매출 표 채우기
  const table = body.getTables()[0];
  data.rows.forEach((row, i) => {
    const tableRow = table.getRow(i + 1) || table.appendTableRow();
    row.forEach((cell, j) => {
      const tc = tableRow.getCell(j) || tableRow.appendTableCell();
      tc.editAsText().setText(String(cell));
    });
  });

  doc.saveAndClose();
  return doc.getUrl();
}
```

### 4. 이미지 삽입

```javascript
function insertChartImage() {
  const body = DocumentApp.getActiveDocument().getBody();
  const chartBlob = UrlFetchApp.fetch('https://example.com/chart.png').getBlob();
  const img = body.appendImage(chartBlob);
  img.setWidth(400).setHeight(240);
}
```

### 5. PDF로 export 후 메일 발송

```javascript
function emailAsPdf(toEmail) {
  const doc = DocumentApp.getActiveDocument();
  doc.saveAndClose();
  const pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf')
              .setName(doc.getName() + '.pdf');
  MailApp.sendEmail({
    to: toEmail,
    subject: doc.getName(),
    body: '첨부 파일을 확인해주세요.',
    attachments: [pdf],
  });
}
```

### 6. 헤더에 페이지 정보 제목 넣기

```javascript
function setHeaderTitle(title) {
  const doc = DocumentApp.getActiveDocument();
  const header = doc.getHeader() || doc.addHeader();
  header.clear();
  header.appendParagraph(title)
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
        .editAsText().setBold(true);
}
```

### 7. 안전한 자식 제거(역방향 순회)

자식을 삭제하면 인덱스가 흐트러진다. 항상 **뒤에서 앞으로** 순회한다.

```javascript
function removeAllTables() {
  const body = DocumentApp.getActiveDocument().getBody();
  for (let i = body.getNumChildren() - 1; i >= 0; i--) {
    const el = body.getChild(i);
    if (el.getType() === DocumentApp.ElementType.TABLE) {
      body.removeChild(el);
    }
  }
}
```

---

## 주의사항 / 함정

- **`saveAndClose()` 호출 시점**: `getActiveDocument()`로 받은 문서는 자동 저장된다. 그러나 `openById`로 연 문서를 다른 함수에서 다시 열거나 PDF로 export하기 전에는 `saveAndClose()`를 호출해 변경사항을 확정해야 한다.
- **첫 단락 삭제 불가**: `Body`는 항상 최소 하나의 자식 단락을 가져야 한다. 마지막 Paragraph를 `removeChild`하면 예외가 발생한다. `clear()`를 쓰거나 빈 Paragraph를 남겨라.
- **`replaceText` 정규식 escape**: `{`, `}`, `(`, `)`, `.` 등은 escape 필요. JavaScript 문자열에서 `\\` 두 번 써야 정규식 `\`가 된다.
- **본문 외 영역**: `Body.replaceText`는 본문만 다룬다. 헤더/푸터/각주에는 각각의 `HeaderSection.replaceText()`, `FooterSection.replaceText()`, `Footnote.getFootnoteContents().replaceText()`를 호출.
- **이미지 크기 단위**: `setWidth/setHeight`는 **포인트(pt)** 단위. (1pt = 1/72 inch)
- **`getImages()`, `getTables()` 등이 `null` 반환**: 요소가 없을 때 빈 배열이 아니라 `null`이 올 수 있다. 호출자에서 `(arr || [])`로 보호.
- **순회 중 구조 변경 금지**: `for...of getParagraphs()` 도중 새 단락을 추가하면 무한 루프나 누락이 생길 수 있다. 결과를 먼저 배열로 받고 처리.
- **NestingLevel과 ListId**: 새 `appendListItem`은 별개 목록으로 시작될 수 있다. 같은 목록(번호 연속) 안에 있으려면 동일 `listId`를 설정.
- **Tab API와의 호환성**: 멀티탭 문서에서 `getBody()`는 **활성 탭**만 반환. 전체 탭을 처리하려면 `getTabs()`로 모든 탭을 순회해야 한다.
- **6분 제한**: 큰 문서의 전체 텍스트 치환은 일괄 batch가 없으므로 분할 실행하거나 트리거로 재시작 필요.
- **권한 스코프**: `documents.currentonly`는 컨테이너 바인딩 문서 외에는 못 연다. `openById`/`openByUrl`을 쓰려면 `documents` 스코프가 필요하고, 보통 `https://www.googleapis.com/auth/drive` 같은 Drive 스코프도 같이 필요할 수 있다.
- **`InlineImage.getBlob()` vs `PositionedImage`**: 본문에 흐름 방식으로 들어간 이미지는 `InlineImage`, 페이지에 절대 좌표로 고정된 이미지는 `PositionedImage`. 두 클래스는 별개이며 위치 조작 API가 다르다.
- **`setText`의 부작용**: `Paragraph.setText(string)`은 내부 서식과 자식 요소를 **모두 제거**한다. 서식을 유지하려면 `editAsText().insertText/deleteText`를 사용.

---

## 참고

- DocumentApp 레퍼런스: https://developers.google.com/apps-script/reference/document/document-app
- Document 클래스: https://developers.google.com/apps-script/reference/document/document
- Body: https://developers.google.com/apps-script/reference/document/body
- Paragraph: https://developers.google.com/apps-script/reference/document/paragraph
- Text: https://developers.google.com/apps-script/reference/document/text
- Table: https://developers.google.com/apps-script/reference/document/table
- ListItem: https://developers.google.com/apps-script/reference/document/list-item
- NamedRange: https://developers.google.com/apps-script/reference/document/named-range
- Range / RangeBuilder / RangeElement: https://developers.google.com/apps-script/reference/document/range
- HeaderSection / FooterSection: https://developers.google.com/apps-script/reference/document/header-section
- Element 인터페이스: https://developers.google.com/apps-script/reference/document/element
- Docs 자동화 가이드: https://developers.google.com/apps-script/guides/docs
