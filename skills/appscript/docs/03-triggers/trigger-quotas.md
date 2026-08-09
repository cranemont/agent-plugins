# Trigger Quotas & Execution Limits

> **출처**
> - https://developers.google.com/apps-script/guides/services/quotas
> - https://developers.google.com/apps-script/guides/triggers
> - https://developers.google.com/apps-script/guides/triggers/installable
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script는 트리거와 스크립트 실행에 대해 **계정 등급(소비자 Gmail vs Workspace)** 별로 일일/실행당 한도를 둔다. 한도를 넘기면 트리거가 실행되지 않거나 함수 중간에 강제 종료된다. 운영 환경(특히 Workspace 자동화)에서는 이 한도를 사전에 계산해 설계해야 한다.

> 본 문서의 수치는 **2026-05-11 기준** Google 공식 quota 문서에서 인용했다. 수치는 사전 통지 없이 변경될 수 있으니 운영 전 반드시 원문 확인.

## 핵심 한도 표

| 항목 | Consumer (Gmail) | Workspace (Business/Enterprise/EDU) |
| --- | --- | --- |
| **Script runtime / execution** (1회 실행 최대 시간) | 6 min | 6 min |
| **Custom function runtime** (Sheets 셀 함수) | 30 sec | 30 sec |
| **Simple trigger runtime** (`onOpen`, `onEdit` 등) | **30 sec** | **30 sec** |
| **Trigger total runtime / day** | **90 min / day** | **6 hr / day** |
| **Triggers / user / script** | **20 / user / script** | **20 / user / script** |
| **Simultaneous executions / user** | 30 | 30 |
| **Email recipients / day** (`MailApp` / `GmailApp.sendEmail`) | 100 | 1,500 |
| **URL Fetch calls / day** | 20,000 | 100,000 |
| **URL Fetch response size** | 50 MB | 50 MB |

> 출처: https://developers.google.com/apps-script/guides/services/quotas

## 트리거 관련 한도 상세

### 1. 스크립트 실행 시간 (Script runtime)

- **6분(360초)** 을 초과하면 `Exceeded maximum execution time` 오류로 종료된다.
- Installable Trigger도 이 한도를 적용받는다 — 30분/3시간을 가정하는 코드는 동작하지 않는다.
- 실행 시간이 길어질 우려가 있으면 작업을 분할하고 **재진입형(self-rescheduling)** 패턴을 사용한다(아래 예제 참고).

### 2. Simple Trigger 30초 제한

- `onOpen`, `onEdit`, `onSelectionChange` 같은 Simple Trigger는 **30초 안에** 끝나야 한다.
- 30초를 넘기면 강제 종료되며, 사용자 화면에는 빨간 오류 토스트가 짧게 나타날 뿐 별도 메일 알림은 없다.
- 30초 이상 걸리는 작업이라면 Simple에서 작업 메타데이터만 큐잉하고 Installable time-driven 트리거가 처리하도록 한다.

### 3. Trigger total runtime / day

- 모든 Installable 트리거 실행 시간의 **합산** 한도.
- Consumer: **90분 / 일** — 5분짜리 트리거는 하루 18회로 한계.
- Workspace: **6시간 / 일** — 5분짜리 트리거는 하루 72회로 한계.
- 한도 소진 시: 그날 남은 트리거 실행이 모두 스킵되며 다음날(요청 후 24시간)에 리셋된다.

### 4. 트리거 개수 (Triggers / user / script)

- 한 사용자가 **하나의 스크립트 프로젝트** 안에 만들 수 있는 Installable 트리거 최대 **20개**.
- 21번째 `create()` 호출은 `Exception: This script has too many triggers...` 오류로 실패한다.
- 동일 함수에 대해 여러 트리거를 만들 수 있으므로(예: `onEdit` + `onChange`) 의도치 않게 늘어나기 쉽다. 설치 함수는 항상 idempotent하게.

### 5. Simultaneous executions

- 같은 사용자가 동시에 실행할 수 있는 스크립트 실행 수: **30**.
- 트리거가 빠르게 중첩 발화하면 31번째 요청부터 큐잉되거나 실패한다.
- `LockService`로 직렬화하는 것이 안전.

## 트리거 동작/재시도 정책

### 트리거 실패 시 동작

- **Installable Trigger** 실행이 실패(에러 발생, 시간 초과 등)하면 소유자에게 *"Summary of failures for Google Apps Script"* 메일이 발송된다.
- 발송 빈도/임계값은 사용자별 설정 가능: Apps Script IDE → 트리거 화면 → **알림(Notifications)** 에서 "즉시"/"매시간"/"매일"/"끄기" 선택.
- **Time-driven** 트리거가 실패해도 **자동 재시도는 보장되지 않는다**. 일부 케이스에서 짧은 시간 내 재시도가 일어날 수 있지만, 멱등성을 코드 수준에서 보장해야 한다.
- **Simple Trigger** 실패는 소유자 메일이 아니라 사용자 화면의 일시적 알림으로만 표시된다.

