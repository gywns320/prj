import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MapView from '../components/MapView'
import { ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { useCultureStore } from '../store/useCultureStore'
import { addDays, diffDays, fmtRange, overlaps, presetRange, todayKey } from '../lib/date'

// 기본은 오늘부터 7일(오늘 포함) 안에 열리는 행사 — 날짜를 바꾸면 다른 날의 행사도 볼 수 있어요
const DEFAULT_SPAN = 6

export default function MapPage() {
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
  const showPlaces = sp.get("places") === "1"
  const [placeCat, setPlaceCat] = useState("")
  const places = useCultureStore((s) => s.places)
  const placesStatus = useCultureStore((s) => s.placesStatus)
  const placesError = useCultureStore((s) => s.placesError)
  const loadPlaces = useCultureStore((s) => s.loadPlaces)
  useEffect(() => { if (showPlaces) loadPlaces() }, [showPlaces, loadPlaces])
  const placeCats = useMemo(() => {
    const m = {}
    places.forEach((p) => { m[p.category] = (m[p.category] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [places])
  const shownPlaces = useMemo(
    () => (showPlaces ? places.filter((p) => !placeCat || p.category === placeCat) : []),
    [showPlaces, places, placeCat],
  )

  const set = (patch) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setSp(next, { replace: true })
  }
  const setRange = (f, t) => set({ from: f === today ? '' : f, to: t === addDays(today, DEFAULT_SPAN) ? '' : t })
  const shift = (days) => {
    const f = addDays(from, days)
    setRange(f < today ? today : f, addDays(f < today ? today : f, span))
  }

  const presets = [
    ['오늘', today, today],
    ['내일', addDays(today, 1), addDays(today, 1)],
    ['이번 주말', ...presetRange('weekend', today)],
    ['7일 이내', today, addDays(today, DEFAULT_SPAN)],
    ['다음 7일', addDays(today, 7), addDays(today, 13)],
    ['이번 달', ...presetRange('month', today)],
  ]

  const cats = useMemo(() => {
    const m = {}
    events.forEach((e) => { m[e.category] = (m[e.category] || 0) + 1 })
    return Object.keys(m).sort((a, b) => m[b] - m[a])
  }, [events])

  const list = useMemo(
    () => events.filter((e) => overlaps(e, from, to) && (!cat || e.category === cat) && (!free || e.payTag === 'FREE')),
    [events, from, to, cat, free],
  )

  return (
    <>
      <PageHead kicker="행사 지도" title="어디서 열리나요?" sub={`${fmtRange(from, to)} 에 열리는 행사를 지도에서 확인해요.`} />

      <div className="mapbar">
        <div className="chiprow" role="group" aria-label="기간 바로 선택">
          <span className="chiprow-label">기간</span>
          {presets.map(([label, f, t]) => (
            <button key={label} type="button" className={`chip ${f === from && t === to ? 'on' : ''}`} aria-pressed={f === from && t === to} onClick={() => setRange(f, t)}>{label}</button>
          ))}
        </div>

        <div className="daterange">
          <button type="button" className="btn small" onClick={() => shift(-(span + 1))} disabled={from <= today} aria-label="이전 기간">‹</button>
          <input type="date" value={from} min={today} onChange={(e) => e.target.value && setRange(e.target.value, to < e.target.value ? e.target.value : to)} aria-label="시작일" />
          <span>~</span>
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setRange(from, e.target.value)} aria-label="종료일" />
          <button type="button" className="btn small" onClick={() => shift(span + 1)} aria-label="다음 기간">›</button>
        </div>

        <div className="chiprow" role="group" aria-label="분류">
          <span className="chiprow-label">분류</span>
          <button type="button" className={`chip ${cat === '' ? 'on' : ''}`} onClick={() => set({ cat: '' })}>전체</button>
          {cats.map((c) => (
            <button key={c} type="button" className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => set({ cat: cat === c ? '' : c })}>{c}</button>
          ))}
          <button type="button" className={`chip ${free ? 'on' : ''}`} aria-pressed={free} onClick={() => set({ pay: free ? '' : 'FREE' })}>무료만</button>
        </div>

        <div className="chiprow" role="group" aria-label="관광지 레이어">
          <span className="chiprow-label">관광지</span>
          <button type="button" className={`chip ${showPlaces ? 'on' : ''}`} aria-pressed={showPlaces} onClick={() => set({ places: showPlaces ? '' : '1' })}>관광지 함께 보기</button>
          {showPlaces && placesStatus === 'ready' && (
            <>
              <button type="button" className={`chip ${placeCat === '' ? 'on' : ''}`} onClick={() => setPlaceCat('')}>전체</button>
              {placeCats.map(([c, n]) => (
                <button key={c} type="button" className={`chip ${placeCat === c ? 'on' : ''}`} aria-pressed={placeCat === c} onClick={() => setPlaceCat(placeCat === c ? '' : c)}>{c} {n}</button>
              ))}
              <span className="muted">초록 점 {shownPlaces.length}곳 · 비짓제주</span>
            </>
          )}
          {showPlaces && (placesStatus === 'loading' || placesStatus === 'idle') && <span className="muted">관광지 불러오는 중…</span>}
          {showPlaces && placesStatus === 'error' && <span className="muted">관광지를 불러오지 못했어요 ({placesError}) <button type="button" className="linkbtn" onClick={() => loadPlaces(true)}>다시 시도</button></span>}
        </div>
      </div>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}
      {status === 'ready' && <MapView events={list} places={shownPlaces} />}
    </>
  )
}
