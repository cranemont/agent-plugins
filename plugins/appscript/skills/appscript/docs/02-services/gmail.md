# Gmail Service (GmailApp / MailApp)

> **출처**
> - https://developers.google.com/apps-script/reference/gmail
> - https://developers.google.com/apps-script/reference/gmail/gmail-app
> - https://developers.google.com/apps-script/reference/gmail/gmail-thread
> - https://developers.google.com/apps-script/reference/gmail/gmail-message
> - https://developers.google.com/apps-script/reference/gmail/gmail-draft
> - https://developers.google.com/apps-script/reference/gmail/gmail-label
> - https://developers.google.com/apps-script/reference/gmail/gmail-attachment
> - https://developers.google.com/apps-script/reference/mail/mail-app
> - https://developers.google.com/apps-script/advanced/gmail
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

Apps Script에서 Gmail에 접근하는 방법은 **두 가지**다.

| 항목 | `GmailApp` | `MailApp` |
|------|-----------|-----------|
| 메일 발송 | O | O |
| 받은 편지함/스레드/라벨 읽기·쓰기 | O | X (발송 전용) |
| 드래프트 생성 | O | X |
| 첨부파일 다운로드 | O | X |
| 필요한 OAuth 스코프 | `https://mail.google.com/` (전체 권한) | `https://www.googleapis.com/auth/script.send_mail` (발송만) |
| 재인증 요청 발생 가능성 | 높음 | 낮음 |

> **선택 기준**: 그냥 메일만 보내는 스크립트라면 `MailApp` 권장. 인박스를 읽거나 라벨을 만지거나 첨부파일을 처리해야 하면 `GmailApp`.

추가로, Apps Script 기본 서비스로 부족한 경우(필터 관리, 메시지 raw MIME 조작, 히스토리 ID 기반 증분 동기화 등)에는 **Gmail Advanced Service** (`Gmail.Users.Messages.*`)를 활성화해 Gmail API v1을 직접 호출한다.

## 클래스 구조

```
GmailApp (정적 진입점)
 ├─ GmailThread        — 대화(thread) = 같은 제목으로 묶인 메시지 묶음
 │   └─ GmailMessage   — 개별 메시지
 │       └─ GmailAttachment — 첨부파일 (Blob 인터페이스)
 ├─ GmailDraft         — 임시보관함
 └─ GmailLabel         — 사용자 라벨

MailApp (별도 진입점, 발송 전용)
```

Gmail은 모든 작업의 단위가 **메시지(message)** 가 아니라 **스레드(thread)** 라는 점을 기억해야 한다. `search()`, `getInboxThreads()`는 `GmailThread[]`를 반환하고, 메시지 배열을 얻으려면 `thread.getMessages()`를 추가 호출한다.

---

## 진입점: GmailApp

### 메일 발송

```javascript
// 가장 단순한 형태
GmailApp.sendEmail('user@example.com', '제목', '본문');

// 옵션 포함 (실무에서 거의 항상 이 형태)
GmailApp.sendEmail('user@example.com', '월간 리포트', '', {
  htmlBody: '<h1>4월 리포트</h1><p>본문 HTML</p>',
  cc: 'manager@example.com',
  bcc: 'archive@example.com',
  name: '리포트 자동발송',         // 발신자 이름
  replyTo: 'no-reply@example.com',
  attachments: [pdfBlob, csvBlob],
  inlineImages: { logo: imageBlob } // htmlBody에서 <img src="cid:logo">
});
```

**주요 옵션 필드** (`sendEmail`, `createDraft` 공통)

| 옵션 | 타입 | 설명 |
|------|------|------|
| `htmlBody` | String | HTML 본문. 지정 시 body 인자는 텍스트 버전으로 폴백 |
| `cc` | String | 콤마 구분 |
| `bcc` | String | 콤마 구분 |
| `attachments` | `BlobSource[]` | 첨부파일 |
| `inlineImages` | Object | `{ cid키: Blob }`. HTML에서 `cid:키`로 참조 |
| `name` | String | 발신자 표시 이름 |
| `from` | String | 별칭(alias) 발신. `getAliases()`로 확인한 주소만 사용 가능 |
| `replyTo` | String | 회신 받을 주소 |
| `noReply` | Boolean | Workspace 전용. `noreply@도메인` 사용 |

### 드래프트 / 스레드 조회

