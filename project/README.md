# 제주 문화달력 (Vite + React)

> **기획 의도** — 제주의 전시·공연·지역축제를 날씨·위치와 함께 모아, 도민과 여행자가 “오늘 어디 갈까”를 바로 정하게 돕습니다.

- **주제**: 제주의 문화행사와 지역축제 (해녀축제·탐라문화제·방어축제·들불축제처럼 제주만의 이야기가 있는 행사)
- **누구를 위해**: 주말에 갈 곳을 찾는 제주 도민, 짧은 일정에 제주 문화를 만나고 싶은 여행자 (한국어·English·中文·日本語)
- **어떤 가치**: 흩어진 행사 정보를 날씨·지도·주변 관광지와 묶어 보여주고, AI 가이드가 물어보는 대로 찾아 줍니다.

|  |  |
|---|---|
| **배포 주소** | https://project-alpha-ivory-34.vercel.app |
| **GitHub** | https://github.com/gywns320/prj (`project/` 폴더) |
| 기술 | Vite 8 · React 19 · react-router-dom 7 · Zustand 5 · Leaflet · Three.js(@react-three/fiber) · Supabase · Claude API · Vercel 서버 함수 |

## 평가 기준 체크

| # | 조건 | 어디서 확인하나요 |
|---|---|---|
| 1 | React(Vite) + Router + Store, 폴더 분리 | `src/pages` · `src/components` · `src/store` · `src/api` · `src/lib` · `src/layouts`, 주소·메뉴는 `src/router.jsx` 한 곳, 전역 상태는 Zustand(`useCultureStore`·`useChatStore`), 한 화면에서만 쓰는 값은 `useState` |
| 2 | 제주 콘텐츠·문화 IP 주제, 첫 화면에 기획 의도 한 줄 | 홈 첫 화면의 **“기획 의도”** 한 줄, `/about` 에 주제·대상·가치 |
| 3 | 공공데이터 API 3개 이상 실제 호출 | 아래 **사용한 API**, `/about` 에서 세 API 의 정상 여부와 실제 데이터(건수·목록) 확인, 로딩·오류 처리 포함 |
| 4 | Supabase 저장·조회, 새로고침해도 유지 | **즐겨찾기**(`favorites`) · **방문 기록**(`visits`) · **AI 대화 기록**(`chat_messages`). 같은 닉네임이면 다른 브라우저에서도 보임. 내 일정(`/saved`) 에서 확인 |
| 5 | AI 에이전트 — LLM 이 도구를 골라 호출, 호출 도구 목록 표시 | AI 가이드 답변 위의 **“🔧 에이전트가 호출한 도구”** 목록(도구 이름·API 출처·넘긴 입력·결과 개수) |
| 선택 | Three.js 3D, 마우스로 돌아가고 API 데이터가 3D 위에 표시 | `/3d` — 세 API 의 데이터가 3D 장면에 올라감 |
| 가산 | API 4개 이상 / 대화 기록 Supabase 저장 / 추가 기능 | 대화 기록 저장 ✓, 4개 언어 · 지역축제 · 지도·달력·.ics 내보내기 |

## 사용한 API

| # | 데이터 | 출처 | 키 | 쓰는 곳 |
|---|---|---|---|---|
| ① | **제주 전시문화행사정보** | 제주특별자치도 · 제주in놀다 `https://www.jejunolda.com/api/event/` | 불필요 | 홈 · 행사 찾기 · 달력 · 지도 · 행사 상세 · 3D · AI 가이드 |
| ② | **비짓제주 관광정보** | 제주관광공사 `https://api.visitjeju.net/vsjApi/contents/searchList` | `VISITJEJU_API_KEY` | 지도(주변 가볼 만한 곳) · 행사 상세 · 3D(오름) · AI 가이드 |
| ③ | **Open-Meteo 날씨 예보** | `https://api.open-meteo.com/v1/forecast` | 불필요 | 홈 날씨 · 행사 기간 날씨 · 3D(비·안개) · AI 가이드 |

그 밖에: 지도 타일(OpenStreetMap), 홈 풍경 사진(비짓제주 CDN), AI(Anthropic Claude API), 저장(Supabase).

- **키가 필요한 API 와 AI 는 모두 서버 함수(`api/`)가 대신 호출**합니다. 브라우저에는 키가 나가지 않습니다. (행사 API 는 CORS 헤더가 없어 브라우저가 직접 부를 수 없어서 역시 서버 함수가 중계합니다.)
- **한계**: 비짓제주 응답에는 시작일·종료일이 없어 달력·기간 검색에 쓰지 않고 위치 정보로만 씁니다. 날씨는 공공데이터포털(기상청)이 아니라 오픈 데이터인 Open-Meteo 입니다.

