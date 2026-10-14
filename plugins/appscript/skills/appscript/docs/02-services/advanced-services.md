# Advanced Google Services

> **출처**
> - https://developers.google.com/apps-script/guides/services/advanced
> - https://developers.google.com/apps-script/advanced
>
> **최종 확인일**: 2026-07-22

## 개요

**Advanced Google Services**는 Apps Script에서 사용할 수 있는 **Google API의 얇은 래퍼**다. 내장(built-in) 서비스인 `SpreadsheetApp`, `DriveApp`, `GmailApp` 등과 달리, 해당 Google API(REST)에 거의 1:1로 매핑되는 메서드를 제공한다.

**핵심 특징**
- 내장 서비스처럼 자동완성 및 권한 흐름 처리.
- 그러나 사용 전 **각 서비스를 명시적으로 활성화**해야 한다.
- 기본 서비스가 제공하지 않는 **고급 기능(batch update, raw REST 필드 접근, 신규 API 메서드 등)**을 노출한다.

## Advanced vs Built-in vs UrlFetch

| 측면 | Built-in | Advanced | UrlFetch (raw REST) |
| --- | --- | --- | --- |
| 호출 형태 | `SpreadsheetApp.getActiveSheet()...` | `Sheets.Spreadsheets.batchUpdate(...)` | `UrlFetchApp.fetch(url, {...})` |
| 자동완성 | O | O | X |
| 권한 자동 처리 | O | O | 수동 (`appsscript.json` + 토큰) |
| API 커버리지 | 큐레이션된 서브셋 | API의 거의 전부 | 100% |
| 호출 비용 카운팅 | UrlFetch에 잡히지 않음 | UrlFetch에 잡히지 않음 | UrlFetch quota 차감 |
| 학습 곡선 | 낮음 | 중 (REST 문서 필요) | 높음 |

**선택 기준**
- 일상적인 CRUD → Built-in
- 배치 업데이트, 셀 메타데이터, 차트 객체 등 깊은 기능 → Advanced
- Apps Script Advanced에 없는 신규 Google API 또는 비-Google API → UrlFetch

## 활성화 방법

### 방법 1. 에디터에서 활성화

1. Apps Script 프로젝트 열기.
2. 좌측 **Editor** 패널의 **Services** 옆 `+` 클릭.
3. 목록에서 원하는 서비스(예: Sheets, Drive, Calendar) 선택.
4. **Identifier**(전역 식별자, 기본 `Sheets`, `Drive` 등) 및 **Version** 확인 후 **Add**.

활성화하면 코드에서 곧바로 `Sheets.Spreadsheets.values.get(...)`처럼 사용 가능.

### 방법 2. 매니페스트 (`appsscript.json`)

```json
{
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Sheets",
        "version": "v4",
        "serviceId": "sheets"
      },
      {
        "userSymbol": "Drive",
        "version": "v3",
        "serviceId": "drive"
      }
    ]
  }
}
```

- `userSymbol`: 코드 안에서 부를 전역 이름.
- `version`: API 버전 (`v3`, `v4`, `v1` 등 서비스마다 다름).
- `serviceId`: Cloud Discovery의 서비스 ID.

### Cloud Project 설정

- **기본 GCP 프로젝트(Default)**: 추가 작업 없이 활성화 시 자동으로 API가 켜진다.
- **표준 GCP 프로젝트(Standard, 직접 연결한 경우)**: Google Cloud Console에서 해당 API를 **직접 enable** 해야 한다. 안 그러면 호출 시 403.

## 사용 가능한 Advanced Services (대표)

전체 목록은 공식 인덱스 페이지(`https://developers.google.com/apps-script/advanced`)에서 확인. 다음은 자주 쓰는 것들.

**Google Workspace**
- Admin SDK (Directory, Reports, Licensing, Groups Migration, Groups Settings, Reseller)
- Calendar API
- Chat API
- Classroom API
- Cloud Identity Groups API
- Docs API
- Drive API, Drive Activity API, Drive Labels API
- Gmail API
- People API
- Sheets API
- Slides API
- Tasks API

