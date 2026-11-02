import { addDays } from './date'

// 행사를 캘린더 앱(.ics)으로 내보내기 — 종일 일정으로 만들고, 시간 정보는 설명에 적습니다.
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')
const compact = (key) => key.replace(/-/g, '')

export function buildIcs(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jeju Culture Calendar//KO', 'CALSCALE:GREGORIAN']
  for (const ev of events) {
    const desc = [ev.time && `시간: ${ev.time}`, ev.tel && `문의: ${ev.tel}`, `요금: ${ev.pay}`].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:jeju-event-${ev.seq}@jejunolda`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(ev.startKey)}`,
      `DTEND;VALUE=DATE:${compact(addDays(ev.endKey, 1))}`, // 종일 일정의 종료일은 '다음 날'
      `SUMMARY:${esc(ev.name)}`,
      `LOCATION:${esc([ev.place, ev.addr].filter(Boolean).join(' '))}`,
      `DESCRIPTION:${esc(desc)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(events, filename = 'jeju-events.ics') {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
