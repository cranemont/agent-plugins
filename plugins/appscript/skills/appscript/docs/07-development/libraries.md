# 라이브러리 (Libraries)

> **출처**
> - https://developers.google.com/apps-script/guides/libraries
> - https://developers.google.com/apps-script/manifest/dependencies (매니페스트 `dependencies.libraries` 필드)
>
> **최종 확인일**: 2026-07-22

## 개요

라이브러리는 **다른 스크립트에서 함수를 재사용할 수 있게 공유된 스크립트 프로젝트**다. 공식 정의: "a script project whose functions can be reused in other scripts."

즉 특별한 프로젝트 타입이 아니라, **일반 스크립트 프로젝트에 버전을 만들고 Script ID를 공유하면 그게 곧 라이브러리**가 된다. 사용하는 쪽은 그 Script ID로 라이브러리를 추가하고 `Identifier.functionName()` 형태로 호출한다.

버전(Version)·배포(Deployment)의 일반 개념과 라이브러리가 리소스를 공유/분리하는 상세 모델은 `07-development/version-deployment.md`에서 다룬다. 이 문서는 **라이브러리 특화 워크플로**(정의·추가·호출·매니페스트·베스트 프랙티스·한계)에 집중한다.

## 라이브러리 만들기

공식 절차:

1. 재사용할 함수를 스크립트 프로젝트에 작성한다.
2. **버전이 있는 배포(versioned deployment)를 만든다.** 라이브러리로 노출하려면 버전 스냅샷이 필요하다. (에디터: Deploy → Manage versions → Create new version, 또는 `clasp create-version`)
3. 사용자에게 **최소 view 권한을 공유**한다 — "Share at least view-level access with all potential users."
4. **Script ID를 알려준다.** Script ID는 Project Settings(프로젝트 설정) 페이지에서 확인한다.

> 버전 생성/관리(immutable 스냅샷, 번호 증가)의 자세한 내용은 `07-development/version-deployment.md` 참고.

## 라이브러리 사용하기

에디터에서 라이브러리를 추가하는 절차:

1. 왼쪽 **Libraries** 옆의 **Add a library**("+") 클릭
2. 라이브러리의 **Script ID** 붙여넣기
3. **Look up** 클릭
4. 드롭다운에서 **version** 선택
5. **Identifier**(코드에서 참조할 이름) 확인 — 기본값은 라이브러리 **프로젝트 이름**이다
6. **Add** 클릭

이미 추가한 라이브러리의 version을 바꾸거나 identifier를 수정하려면, Libraries 아래의 라이브러리 이름을 클릭해 변경한다. 라이브러리를 **제거**하려면 라이브러리 이름 옆 메뉴에서 Remove → Remove library.

### 호출

Identifier가 예를 들어 `Test`라면, 라이브러리 함수는 `Test.libraryMethod()` 형태로 호출한다.

```javascript
function useLibrary() {
  const result = Test.libraryMethod();  // Identifier.functionName()
}
```

## Development mode (HEAD) vs 특정 version 고정

version 드롭다운에서는 특정 버전 번호를 고르거나 **HEAD(개발 모드, Development mode)** 를 고를 수 있다.

- **특정 version 고정**: 그 버전 스냅샷의 코드를 사용. 라이브러리 작성자가 코드를 바꿔도 새 버전을 만들고 사용자가 version을 올리기 전까지 반영되지 않는다(안정적, production 권장).
- **HEAD(개발 모드)**: 라이브러리 프로젝트의 **현재 저장된 최신 코드**(head deployment)를 사용. 공식 문구: "To test your library, use the head deployment. **Anyone who has editor-level access to the script can use the head deployment.**" → 즉 HEAD로 쓰려면 사용자가 라이브러리 프로젝트에 **editor 권한**이 있어야 한다. 일반 공유 사용자(view 권한)는 HEAD를 못 쓰므로 실패할 수 있다.

매니페스트에서는 `developmentMode` 필드가 이 선택을 나타낸다(아래 참고).

