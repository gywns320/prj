import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { catHue } from './common'
import { UNIT_KM, heightColor, heightToY, makeHeight, toKm } from '../lib/terrain'
import { useT } from '../i18n'

const W = 9.6 // 지형 가로·세로 (단위 = 10km)
const H = 5.6

// 제주섬 3D 장면 — 드래그로 돌리고 휠로 확대합니다.
//  events : 지도에 찍을 행사 (pos 가 있는 것)  → 행사 핀
//  oreums : 오름 위치(lat, lng)               → 지형의 작은 봉우리
//  weather: 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'  → 비·안개
export default function Jeju3D({ events, oreums, weather, selectedSeq, onSelect, autoRotate }) {
  const { t } = useT()
  const height = useMemo(() => makeHeight(oreums.map((o) => ({ ...toKm(o.lat, o.lng), h: o.h }))), [oreums])
  const wet = weather === 'rain' || weather === 'storm' || weather === 'snow'
  const hazy = wet || weather === 'cloud' || weather === 'fog'

  return (
    <Canvas camera={{ position: [0, 4.6, 6.4], fov: 45 }} dpr={[1, 2]} shadows={false}>
      <color attach="background" args={[hazy ? '#cdd6df' : '#bfe3f7']} />
      {hazy && <fog attach="fog" args={['#cdd6df', 8, 17]} />}
      <ambientLight intensity={hazy ? 0.9 : 0.7} />
      <directionalLight position={[5, 8, 4]} intensity={hazy ? 0.8 : 1.4} />

      <Terrain height={height} />
      <Sea />
      {oreums.map((o) => <OreumDot key={o.id} o={o} height={height} />)}
      <Html position={[...hallaPos(height)]} center distanceFactor={9} zIndexRange={[5, 0]}><span className="d3-label muted">▲ {t('d3.hallasan')}</span></Html>

      {events.map((e) => <Pin key={e.seq} ev={e} height={height} selected={e.seq === selectedSeq} onSelect={onSelect} />)}

      {wet && <Rain snow={weather === 'snow'} />}
      <OrbitControls enableDamping dampingFactor={0.08} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI / 2.05} autoRotate={autoRotate} autoRotateSpeed={0.8} />
    </Canvas>
  )
}

function hallaPos(height) {
  const p = toKm(33.362, 126.533)
  return [p.x / UNIT_KM, heightToY(height(p.x, p.z)) + 0.3, p.z / UNIT_KM]
}

function Terrain({ height }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, H, 240, 140)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const m = height(pos.getX(i) * UNIT_KM, pos.getZ(i) * UNIT_KM)
      pos.setY(i, heightToY(m))
      colors.set(heightColor(m), i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [height])
  return <mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
}

function Sea() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[W * 4, H * 5]} />
      <meshStandardMaterial color="#2f86c6" transparent opacity={0.94} roughness={0.3} />
    </mesh>
  )
}

// 오름: 지형이 솟은 자리에 작은 흰 점을 찍어 위치를 알려 줍니다
function OreumDot({ o, height }) {
  const { x, z } = toKm(o.lat, o.lng)
  const y = heightToY(height(x, z)) + 0.02
  return <mesh position={[x / UNIT_KM, y, z / UNIT_KM]}><sphereGeometry args={[0.022, 8, 8]} /><meshBasicMaterial color="#fff7c2" /></mesh>
}

function Pin({ ev, height, selected, onSelect }) {
  const [hover, setHover] = useState(false)
  const { x, z } = toKm(ev.pos.lat, ev.pos.lng)
  const y = Math.max(heightToY(height(x, z)), 0)
  const color = useMemo(() => new THREE.Color(`hsl(${catHue(ev.category)}, 75%, 48%)`), [ev.category])
  const s = selected ? 1.5 : hover ? 1.25 : 1
  return (
    <group position={[x / UNIT_KM, y, z / UNIT_KM]}>
      <mesh
        position={[0, 0.17 * s, 0]} scale={s}
        onClick={(e) => { e.stopPropagation(); onSelect(ev.seq) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        <coneGeometry args={[0.075, 0.34, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.7 : 0.25} />
      </mesh>
      {(hover || selected) && (
        <Html position={[0, 0.5 * s, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <span className="d3-label">{ev.name.slice(0, 22)}</span>
        </Html>
      )}
    </group>
  )
}

// 비(또는 눈) — 점들이 위에서 아래로 떨어지고, 바닥에 닿으면 다시 위로
function Rain({ snow }) {
  const COUNT = 900
  const ref = useRef()
  const positions = useMemo(() => {
    const a = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) { a[i * 3] = (Math.random() - 0.5) * W; a[i * 3 + 1] = Math.random() * 3; a[i * 3 + 2] = (Math.random() - 0.5) * H }
    return a
  }, [])
  useFrame((_, dt) => {
    const attr = ref.current?.geometry.attributes.position
    if (!attr) return
    const fall = (snow ? 0.6 : 3.2) * dt
    for (let i = 0; i < COUNT; i++) {
      let y = attr.getY(i) - fall
      if (y < 0) y += 3
      attr.setY(i, y)
    }
    attr.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={snow ? '#ffffff' : '#7fb2e8'} size={snow ? 0.05 : 0.035} transparent opacity={0.8} />
    </points>
  )
}
