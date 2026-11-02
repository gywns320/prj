import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MapView from '../components/MapView'
import { ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { useCultureStore } from '../store/useCultureStore'
import { categoryCounts, inCategory } from '../lib/festival'
import { addDays, diffDays, fmtRange, overlaps, presetRange, todayKey } from '../lib/date'
import { catLabel, langInfo, useT } from '../i18n'

// 기본은 오늘부터 7일(오늘 포함) 안에 열리는 행사 — 날짜를 바꾸면 다른 날의 행사도 볼 수 있어요
const DEFAULT_SPAN = 6

export default function MapPage() {
  const { t } = useT()
  const { events, status, error, retry } = useEvents()
  const [sp, setSp] = useSearchParams()
  const today = todayKey()

  const from = sp.get('from') && sp.get('from') >= today ? sp.get('from') : today
  const toRaw = sp.get('to') ?? addDays(today, DEFAULT_SPAN)
  const to = toRaw < from ? from : toRaw
  const cat = sp.get('cat') ?? ''
  const free = sp.get('pay') === 'FREE'
  const span = diffDays(from, to) // 하루면 0

  // 관광지(비짓제주) 레이어 — 켰을 때만 불러옵니다
  const showPlaces = sp.get('places') === '1'
  const [placeCatPick, setPlaceCat] = useState(langInfo().sights) // 처음엔 '관광지'만 (음식점·숙박까지 켜면 점이 수백 개)
  const [radiusKm, setRadiusKm] = useState(3) // 고른 행사 주변 몇 km 까지 보여줄지
  const places = useCultureStore((s) => s.places)
  const placesStatus = useCultureStore((s) => s.placesStatus)
  const placesError = useCultureStore((s) => s.placesError)
  const loadPlaces = useCultureStore((s) => s.loadPlaces)
  useEffect(() => { if (showPlaces) loadPlaces() }, [showPlaces, loadPlaces])
  const placeCats = useMemo(() => {
    const m = {}
    places.forEach((p) => { m[p.category] = (m[p.category] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [places])
  const placeCat = placeCatPick === langInfo().sights && !placeCats.includes(placeCatPick) ? '' : placeCatPick // 그 분류가 없으면 전체
  const shownPlaces = useMemo(
    () => (showPlaces ? places.filter((p) => !placeCat || p.category === placeCat) : []),
    [showPlaces, places, placeCat],
  )

  const set = (patch) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setSp(next, { replace: true })
  }
  const setRange = (f, t2) => set({ from: f === today ? '' : f, to: t2 === addDays(today, DEFAULT_SPAN) ? '' : t2 })
  const shift = (days) => {
    const f = addDays(from, days)
    setRange(f < today ? today : f, addDays(f < today ? today : f, span))
  }

  const presets = [
    [t('when.today'), today, today],
    [t('map.p.tomorrow'), addDays(today, 1), addDays(today, 1)],
    [t('when.weekend'), ...presetRange('weekend', today)],
    [t('when.week'), today, addDays(today, DEFAULT_SPAN)],
    [t('map.p.next7'), addDays(today, 7), addDays(today, 13)],
    [t('when.month'), ...presetRange('month', today)],
  ]

  const cats = useMemo(() => {
    return categoryCounts(events).map(([c]) => c)
  }, [events])

  const list = useMemo(
    () => events.filter((e) => overlaps(e, from, to) && (!cat || inCategory(e, cat)) && (!free || e.payTag === 'FREE')),
    [events, from, to, cat, free],
  )

  return (
    <>
      <PageHead kicker={t('map.kicker')} title={t('map.title')} sub={t('map.sub', { range: fmtRange(from, to) })} />

      <div className="mapbar">
        <div className="chiprow" role="group" aria-label={t('map.periodAria')}>
          <span className="chiprow-label">{t('map.period')}</span>
          {presets.map(([label, f, e]) => (
            <button key={label} type="button" className={`chip ${f === from && e === to ? 'on' : ''}`} aria-pressed={f === from && e === to} onClick={() => setRange(f, e)}>{label}</button>
          ))}
        </div>

        <div className="daterange">
          <button type="button" className="btn small" onClick={() => shift(-(span + 1))} disabled={from <= today} aria-label={t('map.prev')}>‹</button>
          <input type="date" value={from} min={today} onChange={(e) => e.target.value && setRange(e.target.value, to < e.target.value ? e.target.value : to)} aria-label={t('ev.from')} />
          <span>~</span>
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setRange(from, e.target.value)} aria-label={t('ev.to')} />
          <button type="button" className="btn small" onClick={() => shift(span + 1)} aria-label={t('map.next')}>›</button>
        </div>

        <div className="chiprow" role="group" aria-label={t('map.catAria')}>
          <span className="chiprow-label">{t('f.cat')}</span>
          <button type="button" className={`chip ${cat === '' ? 'on' : ''}`} onClick={() => set({ cat: '' })}>{t('common.all')}</button>
          {cats.map((c) => (
            <button key={c} type="button" className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => set({ cat: cat === c ? '' : c })}>{catLabel(c)}</button>
          ))}
          <button type="button" className={`chip ${free ? 'on' : ''}`} aria-pressed={free} onClick={() => set({ pay: free ? '' : 'FREE' })}>{t('map.freeOnly')}</button>
        </div>

        <div className="chiprow" role="group" aria-label={t('map.placesAria')}>
          <span className="chiprow-label">{t('map.places')}</span>
          <button type="button" className={`chip ${showPlaces ? 'on' : ''}`} aria-pressed={showPlaces} onClick={() => set({ places: showPlaces ? '' : '1' })}>{t('map.placesToggle')}</button>
          {showPlaces && placesStatus === 'ready' && (
            <>
              {[1, 3, 5].map((km) => (
                <button key={km} type="button" className={`chip ${radiusKm === km ? 'on' : ''}`} aria-pressed={radiusKm === km} onClick={() => setRadiusKm(km)}>{t('map.radius', { km })}</button>
              ))}
              {/* 서버가 "관광지"만 내려주므로 분류가 하나뿐이면 고를 필요가 없습니다 */}
              {placeCats.length > 1 && (
                <>
                  <span className="chiprow-sep" aria-hidden="true">|</span>
                  <button type="button" className={`chip ${placeCat === '' ? 'on' : ''}`} onClick={() => setPlaceCat('')}>{t('common.all')}</button>
                  {placeCats.map((c) => (
                    <button key={c} type="button" className={`chip ${placeCat === c ? 'on' : ''}`} aria-pressed={placeCat === c} onClick={() => setPlaceCat(placeCat === c ? '' : c)}>{c}</button>
                  ))}
                </>
              )}
            </>
          )}
          {showPlaces && (placesStatus === 'loading' || placesStatus === 'idle') && <span className="muted">{t('map.placesLoading')}</span>}
          {showPlaces && placesStatus === 'error' && <span className="muted">{t('map.placesFail', { e: t(placesError) })} <button type="button" className="linkbtn" onClick={() => loadPlaces(true)}>{t('common.retry')}</button></span>}
        </div>
      </div>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}
      {status === 'ready' && <MapView events={list} places={shownPlaces} placesOn={showPlaces} radiusKm={radiusKm} />}
    </>
  )
}
