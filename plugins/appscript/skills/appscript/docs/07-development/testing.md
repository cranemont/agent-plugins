# Apps Script 테스팅

> **출처**
> - https://github.com/huan/gast (GasT)
> - https://github.com/artofthesmart/QUnitGS2
> - https://github.com/simula-innovation/qunit/tree/gas/gas
> - https://developers.google.com/apps-script/reference/base/logger
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script에는 **공식 단위 테스트 프레임워크가 없다.** Google이 만든 표준 도구가 없기 때문에 두 가지 접근이 일반화돼 있다:

1. **서버 사이드(Apps Script 안에서 실행되는 테스트)**: GasT, QUnitGS2, 자작 assert 함수
2. **로컬(Node/Jest)에서 순수 함수 테스트**: 비즈니스 로직을 Google 서비스 의존에서 분리해 Node로 import 가능하게 만든다

근본적 어려움:
- Apps Script 전역 객체(`SpreadsheetApp`, `GmailApp`, `Session`, `Utilities` 등)는 Apps Script 런타임에서만 존재. 로컬에서 import 불가.
- DI(의존성 주입)이 어렵다. 코드를 의도적으로 분리하지 않으면 단위 테스트 자체가 성립하지 않음.

## 전략 분류

| 전략 | 환경 | 속도 | Google API 진짜 호출 | 추천 시나리오 |
|------|------|------|----------------------|---------------|
| 로컬 Jest (순수 함수) | Node | 빠름 | 안 함 | 계산/변환/파싱 로직 |
| 모킹 Jest | Node | 빠름 | 안 함 (목 객체) | 서비스 호출 흐름 검증 |
| 서버 사이드 (GasT/QUnitGS2) | Apps Script | 느림 (네트워크) | 함 | 통합/스모크 테스트 |
| 통합 (테스트용 시트/문서) | Apps Script | 가장 느림 | 함 | E2E |

## 1. 순수 함수 분리 + 로컬 Jest

**핵심**: 비즈니스 로직과 Google 서비스 호출을 분리한다.

```typescript
// src/lib/parse.ts — 순수 함수, Apps Script 전역 사용 X
export function parseEmailSubject(subject: string): { prefix: string; ticket: string | null } {
  const m = subject.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!m) return { prefix: '', ticket: null };
  return { prefix: m[1], ticket: m[2] };
}

// src/main.ts — Apps Script 진입점
import { parseEmailSubject } from './lib/parse';

function processInbox() {
  const threads = GmailApp.search('is:unread');
  for (const t of threads) {
    const parsed = parseEmailSubject(t.getFirstMessageSubject());
    // ...
  }
}
```

`parse.ts`는 그대로 Jest로 테스트 가능:

```typescript
// tests/parse.test.ts
import { parseEmailSubject } from '../src/lib/parse';

test('extracts prefix and ticket', () => {
  expect(parseEmailSubject('[BUG] login fails')).toEqual({ prefix: 'BUG', ticket: 'login fails' });
});

test('returns null when no match', () => {
  expect(parseEmailSubject('hi there')).toEqual({ prefix: '', ticket: null });
});
```

**원칙**: I/O와 로직을 갈라놓는다. 시트에서 읽는 함수 vs 데이터를 가공하는 함수 vs 시트에 쓰는 함수. 가공 함수만 로컬 테스트.

## 2. Apps Script 서비스 모킹 (Jest)

비즈니스 로직이 `SpreadsheetApp`을 호출해야 하는데 분리가 어렵다면, 글로벌을 모킹한다.

```typescript
// tests/setup.ts
const sheetMock = {
  getDataRange: jest.fn().mockReturnValue({ getValues: () => [['id','name'], [1,'a'], [2,'b']] }),
  appendRow: jest.fn(),
};
const spreadsheetMock = {
  getActive: () => ({ getSheetByName: () => sheetMock }),
};
(global as any).SpreadsheetApp = spreadsheetMock;
```

```json
// jest.config.js
{
  "setupFiles": ["./tests/setup.ts"]
}
```

한계:
- Google 서비스 API 표면이 매우 넓다. 메서드 하나하나 모킹은 노동 집약적이다.
- 실제 동작과 모킹의 미세한 차이로 false positive 발생 가능 (예: `Range.getValues()`의 빈 셀 값 `''` vs `null`).
- Date/숫자 변환 등 Apps Script 고유 동작이 재현되지 않을 수 있다.

권장: 공통 모킹 객체를 헬퍼로 추출하고, 시트 read 결과 형태(`[][]` 2D 배열)만 정확히 흉내낸다.

## 3. 서버 사이드 — GasT (TAP)

