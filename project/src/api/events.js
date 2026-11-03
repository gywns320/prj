// 제주in놀다 「제주특별자치도 전시문화행사정보」 OpenAPI (Jeju-OpenAPI-I01)
//   목록: GET https://www.jejunolda.com/api/event/?page=&pageSize=&category=&pay=&loc=
//   상세: GET https://www.jejunolda.com/api/event/?event={seq}
// 브라우저는 CORS 때문에 직접 부를 수 없어 같은 서버의 /api/event 를 호출하고, 서버 함수(api/event.js)가 대신 전달합니다.
import { dayKey } from '../lib/date'

const IMG_BASE = 'https://jejunolda.com/files/event/'

async function call(params) {
  const qs = new URLSearchParams(params)
  let res
  try { res = await fetch(`/api/event?${qs}`) }
  catch { throw new Error('err.net') }
  if (!res.ok) throw new Error(`err.eventsHttp:${res.status}`)
  let data
  try { data = await res.json() }
  catch { throw new Error('err.eventsParse') }
  if (data.resultCode !== '00') throw new Error(data.resultMsg || data.message || 'err.eventsFail')
  return data
}

// 전체 행사 — 한 번에 모두 받아 와서 화면에서 거릅니다. (현재 약 120건)
export async function fetchEvents() {
  const data = await call({ page: 1, pageSize: 500 })
  return (data.items ?? []).map(normalize)
}

// 상세 — 응답의 키가 명세서에는 event, 실제로는 'evnet' (오타) 이라 둘 다 받습니다.
export async function fetchEvent(seq) {
  const data = await call({ event: seq })
  const raw = data.event ?? data.evnet
  if (!raw) throw new Error('err.eventNone')
  return {
    ...normalize(raw),
    images: (data.images ?? []).filter((i) => i.image !== false).map((i) => ({
      name: i.name, src: IMG_BASE + i.path, thumb: i.thumbnail ? IMG_BASE + i.thumbnail : IMG_BASE + i.path,
      width: i.width, height: i.height,
    })),
  }
}

// ── 응답 정리 ────────────────────────────────────────────
const REGION_GROUP = (name) => (!name ? '기타' : name.startsWith('서귀포') ? '서귀포시' : '제주시')

// 좌표: 일부 데이터는 위도·경도가 뒤바뀌어 있거나 0 이라서, 제주 범위 안에 들어올 때만 씁니다.
function coords(x, y) {
  const inLat = (v) => v > 33 && v < 34
  const inLng = (v) => v > 126 && v < 127
  if (inLng(x) && inLat(y)) return { lng: x, lat: y }
  if (inLng(y) && inLat(x)) return { lng: y, lat: x }
  return null
}

// 주소·홈페이지처럼 http(s) 만 허용 (javascript: 같은 주소는 버립니다)
function safeUrl(u) {
  if (!u) return null
  const s = String(u).trim()
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol) ? parsed.href : null
  } catch { return null }
}

// intro 는 HTML 이거나 평문입니다. 스크립트가 실행되지 않는 DOMParser 로 글자만 뽑습니다.
function toText(html) {
  if (!html) return ''
  const withBreaks = String(html).replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n')
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent ?? ''
  return text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function normalize(r) {
  const cat = (r.categoryName ?? '기타').replace(/\(.*?\)/g, '').trim() || '기타'
  const homepage = safeUrl(r.sns1 ?? r.sns2)
  return {
    seq: r.seq,
    name: (r.name ?? '').trim(),
    category: cat,
    pay: r.payName ?? '', payTag: r.payTag ?? '',
    loc: r.locName ?? '', locTag: r.locTag ?? '',
    region: REGION_GROUP(r.regName), regionName: r.regName ?? '',
    startKey: dayKey(r.start), endKey: dayKey(r.end),
    time: (r.time ?? '').trim(),
    tel: (r.tel ?? '').trim(),
    place: (r.location ?? r.oversee ?? '').trim(),
    addr: [r.addr1, r.addr2].map((s) => (s ?? '').trim()).filter(Boolean).join(' '),
    host: r.host ?? r.ownerName ?? '',
    homepage,
    link: safeUrl(r.link),
    intro: toText(r.intro),
    cover: r.cover ? IMG_BASE + r.cover : null,
    thumb: r.coverThumb ? IMG_BASE + r.coverThumb : r.cover ? IMG_BASE + r.cover : null,
    hit: r.hit ?? 0,
    pos: coords(r.x, r.y),
    verified: r._verified?.ok ? r._verified : null, // 서버가 검증 데이터와 실시간 대조한 결과
    corrected: r._corrected ?? [],
  }
}
