import { create } from 'zustand'
import * as cloud from '../lib/cloud'
import { isSupabaseReady } from '../lib/supabase'
import { useCultureStore } from './useCultureStore'

// AI 가이드 대화 상태 — 페이지를 옮겨 다녀도 대화가 남도록 store 에 둡니다.
// Supabase 가 연결돼 있으면 대화(질문·답변·호출한 도구)를 chat_messages 테이블에 저장하고, 새로고침해도 이어서 보여줍니다.
// 서버(/api/chat)는 줄마다 JSON 한 개를 흘려 보냅니다:
//   { type: 'text', text } · { type: 'tool', id, name, input } · { type: 'tool_done', id, ok, n, note } · { type: 'done' } · { type: 'error', code }
let nextId = 1
let controller = null
const nick = () => useCultureStore.getState().nickname
const cloudFail = (e) => useCultureStore.setState({ cloudStatus: 'error', cloudError: e.message })

export const useChatStore = create((set, get) => ({
  open: false,
  busy: false,
  // { id, role: 'user' | 'assistant', text, tools: [{ id, name, input, status: 'running' | 'done' | 'error', n?, note? }], error? }
  messages: [],
  loadedFor: null, // 어느 닉네임의 기록을 불러왔는지

  setOpen: (open) => set({ open }),

  // 저장된 대화 기록 불러오기 (닉네임이 바뀌면 다시)
  loadHistory: async () => {
    const who = nick()
    if (!isSupabaseReady || get().busy || get().loadedFor === who) return
    set({ loadedFor: who })
    try {
      const rows = await cloud.listChat(who)
      if (nick() !== who || get().messages.length > 0) return
      set({ messages: rows.map((r) => ({ id: nextId++, role: r.role, text: r.content, tools: Array.isArray(r.tools) ? r.tools : [] })) })
    } catch (e) {
      cloudFail(e)
    }
  },

  // 새 대화 — 화면과 Supabase 에 저장된 이 닉네임의 대화 기록을 지웁니다
  reset: async () => {
    controller?.abort()
    controller = null
    set({ messages: [], busy: false })
    if (!isSupabaseReady) return
    try { await cloud.clearChat(nick()) } catch (e) { cloudFail(e) }
  },

  send: async (text, lang) => {
    const question = text.trim()
    if (!question || get().busy) return

    // 서버에는 오류로 끝난 답변을 빼고 보냅니다
    const history = get().messages.filter((m) => !m.error && m.text).map((m) => ({ role: m.role, content: m.text }))
    const reply = { id: nextId++, role: 'assistant', text: '', tools: [], error: null }
    set({ busy: true, messages: [...get().messages, { id: nextId++, role: 'user', text: question, tools: [] }, reply] })
    const patch = (fn) => set({ messages: get().messages.map((m) => (m.id === reply.id ? { ...m, ...fn(m) } : m)) })
    const patchTool = (id, fn) => patch((m) => ({ tools: m.tools.map((t) => (t.id === id ? { ...t, ...fn(t) } : t)) }))

    controller = new AbortController()
    let failed = false
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, messages: [...history, { role: 'user', content: question }] }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        failed = true
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
          if (ev.type === 'text') patch((m) => ({ text: m.text + ev.text }))
          else if (ev.type === 'tool') patch((m) => ({ tools: [...m.tools, { id: ev.id, name: ev.name, input: ev.input ?? {}, status: 'running' }] }))
          else if (ev.type === 'tool_done') patchTool(ev.id, () => ({ status: ev.ok ? 'done' : 'error', n: ev.n, note: ev.note }))
          else if (ev.type === 'error') { failed = true; patch(() => ({ error: ev.code || 'failed' })) }
        }
      }
      const done = get().messages.find((m) => m.id === reply.id)
      if (!done?.text && !done?.error) { failed = true; patch(() => ({ error: 'failed' })) }
    } catch (e) {
      failed = true
      if (e.name !== 'AbortError') patch(() => ({ error: 'network' }))
      else return
    } finally {
      controller = null
      set({ busy: false })
    }

    // 답이 제대로 끝났으면 질문·답변·호출한 도구를 Supabase 에 저장
    if (!failed && isSupabaseReady) {
      const done = get().messages.find((m) => m.id === reply.id)
      if (done?.text) {
        const tools = done.tools.map(({ id, name, input, status, n, note }) => ({ id, name, input, status: status === 'running' ? 'done' : status, n, note }))
        try { await cloud.saveChat(nick(), [{ role: 'user', content: question }, { role: 'assistant', content: done.text, tools }]) } catch (e) { cloudFail(e) }
      }
    }
  },
}))
