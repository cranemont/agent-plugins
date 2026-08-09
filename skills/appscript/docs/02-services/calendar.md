# Calendar Service (CalendarApp)

> **출처**
> - https://developers.google.com/apps-script/reference/calendar
> - https://developers.google.com/apps-script/reference/calendar/calendar-app
> - https://developers.google.com/apps-script/reference/calendar/calendar
> - https://developers.google.com/apps-script/reference/calendar/calendar-event
> - https://developers.google.com/apps-script/reference/calendar/calendar-event-series
> - https://developers.google.com/apps-script/reference/calendar/event-guest
> - https://developers.google.com/apps-script/reference/calendar/event-recurrence
> - https://developers.google.com/apps-script/advanced/calendar
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

Google 캘린더를 읽고 쓰는 기본 서비스. 일정(`CalendarEvent`) 단발 일정 / 반복 일정(`CalendarEventSeries`) 모두 다룬다.

기본 서비스로 부족할 때(예: Google Meet 화상회의 자동 첨부, ACL 세밀 제어, sync token 기반 증분 동기화, conferencing solution 지정)는 **Calendar Advanced Service** (`Calendar.Events.*`)를 활성화해 Calendar API v3을 직접 호출한다.

> **TimeZone 주의**: Apps Script 스크립트, 캘린더, 사용자 브라우저의 타임존이 각자 다를 수 있다. `Calendar.getTimeZone()`, `Session.getScriptTimeZone()`을 확실히 확인할 것.

## 클래스 구조

```
CalendarApp (정적 진입점)
 ├─ Calendar               — 사용자가 보거나 구독한 단일 캘린더
 │   └─ CalendarEvent      — 단일 일정
 │       ├─ EventGuest     — 게스트
 │       └─ (옵션) reminder, attachment
 │   └─ CalendarEventSeries — 반복 일정 시리즈
 └─ EventRecurrence        — RRULE 빌더
```

### 주요 Enum

| Enum | 값 |
|------|-----|
| `CalendarApp.Color` | (캘린더 자체 색) `BLUE`, `BROWN`, `CHARCOAL`, `CHESTNUT`, `GRAY`, `GREEN`, `INDIGO`, `LIME`, `MUSTARD`, `OLIVE`, `ORANGE`, `PINK`, `PLUM`, `PURPLE`, `RED`, `RED_ORANGE`, `SEA_BLUE`, `SLATE`, `TEAL`, `TURQOISE`, `YELLOW` |
| `CalendarApp.EventColor` | (이벤트 색, 11종) `PALE_BLUE`, `PALE_GREEN`, `MAUVE`, `PALE_RED`, `YELLOW`, `ORANGE`, `CYAN`, `GRAY`, `BLUE`, `GREEN`, `RED` |
| `CalendarApp.Visibility` | `DEFAULT`, `PUBLIC`, `PRIVATE`, `CONFIDENTIAL` |
| `CalendarApp.EventTransparency` | `OPAQUE` (바쁨 표시), `TRANSPARENT` (한가함 표시) |
| `CalendarApp.GuestStatus` | `INVITED`, `MAYBE`, `NO`, `OWNER`, `YES` |
| `CalendarApp.EventType` | `DEFAULT`, `BIRTHDAY`, `FOCUS_TIME`, `FROM_GMAIL`, `OUT_OF_OFFICE`, `WORKING_LOCATION` |
| `CalendarApp.Weekday` | `MONDAY` ~ `SUNDAY` |
| `CalendarApp.Month` | `JANUARY` ~ `DECEMBER` |

---

## 진입점: CalendarApp

### 캘린더 조회

```javascript
// 기본 캘린더 (사용자 주 캘린더)
const cal = CalendarApp.getDefaultCalendar();   // Calendar

// 특정 캘린더 (ID는 "abc...@group.calendar.google.com" 또는 이메일)
const cal2 = CalendarApp.getCalendarById('calendar-id@group.calendar.google.com');

// 이름으로 조회 (동명 다수 가능)
const cals = CalendarApp.getCalendarsByName('회의실 A');

// 내가 소유한 캘린더만
const ownedCals = CalendarApp.getAllOwnedCalendars();
const ownedById = CalendarApp.getOwnedCalendarById(id);
const ownedByName = CalendarApp.getOwnedCalendarsByName('업무');

// 구독 포함 모든 캘린더
const all = CalendarApp.getAllCalendars();
```

