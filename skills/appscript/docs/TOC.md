# Google Apps Script 한국어 레퍼런스 — 목차 (TOC)

> **목적**: AI 코딩 도구의 컨텍스트로 주입하기 위한 Apps Script 통합 레퍼런스
> **언어**: 한국어 본문 + 영어 API/식별자
> **버전 가정**: V8 런타임 (`runtimeVersion: "V8"`)
> **최종 갱신**: 2026-07-22
> **총 문서**: 50개 (약 18,700줄)

---

## 사용 안내 (AI 컨텍스트 주입)

- **전체 주입**: 토큰이 충분하면 디렉토리 전체를 컨텍스트로 사용.
- **선택 주입**: 작업 영역에 해당하는 파일만 골라 주입 — 본 TOC가 라우팅 역할.
- **출처 정책**: 모든 파일 상단에 공식 URL 출처가 명시됨. 수치(quota 등)는 변경 가능성이 있으므로 운영 코드 작성 시 공식 페이지 재확인.
- **불확실 표기**: 본문에 "공식 문서 확인 필요"라고 적힌 부분은 LLM이 추론으로 메우지 말 것.

---

## 작업별 빠른 라우팅

| 하려는 작업 | 먼저 읽을 문서 |
|---|---|
| Apps Script 처음 시작 | [01-overview/introduction.md](01-overview/introduction.md) → [project-types.md](01-overview/project-types.md) |
| Sheets 자동화 | [02-services/spreadsheet.md](02-services/spreadsheet.md) → [08-patterns/performance-patterns.md](08-patterns/performance-patterns.md) |
| Gmail 자동화 | [02-services/gmail.md](02-services/gmail.md) → [05-auth/oauth-scopes.md](05-auth/oauth-scopes.md) |
| Web App 만들기 | [04-web-apps/doGet-doPost.md](04-web-apps/doGet-doPost.md) → [deployment.md](04-web-apps/deployment.md) |
| 정기 실행 (cron) | [03-triggers/installable-triggers.md](03-triggers/installable-triggers.md) → [trigger-quotas.md](03-triggers/trigger-quotas.md) |
| 외부 API 호출 | [02-services/url-fetch.md](02-services/url-fetch.md) → [08-patterns/error-handling.md](08-patterns/error-handling.md) |
| 로컬 개발 (clasp/TS) | [07-development/clasp.md](07-development/clasp.md) → [typescript.md](07-development/typescript.md) |
| 6분 제한 회피 | [08-patterns/performance-patterns.md](08-patterns/performance-patterns.md) → [02-services/properties.md](02-services/properties.md) |
| 매니페스트 편집 | [01-overview/manifest-appsscript-json.md](01-overview/manifest-appsscript-json.md) |
| 권한 에러 디버깅 | [05-auth/permissions-flow.md](05-auth/permissions-flow.md) → [oauth-scopes.md](05-auth/oauth-scopes.md) |

---

## 01. 개요 & 런타임

| 파일 | 핵심 내용 |
|---|---|
| [introduction.md](01-overview/introduction.md) | Apps Script란 무엇인가, 사용 시나리오, 접근 가능 서비스, 다른 자동화 도구와의 비교 |
| [runtime-v8.md](01-overview/runtime-v8.md) | V8 런타임, 지원 ES 기능, Rhino → V8 마이그레이션, incompatibility 7가지 |
| [project-types.md](01-overview/project-types.md) | Standalone vs Container-bound 스크립트, `getActive*()`/`onOpen` 등 bound 전용 기능 |
| [manifest-appsscript-json.md](01-overview/manifest-appsscript-json.md) | `appsscript.json` 모든 필드: `timeZone`, `runtimeVersion`, `oauthScopes`, `dependencies`, `webapp`, `executionApi`, `addOns` 등 |
| [editor-and-local-dev.md](01-overview/editor-and-local-dev.md) | script.google.com 에디터, 단축키, 로컬 개발(clasp) 개요 |

## 02. 서비스 (Services)

### Workspace Document 서비스
| 파일 | 핵심 내용 |
|---|---|
| [spreadsheet.md](02-services/spreadsheet.md) | **(1605줄)** SpreadsheetApp / Spreadsheet / Sheet / Range / RichText / DataValidation / Banding / Pivot / Chart / Sheets Advanced API. 18개 클래스 영역, 함정 10가지, 패턴 8가지 |
| [document.md](02-services/document.md) | DocumentApp / Body / Paragraph / Table / ListItem / Text / ElementType enum, `replaceText`/`findText`, 헤더·푸터 |
| [slides.md](02-services/slides.md) | SlidesApp / Presentation / Slide / Shape / Image / Layout vs Master, placeholder 채우기, 템플릿 자동화 |
| [forms.md](02-services/forms.md) | FormApp / ItemType enum, 응답 조회, Sheets 연동, Quiz 모드 (`submitGrades`) |

