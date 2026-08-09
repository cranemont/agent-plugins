# Utilities

> **출처**
> - https://developers.google.com/apps-script/reference/utilities
> - https://developers.google.com/apps-script/reference/utilities/utilities
> - https://developers.google.com/apps-script/reference/utilities/digest-algorithm
> - https://developers.google.com/apps-script/reference/utilities/mac-algorithm
>
> **최종 확인일**: 2026-07-22

## 개요

`Utilities`는 인코딩, 해시, 날짜·문자열 포매팅, 압축, 슬립 등 **저수준 유틸리티 함수들의 모음**이다. 다른 서비스에 속하지 않는 공용 헬퍼들이 여기 모여 있다.

**카테고리**
- Base64 인코딩/디코딩
- 다이제스트(해시) 및 HMAC/RSA 서명
- Blob 생성과 압축(gzip/zip)
- 날짜·문자열·CSV 포매팅
- UUID, sleep

## 주요 메서드

### Base64

| 메서드 | 시그니처 | 비고 |
| --- | --- | --- |
| `base64Encode(data)` | `(String\|Byte[]) -> String` | 표준 Base64 |
| `base64Encode(data, charset)` | `(String, Charset) -> String` | charset 지정 |
| `base64EncodeWebSafe(data)` | `(String\|Byte[]) -> String` | URL/파일명 안전 (`-`, `_` 사용) |
| `base64EncodeWebSafe(data, charset)` | – | |
| `base64Decode(encoded)` | `String -> Byte[]` | |
| `base64Decode(encoded, charset)` | `(String, Charset) -> Byte[]` | |
| `base64DecodeWebSafe(encoded)` | `String -> Byte[]` | |
| `base64DecodeWebSafe(encoded, charset)` | – | |

`Charset`은 `Utilities.Charset.UTF_8`, `Utilities.Charset.US_ASCII` 등의 열거형.

### 다이제스트 / HMAC / RSA

| 메서드 | 비고 |
| --- | --- |
| `computeDigest(algorithm, value)` | 단방향 해시 |
| `computeDigest(algorithm, value, charset)` | – |
| `computeHmacSha256Signature(value, key)` | HMAC-SHA256 단축 |
| `computeHmacSha256Signature(value, key, charset)` | – |
| `computeHmacSignature(algorithm, value, key)` | 임의 HMAC |
| `computeHmacSignature(algorithm, value, key, charset)` | – |
| `computeRsaSha1Signature(value, key)` | RSA-SHA1 단축 |
| `computeRsaSha256Signature(value, key)` | RSA-SHA256 단축 |
| `computeRsaSignature(algorithm, value, key)` | 임의 RSA |

#### DigestAlgorithm

`Utilities.DigestAlgorithm.*`

- `MD2`
- `MD5`
- `SHA_1`
- `SHA_256`
- `SHA_384`
- `SHA_512`

#### MacAlgorithm

`Utilities.MacAlgorithm.*`

- `HMAC_MD5`
- `HMAC_SHA_1`
- `HMAC_SHA_256`
- `HMAC_SHA_384`
- `HMAC_SHA_512`

#### RsaAlgorithm

`Utilities.RsaAlgorithm.RSA_SHA_1`, `RSA_SHA_256`

### Blob / 압축

| 메서드 | 시그니처 |
| --- | --- |
| `newBlob(data)` | `(String\|Byte[]) -> Blob` |
| `newBlob(data, contentType)` | – |
| `newBlob(data, contentType, name)` | – |
| `gzip(blob)` | `Blob -> Blob` |
| `gzip(blob, name)` | – |
| `ungzip(blob)` | `Blob -> Blob` |
| `zip(blobs)` | `Blob[] -> Blob` |
| `zip(blobs, name)` | – |
| `unzip(blob)` | `Blob -> Blob[]` |

### 날짜·문자열·CSV

