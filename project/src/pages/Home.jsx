import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { WeatherPanel } from '../components/Weather'
import { ErrorBox, Skeletons, catHue, useEvents } from '../components/common'
import { isFestival } from '../lib/festival'
import { addDays, diffDays, overlaps, presetRange, todayKey } from '../lib/date'

export default function Home() {
  const { events, status, error, retry } = useEvents()
  const navigate = useNavigate()
  const today = todayKey()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDays(today, 2))

  const data = useMemo(() => {
    const [wsS, wsE] = presetRange('weekend', today)
    const live = events.filter((e) => overlaps(e, today, today))
    const byCat = {}
    events.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + 1 })
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
      cats: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
    }
  }, [events, today])

  const goTrip = (e) => {
    e.preventDefault()
    navigate(`/events?when=custom&from=${from}&to=${to < from ? from : to}`)
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">제주 문화행사 안내</p>
          <h1>오늘 제주에서<br /><em>뭐 하지?</em></h1>
          <p className="sub">전시·공연·축제·체험까지, 제주특별자치도가 공개한 행사 정보를 도민도 여행자도 한눈에 찾아보세요.</p>
          <div className="hero-actions">
            <Link to="/events?when=today" className="btn primary">오늘 행사 {status === 'ready' ? `${data.nToday}건` : ''}</Link>
            <Link to="/events?when=weekend" className="btn">이번 주말 {status === 'ready' ? `${data.nWeekend}건` : ''}</Link>
            <Link to="/events?pay=FREE" className="btn">무료 행사 {status === 'ready' ? `${data.nFree}건` : ''}</Link>
            <Link to="/events?fest=1" className="btn">축제 {status === 'ready' ? `${data.nFest}건` : ''}</Link>
            <Link to="/map" className="btn">지도로 보기</Link>
          </div>
        </div>

        <aside className="trip">
          <h2>여행 일정에 맞는 행사</h2>
          <p className="muted">제주에 머무는 날짜를 넣으면 그 기간에 열리는 행사만 보여드려요.</p>
          <form onSubmit={goTrip}>
            <label>도착 <input type="date" value={from} min={today} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value) }} required /></label>
            <label>출발 <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required /></label>
            <button type="submit" className="btn primary">행사 찾기</button>
          </form>
          <div className="trip-alt">
            <span>도민이라면</span>
            <Link to="/events?when=weekend&pay=FREE">주말 무료</Link>
            <Link to="/events?region=제주시">제주시</Link>
            <Link to="/events?region=서귀포시">서귀포시</Link>
          </div>
        </aside>
      </section>

      <WeatherPanel />

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}

      {status === 'ready' && (
        <>
          <section className="catrow" aria-label="분류별 보기">
            {data.cats.map(([name, n]) => (
              <Link key={name} to={`/events?cat=${encodeURIComponent(name)}`} className="cattile" style={{ '--h': catHue(name) }}>
                <b>{name}</b><span>{n}</span>
              </Link>
            ))}
          </section>

          <Rail title="곧 시작해요" sub="7일 안에 시작" list={data.soon} more="/events?when=week&sort=soon" />
          <Rail title="마감이 다가와요" sub="진행 중 · 7일 안에 종료" list={data.ending} more="/events?sort=end" />
          <Rail title="지금 무료로 즐겨요" sub="오늘 열리는 무료 행사" list={data.freeNow} more="/events?when=today&pay=FREE" />
        </>
      )}
    </>
  )
}

function Rail({ title, sub, list, more }) {
  if (list.length === 0) return null
  return (
    <section className="rail">
      <div className="rail-head">
        <div><h2>{title}</h2><p className="muted">{sub}</p></div>
        <Link to={more} className="more">더 보기 →</Link>
      </div>
      <div className="grid">{list.map((e) => <EventCard key={e.seq} event={e} />)}</div>
    </section>
  )
}
