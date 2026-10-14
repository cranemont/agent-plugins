# Google Apps Script — Forms 서비스

> **출처**
> - https://developers.google.com/apps-script/reference/forms
> - https://developers.google.com/apps-script/reference/forms/form-app
> - https://developers.google.com/apps-script/reference/forms/form
> - https://developers.google.com/apps-script/reference/forms/item
> - https://developers.google.com/apps-script/reference/forms/form-response
>
> **최종 확인일**: 2026-07-22

## 개요

Forms 서비스(`FormApp`)는 Google Forms를 생성·편집하고 응답 데이터를 조회·채점할 수 있는 내장 서비스다.

적합한 활용처:

- 설문/퀴즈 자동 생성 (대량 동일 양식 배포)
- 응답을 Sheets로 자동 연결
- 응답 받을 때마다 트리거로 알림·후속처리 (`onFormSubmit`)
- 퀴즈 채점 자동화 (`isQuiz()`, points, feedback)
- prefill URL 생성 (응답 일부를 미리 채워 링크 공유)
- 폐쇄/공개 토글, 응답 제한, 응답자 권한 제어

부적합한 경우:

- 복잡한 분기/조건 로직 (PageBreakItem로 일부 가능하나 제한적)
- 외부 시스템과 실시간 연동이 필수인 경우 — `onFormSubmit` 트리거는 약간의 지연이 있다
- 매우 많은 항목(수백 개) 생성: 6분 한도

**권한 스코프**:
- `https://www.googleapis.com/auth/forms` — 임의 폼 접근
- `https://www.googleapis.com/auth/forms.currentonly` — 컨테이너 바인딩 현재 폼만

## 클래스 계층

```
FormApp (진입점)
└── Form
    ├── Item (추상)
    │   ├── TextItem
    │   ├── ParagraphTextItem
    │   ├── MultipleChoiceItem  ─ Choice[]
    │   ├── CheckboxItem        ─ Choice[]
    │   ├── ListItem            ─ Choice[]   (드롭다운)
    │   ├── ScaleItem
    │   ├── RatingItem
    │   ├── GridItem            ─ rows[], columns[]
    │   ├── CheckboxGridItem    ─ rows[], columns[]
    │   ├── DateItem
    │   ├── TimeItem
    │   ├── DateTimeItem
    │   ├── DurationItem
    │   ├── ImageItem
    │   ├── VideoItem
    │   ├── FileUploadItem
    │   ├── PageBreakItem (페이지 분기)
    │   └── SectionHeaderItem
    ├── Validation Builders
    │   ├── TextValidationBuilder         → TextValidation
    │   ├── ParagraphTextValidationBuilder → ParagraphTextValidation
    │   ├── CheckboxValidationBuilder
    │   ├── CheckboxGridValidationBuilder
    │   └── GridValidationBuilder
    └── QuizFeedbackBuilder → QuizFeedback

FormResponse
└── ItemResponse[]
```

## FormApp 진입점

| 메서드 | 반환 | 설명 |
|---|---|---|
| `create(title)` | `Form` | 새 폼 생성 |
| `create(title, isPublished)` | `Form` | 새 폼을 게시 상태 지정해서 생성 |
| `openById(id)` | `Form` | ID로 열기 |
| `openByUrl(url)` | `Form` | URL로 열기 (edit URL 권장) |
| `getActiveForm()` | `Form \| null` | 컨테이너 바인딩 폼 |
| `getUi()` | `Ui` | 폼 편집기 UI |
| `createTextValidation()` | `TextValidationBuilder` | 텍스트 검증 빌더 |
| `createParagraphTextValidation()` | `ParagraphTextValidationBuilder` | 단락 텍스트 검증 |
| `createCheckboxValidation()` | `CheckboxValidationBuilder` | 체크박스 검증 |
| `createCheckboxGridValidation()` | `CheckboxGridValidationBuilder` | 체크박스 그리드 검증 |
| `createGridValidation()` | `GridValidationBuilder` | 그리드 검증 |
| `createFeedback()` | `QuizFeedbackBuilder` | 퀴즈 정·오답 피드백 빌더 |

```javascript
function exampleOpen() {
  const f1 = FormApp.getActiveForm();
  const f2 = FormApp.openById('1AbCd...');
  const f3 = FormApp.openByUrl('https://docs.google.com/forms/d/.../edit');
  const f4 = FormApp.create('2026 Q2 만족도 조사');
  console.log(f4.getId(), f4.getEditUrl(), f4.getPublishedUrl());
}
```

