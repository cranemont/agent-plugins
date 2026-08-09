# Drive Service (DriveApp)

> **출처**
> - https://developers.google.com/apps-script/reference/drive
> - https://developers.google.com/apps-script/reference/drive/drive-app
> - https://developers.google.com/apps-script/reference/drive/file
> - https://developers.google.com/apps-script/reference/drive/folder
> - https://developers.google.com/apps-script/reference/drive/file-iterator
> - https://developers.google.com/apps-script/reference/drive/folder-iterator
> - https://developers.google.com/apps-script/reference/drive/user
> - https://developers.google.com/apps-script/advanced/drive
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

Google Drive를 다루는 기본 서비스. 파일·폴더 생성/조회/이동/검색, 권한 관리, Blob 변환을 제공한다.

기본 서비스로 부족할 때(공유 드라이브 작업, 리비전 관리, 코멘트/답글 API, `appProperties` 커스텀 메타데이터, 알림 없는 권한 부여 등)는 **Drive Advanced Service** (`Drive.Files.*`, Drive API v3)를 활성화해 사용.

## 클래스 구조

```
DriveApp (정적 진입점)
 ├─ Folder           — 폴더
 │   ├─ FolderIterator (자식 폴더 순회)
 │   └─ FileIterator (자식 파일 순회)
 ├─ File             — 파일 (Blob 변환 가능)
 ├─ FileIterator     — hasNext()/next() 패턴
 ├─ FolderIterator   — hasNext()/next() 패턴
 └─ User             — 소유자/편집자/조회자 표현
```

### Enum

| Enum | 값 | 의미 |
|------|-----|------|
| `DriveApp.Access` | `ANYONE` | 공개 (검색 가능) |
|  | `ANYONE_WITH_LINK` | 링크 있는 누구나 |
|  | `DOMAIN` | 같은 Workspace 도메인 |
|  | `DOMAIN_WITH_LINK` | 도메인 + 링크 |
|  | `PRIVATE` | 명시적으로 공유된 사람만 |
| `DriveApp.Permission` | `VIEW` / `EDIT` / `COMMENT` / `OWNER` / `ORGANIZER` / `FILE_ORGANIZER` / `NONE` | 권한 수준 |

> `setSharing(accessType, permissionType)` 조합으로 공유 정책 일괄 변경.

---

## 진입점: DriveApp

### 파일/폴더 직접 조회

```javascript
// ID로 직접 조회
const file = DriveApp.getFileById('1aB...XYZ');
const folder = DriveApp.getFolderById('0B...AAA');

// 보안 업데이트가 적용된 파일은 resourceKey가 필요할 수 있음
const f = DriveApp.getFileByIdAndResourceKey('id', 'resourceKey');
const fo = DriveApp.getFolderByIdAndResourceKey('id', 'resourceKey');

// 루트 ('내 드라이브')
const root = DriveApp.getRootFolder();
```

### 전체 파일/폴더 순회 (이터레이터)

```javascript
// 모든 파일 (휴지통 제외)
const it = DriveApp.getFiles();
while (it.hasNext()) {
  const f = it.next();
  Logger.log(f.getName());
}

// 이름/타입 필터
DriveApp.getFilesByName('report.csv');
DriveApp.getFilesByType(MimeType.PDF);

// 폴더도 동일
DriveApp.getFolders();
DriveApp.getFoldersByName('Archive');

// 휴지통
DriveApp.getTrashedFiles();
DriveApp.getTrashedFolders();
```

> **주의**: `getFiles()` 등은 **드라이브 전체**를 순회한다 (`내 드라이브` + 공유받은 항목). 대용량 드라이브에서는 매우 느리고 비효율적이다. **루트 탐색이 아니라 특정 폴더 하위로 한정**하려면 `folder.getFiles()` 사용.

### 검색

```javascript
// Drive 쿼리 문법 사용 (https://developers.google.com/drive/api/guides/search-files)
const files = DriveApp.searchFiles(
  "mimeType = 'application/pdf' and modifiedDate > '2025-01-01T00:00:00'"
);

while (files.hasNext()) {
  Logger.log(files.next().getName());
}

DriveApp.searchFolders("'parentFolderId' in parents and trashed = false");
```

자주 쓰는 쿼리 절:

| 쿼리 | 의미 |
|------|------|
| `mimeType = 'application/pdf'` | MIME 타입 (단일 따옴표) |
| `name contains 'report'` | 이름 부분 일치 |
| `name = '정확한.csv'` | 완전 일치 |
| `'folder-id' in parents` | 특정 폴더의 직속 자식 |
| `modifiedDate > '2025-01-01T00:00:00'` | 수정일 필터 (ISO 8601, **createdDate/modifiedDate**는 v2 이름) |
| `trashed = false` | 휴지통 제외 |
| `starred = true` | 별표 |
| `'user@example.com' in owners` | 특정 소유자 |
| `properties has { key='k' and value='v' }` | 커스텀 속성 (Advanced에서만) |
| `fullText contains '키워드'` | 내용 검색 |

여러 조건 조합: `and`, `or`, `not`. 그룹: `(...)`.

### 파일/폴더 생성

```javascript
// 텍스트 파일
DriveApp.createFile('memo.txt', '본문 내용');
DriveApp.createFile('data.csv', csvString, MimeType.CSV);

// Blob에서 (이미지, PDF, 임의 바이너리)
const blob = UrlFetchApp.fetch('https://...').getBlob().setName('image.png');
DriveApp.createFile(blob);

// 폴더
const folder = DriveApp.createFolder('새 폴더');

// 단축키(Shortcut)
DriveApp.createShortcut('target-file-id');
DriveApp.createShortcutForTargetIdAndResourceKey('target-id', 'resource-key');
```

> **주의**: `DriveApp.createFile()`는 항상 **루트(내 드라이브)** 에 생성된다. 특정 폴더에 만들려면 `folder.createFile(...)` 사용.

### 저장소 / 이터레이터 재개

```javascript
DriveApp.getStorageUsed();   // Integer — 바이트
DriveApp.getStorageLimit();  // Integer

// 6분 실행 한계를 넘기는 대량 처리: continuation token으로 다음 실행에서 이어가기
const it = DriveApp.getFiles();
const token = it.getContinuationToken();
PropertiesService.getScriptProperties().setProperty('driveToken', token);

// 다음 실행
const resumed = DriveApp.continueFileIterator(
  PropertiesService.getScriptProperties().getProperty('driveToken')
);
```

---

## Folder

### 자식 조회

```javascript
folder.getFiles();                      // FileIterator
folder.getFilesByName('exact.csv');
folder.getFilesByType(MimeType.GOOGLE_SHEETS);
folder.getFolders();
folder.getFoldersByName('Subfolder');

folder.searchFiles("mimeType = 'image/png'");
folder.searchFolders("name contains 'archive'");

folder.getParents();    // FolderIterator — 다중 부모 가능 (deprecated UI지만 API상 가능)
```

> **다중 부모 주의**: 과거 Drive는 한 파일이 여러 폴더에 동시에 있을 수 있었다. 신규로는 생성 불가지만 기존 데이터는 여전히 다중 부모일 수 있어 `getParents()`는 이터레이터를 반환한다.

### 생성

```javascript
folder.createFile('child.txt', '내용');
folder.createFile('data.csv', csv, MimeType.CSV);
folder.createFile(blob);
folder.createFolder('Subfolder');
folder.createShortcut('target-id');
```

### 이동 / 삭제

```javascript
folder.moveTo(destinationFolder);
folder.setTrashed(true);   // 휴지통으로
folder.isTrashed();
```

**Deprecated 메서드** (`addFile`, `addFolder`, `removeFile`, `removeFolder`): 더는 사용하지 말고 `file.moveTo(folder)` 사용. 다중 부모를 만들지 않고 단일 부모로 이동시키는 동작이라 의도와 다를 수 있음에 유의.

### 속성

```javascript
folder.getId();
folder.getName();
folder.setName('새 이름');
folder.getDescription();
folder.setDescription('설명');
folder.getDateCreated();
folder.getLastUpdated();
folder.getSize();         // 폴더 내부 합산 크기 (계산이 오래 걸릴 수 있음)
folder.getUrl();
folder.getResourceKey();
folder.isStarred();
folder.setStarred(true);
```

### 공유 / 권한

