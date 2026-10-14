# LockService

> **출처**
> - https://developers.google.com/apps-script/reference/lock
> - https://developers.google.com/apps-script/reference/lock/lock-service
> - https://developers.google.com/apps-script/reference/lock/lock
>
> **최종 확인일**: 2026-07-22

## 개요

`LockService`는 **동시 실행 임계 구역**을 보호하는 mutex 서비스다. 여러 트리거 또는 여러 사용자가 같은 코드 블록을 동시에 실행해 race condition이 생기는 것을 막는다.

**언제 쓰는가**
- Properties의 read-modify-write (카운터 증가, 큐 끝에 푸시)
- Spreadsheet의 마지막 빈 행 찾기 → append
- 트리거가 짧은 간격으로 겹쳐 두 번 실행되는 것 방지
- 외부 API 호출의 single-flight 보장

## 세 가지 락

| 락 | 호출 | 공유 단위 |
| --- | --- | --- |
| **Script Lock** | `getScriptLock()` | 스크립트 전체 (어느 사용자든 단 하나만) |
| **User Lock** | `getUserLock()` | (스크립트, 사용자) 쌍. 사용자끼리는 병행 가능, 같은 사용자는 직렬 |
| **Document Lock** | `getDocumentLock()` | 문서 단위. 컨테이너 바운드만, 그 외 `null` |

## 주요 메서드

### LockService

| 메서드 | 반환 |
| --- | --- |
| `getScriptLock()` | `Lock` |
| `getUserLock()` | `Lock` |
| `getDocumentLock()` | `Lock \| null` |

### Lock

| 메서드 | 시그니처 | 설명 |
| --- | --- | --- |
| `tryLock(timeoutInMillis)` | `Boolean` | 시도 후 즉시 `true`/`false` 반환 |
| `waitLock(timeoutInMillis)` | `void` | 획득까지 블록, timeout 초과 시 throw |
| `hasLock()` | `Boolean` | 현재 인스턴스가 락을 보유 중인지 |
| `releaseLock()` | `void` | 해제 |

### `tryLock` vs `waitLock`

| | tryLock | waitLock |
| --- | --- | --- |
| 실패 시 | `false` 반환 | 예외 throw |
| 블로킹 | 함 (timeout까지) | 함 (timeout까지) |
| 사용 시점 | "락 못 잡으면 그냥 다음에 다시 시도" | "꼭 진행해야 함" |

> 두 메서드 모두 timeout 동안 폴링하며 대기한다. `tryLock(0)`은 즉시 시도/반환에 가깝다. 차이는 실패 신호 방식(boolean vs throw)이다.

## 코드 예제

### 1) 표준 사용 (try/finally 필수)

```javascript
function incrementCounter() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10_000); // 10초까지 대기
  try {
    const props = PropertiesService.getScriptProperties();
    const n = Number(props.getProperty('count') ?? 0) + 1;
    props.setProperty('count', String(n));
    return n;
  } finally {
    lock.releaseLock();
  }
}
```

`releaseLock()`은 `finally`에서 호출하지 않으면 예외 시 스크립트 종료까지 락이 유지된다(자동 해제는 실행 종료 시점). 즉 다른 트리거가 그만큼 더 대기한다.

### 2) `tryLock`으로 "지금 안 되면 스킵"

```javascript
function dailyDigest() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1_000)) {
    console.log('Another instance is running, skip');
    return;
  }
  try {
    sendDigest();
  } finally {
    lock.releaseLock();
  }
}
```

트리거가 짧은 간격으로 겹쳐 발사될 가능성이 있을 때, 이중 처리를 막는 표준 패턴.

### 3) Spreadsheet append 보호

```javascript
function appendRow(rowValues) {
  const lock = LockService.getDocumentLock();
  if (!lock) throw new Error('Not in a document context');
  lock.waitLock(30_000);
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.appendRow(rowValues);
  } finally {
    lock.releaseLock();
  }
}
```

`appendRow`는 내부적으로 "마지막 행 다음에 쓰기"이므로 동시 호출 시 row 덮어쓰기 위험이 있다. Document Lock으로 직렬화.

