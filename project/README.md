# 제주 문화달력 (Vite + React)

> 제주의 전시·공연·지역축제를 날씨·위치와 함께 모아, 도민과 여행자가 “오늘 제주에서 뭐 하지?”를 바로 정하게 돕는 웹사이트입니다.

- **주제**: 제주의 문화행사와 지역축제 (해녀축제·탐라문화제·방어축제·들불축제처럼 제주만의 이야기가 있는 행사)
- **대상**: 주말에 갈 곳을 찾는 제주 도민, 짧은 일정에 제주 문화를 만나고 싶은 여행자 (한국어·English·中文·日本語)
- **배포**: https://project-alpha-ivory-34.vercel.app · **저장소**: https://github.com/gywns320/prj (`project/` 폴더)
- **기술**: Vite 8 · React 19 · react-router-dom 7 · Zustand 5 · Leaflet · Supabase · Gemini API · Vercel 서버 함수

## 만든 이유

“오늘 제주에서 뭐 하지?”에서 시작했습니다. ① 전시·공연·축제 소식을 **한곳에서** 보고 ② 야외 행사는 **날씨**를 같이 보고 ③ 행사 **근처에서 뭘 할지**도 알고 싶어서, 행사 + 날씨 + 주변 장소를 한 화면에 모으고 AI 에게 물어볼 수 있게 했습니다.

## 이런 걸 할 수 있어요

화면은 **홈 → 행사 찾기 → 지도 → 지역축제 → 내 일정**이 한 흐름이고, AI 가이드 버튼은 어느 화면에서나 열립니다.

| | |
|---|---|
| **홈** | 제주 풍경 사진 배경, 오늘·주말·무료·축제 바로가기, 여행 일정(날짜)에 맞는 행사, 곧 시작 / 마감 임박 / 무료 행사, 지점별 날씨 |
| **행사 찾기** | 검색 · 기간 · 분류 · 요금 · 실내외 · 지역 · 정렬, **목록 / 달력 / 지도** 보기. 필터가 주소창(URL)에 담겨 공유 가능 |
| **행사 상세** | 이미지, 소개, 문의, 네이버·구글 지도, 행사 기간 날씨와 야외 행사 우산 안내, **주변 가볼 만한 곳**(반경 10km), 캘린더(.ics)에 추가, 링크 복사 |
| **지도** | 기본은 오늘부터 7일 이내 행사. 날짜를 바꿔 다른 날도 볼 수 있고, **관광지 함께 보기**를 켜면 행사 핀 주변(1·3·5km)의 가볼 만한 곳을 번호 핀과 목록으로 보여줍니다. **카페·식당 함께 보기**는 비짓제주 분류대로 식당(주황)·카페(분홍) 핀으로 구분해 보여줍니다(평점 정보는 API 에 없음) |
| **지역축제** | 제주 대표 축제 18개의 **예년 개최 시기**(예: “11월 중순 ~ 12월 초순”), 월별 필터, 공식 안내 검색 링크. 정확한 날짜는 싣지 않고 공식 안내를 확인하도록 안내 |
| **AI 가이드** | 오른쪽 아래 버튼. 질문에 맞는 도구를 AI 가 스스로 골라 행사·날씨·주변 관광지·축제 시기를 찾아 답함 |
| **내 일정** | 행사 저장, 닉네임, 최근 본 행사, 저장한 행사 전체를 .ics 로 내보내기 |
| **다국어** | 한국어·English·中文·日本語 — 화면 문구·날짜·날씨 설명까지 번역 (행사 이름·소개는 원문 한국어) |

## 사용한 API

| 데이터 | 출처 | 키 | 쓰는 곳 |
|---|---|---|---|
| **제주 전시문화행사정보** | 제주특별자치도 · 제주in놀다 `https://www.jejunolda.com/api/event/` | 불필요 | 홈 · 행사 찾기 · 달력 · 지도 · 행사 상세 · AI 가이드 |
| **비짓제주 관광정보** | 제주관광공사 `https://api.visitjeju.net/vsjApi/contents/searchList` | `VISITJEJU_API_KEY` | 지도(주변 관광지·음식점·카페) · 행사 상세 · AI 가이드 |
| **Open-Meteo 날씨 예보** | `https://api.open-meteo.com/v1/forecast` | 불필요 | 홈 날씨 · 행사 기간 날씨 · AI 가이드 |

그 밖에 지도 타일(OpenStreetMap), 홈 풍경 사진(비짓제주 CDN), AI(Google Gemini API), 저장(Supabase)을 씁니다.

- 키가 필요한 API 와 AI 는 모두 **서버 함수(`api/`)가 대신 호출**하므로 키가 브라우저에 나가지 않습니다. 행사 API 는 CORS 헤더가 없어 브라우저가 직접 부를 수 없어서 역시 서버 함수가 중계합니다.
- 비짓제주 응답에는 시작일·종료일이 없어 달력·기간 검색에는 쓰지 않고 위치 정보로만 씁니다.

## AI 가이드

