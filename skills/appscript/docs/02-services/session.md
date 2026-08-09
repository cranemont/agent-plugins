# Session

> **출처**
> - https://developers.google.com/apps-script/reference/base
> - https://developers.google.com/apps-script/reference/base/session
>
> **최종 확인일**: 2026-07-22

## 개요

`Session`은 **현재 실행 컨텍스트의 사용자·로캘·타임존 정보**에 접근한다. 작은 클래스지만 웹 앱, 트리거, 단순 트리거의 동작을 이해하는 데 결정적이다.

## 주요 메서드

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getActiveUser()` | `User` | 현재 스크립트를 사용 중인 사람 |
| `getEffectiveUser()` | `User` | 권한이 적용되는 사람 (스크립트 소유자) |
| `getActiveUserLocale()` | `String` | 사용자 로캘 (예: `'ko'`, `'en'`) |
| `getScriptTimeZone()` | `String` | 스크립트의 타임존 (예: `'Asia/Seoul'`) |
| `getTemporaryActiveUserKey()` | `String` | 익명 식별 키, 30일마다 회전 |

`User` 객체에는 `getEmail()`이 있다.

## Active User vs Effective User (중요)

| | Active User | Effective User |
| --- | --- | --- |
| 의미 | 지금 실행을 **트리거한 사람** | 권한이 작동하는 사람 (보통 스크립트 소유자) |
| 사용 예 | "누가 이 버튼을 눌렀지?" | "이 호출은 누구의 권한으로 가지?" |

대부분의 컨텍스트에서 둘은 같다. **다른 경우**가 핵심이다.

### 같은 경우 (대다수)

- 컨테이너 바운드 onEdit (편집한 사람이 곧 실행자)
- 표준 메뉴 클릭으로 직접 실행
- "사용자로 실행"으로 배포된 웹 앱

### 다른 경우

- **"나로 실행"(execute as owner)으로 배포된 웹 앱**
  - 호출자: Active User (방문한 사람)
  - 권한 주체: Effective User (개발자/소유자)
  - 결과적으로 `DriveApp.getFiles()`는 개발자의 Drive를 본다.
- **설치형 트리거**
  - 트리거를 설치한 사람의 권한으로 실행됨 (Effective User)
  - Active User는 이벤트가 가리키는 사람일 수 있지만 단순 트리거에서는 비어 있을 수도 있다.

## `getEmail()` 권한과 빈 문자열

`User.getEmail()`은 일정 조건에서 **빈 문자열을 반환**한다.

> 문서 인용: "the user's email address is not available in any context that allows a script to run without that user's authorization, like a simple `onOpen(e)` or `onEdit(e)` trigger."

즉:

- **단순 트리거(simple trigger)** `onOpen`, `onEdit`: 사용자 동의 없이 도는 컨텍스트라 이메일이 빈 문자열일 수 있다.
- **"나로 실행" 웹 앱**: 사용자가 직접 권한을 부여한 적이 없으므로 `getActiveUser().getEmail()`이 빈 문자열일 수 있다. (소유자와 같은 도메인 Workspace 안에서만 채워지는 경향)

이메일이 필요하면:
1. `appsscript.json`에 `userinfo.email` 또는 비슷한 스코프를 명시.
2. **"사용자로 실행"** 모드를 쓰거나, OAuth 동의 후 API로 받기.
3. 사용자 식별만 필요하면 `getTemporaryActiveUserKey()` 사용 (이메일 노출 없음, 30일 회전).

## 코드 예제

### 1) 현재 사용자 이메일

```javascript
function whoAmI() {
  const email = Session.getActiveUser().getEmail();
  if (!email) {
    return 'unknown (no auth or simple trigger context)';
  }
  return email;
}
```

### 2) 권한 주체 확인 (웹 앱 진단)

```javascript
function doGet() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  return ContentService.createTextOutput(JSON.stringify({ active, effective }));
}
```

"나로 실행"이면 `effective`는 개발자, `active`는 방문자(같은 도메인일 때만 채워질 가능성).

### 3) 익명 식별 키 (이메일 없이 사용자 구분)

```javascript
function recordVisit() {
  const key = Session.getTemporaryActiveUserKey();
  PropertiesService.getScriptProperties()
    .setProperty(`visit:${key}`, new Date().toISOString());
}
```

이메일이 비어 있어도 동일 사용자는 30일 동안 같은 키를 받는다. 30일 뒤에는 다른 키로 회전.

### 4) 로캘 기반 분기

```javascript
function greet() {
  const locale = Session.getActiveUserLocale(); // 'ko', 'en', 'ja', ...
  return locale === 'ko' ? '안녕하세요' : 'Hello';
}
```

### 5) 스크립트 타임존 기준 시각

```javascript
const tz = Session.getScriptTimeZone();
const now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
```

스크립트 타임존은 에디터의 **Project Settings → Time zone**에서 변경한다. 이 값은 스프레드시트 자체의 타임존과 다를 수 있다.

## 일반적인 패턴

### 권한 검사 (관리자 화이트리스트)

```javascript
const ADMINS = ['admin@example.com'];