```javascript
folder.addEditor('user@example.com');
folder.addEditors(['a@example.com', 'b@example.com']);
folder.addViewer(user);
folder.addCommenter('cc@example.com');   // File에만 있음. Folder는 viewer만.

folder.removeEditor('user@example.com');
folder.removeViewer('user@example.com');
folder.revokePermissions('user@example.com'); // 전부 해제

folder.getOwner();         // User
folder.getEditors();       // User[]
folder.getViewers();       // User[] (commenter 포함)

folder.setOwner('newowner@example.com');   // 소유권 이전 (도메인 정책 영향 받음)

folder.getAccess('user@example.com');      // Permission
folder.getSharingAccess();                  // Access
folder.getSharingPermission();              // Permission

folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
folder.setShareableByEditors(false);        // 편집자가 더 공유 못 하도록
```

---

## File

### 기본 속성

```javascript
file.getId();
file.getName();
file.setName('new.pdf');
file.getMimeType();        // 'application/pdf', 'application/vnd.google-apps.spreadsheet' 등
file.getSize();            // Integer — bytes (Google 네이티브 파일은 0)
file.getDescription();
file.setDescription('...');
file.getDateCreated();
file.getLastUpdated();
file.getOwner();           // User
file.getUrl();             // 웹 UI 링크 (https://drive.google.com/...)
file.getDownloadUrl();     // 직접 다운로드 URL (인증 필요)
file.getResourceKey();
file.getThumbnail();       // Blob|null
```

### Blob 변환 / 내용

```javascript
const blob = file.getBlob();              // Blob — 원본
const pdfBlob = file.getAs('application/pdf');  // Google Doc → PDF export

// 텍스트 파일 갱신 (Google 네이티브 파일은 불가)
file.setContent('새 내용');
```

> **`getAs(mimeType)` 변환 가능 매트릭스**: Google Doc/Sheet/Slide → PDF는 거의 항상 가능. Doc → HTML/MS Word, Sheet → CSV/XLSX 등도 지원. 일반 파일(PDF, PNG 등)은 자신과 동일한 MIME만 가능하며 변환 요청 시 오류.

### 권한

```javascript
file.addEditor('a@example.com');
file.addEditors(['a@example.com', 'b@example.com']);
file.addViewer('c@example.com');
file.addCommenter('d@example.com');

file.removeEditor('a@example.com');
file.removeViewer('c@example.com');
file.removeCommenter('d@example.com');
file.revokePermissions('user@example.com');

file.getAccess('user@example.com'); // Permission
file.getEditors();
file.getViewers();
file.getOwner();

file.setOwner('new@example.com');

file.getSharingAccess();    // Access
file.getSharingPermission();
file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.COMMENT);

file.isShareableByEditors();
file.setShareableByEditors(false);
```

> **`addEditor()`의 알림 메일**: 기본 서비스에서는 **항상 알림 메일이 전송된다**. 알림을 끄려면 Advanced Drive Service에서 `Drive.Permissions.create(..., { sendNotificationEmail: false })`.

### 보안 업데이트 (Resource Key)

2021년 이후 Drive 보안 업데이트로, 일부 파일은 링크 공유 시 `resourceKey` 가 필요해졌다.

```javascript
file.getSecurityUpdateEligible();   // 보안 업데이트 적용 대상인가
file.getSecurityUpdateEnabled();    // 현재 적용돼 있는가
file.setSecurityUpdateEnabled(true);
```

스크립트가 외부 시스템에 링크를 전달한다면 `getResourceKey()`를 함께 넘겨주거나 `getFileByIdAndResourceKey`로 읽어야 한다.

### 복사 / 이동 / 휴지통

```javascript
file.makeCopy();                         // 같은 폴더에 복사
file.makeCopy('복사본 이름');
file.makeCopy(destinationFolder);
file.makeCopy('복사본', destinationFolder);

file.moveTo(folder);   // 단일 부모로 이동

file.setTrashed(true);  // 휴지통
file.isTrashed();
file.setStarred(true);
file.isStarred();

file.getParents();     // FolderIterator
```

### 단축키 (Shortcut)

파일 자체가 단축키일 때:

```javascript
file.getTargetId();          // String|null — 대상 파일 ID
file.getTargetMimeType();    // String|null
file.getTargetResourceKey(); // String|null
```

---

## FileIterator / FolderIterator

