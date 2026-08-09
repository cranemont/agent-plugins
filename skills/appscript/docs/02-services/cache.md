# CacheService

> **출처**
> - https://developers.google.com/apps-script/reference/cache
> - https://developers.google.com/apps-script/reference/cache/cache-service
> - https://developers.google.com/apps-script/reference/cache/cache
>
> **최종 확인일**: 2026-07-22

## 개요

`CacheService`는 **휘발성** 짧은 수명 key-value 캐시다. 같은 외부 API를 짧은 시간 안에 여러 번 호출하거나, 무거운 계산 결과를 재사용하고 싶을 때 쓴다.

**Properties와의 차이**

| 항목 | CacheService | PropertiesService |
| --- | --- | --- |
| 영속성 | 휘발 (최대 6시간) | 영구 |
| 만료 | 자동 | 없음 |
| 용도 | 캐시 | 설정·상태 |
| 보장 | 없음 (언제든 null 가능) | 강함 |

문서에 명시: "The data you write to the cache is not guaranteed to persist until its expiration time. You must be prepared to get back `null` from all reads." → **항상 null 가드 필수.**

## 세 가지 스토어

| 스토어 | 호출 | 스코프 |
| --- | --- | --- |
| **Script Cache** | `getScriptCache()` | 스크립트 전역 (모든 사용자 공유) |
| **User Cache** | `getUserCache()` | (스크립트, 사용자) 쌍 |
| **Document Cache** | `getDocumentCache()` | 문서 단위 (컨테이너 바운드만, 그 외 `null`) |

## 주요 메서드

### CacheService

| 메서드 | 반환 |
| --- | --- |
| `getScriptCache()` | `Cache` |
| `getUserCache()` | `Cache` |
| `getDocumentCache()` | `Cache \| null` |

### Cache

| 메서드 | 시그니처 | 설명 |
| --- | --- | --- |
| `get(key)` | `String \| null` | 단일 조회 |
| `put(key, value)` | `void` | 기본 만료 600초로 저장 |
| `put(key, value, expirationInSeconds)` | `void` | 만료 지정 저장 |
| `getAll(keys)` | `Object` | 배치 조회 (없는 키는 결과에 없음) |
| `putAll(values)` | `void` | 배치 저장 (기본 600초) |
| `putAll(values, expirationInSeconds)` | `void` | 배치 저장, 만료 지정 |
| `remove(key)` | `void` | 단일 삭제 |
| `removeAll(keys)` | `void` | 배치 삭제 |

### 제한 (공식 cache 페이지)

| 항목 | 값 |
| --- | --- |
| **최대 키 길이** | 250자 |
| **값당 최대 크기** | 100 KB |
| **기본 만료** | 600초 (10분) |
| **최대 만료** | 21,600초 (6시간) |
| **최소 만료** | 1초 |
| **최대 항목 수** | 1,000개 (초과 시 만료 임박한 항목부터 제거되어 900개로 유지) |

값은 모두 문자열이다. 객체는 `JSON.stringify`로 직렬화 후 저장.

## 코드 예제

### 1) 기본 캐시-or-fetch 패턴