**Google 서비스**
- Analytics Data API, Analytics Admin API
- BigQuery API
- Google Maps APIs
- Vertex AI API
- YouTube Data API, YouTube Analytics API, YouTube Content ID API

**광고·비즈니스 도구**
- AdSense Management API
- Display & Video 360 API
- DoubleClick Bid Manager API
- DCM/DFA Reporting and Trafficking API
- Merchant API, Content API for Shopping

목록은 변경되니 최신은 공식 페이지를 확인.

## 호출 패턴

Advanced Service 호출 시그니처는 보통 다음 순서를 따른다.

```
ServiceName.Resource.method(
  requestBody,    // POST/PUT/PATCH면 body
  pathParam1,     // path 파라미터 (필수 위치 인자)
  pathParam2,
  mediaBlob,      // 미디어 업로드 (있을 때만)
  optionalParams, // 객체: query string 등
  headers         // 객체: HTTP 헤더
)
```

주의: `delete`는 JS 예약어라 메서드 이름이 `remove`로 바뀐다.

### 1) Sheets — batchUpdate

```javascript
function setHeader(spreadsheetId) {
  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        {
          updateCells: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            rows: [{
              values: [
                { userEnteredValue: { stringValue: 'id' } },
                { userEnteredValue: { stringValue: 'name' } },
              ],
            }],
            fields: 'userEnteredValue',
          },
        },
      ],
    },
    spreadsheetId
  );
}
```

`SpreadsheetApp`에는 없는 정밀한 셀 메타데이터(formatting, validation, charts) 조작이 가능하다.

### 2) Sheets — values.get / values.update

```javascript
function readRange(id) {
  const res = Sheets.Spreadsheets.Values.get(id, 'Sheet1!A1:C10');
  return res.values || [];
}

function writeRange(id) {
  Sheets.Spreadsheets.Values.update(
    { values: [['a', 'b'], ['c', 'd']] },
    id,
    'Sheet1!A1:B2',
    { valueInputOption: 'RAW' }
  );
}
```

### 3) Drive v3 — 파일 검색

```javascript
function listRecent() {
  const res = Drive.Files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    orderBy: 'modifiedTime desc',
    pageSize: 20,
    fields: 'files(id,name,modifiedTime)',
  });
  return res.files;
}
```

`fields`로 필요한 필드만 가져와 응답 크기·속도 최적화.

### 4) Calendar — 이벤트 삽입

```javascript
function addEvent(calendarId) {
  Calendar.Events.insert(
    {
      summary: 'Meeting',
      start: { dateTime: '2026-05-12T10:00:00+09:00' },
      end:   { dateTime: '2026-05-12T11:00:00+09:00' },
    },
    calendarId
  );
}
```

### 5) Gmail — 메시지 본문(원본 RFC 822)

```javascript
function getRaw(messageId) {
  const msg = Gmail.Users.Messages.get('me', messageId, { format: 'raw' });
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(msg.raw)).getDataAsString();
}
```

`GmailApp`에는 raw RFC 822를 직접 받는 인터페이스가 없다. Advanced Gmail로 가야 함.

### 6) BigQuery — 쿼리 실행

```javascript
function query() {
  const job = BigQuery.Jobs.query(
    { query: 'SELECT name FROM `bigquery-public-data.usa_names.usa_1910_2013` LIMIT 5', useLegacySql: false },
    'my-gcp-project-id'
  );
  return job.rows.map(r => r.f[0].v);
}
```

BigQuery는 GCP 프로젝트 ID가 필수다. **표준 GCP 프로젝트** 연결이 거의 필수.

### 7) Admin SDK — 사용자 목록

```javascript
function listUsers() {
  const res = AdminDirectory.Users.list({ customer: 'my_customer', maxResults: 100 });
  return res.users || [];
}
```

도메인 관리자 권한 필요.

### 8) `remove` (delete의 별명)

