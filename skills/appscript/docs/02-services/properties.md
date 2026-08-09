# PropertiesService

> **출처**
> - https://developers.google.com/apps-script/reference/properties
> - https://developers.google.com/apps-script/reference/properties/properties-service
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

`PropertiesService`는 Apps Script가 영속적으로 사용할 수 있는 **간단한 key-value 저장소**다. 환경 변수, API 키, 사용자별 설정, 마지막 동기화 시각 같은 작은 메타데이터를 저장하는 데 쓴다.

**언제 쓰는가**
- 외부 API 토큰/시크릿 보관 (단, 후술하는 보안 주의)
- 트리거 간 상태 (마지막 처리 ID, 마지막 실행 시각)
- 사용자별 설정 (UI 선호도, 알림 옵션)
- 스크립트 단위 설정값

**언제 쓰지 말 것**
- 대용량 데이터, 배열 누적 (Spreadsheet, Drive, Firestore 사용)
- 빠른 만료가 필요한 캐싱 (`CacheService` 사용)
- 다른 사용자에게 노출되면 안 되는 PII (User Properties 외에는 모두 공유됨)

## 세 가지 스토어

| 스토어 | 호출 | 스코프 | 영속성 | 다른 사용자 접근 |
| --- | --- | --- | --- | --- |
| **Script Properties** | `getScriptProperties()` | 스크립트 단위 | 영구 | 모든 사용자 공유 |
| **User Properties** | `getUserProperties()` | (스크립트, 사용자) 쌍 | 영구 | 사용자별 격리 |
| **Document Properties** | `getDocumentProperties()` | 문서 단위 (바운드 스크립트) | 영구 | 동일 문서 사용자 공유 |

- `getDocumentProperties()`는 컨테이너 바운드(스프레드시트/문서/폼)에서만 동작하고, 그 외 컨텍스트에서는 `null`을 반환한다.
- `getScriptProperties()`의 데이터는 **해당 스크립트의 모든 실행자에게 동일하게 보인다**. 웹 앱을 "사용자로 실행"으로 배포해도 마찬가지다.

## 주요 메서드

### PropertiesService

| 메서드 | 반환 |
| --- | --- |
| `getScriptProperties()` | `Properties` |
| `getUserProperties()` | `Properties` |
| `getDocumentProperties()` | `Properties \| null` |

### Properties

| 메서드 | 시그니처 | 설명 |
| --- | --- | --- |
| `getProperty(key)` | `String \| null` | 단일 조회 |
| `setProperty(key, value)` | `Properties` | 단일 저장 (체이닝) |
| `getProperties()` | `Object` | 전체를 한 번에 읽어 객체로 반환 |
| `setProperties(properties)` | `Properties` | 객체로 일괄 저장 |
| `setProperties(properties, deleteAllOthers)` | `Properties` | 두 번째 인자 `true`면 기존 키 전부 삭제 후 덮어쓰기 |
| `deleteProperty(key)` | `Properties` | 단일 삭제 |
| `deleteAllProperties()` | `Properties` | 전체 삭제 |
| `getKeys()` | `String[]` | 키 목록 |

모든 값은 **문자열로 강제 변환되어 저장**된다. 객체/배열은 직접 저장 못 한다. → `JSON.stringify` / `JSON.parse` 필요.

## 코드 예제

### 1) API 키 저장·조회 (Script Properties)

```javascript
function setupApiKey() {
  PropertiesService.getScriptProperties()
    .setProperty('SLACK_TOKEN', 'xoxb-...');
}

function callSlack() {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  if (!token) throw new Error('SLACK_TOKEN not set');
  // ...
}
```

운영에서는 코드 상수가 아니라 Apps Script 에디터의 **Project Settings → Script Properties** 또는 별도 1회용 setup 함수로 주입한다.

### 2) 객체 저장 (JSON 직렬화)

```javascript
function saveConfig(config) {
  PropertiesService.getScriptProperties()
    .setProperty('CONFIG', JSON.stringify(config));
}

function loadConfig() {
  const raw = PropertiesService.getScriptProperties().getProperty('CONFIG');
  return raw ? JSON.parse(raw) : null;
}
```

### 3) 일괄 저장·조회 (성능 최적화)

```javascript
// 나쁨: N번의 RPC
for (const [k, v] of Object.entries(data)) {
  props.setProperty(k, v); // 매번 네트워크 왕복
}

// 좋음: 한 번에
PropertiesService.getScriptProperties().setProperties(data);
```

읽을 때도 `getProperties()`로 한 번에 받아 in-memory 객체에서 골라 쓰는 것이 빠르다.

```javascript
const all = PropertiesService.getScriptProperties().getProperties();
const a = all.A;
const b = all.B;
const c = all.C;
```

### 4) 사용자별 설정 (User Properties)

