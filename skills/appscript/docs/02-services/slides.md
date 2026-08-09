# Google Apps Script — Slides 서비스

> **출처**
> - https://developers.google.com/apps-script/reference/slides
> - https://developers.google.com/apps-script/reference/slides/slides-app
> - https://developers.google.com/apps-script/reference/slides/presentation
> - https://developers.google.com/apps-script/reference/slides/slide
> - https://developers.google.com/apps-script/reference/slides/shape
> - https://developers.google.com/apps-script/reference/slides/page-element
>
> **최종 확인일**: 2026-07-22

## 개요

Slides 서비스(`SlidesApp`)는 Google Slides 프레젠테이션을 생성, 편집, 자동화할 수 있는 내장 서비스다.

적합한 활용처:

- 템플릿 기반 슬라이드 자동 생성 (월간 보고, 영업 자료, 제품 출시 자료)
- placeholder 텍스트 일괄 치환으로 슬라이드 양산
- Sheets의 차트를 슬라이드에 임베드/갱신
- 이미지·도형·표 프로그래매틱 삽입
- 마스터/레이아웃 상속을 활용한 일관된 디자인
- 슬라이드 단위 동적 정렬·복제·삭제

부적합한 경우:

- 매우 복잡한 애니메이션 제어 (Apps Script는 애니메이션 타이밍에 대한 통제가 제한적)
- 픽셀 단위 정밀 디자인 (포인트 단위)
- 수백 슬라이드의 전체 재구성: 6분 실행 한도 주의

**권한 스코프**:
- `https://www.googleapis.com/auth/presentations` — 임의 프레젠테이션 접근
- `https://www.googleapis.com/auth/presentations.currentonly` — 컨테이너 바인딩 현재 파일만

## 클래스 계층

```
SlidesApp (진입점)
└── Presentation
    ├── Slide (PageType.SLIDE)
    │   ├── PageElement (추상)
    │   │   ├── Shape (텍스트박스, 도형 모두 Shape)
    │   │   │   └── TextRange
    │   │   ├── Image
    │   │   ├── Table
    │   │   │   └── TableCell
    │   │   │       └── TableCellRange
    │   │   ├── Group (다른 PageElement를 묶음)
    │   │   ├── Line
    │   │   ├── Video
    │   │   ├── WordArt
    │   │   ├── SheetsChart (Sheets에 링크된 차트)
    │   │   └── SpeakerSpotlight
    │   ├── PageBackground
    │   ├── ColorScheme
    │   └── NotesPage
    ├── Layout (Slide가 상속하는 템플릿)
    ├── Master (Layout이 상속하는 최상위 템플릿)
    └── NotesMaster
```

핵심 추상화:

- **Page**: Slide, Layout, Master, NotesPage, NotesMaster의 공통 부모. `getPageElements()`, `getBackground()`, `replaceAllText()` 등 공유.
- **PageElement**: 페이지 위의 모든 시각 객체의 공통 인터페이스. `getPageElementType()`로 구분, `asShape()`, `asImage()` 등으로 다운캐스트.

### Layout vs Master vs Slide — 차이

| 개념 | 역할 | 변경 시 영향 |
|---|---|---|
| **Master** | 프레젠테이션 전체의 최상위 템플릿. 글꼴, 컬러, 공통 배경, 페이지 번호 등. | 모든 Layout과 그것을 사용하는 모든 Slide |
| **Layout** | Master를 상속한 슬라이드 유형 (제목 슬라이드, 본문 슬라이드, 섹션 슬라이드 등). 빈 placeholder 정의. | 그 Layout을 사용하는 모든 Slide |
| **Slide** | Layout을 상속한 실제 페이지. placeholder를 채운 결과. | 본인 페이지만 |

상속 구조:

```
Master ─┬─ Layout(TITLE)        ─ Slide #1, Slide #5 ...
        ├─ Layout(TITLE_AND_BODY) ─ Slide #2, Slide #3 ...
        └─ Layout(SECTION_HEADER) ─ Slide #4 ...
```

placeholder를 슬라이드에서 채우면 그 슬라이드만 덮어쓰는 것이고, Layout 자체를 수정하면 그 Layout에 종속된 모든 슬라이드의 기본값이 바뀐다.

---

## SlidesApp 진입점