| 메서드 | 비고 |
| --- | --- |
| `formatDate(date, timeZone, format)` | Java `SimpleDateFormat` 포맷 |
| `parseDate(date, timeZone, format)` | 동일 포맷 기반 파싱 |
| `parseCsv(csv)` | 2D 배열, 기본 구분자 `,` |
| `parseCsv(csv, delimiter)` | 사용자 지정 구분자 |
| `formatString(template, ...args)` | sprintf 스타일 (`%s`, `%d`, `%.2f`) |

### 기타

| 메서드 | 비고 |
| --- | --- |
| `getUuid()` | RFC 4122 UUID 문자열 |
| `sleep(ms)` | 동기 슬립. 가능한 한 자제 |
| `jsonStringify(obj)` | **deprecated**, `JSON.stringify` 사용 |
| `jsonParse(str)` | **deprecated**, `JSON.parse` 사용 |

## 코드 예제

### 1) Base64 인코딩 (Basic Auth)

```javascript
function basicAuthHeader(user, pass) {
  return 'Basic ' + Utilities.base64Encode(`${user}:${pass}`);
}
```

### 2) Web-safe Base64 (JWT 등)

```javascript
function b64url(str) {
  return Utilities.base64EncodeWebSafe(str).replace(/=+$/, '');
}
```

### 3) SHA-256 해시 (16진 문자열)

```javascript
function sha256Hex(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
```

Apps Script의 byte는 signed (-128 ~ 127). 16진 변환 시 `& 0xff` 마스킹 필수.

### 4) HMAC-SHA256 서명 (웹훅 검증)

```javascript
function verifyHmac(body, secret, signatureHex) {
  const mac = Utilities.computeHmacSha256Signature(body, secret);
  const hex = mac.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  return hex === signatureHex;
}
```

### 5) JWT 생성 (RS256)

```javascript
function createJwt(claims, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = obj =>
    Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  const signingInput = `${enc(header)}.${enc(claims)}`;
  const sig = Utilities.computeRsaSha256Signature(signingInput, privateKey);
  const sigStr = Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');
  return `${signingInput}.${sigStr}`;
}
```

### 6) 날짜 포매팅

```javascript
const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
// '2026-05-11 13:11:00'
```

포맷 문자는 Java `SimpleDateFormat` 규약:
- `yyyy` 4자리 연도, `MM` 월, `dd` 일
- `HH` 24h, `hh` 12h, `mm` 분, `ss` 초
- `a` AM/PM, `Z` 타임존 오프셋

### 7) CSV 파싱

```javascript
const csv = 'id,name\n1,kim\n2,"o, m"';
const rows = Utilities.parseCsv(csv);
// [['id','name'], ['1','kim'], ['2','o, m']]
```

따옴표 인용, 줄바꿈 포함 셀을 표준대로 처리한다. 빈 행은 한 칸 짜리 행으로 들어올 수 있으니 후처리에서 걸러내기.

탭 구분:
```javascript
Utilities.parseCsv(tsv, '\t');
```

### 8) UUID

```javascript
const id = Utilities.getUuid();
// '7f4d3c8a-...'
```

### 9) Blob 생성

```javascript
const blob = Utilities.newBlob(JSON.stringify({ ok: true }), 'application/json', 'data.json');
DriveApp.createFile(blob);
```

### 10) gzip / ungzip

```javascript
const original = Utilities.newBlob('hello'.repeat(1000));
const gz = Utilities.gzip(original, 'h.gz');

const back = Utilities.ungzip(gz);
back.getDataAsString(); // 'hellohellohello...'
```

### 11) zip / unzip

```javascript
const a = Utilities.newBlob('A', 'text/plain', 'a.txt');
const b = Utilities.newBlob('B', 'text/plain', 'b.txt');
const archive = Utilities.zip([a, b], 'pair.zip');

const restored = Utilities.unzip(archive);
restored[0].getDataAsString(); // 'A'
```

### 12) `formatString`

```javascript
Utilities.formatString('user=%s age=%d ratio=%.2f', 'kim', 33, 0.5);
// 'user=kim age=33 ratio=0.50'
```

### 13) sleep (자제 권고)

```javascript
Utilities.sleep(1500); // 1.5초 블록
```

