import { tr } from '../i18n'

// 비짓제주 관광정보 — 키가 필요한 API 라서 직접 부르지 않고, 키를 가진 서버 함수(/api/visitjeju)를 거칩니다.
// 서버 함수가 모든 페이지를 모아 필요한 항목만 돌려주므로 여기서는 한 번만 부르면 됩니다.

// locale: 비짓제주가 지원하는 언어 코드 (kr, en, cn, jp) — 관광지 이름·소개가 그 언어로 옵니다
export async function fetchPlaces(locale = 'kr') {
  let res
  try { res = await fetch(`/api/visitjeju?locale=${encodeURIComponent(locale)}`) }
  catch { throw new Error('err.net') }
  const data = await res.json().catch(() => null)
  if (!res.ok || !Array.isArray(data?.items)) throw new Error(data?.error || `err.placesHttp:${res.status}`)
  return data.items.map(normalize)
}

// 이미지는 https 로 (http 이미지는 https 사이트에서 차단됨)
const https = (u) => (u ? u.replace(/^http:\/\//i, 'https://') : null)

function normalize(p) {
  return {
    id: p.id,
    title: p.title,
    category: p.cat || tr('cat.기타'),
    region: [p.region, p.area].filter(Boolean).join(' '),
    addr: p.addr,
    tags: p.tag.split(',').map((t) => t.trim()).filter(Boolean),
    intro: p.intro.trim(),
    tel: p.tel,
    pos: { lat: p.lat, lng: p.lng },
    img: https(p.img),
    thumb: https(p.thumb) ?? https(p.img),
  }
}
