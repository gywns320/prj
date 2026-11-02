import { useEffect, useState } from 'react'
import { useT } from '../i18n'

// 홈 첫 화면 배경 — 비짓제주(제주관광공사)가 공개한 관광지 사진 중 풍경 사진 몇 장을 돌려가며 보여줍니다.
// 행사 정보가 아니라 분위기를 위한 장식이라, 설명과 출처(사진 이름)를 사진 아래에 함께 적습니다.
const CDN = 'https://api.cdn.visitjeju.net/photomng/imgpath/'
const PHOTOS = [
  { key: 'navaron', path: '201804/30/ec8b087f-9a1a-45e3-826b-5835d5d71ecf.webp' }, // 나바론절벽
  { key: 'witse', path: '201804/30/fdc8ca9c-c974-4fb0-9fe1-0f160c84270a.webp' }, // 윗세족은오름
  { key: 'pyeongdae', path: '201804/30/030701dc-96fb-403c-ae57-ee3088e962d4.webp' }, // 평대해변
  { key: 'saekdal', path: '201807/04/7948c7eb-345d-4c9a-96cd-5f583d325abb.webp' }, // 중문색달해변
]
const SECONDS = 7

export default function HeroPhotos() {
  const { t } = useT()
  const [broken, setBroken] = useState([]) // 불러오지 못한 사진은 건너뜁니다
  const list = PHOTOS.filter((p) => !broken.includes(p.key))
  const [i, setI] = useState(0)
  const current = list.length ? list[i % list.length] : null

  useEffect(() => {
    // '동작 줄이기' 설정을 켠 사람에게는 자동으로 넘기지 않습니다
    if (list.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI((n) => n + 1), SECONDS * 1000)
    return () => clearInterval(id)
  }, [list.length])

  if (!current) return null
  return (
    <>
      <div className="hero-photos" aria-hidden="true">
        {list.map((p) => (
          <img
            key={p.key} src={CDN + p.path} alt="" decoding="async"
            loading={p.key === PHOTOS[0].key ? 'eager' : 'lazy'} fetchPriority={p.key === PHOTOS[0].key ? 'high' : 'auto'}
            className={p.key === current.key ? 'on' : ''}
            onError={() => setBroken((b) => [...b, p.key])}
          />
        ))}
      </div>
      <p className="hero-credit">{t('hero.credit', { place: t(`hero.${current.key}`) })}</p>
    </>
  )
}
