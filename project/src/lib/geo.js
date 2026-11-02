import { getLang } from '../i18n'

// 두 지점 사이의 거리(km) — 하버사인 공식
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// 관광지를 지도 앱에서 열기 — 한국어는 네이버 지도, 그 밖의 언어는 외국인도 쓰기 쉬운 구글 지도
export function placeMapUrl(p) {
  if (getLang() === 'ko') {
    // 검색어는 '시 + 이름' 만: 비짓제주의 지역이 "서귀포시 서귀포시내" 처럼 길면 네이버가 "조건에 맞는 업체가 없습니다" 로 답하고,
    // 이름 뒤의 [휴관중]·(별칭) 같은 덧붙임도 검색을 막으므로 뗍니다
    const name = p.title.replace(/\[[^\]]*\]|\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() || p.title
    const city = String(p.region ?? '').split(' ')[0]
    return `https://map.naver.com/p/search/${encodeURIComponent(`${city} ${name}`.trim())}` // 시를 앞에 둬야 검색이 잘 됩니다
  }
  return `https://www.google.com/maps/search/?api=1&query=${p.pos.lat},${p.pos.lng}`
}

export const fmtKm =(km) => (km < 1 ? `${Math.round(km * 10) * 100}m` : `${km.toFixed(1)}km`)
