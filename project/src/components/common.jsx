import { useEffect } from 'react'
import { useCultureStore } from '../store/useCultureStore'
import { useT } from '../i18n'

// 카테고리마다 고정된 색상(hue) — 카드·칩·지도 핀이 같은 색을 씁니다
const HUES = { 전시회: 265, 콘서트: 340, 연주회: 15, 연극: 190, 뮤지컬: 305, 무용: 155, 전통공연: 35, 축제: 50, '교육/체험': 210, 기타: 230 }
export const catHue = (name) => HUES[name] ?? 230

export function PageHead({ kicker, title, sub, children }) {
  return (
    <header className="pagehead">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children}
    </header>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">◌</div>
      <p><b>{title}</b></p>
      {children && <div className="muted">{children}</div>}
    </div>
  )
}

export function Skeletons({ n = 6 }) {
  const { t } = useT()
  return (
    <div className="grid" aria-busy="true" aria-label={t('common.loadingAria')}>
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" />)}
    </div>
  )
}

// message 는 문구 키('err.net' 등)이거나 서버가 준 문장 — t() 가 둘 다 알맞게 처리합니다
export function ErrorBox({ message, onRetry }) {
  const { t } = useT()
  return (
    <div className="errorbox" role="alert">
      <b>{t('common.errorTitle')}</b>
      <p>{t(message)}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  )
}

// 행사 목록을 보여주는 모든 페이지의 공통 진입점: 불러오기·로딩·에러를 한 번에 처리
export function useEvents() {
  const events = useCultureStore((s) => s.events)
  const status = useCultureStore((s) => s.status)
  const error = useCultureStore((s) => s.error)
  const loadEvents = useCultureStore((s) => s.loadEvents)
  useEffect(() => { loadEvents() }, [loadEvents])
  return { events, status, error, retry: () => loadEvents(true) }
}
