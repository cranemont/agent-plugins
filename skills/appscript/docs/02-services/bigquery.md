# BigQuery (Advanced Service)

> **출처**
> - https://developers.google.com/apps-script/advanced/bigquery
> - https://developers.google.com/apps-script/guides/services/advanced
> - https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
> - https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
> - https://developers.google.com/apps-script/concepts/scopes
> - https://cloud.google.com/bigquery/pricing
>
> **최종 확인일**: 2026-07-22

## 개요

**BigQuery service**는 Apps Script의 **Advanced Service**다. 공식 문서는 이렇게 못박는다:

> "The BigQuery service uses the same objects, methods, and parameters as the public API."

즉, `BigQuery.*` 로 부르는 메서드·요청 필드·응답 구조는 **BigQuery REST API v2와 동일**하다. 별도의 Apps Script 전용 문법을 외울 필요 없이, REST v2 스펙(`jobs.query`, `jobs.getQueryResults` 등)을 그대로 참조하면 된다. 응답은 built-in 서비스의 메서드 체인이 아니라 **plain object**이므로 `res.rows[0].f[0].v`처럼 깊은 경로로 접근한다.

**대시보드 용도 맥락**: 시트/BigQuery 기반 대시보드를 `HtmlService` 웹앱으로 만들 때, 클라이언트에서 `google.script.run`으로 서버 함수를 호출 → 서버가 `BigQuery.Jobs.query`로 데이터를 받아 파싱 → 표/차트로 반환하는 구조가 표준이다. 비용과 6분 실행 한도 때문에 **결과 캐싱**(`CacheService`)이 사실상 필수다.

## 셋업 전제

BigQuery를 쓰려면 다음이 모두 충족돼야 한다.

| # | 전제 | 설명 |
| --- | --- | --- |
| 1 | **Advanced Service 활성화** | Apps Script 에디터 **Services**에서 BigQuery API 추가 (또는 매니페스트에 선언) |
| 2 | **GCP 프로젝트 + project ID** | 모든 호출에 billing/실행 주체가 될 `projectId`가 필요 |
| 3 | **BigQuery API enable** | 표준(Standard) GCP 프로젝트라면 Cloud Console에서 BigQuery API를 직접 켜야 함 (기본 프로젝트는 서비스 추가 시 자동) |
| 4 | **Billing 연결** | 쿼리를 돌리려면 프로젝트에 **결제 계정(billing account)** 이 연결돼 있어야 함 |

### 비용 / 무료 등급 (공식 pricing 기준)

- **on-demand 요금**은 쿼리가 스캔한 **바이트 수**로 과금된다(TiB 단위).
- **무료 등급**: 월 **1 TiB** 쿼리 처리 + **10 GiB** 스토리지가 무료.
- 무료 등급을 넘겨 과금이 발생하려면 프로젝트에 **billing account가 연결**돼 있어야 한다. 즉 무료 한도 안이라도 실사용 프로젝트에는 결제 계정 연결을 권장.

> 정확한 단가·에디션별 요금은 변동되므로 실제 값은 pricing 페이지에서 확인.

### 표준 GCP 프로젝트 연결

BigQuery 호출에는 항상 `projectId`가 들어가므로, Apps Script 프로젝트를 **표준 GCP 프로젝트**에 연결해두는 편이 관리상 유리하다(quota·billing·API enable을 한 곳에서 통제). 기본(Default) 프로젝트로도 동작은 하지만, 조직 대시보드처럼 billing이 중요한 경우 표준 프로젝트 연결이 사실상 필수다. (연결 절차 자체는 `02-services/advanced-services.md` 참고.)

## OAuth 스코프

BigQuery 호출에 필요한 스코프는 코드 스캔으로 **자동 추가**되지만, 배포용 스크립트는 매니페스트에 명시하는 것이 안전하다. `jobs.getQueryResults`·`jobs.query`의 공식 Authorization Scopes:

| 스코프 | 용도 |
| --- | --- |
| `https://www.googleapis.com/auth/bigquery` | BigQuery 데이터 조회·관리 (기본 full 스코프) |
| `https://www.googleapis.com/auth/bigquery.readonly` | 읽기 전용 (조회만) |
| `https://www.googleapis.com/auth/cloud-platform` | GCP 전체 (광범위) |
| `https://www.googleapis.com/auth/cloud-platform.read-only` | GCP 전체 읽기 전용 |

대시보드에서 쿼리만 돌린다면 **`bigquery.readonly`** 로 최소 권한을 지향한다.

### 매니페스트 (`appsscript.json`)

```json
{
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "BigQuery",
        "version": "v2",
        "serviceId": "bigquery"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/bigquery.readonly"
  ]
}
```

- `userSymbol`: 코드에서 부를 전역 이름 (`BigQuery`).
- `version`: BigQuery API 버전 (`v2`).
- `serviceId`: `bigquery`.
- 에디터에서 서비스를 추가하면 위 `enabledAdvancedServices` 항목이 자동 기입된다.

## 핵심 쿼리 패턴

전체 흐름은 **query 제출 → jobComplete 될 때까지 폴링 → rows 읽기 → pageToken으로 페이지네이션**이다.

```
BigQuery.Jobs.query(request, projectId)          // 쿼리 제출, QueryResponse 반환
  → jobComplete === false 면 폴링:
BigQuery.Jobs.getQueryResults(projectId, jobId, {timeoutMs, pageToken, startIndex, maxResults, location})
  → rows 누적, pageToken 있으면 다음 페이지 반복
```

### 주요 메서드

| 메서드 | 시그니처 | 설명 |
| --- | --- | --- |
| `BigQuery.Jobs.query` | `(request, projectId)` | 쿼리를 제출하고 첫 결과(`QueryResponse`)를 반환. `timeoutMs` 안에 끝나면 `rows`까지 옴 |
| `BigQuery.Jobs.getQueryResults` | `(projectId, jobId, options?)` | 진행 중인 job의 결과를 폴링/페이지네이션으로 조회 |
| `BigQuery.Jobs.insert` | `(job, projectId, mediaData?)` | 비동기 job 생성(load/query job). 대용량 쿼리를 async로 돌릴 때 |
| `BigQuery.Tables.insert` | `(table, projectId, datasetId)` | 테이블 생성 |

> `getQueryResults`는 GET이라 요청 body가 없고, 옵션은 마지막 인자 객체(`{ pageToken, timeoutMs, ... }`)로 전달한다. REST 엔드포인트는 `GET /projects/{projectId}/queries/{jobId}`.

### 요청(`QueryRequest`) 주요 필드

`BigQuery.Jobs.query(request, ...)`의 `request` 객체에 넣는 필드 (REST v2 스펙과 동일).

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `query` | string | 실행할 SQL |
| `useLegacySql` | boolean | Legacy SQL 여부. **표준 SQL 쓰려면 `false`** (거의 항상 false) |
| `timeoutMs` | integer | 이 시간 안에 끝나면 `query`가 결과까지 반환. 초과 시 `jobComplete: false` |
| `maxResults` | integer | 반환 최대 행 수(한 페이지) |
| `maximumBytesBilled` | string | 과금 상한 바이트. 초과하면 쿼리 실패 → **비용 폭탄 방지 가드** |
| `dryRun` | boolean | 실행 없이 검증 + 스캔 예상 바이트(`totalBytesProcessed`)만 반환 |
| `useQueryCache` | boolean | BigQuery 자체 결과 캐시 사용 여부(기본 true) |
| `defaultDataset` | object | 테이블명이 unqualified일 때 기본 데이터셋 |
| `parameterMode` | string | `POSITIONAL` 또는 `NAMED` (파라미터 쿼리) |
| `queryParameters` | array | 파라미터 쿼리용 값들 (SQL 인젝션 방지) |
| `location` | string | 데이터셋 리전(예: `US`, `asia-northeast3`) |
| `labels` | object | job에 붙일 사용자 정의 라벨 |

