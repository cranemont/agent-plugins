# 성능 패턴

> **출처**
> - https://developers.google.com/apps-script/guides/sheets
> - https://developers.google.com/apps-script/reference/cache/cache-service
> - https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
> - https://developers.google.com/apps-script/reference/lock/lock-service
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script 성능 최적화의 큰 축은 세 가지다:

1. **Google 서비스 호출 횟수 줄이기** — 매 호출이 비싼 IPC. 배치/캐싱으로 압축.
2. **6분 실행 제한 회피** — 작업 분할 + 시간 트리거로 이어가기.
3. **외부 API 병렬화** — `UrlFetchApp.fetchAll`로 직렬 호출 회피.

핵심 원칙: **루프 안의 서비스 호출은 거의 항상 잘못된 패턴**.

## 1. Range 배치 읽기/쓰기

### 안티 패턴 — 셀 단위 호출

```javascript
// 매우 느림. n번의 IPC 호출.
const sheet = SpreadsheetApp.getActiveSheet();
for (let r = 1; r <= 100; r++) {
  for (let c = 1; c <= 10; c++) {
    const v = sheet.getRange(r, c).getValue();   // 매번 RPC
    sheet.getRange(r, c).setValue(v * 2);
  }
}
```

100×10 = 1000개 read + 1000개 write = 2000 RPC. 수십 초~분 단위로 느려진다.

### 올바른 패턴 — 한번에 읽고 한번에 쓰기

```javascript
const sheet = SpreadsheetApp.getActiveSheet();
const range = sheet.getRange(1, 1, 100, 10);
const values = range.getValues();              // 1번 read

for (let r = 0; r < values.length; r++) {
  for (let c = 0; c < values[r].length; c++) {
    values[r][c] = values[r][c] * 2;            // 메모리 연산
  }
}
range.setValues(values);                       // 1번 write
```

수십~수백 배 빠르다.

### 마지막 행에 데이터 추가

```javascript
// 안 좋음 — 매 호출이 RPC
data.forEach(row => sheet.appendRow(row));

// 좋음 — 한번에
sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
```

`appendRow`는 내부적으로 lock + write를 매번 수행한다. 큰 batch에는 부적합.

### Display value vs raw value

- `getValues()`: 셀의 raw 값 (숫자/Date/문자열)
- `getDisplayValues()`: 포맷된 문자열 (날짜 포맷, 통화 등이 반영된 문자열)

대량 데이터를 단순히 표시 텍스트만 필요로 한다면 `getDisplayValues`가 더 가볍기도 하지만, 일반적으로 `getValues`로 충분.

## 2. CacheService로 비싼 연산/외부 API 캐싱

`CacheService`는 최대 6시간(`putAll`은 단 1회 호출당 만료시간 설정) 동안 키-값을 보관한다. 외부 API 응답, 무거운 계산 결과를 캐싱하면 6분 제한 안에서 더 많이 처리할 수 있다.

```javascript
function getRate_(symbol) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(symbol);
  if (cached) return JSON.parse(cached);

  const res = UrlFetchApp.fetch('https://api.example.com/rate?s=' + symbol);
  const data = JSON.parse(res.getContentText());
  cache.put(symbol, JSON.stringify(data), 300);   // 5분
  return data;
}
```

캐시 종류:
- `getScriptCache()`: 스크립트 전역
- `getUserCache()`: 호출자 사용자별
- `getDocumentCache()`: 컨테이너 문서별

키 최대 250자, value 최대 100KB. 큰 응답은 청크 분할 또는 압축 후 base64.

### 다중 키 한번에 조회

```javascript
const map = cache.getAll(['k1','k2','k3']);  // { k1:'v1', k3:'v3' } 누락된 키 제외
```

루프 안에서 `cache.get`을 N번 호출하는 대신 `getAll` 1회로.

## 3. 6분 제한 회피 — Continuation 패턴

한 실행당 6분(360초) 제한(공식 quotas 표 기준 전 계정 동일). 시간 초과 시 `Exceeded maximum execution time` throw.

전략: **진행 상태를 PropertiesService에 저장 → 종료 직전에 종료 → 시간 트리거로 다음 batch 이어가기**.

