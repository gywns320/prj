import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import EventCard from './EventCard'
import { Empty, catHue } from './common'
import { distanceKm, fmtKm, placeMapUrl } from '../lib/geo'
import { tr, useT } from '../i18n'

const JEJU_CENTER = [33.38, 126.55]
const MAX_SIGHTS = 10 // 번호를 붙여 보여줄 주변 장소 수 — 너무 많으면 어느 것이 가까운지 알 수 없음

// 실제 지도(Leaflet + OpenStreetMap)에 행사 좌표를 핀으로 찍습니다.
// - 같은 장소(약 100m 이내)의 행사는 한 핀으로 묶고 개수를 보여줍니다
// - 좌표가 없는 행사는 지도 대신 아래 목록으로 보여줍니다
// - 카페·식당(foodsOn)은 주황·갈색 네모 핀(☕ 🍴)으로 관광지의 초록 숫자 핀과 구분해, 같은 반경 안의 곳을 가까운 순으로 보여줍니다
// - 'places' 를 켜면(placesOn) 고른 행사 핀 주변의 가볼 만한 곳을 가까운 순으로 번호를 붙여 지도와 목록에 함께 보여줍니다
export default function MapView({ events, places = [], placesOn = false, placesState = 'idle', onRetryPlaces, radiusKm = 3, foods = [], foodsOn = false, foodsState = 'idle', onRetryFoods, foodKind = '' }) {
  const nearOn = placesOn || foodsOn // 둘 중 하나라도 켜면 고른 행사 주변을 보여줌
  const { t } = useT()
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const sightLayerRef = useRef(null)
  const foodLayerRef = useRef(null)
  const foodMarkers = useRef(new Map())
  const sightMarkers = useRef(new Map()) // 장소 id → 마커 (목록에서 누르면 말풍선을 열기 위해)
  const [selected, setSelected] = useState(null)

  const { pins, placed, unplaced } = useMemo(() => {
    const cells = new Map()
    const none = []
    for (const e of events) {
      if (!e.pos) { none.push(e); continue }
      const k = `${e.pos.lat.toFixed(3)},${e.pos.lng.toFixed(3)}`
      if (!cells.has(k)) cells.set(k, { key: k, list: [], lat: e.pos.lat, lng: e.pos.lng })
      cells.get(k).list.push(e)
    }
    const pins = [...cells.values()]
    return { pins, placed: pins.flatMap((p) => p.list), unplaced: none }
  }, [events])

  const active = pins.find((p) => p.key === selected)
  const shown = active ? active.list : placed

  // ① 지도 만들기 (한 번)
  useEffect(() => {
    const map = L.map(elRef.current, { minZoom: 8, maxBounds: [[32.8, 125.8], [34, 127.4]], preferCanvas: true }).setView(JEJU_CENTER, 9)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map)
    sightLayerRef.current = L.layerGroup().addTo(map) // 주변 장소(아래층) — 행사 핀이 항상 위에 보이도록 먼저 추가
    foodLayerRef.current = L.layerGroup().addTo(map) // 카페·식당(관광지와 행사 핀 사이)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; sightLayerRef.current = null; foodLayerRef.current = null }
  }, [])

  // 켜져 있는데 고른 핀이 없으면(처음 켰을 때, 날짜를 바꿔 핀이 사라졌을 때) 첫 핀을 골라 바로 결과가 보이게 함
  useEffect(() => {
    if (nearOn && !active && pins.length > 0) setSelected(pins[0].key)
  }, [nearOn, active, pins])

  // 고른 행사 장소에서 가까운 순으로 몇 곳 (서버가 '관광지'만 내려주므로 가게는 섞이지 않음)
  const nearby = useMemo(() => {
    if (!placesOn || !active) return []
    const here = { lat: active.lat, lng: active.lng }
    return places
      .map((p) => ({ ...p, km: distanceKm(here, p.pos) }))
      .filter((p) => p.km <= radiusKm)
      .sort((a, b) => a.km - b.km)
  }, [placesOn, active, places, radiusKm])
  const sights = nearby.slice(0, MAX_SIGHTS)

  const nearFoods = useMemo(() => {
    if (!foodsOn || !active) return []
    const here = { lat: active.lat, lng: active.lng }
    return foods
      .filter((f) => !foodKind || f.kind === foodKind)
      .map((f) => ({ ...f, km: distanceKm(here, f.pos) }))
      .filter((f) => f.km <= radiusKm)
      .sort((a, b) => a.km - b.km)
  }, [foodsOn, active, foods, foodKind, radiusKm])
  const foodShown = nearFoods.slice(0, MAX_SIGHTS)

  // 주변 장소 — 번호를 붙인 초록 핀, 누르면 이름·거리·지도 링크 말풍선. 행사 장소 둘레는 점선 원
  useEffect(() => {
    const layer = sightLayerRef.current
    if (!layer) return
    layer.clearLayers()
    sightMarkers.current = new Map()
    if (!nearOn || !active) return
    L.circle([active.lat, active.lng], { radius: radiusKm * 1000, color: '#14a39a', weight: 1.5, dashArray: '6 6', fillColor: '#14a39a', fillOpacity: 0.06, interactive: false }).addTo(layer)
    if (!placesOn) return
    sights.forEach((p, i) => {
      const icon = L.divIcon({ className: 'spin', html: `<span>${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) // 숫자만 들어가므로 안전
      const marker = L.marker([p.pos.lat, p.pos.lng], { icon, riseOnHover: true, zIndexOffset: -100, alt: p.title })
      marker.bindTooltip(textNode(`${i + 1}. ${p.title}`), { direction: 'top', offset: [0, -12] })
      marker.bindPopup(() => sightPopup(p), { minWidth: 170 })
      marker.addTo(layer)
      sightMarkers.current.set(p.id, marker)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sights 는 nearby 에서 바로 나오는 값
  }, [nearby, placesOn, nearOn, active, radiusKm])

  // 카페·식당 — 네모 핀(식당 주황 🍴, 카페 갈색 ☕)
  useEffect(() => {
    const layer = foodLayerRef.current
    if (!layer) return
    layer.clearLayers()
    foodMarkers.current = new Map()
    if (!foodsOn || !active) return
    foodShown.forEach((f) => {
      const icon = L.divIcon({ className: `fpin ${f.kind}`, html: `<span>${f.kind === 'cafe' ? '☕' : '🍴'}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) // 고정 문자만 들어가므로 안전
      const marker = L.marker([f.pos.lat, f.pos.lng], { icon, riseOnHover: true, zIndexOffset: -150, alt: f.title })
      marker.bindTooltip(textNode(f.title), { direction: 'top', offset: [0, -12] })
      marker.bindPopup(() => foodPopup(f), { minWidth: 170 })
      marker.addTo(layer)
      foodMarkers.current.set(f.id, marker)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foodShown 은 nearFoods 에서 바로 나오는 값
  }, [nearFoods, foodsOn, active])

  // 행사를 고르고 주변 장소를 켰으면 그 반경이 한눈에 들어오게 지도를 맞춤
  useEffect(() => {
    const map = mapRef.current
    if (!map || !nearOn || !active) return
    map.fitBounds(L.latLng(active.lat, active.lng).toBounds(radiusKm * 2000), { padding: [24, 24], maxZoom: 15 })
  }, [nearOn, active?.key, radiusKm]) // eslint-disable-line react-hooks/exhaustive-deps

  // ② 핀 그리기 — 목록이 바뀌거나 선택이 바뀌면 다시 그립니다
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const p of pins) {
      const icon = L.divIcon({
        className: `lpin ${p.key === selected ? 'on' : ''}`,
        html: `<span style="--h:${catHue(p.list[0].category)}">${p.list.length > 1 ? p.list.length : ''}</span>`, // 숫자만 들어가므로 안전
        iconSize: [34, 34], iconAnchor: [17, 17],
      })
      const marker = L.marker([p.lat, p.lng], { icon, riseOnHover: true, alt: t('mv.more', { name: p.list[0].name, n: p.list.length }) })
      // 툴팁에는 외부 데이터가 들어가므로 HTML 이 아닌 텍스트 노드로 넣습니다
      const tip = document.createElement('span')
      tip.textContent = p.list.length > 1 ? t('mv.more', { name: p.list[0].name, n: p.list.length - 1 }) : p.list[0].name
      marker.bindTooltip(tip, { direction: 'top', offset: [0, -16] })
      // 주변 장소를 켜 둔 동안에는 선택 해제 대신 다른 핀으로 옮기기만 합니다 (해제하면 바로 첫 핀이 다시 골라져서)
      marker.on('click', () => setSelected(p.key === selected && !nearOn ? null : p.key))
      marker.addTo(layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t 는 언어가 바뀌면 화면 전체가 다시 만들어지므로 의존성에 넣지 않음
  }, [pins, selected, nearOn])

  // ③ 보이는 행사가 바뀌면(날짜 변경 등) 핀들이 한눈에 들어오게 지도를 맞춤 — 핀을 눌렀을 때는 움직이지 않음
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (pins.length === 0) map.setView(JEJU_CENTER, 9)
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 12 })
  }, [pins])

  const focusSight = (p) => {
    const marker = sightMarkers.current.get(p.id)
    if (!marker) return
    mapRef.current?.panTo([p.pos.lat, p.pos.lng])
    marker.openPopup()
  }

  const focusFood = (f) => {
    const marker = foodMarkers.current.get(f.id)
    if (!marker) return
    mapRef.current?.panTo([f.pos.lat, f.pos.lng])
    marker.openPopup()
  }

  return (
    <div className="mapview">
      <div ref={elRef} className="leafmap" role="region" aria-label={t('mv.region')} />

      <div className="map-side">
        <div className="map-side-head">
          <p className="muted">
            {active ? t('mv.here', { n: active.list.length }) : t('mv.summary', { n: placed.length, pins: pins.length })}
          </p>
          {active && !nearOn && <button type="button" className="linkbtn" onClick={() => setSelected(null)}>{t('mv.showAll')}</button>}
        </div>

        {shown.length === 0
          ? <Empty title={t('mv.none')}>{t('mv.noneHint')}</Empty>
          : shown.map((e) => <EventCard key={e.seq} event={e} compact />)}

        {nearOn && pins.length > 0 && (
          <p className="mapkey" aria-hidden="true">
            <span>{t('mv.key')}</span>
            {placesOn && <span><i className="k-sight" />{t('mv.keySight')}</span>}
            {foodsOn && <span><i className="k-restaurant" />🍴 {t('map.fk.restaurant')}</span>}
            {foodsOn && <span><i className="k-cafe" />☕ {t('map.fk.cafe')}</span>}
          </p>
        )}

        {placesOn && pins.length > 0 && (
          <section className="sights" aria-label={t('mv.sightsTitle')}>
            <h3>{t('mv.sightsTitle')} <small className="muted">{t('mv.sightsSub', { km: radiusKm })}</small></h3>
            {placesState === 'error' && <p className="muted">{t('mv.sightsFail')} <button type="button" className="linkbtn" onClick={onRetryPlaces}>{t('common.retry')}</button></p>}
            {(placesState === 'loading' || placesState === 'idle') && <p className="muted">{t('mv.sightsLoading')}</p>}
            {placesState === 'ready' && sights.length === 0 && <p className="muted">{t('mv.sightsNone', { km: radiusKm })}</p>}
            {sights.map((p, i) => (
              <button key={p.id} type="button" className="sight" onClick={() => focusSight(p)}>
                <span className="sight-no" aria-hidden="true">{i + 1}</span>
                <span className="sight-body">
                  <b>{p.title}</b>
                  <small className="muted">{[fmtKm(p.km), p.region].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            ))}
            {nearby.length > sights.length && <p className="muted">{t('mv.sightsMore', { n: nearby.length - sights.length })}</p>}
          </section>
        )}

        {foodsOn && pins.length > 0 && (
          <section className="sights" aria-label={t('mv.foodTitle')}>
            <h3>{t('mv.foodTitle')} <small className="muted">{t('mv.foodSub', { km: radiusKm })}</small></h3>
            {foodsState === 'error' && <p className="muted">{t('mv.foodFail')} <button type="button" className="linkbtn" onClick={onRetryFoods}>{t('common.retry')}</button></p>}
            {(foodsState === 'loading' || foodsState === 'idle') && <p className="muted">{t('mv.foodLoading')}</p>}
            {foodsState === 'ready' && foodShown.length === 0 && <p className="muted">{t('mv.foodNone', { km: radiusKm })}</p>}
            {foodShown.map((f) => (
              <button key={f.id} type="button" className="sight" onClick={() => focusFood(f)}>
                <span className={`fno ${f.kind}`} aria-hidden="true">{f.kind === 'cafe' ? '☕' : '🍴'}</span>
                <span className="sight-body">
                  <b>{f.title}</b>
                  <small className="muted">{[fmtKm(f.km), f.region].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            ))}
            {nearFoods.length > foodShown.length && <p className="muted">{t('mv.foodMore', { n: nearFoods.length - foodShown.length })}</p>}
          </section>
        )}

        {!active && unplaced.length > 0 && (
          <details className="unplaced">
            <summary>{t('mv.unplaced', { n: unplaced.length })}</summary>
            <div className="stack">{unplaced.map((e) => <EventCard key={e.seq} event={e} compact />)}</div>
          </details>
        )}
      </div>
    </div>
  )
}

// ── 말풍선·툴팁: 외부 데이터가 들어가므로 HTML 문자열이 아니라 DOM 노드로 만듭니다 ──
function textNode(text) {
  const el = document.createElement('span')
  el.textContent = text
  return el
}

function sightPopup(p) {
  const box = document.createElement('div')
  box.className = 'placepop'
  const title = document.createElement('strong')
  title.textContent = p.title
  const meta = document.createElement('div')
  meta.className = 'muted'
  meta.textContent = [fmtKm(p.km), p.region].filter(Boolean).join(' · ')
  const link = document.createElement('a')
  link.href = placeMapUrl(p)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = tr('mv.open')
  box.append(title, meta, link)
  return box
}

function foodPopup(f) {
  const box = document.createElement('div')
  box.className = 'placepop'
  const title = document.createElement('strong')
  title.textContent = f.title
  const meta = document.createElement('div')
  meta.className = 'muted'
  meta.textContent = [fmtKm(f.km), f.region].filter(Boolean).join(' · ')
  const link = document.createElement('a')
  link.href = placeMapUrl(f)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = tr('mv.open')
  box.append(title, meta, link)
  return box
}