```javascript
const it = folder.getFiles();
while (it.hasNext()) {
  const f = it.next();
  // ...
}

// 6분 실행 한계 우회: 토큰 저장 후 다음 실행에서 재개
const token = it.getContinuationToken();
PropertiesService.getScriptProperties().setProperty('token', token);

// 다음 실행
const it2 = DriveApp.continueFileIterator(token);
// (또는 폴더 이터레이터면 continueFolderIterator)
```

| 메서드 | 반환 |
|--------|------|
| `hasNext()` | Boolean |
| `next()` | `File` 또는 `Folder` |
| `getContinuationToken()` | String |

> **토큰 만료**: 약 **1주일** (대략적, 공식 명시는 없으나 경험상). 만료 시 `continue~Iterator`는 빈 결과를 반환하거나 오류. 장기 작업이면 주기적으로 재발급.

---

## User

```javascript
const owner = file.getOwner();
owner.getEmail();         // String
owner.getName();          // String — 표시 이름 (도메인/공개 설정에 따라 빈 문자열 가능)
owner.getPhotoUrl();      // String — 프로필 사진 URL
owner.getDomain();        // 사용자 Workspace 도메인 (deprecated 경고가 있을 수 있음)
```

---

## 일반적인 패턴

### 1. 폴더 트리 순회 (재귀)

```javascript
function walk(folder, depth) {
  const indent = '  '.repeat(depth);
  Logger.log(indent + '[' + folder.getName() + ']');

  const files = folder.getFiles();
  while (files.hasNext()) {
    Logger.log(indent + ' - ' + files.next().getName());
  }

  const subs = folder.getFolders();
  while (subs.hasNext()) {
    walk(subs.next(), depth + 1);
  }
}

walk(DriveApp.getRootFolder(), 0);
```

> **깊이 한계**: 깊고 큰 트리에서는 6분 제한에 걸리기 쉽다. 큐 기반 BFS + Continuation Token 패턴이 안전.

### 2. 폴더가 없으면 만들고 반환

```javascript
function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

const archive = getOrCreateFolder(DriveApp.getRootFolder(), 'Archive');
```

### 3. 첨부파일을 날짜별 폴더에 정리

```javascript
function saveAttachmentsToDated() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  const folder = getOrCreateFolder(root, today);

  GmailApp.search('has:attachment newer_than:1d', 0, 50)
    .flatMap(t => t.getMessages())
    .flatMap(m => m.getAttachments({ includeInlineImages: false }))
    .forEach(att => folder.createFile(att.copyBlob()));
}
```

### 4. 30일 넘은 파일 휴지통으로

```javascript
function trashOld() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const it = DriveApp.searchFiles(
    `'${ARCHIVE_FOLDER_ID}' in parents and modifiedDate < '${cutoff}' and trashed = false`
  );
  while (it.hasNext()) {
    it.next().setTrashed(true);
  }
}
```

### 5. 권한 일괄 적용

```javascript
function grantTeamAccess(folderId, emails) {
  const folder = DriveApp.getFolderById(folderId);
  folder.addEditors(emails);
  // 자식 파일/폴더에도 재귀 적용 (Drive 상속이지만 명시적 권한 부여가 필요한 경우)
  applyToChildren(folder, emails);
}

function applyToChildren(folder, emails) {
  const files = folder.getFiles();
  while (files.hasNext()) files.next().addEditors(emails);
  const subs = folder.getFolders();
  while (subs.hasNext()) applyToChildren(subs.next(), emails);
}
```

### 6. CSV → Google Sheets 변환

```javascript
function csvToSheet(csvFileId) {
  const csvBlob = DriveApp.getFileById(csvFileId).getBlob();
  const resource = {
    title: '변환됨',
    mimeType: MimeType.GOOGLE_SHEETS
  };
  // 기본 서비스로는 변환 생성이 안 됨. Advanced Drive Service 필요.
  const created = Drive.Files.create(resource, csvBlob);
  return created.id;
}
```

### 7. Blob 변환 (Doc → PDF)

```javascript
function docToPdf(docId, destFolderId) {
  const doc = DriveApp.getFileById(docId);
  const pdf = doc.getAs('application/pdf').setName(doc.getName() + '.pdf');
  return DriveApp.getFolderById(destFolderId).createFile(pdf);
}
```

