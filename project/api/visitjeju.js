// 비짓제주 관광정보 OPEN API (제주관광공사, VisitJeju-OpenAPI-01) 를 감싸는 Vercel 서버 함수
//   GET /api/visitjeju?locale=kr  →  { updated, items: [...] }   (모든 페이지를 모아 필요한 항목만 추려서 응답)
// API 키는 서버 환경변수 VISITJEJU_API_KEY 에만 있고, 브라우저로는 절대 나가지 않습니다.
const UPSTREAM = 'https://api.visitjeju.net/vsjApi/contents/searchList'
const LOCALES = new Set(['kr', 'en', 'jp', 'cn', 'zh', 'my'])
const MAX_PAGES = 30 // 비정상 응답이 와도 무한히 부르지 않도록 상한

export default async function handler(req, res) {
  const key = process.env.VISITJEJU_API_KEY
  if (!key) return res.status(503).json({ error: '서버에 VISITJEJU_API_KEY 환경변수가 설정되지 않았어요' })

  const locale = LOCALES.has(req.query?.locale) ? req.query.locale : 'kr'

  // 응답·에러 메시지에 키가 섞여 나가지 않도록 가립니다
  const hide = (s) => String(s).split(key).join('***')

  async function getPage(page) {
    const url = `${UPSTREAM}?${new URLSearchParams({ apiKey: key, locale, page })}`
    const r = await fetch(url, { headers: { 'User-Agent': 'jeju-culture-calendar' }, signal: AbortSignal.timeout(9000) })
    const text = await r.text()
    let json
    try { json = JSON.parse(text) } catch {
      // 방화벽 차단 페이지(HTML) 등
      throw new Error('관광정보 서버가 요청을 받아주지 않았어요 (키 또는 접속 지역 제한을 확인하세요)')
    }
    if (!['00', '200', 200].includes(json.result)) throw new Error(json.resultMessage || '관광정보 API 오류')
    return json
  }

  try {
    const first = await getPage(1)
    const pageCount = Math.min(Number(first.pageCount) || 1, MAX_PAGES)
    const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, i) => getPage(i + 2)))
    const items = [first, ...rest].flatMap((p) => p.items ?? []).map(compact).filter(Boolean)

    // 목록은 자주 바뀌지 않으니 하루 동안 CDN 에 캐시 (실패 응답은 캐시하지 않음)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ updated: Date.now(), items })
  } catch (e) {
    return res.status(502).json({ error: hide(e.message) })
  }
}

// 응답 한 건에서 화면에 쓰는 항목만 남깁니다 (원본은 항목이 많아 용량이 큼)
function compact(i) {
  const n = (v) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null)
  let lat = n(i.latitude)
  let lng = n(i.longitude)
  if (lat > 126 && lat < 127 && lng > 33 && lng < 34) [lat, lng] = [lng, lat] // 위·경도가 뒤바뀐 데이터
  if (!i.contentsid || !i.title || !(lat > 33 && lat < 34) || !(lng > 126 && lng < 127)) return null
  const photo = i.repPhoto?.photoid ?? {}
  return {
    id: i.contentsid,
    title: String(i.title).trim(),
    cat: i.contentscd?.label ?? '기타',
    region: i.region1cd?.label ?? '',
    area: i.region2cd?.label ?? '',
    addr: i.roadaddress || i.address || '',
    tag: i.tag ?? '',
    intro: i.introduction ?? '',
    tel: i.phoneno ?? '',
    lat, lng,
    img: photo.imgpath ?? '',
    thumb: photo.thumbnailpath ?? '',
  }
}
