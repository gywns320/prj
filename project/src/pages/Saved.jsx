import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { Empty, ErrorBox, PageHead, Skeletons, useEvents } from '../components/common'
import { downloadIcs } from '../lib/ics'
import { useCultureStore } from '../store/useCultureStore'

export default function Saved() {
  const { events, status, error, retry } = useEvents()
  const saved = useCultureStore((s) => s.saved)

  // 저장한 순서를 유지하되, 이미 목록에서 사라진(종료된) 행사는 빼고 개수만 알려 줍니다
  const list = saved.map((seq) => events.find((e) => e.seq === seq)).filter(Boolean)
  const gone = saved.length - list.length
  const sorted = [...list].sort((a, b) => a.startKey.localeCompare(b.startKey))

  return (
    <>
      <PageHead kicker="내 일정" title="저장한 행사" sub="이 기기의 브라우저에 저장돼요.">
        {list.length > 0 && (
          <button type="button" className="btn" onClick={() => downloadIcs(sorted, 'my-jeju-events.ics')}>전체를 캘린더로 내보내기</button>
        )}
      </PageHead>

      {status === 'error' && <ErrorBox message={error} onRetry={retry} />}
      {(status === 'loading' || status === 'idle') && <Skeletons n={3} />}
      {status === 'ready' && (
        list.length === 0 ? (
          <Empty title="아직 저장한 행사가 없어요">
            <p>카드의 ☆ 를 누르면 여기에 모여요.</p>
            <Link to="/events" className="btn primary">행사 둘러보기</Link>
          </Empty>
        ) : (
          <>
            <div className="grid">{sorted.map((e) => <EventCard key={e.seq} event={e} />)}</div>
            {gone > 0 && <p className="muted center">종료되어 목록에서 사라진 행사 {gone}건은 표시하지 않았어요.</p>}
          </>
        )
      )}
    </>
  )
}