| 메서드 | 반환 | 설명 |
|--------|------|------|
| `createDraft(to, subject, body[, options])` | `GmailDraft` | 드래프트 생성 |
| `getDrafts()` | `GmailDraft[]` | 모든 드래프트 |
| `getDraft(draftId)` | `GmailDraft` | ID로 드래프트 조회 |
| `getInboxThreads([start, max])` | `GmailThread[]` | 받은편지함 스레드 |
| `getStarredThreads([start, max])` | `GmailThread[]` | 별표 스레드 |
| `getSpamThreads([start, max])` | `GmailThread[]` | 스팸 |
| `getTrashThreads([start, max])` | `GmailThread[]` | 휴지통 |
| `getPriorityInboxThreads([start, max])` | `GmailThread[]` | 중요 받은편지함 |
| `getThreadById(id)` | `GmailThread \| null` | ID로 스레드 조회 |
| `getMessageById(id)` | `GmailMessage` | ID로 메시지 조회 |

### 검색

```javascript
// search(query, start, max)
const threads = GmailApp.search('from:billing@example.com newer_than:7d', 0, 50);
```

Gmail 검색 쿼리 문법(연산자)을 그대로 쓸 수 있다. 자주 쓰는 연산자:

| 쿼리 | 의미 |
|------|------|
| `from:foo@bar.com` | 발신자 |
| `to:me` | 수신자 |
| `subject:"월간 리포트"` | 제목 (구문 검색은 따옴표) |
| `has:attachment` | 첨부 있음 |
| `filename:pdf` | 첨부 확장자 |
| `label:invoice` | 특정 라벨 |
| `newer_than:7d`, `older_than:1y` | 상대 시간 (`d`, `m`, `y`) |
| `after:2025/01/01`, `before:2025/02/01` | 절대 날짜 |
| `is:unread`, `is:starred`, `is:important` | 상태 |
| `in:inbox`, `in:spam`, `in:anywhere` | 위치 |

> **주의**: `search()`의 두 번째/세 번째 인자(`start`, `max`)는 페이지네이션 용도다. `max`는 한 번에 최대 **500**까지 가능하지만, 안정성을 위해 100 이하 권장.

### 라벨

```javascript
const label = GmailApp.getUserLabelByName('Invoice')
            ?? GmailApp.createLabel('Invoice');
label.addToThreads(threads);
```

| 메서드 | 반환 |
|--------|------|
| `getUserLabels()` | `GmailLabel[]` |
| `getUserLabelByName(name)` | `GmailLabel` |
| `createLabel(name)` | `GmailLabel` |
| `deleteLabel(label)` | `GmailApp` |

### 별칭 / 카운터

```javascript
GmailApp.getAliases();              // String[] — from 옵션에 쓸 수 있는 주소
GmailApp.getInboxUnreadCount();     // Integer
GmailApp.getStarredUnreadCount();
GmailApp.getSpamUnreadCount();
GmailApp.getPriorityInboxUnreadCount();
```

---

## GmailThread (스레드)

스레드 단위의 동작은 **첫 메시지 또는 마지막 메시지를 기준**으로 동작하는 경우가 많다. `reply()`는 스레드의 **마지막 메시지의 발신자**에게 회신한다.

### 정보 조회

```javascript
thread.getId();                  // String
thread.getFirstMessageSubject(); // String — 첫 메시지 제목
thread.getLastMessageDate();     // Date
thread.getMessageCount();        // Integer
thread.getMessages();            // GmailMessage[]
thread.getLabels();              // GmailLabel[]
thread.getPermalink();           // 웹 링크
```

### 상태 확인

```javascript
thread.isUnread();              // 안 읽은 메시지가 하나라도 있으면 true
thread.isImportant();
thread.isInInbox();
thread.isInSpam();
thread.isInTrash();
thread.isInChats();
thread.isInPriorityInbox();
thread.hasStarredMessages();
```

### 회신 / 포워딩

```javascript
// 즉시 발송
thread.reply('알겠습니다.');
thread.reply('알겠습니다.', { htmlBody: '<p>알겠습니다.</p>' });
thread.replyAll('전체 회신', { cc: 'team@example.com' });

// 드래프트로 저장만
const draft = thread.createDraftReply('초안입니다.');
draft.send();
```

`reply(body, options)` 옵션은 `GmailApp.sendEmail` 옵션과 동일하다. 단, **`to`/`subject`는 자동 결정**되므로 옵션에 넣지 말 것.

### 라벨 / 상태 변경

```javascript
thread.addLabel(label);
thread.removeLabel(label);
thread.markRead();        // → GmailThread (체이닝)
thread.markUnread();
thread.markImportant();
thread.markUnimportant();
thread.moveToInbox();
thread.moveToArchive();
thread.moveToSpam();
thread.moveToTrash();
thread.refresh();         // Gmail에서 최신 상태 재로드
```

