# 버전과 배포 (Versions & Deployments)

> **출처**
> - https://developers.google.com/apps-script/concepts/deployments
> - https://developers.google.com/apps-script/guides/libraries
> - https://developers.google.com/apps-script/manifest
> - https://github.com/google/clasp
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script에서 **버전(Version)**과 **배포(Deployment)**는 별개의 개념이다. 처음 접하면 헷갈리지만 모델은 단순하다.

- **버전(Version)**: 코드의 *불변 스냅샷*. 한번 만들면 수정 불가. 번호로 식별된다(1, 2, 3, ...).
- **배포(Deployment)**: 특정 버전을 *공개 가능한 형태*로 노출한 인스턴스. 고유 URL/ID를 가지며 어떤 버전을 가리킬지 바꿀 수 있다.

비유: 버전은 git tag, 배포는 운영 환경(dev/prod)에서 그 태그를 가리키는 포인터.

## 버전

### 생성

에디터: 우상단 "Deploy" → "Manage versions" → "Create new version" → 설명 입력

CLI:

```bash
clasp create-version "v1.0.0 - initial release"
clasp list-versions
```

특징:
- 한번 만들면 **immutable** (절대 수정/삭제 불가)
- 번호는 1부터 자동 증가
- 설명(description) 자유 텍스트
- 코드는 그 시점 HEAD 스냅샷으로 동결

### 용도

버전을 만드는 이유:
1. 배포가 가리킬 대상이 필요
2. 라이브러리로 다른 스크립트에 노출하려면 버전이 필요
3. 롤백 지점 — 잘못 배포되면 옛 버전으로 되돌릴 수 있음

## 배포

### 종류

매니페스트의 어떤 필드가 있느냐에 따라 배포 가능한 type이 결정된다:

| 배포 타입 | 필수 매니페스트 필드 | 결과물 |
|-----------|----------------------|--------|
| **Web app** | `webapp` | URL `/exec`, `/dev` |
| **API executable** | `executionApi` | scripts.run API로 호출 가능 |
| **Library** | (없음 — 버전 생성으로 충분) | 다른 스크립트가 import 가능 |
| **Editor Add-on** | `addOns.common`, `addOns.docs/sheets/...` | Workspace Add-on 스토어 |
| **Workspace Add-on** | `addOns.common` | 동상 |
| **Chat app** | `chat` | Google Chat 봇 |

배포 하나가 여러 타입을 동시에 가질 수 있다(드물지만 가능). 일반적으로는 1배포 = 1타입.

### HEAD vs Versioned

**HEAD 배포** (a.k.a. "test deployment"):
- 항상 최신 저장 코드(HEAD)를 가리킴
- `clasp push` 후 즉시 반영
- 프로젝트당 자동 생성, **하나만** 존재
- 본인 외 사용자는 일반적으로 사용 못 함 (개발자 컨텍스트로 실행)
- 웹앱 URL: `/dev` 접미사

**Versioned 배포**:
- 특정 버전 번호에 고정
- 코드 변경 후 새 버전을 만들고 배포를 업데이트해야 사용자에게 반영됨
- 여러 개 공존 가능 (예: 안정 배포 + 베타 배포 같은 URL을 다른 버전으로)
- 웹앱 URL: `/exec`
- **삭제 불가** — archive(보관) 처리 가능

### 생성/관리 (CLI)

```bash
# 새 배포 생성 — 최신 버전 사용
clasp create-deployment --description "production"

# 특정 버전 지정
clasp create-deployment --versionNumber 3 --description "prod v3"

# 기존 배포 ID를 다른 버전으로 업데이트 (URL 유지!)
clasp update-deployment <deploymentId> --versionNumber 4

# 배포 목록
clasp list-deployments
# - AKfycbx... @1 - HEAD
# - AKfycbY... @3 - production
# - AKfycbZ... @4 - staging

# 배포 삭제
clasp delete-deployment <deploymentId>
clasp delete-deployment --all
```

배포 ID는 웹앱/Add-on URL에 박혀 있다. `update-deployment`로 버전만 갈아끼우면 **사용자 URL은 그대로 유지**된다. 새 `create-deployment`는 새 URL을 만든다.

### 에디터 UI

Deploy 메뉴:
- **New deployment**: 새 배포 (새 URL 생성)
- **Manage deployments**: 기존 배포의 버전 변경 / 설명 수정
- **Test deployments**: HEAD 배포 정보 (웹앱 `/dev` URL)

## 매니페스트 — 배포 관련 필드

