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
  if (getLang() === 'ko') return `https://map.naver.com/p/search/${encodeURIComponent(`${p.title} ${p.region}`.trim())}`
  return `https://www.google.com/maps/search/?api=1&query=${p.pos.lat},${p.pos.lng}`
}

export const fmtKm =(km) => (km < 1 ? `${Math.round(km * 10) * 100}m` : `${km.toFixed(1)}km`)