| 메서드 | 반환 | 설명 |
|---|---|---|
| `create(name: String)` | `Presentation` | 새 프레젠테이션 생성 |
| `openById(id: String)` | `Presentation` | ID로 열기 |
| `openByUrl(url: String)` | `Presentation` | URL로 열기 |
| `getActivePresentation()` | `Presentation \| null` | 컨테이너 바인딩 파일 |
| `getUi()` | `Ui` | 메뉴/다이얼로그/사이드바 |
| `newAffineTransformBuilder()` | `AffineTransformBuilder` | 변환 매트릭스 빌더 |

```javascript
function exampleOpenPresentation() {
  const p1 = SlidesApp.getActivePresentation();
  const p2 = SlidesApp.openById('1AbCd...');
  const p3 = SlidesApp.create('2026-Q2 보드 미팅');
  console.log(p3.getId(), p3.getUrl());
}
```

### 주요 enum

#### PageElementType

| 값 | 설명 |
|---|---|
| `SHAPE` | 도형, 텍스트박스 |
| `IMAGE` | 이미지 |
| `VIDEO` | 동영상 |
| `TABLE` | 표 |
| `GROUP` | 묶음 |
| `LINE` | 선/화살표 |
| `WORD_ART` | 워드아트 |
| `SHEETS_CHART` | Sheets 임베드 차트 |
| `SPEAKER_SPOTLIGHT` | 발표자 스포트라이트 |
| `UNSUPPORTED` | 지원되지 않는 요소 |

#### PageType

| 값 | 의미 |
|---|---|
| `SLIDE` | 일반 슬라이드 |
| `LAYOUT` | 레이아웃 |
| `MASTER` | 마스터 |
| `NOTES` | 발표자 노트 페이지 |
| `NOTES_MASTER` | 노트 마스터 |
| `UNSUPPORTED` | 지원 안 됨 |

#### PlaceholderType

대표 값: `TITLE`, `BODY`, `CENTERED_TITLE`, `SUBTITLE`, `SLIDE_NUMBER`, `DATE_AND_TIME`, `FOOTER`, `HEADER`, `OBJECT`, `MEDIA`, `PICTURE`, `CHART`, `TABLE`, `DIAGRAM`, `SLIDE_IMAGE`, `NONE`.

#### PredefinedLayout

`appendSlide(layout)`에 넘기는 미리 정의된 레이아웃. 대표 값: `BLANK`, `CAPTION_ONLY`, `TITLE`, `TITLE_AND_BODY`, `TITLE_AND_TWO_COLUMNS`, `TITLE_ONLY`, `SECTION_HEADER`, `SECTION_TITLE_AND_DESCRIPTION`, `ONE_COLUMN_TEXT`, `MAIN_POINT`, `BIG_NUMBER`.

#### ShapeType

`insertShape`에 사용. 자주 쓰는 값: `TEXT_BOX`, `RECTANGLE`, `ROUND_RECTANGLE`, `ELLIPSE`, `TRIANGLE`, `RIGHT_TRIANGLE`, `DIAMOND`, `STAR_5`, `ARROW_RIGHT`, `ARROW_DOWN`, `CALLOUT_1`, `CLOUD`, `SMILEY_FACE`. (수십 종 지원)

#### ParagraphAlignment / ContentAlignment

- `ParagraphAlignment`: `START`, `CENTER`, `END`, `JUSTIFIED` (텍스트 좌우)
- `ContentAlignment`: `TOP`, `MIDDLE`, `BOTTOM` (도형 안 텍스트 수직)

#### FillType / DashStyle / LineCategory / LineType

- `FillType`: `NONE`, `SOLID`, `UNSUPPORTED`
- `DashStyle`: `SOLID`, `DOT`, `DASH`, `DASH_DOT`, `LONG_DASH`, `LONG_DASH_DOT`
- `LineCategory`: `STRAIGHT`, `BENT`, `CURVED`
- `LineType`: 수많은 화살표/연결선 타입

#### AlignmentPosition

`alignOnPage`에서 사용: `CENTER`, `HORIZONTAL_CENTER`, `VERTICAL_CENTER`.

#### SlidePosition

`setLinkSlide(slidePosition)`에서 사용: `NEXT_SLIDE`, `PREVIOUS_SLIDE`, `FIRST_SLIDE`, `LAST_SLIDE`.

#### ThemeColorType