function requireAdmin() {
  const email = Session.getActiveUser().getEmail();
  if (!ADMINS.includes(email)) {
    throw new Error('Forbidden');
  }
}
```

주의: 단순 트리거나 "나로 실행" 웹 앱에선 이메일이 비어 있을 수 있어 이 패턴이 깨진다. 권한 검사를 강제하려면 "사용자로 실행" 모드 + `userinfo.email` 스코프.

### 다국어 메시지

```javascript
const MESSAGES = {
  ko: { hello: '안녕하세요' },
  en: { hello: 'Hello' },
};

function t(key) {
  const locale = Session.getActiveUserLocale() || 'en';
  return (MESSAGES[locale] ?? MESSAGES.en)[key];
}
```

### 스크립트 vs 사용자 타임존

```javascript
function userAwareStamp() {
  const tz = Session.getScriptTimeZone(); // 사용자 타임존 API는 없음
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss z');
}
```

Apps Script에는 사용자 개별 타임존을 가져오는 표준 API가 없다. 개인화가 필요하면 사용자가 Profile에 직접 저장하게 만들고 User Properties에 보관.

## 주의사항 / Quota / 함정

1. **`getActiveUser().getEmail()`이 빈 문자열일 수 있다**
   - 단순 트리거(`onEdit`/`onOpen`)
   - "나로 실행" 웹 앱에서 도메인이 다른 방문자
   이메일이 정말로 필요하면 실행 모드와 스코프를 점검.

2. **Active와 Effective를 헷갈리지 말 것**
   파일 접근, 메일 발송 같은 작업은 항상 Effective User 권한으로 동작한다. "내 Drive가 안 보인다"는 보통 "나로 실행"이라 Effective가 개발자라서 그렇다.

3. **`getScriptTimeZone()`은 스프레드시트 타임존이 아니다**
   스프레드시트의 셀 포맷(예: `=NOW()`)은 스프레드시트 자체 설정 타임존을 따른다. 두 값이 다르면 시간 계산이 어긋난다.

4. **`getTemporaryActiveUserKey()`는 회전한다**
   30일 단위로 바뀐다고 문서에 명시. 영구 식별자로 쓰면 안 됨. 장기 추적이 필요하면 이메일 동의 후 ID 매핑.

5. **로캘 가용성**
   `getActiveUserLocale()`은 Workspace 사용자에게는 잘 동작하지만 외부 사용자에선 비어 있을 수 있다. 기본값 fallback 필수.

6. **`Session.getUser()`는 deprecated**
   과거 API. `getActiveUser()`/`getEffectiveUser()`만 사용.

## 참고

- Session: https://developers.google.com/apps-script/reference/base/session
- User: https://developers.google.com/apps-script/reference/base/user
- 관련 문서: `04-web-apps/`, `05-auth/`, `02-services/properties.md`
