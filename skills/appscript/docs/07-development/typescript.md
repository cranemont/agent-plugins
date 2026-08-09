# TypeScript로 Apps Script 개발하기

> **출처**
> - https://developers.google.com/apps-script/guides/typescript
> - https://github.com/google/clasp
> - https://www.npmjs.com/package/@types/google-apps-script
> - https://github.com/google/aside
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script 런타임은 V8 JavaScript이며, **TypeScript를 직접 실행하지 않는다.** 클라이언트(개발자) 측에서 TS를 JS로 컴파일한 뒤 푸시해야 한다.

TS를 쓰는 이점:
- `@types/google-apps-script`로 모든 Google 서비스 API에 강력한 타입 지원
- 컴파일 타임 검증 (런타임 오류 감소)
- 에디터 자동완성/리팩토링
- 인터페이스/제네릭으로 시트 행·API 응답 모델링

근본적 제약:
- Apps Script 런타임은 **ESM/CommonJS 모듈을 지원하지 않는다.** 모든 코드는 단일 전역 스코프에서 동작한다.
- 결과적으로 `import`/`export`는 컴파일 시 제거되거나, 번들러가 단일 파일로 합쳐야 한다.
- `npm` 패키지를 직접 require할 수 없다 — 번들러가 트리쉐이킹/인라이닝해야 동작.

## 워크플로 두 갈래

### A. clasp v2 (legacy 자동 트랜스파일)

clasp v2는 `.ts` 파일을 자동으로 `.gs`로 변환했다. 사용자가 직접 `tsc`를 돌릴 필요가 없었다.

- 장점: 설정 0, 그냥 `.ts` 작성하고 `clasp push`
- 한계: `import`/`export`는 그냥 제거됨 → 사실상 namespace 패턴만 동작
- 최신 ES 기능(top-level await, ESM 등)은 부분 지원
- npm 모듈 사용 불가

### B. clasp v3 + 번들러 (현재 권장)

> "Clasp no longer transpiles typescript code. For typescript projects, use typescript with a bundler like Rollup to transform code prior to pushing with clasp."

- TS 컴파일과 번들링은 본인이 책임
- ESM 모듈/npm 패키지 사용 가능 (번들러가 인라인)
- 빌드 결과만 `clasp push`

이하 본 문서는 **v3 + 번들러 방식**을 기준으로 한다.

## 타입 정의: @types/google-apps-script

DefinitelyTyped가 유지하는 공식 타입 패키지. 모든 Apps Script 서비스 클래스를 글로벌 네임스페이스로 노출한다.

```bash
npm install --save-dev @types/google-apps-script
```

설치 후 별도 import 없이 `SpreadsheetApp`, `GmailApp`, `Session`, `Utilities` 등 모든 글로벌이 인식된다. `GoogleAppsScript.Spreadsheet.Sheet`, `GoogleAppsScript.Drive.File` 같은 네임스페이스 타입도 함수 매개변수로 사용할 수 있다.

```typescript
function logSheetName(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  console.log(sheet.getName());
}
```

## 권장 tsconfig.json

Apps Script V8은 ECMAScript 2019 ~ 일부 2020 기능을 지원한다(예: optional chaining, nullish coalescing, async/await). 더 새 문법은 번들러/타깃 다운컴파일에 맡긴다.

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2019", "ES2020.Promise", "ES2020.String"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./build",
    "rootDir": "./src",
    "types": ["google-apps-script"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "build"]
}
```

주의:
- `target`을 너무 높이지 말 것. async 등 일부 문법은 V8이 지원하지만 클래스 필드, top-level await 등 신규 기능은 보장되지 않는다.
- `lib`에 `DOM`을 넣지 말 것. 서버 런타임에는 `window`, `document`가 없다(HTML Service 클라이언트 사이드 코드는 별도 처리).

## 번들러 예시 — Rollup

가장 널리 쓰이는 조합은 **Rollup + @rollup/plugin-typescript**. Google의 [`aside`](https://github.com/google/aside) 템플릿이 이 스택을 사용한다.

```js
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  output: {
    file: 'build/main.js',
    format: 'iife',     // 단일 자가실행 함수로 묶음
    name: 'AppLib'
  },
  plugins: [nodeResolve(), typescript()]
};
```

**Apps Script 함수가 트리거/메뉴에서 호출되려면 전역에 노출되어야 한다.** IIFE 결과는 그대로 두면 함수가 IIFE 내부에 갇힌다. 두 가지 우회:

1. `gas-webpack-plugin` 또는 `rollup-plugin-prettier` + 글로벌 어태치
2. `format: 'esm'`로 출력 후 후처리로 export 제거

`aside` 템플릿은 후자(`@google/aside`)를 자동 처리한다. 직접 구성한다면 명시적으로 글로벌에 노출:

```typescript
// src/main.ts
import { hello } from './hello';

