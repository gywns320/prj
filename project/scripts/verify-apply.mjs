// 검증 결과를 '수정 제안'으로 쌓고, 승인한 것만 사이트가 쓰는 수정 목록(api/_corrections.js)으로 내보냅니다.
//   npm run verify:apply                       — 새 제안을 모으고 목록 출력 (번호·상태·근거)
//   npm run verify:apply -- --approve 1,3      — 번호로 승인   (--approve rule : 규칙 검사 제안 전부, --approve all : 전부)
//   npm run verify:apply -- --reject 2         — 거절 (다시 모아도 되살아나지 않음)
//
// 제안 출처
//   rule  : verify-content.mjs 의 확실한 수정 (예: 라벨·주소·좌표 3개 중 2개가 일치하는데 라벨만 다른 경우 → 라벨을 고침)
//   agent : verify-agent.mjs 가 웹 근거로 '틀림' 판정한 칸 (근거 URL 이 있는 것만)
// 쌓이는 곳: verify/proposals.json (승인·거절 이력 포함, 날짜별로 누적)
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const V = (...p) => path.join(ROOT, 'verify', ...p)
const readJson = async (f, dflt) => { try { return JSON.parse(await readFile(f, 'utf8')) } catch { return dflt } }
const latest = async (dir, ext) => { try { return (await readdir(dir)).filter((f) => f.endsWith(ext)).sort().at(-1) } catch { return null } }
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)

const args = process.argv.slice(2)
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }

const proposals = await readJson(V('proposals.json'), [])
const byKey = new Map(proposals.map((p) => [p.key, p]))
let lastNo = Math.max(0, ...proposals.map((p) => p.no ?? 0))
const day = await latest(V('snapshots'), '')
const places = day ? await readJson(V('snapshots', day, 'places.json'), []) : []
const events = day ? await readJson(V('snapshots', day, 'events.json'), []) : []

function propose(p) {
  p.key = `${p.kind}:${p.id}:${p.field}`
  const old = byKey.get(p.key)
  // 이미 승인·거절한 제안은 같은 값이면 그대로 둠. 값이 달라졌으면 새 제안으로 다시 검토
  if (old && (old.status === 'pending' || String(old.value) === String(p.value))) return
  // 번호는 처음 만들 때 한 번만 붙이고 바꾸지 않음 — 새 제안이 들어와도 '--approve 3' 이 같은 항목을 가리키도록
  byKey.set(p.key, { no: old?.no ?? ++lastNo, ...p, created: today, status: 'pending' })
}

// ── 규칙 검사의 수정 ─────────────────────────────────────
const repFile = await latest(V('reports'), '.json')
if (repFile) {
  const rep = await readJson(V('reports', repFile), { issues: [] })
  for (const i of rep.issues) for (const [field, f] of Object.entries(i.fix ?? {}))
    propose({ kind: i.source, id: String(i.id), title: i.title, field, was: f.was, value: f.value, source: 'rule', note: `${i.check}: ${i.detail}`, evidence: [] })
}

// ── 외부 검증 에이전트의 수정 ────────────────────────────
// 에이전트가 본 칸 이름 → 원본 응답의 칸 이름과 값 형식 (행사는 원본 키가 다름)
const KST_DAY = (s) => Date.parse(`${s}T00:00:00+09:00`)
const EVENT_FIELD = {
  name: ['name'], category: ['categoryName'], time: ['time'], location: ['location'], host: ['host'], oversee: ['oversee'],
  addr: ['addr1'], region: ['regName'], pay: ['payName'], ticketPrice: ['ticketPrice'], tel: ['tel'], homepage: ['sns1'], booking: ['book1'],
  start: ['start', KST_DAY], end: ['end', KST_DAY],
}
const PLACE_FIELD = { title: ['title'], region: ['region'], area: ['area'], addr: ['addr'], tag: ['tag'], intro: ['intro'], tel: ['tel'], lat: ['lat', Number], lng: ['lng', Number] }

// history.jsonl 에서 항목마다 가장 최근 판정만 (같은 항목을 여러 번 검증했으면 마지막 것)
const agentLatest = new Map()
for (const line of (await readFile(V('agent', 'history.jsonl'), 'utf8').catch(() => '')).split('\n')) {
  // 웹 검색을 한 번도 못 한 판정(도구 오류)은 근거가 없으므로 쓰지 않음
  try { const h = JSON.parse(line); if (!h.error && h.usage?.searches > 0) agentLatest.set(`${h.kind}:${h.id}`, h) } catch { /* 빈 줄·깨진 줄 */ }
}
// 맞다고 확인된 칸 — 승인 없이 그대로 싣습니다. 사이트는 실시간 값이 이 값과 같을 때만 '검증됨'으로 표시
const verified = { place: {}, event: {} }
{
  for (const r of agentLatest.values()) {
    const raw = r.kind === 'place' ? places.find((x) => x.id === r.id) : events.find((x) => String(x.seq) === r.id)
    if (!raw || r.overall === 'different_entity') continue
    const fields = {}
    const evidence = new Set()
    for (const f of r.fields ?? []) {
      const map = (r.kind === 'place' ? PLACE_FIELD : EVENT_FIELD)[f.field]
      if (f.status !== 'correct' || !map || !f.evidence_urls?.length) continue
      fields[map[0]] = raw[map[0]] // 스냅샷의 원본 값 그대로 (형식이 실시간 응답과 같도록)
      f.evidence_urls.forEach((u) => evidence.add(u))
    }
    if (Object.keys(fields).length) verified[r.kind][r.id] = { fields, date: r.date, model: r.model ?? r.requested_model, evidence: [...evidence].slice(0, 5) }
  }
}

