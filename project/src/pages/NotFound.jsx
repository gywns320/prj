import { Link } from 'react-router-dom'
import { useT } from '../i18n'

// inline: 레이아웃 안에서(예: 잘못된 행사 번호), 아니면 errorElement 로 단독 표시
export default function NotFound({ inline = false }) {
  const { t } = useT()
  const body = (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">?</div>
      <p><b>{t('nf.title')}</b></p>
      <Link to="/events" className="btn primary">{t('nf.go')}</Link>
    </div>
  )
  return inline ? body : <main className="page">{body}</main>
}
