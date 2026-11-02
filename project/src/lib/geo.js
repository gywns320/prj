// 두 지점 사이의 거리(km) — 하버사인 공식
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 10) * 100}m` : `${km.toFixed(1)}km`)