```javascript
function getUserProfile(userId) {
  const cache = CacheService.getScriptCache();
  const key = `profile:${userId}`;

  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const res = UrlFetchApp.fetch(`https://api.example.com/users/${userId}`);
  const profile = JSON.parse(res.getContentText());

  cache.put(key, JSON.stringify(profile), 1800); // 30분
  return profile;
}
```

### 2) 배치 조회 (`getAll`)

```javascript
function getUsersBatch(ids) {
  const cache = CacheService.getScriptCache();
  const keys = ids.map(id => `user:${id}`);
  const hits = cache.getAll(keys); // 없는 키는 결과 객체에 안 들어옴

  const missingIds = ids.filter(id => !hits[`user:${id}`]);
  if (missingIds.length === 0) {
    return ids.map(id => JSON.parse(hits[`user:${id}`]));
  }

  // miss는 한꺼번에 가져와서 putAll
  const fetched = fetchUsersFromApi(missingIds);
  const toCache = {};
  for (const u of fetched) toCache[`user:${u.id}`] = JSON.stringify(u);
  cache.putAll(toCache, 1800);

  // 합쳐서 반환
  const merged = { ...hits };
  for (const [k, v] of Object.entries(toCache)) merged[k] = v;
  return ids.map(id => JSON.parse(merged[`user:${id}`]));
}
```

### 3) 무효화

```javascript
function updateUser(userId, patch) {
  // 1. DB 갱신
  saveToDb(userId, patch);
  // 2. 캐시 제거 (다음 read 때 다시 채워짐)
  CacheService.getScriptCache().remove(`user:${userId}`);
}
```

### 4) 사용자별 데이터 (User Cache)

```javascript
function getMyNotifications() {
  const cache = CacheService.getUserCache();
  const cached = cache.get('notifications');
  if (cached) return JSON.parse(cached);

  const notifications = fetchNotificationsForCurrentUser();
  cache.put('notifications', JSON.stringify(notifications), 300);
  return notifications;
}
```

### 5) 큰 값 압축 (100 KB 한계 우회)

100 KB를 넘는 값은 `Utilities.gzip`으로 압축한 뒤 base64로 저장. 단, 압축 후에도 100 KB 이하여야 함.

```javascript
function putCompressed(key, obj) {
  const json = JSON.stringify(obj);
  const blob = Utilities.newBlob(json);
  const gz = Utilities.gzip(blob).getBytes();
  const b64 = Utilities.base64Encode(gz);
  if (b64.length > 100 * 1024) throw new Error('Too big even after gzip');
  CacheService.getScriptCache().put(key, b64, 3600);
}

function getCompressed(key) {
  const b64 = CacheService.getScriptCache().get(key);
  if (!b64) return null;
  const gz = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(gz, 'application/x-gzip');
  const json = Utilities.ungzip(blob).getDataAsString();
  return JSON.parse(json);
}
```

## 일반적인 패턴

### Cache-aside

표준 패턴: read → cache miss → source 조회 → cache write → return.
write 경로에서는 `remove` 또는 `put` 새 값으로 무효화.

### Lock과 결합 (cache stampede 방지)

여러 사용자가 동시에 cache miss로 똑같이 무거운 호출을 하면 stampede가 일어난다. 갱신 구간에 `LockService`를 걸어 한 명만 채우게 한다.

```javascript
function getExpensive() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('K');
  if (hit) return JSON.parse(hit);

  const lock = LockService.getScriptLock();
  lock.waitLock(10_000);
  try {
    // 락 잡은 뒤 다시 확인 (double-check)
    const again = cache.get('K');
    if (again) return JSON.parse(again);

    const fresh = expensiveCall();
    cache.put('K', JSON.stringify(fresh), 1800);
    return fresh;
  } finally {
    lock.releaseLock();
  }
}
```

### Properties와 계층

자주 읽히는 설정은 Properties → Cache → in-memory 3단 계층. write 경로에서 Cache invalidate.

### 키 네임스페이싱

스크립트 캐시는 전역 공유이므로 prefix 충돌 주의: `feature:user:123`, `cfg:slack:webhook`처럼 도메인을 prefix로.

## 주의사항 / Quota / 함정

1. **null 반환은 정상**
   만료 전이라도 evict 될 수 있다. 비즈니스 로직이 cache hit를 가정하면 안 된다.

2. **만료 한도 6시간**
   더 오래 살아야 하는 데이터는 Properties나 Sheet에 저장.

3. **값은 문자열만**
   객체는 `JSON.stringify` 필수. 큰 배열은 100 KB 한계에 주의.

4. **키 250자, 값 100 KB 한도 초과 시 에러**
   해시(`computeDigest`)로 키를 줄이거나 gzip으로 값을 압축.

5. **Document Cache는 컨테이너 바운드 전용**
   standalone에서 `null`.

6. **Script Cache는 모든 사용자 공유**
   사용자별 데이터는 User Cache로. 안 그러면 다른 사람 데이터가 보임.

7. **트랜잭션·일관성 없음**
   Cache는 best-effort. 정확성이 중요한 로직에는 데이터 출처를 직접 검증.

8. **장기 통계 누적용 아님**
   카운터는 Properties나 Spreadsheet에서. Cache 카운터는 사라진다.

## 참고

- CacheService: https://developers.google.com/apps-script/reference/cache/cache-service
- Cache: https://developers.google.com/apps-script/reference/cache/cache
- 관련 문서: `02-services/properties.md`, `02-services/lock.md`, `02-services/utilities.md`
