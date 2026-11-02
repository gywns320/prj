import { useState } from 'react'
import { Link } from 'react-router-dom'
import { catHue } from './common'
import { eventStatus, fmtRange } from '../lib/date'
import { catLabel, locLabel, payLabel, regionLabel, useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'

// 자리표시자에 넣는 짧은 글자 — 한자·한글은 2자, 알파벳은 3자
const short = (s) => (/^[\x00-\x7f]/.test(s) ? s.slice(0, 3) : s.slice(0, 2))

// 대표 이미지 — 없거나 불러오지 못하면 카테고리 색의 자리표시자
export function Cover({ src, category, alt = '' }) {
  const [failed, setFailed] = useState(false)
  useT() // 언어가 바뀌면 자리표시자 글자도 다시 그림
  if (!src || failed) {
    return (
      <div className="cover ph" style={{ '--h': catHue(category) }} aria-hidden="true">
        <span>{short(catLabel(category))}</span>
      </div>
    )
  }
  return <img className="cover" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

// 행사 한 건 — 홈·찾기·달력·저장 목록에서 재사용
export default function EventCard({ event: ev, compact = false }) {
  const { t } = useT()
  const saved = useCultureStore((s) => s.saved.includes(ev.seq))
  const toggleSaved = useCultureStore((s) => s.toggleSaved)
  const st = eventStatus(ev)

  return (
    <article className={`ecard ${compact ? 'compact' : ''}`} style={{ '--h': catHue(ev.category) }}>
      <Link to={`/events/${ev.seq}`} className="ecard-link">
        <div className="ecard-media">
          <Cover src={ev.thumb} category={ev.category} alt={t('card.poster', { name: ev.name })} />
          <span className={`badge st-${st.kind}`}>{st.label}</span>
        </div>
        <div className="ecard-body">
          <div className="ecard-tags">
            <span className="cat">{catLabel(ev.category)}</span>
            <span className={`pay ${ev.payTag === 'FREE' ? 'free' : ''}`}>{payLabel(ev)}</span>
            {ev.loc && ev.locTag !== 'IN' && <span className="loc">{locLabel(ev)}</span>}
          </div>
          <h3>{ev.name}</h3>
          <p className="ecard-meta">{fmtRange(ev.startKey, ev.endKey)}</p>
          <p className="ecard-meta place">{[ev.place, regionLabel(ev.regionName)].filter(Boolean).join(' · ') || t('card.noPlace')}</p>
        </div>
      </Link>
      <button
        type="button" className={`save ${saved ? 'on' : ''}`} aria-pressed={saved}
        aria-label={t(saved ? 'card.unsave' : 'card.save', { name: ev.name })}
        onClick={() => toggleSaved(ev.seq)}
      >
        {saved ? '★' : '☆'}
      </button>
    </article>
  )
}
