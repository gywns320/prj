// AI 가이드(/api/chat)가 쓰는 도구들 — 사이트에 실제로 있는 데이터를 찾아서 돌려줍니다.
//   search_events / get_event : 제주in놀다 행사 정보 (키 필요 없음)
//   get_weather               : Open-Meteo 날씨 (키 필요 없음)
//   nearby_sights             : 비짓제주 관광지 (VISITJEJU_API_KEY 필요)
//   list_festivals            : 지역축제의 예년 시기 (src/data/festivalList.js)
// 도구가 돌려주는 글은 모두 '외부 데이터'입니다. 모델이 지시문으로 받아들이지 않도록 시스템 프롬프트에서 안내합니다.
import { FESTIVALS } from '../src/data/festivalList.js'
import { isFestival } from '../src/lib/festival.js'
import { fetchSights } from './_visitjeju.js'
import { applyCorrections } from './_apply.js'

const KST = 9 * 3600000
const dayKey = (ms) => new Date(Number(ms) + KST).toISOString().slice(0, 10)
export const todayKst = () => dayKey(Date.now())
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
const clamp = (v, lo, hi, dflt) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt }

// 같은 요청이 반복돼도 상대 서버를 매번 부르지 않도록 서버 메모리에 잠깐 보관 (서버가 새로 뜨면 비워짐)
const cache = new Map()
function memo(key, ttlMs, load) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise
  const promise = load()
  cache.set(key, { at: Date.now(), promise })
  promise.catch(() => cache.delete(key)) // 실패는 보관하지 않음
  return promise
}

// ── 행사 (제주in놀다) ─────────────────────────────────────────
const EVENT_API = 'https://www.jejunolda.com/api/event/'
async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'jeju-culture-calendar', Accept: 'application/json' }, signal: AbortSignal.timeout(9000) })
  if (!r.ok) throw new Error(`행사 서버 응답 오류 (${r.status})`)
  try { return JSON.parse(await r.text()) } catch { throw new Error('행사 서버 응답을 읽을 수 없어요') }
}

function coords(x, y) {
  const inLat = (v) => v > 33 && v < 34
  const inLng = (v) => v > 126 && v < 127
  if (inLng(x) && inLat(y)) return { lng: x, lat: y }
  if (inLng(y) && inLat(x)) return { lng: y, lat: x }
  return null
}

function normEvent(r) {
  return {
    seq: r.seq,
    name: String(r.name ?? '').trim(),
    category: (String(r.categoryName ?? '기타').replace(/\(.*?\)/g, '').trim()) || '기타',
    pay: r.payName ?? '', payTag: r.payTag ?? '',
    locTag: r.locTag ?? '',
    region: String(r.regName ?? '').startsWith('서귀포') ? '서귀포시' : '제주시',
    start: dayKey(r.start), end: dayKey(r.end),
    time: String(r.time ?? '').trim(),
    place: String(r.location ?? r.oversee ?? '').trim(),
    addr: [r.addr1, r.addr2].map((s) => String(s ?? '').trim()).filter(Boolean).join(' '),
    pos: coords(r.x, r.y),
  }
}

const loadEvents = () => memo('events', 10 * 60 * 1000, async () => {
  const data = await getJson(`${EVENT_API}?page=1&pageSize=500`)
  return (data.items ?? []).map((e) => applyCorrections('event', e.seq, e)).filter(Boolean).map(normEvent)
})

const LOC_LABEL = { IN: 'indoor', OUT: 'outdoor', INOUT: 'indoor and outdoor' }
const brief = (e) => ({
  seq: e.seq, name: e.name, category: e.category, start: e.start, end: e.end,
  time: e.time || undefined, place: e.place || undefined, address: e.addr || undefined, region: e.region,
  price: e.pay || undefined, setting: LOC_LABEL[e.locTag], page: `/events/${e.seq}`,
})

