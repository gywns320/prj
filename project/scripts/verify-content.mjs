// 제주 API 데이터 '내용' 검증 — 형식(JSON 구조)은 맞는데 값이 그 장소·행사의 것이 아닌 항목을 찾습니다.
//   node scripts/verify-content.mjs            (npm run verify)
//
// 정답(실제 현장)을 모르므로 "한 항목 안의 여러 증거가 서로 맞는지"와 "다른 항목들과 비교해 튀는지"로 판정합니다.
//   [위치 2-of-3 투표] 지역 라벨 · 주소의 읍면 · 좌표 주변 이웃들의 읍면 — 둘이 맞고 하나가 다르면 그 하나를 틀린 칸으로 지목
//   [소개글] 자리채움 글(· 올레15코스 등) · 다른 장소와 똑같은 소개 · 이름의 성격(오름·해변·폭포…)과 맞지 않는 소개 · 다른 읍면 언급
//   [행사] 본문의 장소·날짜·요일·요금이 구조화 필드(location·addr1·start·end·payName)와 다른지
//
// 결과: verify/reports/YYYY-MM-DD.{md,json}, 원본 스냅샷: verify/snapshots/YYYY-MM-DD/{events,places}.json
// 관광지는 VISITJEJU_API_KEY 가 있으면 직접, 없으면 배포된 /api/visitjeju (VERIFY_BASE_URL) 에서 받습니다.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try { process.loadEnvFile(path.join(ROOT, '.env.local')) } catch { /* 없으면 환경변수만 사용 */ }
const BASE = process.env.VERIFY_BASE_URL || 'https://project-alpha-ivory-34.vercel.app'
const EVENTS_URL = 'https://www.jejunolda.com/api/event/?page=1&pageSize=500'

// ── 데이터 받기 ──────────────────────────────────────────
async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'jeju-culture-calendar-verify' }, signal: AbortSignal.timeout(60000) })
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

async function loadPlaces() {
  if (process.env.VISITJEJU_API_KEY) {
    const { fetchSights } = await import('../api/_visitjeju.js')
    return { from: 'visitjeju (직접)', items: await fetchSights('kr') }
  }
  const d = await getJson(`${BASE}/api/visitjeju?locale=kr`)
  return { from: `${BASE}/api/visitjeju`, items: d.items ?? [] }
}

// ── 위치 정규화 ──────────────────────────────────────────
// 비짓제주 area 라벨 → 읍면 (원본에 '추차도' 오타가 있어 함께 받습니다)
const AREA_TOWN = {
  제주시내: '제주시(동)', 서귀포시내: '서귀포시(동)', 중문: '서귀포시(동)',
  한림: '한림읍', 애월: '애월읍', 구좌: '구좌읍', 조천: '조천읍', 한경: '한경면', 추자도: '추자면', 추차도: '추자면', 우도: '우도면',
  대정: '대정읍', 마라도: '대정읍', 가파도: '대정읍', 남원: '남원읍', 성산: '성산읍', 안덕: '안덕면', 표선: '표선면',
}
const TOWNS = ['한림읍', '애월읍', '구좌읍', '조천읍', '한경면', '추자면', '우도면', '대정읍', '남원읍', '성산읍', '안덕면', '표선면']
const cityOf = (town) => (town?.startsWith('서귀포') || ['대정읍', '남원읍', '성산읍', '안덕면', '표선면'].includes(town) ? '서귀포시' : town ? '제주시' : null)

function townOfAddr(addr) {
  const a = String(addr ?? '').replace('성산면', '성산읍').replace(/추자도/, '추자면')
  const t = TOWNS.find((x) => a.includes(x))
  if (t) return t
  const city = a.match(/(?:^|\s)(제주시|서귀포시)(?:\s|$)/)?.[1]
  return city ? `${city}(동)` : null
}

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// 좌표가 가리키는 읍면 — 라벨과 주소가 서로 맞는 '믿을 만한' 장소들 중 가까운 7곳의 다수결 (5표 이상일 때만 확정)
function makeCoordTown(anchors) {
  return (pos, selfId) => {
    if (!pos) return null
    const near = anchors.filter((a) => a.id !== selfId).map((a) => ({ town: a.town, km: distanceKm(pos, a) }))
      .sort((x, y) => x.km - y.km).slice(0, 7)
    const votes = {}
    for (const n of near) votes[n.town] = (votes[n.town] ?? 0) + 1
    const [town, n] = Object.entries(votes).sort((x, y) => y[1] - x[1])[0] ?? []
    return n >= 5 ? { town, nearestKm: near.find((x) => x.town === town)?.km ?? 0 } : null
  }
}

