# XmlService

> **출처**
> - https://developers.google.com/apps-script/reference/xml-service
> - https://developers.google.com/apps-script/reference/xml-service/xml-service
> - https://developers.google.com/apps-script/reference/xml-service/document
> - https://developers.google.com/apps-script/reference/xml-service/element
> - https://developers.google.com/apps-script/reference/xml-service/namespace
> - https://developers.google.com/apps-script/reference/xml-service/attribute
> - https://developers.google.com/apps-script/reference/xml-service/format
>
> **최종 확인일**: 2026-07-22

## 개요

`XmlService`는 XML 문서를 **파싱**하고 트리로 **탐색**하며, 프로그램으로 XML을 **생성·직렬화**하는 서비스다. 내부 구조는 JDOM 스타일의 노드 트리다.

**언제 쓰는가**
- 외부 API의 XML 응답(RSS/Atom 피드, SOAP, 레거시 XML) 파싱
- XML 요청 본문(SOAP 엔벨로프 등)을 코드로 생성
- 스프레드시트/Drive 데이터를 XML로 직렬화

**OAuth 스코프**: `XmlService` 자체는 외부 접근을 하지 않으므로 별도 스코프가 필요 없다. 다만 실전에서는 거의 항상 `UrlFetchApp`과 짝을 이루며, 그쪽이 `https://www.googleapis.com/auth/script.external_request`를 요구한다.

**JSON이 더 낫다**: 서버가 JSON도 지원하면 `JSON.parse`가 훨씬 간단하고 빠르다. `XmlService`는 상대가 XML만 줄 때 쓴다.

## 핵심 흐름

**파싱 (읽기)**

```
문자열 XML
  → XmlService.parse(xml)            // Document
  → document.getRootElement()        // Element (루트)
  → element.getChild / getChildren / getChildText / getAttribute  // 탐색
```

**생성 (쓰기)**

```
XmlService.createElement(...) / createDocument(...)  // 트리 구성
  → element.setText / setAttribute / addContent      // 내용 채우기
  → XmlService.getPrettyFormat().format(document)     // 문자열로 직렬화
```

## 주요 클래스 / 메서드

### XmlService

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `parse(xml)` | `Document` | 문자열 XML을 파싱. 잘못된 XML이면 예외 |
| `createDocument()` | `Document` | 빈 문서 |
| `createDocument(rootElement)` | `Document` | 루트 요소를 가진 문서 |
| `createElement(name)` | `Element` | 요소 생성 |
| `createElement(name, namespace)` | `Element` | 네임스페이스 있는 요소 |
| `createText(text)` | `Text` | 텍스트 노드 |
| `createCdata(text)` | `Cdata` | CDATA 노드 |
| `createComment(text)` | `Comment` | 주석 노드 |
| `createDocType(elementName)` | `DocType` | DOCTYPE 선언 |
| `getNamespace(uri)` | `Namespace` | URI만으로 (기본 네임스페이스) |
| `getNamespace(prefix, uri)` | `Namespace` | prefix + URI |
| `getNoNamespace()` | `Namespace` | "네임스페이스 없음" |
| `getXmlNamespace()` | `Namespace` | 예약 `xml:` 네임스페이스 |
| `getPrettyFormat()` | `Format` | 들여쓰기·줄바꿈 포맷 |
| `getRawFormat()` | `Format` | 입력 그대로 (가공 없음) |
| `getCompactFormat()` | `Format` | 공백 최소화 |