> `openByUrl`은 보통 **edit URL**을 받는다. 응답자용 URL(`viewform`)로는 열 수 없을 수 있다.

### 주요 enum

#### ItemType

| 값 | 클래스 |
|---|---|
| `TEXT` | `TextItem` (짧은 답변) |
| `PARAGRAPH_TEXT` | `ParagraphTextItem` (긴 답변) |
| `MULTIPLE_CHOICE` | `MultipleChoiceItem` (라디오) |
| `CHECKBOX` | `CheckboxItem` (다중 선택) |
| `LIST` | `ListItem` (드롭다운) |
| `SCALE` | `ScaleItem` (1-5 등 척도) |
| `RATING` | `RatingItem` (별점 등 평가) |
| `GRID` | `GridItem` (행x열 단일선택 그리드) |
| `CHECKBOX_GRID` | `CheckboxGridItem` (행x열 다중선택 그리드) |
| `DATE` | `DateItem` |
| `TIME` | `TimeItem` |
| `DATETIME` | `DateTimeItem` |
| `DURATION` | `DurationItem` |
| `IMAGE` | `ImageItem` (정보 표시용 이미지) |
| `VIDEO` | `VideoItem` (정보 표시용 비디오) |
| `FILE_UPLOAD` | `FileUploadItem` (응답자가 파일 첨부) |
| `PAGE_BREAK` | `PageBreakItem` (페이지 구분) |
| `SECTION_HEADER` | `SectionHeaderItem` (섹션 제목) |
| `UNSUPPORTED` | (API로 다룰 수 없는 항목) |

> `FILE_UPLOAD`는 폼을 **Drive 계정**에 묶어야 하며, 응답자는 Google 계정 로그인 필요.

#### DestinationType

| 값 | 의미 |
|---|---|
| `SPREADSHEET` | 응답을 Sheets로 연결 (유일한 값) |

#### Alignment

`ImageItem.setAlignment()`에서 사용: `LEFT`, `CENTER`, `RIGHT`.

#### FeedbackType

`QuizFeedback`의 종류: `CORRECT`, `INCORRECT`, `GENERAL`.

#### PageNavigationType

`PageBreakItem.setGoToPage()` 또는 `MultipleChoiceItem` choice의 `setPageNavigationType()`에 사용: `CONTINUE`, `GO_TO_PAGE`, `RESTART`, `SUBMIT`.

---

## 주요 클래스별 정리

### Form

| 메서드 | 반환 |
|---|---|
| `getId()` | `String` |
| `getTitle()` / `setTitle(title)` | `String` / `Form` |
| `getDescription()` / `setDescription(desc)` | `String` / `Form` |
| `getEditUrl()` | `String` |
| `getPublishedUrl()` | `String` |
| `getSummaryUrl()` | `String` |
| `shortenFormUrl(url)` | `String` |

#### Item 추가

| 메서드 | 반환 |
|---|---|
| `addTextItem()` | `TextItem` |
| `addParagraphTextItem()` | `ParagraphTextItem` |
| `addMultipleChoiceItem()` | `MultipleChoiceItem` |
| `addCheckboxItem()` | `CheckboxItem` |
| `addListItem()` | `ListItem` |
| `addScaleItem()` | `ScaleItem` |
| `addRatingItem()` | `RatingItem` |
| `addGridItem()` | `GridItem` |
| `addCheckboxGridItem()` | `CheckboxGridItem` |
| `addDateItem()` | `DateItem` |
| `addTimeItem()` | `TimeItem` |
| `addDateTimeItem()` | `DateTimeItem` |
| `addDurationItem()` | `DurationItem` |
| `addImageItem()` | `ImageItem` |
| `addVideoItem()` | `VideoItem` |
| `addPageBreakItem()` | `PageBreakItem` |
| `addSectionHeaderItem()` | `SectionHeaderItem` |

> `addFileUploadItem()`은 공식 `Form` 레퍼런스에 없다(파일 업로드 항목은 API로 새로 만들 수 없음). 마찬가지로 `Item`에는 `asFileUploadItem()`도 없다. UI에서 만든 파일 업로드 항목은 `form.getItems(FormApp.ItemType.FILE_UPLOAD)`로 조회해 다룬다.

#### Item 관리

