import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEvent } from '../api/events'
import { Cover } from '../components/EventCard'
import { EventWeather } from '../components/Weather'
import NearbyPlaces from '../components/NearbyPlaces'
import { ErrorBox, catHue } from '../components/common'
import { downloadIcs } from '../lib/ics'
import { eventStatus, fmtRange } from '../lib/date'
import { useCultureStore } from '../store/useCultureStore'
import NotFound from './NotFound'

export default function EventDetail() {
  const { seq: seqParam } = useParams()
  const seq = Number(seqParam)
  const fromList = useCultureStore((s) => s.events.find((e) => e.seq === seq))
  const saved = useCultureStore((s) => s.saved.includes(seq))
  const toggleSaved = useCultureStore((s) => s.toggleSaved)
  const toast = useCultureStore((s) => s.toast)

  // 목록에서 이미 받은 정보로 먼저 그리고, 상세 API 로 이미지·전체 소개를 채웁니다
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)
  const [shot, setShot] = useState(0)

  useEffect(() => {
    if (!Number.isInteger(seq)) return
    let alive = true
    setError(''); setShot(0)
    fetchEvent(seq)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [seq, tries])

  if (!Number.isInteger(seq)) return <NotFound inline />
  const ev = detail?.seq === seq ? detail : fromList
  if (!ev) return error ? <ErrorBox message={error} onRetry={() => setTries(tries + 1)} /> : <p className="muted center pad">불러오는 중…</p>

  const st = eventStatus(ev)
  const images = detail?.seq === seq && detail.images.length ? detail.images : ev.cover ? [{ src: ev.cover, thumb: ev.thumb, name: ev.name }] : []
  const mapQuery = encodeURIComponent(ev.addr || ev.place)
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); toast('링크를 복사했어요') }
    catch { toast('주소창의 링크를 복사해 주세요') }
  }

  return (
    <article style={{ '--h': catHue(ev.category) }}>
      <Link to="/events" className="back">← 행사 목록</Link>

      <div className="detail">
        <div className="gallery">
          <Cover src={images[shot]?.src} category={ev.category} alt={`${ev.name} 포스터`} />
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((im, i) => (
                <button key={im.src} type="button" className={i === shot ? 'on' : ''} onClick={() => setShot(i)} aria-label={`이미지 ${i + 1}`}>
                  <img src={im.thumb} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="info">
          <div className="ecard-tags">
            <span className="cat">{ev.category}</span>
            <span className={`pay ${ev.payTag === 'FREE' ? 'free' : ''}`}>{ev.pay}</span>
            {ev.loc && <span className="loc">{ev.loc}</span>}
            <span className={`badge inline st-${st.kind}`}>{st.label}</span>
          </div>
          <h1>{ev.name}</h1>

          <dl className="facts">
            <div><dt>기간</dt><dd>{fmtRange(ev.startKey, ev.endKey)}</dd></div>
            {ev.time && <div><dt>시간</dt><dd>{ev.time}</dd></div>}
            <div><dt>장소</dt><dd>{[ev.place, ev.addr].filter(Boolean).join(' · ') || '정보 없음'}</dd></div>
            {ev.tel && <div><dt>문의</dt><dd>{/^[\d\s()+-]+$/.test(ev.tel) ? <a href={`tel:${ev.tel.replace(/[^\d+]/g, '')}`}>{ev.tel}</a> : ev.tel}</dd></div>}
            {ev.host && <div><dt>주최</dt><dd>{ev.host}</dd></div>}
          </dl>

          <div className="actions">
            <button type="button" className={`btn ${saved ? 'primary' : ''}`} onClick={() => toggleSaved(seq)}>{saved ? '★ 저장됨' : '☆ 내 일정에 저장'}</button>
            <button type="button" className="btn" onClick={() => downloadIcs([ev], `jeju-event-${seq}.ics`)}>캘린더에 추가</button>
            <button type="button" className="btn" onClick={share}>링크 복사</button>
          </div>
          <div className="actions links">
            {ev.homepage && <a className="btn ghost" href={ev.homepage} target="_blank" rel="noopener noreferrer">홈페이지 ↗</a>}
            {ev.link && ev.link !== ev.homepage && <a className="btn ghost" href={ev.link} target="_blank" rel="noopener noreferrer">상세 안내 ↗</a>}
            {mapQuery && <a className="btn ghost" href={`https://map.naver.com/p/search/${mapQuery}`} target="_blank" rel="noopener noreferrer">네이버 지도 ↗</a>}
            {mapQuery && <a className="btn ghost" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">구글 지도 ↗</a>}
          </div>
        </div>
      </div>

      <EventWeather event={ev} />
      <NearbyPlaces event={ev} />

      <section className="card">
        <h2>행사 소개</h2>
        {ev.intro ? <p className="intro">{ev.intro}</p> : <p className="muted">등록된 소개가 없어요. 문의처로 확인해 주세요.</p>}
        {error && <p className="muted">상세 정보를 모두 불러오지 못했어요. ({error})</p>}
      </section>
    </article>
  )
}
