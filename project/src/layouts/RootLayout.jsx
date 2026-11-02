import { useEffect } from 'react'
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import ChatWidget from '../components/ChatWidget'
import { NAV_ITEMS } from '../router'
import { LANGS, useDocumentLang, useLangStore, useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'

export default function RootLayout() {
  const { t, lang } = useT()
  const setLang = useLangStore((s) => s.setLang)
  const toasts = useCultureStore((s) => s.toasts)
  const savedCount = useCultureStore((s) => s.saved.length)
  useDocumentLang()
  const syncSaved = useCultureStore((s) => s.syncSaved)
  useEffect(() => { syncSaved() }, [syncSaved]) // 저장한 행사를 Supabase 에서 불러옴 (연결돼 있을 때)

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="15" fill="currentColor" /><path d="M6 21 Q12 12 17 18 Q21 13 26 21Z" fill="var(--bg)" /><circle cx="22" cy="10" r="2.6" fill="var(--bg)" /></svg>
          </span>
          {t('brand')}
        </NavLink>
        <nav className="topnav" aria-label={t('nav.main')}>
          {NAV_ITEMS.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="navlink">
              {t(n.label)}{n.to === '/saved' && savedCount > 0 && <i className="count">{savedCount}</i>}
            </NavLink>
          ))}
        </nav>
        <label className="langsel">
          <span aria-hidden="true">🌐</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('lang.label')}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </header>

      {/* key: 언어를 바꾸면 화면을 새로 그려서 모든 글자가 한 번에 바뀝니다 */}
      <main className="page" key={lang}><Outlet /></main>

      <footer className="footer">
        {t('footer')}
        <p><NavLink to="/about">{t('footer.about')}</NavLink></p>
      </footer>

      <nav className="tabbar" aria-label={t('nav.bottom')}>
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className="tab">
            <span className="tab-glyph" aria-hidden="true">{n.glyph}</span>{t(n.label)}
          </NavLink>
        ))}
      </nav>

      <div className="toasts" aria-live="polite">
        {toasts.map((x) => <div key={x.id} className="toast">{x.message}</div>)}
      </div>
      <ChatWidget />
      <ScrollRestoration />
    </div>
  )
}
