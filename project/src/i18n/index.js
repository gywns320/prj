import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DATE, LANGS, MESSAGES } from './messages'

export { LANGS }

// 처음 방문이면 브라우저 언어를 따라가고, 고른 뒤에는 그 선택을 기억합니다
function detect() {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || ''
  return LANGS.find((l) => nav.toLowerCase().startsWith(l.code))?.code ?? 'ko'
}

export const useLangStore = create(
  persist(
    (set) => ({ lang: detect(), setLang: (lang) => set({ lang }) }),
    {
      name: 'jeju-culture-lang',
      partialize: (s) => ({ lang: s.lang }),
      merge: (saved, cur) => ({ ...cur, lang: LANGS.some((l) => l.code === saved?.lang) ? saved.lang : cur.lang }),
    },
  ),
)

export const getLang = () => useLangStore.getState().lang
export const langInfo = (lang = getLang()) => LANGS.find((l) => l.code === lang) ?? LANGS[0]
export const dateParts = (lang = getLang()) => DATE[lang] ?? DATE.ko

const fill = (text, params) => text.replace(/\{(\w+)\}/g, (m, k) => (params?.[k] ?? m))

// 키로 문구를 찾아 자리표시자를 채웁니다.
// - 현재 언어에 없으면 한국어, 그것도 없으면 키 그대로 돌려줍니다 (서버가 준 한글 오류문 같은 것도 그대로 통과)
// - 'err.x:404' 처럼 ':' 뒤에 값을 붙이면 {0} 자리에 들어갑니다
export function translate(lang, key, params) {
  const [k, ...rest] = String(key).split(':')
  const text = MESSAGES[lang]?.[k] ?? MESSAGES.ko[k]
  if (text == null) return String(key)
  return fill(text, params ?? Object.fromEntries(rest.map((v, i) => [i, v])))
}

export const tr = (key, params) => translate(getLang(), key, params)
export const has = (key) => key in MESSAGES.ko

// 행사 API 가 주는 한글 분류명·지역명을 현재 언어로 (모르는 값은 그대로)
export const catLabel = (c) => (has(`cat.${c}`) ? tr(`cat.${c}`) : c)
export const regionLabel = (r) => (has(`rg.${r}`) ? tr(`rg.${r}`) : r)
export const payLabel = (ev) => (has(`pay.${ev.payTag}`) ? tr(`pay.${ev.payTag}`) : ev.pay)
export const locLabel = (ev) => (has(`loc.${ev.locTag}`) ? tr(`loc.${ev.locTag}`) : ev.loc)

// 컴포넌트에서: const { t, lang } = useT()  — 언어가 바뀌면 다시 그려집니다
export function useT() {
  const lang = useLangStore((s) => s.lang)
  return { t: (key, params) => translate(lang, key, params), lang }
}

// <html lang> 과 문서 제목을 언어에 맞춥니다
export function useDocumentLang() {
  const lang = useLangStore((s) => s.lang)
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = translate(lang, 'meta.title')
  }, [lang])
}
