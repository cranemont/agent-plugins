---
name: appscript
description: Google Apps Script(GAS, V8 런타임) 한국어 레퍼런스 — Sheets/Gmail/Drive/Calendar/Docs/Slides/Forms 자동화, 트리거, 웹앱(doGet/doPost), OAuth scope, quota, clasp/TypeScript, 매니페스트(appsscript.json), 6분 제한 회피 등 50여 개 문서를 라우팅 표로 필요한 부분만 읽어 답한다. Use when the user writes, debugs, or asks about Apps Script / GAS / 구글 앱스크립트 code; when GAS identifiers appear (SpreadsheetApp, GmailApp, DriveApp, CalendarApp, DocumentApp, SlidesApp, FormApp, UrlFetchApp, PropertiesService, CacheService, LockService, Utilities, Session, ScriptApp, HtmlService, ContentService, google.script.run, doGet/doPost, onOpen/onEdit/onChange/onFormSubmit, newTrigger, appsscript.json, oauthScopes, clasp, @types/google-apps-script); or for tasks like Sheets 자동화, Gmail 발송, 구글 캘린더 일정, 구글 폼 응답 처리, 6분 제한 회피, Apps Script quota/한도, 권한 에러.
---

# Google Apps Script 한국어 레퍼런스 스킬

이 스킬 디렉토리의 `docs/`에 V8 런타임 기준 50개 마크다운 문서가 있다. 전체를 컨텍스트로 올리지 말고 **작업 라우팅 → 후보 파일 1~2개 → 부분 Read** 순서로 답한다.

아래 표의 `docs/...` 경로는 모두 이 SKILL.md가 있는 디렉토리 기준 상대 경로다. 파일을 읽거나 검색할 때는 이 SKILL.md의 위치를 기준으로 경로를 풀면 된다.

---

## 입력

- **필수**: 사용자가 묻거나 시키는 작업 (자연어, 코드 스니펫, 에러 메시지 어떤 형태든)
- **컨텍스트**: 현재 워크스페이스의 `appsscript.json` / `.clasp.json` / `*.gs` / `*.ts` 가 있다면 작업 환경 파악에 활용

---

## 탐색 절차

### Step 1 — 후보 파일 결정 (Read 없이 표만 보고)

아래 두 표로 1~2개 후보 파일을 결정한다. **둘 다에서 잡히면 둘 다 후보**.

#### 작업별 라우팅