### 응답(`QueryResponse` / `GetQueryResultsResponse`) 주요 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `jobComplete` | boolean | job 완료 여부. **false면 폴링 필요** |
| `jobReference.jobId` | string | 폴링에 쓸 job 식별자 |
| `schema.fields[].name` | string | 컬럼명 |
| `schema.fields[].type` | string | 컬럼 타입(`STRING`, `INTEGER`, `FLOAT`, `TIMESTAMP`, …) |
| `schema.fields[].mode` | string | `NULLABLE` / `REQUIRED` / `REPEATED` |
| `rows[].f[].v` | string \| object | 셀 값. **스칼라는 문자열**, 중첩/반복은 객체 |
| `pageToken` | string | 다음 페이지 토큰. 없으면 마지막 페이지 |
| `totalRows` | string | 전체 행 수(문자열) |
| `totalBytesProcessed` | string | 스캔한 바이트 수 → **비용 추정 근거** |
| `cacheHit` | boolean | BigQuery 결과 캐시에서 나왔는지 (true면 과금 없음) |
| `numDmlAffectedRows` | string | DML(INSERT/UPDATE/DELETE) 영향 행 수 |
| `errors` | array | 에러 상세 |

## 결과 파싱

응답의 `rows[].f[].v`는 **컬럼명이 없는 위치 기반** 구조다. `schema.fields[].name`과 zip 해서 객체 배열로 바꾸는 헬퍼를 만들어 쓴다. 스칼라 값이 **전부 문자열**로 오므로, 숫자/타임스탬프는 직접 변환해야 한다.

```javascript
/**
 * BigQuery QueryResponse -> 객체 배열
 * @param {Object} res  jobs.query / getQueryResults 응답
 * @return {Object[]}   [{col1: v, col2: v}, ...]
 */
function bqRowsToObjects(res) {
  if (!res.rows || !res.schema) return [];
  const fields = res.schema.fields; // [{name, type, mode}, ...]
  return res.rows.map(row => {
    const obj = {};
    row.f.forEach((cell, i) => {
      obj[fields[i].name] = coerce(cell.v, fields[i].type);
    });
    return obj;
  });
}

function coerce(v, type) {
  if (v === null || v === undefined) return null;
  switch (type) {
    case 'INTEGER':
    case 'INT64':
      return Number(v);
    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
      return parseFloat(v);
    case 'BOOLEAN':
    case 'BOOL':
      return v === 'true' || v === true;
    case 'TIMESTAMP':
      // BigQuery TIMESTAMP는 epoch seconds(문자열)로 옴
      return new Date(parseFloat(v) * 1000);
    default:
      return v; // STRING 등
  }
}
```

## 코드 예제 (V8)

### 1) 공개 데이터셋 쿼리 → 로그

`bigquery-public-data`는 무료로 열려 있어 셋업 검증에 좋다. 단, **스캔 바이트는 내 프로젝트에 과금**되므로 `LIMIT`·컬럼 제한은 습관.

```javascript
function quickQuery() {
  const projectId = 'my-gcp-project-id'; // billing 주체
  const request = {
    query: 'SELECT name, SUM(number) AS total ' +
           'FROM `bigquery-public-data.usa_names.usa_1910_2013` ' +
           "WHERE state = 'TX' " +
           'GROUP BY name ORDER BY total DESC LIMIT 10',
    useLegacySql: false,
  };

  const res = BigQuery.Jobs.query(request, projectId);
  const objects = bqRowsToObjects(res);
  objects.forEach(r => console.log(`${r.name}: ${r.total}`));
}
```

### 2) 폴링 + 페이지네이션 + 시트 기록

`query` 한 번으로 끝나지 않는 경우(큰 쿼리, timeout 초과)를 안전하게 처리하는 완전한 패턴.