### Workspace 커뮤니케이션·스토리지
| 파일 | 핵심 내용 |
|---|---|
| [gmail.md](02-services/gmail.md) | GmailApp vs MailApp, 검색 쿼리, 라벨, 첨부파일, 일일 발송 quota (Consumer/Workspace), Gmail Advanced Service |
| [calendar.md](02-services/calendar.md) | CalendarApp / CalendarEvent, 반복 일정, 게스트, EventColor enum, TimeZone 주의 |
| [drive.md](02-services/drive.md) | DriveApp / File / Folder / iterator, 검색 쿼리, 권한, Blob 변환, Advanced Drive Service |

### Script 유틸리티 서비스
| 파일 | 핵심 내용 |
|---|---|
| [url-fetch.md](02-services/url-fetch.md) | UrlFetchApp.fetch/fetchAll, 옵션, HTTPResponse, OAuth 헤더, 일일 호출/응답 크기 quota |
| [properties.md](02-services/properties.md) | Script/User/Document Properties 차이, 9KB/500KB 한도, 배치 호출 (`getProperties`) |
| [cache.md](02-services/cache.md) | Script/User/Document Cache, 최대 21,600초, 100KB 값 한도, `putAll`/`getAll` |
| [lock.md](02-services/lock.md) | Script/User/Document Lock, `tryLock` vs `waitLock`, 동시 실행 방지 패턴 |
| [utilities.md](02-services/utilities.md) | base64 (URL-safe 포함), formatDate, parseCsv, computeDigest/HmacSha256, gzip, sleep, getUuid |
| [session.md](02-services/session.md) | `getActiveUser()` vs `getEffectiveUser()`, `getScriptTimeZone()` |
| [advanced-services.md](02-services/advanced-services.md) | Advanced Service란, 활성화 방법, 기본 vs Advanced, 사용 가능 서비스 목록 |

### 외부 연동·데이터·연산
| 파일 | 핵심 내용 |
|---|---|
| [jdbc.md](02-services/jdbc.md) | Jdbc: Cloud SQL/외부 RDB 연결, PreparedStatement, 트랜잭션, Google IP 허용 |
| [xml.md](02-services/xml.md) | XmlService: 파싱/네임스페이스/생성, RSS·Atom·SOAP, Format 출력 |
| [maps.md](02-services/maps.md) | Maps: 지오코딩·경로·정적지도·고도, setAuthenticationByApiKey, quota |
| [charts.md](02-services/charts.md) | Charts: 서버사이드 차트 이미지(Blob) 생성, DataTable, Gmail/HTML 임베드 |
| [optimization.md](02-services/optimization.md) | Optimization: 선형계획(LP)·정수계획(MILP) 솔버, Status/VariableType |
| [language.md](02-services/language.md) | LanguageApp: 기계 번역 `translate`, 자동 감지, HTML 모드, quota |
| [bigquery.md](02-services/bigquery.md) | BigQuery(Advanced Service): `Jobs.query`·폴링·페이지네이션, 비용 가드(dryRun·maximumBytesBilled), 캐싱, HtmlService 대시보드 연동 |

## 03. 트리거 (Triggers)

| 파일 | 핵심 내용 |
|---|---|
| [simple-triggers.md](03-triggers/simple-triggers.md) | onOpen / onEdit / onSelectionChange / onChange / onFormSubmit / onInstall, 권한 제약, Event object |
| [installable-triggers.md](03-triggers/installable-triggers.md) | `ScriptApp.newTrigger()`, ClockTriggerBuilder, 이벤트 기반, 트리거 관리 |
| [trigger-quotas.md](03-triggers/trigger-quotas.md) | 트리거 개수/실행시간 제한, 실패 시 재시도, executionsFailed 알림 |

## 04. 웹 앱 (Web Apps)