## AI 에이전트

AI 가이드(오른쪽 아래 버튼)는 Claude 가 질문에 맞는 **도구를 스스로 골라** 사이트 데이터를 찾고, 그 결과로만 답합니다. 호출한 도구는 답변 위에 그대로 보입니다.

| 도구 | 하는 일 | API |
|---|---|---|
| `search_events` | 날짜·분류·무료·실내외·지역·키워드로 행사 검색 | ① 제주in놀다 |
| `get_event` | 행사 하나의 상세(소개·주최·문의) | ① 제주in놀다 |
| `get_weather` | 최대 16일 예보 | ③ Open-Meteo |
| `nearby_sights` | 행사 또는 좌표 주변 관광지 | ② 비짓제주 |
| `list_festivals` | 지역축제의 예년 시기 | 지역축제 목록 (직접 정리) |

- **연속 호출**: 한 질문에 여러 출처가 필요하면 도구를 이어서 부릅니다. 한 번에 여러 개를 동시에 부를 수도 있고, 결과를 본 뒤 다음 도구를 고를 수도 있습니다. (도구 왕복 최대 6회)
- **지어내지 않기**: 시스템 프롬프트가 “행사·날씨·관광지·축제는 반드시 도구로 확인하고, 결과가 없으면 없다고 말하라”고 지시합니다.
- 서버 `api/chat.js` · 도구 `api/_tools.js` · 화면 `src/components/ChatWidget.jsx` · 상태 `src/store/useChatStore.js`. 모델 기본값 `claude-sonnet-5-5` (`ANTHROPIC_MODEL` 로 변경).

### 테스트 시나리오 (배포 주소에서 해 보고 캡처를 붙이세요)

| 질문 | 기대하는 동작 |
|---|---|
| “이번 주말에 뭐 해요?” | `search_events` 호출 → 실제 행사 목록과 링크 |
| “비 오는 날 갈 만한 실내 행사 알려줘” | `get_weather` + `search_events`(실내) 를 이어서 호출 |
| “산지천갤러리 전시 주변에 가볼 만한 곳은?” | `search_events` → `nearby_sights` 순서로 연속 호출 |
| “방어축제는 언제 열려요?” | `list_festivals` 호출 → “예년 11월 중순~12월 초순, 정확한 날짜는 공식 안내 확인” |
| “제주에 있는 에펠탑 알려줘” | 도구로 확인 후 **없다고 답함**(지어내지 않음) |

> 캡처 자리: `docs/agent-test-1.png` … (직접 캡처해서 넣어 주세요)

## Supabase (저장)

로그인 없이 **닉네임**으로 사용자를 구분합니다(처음엔 `손님-xxxx` 가 자동으로 생기고, 내 일정에서 바꿀 수 있어요).

| 테이블 | 내용 | 쓰는 곳 |
|---|---|---|
| `favorites` | 저장한 행사 (`nickname`, `source='event'`, `item_id`, `title`) | 행사 카드의 ☆ · 내 일정 |
| `visits` | 방문 기록 (행사 상세를 연 기록, 같은 행사는 30분에 한 번만) | 내 일정의 “최근 본 행사” |
| `chat_messages` | AI 대화 (`role`, `content`, `tools`=호출한 도구 목록) | AI 가이드(열면 이전 대화를 불러옴, “새 대화”는 기록 삭제) |

**설정 방법**
1. supabase.com → New project → Settings → API 에서 **Project URL** 과 **anon(publishable) key** 복사
2. SQL Editor 에 [`supabase/schema.sql`](supabase/schema.sql) 을 붙여넣고 Run (여러 번 실행해도 안전, 기존 `favorites` 가 있어도 됩니다)
3. `.env.local` 과 Vercel 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력 → **재배포**
4. 확인: 행사를 ☆ 저장 → 새로고침해도 남음 → 다른 브라우저에서 같은 닉네임으로 보임 → Supabase Table Editor 에서 행 확인

