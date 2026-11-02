-- 제주 문화달력 — Supabase 테이블 (대시보드 → SQL Editor 에 붙여넣고 Run). 여러 번 실행해도 안전합니다.
-- 사용자는 로그인 없이 '닉네임'으로 구분합니다. 아래 정책은 실습용(누구나 읽고 쓰기)이라
-- 닉네임을 아는 사람은 그 기록을 볼 수 있어요 — 비밀 내용은 저장하지 마세요.
-- (실제 서비스라면 Supabase Auth 로 로그인한 사용자만 자기 행을 읽고 쓰게 정책을 바꿉니다.)

-- ① 즐겨찾기: 저장한 행사 (source = 'event', item_id = 행사 번호)
create table if not exists favorites (
  id bigint generated always as identity primary key,
  nickname text not null,
  source text not null,
  item_id text not null,
  title text not null,
  created_at timestamptz default now()
);
alter table favorites enable row level security;
drop policy if exists "read all" on favorites;
drop policy if exists "insert all" on favorites;
drop policy if exists "delete all" on favorites;
create policy "read all"   on favorites for select using (true);
create policy "insert all" on favorites for insert with check (true);
create policy "delete all" on favorites for delete using (true);   -- 저장 해제에 필요

-- ② 방문 기록: 행사 상세를 연 기록
create table if not exists visits (
  id bigint generated always as identity primary key,
  nickname text not null,
  event_seq text not null,
  title text not null default '',
  visited_at timestamptz default now()
);
alter table visits enable row level security;
drop policy if exists "read all" on visits;
drop policy if exists "insert all" on visits;
create policy "read all"   on visits for select using (true);
create policy "insert all" on visits for insert with check (true);

-- ③ 대화 기록: AI 가이드와 나눈 대화 (tools = 에이전트가 호출한 도구 목록)
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  nickname text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tools jsonb not null default '[]',
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
drop policy if exists "read all" on chat_messages;
drop policy if exists "insert all" on chat_messages;
drop policy if exists "delete all" on chat_messages;
create policy "read all"   on chat_messages for select using (true);
create policy "insert all" on chat_messages for insert with check (true);
create policy "delete all" on chat_messages for delete using (true);   -- '새 대화' 로 기록을 지울 때 필요

create index if not exists favorites_nick_idx on favorites (nickname, source);
create index if not exists visits_nick_idx on visits (nickname, visited_at desc);
create index if not exists chat_nick_idx on chat_messages (nickname, created_at desc);
