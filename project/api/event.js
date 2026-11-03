// 제주in놀다 「제주특별자치도 전시문화행사정보」 OpenAPI (Jeju-OpenAPI-I01) 를 감싸는 서버 함수
//   GET /api/event?page=&pageSize=&category=&pay=&loc=   (목록)
//   GET /api/event?event={seq}                           (상세)
// 상대 서버가 CORS 를 허용하지 않아 브라우저가 직접 부를 수 없으므로 이 함수가 대신 호출합니다. (키는 필요 없음)
import { applyCorrections, newStats, reportStats } from './_apply.js'

const UPSTREAM = 'https://www.jejunolda.com/api/event/'
const ALLOWED = ['page', 'pageSize', 'category', 'pay', 'loc', 'event'] // 이 파라미터만 전달 — 임의의 요청을 대신 보내 주지 않도록

export default async function handler(req, res) {
  const qs = new URLSearchParams()
  for (const k of ALLOWED) {
    const v = req.query?.[k]
    if (v != null && /^[\w-]{1,10}$/.test(String(v))) qs.set(k, String(v))
  }

  try {
    const r = await fetch(`${UPSTREAM}?${qs}`, {
      headers: { 'User-Agent': 'jeju-culture-calendar', Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    })
    const text = await r.text()
    let json
    try { json = JSON.parse(text) } catch {
      return res.status(502).json({ error: '행사 서버 응답을 읽을 수 없어요' })
    }
    if (!r.ok) return res.status(502).json({ error: `행사 서버가 응답하지 않아요 (${r.status})` })

    // 검증된 수정 목록 적용 (목록·상세 모두). 상세 응답의 키는 원본 오타('evnet')일 수 있음
    const stats = newStats()
    if (Array.isArray(json.items)) json.items = json.items.map((e) => applyCorrections('event', e.seq, e, stats)).filter(Boolean)
    for (const k of ['event', 'evnet']) if (json[k]) json[k] = applyCorrections('event', json[k].seq, json[k], stats)
    reportStats(res, stats)

    // 행사 정보는 자주 바뀌지 않으니 10분간 CDN 에 캐시 (실패 응답은 캐시하지 않음)
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json(json)
  } catch {
    return res.status(502).json({ error: '행사 서버에 연결할 수 없어요' })
  }
}
