import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventCard from '../components/EventCard'
import HeroPhotos from '../components/HeroPhotos'
import { WeatherPanel } from '../components/Weather'
import { ErrorBox, Skeletons, catHue, useEvents } from '../components/common'
import { categoryCounts, isFestival } from '../lib/festival'
import { addDays, diffDays, overlaps, presetRange, todayKey } from '../lib/date'
import { catLabel, useT } from '../i18n'

export default function Home() {
  const { t } = useT()
  const { events, status, error, retry } = useEvents()
  const navigate = useNavigate()
  const today = todayKey()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDays(today, 2))

  const data = useMemo(() => {
    const [wsS, wsE] = presetRange('weekend', today)
    const live = events.filter((e) => overlaps(e, today, today))
    return {
      nToday: live.length,
      nWeekend: events.filter((e) => overlaps(e, wsS, wsE)).length,
      nFree: events.filter((e) => e.payTag === 'FREE').length,
      nFest: events.filter(isFestival).length,
      soon: events.filter((e) => e.startKey > today && diffDays(today, e.startKey) <= 7)
        .sort((a, b) => a.startKey.localeCompare(b.startKey)).slice(0, 6),
      ending: live.filter((e) => e.startKey < today && diffDays(today, e.endKey) <= 7)
        .sort((a, b) => a.endKey.localeCompare(b.endKey)).slice(0, 6),
      freeNow: live.filter((e) => e.payTag === 'FREE').slice(0, 6),
      cats: categoryCounts(events),
    }
  }, [events, today])

  const goTrip = (e) => {
    e.preventDefault()
    navigate(`/events?when=custom&from=${from}&to=${to < from ? from : to}`)
  }
  const n = (v) => (status === 'ready' ? t('common.count', { n: v }) : '')

  return (
    <>
      <section className="hero">
        <HeroPhotos />
        <div className="hero-copy">
          <p className="kicker">{t('home.kicker')}</p>
          <h1>{t('home.h1a')}<br /><em>{t('home.h1b')}</em></h1>
          <p className="sub">{t('home.sub')}</p>
          <div className="hero-actions">
            <Link to="/events?when=today" className="btn primary">{t('home.today')} {n(data.nToday)}</Link>
            <Link to="/events?when=weekend" className="btn">{t('home.weekend')} {n(data.nWeekend)}</Link>
            <Link to="/events?pay=FREE" className="btn">{t('home.free')} {n(data.nFree)}</Link>
            <Link to="/events?cat=%EC%B6%95%EC%A0%9C" className="btn">{t('home.fest')} {n(data.nFest)}</Link>
            <Link to="/map" className="btn">{t('home.map')}</Link>
          </div>
        </div>

        <aside className="trip">
          <h2>{t('trip.title')}</h2>
          <p className="muted">{t('trip.desc')}</p>
          <form onSubmit={goTrip}>
            <label>{t('trip.arrive')} <input type="date" value={from} min={today} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value) }} required /></label>
            <label>{t('trip.depart')} <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required /></label>
            <button type="submit" className="btn primary">{t('trip.go')}</button>
          </form>
          <div className="trip-alt">
            <span>{t('trip.local')}</span>
            <Link to="/events?when=weekend&pay=FREE">{t('trip.weekendFree')}</Link>
            <Link to="/events?region=제주시">{t('region.제주시')}</Link>
            <Link to="/events?region=서귀포시">{t('region.서귀포시')}</Link>
          </div>
        </aside>
      </section>

      <WeatherPanel />

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}

      {status === 'ready' && (
        <>
          <section className="catrow" aria-label={t('home.byCat')}>
            {data.cats.map(([name, count]) => (
              <Link key={name} to={`/events?cat=${encodeURIComponent(name)}`} className="cattile" style={{ '--h': catHue(name) }}>
                <b>{catLabel(name)}</b><span>{count}</span>
              </Link>
            ))}
          </section>

          <Rail title={t('rail.soon')} sub={t('rail.soonSub')} list={data.soon} more="/events?when=week&sort=soon" />
          <Rail title={t('rail.ending')} sub={t('rail.endingSub')} list={data.ending} more="/events?sort=end" />
          <Rail title={t('rail.free')} sub={t('rail.freeSub')} list={data.freeNow} more="/events?when=today&pay=FREE" />
        </>
      )}
    </>
  )
}

function Rail({ title, sub, list, more }) {
  const { t } = useT()
  if (list.length === 0) return null
  return (
    <section className="rail">
      <div className="rail-head">
        <div><h2>{title}</h2><p className="muted">{sub}</p></div>
        <Link to={more} className="more">{t('common.more')}</Link>
      </div>
      <div className="grid">{list.map((e) => <EventCard key={e.seq} event={e} />)}</div>
    </section>
  )
}
