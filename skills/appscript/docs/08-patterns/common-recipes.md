# 자주 쓰는 레시피

> **출처**
> - https://developers.google.com/apps-script/reference (각 서비스)
> - https://developers.google.com/apps-script/guides/sheets
> - https://developers.google.com/apps-script/guides/triggers
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script로 반복적으로 만들게 되는 코드 조각 모음. 모두 실행 가능하며 V8 런타임 기준이다. 큰 패턴은 [performance-patterns.md](./performance-patterns.md), [error-handling.md](./error-handling.md)를 참고.

---

## 1. 시트의 모든 데이터를 객체 배열로

헤더 행을 키로 사용.

```javascript
function readSheetAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error('sheet not found: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const [header, ...rows] = values;
  return rows.map(row => {
    const obj = {};
    header.forEach((h, i) => obj[String(h)] = row[i]);
    return obj;
  });
}

// 역변환
function writeObjectsToSheet(sheetName, objects, header) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  sheet.clearContents();
  const rows = objects.map(o => header.map(h => o[h] ?? ''));
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
}
```

## 2. 마지막 행에 한번에 여러 행 추가

`appendRow`를 루프 돌리지 말 것.

```javascript
function appendRows(sheet, rows) {
  if (!rows.length) return;
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}
```

## 3. Gmail 검색 → 첨부파일을 Drive에 저장

```javascript
function saveAttachmentsToDrive() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const query = 'has:attachment newer_than:7d label:invoices';
  const threads = GmailApp.search(query, 0, 50);
  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      msg.getAttachments().forEach(att => {
        const name = `${msg.getDate().toISOString().slice(0,10)}_${att.getName()}`;
        folder.createFile(att.copyBlob().setName(name));
      });
    });
    thread.addLabel(GmailApp.getUserLabelByName('processed'));
  });
}
```

`thread.addLabel`로 처리됨 표시 → 다음 실행에서 중복 제외 가능 (`label:invoices -label:processed`).

## 4. Form 응답 → Slack Webhook

폼 제출 트리거(`From spreadsheet` → `On form submit`)와 결합.

```javascript
function onFormSubmit(e) {
  const fields = e.namedValues;  // { "이름": ["홍길동"], "이메일": [...] }
  const blocks = Object.entries(fields).map(([k, v]) => `*${k}*: ${v.join(', ')}`).join('\n');
  UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK'), {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({ text: '새 제출\n' + blocks }),
  });
}
```

## 5. 주간 리포트 자동 메일

매주 월요일 9시 트리거.

```javascript
function installWeeklyTrigger() {
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
}

function sendWeeklyReport() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('orders');
  const data = sheet.getDataRange().getValues();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recent = data.slice(1).filter(r => new Date(r[0]) >= weekAgo);
  const total = recent.reduce((sum, r) => sum + Number(r[2] || 0), 0);

  const html = `<h2>주간 리포트</h2><p>주문 ${recent.length}건 / 합계 ${total.toLocaleString()}원</p>`;
  GmailApp.sendEmail('boss@example.com', '주간 리포트', '', { htmlBody: html });
}
```

## 6. 시트를 PDF로 내보내 Drive에 저장

