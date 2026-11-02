// Open-Meteo 예보 API (https://open-meteo.com) — 키가 필요 없고 CORS 를 허용해 브라우저에서 바로 호출합니다.
// 예보는 오늘부터 최대 16일까지 제공됩니다.
import { tr } from '../i18n'

const BASE = 'https://api.open-meteo.com/v1/forecast'

// 날씨를 보여줄 대표 지점. 행사에는 좌표가 부정확한 경우가 많아 가장 가까운 지점의 예보를 씁니다.
export const PLACES = [
  { id: 'jeju', name: '제주시', lat: 33.4996, lng: 126.5312 },
  { id: 'seogwipo', name: '서귀포', lat: 33.2541, lng: 126.5601 },
  { id: 'east', name: '성산·동부', lat: 33.4584, lng: 126.9423 },
  { id: 'west', name: '한림·서부', lat: 33.414, lng: 126.265 },
]

const BY_REGION = { 제주시: 'jeju', 제주시동부: 'east', 제주시서부: 'west', 서귀포시: 'seogwipo', 서귀포시동부: 'east', 서귀포시서부: 'west' }

// 좌표가 있으면 가장 가까운 지점, 없으면 행정구역 이름으로, 그것도 없으면 제주시
export function nearestPlace(pos, regionName) {
  if (pos) {
    const d = (p) => (p.lat - pos.lat) ** 2 + ((p.lng - pos.lng) * 0.84) ** 2
    return PLACES.reduce((best, p) => (d(p) < d(best) ? p : best))
  }
  return PLACES.find((p) => p.id === BY_REGION[regionName]) ?? PLACES[0]
}

// WMO 날씨 코드 → 한글 설명·아이콘·종류
export function describe(code) {
  const w = (key, icon, kind) => ({ label: tr(`w.${key}`), icon, kind })
  if (code === 0) return w('clear', '☀️', 'clear')
  if (code === 1) return w('mostlyClear', '🌤️', 'clear')
  if (code === 2) return w('partly', '⛅', 'cloud')
  if (code === 3) return w('overcast', '☁️', 'cloud')
  if (code === 45 || code === 48) return w('fog', '🌫️', 'fog')
  if (code >= 51 && code <= 57) return w('drizzle', '🌦️', 'rain')
  if (code >= 61 && code <= 67) return w('rain', '🌧️', 'rain')
  if (code >= 71 && code <= 77) return w('snow', '🌨️', 'snow')
  if (code >= 80 && code <= 82) return w('shower', '🌧️', 'rain')
  if (code === 85 || code === 86) return w('snowShower', '🌨️', 'snow')
  if (code >= 95) return w('storm', '⛈️', 'storm')
  return w('unknown', '🌡️', 'cloud')
}

// 우산이 필요한 날: 강수확률이 높거나 강수량이 꽤 많을 때
export const isWet = (day) => (day.prob ?? 0) >= 60 || (day.sum ?? 0) >= 5

const kmhToMs = (v) => Math.round((v / 3.6) * 10) / 10
const TTL = 30 * 60 * 1000
const cache = new Map() // placeId -> { at, promise }

export function fetchForecast(place) {
  const hit = cache.get(place.id)
  if (hit && Date.now() - hit.at < TTL) return hit.promise
  const promise = load(place)
  cache.set(place.id, { at: Date.now(), promise })
  promise.catch(() => cache.delete(place.id)) // 실패는 캐시하지 않아 다시 시도할 수 있게
  return promise
}

async function load(place) {
  const qs = new URLSearchParams({
    latitude: place.lat, longitude: place.lng, timezone: 'Asia/Seoul', forecast_days: 16,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
  })
  let res
  try { res = await fetch(`${BASE}?${qs}`) }
  catch { throw new Error('err.weatherNet') }
  if (!res.ok) throw new Error(`err.weatherHttp:${res.status}`)
  const j = await res.json().catch(() => null)
  if (!j?.daily?.time || !j.current) throw new Error('err.weatherParse')

  const d = j.daily
  return {
    place,
    current: {
      temp: Math.round(j.current.temperature_2m),
      feels: Math.round(j.current.apparent_temperature),
      code: j.current.weather_code,
      wind: kmhToMs(j.current.wind_speed_10m),
      precip: j.current.precipitation,
    },
    days: d.time.map((key, i) => ({
      key,
      code: d.weather_code[i],
      max: Math.round(d.temperature_2m_max[i]),
      min: Math.round(d.temperature_2m_min[i]),
      prob: d.precipitation_probability_max[i],
      sum: d.precipitation_sum[i],
      wind: kmhToMs(d.wind_speed_10m_max[i]),
    })),
  }
}
