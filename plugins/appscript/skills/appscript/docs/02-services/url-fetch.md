# UrlFetchApp (URL Fetch Service)

> **출처**
> - https://developers.google.com/apps-script/reference/url-fetch
> - https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
> - https://developers.google.com/apps-script/reference/url-fetch/http-response
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

`UrlFetchApp`은 Apps Script에서 외부 HTTP/HTTPS 엔드포인트로 요청을 보내는 서비스다. REST API 호출, 웹훅 송신, 외부 데이터 수집 등에 사용한다.

**언제 쓰는가**
- Google이 제공하지 않는 서드파티 REST API 호출 (Slack, Notion, Stripe 등)
- Advanced Google Services로 커버되지 않는 Google API 원형 호출
- 다른 Apps Script 웹 앱이나 자체 백엔드 호출

**필요한 OAuth 스코프**
```
https://www.googleapis.com/auth/script.external_request
```

스크립트가 처음 `fetch()`를 호출하면 자동으로 권한 동의 화면이 뜬다. `appsscript.json`에 명시적으로 선언하는 것을 권장한다.

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

## 주요 메서드

### UrlFetchApp

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `fetch(url)` | `HTTPResponse` | 기본 GET 요청 |
| `fetch(url, params)` | `HTTPResponse` | 옵션이 있는 요청 |
| `fetchAll(requests)` | `HTTPResponse[]` | 병렬 배치 요청 |
| `getRequest(url)` | `Object` | 요청 객체 미리보기 (실제 호출 X) |
| `getRequest(url, params)` | `Object` | 동일, 옵션 포함 |

### `fetch(url, params)` 옵션

| 키 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `method` | `String` | `"get"` | `get`, `post`, `put`, `patch`, `delete` |
| `headers` | `Object` | `{}` | HTTP 헤더 (대소문자 무관) |
| `payload` | `String \| Object \| Blob \| Byte[]` | – | 요청 본문. 객체면 form-data 변환 |
| `contentType` | `String` | `application/x-www-form-urlencoded` | `payload`가 객체일 때만 자동 설정됨 |
| `followRedirects` | `Boolean` | `true` | 3xx 자동 추적 |
| `muteHttpExceptions` | `Boolean` | `false` | `true`면 4xx/5xx에도 throw 안 함 |
| `validateHttpsCertificates` | `Boolean` | `true` | self-signed 인증서 허용 여부 |
| `escaping` | `Boolean` | `true` | URL의 예약 문자 인코딩 |
| `timeoutSeconds` | `Integer` | `360` | 요청 완료를 기다리는 최대 시간(초). 기본 360초(=6분) |

