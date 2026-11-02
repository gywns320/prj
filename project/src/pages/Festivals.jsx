import { useMemo, useState } from 'react'
import { Cover } from '../components/EventCard'
import { PageHead } from '../components/common'
import { FESTIVALS, festivalPhoto, periodMonths, periodText } from '../data/festivals'
import { periodParts, useT } from '../i18n'
import { dayKey } from '../lib/date'

// 지역축제 둘러보기 — 날짜가 아니라 '예년에 열리던 시기'만 알려 주고, 정확한 일정은 공식 안내로 안내합니다.
// 이름·시기·사진은 src/data/festivals.js 에 있어서 서버 연결 없이 바로 보입니다.
const thisMonth = () => Number(dayKey(Date.now()).slice(5, 7))
const CITY_KEY = { jeju: 'region.제주시', seogwipo: 'region.서귀포시' }

// 한국어 이름으로 검색 — 공식 누리집은 대부분 한국어라 한국어 이름이 가장 잘 찾아집니다
const searchUrl = (lang, koName) => (lang === 'ko'
  ? `https://search.naver.com/search.naver?query=${encodeURIComponent(koName)}`
  : `https://www.google.com/search?q=${encodeURIComponent(`${koName} 제주`)}`)

export default function Festivals() {
  const { t, lang } = useT()
  const [month, setMonth] = useState(0) // 0 = 전체
  const now = thisMonth()

  // 이번 달에 가까운 시기부터 차례로 (12월 다음은 1월)
  const list = useMemo(() => FESTIVALS
    .map((f) => ({ ...f, months: periodMonths(f.period), dist: (f.period[0][0] - now + 12) % 12 }))
    .filter((f) => !month || f.months.includes(month))
    .sort((a, b) => a.dist - b.dist), [month, now])

  const pf = periodParts()

  return (
    <>
      <PageHead kicker={t('fest.kicker')} title={t('fest.title')} sub={t('fest.sub')} />

      <p className="fest-note" role="note">{t('fest.note')}</p>

      <div className="filters">
        <div className="chiprow" role="group" aria-label={t('fest.monthAria')}>
          <button type="button" className={`chip ${month === 0 ? 'on' : ''}`} onClick={() => setMonth(0)}>{t('common.all')}</button>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button key={m} type="button" className={`chip ${month === m ? 'on' : ''}`} aria-pressed={month === m} onClick={() => setMonth(month === m ? 0 : m)}>{pf.mon(m)}</button>
          ))}
        </div>
      </div>

      {list.length === 0
        ? <p className="muted center pad">{t('fest.none')}</p>
        : (
          <div className="grid">
            {list.map((fe) => (
              <article key={fe.id} className="fcard">
                <div className="fcard-media">
                  <Cover src={festivalPhoto(fe)} category="축제" alt="" />
                  {fe.months.includes(now) && <span className="badge st-live">{t('fest.thisMonth')}</span>}
                </div>
                <div className="fcard-body">
                  <p className="fcard-when"><span>{t('fest.when')}</span> <b>{periodText(fe.period)}</b></p>
                  <h3>{fe.names[lang] ?? fe.names.ko}</h3>
                  {lang !== 'ko' && <p className="fcard-ko">{fe.names.ko}</p>}
                  <p className="ecard-meta place">{t(CITY_KEY[fe.city])}</p>
                  <a className="btn small ghost" href={searchUrl(lang, fe.names.ko)} target="_blank" rel="noopener noreferrer">{t('fest.official')}</a>
                </div>
              </article>
            ))}
          </div>
        )}

      <p className="muted src">{t('fest.src')}</p>
    </>
  )
}