### Document

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getRootElement()` | `Element \| null` | 루트 요소 |
| `setRootElement(element)` | `Document` | 루트 설정 |
| `hasRootElement()` | `Boolean` | 루트 존재 여부 |
| `detachRootElement()` | `Element \| null` | 루트 분리 |
| `getDocType()` | `DocType \| null` | DOCTYPE |
| `setDocType(docType)` | `Document` | DOCTYPE 설정 |
| `addContent(content)` | `Document` | 노드 추가 |
| `getAllContent()` | `Content[]` | 모든 자식 노드 |
| `getDescendants()` | `Content[]` | 모든 후손 노드 |

### Element (대표 메서드)

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `getName()` | `String` | 로컬 태그명 |
| `getQualifiedName()` | `String` | prefix 포함 이름 |
| `getText()` | `String` | 이 요소의 **직접** 텍스트만 |
| `getValue()` | `String` | 이 요소 + 모든 후손의 텍스트를 이어붙인 값 |
| `getChild(name)` | `Element \| null` | 이름이 일치하는 **첫** 자식 |
| `getChild(name, namespace)` | `Element \| null` | 네임스페이스까지 매칭 |
| `getChildren()` | `Element[]` | 모든 자식 요소 |
| `getChildren(name)` | `Element[]` | 이름이 일치하는 자식들 |
| `getChildren(name, namespace)` | `Element[]` | 네임스페이스까지 매칭 |
| `getChildText(name)` | `String \| null` | 자식 요소의 텍스트 (없으면 `null`) |
| `getChildText(name, namespace)` | `String \| null` | 네임스페이스까지 매칭 |
| `getAttribute(name)` | `Attribute \| null` | 속성 |
| `getAttribute(name, namespace)` | `Attribute \| null` | 네임스페이스 속성 |
| `getAttributes()` | `Attribute[]` | 모든 속성 |
| `getNamespace()` | `Namespace` | 이 요소의 네임스페이스 |
| `getParentElement()` | `Element \| null` | 부모 요소 |
| `getContentSize()` | `Integer` | 자식 노드 수 |
| `getDescendants()` | `Content[]` | 모든 후손 노드 |
| `setText(text)` | `Element` | 텍스트 설정 (체이닝) |
| `setName(name)` | `Element` | 이름 설정 |
| `setNamespace(namespace)` | `Element` | 네임스페이스 설정 |
| `setAttribute(name, value)` | `Element` | 속성 추가/변경 |
| `setAttribute(name, value, namespace)` | `Element` | 네임스페이스 속성 |
| `addContent(content)` | `Element` | 자식 노드 추가 |
| `removeAttribute(attributeName)` | `Boolean` | 속성 제거 |
| `detach()` | `Content \| null` | 트리에서 분리 |

`getText()`와 `getValue()`의 차이에 주의: `getText()`는 그 요소가 직접 감싼 텍스트만, `getValue()`는 후손까지 전부 이어붙인다.

> XML에서 속성을 새로 만들 때는 `XmlService.createAttribute(...)` 같은 팩토리가 아니라 **`Element.setAttribute(name, value)`** 로 추가한다. `Attribute` 객체는 주로 `getAttribute(...)`로 읽을 때 다룬다.

### Namespace / Attribute

| 클래스 | 메서드 | 반환 |
| --- | --- | --- |
| Namespace | `getPrefix()` | `String` |
| Namespace | `getURI()` | `String` |
| Attribute | `getName()` | `String` |
| Attribute | `getValue()` | `String` |
| Attribute | `getNamespace()` | `Namespace \| null` |
| Attribute | `setValue(value)` | `Attribute` |

### Format (출력)

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `format(document)` | `String` | Document를 문자열로 |
| `format(element)` | `String` | Element만 문자열로 |
| `setEncoding(encoding)` | `Format` | 인코딩 (예: `UTF-8`) |
| `setIndent(indent)` | `Format` | 들여쓰기 문자열 |
| `setLineSeparator(separator)` | `Format` | 줄 구분자 (기본 `\r\n`) |
| `setOmitDeclaration(bool)` | `Format` | `<?xml ...?>` 선언 생략 |
| `setOmitEncoding(bool)` | `Format` | 선언에서 encoding 속성 생략 |

`getPrettyFormat()` / `getRawFormat()` / `getCompactFormat()`은 미리 설정된 `Format`을 돌려주고, 위 setter로 세부 조정한 뒤 `format(...)`로 직렬화한다.

### ContentType (enum)

노드 종류를 나타내는 열거형: `CDATA`, `COMMENT`, `DOCTYPE`, `ELEMENT`, `ENTITYREF`, `PROCESSINGINSTRUCTION`, `TEXT`.

## 코드 예제

### 1) RSS 파싱 (UrlFetchApp와 짝)

RSS 2.0의 핵심 요소(`channel`, `item`, `title`, `link`, `pubDate`)는 네임스페이스가 없으므로 이름만으로 탐색한다.

```javascript
function fetchRssItems(feedUrl) {
  const xml = UrlFetchApp.fetch(feedUrl).getContentText();
  const document = XmlService.parse(xml);
  const root = document.getRootElement();      // <rss>
  const channel = root.getChild('channel');
  const items = channel.getChildren('item');

  return items.map(item => ({
    title: item.getChildText('title'),
    link: item.getChildText('link'),
    pubDate: item.getChildText('pubDate'),
  }));
}
```

`getChildText`는 자식이 없으면 `null`을 반환한다. 필수 필드가 아니면 `null` 가드를 넣는다.

### 2) 네임스페이스가 있는 파싱 (Atom)

Atom 피드는 루트와 모든 자식이 `http://www.w3.org/2005/Atom` 네임스페이스 안에 있다. 이 경우 **네임스페이스를 넘기지 않으면 `getChild`가 `null`을 반환**한다.