[GasT](https://github.com/huan/gast)는 TAP(Test Anything Protocol) 기반 프레임워크.

### 설치 (in-script)

```javascript
// Code.gs 상단
if (typeof GasTap === 'undefined') {
  eval(UrlFetchApp.fetch('https://raw.githubusercontent.com/huan/gast/master/src/gas-tap-lib.js').getContentText());
}
var test = new GasTap();
```

또는 라이브러리로 추가: project key `ME7pXzfKF5_60_TNOSJ2ylCqMEWMB0UzS`.

### 테스트 작성

```javascript
function runTests() {
  test('addition works', t => {
    t.equal(2 + 3, 5, 'basic add');
  });
  test('range fetched', t => {
    const v = SpreadsheetApp.getActive().getSheetByName('Sheet1').getRange('A1').getValue();
    t.ok(v != null, 'A1 should have value');
  });
  test.finish();
}
```

지원 assertion: `ok`, `notOk`, `equal`, `notEqual`, `deepEqual`, `throws`, `skip`.

### 실행

에디터의 Run 버튼으로 `runTests()` 실행 → Logger 출력에 TAP 결과:

```
ok 1 - basic add
ok 2 - A1 should have value
1..2
2 tests, 0 failures
```

`Logger.log` 대신 시트 출력 등 custom printer 지정 가능.

## 4. 서버 사이드 — QUnitGS2

[QUnitGS2](https://github.com/artofthesmart/QUnitGS2)는 QUnit API를 Apps Script로 포팅한 라이브러리. 웹앱으로 결과 페이지를 제공한다.

### 설치

라이브러리 추가: project key `1tXPhZmIyYiA_EMpTRJw0QpVGT5Pdb02PpOHCi9A9FFidblOc9CY_VLgG`. identifier로 `QUnitGS2` 사용.

### 진입점

```javascript
function doGet() {
  QUnitGS2.init();
  myTests();
  QUnit.start();
  return QUnitGS2.getHtml();
}

function getResultsFromServer() {
  return QUnitGS2.getResultsFromServer();
}

function myTests() {
  QUnit.module('parse');
  QUnit.test('basic add', assert => {
    assert.equal(2 + 3, 5);
  });
}
```

웹앱으로 배포 → 브라우저로 열면 QUnit 결과 페이지가 표시된다.

### 한계

- 결과는 모든 테스트 완료 후 한꺼번에 렌더링 (실행 중 진행 표시 없음).
- `setTimeout`이 없어 비동기 테스트 패턴이 어렵다.
- 6분 실행 제한 영향 — 무거운 통합 테스트 묶음은 분할 필요.

## 5. 통합 테스트 (테스트 전용 시트/문서)

진짜 Google 서비스를 호출해야 하는 시나리오는 **테스트용 컨테이너**를 둔다.

패턴:

1. dev/test 프로젝트에 비어있는 테스트 시트/문서 준비
2. 매 테스트 시작 시 시트 클리어 (또는 행 추가 후 마지막 행 검증)
3. `clasp push` 후 `clasp run-function` 또는 트리거로 실행
4. 결과를 시트 별도 탭/Properties에 기록

```javascript
function integrationTest_addRow() {
  const sheet = SpreadsheetApp.openById('TEST_SHEET_ID').getSheetByName('test');
  sheet.clear();
  sheet.appendRow(['name', 'value']);

  // 검증 대상 함수
  myAppendUser_('alice', 42);

  const last = sheet.getRange(2, 1, 1, 2).getValues()[0];
  if (last[0] !== 'alice' || last[1] !== 42) {
    throw new Error('integration failed: ' + JSON.stringify(last));
  }
  console.log('PASS');
}
```

이런 통합 테스트는 CI에서 `clasp run-function`으로 실행하거나, 시간 트리거를 짧은 간격으로 등록해 dashboard로 모니터링한다.

## CI에서 테스트 자동화

```yaml
# .github/workflows/test.yml
name: test
on: [push]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test          # 로컬 Jest

  integration:
    needs: unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci && npm run build
      - name: clasp creds
        run: |
          echo '${{ secrets.CLASPRC_JSON }}' > ~/.clasprc.json
          echo '${{ secrets.CLASP_TEST_JSON }}' > .clasp.json
      - run: npx @google/clasp push --force
      - run: npx @google/clasp run-function integrationTest_addRow
```

`clasp run-function` 사용 조건:
- 매니페스트에 `executionApi.access` 설정 + API executable 배포
- 호출자가 동의한 OAuth client (`clasp login --creds`)

## 함정 / 한계

- **시간 의존**: `Utilities.sleep`을 쓰는 코드는 테스트에서 그대로 느려진다. 별도 sleep 함수로 추상화 후 모킹.
- **시계열 데이터**: `new Date()` 의존 함수는 시계 주입(`now: () => Date`)으로 테스트 가능하게 만든다.
- **Locale/TimeZone**: Apps Script는 스크립트 timeZone 설정에 따라 다르게 동작. 로컬 환경(UTC 등)과 일치시키지 않으면 테스트 결과가 어긋난다.
- **공유 상태**: PropertiesService, Cache는 글로벌 — 동일 프로젝트에서 동시 실행되는 테스트가 서로 간섭. 키 prefix로 격리.
- **퀴오타 소모**: 실 통합 테스트는 일일 quota를 갉아먹는다. PR마다 돌리지 말고 main 머지 후 1회 또는 nightly로 제한.
- **e2e 빌드 vs 테스트 환경 불일치**: clasp는 빌드 산출물을 푸시. 로컬 Jest는 TS 소스를 본다. 같은 코드인지 보장하는 빌드 단계 필요.
- **랜덤성**: `Math.random`은 시드 고정 불가. 테스트에서는 결과를 비결정적으로 검증하거나, 호출부에서 RNG를 주입 패턴으로.

## 권장 가이드라인

1. **로직 80%를 순수 함수로** 분리해 Jest로 빠르게 돌린다.
2. **Apps Script 의존 코드**는 얇은 어댑터 함수로 압축하고 모킹 또는 통합 테스트로 검증.
3. **GasT/QUnitGS2**는 스모크 테스트(주요 흐름 한두 개)에 사용. 단위 테스트 전부를 옮기지 말 것 — 느리고 quota 부담.
4. **테스트 데이터**는 hardcoded sheet ID로 별도 환경에 두고 reset 함수를 갖춘다.

## 참고

- https://github.com/huan/gast (GasT)
- https://github.com/artofthesmart/QUnitGS2 (QUnitGS2)
- https://github.com/simula-innovation/qunit/tree/gas/gas (또 다른 QUnit 포트)
- https://qunitgs2.com/ (QUnitGS2 사이트)
- https://dev.to/davepar/how-to-modularize-and-test-google-apps-scripts-4ig2 (모듈화/테스트 패턴)