```javascript
function setUserLocale(locale) {
  PropertiesService.getUserProperties().setProperty('locale', locale);
}

function getUserLocale() {
  return PropertiesService.getUserProperties().getProperty('locale') ?? 'ko';
}
```

`getUserProperties()`는 현재 **active user** 기준이다. 웹 앱이 "나로 실행"이면 실제 호출자에 관계없이 항상 같은 사람의 스토어를 가리킨다. 사용자별로 격리하려면 웹 앱을 "사용자로 실행"으로 배포해야 한다.

### 5) 마지막 처리 시각 (트리거 상태)

```javascript
const KEY = 'LAST_SYNC_AT';

function dailySync() {
  const props = PropertiesService.getScriptProperties();
  const lastIso = props.getProperty(KEY);
  const since = lastIso ? new Date(lastIso) : new Date(0);

  // ... since 이후 데이터만 처리 ...

  props.setProperty(KEY, new Date().toISOString());
}
```

### 6) Document Properties (Add-on)

```javascript
function setSheetMeta(meta) {
  const props = PropertiesService.getDocumentProperties();
  if (!props) throw new Error('Not in a document context');
  props.setProperty('meta', JSON.stringify(meta));
}
```

## 일반적인 패턴

### `getProperties()` 캐시 + 무효화

스크립트 properties는 자주 읽힌다. 동일 실행에서 여러 번 부르지 말고 한 번 읽어 변수에 보관한다. 다른 트리거가 갱신할 가능성이 있을 때만 다시 읽는다.

### Lock과 조합 (Read-Modify-Write 안전)

여러 트리거/사용자가 동시에 같은 키를 갱신하면 lost update가 일어난다.

```javascript
function increment(key) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10_000);
  try {
    const props = PropertiesService.getScriptProperties();
    const n = Number(props.getProperty(key) ?? 0) + 1;
    props.setProperty(key, String(n));
  } finally {
    lock.releaseLock();
  }
}
```

### Cache와 조합

Properties는 영속이지만 RPC 비용이 있다. 자주 읽히는 설정은 `CacheService`에 캐싱하고 변경 시 캐시를 invalidate한다.

```javascript
function getConfig() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('config');
  if (cached) return JSON.parse(cached);

  const raw = PropertiesService.getScriptProperties().getProperty('config') ?? '{}';
  cache.put('config', raw, 1800);
  return JSON.parse(raw);
}
```

## 주의사항 / Quota / 함정

### 크기 제한 (공식 quota 페이지)

| 항목 | 값 |
| --- | --- |
| 값 하나의 크기 | 최대 9 KB |
| 스토어 하나(Script/User/Document)의 총 용량 | 500 KB |
| 키 길이 | 명시 X (실무상 짧게 유지) |

위 수치는 변경 가능. 9 KB는 UTF-8 인코딩 후 바이트 기준이라 한글이 들어가면 글자 수가 더 적게 들어간다.

### 함정

1. **값이 자동으로 문자열화된다**
   `setProperty('n', 1)`로 저장하면 `'1'`이 들어간다. 읽을 때 항상 `Number()`, `JSON.parse()` 등으로 복원.

2. **`null` / `undefined` 저장**
   `setProperty(k, null)`은 빈 문자열이 들어갈 수 있고 `undefined`는 예외. 키 자체를 삭제하려면 `deleteProperty(k)`.

3. **`setProperties(obj, true)`의 두 번째 인자**
   `true`면 기존 키를 전부 지우고 `obj`로 교체한다. 실수로 다른 트리거가 쓴 키를 날릴 수 있다.

4. **민감 정보 평문 저장**
   Script Properties는 스크립트 편집 권한이 있는 누구나 평문으로 볼 수 있다. 진짜 비밀(고객 API 키, OAuth client secret 등)은 Google Cloud Secret Manager 같은 외부 비밀 저장소를 검토. 최소한 편집 권한을 좁게 유지.

5. **Document Properties는 컨테이너 바운드 전용**
   standalone 스크립트나 일반 웹 앱에서 부르면 `null`. 호출 전에 반드시 가드.

6. **트리거 동시 실행에 의한 lost update**
   `getProperty` → 수정 → `setProperty` 사이에 다른 실행이 끼면 손실. 동시성이 있으면 `LockService` 필수.

7. **9 KB 초과 시 예외**
   사이즈 초과는 throw된다. 대용량은 Spreadsheet/Drive로.

8. **`getProperties()` 키 순서**
   삽입 순서는 보장 안 됨. 정렬이 필요하면 직접 정렬.

## 참고

- PropertiesService: https://developers.google.com/apps-script/reference/properties/properties-service
- Properties: https://developers.google.com/apps-script/reference/properties/properties
- Quota: https://developers.google.com/apps-script/guides/services/quotas
- 관련 문서: `02-services/cache.md`, `02-services/lock.md`
