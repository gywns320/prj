// 검증 에이전트 — 선생님 PC에서 이것 하나만 돌리면 학생에게 줄 데이터 폴더가 나옵니다.
//   npm run agent                          — 의심 항목만 AI 검증 (기본 상한 $10)
//   npm run agent -- --all --max-usd 50    — 전체 약 410건 AI 검증 (끊겨도 다시 돌리면 이어서)
//   npm run agent -- --no-ai               — AI 없이 규칙 검사만 (무료)
//   npm run agent -- --approve 12,15       — 대기 중인 AI 수정을 번호로 승인하고 전달 폴더만 다시 만듦
//   (그 밖의 옵션은 verify-agent.mjs 로 그대로 전달: --limit, --concurrency, --fresh)
//
// 하는 일
//   ① verify-content : 최신 Open API 데이터를 받아 스냅샷 저장 + 규칙 검사
//   ② verify-agent   : Claude 가 웹 검색으로 항목을 외부 출처와 대조 (ANTHROPIC_API_KEY 필요)
//   ③ verify-apply   : 규칙 검사의 수정은 자동 승인, AI 수정은 근거와 함께 승인 대기 → api/_corrections.js
//   ④ handoff/YYYY-MM-DD/ : 학생에게 줄 파일 (검증 데이터 + 처음 한 번 필요한 코드 + 안내문)
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try { process.loadEnvFile(path.join(ROOT, '.env.local')) } catch { /* 없으면 환경변수만 사용 */ }

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const OWN = ['--no-ai', '--approve']
const passThrough = args.filter((a, i) => !OWN.includes(a) && !OWN.includes(args[i - 1]))
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)

function run(title, script, extra = []) {
  console.log(`\n━━ ${title} ━━`)
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...extra], { stdio: 'inherit', cwd: ROOT })
  // verify-content 는 '오류 항목이 있음'을 종료 코드 1로 알려 주므로 실패로 보지 않음
  if (r.status !== 0 && script !== 'verify-content.mjs') { console.error(`\n${script} 이(가) 실패했어요 (종료 코드 ${r.status}). 위 메시지를 확인하세요.`); process.exit(r.status ?? 1) }
}

if (has('--approve')) {
  run('승인', 'verify-apply.mjs', ['--approve', arg('--approve')])
} else {
  run('① 최신 데이터 받기 · 규칙 검사', 'verify-content.mjs')
  if (has('--no-ai')) console.log('\n━━ ② AI 외부 검증 ━━\n--no-ai: 건너뜀')
  else if (!process.env.ANTHROPIC_API_KEY) console.log('\n━━ ② AI 외부 검증 ━━\nANTHROPIC_API_KEY 가 없어 건너뜀 (.env.local 에 넣으면 실행됩니다). 규칙 검사 결과만으로 만듭니다.')
  else run('② AI 외부 검증 (웹 검색)', 'verify-agent.mjs', passThrough.includes('--max-usd') ? passThrough : [...passThrough, '--max-usd', '10'])
  run('③ 수정 정리 (규칙 검사 수정은 자동 승인)', 'verify-apply.mjs', ['--approve', 'rule'])
}

// ── ④ 학생에게 줄 폴더 ──────────────────────────────────
// 처음 한 번 필요한 코드까지 매번 같이 넣습니다 (이미 있으면 덮어써도 같은 내용)
const FILES = [
  'api/_corrections.js', 'api/_apply.js', 'api/_visitjeju.js', 'api/visitjeju.js', 'api/event.js', 'api/_tools.js',
  'src/components/VerifyBadge.jsx', 'src/api/places.js', 'src/api/events.js', 'src/pages/EventDetail.jsx',
  'src/components/NearbyPlaces.jsx', 'src/i18n/messages.extra.js', 'src/styles/theme.css',
]
const out = path.join(ROOT, 'handoff', today)
await rm(out, { recursive: true, force: true })
for (const f of FILES) { await mkdir(path.dirname(path.join(out, f)), { recursive: true }); await cp(path.join(ROOT, f), path.join(out, f)) }
// 학생용 설명 페이지 (브라우저로 열면 애니메이션으로 흐름을 보여줌)
await cp(path.join(ROOT, 'verify', 'student-guide.html'), path.join(out, '학생안내.html')).catch(() => {})

