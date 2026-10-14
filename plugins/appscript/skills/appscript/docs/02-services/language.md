# LanguageApp (번역)

> **출처**
> - https://developers.google.com/apps-script/reference/language/language-app
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

`LanguageApp`은 텍스트를 **기계 번역**하는 서비스다. Google Translate 엔진을 통해 문자열을 한 언어에서 다른 언어로 자동 번역한다. 공식 설명: "The Language service provides scripts a way to compute automatic translations of text."

메서드는 `translate` 하나뿐이며(오버로드 2개), 반환값은 번역된 `String`이다.

**언제 쓰는가**
- Sheets 셀·열의 텍스트를 일괄 번역
- 폼 응답, 이메일 본문 등 사용자 입력을 특정 언어로 정규화
- 다국어 콘텐츠 초벌 번역(품질 한계는 아래 주의사항 참고)

## 주요 메서드

### LanguageApp

| 메서드 | 시그니처 | 반환 | 설명 |
| --- | --- | --- | --- |
| `translate(text, sourceLanguage, targetLanguage)` | `(String, String, String)` | `String` | 기본 번역 |
| `translate(text, sourceLanguage, targetLanguage, advancedArgs)` | `(String, String, String, Object)` | `String` | 고급 옵션 지정 번역 |

**매개변수**

| 매개변수 | 타입 | 설명 |
| --- | --- | --- |
| `text` | `String` | 번역할 텍스트 |
| `sourceLanguage` | `String` | 원문 언어 코드. **빈 문자열 `''`을 주면 원문 언어를 자동 감지**한다 (공식: "If set to empty string, the source language code will be auto-detected"). |
| `targetLanguage` | `String` | 번역 대상 언어 코드 |
| `advancedArgs` | `Object` | 선택. 고급 옵션 객체 |

**`advancedArgs` 필드**

| 필드 | 타입 | 값 | 설명 |
| --- | --- | --- | --- |
| `contentType` | `String` | `'text'`(기본) 또는 `'html'` | 공식: "supported values are 'text' (default) and 'html'". `'html'`이면 태그를 보존하고 태그 안 텍스트만 번역한다. |

> `advancedArgs`에 공식 문서가 명시한 필드는 `contentType` 하나뿐이다. 그 외 옵션은 **공식 문서 확인 필요**.

## 언어 코드

`sourceLanguage`·`targetLanguage`에는 ISO 언어 코드(Google Translate 표준)를 쓴다. 대표 예시:

| 코드 | 언어 |
| --- | --- |
| `''` | (원문) 자동 감지 |
| `'en'` | 영어 |
| `'ko'` | 한국어 |
| `'ja'` | 일본어 |
| `'zh'` | 중국어(간체) |
| `'es'` | 스페인어 |
| `'fr'` | 프랑스어 |

전체 지원 코드 목록은 공식 문서 참고: https://developers.google.com/translate/docs/languages

## 코드 예제

### 1) 기본 번역

```javascript
function basicTranslate() {
  const spanish = LanguageApp.translate('This is a test', 'en', 'es');
  Logger.log(spanish); // "Esta es una prueba"

  const korean = LanguageApp.translate('Hello, world', 'en', 'ko');
  Logger.log(korean); // "안녕하세요, 세계" (엔진에 따라 표현 다를 수 있음)
}
```

### 2) 원문 언어 자동 감지 (`sourceLanguage = ''`)

```javascript
function autoDetectTranslate() {
  // 원문이 무슨 언어인지 모를 때: source에 빈 문자열
  const toKorean = LanguageApp.translate('Bonjour tout le monde', '', 'ko');
  Logger.log(toKorean);
}
```

원문 언어를 미리 알 수 없는 사용자 입력(폼 응답, 채팅 등)에 유용하다. 단, 감지가 틀릴 수 있으므로 정확도가 중요하면 명시적 코드를 주는 편이 낫다.

### 3) HTML 모드 (태그 보존)

```javascript
function translateHtml() {
  const spanish = LanguageApp.translate(
    'This is a <strong>test</strong>',
    'en',
    'es',
    { contentType: 'html' },
  );
  Logger.log(spanish); // "Esta es una <strong>prueba</strong>"
}
```