| 작업 / 질문 영역 | 1차 파일 | 2차 파일 |
|---|---|---|
| Apps Script 입문, 프로젝트 종류 | `docs/01-overview/introduction.md` | `docs/01-overview/project-types.md` |
| V8 / Rhino / 마이그레이션 | `docs/01-overview/runtime-v8.md` | — |
| 매니페스트 (`appsscript.json`) 편집 | `docs/01-overview/manifest-appsscript-json.md` | — |
| Sheets 자동화 (Range/setValues 등) | `docs/02-services/spreadsheet.md` | `docs/08-patterns/performance-patterns.md` |
| Docs 자동화 | `docs/02-services/document.md` | — |
| Slides 자동화 | `docs/02-services/slides.md` | — |
| Forms 자동화 / 응답 처리 | `docs/02-services/forms.md` | — |
| Gmail 발송·검색·라벨 | `docs/02-services/gmail.md` | `docs/05-auth/oauth-scopes.md` |
| Calendar 일정 | `docs/02-services/calendar.md` | — |
| Drive 파일·폴더·검색 | `docs/02-services/drive.md` | — |
| 외부 API 호출 (HTTP) | `docs/02-services/url-fetch.md` | `docs/08-patterns/error-handling.md` |
| 상태 저장 (Properties) | `docs/02-services/properties.md` | — |
| 캐시 | `docs/02-services/cache.md` | — |
| 동시 실행 방지 (Lock) | `docs/02-services/lock.md` | — |
| Base64 / 해시 / 압축 / 날짜 포맷 | `docs/02-services/utilities.md` | — |
| 사용자/타임존 (Session) | `docs/02-services/session.md` | — |
| Advanced Google Services 활성화 | `docs/02-services/advanced-services.md` | — |
| 외부 RDB 연결 (Cloud SQL/MySQL/SQL Server/Oracle) | `docs/02-services/jdbc.md` | `docs/02-services/properties.md` |
| BigQuery 쿼리 (대시보드 데이터원) | `docs/02-services/bigquery.md` | `docs/04-web-apps/html-service.md` |
| XML/RSS/Atom/SOAP 파싱·생성 | `docs/02-services/xml.md` | `docs/02-services/url-fetch.md` |
| 지오코딩·경로·정적지도·고도 (Maps) | `docs/02-services/maps.md` | `docs/06-quotas/quotas-and-limits.md` |
| 서버사이드 차트 이미지 생성 (리포트) | `docs/02-services/charts.md` | `docs/02-services/spreadsheet.md` |
| 선형계획·최적화 (LP/MILP 솔버) | `docs/02-services/optimization.md` | — |
| 기계 번역 (translate) | `docs/02-services/language.md` | `docs/02-services/cache.md` |
| 단순 트리거 (`onOpen`/`onEdit`/…) | `docs/03-triggers/simple-triggers.md` | — |
| 설치형 트리거 (정기 실행 cron 포함) | `docs/03-triggers/installable-triggers.md` | `docs/03-triggers/trigger-quotas.md` |
| Web App 만들기 (`doGet`/`doPost`) | `docs/04-web-apps/doGet-doPost.md` | `docs/04-web-apps/deployment.md` |
| HTML Service / 템플릿 / XSS | `docs/04-web-apps/html-service.md` | `docs/08-patterns/security-best-practices.md` |
| JSON API 응답 (ContentService) | `docs/04-web-apps/content-service.md` | — |
| 웹앱 클라↔서버 (`google.script.run`) | `docs/04-web-apps/client-server-comm.md` | — |
| 커스텀 메뉴·다이얼로그·사이드바 (편집기 UI) | `docs/04-web-apps/menus-dialogs-sidebars.md` | `docs/04-web-apps/html-service.md` |
| 웹앱 배포 / `/exec` `/dev` | `docs/04-web-apps/deployment.md` | — |
| OAuth scope / Sensitive scope | `docs/05-auth/oauth-scopes.md` | — |
| Active vs Effective User, 실행 컨텍스트 | `docs/05-auth/execution-context.md` | — |
| 권한 요청 흐름 / `AuthorizationMode` | `docs/05-auth/permissions-flow.md` | `docs/05-auth/oauth-scopes.md` |
| Quota / 한도 표 | `docs/06-quotas/quotas-and-limits.md` | `docs/06-quotas/best-practices.md` |
| 6분 제한 회피 / 분할 실행 | `docs/08-patterns/performance-patterns.md` | `docs/02-services/properties.md` |
| 지수 백오프 / 재시도 | `docs/08-patterns/error-handling.md` | `docs/06-quotas/best-practices.md` |
| clasp (로컬 개발) | `docs/07-development/clasp.md` | — |
| TypeScript 설정 | `docs/07-development/typescript.md` | — |
| 테스트 (GasT/QUnitGS2) | `docs/07-development/testing.md` | — |
| 로깅 / 디버깅 (console/Logger) | `docs/07-development/logging-debugging.md` | — |
| 버전 / 배포 | `docs/07-development/version-deployment.md` | `docs/07-development/libraries.md` |
| 라이브러리 제작·사용 (재사용 코드 공유) | `docs/07-development/libraries.md` | `docs/07-development/version-deployment.md` |
| 보안 / Webhook secret / API key 저장 | `docs/08-patterns/security-best-practices.md` | — |
| 자주 쓰는 레시피 모음 | `docs/08-patterns/common-recipes.md` | — |

#### API 식별자 → 파일