// ── 결과 모으기 ──────────────────────────────────────────
const issues = []
// fix: 확실하게 고칠 값이 있을 때만 { 칸: { was: 지금 값, value: 고칠 값 } } — verify-apply.mjs 가 수정 제안으로 모읍니다
const add = (source, item, check, severity, detail, evidence = {}, fix = null) =>
  issues.push({ source, id: item.id, title: item.title, check, severity, detail, evidence, ...(fix && { fix }) })

// ── 관광지(비짓제주) 검사 ────────────────────────────────
// 이름 끝말이 말해 주는 성격과, 소개·태그에 있어야 할 말
const KIND = [
  { name: /오름$|봉$|악$/, need: /오름|분화구|봉우리|정상|능선|화구|산책|탐방|굼부리/, label: '오름' },
  { name: /해변$|해수욕장$/, need: /해변|바다|모래|해수욕|물놀이|해안/, label: '해변' },
  { name: /폭포$/, need: /폭포|물줄기|물이 떨어/, label: '폭포' },
  { name: /박물관$|미술관$/, need: /전시|소장|박물관|미술관|작품|유물/, label: '전시관' },
]
const BUSINESS = /운영하고 있|운영합니다|판매|브랜드|매장|쇼핑몰|구매|예약 문의|체험비|원데이|창업/

function checkPlaces(places, coordTown) {
  const byIntro = new Map()
  for (const p of places) {
    const intro = (p.intro ?? '').trim()
    if (intro) byIntro.set(intro, [...(byIntro.get(intro) ?? []), p])
  }

  // 읍면마다 데이터에서 가장 많이 쓰인 라벨 (예: 추자면 → 섬 속의 섬/추차도) — 라벨을 고칠 때 이 값으로
  const tally = {}
  for (const p of places) {
    const t = townOfAddr(p.addr)
    if (t && AREA_TOWN[p.area] === t) { const k = `${p.region}\t${p.area}`; (tally[t] ??= {})[k] = (tally[t][k] ?? 0) + 1 }
  }
  const labelOf = (town) => {
    const [k] = Object.entries(tally[town] ?? {}).sort((a, b) => b[1] - a[1])[0] ?? []
    if (!k) return null
    const [region, area] = k.split('\t')
    return { region, area }
  }
  const labelFix = (p, town) => {
    const l = labelOf(town)
    if (!l) return null
    const fix = {}
    if (l.region !== p.region) fix.region = { was: p.region, value: l.region }
    if (l.area !== p.area) fix.area = { was: p.area, value: l.area }
    return Object.keys(fix).length ? fix : null
  }

  for (const p of places) {
    const pos = p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null
    const areaTown = AREA_TOWN[p.area] ?? null
    const addrTown = townOfAddr(p.addr)
    const ct = coordTown(pos, p.id)
    const ev = { 라벨: `${p.region}/${p.area}`, 주소: p.addr, 좌표: pos && `${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`, 좌표기준읍면: ct?.town }

    // 위치 2-of-3 투표
    if (areaTown && addrTown && areaTown !== addrTown) {
      if (ct?.town === addrTown) add('place', p, '지역 라벨 오류', 'error', `라벨은 ${p.area}(${areaTown})인데 주소와 좌표는 모두 ${addrTown}`, ev, labelFix(p, addrTown))
      else if (ct?.town === areaTown) add('place', p, '주소 오류', 'error', `주소는 ${addrTown}인데 라벨과 좌표는 모두 ${areaTown}`, ev)
      else add('place', p, '라벨·주소 불일치', 'warn', `라벨 ${areaTown} ≠ 주소 ${addrTown} (좌표로도 판정 불가)`, ev)
    } else if (areaTown && addrTown && ct && ct.town !== addrTown && ct.nearestKm < 1.5) {
      // 경계 근처의 흔들림을 피하려고, 다른 읍면 장소가 1.5km 안에 몰려 있을 때만
      add('place', p, '좌표 오류', 'warn', `라벨·주소는 ${addrTown}인데 좌표 주변은 ${ct.town}`, ev)
    }
    if (p.region && p.region !== '섬 속의 섬' && addrTown && cityOf(addrTown) !== p.region)
      // 좌표로 확인되지 않은 경우라 자동 수정값은 내지 않음 — 외부 검증(verify-agent)으로 확인
      add('place', p, '시 라벨 오류', 'error', `시 라벨 ${p.region} ≠ 주소의 시 ${cityOf(addrTown)}`, ev)

    // 소개글
    const intro = (p.intro ?? '').trim()
    // 짧은 한 줄 소개("자연으로 빚은 성벽")는 정상이라, 목록 기호로 시작하거나 아주 짧은 것만
    if (intro && (intro.length < 6 || /^[·\-*•]/.test(intro)))
      add('place', p, '소개 자리채움', 'warn', `소개가 장소 설명이 아님: "${intro}"`)
    const same = byIntro.get(intro)?.filter((o) => o.title !== p.title) ?? []
    if (intro && same.length) add('place', p, '소개 중복', 'warn', `다른 장소와 소개가 같음: ${same.map((o) => o.title).join(', ')}`)

    // 이름의 성격 ↔ 소개·태그 ('목화오름축제'처럼 이름을 그대로 담은 태그는 근거가 못 되므로 뺌. '오름' 같은 분류 태그는 남김)
    const kind = KIND.find((k) => k.name.test(p.title))
    if (kind && intro) {
      const tags = String(p.tag ?? '').split(',').filter((t) => t && !t.includes(p.title)).join(' ')
      if (!kind.need.test(`${intro} ${tags}`))
        add('place', p, '이름-소개 성격 불일치', BUSINESS.test(intro) ? 'error' : 'warn',
          `이름은 ${kind.label}인데 소개·태그에 ${kind.label} 이야기가 없음${BUSINESS.test(intro) ? ' (업체 소개로 보임)' : ''}`, { 소개: intro, 태그: p.tag })
    }
    const mentioned = TOWNS.filter((t) => intro.includes(t))
    if (mentioned.length && addrTown && !mentioned.includes(addrTown) && !addrTown.endsWith('(동)'))
      add('place', p, '소개에 다른 읍면', 'warn', `소개는 ${mentioned.join('·')}, 주소는 ${addrTown}`, { 소개: intro })
  }
}

