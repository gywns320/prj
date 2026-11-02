// 지도·주변 추천에 쓰는 비짓제주 항목에서 관광과 상관없는 것을 모두 걸러냅니다. 아래 순서로 판단합니다.
//   1) '관광지' 분류가 아니면 숨김 — 음식점·숙박·쇼핑·행사·테마여행은 가게나 일정이라 '가볼 만한 곳'이 아님
//   2) _exclude.js 의 번호 목록에 있으면 숨김 (생활 서비스 업소 + 상업 업체 — 언어가 달라도 번호는 같음)
//   3) 언어별 태그·이름 규칙에 걸리면 숨김 (동물병원·애견미용실·병원·헬스장·렌터카 등, 새로 올라온 항목용)
//   4) 한국어는 '관광지' 성격 태그(자연경관·문화관광·오름·해변…)가 하나도 없는 새 항목도 숨김 (KEEP_IDS 는 예외)
// 태그는 언어마다 번역되어 있어서 3)의 규칙은 언어별로 따로 둡니다.
//
// _exclude.js 를 다시 만들려면 각 언어 응답(/api/visitjeju?locale=kr|en|cn|jp)을 저장해 놓고,
// 1) 규칙에 걸린 '관광지' 항목 → SERVICE_IDS,  2) 한국어에서 아래 SIGHT_TAG 가 없고 KEEP 이 아닌 항목 → COMMERCIAL_IDS 로 모으면 됩니다.
import { COMMERCIAL_IDS, KEEP_IDS, SERVICE_IDS } from './_exclude.js'

export const SIGHT_TAG = /자연경관|문화관광|역사유적|문화유적지|오름|해변|포토스팟|경관\/포토|테마공원|미술\/박물관|도보|걷기|올레|포구|마을관광|마을산책|사찰|템플스테이|박물관|공원|4\.3|온천|폭포|숲|해안|전망/

export const RULES = {
  kr: {
    sights: '관광지',
    tag: /의료관광|건강검진|반려동물동반_기타체험|반려동물동반_식당카페|애견카페|헬스|피트니스|필라테스|태권도장|볼링|보컬|요가|렌트카|자동차운송|퍼스널컬러|아이스링크|롤러장|골프/,
    title: /병원|의원|약국|애견|펫|필라테스|태권도장|볼링|렌터카|검진|미용실|요가|스냅$/,
  },
  en: {
    sights: 'Tourist Destination',
    tag: /pet hospital|dog grooming|dog daycare|dog hotel|grooming salon|pet-friendly_other|pet-friendly_restaurant|medical tourism|health check|health screening|\bgym\b|fitness|pilates|bowling|vocal|yoga|rent-a-car|auto transport|personal color|ice rink|roller|\bgolf\b/i,
    title: /hospital|clinic|pharmacy|animal medical|grooming|\bpet\b|rent-a-car|yoga|pilates|taekwondo (school|gym)|bowling|\bgym\b|snap$/i,
  },
  cn: {
    sights: '观光景点',
    tag: /宠物医院|动物医院|宠物诊疗|宠物美容|狗狗美容|宠物寄养|狗狗日托|狗狗幼儿园|宠物犬咖啡馆|其他宠物友好型体验|其他允许携带宠物的体验|宠物用品|医疗旅游|健康检查|体检|健身|瑜伽|普拉提|保龄球|声乐|租车|汽车运输|个人色彩|溜冰场|滑冰|旱冰|高尔夫/,
    title: /医院|诊所|医疗中心|药房|租车|瑜伽|普拉提|跆拳道馆|保龄球|健身|宠物|Snap$/i,
  },
  jp: {
    sights: '観光地',
    tag: /ペット同伴病院|動物病院|ペット犬美容|ペット犬幼稚園|ペットグルーミング|ペット美容室|ペットホテル|犬のデイケア|ペットケア|ペット用品|ペット同伴_その他体験|ペット同伴_飲食店|ドッグカフェ|医療観光|健康診断|ジム|フィットネス|ヨガ|ピラティス|ボウリング|ボーカル|レンタカー|自動車輸送|パーソナルカラー|スケート|ゴルフ/,
    title: /病院|クリニック|医療センター|薬局|レンタカー|ピラティス|テコンドー道場|ボウリング|ジム|ペット|スナップ$/,
  },
}

// true 면 지도·주변 추천에서 숨깁니다. locale 이 kr/en/cn/jp 가 아니면(분류 이름을 몰라서) 번호 목록만 적용합니다.
export function isHidden(i, locale, { sightsOnly = true } = {}) {
  const r = RULES[locale]
  if (sightsOnly && r && i.contentscd?.label !== r.sights) return true
  if (SERVICE_IDS.has(i.contentsid) || COMMERCIAL_IDS.has(i.contentsid)) return true
  if (!r) return false
  if (r.tag.test(i.tag ?? '') || r.title.test(i.title ?? '')) return true
  return locale === 'kr' && !SIGHT_TAG.test(i.tag ?? '') && !KEEP_IDS.has(i.contentsid)
}
