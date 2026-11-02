// 제주 대표 지역축제 — 열리는 '시기'만 정리한 목록입니다. (정확한 날짜는 해마다 달라져서 싣지 않습니다)
//
// id      : 비짓제주 관광정보의 항목 번호 (참고용)
// img     : 비짓제주 사진 주소 중 photomng/ 뒤의 부분 — 언어마다 항목 유무가 달라서 한국어 데이터에서 골라 적어 둡니다
// city    : jeju(제주시) | seogwipo(서귀포시)
// period  : 예년 개최 시기. [월, 순] 하나 또는 [시작, 끝] 두 개. 순은 'early'(1~10일) 'mid'(11~20일) 'late'(21일~), 생략하면 월만 표시
// names   : 화면에 보일 이름 (비짓제주 제목은 연도·회차가 붙어 해마다 바뀌어서 직접 정리)
// basis   : 시기를 어디서 확인했는지 (코드를 고칠 때 참고용 — 화면에는 나오지 않음)
export const FESTIVALS = [
  { id: 'CNTS_300000000014069', city: 'jeju', img: 'thumbnailpath/202602/09/6bcf74ce-d5e0-4d25-a78a-7c63970cd6d5.webp', period: [[3, 'early'], [3, 'mid']], basis: '2025년 3/14~16, 2026년 3/9~14',
    names: { ko: '제주들불축제', en: 'Jeju Fire Festival', zh: '济州野火节', ja: '済州野火祭り' } },
  { id: 'CNTS_300000000014154', city: 'jeju', img: 'thumbnailpath/202603/17/ec7e1c2b-f561-4318-bd4d-1c40308f823f.webp', period: [[3, 'late']], basis: '2024년 3/22~24',
    names: { ko: '전농로 왕벚꽃축제', en: 'Jeonnong-ro Cherry Blossom Festival', zh: 'Jeonnong-ro樱花节', ja: 'Jeonnong-ro桜まつり' } },
  { id: 'CNTS_300000000014180', city: 'seogwipo', img: 'thumbnailpath/202604/02/65997e43-795a-4263-9e5f-4cff392cce9d.webp', period: [[4, 'early'], [5, 'early']], basis: '2025년 4월 초~5/6',
    names: { ko: '가파도 청보리 축제', en: 'Gapado Green Barley Festival', zh: '加波岛青麦节', ja: 'ガパド青麦祭り' } },
  { id: 'CNTS_300000000014172', city: 'seogwipo', img: 'thumbnailpath/202603/26/249e7527-d67d-410f-810d-ddc9653ef188.webp', period: [[4]], basis: '비짓제주 태그 "4월"',
    names: { ko: '한라산 청정 고사리축제', en: 'Hallasan Bracken Festival', zh: '汉拿山清净蕨菜节', ja: '漢拏山ワラビ祭り' } },
  { id: 'CNTS_300000000013013', city: 'jeju', img: 'imgpath/202505/02/1f66c33f-f92b-46c5-83eb-1b068f69ea39.webp', period: [[5]], basis: '비짓제주 태그 "5월"',
    names: { ko: '성안올레 걷기 축제', en: 'Seongan Olle Walking Festival', zh: '城内偶来步行节', ja: '城内オルレ ウォーキング祭り' } },
  { id: 'CNTS_300000000013549', city: 'seogwipo', img: 'thumbnailpath/202506/09/ae1dd8f6-93f0-4f24-8565-9173c8c506c6.webp', period: [[6]], basis: '비짓제주 태그 "6월제주축제"',
    names: { ko: '제주민속촌 수국축제', en: 'Jeju Folk Village Hydrangea Festival', zh: '济州民俗村绣球花节', ja: '済州民俗村アジサイ祭り' } },
  { id: 'CNTS_300000000014311', city: 'seogwipo', img: 'thumbnailpath/202605/22/7f3eaff2-4c6d-435b-b377-311975f0f3dc.webp', period: [[6]], basis: '비짓제주 태그 "제주6월축제"',
    names: { ko: '제주메밀축제', en: 'Jeju Buckwheat Festival', zh: '济州荞麦节', ja: '済州そば祭り' } },
  { id: 'CNTS_300000000013559', city: 'jeju', img: 'thumbnailpath/202506/11/7170e3b2-4a22-4aa9-88ea-c605e1113229.webp', period: [[7]], basis: '비짓제주 태그 "제주7월축제"',
    names: { ko: '월대천 축제', en: 'Woldaecheon Stream Festival', zh: '月台川庆典', ja: '月台川祭り' } },
  { id: 'CNTS_200000000013948', city: 'jeju', img: 'thumbnailpath/202508/20/a1ab78f5-a998-4a76-955c-f364f7ebab9a.webp', period: [[9]], basis: '비짓제주 태그 "9월"',
    names: { ko: '제주레저힐링축제', en: 'Jeju Leisure & Healing Festival', zh: '济州休闲疗愈节', ja: '済州レジャー・ヒーリング祭り' } },
  { id: 'CNTS_000000000022292', city: 'jeju', img: 'thumbnailpath/202509/10/f2607a5e-5da0-4d6e-aefe-9b405694359e.webp', period: [[9, 'mid'], [9, 'late']], basis: '2022년 9/24~25, 2026년 9/19~20 (2017년은 9/30~10/1)',
    names: { ko: '제주해녀축제', en: 'Jeju Haenyeo Festival', zh: '济州海女节', ja: '済州海女祭り' } },
  { id: 'CNTS_300000000012767', city: 'seogwipo', img: 'thumbnailpath/202508/12/8997c617-3037-4d2f-9805-795a76e1e8b2.webp', period: [[9, 'mid']], basis: '2025년 9/12~14',
    names: { ko: '서귀포 은갈치 축제', en: 'Seogwipo Silver Cutlassfish Festival', zh: '西归浦银带鱼节', ja: '西帰浦タチウオ祭り' } },
  { id: 'CNTS_300000000014997', city: 'jeju', img: 'thumbnailpath/202609/29/7e741c99-ca7c-4766-8dd1-5538f5aa47c5.png', period: [[9, 'mid']], basis: '2025년 9/13',
    names: { ko: '항파두리 역사문화제', en: 'Hangpaduri History & Culture Festival', zh: 'Hangpaduri历史文化节', ja: 'ハンパドゥリ歴史文化祭' } },
  { id: 'CNTS_000000000022291', city: 'jeju', img: 'thumbnailpath/202509/05/b17b1b40-e9d1-4eb6-b005-3c6aa6683c65.webp', period: [[10, 'early']], basis: '2024년 10/5~9',
    names: { ko: '탐라문화제', en: 'Tamna Culture Festival', zh: '耽罗文化节', ja: '耽羅文化祭' } },
  { id: 'CNTS_000000000019645', city: 'seogwipo', img: 'thumbnailpath/202509/15/d39cdbcb-e485-45ba-baef-0e49606e462d.webp', period: [[10, 'mid']], basis: '2025년 10/17~19',
    names: { ko: '서귀포칠십리축제', en: 'Seogwipo Chilsimni Festival', zh: '西归浦七十里庆典', ja: '西帰浦七十里祭り' } },
  { id: 'CNTS_300000000013836', city: 'jeju', img: 'thumbnailpath/202510/20/9ac11288-d3a6-441a-8cd6-fe2d4d4b6fc5.webp', period: [[10, 'late']], basis: '2024년 10/26~27, 2026년 10/24~25',
    names: { ko: '제주마축제', en: 'Jeju Horse Festival', zh: '济州马文化节', ja: '済州馬祭り' } },
  { id: 'CNTS_300000000013852', city: 'jeju', img: 'thumbnailpath/202510/23/626deeb9-277a-409c-ba78-529d8c1b96ca.webp', period: [[11, 'early']], basis: '2025년 11/1~2',
    names: { ko: '제주밭담축제', en: 'Jeju Batdam (Stone Wall) Festival', zh: '济州田埂石墙节', ja: '済州パッタム(石垣畑)祭り' } },
  // 방어축제는 행사 항목이 없고 '방어축제의거리'(관광지)만 있어서, 사진·위치는 그 항목에서 가져옵니다
  { id: 'CNTS_300000000013922', city: 'seogwipo', img: 'thumbnailpath/202511/17/da488724-5dfb-4f51-a0a6-97c3e0093f31.webp', period: [[11, 'mid'], [12, 'early']], basis: '2024년 11/28~12/1, 2025년 11/20~23, 2026년 11/19~22',
    names: { ko: '모슬포 방어축제', en: 'Mosulpo Yellowtail (Bangeo) Festival', zh: '摹瑟浦鲂鱼庆典', ja: '摹瑟浦ブリ祭り' } },
  { id: 'CNTS_300000000014036', city: 'seogwipo', img: 'thumbnailpath/202512/17/34af1830-94f8-407e-8f31-c2285c4fffc6.webp', period: [[12, 'late'], [1, 'early']], basis: '연말연시 해맞이 행사',
    names: { ko: '성산일출축제', en: 'Seongsan Sunrise Festival', zh: '城山日出庆典', ja: '城山日の出祭り' } },
]
