# Optimization 서비스 (선형계획)

> **출처**
> - https://developers.google.com/apps-script/reference/optimization
> - https://developers.google.com/apps-script/reference/optimization/linear-optimization-service
> - https://developers.google.com/apps-script/reference/optimization/linear-optimization-engine
> - https://developers.google.com/apps-script/reference/optimization/linear-optimization-constraint
> - https://developers.google.com/apps-script/reference/optimization/linear-optimization-solution
> - https://developers.google.com/apps-script/reference/optimization/status
> - https://developers.google.com/apps-script/reference/optimization/variable-type
>
> **최종 확인일**: 2026-07-22

## 개요

Optimization 서비스는 **선형계획(LP, Linear Program)** 과 **혼합정수 선형계획(MILP, Mixed-Integer Linear Program)** 문제를 푸는 솔버다. 스케줄링, 자원 배분, 비용 최소화, 생산 계획처럼 "제약 조건 아래에서 목적 함수를 최대/최소화" 하는 문제를 코드로 모델링해 풀 수 있다. Sheets에 들어 있는 데이터(단가, 재고, 수요 등)를 읽어 모델을 구성하고 최적해를 다시 시트에 쓰는 흐름과 잘 맞는다.

풀이 대상은 다음 형태의 문제다.

- **목적 함수**: `Σ (objectiveCoefficient(i) · x(i))` 를 최대화(`setMaximization`) 또는 최소화(`setMinimization`)
- **변수**: 각 변수 `x(i)` 는 하한/상한(`lowerBound`, `upperBound`)을 가지며, 실수(`CONTINUOUS`) 또는 정수(`INTEGER`)
- **제약**: 각 제약은 `lowerBound ≤ Σ (coefficient(i) · x(i)) ≤ upperBound` 형태의 선형 부등식

## 진입점과 전체 흐름

`LinearOptimizationService.createEngine()` 로 엔진을 만들고, 변수 → 제약 → 목적 → 방향(최대/최소) 순으로 모델을 구성한 뒤 `solve()` 로 푼다. 결과는 `LinearOptimizationSolution` 이다.

```javascript
const engine = LinearOptimizationService.createEngine();
// 1. 변수 추가
// 2. 제약 추가 + 계수 설정
// 3. 목적 계수 설정
// 4. setMaximization() / setMinimization()
const solution = engine.solve();
// 5. isValid() / getStatus() 로 결과 검증 후 값 읽기
```

체이닝 참고: `LinearOptimizationEngine` 의 대부분 메서드는 엔진 자신을 반환하고, `LinearOptimizationConstraint.setCoefficient()` 는 제약 자신을 반환한다.

## 주요 메서드

### LinearOptimizationService

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `createEngine()` | `LinearOptimizationEngine` | 새 솔버 엔진 생성 |

enum은 이 서비스의 프로퍼티로 접근한다: `LinearOptimizationService.Status.*`, `LinearOptimizationService.VariableType.*`.

### LinearOptimizationEngine

| 메서드 | 시그니처 | 반환 | 설명 |
| --- | --- | --- | --- |
| `addVariable` | `addVariable(String name, Number lowerBound, Number upperBound)` | `LinearOptimizationEngine` | 연속 변수 추가(기본 `CONTINUOUS`) |
| `addVariable` | `addVariable(String name, Number lowerBound, Number upperBound, VariableType type)` | `LinearOptimizationEngine` | 타입 지정 변수 추가 |
| `addVariable` | `addVariable(String name, Number lowerBound, Number upperBound, VariableType type, Number objectiveCoefficient)` | `LinearOptimizationEngine` | 타입 + 목적 계수까지 한 번에 |
| `addVariables` | `addVariables(String[] names, Number[] lowerBounds, Number[] upperBounds, VariableType[] types, Number[] objectiveCoefficients)` | `LinearOptimizationEngine` | 여러 변수 배치 추가(병렬 배열) |
| `addConstraint` | `addConstraint(Number lowerBound, Number upperBound)` | `LinearOptimizationConstraint` | 빈 제약 생성 후 계수는 `setCoefficient` 로 |
| `addConstraints` | `addConstraints(Number[] lowerBounds, Number[] upperBounds, String[][] variableNames, Number[][] coefficients)` | `LinearOptimizationEngine` | 여러 제약 배치 추가 |
| `setObjectiveCoefficient` | `setObjectiveCoefficient(String variableName, Number coefficient)` | `LinearOptimizationEngine` | 목적 함수에서 변수의 계수 설정 |
| `setMaximization` | `setMaximization()` | `LinearOptimizationEngine` | 목적을 최대화로 |
| `setMinimization` | `setMinimization()` | `LinearOptimizationEngine` | 목적을 최소화로 |
| `solve` | `solve()` | `LinearOptimizationSolution` | 기본 데드라인 30초로 풀이 |
| `solve` | `solve(Number seconds)` | `LinearOptimizationSolution` | 데드라인(초) 지정. 최대 300초 |