마스터 색상 팔레트 슬롯: `DARK1`, `LIGHT1`, `DARK2`, `LIGHT2`, `ACCENT1` ~ `ACCENT6`, `HYPERLINK`, `FOLLOWED_HYPERLINK`, `TEXT1`, `BACKGROUND1`, `TEXT2`, `BACKGROUND2`.

#### SelectionType

`getSelection().getSelectionType()` 반환: `NONE`, `TEXT`, `TABLE_CELL`, `PAGE`, `PAGE_ELEMENT`, `CURRENT_PAGE`.

#### AutofitType

`Shape.getAutofit().getAutofitType()`: `NONE`, `TEXT_AUTOFIT`, `SHAPE_AUTOFIT`.

#### LinkType

`SLIDE`, `URL`, `SLIDE_INDEX`, `SLIDE_ID`, `SLIDE_POSITION`.

#### ListPreset

`TextRange.getListStyle().applyListPreset()`: `DISC_CIRCLE_SQUARE`, `DIAMONDX_ARROW3D_SQUARE`, `CHECKBOX`, `ARROW_DIAMOND_DISC`, `STAR_CIRCLE_SQUARE`, `ARROW3D_CIRCLE_SQUARE`, `LEFTTRIANGLE_DIAMOND_DISC`, `DIGIT_ALPHA_ROMAN`, `DIGIT_ALPHA_ROMAN_PARENS`, `DIGIT_NESTED`, `UPPERALPHA_ALPHA_ROMAN`, `UPPERROMAN_UPPERALPHA_DIGIT`, `ZERODIGIT_ALPHA_ROMAN`.

#### SlideLinkingMode

Slide 간 링크: `LINKED`, `NOT_LINKED`.

---

## 주요 클래스별 정리

### Presentation

프레젠테이션 파일 전체.

| 메서드 | 반환 |
|---|---|
| `getId()` | `String` |
| `getName()` | `String` |
| `setName(name)` | `void` |
| `getUrl()` | `String` |
| `getSlides()` | `Slide[]` |
| `getSlideById(id)` | `Slide \| null` |
| `appendSlide()` | `Slide` |
| `appendSlide(layout: Layout)` | `Slide` |
| `appendSlide(predefinedLayout: PredefinedLayout)` | `Slide` |
| `appendSlide(slide: Slide)` | `Slide` |
| `appendSlide(slide, linkingMode)` | `Slide` |
| `insertSlide(insertionIndex)` | `Slide` |
| `insertSlide(insertionIndex, layout)` | `Slide` |
| `insertSlide(insertionIndex, predefinedLayout)` | `Slide` |
| `insertSlide(insertionIndex, slide)` | `Slide` |
| `insertSlide(insertionIndex, slide, linkingMode)` | `Slide` |
| `getLayouts()` | `Layout[]` |
| `getMasters()` | `Master[]` |
| `getNotesMaster()` | `NotesMaster` |
| `getPageHeight()` | `Number` (포인트) |
| `getPageWidth()` | `Number` |
| `getNotesPageHeight()` | `Number` |
| `getNotesPageWidth()` | `Number` |
| `getPageElementById(id)` | `PageElement \| null` |
| `getSelection()` | `Selection \| null` |
| `replaceAllText(findText, replaceText)` | `Integer` (치환 수) |
| `replaceAllText(findText, replaceText, matchCase)` | `Integer` |
| `addEditor(emailAddress)` / `addEditors(emails)` | `Presentation` |
| `addViewer(emailAddress)` / `addViewers(emails)` | `Presentation` |
| `removeEditor` / `removeViewer` | `Presentation` |
| `getEditors()` / `getViewers()` | `User[]` |
| `saveAndClose()` | `void` |

```javascript
function exampleBasics() {
  const p = SlidesApp.getActivePresentation();
  console.log('슬라이드 수:', p.getSlides().length);
  console.log('페이지 크기:', p.getPageWidth(), 'x', p.getPageHeight(), 'pt');

  // 전체 치환
  const count = p.replaceAllText('{{quarter}}', 'Q2 2026');
  console.log(count, '개 치환');
}
```

---

### Slide

한 장의 슬라이드. `Page`를 상속한다.