`contentType: 'html'`이면 `<strong>` 같은 태그를 그대로 두고 텍스트만 번역한다. 기본값 `'text'`로 HTML을 넘기면 태그가 그냥 문자로 취급되어 깨질 수 있다.

### 4) 시트 열 일괄 번역 + 캐싱 (CacheService 결합)

같은 문장을 반복 번역하면 quota만 소모된다. `CacheService`로 원문→번역 결과를 캐싱하면 중복 호출을 줄이고, 자동 감지 오류에도 재현성이 생긴다.

```javascript
function translateColumn() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const cache = CacheService.getScriptCache();

  // A열: 원문(en), B열: 번역 대상(ko)
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  const source = range.getValues(); // [[text], ...]
  const out = [];

  for (const [text] of source) {
    if (!text) {
      out.push(['']);
      continue;
    }

    // 캐시 키: 언어쌍 + 원문 해시(키 250자 한도 회피)
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      text,
    );
    const key = 'tr:en:ko:' + Utilities.base64Encode(digest);

    let translated = cache.get(key);
    if (translated === null) {
      translated = LanguageApp.translate(text, 'en', 'ko');
      cache.put(key, translated, 21_600); // 최대 6시간
    }
    out.push([translated]);
  }

  // B열에 한 번에 기록
  sheet.getRange(2, 2, out.length, 1).setValues(out);
}
```

행마다 `setValue`로 쓰지 말고 `getValues`/`setValues`로 배치 처리한다(Spreadsheet 왕복 최소화). 캐시는 휘발성이며 `null`이 반환될 수 있으므로 위 예제처럼 `null` 가드 후 재번역한다.

## 주의사항 / Quota / 함정

1. **일일 quota (Translate)**
   공식 quotas 페이지 기준, 하루 `translate` 호출 한도:

   | 계정 유형 | 일일 한도 |
   | --- | --- |
   | Consumer (gmail.com 등) | 5,000 / day |
   | Google Workspace | 20,000 / day |

   공식 경고: "All quotas are subject to elimination, reduction, or change at any time, without notice." → **수치는 언제든 바뀔 수 있으므로 절대치에 의존하지 말 것.** 대량 번역은 캐싱(예제 4)으로 호출 수를 줄인다.

2. **기계 번역 품질 한계**
   자연스러움·전문 용어·문맥 정확도가 보장되지 않는다. 법률·의료 등 정확도가 중요한 텍스트에는 부적합. 초벌 번역 용도로만 신뢰.

3. **자동 감지(`source = ''`)는 틀릴 수 있음**
   짧은 문자열·혼합 언어에서 감지 오류가 잦다. 원문 언어를 알면 명시적 코드를 주는 편이 안정적이다.

4. **HTML 모드 주의**
   HTML 문자열은 반드시 `contentType: 'html'`로 넘긴다. 기본 `'text'` 모드로 태그를 넘기면 태그가 번역 대상 텍스트로 취급되어 결과가 깨진다. 반대로 순수 텍스트에 `'html'`을 쓰면 `<`, `&` 등이 엔티티로 왜곡될 수 있다.

5. **호출당 지연·실행 시간**
   `translate`는 네트워크 호출이라 느리다. 수천 행을 루프 번역하면 6분 실행 시간 한도(전 계정 동일)에 걸릴 수 있다. 캐싱 + 배치 read/write + 필요 시 분할 실행(트리거)으로 대응.

6. **입력 텍스트 길이 상한**
   호출 1회당 번역 가능한 최대 텍스트 길이는 공식 문서에 별도 명시가 확인되지 않았다 → **공식 문서 확인 필요**. 매우 긴 텍스트는 문단 단위로 나눠 번역 권장.

7. **`advancedArgs`는 `contentType`만 문서화됨**
   그 외 옵션(예: 포맷·모델 지정 등)은 공식 문서에 없다. 필요 시 확인 필요.

## 참고

- LanguageApp: https://developers.google.com/apps-script/reference/language/language-app
- 언어 코드 목록: https://developers.google.com/translate/docs/languages
- 관련 문서: `02-services/cache.md` (번역 결과 캐싱), `02-services/spreadsheet.md` (셀 일괄 read/write), `06-quotas/quotas-and-limits.md` (일일 한도·실행 시간)
