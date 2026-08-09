# Quotas & Limits

> **출처**
> - https://developers.google.com/apps-script/guides/services/quotas
> - https://developers.google.com/apps-script/reference/cache/cache
> - https://developers.google.com/apps-script/reference/mail/mail-app
> - https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
> - https://support.google.com/drive/answer/37603 (Sheets 한도)
>
> **최종 확인일**: 2026-07-22

> **이 수치들은 자주 변경된다.** 프로덕션 의존 전 반드시 공식 quota 페이지(https://developers.google.com/apps-script/guides/services/quotas)에서 최신 값 확인. 공식 페이지에도 "subject to change without notice"라는 단서가 있음.

## 개요

Apps Script 제한은 크게 두 종류다.

1. **Quotas** — 24시간 누적 (자정 PT 리셋). 사용자당. 초과 시 다음 날까지 차단.
2. **Limitations** — 호출/실행 단위 즉시 적용. 코드 구조로 회피 불가능한 상한.

대부분의 quota는 **Consumer**(개인 gmail.com) vs **Workspace**(유료 도메인)로 차등 적용된다. Workspace Business/Enterprise 등급은 동일하게 처리되는 경우가 많지만, Education 계정은 별도 정책일 수 있다(공식 페이지 확인).

## 1. 서비스별 일일 Quota

| 항목 | Consumer | Workspace | 비고 |
|---|---|---|---|
| Calendar events created | 5,000 | 10,000 | `CalendarApp.createEvent` 등 |
| Contacts created | 1,000 | 2,000 | People API 통한 생성 |
| Documents created | 250 | 1,500 | `DocumentApp.create` |
| Spreadsheets created | 250 | 3,200 | `SpreadsheetApp.create` |
| Presentations created | 250 | 1,500 | `SlidesApp.create` |
| Slides created (slide-level) | 250 | 1,500 | |
| Files converted | 2,000 | 4,000 | Drive 파일 변환 |
| Groups read | 2,000 | 10,000 | `GroupsApp` |
| Translate calls | 5,000 | 20,000 | `LanguageApp.translate` |
| Static Map renders | 1,000 | 10,000 | `Maps.newStaticMap` |
| Map Direction queries | 1,000 | 10,000 | |
| Map Geocode calls | 1,000 | 10,000 | |
| Map Elevation samples | 1,000 | 10,000 | |
| Properties read/write | 50,000 | 500,000 | `PropertiesService` |
| JDBC connections | 10,000 | 50,000 | `Jdbc.getConnection` |
| JDBC failed connections | 100 | 500 | 너무 많으면 차단 |

## 2. Email Quota

### 일일 한도

| 항목 | Consumer | Workspace | 비고 |
|---|---|---|---|
| `MailApp` recipients/day | 100 | 1,500 | 외부+내부 합산 |
| `GmailApp` recipients/day | 100 | 1,500 | 외부+내부 합산 |
| Recipients **within domain** | 100 | 2,000 | Workspace 내부 메일은 더 후함 |
| Email read/write (excluding send) | 20,000 | 50,000 | `GmailApp.search` 등 |

> **주의**: "recipients"는 메시지 수가 아니라 **수신자 수**. `sendEmail({to: 'a, b, c'})`는 1통이지만 3 recipient. CC/BCC도 합산.

### 메시지 단위 한도

| 항목 | Consumer | Workspace |
|---|---|---|
| Recipients per message | 50 | 50 |
| Attachments per message | 250 | 250 |
| Total attachments size per message | 25 MB | 25 MB |
| Body size | 200 KB | 400 KB |

### `getRemainingDailyQuota()`

```javascript
const remaining = MailApp.getRemainingDailyQuota();
console.log(`남은 메일 수신자 수: ${remaining}`);
```

루프 진입 전 체크하면 quota 초과 사전 방지 가능.

## 3. URL Fetch (`UrlFetchApp`)

| 항목 | Consumer | Workspace |
|---|---|---|
| URL Fetch calls/day | 20,000 | 100,000 |
| Response size | 50 MB | 50 MB |
| POST payload | 50 MB | 50 MB |
| URL length | 2 KB (2,082 chars) | 2 KB |
| Headers (개수) | 100 | 100 |
| Header size | 8 KB | 8 KB |

### 추가 동작

- `fetchAll(requests)`은 **배치**지만 quota는 호출당 1로 차감 (요청 N개면 N 소진).
- 동일 호스트로의 동시 요청 수는 Apps Script가 내부적으로 throttle (정확한 수치 비공개, 공식 페이지 확인 필요).
- 외부 IP는 정해진 풀(https://developers.google.com/apps-script/guides/url-fetch) 에서 발급.

## 4. 실행 (Execution) 한계

| 항목 | Consumer | Workspace | 비고 |
|---|---|---|---|
| Script runtime per execution | **6분** | **6분** | 공식 quotas 표 기준 전 계정 동일 (과거 Workspace 30분 표기는 현재 표에서 삭제됨) |
| Custom function runtime | **30초** | 30초 | `=MYFUNC()` 한도 |
| Workspace add-on runtime | 30초 | 30초 | (Gemini Alpha: 2분) |
| Triggers total runtime/day | **90분** | **6시간** | 모든 트리거 합산 |
| Simultaneous executions/user | 30 | 30 | 동일 사용자의 동시 실행 |
| Simultaneous executions/script | 1,000 | 1,000 | 모든 사용자 합산 |

> **6분 한계 초과 에러**: `Exceeded maximum execution time`. 회피 패턴은 [best-practices.md](./best-practices.md) 참고.

## 5. Triggers

| 항목 | 한도 |
|---|---|
| Triggers per user per script | 20 |
| 최소 시간 트리거 간격 | 1분 (Add-on은 1시간) |
| 트리거 실행 계정 | 트리거 생성자 (installable) |
| API 호출로 트리거 발화 | **아니오** |

## 6. Properties / Cache / Lock

### PropertiesService

| 항목 | 한도 |
|---|---|
| Property value size | 9 KB |
| Total properties storage | 500 KB (per properties store) |
| Read/write/day (Consumer) | 50,000 |
| Read/write/day (Workspace) | 500,000 |

> Script/User/Document 각각 별도 500 KB. JSON.stringify된 값이 9 KB 넘으면 분할 저장 필요.

### CacheService

| 항목 | 한도 |
|---|---|
| Key length | 250 chars |
| Value size per key | 100 KB |
| Max items per cache | 1,000 (초과 시 expiration 가까운 것부터 제거) |
| Default expiration | 600 sec (10분) |
| Min expiration | 1 sec |
| Max expiration | 21,600 sec (6시간) |

`putAll()`이 `put()` 반복보다 효율적 (1회 호출).

### LockService

| 항목 | 한도 |
|---|---|
| Lock 종류 | Script, Document, User |
| `tryLock(ms)` 반환 | boolean |
| `waitLock(ms)` 실패 | Exception throw |
| 명시적 release | `releaseLock()` (자동 release는 스크립트 종료 시) |

Lock 자체에는 별도 일일 quota 없음.

## 7. Drive

| 항목 | Consumer | Workspace |
|---|---|---|
| Files created (총계) | Drive 자체 저장 한도 내 | 동일 |
| Files converted/day | 2,000 | 4,000 |
| Folder/file 검색 | quota 명시 없음 (rate-limit 가능) | |

> Drive 자체의 저장 quota (개인 15 GB, Workspace 등급별)는 Apps Script와 별개.

## 8. Sheets (Spreadsheet)

| 항목 | 한도 |
|---|---|
| 최대 셀 수 | **10,000,000 (1천만)** |
| 최대 열 수 | 18,278 (ZZZ열까지) |
| Excel/CSV import 시 동일 한도 | 10M cells |
| 셀 1개당 최대 문자 수 | 50,000 (Excel 변환 시 초과분 제거) |
| Connected Sheets pivot rows | 200,000 |
| Connected Sheets extract rows | 500,000 (또는 5M cells) |

> 시트당 행/열 한도는 별도 명시 없음. 전체 파일에서 10M cells가 hard cap.

### Apps Script에서 자주 만나는 Sheets 함수 한도

- `Range.setValues()`/`getValues()` 한 번의 호출은 시트 한도 내라면 사실상 제약 없으나, **6분 실행 한계**가 사실상 제한.
- `appendRow()` 반복은 매우 느림 — `setValues` 일괄 쓰기 권장.
- 동시 편집 충돌 시 `LockService` 권장.

## 9. HTML Service

| 항목 | 한도 |
|---|---|
| HtmlOutput response size | 명시 한도 없으나 실용상 큰 응답은 timeout 위험 |
| `google.script.run` payload | Apps Script ↔ HTML 통신 페이로드는 ~50 MB 안에서 제한적, 공식 수치 확인 필요 |
| iframe sandbox | `IFRAME` (legacy `NATIVE`는 deprecated) |

## 10. JDBC

| 항목 | Consumer | Workspace |
|---|---|---|
| Connections/day | 10,000 | 50,000 |
| Failed connections/day | 100 | 500 |
| 지원 DB | MySQL, Microsoft SQL Server, Oracle |

연속 100/500회 연결 실패 시 차단된다는 점 주의.

## 11. Add-on 관련

| 항목 | 한도 |
|---|---|
| Add-on 실행 시간 | 30초 (Gemini Alpha 한정 2분) |
| Add-on 최소 시간 트리거 | 1시간 |
| Marketplace 게시 요건 | Standard GCP + OAuth 검증 |

## 12. 기타 한도

| 항목 | 한도 |
|---|---|
| Apps Script projects per user | 50 |
| Script versions (saved revisions) | 200 |
| Manifest size | 명시 없음 |

## Consumer vs Workspace 빠른 비교 표

| 카테고리 | Consumer | Workspace |
|---|---|---|
| Script runtime | 6분 | 6분 |
| Trigger total/day | 90분 | 6시간 |
| URL Fetch | 20K calls | 100K calls |
| Email recipients | 100 | 1,500 (도메인 내부 2,000) |
| Properties R/W | 50K | 500K |
| JDBC connections | 10K | 50K |
| Documents/Slides created | 250 | 1,500 |
| Spreadsheets created | 250 | 3,200 |
| Calendar events | 5K | 10K |

## Quota 초과 에러 식별

| 에러 메시지 (대략) | 원인 |
|---|---|
| `Exceeded maximum execution time` | 6분 런타임 초과 |
| `Service invoked too many times` 또는 `... for one day` | 일일 quota 초과 |
| `Service using too much computer time for one day` | 트리거 누적 시간 초과 |
| `You have exceeded your daily quota` | 일반 quota 메시지 |
| `Authorization is required to perform that action` | quota 아님, 권한 |
| `Service unavailable: Spreadsheets` | 일시적 — 재시도 |
| `Rate Limit Exceeded` | 단기 rate limit (보통 minute scale) |

## 주의 / 함정

- **수치는 자주 변경**. 특히 Workspace 등급별로 미세 차이가 있으니 프로덕션에 의존 전 공식 페이지 재확인.
- **Quota는 effective user 기준으로 차감**. Web app `Execute as me`라면 소유자 quota만 소진된다 (사용자가 1만 명이어도). 반대로 `Execute as user accessing`이면 각자 자기 quota.
- **MailApp vs GmailApp**: 같은 quota 풀(1,500 recipients/day for Workspace) 공유. 두 서비스를 합쳐서 계산됨.
- **Recipient의 정의**: To/CC/BCC 모두 포함. 같은 주소를 여러 번 보내면 매번 1 recipient.
- **Custom function 30초**: 시트가 리계산할 때 같은 함수가 다수 셀에서 호출됨. 각 호출이 독립적으로 30초.
- **Trigger 90분 vs 6시간**: 모든 트리거의 **총 실행 시간**. 1분짜리 트리거를 100번 돌려도 누적되면 한도 도달.
- **9KB property value**: JSON 직렬화 후 9KB 초과 시 `Argument too large: value`. 키 분할 또는 Drive 파일로 저장 전환.
- **Cache 1,000 items / 100 KB**: 너무 많은 키 저장 시 자동 eviction. 핫 데이터만 캐싱.
- **PropertiesService 500 KB 총량**: 한도 도달 시 신규 쓰기 실패. 주기적으로 클린업.
- **Sheets 10M cells**: 빈 셀도 카운트되지 않지만, 한 시트에 빈 행을 1,000,000 추가하면 카운트됨. `deleteRows`/`deleteColumns`로 정리.
- **Workspace Education/Free 차이**: Education은 일부 quota가 Workspace 기준이지만 일부는 Consumer 수준일 수 있다 (공식 페이지 확인 필요).
- **Time-driven trigger 자동 비활성화**: 사용자가 장기간 스크립트와 상호작용 안 하면 (대략 6개월) 트리거가 일시 정지될 수 있다. 정확한 기준은 공식 페이지 확인.

## 참고

- https://developers.google.com/apps-script/guides/services/quotas (주 출처)
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
- https://developers.google.com/apps-script/reference/cache/cache
- https://developers.google.com/apps-script/reference/lock/lock
- https://developers.google.com/apps-script/reference/properties/properties-service
- https://support.google.com/drive/answer/37603 (Sheets 한도)
- https://workspace.google.com/pricing.html (Workspace 등급)
