# 로깅과 디버깅

> **출처**
> - https://developers.google.com/apps-script/guides/logging
> - https://developers.google.com/apps-script/reference/base/logger
> - https://developers.google.com/apps-script/reference/base/console
> - https://developers.google.com/apps-script/guides/cloud-platform-projects
> - https://developers.google.com/apps-script/manifest (`exceptionLogging`)
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script는 두 개의 로깅 시스템을 노출한다:

1. **실행 로그(Execution log)** — 에디터의 콘솔. 짧은 보존, 개발용.
2. **Google Cloud Logging(구 Stackdriver)** — 장기 보존, 검색·알림·메트릭 지원.

두 가지 로깅 API:

| API | 클래스 | 권장 용도 |
|-----|--------|-----------|
| `Logger` | `Logger.log` | 단순 디버그 메시지, structured logging(jsonPayload) |
| `console` | `console.log`, `.info`, `.warn`, `.error`, `.time` | severity 레벨 / Cloud Logging severity 매핑 |

**V8 런타임 권장**: `console.*`. 이유는 severity 레벨이 Cloud Logging의 severity로 자동 매핑되기 때문. `Logger.log`는 단일 평면 로그.

> "Logger.log... 작동하지만 console 클래스가 Cloud Logging severity와 정렬되므로 V8에서는 console 권장."

## Logger.log

### API

```javascript
Logger.log(message)
Logger.log(format, ...values)   // %s placeholder
Logger.getLog()                 // 현재 실행의 전체 로그 문자열
Logger.clear()                  // 현재 실행 로그 비움
```

### 예시

```javascript
function example() {
  Logger.log('단순 문자열');
  Logger.log('값=%s, 또=%s', 42, 'foo');
  Logger.log({ key: 'value', n: 1 });       // 객체 자동 stringify

  // 구조화 로깅 — Cloud Logging의 jsonPayload로 들어감
  Logger.log({ message: 'order created', orderId: 'A123', amount: 9900 });

  const captured = Logger.getLog();
  GmailApp.sendEmail('me@x.com', 'log', captured);
}
```

특징:
- 객체에 `message` 속성이 있으면 그 값이 로그 메시지로, 나머지 필드는 `jsonPayload`에 첨부됨.
- 모든 메시지가 동일 severity로 기록됨(`Logger`는 severity 구분 없음).
- 실행 종료 후에도 에디터 콘솔에서 잠시 조회 가능.

## console (V8 권장)

### API

```javascript
console.log(...args)     // DEBUG severity
console.info(...args)    // INFO severity
console.warn(...args)    // WARNING severity
console.error(...args)   // ERROR severity
console.time(label)
console.timeEnd(label)   // 시간 측정 출력
```

### 예시

```javascript
function example() {
  console.log('debug 메시지');
  console.info('정상 처리');
  console.warn('경고 — 행 비어있음');
  console.error('실패: ', err);

  console.time('fetch');
  UrlFetchApp.fetch('https://api.example.com/data');
  console.timeEnd('fetch');                 // "fetch: 532ms"
}
```

### Logger vs console — 무엇을 쓰나?

| 기준 | Logger | console |
|------|--------|---------|
| severity 레벨 | 없음 (전부 동일) | 4단계 (DEBUG/INFO/WARN/ERROR) |
| 구조화 로깅 (`jsonPayload`) | 객체에 `message` 필드 두면 자동 | 문자열로 직렬화됨 |
| Cloud Logging 호환 | OK | OK (severity 자동 매핑) |
| `getLog()`로 회수 | 가능 | 불가 |
| 시간 측정 | 직접 측정 | `time`/`timeEnd` 헬퍼 |

**가이드라인**:
- 일반 메시지는 `console.*` (severity 활용).
- 구조화 데이터(주문 ID, 사용자 ID 등 별도 필드)는 `Logger.log({ message: '...', orderId, userId })`.
- 디버그 후 실행 결과를 이메일로 보내야 하면 `Logger.getLog()`.

## 실행 로그 vs Cloud Logging

### 실행 로그 (Apps Script 에디터)