```javascript
function runQueryToSheet() {
  const projectId = 'my-gcp-project-id';
  const request = {
    query: 'SELECT name, gender, SUM(number) AS total ' +
           'FROM `bigquery-public-data.usa_names.usa_1910_2013` ' +
           'GROUP BY name, gender ORDER BY total DESC LIMIT 5000',
    useLegacySql: false,
    timeoutMs: 30000,
    maximumBytesBilled: String(5 * 1024 * 1024 * 1024), // 5 GiB 상한
  };

  // 1. 제출
  let res = BigQuery.Jobs.query(request, projectId);
  const jobId = res.jobReference.jobId;
  const location = res.jobReference.location; // 폴링 시 같은 location 전달

  // 2. jobComplete 될 때까지 폴링 (exponential backoff)
  let sleepMs = 500;
  while (!res.jobComplete) {
    Utilities.sleep(sleepMs);
    sleepMs = Math.min(sleepMs * 2, 10000);
    res = BigQuery.Jobs.getQueryResults(projectId, jobId, { location });
  }

  // 3. pageToken으로 전체 행 누적
  let rows = res.rows || [];
  while (res.pageToken) {
    res = BigQuery.Jobs.getQueryResults(projectId, jobId, {
      pageToken: res.pageToken,
      location,
    });
    rows = rows.concat(res.rows || []);
  }

  // 4. 시트에 기록 (헤더 + 값, setValues 한 번)
  const headers = res.schema.fields.map(f => f.name);
  const data = rows.map(r => r.f.map(cell => cell.v));
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('bq_result') ||
    SpreadsheetApp.getActiveSpreadsheet().insertSheet('bq_result');

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (data.length) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
  console.log(`${data.length}행 기록, 스캔 ${res.totalBytesProcessed} bytes`);
}
```

### 3) HtmlService 웹앱 서버 함수 (캐싱 포함)

대시보드 클라이언트가 `google.script.run.dashboardData()`로 호출한다. 결과는 `CacheService`에 캐싱해 비용·지연을 줄인다.

```javascript
// --- 서버 (Code.gs) ---
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BQ Dashboard');
}

/** 클라이언트가 google.script.run 으로 호출. 객체 배열 반환 */
function dashboardData() {
  const cache = CacheService.getScriptCache();
  const key = 'dash:top_names';

  const cached = cache.get(key);
  if (cached) return JSON.parse(cached); // 캐시 히트 → 쿼리·과금 스킵

  const projectId = 'my-gcp-project-id';
  const res = BigQuery.Jobs.query({
    query: 'SELECT name, SUM(number) AS total ' +
           'FROM `bigquery-public-data.usa_names.usa_1910_2013` ' +
           'GROUP BY name ORDER BY total DESC LIMIT 20',
    useLegacySql: false,
    timeoutMs: 30000,
  }, projectId);

  const data = bqRowsToObjects(res); // [{name, total}, ...]
  cache.put(key, JSON.stringify(data), 3600); // 1시간 캐싱
  return data;
}
```

```html
<!-- index.html (client) -->
<div id="out">로딩...</div>
<script>
  google.script.run
    .withSuccessHandler(rows => {
      document.getElementById('out').innerHTML =
        rows.map(r => `${r.name}: ${r.total}`).join('<br>');
      // 실제로는 Chart 라이브러리에 rows를 그대로 바인딩
    })
    .withFailureHandler(e => {
      document.getElementById('out').textContent = '오류: ' + e.message;
    })
    .dashboardData();
</script>
```

> `google.script.run` 은 **직렬화 가능한 값만** 주고받는다. Date 등은 서버에서 문자열/숫자로 변환해 넘길 것. 자세한 건 `04-web-apps/client-server-comm.md`.

### 4) dryRun 으로 비용 미리 추정

실행 전 스캔 바이트를 확인해 예산을 검증한다.

```javascript
function estimateCost() {
  const res = BigQuery.Jobs.query({
    query: 'SELECT * FROM `bigquery-public-data.usa_names.usa_1910_2013`',
    useLegacySql: false,
    dryRun: true, // 실행 안 함, 통계만
  }, 'my-gcp-project-id');

  const bytes = Number(res.totalBytesProcessed);
  const gib = bytes / (1024 ** 3);
  console.log(`예상 스캔: ${gib.toFixed(2)} GiB`);
  return gib;
}
```

## 주의사항 / 비용 / 함정

1. **`useLegacySql: false` 를 빼먹지 말 것**
   생략하면 Legacy SQL로 해석돼 백틱 테이블 표기(`` `proj.dataset.table` ``)나 표준 함수가 깨진다. 표준 SQL 쓰려면 항상 명시.

