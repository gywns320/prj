// 날짜는 모두 한국 시간(KST) 기준의 'YYYY-MM-DD' 문자열(dayKey)로 다룹니다.
// 문자열끼리 그대로 비교(<, >)해도 날짜 순서가 맞습니다.
const DAY = 86400000
const KST = 9 * 3600000
const WD = ['일', '월', '화', '수', '목', '금', '토']

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

export function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const year = String(y) === todayKey().slice(0, 4) ? '' : `${y}년 `
  return `${year}${m}월 ${d}일(${WD[weekday(key)]})`
}
export const fmtRange = (s, e) => (s === e ? fmtDay(s) : `${fmtDay(s)} ~ ${fmtDay(e)}`)
export const fmtMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return `${y}년 ${m}월`
}

// ── 기간 프리셋 ──────────────────────────────────────────
export const WHEN = {
  all: '전체',
  today: '오늘',
  weekend: '이번 주말',
  week: '7일 이내',
  month: '이번 달',
  custom: '날짜 지정',
}

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
  if (ev.endKey < today) return { kind: 'ended', label: '종료' }
  if (ev.startKey > today) {
    const d = diffDays(today, ev.startKey)
    return { kind: 'soon', label: d === 1 ? '내일 시작' : `D-${d}` }
  }
  if (ev.endKey === today) return { kind: 'last', label: ev.startKey === today ? '오늘' : '오늘 마감' }
  return { kind: 'live', label: '진행중' }
}