```javascript
const CHUNK = 100;
const TIME_BUDGET_MS = 5 * 60 * 1000;   // 5분 (안전 마진)

function continuousJob() {
  const prop = PropertiesService.getScriptProperties();
  const start = Date.now();
  let cursor = Number(prop.getProperty('cursor') || 0);

  const items = getAllItems_();        // 전체 큐 (또는 sheet 범위)

  while (cursor < items.length) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      prop.setProperty('cursor', String(cursor));
      scheduleNextRun_();
      return;
    }
    processBatch_(items.slice(cursor, cursor + CHUNK));
    cursor += CHUNK;
  }

  // 끝까지 처리됨 — cursor 리셋
  prop.deleteProperty('cursor');
  removeExistingTriggers_('continuousJob');
}

function scheduleNextRun_() {
  // 기존 트리거 제거 후 1분 뒤 재실행
  removeExistingTriggers_('continuousJob');
  ScriptApp.newTrigger('continuousJob')
    .timeBased().after(60 * 1000).create();
}

function removeExistingTriggers_(fn) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === fn)
    .forEach(t => ScriptApp.deleteTrigger(t));
}
```

원칙:
- **타임 예산**은 한도(6분)보다 1~2분 짧게 (정리 시간 확보)
- 트리거 수는 프로젝트당 20개 한도 — 다 끝나면 청소
- `cursor`는 시트 행 번호, Drive `nextPageToken`, 큐 인덱스 등 작업 유형에 맞게

## 4. UrlFetchApp 병렬 — fetchAll

`fetchAll(requests)`는 여러 HTTP 요청을 **병렬로** 발사한다. 100개 요청을 직렬로 하면 누적 응답 시간 만큼 걸리지만 `fetchAll`은 거의 한 라운드트립.

```javascript
const requests = ids.map(id => ({
  url: `https://api.example.com/items/${id}`,
  muteHttpExceptions: true
}));
const responses = UrlFetchApp.fetchAll(requests);
const results = responses.map(r => {
  if (r.getResponseCode() !== 200) return null;
  return JSON.parse(r.getContentText());
});
```

주의:
- `fetchAll`도 일일 quota(URL Fetch calls: 20K/100K/day) 동일하게 카운트
- 너무 큰 배열(수천)은 메모리 압박 — 1회 호출당 ~1000 요청 권장
- 외부 서버 rate limit을 초과할 수 있음 — 필요 시 청크로 나눠 호출
- 응답 순서는 요청 순서와 동일

## 5. SpreadsheetApp.flush() — 의도된 동기화

Apps Script는 시트 write를 내부에서 모았다가 한번에 commit한다. 그래서 `setValues` 직후 같은 시트를 `getValues`로 다시 읽어도 옛 값이 나올 수 있다.

```javascript
sheet.getRange('A1').setValue('new');
SpreadsheetApp.flush();    // 강제 commit
const v = sheet.getRange('A1').getValue();   // 'new' 보장
```

**과용 금지** — flush는 비용 큰 동기화 포인트다. 정말 다음 read가 직전 write를 봐야 할 때만 사용. UI 진행 표시(loop 중 셀에 progress 쓰기)에도 활용.

## 6. LockService로 동시 실행 직렬화

같은 함수가 서로 다른 트리거/요청으로 동시에 돌면 race condition 발생. `LockService`로 직렬화.

```javascript
function criticalSection() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) {       // 10초 대기
    console.warn('locked, skipping this run');
    return;
  }
  try {
    // 임계 영역
    const v = Number(sheet.getRange('A1').getValue());
    sheet.getRange('A1').setValue(v + 1);
  } finally {
    lock.releaseLock();
  }
}
```

종류:
- `getScriptLock()`: 스크립트 전역
- `getUserLock()`: 사용자별
- `getDocumentLock()`: 컨테이너 문서별

웹앱 `doPost`가 빈번하게 호출되는 환경에서 시트 갱신 시 필수.

## 7. 시트 protect/unprotect 비용

`Range.protect()` / `Sheet.protect()`는 비싸다. 각 호출이 권한 객체를 만든다.

```javascript
// 안 좋음 — 매 행에 protect
data.forEach(row => sheet.getRange(row).protect());

