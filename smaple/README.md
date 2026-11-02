# 제주 IP 프로젝트 스타터 (Vite + React + Router + Zustand + Bootstrap + Supabase)

## 실행
```bash
npm install
cp .env.example .env.local     # 값 채우기
npm run dev                    # 화면만 (http://localhost:5173)
vercel dev                     # 화면 + /api 서버 함수 (http://localhost:3000)  ← STEP 1부터 이걸로
```

## 구조
```
api/        Vercel 서버 함수 (/api/파일이름) — 비밀 키는 여기서만
server/     공공데이터 API 호출 함수 (api/ 와 에이전트가 함께 사용)
src/
  main.jsx          디자인 테마 선택 + 라우터 시작
  router.jsx        메뉴(NAV_ITEMS) + 주소별 페이지
  layouts/          공통 틀 (메뉴·푸터·알림)
  store/            Zustand 전역 상태 (닉네임·알림·즐겨찾기)
  lib/supabase.js   Supabase 연결
  api/client.js     화면 → /api 호출 함수
  components/       재사용 컴포넌트 (ItemCard, PageHeader, Status)
  pages/            페이지
```

## 디자인 바꾸기
`src/main.jsx` 의 `bootswatch/dist/minty/...` 에서 `minty` 를 `lux`, `flatly`, `cosmo`, `sketchy` 등으로 바꾸면 전체 디자인이 바뀝니다. (https://bootswatch.com)

※ Places·Heritage 는 샘플입니다. 주제는 각자 정해서 바꾸세요.
