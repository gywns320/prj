import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchEvents } from '../api/events'
import { fetchFoods, fetchPlaces } from '../api/places'
import { langInfo, tr } from '../i18n'
import * as cloud from '../lib/cloud'
import { isSupabaseReady } from '../lib/supabase'

const newNickname = () => `손님-${Math.random().toString(36).slice(2, 6)}`
const visitedAt = {} // 같은 행사를 짧은 시간에 여러 번 열어도 방문 기록은 한 번만
const VISIT_GAP_MS = 30 * 60 * 1000

// 앱 전체가 함께 쓰는 상태: 행사 목록(API 결과), 저장한 행사·방문 기록(Supabase), 알림
export const useCultureStore = create(
  persist(
    (set, get) => ({
      // ① 행사 목록 — 앱을 켠 뒤 한 번만 불러오고 모든 페이지가 공유
      events: [],
      status: 'idle', // idle | loading | ready | error
      error: '',
      loadEvents: async (force = false) => {
        if (get().status === 'loading' || (get().status === 'ready' && !force)) return
        set({ status: 'loading', error: '' })
        try {
          set({ events: await fetchEvents(), status: 'ready' })
        } catch (e) {
          set({ status: 'error', error: e.message })
        }
      },

      // ①-2 주변 관광지(비짓제주) — 필요한 화면에서 처음 열 때 한 번만 불러옴
      // 언어가 바뀌면 관광지 이름·소개도 그 언어로 다시 받아옵니다
      places: [],
      placesLocale: '',
      placesStatus: 'idle',
      placesError: '',
      loadPlaces: async (force = false) => {
        const locale = langInfo().visitjeju
        const s = get()
        if (s.placesLocale === locale && (s.placesStatus === 'loading' || (s.placesStatus === 'ready' && !force))) return
        set({ placesStatus: 'loading', placesError: '', placesLocale: locale })
        try {
          const places = await fetchPlaces(locale)
          if (get().placesLocale === locale) set({ places, placesStatus: 'ready' })
        } catch (e) {
          if (get().placesLocale === locale) set({ placesStatus: 'error', placesError: e.message })
        }
      },

      // ①-3 카페·식당(비짓제주 '음식점' 분류) — 지도에서 켰을 때 한 번만 불러옴 (언어별로 따로)
      foods: [],
      foodsLocale: '',
      foodsStatus: 'idle',
      loadFoods: async (force = false) => {
        const locale = langInfo().visitjeju
        const s = get()
        if (s.foodsLocale === locale && (s.foodsStatus === 'loading' || (s.foodsStatus === 'ready' && !force))) return
        set({ foodsStatus: 'loading', foodsLocale: locale })
        try {
          const foods = await fetchFoods(locale)
          if (get().foodsLocale === locale) set({ foods, foodsStatus: 'ready' })
        } catch {
          if (get().foodsLocale === locale) set({ foodsStatus: 'error' })
        }
      },

      // ② 사용자 — 로그인 없이 닉네임으로 구분 (같은 닉네임이면 다른 브라우저에서도 같은 기록이 보임)
      nickname: newNickname(),
      setNickname: (name) => {
        const next = String(name ?? '').trim().slice(0, 20) || newNickname()
        if (next === get().nickname) return
        set({ nickname: next, saved: [], visits: [] }) // 이전 닉네임의 저장 목록이 새 닉네임으로 올라가지 않게 비움
        get().syncSaved()
      },

      // ③ 저장한 행사 — Supabase favorites 테이블이 원본이고, 이 브라우저에도 한 벌 남겨 둡니다
      //    (Supabase 설정이 없거나 연결이 안 되면 이 브라우저에만 저장)
      saved: [], // 행사 seq 목록, 최근에 저장한 순
      cloudStatus: isSupabaseReady ? 'idle' : 'off', // off | idle | syncing | ready | error
      cloudError: '',
      syncSaved: async () => {
        if (!isSupabaseReady) return set({ cloudStatus: 'off' })
        set({ cloudStatus: 'syncing', cloudError: '' })
        const nick = get().nickname
        try {
          const rows = await cloud.listFavorites(nick)
          const remote = [...new Set(rows.map((r) => Number(r.item_id)).filter(Number.isInteger))]
          // 이 브라우저에만 있던 저장 항목(Supabase 를 붙이기 전에 저장한 것)은 올려 줍니다
          const localOnly = get().saved.filter((s) => !remote.includes(s))
          const title = (seq) => get().events.find((e) => e.seq === seq)?.name ?? ''
          await Promise.all(localOnly.map((seq) => cloud.addFavorite(nick, seq, title(seq))))
          if (get().nickname === nick) set({ saved: [...localOnly, ...remote], cloudStatus: 'ready' })
        } catch (e) {
          set({ cloudStatus: 'error', cloudError: e.message })
        }
      },
      toggleSaved: async (seq) => {
        const before = get().saved
        const has = before.includes(seq)
        set({ saved: has ? before.filter((s) => s !== seq) : [seq, ...before] })
        get().toast(tr(has ? 'toast.unsaved' : 'toast.saved'))
        if (!isSupabaseReady) return
        const nick = get().nickname
        try {
          if (has) await cloud.removeFavorite(nick, seq)
          else await cloud.addFavorite(nick, seq, get().events.find((e) => e.seq === seq)?.name ?? '')
          set({ cloudStatus: 'ready', cloudError: '' })
        } catch (e) {
          set({ saved: before, cloudStatus: 'error', cloudError: e.message }) // 저장이 안 됐으니 화면도 되돌림
          get().toast(`${tr('cloud.saveFail')} (${e.message})`)
        }
      },

      // ④ 방문 기록 — 행사 상세를 열면 Supabase visits 테이블에 남기고, 내 일정 화면에서 '최근 본 행사'로 보여줍니다
      visits: [],
      loadVisits: async () => {
        if (!isSupabaseReady) return
        try { set({ visits: await cloud.listVisits(get().nickname) }) } catch (e) { set({ cloudStatus: 'error', cloudError: e.message }) }
      },
      recordVisit: async (seq, title) => {
        if (!isSupabaseReady) return
        const now = Date.now()
        if (now - (visitedAt[seq] ?? 0) < VISIT_GAP_MS) return
        visitedAt[seq] = now
        try {
          await cloud.logVisit(get().nickname, seq, title)
          set({ visits: [{ event_seq: String(seq), title, visited_at: new Date(now).toISOString() }, ...get().visits.filter((v) => v.event_seq !== String(seq))] })
        } catch (e) {
          set({ cloudStatus: 'error', cloudError: e.message })
        }
      },

      // ⑤ 알림
      toasts: [],
      toast: (message) => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2200)
      },
    }),
    {
      name: 'jeju-culture-store',
      partialize: (s) => ({ saved: s.saved, nickname: s.nickname }),
    },
  ),
)
