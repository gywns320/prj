// 관광지로 추천하기에 맞지 않는 비짓제주 항목 — 동물병원·애견미용실·헬스장·병원·렌터카 같은 생활 서비스 업소를 거릅니다.
// ① _exclude.js 의 항목 번호(언어가 달라도 같음)  ② 언어별 태그·이름 규칙 (새로 올라온 항목용)
// 태그는 언어마다 번역되어 있어서 규칙도 언어별로 따로 둡니다. 규칙은 '관광지' 분류에만 적용합니다.
// (음식점·숙박·행사 분류는 건드리지 않습니다 — 애견동반 펜션이나 반려견 축제는 그 자체로 의미가 있어서)
import { EXCLUDE_IDS } from './_exclude.js'

export const RULES = {
  kr: {
    sights: '관광지',
    tag: /의료관광|건강검진|반려동물동반_기타체험|반려동물동반_식당카페|애견카페|헬스|피트니스|필라테스|태권도장|볼링|보컬|요가|렌트카|자동차운송|퍼스널컬러|아이스링크|롤러장/,
    title: /병원|의원|약국|애견|펫|필라테스|태권도장|볼링|렌터카|검진|미용실|요가|스냅$/,
  },
  en: {
    sights: 'Tourist Destination',
    tag: /pet hospital|dog grooming|dog daycare|dog hotel|grooming salon|pet-friendly_other|pet-friendly_restaurant|medical tourism|health check|health screening|\bgym\b|fitness|pilates|bowling|vocal|yoga|rent-a-car|auto transport|personal color|ice rink|roller/i,
    title: /hospital|clinic|pharmacy|animal medical|grooming|\bpet\b|rent-a-car|yoga|pilates|taekwondo (school|gym)|bowling|\bgym\b|snap$/i,
  },
  cn: {
    sights: '观光景点',
    tag: /宠物医院|动物医院|宠物诊疗|宠物美容|狗狗美容|宠物寄养|狗狗日托|狗狗幼儿园|宠物犬咖啡馆|其他宠物友好型体验|其他允许携带宠物的体验|宠物用品|医疗旅游|健康检查|体检|健身|瑜伽|普拉提|保龄球|声乐|租车|汽车运输|个人色彩|溜冰场|滑冰|旱冰/,
    title: /医院|诊所|医疗中心|药房|租车|瑜伽|普拉提|跆拳道馆|保龄球|健身|宠物|Snap$/i,
  },
  jp: {
    sights: '観光地',
    tag: /ペット同伴病院|動物病院|ペット犬美容|ペット犬幼稚園|ペットグルーミング|ペット美容室|ペットホテル|犬のデイケア|ペットケア|ペット用品|ペット同伴_その他体験|ペット同伴_飲食店|ドッグカフェ|医療観光|健康診断|ジム|フィットネス|ヨガ|ピラティス|ボウリング|ボーカル|レンタカー|自動車輸送|パーソナルカラー|スケート/,
    title: /病院|クリニック|医療センター|薬局|レンタカー|ピラティス|テコンドー道場|ボウリング|ジム|ペット|スナップ$/,
  },
}

export function isUnrelated(i, locale) {
  if (EXCLUDE_IDS.has(i.contentsid)) return true
  const r = RULES[locale]
  if (!r || i.contentscd?.label !== r.sights) return false
  return r.tag.test(i.tag ?? '') || r.title.test(i.title ?? '')
}