- 설정이 없어도 앱은 멈추지 않고 저장한 행사가 **이 브라우저(localStorage)에만** 남습니다. 내 일정 화면에 현재 저장 위치(☁ Supabase / 이 브라우저)가 표시됩니다.
- **보안**: `VITE_` 값은 브라우저에 들어가므로 URL 과 anon 키만 넣습니다(공개돼도 되는 값). 정책은 실습용(누구나 읽고 쓰기)이라 닉네임을 아는 사람은 그 기록을 볼 수 있어요 — 비밀 내용을 저장하지 않습니다. 실서비스라면 Supabase Auth 로 로그인한 사용자만 자기 행을 쓰게 바꿉니다.

## 3D 화면 (`/3d`)

`@react-three/fiber` + `three` 로 만든 제주섬 3D 지도입니다. 드래그로 돌리고(자동 회전 버튼), 휠·두 손가락으로 확대하며, 모바일에서도 열립니다(WebGL 이 없으면 안내 문구). 용량이 커서 이 페이지를 열 때만 불러옵니다.

| 3D 위에 올라가는 것 | 데이터 |
|---|---|
| 이번 주 행사 → **원뿔 핀**(분류별 색, 누르면 행사 카드·링크) | ① 제주in놀다 API |
| 오름 → 실제 위치에 솟은 **작은 봉우리와 점** | ② 비짓제주 API |
| 날씨 → 비·눈이면 **떨어지는 입자**, 흐리면 **안개** | ③ Open-Meteo API |

지형은 제주섬 모양(동서 74km × 남북 31km)과 한라산을 흉내 낸 것이고, 높이는 산이 잘 보이게 과장했습니다(실제 지형 데이터 아님).

## 주요 기능