| 메서드 | 반환 |
|--------|------|
| `getDefaultCalendar()` | `Calendar` |
| `getCalendarById(id)` | `Calendar \| null` |
| `getCalendarsByName(name)` | `Calendar[]` |
| `getOwnedCalendarById(id)` | `Calendar \| null` |
| `getOwnedCalendarsByName(name)` | `Calendar[]` |
| `getAllCalendars()` | `Calendar[]` |
| `getAllOwnedCalendars()` | `Calendar[]` |

### 새 캘린더 생성 / 구독

```javascript
const cal = CalendarApp.createCalendar('프로젝트 알파', {
  summary: '알파팀 일정',
  color: CalendarApp.Color.BLUE,
  hidden: false,
  selected: true,
  timeZone: 'Asia/Seoul'
});

const subscribed = CalendarApp.subscribeToCalendar('other-id@group.calendar.google.com', {
  color: CalendarApp.Color.GREEN,
  hidden: false,
  selected: true
});
```

### 이벤트 조회 (모든 캘린더 전체에서)

CalendarApp의 `getEvents`, `getEventsForDay`, `getEventById`는 **기본 캘린더**의 이벤트를 다룬다. 다른 캘린더 이벤트는 `getCalendarById(...).getEvents(...)` 로 접근.

```javascript
// 기본 캘린더의 오늘 일정
const today = CalendarApp.getEventsForDay(new Date());

// 기본 캘린더의 특정 범위
const range = CalendarApp.getEvents(
  new Date('2025-04-01T00:00:00+09:00'),
  new Date('2025-04-30T23:59:59+09:00')
);

// 옵션으로 필터링
const filtered = CalendarApp.getEvents(start, end, {
  search: '회의',         // 제목/설명 검색
  author: 'host@example.com',
  start: 0,               // 페이지네이션
  max: 100
});

// iCal UID로 직접 조회
const ev = CalendarApp.getEventById('abc123@google.com');
const series = CalendarApp.getEventSeriesById('series-id');
```

### 새 EventRecurrence 객체

```javascript
const recurrence = CalendarApp.newRecurrence()
  .addWeeklyRule()
  .onlyOnWeekdays([CalendarApp.Weekday.MONDAY, CalendarApp.Weekday.WEDNESDAY])
  .until(new Date('2025-12-31'));
```

`EventRecurrence`는 빌더 패턴으로 RRULE을 구성. `createEventSeries`에 인자로 전달.

---

## Calendar 클래스

### 식별 / 속성

```javascript
cal.getId();              // String
cal.getName();            // String
cal.getDescription();     // String
cal.getColor();           // String (color hex 또는 enum 값)
cal.getTimeZone();        // String — IANA TZ (예: 'Asia/Seoul')

cal.setName('새 이름');
cal.setDescription('설명');
cal.setColor(CalendarApp.Color.RED);
cal.setTimeZone('Asia/Seoul');

cal.isMyPrimaryCalendar();  // 주 캘린더 여부
cal.isOwnedByMe();
cal.isSelected();           // UI에서 선택돼 있나
cal.isHidden();
cal.setSelected(true);
cal.setHidden(false);
```

### 캘린더 관리

```javascript
cal.deleteCalendar();        // 소유 캘린더 삭제 (영구)
cal.unsubscribeFromCalendar(); // 구독 캘린더 해제
```

### 이벤트 생성 (Calendar 인스턴스에서)

```javascript
const cal = CalendarApp.getDefaultCalendar();

// 1) 단일 일정
cal.createEvent(
  '디자인 리뷰',
  new Date('2025-05-15T14:00:00+09:00'),
  new Date('2025-05-15T15:00:00+09:00'),
  {
    location: '6층 회의실 A',
    description: '아젠다: ...',
    guests: 'a@example.com,b@example.com',
    sendInvites: true
  }
);

// 2) 종일 일정
cal.createAllDayEvent('홀리데이', new Date('2025-05-05'));

// 종일 다일간 — endDate는 exclusive (마지막 날 다음 날 지정)
cal.createAllDayEvent('워크샵', new Date('2025-05-10'), new Date('2025-05-13'));

// 3) 자연어 파싱 (영어/한국어 일부)
cal.createEventFromDescription('내일 오후 3시 카페에서 미팅');

// 4) 반복 일정
const recurrence = CalendarApp.newRecurrence()
  .addWeeklyRule()
  .onlyOnWeekday(CalendarApp.Weekday.MONDAY)
  .times(10);

cal.createEventSeries(
  '주간 회의',
  new Date('2025-05-12T10:00:00+09:00'),
  new Date('2025-05-12T11:00:00+09:00'),
  recurrence,
  { location: '온라인', guests: 'team@example.com' }
);

cal.createAllDayEventSeries('월간 회고', new Date('2025-05-01'),
  CalendarApp.newRecurrence().addMonthlyRule().onlyOnMonthDay(1).times(12));
```

