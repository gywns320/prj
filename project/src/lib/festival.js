// 축제 판별 — 행사 API 에는 '축제' 분류(012)가 따로 있지만 등록이 드물어서,
// 다른 분류(기타·연극 등)로 올라온 축제도 행사명으로 함께 찾습니다.
// ('대회'·'마라톤' 같은 경기는 축제가 아니라서 넣지 않았습니다)
const FESTIVAL_WORDS = /축제|페스티벌|페스티발|festival|한마당|축전|문화제|예술제|박람회|엑스포/i

export const isFestival = (ev) => ev.category === '축제' || FESTIVAL_WORDS.test(ev.name)

// '축제' 분류는 이름에 축제·페스티벌 등이 들어간 행사까지 합쳐서 하나로 셉니다 (다른 분류와는 겹쳐 셀 수 있음)
export const inCategory = (ev, cat) => (cat === '축제' ? isFestival(ev) : ev.category === cat)

export function categoryCounts(events) {
  const m = {}
  events.forEach((e) => { if (e.category !== '축제') m[e.category] = (m[e.category] || 0) + 1 })
  const fest = events.filter(isFestival).length
  if (fest) m['축제'] = fest
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}
