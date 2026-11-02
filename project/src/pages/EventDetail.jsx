import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEvent } from '../api/events'
import { Cover } from '../components/EventCard'
import { EventWeather } from '../components/Weather'
import NearbyPlaces from '../components/NearbyPlaces'
import { ErrorBox, catHue } from '../components/common'
import { downloadIcs } from '../lib/ics'
import { eventStatus, fmtRange } from '../lib/date'
import { catLabel, locLabel, payLabel, useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'
import NotFound from './NotFound'

export default function EventDetail() {
  const { t } = useT()
  const { seq: seqParam } = useParams()
  const seq = Number(seqParam)
  const fromList = useCultureStore((s) => s.events.find((e) => e.seq === seq))
  const saved = useCultureStore((s) => s.saved.includes(seq))
  const toggleSaved = useCultureStore((s) => s.toggleSaved)
  const toast = useCultureStore((s) => s.toast)
  const recordVisit = useCultureStore((s) => s.recordVisit)

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

  // 행사 이름을 알게 되면 방문 기록을 남김 (Supabase visits 테이블, 같은 행사는 30분에 한 번만)
  const knownName = (detail?.seq === seq ? detail : fromList)?.name
  useEffect(() => { if (Number.isInteger(seq) && knownName) recordVisit(seq, knownName) }, [seq, knownName, recordVisit])

  if (!Number.isInteger(seq)) return <NotFound inline />
  const ev = detail?.seq === seq ? detail : fromList
  if (!ev) return error ? <ErrorBox message={error} onRetry={() => setTries(tries + 1)} /> : <p className="muted center pad">{t('common.loading')}</p>

  const st = eventStatus(ev)
  const images = detail?.seq === seq && detail.images.length ? detail.images : ev.cover ? [{ src: ev.cover, thumb: ev.thumb, name: ev.name }] : []
  const mapQuery = encodeURIComponent(ev.addr || ev.place)
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t('d.copied')) }
    catch { toast(t('d.copyFail')) }
  }

  return (
    <article style={{ '--h': catHue(ev.category) }}>
      <Link to="/events" className="back">{t('d.back')}</Link>

      <div className="detail">
        <div className="gallery">
          <Cover src={images[shot]?.src} category={ev.category} alt={t('card.poster', { name: ev.name })} />
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((im, i) => (
                <button key={im.src} type="button" className={i === shot ? 'on' : ''} onClick={() => setShot(i)} aria-label={t('d.image', { n: i + 1 })}>
                  <img src={im.thumb} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="info">
          <div className="ecard-tags">
            <span className="cat">{catLabel(ev.category)}</span>
            <span className={`pay ${ev.payTag === 'FREE' ? 'free' : ''}`}>{payLabel(ev)}</span>
            {ev.loc && <span className="loc">{locLabel(ev)}</span>}
            <span className={`badge inline st-${st.kind}`}>{st.label}</span>
          </div>
          <h1>{ev.name}</h1>

          <dl className="facts">
            <div><dt>{t('d.period')}</dt><dd>{fmtRange(ev.startKey, ev.endKey)}</dd></div>
            {ev.time && <div><dt>{t('d.time')}</dt><dd>{ev.time}</dd></div>}
            <div><dt>{t('d.place')}</dt><dd>{[ev.place, ev.addr].filter(Boolean).join(' · ') || t('d.noInfo')}</dd></div>
            {ev.tel && <div><dt>{t('d.contact')}</dt><dd>{/^[\d\s()+-]+$/.test(ev.tel) ? <a href={`tel:${ev.tel.replace(/[^\d+]/g, '')}`}>{ev.tel}</a> : ev.tel}</dd></div>}
            {ev.host && <div><dt>{t('d.host')}</dt><dd>{ev.host}</dd></div>}
          </dl>

          <div className="actions">
            <button type="button" className={`btn ${saved ? 'primary' : ''}`} onClick={() => toggleSaved(seq)}>{saved ? t('d.saved') : t('d.save')}</button>
            <button type="button" className="btn" onClick={() => downloadIcs([ev], `jeju-event-${seq}.ics`)}>{t('d.ics')}</button>
            <button type="button" className="btn" onClick={share}>{t('d.share')}</button>
          </div>
          <div className="actions links">
            {ev.homepage && <a className="btn ghost" href={ev.homepage} target="_blank" rel="noopener noreferrer">{t('d.home')}</a>}
            {ev.link && ev.link !== ev.homepage && <a className="btn ghost" href={ev.link} target="_blank" rel="noopener noreferrer">{t('d.link')}</a>}
            {mapQuery && <a className="btn ghost" href={`https://map.naver.com/p/search/${mapQuery}`} target="_blank" rel="noopener noreferrer">{t('d.naver')}</a>}
            {mapQuery && <a className="btn ghost" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">{t('d.google')}</a>}
          </div>
        </div>
      </div>

      <EventWeather event={ev} />
      <NearbyPlaces event={ev} />

      <section className="card">
        <h2>{t('d.intro')}</h2>
        {ev.intro ? <p className="intro">{ev.intro}</p> : <p className="muted">{t('d.noIntro')}</p>}
        {error && <p className="muted">{t('d.partial', { e: t(error) })}</p>}
      </section>
    </article>
  )
}