| 키워드 / 클래스 / 메서드 | 파일 |
|---|---|
| `SpreadsheetApp` `Spreadsheet` `Sheet` `Range` `getRange` `getValues` `setValues` `RichText` `DataValidation` `Banding` `Pivot` `Chart` `Sheets` Advanced | `docs/02-services/spreadsheet.md` |
| `DocumentApp` `Body` `Paragraph` `Table` `ListItem` `Text` `ElementType` `replaceText` `findText` | `docs/02-services/document.md` |
| `SlidesApp` `Presentation` `Slide` `Shape` `Image` Layout Master placeholder | `docs/02-services/slides.md` |
| `FormApp` `ItemType` `submitGrades` | `docs/02-services/forms.md` |
| `GmailApp` `MailApp` `GmailMessage` `GmailThread` `GmailLabel` `GmailAttachment` | `docs/02-services/gmail.md` |
| `CalendarApp` `CalendarEvent` `EventColor` | `docs/02-services/calendar.md` |
| `DriveApp` `File` `Folder` `FileIterator` `Blob` Drive Advanced | `docs/02-services/drive.md` |
| `UrlFetchApp` `fetch` `fetchAll` `HTTPResponse` `muteHttpExceptions` | `docs/02-services/url-fetch.md` |
| `PropertiesService` `ScriptProperties` `UserProperties` `DocumentProperties` `getProperties` | `docs/02-services/properties.md` |
| `CacheService` `ScriptCache` `UserCache` `DocumentCache` `putAll` `getAll` | `docs/02-services/cache.md` |
| `LockService` `tryLock` `waitLock` | `docs/02-services/lock.md` |
| `Utilities` `base64Encode` `base64DecodeWebSafe` `formatDate` `parseCsv` `computeDigest` `computeHmacSha256Signature` `gzip` `sleep` `getUuid` | `docs/02-services/utilities.md` |
| `Session` `getActiveUser` `getEffectiveUser` `getScriptTimeZone` | `docs/02-services/session.md` |
| `Jdbc` `getConnection` `getCloudSqlConnection` `JdbcConnection` `JdbcPreparedStatement` `JdbcResultSet` `executeBatch` | `docs/02-services/jdbc.md` |
| `XmlService` `parse` `getRootElement` `Element` `getChild` `getChildText` `Namespace` `getPrettyFormat` `getRawFormat` | `docs/02-services/xml.md` |
| `Maps` `newGeocoder` `newDirectionFinder` `newStaticMap` `newElevationSampler` `geocode` `getDirections` | `docs/02-services/maps.md` |
| `Charts` `newDataTable` `newColumnChart` `newPieChart` `newLineChart` `DataTableBuilder` `ColumnType` `getBlob` | `docs/02-services/charts.md` |
| `LinearOptimizationService` `createEngine` `addVariable` `addConstraint` `setObjectiveCoefficient` `solve` `setMaximization` | `docs/02-services/optimization.md` |
| `LanguageApp` `translate` (기계 번역, 자동 언어 감지) | `docs/02-services/language.md` |
| `BigQuery` `Jobs.query` `getQueryResults` `Jobs.insert` `dryRun` `maximumBytesBilled` `useLegacySql` (Advanced Service) | `docs/02-services/bigquery.md` |
| `ScriptApp` `newTrigger` `ClockTriggerBuilder` `getProjectTriggers` `deleteTrigger` | `docs/03-triggers/installable-triggers.md` |
| `onOpen` `onEdit` `onSelectionChange` `onChange` `onFormSubmit` `onInstall` | `docs/03-triggers/simple-triggers.md` |
| `doGet` `doPost` `e.parameter` `e.postData` `e.parameters` | `docs/04-web-apps/doGet-doPost.md` |
| `HtmlService` `createHtmlOutput` `createHtmlOutputFromFile` `createTemplateFromFile` `HtmlTemplate` `<?= ?>` `<?!= ?>` `XFrameOptionsMode` | `docs/04-web-apps/html-service.md` |
| `ContentService` `createTextOutput` `MimeType` JSONP | `docs/04-web-apps/content-service.md` |
| `google.script.run` `withSuccessHandler` `withFailureHandler` `withUserObject` `google.script.host` `google.script.url` `google.script.history` | `docs/04-web-apps/client-server-comm.md` |
| `getUi` `createMenu` `addItem` `addToUi` `createAddonMenu` `alert` `prompt` `ButtonSet` `showModalDialog` `showModelessDialog` `showSidebar` `Ui` | `docs/04-web-apps/menus-dialogs-sidebars.md` |
| `oauthScopes` Sensitive scope GCP Default vs Standard | `docs/05-auth/oauth-scopes.md` |
| `AuthorizationMode` `getAuthorizationInfo` FULL/LIMITED/NONE | `docs/05-auth/permissions-flow.md` |
| `runtimeVersion` `V8` `Rhino` ES6 호환 | `docs/01-overview/runtime-v8.md` |
| `appsscript.json` `timeZone` `webapp` `executionApi` `addOns` `dependencies` `urlFetchWhitelist` | `docs/01-overview/manifest-appsscript-json.md` |
| `clasp` `.clasp.json` `.claspignore` `clasp push` `clasp deploy` `clasp logs` | `docs/07-development/clasp.md` |
| `@types/google-apps-script` tsconfig namespace transpile | `docs/07-development/typescript.md` |
| `console.log` `Logger.log` Cloud Logging `exceptionLogging` | `docs/07-development/logging-debugging.md` |
| `GasT` `QUnitGS2` Jest 통합 테스트 | `docs/07-development/testing.md` |
| 라이브러리 `dependencies.libraries` `userSymbol` `libraryId` `developmentMode` identifier | `docs/07-development/libraries.md` |
| Code Version vs Deployment, `libraryVersion` | `docs/07-development/version-deployment.md` |
| Quota 한도 (분/일/실행시간/이메일 발송 등) | `docs/06-quotas/quotas-and-limits.md` |
| 배치 (`setValues` 한 번에), 6분 회피, `flush`, `fetchAll` 병렬 | `docs/08-patterns/performance-patterns.md` |
| try/catch, 지수 백오프, `muteHttpExceptions`, 트리거 실패 알림 | `docs/08-patterns/error-handling.md` |
| Webhook secret, Properties로 API key, `<?!= ?>` XSS | `docs/08-patterns/security-best-practices.md` |
| 시트→객체배열, Gmail→Drive, 폼→Webhook, Doc 템플릿 등 레시피 | `docs/08-patterns/common-recipes.md` |

