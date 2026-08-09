# 보안 베스트 프랙티스

> **출처**
> - https://developers.google.com/apps-script/guides/html/templates
> - https://developers.google.com/apps-script/guides/html/restrictions
> - https://developers.google.com/apps-script/guides/web (Web app access/executeAs)
> - https://developers.google.com/apps-script/guides/services/authorization
> - https://developers.google.com/apps-script/manifest (`oauthScopes`)
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script는 Google 계정의 데이터(Drive, Gmail, Calendar, Sheets...)에 직접 접근하므로 보안 사고의 폭이 크다. 가장 자주 발생하는 문제:

1. **XSS** — HtmlService로 사용자 입력을 출력할 때 escape 누락
2. **공개 webhook 누구나 호출** — `doPost`에 시크릿 검증 없음
3. **소스코드에 API 키 박힘**
4. **"Execute as me" 웹앱의 권한 escalation**
5. **OAuth scope 과잉 요청**
6. **알 수 없는 라이브러리의 코드 실행**

## 1. HTML Service — XSS 방지

`HtmlService.createTemplateFromFile`은 세 종류 스크립틀릿을 지원한다:

| 문법 | 동작 | 안전성 |
|------|------|--------|
| `<? ... ?>` | 실행만, 출력 없음 | — |
| `<?= ... ?>` | 결과를 출력. **컨텍스트별 자동 escape** | 안전 (기본 선택지) |
| `<?!= ... ?>` | 결과를 **escape 없이** 그대로 출력 | 위험 |

### 안전: 자동 escape (`<?= ?>`)

```html
<!-- 사용자 입력이 들어와도 HTML로 해석되지 않음 -->
<p>안녕, <?= userName ?>!</p>
```

`userName`이 `<script>alert(1)</script>`이면 `&lt;script&gt;alert(1)&lt;/script&gt;`로 출력된다.

자동 escape는 **출력 컨텍스트에 맞춰** 다르게 작동한다:
- HTML body 안: HTML entity escape
- 속성 안: 속성 escape
- `<script>` 태그 안: JavaScript string escape

```html
<a href="/profile?id=<?= id ?>">링크</a>     <!-- 속성 escape -->
<script>
  const name = "<?= userName ?>";              <!-- JS string escape -->
</script>
```

### 위험: 강제 출력 (`<?!= ?>`)

```html
<!-- HTML/JS를 그대로 끼워 넣음 — 사용자 입력에 절대 X -->
<div><?!= safelyGeneratedHtml ?></div>
```

> "use printing scriptlets rather than force-printing scriptlets unless you know that you need to print HTML or JavaScript unchanged."

**원칙**: 사용자가 영향을 주는 어떤 값도 `<?!= ?>`로 출력하지 않는다. 미리 정해진 HTML 조각(템플릿 부분)만 허용.

### 그래도 안전한 경우

- `<?!= include('header') ?>` — `include`가 신뢰된 정적 HTML 파일 반환
- 자체 sanitize 거친 결과 (DOMPurify 등)
- 본인이 만든 정해진 마크업

## 2. HTML Service의 샌드박스

모든 HtmlService 출력은 **iframe** 안에서 동작한다 (IFRAME 모드 — 유일 옵션).

샌드박스 속성:
- `allow-same-origin`, `allow-forms`, `allow-scripts`, `allow-popups`, `allow-downloads`, `allow-modals`, `allow-popups-to-escape-sandbox`
- `allow-top-navigation` **없음** — top-level navigation 차단

함의:
- HTTP 리소스 로딩 금지 — JS/CSS/XHR은 모두 HTTPS여야 함
- `window.parent`로 호스트 페이지 조작 불가
- 링크는 `target="_top"` 또는 `target="_blank"`로 새 창
- 직접 cookie 조작은 sandbox origin 안에서만

## 3. google.script.run — 인자 검증

클라이언트 사이드 JS에서 서버 함수 호출:

```html
<script>
  google.script.run
    .withSuccessHandler(onOk)
    .processFormData({ name: nameInput.value, age: ageInput.value });
</script>
```

서버는 **클라이언트가 보낸 데이터를 신뢰하지 않아야 한다.** 항상 검증:

```javascript
function processFormData(payload) {
  // 타입/형식 검증
  if (typeof payload !== 'object' || payload === null) throw new Error('invalid payload');
  if (typeof payload.name !== 'string' || payload.name.length > 100) throw new Error('name invalid');
  const age = Number(payload.age);
  if (!Number.isInteger(age) || age < 0 || age > 150) throw new Error('age invalid');

  // 권한 체크 (필요 시)
  const user = Session.getActiveUser().getEmail();
  if (!isAuthorizedUser_(user)) throw new Error('forbidden');

  // 안전한 작업
  saveUser_(payload.name, age);
}
```

`google.script.run`은 직렬화 가능한 값(JSON, Date, Blob)만 전달 — Date도 string 변환 후 전송 후 복원되므로 timezone 주의.

## 4. doPost / doGet — 공개 웹앱 보안

