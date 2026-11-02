import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { Empty, ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { downloadIcs } from '../lib/ics'
import { useT } from '../i18n'
import { useCultureStore } from '../store/useCultureStore'

export default function Saved() {
  const { t } = useT()
  const { events, status, error, retry } = useEvents()
  const saved = useCultureStore((s) => s.saved)

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
    </>
  )
}
