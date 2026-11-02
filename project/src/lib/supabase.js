import { createClient } from '@supabase/supabase-js'

// VITE_ 로 시작하는 값만 브라우저에 들어갑니다. Supabase 의 URL 과 anon(publishable) 키는 원래 공개해도 되는 값이고,
// 실제 보호는 Supabase 쪽 RLS 정책이 맡습니다. (비밀 키는 절대 VITE_ 를 붙이지 마세요)
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// 값이 없어도 앱이 멈추지 않도록 null — 그때는 저장한 행사가 이 브라우저에만 남습니다
export const supabase = url && key ? createClient(url, key) : null
export const isSupabaseReady = Boolean(supabase)
