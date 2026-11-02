import { Suspense, lazy, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CalendarView from '../components/CalendarView'
import EventCard from '../components/EventCard'
import { Empty, ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { categoryCounts, inCategory } from '../lib/festival'
import { WHEN, monthOf, overlaps, presetRange, todayKey } from '../lib/date'
import { catLabel, useT } from '../i18n'

const MapView = lazy(() => import('../components/MapView'))
const PAGE = 24
// 화면에 보이는 글자는 문구 키(t 로 번역)로, 주소창(?pay=FREE 등)에 들어가는 값은 그대로 둡니다
const REGIONS = ['제주시', '서귀포시']
const PAYS = ['FREE', 'PAY', 'PART']
const LOCS = ['IN', 'OUT', 'INOUT']
const VIEWS = ['list', 'cal', 'map']
const SORTS = {
  soon: { key: (e, t) => (e.startKey < t ? t : e.startKey) },
  end: { key: (e) => e.endKey },
  name: { key: (e) => e.name },
}

export default function Events() {
  const { t } = useT()
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
  const view = VIEWS.includes(sp.get('view')) ? sp.get('view') : 'list'

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
      <PageHead kicker={t('ev.kicker')} title={t('ev.title')} sub={t('ev.sub')} />

      <div className="searchbar">
        <input type="search" value={q} placeholder={t('ev.searchPh')} aria-label={t('ev.searchAria')} onChange={(e) => set({ q: e.target.value })} />
        <select value={sort} onChange={(e) => set({ sort: e.target.value === 'soon' ? '' : e.target.value })} aria-label={t('ev.sortAria')}>
          {Object.keys(SORTS).map((k) => <option key={k} value={k}>{t(`sort.${k}`)}</option>)}
        </select>
      </div>

      <div className="filters">
        <Chips label={t('f.when')} value={when} items={Object.keys(WHEN).map((k) => [k, t(`when.${k}`)])} onPick={(v) => set({ when: v === 'all' ? '' : v, from: v === 'custom' ? from : '', to: v === 'custom' ? to : '' })} always />
        {when === 'custom' && (
          <div className="daterange">
            <input type="date" value={from} onChange={(e) => set({ from: e.target.value, to: to < e.target.value ? e.target.value : to })} aria-label={t('ev.from')} />
            <span>~</span>
            <input type="date" value={to} min={from} onChange={(e) => set({ to: e.target.value })} aria-label={t('ev.to')} />
          </div>
        )}
        <Chips label={t('f.cat')} value={cat} items={cats.map(([c, n]) => [c, `${catLabel(c)} ${n}`])} onPick={(v) => set({ cat: v })} />
        <Chips label={t('f.pay')} value={pay} items={PAYS.map((p) => [p, t(`pay.${p}`)])} onPick={(v) => set({ pay: v })} />
        <Chips label={t('f.loc')} value={loc} items={LOCS.map((l) => [l, t(`loc.${l}`)])} onPick={(v) => set({ loc: v })} />
        <Chips label={t('f.region')} value={region} items={REGIONS.map((r) => [r, t(`region.${r}`)])} onPick={(v) => set({ region: v })} />
      </div>

      <div className="toolbar">
        <p className="result-count"><b>{status === 'ready' ? t('common.count', { n: list.length }) : '…'}</b>{active > 0 && <button type="button" className="linkbtn" onClick={reset}>{t('ev.reset')}</button>}</p>
        <div className="seg" role="tablist" aria-label={t('ev.viewAria')}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => set({ view: v === 'list' ? '' : v })}>{t(`view.${v}`)}</button>
          ))}
        </div>
      </div>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons />}
      {status === 'ready' && (
        view === 'cal' ? <CalendarView events={list} initialMonth={range ? monthOf(range[0]) : undefined} />
          : view === 'map' ? <Suspense fallback={<Skeletons n={3} />}><MapView events={list} /></Suspense>
            : list.length === 0 ? <Empty title={t('ev.none')}><button type="button" className="btn" onClick={reset}>{t('ev.reset')}</button></Empty>
              : (
                <>
                  <div className="grid">{list.slice(0, limit).map((e) => <EventCard key={e.seq} event={e} />)}</div>
                  {list.length > limit && (
                    <div className="center"><button type="button" className="btn" onClick={() => setLimit(limit + PAGE)}>{t('ev.more', { n: list.length - limit })}</button></div>
                  )}
                </>
              )
      )}
    </>
  )
}

// 한 줄짜리 선택 칩 — 같은 칩을 다시 누르면 해제
function Chips({ label, items, value, onPick, always = false }) {
  const { t } = useT()
  if (items.length === 0) return null
  return (
    <div className="chiprow" role="group" aria-label={label}>
      <span className="chiprow-label">{label}</span>
      {!always && <button type="button" className={`chip ${value === '' ? 'on' : ''}`} onClick={() => onPick('')}>{t('common.all')}</button>}
      {items.map(([v, text]) => (
        <button key={v} type="button" className={`chip ${value === v ? 'on' : ''}`} aria-pressed={value === v} onClick={() => onPick(always || value !== v ? v : '')}>{text}</button>
      ))}
    </div>
  )
}
