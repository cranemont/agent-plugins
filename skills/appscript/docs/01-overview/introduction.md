# Google Apps Script 소개

> **출처**
> - https://developers.google.com/apps-script/overview
> - https://developers.google.com/apps-script/guides/projects
> - https://developers.google.com/apps-script/guides/bound
> - https://developers.google.com/apps-script/guides/standalone
>
> **최종 확인일**: 2026-07-22

## 개요

Google Apps Script(이하 GAS)는 공식 문서에서 "a rapid application development platform that makes it fast to create business applications that integrate with Google Workspace"로 정의되는, 브라우저 기반의 자바스크립트 런타임 플랫폼이다. 코드는 Google 서버에서 실행되며, 별도의 서버 인프라 없이 Gmail·Drive·Docs·Sheets·Calendar 같은 Google Workspace 제품과 직접 통합되는 자동화·확장 애플리케이션을 만들 수 있다.

언어는 modern JavaScript(현재 기본 런타임은 V8)이며 에디터는 `script.google.com`에서 제공되는 브라우저 기반 IDE다. 별도의 설치가 필요 없고, 작성한 스크립트 파일은 사용자의 Google Drive에 저장된다(공식 문서: "saved to Drive and run on Google's servers").

GAS는 자동화·내부 도구·Workspace 애드온·간단한 웹 앱을 빠르게 만들기에 적합하지만, 복잡한 대규모 시스템·장시간 실행 워크로드·고성능 컴퓨팅에는 적합하지 않다. 한계를 넘는 작업은 Cloud Functions, Cloud Run, Workspace add-on(다른 런타임 환경) 등으로 이전해야 한다.

## 주요 사용 시나리오

공식 overview에서 명시하는 대표적 활용처는 다음과 같다.

| 시나리오 | 설명 |
|---------|------|
| Custom menus & dialogs | Docs/Sheets/Forms에 사용자 정의 메뉴·대화상자·사이드바 추가 |
| Custom functions & macros for Sheets | 셀에서 `=MY_FUNC()` 형태로 호출되는 스프레드시트 함수, 매크로 |
| Web apps | Standalone 또는 Sites 임베드 가능한 웹 애플리케이션 게시 |
| Workspace add-ons | Marketplace 배포를 위한 경량 애드온 |
| Workflow automation | Gmail/Drive/Calendar 이벤트 기반 자동화 (트리거) |
| External API integration | `UrlFetchApp`을 통한 외부 REST API 호출 |

## 접근 가능한 Google 서비스

GAS는 내장 서비스 라이브러리를 통해 다음 제품과 직접 통합된다.

- **Workspace 코어**: Gmail, Google Calendar, Google Drive, Google Docs, Google Sheets, Google Slides, Google Forms
- **기타 Google 제품**: Google AdSense, Google Analytics, Google Maps, Google Chat, Google Sites
- **Advanced Services**: 매니페스트에 명시적으로 활성화하면 추가 Google API(BigQuery, Calendar API, Drive API 등) 사용 가능
- **외부 REST API**: `UrlFetchApp.fetch()`로 HTTP 호출

## 에디터 개요 (script.google.com)

웹 에디터는 다음을 제공한다.

- 파일/리소스 트리(좌측): 코드 파일(`.gs`), HTML 파일(`.html`), 매니페스트(`appsscript.json`)
- 코드 에디터: 자동 완성, 구문 강조, 함수 단위 Run/Debug
- **Project Settings** 메뉴: 시간대, V8 런타임 활성화, `appsscript.json` 매니페스트 표시 토글, 스크립트 ID 확인
- **Executions** 탭: 실행 로그, 실패 추적, Stackdriver 로깅 연동
- **Triggers** 탭: 시간 기반/이벤트 기반 트리거 관리
- **Libraries / Services** 패널: 외부 라이브러리 및 Advanced Services 추가

> 공식 문서: "Multi-login, or being logged into multiple Google Accounts at once, isn't supported for Apps Script, add-ons, or web apps." — 멀티 로그인 상태에서는 에디터가 비정상 동작할 수 있다.

## GAS vs 다른 자동화/통합 방식

| 옵션 | 장점 | 한계 |
|------|------|------|
| **Apps Script** | Workspace 네이티브 통합, 무료, 빌드/배포 인프라 불필요 | 실행 시간·할당량 제한, 디버깅 도구 한계 |
| **Cloud Functions / Cloud Run** | 임의 언어, 긴 실행 시간, 큰 트래픽 처리 | Workspace 직접 통합은 별도 SDK·OAuth 설정 필요, 유료 |
| **Workspace Add-on (CardService)** | Workspace 사이드바 UI, 다른 런타임으로 확장 가능 | 배포·검수 절차가 더 무겁다 |
| **Zapier / Make 등 iPaaS** | 코드 없이 워크플로 구성 | 커스텀 로직·세밀한 제어가 어려움, 외부 서비스 종속 |

GAS가 가장 적합한 경우: Workspace 데이터를 다루는 업무 자동화, 비교적 짧은 실행 시간(분 단위 이내), 비개발자 사용자가 쉽게 트리거·복사할 수 있어야 하는 도구.

## 프로젝트 타입 한눈에 보기

GAS 프로젝트는 두 종류로 나뉜다(자세한 내용: `project-types.md`).

- **Standalone script**: Drive에 독립 파일로 존재. 웹 앱·라이브러리·시간 기반 자동화에 적합.
- **Container-bound script**: 특정 Docs/Sheets/Slides/Forms 파일에 종속. 해당 문서의 `onOpen`, 커스텀 메뉴, Sheets 커스텀 함수 등 컨테이너 전용 기능 사용 가능.

## 코드 예제

```javascript
// 스프레드시트의 활성 시트 A1 셀에 현재 시각을 기록하는 가장 단순한 예제
function writeTimestamp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange('A1').setValue(new Date());
}
```

```javascript
// UrlFetchApp을 통한 외부 REST API 호출 예제
function fetchExchangeRate() {
  const response = UrlFetchApp.fetch('https://api.example.com/rates?base=USD');
  const data = JSON.parse(response.getContentText());
  Logger.log(data);
}
```

## 주의사항 / 함정

- **할당량(Quota)**: 일별 URL fetch 호출 수, 트리거 총 실행 시간, 이메일 전송 수 등에 제한이 있다. 자세한 수치는 별도 quotas 문서 참고.
- **실행 시간 제한**: 단일 실행은 일반적으로 6분(소비자), Workspace 계정은 30분까지로 알려져 있으나 공식 quotas 페이지에서 최신 값 확인 필요.
- **멀티 계정 미지원**: 여러 Google 계정에 동시 로그인된 브라우저에서는 동작 이슈가 발생할 수 있다.
- **삭제 파일 복구 불가**: 공식 문서: "Deleted files can't be recovered."
- **외부 의존성**: V8이라 해도 `setTimeout`, `fetch`, `URL`, Node API는 사용 불가. Apps Script 전용 서비스(`Utilities.sleep`, `UrlFetchApp` 등)를 써야 한다.

## 참고

- https://developers.google.com/apps-script/overview
- https://developers.google.com/apps-script/guides/projects
- https://developers.google.com/apps-script/guides/bound
- https://developers.google.com/apps-script/guides/standalone
- https://developers.google.com/apps-script/guides/v8-runtime