### 8. 대용량 처리 + Continuation Token + 시간 분할 트리거

```javascript
function processInBatches() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('iterToken');
  const it = token
    ? DriveApp.continueFileIterator(token)
    : DriveApp.getFolderById(FOLDER_ID).getFiles();

  const deadline = Date.now() + 5 * 60 * 1000;  // 5분 안전 마진
  while (it.hasNext()) {
    if (Date.now() > deadline) {
      props.setProperty('iterToken', it.getContinuationToken());
      return; // 다음 트리거 실행 때 이어서
    }
    processFile(it.next());
  }
  props.deleteProperty('iterToken');
}
```

---

## Drive Advanced Service

기본 서비스로 안 되는 것:

- **공유 드라이브(Shared Drive)** — `Drive.Drives.*`
- **파일 리비전** — `Drive.Revisions.*`
- **코멘트/답글** — `Drive.Comments.*`, `Drive.Replies.*`
- **알림 없는 권한 부여** — `sendNotificationEmail: false`
- **커스텀 속성** — `appProperties` (앱 전용 메타데이터, 최대 124자 키)
- **변경 알림 (Push)** — `Drive.Changes.watch`
- **`copy`로 형식 변환** — CSV→Sheets, Sheets→XLSX 등
- 정밀한 쿼리: `appProperties has`, `parents`, `sharedWithMe` 등

### 활성화

1. Apps Script 편집기 → "서비스" + → "Drive API" 선택 (현재 기본 식별자는 v3)
2. identifier는 `Drive`
3. GCP 프로젝트에서도 Drive API 활성화

### 사용 예

```javascript
// 1) 공유 드라이브의 파일 나열
const res = Drive.Files.list({
  corpora: 'drive',
  driveId: 'SHARED_DRIVE_ID',
  includeItemsFromAllDrives: true,
  supportsAllDrives: true,
  q: "mimeType = 'application/pdf'",
  fields: 'files(id, name, modifiedTime)'
});

// 2) 알림 없이 권한 부여
Drive.Permissions.create(
  { role: 'reader', type: 'user', emailAddress: 'a@example.com' },
  fileId,
  { sendNotificationEmail: false, supportsAllDrives: true }
);

// 3) 커스텀 속성 + 파일 생성
const blob = HtmlService.createHtmlOutput('<h1>Hi</h1>').getBlob().setName('out.html');
Drive.Files.create({
  name: 'report.html',
  parents: [FOLDER_ID],
  appProperties: { source: 'crm', ticketId: 'T-123' }
}, blob, { supportsAllDrives: true, fields: 'id,name' });

// 4) 리비전 목록
const revs = Drive.Revisions.list(fileId);
revs.revisions.forEach(r => Logger.log('%s %s', r.modifiedTime, r.id));

// 5) CSV → Google Sheets 변환
Drive.Files.create(
  { name: 'data', mimeType: MimeType.GOOGLE_SHEETS },
  DriveApp.getFileById(csvId).getBlob()
);
```

> **공유 드라이브 호출에는 항상 `supportsAllDrives: true`** 를 옵션에 넣어야 한다. 빠뜨리면 404 또는 권한 오류.

---

## 주의사항 / 함정 / Quota

### 일일 quota

> 출처: [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas) (2026-05-11 확인)

| 항목 | Consumer | Workspace |
|------|----------|-----------|
| 문서(Docs) 생성/일 | **250** | **1,500** |
| 스프레드시트 생성/일 | **250** | **3,200** |

Drive 파일 생성 자체에 명시적 일일 한도는 공식 quotas 페이지에 별도 표기되지 않는다. 대신 다음 한도들이 실질적인 제약:

- **저장소 한도**: 계정의 Drive 저장 용량 (`DriveApp.getStorageLimit()`).
- **Drive API rate limit**: 사용자당 초당 1,000 쿼리 (Drive API v3 기준, Google Cloud Console에서 조정 가능).
- **Apps Script 6분/30분 실행 시간 한계**.

> 정확한 수치는 사전 고지 없이 변경 가능. 자동화 설계 시 retry/backoff와 continuation 토큰을 항상 고려.

### 일반 함정

