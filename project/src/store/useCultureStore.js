import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchEvents } from '../api/events'
import { fetchPlaces } from '../api/places'
import { langInfo, tr } from '../i18n'

// 앱 전체가 함께 쓰는 상태: 행사 목록(API 결과), 저장한 행사, 알림
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

      // ② 저장한 행사 seq 목록 (localStorage 에 보관)
      saved: [],
      toggleSaved: (seq) => {
        const has = get().saved.includes(seq)
        set({ saved: has ? get().saved.filter((s) => s !== seq) : [seq, ...get().saved] })
        get().toast(tr(has ? 'toast.unsaved' : 'toast.saved'))
      },

      // ③ 알림
      toasts: [],
      toast: (message) => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2200)
      },
    }),
    {
      name: 'jeju-culture-store',
      partialize: (s) => ({ saved: s.saved }),
    },
  ),
)