// ── 행사(제주in놀다) 검사 ────────────────────────────────
const kstDay = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10)
const WEEK = '일월화수목금토'
const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;/g, ' ')
const bigrams = (s) => { const t = String(s ?? '').replace(/[\s()[\]·,.\-_<>「」《》『』]/g, ''); return new Set(Array.from({ length: Math.max(0, t.length - 1) }, (_, i) => t.slice(i, i + 2))) }
const overlap = (a, b) => { const A = bigrams(a); const B = bigrams(b); if (!A.size || !B.size) return null; let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.min(A.size, B.size) }

function checkEvents(raw, coordTown) {
  for (const r of raw) {
    const e = { id: r.seq, title: (r.name ?? '').trim() }
    const intro = plain(r.intro)
    const start = kstDay(r.start)
    const end = kstDay(r.end)

    // 본문의 장소 ↔ location·주최·주소
    const placeLine = intro.match(/(?:장소|위치|주소)\s*[:：]\s*([^\r\n|]+)/)?.[1]?.trim()
    const fields = [r.location, r.oversee, r.host, r.addr1, r.addr2].filter(Boolean).join(' ')
    if (placeLine) {
      const ov = overlap(placeLine, fields)
      if (ov === null) add('event', e, '장소 필드 없음', 'info', `본문은 "${placeLine.slice(0, 40)}"인데 장소·주소 필드가 비어 있음`)
      else if (ov < 0.25) add('event', e, '본문-장소 불일치', 'warn', `본문 장소 "${placeLine.slice(0, 40)}" ↔ 필드 "${fields.slice(0, 60)}"`, { 겹침: ov.toFixed(2) })
    }

    // 본문의 날짜·요일 ↔ start·end
    for (const m of intro.matchAll(/(20\d\d)\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})\s*일?\.?\s*(?:\(\s*([일월화수목금토])\s*\))?/g)) {
      const day = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
      const d = new Date(`${day}T00:00:00Z`)
      if (Number.isNaN(d.getTime())) continue
      if (m[4] && WEEK[d.getUTCDay()] !== m[4])
        add('event', e, '본문 요일 오류', 'warn', `${day}는 ${WEEK[d.getUTCDay()]}요일인데 본문은 (${m[4]})`, { 원문: m[0] })
      if (day > end) add('event', e, '본문 날짜가 기간 밖', 'warn', `본문 ${day} > 등록된 종료일 ${end} (기간 ${start}~${end})`, { 원문: m[0] })
    }

    // 본문의 요금 ↔ payName·ticketPrice  ('주차 무료' 같은 말은 빼려고 요금 줄만 봅니다)
    for (const line of intro.split(/\r?\n|❶|❷|❸|❹|❺|❻|❼|ㅇ /)) {
      if (!/참가비|참여비|관람료|입장료|수강료|요금|티켓|체험비/.test(line)) continue
      const free = /무료/.test(line)
      const won = Number(line.match(/([\d,]{3,})\s*원/)?.[1]?.replace(/,/g, '') ?? 0)
      if (free && !won && r.payName === '유료') add('event', e, '요금 불일치', 'warn', `본문은 무료, 필드는 유료(${r.ticketPrice ?? '금액 없음'})`, { 원문: line.trim().slice(0, 60) })
      if (won > 0 && !free && r.payName === '무료') add('event', e, '요금 불일치', 'warn', `본문은 ${won.toLocaleString()}원, 필드는 무료`, { 원문: line.trim().slice(0, 60) })
      if (won > 0 && r.ticketPriceInt && won !== r.ticketPriceInt && !/[~,/]|할인|성인|어린이|청소년/.test(line))
        add('event', e, '요금 불일치', 'info', `본문 ${won.toLocaleString()}원 ≠ 필드 ${r.ticketPriceInt.toLocaleString()}원`, { 원문: line.trim().slice(0, 60) })
    }

    // 위치: 권역(regName) · 주소 · 좌표
    const addrTown = townOfAddr(r.addr1)
    const regCity = r.regName ? (r.regName.startsWith('서귀포') ? '서귀포시' : '제주시') : null
    if (regCity && addrTown && cityOf(addrTown) !== regCity) add('event', e, '권역 라벨 오류', 'error', `권역 ${r.regName} ≠ 주소 ${r.addr1}`)
    const [x, y] = [Number(r.x), Number(r.y)]
    const pos = x && y ? { lat: Math.min(x, y), lng: Math.max(x, y) } : null
    if (pos && !(pos.lat > 33 && pos.lat < 34 && pos.lng > 126 && pos.lng < 127.1)) add('event', e, '좌표가 제주 밖', 'error', `${pos.lat},${pos.lng}`)
    const ct = coordTown(pos, null)
    if (addrTown && ct && ct.town !== addrTown && ct.nearestKm < 1.5)
      add('event', e, '좌표-주소 불일치', 'warn', `주소는 ${addrTown}인데 좌표 주변은 ${ct.town}`, { 주소: r.addr1, 좌표: `${pos.lat},${pos.lng}` })
  }
}