// 이번 데이터 요약
const src = await readFile(path.join(ROOT, 'api', '_corrections.js'), 'utf8')
const data = JSON.parse(src.slice(src.indexOf('{', src.indexOf('CORRECTIONS'))).trim())
const proposals = JSON.parse(await readFile(path.join(ROOT, 'verify', 'proposals.json'), 'utf8').catch(() => '[]'))
const count = (kind, test) => Object.values(data[kind]).filter(test).length
const s = {
  fixedPlaces: count('place', (v) => Object.keys(v).some((k) => !k.startsWith('_'))),
  fixedEvents: count('event', (v) => Object.keys(v).some((k) => !k.startsWith('_'))),
  hidden: count('place', (v) => v._hide) + count('event', (v) => v._hide),
  verified: count('place', (v) => v._verified) + count('event', (v) => v._verified),
  pending: proposals.filter((p) => p.status === 'pending'),
}

await writeFile(path.join(out, '학생에게.md'), `# 제주 API 검증 데이터 (${today})

이 폴더의 파일을 프로젝트에 **같은 경로로 덮어쓰고 배포**하면 됩니다. API 키는 필요 없습니다.

- 처음 받을 때: 폴더 안의 파일 전부 덮어쓰기 (실시간 대조 코드 + 화면 배지)
- 그다음부터: \`api/_corrections.js\` 하나만 바뀝니다

이번 데이터: 수정한 관광지 ${s.fixedPlaces}곳 · 행사 ${s.fixedEvents}건 · 숨김 ${s.hidden}건 · 검증됨 ${s.verified}건

## 사이트에서 일어나는 일
사이트가 Open API 를 부를 때마다 응답을 이 데이터와 비교합니다.
- 검증한 값과 같음 → 그대로 보여주고 「✓ 검증됨」
- 틀렸다고 확인된 값 그대로 → 확인된 값으로 고쳐서 「정보 보정」
- 그 사이 원본이 바뀜 → 원본 그대로 (서버 로그에 '다시 검증 필요')
- 다른 장소의 내용 → 목록에서 숨김

## 확인
배포 후 브라우저 개발자 도구 → Network → \`/api/visitjeju\` 또는 \`/api/event\` 응답 헤더:
\`X-Data-Corrections: verified=… ; applied=… ; hidden=… ; upstream-fixed=… ; stale=…\`
\`stale\` 이 0보다 크면 선생님께 알려 주세요 (다시 검증 필요).
`)

console.log(`\n━━ ④ 학생에게 줄 폴더 ━━`)
console.log(`handoff/${today}/  (파일 ${FILES.length}개 + 학생에게.md + 학생안내.html)`)
console.log(`수정 관광지 ${s.fixedPlaces} · 행사 ${s.fixedEvents} · 숨김 ${s.hidden} · 검증됨 ${s.verified}`)
if (s.pending.length) {
  console.log(`\nAI 수정 ${s.pending.length}건이 승인 대기 중입니다 (근거를 보고 고르세요):`)
  // 행사 날짜(ms)는 읽기 쉽게, 원래 값도 같이 보여 줌
  const show = (v) => (typeof v === 'number' && v > 1e12 ? new Date(v + 9 * 3600e3).toISOString().slice(0, 10) : v)
  for (const p of s.pending) console.log(`  ${String(p.no).padStart(3)} ${p.title} · ${p.field}: "${String(show(p.was)).slice(0, 40)}" → "${show(p.value)}"  ${p.evidence?.[0] ?? ''}`)
  console.log('승인: npm run agent -- --approve 번호,번호   (전부: --approve all)')
}