| 메서드 | 반환 |
|---|---|
| `duplicate()` | `Slide` |
| `move(index)` | `void` |
| `remove()` | `void` |
| `getObjectId()` | `String` |
| `getPageType()` | `PageType` |
| `getLayout()` | `Layout \| null` |
| `getBackground()` | `PageBackground` |
| `getNotesPage()` | `NotesPage` |
| `getSlideLinkingMode()` | `SlideLinkingMode` |
| `getPageElements()` | `PageElement[]` |
| `getShapes()` | `Shape[]` |
| `getImages()` | `Image[]` |
| `getTables()` | `Table[]` |
| `getGroups()` | `Group[]` |
| `getLines()` | `Line[]` |
| `getVideos()` | `Video[]` |
| `getPlaceholders()` | `PageElement[]` |
| `getPlaceholder(placeholderType)` | `PageElement \| null` |
| `getPlaceholder(placeholderType, placeholderIndex)` | `PageElement \| null` |
| `insertShape(shapeType)` | `Shape` |
| `insertShape(shapeType, left, top, width, height)` | `Shape` |
| `insertTextBox(text)` | `Shape` |
| `insertTextBox(text, left, top, width, height)` | `Shape` |
| `insertImage(blobSource)` | `Image` |
| `insertImage(imageUrl)` | `Image` |
| `insertImage(blobSource, left, top, width, height)` | `Image` |
| `insertImage(imageUrl, left, top, width, height)` | `Image` |
| `insertTable(numRows, numColumns)` | `Table` |
| `insertTable(numRows, numColumns, left, top, width, height)` | `Table` |
| `insertVideo(videoUrl)` | `Video` |
| `insertVideo(videoUrl, left, top, width, height)` | `Video` |
| `replaceAllText(findText, replaceText)` | `Integer` |
| `replaceAllText(findText, replaceText, matchCase)` | `Integer` |

> **단위**: `left`, `top`, `width`, `height`는 모두 **포인트(pt)**. 1pt = 1/72 inch. 표준 16:9 슬라이드는 960 x 540pt.

```javascript
function exampleAddSlide() {
  const p = SlidesApp.getActivePresentation();
  const slide = p.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);

  const title = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
  if (title) title.asShape().getText().setText('2026 Q2 매출 현황');

  const body = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
  if (body) body.asShape().getText().setText(
    '• 매출 1.2억 (+12%)\n• 신규 고객 134명\n• 이탈률 2.3%'
  );
}
```

---

### PageElement (추상)

페이지 위의 모든 시각 객체.

#### 다운캐스트 메서드

| 메서드 | 반환 |
|---|---|
| `asShape()` | `Shape` |
| `asImage()` | `Image` |
| `asTable()` | `Table` |
| `asGroup()` | `Group` |
| `asLine()` | `Line` |
| `asVideo()` | `Video` |
| `asWordArt()` | `WordArt` |
| `asSheetsChart()` | `SheetsChart` |
| `asSpeakerSpotlight()` | `SpeakerSpotlight` |

#### 공통 메서드

| 메서드 | 반환 |
|---|---|
| `getPageElementType()` | `PageElementType` |
| `getObjectId()` | `String` |
| `getTitle()` / `setTitle(title)` | `String` / `PageElement` |
| `getDescription()` / `setDescription(desc)` | `String` / `PageElement` |
| `getHeight()` / `setHeight(h)` | `Number` / `PageElement` |
| `getWidth()` / `setWidth(w)` | `Number` / `PageElement` |
| `getLeft()` / `setLeft(l)` | `Number` / `PageElement` |
| `getTop()` / `setTop(t)` | `Number` / `PageElement` |
| `getRotation()` / `setRotation(deg)` | `Number` / `PageElement` |
| `getTransform()` / `setTransform(affineTransform)` | `AffineTransform` / `PageElement` |
| `preconcatenateTransform(affineTransform)` | `PageElement` |
| `scaleHeight(ratio)` / `scaleWidth(ratio)` | `PageElement` |
| `alignOnPage(alignmentPosition)` | `PageElement` |
| `duplicate()` | `PageElement` |
| `remove()` | `void` |
| `select()` / `select(replace)` | `void` |
| `bringForward()` / `bringToFront()` | `PageElement` |
| `sendBackward()` / `sendToBack()` | `PageElement` |
| `getParentGroup()` | `Group \| null` |
| `getParentPage()` | `Page` |
| `getConnectionSites()` | `ConnectionSite[]` |
| `getInherentHeight()` / `getInherentWidth()` | `Number \| null` |

