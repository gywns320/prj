// 비짓제주 관광정보를 화면에 내려주는 Vercel 서버 함수
//   GET /api/visitjeju?locale=kr  →  { updated, items: [...] }   (모든 페이지를 모아 필요한 항목만 추려서 응답)
// 가져오고 걸러내는 일은 _visitjeju.js 에 있습니다. API 키는 서버 환경변수 VISITJEJU_API_KEY 에만 있고 브라우저로는 나가지 않습니다.
import { KeyMissingError, LOCALES, fetchSights } from './_visitjeju.js'

export default async function handler(req, res) {
  const locale = LOCALES.has(req.query?.locale) ? req.query.locale : 'kr'
  try {
    const items = await fetchSights(locale)
    // 목록은 자주 바뀌지 않으니 하루 동안 CDN 에 캐시 (실패 응답은 캐시하지 않음)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ updated: Date.now(), items })
  } catch (e) {
    return res.status(e instanceof KeyMissingError ? 503 : 502).json({ error: e.message })
  }
}