```javascript
function exportSheetAsPdf(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=pdf&gid=${gid}&portrait=true&size=A4`;
  const blob = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  }).getBlob().setName(`report_${new Date().toISOString().slice(0,10)}.pdf`);
  return DriveApp.getFolderById(FOLDER_ID).createFile(blob);
}
```

`ScriptApp.getOAuthToken()`은 현재 사용자의 OAuth 토큰을 반환 — Drive scope가 매니페스트에 있어야 함.

## 7. 데이터 검증 (Data Validation) 자동 설정

특정 열에 드롭다운 추가.

```javascript
function setColumnDropdown(sheetName, colNum, values) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const range = sheet.getRange(2, colNum, sheet.getMaxRows() - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}
```

## 8. 여러 시트 데이터 통합

같은 헤더의 여러 시트를 한 시트로 합치기.

```javascript
function consolidateSheets(sourceNames, targetName) {
  const ss = SpreadsheetApp.getActive();
  const target = ss.getSheetByName(targetName) || ss.insertSheet(targetName);
  target.clear();

  let header;
  const allRows = [];
  sourceNames.forEach(name => {
    const src = ss.getSheetByName(name);
    if (!src) return;
    const v = src.getDataRange().getValues();
    if (!v.length) return;
    if (!header) { header = v[0]; allRows.push(header); }
    allRows.push(...v.slice(1));
  });

  if (allRows.length) {
    target.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
  }
}
```

## 9. Calendar 이벤트 → Sheet 동기화

```javascript
function syncCalendarToSheet() {
  const cal = CalendarApp.getDefaultCalendar();
  const start = new Date();
  const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const events = cal.getEvents(start, end);

  const rows = events.map(e => [
    e.getId(),
    e.getTitle(),
    e.getStartTime(),
    e.getEndTime(),
    e.getLocation() || '',
    e.getGuestList().map(g => g.getEmail()).join(', '),
  ]);

  const sheet = SpreadsheetApp.getActive().getSheetByName('events');
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([['id','title','start','end','location','guests']]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 6).setValues(rows);
}
```

## 10. Doc 템플릿 placeholder 치환

Doc 본문의 `{{name}}` 등을 값으로 교체.

```javascript
function createDocFromTemplate(templateId, folderId, replacements, newName) {
  const copy = DriveApp.getFileById(templateId).makeCopy(newName, DriveApp.getFolderById(folderId));
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  Object.entries(replacements).forEach(([key, val]) => {
    body.replaceText(`{{${key}}}`, String(val));
  });
  doc.saveAndClose();
  return copy;
}

// 사용
createDocFromTemplate(TPL_ID, FOLDER_ID, {
  name: '홍길동',
  date: new Date().toLocaleDateString('ko-KR'),
  amount: '1,000,000원',
}, '계약서_홍길동');
```

## 11. 파일 권한 일괄 변경 (Drive)

```javascript
function shareFolderContents(folderId, emails, role) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    emails.forEach(email => {
      try {
        if (role === 'edit') file.addEditor(email);
        else if (role === 'view') file.addViewer(email);
      } catch (e) {
        console.warn('failed for %s on %s: %s', email, file.getName(), e.message);
      }
    });
  }
}
```

## 12. doPost로 webhook 받기 (JSON)

```javascript
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    // 시크릿 검증
    if (body.secret !== PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET')) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    // 처리
    handleEvent_(body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost', err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

웹앱 배포: Deploy → New deployment → Web app → execute as `Me`, access `Anyone`. `/exec` URL 사용.

## 13. 외부 REST API 호출 — 인증 헤더

```javascript
function callApi_(path, options) {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  const res = UrlFetchApp.fetch(API_BASE + path, {
    method: options?.method || 'get',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    payload: options?.body ? JSON.stringify(options.body) : undefined,
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 200 && code < 300) return JSON.parse(res.getContentText());
  throw new Error(`API ${code}: ${res.getContentText()}`);
}
```

## 14. 환경 변수 (Script Properties)

소스코드에 secret을 절대 박지 않는다. Properties에 저장:

```javascript
// 1회성 — 콘솔에서 실행
function setupSecrets() {
  PropertiesService.getScriptProperties().setProperties({
    API_TOKEN: 'sk-...',
    WEBHOOK_SECRET: 'random-string',
    SLACK_WEBHOOK: 'https://hooks.slack.com/...',
  });
}

// 사용
const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
```

에디터 UI: Project Settings → Script Properties에서도 추가 가능.

## 15. 멀티 실행 차단 (Lock)

```javascript
function singletonJob() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5 * 1000)) {
    console.warn('already running, skipping');
    return;
  }
  try {
    doWork_();
  } finally {
    lock.releaseLock();
  }
}
```

## 16. 시트 변경 감지 (onEdit) — 특정 열만

```javascript
function onEdit(e) {
  const range = e.range;
  if (range.getSheet().getName() !== 'orders') return;
  if (range.getColumn() !== 5) return;        // 상태 열만
  const newVal = e.value;
  const row = range.getRow();
  if (newVal === 'shipped') {
    range.offset(0, 1).setValue(new Date());   // 옆 칸에 발송 시각
  }
}
```

**주의**: 단순 트리거 `onEdit`은 권한 제약 — 외부 호출(UrlFetchApp 등) 불가. 외부 호출이 필요하면 설치된 트리거로 등록 (`From this script` → `On edit` 이벤트).

## 17. 진행 상태를 시트 셀에 표시

```javascript
function longJob() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('status');
  const items = getItems_();
  for (let i = 0; i < items.length; i++) {
    process_(items[i]);
    sheet.getRange('A1').setValue(`${i+1}/${items.length}`);
    if (i % 10 === 0) SpreadsheetApp.flush();   // UI에 반영
  }
  sheet.getRange('A1').setValue('완료');
}
```

## 18. 사용자 메뉴 추가

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('도구')
    .addItem('데이터 새로고침', 'refreshData')
    .addItem('리포트 보내기', 'sendReport')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('관리')
      .addItem('초기화', 'resetAll'))
    .addToUi();
}
```

`onOpen`은 단순 트리거. 외부 API 호출이 필요한 메뉴 항목은 별도 함수에서 처리(클릭 시 설치된 트리거 context로 실행됨).

## 19. 사용자 확인 다이얼로그

```javascript
function confirmAndDelete() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('정말 삭제하시겠습니까?', '이 작업은 되돌릴 수 없습니다.', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  // 삭제 로직
}

