import { Link } from 'react-router-dom'

// inline: 레이아웃 안에서(예: 잘못된 행사 번호), 아니면 errorElement 로 단독 표시
export default function NotFound({ inline = false }) {
  const body = (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">?</div>
      <p><b>찾는 페이지가 없어요</b></p>
      <Link to="/events" className="btn primary">행사 목록으로</Link>
    </div>
  )
  return inline ? body : <main className="page">{body}</main>
}
