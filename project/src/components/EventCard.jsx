import { useState } from 'react'
import { Link } from 'react-router-dom'
import { catHue } from './common'
import { eventStatus, fmtRange } from '../lib/date'
import { useCultureStore } from '../store/useCultureStore'

// 대표 이미지 — 없거나 불러오지 못하면 카테고리 색의 자리표시자
export function Cover({ src, category, alt = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="cover ph" style={{ '--h': catHue(category) }} aria-hidden="true">
        <span>{category.slice(0, 2)}</span>
      </div>
    )
  }
  return <img className="cover" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

// 행사 한 건 — 홈·찾기·달력·저장 목록에서 재사용
export default function EventCard({ event: ev, compact = false }) {
  const saved = useCultureStore((s) => s.saved.includes(ev.seq))
  const toggleSaved = useCultureStore((s) => s.toggleSaved)
  const st = eventStatus(ev)

  return (
    <article className={`ecard ${compact ? 'compact' : ''}`} style={{ '--h': catHue(ev.category) }}>
      <Link to={`/events/${ev.seq}`} className="ecard-link">
        <div className="ecard-media">
          <Cover src={ev.thumb} category={ev.category} alt={`${ev.name} 포스터`} />
          <span className={`badge st-${st.kind}`}>{st.label}</span>
        </div>
        <div className="ecard-body">
          <div className="ecard-tags">
            <span className="cat">{ev.category}</span>
            <span className={`pay ${ev.payTag === 'FREE' ? 'free' : ''}`}>{ev.pay}</span>
            {ev.loc && ev.loc !== '실내' && <span className="loc">{ev.loc}</span>}
          </div>
          <h3>{ev.name}</h3>
          <p className="ecard-meta">{fmtRange(ev.startKey, ev.endKey)}</p>
          <p className="ecard-meta place">{[ev.place, ev.regionName].filter(Boolean).join(' · ') || '장소 미정'}</p>
        </div>
      </Link>
      <button
        type="button" className={`save ${saved ? 'on' : ''}`} aria-pressed={saved}
        aria-label={saved ? `${ev.name} 저장 해제` : `${ev.name} 저장`}
        onClick={() => toggleSaved(ev.seq)}
      >
        {saved ? '★' : '☆'}
      </button>
    </article>
  )
}
