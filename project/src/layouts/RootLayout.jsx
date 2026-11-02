import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { NAV_ITEMS } from '../router'
import { useCultureStore } from '../store/useCultureStore'

export default function RootLayout() {
  const toasts = useCultureStore((s) => s.toasts)
  const savedCount = useCultureStore((s) => s.saved.length)

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="15" fill="currentColor" /><path d="M6 21 Q12 12 17 18 Q21 13 26 21Z" fill="var(--bg)" /><circle cx="22" cy="10" r="2.6" fill="var(--bg)" /></svg>
          </span>
          제주 문화달력
        </NavLink>
        <nav className="topnav" aria-label="주 메뉴">
          {NAV_ITEMS.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="navlink">
              {n.label}{n.to === '/saved' && savedCount > 0 && <i className="count">{savedCount}</i>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page"><Outlet /></main>

      <footer className="footer">
        행사 정보 출처: 제주특별자치도 전시문화행사정보 OpenAPI(제주in놀다 · 제주문화예술재단). 일정은 변경될 수 있으니 방문 전 문의처로 확인하세요.
      </footer>

      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className="tab">
            <span className="tab-glyph" aria-hidden="true">{n.glyph}</span>{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.message}</div>)}
      </div>
      <ScrollRestoration />
    </div>
  )
}