function promptUser() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('이름을 입력하세요', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK) {
    const name = res.getResponseText();
    // ...
  }
}
```

## 20. 시트에서 직접 호출되는 커스텀 함수

```javascript
/**
 * 두 수를 더한다.
 * @param {number} a
 * @param {number} b
 * @return {number} 합
 * @customfunction
 */
function ADD2(a, b) {
  return a + b;
}
```

시트에서 `=ADD2(1, 2)` → `3`. 제약:
- 커스텀 함수는 **30초 제한** (일반 함수 6분과 다름)
- 외부 호출 가능하지만 사용자 인증 컨텍스트 X → public API만
- Properties/Cache 등 일부 서비스 접근 제한

## 21. Date를 시트 timeZone에 맞춰 포맷

```javascript
function formatDate(d) {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss');
}
```

`new Date().toLocaleString()`은 사용자 로케일에 따라 다름 — 일관성 필요 시 `Utilities.formatDate` 권장.

## 22. JSON 응답 캐싱

```javascript
function getCachedJson_(key, fetcher, ttl) {
  const cache = CacheService.getScriptCache();
  const c = cache.get(key);
  if (c) return JSON.parse(c);
  const v = fetcher();
  cache.put(key, JSON.stringify(v), ttl || 600);
  return v;
}

// 사용
const data = getCachedJson_('rate-usd', () => {
  return JSON.parse(UrlFetchApp.fetch(RATE_URL).getContentText());
}, 1800);  // 30분
```

## 23. 시트 ID로부터 안전한 시트 객체 가져오기

```javascript
function getSheet(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const s = ss.getSheetByName(sheetName);
  if (!s) throw new Error(`sheet "${sheetName}" not found in ${spreadsheetId}`);
  return s;
}
```

## 함정

- **Date 객체와 시트의 timezone 미스매치**: 시트 timeZone과 스크립트 timeZone이 다를 수 있다. `appsscript.json`의 `timeZone`을 명시하고 일관 유지.
- **`e.namedValues`는 폼 트리거에서만 채워짐**: `onEdit` 트리거에는 없다.
- **`getDataRange()`는 빈 행/열 제외**: 진짜 시트의 max range가 필요하면 `getRange(1,1,sheet.getMaxRows(),sheet.getMaxColumns())`.
- **`createFile(blob)`은 quota를 소모**: 대량 Drive 생성 시 주의. 공식 quotas 표엔 일반 파일 생성에 대한 별도 일일 한도가 없지만, Google 문서/시트 생성(각각 250/1,500·250/3,200)과 파일 변환(2,000/4,000) 한도가 적용될 수 있다.
- **`onEdit`은 simple trigger** — installable trigger로 등록하지 않으면 외부 호출(UrlFetch, GmailApp 등) 불가.

## 참고

- https://developers.google.com/apps-script/reference/spreadsheet
- https://developers.google.com/apps-script/reference/gmail
- https://developers.google.com/apps-script/reference/drive
- https://developers.google.com/apps-script/guides/triggers
- https://developers.google.com/apps-script/guides/sheets/functions (커스텀 함수)
