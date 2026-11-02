import { Suspense, lazy, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CalendarView from '../components/CalendarView'
import EventCard from '../components/EventCard'
import { Empty, ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { categoryCounts, inCategory } from '../lib/festival'
import { WHEN, monthOf, overlaps, presetRange, todayKey } from '../lib/date'

const MapView = lazy(() => import('../components/MapView'))
const PAGE = 24
const REGIONS = ['제주시', '서귀포시']
const PAYS = [['FREE', '무료'], ['PAY', '유료'], ['PART', '부분 유료']]
const LOCS = [['IN', '실내'], ['OUT', '야외'], ['INOUT', '실내·외']]
const VIEWS = [['list', '목록'], ['cal', '달력'], ['map', '지도']]
const SORTS = {
  soon: { label: '가까운 순', key: (e, t) => (e.startKey < t ? t : e.startKey) },
  end: { label: '마감 임박순', key: (e) => e.endKey },
  name: { label: '이름순', key: (e) => e.name },
}

export default function Events() {
  const { events, status, error, retry } = useEvents()
  const [sp, setSp] = useSearchParams()
  const [limit, setLimit] = useState(PAGE)
  const today = todayKey()

  // 필터 상태는 주소창(?cat=...&pay=...)에 담아 링크로 공유·뒤로가기가 되게 합니다
  const q = sp.get('q') ?? ''
  const cat = sp.get('cat') ?? ''
  const pay = sp.get('pay') ?? ''
  const loc = sp.get('loc') ?? ''
  const region = sp.get('region') ?? ''
  const when = WHEN[sp.get('when')] ? sp.get('when') : 'all'
  const from = sp.get('from') ?? today
  const to = sp.get('to') ?? from
  const sort = SORTS[sp.get('sort')] ? sp.get('sort') : 'soon'
  const view = VIEWS.some(([v]) => v === sp.get('view')) ? sp.get('view') : 'list'

  const set = (patch) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setSp(next, { replace: true })
    setLimit(PAGE)
  }
  const reset = () => { setSp({}, { replace: true }); setLimit(PAGE) }

  const cats = useMemo(() => {
    return categoryCounts(events)
  }, [events])

  const range = when === 'custom' ? [from, to < from ? from : to] : presetRange(when, today)

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const f = events.filter((e) =>
      (!cat || inCategory(e, cat)) && (!pay || e.payTag === pay) && (!loc || e.locTag === loc) &&
      (!region || e.region === region) && (!range || overlaps(e, range[0], range[1])) &&
      (!kw || [e.name, e.place, e.addr, e.category].some((s) => s.toLowerCase().includes(kw))))
    const key = SORTS[sort].key
    return f.sort((a, b) => String(key(a, today)).localeCompare(String(key(b, today))) || a.name.localeCompare(b.name))
  }, [events, q, cat, pay, loc, region, range, sort, today])

  const active = [q, cat, pay, loc, region, when !== 'all'].filter(Boolean).length

  return (
    <>
      <PageHead kicker="행사 찾기" title="어떤 행사를 찾으세요?" sub="조건을 고르면 목록·달력·지도가 함께 바뀌어요." />

      <div className="searchbar">
        <input type="search" value={q} placeholder="행사명·장소·주소 검색" aria-label="검색" onChange={(e) => set({ q: e.target.value })} />
        <select value={sort} onChange={(e) => set({ sort: e.target.value === 'soon' ? '' : e.target.value })} aria-label="정렬">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      <div className="filters">
        <Chips label="언제" value={when} items={Object.entries(WHEN)} onPick={(v) => set({ when: v === 'all' ? '' : v, from: v === 'custom' ? from : '', to: v === 'custom' ? to : '' })} always />
        {when === 'custom' && (
          <div className="daterange">
            <input type="date" value={from} onChange={(e) => set({ from: e.target.value, to: to < e.target.value ? e.target.value : to })} aria-label="시작일" />
            <span>~</span>
            <input type="date" value={to} min={from} onChange={(e) => set({ to: e.target.value })} aria-label="종료일" />
          </div>
        )}
        <Chips label="분류" value={cat} items={cats.map(([c, n]) => [c, `${c} ${n}`])} onPick={(v) => set({ cat: v })} />
        <Chips label="요금" value={pay} items={PAYS} onPick={(v) => set({ pay: v })} />
        <Chips label="장소" value={loc} items={LOCS} onPick={(v) => set({ loc: v })} />
        <Chips label="지역" value={region} items={REGIONS.map((r) => [r, r])} onPick={(v) => set({ region: v })} />
      </div>

      <div className="toolbar">
        <p className="result-count"><b>{status === 'ready' ? list.length : '…'}</b>건{active > 0 && <button type="button" className="linkbtn" onClick={reset}>필터 초기화</button>}</p>
        <div className="seg" role="tablist" aria-label="보기 방식">
          {VIEWS.map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => set({ view: v === 'list' ? '' : v })}>{label}</button>
          ))}
        </div>
      </div>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons />}
      {status === 'ready' && (
        view === 'cal' ? <CalendarView events={list} initialMonth={range ? monthOf(range[0]) : undefined} />
          : view === 'map' ? <Suspense fallback={<Skeletons n={3} />}><MapView events={list} /></Suspense>
            : list.length === 0 ? <Empty title="조건에 맞는 행사가 없어요"><button type="button" className="btn" onClick={reset}>필터 초기화</button></Empty>
              : (
                <>
                  <div className="grid">{list.slice(0, limit).map((e) => <EventCard key={e.seq} event={e} />)}</div>
                  {list.length > limit && (
                    <div className="center"><button type="button" className="btn" onClick={() => setLimit(limit + PAGE)}>더 보기 ({list.length - limit}건 남음)</button></div>
                  )}
                </>
              )
      )}
    </>
  )
}

// 한 줄짜리 선택 칩 — 같은 칩을 다시 누르면 해제
function Chips({ label, items, value, onPick, always = false }) {
  if (items.length === 0) return null
  return (
    <div className="chiprow" role="group" aria-label={label}>
      <span className="chiprow-label">{label}</span>
      {!always && <button type="button" className={`chip ${value === '' ? 'on' : ''}`} onClick={() => onPick('')}>전체</button>}
      {items.map(([v, text]) => (
        <button key={v} type="button" className={`chip ${value === v ? 'on' : ''}`} aria-pressed={value === v} onClick={() => onPick(always || value !== v ? v : '')}>{text}</button>
      ))}
    </div>
  )
}
