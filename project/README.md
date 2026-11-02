# 제주 문화달력 (Vite + React)

제주도민과 관광객을 위한 **제주 문화행사 안내 웹사이트**입니다.
제주특별자치도 「전시문화행사정보」 OpenAPI(제주in놀다, Jeju-OpenAPI-I01)의 실데이터를 사용합니다.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview  # 빌드 결과 확인 (프록시 포함)
```

API 키는 필요 없습니다.

## 쓰는 API
| 용도 | 요청 |
|---|---|
| 행사 목록 | `GET https://www.jejunolda.com/api/event/?page=1&pageSize=500` (`category`·`pay`·`loc` 필터 가능) |
| 행사 상세 | `GET https://www.jejunolda.com/api/event/?event={seq}` |

이미지는 `https://jejunolda.com/files/event/<cover>` (썸네일은 `coverThumb`).

### 관광지 — 비짓제주 관광정보 OPEN API (제주관광공사, 키 필요)
`GET http://api.visitjeju.net/vsjApi/contents/searchList?apiKey=&locale=kr&page=` (한 페이지 100건, 약 1,150건)
- **키는 브라우저에 노출되면 안 되므로** 서버 함수 `api/visitjeju.js` 가 대신 호출합니다. 모든 페이지를 모아 필요한 항목(이름·분류·좌표·태그·사진 등)만 추려 응답하고, CDN 에 하루 캐시합니다.
- **Vercel**: Project Settings → Environment Variables 에 `VISITJEJU_API_KEY` 를 추가하고 재배포. (`VITE_` 를 붙이지 마세요)
- **로컬**: `.env.example` 을 `.env.local` 로 복사해 키를 넣고 `npm run dev` (서버를 껐다 켜야 환경변수가 반영돼요). 키가 없으면 관광지 부분만 안내 문구가 뜨고 나머지는 정상 동작합니다.
- 함수는 Vercel 지역을 서울(`icn1`)로 지정했습니다 (`vercel.json`). 상대 서버 방화벽이 해외 IP 를 막을 수 있어서입니다.
- **한계**: 응답에 시작일·종료일이 없어 이 API 의 장소는 달력·기간 검색에 쓸 수 없고, 위치 정보로만 씁니다. 가이드에 분류 코드표가 없어 '축제/행사' 분류가 있는지는 키로 호출해 봐야 알 수 있어요(있다면 분류 칩에 자동으로 나타납니다).
- 쓰는 곳: 행사 상세의 **주변 가볼 만한 곳**(반경 10km, 가까운 순), 지도 페이지의 **관광지 함께 보기**(초록 점)

### 지도 — Leaflet + OpenStreetMap
키 없이 쓰는 오픈 지도입니다(타일: tile.openstreetmap.org, 하단 출처 표기 포함). 행사 좌표(`x`,`y`)를 핀으로 찍고, 같은 장소(약 100m)의 행사는 한 핀으로 묶습니다. 좌표가 없는 행사는 지도 옆 목록으로 보여줍니다. 지도는 열 때만 불러오도록(코드 분할) 했습니다.
- 지도 페이지(`/map`): 기본은 **오늘부터 7일 이내** 행사만 표시. 프리셋(오늘/내일/주말/다음 7일/이번 달), 날짜 직접 지정, ‹ › 로 같은 길이만큼 이동, 분류·무료 필터. 날짜는 주소창에 담깁니다.
- 행사 찾기의 "지도" 보기도 같은 지도를 씁니다(해당 필터 결과가 표시됨).

### 날씨 — Open-Meteo
`GET https://api.open-meteo.com/v1/forecast` (키 불필요, CORS 허용 → 프록시 없이 브라우저에서 바로 호출, 예보는 최대 16일)
- 현재: 기온·체감·날씨코드·바람 / 일별: 최고·최저·강수확률·강수량·최대풍속
- 제주시·서귀포·성산(동부)·한림(서부) 4개 지점을 두고, 행사는 좌표(없으면 행정구역)로 가장 가까운 지점의 예보를 씁니다.
- `src/api/weather.js` (호출·날씨코드 해석·30분 캐시), `src/components/Weather.jsx` (홈 패널 · 행사 상세 예보)

### 명세서와 실제 응답이 다른 점
- **CORS 헤더가 없어** 브라우저가 직접 부를 수 없습니다 → 서버 함수 `api/event.js` 가 대신 호출합니다(허용한 파라미터만 전달, 10분 캐시). 로컬에서는 `vite.config.js` 의 플러그인이 같은 파일을 그대로 실행하므로 로컬과 배포가 같은 코드로 동작합니다.
- 상세 응답의 키가 명세서에는 `event`, 실제로는 **`evnet`(오타)** 입니다. 둘 다 처리합니다.
- 좌표 `x`,`y` 가 0 이거나 위도·경도가 뒤바뀐 데이터가 있어 제주 범위 안일 때만 지도에 씁니다.
- `intro` 는 HTML 이거나 평문이라 글자만 뽑아 보여줍니다. 카테고리 이름에 `(사용안함)` 이 붙은 값은 정리합니다.
- 명세서의 `with` 필터는 동작하지 않아 쓰지 않았습니다. 현재 약 120건이라 한 번에 받아 화면에서 거릅니다.

## 구조
```
api/event.js · api/visitjeju.js   (루트) 서버 함수 — 행사 API 중계 / 비짓제주 호출(API 키 보관)
src/
  main.jsx · router.jsx       시작 / 메뉴·주소
  api/events.js · api/weather.js · api/places.js   외부 API 호출 + 응답 정리
  store/useCultureStore.js    Zustand: 행사 목록, 저장한 행사(localStorage), 알림
  lib/date.js · lib/ics.js · lib/geo.js   한국시간 날짜 / 캘린더(.ics) / 거리 계산
  layouts/RootLayout.jsx      상단바 · 모바일 탭바
  components/                 EventCard, CalendarView, MapView(Leaflet), Weather, NearbyPlaces, common
  pages/                      Home, Events, EventDetail, MapPage, Saved, NotFound
  styles/theme.css
```

## 기능
- 홈: 오늘·주말·무료 바로가기, **여행 일정(날짜)에 맞는 행사**, 곧 시작 / 마감 임박 / 무료 행사
- 행사 찾기: 검색 · 기간(오늘/주말/7일/이번 달/날짜 지정) · 분류 · 요금 · 실내외 · 지역 · 정렬, **목록 / 달력 / 지도** 보기. 필터는 주소창(URL)에 담겨 공유 가능
- 날씨: 홈에서 지점별 현재 날씨·7일 예보, 비 소식이 있으면 실내 행사로 안내. 행사 상세에서 **행사 기간의 예보**와 야외 행사 우산 안내
- 지도: 실제 지도에 행사 위치 표시, 기본 7일 이내 + 날짜 변경
- 축제: 홈·행사 찾기·지도의 **축제 필터**. 분류가 '축제'(012)이거나 행사명에 축제·페스티벌·한마당 등이 들어간 행사를 모읍니다(`src/lib/festival.js`). 행사 API 는 전시·공연 위주라 축제 등록이 많지 않아요(2026-11 기준 4건).
- 주변 장소: 행사 상세에서 반경 10km 관광지·맛집 추천, 지도에 관광지 레이어
- 상세: 이미지 갤러리, 소개, 문의 전화, 홈페이지, 네이버·구글 지도, 캘린더에 추가(.ics), 링크 복사
- 내 일정: 저장한 행사 모아보기, 전체 .ics 내보내기