Gemini 가 질문을 보고 필요한 **도구를 스스로 골라** 사이트 데이터를 찾고, 그 결과로만 답합니다. 한 질문에 여러 출처가 필요하면 도구를 이어서 부릅니다(왕복 최대 6회). 결과가 없으면 지어내지 않고 없다고 답하도록 시스템 프롬프트가 지시합니다.

| 도구 | 하는 일 | 데이터 |
|---|---|---|
| `search_events` | 날짜·분류·무료·실내외·지역·키워드로 행사 검색 | 제주in놀다 |
| `get_event` | 행사 하나의 상세(소개·주최·문의) | 제주in놀다 |
| `get_weather` | 최대 16일 예보 | Open-Meteo |
| `nearby_sights` | 행사 또는 좌표 주변 관광지 | 비짓제주 |
| `list_festivals` | 지역축제의 예년 시기 | 직접 정리한 목록 |

예시 질문: “이번 주말에 뭐 해요?” · “비 오는 날 갈 만한 실내 행사 알려줘”(날씨 → 행사) · “산지천갤러리 전시 주변에 가볼 만한 곳은?”(행사 → 주변 관광지) · “방어축제는 언제 열려요?”

- 서버 `api/chat.js`, 도구 `api/_tools.js`, 화면 `src/components/ChatWidget.jsx`, 상태 `src/store/useChatStore.js`
- 모델 기본값은 `gemini-3.8-flash` (환경변수 `GEMINI_MODEL` 로 변경)
- 비용 보호: 접속자별 요청 제한(10분에 20회), 질문 600자 · 대화 12개 · 답변 5,000토큰 · 도구 왕복 6회 상한, 창을 닫으면 호출 중단. Google AI Studio 에서 사용 한도도 확인하세요. 모델이 막히면 다음 모델로 자동 전환(최대 35초)합니다.

## 저장 (Supabase)

로그인 없이 **닉네임**으로 사용자를 구분합니다. 처음엔 `손님-xxxx` 가 자동으로 생기고 내 일정에서 바꿀 수 있어요. 같은 닉네임이면 다른 브라우저에서도 같은 기록이 보입니다.

| 테이블 | 내용 |
|---|---|
| `favorites` | 저장한 행사 |
| `visits` | 행사 상세를 연 기록 (같은 행사는 30분에 한 번만) |
| `chat_messages` | AI 가이드 대화. “새 대화”는 기록을 지움 |

**설정**
1. supabase.com 에서 프로젝트를 만들고 Settings → API 의 **Project URL** 과 **anon(publishable) key** 를 복사
2. SQL Editor 에 [`supabase/schema.sql`](supabase/schema.sql) 을 붙여넣고 Run (여러 번 실행해도 안전)
3. `.env.local` 과 Vercel 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력 후 재배포

