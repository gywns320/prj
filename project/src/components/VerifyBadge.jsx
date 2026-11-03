import { useT } from '../i18n'

// 서버가 실시간 API 값을 검증 데이터(api/_corrections.js)와 대조한 결과를 작은 표시로 보여줍니다.
//   verified  : 다른 출처로 확인한 칸이 지금도 그대로 → '✓ 검증됨'
//   corrected : 원본이 틀려 확인된 값으로 고쳐 보여주는 칸 → '정보 보정'
export default function VerifyBadge({ item }) {
  const { t } = useT()
  return (
    <>
      {item.verified && <span className="vbadge ok" title={t('v.okTitle', { date: item.verified.date })}>{t('v.ok')}</span>}
      {item.corrected?.length > 0 && <span className="vbadge fixed" title={t('v.fixedTitle', { f: item.corrected.join(', ') })}>{t('v.fixed')}</span>}
    </>
  )
}