**createEvent 옵션 필드**

| 옵션 | 타입 | 설명 |
|------|------|------|
| `description` | String | 일정 설명 |
| `location` | String | 위치 |
| `guests` | String | 콤마 구분 이메일 |
| `sendInvites` | Boolean | 게스트에게 초대 메일 발송 (기본 false) |

### 이벤트 조회

```javascript
cal.getEvents(startTime, endTime);
cal.getEvents(startTime, endTime, { search: '키워드', author, start, max });
cal.getEventsForDay(new Date());
cal.getEventsForDay(new Date(), { search: '회의' });

cal.getEventById(iCalId);
cal.getEventSeriesById(iCalId);
```

> **반복 일정 처리**: `getEvents()`는 반복 일정의 **각 인스턴스를 펼쳐서** 반환한다. 시리즈 자체를 다루려면 인스턴스의 `getEventSeries()`를 호출하거나 `getEventSeriesById()`로 직접 가져온다.

---

## CalendarEvent

### 기본 속성

```javascript
event.getId();              // String — iCalUID (시리즈는 모든 인스턴스가 같은 ID)
event.getTitle();
event.getDescription();
event.getLocation();
event.getStartTime();       // Date
event.getEndTime();         // Date
event.getAllDayStartDate(); // 종일 일정 시작 (Date, 00:00 KST)
event.getAllDayEndDate();   // exclusive
event.getColor();           // String — EventColor 값
event.getVisibility();      // Visibility
event.getTransparency();    // EventTransparency
event.getEventType();       // EventType
event.getDateCreated();     // Date
event.getLastUpdated();     // Date
event.getCreators();        // String[] — 작성자 이메일
event.getOriginalCalendarId(); // 원 소속 캘린더 ID
```

### 속성 변경

```javascript
event.setTitle('새 제목');
event.setDescription('상세');
event.setLocation('회의실 B');
event.setTime(newStart, newEnd);            // 단일 일정
event.setAllDayDate(new Date('2025-05-10'));
event.setAllDayDates(start, end);
event.setColor(CalendarApp.EventColor.GREEN);
event.setVisibility(CalendarApp.Visibility.PRIVATE);
event.setTransparency(CalendarApp.EventTransparency.TRANSPARENT); // 한가함 표시
```

### 상태

```javascript
event.isAllDayEvent();
event.isRecurringEvent();
event.isOwnedByMe();
event.anyoneCanAddSelf();
event.setAnyoneCanAddSelf(true);

event.getMyStatus();        // GuestStatus — 내 응답
event.setMyStatus(CalendarApp.GuestStatus.YES);
```

### 게스트

```javascript
event.addGuest('a@example.com');
event.removeGuest('a@example.com');
event.getGuestList();              // EventGuest[] (소유자 제외)
event.getGuestList(true);          // 소유자 포함
event.getGuestByEmail('a@example.com');

event.guestsCanModify();
event.guestsCanInviteOthers();
event.guestsCanSeeGuests();
event.setGuestsCanModify(false);
event.setGuestsCanInviteOthers(true);
event.setGuestsCanSeeGuests(true);
```

> **주의**: `addGuest()`는 기본적으로 **초대 메일을 보내지 않는다**. 메일 발송이 필요하면 Calendar Advanced Service의 `sendUpdates: 'all'` 옵션을 사용해야 한다.

### 알림

```javascript
event.addEmailReminder(60);   // 60분 전
event.addPopupReminder(10);
event.addSmsReminder(15);     // SMS 알림 (계정 설정 필요)

event.getEmailReminders();    // Integer[] — 분 단위
event.getPopupReminders();
event.getSmsReminders();

event.removeAllReminders();
event.resetRemindersToDefault();
```

### 커스텀 태그 (개발자 메타데이터)

스크립트가 사용자 정의 메타데이터를 일정에 붙일 수 있다. 캘린더 UI에는 보이지 않음.

```javascript
event.setTag('source', 'crm-system');
event.setTag('ticket-id', 'TICK-1234');
event.getTag('ticket-id');           // 'TICK-1234'
event.getAllTagKeys();               // String[]
event.deleteTag('source');
```

