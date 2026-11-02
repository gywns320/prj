// 제주섬을 간단한 3D 지형으로 만들기 위한 계산 — 실제 지형 데이터가 아니라 '제주섬 모양'을 흉내 낸 것입니다.
//  · 섬: 동서 약 74km · 남북 약 31km 의 타원 (바다로 나갈수록 깊어짐)
//  · 한라산: 섬 중앙(33.362, 126.533)의 높은 봉우리
//  · 오름: 비짓제주 API 에서 받은 오름 위치마다 작은 봉우리 (실제 위치)
// 3D 장면의 1 단위 = 10km. x = 동쪽(+), z = 남쪽(+).
export const UNIT_KM = 10
const KM_PER_DEG_LNG = 92.9 // 위도 33.4° 에서 경도 1도의 길이(km)
const KM_PER_DEG_LAT = 111.2
const CENTER = { lat: 33.38, lng: 126.56 }

export const toKm = (lat, lng) => ({ x: (lng - CENTER.lng) * KM_PER_DEG_LNG, z: (CENTER.lat - lat) * KM_PER_DEG_LAT })
const HALLA = toKm(33.362, 126.533)
const gauss = (dx, dz, r) => Math.exp(-(dx * dx + dz * dz) / (r * r))

// 해안선까지의 상대 거리 (1 = 해안선, 그보다 작으면 섬 안)
export function coastDistance(xkm, zkm) {
  const rot = -0.12
  const u = xkm * Math.cos(rot) - zkm * Math.sin(rot)
  const v = xkm * Math.sin(rot) + zkm * Math.cos(rot)
  return Math.sqrt((u / 37) ** 2 + (v / 15.5) ** 2)
}

// 오름 목록(위치·높이)을 받아 '그 위치의 높이(m)'를 돌려주는 함수를 만듭니다
export function makeHeight(oreums = []) {
  return (xkm, zkm) => {
    const d = coastDistance(xkm, zkm)
    let h = d < 1 ? 40 + (1 - d) ** 0.6 * 330 : -(d - 1) * 500
    if (d < 1.15) h += 1500 * gauss(xkm - HALLA.x, zkm - HALLA.z, 6.2)
    for (const o of oreums) h += o.h * gauss(xkm - o.x, zkm - o.z, 1.1)
    return Math.max(h, -120)
  }
}

export const heightToY = (meters) => (meters / 1000) * 0.55 // 높이를 과장해서 산이 잘 보이게

// 높이별 색 (바다 깊이 → 모래 → 숲 → 바위 → 눈)
const STOPS = [
  [-120, [0.18, 0.5, 0.76]], [-5, [0.2, 0.53, 0.78]], [8, [0.9, 0.85, 0.65]], [90, [0.42, 0.68, 0.35]],
  [450, [0.45, 0.6, 0.3]], [1000, [0.58, 0.52, 0.38]], [1500, [0.7, 0.68, 0.64]], [1850, [0.96, 0.97, 0.98]],
]
export function heightColor(m) {
  if (m <= STOPS[0][0]) return STOPS[0][1]
  for (let i = 1; i < STOPS.length; i++) {
    if (m <= STOPS[i][0]) {
      const [m0, c0] = STOPS[i - 1]
      const [m1, c1] = STOPS[i]
      const k = (m - m0) / (m1 - m0)
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k]
    }
  }
  return STOPS.at(-1)[1]
}