| 메서드 | 반환 |
|---|---|
| `getItems()` | `Item[]` |
| `getItems(itemType)` | `Item[]` |
| `getItemById(id)` | `Item \| null` |
| `deleteItem(index)` | `void` |
| `deleteItem(item)` | `void` |
| `moveItem(from, to)` | `Item` |
| `moveItem(item, toIndex)` | `Item` |

#### 응답 설정

| 메서드 | 반환 |
|---|---|
| `isAcceptingResponses()` / `setAcceptingResponses(enabled)` | `Boolean` / `Form` |
| `getConfirmationMessage()` / `setConfirmationMessage(message)` | `String` / `Form` |
| `setIsQuiz(enabled)` / `isQuiz()` | `Form` / `Boolean` |
| `collectsEmail()` / `setCollectEmail(collect)` | `Boolean` / `Form` |
| `hasLimitOneResponsePerUser()` / `setLimitOneResponsePerUser(enabled)` | `Boolean` / `Form` |
| `canEditResponse()` / `setAllowResponseEdits(enabled)` | `Boolean` / `Form` |
| `hasProgressBar()` / `setProgressBar(enabled)` | `Boolean` / `Form` |
| `getShuffleQuestions()` / `setShuffleQuestions(shuffle)` | `Boolean` / `Form` |
| `hasRespondAgainLink()` / `setShowLinkToRespondAgain(enabled)` | `Boolean` / `Form` |
| `requiresLogin()` / `setRequireLogin(requireLogin)` | `Boolean` / `Form` (deprecated) |
| `isPublished()` / `setPublished(enabled)` | `Boolean` / `Form` |
| `isPublishingSummary()` / `setPublishingSummary(enabled)` | `Boolean` / `Form` |

#### 응답 관리

| 메서드 | 반환 |
|---|---|
| `getResponses()` | `FormResponse[]` |
| `getResponses(timestamp: Date)` | `FormResponse[]` (timestamp 이후) |
| `getResponse(responseId)` | `FormResponse` |
| `createResponse()` | `FormResponse` (서버 측 제출용 빈 응답) |
| `deleteAllResponses()` | `Form` |
| `deleteResponse(responseId)` | `Form` |
| `submitGrades(responses)` | `Form` |

#### Destination (Sheets 연결)

| 메서드 | 반환 |
|---|---|
| `setDestination(type, id)` | `Form` |
| `removeDestination()` | `Form` |
| `getDestinationId()` | `String` |
| `getDestinationType()` | `DestinationType` |

#### 권한

| 메서드 | 반환 |
|---|---|
| `addEditor(email)` / `addEditor(user)` / `addEditors(emails)` | `Form` |
| `removeEditor(...)` | `Form` |
| `getEditors()` | `User[]` |
| `addPublishedReader(email)` / `addPublishedReader(user)` / `addPublishedReaders(emails)` | `Form` |
| `removePublishedReader(...)` | `Form` |
| `getPublishedReaders()` | `User[]` |
| `supportsAdvancedResponderPermissions()` | `Boolean` |

---

### Item (베이스)

모든 Item이 공유하는 메서드.

| 메서드 | 반환 |
|---|---|
| `getType()` | `ItemType` |
| `getTitle()` / `setTitle(title)` | `String` / `Item` |
| `getHelpText()` / `setHelpText(text)` | `String` / `Item` |
| `getId()` | `Integer` |
| `getIndex()` | `Integer` |
| `duplicate()` | `Item` |
| `asTextItem()` | `TextItem` |
| `asParagraphTextItem()` | `ParagraphTextItem` |
| `asMultipleChoiceItem()` | `MultipleChoiceItem` |
| `asCheckboxItem()` | `CheckboxItem` |
| `asListItem()` | `ListItem` |
| `asScaleItem()` | `ScaleItem` |
| `asRatingItem()` | `RatingItem` |
| `asGridItem()` | `GridItem` |
| `asCheckboxGridItem()` | `CheckboxGridItem` |
| `asDateItem()` | `DateItem` |
| `asTimeItem()` | `TimeItem` |
| `asDateTimeItem()` | `DateTimeItem` |
| `asDurationItem()` | `DurationItem` |
| `asImageItem()` | `ImageItem` |
| `asVideoItem()` | `VideoItem` |
| `asPageBreakItem()` | `PageBreakItem` |
| `asSectionHeaderItem()` | `SectionHeaderItem` |

다운캐스트는 타입이 맞지 않으면 예외를 던진다. `getType()`로 먼저 확인.

---