### 시리즈와의 관계

```javascript
if (event.isRecurringEvent()) {
  const series = event.getEventSeries();   // CalendarEventSeries
  // series 객체로 전체 시리즈 일괄 수정
}
```

### 삭제

```javascript
event.deleteEvent();    // void — 영구 삭제 (휴지통 없음)
```

> **반복 일정 인스턴스 삭제**: 단일 인스턴스에서 `deleteEvent()`를 호출하면 해당 인스턴스만 예외 처리되어 사라진다. 시리즈 전체를 지우려면 `event.getEventSeries().deleteEventSeries()`.

---

## CalendarEventSeries

`CalendarEvent`의 모든 setter/getter를 상속받고, 추가로 시리즈 전용 메서드를 가진다.

```javascript
const series = cal.getEventSeriesById(seriesId);

series.setRecurrence(
  CalendarApp.newRecurrence().addWeeklyRule().times(20),
  startTime, endTime
);

series.setRecurrence(
  CalendarApp.newRecurrence().addWeeklyRule().times(20),
  startDate   // 종일 시리즈
);

series.deleteEventSeries();    // 전체 시리즈 삭제
```

> 시리즈 setter(`setTitle`, `setLocation` 등) 호출은 **모든 인스턴스에 일괄 적용**된다. 특정 인스턴스만 다르게 하려면 그 인스턴스(`CalendarEvent`)에서 setter 호출 — 그러면 해당 인스턴스가 시리즈에서 분기된다.

---

## EventGuest

```javascript
const guests = event.getGuestList();
guests.forEach(g => {
  g.getEmail();          // String
  g.getName();           // String — 표시 이름 (빈 문자열일 수 있음)
  g.getGuestStatus();    // GuestStatus — INVITED/YES/NO/MAYBE/OWNER
  g.getAdditionalGuests(); // Integer — 동반자 수
});
```

`EventGuest`는 immutable. 응답 상태 변경은 게스트 본인 계정에서만 가능 (`CalendarEvent.setMyStatus()`).

---

## EventRecurrence (RRULE 빌더)

빌더 패턴으로 RFC 5545 RRULE을 구성. **여러 규칙을 add~~~Rule()로 누적**할 수 있다.

### 주기 추가

```javascript
const r = CalendarApp.newRecurrence();
r.addDailyRule();
r.addWeeklyRule();
r.addMonthlyRule();
r.addYearlyRule();

// 제외 규칙 (EXRULE)
r.addDailyExclusion();
r.addWeeklyExclusion();
r.addMonthlyExclusion();
r.addYearlyExclusion();

// 특정 날짜 추가/제외
r.addDate(new Date('2025-12-25'));
r.addDateExclusion(new Date('2025-12-31'));
```

### 규칙 체이닝

`add~Rule()`이 반환하는 `RecurrenceRule` 객체에 추가 제약을 건다.

```javascript
// 매주 월·수 10회
CalendarApp.newRecurrence()
  .addWeeklyRule()
  .onlyOnWeekdays([CalendarApp.Weekday.MONDAY, CalendarApp.Weekday.WEDNESDAY])
  .times(10);

// 매월 마지막 금요일, 2025년 말까지
CalendarApp.newRecurrence()
  .addMonthlyRule()
  .onlyOnWeekday(CalendarApp.Weekday.FRIDAY)
  // monthly + weekday는 매주 발생 (인스턴스 필터 별도 필요할 수 있음)
  .until(new Date('2025-12-31'));

// 2주 간격, 평일에만
CalendarApp.newRecurrence()
  .addWeeklyRule()
  .interval(2)
  .onlyOnWeekdays([
    CalendarApp.Weekday.MONDAY,
    CalendarApp.Weekday.TUESDAY,
    CalendarApp.Weekday.WEDNESDAY,
    CalendarApp.Weekday.THURSDAY,
    CalendarApp.Weekday.FRIDAY
  ]);

// 매년 1월 1일
CalendarApp.newRecurrence()
  .addYearlyRule()
  .onlyInMonth(CalendarApp.Month.JANUARY)
  .onlyOnMonthDay(1);
```

### 타임존

```javascript
const r = CalendarApp.newRecurrence();
r.setTimeZone('Asia/Seoul');   // RRULE 평가 시 사용할 타임존
```

---

## 일반적인 패턴

### 1. 오늘 일정 요약을 이메일로