// 상세 소개글: HTML 이 섞여 있어서 태그를 걷어내고 길이를 제한 (모델에게 줄 글이라 간단히 처리)
function plain(html, max = 700) {
  const t = String(html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

async function searchEvents(input) {
  const today = todayKst()
  const from = isDate(input.from) ? input.from : today
  const to = isDate(input.to) && input.to >= from ? input.to : addDays(from, 6)
  const limit = clamp(input.limit, 1, 10, 8)
  const kw = String(input.keyword ?? '').trim().toLowerCase().slice(0, 40)
  let list = (await loadEvents()).filter((e) => e.start <= to && e.end >= from)
  if (input.category) list = list.filter((e) => (input.category === '축제' ? isFestival(e) : e.category === input.category))
  if (input.free_only) list = list.filter((e) => e.payTag === 'FREE')
  if (input.setting === 'indoor') list = list.filter((e) => e.locTag === 'IN' || e.locTag === 'INOUT')
  if (input.setting === 'outdoor') list = list.filter((e) => e.locTag === 'OUT' || e.locTag === 'INOUT')
  if (input.region) list = list.filter((e) => e.region === input.region)
  if (kw) list = list.filter((e) => [e.name, e.place, e.addr, e.category].some((s) => s.toLowerCase().includes(kw)))
  // 기간 안에서 시작하는 행사를 먼저(시작일 순), 그 전부터 이어지는 상설·장기 행사는 뒤로
  list.sort((a, b) => (a.start < from) - (b.start < from) || a.start.localeCompare(b.start) || a.name.localeCompare(b.name))
  return { period: { from, to }, total_matches: list.length, shown: Math.min(limit, list.length), events: list.slice(0, limit).map(brief) }
}

async function getEvent(input) {
  const seq = Number(input.seq)
  if (!Number.isInteger(seq) || seq <= 0) throw new Error('seq must be a positive integer')
  const data = await getJson(`${EVENT_API}?event=${seq}`)
  const found = data.event ?? data.evnet // 상대 서버 응답의 키가 오타('evnet')라 둘 다 받습니다
  const raw = found && applyCorrections('event', found.seq, found)
  if (!raw) throw new Error('event not found')
  const e = normEvent(raw)
  return { ...brief(e), host: raw.host ?? raw.ownerName ?? undefined, tel: String(raw.tel ?? '').trim() || undefined, description: plain(raw.intro) || undefined }
}

// ── 날씨 (Open-Meteo) ─────────────────────────────────────────
const WEATHER_PLACES = {
  jeju: { name: 'Jeju City', lat: 33.4996, lng: 126.5312 },
  seogwipo: { name: 'Seogwipo', lat: 33.2541, lng: 126.5601 },
  east: { name: 'Seongsan / east coast', lat: 33.4584, lng: 126.9423 },
  west: { name: 'Hallim / west coast', lat: 33.414, lng: 126.265 },
}
function wmo(code) {
  if (code === 0) return 'clear'
  if (code === 1) return 'mostly clear'
  if (code === 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain showers'
  if (code === 85 || code === 86) return 'snow showers'
  if (code >= 95) return 'thunderstorm'
  return 'unknown'
}

async function getWeather(input) {
  const key = WEATHER_PLACES[input.place] ? input.place : 'jeju'
  const p = WEATHER_PLACES[key]
  const days = clamp(input.days, 1, 16, 7)
  const qs = new URLSearchParams({
    latitude: p.lat, longitude: p.lng, timezone: 'Asia/Seoul', forecast_days: 16,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
  })
  const j = await memo(`weather:${key}`, 30 * 60 * 1000, () => getJson(`https://api.open-meteo.com/v1/forecast?${qs}`))
  if (!j?.daily?.time || !j.current) throw new Error('weather data unavailable')
  const d = j.daily
  const ms = (kmh) => Math.round((kmh / 3.6) * 10) / 10
  return {
    place: p.name,
    now: { temp_c: Math.round(j.current.temperature_2m), feels_like_c: Math.round(j.current.apparent_temperature), conditions: wmo(j.current.weather_code), wind_ms: ms(j.current.wind_speed_10m) },
    daily: d.time.slice(0, days).map((date, i) => ({
      date, conditions: wmo(d.weather_code[i]), max_c: Math.round(d.temperature_2m_max[i]), min_c: Math.round(d.temperature_2m_min[i]),
      rain_chance_pct: d.precipitation_probability_max[i] ?? 0, rain_mm: d.precipitation_sum[i], max_wind_ms: ms(d.wind_speed_10m_max[i]),
    })),
  }
}

// ── 주변 관광지 (비짓제주) ───────────────────────────────────────
function distanceKm(a, b) {
  const rad = (v) => (v * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

async function nearbySights(input) {
  let center = null
  let around
  if (input.event_seq != null) {
    const seq = Number(input.event_seq)
    const ev = (await loadEvents()).find((e) => e.seq === seq)
    if (!ev) throw new Error('event not found')
    if (!ev.pos) throw new Error('this event has no location coordinates; ask the user for an area or use lat/lng')
    center = ev.pos
    around = ev.name
  } else if (Number.isFinite(Number(input.lat)) && Number.isFinite(Number(input.lng))) {
    center = { lat: Number(input.lat), lng: Number(input.lng) }
  }
  if (!center || !(center.lat > 33 && center.lat < 34 && center.lng > 126 && center.lng < 127)) throw new Error('give event_seq or lat/lng inside Jeju')
  const radius = clamp(input.radius_km, 1, 10, 3)
  const limit = clamp(input.limit, 1, 10, 8)
  // 한국어 목록을 쓰고, 모델이 사용자 언어로 옮겨 말하게 합니다
  const sights = await memo('sights:kr', 60 * 60 * 1000, () => fetchSights('kr'))
  const near = sights
    .map((s) => ({ s, km: distanceKm(center, { lat: s.lat, lng: s.lng }) }))
    .filter((x) => x.km <= radius)
    .sort((a, b) => a.km - b.km)
  return {
    around: around ?? 'given coordinates', radius_km: radius, total_matches: near.length,
    sights: near.slice(0, limit).map(({ s, km }) => ({ name: s.title, area: [s.region, s.area].filter(Boolean).join(' '), distance_km: Math.round(km * 10) / 10, summary: s.intro.length > 100 ? `${s.intro.slice(0, 100)}…` : s.intro || undefined })),
  }
}

// ── 지역축제의 예년 시기 ─────────────────────────────────────────
const PART = { early: 'early', mid: 'mid', late: 'late' }
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthsOf = (period) => {
  const from = period[0][0]; const to = (period[1] ?? period[0])[0]
  const out = []
  for (let m = from; ; m = (m % 12) + 1) { out.push(m); if (m === to) break }
  return out
}
const periodText = (period) => period.map(([m, p]) => `${p ? `${PART[p]} ` : ''}${MONTH[m - 1]}`).join(' to ')

function listFestivals(input) {
  const month = input.month == null ? null : clamp(input.month, 1, 12, null)
  const list = FESTIVALS.filter((f) => !month || monthsOf(f.period).includes(month))
  return {
    note: 'Typical timing based on past years only - NOT confirmed dates for this year. Tell the user to check the official announcement.',
    festivals: list.map((f) => ({ name_ko: f.names.ko, name_en: f.names.en, city: f.city === 'seogwipo' ? 'Seogwipo' : 'Jeju City', typically_held: periodText(f.period), months: monthsOf(f.period) })),
  }
}

// ── 모델에게 알려 줄 도구 설명 ───────────────────────────────────
export const TOOLS = [
  {
    name: 'search_events',
    description: 'Search cultural events registered on the site (exhibitions, concerts, theater, festivals, workshops...) that overlap a date range. Dates are in Korea time. Use this for any question about what is happening on certain days. Only currently registered events are available (about 120, mostly the coming weeks).',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start of the range, YYYY-MM-DD. Defaults to today.' },
        to: { type: 'string', description: 'End of the range, YYYY-MM-DD. Defaults to 6 days after "from".' },
        category: { type: 'string', enum: ['전시회', '콘서트', '연주회', '연극', '뮤지컬', '무용', '전통공연', '축제', '교육/체험', '기타'], description: 'Event category (Korean names). 축제 = festival.' },
        free_only: { type: 'boolean', description: 'Only free events.' },
        setting: { type: 'string', enum: ['indoor', 'outdoor'], description: 'Indoor or outdoor events (events held both indoors and outdoors match either).' },
        region: { type: 'string', enum: ['제주시', '서귀포시'], description: 'Jeju City or Seogwipo City.' },
        keyword: { type: 'string', description: 'Text to look for in event name, venue or address (Korean works best).' },
        limit: { type: 'integer', description: 'Maximum events to return, 1-10. Default 8.' },
      },
    },
  },
  {
    name: 'get_event',
    description: 'Get details of one event (description, host, contact) by its seq number from search_events.',
    input_schema: { type: 'object', properties: { seq: { type: 'integer', description: 'The event seq number.' } }, required: ['seq'] },
  },
  {
    name: 'get_weather',
    description: 'Weather forecast for Jeju (current conditions plus up to 16 daily forecasts), from Open-Meteo.',
    input_schema: {
      type: 'object',
      properties: {
        place: { type: 'string', enum: ['jeju', 'seogwipo', 'east', 'west'], description: 'jeju = Jeju City (default), seogwipo = Seogwipo, east = Seongsan/east coast, west = Hallim/west coast.' },
        days: { type: 'integer', description: 'Number of days of forecast, 1-16. Default 7.' },
      },
    },
  },
  {
    name: 'nearby_sights',
    description: 'Find tourist sights (nature, oreum, beaches, museums, historic sites, theme parks) near an event or a coordinate, nearest first. Pass event_seq for an event, or lat and lng.',
    input_schema: {
      type: 'object',
      properties: {
        event_seq: { type: 'integer', description: 'Seq number of an event from search_events; its venue is used as the center.' },
        lat: { type: 'number', description: 'Latitude (use with lng).' },
        lng: { type: 'number', description: 'Longitude (use with lat).' },
        radius_km: { type: 'integer', description: 'Search radius in km, 1-10. Default 3.' },
        limit: { type: 'integer', description: 'Maximum sights to return, 1-10. Default 8.' },
      },
    },
  },
  {
    name: 'list_festivals',
    description: 'List Jeju regional festivals with the time of year they are usually held (based on past years, not confirmed dates for this year). Use it for questions like "when is the yellowtail festival?" or "which festivals are in spring?".',
    input_schema: { type: 'object', properties: { month: { type: 'integer', description: 'Only festivals usually held in this month, 1-12.' } } },
  },
]

const IMPL = { search_events: searchEvents, get_event: getEvent, get_weather: getWeather, nearby_sights: nearbySights, list_festivals: listFestivals }

// 화면의 '에이전트가 호출한 도구' 목록에 보여줄 결과 요약 — 개수(n)와 덧붙일 말(note). 문장은 화면에서 언어에 맞게 만듭니다.
function summarize(name, out) {
  if (name === 'search_events') return { n: out.total_matches, note: `${out.period.from} ~ ${out.period.to}` }
  if (name === 'get_event') return { n: 1, note: out.name }
  if (name === 'get_weather') return { n: out.daily.length, note: out.place }
  if (name === 'nearby_sights') return { n: out.total_matches, note: `${out.radius_km}km` }
  if (name === 'list_festivals') return { n: out.festivals.length }
  return { n: 0 }
}

// 도구 한 번 실행 — { content, isError, summary } 로 돌려줍니다. 입력은 모델이 만든 값이라 믿지 않고 각 도구에서 확인합니다.
export async function runTool(name, input) {
  const fn = IMPL[name]
  if (!fn) return { content: `unknown tool: ${name}`, isError: true }
  try {
    const out = await fn(input && typeof input === 'object' ? input : {})
    return { content: JSON.stringify(out), isError: false, summary: summarize(name, out) }
  } catch (e) {
    return { content: `error: ${String(e.message).slice(0, 200)}`, isError: true }
  }
}