### 각 Item 타입의 핵심 추가 메서드

**TextItem / ParagraphTextItem**

| 메서드 | 반환 |
|---|---|
| `setRequired(enabled)` | `Item` |
| `isRequired()` | `Boolean` |
| `setValidation(validation)` | `Item` |
| `createResponse(response: String)` | `ItemResponse` |
| `getPoints()` / `setPoints(points)` (퀴즈) | `Integer` / `Item` |
| `getGeneralFeedback()` / `setGeneralFeedback(feedback)` | `QuizFeedback \| null` / `Item` |
| `getFeedbackForCorrect()` / `setFeedbackForCorrect(feedback)` | `QuizFeedback` / `Item` |
| `getFeedbackForIncorrect()` / `setFeedbackForIncorrect(feedback)` | `QuizFeedback` / `Item` |

**MultipleChoiceItem / CheckboxItem / ListItem**

| 메서드 | 반환 |
|---|---|
| `setChoiceValues(values: String[])` | `Item` |
| `setChoices(choices: Choice[])` | `Item` |
| `createChoice(value)` | `Choice` |
| `createChoice(value, isCorrect)` | `Choice` (퀴즈) |
| `createChoice(value, navigationItem)` | `Choice` (MultipleChoice 전용) |
| `createChoice(value, navigationType)` | `Choice` |
| `getChoices()` | `Choice[]` |
| `showOtherOption(enabled)` (MC, Checkbox) | `Item` |
| `hasOtherOption()` | `Boolean` |
| `setRequired(enabled)` / `isRequired()` | `Item` / `Boolean` |
| `setPoints(points)` / `getPoints()` | `Item` / `Integer` |
| `setFeedbackForCorrect(feedback)` / `setFeedbackForIncorrect(feedback)` / `setGeneralFeedback(feedback)` | `Item` |
| `createResponse(response)` | `ItemResponse` |

**ScaleItem**

| 메서드 | 반환 |
|---|---|
| `setBounds(lower: Integer, upper: Integer)` | `ScaleItem` |
| `getLowerBound()` / `getUpperBound()` | `Integer` |
| `setLabels(lowerLabel: String, upperLabel: String)` | `ScaleItem` |
| `getLeftLabel()` / `getRightLabel()` | `String` |
| `setRequired(enabled)` / `isRequired()` | `ScaleItem` / `Boolean` |
| `setPoints(points)` 등 퀴즈 메서드 | |

**GridItem / CheckboxGridItem**

| 메서드 | 반환 |
|---|---|
| `setRows(rows: String[])` | `Item` |
| `setColumns(columns: String[])` | `Item` |
| `getRows()` / `getColumns()` | `String[]` |
| `setValidation(validation)` | `Item` |
| `setRequired(enabled)` | `Item` |

**DateItem / TimeItem / DateTimeItem / DurationItem**

| 메서드 | 반환 |
|---|---|
| `setRequired(enabled)` / `isRequired()` | `Item` / `Boolean` |
| `setIncludesYear(enabled)` (DateItem, DateTimeItem) | `Item` |
| `includesYear()` | `Boolean` |
| `setPoints(points)` 등 퀴즈 메서드 | |
| `createResponse(...)` | `ItemResponse` |

**ImageItem**

| 메서드 | 반환 |
|---|---|
| `setImage(image: BlobSource)` | `ImageItem` |
| `getImage()` | `Blob` |
| `setAlignment(alignment: Alignment)` | `ImageItem` |
| `setWidth(width: Integer)` | `ImageItem` |

**VideoItem**

| 메서드 | 반환 |
|---|---|
| `setVideoUrl(youtubeUrl)` | `VideoItem` |
| `getVideoUrl()` | `String` |
| `setAlignment(alignment)` / `setWidth(width)` | `VideoItem` |

**PageBreakItem**

| 메서드 | 반환 |
|---|---|
| `setGoToPage(goToPageItem: PageBreakItem)` | `PageBreakItem` |
| `setGoToPage(navigationType: PageNavigationType)` | `PageBreakItem` |
| `getGoToPage()` | `PageBreakItem \| null` |
| `getPageNavigationType()` | `PageNavigationType` |

**FileUploadItem**

| 메서드 | 반환 |
|---|---|
| `setRequired(enabled)` / `isRequired()` | `FileUploadItem` / `Boolean` |
| (공식 문서 확인 필요 — 추가 설정 일부) | |