```javascript
function dailyDigest() {
  const events = CalendarApp.getEventsForDay(new Date());
  const lines = events.map(e => {
    const t = Utilities.formatDate(e.getStartTime(), 'Asia/Seoul', 'HH:mm');
    return `${t} ${e.getTitle()} (${e.getLocation() || '-'})`;
  });
  MailApp.sendEmail(Session.getActiveUser().getEmail(),
                    '오늘 일정', lines.join('\n') || '일정 없음');
}
```

### 2. 스프레드시트에서 일정 일괄 생성

```javascript
function bulkCreate() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  const cal = CalendarApp.getDefaultCalendar();

  rows.forEach(([title, startStr, endStr, guests]) => {
    cal.createEvent(title, new Date(startStr), new Date(endStr), {
      guests: guests,
      sendInvites: true
    });
  });
}
```

### 3. 이중 예약 충돌 검사

```javascript
function hasConflict(start, end, email) {
  const events = CalendarApp.getCalendarById(email).getEvents(start, end);
  return events.some(e => e.getMyStatus() !== CalendarApp.GuestStatus.NO);
}
```

### 4. 특정 키워드 일정 일괄 색 변경

```javascript
function colorizeReviews() {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일
  const events = CalendarApp.getEvents(start, end, { search: '리뷰' });
  events.forEach(e => e.setColor(CalendarApp.EventColor.RED));
}
```

### 5. CRM 티켓을 일정에 메타데이터로 연결

```javascript
function createMeetingFromTicket(ticketId, title, start, end, guests) {
  const event = CalendarApp.getDefaultCalendar().createEvent(title, start, end, { guests });
  event.setTag('ticket-id', ticketId);
  event.setTag('source', 'crm');
  return event.getId();
}

function findEventByTicket(ticketId) {
  const events = CalendarApp.getEvents(
    new Date(),
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  );
  return events.find(e => e.getTag('ticket-id') === ticketId);
}
```

### 6. 반복 일정의 특정 인스턴스만 취소

```javascript
function skipNextOccurrence(seriesId) {
  const series = CalendarApp.getEventSeriesById(seriesId);
  const now = new Date();
  const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // 시리즈에 속한 인스턴스 찾기
  const events = CalendarApp.getEvents(now, future)
    .filter(e => e.isRecurringEvent() && e.getEventSeries().getId() === seriesId);

  if (events[0]) events[0].deleteEvent(); // 첫 미래 인스턴스만 삭제
}
```

---

## Calendar Advanced Service

기본 서비스로 안 되는 것:

- **Google Meet 회의 자동 첨부** (`conferenceData`)
- ACL(공유 설정) 세밀 제어
- 게스트 응답에 따른 자동 메일 발송 정책 (`sendUpdates: 'all' | 'externalOnly' | 'none'`)
- sync token으로 증분 동기화
- 비표준 RRULE (BYSETPOS 등) 직접 지정
- 이벤트의 `extendedProperties` (이벤트 태그보다 큰 페이로드)

### 활성화

1. Apps Script 편집기 → "서비스" + → "Google Calendar API" 선택
2. identifier는 `Calendar`
3. GCP 프로젝트에서도 Calendar API 활성화

### 사용 예: Google Meet 회의 생성

```javascript
function createMeetWithMeet() {
  const event = {
    summary: '제품 리뷰',
    location: '온라인',
    description: '주간 리뷰',
    start: { dateTime: '2025-05-15T10:00:00+09:00' },
    end:   { dateTime: '2025-05-15T11:00:00+09:00' },
    attendees: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
    conferenceData: {
      createRequest: {
        requestId: Utilities.getUuid(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const created = Calendar.Events.insert(event, 'primary', {
    conferenceDataVersion: 1,
    sendUpdates: 'all'
  });
  Logger.log('Meet URL: %s', created.hangoutLink);
}
```

### sync token으로 증분 동기화

```javascript
function sync() {
  const props = PropertiesService.getScriptProperties();
  let syncToken = props.getProperty('syncToken');
  let pageToken = null;
  do {
    const opts = pageToken ? { pageToken } : (syncToken ? { syncToken } : { timeMin: new Date().toISOString() });
    let res;
    try {
      res = Calendar.Events.list('primary', opts);
    } catch (e) {
      // 410 Gone — sync token 만료. 전체 재동기화 필요.
      if (e.message.includes('410')) {
        props.deleteProperty('syncToken');
        return sync();
      }
      throw e;
    }
    res.items?.forEach(processEvent);
    pageToken = res.nextPageToken;
    if (res.nextSyncToken) props.setProperty('syncToken', res.nextSyncToken);
  } while (pageToken);
}
```