1. **`DriveApp.createFile(...)`는 항상 루트에 생성**: 특정 폴더에 만들려면 `folder.createFile(...)` 사용. 헷갈리는 가장 흔한 실수.

2. **`getFiles()` 전체 순회는 비추**: 드라이브에 수만 파일이 있을 수 있다. 항상 폴더 한정 또는 쿼리 조건 사용.

3. **`addEditor()` 알림 메일**: 기본 서비스는 알림을 보낸다. 시스템 권한 부여(예: 자동화)로 메일이 가는 게 부담스러우면 Advanced Service의 `sendNotificationEmail: false`.

4. **`setOwner()`의 정책 의존**: Workspace 도메인 외부로 소유권 이전은 막혀 있을 수 있다. 또한 같은 도메인이어도 관리자 정책이 차단 가능. 실패 시 권한 예외.

5. **`makeCopy()`는 권한 상속 X**: 복사본은 호출자가 소유자가 되며, 원본의 공유 설정은 따라가지 않는다.

6. **`getSize()` for 폴더는 무거움**: 폴더 크기는 자식들을 합산해야 해서 큰 폴더에선 매우 느리거나 실패한다. 가능한 사용 회피.

7. **다중 부모(legacy)**: API상 한 파일이 여러 폴더에 속할 수 있다. `moveTo()`는 단일 부모로 만들어 다른 폴더에서 제거한다 — 의도와 다를 수 있으니 주의.

8. **`addFile/removeFile` deprecated**: 동작은 하지만 정의된 시점에서 다중 부모 만들기/끊기 의미라 새 코드에선 쓰지 말 것.

9. **`getDownloadUrl()`**: 단순 HTTPS GET이 아니라 OAuth 인증이 필요한 URL. 다른 사용자에게 그대로 줘도 다운받을 수 없다. 외부 공유는 `getUrl()` + 적절한 공유 설정으로.

10. **`setContent()`는 텍스트 파일만**: Google Doc/Sheet/Slide의 내용을 바꾸려면 각 서비스(DocumentApp, SpreadsheetApp, SlidesApp) 사용. PDF/이미지 등도 불가.

11. **공유 드라이브는 기본 서비스 지원 부분적**: `DriveApp.getFileById()`로 공유 드라이브의 파일을 가져올 수는 있지만 일부 메서드(권한, 소유자)는 의도대로 동작하지 않거나 제한됨. 공유 드라이브 워크플로는 Advanced Service 권장.

12. **이터레이터 중간 수정**: 순회 중에 `setTrashed(true)`나 `moveTo()`를 하면 이터레이터 순서가 흐트러질 수 있다. 안전하게는 먼저 ID 배열을 모은 뒤 두 번째 패스에서 처리.

13. **resourceKey 누락 오류**: 2021년 이후 보안 업데이트가 적용된 파일에 외부 ID만으로 접근하면 404. `getFileByIdAndResourceKey` 사용 또는 파일을 호출자에게 공유.

### 권한 스코프

- `https://www.googleapis.com/auth/drive` — 전체 (DriveApp 기본)
- `https://www.googleapis.com/auth/drive.file` — 스크립트가 만든/연 파일만 (제한 스코프)
- `https://www.googleapis.com/auth/drive.readonly` — 읽기 전용

`appsscript.json`의 `oauthScopes`로 명시적으로 좁힐 수 있다. 보안 리뷰가 까다로운 환경에서는 `drive.file`로 좁히는 게 베스트.

---

## 참고

- Drive Service 클래스 목록: https://developers.google.com/apps-script/reference/drive
- DriveApp: https://developers.google.com/apps-script/reference/drive/drive-app
- File: https://developers.google.com/apps-script/reference/drive/file
- Folder: https://developers.google.com/apps-script/reference/drive/folder
- FileIterator / FolderIterator / User 페이지 (위 클래스 구조 링크)
- Drive Advanced Service: https://developers.google.com/apps-script/advanced/drive
- Drive API v3 reference: https://developers.google.com/drive/api/v3/reference
- Drive 검색 쿼리 문법: https://developers.google.com/drive/api/guides/search-files
- Apps Script Quotas: https://developers.google.com/apps-script/guides/services/quotas
- Drive 보안 업데이트(resourceKey): https://support.google.com/drive/answer/10729743