### LinearOptimizationConstraint

| 메서드 | 시그니처 | 반환 | 설명 |
| --- | --- | --- | --- |
| `setCoefficient` | `setCoefficient(String variableName, Number coefficient)` | `LinearOptimizationConstraint` | 이 제약에서 변수의 계수 설정. 기본값 0 |

`addConstraint(lowerBound, upperBound)` 로 만든 제약은 처음엔 모든 변수의 계수가 0이다. 참여시킬 변수만 `setCoefficient` 로 계수를 준다.

### LinearOptimizationSolution

| 메서드 | 시그니처 | 반환 | 설명 |
| --- | --- | --- | --- |
| `isValid` | `isValid()` | `Boolean` | 해가 `OPTIMAL` 또는 `FEASIBLE` 이면 `true` |
| `getStatus` | `getStatus()` | `Status` | 풀이 상태 enum |
| `getObjectiveValue` | `getObjectiveValue()` | `Number` | 목적 함수 값 |
| `getVariableValue` | `getVariableValue(String variableName)` | `Number` | 해에서 해당 변수의 값 |

## enum

### Status

| 값 | 의미 |
| --- | --- |
| `OPTIMAL` | 최적해를 찾음 |
| `FEASIBLE` | 실행 가능한 해를 찾음(반드시 최적은 아님) |
| `INFEASIBLE` | 모델에 해가 없음(제약이 서로 모순) |
| `UNBOUNDED` | 목적 함수가 무한대로 발산(경계가 없음) |
| `ABNORMAL` | 예기치 못한 이유로 풀이 실패 |
| `MODEL_INVALID` | 모델이 잘못됨 |
| `NOT_SOLVED` | `solve()` 를 아직 호출하지 않음 |

접근: `LinearOptimizationService.Status.OPTIMAL` 처럼 사용.

### VariableType

| 값 | 의미 |
| --- | --- |
| `INTEGER` | 정수 값만 가질 수 있는 변수 |
| `CONTINUOUS` | 임의의 실수 값을 가질 수 있는 변수 |

접근: `LinearOptimizationService.VariableType.INTEGER` 처럼 사용. `addVariable` 에서 타입을 생략하면 기본 `CONTINUOUS`.

## 코드 예제

### 1) 간단한 최대화 (변수 2개 + 제약 2개)

목적: `max (x + y)`, 제약: `2x + 5y ≤ 10`, `10x + 3y ≤ 20`, 변수 범위 `0 ≤ x ≤ 10`, `0 ≤ y ≤ 5`.

