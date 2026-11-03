// 날씨 아이콘 — 날씨 종류에 맞게 가볍게 움직이는 SVG (움직임은 theme.css 의 .wi-* 규칙)
//   맑음: 태양 광선이 천천히 돎 · 흐림: 구름이 좌우로 천천히 이동 · 비: 구름에서 빗방울이 떨어짐
//   눈: 눈송이가 내림 · 천둥번개: 비 + 번쩍임 · 안개: 안개 줄이 흐름
// 크기는 글자 크기(1em)를 따라가므로 부모의 font-size 로 조절합니다. 움직임 줄이기 설정이면 멈춥니다.
const CLOUD = 'M18 46h26a10 10 0 0 0 1.8-19.8A13 13 0 0 0 21 29a8.8 8.8 0 0 0-3 17z'

function Cloud({ className = '', x = 0, y = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className={`wi-cloud ${className}`} d={CLOUD} />
    </g>
  )
}

function Sun({ x = 32, y = 32, r = 9, ray = 15, small = false }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    const [x1, y1, x2, y2] = [Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), Math.cos(a) * ray, Math.sin(a) * ray]
    return <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />
  })
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`wi-rays ${small ? 'small' : ''}`}>{rays}</g>
      <circle className="wi-sun" r={r} />
    </g>
  )
}

// 비·눈 방울: 구름 아래에서 떨어지는 줄이나 점 (delay 로 하나씩 어긋나게)
const DROPS = [[24, 0], [32, 0.5], [40, 0.25], [28, 0.8], [36, 1.05]]

export default function WeatherIcon({ kind, code }) {
  let art
  if (kind === 'clear' && code === 0) {
    art = <Sun r={11} ray={19} />
  } else if (kind === 'clear' || code === 2) {
    // 대체로 맑음·구름 조금: 태양 앞으로 구름이 천천히 지나감
    art = <><Sun x={25} y={24} r={8} ray={14} small /><g className="wi-drift"><Cloud x={8} y={6} scale={0.86} /></g></>
  } else if (kind === 'rain' || kind === 'storm') {
    art = (
      <>
        <g className="wi-bob"><Cloud className={kind === 'storm' ? 'dark' : 'rainy'} y={-6} /></g>
        {DROPS.map(([x, d]) => <line key={x} className="wi-drop" x1={x} y1="44" x2={x - 2} y2="50" style={{ animationDelay: `${d}s` }} />)}
        {kind === 'storm' && <path className="wi-bolt" d="M34 38l-6 10h5l-3 9 9-12h-5l3-7z" />}
      </>
    )
  } else if (kind === 'snow') {
    art = (
      <>
        <g className="wi-bob"><Cloud className="rainy" y={-6} /></g>
        {DROPS.map(([x, d]) => <circle key={x} className="wi-flake" cx={x} cy="46" r="1.8" style={{ animationDelay: `${d * 1.6}s` }} />)}
      </>
    )
  } else if (kind === 'fog') {
    art = (
      <>
        <g className="wi-drift"><Cloud y={-8} /></g>
        {[[14, 0], [22, 1.2], [30, 0.6]].map(([w, d], i) => <line key={i} className="wi-mist" x1={12 + i * 2} y1={42 + i * 6} x2={52 - i * 3} y2={42 + i * 6} style={{ animationDelay: `-${d}s`, opacity: 0.5 + w / 60 }} />)}
      </>
    )
  } else {
    // 흐림: 구름 두 개가 서로 반대로 천천히 움직임
    art = <><g className="wi-drift rev"><Cloud className="back" x={14} y={-4} scale={0.7} /></g><g className="wi-drift"><Cloud x={2} y={6} /></g></>
  }
  return <svg className="wi" viewBox="0 0 64 64" width="1em" height="1em" focusable="false" aria-hidden="true">{art}</svg>
}