### HTTPResponse

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getResponseCode()` | `Integer` | HTTP 상태 코드 (200, 404 등) |
| `getContentText()` | `String` | 본문 (기본 charset) |
| `getContentText(charset)` | `String` | 지정 charset 디코딩 |
| `getContent()` | `Byte[]` | 원시 바이너리 |
| `getHeaders()` | `Object` | 응답 헤더 (단일 값만) |
| `getAllHeaders()` | `Object` | 멀티 값은 배열로 |
| `getBlob()` | `Blob` | Blob 변환 |
| `getAs(contentType)` | `Blob` | MIME 변환 (PDF, image 등) |

## 코드 예제

### 1) GET + JSON 파싱

```javascript
function fetchUsers() {
  const res = UrlFetchApp.fetch('https://api.example.com/users');
  if (res.getResponseCode() !== 200) {
    throw new Error(`API error: ${res.getResponseCode()} ${res.getContentText()}`);
  }
  const users = JSON.parse(res.getContentText());
  return users;
}
```

### 2) JSON POST (Bearer 인증)

```javascript
function createIssue(token, title) {
  const res = UrlFetchApp.fetch('https://api.example.com/issues', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    payload: JSON.stringify({ title, status: 'open' }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 400) {
    console.error('createIssue failed', code, res.getContentText());
    throw new Error(`HTTP ${code}`);
  }
  return JSON.parse(res.getContentText());
}
```

`contentType: 'application/json'`을 명시하지 않으면 `payload`가 문자열이라도 기본값 `application/x-www-form-urlencoded`가 적용되어 서버가 본문을 못 읽는다.

### 3) Form 데이터 (객체 자동 변환)

```javascript
// payload가 객체면 application/x-www-form-urlencoded로 자동 변환
UrlFetchApp.fetch('https://example.com/form', {
  method: 'post',
  payload: { name: 'Wood', role: 'admin' },
});
```

### 4) multipart/form-data (파일 업로드)

`payload`에 `Blob`을 포함한 객체를 넘기면 Apps Script가 multipart로 인코딩한다.

```javascript
function uploadFile(fileBlob) {
  const res = UrlFetchApp.fetch('https://example.com/upload', {
    method: 'post',
    payload: {
      title: 'report',
      file: fileBlob, // Blob 그대로 전달
    },
  });
  return JSON.parse(res.getContentText());
}
```

`contentType`을 지정하면 자동 multipart 처리가 꺼지므로, multipart를 원하면 `contentType`은 비워둬야 한다. boundary를 직접 컨트롤하려면 본문 전체를 문자열로 구성하고 `contentType: 'multipart/form-data; boundary=...'`로 명시한다.

### 5) `fetchAll` 병렬 배치

```javascript
function fetchAllUsers(ids) {
  const requests = ids.map(id => ({
    url: `https://api.example.com/users/${id}`,
    method: 'get',
    headers: { Authorization: 'Bearer xxx' },
    muteHttpExceptions: true,
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  return responses.map(r => JSON.parse(r.getContentText()));
}
```

`fetchAll`은 내부적으로 병렬 실행되어 N개의 직렬 `fetch`보다 훨씬 빠르다. 단, 각 응답에서 `muteHttpExceptions`를 켜두지 않으면 하나만 실패해도 전체가 throw된다.

### 6) 바이너리 다운로드 → Drive 저장

```javascript
function downloadPdf(url) {
  const blob = UrlFetchApp.fetch(url).getBlob().setName('report.pdf');
  return DriveApp.createFile(blob);
}
```

### 7) 이미지 변환

```javascript
const pngBlob = UrlFetchApp.fetch('https://example.com/img').getAs('image/png');
```

## 일반적인 패턴

### OAuth 헤더 직접 구성

`OAuth2` 라이브러리(또는 `ScriptApp.getOAuthToken()`)로 액세스 토큰을 받아 헤더에 박는다.

```javascript
function callGoogleApiAsCurrentUser() {
  const token = ScriptApp.getOAuthToken();
  const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return JSON.parse(res.getContentText());
}
```

이때 `appsscript.json`의 `oauthScopes`에 호출 대상 API 스코프를 추가해야 한다. 그렇지 않으면 `getOAuthToken()`이 반환하는 토큰에 해당 권한이 없다.

### Retry with backoff

UrlFetch는 자동 재시도를 제공하지 않는다. 5xx/429 응답은 직접 백오프로 재시도해야 한다.

```javascript
function fetchWithRetry(url, params, maxAttempts = 5) {
  let delay = 500;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = UrlFetchApp.fetch(url, { ...params, muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code < 500 && code !== 429) return res;
    if (attempt === maxAttempts) return res;
    Utilities.sleep(delay + Math.floor(Math.random() * 200));
    delay *= 2;
  }
}
```

### `muteHttpExceptions` 가드 패턴

상태 코드 분기를 직접 처리하려면 항상 `muteHttpExceptions: true`로 두고 본문을 읽는다. 기본값(`false`)으로 두면 4xx/5xx에서 예외가 던져지고 본문 디버깅이 어려워진다.

### Webhook 검증 (HMAC)

```javascript
function verifySlackSignature(body, timestamp, signingSecret, slackSignature) {
  const base = `v0:${timestamp}:${body}`;
  const mac = Utilities.computeHmacSha256Signature(base, signingSecret);
  const hex = mac.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  const expected = `v0=${hex}`;
  return expected === slackSignature;
}
```

## 주의사항 / Quota / 함정

### 일일 호출 한도

| 항목 | Consumer 계정 | Workspace 계정 |
| --- | --- | --- |
| URL Fetch 호출 수 / 일 | 20,000 | 100,000 |

### 요청·응답 크기 제한

- **URL 길이**: 최대 2,082자
- **요청 본문(POST payload)**: 50 MB
- **응답 크기**: 50 MB
- **HTTP 헤더 수**: 최대 100개
- **개별 헤더 크기**: 8 KB

위 수치는 공식 quota 페이지 기준이며 Google이 사전 공지 없이 변경할 수 있다.

### 함정

1. **`contentType`을 안 줬는데 `payload`가 문자열인 경우**
   기본값이 `application/x-www-form-urlencoded`이므로 JSON 서버는 본문을 못 읽는다. JSON 보낼 땐 반드시 `contentType: 'application/json'`을 명시.

2. **`muteHttpExceptions`를 빠뜨림**
   기본값이 `false`이므로 4xx/5xx에서 즉시 throw된다. 본문에 에러 디테일이 들어 있을 텐데 안 보인다. API 호출 코드는 거의 항상 `true`로 두고 직접 분기하는 게 낫다.

3. **`payload` 객체에 `Blob`이 섞이면 multipart**
   순수 객체면 form-urlencoded지만, 하나라도 `Blob`이 있으면 multipart로 바뀐다. `contentType`을 명시하면 자동 처리가 꺼지므로 직접 본문을 구성해야 한다.

4. **요청 타임아웃은 `timeoutSeconds`로 조절**
   `fetch(url, { timeoutSeconds: N })`으로 요청당 최대 대기 시간을 초 단위로 지정할 수 있다(기본 `360`초=6분). 다만 개별 요청 타임아웃과 별개로 스크립트 전체 실행 한도(6분)에도 묶인다. 느린 서버 호출이 많다면 `fetchAll`로 병렬화하거나, 비동기 처리(트리거 분할)를 검토.

5. **`fetchAll` 도중 일부 실패 처리**
   `muteHttpExceptions: true`를 각 요청 객체에 박지 않으면 한 건 실패가 전체를 죽인다.

6. **redirect 동작**
   `followRedirects: false`로 두면 3xx 응답을 그대로 받게 된다. OAuth 콜백을 직접 처리하거나 Location 헤더를 검사해야 할 때 유용하다.

7. **사설망/IP 제한**
   공개 인터넷에서 도달 가능한 호스트만 호출 가능하다. VPC 내부 호스트는 호출 못 한다. 정적 IP가 필요한 화이트리스트 서버에서는 Google의 IP 대역이 변동적이라 IP 화이트리스트 대신 인증 토큰 기반 인증을 권장.

8. **`localhost`, `192.168.*`, `10.*` 호출 불가**
   샌드박스에서 차단된다.

## 참고

- UrlFetchApp 레퍼런스: https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
- HTTPResponse 레퍼런스: https://developers.google.com/apps-script/reference/url-fetch/http-response
- Quota: https://developers.google.com/apps-script/guides/services/quotas
- 관련 문서: `02-services/advanced-services.md`, `02-services/utilities.md`
