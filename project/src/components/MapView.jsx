import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import EventCard from './EventCard'
import { Empty, catHue } from './common'
import { placeMapUrl } from '../lib/geo'
import { tr, useT } from '../i18n'

const JEJU_CENTER = [33.38, 126.55]

// 실제 지도(Leaflet + OpenStreetMap)에 행사 좌표를 핀으로 찍습니다.
// - 같은 장소(약 100m 이내)의 행사는 한 핀으로 묶고 개수를 보여줍니다
// - 좌표가 없는 행사는 지도 대신 아래 목록으로 보여줍니다
export default function MapView({ events, places = [] }) {
  const { t } = useT()
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const placeLayerRef = useRef(null)
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

  // ① 지도 만들기 (한 번)
  useEffect(() => {
    const map = L.map(elRef.current, { minZoom: 8, maxBounds: [[32.8, 125.8], [34, 127.4]], preferCanvas: true }).setView(JEJU_CENTER, 9)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map)
    placeLayerRef.current = L.layerGroup().addTo(map) // 관광지(아래층) — 행사 핀이 항상 위에 보이도록 먼저 추가
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; placeLayerRef.current = null }
  }, [])

  // 관광지(비짓제주) — 작은 점으로 표시, 누르면 이름·분류·지도 링크 말풍선
  useEffect(() => {
    const layer = placeLayerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const p of places) {
      const dot = L.circleMarker([p.pos.lat, p.pos.lng], { radius: 5, color: '#fff', weight: 1.5, fillColor: '#14a39a', fillOpacity: 0.9 })
      dot.bindTooltip(textNode(p.title), { direction: 'top', offset: [0, -4] })
      dot.bindPopup(() => placePopup(p), { minWidth: 160 })
      dot.addTo(layer)
    }
  }, [places])

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
      marker.on('click', () => setSelected(p.key))
      marker.addTo(layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t 는 언어가 바뀌면 화면 전체가 다시 만들어지므로 의존성에 넣지 않음
  }, [pins, selected])

  // ③ 보이는 행사가 바뀌면(날짜 변경 등) 핀들이 한눈에 들어오게 지도를 맞춤 — 핀을 눌렀을 때는 움직이지 않음
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (pins.length === 0) map.setView(JEJU_CENTER, 9)
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 12 })
  }, [pins])

  const active = pins.find((p) => p.key === selected)
  const shown = active ? active.list : placed

  return (
    <div className="mapview">
      <div ref={elRef} className="leafmap" role="region" aria-label={t('mv.region')} />

      <div className="map-side">
        <div className="map-side-head">
          <p className="muted">
            {active ? t('mv.here', { n: active.list.length }) : t('mv.summary', { n: placed.length, pins: pins.length })}
          </p>
          {active && <button type="button" className="linkbtn" onClick={() => setSelected(null)}>{t('mv.showAll')}</button>}
        </div>

        {shown.length === 0
          ? <Empty title={t('mv.none')}>{t('mv.noneHint')}</Empty>
          : shown.map((e) => <EventCard key={e.seq} event={e} compact />)}

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

function placePopup(p) {
  const box = document.createElement('div')
  box.className = 'placepop'
  const title = document.createElement('strong')
  title.textContent = p.title
  const meta = document.createElement('div')
  meta.className = 'muted'
  meta.textContent = [p.category, p.region].filter(Boolean).join(' · ')
  const link = document.createElement('a')
  link.href = placeMapUrl(p)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = tr('mv.open')
  box.append(title, meta, link)
  return box
}