```javascript
function listPageElements() {
  const slide = SlidesApp.getActivePresentation().getSlides()[0];
  const PET = SlidesApp.PageElementType;
  slide.getPageElements().forEach((el, i) => {
    const type = el.getPageElementType();
    const w = el.getWidth(), h = el.getHeight();
    console.log(`#${i}: ${type} at (${el.getLeft()}, ${el.getTop()}) ${w}x${h}`);
    if (type === PET.SHAPE) console.log('  shape text:', el.asShape().getText().asString());
  });
}
```

---

### Shape

도형과 텍스트박스 모두 Shape다. 텍스트박스는 `ShapeType.TEXT_BOX`.

| 메서드 | 반환 |
|---|---|
| `getShapeType()` | `ShapeType` |
| `getText()` | `TextRange` |
| `getFill()` | `Fill` |
| `getBorder()` | `Border` |
| `getPlaceholderType()` | `PlaceholderType` |
| `getPlaceholderIndex()` | `Integer \| null` |
| `getParentPlaceholder()` | `PageElement \| null` |
| `getContentAlignment()` | `ContentAlignment` |
| `setContentAlignment(contentAlignment)` | `Shape` |
| `getAutofit()` | `Autofit \| null` |
| `replaceWithImage(blobSource)` | `Image` |
| `replaceWithImage(blobSource, crop)` | `Image` |
| `replaceWithImage(imageUrl)` | `Image` |
| `replaceWithImage(imageUrl, crop)` | `Image` |
| `replaceWithSheetsChart(sourceChart)` | `SheetsChart` |
| `replaceWithSheetsChartAsImage(sourceChart)` | `Image` |
| `setLinkUrl(url)` | `Link` |
| `setLinkSlide(slide)` | `Link` |
| `setLinkSlide(slideIndex)` | `Link` |
| `setLinkSlide(slidePosition)` | `Link` |
| `getLink()` | `Link \| null` |
| `removeLink()` | `void` |
| (PageElement 공통 메서드 모두 포함) | |

```javascript
function exampleShape() {
  const slide = SlidesApp.getActivePresentation().getSlides()[0];

  // 텍스트박스
  const tb = slide.insertTextBox('안녕하세요', 50, 50, 300, 60);
  tb.getText().getTextStyle().setFontSize(28).setBold(true).setForegroundColor('#1a73e8');

  // 도형
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 400, 100, 200, 200);
  ellipse.getFill().setSolidFill('#34a853');
  ellipse.getBorder().setWeight(2).getLineFill().setSolidFill('#0b8043');
  ellipse.getText().setText('중심').getTextStyle().setForegroundColor('#ffffff').setFontSize(24);
  ellipse.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}