---

## 주의사항 / 함정 / Quota

### 일일 quota

> 출처: [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas) (2026-05-11 확인)

| 항목 | Consumer | Workspace |
|------|----------|-----------|
| 캘린더 일정 생성/일 | **5,000** | **10,000** |

> 정확한 값은 사전 고지 없이 변경 가능. 위 수치는 공식 quotas 페이지 기준이며 시점에 따라 다를 수 있음.

### 일반 함정

1. **TimeZone 혼동**: `new Date('2025-05-15T14:00:00')`은 **스크립트 타임존**으로 해석된다. 확실히 하려면 `'2025-05-15T14:00:00+09:00'` 형태로 오프셋 명시. 캘린더는 `cal.getTimeZone()` 로 자기 TZ를 보고하지만, 이벤트 자체의 시간은 UTC 기반으로 저장된다.

2. **`createAllDayEvent(title, startDate, endDate)`의 endDate exclusive**: 5월 10~12일 3일짜리 종일을 만들려면 `endDate = new Date('2025-05-13')`. 마지막 날의 다음 날을 지정.

3. **`createEvent`의 `sendInvites` 기본값**: false. 명시적으로 true를 주지 않으면 게스트에게 알림이 가지 않는다. Advanced Service에선 `sendUpdates: 'all'`.

4. **`addGuest()`는 메일 미발송**: 기본 서비스로 추가하면 캘린더에는 보이지만 초대 메일은 안 간다. 메일을 보내려면 처음 `createEvent`에서 `sendInvites: true`로 한 번에 추가하거나 Advanced Service 사용.

5. **반복 일정 `getEvents()`**: 시리즈가 아닌 **펼쳐진 인스턴스**를 반환. 시리즈 자체 메서드(`setTitle` 등)는 `getEventSeries()`로 시리즈 객체를 얻어 호출.

6. **`event.getId()`는 iCalUID**: 시리즈의 모든 인스턴스가 동일한 ID를 갖는다. 특정 인스턴스를 구분하려면 시작 시간을 함께 사용.

7. **`createEventFromDescription` 한계**: 영어 자연어가 가장 안정적. 한국어는 일부만 지원 (시간 표현 위주). 운영 자동화에는 권장하지 않음. 사용자 입력 폼 정도에서만 사용.

8. **`getCalendarById(null/missing)` 반환**: 존재하지 않는 ID는 `null`. NullPointer 방지 필요.

9. **Free/Busy만 필요할 때**: 일정 디테일이 필요 없고 가용성만 확인하려면 Calendar Advanced Service의 `Calendar.Freebusy.query`가 훨씬 빠르고 권한도 적게 요구한다.

10. **공유 캘린더 권한**: 다른 사람 캘린더에 일정을 만들려면 해당 캘린더에 "변경 권한"이 있어야 한다. "보기" 권한만 있으면 `createEvent` 시 권한 오류.

11. **반복 인스턴스 setter는 분기 생성**: 시리즈에 속한 단일 `event`에서 `setTitle('새 제목')`을 하면, 그 인스턴스만 시리즈에서 분기되어 별도 일정이 된다. 이후 시리즈를 일괄 변경해도 이 인스턴스는 영향받지 않는다.

### 권한 스코프

CalendarApp 사용 시 `https://www.googleapis.com/auth/calendar` 스코프가 요구된다. 읽기 전용이라도 마찬가지.

---

## 참고

- Calendar Service 클래스 목록: https://developers.google.com/apps-script/reference/calendar
- CalendarApp: https://developers.google.com/apps-script/reference/calendar/calendar-app
- Calendar: https://developers.google.com/apps-script/reference/calendar/calendar
- CalendarEvent: https://developers.google.com/apps-script/reference/calendar/calendar-event
- CalendarEventSeries: https://developers.google.com/apps-script/reference/calendar/calendar-event-series
- EventGuest: https://developers.google.com/apps-script/reference/calendar/event-guest
- EventRecurrence: https://developers.google.com/apps-script/reference/calendar/event-recurrence
- Calendar Advanced Service: https://developers.google.com/apps-script/advanced/calendar
- Google Calendar API v3: https://developers.google.com/calendar/api/v3/reference
- RFC 5545 (iCalendar/RRULE): https://datatracker.ietf.org/doc/html/rfc5545
- Apps Script Quotas: https://developers.google.com/apps-script/guides/services/quotas
