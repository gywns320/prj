import { supabase } from './supabase'

// Supabase(DB)에 저장·조회하는 함수 모음 — 화면 코드는 supabase.from(...) 을 직접 쓰지 않고 여기만 부릅니다.
// 사용자는 로그인 없이 '닉네임'으로 구분합니다. (같은 닉네임이면 다른 브라우저에서도 같은 기록이 보임)
//   favorites     저장한 행사     (nickname, source='event', item_id=행사 번호, title)
//   visits        행사 방문 기록  (nickname, event_seq, title, visited_at)
//   chat_messages AI 대화 기록    (nickname, role, content, tools, created_at)
// 테이블은 supabase/schema.sql 로 만듭니다. 실패하면 Error 를 던지니 부르는 쪽에서 잡아 알림을 띄웁니다.
const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

export async function listFavorites(nick) {
  return check(await supabase.from('favorites').select('item_id,title,created_at')
    .eq('nickname', nick).eq('source', 'event').order('created_at', { ascending: false }))
}
export async function addFavorite(nick, seq, title) {
  check(await supabase.from('favorites').insert({ nickname: nick, source: 'event', item_id: String(seq), title: title || '' }))
}
export async function removeFavorite(nick, seq) {
  check(await supabase.from('favorites').delete().eq('nickname', nick).eq('source', 'event').eq('item_id', String(seq)))
}

export async function logVisit(nick, seq, title) {
  check(await supabase.from('visits').insert({ nickname: nick, event_seq: String(seq), title: title || '' }))
}
export async function listVisits(nick, limit = 30) {
  return check(await supabase.from('visits').select('event_seq,title,visited_at')
    .eq('nickname', nick).order('visited_at', { ascending: false }).limit(limit))
}

export async function saveChat(nick, rows) {
  if (rows.length === 0) return
  check(await supabase.from('chat_messages').insert(rows.map((r) => ({ nickname: nick, role: r.role, content: r.content, tools: r.tools ?? [] }))))
}
export async function listChat(nick, limit = 40) {
  const rows = check(await supabase.from('chat_messages').select('role,content,tools,created_at')
    .eq('nickname', nick).order('created_at', { ascending: false }).limit(limit))
  return rows.reverse() // 오래된 것부터 보이게
}
export async function clearChat(nick) {
  check(await supabase.from('chat_messages').delete().eq('nickname', nick))
}