- 설정이 없어도 앱은 멈추지 않고 저장한 행사가 이 브라우저에만 남습니다. 내 일정 화면에 현재 저장 위치(☁ Supabase / 이 브라우저)가 표시돼요.
- `VITE_` 값은 브라우저에 들어가므로 공개돼도 되는 URL 과 anon 키만 넣습니다. 정책은 실습용(누구나 읽고 쓰기)이라 닉네임을 아는 사람은 그 기록을 볼 수 있어요 — 비밀 내용은 저장하지 않습니다. 실서비스라면 Supabase Auth 로 로그인한 사용자만 자기 행을 쓰게 바꿉니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 키를 채웁니다 (없어도 행사·날씨·지역축제는 동작)
npm run dev                  # http://localhost:5173
npm run build                # 배포용 빌드
```

`dev` 와 `preview` 는 `vite.config.js` 의 플러그인이 `api/` 서버 함수를 그대로 실행해서, Vercel CLI 없이 `npm run dev` 만으로 로컬과 배포가 같은 코드로 동작합니다. 환경변수를 바꾸면 개발 서버를 껐다 켜세요.

| 환경변수 | 용도 | 없으면 |
|---|---|---|
| `VISITJEJU_API_KEY` | 비짓제주 관광정보 (서버만) | 관광지 부분에만 안내 문구 |
| `GEMINI_API_KEY` | AI 가이드 (서버만) | “AI 가이드가 아직 준비되지 않았어요” |
| `GEMINI_MODEL` | (선택) 모델, 기본 `gemini-3.8-flash` | 기본값 |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | Supabase (브라우저, 공개 값) | 이 브라우저에만 저장 |

비밀 키(`VISITJEJU_API_KEY`, `GEMINI_API_KEY`)에는 **`VITE_` 를 붙이지 마세요** — 붙이면 브라우저에 노출됩니다. `.env.local` 은 git 에 올라가지 않습니다.

## 배포 (Vercel)

GitHub `main` 에 push 하면 자동 배포됩니다. Project Settings → Environment Variables 에 위 변수를 입력하고 **Redeploy** 하세요(환경변수는 배포 시점에 읽힙니다). `vercel.json` 은 서울 지역(`icn1`), SPA 주소 재작성(`/api/` 제외), `api/chat.js` 최대 60초를 지정합니다. 공유·제출에는 배포마다 바뀌는 미리보기 주소가 아니라 프로젝트 도메인을 쓰세요.

## 데이터를 다루며 알게 된 것

- **행사 API 명세와 다른 점**: CORS 헤더가 없어 서버 중계가 필요하고, 상세 응답의 키가 `event` 가 아니라 `evnet`(오타)이며, 좌표가 0 이거나 위도·경도가 뒤바뀐 데이터는 제주 범위 안일 때만 씁니다. `intro` 는 HTML/평문이 섞여 있고, 날짜는 한국시간 `YYYY-MM-DD` 문자열로 다룹니다.
- **내용이 틀린 데이터 검증**: JSON 형식은 멀쩡해도 내용이 그 장소의 것이 아닌 경우가 있습니다(이름은 오름인데 실제는 농업회사법인, 시 라벨이 주소와 다른 시 등). 한 장소를 지역 라벨 · 주소의 읍면 · 좌표 주변 장소 세 가지로 따져 **2대1 투표**로 틀린 칸을 찾고, 웹에서 공식 페이지·기사로 다시 확인해 근거 URL 과 함께 `api/_corrections.js` 에 남깁니다(원본 사이트는 검색에서 제외, 근거가 없으면 확인 불가로 둠). 2026-11-02 검증분은 관광지 288곳·행사 104건에서 47개 칸을 고쳤습니다. 서버 함수(`api/_apply.js`)는 요청마다 실시간 값을 검증 당시 값(`was`)과 맞는 값(`value`)에 비교해 `was` 일 때만 `value` 로 바꿔 보여주고, 원본이 이미 고쳐졌거나 달라졌으면 그대로 두며, 결과는 응답 헤더 `X-Data-Corrections` 에 적습니다. 화면에는 검증 배지가 붙습니다.
- **비짓제주 정리**: 약 2,500건 중 지도·주변 추천에는 “관광지” 분류만 쓰고, 그 안의 생활 서비스 업소(동물병원·헬스장·렌터카 등)와 상업 업체(다이빙·서핑·승마·공방 수업·스파·골프장)는 뺍니다(`api/_unrelated.js`, `api/_exclude.js`). 좌표가 비어 제주시청 기본 좌표로 채워진 4곳도 뺍니다. 태그는 언어마다 번역돼 있어 규칙도 언어별로 둡니다.
- **네이버 지도 링크**는 `시 + 이름`(예: “서귀포시 생약누리”)으로 검색합니다. 영어·중국어·일본어는 좌표로 구글 지도를 엽니다.
- **지역축제 목록**(`src/data/festivalList.js`)은 웹에서 확인한 과거 개최 기록으로 **시기만** 적었고(`basis` 에 근거), 확인하지 못한 축제는 넣지 않았습니다.
- 관광지 응답은 CDN 에 하루 캐시됩니다. 제외 목록을 고쳐도 최대 하루 뒤에 반영되고, 주소 끝에 `&v=숫자` 를 바꿔 붙이면 새 응답을 바로 볼 수 있어요.

## 앞으로

- **로그인**: 지금은 닉네임만 알면 그 기록을 볼 수 있는 실습용 정책입니다. Supabase Auth 로 로그인한 사용자만 자기 기록을 읽고 쓰게 바꿉니다.
- **카페·식당 평점**: 비짓제주 API 에 평점이 없어 분류만 보여줍니다. 평점 데이터를 구할 수 있으면 연동합니다.
- **지역축제 확정 일정**: 지금은 예년 시기만 안내합니다. 해마다 확정된 일정을 구할 수 있으면 반영합니다.

## 구조

```
api/                          서버 함수 (Vercel). _ 로 시작하는 파일은 함수가 아니라 공용 코드
  event.js · visitjeju.js · chat.js      행사 중계 / 관광지 / AI 가이드
  _tools.js                              에이전트 도구 5개
  _visitjeju.js · _unrelated.js · _exclude.js   비짓제주 호출·정리 / 제외 규칙·목록
supabase/schema.sql           Supabase 테이블 만들기
src/
  main.jsx · router.jsx       시작 / 메뉴·주소 (지도는 열 때만 불러옴)
  api/                        events · weather · places  외부 호출 + 응답 정리
  store/                      useCultureStore(행사·관광지·저장·방문) · useChatStore(AI 대화)
  lib/                        supabase · cloud(저장·조회) · date · ics · geo · festival
  i18n/                       index(언어 상태·t/tr) · messages · messages.extra(4개 언어 문구)
  data/                       festivalList(지역축제 데이터) · festivals(화면용 함수)
  layouts/RootLayout.jsx      상단바 · 언어 선택 · 모바일 탭바 · 푸터 · AI 가이드
  components/                 EventCard · CalendarView · MapView · Weather · NearbyPlaces · HeroPhotos · ChatWidget · common
  pages/                      Home · Events · EventDetail · MapPage · Festivals · Saved · NotFound
  styles/theme.css            전체 스타일
```

새 페이지: ① `pages/` 에 파일 ② 메뉴에 넣으려면 `router.jsx` 의 `NAV_ITEMS` 에 한 줄 ③ `routes` 에 한 줄.
