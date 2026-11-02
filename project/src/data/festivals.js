import { periodParts } from '../i18n'

// 축제 목록(이름·시기·사진)은 festivalList.js 에 있고, 여기에는 화면용 함수만 둡니다.
import { FESTIVALS } from './festivalList.js'

export { FESTIVALS }

const PHOTO_BASE = 'https://api.cdn.visitjeju.net/photomng/'
export const festivalPhoto = (f) => PHOTO_BASE + f.img


// 화면에 보일 시기 글자 — "3월 중순", "11월 중순 ~ 12월 초순" 등 (현재 언어로)
export function periodText(period) {
  const f = periodParts()
  const [a, b] = period
  if (!b) return f.one(a[0], a[1])
  if (a[0] === b[0] && a[1] && b[1]) return f.same(a[0], a[1], b[1])
  return `${f.one(a[0], a[1])} ~ ${f.one(b[0], b[1])}`
}

// 시기가 걸치는 달 목록 (12월→1월처럼 해를 넘기는 경우도 처리)
export function periodMonths(period) {
  const from = period[0][0]
  const to = (period[1] ?? period[0])[0]
  const out = []
  for (let m = from; ; m = (m % 12) + 1) { out.push(m); if (m === to) break }
  return out
}
