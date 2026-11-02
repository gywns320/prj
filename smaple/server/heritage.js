// 국가유산청 국가유산 검색 오픈API (키 불필요, XML 응답)
import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser();

export async function searchHeritage({ keyword = '', rows = 10 } = {}) {
  const params = new URLSearchParams({ ccbaCtcd: '50', pageUnit: String(rows), pageIndex: '1' }); // 50 = 제주
  if (keyword) params.set('ccbaMnm1', keyword);
  const r = await fetch(`https://www.khs.go.kr/cha/SearchKindOpenapiList.do?${params}`);
  const data = parser.parse(await r.text());
  const item = data?.result?.item;
  const list = !item ? [] : Array.isArray(item) ? item : [item];
  return list.map((h) => ({
    name: h.ccbaMnm1, kind: h.ccmaName, city: h.ccsiName,
    lat: h.latitude, lng: h.longitude,
  }));
}