> **주의**: 스레드 객체는 **fetch 시점의 스냅샷**이다. `addLabel()` 후 `getLabels()`를 호출해도 변경이 보이지 않을 수 있어, 이럴 때 `refresh()`를 호출하거나 `GmailApp.getThreadById(thread.getId())`로 재조회한다.

---

## GmailMessage (개별 메시지)

### 본문 / 메타데이터

```javascript
msg.getBody();         // String — HTML 본문
msg.getPlainBody();    // String — 텍스트 본문 (HTML 태그 제거)
msg.getRawContent();   // String — RFC 2822 raw MIME 전체
msg.getFrom();         // String — "이름 <addr@..>" 또는 "addr@.."
msg.getTo();           // String — 콤마 구분
msg.getCc();
msg.getBcc();
msg.getReplyTo();
msg.getSubject();
msg.getDate();         // Date
msg.getId();           // String
msg.getHeader(name);   // RFC 2822 헤더 값 (예: 'Message-ID', 'List-Unsubscribe')
msg.getThread();       // 소속 스레드
```

> **From 파싱 팁**: `getFrom()`은 `"홍길동 <hong@example.com>"` 형태일 수도, 단순 주소일 수도 있다. 주소만 추출하려면 정규식 `/<(.+?)>/`을 적용하거나 매칭 실패 시 원본을 그대로 쓴다.

### 첨부파일

```javascript
const attachments = msg.getAttachments();
// 옵션으로 inline 이미지 포함 제어
const noInline = msg.getAttachments({ includeInlineImages: false, includeAttachments: true });

attachments.forEach(att => {
  const name = att.getName();          // String|null
  const mime = att.getContentType();   // String|null
  const size = att.getSize();          // Integer (bytes)
  const blob = att.copyBlob();         // Blob — DriveApp.createFile 등에 전달 가능
});
```

`GmailAttachment`는 `BlobSource` 인터페이스를 구현하므로 `DriveApp.createFile(att)`로 바로 저장 가능.

### 회신 / 포워딩

```javascript
msg.reply('확인했습니다');
msg.replyAll('전체 회신', { htmlBody: '<p>…</p>' });
msg.forward('newrecipient@example.com', {
  cc: 'cc@example.com',
  htmlBody: msg.getBody() + '<hr><p>전달합니다.</p>'
});

msg.createDraftReply('초안');
msg.createDraftReplyAll('전체 회신 초안');
```

### 상태 / 액션

```javascript
msg.isDraft();
msg.isUnread();
msg.isStarred();
msg.isInInbox();
msg.isInTrash();
msg.isInChats();
msg.isInPriorityInbox();

msg.markRead();
msg.markUnread();
msg.star();
msg.unstar();
msg.moveToTrash();
msg.refresh();
```

---

## GmailDraft

```javascript
const draft = GmailApp.createDraft('to@example.com', '제목', '본문');

draft.getId();              // String
draft.getMessageId();       // 발송 후 메시지 ID
draft.getMessage();         // GmailMessage 형태로 내용 조회

draft.update('to@example.com', '수정된 제목', '수정된 본문', { htmlBody: '...' });
const sent = draft.send(); // → GmailMessage
draft.deleteDraft();
```

---

## GmailLabel

```javascript
const label = GmailApp.createLabel('Project/Alpha'); // '/'로 중첩 라벨

label.getId();             // String
label.getName();           // String
label.getUnreadCount();    // 라벨이 붙은 안 읽은 스레드 수
label.getThreads();        // 라벨이 붙은 모든 스레드
label.getThreads(0, 100);

label.addToThread(thread);
label.addToThreads(threads);    // 배치 처리 (개별 호출보다 빠름)
label.removeFromThread(thread);
label.removeFromThreads(threads);
label.deleteLabel();
```

> **중첩 라벨**: 이름에 `/`를 넣으면 자동으로 계층화된다. `'A/B'`를 만들면 `A`와 `A/B`가 둘 다 생성된다.

---

## GmailAttachment

`Blob`을 확장한 인터페이스. 위 첨부파일 섹션 참고. 추가로:

```javascript
att.getAs('application/pdf');   // 변환 가능한 MIME만 (예: Google Docs → PDF)
att.getBytes();                  // Byte[]
att.getDataAsString();           // 텍스트 첨부 디코딩 (UTF-8 기본)
att.getDataAsString('euc-kr');
att.isGoogleType();              // Docs/Sheets/Slides 등 Google 파일이면 true
```

> **주의**: `isGoogleType()`이 true인 첨부는 실제 바이너리가 아니라 Drive의 링크다. 첨부 파일이 Google Docs 등이면 `getBytes()` 대신 `getAs('application/pdf')`로 export.