웹앱은 누구나 호출할 수 있게 배포되는 경우가 많다(예: Slack outgoing webhook). 인증을 직접 구현해야 한다.

### 패턴: shared secret

```javascript
function doPost(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  const provided = e.parameter.secret || JSON.parse(e.postData?.contents || '{}').secret;
  if (provided !== expected) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  // 처리
}
```

### 패턴: HMAC 서명

```javascript
function verifySignature_(rawBody, providedSig) {
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  const computed = Utilities.computeHmacSha256Signature(rawBody, secret);
  const computedHex = computed.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  return constantTimeEqual_(computedHex, providedSig);
}

function constantTimeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

`a === b` 비교는 **타이밍 공격**에 취약하다 — 항상 constant time 비교.

### URL 안의 비밀

웹앱 URL은 쿼리스트링에 secret을 넣어도 보안 효과가 거의 없다 — 브라우저 history, 서버 로그, referer에 노출. 시크릿은 **헤더 또는 body**로.

```javascript
// 안 좋음: ?token=abc 그대로 노출
// 좋음: POST body의 JSON 안에 token, 또는 HMAC 서명
```

## 5. "Execute as me" vs "Execute as user" 위험

웹앱 배포 시 `executeAs`:

- `USER_DEPLOYING` ("Me"): **개발자 계정 권한**으로 실행. 누구나 접근해도 개발자의 Drive/Gmail에 접근 가능.
- `USER_ACCESSING` ("User accessing the web app"): 접근자 계정 권한.

**위험 시나리오**: `Me` + `Anyone` 접근으로 배포 + 시트 ID를 사용자가 지정 가능 → 임의의 시트를 개발자 계정으로 읽고 노출.

```javascript
// 위험한 예: 사용자가 보낸 sheetId를 검증 없이 사용
function doGet(e) {
  const data = SpreadsheetApp.openById(e.parameter.sheetId).getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data));
}
```

방어:
- `Me`로 배포 시 사용자 입력으로 **리소스를 지정하지 않는다.** 고정된 ID만.
- 사용자에게 노출할 데이터는 화이트리스트.
- 사용자별 데이터 접근이라면 `executeAs: USER_ACCESSING`을 고려.

## 6. 소스코드에 secret 박지 않기

```javascript
// 절대 X
const API_KEY = 'sk-LIVE-xyz123';

// 권장
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
```

이유:
- 코드는 협업자에게 공유됨
- clasp/git으로 export하면 평문 노출
- 라이브러리로 export 시 의도치 않게 다른 프로젝트에 노출

추가 방어:
- **분리된 Properties**: 개발/운영용 secret을 별개 Apps Script 프로젝트로 분리
- 매니페스트 `urlFetchWhitelist`로 호출 대상 URL 제한 (실수로 secret이 임의 URL로 누출되는 사고 방지). 이 필드는 현재도 유효하며, 배포(프로덕션) 앱에서는 사실상 필수다.
- secret rotation: `setProperties`로 주기적 교체

## 7. OAuth scope 최소화

매니페스트에 명시:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

**자동 추론 vs 명시**:
- 명시하지 않으면 Apps Script가 코드 분석해서 추론 — **과잉 권한** 경향
- 명시하면 정확히 그 scope만 요청
- 사용자에게 표시되는 동의 화면이 깔끔해지고 신뢰도 향상

### 일반적으로 너무 강한 scope

- `https://www.googleapis.com/auth/drive` — 전체 Drive 접근 (모든 파일!)
  - 대안: `drive.file` (앱이 만든 파일만), `drive.readonly`
- `https://mail.google.com/` — Gmail 풀 접근
  - 대안: `gmail.send`, `gmail.readonly`, `gmail.modify`
- `https://www.googleapis.com/auth/spreadsheets` — 모든 시트
  - 대안: `spreadsheets.currentonly` (컨테이너 시트만)

### scope 변경 시 재동의

`oauthScopes`를 추가/변경하면 기존 사용자는 다시 동의해야 한다. 배포 노트에 안내 필요.

## 8. 사용자 입력 sanitize 가이드