{
  for (const r of agentLatest.values()) {
    const raw = r.kind === 'place' ? places.find((x) => x.id === r.id) : events.find((x) => String(x.seq) === r.id)
    if (!raw) continue
    const src = `agent:${r.model ?? r.requested_model}`
    if (r.overall === 'different_entity') {
      const on = r.kind === 'place' ? 'title' : 'name'
      propose({ kind: r.kind, id: r.id, title: r.title, field: '_hide', on, was: raw[on], value: true, source: src, note: `다른 장소·행사의 내용: ${r.summary}`, evidence: r.fields.flatMap((f) => f.evidence_urls) })
      continue
    }
    for (const f of r.fields ?? []) {
      if (f.status !== 'wrong' || !f.evidence_urls?.length) continue // 근거 없는 '틀림'은 받지 않음
      const map = (r.kind === 'place' ? PLACE_FIELD : EVENT_FIELD)[f.field]
      if (!map) continue
      const [key, conv = (v) => v] = map
      // 소개글은 고칠 문장이 없으면 틀린 소개를 비워서 감춤
      if (!f.actual_value && !(r.kind === 'place' && key === 'intro')) continue
      const value = conv(f.actual_value)
      if (typeof value === 'number' && !Number.isFinite(value)) continue
      // 지역 라벨(region·area)은 데이터 자체의 분류값('한경', '추차도' 등)이라, AI 가 '한경면'·'추자도'처럼 다르게 적어도
      // 같은 칸의 규칙 수정이 있으면 덮어쓰지 않고 그 수정의 외부 근거로만 붙입니다. 데이터에 없는 라벨 값은 받지 않습니다.
      if (r.kind === 'place' && (key === 'region' || key === 'area')) {
        const existing = byKey.get(`place:${r.id}:${key}`)
        if (existing) { existing.evidence = [...new Set([...(existing.evidence ?? []), ...f.evidence_urls])]; continue }
        if (!places.some((p) => p[key] === value)) continue
      }
      propose({ kind: r.kind, id: r.id, title: r.title, field: key, was: raw[key], value, source: src, note: f.note, evidence: f.evidence_urls })
    }
  }
}

// ── 승인·거절 ───────────────────────────────────────────
for (const p of byKey.values()) p.no ??= ++lastNo // 번호 없이 저장된 옛 제안
const list = [...byKey.values()].sort((a, b) => a.no - b.no)
const pick = (spec) => {
  if (!spec) return []
  if (spec === 'all') return list.filter((p) => p.status === 'pending')
  if (spec === 'rule') return list.filter((p) => p.status === 'pending' && p.source === 'rule')
  const nos = new Set(spec.split(',').map(Number))
  return list.filter((p) => nos.has(p.no))
}
for (const p of pick(arg('--approve'))) Object.assign(p, { status: 'approved', decided: today })
for (const p of pick(arg('--reject'))) Object.assign(p, { status: 'rejected', decided: today })
await writeFile(V('proposals.json'), JSON.stringify(list, null, 1))

// ── 승인된 것 → api/_corrections.js ─────────────────────
const out = { place: {}, event: {} }
for (const p of list.filter((x) => x.status === 'approved')) {
  const entry = { was: p.was, value: p.value, source: p.source, evidence: p.evidence, verified: p.decided }
  if (p.field === '_hide') entry.on = p.on
  ;(out[p.kind][p.id] ??= {})[p.field] = entry
}
for (const kind of ['place', 'event']) for (const [id, v] of Object.entries(verified[kind])) (out[kind][id] ??= {})._verified = v
// 학생에게 줄 파일은 이것 하나 — 학생은 api/_corrections.js 를 이 파일로 바꾸고 배포만 하면 됨
await writeFile(path.join(ROOT, 'api', '_corrections.js'),
  `// 자동 생성 파일 (${today}) — scripts/verify-apply.mjs 가 만듭니다. 손으로 고치지 마세요.\n` +
  '// { place|event: { id: { 칸: { was, value, source, evidence, verified }, _verified: { fields, date, model, evidence } } } }\n' +
  `export const CORRECTIONS = ${JSON.stringify(out, null, 1)}\n`)

const mark = { pending: '⏳', approved: '✅', rejected: '✖' }
const show = (v) => (typeof v === 'number' && v > 1e12 ? new Date(v + 9 * 3600e3).toISOString().slice(0, 10) : v) // 행사 날짜(ms)는 읽기 쉽게
list.forEach((p) => console.log(`${String(p.no).padStart(3)} ${mark[p.status]} [${p.source}] ${p.title} · ${p.field}: "${show(p.was)}" → "${show(p.value)}"${p.evidence?.length ? `  근거 ${p.evidence[0]}` : ''}`))
const n = (s) => list.filter((p) => p.status === s).length
const nVerified = Object.keys(verified.place).length + Object.keys(verified.event).length
console.log(`\n수정: 대기 ${n('pending')} · 승인 ${n('approved')} · 거절 ${n('rejected')}  ·  검증됨(맞음) ${nVerified}건`)
console.log('→ api/_corrections.js 갱신. 이 파일을 학생에게 주면 됩니다 (학생은 교체 후 배포).')