// 전역 export — 트리거/메뉴에서 호출 가능하게
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutput(hello());
}
// @ts-ignore — 전역 어태치
(globalThis as any).doGet = doGet;
```

## namespace 패턴 vs 단순 함수

ESM이 잘 동작하지 않는 v2 시대(혹은 번들러 없이 trans만 하는 단순 워크플로)에는 TypeScript `namespace`로 코드를 묶는 패턴이 흔하다.

```typescript
namespace MyApp {
  export function run(): void {
    const sheet = SpreadsheetApp.getActiveSheet();
    process(sheet);
  }
  function process(s: GoogleAppsScript.Spreadsheet.Sheet) { /* ... */ }
}

// 호출 — 매니페스트/트리거에 등록할 함수는 namespace 밖에 있어야 한다
function runApp() { MyApp.run(); }
```

장점: 전역 오염 최소화. 단점: 트리/모듈 분리는 한계.

## 시트 행을 타입 안전한 객체로

대표적 패턴: 헤더 행을 키로 사용해 행 배열을 객체로 매핑.

```typescript
interface UserRow {
  id: number;
  name: string;
  email: string;
  signupAt: Date;
}

function readUsers(sheetName: string): UserRow[] {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`sheet not found: ${sheetName}`);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const [header, ...rows] = values;

  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    header.forEach((h, i) => obj[String(h)] = row[i]);
    // 명시적 캐스팅 — 런타임 검증은 별도
    return obj as unknown as UserRow;
  });
}
```

런타임 검증을 더 강하게 하려면 [zod](https://zod.dev) 같은 라이브러리를 번들에 포함시킨다. (작지만 동작함 — 단, 번들 사이즈가 늘면 푸시 시간이 길어진다.)

## 트리거 함수의 타입

이벤트 객체는 `@types/google-apps-script`에 정의돼 있다.

```typescript
function onOpen(e: GoogleAppsScript.Events.SheetsOnOpen): void {
  SpreadsheetApp.getUi().createMenu('Tools').addItem('Run', 'runApp').addToUi();
}

function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  const range = e.range;
  if (range.getColumn() === 2) { /* ... */ }
}

function doPost(e: GoogleAppsScript.Events.DoPost) {
  const payload = JSON.parse(e.postData.contents);
  // ...
}
```

`@types/google-apps-script`는 시간 트리거(`TimeDriven`), Form 제출(`FormsOnFormSubmit`), Calendar(`CalendarEventUpdated`) 등 모든 이벤트 타입을 제공한다.

## 한계

### 모듈 격리 부재

번들러로 `import`/`export`를 묶더라도, 결국 Apps Script 런타임 입장에선 단일 파일이다. 두 라이브러리가 같은 전역 이름을 정의하면 충돌한다. namespace나 IIFE로 캡슐화 권장.

### npm 모듈

순수 JS이고 Node 전용 API(fs, http 등)를 쓰지 않는 모듈만 번들 가능. `axios`처럼 `XMLHttpRequest`/`http` 모듈에 의존하는 라이브러리는 그대로 동작하지 않는다. Apps Script에서는 `UrlFetchApp`을 써야 한다.

### Source map

Apps Script 에디터는 source map을 지원하지 않는다. 빌드된 JS가 디버거에 노출되므로 변수명/함수명이 알아보기 어려워질 수 있다. Rollup에서 `output.compact = false`, minify 끔 권장.

### 컴파일 단계 누락 위험

코드는 컴파일 후 푸시되므로 빌드를 깜박하면 옛 코드가 그대로 돈다. pre-push npm script(`prepush`)나 husky/lefthook으로 자동화.

```json
{
  "scripts": {
    "build": "rollup -c",
    "push": "npm run build && clasp push",
    "deploy": "npm run build && clasp push && clasp create-version \"$npm_package_version\""
  }
}
```

### IDE 진단 vs 런타임

타입 오류가 없어도 런타임에 깨질 수 있다(예: 매니페스트 oauth scope 누락, 라이브러리 identifier 불일치). 타입은 어디까지나 IDE 보조 — 통합 테스트로 보완.

## 함정

- **enum 직접 사용**: `target: ES2019` 이상에서 const enum이 인라이닝되지 않을 수 있다. `tsconfig`에 `"isolatedModules": true`면 const enum은 사용 불가 → 일반 enum 또는 union literal type 권장.
- **`this` 바인딩**: arrow function이 method로 등록될 때 `this` 컨텍스트가 다를 수 있다. 트리거 등록 함수는 일반 함수 선언으로.
- **Top-level 코드**: 번들이 IIFE/CommonJS로 묶이면 import 사이드이펙트가 매 호출마다 실행될 수 있다 — 비용 큰 초기화는 함수 내부로 옮긴다.
- **`@types/google-apps-script` 버전**: 자주 업데이트되므로 새 서비스 API가 추가되면 업그레이드 필요. 옛 버전엔 새 메서드 타입이 없다.

## 참고

- https://developers.google.com/apps-script/guides/typescript
- https://www.npmjs.com/package/@types/google-apps-script
- https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/google-apps-script
- https://github.com/google/aside (TS + Rollup 공식 템플릿)
- https://github.com/google/clasp (v3 README — TypeScript는 번들러로 트랜스파일 후 push)