| 사용처 | 위험 | 방어 |
|--------|------|------|
| HTML 출력 (`<?= ?>`) | XSS | 자동 escape (그대로 두기) |
| HTML force-print (`<?!= ?>`) | XSS | DOMPurify 등으로 sanitize |
| Sheet 셀에 쓰기 | Formula injection | 값 앞에 `'` 추가하거나 `=` 시작값 거부 |
| Drive 파일명 | Path traversal (낮음) | `/`, `\`, 길이 제한 |
| Gmail 본문 | 외부 링크/스팸 | 도메인 화이트리스트, 횟수 제한 |
| Doc 본문 (`replaceText`) | HTML 삽입 (낮음) | Doc은 평문이라 위험 적지만 길이 제한 |

### Formula injection 예

사용자가 시트에 `=IMPORTXML(...)` 같은 식을 입력 — 다른 사용자가 열면 외부 데이터를 불러옴.

```javascript
function safeAppendRow(sheet, row) {
  const sanitized = row.map(v => {
    if (typeof v !== 'string') return v;
    if (/^[=+\-@]/.test(v)) return "'" + v;     // formula 비활성화
    return v;
  });
  sheet.appendRow(sanitized);
}
```

## 9. 라이브러리 의존성 검토

매니페스트 `dependencies.libraries`에 외부 script ID를 추가하면 그 코드가 **당신 권한으로 실행**된다.

검토 체크리스트:
- 라이브러리 작성자가 신뢰할 수 있는가?
- 소스를 직접 봤는가? (Apps Script 라이브러리는 코드 공개 — script ID로 열어볼 수 있음)
- 어떤 OAuth scope를 요구하는가? 합쳐지면 동의 화면이 어떻게 변하는가?
- 버전 고정인가, `developmentMode: true`인가? dev 모드는 작성자 변경에 즉시 노출.

**OAuth2 라이브러리(Google 공식 권장 외부 라이브러리)** 같이 검증된 것만 사용. 출처가 불분명한 라이브러리는 코드 검토 후.

## 10. URL fetch whitelist

매니페스트 `urlFetchWhitelist`로 `UrlFetchApp.fetch` 호출 대상 URL을 제한할 수 있다.

```json
{
  "urlFetchWhitelist": [
    "https://api.example.com/",
    "https://hooks.slack.com/services/"
  ]
}
```

production 배포에서 사용 권장 — 사고/공격으로 임의 URL에 secret을 전송하는 시나리오 방어.

(이 필드는 add-on에서 특히 요구되며, 일반 스크립트에서도 작동.)

## 11. Cloud Logging에 민감 정보 X

```javascript
// 안 좋음 — API 토큰이 로그에 평문 보관
console.log('calling api with token=' + token);

// 좋음
console.log('calling api (token len=%d)', token.length);
```

Cloud Logging은 보관기간 동안 GCP 권한이 있는 사람이 볼 수 있다. PII, 토큰, 비밀번호, 카드 정보 등을 절대 로그에 남기지 않는다.

## 12. Add-on 추가 고려사항

Workspace Add-on을 배포할 때:
- 사용자가 권한 동의 화면을 본다 — scope이 적을수록 설치율 향상
- Add-on 검토(verification)는 민감한 scope 사용 시 필수
- Add-on은 격리 모드(`allowlist-domains`) 등 추가 설정 가능

## 13. clasp 인증 파일 보호

- `~/.clasprc.json`: refresh token 보관 — 누구나 읽으면 본인 계정으로 Apps Script 조작 가능
- 컴퓨터 권한: `chmod 600 ~/.clasprc.json`
- CI에선 secret으로 (Github Actions Secret 등)
- 토큰 유출 의심 시 즉시 https://myaccount.google.com/permissions 에서 clasp 권한 해제

## 14. 보안 체크리스트

배포 전 점검:

- [ ] 매니페스트 `oauthScopes` 명시, 최소 권한
- [ ] secret은 Script Properties, 코드에 없음
- [ ] HtmlService 출력 전부 `<?= ?>` (force-print는 안전한 곳에만)
- [ ] `doPost`/`doGet`에 secret 또는 HMAC 검증
- [ ] `executeAs: "Me"` + `Anyone` 조합 시 사용자 입력으로 리소스 지정 X
- [ ] 외부 라이브러리는 신뢰된 것만, version 고정
- [ ] `urlFetchWhitelist` 설정 (production)
- [ ] 로그에 secret/PII 없음
- [ ] `clasprc.json` gitignore + CI secret
- [ ] Cloud Error Reporting 알림 설정 (`exceptionLogging: STACKDRIVER`)

## 함정

- **단순 onEdit 트리거의 권한**: 단순 트리거는 매우 제한된 권한으로 실행 — 외부 호출 불가가 보안적으로는 안전망. 임의 권한이 필요하면 설치된 트리거로 등록(개발자 인증 컨텍스트).
- **`Session.getActiveUser()` 빈 문자열**: 다른 Workspace 도메인 사용자, 또는 익명 웹앱 접근 시 빈 문자열. 사용자 식별 로직이 깨질 수 있음 — `getEffectiveUser()`와 구분.
- **`google.script.run`은 토큰 자동 첨부**: 클라이언트가 추가 인증 헤더를 넣을 필요 없음. 반대로 서버는 항상 `Session.getActiveUser()`로 호출자 식별.
- **Drive copyFile은 권한 승계**: 원본 파일의 공유 권한이 복사본에 그대로 따라옴. 새 파일 생성 후 원본 권한 정리 필요.
- **CDN/외부 스크립트 사용**: HtmlService 내부에서 외부 CDN JS 로드는 가능하지만, CDN이 변조되면 그 코드가 사용자 브라우저에서 실행됨. SRI(integrity 해시) 사용 권장.

## 참고

- https://developers.google.com/apps-script/guides/html/templates
- https://developers.google.com/apps-script/guides/html/restrictions
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/services/authorization
- https://developers.google.com/apps-script/manifest
- https://developers.google.com/identity/protocols/oauth2/scopes (전체 scope 목록)