**SectionHeaderItem** — 기본 Item 메서드만(`setTitle`, `setHelpText`).

---

### Choice

`MultipleChoiceItem`, `CheckboxItem`, `ListItem`의 선택지.

| 메서드 | 반환 |
|---|---|
| `getValue()` | `String` |
| `isCorrectAnswer()` | `Boolean` (퀴즈) |
| `getGotoPage()` (MC만) | `PageBreakItem \| null` |
| `getPageNavigationType()` | `PageNavigationType \| null` |

생성은 항상 Item에서: `createChoice(value, isCorrect?)` 또는 `createChoice(value, navigationType)`.

---

### QuizFeedback / QuizFeedbackBuilder

| QuizFeedbackBuilder 메서드 | 반환 |
|---|---|
| `setText(text)` | `QuizFeedbackBuilder` |
| `addLink(url)` / `addLink(url, displayText)` | `QuizFeedbackBuilder` |
| `build()` | `QuizFeedback` |
| `copy()` | `QuizFeedbackBuilder` |

| QuizFeedback 메서드 | 반환 |
|---|---|
| `getText()` | `String` |
| `getLinkUrls()` | `String[]` |
| `toBuilder()` | `QuizFeedbackBuilder` |

```javascript
function makeFeedback() {
  return FormApp.createFeedback()
    .setText('정답입니다! 자세한 설명은 다음 링크 참고.')
    .addLink('https://example.com/explanation', '설명 보기')
    .build();
}
```

---

### Validation Builder

```javascript
function emailValidation() {
  const v = FormApp.createTextValidation()
    .setHelpText('이메일 형식만 허용')
    .requireTextIsEmail()
    .build();
  const item = FormApp.getActiveForm().addTextItem().setTitle('이메일');
  item.setValidation(v);
}
```

대표 메서드:

- `TextValidationBuilder`: `requireNumber()`, `requireWholeNumber()`, `requireNumberBetween(start, end)`, `requireNumberGreaterThan(n)`, `requireNumberGreaterThanOrEqualTo(n)`, `requireNumberLessThan(n)`, `requireNumberLessThanOrEqualTo(n)`, `requireNumberEqualTo(n)`, `requireNumberNotBetween(start, end)`, `requireNumberNotEqualTo(n)`, `requireTextContainsPattern(pattern)`, `requireTextDoesNotContainPattern(pattern)`, `requireTextMatchesPattern(pattern)`, `requireTextDoesNotMatchPattern(pattern)`, `requireTextIsEmail()`, `requireTextIsUrl()`, `requireTextLengthLessThanOrEqualTo(n)`, `requireTextLengthGreaterThanOrEqualTo(n)`.
- `CheckboxValidationBuilder`: `requireSelectAtLeast(n)`, `requireSelectAtMost(n)`, `requireSelectExactly(n)`.
- `GridValidationBuilder`: `requireLimitOneResponsePerColumn()`.
- `CheckboxGridValidationBuilder`: `requireLimitOneResponsePerColumn()`.

---

### FormResponse

한 응답자가 제출한 전체 응답.

| 메서드 | 반환 |
|---|---|
| `getId()` | `String \| null` |
| `getTimestamp()` | `Date` |
| `getRespondentEmail()` | `String` (`setCollectEmail(true)`일 때만) |
| `getEditResponseUrl()` | `String` (편집 허용일 때만 의미) |
| `getItemResponses()` | `ItemResponse[]` (폼 순서대로) |
| `getResponseForItem(item)` | `ItemResponse \| null` |
| `getGradableItemResponses()` | `ItemResponse[]` (퀴즈 채점 가능 항목) |
| `getGradableResponseForItem(item)` | `ItemResponse \| null` |
| `submit()` | `FormResponse` |
| `toPrefilledUrl()` | `String` |
| `withItemResponse(response: ItemResponse)` | `FormResponse` (제출 전 응답에 항목 추가) |
| `withItemGrade(gradedResponse: ItemResponse)` | `FormResponse` (제출된 응답에 채점 추가) |

### ItemResponse

한 응답의 한 항목.

| 메서드 | 반환 |
|---|---|
| `getItem()` | `Item` |
| `getResponse()` | `Object` (item 타입에 따라 String, String[], String[][] 등) |
| `getScore()` | `Number \| null` |
| `setScore(score)` | `ItemResponse` |
| `getFeedback()` | `QuizFeedback \| null` |
| `setFeedback(feedback)` | `ItemResponse` |

