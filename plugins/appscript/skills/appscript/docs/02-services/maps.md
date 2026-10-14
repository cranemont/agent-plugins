# Maps 서비스

> **출처**
> - https://developers.google.com/apps-script/reference/maps
> - https://developers.google.com/apps-script/reference/maps/maps
> - https://developers.google.com/apps-script/reference/maps/geocoder
> - https://developers.google.com/apps-script/reference/maps/direction-finder
> - https://developers.google.com/apps-script/reference/maps/static-map
> - https://developers.google.com/apps-script/reference/maps/elevation-sampler
> - https://developers.google.com/apps-script/guides/services/quotas
>
> **최종 확인일**: 2026-07-22

## 개요

`Maps` 서비스는 Google 지도 데이터를 Apps Script에서 사용하는 내장 서비스다. `Maps` 클래스가 팩토리 역할을 하며, 네 종류의 도우미 객체를 만든다.

| 팩토리 메서드 | 반환 | 용도 |
| --- | --- | --- |
| `Maps.newGeocoder()` | `Geocoder` | 주소 ↔ 좌표 변환 |
| `Maps.newDirectionFinder()` | `DirectionFinder` | 두 지점 간 경로·거리·소요시간 |
| `Maps.newStaticMap()` | `StaticMap` | 정적 지도 이미지 생성 (`Blob`) |
| `Maps.newElevationSampler()` | `ElevationSampler` | 지점·경로의 고도(해발) 샘플링 |

**언제 쓰는가**
- 시트에 쌓인 주소를 위경도로 일괄 변환 (배치 지오코딩)
- 출발지–목적지 거리/소요시간을 계산해 보고서 작성
- 이메일이나 문서에 지도 이미지를 첨부
- 좌표 목록의 고도 데이터 수집

