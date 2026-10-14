# Quota 회피 실전 패턴

> **출처**
> - https://developers.google.com/apps-script/guides/services/quotas
> - https://developers.google.com/apps-script/guides/support/best-practices
> - https://developers.google.com/apps-script/reference/spreadsheet/range
> - https://developers.google.com/apps-script/reference/cache/cache
> - https://developers.google.com/apps-script/reference/lock/lock
> - https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
>
> **최종 확인일**: 2026-07-22

## 개요

Quota는 다음 세 가지 전략으로 회피한다.

1. **호출 줄이기** — 배치 처리, 캐싱
2. **6분 한계 회피** — 시간 트리거 + 진행 상태 저장 (재개 패턴)
3. **실패 견디기** — 백오프 재시도, Lock으로 동시 실행 방지

이 문서는 실전에서 즉시 사용할 수 있는 패턴 모음이다.

## 1. Sheets: 배치 R/W

### 안티패턴: 셀 하나씩 읽고 쓰기

```javascript
// 절대 하지 말 것: N행이면 N번의 API 호출 → 6분 한계 빠르게 도달
const sheet = SpreadsheetApp.getActiveSheet();
for (let i = 1; i <= 1000; i++) {
  const value = sheet.getRange(i, 1).getValue();
  sheet.getRange(i, 2).setValue(value.toUpperCase());
}
```

### 패턴: `getValues` / `setValues` 일괄

```javascript
const sheet = SpreadsheetApp.getActiveSheet();
const range = sheet.getRange(1, 1, 1000, 1);
const values = range.getValues(); // 1회 호출
const upper = values.map(row => [row[0].toString().toUpperCase()]);
sheet.getRange(1, 2, 1000, 1).setValues(upper); // 1회 호출
```

> N개 셀 작업이 2회 호출로 줄어든다. 1000배 이상 빨라지는 경우가 흔하다.

### 추가 팁

- `appendRow()` 반복 → `setValues` 일괄. `appendRow`는 매번 행 추가 검색을 한다.
- `SpreadsheetApp.flush()`는 명시적 flush가 필요할 때만 사용. 일반적으로 불요.
- 읽기 후 쓰기는 분리: 모든 `getValues` → 메모리 계산 → 모든 `setValues`.
- 서식(`setBackgrounds`, `setNumberFormats`) 도 배치 가능.

## 2. UrlFetchApp: 병렬 + 배치

### `fetchAll`로 N개 요청 병렬 처리

```javascript
const requests = ids.map(id => ({
  url: `https://api.example.com/items/${id}`,
  method: 'get',
  muteHttpExceptions: true,
}));

const responses = UrlFetchApp.fetchAll(requests);

