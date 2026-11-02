import { useMemo, useState } from 'react'
import EventCard from './EventCard'
import { Empty } from './common'
import { addMonths, daysInMonth, fmtDay, fmtMonth, monthOf, overlaps, todayKey, weekday, weekdayNames } from '../lib/date'
import { useT } from '../i18n'

// 월간 달력 — 날짜마다 그날 열리는 행사 수를 보여주고, 날짜를 누르면 아래에 목록을 펼칩니다
export default function CalendarView({ events, initialMonth }) {
  const { t } = useT()
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
        <button type="button" className="btn small" onClick={() => move(-1)} aria-label={t('cal.prev')}>‹</button>
        <h2>{fmtMonth(month)}</h2>
        <button type="button" className="btn small" onClick={() => move(1)} aria-label={t('cal.next')}>›</button>
        <button type="button" className="btn small ghost" onClick={() => { setMonth(monthOf(today)); setPicked(today) }}>{t('common.today')}</button>
      </div>

      <div className="cal-grid" role="grid" aria-label={fmtMonth(month)}>
        {weekdayNames().map((h, i) => <div key={h} className={`cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{h}</div>)}
        {cells.map((c, i) => c === null ? <div key={`b${i}`} /> : (
          <button
            key={c.key} type="button" disabled={c.list.length === 0}
            className={`cal-day ${c.key === today ? 'today' : ''} ${c.key === picked ? 'picked' : ''}`}
            style={{ '--lvl': c.list.length / max }}
            onClick={() => setPicked(c.key === picked ? null : c.key)}
            aria-label={t('cal.dayAria', { day: fmtDay(c.key), n: c.list.length })}
          >
            <span className="n">{c.d}</span>
            {c.list.length > 0 && <span className="cnt">{c.list.length}</span>}
          </button>
        ))}
      </div>

      {picked && (
        <section className="cal-list">
          <h3>{t('cal.dayHead', { day: fmtDay(picked), n: pickedList.length })}</h3>
          {pickedList.length === 0
            ? <Empty title={t('cal.empty')} />
            : <div className="grid">{pickedList.map((e) => <EventCard key={e.seq} event={e} compact />)}</div>}
        </section>
      )}
      {!picked && <p className="muted center">{t('cal.hint')}</p>}
    </div>
  )
}