```javascript
function simpleMaximize() {
  const engine = LinearOptimizationService.createEngine();

  // 변수: 0 이상이므로 제약 하한을 0으로 둬도 유효
  engine.addVariable('x', 0, 10);
  engine.addVariable('y', 0, 5);

  // 2x + 5y <= 10  →  0 <= 2x + 5y <= 10
  let c = engine.addConstraint(0, 10);
  c.setCoefficient('x', 2);
  c.setCoefficient('y', 5);

  // 10x + 3y <= 20
  c = engine.addConstraint(0, 20);
  c.setCoefficient('x', 10);
  c.setCoefficient('y', 3);

  // 목적: max (x + y)
  engine.setObjectiveCoefficient('x', 1);
  engine.setObjectiveCoefficient('y', 1);
  engine.setMaximization();

  const solution = engine.solve();
  if (!solution.isValid()) {
    Logger.log(`해 없음: ${solution.getStatus()}`);
    return;
  }
  Logger.log(`objective = ${solution.getObjectiveValue()}`);
  Logger.log(`x = ${solution.getVariableValue('x')}, y = ${solution.getVariableValue('y')}`);
}
```

### 2) 정수계획 (MILP) — 생산 계획

의자(`chair`)와 테이블(`table`)을 몇 개 만들지 정한다. 개수는 정수여야 한다. 목적: `max (40·chair + 50·table)`, 제약: 목재 `4·chair + 6·table ≤ 240`, 노동 `2·chair + 4·table ≤ 120`.

```javascript
function productionPlan() {
  const engine = LinearOptimizationService.createEngine();
  const INTEGER = LinearOptimizationService.VariableType.INTEGER;

  // addVariable(name, lower, upper, type, objectiveCoefficient)
  // 목적 계수를 변수 정의 시점에 함께 지정
  engine.addVariable('chair', 0, 100, INTEGER, 40);
  engine.addVariable('table', 0, 100, INTEGER, 50);

  // 목재 제약: 4c + 6t <= 240
  let wood = engine.addConstraint(0, 240);
  wood.setCoefficient('chair', 4);
  wood.setCoefficient('table', 6);

  // 노동 제약: 2c + 4t <= 120
  let labor = engine.addConstraint(0, 120);
  labor.setCoefficient('chair', 2);
  labor.setCoefficient('table', 4);

  engine.setMaximization();

  const solution = engine.solve();
  if (!solution.isValid()) {
    throw new Error(`해 없음: ${solution.getStatus()}`);
  }
  Logger.log(`이익 = ${solution.getObjectiveValue()}`);
  Logger.log(`의자 ${solution.getVariableValue('chair')}개, 테이블 ${solution.getVariableValue('table')}개`);
}
```

### 3) 풀이 결과 상태 분기 + timeout 지정

큰 MILP는 최적해를 못 찾고 시간이 다 될 수 있다. `solve(seconds)` 로 데드라인을 주고 `getStatus()` 로 분기한다.

```javascript
function solveWithStatusHandling(engine) {
  const S = LinearOptimizationService.Status;

  // 최대 60초까지 풀이 (상한 300초)
  const solution = engine.solve(60);

  switch (solution.getStatus()) {
    case S.OPTIMAL:
      Logger.log(`최적해: ${solution.getObjectiveValue()}`);
      return solution;
    case S.FEASIBLE:
      // 시간 내 최적을 못 찾았지만 쓸 수 있는 해는 있음
      Logger.log(`실행 가능한 해(최적 아님): ${solution.getObjectiveValue()}`);
      return solution;
    case S.INFEASIBLE:
      throw new Error('제약이 모순되어 해가 없습니다. 제약 범위를 완화하세요.');
    case S.UNBOUNDED:
      throw new Error('목적이 무한대로 발산합니다. 변수 상한/제약을 확인하세요.');
    case S.MODEL_INVALID:
      throw new Error('모델 정의가 잘못되었습니다.');
    case S.NOT_SOLVED:
      throw new Error('solve()가 실행되지 않았습니다.');
    case S.ABNORMAL:
    default:
      throw new Error(`풀이 실패: ${solution.getStatus()}`);
  }
}
```

## 주의사항 / 함정

1. **해가 항상 나오는 게 아니다 — 반드시 검증**
   `solve()` 후 곧바로 `getVariableValue()` 를 부르지 말 것. `isValid()`(OPTIMAL/FEASIBLE 이면 true) 또는 `getStatus()` 로 먼저 상태를 확인한다. `INFEASIBLE`(제약 모순), `UNBOUNDED`(발산), `MODEL_INVALID`, `ABNORMAL` 처리 경로를 반드시 둔다.

