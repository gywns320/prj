import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { Empty, ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { downloadIcs } from '../lib/ics'
import { dayKey, fmtDay } from '../lib/date'
import { isSupabaseReady } from '../lib/supabase'
import { useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'

export default function Saved() {
  const { t } = useT()
  const { events, status, error, retry } = useEvents()
  const saved = useCultureStore((s) => s.saved)
  const nickname = useCultureStore((s) => s.nickname)
  const setNickname = useCultureStore((s) => s.setNickname)
  const cloudStatus = useCultureStore((s) => s.cloudStatus)
  const cloudError = useCultureStore((s) => s.cloudError)
  const visits = useCultureStore((s) => s.visits)
  const loadVisits = useCultureStore((s) => s.loadVisits)
  const [draft, setDraft] = useState(nickname)
  useEffect(() => { setDraft(nickname) }, [nickname])
  useEffect(() => { loadVisits() }, [nickname, loadVisits]) // 최근 본 행사 (Supabase visits)

  // 저장한 순서를 유지하되, 이미 목록에서 사라진(종료된) 행사는 빼고 개수만 알려 줍니다
  const list = saved.map((seq) => events.find((e) => e.seq === seq)).filter(Boolean)
  const gone = saved.length - list.length
  const sorted = [...list].sort((a, b) => a.startKey.localeCompare(b.startKey))

  return (
    <>
      <PageHead kicker={t('saved.kicker')} title={t('saved.title')} sub={t('saved.sub')}>
        {list.length > 0 && (
          <button type="button" className="btn" onClick={() => downloadIcs(sorted, 'my-jeju-events.ics')}>{t('saved.export')}</button>
        )}
      </PageHead>

      <section className="card cloudbox">
        <form onSubmit={(e) => { e.preventDefault(); setNickname(draft) }}>
          <label>{t('cloud.nick')} <input value={draft} maxLength={20} onChange={(e) => setDraft(e.target.value)} /></label>
          <button type="submit" className="btn small" disabled={draft.trim() === nickname}>{t('cloud.nickSet')}</button>
        </form>
        <p className="muted">{t('cloud.nickHint')}</p>
        <p className={`cloud-status ${cloudStatus}`}>
          {cloudStatus === 'error' ? t('cloud.status.error', { e: cloudError }) : t(`cloud.status.${cloudStatus === 'idle' ? 'syncing' : cloudStatus}`)}
        </p>
      </section>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}
      {status === 'ready' && (
        list.length === 0 ? (
          <Empty title={t('saved.none')}>
            <p>{t('saved.hint')}</p>
            <Link to="/events" className="btn primary">{t('saved.browse')}</Link>
          </Empty>
        ) : (
          <>
            <div className="grid">{sorted.map((e) => <EventCard key={e.seq} event={e} />)}</div>
            {gone > 0 && <p className="muted center">{t('saved.gone', { n: gone })}</p>}
          </>
        )
      )}

      <section className="card">
        <h2>{t('visits.title')}</h2>
        {!isSupabaseReady && <p className="muted">{t('visits.off')}</p>}
        {isSupabaseReady && visits.length === 0 && <p className="muted">{t('visits.empty')}</p>}
        {visits.length > 0 && (
          <ul className="visitlist">
            {visits.slice(0, 10).map((v) => (
              <li key={`${v.event_seq}-${v.visited_at}`}>
                <Link to={`/events/${v.event_seq}`}>{v.title || `#${v.event_seq}`}</Link>
                <small className="muted">{fmtDay(dayKey(Date.parse(v.visited_at)))}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