```javascript
Drive.Files.remove(fileId); // Drive.Files.delete 가 아니라 remove
```

## 일반적인 패턴

### 부분 응답 (`fields`)

Advanced 서비스 대부분은 `fields` 마스크를 지원한다. 필요한 필드만 받으면 응답 크기와 latency가 줄고 quota 부담도 적다.

```javascript
Drive.Files.list({ fields: 'files(id,name)' });
```

### Batch update

Sheets, Calendar 등 `batchUpdate` 메서드는 한 번의 호출로 다수 작업을 처리한다. 루프에서 `setValue`를 N번 부르는 것보다 훨씬 빠르고 quota도 적게 쓴다.

### 페이지네이션

`pageToken`을 사용한다.

```javascript
function listAllFiles() {
  let pageToken = null;
  const all = [];
  do {
    const res = Drive.Files.list({ pageSize: 100, pageToken, fields: 'nextPageToken,files(id,name)' });
    all.push(...res.files);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}
```

### 에러 처리

Advanced 서비스는 호출 실패 시 `GoogleJsonResponseException`을 던진다. `try/catch`에서 `e.details` 또는 `e.message`를 보고 분기.

```javascript
try {
  Drive.Files.get(id);
} catch (e) {
  if (String(e).includes('File not found')) return null;
  throw e;
}
```

### Built-in과 혼용

`SpreadsheetApp`(편의)과 `Sheets`(저수준)를 같은 스크립트에서 함께 써도 된다. 보통 CRUD는 built-in, 정밀 작업만 Advanced로.

## 주의사항 / Quota / 함정

1. **활성화를 잊으면 `ReferenceError: Sheets is not defined`**
   에디터 Services 패널 + 매니페스트 둘 다 확인.

2. **표준 GCP 프로젝트 + API enable 누락**
   직접 연결한 GCP 프로젝트에서는 Google Cloud Console에서 해당 API(Sheets API, Drive API 등)를 직접 활성화해야 한다. 기본(Default) 프로젝트에서는 자동.

3. **`delete` 대신 `remove`**
   JS 예약어 충돌로 메서드명이 바뀐다.

4. **Quota는 해당 Google API의 quota를 따른다**
   Advanced 호출은 UrlFetch quota가 아니라 **해당 API의 quota**(예: Sheets API 분당 요청 수)에 잡힌다. 무거운 batch는 GCP Console의 quota 화면에서 모니터링.

5. **버전 차이**
   `version`을 잘못 박으면 메서드 시그니처가 다르다. 예: Drive `v2`와 `v3`는 파라미터 명칭과 응답 구조가 다르다. 공식 REST 문서를 버전 맞춰 참조.

6. **OAuth 스코프**
   Advanced 호출에 필요한 스코프는 첫 호출에서 자동으로 추가되지만, 매니페스트에 명시해두는 것이 안전(특히 Workspace 마켓플레이스 배포 시 강제).

7. **응답 객체 구조가 REST와 동일**
   built-in의 메서드 체인과 달리 응답은 plain object다. 깊은 경로 접근 (`res.values[0][0]`)에 익숙해져야 한다.

8. **새 API 메서드 반영 지연**
   Google이 REST API에 새 메서드를 추가해도 Advanced wrapper에 들어오기까지 시간차가 있을 수 있다. 즉시 필요하면 UrlFetch + `ScriptApp.getOAuthToken()`으로 직접 호출.

9. **media upload는 별도 인자**
   파일 업로드는 `Drive.Files.create(metadata, blob)`처럼 Blob을 따로 받는다. metadata와 본문을 한 객체에 섞지 말 것.

10. **에러는 보통 `GoogleJsonResponseException`**
    상태 코드는 `e.details.code`(존재 시) 또는 메시지 파싱으로 추출.

## 참고

- Advanced Services guide: https://developers.google.com/apps-script/guides/services/advanced
- 전체 인덱스: https://developers.google.com/apps-script/advanced
- 관련 문서: `02-services/url-fetch.md`, `05-auth/`, `06-quotas/`
