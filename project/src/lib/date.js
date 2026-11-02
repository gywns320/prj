// 날짜는 모두 한국 시간(KST) 기준의 'YYYY-MM-DD' 문자열(dayKey)로 다룹니다.
// 문자열끼리 그대로 비교(<, >)해도 날짜 순서가 맞습니다.
import { dateParts, tr } from '../i18n'

const DAY = 86400000
const KST = 9 * 3600000

export const dayKey = (ms) => new Date(ms + KST).toISOString().slice(0, 10)
export const todayKey = () => dayKey(Date.now())

const toUTC = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export const addDays = (key, n) => new Date(toUTC(key) + n * DAY).toISOString().slice(0, 10)
export const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY)
export const weekday = (key) => new Date(toUTC(key)).getUTCDay()
export const monthOf = (key) => key.slice(0, 7)
export const addMonths = (month, n) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}
export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// 표기(연·월·일·요일 순서와 글자)는 현재 언어에 맞춥니다 — i18n/messages.js 의 DATE
export function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const f = dateParts()
  return f.day(y, m, d, f.wd[weekday(key)], String(y) !== todayKey().slice(0, 4))
}
export const fmtRange = (s, e) => (s === e ? fmtDay(s) : `${fmtDay(s)} ~ ${fmtDay(e)}`)
export const fmtMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return dateParts().month(y, m)
}
// 날짜 칸 이름이나 '7일(월)' 같은 짧은 표기
export const fmtDayShort = (key) => dateParts().dayShort(Number(key.slice(8)), dateParts().wd[weekday(key)])
export const fmtMonthDay = (key) => dateParts().md(Number(key.slice(5, 7)), Number(key.slice(8)))
export const weekdayNames = () => dateParts().wd

// ── 기간 프리셋 ──────────────────────────────────────────
// 값은 문구 키(when.xxx) 의 이름 — 보이는 글자는 tr('when.' + key) 로
export const WHEN = { all: 'all', today: 'today', weekend: 'weekend', week: 'week', month: 'month', custom: 'custom' }

export function presetRange(when, today = todayKey()) {
  switch (when) {
    case 'today': return [today, today]
    case 'weekend': {
      const wd = weekday(today)
      if (wd === 0) return [today, today]
      if (wd === 6) return [today, addDays(today, 1)]
      const sat = addDays(today, 6 - wd)
      return [sat, addDays(sat, 1)]
    }
    case 'week': return [today, addDays(today, 6)]
    case 'month': return [today, `${monthOf(today)}-${String(daysInMonth(monthOf(today))).padStart(2, '0')}`]
    default: return null
  }
}

// 행사 기간이 [from, to] 와 하루라도 겹치는가
export const overlaps = (ev, from, to) => ev.startKey <= to && ev.endKey >= from

// 행사의 현재 상태 — 카드의 배지에 사용
export function eventStatus(ev, today = todayKey()) {
  if (ev.endKey < today) return { kind: 'ended', label: tr('st.ended') }
  if (ev.startKey > today) {
    const d = diffDays(today, ev.startKey)
    return { kind: 'soon', label: d === 1 ? tr('st.tomorrow') : tr('st.dday', { n: d }) }
  }
  if (ev.endKey === today) return { kind: 'last', label: ev.startKey === today ? tr('st.today') : tr('st.last') }
  return { kind: 'live', label: tr('st.live') }
}
