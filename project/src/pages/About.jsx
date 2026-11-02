import { useEffect, useState } from 'react'
import { PageHead, useEvents } from '../components/common'
import { PLACES, describe, fetchForecast } from '../api/weather'
import { isSupabaseReady } from '../lib/supabase'
import { useT } from '../i18n'
import { useChatStore } from '../store/useChatStore'
import { useCultureStore } from '../store/useCultureStore'
import { Link } from 'react-router-dom'

// 기획 의도와 사용한 공공데이터 API — 아래 숫자·목록은 지금 실제로 불러온 값이라, 각 API 가 살아 있는지 한눈에 볼 수 있습니다.
export default function About() {
  const { t } = useT()
  const { events, status: evStatus, error: evError, retry: evRetry } = useEvents()
  const places = useCultureStore((s) => s.places)
  const placesStatus = useCultureStore((s) => s.placesStatus)
  const placesError = useCultureStore((s) => s.placesError)
  const loadPlaces = useCultureStore((s) => s.loadPlaces)
  const saved = useCultureStore((s) => s.saved)
  const visits = useCultureStore((s) => s.visits)
  const loadVisits = useCultureStore((s) => s.loadVisits)
  const setChatOpen = useChatStore((s) => s.setOpen)
  const [wx, setWx] = useState({ state: 'loading' })

  useEffect(() => { loadPlaces(); loadVisits() }, [loadPlaces, loadVisits])
  const loadWeather = () => {
    setWx({ state: 'loading' })
    fetchForecast(PLACES[0]).then((data) => setWx({ state: 'ok', data })).catch((e) => setWx({ state: 'fail', error: e.message }))
  }
  useEffect(loadWeather, [])

  const events3 = events.slice(0, 3)
  const sights3 = places.slice(0, 3)

  return (
    <div className="about">
      <PageHead kicker={t('about.kicker')} title={t('about.title')} sub={t('about.sub')} />

      <section className="card">
        <h2>{t('about.intentTitle')}</h2>
        <p>{t('home.intent')}</p>
        <ul>
          <li>{t('about.intent1')}</li>
          <li>{t('about.intent2')}</li>
          <li>{t('about.intent3')}</li>
        </ul>
      </section>

      <h2>{t('about.apiTitle')}</h2>
      <div className="about-grid">
        <article className="card apicard">
          <h3>{t('about.api.events')}</h3>
          <Status status={evStatus} error={evError} onRetry={evRetry} />
          {evStatus === 'ready' && (
            <>
              <p><b>{t('about.eventsLive', { n: events.length })}</b></p>
              <ul>{events3.map((e) => <li key={e.seq}><Link to={`/events/${e.seq}`}>{e.name}</Link></li>)}</ul>
            </>
          )}
          <small>{t('about.used.events')}</small>
        </article>

        <article className="card apicard">
          <h3>{t('about.api.sights')}</h3>
          <Status status={placesStatus} error={placesError} onRetry={() => loadPlaces(true)} />
          {placesStatus === 'ready' && (
            <>
              <p><b>{t('about.sightsLive', { n: places.length })}</b></p>
              <ul>{sights3.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
            </>
          )}
          <small>{t('about.used.sights')}</small>
        </article>

        <article className="card apicard">
          <h3>{t('about.api.weather')}</h3>
          <Status status={wx.state === 'ok' ? 'ready' : wx.state === 'fail' ? 'error' : 'loading'} error={wx.error} onRetry={loadWeather} />
          {wx.state === 'ok' && <p><b>{t('about.weatherLive', { temp: wx.data.current.temp, w: describe(wx.data.current.code).label })}</b></p>}
          <small>{t('about.used.weather')}</small>
        </article>
      </div>

      <div className="about-grid">
        <article className="card apicard">
          <h3>{t('about.dbTitle')}</h3>
          <p className={isSupabaseReady ? 'state ok' : 'state fail'}>
            {isSupabaseReady ? t('about.dbOn', { a: saved.length, b: visits.length }) : t('about.dbOff')}
          </p>
        </article>

        <article className="card apicard">
          <h3>{t('about.agentTitle')}</h3>
          <p>{t('about.agentText')}</p>
          <div className="actions">
            <button type="button" className="btn primary small" onClick={() => setChatOpen(true)}>{t('about.openChat')}</button>
            <Link to="/3d" className="btn small">{t('about.open3d')}</Link>
          </div>
        </article>
      </div>
    </div>
  )
}

function Status({ status, error, onRetry }) {
  const { t } = useT()
  if (status === 'ready') return <p className="state ok">● {t('about.ok')}</p>
  if (status === 'error') return <p className="state fail">● {t('about.fail', { e: t(error) })} <button type="button" className="linkbtn" onClick={onRetry}>{t('about.retry')}</button></p>
  return <p className="muted">{t('about.loading')}</p>
}
