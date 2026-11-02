import { useEffect } from 'react'
import { useCultureStore } from '../store/useCultureStore'

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
  return (
    <div className="grid" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" />)}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="errorbox" role="alert">
      <b>행사 정보를 불러오지 못했어요</b>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>다시 시도</button>}
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