**공용 quota를 쓰는 서비스**
Maps 서비스의 지오코딩·경로·고도·정적지도 호출은 모두 Apps Script 계정 단위의 일일 quota를 소모한다(consumer 기준 하루 1,000회). 아래 [Quota](#주의사항--quota--함정) 참고. API 키에 연결된 Google Cloud 프로젝트의 quota/과금으로 넘기려면 `setAuthenticationByApiKey`를 사용한다.

**OAuth 스코프**
Maps 서비스 레퍼런스 페이지에는 별도의 필수 OAuth 스코프가 명시되어 있지 않다. 결과에 사용자 데이터가 섞이지 않으므로 UrlFetch(`script.external_request`)와 달리 전용 스코프가 필요 없다. Maps 서비스 레퍼런스에는 Authorization(OAuth 스코프) 섹션 자체가 없다(2026-07-22 확인).

## Maps 클래스

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `newGeocoder()` | `Geocoder` | 지오코더 생성 |
| `newDirectionFinder()` | `DirectionFinder` | 경로 탐색기 생성 |
| `newStaticMap()` | `StaticMap` | 정적 지도 빌더 생성 |
| `newElevationSampler()` | `ElevationSampler` | 고도 샘플러 생성 |
| `encodePolyline(points)` | `String` | 좌표 배열 → 인코딩된 폴리라인 문자열 |
| `decodePolyline(polyline)` | `Number[]` | 인코딩된 폴리라인 → 좌표 배열 |

### 인증 (Google Maps Platform 연동)

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `setAuthenticationByApiKey(apiKey)` | `void` | GMP API 키로 인증 |
| `setAuthenticationByApiKey(apiKey, signingKey)` | `void` | API 키 + 서명키 |
| `resetAuthenticationApiKey()` | `void` | 설정한 인증 초기화 |
| `setAuthentication(clientId, signingKey)` | `void` | **[Deprecated]** 구 Premium Plan client ID/서명키 방식 |

`setAuthentication(clientId, signingKey)`는 공식 문서에서 **deprecated**로 표시되어 있다. 신규 코드는 `setAuthenticationByApiKey`를 사용한다. 공식 설명: "quota consumption and billing are charged to the Google Cloud project associated with the provided API key according to the pricing sheet." 즉 `setAuthenticationByApiKey`를 호출하면 이후 호출의 quota 소모·과금이 그 API 키에 연결된 **Google Cloud 프로젝트**로 청구된다. `resetAuthenticationApiKey()`로 기본 quota로 되돌린다.

## Geocoder — 주소 ↔ 좌표

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `geocode(address)` | `Object` | 주소 → 좌표(들) |
| `reverseGeocode(latitude, longitude)` | `Object` | 좌표 → 주소(들) |
| `setBounds(swLatitude, swLongitude, neLatitude, neLongitude)` | `Geocoder` | 우선 반영할 영역 지정 |
| `setLanguage(language)` | `Geocoder` | 결과 언어 (예: `'ko'`) |
| `setRegion(region)` | `Geocoder` | 지명 해석 기준 지역 코드 (예: `'kr'`) |

`geocode()`/`reverseGeocode()`가 반환하는 JSON 구조(요약):

```jsonc
{
  "status": "OK",              // 성공 시 "OK"
  "results": [
    {
      "formatted_address": "대한민국 서울특별시 강남구 ...",
      "geometry": {
        "location": { "lat": 37.500, "lng": 127.036 }
      },
      "address_components": [ /* 국가/도시/도로 등 분해 */ ]
    }
  ]
}
```

`status`는 내부적으로 Google Geocoding API를 따르며 성공 시 `"OK"`, 결과 없음이면 `"ZERO_RESULTS"`, quota 초과면 `"OVER_QUERY_LIMIT"` 등이 온다. **항상 `status`를 확인**하고 `results.length`를 검사한다.

## DirectionFinder — 경로

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `setOrigin(address)` / `setOrigin(latitude, longitude)` | `DirectionFinder` | 출발지 |
| `setDestination(address)` / `setDestination(latitude, longitude)` | `DirectionFinder` | 도착지 |
| `addWaypoint(address)` / `addWaypoint(latitude, longitude)` | `DirectionFinder` | 경유지 추가 |
| `clearWaypoints()` | `DirectionFinder` | 경유지 초기화 |
| `setMode(mode)` | `DirectionFinder` | 이동 수단 (기본 `DRIVING`) |
| `setAvoid(avoid)` | `DirectionFinder` | 회피 옵션 (`TOLLS`/`HIGHWAYS`) |
| `setArrive(time)` | `DirectionFinder` | 도착 희망 시각 |
| `setDepart(time)` | `DirectionFinder` | 출발 희망 시각 |
| `setLanguage(language)` | `DirectionFinder` | 결과 언어 |
| `setOptimizeWaypoints(optimizeOrder)` | `DirectionFinder` | 경유지 순서 최적화 |
| `setRegion(region)` | `DirectionFinder` | 지명 해석 기준 지역 |
| `getDirections()` | `Object` | 경로 조회 실행 |

`getDirections()`가 반환하는 JSON 구조(요약):

```jsonc
{
  "status": "OK",
  "routes": [
    {
      "legs": [
        {
          "distance": { "value": 325000, "text": "325 km" }, // value = 미터
          "duration": { "value": 14400, "text": "4시간" },    // value = 초
          "steps": [ /* 턴바이턴 단계 */ ]
        }
      ],
      "overview_polyline": { "points": "인코딩된 폴리라인" }
    }
  ]
}
```

`distance.value`는 미터, `duration.value`는 초 단위(공식 확인). `.text`는 사람이 읽는 문자열이며 이는 내부 Directions API가 함께 제공한다.

## StaticMap — 정적 지도 이미지

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `setSize(width, height)` | `StaticMap` | 이미지 크기(px) |
| `setZoom(zoom)` | `StaticMap` | 확대 레벨 |
| `setCenter(address)` / `setCenter(latitude, longitude)` | `StaticMap` | 중심 |
| `setMapType(mapType)` | `StaticMap` | 지도 종류 (`Type` enum) |
| `setFormat(format)` | `StaticMap` | 이미지 포맷 (`Format` enum) |
| `setLanguage(language)` | `StaticMap` | 라벨 언어 |
| `setMobile(useMobileTiles)` | `StaticMap` | 모바일용 타일 사용 여부 |
| `setMarkerStyle(size, color, label)` | `StaticMap` | 이후 추가할 마커 스타일 |
| `setCustomMarkerStyle(imageUrl, useShadow)` | `StaticMap` | 커스텀 마커 이미지 |
| `addMarker(address)` / `addMarker(latitude, longitude)` | `StaticMap` | 마커 추가 |
| `clearMarkers()` | `StaticMap` | 마커 초기화 |
| `setPathStyle(weight, color, fillColor)` | `StaticMap` | 이후 추가할 경로 스타일 |
| `beginPath()` | `StaticMap` | 경로 시작 |
| `addAddress(address)` | `StaticMap` | 현재 경로에 주소 점 추가 |
| `addPoint(latitude, longitude)` | `StaticMap` | 현재 경로에 좌표 점 추가 |
| `endPath()` | `StaticMap` | 경로 종료 |
| `addPath(points)` / `addPath(polyline)` | `StaticMap` | 좌표 배열 또는 인코딩 폴리라인으로 경로 추가 |
| `clearPaths()` | `StaticMap` | 경로 초기화 |
| `addVisible(address)` / `addVisible(latitude, longitude)` | `StaticMap` | 반드시 보이게 할 지점(자동 프레이밍) |
| `clearVisibles()` | `StaticMap` | 위 초기화 |
| `getMapUrl()` | `String` | 지도 이미지 URL |
| `getMapImage()` | `Byte[]` | 이미지 원시 바이트 |
| `getBlob()` | `Blob` | 이미지 Blob (Drive/이메일에 바로 사용) |
| `getAs(contentType)` | `Blob` | MIME 지정 Blob 변환 |

> 참고: `getAsImage`는 공식 메서드로 확인되지 않았다. 이미지 Blob이 필요하면 `getBlob()` 또는 `getAs(contentType)`를 쓴다.

## ElevationSampler — 고도

| 메서드 | 반환 | 설명 |
| --- | --- | --- |
| `sampleLocation(latitude, longitude)` | `Object` | 단일 지점 고도 |
| `sampleLocations(points)` | `Object` | 좌표 배열의 각 지점 고도 |
| `sampleLocations(encodedPolyline)` | `Object` | 인코딩 폴리라인의 각 지점 고도 |
| `samplePath(points, numSamples)` | `Object` | 경로를 `numSamples`개로 균등 샘플 |
| `samplePath(encodedPolyline, numSamples)` | `Object` | 인코딩 폴리라인을 균등 샘플 |

반환 JSON 구조(요약):

```jsonc
{
  "status": "OK",
  "results": [
    {
      "elevation": 84.5,                 // 미터
      "location": { "lat": 37.5, "lng": 127.0 },
      "resolution": 19.08                // 샘플 해상도(미터)
    }
  ]
}
```

## Enum 정리

| Enum | 접근 경로 | 값 |
| --- | --- | --- |
| **Mode** | `Maps.DirectionFinder.Mode` | `DRIVING`, `WALKING`, `BICYCLING`, `TRANSIT` |
| **Avoid** | `Maps.DirectionFinder.Avoid` | `TOLLS`, `HIGHWAYS` |
| **Type** | `Maps.StaticMap.Type` | `ROADMAP`, `SATELLITE`, `TERRAIN`, `HYBRID` |
| **Format** | `Maps.StaticMap.Format` | `PNG`, `PNG8`, `PNG32`, `GIF`, `JPG`, `JPG_BASELINE` |
| **MarkerSize** | `Maps.StaticMap.MarkerSize` | `TINY`, `MID`, `SMALL` |
| **Color** | `Maps.StaticMap.Color` | `BLACK`, `BROWN`, `GREEN`, `PURPLE`, `YELLOW`, `BLUE`, `GRAY`, `ORANGE`, `RED`, `WHITE` |

`Avoid`에 `FERRIES`는 없다(공식 확인). `Mode`, `Avoid`는 `DirectionFinderEnums`, 나머지는 `StaticMapEnums`에 속한다.

## 코드 예제

### 1) 지오코딩 (주소 → 좌표)

```javascript
function geocodeAddress() {
  const geocoder = Maps.newGeocoder()
    .setLanguage('ko')
    .setRegion('kr');

  const response = geocoder.geocode('서울특별시 강남구 테헤란로 152');

  if (response.status !== 'OK' || response.results.length === 0) {
    throw new Error(`지오코딩 실패: ${response.status}`);
  }

  const top = response.results[0];
  const { lat, lng } = top.geometry.location;
  console.log(top.formatted_address, lat, lng);
  return { lat, lng };
}
```

### 2) 역지오코딩 (좌표 → 주소)

```javascript
function reverseGeocode(lat, lng) {
  const response = Maps.newGeocoder()
    .setLanguage('ko')
    .reverseGeocode(lat, lng);

  if (response.status !== 'OK' || response.results.length === 0) return null;
  return response.results[0].formatted_address;
}
```

### 3) 경로 거리·소요시간

```javascript
function routeSummary() {
  const directions = Maps.newDirectionFinder()
    .setOrigin('서울역')
    .setDestination('부산역')
    .setMode(Maps.DirectionFinder.Mode.DRIVING)
    .setAvoid(Maps.DirectionFinder.Avoid.TOLLS)
    .getDirections();

  if (directions.status !== 'OK' || directions.routes.length === 0) {
    throw new Error(`경로 조회 실패: ${directions.status}`);
  }

  const leg = directions.routes[0].legs[0];
  const km = (leg.distance.value / 1000).toFixed(1);   // value = 미터
  const min = Math.round(leg.duration.value / 60);      // value = 초
  console.log(`${km} km, 약 ${min}분`);
  return { meters: leg.distance.value, seconds: leg.duration.value };
}
```

### 4) 정적 지도 이미지 → Drive 저장 + 이메일 첨부

```javascript
function staticMapToDriveAndMail() {
  const map = Maps.newStaticMap()
    .setSize(640, 480)
    .setZoom(15)
    .setMapType(Maps.StaticMap.Type.ROADMAP)
    .setFormat(Maps.StaticMap.Format.PNG)
    .setMarkerStyle(
      Maps.StaticMap.MarkerSize.MID,
      Maps.StaticMap.Color.RED,
      'A'
    )
    .addMarker('N Seoul Tower');

  const blob = map.getBlob().setName('map.png');

  // Drive 저장
  DriveApp.createFile(blob);

  // 이메일 첨부
  GmailApp.sendEmail('me@example.com', '위치 지도', '첨부 참고', {
    attachments: [blob],
  });
}
```

### 5) 경로를 정적 지도에 그리기 (overview_polyline 활용)

```javascript
function mapWithRoute() {
  const directions = Maps.newDirectionFinder()
    .setOrigin('서울역')
    .setDestination('인천국제공항')
    .getDirections();

  const polyline = directions.routes[0].overview_polyline.points;

  const map = Maps.newStaticMap()
    .setSize(640, 480)
    .setPathStyle(4, Maps.StaticMap.Color.BLUE, Maps.StaticMap.Color.BLUE)
    .addPath(polyline); // 인코딩된 폴리라인 문자열을 그대로 전달

  return map.getBlob().setName('route.png');
}
```

### 6) 고도 조회

```javascript
function elevationOf(lat, lng) {
  const response = Maps.newElevationSampler().sampleLocation(lat, lng);
  if (response.status !== 'OK' || response.results.length === 0) return null;
  return response.results[0].elevation; // 해발 미터
}
```

## 일반적인 패턴

### 배치 지오코딩 + 캐싱

Maps quota는 consumer 기준 하루 1,000회로 낮다. 같은 주소를 반복 변환하지 않도록 `CacheService`/`PropertiesService`에 결과를 캐싱한다.

```javascript
function geocodeCached(address) {
  const cache = CacheService.getScriptCache();
  const key = `geo:${address}`;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const res = Maps.newGeocoder().setRegion('kr').geocode(address);
  if (res.status !== 'OK' || res.results.length === 0) return null;

  const loc = res.results[0].geometry.location;
  cache.put(key, JSON.stringify(loc), 21600); // 6시간
  return loc;
}
```

### 실행시간 한도 분할

수천 건 지오코딩은 6분 실행 한도에 걸린다. 처리 위치를 `PropertiesService`에 저장하고 시간 기반 트리거로 이어서 처리한다(`03-triggers/installable-triggers.md` 참고).

## 주의사항 / Quota / 함정

### 일일 quota

| 항목 | Consumer 계정 | Workspace 계정 |
| --- | --- | --- |
| 경로(Directions) 조회 | 1,000 / 일 | 10,000 / 일 |
| 지오코딩(Geocode) 호출 | 1,000 / 일 | 10,000 / 일 |
| 고도(Elevation) 샘플 조회 | 1,000 / 일 | 10,000 / 일 |
| 정적 지도(Static Map) 렌더링 | 1,000 / 일 | 10,000 / 일 |

위 수치는 공식 quota 페이지 기준이며 Google이 사전 공지 없이 변경할 수 있다. 표의 한국어 항목명에 대응하는 공식 원문 라벨은 각각 `Google Map Direction query`, `Google Map Geocode calls`, `Google Map elevation samples query`, `Static Map render`다.

### 함정

1. **`status` 확인은 필수**
   `geocode`/`getDirections`/`sampleLocation` 모두 실패해도 예외를 던지지 않고 `status`에 `"ZERO_RESULTS"`, `"OVER_QUERY_LIMIT"` 같은 값을 담아 반환할 수 있다. 항상 `status === 'OK'`와 `results`/`routes` 길이를 확인한다.

2. **낮은 quota → 캐싱 전제**
   consumer 계정은 하루 1,000회다. 대량 처리 시 캐싱이 사실상 필수이며, 본격적인 사용은 `setAuthenticationByApiKey`로 Google Maps Platform 프로젝트에 연동한다(과금 발생 가능).

3. **`setAuthentication`은 deprecated**
   `setAuthentication(clientId, signingKey)`는 구 Premium Plan 방식으로 deprecated다. 신규 코드는 `setAuthenticationByApiKey`를 쓴다.

4. **거리/시간 단위**
   `distance.value`는 미터, `duration.value`는 초다. 사람이 읽는 `.text`와 혼동하지 않는다.

5. **`setMode` 기본값은 `DRIVING`**
   대중교통/도보 경로가 필요하면 `Maps.DirectionFinder.Mode.TRANSIT` 등을 명시한다.

6. **정적 지도 이미지는 `getBlob()`으로**
   Drive 저장·이메일 첨부에는 `getBlob()`(또는 `getAs(contentType)`)을 쓴다. `getMapImage()`는 `Byte[]`, `getMapUrl()`은 URL 문자열을 반환한다.

7. **6분 실행 한도**
   반복 호출 스크립트는 실행시간 한도에 걸릴 수 있으므로 배치 분할·트리거 이어받기를 고려한다.

8. **OAuth 스코프**
   Maps 서비스 레퍼런스에는 Authorization 섹션이 없어 전용 OAuth 스코프가 명시돼 있지 않다(2026-07-22 확인). 실전에서 필요한 스코프는 함께 쓰는 다른 서비스(예: `DriveApp`/`GmailApp`)에서 온다.

## 참고

- Maps 서비스 인덱스: https://developers.google.com/apps-script/reference/maps
- Maps 클래스: https://developers.google.com/apps-script/reference/maps/maps
- Geocoder: https://developers.google.com/apps-script/reference/maps/geocoder
- DirectionFinder: https://developers.google.com/apps-script/reference/maps/direction-finder
- StaticMap: https://developers.google.com/apps-script/reference/maps/static-map
- ElevationSampler: https://developers.google.com/apps-script/reference/maps/elevation-sampler
- Quota: https://developers.google.com/apps-script/guides/services/quotas
- 관련 문서: `02-services/url-fetch.md`, `06-quotas/quotas-and-limits.md`
