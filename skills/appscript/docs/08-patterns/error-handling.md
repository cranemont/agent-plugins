# 에러 처리 패턴

> **출처**
> - https://developers.google.com/apps-script/guides/services/quotas
> - https://developers.google.com/apps-script/reference/url-fetch/http-response
> - https://developers.google.com/apps-script/manifest (`exceptionLogging`)
> - https://github.com/RomainVialard/ErrorHandler
> - https://gist.github.com/peterherrmann/2700284 (GASRetry)
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script에서 발생하는 에러는 크게 네 부류다:

1. **JavaScript 런타임 에러** — `TypeError`, `ReferenceError` 등 일반 JS
2. **Apps Script 서비스 에러** — Google 백엔드 호출 실패 (rate limit, 권한, 일시 장애)
3. **외부 HTTP 에러** — `UrlFetchApp.fetch`로 외부 API 호출 시 4xx/5xx
4. **권한/스코프 에러** — OAuth 동의 부족, 부족한 권한

각 부류마다 처리 전략이 다르다. 무차별 try/catch는 진짜 문제(권한 누락 등)를 숨길 수 있다.

## 기본 try/catch

```javascript
try {
  const sheet = SpreadsheetApp.openById(id);
  sheet.getSheetByName('data').appendRow([1, 2, 3]);
} catch (e) {
  console.error('append failed: ' + e.message, e);
  throw e;   // 트리거 알림이 동작하려면 다시 던져야 함
}
```

V8 런타임에서 `Error` 객체는 `.message`, `.name`, `.stack`을 갖는다. Rhino에서는 `e.message`만 안정적.

## 에러를 다시 던질지 / 삼킬지

| 상황 | 권장 |
|------|------|
| 트리거 함수의 최상위 | 로깅 + **re-throw** (실패 알림 동작) |
| 배치 처리 중 한 항목 실패 | catch + 다음 항목 진행 (전체 중단 X) |
| 사용자에게 응답하는 doGet/doPost | catch + 에러 응답 반환 |
| 권한/scope 에러 | catch 금지 — 동의 흐름 진입해야 함 |

```javascript
// 배치 처리 — 개별 실패 격리
function processAll() {
  const items = getItems_();
  const failed = [];
  for (const item of items) {
    try {
      process_(item);
    } catch (e) {
      console.error('item %s failed: %s', item.id, e.message);
      failed.push({ id: item.id, error: e.message });
    }
  }
  if (failed.length) {
    notifyOps_(failed);
  }
}
```

## Apps Script 서비스 에러 패턴

### Rate limit / 일시 장애

Google 서비스 호출은 다음과 같이 일시적으로 실패할 수 있다:

- `Service invoked too many times` — quota 초과
- `Internal error` / `Service error` — 일시 장애
- `Service Spreadsheets failed while accessing document` — locking conflict
- `Backend Error` — 광범위한 백엔드 일시 오류

이런 에러는 **지수 백오프**로 재시도하면 대부분 통과한다.

### Exponential backoff 패턴

```javascript
/**
 * fn을 최대 maxAttempts번 재시도. 시도 사이 지수 백오프.
 */
function withRetry_(fn, opts) {
  const maxAttempts = opts?.maxAttempts ?? 5;
  const baseMs = opts?.baseMs ?? 1000;
  let attempt = 0;
  while (true) {
    try {
      return fn();
    } catch (e) {
      attempt++;
      if (attempt >= maxAttempts || !isRetriable_(e)) throw e;
      const wait = baseMs * Math.pow(2, attempt - 1)
                   + Math.floor(Math.random() * 500);  // jitter
      console.warn('attempt %d failed (%s) — waiting %d ms', attempt, e.message, wait);
      Utilities.sleep(wait);
    }
  }
}

function isRetriable_(e) {
  const msg = String(e.message || e);
  return /Service invoked too many times|Internal error|Backend Error|timed out|Service error|failed while accessing/i
    .test(msg);
}
```

사용:

```javascript
const data = withRetry_(() => {
  return UrlFetchApp.fetch('https://api.example.com', { muteHttpExceptions: true });
}, { maxAttempts: 5, baseMs: 1000 });
```

