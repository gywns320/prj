// 실시간 Open API 응답에 '검증된 수정 목록'(_corrections.js)을 적용합니다.
// 항목·칸마다 지금 API 값을, 검증할 때 본 틀린 값(was)과 비교합니다.
//   API 값 == was       → 아직 틀린 그대로라 검증된 값(value)으로 바꿔서 출력
//   API 값 == value     → 원본이 이미 고쳐짐. 그대로 출력 (수정 목록에서 빼도 됨)
//   둘 다 아님          → 검증 뒤에 원본이 바뀜. 근거가 낡았으니 덮어쓰지 않고 원본을 출력하고 '다시 검증 필요'로 기록
// 수정 목록은 scripts/verify-apply.mjs 에서 사람이 승인한 것만 들어갑니다.
// 맞다고 확인된 칸(_verified)은 실시간 값이 그때와 같으면 _verified.ok = true 로 표시합니다 (화면의 '검증됨' 배지).
import { CORRECTIONS } from './_corrections.js'

const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim()

export const newStats = () => ({ applied: 0, hidden: 0, upstream: 0, verified: 0, stale: [] })

// kind: 'place' | 'event'. 숨김(_hide)이면 null 을 돌려줍니다.
// valuesToo=false 면 숨김만 적용 (수정값이 한국어라 다른 언어 응답에는 넣지 않음)
export function applyCorrections(kind, id, item, stats = newStats(), { valuesToo = true } = {}) {
  const fixes = CORRECTIONS[kind]?.[String(id)]
  if (!fixes || !item) return item
  const out = { ...item }
  const corrected = []
  for (const [field, f] of Object.entries(fixes)) {
    if (field === '_verified') {
      const changed = Object.entries(f.fields).filter(([k, v]) => !same(item[k], v)).map(([k]) => k)
      out._verified = changed.length
        ? { ok: false, changed, date: f.date } // 검증 뒤에 원본이 바뀐 칸이 있음 — 다시 검증 필요
        : { ok: true, fields: Object.keys(f.fields), date: f.date, evidence: f.evidence }
      if (changed.length) stats.stale.push(...changed.map((k) => `${kind}:${id}:${k}`))
      else stats.verified++
      continue
    }
    if (field === '_hide') {
      // 다른 장소·행사의 내용으로 판정된 항목 — 이름이 그때와 같을 때만 숨김
      if (same(item[f.on], f.was)) { stats.hidden++; return null }
      stats.stale.push(`${kind}:${id}:_hide`)
      continue
    }
    if (!valuesToo) continue
    if (same(out[field], f.was)) { out[field] = f.value; stats.applied++; corrected.push(field) }
    else if (same(out[field], f.value)) stats.upstream++
    else stats.stale.push(`${kind}:${id}:${field}`)
  }
  if (corrected.length) out._corrected = corrected // 원본과 다르게 고쳐서 보여주는 칸 (화면에서 안내용)
  return out
}

// 응답 헤더와 서버 로그에 남깁니다 (Vercel 로그에서 '다시 검증 필요' 항목 확인)
export function reportStats(res, stats) {
  res?.setHeader?.('X-Data-Corrections', `verified=${stats.verified}; applied=${stats.applied}; hidden=${stats.hidden}; upstream-fixed=${stats.upstream}; stale=${stats.stale.length}`)
  if (stats.stale.length) console.warn('[corrections] 원본이 바뀌어 다시 검증이 필요한 항목:', stats.stale.join(', '))
}