---

## MailApp (발송 전용)

```javascript
MailApp.sendEmail('to@example.com', '제목', '본문');

MailApp.sendEmail({
  to: 'to@example.com',
  subject: '제목',
  htmlBody: '<p>HTML</p>',
  attachments: [blob],
  name: '시스템 알림',
  noReply: true   // Workspace 전용
});

const remaining = MailApp.getRemainingDailyQuota();
Logger.log('오늘 남은 수신자: %s', remaining);
```

> `getRemainingDailyQuota()`는 GmailApp에는 없는 메서드. 발송 직전 quota를 체크할 때 유용하다. 이 값은 **수신자 수 기준**이며 (cc, bcc 포함), 실행 중간에도 변동될 수 있다.

---

## 일반적인 패턴

### 1. 특정 라벨 붙은 스레드 일괄 처리

```javascript
function processInvoices() {
  const label = GmailApp.getUserLabelByName('Invoice');
  const threads = label.getThreads(0, 50);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      msg.getAttachments({ includeInlineImages: false })
         .filter(att => att.getContentType() === 'application/pdf')
         .forEach(att => {
           DriveApp.getFolderById(INVOICES_FOLDER_ID).createFile(att.copyBlob());
         });
    });
    thread.markRead();
    label.removeFromThread(thread);
  });
}
```

### 2. 페이지네이션으로 대용량 검색 처리

```javascript
function archiveOldNewsletters() {
  const PAGE = 100;
  let start = 0;
  while (true) {
    const threads = GmailApp.search('label:newsletter older_than:90d', start, PAGE);
    if (threads.length === 0) break;
    GmailApp.moveThreadsToTrash(threads);
    if (threads.length < PAGE) break;
    // moveToTrash로 인박스에서 빠지면 start 증가 불필요. 다른 검색일 땐 start += PAGE.
  }
}
```

### 3. 받은 메일에 자동 회신 (트리거)

```javascript
function autoReply() {
  const threads = GmailApp.search('label:inbox is:unread newer_than:1d -from:me', 0, 20);
  threads.forEach(thread => {
    if (thread.getLabels().some(l => l.getName() === 'auto-replied')) return;
    thread.reply('', {
      htmlBody: '<p>안녕하세요, 메일 받았습니다. 영업일 내 회신드리겠습니다.</p>',
      name: '자동 응답'
    });
    const label = GmailApp.getUserLabelByName('auto-replied')
                ?? GmailApp.createLabel('auto-replied');
    label.addToThread(thread);
  });
}
```

### 4. CSV 데이터로 대량 발송 (quota 고려)

```javascript
function bulkSend() {
  const rows = SpreadsheetApp.getActive().getActiveSheet().getDataRange().getValues();
  rows.shift(); // 헤더 제거

  const remaining = MailApp.getRemainingDailyQuota();
  if (rows.length > remaining) {
    throw new Error(`수신자 ${rows.length}명 > 잔여 quota ${remaining}`);
  }

  rows.forEach(([email, name]) => {
    MailApp.sendEmail({
      to: email,
      subject: `${name}님께`,
      htmlBody: `<p>안녕하세요 ${name}님,</p>`
    });
  });
}
```

### 5. 인라인 이미지 + 첨부

```javascript
const logo = DriveApp.getFileById(LOGO_ID).getBlob().setName('logo.png');
const pdf  = DriveApp.getFileById(PDF_ID).getBlob();

GmailApp.sendEmail('to@example.com', '주간 리포트', '본문 텍스트', {
  htmlBody: '<img src="cid:logo"><h1>주간 리포트</h1>',
  inlineImages: { logo: logo },
  attachments: [pdf]
});
```

### 6. 별칭(alias)으로 발송

```javascript
const aliases = GmailApp.getAliases();
const support = aliases.find(a => a.startsWith('support@'));
if (support) {
  GmailApp.sendEmail('to@example.com', '문의 답변', '...', { from: support });
}
```

---

## Gmail Advanced Service

기본 서비스로 불가능한 작업:

- 메시지 raw MIME 직접 생성·전송
- 필터(Filter) 생성·조회·삭제
- 위임(Delegate) 관리
- 푸시 알림용 history ID 기반 증분 동기화
- 라벨의 시스템 속성 (`labelListVisibility`, `messageListVisibility`)
- 보조 라벨 색상

### 활성화

1. Apps Script 편집기 → 좌측 "서비스" + 버튼
2. "Gmail API" 선택, identifier는 `Gmail`
3. GCP 프로젝트에서도 Gmail API 활성화 필요

### 사용 예

