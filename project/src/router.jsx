import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Saved from './pages/Saved'
import NotFound from './pages/NotFound'

// 페이지를 추가할 때: ① pages/ 에 파일 ② NAV_ITEMS 에 한 줄 ③ routes 에 한 줄
export const NAV_ITEMS = [
  { to: '/', label: '홈', glyph: '⌂' },
  { to: '/events', label: '행사 찾기', glyph: '⌕' },
  { to: '/map', label: '지도', glyph: '◎' },
  { to: '/saved', label: '내 일정', glyph: '★' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'events', element: <Events /> },
      { path: 'events/:seq', element: <EventDetail /> },
      // 지도(Leaflet)는 용량이 커서 이 페이지를 열 때만 불러옵니다
      { path: 'map', lazy: async () => ({ Component: (await import('./pages/MapPage')).default }) },
      { path: 'saved', element: <Saved /> },
      { path: '*', element: <NotFound inline /> },
    ],
  },
])
