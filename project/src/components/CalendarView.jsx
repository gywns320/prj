import { useMemo, useState } from 'react'
import EventCard from './EventCard'
import { Empty } from './common'
import { addMonths, daysInMonth, fmtDay, fmtMonth, monthOf, overlaps, todayKey, weekday } from '../lib/date'

const HEAD = ['일', '월', '화', '수', '목', '금', '토']

// 월간 달력 — 날짜마다 그날 열리는 행사 수를 보여주고, 날짜를 누르면 아래에 목록을 펼칩니다
export default function CalendarView({ events, initialMonth }) {
  const today = todayKey()
  const [month, setMonth] = useState(initialMonth || monthOf(today))
  const [picked, setPicked] = useState(null)

  const cells = useMemo(() => {
    const first = `${month}-01`
    const lead = weekday(first)
    const total = daysInMonth(month)
    const out = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= total; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`
      out.push({ key, d, list: events.filter((e) => overlaps(e, key, key)) })
    }
    return out
  }, [events, month])

  const move = (n) => { setMonth(addMonths(month, n)); setPicked(null) }
  const pickedList = picked ? cells.find((c) => c?.key === picked)?.list ?? [] : []
  const max = Math.max(1, ...cells.map((c) => c?.list.length ?? 0))

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="btn small" onClick={() => move(-1)} aria-label="이전 달">‹</button>
        <h2>{fmtMonth(month)}</h2>
        <button type="button" className="btn small" onClick={() => move(1)} aria-label="다음 달">›</button>
        <button type="button" className="btn small ghost" onClick={() => { setMonth(monthOf(today)); setPicked(today) }}>오늘</button>
      </div>

      <div className="cal-grid" role="grid" aria-label={fmtMonth(month)}>
        {HEAD.map((h, i) => <div key={h} className={`cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{h}</div>)}
        {cells.map((c, i) => c === null ? <div key={`b${i}`} /> : (
          <button
            key={c.key} type="button" disabled={c.list.length === 0}
            className={`cal-day ${c.key === today ? 'today' : ''} ${c.key === picked ? 'picked' : ''}`}
            style={{ '--lvl': c.list.length / max }}
            onClick={() => setPicked(c.key === picked ? null : c.key)}
            aria-label={`${fmtDay(c.key)} 행사 ${c.list.length}건`}
          >
            <span className="n">{c.d}</span>
            {c.list.length > 0 && <span className="cnt">{c.list.length}</span>}
          </button>
        ))}
      </div>

      {picked && (
        <section className="cal-list">
          <h3>{fmtDay(picked)} · {pickedList.length}건</h3>
          {pickedList.length === 0
            ? <Empty title="이 날은 행사가 없어요" />
            : <div className="grid">{pickedList.map((e) => <EventCard key={e.seq} event={e} compact />)}</div>}
        </section>
      )}
      {!picked && <p className="muted center">숫자가 있는 날짜를 누르면 그날의 행사를 볼 수 있어요.</p>}
    </div>
  )
}