## 매니페스트 — `dependencies.libraries`

에디터에서 라이브러리를 추가하면 `appsscript.json`의 `dependencies.libraries[]`에 항목이 기록된다. 각 항목의 필드(공식 확인):

| 필드 | 타입 | 설명 (공식) |
| --- | --- | --- |
| `userSymbol` | string | 코드에서 이 라이브러리를 참조할 때 쓰는 이름(= Identifier). "The label used in the script project code to refer to this library." |
| `libraryId` | string | 라이브러리 프로젝트의 Script ID. |
| `version` | string | 사용할 라이브러리 버전. **버전 번호 또는 `stable`**. "This is a version number or `stable`." |
| `developmentMode` | boolean | `true`면 `version`을 무시하고 라이브러리 프로젝트의 현재 코드(HEAD)를 사용. "If `true`, the script ignores `version` and uses the current library project code." |

```json
{
  "dependencies": {
    "libraries": [
      {
        "userSymbol": "Test",
        "libraryId": "1abc...xyz",
        "version": "5",
        "developmentMode": false
      }
    ]
  }
}
```

> **production에서는 `developmentMode: false` + 고정 version 권장.** HEAD(개발 모드)는 위 절에서 설명한 editor 권한 요건 때문에 일반 사용자에게 실패할 수 있다. 매니페스트 전반은 `01-overview/manifest-appsscript-json.md` 참고.

## JSDoc과 자동완성

라이브러리의 모든 함수에 **JSDoc 스타일 주석을 붙이면**, 사용하는 쪽 에디터의 **자동완성**과 자동 생성 문서에 노출된다. `@param`, `@return` 같은 `@` 표기를 사용한다.

```javascript
/**
 * 두 숫자를 더한다.
 * @param {number} a 첫 번째 값
 * @param {number} b 두 번째 값
 * @return {number} 합
 */
function add(a, b) {
  return a + b;
}
```

## 베스트 프랙티스 (공식)

공식 페이지가 명시하는 항목:

1. **의미 있는 프로젝트 이름** — 기본 identifier로 쓰이므로. "Choose a meaningful name for your project since it's used as the default identifier."
2. **비공개로 만들 메서드는 이름 끝에 밑줄(`_`)** — "To make one or more methods of your script not be visible (nor usable) to your library users, end the name of the method with an underscore" (예: `myPrivateMethod_`). (밑줄 *접미사*이며, 접두사가 아니다.)
3. **enumerable global 속성만 노출** — "Only enumerable global properties are visible to library users."
4. **모든 함수에 JSDoc 문서화** — "Include JSDoc-style documentation for all your functions."

## 리소스 공유

라이브러리와 이를 포함하는 스크립트는 일부 서비스의 인스턴스를 공유하고 일부는 분리한다. **`LockService`·Script Properties·User Properties·`CacheService`는 공유**되고, **트리거·`ScriptApp`·`UiApp`·`Logger`·`MailApp`/`GmailApp`·활성 문서 컨테이너(`getActive`는 포함 스크립트의 컨테이너 반환)는 분리**된다. 라이브러리 안에서 만든 simple trigger는 포함 스크립트에서 발동되지 않는다.

> 공유/분리 리소스의 전체 분류표와 설계 시 주의점(예: Properties 네임스페이스 충돌)은 `07-development/version-deployment.md`의 "리소스 공유 모델" 절에서 상세히 다룬다. 공식 가이드 분류표 기준 **User Properties는 공유(shared)**, **`MailApp`/`GmailApp`는 분리(not-shared)**다(2026-07-22 확인).

## 코드 예제

### 1) 라이브러리 정의 (제공하는 쪽)

```javascript
/**
 * 부가세 포함 금액을 계산한다.
 * @param {number} amount 공급가액
 * @param {number} rate 세율 (예: 0.1)
 * @return {number} 세금 포함 금액
 */
function withTax(amount, rate) {
  return Math.round(amount * (1 + rate));
}

// 밑줄 접미사 → 라이브러리 사용자에게 노출되지 않는다
function _round2_(n) {
  return Math.round(n * 100) / 100;
}
```