2. **비용은 "스캔한 바이트"로 과금 (반환 행 수 아님)**
   `SELECT *`는 전 컬럼을 스캔한다. **필요한 컬럼만 SELECT**, 파티션/클러스터 필터를 걸어 스캔 범위를 줄이는 게 비용 절감의 핵심.

3. **`maximumBytesBilled`로 상한을 걸어라**
   실수로 큰 테이블을 풀스캔하는 쿼리가 나가면 과금이 크다. 상한 초과 시 쿼리가 실패하므로 안전판이 된다.

4. **`dryRun`으로 사전 추정**
   운영 쿼리는 배포 전 `dryRun: true`로 `totalBytesProcessed`를 찍어 예산을 검증.

5. **결과를 CacheService에 캐싱**
   대시보드처럼 같은 쿼리를 반복 호출하면 매번 과금·지연이 발생한다. `CacheService`로 캐싱(최대 6시간)하면 비용과 latency를 크게 줄인다(예제 3). 큰 결과는 100 KB 값 한계에 주의 → `02-services/cache.md`.

6. **6분 실행 한도**
   Apps Script 함수 1회 실행은 **6분** 제한(공식 quotas 표 기준 전 계정 동일)이다. 큰 쿼리는:
   - `query`의 `timeoutMs`를 넘기지 말고, `getQueryResults` 폴링으로 결과를 나눠 받거나
   - job을 async로 돌리고(`Jobs.insert`) 다음 트리거 실행에서 이어받는 식으로 분할.
   한도 상세는 `06-quotas/quotas-and-limits.md`.

7. **결과 대량이면 페이지네이션 필수**
   `rows`는 한 번에 다 오지 않는다. `pageToken`이 있으면 끝까지 반복(예제 2). 시트 기록은 페이지마다 append하지 말고 모아서 `setValues` 한 번 → `08-patterns/performance-patterns.md`.

8. **셀 값은 전부 문자열**
   `rows[].f[].v`는 스칼라도 문자열로 온다. 숫자/불리언/타임스탬프는 스키마 `type`을 보고 직접 변환(예제 파싱 헬퍼). `TIMESTAMP`는 epoch seconds 문자열.

9. **폴링 시 `location` 일관성**
   데이터셋이 `US`가 아닌 리전(예: `asia-northeast3`)이면 `getQueryResults`에도 같은 `location`을 넘겨야 job을 찾는다.

10. **표준 GCP 프로젝트 + BigQuery API enable 누락 → 403**
    직접 연결한 프로젝트는 Cloud Console에서 BigQuery API를 켜야 한다. billing 미연결이면 쿼리 실행 자체가 막힌다.

11. **에러는 `GoogleJsonResponseException`**
    Advanced 서비스 공통. `try/catch`에서 메시지/`e.details`로 분기. 응답 안의 `errors` 배열도 확인.

12. **`google.script.run`으로 큰 결과를 통째로 넘기지 말 것**
    수만 행을 클라이언트로 직렬화하면 느리고 실패한다. 서버에서 집계/요약해서 넘기거나 페이지 단위로 전달.

## 참고

- BigQuery Service (Apps Script): https://developers.google.com/apps-script/advanced/bigquery
- Advanced Services guide: https://developers.google.com/apps-script/guides/services/advanced
- jobs.query (REST v2): https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
- jobs.getQueryResults (REST v2): https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- 관련 문서:
  - `02-services/advanced-services.md` — Advanced Service 활성화·호출 규칙
  - `02-services/cache.md` — 쿼리 결과 캐싱
  - `04-web-apps/html-service.md` — 대시보드 웹앱 UI
  - `04-web-apps/client-server-comm.md` — `google.script.run` 서버·클라이언트 통신
  - `08-patterns/performance-patterns.md` — 배치 기록·페이지네이션 최적화
  - `06-quotas/quotas-and-limits.md` — 6분 실행 한도 등 quota
  - `05-auth/oauth-scopes.md` — OAuth 스코프 선언