```

#### TextRange (Shape 안의 텍스트)

| 메서드 | 반환 |
|---|---|
| `asString()` / `getRange()` | `String` / `TextRange` |
| `setText(text)` | `TextRange` |
| `appendText(text)` | `TextRange` |
| `insertText(startOffset, text)` | `TextRange` |
| `clear()` / `clear(startOffset, endOffset)` | `TextRange` |
| `getTextStyle()` | `TextStyle` |
| `getParagraphStyle()` | `ParagraphStyle` |
| `getListStyle()` | `ListStyle` |
| `getParagraphs()` | `Paragraph[]` |
| `getRuns()` | `TextRange[]` |
| `getLinks()` | `TextRange[]` |
| `find(pattern)` / `find(pattern, startOffset)` | `TextRange[]` |
| `replaceAllText(findText, replaceText)` | `Integer` |

TextStyle은 `setFontFamily`, `setFontSize`, `setBold`, `setItalic`, `setUnderline`, `setStrikethrough`, `setForegroundColor`, `setBackgroundColor`, `setLinkUrl` 등을 제공.

---

### Image

| 메서드 | 반환 |
|---|---|
| `getSourceUrl()` | `String \| null` |
| `getContentUrl()` | `String` (단기 만료 fetch URL) |
| `getAs(contentType)` / `getBlob()` | `Blob` |
| `replace(blobSource)` / `replace(imageUrl)` | `Image` |
| `replace(blobSource, crop)` / `replace(imageUrl, crop)` | `Image` |
| `setLinkUrl(url)` / `setLinkSlide(...)` | `Link` |
| (PageElement 공통 포함) | |

---

### Table / TableCell

| Table 메서드 | 반환 |
|---|---|
| `getNumRows()` / `getNumColumns()` | `Integer` |
| `getCell(rowIndex, columnIndex)` | `TableCell` |
| `getRow(rowIndex)` | `TableRow` |
| `getColumn(columnIndex)` | `TableColumn` |
| `appendRow()` / `insertRow(index)` | `TableRow` |
| `appendColumn()` / `insertColumn(index)` | `TableColumn` |

`TableCell.getText()`은 `TextRange`를 반환.

```javascript
function fillTable() {
  const slide = SlidesApp.getActivePresentation().getSlides()[0];
  const t = slide.insertTable(3, 3, 50, 200, 600, 200);
  const data = [
    ['지표', 'Q1', 'Q2'],
    ['매출', '1.0억', '1.2억'],
    ['MAU', '50만', '52만'],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      t.getCell(r, c).getText().setText(data[r][c]);
    }
  }
}
```

---

### Group

여러 PageElement를 묶은 집합.

| 메서드 | 반환 |
|---|---|
| `getChildren()` | `PageElement[]` |
| `ungroup()` | `void` |
| (PageElement 공통 포함) | |

Group 자체를 옮기면 자식이 함께 움직인다.

---

### Layout / Master

`Slide`와 동일한 `Page` API(`getPageElements`, `replaceAllText`, `getBackground` 등)를 갖되, 사용자가 직접 슬라이드로 사용하지는 않는다.

| Layout 메서드 | 반환 |
|---|---|
| `getMaster()` | `Master` |
| `getLayoutName()` | `String` |
| `getDisplayName()` | `String` |
| `getObjectId()` | `String` |
| `getPageElements()` 등 Page 공통 메서드 | |

| Master 메서드 | 반환 |
|---|---|
| `getLayouts()` | `Layout[]` |
| `getObjectId()` | `String` |
| `getPageElements()` 등 Page 공통 메서드 | |

```javascript
function listLayouts() {
  const p = SlidesApp.getActivePresentation();
  p.getLayouts().forEach(layout => {
    console.log(layout.getLayoutName(), '/', layout.getDisplayName());
  });
}
```

`appendSlide(layout)`에 `Layout` 인스턴스를 직접 전달하면 해당 디자인을 정확히 상속한 새 슬라이드가 만들어진다.

---

### NotesPage

각 Slide의 발표자 노트.

| 메서드 | 반환 |
|---|---|
| `getSpeakerNotesShape()` | `Shape` |
| `getPageElements()` | `PageElement[]` |

```javascript
function setSpeakerNotes() {
  const slide = SlidesApp.getActivePresentation().getSlides()[0];
  const notesShape = slide.getNotesPage().getSpeakerNotesShape();
  notesShape.getText().setText('이 슬라이드에서는 매출 증가 배경을 설명한다.');
}
```

---

## 자주 쓰는 패턴

### 1. 템플릿 자동화 — placeholder 텍스트 채우기

가장 안정적인 방법은 `{{...}}` 패턴 + `replaceAllText`. placeholder 객체 직접 조작도 가능하지만, 텍스트 패턴 치환이 더 견고하다.

```javascript
function generateFromTemplate(templateId, data, outputName) {
  const copy = DriveApp.getFileById(templateId).makeCopy(outputName);
  const pres = SlidesApp.openById(copy.getId());

  Object.entries(data).forEach(([key, value]) => {
    pres.replaceAllText(`{{${key}}}`, String(value));
  });

  pres.saveAndClose();
  return pres.getUrl();
}

