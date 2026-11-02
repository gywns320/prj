import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useChatStore } from '../store/useChatStore'

const SUGGESTIONS = ['chat.s1', 'chat.s2', 'chat.s3', 'chat.s4']
const MAX_CHARS = 600

// 오른쪽 아래 둥근 버튼 → 누르면 AI 가이드 대화창이 열립니다. 모든 페이지에서 쓸 수 있고 대화는 페이지를 옮겨도 이어집니다.
export default function ChatWidget() {
  const { t, lang } = useT()
  const open = useChatStore((s) => s.open)
  const setOpen = useChatStore((s) => s.setOpen)
  const busy = useChatStore((s) => s.busy)
  const messages = useChatStore((s) => s.messages)
  const send = useChatStore((s) => s.send)
  const reset = useChatStore((s) => s.reset)
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // 새 글자가 오면 맨 아래로, 열리면 입력창에 커서
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const submit = (text) => {
    const q = (text ?? draft).trim()
    if (!q || busy) return
    setDraft('')
    send(q, lang)
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } // 한글 입력 중 Enter 는 글자 확정이라 보내지 않음
  }
  // 모바일은 대화창이 화면을 다 덮어서, 링크를 누르면 닫아야 이동한 페이지가 보입니다
  const onLink = () => { if (window.matchMedia('(max-width: 800px)').matches) setOpen(false) }

  if (!open) {
    return (
      <button type="button" className="chat-fab" onClick={() => setOpen(true)} aria-label={t('chat.open')}>
        <span aria-hidden="true">✦</span> {t('chat.fab')}
      </button>
    )
  }

  return (
    <section className="chat" role="dialog" aria-label={t('chat.title')}>
      <header className="chat-head">
        <b>✦ {t('chat.title')}</b>
        <div>
          {messages.length > 0 && <button type="button" className="linkbtn" onClick={reset}>{t('chat.clear')}</button>}
          <button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label={t('chat.close')}>×</button>
        </div>
      </header>

      <div className="chat-list" ref={listRef} aria-live="polite">
        <div className="chat-msg ai"><div className="bubble">{t('chat.hello')}</div></div>
        {messages.length === 0 && (
          <div className="chat-suggest">
            {SUGGESTIONS.map((k) => <button key={k} type="button" className="chip" onClick={() => submit(t(k))}>{t(k)}</button>)}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role === 'user' ? 'me' : 'ai'}`}>
            <div className={`bubble ${m.error ? 'err' : ''}`}>
              {m.role === 'user' ? m.text : <ChatText text={m.text} onLink={onLink} />}
              {m.error && <p className="chat-err">{t(`chat.err.${m.error}`)}</p>}
              {busy && m.role === 'assistant' && !m.error && m === messages.at(-1) && (
                <p className="chat-working">{m.tool ? t(`chat.tool.${m.tool}`) : m.text ? '' : t('chat.thinking')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <textarea
          ref={inputRef} rows={1} value={draft} maxLength={MAX_CHARS} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
        />
        <button type="submit" className="btn primary small" disabled={busy || !draft.trim()}>{t('chat.send')}</button>
      </form>
      <p className="chat-note">{t('chat.note')}</p>
    </section>
  )
}

// 답변의 간단한 마크다운(목록, **굵게**, [글자](링크))만 화면에 그립니다. HTML 로 바꾸지 않고 React 요소로만 만들어서
// 모델이 어떤 글을 보내도 스크립트가 실행될 수 없고, 링크는 이 사이트 안 주소와 http(s) 만 허용합니다.
function ChatText({ text, onLink }) {
  return text.split('\n').map((line, i) => {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (!line.trim()) return null // 빈 줄은 문단 사이 여백으로 충분
    return item
      ? <p key={i} className="chat-li"><span aria-hidden="true">•</span><span><Inline text={item[1]} onLink={onLink} /></span></p>
      : <p key={i}><Inline text={line} onLink={onLink} /></p>
  })
}

function Inline({ text, onLink }) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <b key={i}><Inline text={bold[1]} onLink={onLink} /></b> // **[글자](링크)** 처럼 굵은 글씨 안의 링크도 처리
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const [, label, href] = link
      if (/^\/(?!\/)/.test(href)) return <Link key={i} to={href} onClick={onLink}>{label}</Link>
      if (/^https?:\/\//i.test(href)) return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
      return label
    }
    return part
  })
}