// 좋음 — 큰 범위 한번에
const all = sheet.getRange('A2:Z' + lastRow).protect();
```

대량 보호는 정말 필요한 영역만. 보호 객체 수에도 quota 있음 (확실치 않음 — 수천 단위에서 느려짐 보고).

## 8. 객체 매핑 (헤더 기반) — 메모리에서 처리

시트 데이터를 객체로 변환해두면 가독성/안정성 향상.

```javascript
function rowsToObjects(values) {
  const [header, ...rows] = values;
  return rows.map(row => {
    const obj = {};
    header.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function objectsToRows(objects, header) {
  return objects.map(o => header.map(h => o[h] ?? ''));
}
```

루프 한 번으로 변환 후 메모리에서 가공, 다시 setValues 한 번.

## 9. PropertiesService 사용 시 주의

각 `getProperty`/`setProperty`는 RPC. 다수 키를 다루면 `getProperties`/`setProperties`로 한번에.

```javascript
const props = PropertiesService.getScriptProperties();
const all = props.getProperties();             // 1 RPC
all.lastRun = new Date().toISOString();
props.setProperties(all);                       // 1 RPC
```

또한 Properties 값은 최대 9KB(키당), 전체 500KB(스크립트당). 큰 데이터는 Drive 파일/Sheet/Cache에.

## 10. 시간 트리거 + 큐 패턴

대량 작업을 사용자 요청에 즉시 처리하지 않고 큐(시트 또는 Properties)에 적재 → 시간 트리거가 batch 처리.

```javascript
// 진입점 — 큐에 적재만
function doPost(e) {
  const queue = SpreadsheetApp.openById(QUEUE_ID).getSheetByName('queue');
  queue.appendRow([new Date(), JSON.stringify(JSON.parse(e.postData.contents))]);
  return ContentService.createTextOutput('queued');
}

// 트리거 — 1분마다 실행
function processQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) return;     // 이미 다른 실행 중이면 skip
  try {
    const queue = SpreadsheetApp.openById(QUEUE_ID).getSheetByName('queue');
    const range = queue.getDataRange();
    const rows = range.getValues();
    if (rows.length === 0) return;
    rows.forEach(row => process_(JSON.parse(row[1])));
    queue.clear();
  } finally {
    lock.releaseLock();
  }
}
```

장점:
- 사용자 요청은 즉시 응답 (큐에 쓰기만)
- 처리 실패 시 retry 용이
- 일일 quota 사용량 평탄화

## 11. Advanced Service vs 빌트인 Service

같은 기능이 두 가지 형태로 제공되는 경우가 있음 (예: `SpreadsheetApp` vs Advanced `Sheets` API).

- **빌트인** (`SpreadsheetApp`): 사용 편하지만 RPC가 잘게 쪼개짐
- **Advanced** (`Sheets` API): batch 업데이트 등 더 강력. 대량 작업에 더 빠를 수 있음

대용량 시트(수만 행)에서는 Advanced Sheets API의 `Sheets.Spreadsheets.batchUpdate`가 더 빠른 경우 있음. 단, 사용 복잡도 증가 + Drive scope 필요.

## 12. 메모리 한계

Apps Script 메모리 제한은 명시되지 않지만, 매우 큰 배열(수십 MB)은 OOM 가능. 시트 read 전 행 수 확인:

```javascript
const rows = sheet.getLastRow();
if (rows > 100_000) {
  // chunk 단위 처리
}
```

## 함정

- **루프 안의 `flush()`**: 매 iteration마다 flush하면 배치 효과 사라짐.
- **`getLastRow()` 매번 호출**: 변하지 않는다면 변수에 저장 후 재사용.
- **`SpreadsheetApp.getActive()`를 변수에 저장 안 함**: 매 호출이 RPC. 한번 가져와 변수에.
- **`fetchAll`의 직렬 fallback**: `muteHttpExceptions: true` 없이 한 요청이 throw하면 전체가 깨짐 — 항상 true 권장.
- **Cache value 100KB 초과**: silent 실패. put 후 즉시 get으로 검증하거나 큰 데이터는 chunking.
- **트리거 누적**: continuation 패턴에서 트리거 청소를 잊으면 20개 한도에 부딪힘.
- **`appendRow` race**: 동시에 두 곳에서 호출하면 같은 행에 덮어쓸 수 있음 — Lock 필수.

## 참고

- https://developers.google.com/apps-script/guides/sheets
- https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app#fetchallrequests
- https://developers.google.com/apps-script/reference/cache/cache-service
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://developers.google.com/apps-script/guides/services/quotas