| 파일 | 핵심 내용 |
|---|---|
| [doGet-doPost.md](04-web-apps/doGet-doPost.md) | `doGet(e)` / `doPost(e)`, e 객체 (parameter, postData), 라우팅, POST JSON 받기 |
| [html-service.md](04-web-apps/html-service.md) | createHtmlOutput / Template, 스크립틀릿 `<? ?>`, `<?= ?>`, `<?!= ?>` (XSS), IFRAME sandbox |
| [content-service.md](04-web-apps/content-service.md) | MimeType, JSON API 응답, JSONP, TextOutput |
| [deployment.md](04-web-apps/deployment.md) | /exec vs /dev, 버전 관리, Execute as Me vs User, Access 옵션, oauthScopes 재인증 |
| [client-server-comm.md](04-web-apps/client-server-comm.md) | google.script.run, withSuccessHandler/FailureHandler/UserObject, host/url/history |
| [menus-dialogs-sidebars.md](04-web-apps/menus-dialogs-sidebars.md) | Ui 서비스: 커스텀 메뉴(onOpen), alert/prompt, 모달/모덜리스 다이얼로그, 사이드바 |

## 05. 인증 & 권한

| 파일 | 핵심 내용 |
|---|---|
| [oauth-scopes.md](05-auth/oauth-scopes.md) | 자동 감지 vs `oauthScopes` 명시, 주요 scope 목록, Sensitive 여부, Default vs Standard GCP |
| [execution-context.md](05-auth/execution-context.md) | Active vs Effective User, 웹 앱 Execute as 옵션, 트리거 실행 권한 |
| [permissions-flow.md](05-auth/permissions-flow.md) | AuthorizationMode (FULL/LIMITED/NONE), `getAuthorizationInfo`, 권한 부여 URL |

## 06. Quota & 한계

| 파일 | 핵심 내용 |
|---|---|
| [quotas-and-limits.md](06-quotas/quotas-and-limits.md) | 약 45개 항목 표: Email/URL Fetch/Trigger runtime/Properties/Cache/Sheets/JDBC, Consumer vs Workspace 컬럼 |
| [best-practices.md](06-quotas/best-practices.md) | 배치, 캐싱, 지수 백오프, LockService, Properties로 진행상태, 6분 한계 회피, 에러 식별 |

## 07. 개발 도구

| 파일 | 핵심 내용 |
|---|---|
| [clasp.md](07-development/clasp.md) | 설치/로그인, clone/push/pull/deploy/logs, .clasp.json/.claspignore, v2 vs v3 차이 |
| [typescript.md](07-development/typescript.md) | @types/google-apps-script, tsconfig 권장, transpile 동작, 모듈 한계, namespace 패턴 |
| [testing.md](07-development/testing.md) | 공식 프레임워크 없음, GasT/QUnitGS2, 순수 함수 분리해 jest, 통합 테스트 패턴 |
| [logging-debugging.md](07-development/logging-debugging.md) | console.log vs Logger.log, Cloud Logging, 디버거, exceptionLogging |
| [version-deployment.md](07-development/version-deployment.md) | Code Version vs Deployment, 버전·배포 개념, 리소스 공유 모델 |
| [libraries.md](07-development/libraries.md) | 라이브러리 제작·사용, `dependencies.libraries`, HEAD vs version, 리소스 공유 |

## 08. 패턴 & 실전

| 파일 | 핵심 내용 |
|---|---|
| [performance-patterns.md](08-patterns/performance-patterns.md) | setValues 배치, Cache 활용, 6분 회피 (분할+재개), fetchAll 병렬, flush() 의미 |
| [error-handling.md](08-patterns/error-handling.md) | try/catch, 에러 타입, 지수 백오프, muteHttpExceptions, 트리거 실패 알림 |
| [common-recipes.md](08-patterns/common-recipes.md) | 15+ 실용 레시피: 시트→객체배열, Gmail→Drive, 폼→Webhook, Doc 템플릿, 권한 일괄 변경 |
| [security-best-practices.md](08-patterns/security-best-practices.md) | XSS (`<?= ?>` vs `<?!= ?>`), Webhook secret, Properties로 API key, 권한 최소화 |

---

## 출처 정책

- 모든 문서 상단에 **공식 URL** 출처 블록과 **최종 확인일** 표기.
- 1차 출처: `developers.google.com/apps-script/*` (공식 가이드 & 레퍼런스).
- 2차 출처: `github.com/google/clasp`, `npmjs.com/@types/google-apps-script`, 커뮤니티 검증 라이브러리(GasT, QUnitGS2, ErrorHandler 등) — GitHub URL 명기.
- Quota 수치는 `developers.google.com/apps-script/guides/services/quotas` 페이지가 정답. 변경 가능성 명시.

## 알려진 한계 / 검증 필요 항목