- 위치: 에디터 하단 패널 + Executions 페이지(좌측 메뉴 "Executions")
- 보존: 단기간 (정확한 기간은 비공개, 며칠 단위)
- 용도: 개발 중 즉시 확인

### Cloud Logging

GCP Cloud Logging에 자동 적재된다. **별도 활성화 불필요**.

- 위치: GCP Console → Logging → Logs Explorer
- 필터링: severity, time range, 사용자, 함수명 등으로 쿼리
- 보존: GCP Cloud Logging 기본 30일 (보관용 sink 설정 가능)
- 알림: Cloud Monitoring으로 ERROR 발생 시 메일/Slack 알림

### Default GCP project vs Standard GCP project

기본적으로 Apps Script는 Google이 관리하는 **default GCP 프로젝트**에 묶인다. 이 모드에서:
- 자동 로깅은 동작
- 그러나 GCP 콘솔 직접 접근 불가 (default project는 사용자에게 안 보임)
- Apps Script 에디터 안에서만 로그 확인 가능

**Standard GCP project**에 연결하면:
- 자체 GCP 프로젝트에서 Logs Explorer 사용
- Cloud Monitoring 알림/대시보드 구성
- 다른 GCP API와 통합

연결 방법: Apps Script 에디터 → Project Settings → Google Cloud Platform (GCP) Project → "Change project" → GCP 프로젝트 번호 입력.

`.clasp.json`의 `projectId` 필드에도 같은 GCP project ID를 명시하면 `clasp tail-logs`가 그 프로젝트의 로그를 스트리밍한다.

## Cloud Logging 활용

### Logs Explorer 쿼리 예시

```
resource.type="app_script_function"
resource.labels.function_name="processOrder"
severity>=ERROR
```

### Structured logging

`Logger.log({ message: 'order failed', orderId, code: err.code })` 형태로 적재된 데이터는 Logs Explorer에서:

```
resource.type="app_script_function"
jsonPayload.orderId="A123"
```

로 필드 단위 검색 가능. 단순 문자열 concat보다 강력하다.

### Error Reporting

매니페스트 `exceptionLogging`이 `STACKDRIVER`(기본)이면 잡히지 않은 예외가 자동으로 **Cloud Error Reporting**에 보고된다.

```json
{
  "exceptionLogging": "STACKDRIVER"
}
```

기능:
- 동일 stack trace를 그룹화해서 발생 횟수 카운트
- 신규 에러 발생 시 메일 알림
- GCP Console → Error Reporting에서 대시보드 확인

값:
- `STACKDRIVER` — 기본. 잡히지 않은 예외를 Cloud Logging의 ERROR severity로 기록 + Error Reporting 그룹화.
- `NONE` — 로그 비활성. 일반적으로 권장 안 함.

### 직접 에러 보고

`try/catch`로 잡은 예외도 Error Reporting에 보고하려면 `console.error(err)`로 stack trace가 포함된 Error 객체를 그대로 넘긴다.

```javascript
try {
  doWork();
} catch (e) {
  console.error('doWork failed', e);    // e가 Error 객체면 stack 포함
  throw e;  // 재던지지 않으면 알림 안 옴
}
```