### 트리거 미발화 케이스

- 파일을 **읽기 전용/댓글 전용**으로 열었을 때 Simple Trigger는 발화하지 않는다.
- **다른 스크립트/API의 수정**은 `onEdit`을 발화시키지 않는다(예외: `Form.submitGrades()`).
- 트리거 소유자의 OAuth 동의가 만료/철회됐거나 새 scope이 추가됐다면 발화하지 않는다.
- Workspace 도메인 정책으로 외부 호출이 차단된 경우, 함수 실행 자체는 발화하지만 안에서 예외 발생.

## 한도 초과 대응 패턴

### 패턴 1: 6분 한계를 넘기는 배치 (재진입형 트리거)

```javascript
const CHUNK = 100;

function processBatch() {
  const props = PropertiesService.getScriptProperties();
  const start = Number(props.getProperty("cursor") || "0");
  const data = readPendingItems(start, CHUNK); // 직접 구현
  if (data.length === 0) {
    props.deleteProperty("cursor");
    return;
  }

  const startedAt = Date.now();
  for (const item of data) {
    if (Date.now() - startedAt > 5 * 60 * 1000) break; // 5분 한도(여유 1분)
    handleItem(item);
    props.setProperty("cursor", String(item.id));
  }

  // 다음 실행 예약
  ScriptApp.newTrigger("processBatch").timeBased().after(60 * 1000).create();
}
```

> `after()`로 만든 일회성 트리거는 실행 후에도 객체가 남는다. `processBatch` 시작부에서 자신을 가리키는 트리거를 모두 제거해 누적을 방지하는 것이 좋다.

### 패턴 2: Lock으로 동시 실행 차단

```javascript
function safeJob() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    console.warn("이미 실행 중. 스킵.");
    return;
  }
  try {
    // ... 실제 작업 ...
  } finally {
    lock.releaseLock();
  }
}
```

### 패턴 3: 트리거 누적 정리

```javascript
function gcTriggers(handlerName) {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === handlerName)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
```

배포 직후 또는 매일 한 번 호출해 `after()`/`atDate()`로 만들었던 일회성 트리거를 청소한다.

### 패턴 4: 메일 폭주 방지

트리거가 실패하면 매번 알림 메일이 가서 받은편지함이 폭주할 수 있다.

- IDE 트리거 화면에서 **알림 빈도를 "Daily"** 로 낮춘다.
- 또는 함수 안에서 `try/catch`로 잡고 `console.error`만 남겨 자체 모니터링 시트로 보낸다.

```javascript
function watchedTask() {
  try {
    doWork();
  } catch (err) {
    SpreadsheetApp.openById(LOG_ID)
      .getSheetByName("errors")
      .appendRow([new Date(), err.message, err.stack]);
    // 다시 throw하지 않으면 Apps Script는 성공으로 본다 (알림 메일 X)
  }
}
```

## 한도 확인 / 모니터링

- 실시간 quota 사용량을 조회하는 공식 API는 없다.
- 운영 환경에서는 다음을 추천:
  - 각 트리거 실행 시작/종료 시각을 `ScriptProperties` 또는 로그 시트에 기록.
  - `Date.now()` 기반으로 5분/4분 등의 자체 안전 임계값을 둔다.
  - `Logger`/`console.log`는 IDE의 **Executions** 탭에서 30일까지 조회 가능.

## 자주 묻는 함정

- **"30분 한도"는 어디서 봤는데요?**
  - 공식 문서 quota 페이지(2026-05-11 기준)는 Consumer/Workspace 모두 **6분**으로 명시한다. 일부 오래된 블로그/comment에서 "Workspace는 30분"이라 적혀 있는 것은 과거 일부 시점/특수 환경에 한정된 정보이며, 현재 공식 한도는 6분이다. 운영 코드는 6분 한도로 가정한다.
- **Time-driven `everyMinutes(1)`은 정확히 1분마다인가?**
  - 아니다. "약 1분마다"이며 ±수 초의 지터가 있다. 정확한 분 단위가 필요하면 함수 내부에서 시간 체크.
- **트리거가 갑자기 안 돕니다.**
  - 가능성 1: OAuth scope 변경 후 소유자가 재동의를 하지 않음.
  - 가능성 2: trigger total runtime 한도 초과.
  - 가능성 3: 도메인 정책 차단(특히 `UrlFetchApp`).
  - 가능성 4: 소유자 계정 정지/비활성.

## 참고

- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/guides/triggers
- https://developers.google.com/apps-script/guides/triggers/installable
- [simple-triggers.md](./simple-triggers.md)
- [installable-triggers.md](./installable-triggers.md)
