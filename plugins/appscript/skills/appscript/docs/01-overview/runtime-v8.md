# V8 런타임

> **출처**
> - https://developers.google.com/apps-script/guides/v8-runtime
> - https://developers.google.com/apps-script/guides/v8-runtime/migration
> - https://developers.google.com/apps-script/manifest (`runtimeVersion` 필드)
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script의 현재 기본 런타임은 V8이다. 공식 설명: "Apps Script now supports the V8 runtime, which powers Chrome and Node.js, enabling developers to use modern JavaScript syntax and features not available with the older Rhino runtime."

이전 런타임은 Mozilla의 Rhino 기반 ES5 인터프리터였다. Google은 2020년 2월부터 호환 가능한 스크립트를 V8로 자동 마이그레이션하기 시작했다. 매니페스트 `runtimeVersion`을 `DEPRECATED_ES5`로 명시하면 옛 Rhino 런타임으로 강제할 수 있지만, 이름에서 드러나듯 deprecated 상태다 — 신규 프로젝트는 V8을 써야 한다.

V8은 modern JavaScript 문법을 지원하지만, **브라우저/Node 환경의 표준 API는 제공하지 않는다.** 즉 V8 엔진이 들어왔을 뿐, 여전히 Apps Script 고유의 서버 샌드박스 런타임이라는 점을 기억해야 한다.

## 매니페스트 설정

`appsscript.json`에서 `runtimeVersion` 필드로 제어한다.

| 값 | 의미 |
|-----|------|
| `V8` | V8 런타임 사용 (현재 권장/기본) |
| `STABLE` | 기본 런타임. 공식 manifest 레퍼런스는 이 값을 "currently Rhino"로 표기한다. 신규 프로젝트는 V8로 생성되지만, V8을 확실히 쓰려면 `V8`을 명시하는 편이 안전하다. |
| `DEPRECATED_ES5` | 옛 Rhino ES5 런타임 (deprecated) |

```json
{
  "runtimeVersion": "V8"
}
```

에디터에서는 **Project Settings > "Enable Chrome V8 runtime"** 체크박스로도 토글할 수 있다.

## 지원되는 ES 기능

공식 v8-runtime 가이드에 따르면 다음의 modern JavaScript 문법이 지원된다.

- `let`, `const` (블록 스코프 변수)
- Arrow functions: `const square = x => x * x;`
- Classes — constructor, instance method, static method
- Destructuring (배열·객체)
- Template literals (백틱, embedded expressions)
- Default function parameters
- Spread / rest operator
- Multi-line strings (template literal)
- `async function`, generator function (`function*`)

추가로 V8은 변수 선언에 바인딩된 arrow function·async function·generator function을 함수로 인식해 트리거·메뉴·라이브러리에서 호출 가능하다(Rhino에서는 인식 불가였음).

```javascript
// V8에서 새로 동작하는 예: 화살표 함수가 menu/trigger 함수로도 인식됨
const onOpen = () => {
  SpreadsheetApp.getUi().createMenu('Tools').addItem('Hello', 'sayHello').addToUi();
};

// 클래스
class Invoice {
  constructor(amount) { this.amount = amount; }
  withTax(rate = 0.1) { return this.amount * (1 + rate); }
  static fromRow(row) { return new Invoice(row[2]); }
}
```

## 지원되지 않는 것

V8 엔진을 쓰지만 Apps Script 서버 샌드박스에서 실행되므로 다음은 **사용 불가**다.

| 카테고리 | 사용 불가 항목 | 대안 |
|---------|---------------|------|
| Timers | `setTimeout`, `setInterval` | `Utilities.sleep(ms)`, 시간 기반 트리거 |
| Web APIs | `fetch`, `FormData`, `URL`, `XMLHttpRequest` | `UrlFetchApp.fetch()` |
| Crypto | `crypto`, `window.crypto` | `Utilities.computeDigest`, `Utilities.computeHmacSignature` |
| Browser/Node globals | `window`, `document`, `process`, `global`, `require` | 없음 — 서버 사이드 GAS에는 해당 개념이 없다 |
| ES modules | `import` / `export` 구문 | 동일 프로젝트 내 다른 `.gs` 파일은 자동으로 전역 공유. 외부 코드는 Library 또는 `eval` 패턴. |
| Class private fields | `#field` 구문 | `_field` 컨벤션 또는 클로저 |
| Class static field 선언 | `class Foo { static x = 1 }` | `Foo.x = 1`을 클래스 외부에서 할당 |

공식 인용:
- "Private class fields (for example, `#field`) aren't supported and cause parsing errors."
- "The V8 runtime doesn't support ES6 modules (`import` / `export`)."

## Rhino vs V8 — 주요 차이