Apps Script의 6분 실행 한도 안에서 sleep은 실행 시간을 그대로 까먹는다. retry 백오프 외엔 거의 쓰지 말 것.

## 일반적인 패턴

### byte 배열 → 16진 문자열

```javascript
function bytesToHex(bytes) {
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
```

byte는 signed라 마스킹 필수.

### URL-safe base64 패딩 제거

JWT나 OAuth 코드 챌린지에서는 패딩 `=`을 제거한다.

```javascript
const enc = s => Utilities.base64EncodeWebSafe(s).replace(/=+$/, '');
```

### parseCsv 후 헤더 객체화

```javascript
function csvToObjects(csv) {
  const [header, ...rows] = Utilities.parseCsv(csv);
  return rows.map(row => Object.fromEntries(row.map((v, i) => [header[i], v])));
}
```

### 시각 포맷 (스크립트 타임존 사용)

```javascript
const tz = Session.getScriptTimeZone();
const stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
```

### Retry with backoff (sleep 최소화)

```javascript
function retry(fn, max = 5) {
  let delay = 500;
  for (let i = 0; i < max; i++) {
    try { return fn(); }
    catch (e) {
      if (i === max - 1) throw e;
      Utilities.sleep(delay + Math.floor(Math.random() * 200));
      delay *= 2;
    }
  }
}
```

## 주의사항 / Quota / 함정

1. **`Utilities.jsonStringify` / `jsonParse`는 deprecated**
   네이티브 `JSON.stringify` / `JSON.parse`만 쓰자. V8 런타임에서 빠르고 표준.

2. **byte 배열은 signed**
   `computeDigest`, `computeHmac*`가 반환하는 배열은 -128~127 범위의 signed byte. 16진 변환 시 `& 0xff` 마스킹을 빼먹으면 음수 표현이 섞인다.

3. **`formatDate` 포맷은 Java SimpleDateFormat**
   JavaScript의 `Intl.DateTimeFormat`이나 moment 포맷과 다르다. `yyyy`(연), `MM`(월), `dd`(일), `HH`(24h), `mm`(분), `ss`(초)를 헷갈리지 말 것 (특히 `MM` vs `mm`, `DD` 같은 잘못된 토큰).

4. **타임존 인자는 IANA 식별자**
   `'Asia/Seoul'`, `'America/New_York'` 등. `'KST'`, `'+09:00'` 같은 표기는 권장되지 않거나 동작이 다를 수 있다.

5. **`parseCsv`는 마지막 빈 줄을 한 칸 행으로 반환할 수 있다**
   `.filter(r => r.length > 1 || r[0] !== '')`로 정리.

6. **`zip` / `unzip` 크기 제한**
   Apps Script Blob은 메모리에 올라온다. 매우 큰 zip은 메모리 한계로 실패. 대용량은 Drive API streaming을 고려.

7. **`sleep` 남용**
   실행 시간 한도(6분)와 동시 실행 한도(사용자당 30)에 그대로 영향. 폴링 대신 트리거를 쓰자.

8. **암호 강도**
   `MD5`, `SHA_1`은 충돌이 알려져 있다. 신규 보안 시그니처는 `SHA_256` 이상을 쓰자. HMAC-SHA1은 (HMAC 구조 덕분에) 즉시 깨지진 않지만 새 시스템은 HMAC-SHA256을 권장.

9. **`computeRsaSha256Signature(value, key)`의 key 포맷**
   PEM 문자열(PKCS#8 또는 PKCS#1, BEGIN/END 라인 포함)을 받는다. 키 형식이 안 맞으면 모호한 에러로 throw된다.

10. **`getUuid()`는 v4 형태이지만 보안용 난수로의 적합성 보장 안 됨**
    토큰 비밀번호 용도에는 별도 검토.

## 참고

- Utilities: https://developers.google.com/apps-script/reference/utilities/utilities
- DigestAlgorithm: https://developers.google.com/apps-script/reference/utilities/digest-algorithm
- MacAlgorithm: https://developers.google.com/apps-script/reference/utilities/mac-algorithm
- 관련 문서: `02-services/url-fetch.md`, `02-services/cache.md`