이 레퍼런스 작성 중 LLM이 추론으로 채울 위험이 있는 항목들은 본문에 "공식 문서 확인 필요"로 표시함. 주요 항목:

- **Workspace script runtime**: 30분 vs 6분 (공식 quotas는 6분으로 통일 표기, 일부 자료는 30분)
- **`webapp.access` enum 정확한 값**: `MYSELF`/`DOMAIN`/`ANYONE`/`ANYONE_ANONYMOUS` (manifest 스키마 페이지 직접 확인 권고)
- **Gmail/Calendar/Drive 일일 quota 수치**: Consumer vs Workspace
- **FileIterator continuation token 만료 기간**: 공식 명시 없음
- **`urlFetchWhitelist`** 매니페스트 필드의 deprecation 여부
- **`Utilities.RsaAlgorithm`** enum 값
- 자동 검증 OAuth 100명 한도, 시간 트리거 자동 비활성화 임계 (~6개월) 등 비공개 수치

## 디렉토리 구조

<!-- BEGIN:auto-tree -->
```
skills/appscript/docs/
├── TOC.md
├── 01-overview/           (5)
├── 02-services/           (21)
├── 03-triggers/           (3)
├── 04-web-apps/           (6)
├── 05-auth/               (3)
├── 06-quotas/             (2)
├── 07-development/        (6)
└── 08-patterns/           (4)
```
<!-- END:auto-tree -->

---

## 자동 인덱스 (파일/제목/줄 수)

> 아래 영역은 `./scripts/build-toc.sh` 가 디렉토리를 스캔해 자동 생성합니다.
> 수동 편집하지 마세요 — 다음 실행 시 덮어쓰입니다.
> 큐레이션된 핵심 설명은 위 섹션 표 참고.

<!-- BEGIN:auto-sections -->

### 01. 개요 & 런타임

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`editor-and-local-dev.md`](01-overview/editor-and-local-dev.md) | 웹 에디터와 로컬 개발 | 275 |
| [`introduction.md`](01-overview/introduction.md) | Google Apps Script 소개 | 105 |
| [`manifest-appsscript-json.md`](01-overview/manifest-appsscript-json.md) | appsscript.json 매니페스트 레퍼런스 | 375 |
| [`project-types.md`](01-overview/project-types.md) | 프로젝트 타입: Standalone vs Container-bound | 171 |
| [`runtime-v8.md`](01-overview/runtime-v8.md) | V8 런타임 | 159 |

### 02. 서비스 (Services)

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`advanced-services.md`](02-services/advanced-services.md) | Advanced Google Services | 329 |
| [`bigquery.md`](02-services/bigquery.md) | BigQuery (Advanced Service) | 390 |
| [`cache.md`](02-services/cache.md) | CacheService | 235 |
| [`calendar.md`](02-services/calendar.md) | Calendar Service (CalendarApp) | 685 |
| [`charts.md`](02-services/charts.md) | Charts 서비스 | 351 |
| [`document.md`](02-services/document.md) | Google Apps Script — Document 서비스 | 716 |
| [`drive.md`](02-services/drive.md) | Drive Service (DriveApp) | 655 |
| [`forms.md`](02-services/forms.md) | Google Apps Script — Forms 서비스 | 811 |
| [`gmail.md`](02-services/gmail.md) | Gmail Service (GmailApp / MailApp) | 564 |
| [`jdbc.md`](02-services/jdbc.md) | Jdbc (JDBC) | 344 |
| [`language.md`](02-services/language.md) | LanguageApp (번역) | 180 |
| [`lock.md`](02-services/lock.md) | LockService | 216 |
| [`maps.md`](02-services/maps.md) | Maps 서비스 | 387 |
| [`optimization.md`](02-services/optimization.md) | Optimization 서비스 (선형계획) | 254 |
| [`properties.md`](02-services/properties.md) | PropertiesService | 238 |
| [`session.md`](02-services/session.md) | Session | 190 |
| [`slides.md`](02-services/slides.md) | Google Apps Script — Slides 서비스 | 764 |
| [`spreadsheet.md`](02-services/spreadsheet.md) | Spreadsheet 서비스 (SpreadsheetApp) | 1605 |
| [`url-fetch.md`](02-services/url-fetch.md) | UrlFetchApp (URL Fetch Service) | 277 |
| [`utilities.md`](02-services/utilities.md) | Utilities | 330 |
| [`xml.md`](02-services/xml.md) | XmlService | 315 |

