import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Skeletons, useEvents } from '../components/common'
import Jeju3D from '../components/Jeju3D'
import { PLACES, describe, fetchForecast } from '../api/weather'
import { addDays, fmtRange, overlaps, todayKey } from '../lib/date'
import { catLabel, useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'

// 3D 지도 — 세 API 의 실제 데이터가 3D 장면에 올라갑니다.
//   행사(제주in놀다 API) → 행사 핀 · 오름(비짓제주 API) → 지형의 작은 봉우리 · 날씨(Open-Meteo API) → 비·안개
const OREUM = /오름|oreum|岳|オルム/i
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const hasWebGl = () => {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export default function Jeju3DPage() {
  const { t } = useT()
  const { events, status } = useEvents()
  const places = useCultureStore((s) => s.places)
  const loadPlaces = useCultureStore((s) => s.loadPlaces)
  const [wx, setWx] = useState(null)
  const [selected, setSelected] = useState(null)
  const [rotate, setRotate] = useState(false)
  const [gl] = useState(hasWebGl)
  const today = todayKey()

  useEffect(() => { loadPlaces() }, [loadPlaces])
  useEffect(() => { fetchForecast(PLACES[0]).then((d) => setWx(describe(d.current.code))).catch(() => setWx(null)) }, [])

  // 이번 주(오늘부터 7일) 행사 중 위치가 있는 것
  const pins = useMemo(() => events.filter((e) => e.pos && overlaps(e, today, addDays(today, 6))), [events, today])
  // 오름: 이름에 '오름' 이 들어간 관광지 (높이는 이름으로 정한 80~260m — 실제 높이가 아니라 모양용)
  const oreums = useMemo(() => places.filter((p) => OREUM.test(p.title)).map((p) => ({ id: p.id, lat: p.pos.lat, lng: p.pos.lng, h: 80 + (hash(p.id) % 180) })), [places])
  const sel = pins.find((e) => e.seq === selected)

  return (
    <>
      <PageHead kicker={t('d3.kicker')} title={t('d3.title')} sub={t('d3.sub')} />

      {!gl && <p className="muted center pad">{t('d3.noGl')}</p>}
      {gl && status !== 'ready' && <Skeletons n={2} />}
      {gl && status === 'ready' && (
        <div className="d3wrap">
          <Jeju3D events={pins} oreums={oreums} weather={wx?.kind ?? 'clear'} selectedSeq={selected} onSelect={setSelected} autoRotate={rotate} />

          <div className="d3-chips">
            <span className="chip on">{t('d3.events', { n: pins.length })}</span>
            <span className="chip on">{t('d3.oreum', { n: oreums.length })}</span>
            {wx && <span className="chip on">{t('d3.weather', { w: `${wx.icon} ${wx.label}` })}</span>}
          </div>
          <button type="button" className={`chip d3-rotate ${rotate ? 'on' : ''}`} aria-pressed={rotate} onClick={() => setRotate(!rotate)}>⟳ {t('d3.rotate')}</button>

          <div className="d3-card">
            {sel ? (
              <>
                <b>{sel.name}</b>
                <small className="muted">{catLabel(sel.category)} · {fmtRange(sel.startKey, sel.endKey)}</small>
                <Link to={`/events/${sel.seq}`} className="btn primary small">{t('d3.go')}</Link>
              </>
            ) : <span className="muted">{t('d3.pick')}</span>}
          </div>
        </div>
      )}
    </>
  )
}