`getResponse()`의 반환 형식:

| Item | 형식 |
|---|---|
| TextItem, ParagraphTextItem | `String` |
| MultipleChoiceItem, ListItem | `String` |
| CheckboxItem | `String[]` |
| ScaleItem | `String` ("3" 같은) |
| DateItem, TimeItem, DateTimeItem | `String` (ISO 형식 문자열) |
| DurationItem | `String` |
| GridItem | `String[]` (각 행의 선택 열) |
| CheckboxGridItem | `String[][]` (각 행의 선택된 열 배열) |
| FileUploadItem | `String[]` (Drive 파일 ID 배열) |

---

## 자주 쓰는 패턴

### 1. 새 폼 만들고 항목 채우기

```javascript
function buildSurvey() {
  const form = FormApp.create('2026 사용자 만족도 조사')
    .setDescription('약 5분 소요됩니다.')
    .setCollectEmail(true)
    .setProgressBar(true);

  form.addTextItem().setTitle('이름').setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('연령대')
    .setChoiceValues(['10대', '20대', '30대', '40대 이상'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('사용하는 기능 (복수 선택 가능)')
    .setChoiceValues(['검색', '북마크', '공유', '댓글', '알림']);

  form.addScaleItem()
    .setTitle('전반적인 만족도')
    .setBounds(1, 5)
    .setLabels('매우 불만', '매우 만족')
    .setRequired(true);

  form.addGridItem()
    .setTitle('각 기능 만족도')
    .setRows(['검색', '북마크', '공유'])
    .setColumns(['1', '2', '3', '4', '5']);

  form.addParagraphTextItem().setTitle('개선 의견');

  console.log('편집:', form.getEditUrl());
  console.log('응답:', form.getPublishedUrl());
}
```

### 2. 폼을 Sheets에 연결

```javascript
function linkToSheet() {
  const form = FormApp.getActiveForm();
  const ss = SpreadsheetApp.create(`${form.getTitle()} - 응답`);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  console.log('연결 완료:', ss.getUrl());
}

function unlinkSheet() {
  FormApp.getActiveForm().removeDestination();
}
```

연결 후 응답이 들어올 때마다 자동으로 행이 추가된다. 기존 응답은 한번에 채워지지 않음 — 옵션을 직접 토글하거나 Sheets에서 "응답" 탭 만들기 수동 동기화.

### 3. 응답 조회

```javascript
function listResponses() {
  const form = FormApp.getActiveForm();
  const responses = form.getResponses();
  console.log('총 응답:', responses.length);

  responses.slice(0, 5).forEach(r => {
    console.log('---');
    console.log('email:', r.getRespondentEmail());
    console.log('time:',  r.getTimestamp());
    r.getItemResponses().forEach(ir => {
      console.log(' -', ir.getItem().getTitle(), ':', ir.getResponse());
    });
  });
}

function recentResponses() {
  // 최근 24시간
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return FormApp.getActiveForm().getResponses(since);
}
```

### 4. 응답 시 트리거(onFormSubmit)

폼 자체 또는 연결된 시트에서 트리거 설정 가능.

```javascript
// 폼에 설치하는 onFormSubmit 트리거의 핸들러
function onFormSubmit(e) {
  // e.response: FormResponse
  const fr = e.response;
  const email = fr.getRespondentEmail();
  const answers = fr.getItemResponses().map(ir =>
    `- ${ir.getItem().getTitle()}: ${ir.getResponse()}`
  ).join('\n');

  MailApp.sendEmail({
    to: 'team@example.com',
    subject: `[설문] 새 응답: ${email}`,
    body: answers,
  });
}

// 트리거 설치
function installTrigger() {
  const form = FormApp.getActiveForm();
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
}
```

### 5. 퀴즈 만들기 (점수 + 피드백)

```javascript
function buildQuiz() {
  const form = FormApp.create('수학 퀴즈').setIsQuiz(true);

  // 객관식 — 정답 마킹 + 점수
  const q1 = form.addMultipleChoiceItem()
    .setTitle('2 + 2 = ?')
    .setPoints(10);
  q1.setChoices([
    q1.createChoice('3', false),
    q1.createChoice('4', true),
    q1.createChoice('5', false),
  ]);
  q1.setFeedbackForCorrect(
    FormApp.createFeedback().setText('정답입니다!').build()
  );
  q1.setFeedbackForIncorrect(
    FormApp.createFeedback()
      .setText('아쉽네요. 덧셈 기초를 다시 확인해보세요.')
      .addLink('https://example.com/math-basics', '학습 자료')
      .build()
  );

  // 단답형 — 정답 검증
  const q2 = form.addTextItem()
    .setTitle('대한민국의 수도는?')
    .setPoints(10);
  q2.setValidation(
    FormApp.createTextValidation()
      .requireTextMatchesPattern('^서울( ?특별시)?$')
      .setHelpText('정확한 도시명을 입력하세요')
      .build()
  );

  console.log(form.getEditUrl());
}
```