### 03. 트리거 (Triggers)

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`installable-triggers.md`](03-triggers/installable-triggers.md) | Installable Triggers (설치형 트리거) | 430 |
| [`simple-triggers.md`](03-triggers/simple-triggers.md) | Simple Triggers (단순 트리거) | 294 |
| [`trigger-quotas.md`](03-triggers/trigger-quotas.md) | Trigger Quotas & Execution Limits | 186 |

### 04. 웹 앱 (Web Apps)

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`client-server-comm.md`](04-web-apps/client-server-comm.md) | Client-Server Communication — `google.script.*` | 496 |
| [`content-service.md`](04-web-apps/content-service.md) | ContentService — JSON / Text API 응답 | 368 |
| [`deployment.md`](04-web-apps/deployment.md) | Deployment — 배포, 버전, 권한 옵션 | 365 |
| [`doGet-doPost.md`](04-web-apps/doGet-doPost.md) | doGet / doPost — Web App 진입점 | 389 |
| [`html-service.md`](04-web-apps/html-service.md) | HtmlService — HTML Output & Templates | 401 |
| [`menus-dialogs-sidebars.md`](04-web-apps/menus-dialogs-sidebars.md) | 메뉴 · 다이얼로그 · 사이드바 (Ui Service) | 263 |

### 05. 인증 & 권한

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`execution-context.md`](05-auth/execution-context.md) | 실행 컨텍스트 (Execution Context) | 221 |
| [`oauth-scopes.md`](05-auth/oauth-scopes.md) | OAuth Scopes | 230 |
| [`permissions-flow.md`](05-auth/permissions-flow.md) | 권한 요청 흐름 (Permissions Flow) | 242 |

### 06. Quota & 한계

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`best-practices.md`](06-quotas/best-practices.md) | Quota 회피 실전 패턴 | 432 |
| [`quotas-and-limits.md`](06-quotas/quotas-and-limits.md) | Quotas & Limits | 264 |

### 07. 개발 도구

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`clasp.md`](07-development/clasp.md) | clasp (Command Line Apps Script Projects) | 356 |
| [`libraries.md`](07-development/libraries.md) | 라이브러리 (Libraries) | 202 |
| [`logging-debugging.md`](07-development/logging-debugging.md) | 로깅과 디버깅 | 304 |
| [`testing.md`](07-development/testing.md) | Apps Script 테스팅 | 275 |
| [`typescript.md`](07-development/typescript.md) | TypeScript로 Apps Script 개발하기 | 247 |
| [`version-deployment.md`](07-development/version-deployment.md) | 버전과 배포 (Versions & Deployments) | 347 |

### 08. 패턴 & 실전

| 파일 | 제목 | 줄 수 |
|---|---|---|
| [`common-recipes.md`](08-patterns/common-recipes.md) | 자주 쓰는 레시피 | 467 |
| [`error-handling.md`](08-patterns/error-handling.md) | 에러 처리 패턴 | 342 |
| [`performance-patterns.md`](08-patterns/performance-patterns.md) | 성능 패턴 | 338 |
| [`security-best-practices.md`](08-patterns/security-best-practices.md) | 보안 베스트 프랙티스 | 349 |
<!-- END:auto-sections -->

---

## 유지보수

이 문서 세트는 claude-plugins **저장소 루트**에서 관리합니다. 유지보수 스크립트는
`scripts/appscript-docs/` 에 있고, 재작성(LLM)은 `.claude/skills/appscript-docs-regen`
스킬로 처리합니다. 자세한 내용은 [scripts/appscript-docs/README.md](../../../scripts/appscript-docs/README.md).

```bash
# 저장소 루트에서 실행

# 정기 점검 (LLM 호출 없음)
scripts/appscript-docs/check-updates.sh --init   # 첫 실행: baseline 저장
scripts/appscript-docs/check-updates.sh          # 출처 변경 감지

# 변경 감지된 문서 재작성 → Claude Code에서 appscript-docs-regen 스킬 실행
scripts/appscript-docs/check-updates.sh --files  # 대상 파일 목록만 출력

# 그 외 유틸
scripts/appscript-docs/build-toc.sh              # 이 TOC의 자동 영역 갱신
scripts/appscript-docs/check-links.sh            # 출처 URL 유효성 검사
scripts/appscript-docs/bump-date.sh              # '최종 확인일' 일괄 갱신
```

> 문서 **재생성만** Claude가 필요합니다 → `appscript-docs-regen` 스킬 (예전 `regen.sh`의
> `claude` CLI shell-out을 대체). 나머지 스크립트는 표준 Unix 도구(curl, awk, sed)로만 동작.