`appsscript.json`의 주요 배포 필드.

### webapp

```json
{
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
}
```

- `access`: `MYSELF` / `DOMAIN` / `ANYONE` / `ANYONE_ANONYMOUS`
- `executeAs`: `USER_DEPLOYING`(개발자 계정으로 실행) / `USER_ACCESSING`(접근자 계정으로)

자세한 의미와 보안 함의는 04-web-apps/security 또는 본 시리즈의 security-best-practices.md 참고.

### executionApi

```json
{
  "executionApi": {
    "access": "MYSELF"
  }
}
```

API executable로 노출. `clasp run-function` 또는 외부 OAuth 클라이언트가 `scripts.run` API로 호출.

### dependencies

```json
{
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v3"
      }
    ],
    "libraries": [
      {
        "userSymbol": "OAuth2",
        "libraryId": "1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF",
        "version": "41",
        "developmentMode": false
      }
    ]
  }
}
```

- `enabledAdvancedServices`: Apps Script 에디터에서 토글하는 Advanced Google Services (Drive API, Calendar API 등). 이 배열에 있어야 코드에서 글로벌로 접근 가능.
- `libraries`: 외부 Apps Script 라이브러리 의존성.

### oauthScopes

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send"
  ]
}
```

명시하지 않으면 Apps Script가 사용 코드 분석으로 자동 추론. 그러나 **자동 추론은 과잉 권한을 요구하는 경향**이 있으므로 production은 명시 권장. 자세한 가이드는 05-auth 폴더.

### exceptionLogging

```json
{ "exceptionLogging": "STACKDRIVER" }
```

값: `STACKDRIVER` (기본, Cloud Logging에 보고) / `NONE`.

### runtimeVersion

```json
{ "runtimeVersion": "V8" }
```

신규 프로젝트는 V8 기본. `DEPRECATED_ES5`는 옛 Rhino — 신규 프로젝트에서 쓸 이유 없음.

## 라이브러리 (Library)

다른 Apps Script 프로젝트의 함수를 import해서 쓰는 메커니즘.

### 만드는 쪽

1. 일반 스크립트로 작성
2. **메이저** 변경마다 `clasp create-version` (또는 에디터 "Manage versions")
3. Script ID를 사용자에게 알림 (Project Settings → IDs)
4. 사용자에게 최소 view 권한 공유

베스트 프랙티스:
- 공개 함수에는 JSDoc 작성 (사용자 에디터에 호버 시 표시됨)
- 비공개 함수는 이름 끝에 `_` (예: `_helper`) — Apps Script가 자동으로 export 제외
- 의미 있는 프로젝트 이름 (기본 identifier로 쓰임)

```javascript
/**
 * 두 숫자를 더한다.
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function add(a, b) { return a + b; }

function _internal() { /* 노출 안 됨 */ }
```

### 쓰는 쪽

에디터: Libraries → "Add a library" → Script ID 입력 → 버전 선택 → identifier 지정.

매니페스트:

```json
{
  "dependencies": {
    "libraries": [{
      "userSymbol": "Calc",
      "libraryId": "1xxxxxxxxxxxxxxx",
      "version": "5",
      "developmentMode": false
    }]
  }
}
```

호출:

```javascript
function example() {
  const result = Calc.add(2, 3);   // identifier가 Calc면 Calc.foo로 접근
}
```

### Development mode (`developmentMode`)

- `true`: 라이브러리의 **HEAD**를 사용 (라이브러리 작성자가 push 즉시 반영)
- `false`: 지정된 버전 번호 고정

**production에서는 반드시 `false`로**. development 모드는 라이브러리 작성자에게 편집 권한이 있어야 동작한다(공유된 호출자에게는 그 권한이 없으므로 실패할 수 있음).

### 리소스 공유 모델

라이브러리와 호출 스크립트는 **일부 리소스를 공유**, **일부는 분리**한다.

**공유** (호출 스크립트와 라이브러리가 같은 인스턴스를 봄):
- `LockService`의 잠금
- `PropertiesService.getScriptProperties()` — 둘이 같은 Properties를 본다!
- `CacheService`
- `PropertiesService.getUserProperties()`

**분리** (라이브러리는 자기 컨텍스트의 인스턴스를 봄):
- `ScriptApp` (트리거, 매니페스트 정보 등) — 라이브러리 자신의 trigger를 봄
- `Logger`/실행 transcript
- `MailApp`/`GmailApp` (라이브러리 함수를 호출해도 메일은 호출자 계정으로 발송 — context는 호출자지만 quota 카운트는 묘하게 라이브러리 계정 쪽으로 가는 케이스 있음)
- `UiApp`/`SpreadsheetApp` 활성 컨텍스트

이 구분은 라이브러리 설계 시 매우 중요하다 — Properties를 공유한다는 사실은 namespace 충돌 위험을 의미한다(키 prefix로 격리 권장).

### 라이브러리의 단점

> "A script that uses a library doesn't run as quickly as it would if all the code were contained within a single script project."

- **성능 페널티**: 라이브러리 함수 호출은 추가 오버헤드(별도 컨텍스트 로딩). UI/Add-on에서 특히 체감됨.
- **디버깅 한계**: 라이브러리 코드 내부로 step-in 불가. `console.log`는 호출자의 로그에 보임.
- **버전 lock-in**: 라이브러리 작성자가 새 버전을 만들지 않으면 사용자도 기능 추가를 받을 수 없다.
- **OAuth scope 합집합**: 라이브러리가 요구하는 scope가 호출 스크립트에도 요청됨 → 동의 화면이 늘어남.

### 사용 가이드라인

- **UI 무거운 코드 (Add-on, Sidebar)에서는 라이브러리 회피**. 가능하면 코드를 직접 포함.
- 공통 유틸은 라이브러리 대신 **빌드 타임 번들링**으로 해결 권장 (TS + Rollup 같이).
- 라이브러리는 **장기 안정된 비즈니스 로직**(예: 회계 계산, 외부 API 클라이언트)에 적합.

## 배포 워크플로 패턴

### 1. 트렁크 기반 (단일 dev/prod 분리)

```
HEAD (clasp push) → 즉시 dev 확인 (/dev URL)
   ↓ 안정화 후