### 6. 퀴즈 응답 자동 채점 (서버에서 점수 부여)

```javascript
function gradeOpenEnded() {
  const form = FormApp.getActiveForm();
  if (!form.isQuiz()) return;

  // 마지막 단답형 항목을 키워드 채점
  const items = form.getItems(FormApp.ItemType.TEXT);
  const targetItem = items[items.length - 1];
  const keyword = '서울';

  form.getResponses().forEach(response => {
    const ir = response.getGradableResponseForItem(targetItem);
    if (!ir) return;
    const answer = String(ir.getResponse() || '');
    const score = answer.includes(keyword) ? 10 : 0;

    const graded = ir
      .setScore(score)
      .setFeedback(
        FormApp.createFeedback().setText(
          score === 10 ? '정답!' : '오답: 정답은 "서울"입니다.'
        ).build()
      );
    const updated = response.withItemGrade(graded);
    form.submitGrades([updated]);
  });
}
```

### 7. Prefill URL 생성 (응답 일부 미리 채우기)

```javascript
function buildPrefilledUrl() {
  const form = FormApp.getActiveForm();
  const items = form.getItems();

  // 빈 응답 객체에 항목별 응답 추가
  let response = form.createResponse();
  items.forEach(item => {
    if (item.getType() === FormApp.ItemType.TEXT && item.getTitle() === '이름') {
      response = response.withItemResponse(item.asTextItem().createResponse('홍길동'));
    }
    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE
        && item.getTitle() === '연령대') {
      response = response.withItemResponse(
        item.asMultipleChoiceItem().createResponse('30대')
      );
    }
  });

  const url = response.toPrefilledUrl();
  console.log(url);
  return url;
}
```

### 8. 폼 닫기 / 열기 토글

```javascript
function closeForm() {
  FormApp.getActiveForm()
    .setAcceptingResponses(false)
    .setConfirmationMessage('응답 기간이 종료되었습니다.');
}

function reopenForm() {
  FormApp.getActiveForm().setAcceptingResponses(true);
}
```

### 9. 페이지 분기(Branching)

`MultipleChoiceItem`의 선택지에 페이지 이동 규칙을 붙인다. PageBreakItem이 페이지 구분점.

```javascript
function buildBranching() {
  const form = FormApp.create('분기 예제');
  const q = form.addMultipleChoiceItem().setTitle('당신은 학생인가요?');

  const studentPage = form.addPageBreakItem().setTitle('학생용 질문');
  form.addTextItem().setTitle('학년은?');

  const employeePage = form.addPageBreakItem().setTitle('직장인용 질문');
  form.addTextItem().setTitle('소속은?');

  q.setChoices([
    q.createChoice('네', studentPage),
    q.createChoice('아니오', employeePage),
  ]);

  // 학생 페이지 끝나면 제출
  studentPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);
}
```

### 10. 모든 응답 CSV로 export

```javascript
function exportToCsv() {
  const form = FormApp.getActiveForm();
  const items = form.getItems();
  const headers = ['timestamp', 'email', ...items.map(i => i.getTitle())];
  const rows = [headers];

  form.getResponses().forEach(r => {
    const row = [r.getTimestamp(), r.getRespondentEmail()];
    items.forEach(item => {
      const ir = r.getResponseForItem(item);
      row.push(ir ? JSON.stringify(ir.getResponse()) : '');
    });
    rows.push(row);
  });

  const csv = rows.map(row =>
    row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  return Utilities.newBlob(csv, 'text/csv', `${form.getTitle()}.csv`);
}
```

---

## 주의사항 / 함정