또는 ErrorHandler 라이브러리(외부) — [RomainVialard/ErrorHandler](https://github.com/RomainVialard/ErrorHandler).

## 에디터 디버거

브라우저 에디터 UI:

- **Run** (실행 버튼): 함수 실행, 로그 출력
- **Debug** (디버그 버튼): 브레이크포인트에서 정지, 변수 inspect
- **Breakpoints**: 라인 번호 좌측 클릭으로 토글
- **Step over / into / out**: 디버그 패널 상단 버튼
- **Watch**: 표현식 추가하여 값 추적
- **Call Stack**: 호출 스택 패널

한계:
- **트리거 호출**은 디버거 진입 불가 — onEdit/onOpen은 수동으로 호출해 시뮬레이션 필요
- **라이브러리 코드** 내부 step-in 불가 — 라이브러리 프로젝트에서 직접 디버깅
- **HTML Service 클라이언트 사이드**는 브라우저 DevTools에서 디버깅 (서버 디버거 별개)
- **6분 제한 중 정지** — 디버거에서 멈춰있어도 6분 카운트는 계속 흐른다

## Executions 페이지

좌측 메뉴 "Executions" — 모든 실행 이력 시각화.

- 함수명, 호출자(사용자/트리거/API), 시작 시각, 실행 시간, 상태(성공/실패) 표시
- 행 클릭 → 해당 실행의 로그 + stack trace
- 필터: 함수명, 상태, 기간, 트리거 유형
- **트리거 실패**도 여기서 확인. 매니페스트 알림 설정으로 메일도 받을 수 있음.

## 트리거 실패 알림

설치된 트리거가 실패할 때 Google이 메일 알림을 보낸다. 기본은 **즉시 발송**이지만 빈도를 조절할 수 있다.

에디터 → Triggers → 행 끝 메뉴 → "Notifications":
- Immediately
- Hourly (집계)
- Daily
- Weekly

CI 모니터링은 Cloud Logging + Monitoring 알림 정책으로 더 정밀하게 가능.

## 디버깅 패턴

### 1. 로그 + 재실행

```javascript
function processSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  console.log('rows=%d, cols=%d', data.length, data[0]?.length);

  data.forEach((row, i) => {
    try {
      handleRow_(row);
    } catch (e) {
      console.error('row %d failed: %s', i, e.message);
    }
  });
}
```

### 2. Properties로 진행 상태 dump

장기 실행 함수에서 중간 상태를 PropertiesService에 저장 → 실패 후 재시작 가능.

```javascript
const prop = PropertiesService.getScriptProperties();
function resumableJob() {
  let lastIdx = Number(prop.getProperty('lastIdx') || 0);
  const items = getItems_();
  for (let i = lastIdx; i < items.length; i++) {
    process_(items[i]);
    prop.setProperty('lastIdx', String(i + 1));
  }
}
```

### 3. Dry run 모드

```javascript
const DRY_RUN = PropertiesService.getScriptProperties().getProperty('DRY_RUN') === '1';
if (DRY_RUN) console.log('would send to %s', to);
else GmailApp.sendEmail(to, subj, body);
```

### 4. 실행 컨텍스트 dump

```javascript
function logCtx_(label) {
  console.log('%s | user=%s | now=%s | tz=%s',
    label,
    Session.getActiveUser().getEmail(),
    new Date().toISOString(),
    Session.getScriptTimeZone());
}
```

## 함정

- **Logger 출력은 같은 실행 내에서만 누적**. `Logger.getLog()`은 새 실행이 시작되면 비어 있다.
- **트리거 컨텍스트의 사용자**: 시간 트리거는 트리거 소유자 컨텍스트. `Session.getActiveUser()`가 빈 문자열일 수 있다(공유 도메인 외).
- **민감 정보 로깅**: PII/토큰을 그대로 로그에 남기지 말 것. Cloud Logging은 보관 기간 동안 다른 사용자도 GCP 권한이 있으면 볼 수 있다.
- **로그 비용**: 표준 GCP 프로젝트에서 Cloud Logging은 무료 quota 초과 시 과금. 매 호출마다 큰 객체를 로깅하면 비용 발생.
- **콘솔 출력 truncation**: 너무 긴 단일 로그 엔트리는 잘릴 수 있음 — 여러 번 나눠 로깅하거나 핵심 필드만.
- **stderr 없음**: `console.error`는 ERROR severity로 기록될 뿐, 별도 stderr 스트림은 없다.
- **`console.trace` 미지원**: V8 console의 일부 메서드만 구현됨 — `trace`, `dir`, `table` 등은 동작하지 않거나 fallback.

## 참고

- https://developers.google.com/apps-script/guides/logging
- https://developers.google.com/apps-script/reference/base/console
- https://developers.google.com/apps-script/reference/base/logger
- https://developers.google.com/apps-script/guides/cloud-platform-projects
- https://cloud.google.com/error-reporting/docs
- https://github.com/RomainVialard/ErrorHandler (3rd party — 향상된 에러 처리)
