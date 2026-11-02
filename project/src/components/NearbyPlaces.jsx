import { useEffect, useMemo, useState } from 'react'
import { Cover } from './EventCard'
import { distanceKm, fmtKm } from '../lib/geo'
import { useCultureStore } from '../store/useCultureStore'

const RADIUS_KM = 10
const PAGE = 6

// 행사 상세 — 행사 장소 반경 10km 안의 관광지·맛집 등을 가까운 순으로 보여줍니다 (비짓제주 관광정보)
export default function NearbyPlaces({ event: ev }) {
  const places = useCultureStore((s) => s.places)
  const status = useCultureStore((s) => s.placesStatus)
  const error = useCultureStore((s) => s.placesError)
  const loadPlaces = useCultureStore((s) => s.loadPlaces)
  const [cat, setCat] = useState('')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => { if (ev.pos) loadPlaces() }, [ev.pos, loadPlaces])

  const nearby = useMemo(() => {
    if (!ev.pos) return []
    return places
      .map((p) => ({ ...p, km: distanceKm(ev.pos, p.pos) }))
      .filter((p) => p.km <= RADIUS_KM)
      .sort((a, b) => a.km - b.km)
  }, [places, ev.pos])

  const cats = useMemo(() => {
    const m = {}
    nearby.forEach((p) => { m[p.category] = (m[p.category] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [nearby])

  const list = cat ? nearby.filter((p) => p.category === cat) : nearby

  return (
    <section className="card">
      <h2>주변 가볼 만한 곳 <small className="muted">행사 장소 반경 {RADIUS_KM}km · 비짓제주</small></h2>

      {!ev.pos && <p className="muted">이 행사는 위치 정보가 없어 주변 장소를 찾을 수 없어요.</p>}
      {ev.pos && (status === 'loading' || status === 'idle') && <div className="skeleton wsk" aria-busy="true" />}
      {ev.pos && status === 'error' && (
        <p className="muted">주변 장소를 불러오지 못했어요. ({error}) <button type="button" className="linkbtn" onClick={() => loadPlaces(true)}>다시 시도</button></p>
      )}

      {ev.pos && status === 'ready' && (nearby.length === 0
        ? <p className="muted">반경 {RADIUS_KM}km 안에 등록된 장소가 없어요.</p>
        : (
          <>
            <div className="chiprow" role="group" aria-label="장소 분류">
              <button type="button" className={`chip ${cat === '' ? 'on' : ''}`} onClick={() => { setCat(''); setLimit(PAGE) }}>전체 {nearby.length}</button>
              {cats.map(([c, n]) => (
                <button key={c} type="button" className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => { setCat(cat === c ? '' : c); setLimit(PAGE) }}>{c} {n}</button>
              ))}
            </div>
            <div className="places">{list.slice(0, limit).map((p) => <PlaceCard key={p.id} place={p} />)}</div>
            {list.length > limit && <div className="center"><button type="button" className="btn small" onClick={() => setLimit(limit + PAGE)}>더 보기 ({list.length - limit}곳)</button></div>}
          </>
        ))}
    </section>
  )
}

function PlaceCard({ place: p }) {
  const q = encodeURIComponent(`${p.title} ${p.region}`.trim())
  return (
    <article className="pcard">
      <Cover src={p.thumb} category={p.category} alt={p.title} />
      <div className="pcard-body">
        <div className="ecard-tags"><span className="cat">{p.category}</span><span>{fmtKm(p.km)}</span></div>
        <h3>{p.title}</h3>
        {p.intro && <p className="pcard-intro">{p.intro}</p>}
        {p.tags.length > 0 && <p className="pcard-tags">{p.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}</p>}
        <a className="more" href={`https://map.naver.com/p/search/${q}`} target="_blank" rel="noopener noreferrer">지도 ↗</a>
      </div>
    </article>
  )
}