- **컨테이너 바인딩 vs Standalone**: `getActiveForm()`은 폼에 부착된 스크립트에서만 동작. standalone 스크립트는 `openById`/`openByUrl` 필요. 그리고 standalone에서는 `forms.currentonly` 스코프로는 안 된다.
- **`openByUrl`은 edit URL**: published URL(`/viewform`)로는 못 연다. `getEditUrl()`의 결과를 사용.
- **`getResponseForItem` / `getGradableResponseForItem`은 같은 메서드 아님**: 퀴즈 채점 시에는 `Gradable` 버전을 써야 점수 설정이 반영된다.
- **`setIsQuiz(true)` 호출 후에야 점수 의미 있음**: 퀴즈 모드가 아니면 `setPoints` 호출은 동작하지 않거나 저장은 되지만 채점에 영향 없음.
- **`submitGrades(responses)`**: 응답 배열을 넘긴다. 단일 응답도 배열로 감싸야 한다.
- **`createResponse()` vs `getResponses()`**: 전자는 새로운 빈 응답 객체(prefill/제출용), 후자는 이미 제출된 응답 목록.
- **`FormResponse.submit()`은 서버 측 제출**: 응답자 행위가 아니라 스크립트가 서버에서 제출. `setCollectEmail`이 켜져 있어도 스크립트 실행자의 이메일로 기록된다.
- **`getRespondentEmail()` 빈 문자열**: `setCollectEmail(false)`거나 응답자가 로그인하지 않은 경우 빈 문자열.
- **`setLimitOneResponsePerUser(true)`**: 응답자가 Google 계정으로 로그인해야 한다. 익명 공개 폼과 충돌.
- **`setRequireLogin`은 deprecated**: `setLimitOneResponsePerUser`나 `addPublishedReader`로 권한 제어 권장.
- **CheckboxItem의 응답 형식**: 항상 배열. 단일 선택이라도 `['답']`.
- **DateItem 응답**: `Date` 객체가 아니라 **문자열**. ISO 형식이지만 시간대 처리에 주의.
- **FileUploadItem 사용 조건**: 폼 소유자가 Google Workspace 계정인 경우만 활성화 가능. 응답자도 로그인 필요.
- **`getDestinationId` 빈 값**: `setDestination`을 호출한 적이 없거나 연결을 해제한 경우. Sheets 연결 안 했을 때 `getDestinationType()` 호출은 예외를 던질 수 있다 — 호출 전 destination이 있는지 확인 권장. (공식 문서 확인 필요)
- **`onFormSubmit` 이벤트 객체**: 폼에 설치한 트리거의 `e.response`는 `FormResponse`. Sheets에 설치한 트리거의 `e`는 `Range`, `values`, `namedValues` 등 다른 구조. 두 트리거의 페이로드를 헷갈리지 말 것.
- **응답 삭제는 영구적**: `deleteAllResponses()`는 되돌릴 수 없다. 연결된 Sheet의 데이터는 별개로 남는다.
- **퀴즈 점수 합계**: `submitGrades` 호출 후에야 응답자에게 점수가 보인다 (자동 채점 가능한 항목은 즉시 채점됨; 수동 채점은 별도).
- **이미지·비디오 Item**: 응답을 받지 않는 표시용. `getItemResponses()`에 포함되지 않는다.
- **PageBreakItem 분기는 MultipleChoiceItem만**: CheckboxItem이나 ListItem에서는 페이지 분기 불가.
- **`getItems()` 순서**: 폼에 보이는 순서대로 반환. 항목 추가 시 항상 끝에 들어가며, 중간 삽입은 `moveItem`로 변경.
- **6분 한도**: 수백 개 응답을 후처리하면 시간 초과. 트리거 분할 또는 timestamp 인자 페이지네이션 활용.
- **응답 수정 시 ID 동일**: `setAllowResponseEdits(true)` 상태에서 응답자가 수정해도 `FormResponse.getId()`는 같다. 같은 ID로 덮어쓰는 방식.

---

## 참고

- FormApp 레퍼런스: https://developers.google.com/apps-script/reference/forms/form-app
- Form: https://developers.google.com/apps-script/reference/forms/form
- Item: https://developers.google.com/apps-script/reference/forms/item
- FormResponse: https://developers.google.com/apps-script/reference/forms/form-response
- ItemResponse: https://developers.google.com/apps-script/reference/forms/item-response
- Choice: https://developers.google.com/apps-script/reference/forms/choice
- QuizFeedback: https://developers.google.com/apps-script/reference/forms/quiz-feedback
- TextValidationBuilder: https://developers.google.com/apps-script/reference/forms/text-validation-builder
- Forms 자동화 가이드: https://developers.google.com/apps-script/guides/forms