### Step 2 — 표로 안 잡히면 grep / Glob

표에서 후보가 안 나오거나 모호하면 검색 도구로 직접 위치를 찾는다 (경로는 이 스킬 디렉토리 기준).

```bash
# 클래스/메서드명/한국어 키워드를 docs 전체에서 위치 찾기
rg -n --no-heading -t md '키워드' docs/

# 파일명에 키워드 매칭
ls docs/**/*.md | rg -i '키워드'
```

파일 검색 도구가 있다면 그것으로도 가능: 먼저 매칭 파일 목록으로 좁히고, 좁아지면 매칭 라인 ± 주변 몇 줄까지 확인한다.

후보 파일이 3개 이상이면 한 번 더 좁힌다. 그래도 광범위하면 Step 4로.

### Step 3 — 후보 파일 부분 Read

후보 파일은 길 수 있다 (`spreadsheet.md`는 1605줄). 통째로 읽지 말고:

1. **첫 30~50줄 Read**: 출처 URL · 목차 · 진입점 확인
2. **grep으로 잡은 라인 ± 50줄 Read**: 해당 오프셋부터 80줄 정도만 부분 읽기
3. 필요하면 추가로 부분 Read 반복

전체를 읽어야만 답할 수 있는 경우는 드물다. 답을 도출할 수 있을 만큼만 읽는다.

### Step 4 — 광범위 탐색은 위임 또는 반복 탐색

