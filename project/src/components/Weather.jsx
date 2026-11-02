import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLACES, describe, fetchForecast, isWet, nearestPlace } from '../api/weather'
import { addDays, todayKey, weekday } from '../lib/date'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const dayLabel = (key, today) => (key === today ? '오늘' : key === addDays(today, 1) ? '내일' : `${Number(key.slice(8))}일(${WD[weekday(key)]})`)

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
  const w = describe(day.code)
  return (
    <li className={`wday ${isWet(day) ? 'wet' : ''}`} title={`${w.label} · 바람 최대 ${day.wind}m/s`}>
      <span className="wd-label">{label ?? dayLabel(day.key, today)}</span>
      <span className="wd-icon" aria-hidden="true">{w.icon}</span>
      <span className="wd-temp"><b>{day.max}°</b> <i>{day.min}°</i></span>
      <span className="wd-rain">☂ {day.prob ?? 0}%</span>
    </li>
  )
}

// 홈 — 지점 선택, 현재 날씨, 7일 예보, 비 올 때 실내 행사 안내
export function WeatherPanel() {
  const [placeId, setPlaceId] = useState(PLACES[0].id)
  const place = PLACES.find((p) => p.id === placeId)
  const { data, error, loading, retry } = useForecast(place)
  const today = todayKey()

  return (
    <section className="weather" aria-label="제주 날씨">
      <div className="weather-head">
        <h2>제주 날씨</h2>
        <div className="seg" role="tablist" aria-label="지점">
          {PLACES.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={p.id === placeId} className={p.id === placeId ? 'on' : ''} onClick={() => setPlaceId(p.id)}>{p.name}</button>
          ))}
        </div>
      </div>

      {loading && <div className="skeleton wsk" aria-busy="true" />}
      {error && <div className="errorbox"><b>날씨를 불러오지 못했어요</b><p>{error}</p><button type="button" className="btn small" onClick={retry}>다시 시도</button></div>}
      {data && <WeatherBody data={data} today={today} />}
      <p className="muted src">날씨 데이터: Open-Meteo</p>
    </section>
  )
}

function WeatherBody({ data, today }) {
  const { current: c, days } = data
  const w = describe(c.code)
  const todayDay = days.find((d) => d.key === today) ?? days[0]
  const rainToday = isWet(todayDay) || ['rain', 'snow', 'storm'].includes(w.kind)

  return (
    <>
      <div className="now">
        <div className="now-main">
          <span className="now-icon" aria-hidden="true">{w.icon}</span>
          <div><b className="now-temp">{c.temp}°</b><span className="now-label">{w.label}</span></div>
        </div>
        <dl className="now-facts">
          <div><dt>체감</dt><dd>{c.feels}°</dd></div>
          <div><dt>바람</dt><dd>{c.wind}m/s</dd></div>
          <div><dt>오늘 강수확률</dt><dd>{todayDay.prob ?? 0}%</dd></div>
        </dl>
      </div>

      {rainToday ? (
        <p className="wtip rain">☂ 오늘은 비 소식이 있어요. <Link to="/events?when=today&loc=IN">실내에서 열리는 오늘 행사 보기 →</Link></p>
      ) : (
        <p className="wtip fine">오늘은 야외 나들이하기 좋은 날씨예요. <Link to="/events?when=today&loc=OUT">야외 행사 보기 →</Link></p>
      )}

      <ul className="wstrip">{days.slice(0, 7).map((d) => <Day key={d.key} day={d} today={today} />)}</ul>
    </>
  )
}

// 행사 상세 — 행사 기간(예보가 있는 날만)의 날씨와, 야외 행사의 우산 안내
export function EventWeather({ event: ev }) {
  const place = nearestPlace(ev.pos, ev.regionName)
  const { data, error, loading } = useForecast(place)
  const today = todayKey()
  if (ev.endKey < today) return null

  const days = data ? data.days.filter((d) => d.key >= ev.startKey && d.key <= ev.endKey) : []
  const shown = days.slice(0, 7)
  const outdoor = ev.locTag === 'OUT' || ev.locTag === 'INOUT'
  const wetDays = days.filter(isWet)
  const lastForecast = data?.days.at(-1)?.key

  return (
    <section className="card">
      <h2>행사 기간 날씨 <small className="muted">{place.name} 기준</small></h2>
      {loading && <div className="skeleton wsk" aria-busy="true" />}
      {error && <p className="muted">날씨 정보를 불러오지 못했어요. ({error})</p>}
      {data && shown.length === 0 && (
        <p className="muted">예보는 {lastForecast ? `${Number(lastForecast.slice(5, 7))}월 ${Number(lastForecast.slice(8))}일` : '16일 이내'}까지만 제공돼요. 행사 날짜가 가까워지면 다시 확인해 주세요.</p>
      )}
      {shown.length > 0 && (
        <>
          {outdoor && (
            <p className={`wtip ${wetDays.length ? 'rain' : 'fine'}`}>
              {wetDays.length
                ? `☂ 야외 행사예요. ${wetDays.map((d) => dayLabel(d.key, today)).slice(0, 3).join(', ')}에 비 예보가 있으니 우산을 챙기고, 우천 시 진행 여부를 문의처에 확인하세요.`
                : '야외 행사예요. 예보상 비 소식은 없어요.'}
            </p>
          )}
          <ul className="wstrip">{shown.map((d) => <Day key={d.key} day={d} today={today} />)}</ul>
          {days.length > shown.length && <p className="muted">기간이 길어 앞의 {shown.length}일만 보여드려요.</p>}        </>
      )}
    </section>
  )
}