### 4) User Lock (사용자별 직렬화)

```javascript
function syncMyData() {
  const lock = LockService.getUserLock();
  lock.waitLock(20_000);
  try {
    // 같은 사용자의 중복 동기화는 막되, 다른 사용자는 병행 OK
    runSync();
  } finally {
    lock.releaseLock();
  }
}
```

같은 사용자가 두 번 동시에 누르는 것만 막고, 사용자끼리 병렬은 허용하고 싶을 때.

### 5) 잠깐 시도 후 즉시 응답

```javascript
function quickAction() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    return { ok: false, reason: 'busy' };
  }
  try {
    return { ok: true, data: doWork() };
  } finally {
    lock.releaseLock();
  }
}
```

웹 앱 핸들러에서 응답 지연을 피하고 싶을 때.

## 일반적인 패턴

### 트리거 중복 실행 방지

분 단위 트리거가 이전 실행보다 다음 실행이 빨라지면 두 트리거가 동시에 돌 수 있다.

```javascript
function timeDriven() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(500)) return; // 이미 도는 중이면 스킵
  try {
    runJob();
  } finally {
    lock.releaseLock();
  }
}
```

### PropertiesService와 결합 (read-modify-write)

Properties는 트랜잭션이 없으므로 동시 갱신에서 lost update가 발생한다. 임계 구역을 Script Lock으로 감싼다(예제 1번).

### Cache 채우기 single-flight

`02-services/cache.md`의 "Lock과 결합" 예제 참고. cache miss 갱신 시 stampede를 방지.

### Document Lock + Spreadsheet append

Sheets 작성 작업은 Document Lock과 잘 맞는다. Script Lock으로 전 문서를 막는 것보다 범위가 좁아 충돌이 적다.

## 주의사항 / Quota / 함정

1. **`releaseLock`은 반드시 `finally`에서**
   `try/finally` 없이 락 잡고 예외 던지면 실행 끝날 때까지 락이 풀리지 않는다. 다른 인스턴스가 그만큼 더 대기.

2. **`waitLock` timeout 초과는 예외**
   `tryLock`은 boolean 반환, `waitLock`은 throw. 사용 의도에 맞춰 선택.

3. **락 시간이 곧 quota 소비**
   대기 중에도 스크립트 실행 시간 한도(6분 / 30분)가 소모된다. 너무 큰 timeout(예: 300초)을 잡으면 트리거가 잇따라 timeout 누적으로 죽을 수 있다.

4. **Document Lock은 컨테이너 바운드 전용**
   standalone에서 `getDocumentLock()`은 `null`. 가드 필수.

5. **락 범위 선택**
   - 동일 사용자만 직렬화 → User Lock
   - 모든 사용자·트리거 직렬화 → Script Lock
   - 문서별 직렬화 → Document Lock
   잘못 고르면 성능을 손해 보거나 race가 그대로 남는다.

6. **분산 락이 아님**
   다른 스크립트 프로젝트와는 공유되지 않는다. 외부 시스템과의 동시성은 외부 락(예: Firestore transaction, Redis)을 써야 한다.

7. **`hasLock()`은 현재 인스턴스 기준**
   다른 사람이 락을 잡고 있어도 내가 잡은 게 아니면 `false`. "락이 비었는지 확인" 용도가 아니다.

8. **재진입(reentrant) 보장 X**
   같은 함수에서 다시 `waitLock`을 부르면 데드락이 날 수 있다. 한 실행 컨텍스트에서 한 번만 잡는다.

9. **장시간 외부 호출 보호 금지**
   1분 이상 걸리는 UrlFetch를 Script Lock 안에서 부르면 다른 모든 실행이 그만큼 막힌다. 외부 호출 결과만 락 구간에서 commit하도록 분리.

## 참고

- LockService: https://developers.google.com/apps-script/reference/lock/lock-service
- Lock: https://developers.google.com/apps-script/reference/lock/lock
- 관련 문서: `02-services/properties.md`, `02-services/cache.md`, `03-triggers/`
