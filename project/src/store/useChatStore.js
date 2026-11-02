import { create } from 'zustand'

// AI 가이드 대화 상태 — 저장하지 않고 이 탭이 열려 있는 동안만 유지합니다. (페이지를 옮겨 다녀도 대화는 남음)
// 서버(/api/chat)는 줄마다 JSON 한 개를 흘려 보냅니다: { type: 'text' | 'tool' | 'done' | 'error', ... }
let nextId = 1
let controller = null

export const useChatStore = create((set, get) => ({
  open: false,
  busy: false,
  messages: [], // { id, role: 'user' | 'assistant', text, tool?: 작업 중인 도구 이름, error?: 오류 종류 }

  setOpen: (open) => set({ open }),

  reset: () => {
    controller?.abort()
    controller = null
    set({ messages: [], busy: false })
  },

  send: async (text, lang) => {
    const question = text.trim()
    if (!question || get().busy) return

    // 서버에는 오류로 끝난 답변을 빼고 보냅니다
    const history = get().messages.filter((m) => !m.error && m.text).map((m) => ({ role: m.role, content: m.text }))
    const reply = { id: nextId++, role: 'assistant', text: '', tool: null, error: null }
    set({ busy: true, messages: [...get().messages, { id: nextId++, role: 'user', text: question }, reply] })
    const patch = (fn) => set({ messages: get().messages.map((m) => (m.id === reply.id ? { ...m, ...fn(m) } : m)) })

    controller = new AbortController()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, messages: [...history, { role: 'user', content: question }] }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        patch(() => ({ error: data.error || 'failed' }))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 아직 덜 온 마지막 줄은 다음에
        for (const line of lines) {
          if (!line.trim()) continue
          let ev
          try { ev = JSON.parse(line) } catch { continue }
          if (ev.type === 'text') patch((m) => ({ text: m.text + ev.text, tool: null }))
          else if (ev.type === 'tool') patch(() => ({ tool: ev.name }))
          else if (ev.type === 'error') patch(() => ({ error: ev.code || 'failed', tool: null }))
        }
      }
      patch((m) => ({ tool: null, ...(m.text || m.error ? {} : { error: 'failed' }) }))
    } catch (e) {
      if (e.name !== 'AbortError') patch(() => ({ error: 'network', tool: null }))
    } finally {
      controller = null
      set({ busy: false })
    }
  },
}))
