import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLACES, describe, fetchForecast, isWet, nearestPlace } from '../api/weather'
import { addDays, fmtDayShort, fmtMonthDay, todayKey } from '../lib/date'
import { tr, useT } from '../i18n'
import WeatherIcon from './WeatherIcon'

const dayLabel = (key, today) => (key === today ? tr('common.today') : key === addDays(today, 1) ? tr('common.tomorrow') : fmtDayShort(key))

// 지점의 예보를 불러오는 훅 — 지점이 바뀌면 다시 불러옵니다
function useForecast(place) {
  const [state, setState] = useState({ id: null, data: null, error: '' })
  const [tries, setTries] = useState(0)
  useEffect(() => {
    let alive = true
    fetchForecast(place)
      .then((data) => alive && setState({ id: place.id, data, error: '' }))
      .catch((e) => alive && setState({ id: place.id, data: null, error: e.message }))
    return () => { alive = false }
  }, [place, tries])
  const ready = state.id === place.id
  return {
    data: ready ? state.data : null,
    error: ready ? state.error : '',
    loading: !ready || (!state.data && !state.error),
    retry: () => { setState({ id: null, data: null, error: '' }); setTries(tries + 1) },
  }
}

function Day({ day, today, label }) {
  const { t } = useT()
  const w = describe(day.code)
  return (
    <li className={`wday ${isWet(day) ? 'wet' : ''}`} title={t('wx.dayTitle', { label: w.label, w: day.wind })}>
      <span className="wd-label">{label ?? dayLabel(day.key, today)}</span>
      <span className="wd-icon" aria-hidden="true"><WeatherIcon kind={w.kind} code={day.code} /></span>
      <span className="wd-temp"><b>{day.max}°</b> <i>{day.min}°</i></span>
      <span className="wd-rain">☂ {day.prob ?? 0}%</span>
    </li>
  )
}

// 홈 — 지점 선택, 현재 날씨, 7일 예보, 비 올 때 실내 행사 안내
export function WeatherPanel() {
  const { t } = useT()
  const [placeId, setPlaceId] = useState(PLACES[0].id)
  const place = PLACES.find((p) => p.id === placeId)
  const { data, error, loading, retry } = useForecast(place)
  const today = todayKey()

  return (
    <section className="weather" aria-label={t('wx.title')}>
      <div className="weather-head">
        <h2>{t('wx.title')}</h2>
        <div className="seg" role="tablist" aria-label={t('wx.placeAria')}>
          {PLACES.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={p.id === placeId} className={p.id === placeId ? 'on' : ''} onClick={() => setPlaceId(p.id)}>{t(`wp.${p.id}`)}</button>
          ))}
        </div>
      </div>

      {loading && <div className="skeleton wsk" aria-busy="true" />}
      {error && <div className="errorbox"><b>{t('wx.fail')}</b><p>{t(error)}</p><button type="button" className="btn small" onClick={retry}>{t('common.retry')}</button></div>}
      {data && <WeatherBody data={data} today={today} />}
      <p className="muted src">{t('wx.src')}</p>
    </section>
  )
}

function WeatherBody({ data, today }) {
  const { t } = useT()
  const { current: c, days } = data
  const w = describe(c.code)
  const todayDay = days.find((d) => d.key === today) ?? days[0]
  const rainToday = isWet(todayDay) || ['rain', 'snow', 'storm'].includes(w.kind)

  return (
    <>
      <div className="now">
        <div className="now-main">
          <span className="now-icon" aria-hidden="true"><WeatherIcon kind={w.kind} code={c.code} /></span>
          <div><b className="now-temp">{c.temp}°</b><span className="now-label">{w.label}</span></div>
        </div>
        <dl className="now-facts">
          <div><dt>{t('wx.feels')}</dt><dd>{c.feels}°</dd></div>
          <div><dt>{t('wx.wind')}</dt><dd>{c.wind}m/s</dd></div>
          <div><dt>{t('wx.pop')}</dt><dd>{todayDay.prob ?? 0}%</dd></div>
        </dl>
      </div>

      {rainToday ? (
        <p className="wtip rain">{t('wx.rainTip')} <Link to="/events?when=today&loc=IN">{t('wx.rainLink')}</Link></p>
      ) : (
        <p className="wtip fine">{t('wx.fineTip')} <Link to="/events?when=today&loc=OUT">{t('wx.fineLink')}</Link></p>
      )}

      <ul className="wstrip">{days.slice(0, 7).map((d) => <Day key={d.key} day={d} today={today} />)}</ul>
    </>
  )
}

// 행사 상세 — 행사 기간(예보가 있는 날만)의 날씨와, 야외 행사의 우산 안내
export function EventWeather({ event: ev }) {
  const { t } = useT()
  const place = nearestPlace(ev.pos, ev.regionName)
  const { data, error, loading } = useForecast(place)
  const today = todayKey()
  if (ev.endKey < today) return null

  const days = data ? data.days.filter((d) => d.key >= ev.startKey && d.key <= ev.endKey) : []
  const shown = days.slice(0, 7)
  const outdoor = ev.locTag === 'OUT' || ev.locTag === 'INOUT'
  const wetDays = days.filter(isWet)
  const lastForecast = data?.days.at(-1)?.key
  const sep = tr('wx.listSep')

  return (
    <section className="card">
      <h2>{t('wx.evTitle')} <small className="muted">{t('wx.basis', { place: t(`wp.${place.id}`) })}</small></h2>
      {loading && <div className="skeleton wsk" aria-busy="true" />}
      {error && <p className="muted">{t('wx.evFail', { e: t(error) })}</p>}
      {data && shown.length === 0 && (
        <p className="muted">{t('wx.limit', { d: lastForecast ? fmtMonthDay(lastForecast) : t('wx.limit16') })}</p>
      )}
      {shown.length > 0 && (
        <>
          {outdoor && (
            <p className={`wtip ${wetDays.length ? 'rain' : 'fine'}`}>
              {wetDays.length
                ? t('wx.outRain', { days: wetDays.map((d) => dayLabel(d.key, today)).slice(0, 3).join(sep) })
                : t('wx.outFine')}
            </p>
          )}
          <ul className="wstrip">{shown.map((d) => <Day key={d.key} day={d} today={today} />)}</ul>
          {days.length > shown.length && <p className="muted">{t('wx.long', { n: shown.length })}</p>}
        </>
      )}
    </section>
  )
}