| | |
|---|---|
| **홈** | 첫 화면 기획 의도 한 줄, 제주 풍경 사진 배경(비짓제주 제공 4장), 오늘·주말·무료·축제·지도·3D 바로가기, 여행 일정에 맞는 행사, 곧 시작 / 마감 임박 / 무료 행사, 지점별 날씨 |
| **행사 찾기** | 검색 · 기간 · 분류 · 요금 · 실내외 · 지역 · 정렬, **목록 / 달력 / 지도**. 필터가 주소창에 담겨 공유 가능 |
| **행사 상세** | 이미지, 소개, 문의, 네이버·구글 지도, 행사 기간 날씨, **주변 가볼 만한 곳**(반경 10km), 캘린더(.ics), 링크 복사 |
| **지도** | 기본은 7일 이내 행사. **관광지 함께 보기**: 행사 핀을 고르면 주변(1·3·5km) 가볼 만한 곳을 번호 핀과 목록으로 표시 |
| **지역축제** | 제주 대표 축제 18개의 **예년 개최 시기**(예: “11월 중순 ~ 12월 초순”), 월별 필터, 공식 안내 검색 링크 |
| **날씨** | 제주시·서귀포·성산·한림, 현재와 최대 16일 예보, 비 소식이 있으면 실내 행사 안내 |
| **다국어** | 한국어·English·中文·日本語 (행사 이름·소개는 원문 한국어) |
| **내 일정 / 기획·데이터** | 저장한 행사·닉네임·최근 본 행사 / `/about` 에 기획 의도와 세 API 의 실제 데이터 |

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 키를 채웁니다 (없어도 행사·날씨·지역축제·3D 는 동작)
npm run dev                  # http://localhost:5173
npm run build                # 배포용 빌드
```

`dev` 와 `preview` 는 `vite.config.js` 의 플러그인이 `api/` 서버 함수를 그대로 실행해 줘서 로컬과 배포가 같은 코드로 동작합니다. (Vercel CLI 없이 `npm run dev` 만으로 됩니다.) 환경변수를 바꾸면 개발 서버를 껐다 켜세요.

| 이름 | 용도 | 어디에 | 없으면 |
|---|---|---|---|
| `VISITJEJU_API_KEY` | 비짓제주 관광정보 | 서버만 | 관광지 부분에만 안내 문구 |
| `ANTHROPIC_API_KEY` | AI 가이드 | 서버만 | “AI 가이드가 아직 준비되지 않았어요” |
| `ANTHROPIC_MODEL` | (선택) 모델, 기본 `claude-sonnet-5-5` | 서버만 | 기본값 |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | Supabase | 브라우저(공개 값) | 이 브라우저에만 저장 |

비밀 키(`VISITJEJU_API_KEY`, `ANTHROPIC_API_KEY`)에는 **`VITE_` 를 붙이지 마세요** — 붙이면 브라우저에 노출됩니다. `.env.local` 은 git 에 올라가지 않습니다(`.gitignore`).

## 배포 (Vercel)

1. GitHub `main` 에 push 하면 자동 배포됩니다.
2. Project Settings → Environment Variables 에 위 표의 변수를 모두 입력하고 **Redeploy** (환경변수는 배포 시점에 읽힙니다).
3. `vercel.json`: 서울 지역(`icn1`), SPA 주소 재작성(`/api/` 제외), `api/chat.js` 최대 60초.
4. 제출용 고정 주소는 프로젝트 도메인(`project-alpha-ivory-34.vercel.app`)입니다. 배포마다 바뀌는 미리보기 주소는 로그인 화면이 뜰 수 있어요.

## 비용·보안

- AI 가이드: 접속자별 요청 제한(10분에 20회, 서버 한 대 안의 간이 제한), 질문 600자 · 대화 12개 · 답변 5,000토큰 · 도구 왕복 6회 상한, 창을 닫으면 호출 중단. **Anthropic 콘솔의 월 사용 한도**를 꼭 설정하세요.
- 키는 서버 환경변수에만 있고 코드·GitHub 에 없습니다. 답변은 HTML 이 아닌 React 요소로만 그리고 링크는 이 사이트 주소와 http(s) 만 허용합니다. 브라우저가 보낸 대화는 서버에서 역할·길이·개수를 다시 걸러 씁니다.

## 데이터 정리 메모

- **행사 API 명세와 다른 점**: CORS 없음 → 서버 중계, 상세 응답 키가 `event` 가 아니라 `evnet`(오타), 좌표가 0 이거나 위경도가 뒤바뀐 데이터는 제주 범위일 때만 사용, `intro` 는 HTML/평문 혼재, 날짜는 한국시간 `YYYY-MM-DD`.
- **비짓제주 정리 규칙**: 약 2,500건 중 지도·주변 추천에는 “관광지” 분류만 쓰고, 그 안의 생활 서비스 업소(동물병원·헬스장·렌터카 등)와 상업 업체(다이빙·서핑·승마·공방 수업·스파·골프장)는 뺍니다(`api/_unrelated.js`, `api/_exclude.js`). 좌표가 비어 제주시청 기본 좌표로 채워진 4곳도 뺍니다. 태그는 언어마다 번역돼 있어 규칙도 언어별로 둡니다.
- **네이버 지도 링크**는 `시 + 이름`(예: “서귀포시 생약누리”) 으로 검색합니다. 영어·중국어·일본어는 좌표로 구글 지도를 엽니다.
- **지역축제 목록**(`src/data/festivalList.js`)은 웹에서 확인한 과거 개최 기록으로 **시기만** 적었고(`basis` 에 근거), 확인하지 못한 축제는 넣지 않았습니다.
- 관광지 응답은 CDN 에 하루 캐시됩니다. 제외 목록을 고쳐도 최대 하루 뒤에 반영되고, 주소 끝에 `&v=숫자` 를 바꿔 붙이면 새 응답을 바로 볼 수 있어요.

## 구조

```
api/                          서버 함수 (Vercel). _ 로 시작하는 파일은 함수가 아니라 공용 코드
  event.js · visitjeju.js · chat.js      행사 중계 / 관광지 / AI 가이드
  _tools.js                              에이전트 도구 5개
  _visitjeju.js · _unrelated.js · _exclude.js   비짓제주 호출·정리 / 제외 규칙·목록
supabase/schema.sql           Supabase 테이블 만들기
src/
  main.jsx · router.jsx       시작 / 메뉴·주소 (지도·3D 는 열 때만 불러옴)
  api/                        events · weather · places  외부 호출 + 응답 정리
  store/                      useCultureStore(행사·관광지·저장·방문) · useChatStore(AI 대화)
  lib/                        supabase · cloud(Supabase 저장·조회) · date · ics · geo · festival · terrain(3D 지형)
  i18n/                       index(언어 상태·t/tr) · messages · messages.extra(4개 언어 문구)
  data/                       festivalList(지역축제 데이터) · festivals(화면용 함수)
  layouts/RootLayout.jsx      상단바 · 언어 선택 · 모바일 탭바 · 푸터 · AI 가이드
  components/                 EventCard · CalendarView · MapView · Jeju3D · Weather · NearbyPlaces · HeroPhotos · ChatWidget · common
  pages/                      Home · Events · EventDetail · MapPage · Festivals · Jeju3DPage · About · Saved · NotFound
  styles/theme.css            전체 스타일
```

새 페이지: ① `pages/` 에 파일 ② 메뉴에 넣으려면 `router.jsx` 의 `NAV_ITEMS` 에 한 줄 ③ `routes` 에 한 줄.
