// 같은 항목을 여러 모델이 판정한 결과 비교 — verify/agent/history.jsonl 에서 항목·모델별 마지막 판정을 모아 표로 만듭니다.
//   npm run verify:compare                                     — 두 모델 이상이 판정한 항목 전부
//   npm run verify:compare -- --ids-file verify/agent/recheck-ids.txt   — 지정한 항목만
// 결과: verify/agent/compare-YYYY-MM-DD.md (판정 바뀜 표 + 모델별 확인 불가 비율·건당 비용)
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const PRICE = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5] }
const usd = (m, u = {}) => { const [i, o] = PRICE[m] ?? [5, 25]; return ((u.input ?? 0) * i + (u.output ?? 0) * o) / 1e6 + (u.searches ?? 0) * 0.01 }

const rows = (await readFile(path.join(ROOT, 'verify', 'agent', 'history.jsonl'), 'utf8')).split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((r) => r && !r.error)
// 검색 0회 판정은 모델의 판단이 아니라 도구 오류라 따로 셉니다 (--include-nosearch 로 포함)
const noSearch = rows.filter((r) => !(r.usage?.searches > 0))
if (!args.includes('--include-nosearch')) rows.splice(0, rows.length, ...rows.filter((r) => r.usage?.searches > 0))
const only = arg('--ids-file') ? new Set((await readFile(path.resolve(ROOT, arg('--ids-file')), 'utf8')).split(/[\s,]+/).filter(Boolean)) : null

// 항목 → 모델 → 마지막 판정
const by = new Map()
for (const r of rows) {
  if (only && !only.has(r.id)) continue
  const m = r.model ?? r.requested_model
  if (!by.has(r.id)) by.set(r.id, { title: r.title, kind: r.kind, models: {} })
  by.get(r.id).models[m] = r
}
const items = [...by.entries()].filter(([, v]) => Object.keys(v.models).length >= 2)
const models = [...new Set(items.flatMap(([, v]) => Object.keys(v.models)))].sort()
if (!items.length) { console.log('두 모델 이상이 판정한 항목이 없어요.'); process.exit(0) }

const stat = Object.fromEntries(models.map((m) => [m, { n: 0, unverifiable: 0, ok: 0, has_errors: 0, different_entity: 0, usd: 0, searches: 0 }]))
for (const [, v] of items) for (const m of models) {
  const r = v.models[m]
  if (!r) continue
  const s = stat[m]
  s.n++; s[r.overall] = (s[r.overall] ?? 0) + 1; s.usd += usd(m, r.usage); s.searches += r.usage?.searches ?? 0
}
const changed = items.filter(([, v]) => new Set(models.map((m) => v.models[m]?.overall).filter(Boolean)).size > 1)
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-')

const md = [
  `# 모델 비교 — ${today}`, '',
  `같은 항목 ${items.length}건을 ${models.join(' · ')} 가 각각 판정한 결과입니다.`, '',
  '| 모델 | 건수 | 정상 | 오류 있음 | 확인 불가 | 건당 웹 검색 | 건당 비용(추정) |', '|---|---|---|---|---|---|---|',
  ...models.map((m) => { const s = stat[m]; return `| ${m} | ${s.n} | ${s.ok} | ${s.has_errors} | ${s.unverifiable} (${pct(s.unverifiable, s.n)}) | ${(s.searches / s.n).toFixed(1)} | $${(s.usd / s.n).toFixed(3)} |` }),
  '', `## 판정이 달라진 항목 ${changed.length}건`, '',
  `| 항목 | ${models.join(' | ')} |`, `|---|${models.map(() => '---').join('|')}|`,
  ...changed.map(([id, v]) => `| ${v.title} (${id}) | ${models.map((m) => { const r = v.models[m]; return r ? `**${r.overall}** — ${String(r.summary ?? '').replace(/\|/g, '/').slice(0, 140)}` : '' }).join(' | ')} |`),
]
const out = path.join(ROOT, 'verify', 'agent', `compare-${today}.md`)
await writeFile(out, md.join('\n') + '\n')

console.log(`같은 항목 ${items.length}건 비교\n`)
for (const m of models) { const s = stat[m]; console.log(`${m.padEnd(18)} 정상 ${s.ok} · 오류 있음 ${s.has_errors} · 확인 불가 ${s.unverifiable} (${pct(s.unverifiable, s.n)}) · 건당 $${(s.usd / s.n).toFixed(3)}`) }
console.log(`\n판정이 달라진 항목 ${changed.length}건 → ${path.relative(ROOT, out)}`)
if (noSearch.length && !args.includes('--include-nosearch')) console.log(`(웹 검색 0회 판정 ${noSearch.length}건은 도구 오류로 보고 뺐습니다 — 포함하려면 --include-nosearch)`)