지연: 1s → 2s → 4s → 8s → 16s (+ jitter).

**Jitter(랜덤 추가)**가 중요하다. 같은 트리거가 동시에 여러 인스턴스로 실행돼 모두 같은 backoff 타이밍에 retry하면 thundering herd가 발생.

### Quota 초과는 retry로 못 푼다

```
Service invoked too many times for one day
```

이건 일일 quota 소진 — backoff로 복구되지 않는다. retry 전 일일 vs 분당 한도 구분 필요:

```javascript
function isDailyQuota_(e) {
  return /too many times for one day|too many emails per day/i.test(String(e.message));
}
```

일일 quota 초과 시 retry 하지 말고 즉시 fail + 알림. 다음날 재개되는 continuation은 별도 트리거.

## UrlFetchApp 에러 처리

### muteHttpExceptions 동작

- `muteHttpExceptions: false` (기본): HTTP 4xx/5xx 응답이 throw됨
- `muteHttpExceptions: true`: throw 안 함. 응답 객체로 받아서 `getResponseCode()` 확인 필요

**거의 항상 `true` 권장**. 4xx 응답에도 body에 의미 있는 에러 정보가 있어 분석 필요.

```javascript
const res = UrlFetchApp.fetch(url, {
  muteHttpExceptions: true,
  method: 'post',
  payload: JSON.stringify(body),
  contentType: 'application/json',
});
const code = res.getResponseCode();

if (code >= 200 && code < 300) {
  return JSON.parse(res.getContentText());
}
if (code === 429 || code === 503) {
  throw new Error(`retriable: ${code}`);          // backoff에 잡힘
}
if (code === 401 || code === 403) {
  throw new Error(`auth: ${code} ${res.getContentText()}`);  // retry 무의미
}
throw new Error(`http ${code}: ${res.getContentText()}`);
```

### 외부 API rate limit (429) 처리

```javascript
function fetchWithRetry_(url, options) {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    const res = UrlFetchApp.fetch(url, { ...options, muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code !== 429 && code !== 503) return res;

    // Retry-After 헤더 우선
    const retryAfter = Number(res.getHeaders()['Retry-After']);
    const wait = retryAfter > 0
      ? retryAfter * 1000
      : Math.pow(2, i) * 1000 + Math.random() * 500;
    Utilities.sleep(wait);
  }
  throw new Error('max retries exceeded for ' + url);
}
```

## 트리거 함수에서의 에러

설치된 트리거(시간/onEdit/onFormSubmit 등)가 throw하면 Google이 트리거 소유자에게 메일 알림을 보낸다 (설정 가능, immediate/hourly/daily/weekly).

**핵심**: 트리거에서 catch만 하고 throw하지 않으면 알림이 안 온다. 운영 가시성을 위해 다음 패턴 권장:

```javascript
function dailyJob() {
  try {
    doWork_();
  } catch (e) {
    console.error('dailyJob failed', e);
    // 옵션 A: 다시 던지기 — Google 기본 알림 동작
    throw e;
    // 옵션 B: 직접 알림 — 더 풍부한 정보
    // notifyOps_('dailyJob failed: ' + e.message, e.stack);
  }
}
```

**`exceptionLogging: "STACKDRIVER"`** 매니페스트 설정이 있으면 잡히지 않은 예외가 자동으로 Cloud Error Reporting에 보고된다(기본).

## Lock 충돌 처리

LockService는 `tryLock(ms)`이 false를 반환한다(throw 아님). 대기 시간 후에도 못 잡으면 작업 방식을 결정:

```javascript
const lock = LockService.getScriptLock();
if (!lock.tryLock(30 * 1000)) {
  // 30초 대기 후에도 실패 — 다음 트리거에 맡김
  console.warn('lock not acquired, will retry next cycle');
  return;
}
try {
  doWork_();
} finally {
  lock.releaseLock();
}
```

`waitLock(ms)`는 throw — `tryLock`이 더 안전하다.

## 사용자 정의 에러 타입

V8에서 ES2015 클래스 사용 가능. 도메인별 에러를 분리하면 try/catch에서 분기하기 쉽다.