create-version → create-deployment 또는 update-deployment
   ↓
prod URL (/exec)
```

### 2. 멀티 환경

별도 Apps Script 프로젝트 3개(dev/staging/prod). 각각의 `.clasp.json`을 git의 분기 또는 환경 변수로 스왑.

```bash
# CI에서
case "$GITHUB_REF_NAME" in
  develop)  echo "$CLASP_DEV"     > .clasp.json ;;
  staging)  echo "$CLASP_STAGING" > .clasp.json ;;
  main)     echo "$CLASP_PROD"    > .clasp.json ;;
esac
clasp push --force
clasp create-version "$(git rev-parse --short HEAD)"
clasp update-deployment "$PROD_DEPLOY_ID" --versionNumber latest
```

(주의: `--versionNumber latest`는 가짜 — 실제로는 `list-versions` 파싱 또는 `--versionNumber` 빼면 최신 사용.)

### 3. Library publishing

```bash
clasp push                                          # 코드 푸시
clasp create-version "API v2.3.0 — adds parseX"
# 사용자에게 새 버전 번호 안내. 사용자 매니페스트 dependencies.libraries[].version 갱신.
```

## 함정

- **버전 만드는 걸 잊고 deploy**: `clasp create-deployment`만 해도 자동으로 최신 코드 스냅샷이 새 버전으로 생성됨. 하지만 명시적으로 `create-version`을 분리하면 의도가 명확.
- **`update-deployment` vs 새 `create-deployment`**: 사용자에게 URL을 이미 배포했다면 **반드시 `update-deployment`** (URL 유지). `create-deployment`는 새 URL 발급 — 옛 URL 사용자는 옛 배포에 남아있음.
- **OAuth 동의 재발생**: 매니페스트 `oauthScopes` 변경/추가 시 사용자는 다시 동의해야 한다. 새 버전 배포만으로 자동 갱신되지 않음.
- **라이브러리 development mode + 공유 안 됨**: dev 모드 라이브러리는 사용자가 라이브러리 프로젝트 편집 권한이 있어야 동작. 일반적으로 동료 개발자끼리만.
- **API executable + 라이브러리 동시 사용**: API executable로 호출되는 함수 안에서 라이브러리를 호출할 때 권한/scope가 합쳐져 동의 흐름이 복잡해진다. 가능한 회피.
- **archive된 배포 복구 불가**: 잘못 삭제하면 같은 URL은 영원히 못 살림.

## 참고

- https://developers.google.com/apps-script/concepts/deployments
- https://developers.google.com/apps-script/guides/libraries
- https://developers.google.com/apps-script/manifest
- https://developers.google.com/apps-script/manifest/web-app
- https://developers.google.com/apps-script/manifest/library
