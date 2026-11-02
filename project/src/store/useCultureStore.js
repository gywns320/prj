import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchEvents } from '../api/events'
import { fetchPlaces } from '../api/places'

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
      places: [],
      placesStatus: 'idle',
      placesError: '',
      loadPlaces: async (force = false) => {
        if (get().placesStatus === 'loading' || (get().placesStatus === 'ready' && !force)) return
        set({ placesStatus: 'loading', placesError: '' })
        try {
          set({ places: await fetchPlaces(), placesStatus: 'ready' })
        } catch (e) {
          set({ placesStatus: 'error', placesError: e.message })
        }
      },

      // ② 저장한 행사 seq 목록 (localStorage 에 보관)
      saved: [],
      toggleSaved: (seq) => {
        const has = get().saved.includes(seq)
        set({ saved: has ? get().saved.filter((s) => s !== seq) : [seq, ...get().saved] })
        get().toast(has ? '저장을 해제했어요' : '내 일정에 저장했어요')
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