// ── 실행 ────────────────────────────────────────────────
const today = kstDay(Date.now())
const [eventsJson, places] = await Promise.all([getJson(EVENTS_URL), loadPlaces()])
const events = eventsJson.items ?? []

// 좌표 판정의 기준점: 라벨과 주소가 서로 맞는 장소만
const anchors = places.items.flatMap((p) => {
  const t = townOfAddr(p.addr)
  return t && AREA_TOWN[p.area] === t && p.lat ? [{ id: p.id, town: t, lat: p.lat, lng: p.lng }] : []
})
const coordTown = makeCoordTown(anchors)
checkPlaces(places.items, coordTown)
checkEvents(events, coordTown)

const order = { error: 0, warn: 1, info: 2 }
issues.sort((a, b) => order[a.severity] - order[b.severity] || a.source.localeCompare(b.source) || a.check.localeCompare(b.check))
const count = (s) => issues.filter((i) => i.severity === s).length
const summary = { date: today, events: events.length, places: places.items.length, placesFrom: places.from, anchors: anchors.length, error: count('error'), warn: count('warn'), info: count('info') }

// 원본 스냅샷 + 보고서 (날짜별로 쌓아 두면 값이 언제 바뀌었는지 비교할 수 있음)
const snapDir = path.join(ROOT, 'verify', 'snapshots', today)
const repDir = path.join(ROOT, 'verify', 'reports')
await mkdir(snapDir, { recursive: true })
await mkdir(repDir, { recursive: true })
await writeFile(path.join(snapDir, 'events.json'), JSON.stringify(events))
await writeFile(path.join(snapDir, 'places.json'), JSON.stringify(places.items))
await writeFile(path.join(repDir, `${today}.json`), JSON.stringify({ summary, issues }, null, 1))

const icon = { error: '🔴', warn: '🟡', info: '⚪' }
const md = [
  `# 제주 API 내용 검증 — ${today}`, '',
  `행사 ${summary.events}건 · 관광지 ${summary.places}곳 (${summary.placesFrom}) · 좌표 기준점 ${summary.anchors}곳`, '',
  `🔴 오류 ${summary.error} · 🟡 의심 ${summary.warn} · ⚪ 참고 ${summary.info}`, '',
  '| | 출처 | 항목 | 검사 | 내용 |', '|---|---|---|---|---|',
  ...issues.map((i) => `| ${icon[i.severity]} | ${i.source === 'place' ? '관광지' : '행사'} | ${i.title} (${i.id}) | ${i.check} | ${i.detail.replace(/\|/g, '/')} |`),
].join('\n')
await writeFile(path.join(repDir, `${today}.md`), md)

console.log(`행사 ${summary.events} · 관광지 ${summary.places} (${summary.placesFrom})`)
console.log(`오류 ${summary.error} · 의심 ${summary.warn} · 참고 ${summary.info}\n`)
for (const i of issues.filter((x) => x.severity !== 'info')) console.log(`${icon[i.severity]} [${i.check}] ${i.title} — ${i.detail}`)
console.log(`\n보고서: verify/reports/${today}.md`)
process.exitCode = summary.error ? 1 : 0