const results = responses.map((res, i) => {
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText());
  }
  console.warn(`Failed: ${ids[i]} → ${res.getResponseCode()}`);
  return null;
});
```

> Quota 차감은 N개 요청 = N call. **속도**는 빨라지지만 **quota**는 절약 안 된다. 6분 한계 회피에 효과적.

### muteHttpExceptions 항상 켜기

기본은 4xx/5xx에서 throw. 일괄 처리 중 하나가 실패하면 전체 중단. `muteHttpExceptions: true`로 응답 코드를 직접 확인.

## 3. 캐싱: 동일 데이터 반복 요청 회피

```javascript
function fetchWithCache(url) {
  const cache = CacheService.getScriptCache();
  const key = `fetch:${Utilities.base64Encode(url).slice(0, 240)}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const res = UrlFetchApp.fetch(url);
  const data = res.getContentText();
  if (data.length < 100 * 1024) { // 100KB 한도
    cache.put(key, data, 600); // 10분
  }
  return JSON.parse(data);
}
```

### 캐시 스코프 선택

| 스코프 | 용도 |
|---|---|
| `getScriptCache()` | 모든 사용자 공통 |
| `getUserCache()` | 사용자별 |
| `getDocumentCache()` | 컨테이너 문서별 |

### 캐시 한도 (재확인)

- 키 250자
- 값 100KB
- 최대 1,000 items per cache
- 1초 ~ 6시간 (21,600 sec)

### `putAll` / `getAll`

```javascript
const map = {};
items.forEach(item => { map[`item:${item.id}`] = JSON.stringify(item); });
cache.putAll(map, 600); // 1회 호출

const keys = items.map(i => `item:${i.id}`);
const cached = cache.getAll(keys); // 1회 호출
```

## 4. 6분 한계 회피: 시간 트리거로 분할 + 진행 상태 저장

### 패턴: 중단/재개

```javascript
const BATCH_SIZE = 100;
const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5분에서 안전하게 종료

function processBatch() {
  const start = Date.now();
  const props = PropertiesService.getScriptProperties();
  let cursor = Number(props.getProperty('cursor')) || 0;

  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();

  while (cursor < data.length) {
    if (Date.now() - start > MAX_RUNTIME_MS) {
      // 시간 부족 → 진행 상태 저장 후 종료
      props.setProperty('cursor', String(cursor));
      scheduleResume();
      return;
    }

    processRow(data[cursor]);
    cursor += 1;
  }

  // 완료
  props.deleteProperty('cursor');
  cleanupTriggers();
}

function scheduleResume() {
  // 1분 후 다시 시작
  ScriptApp.newTrigger('processBatch')
    .timeBased()
    .after(60 * 1000)
    .create();
}

function cleanupTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'processBatch')
    .forEach(t => ScriptApp.deleteTrigger(t));
}
```

### 핵심 포인트

- **남은 시간 체크**를 매 반복 또는 N개 단위로
- **5분에서 종료**가 안전 (`flush`, 트리거 등록에도 시간 필요)
- **진행 상태**는 `PropertiesService`(또는 시트 자체)에 저장
- **재개 트리거**는 한 번만 등록 (중복 방지)
- 완료 시 트리거와 progress key **정리**

### 트리거 누적 방지

```javascript
function scheduleResume() {
  cleanupTriggers(); // 기존 것 제거
  ScriptApp.newTrigger('processBatch').timeBased().after(60 * 1000).create();
}
```

## 5. 지수 백오프 (Exponential Backoff)

일시적 실패(429, 503, 네트워크)는 재시도하면 성공한다. Apps Script 공식 베스트 프랙티스 권장 패턴.

```javascript
function withBackoff(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 5;
  const baseDelay = options.baseDelay || 1000;
  let attempt = 0;

  while (true) {
    try {
      return fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;
      if (!isRetryable(err)) throw err;

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1000);
      console.warn(`Attempt ${attempt} failed: ${err.message}. Retry in ${delay}ms`);
      Utilities.sleep(delay);
    }
  }
}

function isRetryable(err) {
  const msg = String(err.message || err);
  return /Rate Limit|Service unavailable|Service error|Timeout|503|429/i.test(msg);
}

// 사용
const data = withBackoff(() => {
  const res = UrlFetchApp.fetch(url);
  if (res.getResponseCode() >= 500) throw new Error(`HTTP ${res.getResponseCode()}`);
  return res.getContentText();
});
```

### 권장 파라미터

| 항목 | 값 |
|---|---|
| max attempts | 5 |
| base delay | 1초 |
| max delay (capped) | 32초 |
| jitter | 0~1초 random 추가 |

> Quota 초과(`Service invoked too many times for one day`)는 **재시도 불가**. 다음 날 리셋 대기.

## 6. LockService로 동시 실행 방지

여러 사용자가 동시에 같은 함수를 호출할 때 race condition 방지.

```javascript
function safeAppend(row) {
  const lock = LockService.getScriptLock();
  const got = lock.tryLock(10000); // 10초 대기
  if (!got) {
    throw new Error('Could not obtain lock — another execution is running.');
  }
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const next = sheet.getLastRow() + 1;
    sheet.getRange(next, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}
```

### Lock 종류

| Lock | 범위 | 사용 시점 |
|---|---|---|
| `getScriptLock()` | 스크립트 전체 (모든 사용자) | 공용 리소스 변경 |
| `getDocumentLock()` | 컨테이너 문서 | 시트/문서별 처리 |
| `getUserLock()` | 사용자별 | 사용자 자신의 중복 호출 방지 |

### `tryLock` vs `waitLock`

- `tryLock(ms)`: timeout 시 `false` 반환 — 조건 처리
- `waitLock(ms)`: timeout 시 exception — 필수 락

## 7. Properties로 진행 상태 저장 (대용량)

9KB value 한도 회피.

```javascript
function setLargeJson(key, obj) {
  const props = PropertiesService.getScriptProperties();
  const json = JSON.stringify(obj);
  const chunkSize = 8000; // 9KB 한도 안전 마진
  const chunks = [];
  for (let i = 0; i < json.length; i += chunkSize) {
    chunks.push(json.slice(i, i + chunkSize));
  }
  props.setProperty(`${key}:meta`, String(chunks.length));
  const map = {};
  chunks.forEach((c, i) => { map[`${key}:${i}`] = c; });
  props.setProperties(map);
}

function getLargeJson(key) {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty(`${key}:meta`));
  if (!n) return null;
  let json = '';
  for (let i = 0; i < n; i++) json += props.getProperty(`${key}:${i}`);
  return JSON.parse(json);
}
```

> 총량 500KB 한도는 여전히 적용. 더 크면 Drive 파일 저장 고려.

### `setProperties` (배치)

```javascript
// N번의 setProperty → 1번의 setProperties
props.setProperties({ a: '1', b: '2', c: '3' });
```

## 8. 사전 quota 체크

```javascript
function sendDigests(recipients, body) {
  const remaining = MailApp.getRemainingDailyQuota();
  if (remaining < recipients.length) {
    console.warn(`Quota 부족: ${remaining} < ${recipients.length}`);
    return false;
  }
  recipients.forEach(to => MailApp.sendEmail(to, 'Daily digest', body));
  return true;
}
```

## 9. Quota 모니터링 트리거

```javascript
function checkQuotaUsage() {
  const remaining = MailApp.getRemainingDailyQuota();
  if (remaining < 50) {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      `[ALERT] Mail quota 거의 소진 (${remaining}건 남음)`,
      'Script: ' + ScriptApp.getScriptId()
    );
  }
}
```

매일 아침 시간 트리거로 점검.

## 10. Cache → Properties → Drive 계층 저장

| 계층 | 한도 | 속도 | 영속성 |
|---|---|---|---|
| `CacheService` | 100 KB/key, 6시간 | 매우 빠름 | 일시 |
| `PropertiesService` | 9 KB/key, 500 KB 총량 | 빠름 | 영구 |
| Drive 파일 (JSON) | 사실상 무제한 | 느림 | 영구 |

작은 핫 데이터 → Cache. 설정/상태 → Properties. 대용량 결과 → Drive.

## 11. 동시 실행 30개 한계 회피

같은 사용자가 한 스크립트에서 30개를 초과 동시 실행하면 신규 실행이 큐잉되거나 거부된다.

- 시간 트리거 분산 — `everyMinutes(5)` 대신 시작 시각을 분산
- 사용자 단위로 한 번에 1개만 실행되도록 `getUserLock`

## 12. Custom function 30초 한계

- `=MYFUNC(A:A)` 처럼 큰 범위는 한 번에 처리 — 셀별로 호출되지 않고 배열 인자로 1회만 호출됨
- 외부 API 호출 (UrlFetchApp)은 가능하지만 매우 신중. 응답이 느리면 timeout.
- 결과 캐싱은 시트가 자동으로 함 (같은 인자면 재실행 안 됨). 인자가 동일한 셀이 많다면 효율적.

```javascript
/**
 * @param {Array<Array<string>>} input
 * @customfunction
 */
function UPPER_BATCH(input) {
  if (!Array.isArray(input)) return String(input).toUpperCase();
  return input.map(row => row.map(v => String(v).toUpperCase()));
}
```

→ `=UPPER_BATCH(A1:A1000)` 한 번 호출로 1000행 처리.

## 13. 에러 로깅과 알림

```javascript
function withErrorAlert(fn) {
  try {
    return fn();
  } catch (err) {
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: `[ERROR] ${ScriptApp.getScriptId()}`,
      body: `${err.message}\n\n${err.stack}`,
    });
    throw err;
  }
}
```

트리거 실행은 사용자가 직접 보지 못하므로 에러 시 메일 알림이 사실상 필수.

## 안티패턴 요약

| 안티패턴 | 대안 |
|---|---|
| 셀별 `getValue`/`setValue` 루프 | `getValues`/`setValues` 일괄 |
| `appendRow` 루프 | `setValues`로 한 번에 추가 |
| `UrlFetchApp.fetch` 순차 N회 | `fetchAll` 배치 |
| 같은 URL 반복 fetch | `CacheService` |
| 6분 안에 끝내려 무리 | 시간 트리거 + 진행 상태 저장 |
| `try`만 하고 재시도 없음 | Exponential backoff |
| 동시 편집 무방비 | `LockService.tryLock` |
| 매번 메일 한도 무시 후 메일 발송 | `getRemainingDailyQuota()` 사전 체크 |
| `setProperty` N회 호출 | `setProperties({...})` 1회 |
| 큰 JSON을 1 property에 저장 | 청크 분할 또는 Drive |
| 사용자 데이터를 Properties에 평문 저장 | 적어도 hash, 가능하면 다른 저장소 |

## 주의 / 함정

- **`Utilities.sleep`은 6분 한계에 카운트된다**. 너무 길게 자면 본 작업이 안 끝남.
- **`flush()` 남용 금지**: Apps Script는 자동으로 batch한다. 명시적 flush는 race 시점이 중요한 곳에만.
- **Quota는 효과적으로 영구 차감**: 일시적 실패로 메일이 안 가도 quota는 차감된다 (대부분의 경우). `getRemainingDailyQuota`로 확인.
- **트리거 무한 생성 버그**: `processBatch`가 재개 트리거를 매번 새로 만들면서 cleanup 안 하면 20개 한도 초과. 매번 cleanup → recreate.
- **`PropertiesService.deleteAllProperties()`** 는 한 번에 모든 키 삭제. 진행상태 폐기 시 유용.
- **시간 트리거 시작 시각 분산**: 정각에 모든 사용자 트리거가 동시 발화하면 30 동시 실행 한도에 걸릴 수 있음. `Math.random()` 으로 1~5분 분산.
- **`fetchAll` 응답 메모리**: 50MB × N개 응답을 동시에 메모리에 두면 OOM. 응답 크기 큰 경우 청크별로 `fetchAll`.

## 참고

- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/guides/support/best-practices
- https://developers.google.com/apps-script/reference/cache/cache
- https://developers.google.com/apps-script/reference/lock/lock
- https://developers.google.com/apps-script/reference/properties/properties-service
- https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
