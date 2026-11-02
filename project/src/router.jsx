import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Festivals from './pages/Festivals'
import About from './pages/About'
import Saved from './pages/Saved'
import NotFound from './pages/NotFound'

// 페이지를 추가할 때: ① pages/ 에 파일 ② NAV_ITEMS 에 한 줄 ③ routes 에 한 줄
export const NAV_ITEMS = [
  { to: '/', label: 'nav.home', glyph: '⌂' }, // label 은 문구 키 — 화면에서 t(label) 로 번역
  { to: '/events', label: 'nav.events', glyph: '⌕' },
  { to: '/map', label: 'nav.map', glyph: '◎' },
  { to: '/festivals', label: 'nav.festivals', glyph: '✦' },
  { to: '/saved', label: 'nav.saved', glyph: '★' },
]

// 용량이 큰 페이지(지도·3D)는 열 때만 불러옵니다.
// 새로 배포되면 옛 화면이 찾던 조각 파일(MapPage-해시.js)이 사라져 불러오기가 실패하는데,
// 그때 "페이지 없음" 대신 한 번만 새로고침해서 최신 화면을 받아옵니다.
const lazyPage = (key, load) => async () => {
  try {
    const Component = (await load()).default
    try { sessionStorage.removeItem(key) } catch { /* 저장소를 못 써도 괜찮음 */ }
    return { Component }
  } catch (err) {
    let reloaded = true
    try { reloaded = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1') } catch { /* 무한 새로고침 방지 */ }
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
      { path: 'map', lazy: lazyPage('map-reloaded', () => import('./pages/MapPage')) },
      { path: '3d', lazy: lazyPage('3d-reloaded', () => import('./pages/Jeju3DPage')) },
      { path: 'about', element: <About /> },
      { path: 'festivals', element: <Festivals /> },
      { path: 'saved', element: <Saved /> },
      { path: '*', element: <NotFound inline /> },
    ],
  },
])