```javascript
function fetchAtomEntries(feedUrl) {
  const xml = UrlFetchApp.fetch(feedUrl).getContentText();
  const root = XmlService.parse(xml).getRootElement();      // <feed>
  const atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');

  const entries = root.getChildren('entry', atom);
  return entries.map(entry => ({
    title: entry.getChildText('title', atom),
    id: entry.getChildText('id', atom),
    updated: entry.getChildText('updated', atom),
  }));
}
```

### 3) 네임스페이스 함정 (default namespace)

`xmlns="..."`로 선언된 **기본 네임스페이스**가 있으면, 문서에 prefix가 안 보여도 요소는 그 네임스페이스에 속한다. 이름만으로는 못 찾는다.

```javascript
const xml = '<root xmlns="http://example.com/ns"><item>A</item></root>';
const root = XmlService.parse(xml).getRootElement();

// 함정: prefix가 안 보인다고 이름만 넘기면 null
root.getChild('item');            // → null

// 해결: URI로 Namespace를 만들어 함께 넘긴다
const ns = XmlService.getNamespace('http://example.com/ns');
root.getChild('item', ns).getText();   // → "A"
```

파싱 대상 요소의 실제 네임스페이스가 헷갈리면 `element.getNamespace().getURI()`로 확인한다.

### 4) XML 생성 + 포맷 출력

```javascript
function buildBooksXml() {
  const root = XmlService.createElement('books');

  const book = XmlService.createElement('book').setAttribute('id', '1');
  book.addContent(XmlService.createElement('title').setText('Apps Script Guide'));
  book.addContent(XmlService.createElement('author').setText('Wood'));
  root.addContent(book);

  const document = XmlService.createDocument(root);

  // 들여쓰기 + UTF-8 선언 붙인 예쁜 출력
  const output = XmlService.getPrettyFormat()
    .setEncoding('UTF-8')
    .format(document);

  return output;
}
```

선언(`<?xml ...?>`) 없이 조각만 필요하면 `setOmitDeclaration(true)`를 쓰거나 `format(element)`로 요소만 직렬화한다.

### 5) SOAP 요청 생성 → 응답 파싱 (UrlFetchApp와 짝)

네임스페이스가 있는 XML을 만들고, POST한 뒤 응답을 다시 네임스페이스로 파싱하는 실전 흐름이다.