```javascript
class AuthError extends Error { constructor(msg) { super(msg); this.name = 'AuthError'; } }
class RateLimitError extends Error { constructor(msg, retryAfter) { super(msg); this.name='RateLimitError'; this.retryAfter=retryAfter; } }

function callApi_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = res.getResponseCode();
  if (code === 401) throw new AuthError('unauthorized: ' + res.getContentText());
  if (code === 429) throw new RateLimitError('rate limited', Number(res.getHeaders()['Retry-After']));
  if (code >= 400) throw new Error('http ' + code);
  return JSON.parse(res.getContentText());
}

try {
  const data = callApi_(url);
} catch (e) {
  if (e instanceof AuthError) refreshToken_();
  else if (e instanceof RateLimitError) Utilities.sleep((e.retryAfter || 60) * 1000);
  else throw e;
}
```

## 에러 로깅 패턴

```javascript
function logError_(context, e) {
  console.error('%s | %s | %s', context, e.message, e.stack || '');
  Logger.log({
    message: e.message,
    name: e.name,
    context: context,
    stack: e.stack,
    user: Session.getActiveUser().getEmail() || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
```

`Logger.log({...with message})` 는 Cloud Logging의 `jsonPayload`로 들어가서 필드별 쿼리 가능.

## doPost/doGet 응답에서의 에러

웹앱은 throw하면 HTML 에러 페이지가 노출됨. JSON API를 흉내내려면 catch + 구조화 응답:

```javascript
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const result = process_(body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: result }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost failed', err);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false, error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

주의: Apps Script 웹앱은 **HTTP 상태 코드를 커스터마이즈할 수 없다**. 항상 200 OK로 반환 — 에러 표시는 응답 body 안의 필드(`ok: false` 등)로.

## 에러 알림 채널

옵션:

1. **Google 기본 트리거 메일**: 트리거 실패 시 자동
2. **Cloud Error Reporting**: GCP 콘솔, 그룹화/대시보드
3. **Cloud Monitoring 알림 정책**: severity ERROR 로그 발생 → 메일/Slack/PagerDuty
4. **자체 Slack/Webhook**: catch 블록에서 직접 전송

```javascript
function notifyOps_(message, detail) {
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      text: `:rotating_light: ${message}`,
      attachments: [{ text: '```' + detail + '```' }]
    })
  });
}
```

## 에러 처리 라이브러리

- **[RomainVialard/ErrorHandler](https://github.com/RomainVialard/ErrorHandler)**: exponential backoff + Cloud Logging 정리. UrlFetchApp.fetch 래핑 권장.
- **[peterherrmann/GASRetry](https://gist.github.com/peterherrmann/2700284)**: 단순 exponential backoff (라이브러리 키 제공).
- **[dataful-tech/fetch-app](https://github.com/dataful-tech/fetch-app)**: UrlFetchApp의 retry/timeout 래퍼.

서드파티 라이브러리는 의존성/scope 추가 비용이 있으므로, 단순한 retry 함수는 자체 구현 권장.

## 함정

- **`Utilities.sleep`은 6분 budget을 소모한다.** 긴 backoff(30초+)를 여러 번 하면 본 작업 시간을 잃는다.
- **재시도가 무의미한 에러까지 재시도**: 4xx 클라이언트 에러는 보통 retry 무의미. 분류 함수가 중요.
- **트리거에서 throw 없으면 모니터링 사각지대**: catch 블록에서 swallow하면 실패가 보고되지 않음.
- **`muteHttpExceptions: false`(기본)이면 throw**: 외부 API의 4xx도 throw → try/catch 없으면 함수 전체 실패.
- **race condition + retry 조합**: 멱등성 없는 API를 retry하면 중복 처리. retry 전에 멱등 키 사용 또는 dedup 검사.
- **`Error` 객체 직렬화**: `JSON.stringify(err)`는 `{}`만 반환. `err.message`, `err.stack`을 명시적으로 꺼내야 한다.

## 참고

- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/reference/url-fetch/http-response
- https://developers.google.com/apps-script/manifest
- https://github.com/RomainVialard/ErrorHandler
- https://fargyle.medium.com/google-apps-script-retry-with-exponential-backoff-fb223ddad76d
