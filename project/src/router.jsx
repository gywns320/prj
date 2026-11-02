import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Saved from './pages/Saved'
import NotFound from './pages/NotFound'

// 페이지를 추가할 때: ① pages/ 에 파일 ② NAV_ITEMS 에 한 줄 ③ routes 에 한 줄
export const NAV_ITEMS = [
  { to: '/', label: 'nav.home', glyph: '⌂' }, // label 은 문구 키 — 화면에서 t(label) 로 번역
  { to: '/events', label: 'nav.events', glyph: '⌕' },
  { to: '/map', label: 'nav.map', glyph: '◎' },
  { to: '/saved', label: 'nav.saved', glyph: '★' },
]

// 새로 배포되면 옛 화면이 찾던 조각 파일(MapPage-해시.js)이 사라져 불러오기가 실패합니다.
// 그때 "페이지 없음" 대신 한 번만 새로고침해서 최신 화면을 받아옵니다.
async function loadMapPage() {
  try {
    const Component = (await import('./pages/MapPage')).default
    try { sessionStorage.removeItem('map-reloaded') } catch { /* 저장소를 못 써도 괜찮음 */ }
    return { Component }
  } catch (err) {
    let reloaded = true
    try { reloaded = sessionStorage.getItem('map-reloaded') === '1'; sessionStorage.setItem('map-reloaded', '1') } catch { /* 무한 새로고침 방지 */ }
    if (!reloaded) { window.location.reload(); return new Promise(() => {}) }
    throw err
  }
}

export const router =createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'events', element: <Events /> },
      { path: 'events/:seq', element: <EventDetail /> },
      // 지도(Leaflet)는 용량이 커서 이 페이지를 열 때만 불러옵니다
      { path: 'map', lazy: loadMapPage },
      { path: 'saved', element: <Saved /> },
      { path: '*', element: <NotFound inline /> },
    ],
  },
])