```javascript
function callSoap() {
  const soapNs = XmlService.getNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
  const bodyNs = XmlService.getNamespace('m', 'http://example.com/service');

  const envelope = XmlService.createElement('Envelope', soapNs);
  const body = XmlService.createElement('Body', soapNs);
  const op = XmlService.createElement('GetPrice', bodyNs);
  op.addContent(XmlService.createElement('Item', bodyNs).setText('Apple'));
  body.addContent(op);
  envelope.addContent(body);

  const requestXml = XmlService.getRawFormat()
    .format(XmlService.createDocument(envelope));

  const res = UrlFetchApp.fetch('https://example.com/soap', {
    method: 'post',
    contentType: 'text/xml; charset=utf-8',
    payload: requestXml,
    muteHttpExceptions: true,
  });

  // 응답 파싱: 응답의 네임스페이스로 다시 탐색
  const root = XmlService.parse(res.getContentText()).getRootElement();
  const respBody = root.getChild('Body', soapNs);
  const price = respBody
    .getChild('GetPriceResponse', bodyNs)
    .getChildText('Price', bodyNs);

  return price;
}
```

## ContentService로 XML 응답 만들기와의 관계

`XmlService`는 XML **문자열을 만들 뿐**, 웹 앱 응답으로 내보내는 건 `ContentService`의 몫이다. 웹 앱(`doGet`/`doPost`)에서 XML을 응답하려면 `XmlService`로 직렬화한 문자열을 `ContentService`에 넘긴다.

```javascript
function doGet() {
  const xml = buildBooksXml(); // 예제 4
  return ContentService
    .createTextOutput(xml)
    .setMimeType(ContentService.MimeType.XML);
}
```

자세한 웹 앱 출력·MIME 타입은 `04-web-apps/content-service.md` 참고.

## 주의사항 / 함정

1. **네임스페이스가 있으면 이름만으로 못 찾는다**
   Atom/SOAP 등 네임스페이스가 선언된 문서는 `getChild(name)`이 `null`을 반환한다. `getChild(name, namespace)`를 써야 한다. 기본 네임스페이스(`xmlns="..."`)는 prefix가 안 보여도 적용된다(예제 3).

2. **`getText()` vs `getValue()`**
   `getText()`는 직접 텍스트만, `getValue()`는 후손 전체 텍스트를 이어붙인다. 중첩 요소가 있는데 `getText()`를 쓰면 빈 문자열이 나올 수 있다.

3. **`getChildText`/`getChild`는 `null` 반환**
   없는 자식·속성은 `null`이다. `.getText()`를 바로 체이닝하면 `null` 참조 에러가 난다. 옵션 필드는 가드 필수.

4. **잘못된 XML은 예외**
   `XmlService.parse`는 엄격한 XML 파서라 닫히지 않은 태그, 인코딩 문제, HTML(비 XML) 입력에서 예외를 던진다. 신뢰할 수 없는 소스는 `try/catch`로 감싼다.

5. **HTML 스크레이핑에는 부적합**
   HTML은 대부분 well-formed XML이 아니라 `parse`가 실패한다. HTML 파싱에는 정규식이나 별도 전략이 필요하다(권장되지 않음).

6. **큰 문서는 실행 시간·메모리 부담**
   `XmlService.parse`의 최대 입력 크기는 공식 레퍼런스에 수치가 명시돼 있지 않다(2026-07-22 확인 — 크기 제한 언급 없음). 다만 아주 큰 XML은 스크립트 6분 실행 한도와 메모리에 묶인다. 대용량은 분할·스트리밍 대안을 검토.

7. **`setNamespace`용 네임스페이스는 prefix가 필요**
   속성에 네임스페이스를 붙일 때(`Attribute.setNamespace`)는 prefix가 있는 네임스페이스여야 한다(공식: "The namespace must have a prefix").

8. **출력 포맷은 목적에 맞게**
   전송용은 `getRawFormat()`/`getCompactFormat()`(공백 최소), 사람이 볼 로그·디버깅은 `getPrettyFormat()`. `getPrettyFormat()`은 텍스트 노드에 공백을 넣으므로 공백에 민감한 XML에는 부적절할 수 있다.

## 참고

- XML Service 인덱스: https://developers.google.com/apps-script/reference/xml-service
- XmlService: https://developers.google.com/apps-script/reference/xml-service/xml-service
- Element: https://developers.google.com/apps-script/reference/xml-service/element
- 관련 문서: `02-services/url-fetch.md`(외부 XML 가져오기), `04-web-apps/content-service.md`(XML 응답 내보내기)