이 프로젝트에서 새 버전을 만들고(Script ID 확인 → 사용자에게 공유), 사용자에게 최소 view 권한을 준다.

### 2) 라이브러리 사용 (호출하는 쪽)

에디터에서 Add a library → Script ID 입력 → Look up → version 선택 → Identifier(예: `Billing`) 확인 → Add.

```javascript
function makeInvoice() {
  const total = Billing.withTax(100000, 0.1);  // Identifier.functionName()
  Logger.log(total); // 110000
}
```

### 3) 매니페스트 (`appsscript.json`)

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {
    "libraries": [
      {
        "userSymbol": "Billing",
        "libraryId": "1abc...xyz",
        "version": "3",
        "developmentMode": false
      }
    ]
  },
  "runtimeVersion": "V8"
}
```

## 주의사항 / 함정

1. **성능 오버헤드 (공식 명시)**
   "A script that uses a library doesn't run as quickly as it would if all the code were contained within a single script project." 라이브러리 호출은 단일 프로젝트에 코드를 직접 담았을 때보다 느리다. UI/Add-on처럼 응답성이 중요한 곳에서는 체감이 크다.

2. **디버깅 한계 (공식 명시)**
   "When you debug a script that includes a library, you can't step into the library code or set breakpoints in it." 라이브러리 코드 내부로 step-in 하거나 breakpoint를 걸 수 없다.

3. **비공개 함수는 밑줄 접미사**
   `_`로 끝나는 함수/메서드만 노출에서 제외된다. 접두사 밑줄이 아니라 **접미사**임에 주의. 또한 enumerable global 속성만 사용자에게 보인다.

4. **HEAD(개발 모드)는 editor 권한 필요**
   `developmentMode: true`는 라이브러리 프로젝트에 editor 권한이 있는 사용자만 쓸 수 있다. view 권한만 공유받은 일반 사용자에게는 실패할 수 있으므로 production은 고정 version + `developmentMode: false`.

5. **version 업데이트는 자동이 아님**
   라이브러리 작성자가 새 버전을 만들어도, 사용자가 매니페스트 `version`(또는 에디터 드롭다운)을 갱신하기 전까지 반영되지 않는다. `version`에 `stable`을 지정하면 최신 stable 버전을 따르게 할 수 있다.

6. **일부 리소스 공유 → 네임스페이스 충돌 위험**
   Script Properties·Cache 등은 라이브러리와 포함 스크립트가 같은 인스턴스를 본다. 키 prefix로 격리 권장. 상세는 `version-deployment.md`.

7. **트리거 분리**
   라이브러리 안에서 만든 simple trigger는 포함 스크립트에서 발동되지 않는다(리소스가 분리됨).

8. **중첩 라이브러리 / 스코프 합산은 공식 미문서화**
   라이브러리 안에서 또 다른 라이브러리를 참조하는 중첩 사용의 제약, 그리고 라이브러리의 OAuth scope가 호출 스크립트에 합산되는지 여부는 공식 라이브러리 가이드와 `concepts/scopes` 어디에도 서술이 없다(2026-07-22 확인). `concepts/scopes`는 "Apps Script가 코드의 함수 호출을 스캔해 필요한 스코프를 자동 감지한다"고만 설명한다. (관련 동작 일부는 `version-deployment.md`에 정리돼 있으나 공식 출처로는 확정 불가.)

## 참고

- 라이브러리 공식 가이드: https://developers.google.com/apps-script/guides/libraries
- 매니페스트 dependencies: https://developers.google.com/apps-script/manifest/dependencies
- 관련 문서: `07-development/version-deployment.md` (버전·배포 개념, 리소스 공유 모델), `07-development/clasp.md` (CLI로 버전/배포 관리), `01-overview/manifest-appsscript-json.md` (매니페스트 전반)