문서 여러 개를 가로질러 비교·교차 검증해야 하는 경우 (예: "Sheets에서 Range 작업하면서 Lock과 Cache를 어떻게 조합하지?"), 서브에이전트/백그라운드 탐색을 지원하는 환경이라면 탐색 에이전트에 위임하고, 아니면 grep → 부분 Read를 직접 반복한다. 위임할 때는 다음을 명시한다:

- 검색 범위: "quick" / "medium" / "very thorough"
- 작업 디렉토리 경로: 이 스킬의 `docs/`
- 비교 축 (예: "API 시그니처, quota, 동시 실행 안전성")

---

## 출력 규칙

1. **출처를 함께 보여라.** 어떤 파일·어느 섹션을 근거로 답했는지 `docs/<path>.md:<line>` 형태로 인용. 사용자가 검증 가능해야 한다.
2. **"공식 문서 확인 필요" 표기를 그대로 보존하라.** 본문에 그 문구가 있는 부분은 LLM 추론으로 메우지 말고, 사용자에게 공식 페이지 (developers.google.com/apps-script/…) 확인을 안내. 본 레퍼런스 TOC의 "알려진 한계" 섹션도 같은 정책.
3. **Quota·한도 수치는 변경 가능성 명시.** 운영 코드 작성 시 공식 quotas 페이지 재확인 권고를 답변에 한 줄 덧붙인다.
4. **추론 금지 영역**: 문서가 명시적으로 다루지 않는 API 동작·필드 값·enum 값을 만들어내지 말 것. 문서에 없으면 "문서에 명시 없음 — 공식 페이지 확인 필요"로 답한다.
5. **답변 언어**: 사용자 질문이 한국어면 한국어로, 영어면 영어로. 단 API 식별자는 항상 영어 원형 그대로.
6. **코드 제안 시 V8 기준.** `runtimeVersion: "V8"` 가정. ES6+ 문법 사용 가능. Rhino 한정 동작은 별도 명시.

---

## 자주 막히는 곳 (선제적 안내)

- **`getValue()` 반복 호출** → 시트 호출은 매우 느림. `getValues()` 일괄로. → `docs/08-patterns/performance-patterns.md`
- **6분(스크립트 실행) 한도** → 분할 + Properties로 진행 상태 저장 + 트리거로 재개. → `docs/08-patterns/performance-patterns.md`, `docs/02-services/properties.md`
- **`oauthScopes` 추가 후 권한 동의 재요청 필요** → 배포 후 재인증 흐름. → `docs/04-web-apps/deployment.md`, `docs/05-auth/permissions-flow.md`
- **`<?= ?>` vs `<?!= ?>` 헷갈림 (XSS)** → 기본은 이스케이프되는 `<?= ?>`, raw는 `<?!= ?>`. → `docs/04-web-apps/html-service.md`, `docs/08-patterns/security-best-practices.md`
- **simple trigger 권한 한계** (`onOpen`/`onEdit`는 외부 호출 불가) → 설치형 트리거로 전환. → `docs/03-triggers/simple-triggers.md` → `installable-triggers.md`
- **`Session.getActiveUser()`가 빈 문자열 반환** → 도메인 외 사용자 시 정책상 제한. → `docs/02-services/session.md`, `docs/05-auth/execution-context.md`

---

## 문서 유지보수 (관리자 전용)

`docs/`는 이 저장소(agent-plugins) **루트**에서 관리한다. 스킬 사용자는 신경 쓸 필요 없다.

- **정기 점검·TOC·링크·날짜** (LLM 없음): 저장소 루트 `scripts/appscript-docs/` 의 스크립트.
  - `scripts/appscript-docs/check-updates.sh` — 공식 출처 변경 감지
  - `scripts/appscript-docs/build-toc.sh` — `docs/TOC.md` 자동 영역 갱신
  - `scripts/appscript-docs/check-links.sh`, `bump-date.sh`
- **문서 재생성** (LLM 필요): 저장소의 `.claude/skills/appscript-docs-regen` 스킬. 출처 URL을 다시 확인해 재작성.

자세한 흐름은 `scripts/appscript-docs/README.md`.