2. **`INFEASIBLE` vs `UNBOUNDED`**
   `INFEASIBLE` 은 제약이 서로 모순되어 만족하는 점이 없음 → 제약을 완화하거나 오타/부호를 점검. `UNBOUNDED` 는 목적이 무한대로 커질 수 있음 → 변수 상한이나 제약이 빠졌을 가능성.

3. **`solve()` 데드라인은 초 단위, 기본 30초, 최대 300초**
   `LockService` 의 timeout(밀리초)과 단위가 다르다. 여기서 `solve(60)` 은 60초를 뜻한다. 300초를 넘겨 지정해도 최대 300초로 제한된다.

4. **전체 스크립트 실행 시간 한도도 별도로 적용**
   `solve` 데드라인과 무관하게, 스크립트 전체는 실행 유형별 최대 실행 시간(예: 6분 등, `06-quotas/quotas-and-limits.md` 참고) 안에서 끝나야 한다. 모델 구성·시트 I/O·풀이를 모두 합쳐 한도 안에 들어와야 한다.

5. **정수 변수는 어렵다**
   MILP(`INTEGER`)는 일반적으로 연속 LP보다 훨씬 무겁다. 변수가 많으면 데드라인 안에 최적을 못 찾고 `FEASIBLE`(또는 시간 초과 실패)로 끝날 수 있다. `FEASIBLE` 반환도 정상 흐름으로 다뤄야 한다.

6. **제약 계수 기본값은 0**
   `addConstraint` 로 만든 제약에서 `setCoefficient` 로 지정하지 않은 변수의 계수는 0이다(그 제약에 참여하지 않음). 목적 함수도 `setObjectiveCoefficient`(또는 `addVariable` 의 5번째 인자)로 지정하지 않은 변수는 계수 0.

7. **무한대 상수가 없다 — 한쪽만 제한하는 제약 주의**
   `addConstraint(lowerBound, upperBound)` 는 하한·상한 모두 숫자를 요구한다. "`≤ b`" 같은 단측 제약은, 변수가 모두 0 이상이고 계수가 양수라면 예제처럼 하한 0으로 두면 자연히 만족된다. 그렇지 않은 경우 충분히 크거나 작은 수치 경계를 직접 넣어야 한다(전용 무한대 상수는 공식 문서에 없음).

8. **이름 참조 일관성**
   `setCoefficient(name, ...)`, `setObjectiveCoefficient(name, ...)`, `getVariableValue(name)` 의 `name` 은 `addVariable` 로 등록한 변수 이름과 정확히 일치해야 한다. 오타는 모델 오류(`MODEL_INVALID`)나 의도치 않은 결과로 이어진다.

9. **대량 변수/제약은 배치 API 고려**
   변수·제약이 많으면 개별 호출 대신 `addVariables` / `addConstraints`(병렬 배열)로 한 번에 넘기는 편이 코드가 간결하다.

10. **Sheets 연동 시 I/O는 배치로**
    단가·수요 등을 시트에서 읽어 모델을 구성할 때는 셀을 하나씩 읽지 말고 `getValues()` 로 한 번에 읽는다(quota·속도). 결과 기록도 `setValues()` 로 배치. (`02-services/spreadsheet.md`)

## 참고

- LinearOptimizationService: https://developers.google.com/apps-script/reference/optimization/linear-optimization-service
- LinearOptimizationEngine: https://developers.google.com/apps-script/reference/optimization/linear-optimization-engine
- LinearOptimizationConstraint: https://developers.google.com/apps-script/reference/optimization/linear-optimization-constraint
- LinearOptimizationSolution: https://developers.google.com/apps-script/reference/optimization/linear-optimization-solution
- 관련 문서: `02-services/spreadsheet.md`, `06-quotas/quotas-and-limits.md`