| 항목 | Rhino (ES5) | V8 |
|------|-------------|----|
| 변수 선언 | `var`만 실용적 | `let`, `const` 지원 |
| 화살표 함수 | 없음 | 지원 |
| 클래스 | prototype 패턴 수동 작성 | `class` 구문 |
| `for each (x in obj)` | 지원 (비표준 SpiderMonkey 구문) | **불가** — 표준 `for (x of arr)` 또는 `for (k in obj)` 사용 |
| `Date.prototype.getYear()` | 일부 동작 차이 | 항상 표준 따름. 4자리 연도는 `getFullYear()` 사용 권장 |
| XML 리터럴(E4X) | 지원 | **불가** — `XmlService.parse()` 사용 |
| `__iterator__` 커스텀 이터레이터 | 지원 | **불가** — ES6 `[Symbol.iterator]` 사용 |
| `catch (e if cond)` 조건부 catch | 지원 | **불가** — catch 내부에서 `if`로 분기 |
| `Error.fileName`, `Error.lineNumber` | 존재 | 없음. `Error.prototype.stack` 사용 |
| 예약어로 변수/함수 명명 (`class`, `import`, `export`) | 허용 | 금지 |
| `undefined` 직렬화 | 문자열 `"undefined"`로 변환되는 케이스 있음 | `null`과 동등 처리 |
| Date 포맷 기본값 | long format, 일부 인자 무시 | short format, 표준 동작 |

## Rhino → V8 마이그레이션 단계

공식 migration 가이드의 8단계:

1. **Enable the V8 runtime for the script** (`runtimeVersion: "V8"` 또는 에디터 체크박스)
2. **Review the following incompatibilites** — 아래 incompatibility 목록 점검
3. **Review the following other differences** — 동작 차이 점검
4. **Begin updating your code to use V8 syntax and other features**
5. 충분한 테스트 수행
6. 게시된 앱/애드온은 V8 적용 후 새 버전 생성
7. 라이브러리는 versioned deployment 생성 및 사용자 공지
8. 모든 배포가 V8 버전에 연결되어 있는지 확인

### Incompatibility 체크리스트 (V8 전환 시 코드 수정 필수)

1. `for each (variable in object)` → 표준 `for (variable in object)` 또는 `for (variable of array)`
2. `Date.getYear()` → `Date.prototype.getFullYear()`
3. `class`, `import`, `export` 등 예약어를 식별자로 사용한 코드 변경
4. `const` 재할당 코드 제거 (`TypeError: Assignment to constant variable`)
5. XML 리터럴(E4X) → `XmlService.parse()`
6. `__iterator__` → ES6 `[Symbol.iterator]`
7. `try { } catch (e if cond) { }` → catch 내부에서 `if` 분기

### 동작 차이 (코드는 실행되지만 결과가 달라질 수 있음)

- Date의 기본 포맷이 long → short로 바뀌었고, 일부 무시되던 인자가 이제 의미를 가진다
- `Error.fileName` / `Error.lineNumber`가 없어 로깅 코드가 `undefined`를 보일 수 있다
- 함수에 `undefined`를 전달할 때 Rhino는 `"undefined"` 문자열로 변환하는 경우가 있었으나, V8은 `null`과 동일 취급

## 코드 예제 — V8 스타일로 작성된 트리거

```javascript
// V8 — 클래스와 화살표 함수, 구조 분해를 활용한 onEdit 처리
class EditLogger {
  constructor(sheet) { this.sheet = sheet; }
  log({ range, value, user }) {
    this.sheet.appendRow([new Date(), user, range.getA1Notation(), value]);
  }
}

const onEdit = (e) => {
  const { range, value, user } = e;
  const log = SpreadsheetApp.getActive().getSheetByName('AuditLog');
  new EditLogger(log).log({ range, value, user: user?.getEmail() ?? 'unknown' });
};
```

## 주의사항 / 함정

- **에디터의 함수 드롭다운**: V8에서도 `const onEdit = () => {}` 형태로 선언된 함수는 트리거 설정 UI에 표시되지 않을 수 있다. 트리거에 노출하려면 `function onEdit(e) {}` 선언이 안정적이다.
- **라이브러리 호환성**: V8 스크립트가 Rhino 라이브러리를 import하거나 그 반대는 일반적으로 가능하지만, 라이브러리가 비호환 문법(E4X 등)을 쓰면 V8에서 import 시 파싱 오류가 날 수 있다.
- **로깅**: V8에서는 `console.log(...)`도 Stackdriver(현 Cloud Logging)로 전송된다. Rhino 시절 `Logger.log` 중심이던 코드는 그대로 동작하지만 새 코드는 `console`을 선호한다.
- **자동 마이그레이션 후 검증**: 자동 마이그레이션 대상에서 제외된 케이스가 있으므로, 운영 중인 스크립트는 직접 `runtimeVersion`을 확인하라.

## 참고

- https://developers.google.com/apps-script/guides/v8-runtime
- https://developers.google.com/apps-script/guides/v8-runtime/migration
- https://developers.google.com/apps-script/manifest