```javascript
// 1) 메시지 목록
const res = Gmail.Users.Messages.list('me', {
  q: 'is:unread',
  maxResults: 20
});
res.messages?.forEach(m => {
  const full = Gmail.Users.Messages.get('me', m.id, { format: 'full' });
  Logger.log(full.snippet);
});

// 2) raw MIME으로 발송 (헤더 직접 제어 필요할 때)
const raw = [
  'From: me@example.com',
  'To: to@example.com',
  'Subject: =?UTF-8?B?' + Utilities.base64Encode('한글 제목', Utilities.Charset.UTF_8) + '?=',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  '',
  '본문'
].join('\r\n');
const encoded = Utilities.base64EncodeWebSafe(raw);
Gmail.Users.Messages.send({ raw: encoded }, 'me');

// 3) 필터 추가
Gmail.Users.Settings.Filters.create({
  criteria: { from: 'notify@example.com' },
  action: { addLabelIds: ['Label_123'], removeLabelIds: ['INBOX'] }
}, 'me');
```

---

## 주의사항 / 함정 / Quota

### 일일 quota (수신자 수 기준)

> 출처: [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas) (2026-05-11 확인)

| 항목 | 일반(Consumer) 계정 | Workspace 계정 |
|------|--------------------|-----------------|
| 이메일 수신자/일 | **100** | **1,500** |
| 같은 도메인 내 수신자/일 | 100 | 2,000 |

- "수신자"는 `to + cc + bcc` 의 합. 한 메일에 5명에게 보내면 quota 5 차감.
- 24시간 롤링 (첫 호출 후 24시간).
- **`MailApp.getRemainingDailyQuota()`** 로 현재 남은 양 조회.
- quota는 사전 고지 없이 변경될 수 있으니 위 수치는 참고용. 정확한 값은 공식 문서 재확인.

### 일반 함정

1. **`reply()` 후 `getMessages()` 차이**: 회신 직후 같은 스레드 객체에서 `getMessages()`를 호출해도 새 메시지가 보이지 않는다. `thread.refresh()` 호출.
2. **검색 결과의 신선도**: `GmailApp.search()`는 Gmail 검색 인덱스를 사용하므로 방금 도착한 메일이 즉시 잡히지 않을 수 있음 (수초 지연).
3. **HTML/텍스트 자동 변환**: `htmlBody`만 지정하면 일부 클라이언트(아주 오래된 메일러)에서 빈 본문으로 보일 수 있다. `body` 인자에 텍스트 폴백을 함께 넣는 게 안전.
4. **`from` 옵션의 alias 제약**: `getAliases()`에 없는 주소를 지정하면 발송 실패. Send Mail As 설정이 Gmail에서 먼저 되어 있어야 한다.
5. **첨부파일 크기**: 한 메일 총 25MB 이내 (Gmail 자체 제한). 초과 시 Drive 링크로 대체해야 함.
6. **인라인 이미지 cid 충돌**: 키 이름은 영숫자만 사용. 한글/특수문자 cid는 일부 클라이언트에서 깨진다.
7. **스크립트 실행 시간 6분 제한**: 검색 결과가 큰 경우 `start`/`max`로 잘라서 처리하고, 시간 체크 후 다음 실행에 이어가도록 설계.
8. **트리거 발송 시 인증 컨텍스트**: 시간 기반 트리거에서 GmailApp을 호출하면 트리거 소유자 권한으로 동작. 다른 사용자의 메일은 절대 못 본다.
9. **`forward()`의 본문**: 옵션 없이 `forward(to)`만 호출하면 원본 메일이 그대로 첨부되어 전달된다. 별도 메시지를 추가하려면 `htmlBody` 또는 `body` 옵션을 명시.

### 권한

GmailApp 사용 시 OAuth 스코프 `https://mail.google.com/` (전체 Gmail 접근) 이 요구된다. **읽기 전용이라도 같은 스코프**. 권한이 부담된다면 발송만 필요할 때 MailApp으로 분리.

---

## 참고

- Gmail Service 클래스 목록: https://developers.google.com/apps-script/reference/gmail
- GmailApp: https://developers.google.com/apps-script/reference/gmail/gmail-app
- MailApp: https://developers.google.com/apps-script/reference/mail/mail-app
- GmailThread / GmailMessage / GmailDraft / GmailLabel / GmailAttachment 페이지 (위 클래스 구조 링크)
- Gmail Advanced Service: https://developers.google.com/apps-script/advanced/gmail
- Gmail 검색 연산자: https://support.google.com/mail/answer/7190
- Apps Script Quotas: https://developers.google.com/apps-script/guides/services/quotas