// 호출 예시
generateFromTemplate(
  '1AbCd...',
  { quarter: 'Q2 2026', revenue: '1.2억', team: '플랫폼팀' },
  '2026Q2_플랫폼팀_보고서'
);
```

### 2. placeholder를 type으로 직접 채우기

```javascript
function fillByPlaceholderType(slide, titleText, bodyText) {
  const PH = SlidesApp.PlaceholderType;
  const title = slide.getPlaceholder(PH.TITLE) || slide.getPlaceholder(PH.CENTERED_TITLE);
  if (title) title.asShape().getText().setText(titleText);

  const body = slide.getPlaceholder(PH.BODY);
  if (body) body.asShape().getText().setText(bodyText);
}
```

같은 placeholder 타입이 여러 개일 땐 `getPlaceholder(type, placeholderIndex)`로 구분.

### 3. 슬라이드 복제로 시리즈 생성

각 항목에 대해 슬라이드 한 장씩 만들 때 효과적.

```javascript
function createSeries(rows) {
  const pres = SlidesApp.getActivePresentation();
  const template = pres.getSlides()[0]; // 첫 장이 템플릿

  rows.forEach((row, i) => {
    const slide = template.duplicate();
    slide.move(pres.getSlides().length); // 맨 뒤로
    slide.replaceAllText('{{name}}',  row.name);
    slide.replaceAllText('{{score}}', String(row.score));
    slide.replaceAllText('{{rank}}',  String(i + 1));
  });
}
```

### 4. Sheets 차트 임베드

```javascript
function embedChart() {
  const ss = SpreadsheetApp.openById('SHEET_ID');
  const sheet = ss.getSheets()[0];
  const chart = sheet.getCharts()[0];

  const slide = SlidesApp.getActivePresentation().getSlides()[0];
  const embed = slide.insertSheetsChart(chart);
  embed.setLeft(50).setTop(100).setWidth(600).setHeight(360);

  // 나중에 데이터가 바뀌면
  embed.refresh();
}
```

### 5. 이미지 삽입 (URL 또는 Blob)

```javascript
function insertImageVariants() {
  const slide = SlidesApp.getActivePresentation().getSlides()[0];

  // a) URL로
  slide.insertImage('https://example.com/logo.png', 30, 30, 100, 100);

  // b) Blob으로
  const blob = UrlFetchApp.fetch('https://example.com/chart.png').getBlob();
  slide.insertImage(blob, 200, 30, 400, 240);

  // c) Drive 파일
  const driveBlob = DriveApp.getFileById('FILE_ID').getBlob();
  slide.insertImage(driveBlob);
}
```

> 이미지 URL은 외부에서 공개 접근 가능해야 한다. URL을 직접 넘기는 경우 크기 제한(50MB 미만, 25MP 이하)이 있다.

### 6. 도형 + 텍스트로 다이어그램 그리기

```javascript
function drawFunnel() {
  const slide = SlidesApp.getActivePresentation().appendSlide(
    SlidesApp.PredefinedLayout.BLANK
  );
  const steps = ['방문', '가입', '구매', '재구매'];
  const colors = ['#4285f4', '#34a853', '#fbbc04', '#ea4335'];
  steps.forEach((label, i) => {
    const s = slide.insertShape(
      SlidesApp.ShapeType.ROUND_RECTANGLE,
      100 + i * 200, 200, 180, 80
    );
    s.getFill().setSolidFill(colors[i]);
    s.getBorder().setTransparent();
    s.getText().setText(label)
     .getTextStyle().setForegroundColor('#ffffff').setBold(true).setFontSize(18);
    s.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
}
```

### 7. 슬라이드 정렬·삭제·순서 변경

```javascript
function reorderSlides() {
  const pres = SlidesApp.getActivePresentation();
  const slides = pres.getSlides();
  // 마지막 슬라이드를 두번째 위치로
  slides[slides.length - 1].move(1);
  // 첫 슬라이드 삭제
  slides[0].remove();
}
```

### 8. 발표자 노트 일괄 설정

```javascript
function setNotesForAll(notesList) {
  const slides = SlidesApp.getActivePresentation().getSlides();
  slides.forEach((slide, i) => {
    if (notesList[i] != null) {
      slide.getNotesPage().getSpeakerNotesShape().getText().setText(notesList[i]);
    }
  });
}
```

### 9. PDF로 export

```javascript
function exportPdf() {
  const pres = SlidesApp.getActivePresentation();
  pres.saveAndClose();
  const pdf = DriveApp.getFileById(pres.getId()).getAs('application/pdf');
  DriveApp.createFile(pdf).setName(pres.getName() + '.pdf');
}
```

### 10. 본문 텍스트만 검색

```javascript
function searchByElementType() {
  const PET = SlidesApp.PageElementType;
  const pres = SlidesApp.getActivePresentation();
  const found = [];
  pres.getSlides().forEach((slide, idx) => {
    slide.getPageElements().forEach(el => {
      if (el.getPageElementType() === PET.SHAPE) {
        const text = el.asShape().getText().asString();
        if (text.includes('TODO')) found.push({ slide: idx, text });
      }
    });
  });
  return found;
}
```

---

## 주의사항 / 함정

- **단위는 포인트(pt)**: `getWidth/Height/Left/Top`은 모두 포인트. 표준 16:9 슬라이드 = 960 x 540pt, 4:3 = 720 x 540pt. `getPageWidth/Height`로 확인 가능.
- **`getActivePresentation()`은 null 가능**: 컨테이너 바인딩이 아닌 standalone 스크립트에서는 항상 `null`. `openById`/`openByUrl`을 써야 한다.
- **`replaceAllText`는 `Presentation`, `Slide`, `Layout`, `Master`, `NotesMaster`에 모두 존재**: 호출 대상에 따라 적용 범위가 다르다. `Presentation.replaceAllText`는 전체. `Slide.replaceAllText`는 그 슬라이드만. 마스터/레이아웃의 placeholder 자리는 슬라이드 단위 치환이 적용되지 않으니 주의.
- **Layout/Master placeholder 직접 수정 위험**: Layout이나 Master의 텍스트를 수정하면 그 디자인에 종속된 모든 슬라이드에 반영된다. 의도하지 않은 변경 가능.
- **PlaceholderType이 None일 수 있음**: `Shape.getPlaceholderType()`이 `NONE`이면 일반 도형/텍스트박스. placeholder만 찾으려면 `slide.getPlaceholders()` 또는 type 필터링.
- **`insertImage(url)` 권한 만료**: Slides는 URL의 이미지를 가져와 내부 저장한다. 임시 서명 URL은 만료 전에 처리되지만 안정적으로는 Blob을 권장.
- **빈 placeholder 채우기**: 새 슬라이드의 placeholder는 `null`이 아닌 빈 Shape다. `getPlaceholder(...).asShape().getText().setText(...)` 호출이 안전.
- **`getText().setText`의 부작용**: 기존 서식·리스트 스타일이 초기화될 수 있다. 서식을 유지하려면 `insertText/clear` 조합.
- **6분 실행 한도**: 슬라이드 100장 이상 대량 생성 시 시간 초과. `PropertiesService`에 진행 위치를 저장하고 트리거로 분할 실행.
- **순회 중 수정 금지**: `getSlides()` 또는 `getPageElements()` 순회 중에 요소를 추가/삭제하면 인덱스가 어긋난다. 결과를 배열로 받고 처리.
- **`appendSlide()` 인자에 `Slide` 전달 시 복제**: 다른 프레젠테이션의 Slide를 전달하면 복제된다. `linkingMode = LINKED`로 원본 변경에 연동 가능.
- **`SheetsChart`는 별도 새로고침 필요**: 차트 임베드 후 Sheets의 데이터가 바뀌면 자동 갱신되지 않고 `embed.refresh()` 호출이 필요.
- **NotesMaster는 1개만**: `getNotesMaster()`는 단일 객체.
- **Slide의 `getObjectId()`와 페이지 ID는 다름**: object ID는 슬라이드 내부 식별자. URL의 슬라이드 ID(예: `#slide=id.gXX`)와 매핑된다.
- **링크 권한**: `Presentations.currentonly` 스코프로는 다른 프레젠테이션을 못 연다. cross-file 작업이면 `presentations` 스코프 필요.
- **이미지 회전/transform 주의**: `setRotation`은 도(degree). `getTransform`이 반환하는 AffineTransform과 `setLeft/Top` 좌표는 서로 영향을 줄 수 있다. 한 번에 하나의 방법만 사용 권장.
- **Border 투명 처리**: `getBorder().setTransparent()`로 테두리 제거. `null` 색상이 아니다.
- **`Selection`은 활성 사용자 기준**: `getSelection()`은 컨테이너 바인딩 + 사용자가 실제로 슬라이드 편집기를 열고 있는 경우에만 의미가 있다.

---

## 참고

- SlidesApp 레퍼런스: https://developers.google.com/apps-script/reference/slides/slides-app
- Presentation: https://developers.google.com/apps-script/reference/slides/presentation
- Slide: https://developers.google.com/apps-script/reference/slides/slide
- PageElement: https://developers.google.com/apps-script/reference/slides/page-element
- Shape: https://developers.google.com/apps-script/reference/slides/shape
- TextRange: https://developers.google.com/apps-script/reference/slides/text-range
- Image: https://developers.google.com/apps-script/reference/slides/image
- Table: https://developers.google.com/apps-script/reference/slides/table
- Layout: https://developers.google.com/apps-script/reference/slides/layout
- Master: https://developers.google.com/apps-script/reference/slides/master
- NotesPage: https://developers.google.com/apps-script/reference/slides/notes-page
- Group: https://developers.google.com/apps-script/reference/slides/group
- Slides 자동화 가이드: https://developers.google.com/apps-script/guides/slides
