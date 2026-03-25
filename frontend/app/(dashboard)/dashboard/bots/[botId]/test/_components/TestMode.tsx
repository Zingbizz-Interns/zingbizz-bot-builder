'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, MoreVertical, RotateCcw, Send } from 'lucide-react'

// ─── Shared types (exported for page.tsx) ────────────────────────────────────

export type FullQuestion = {
  id: string
  question_text: string
  input_type: 'text' | 'choice'
  validation_type: string
  is_required: boolean
  order_index: number
  options: { option_label: string }[]
  conditions: { condition_question_id: string; condition_operator: string; condition_value: string }[]
}

export type FullTrigger = {
  id: string
  name: string
  trigger_type: 'single' | 'multi' | 'any'
  platforms: string[]
  action_type: 'replier' | 'form' | 'query'
  keywords: string[]
  replier?: {
    message_text: string
    buttons: { label: string; triggerId: string | null }[]
  }
  form?: {
    id: string
    title: string
    questions: FullQuestion[]
  }
  query?: {
    categories: {
      category_name: string
      questions: { question_text: string; answer_text: string }[]
    }[]
  }
}

export type BotConfig = {
  bot: { name: string; fallback_message: string }
  activePlatforms: string[]
  triggers: FullTrigger[]
}

// ─── Internal types ───────────────────────────────────────────────────────────

type BtnAction =
  | { kind: 'trigger'; triggerId: string | null }
  | { kind: 'formChoice' }
  | { kind: 'queryNav'; target: 'cat' | 'question' | 'askAnother' | 'done'; catIndex?: number; qIndex?: number }

type MsgBtn = BtnAction & { label: string }

type Msg = {
  id: string
  from: 'user' | 'bot' | 'system'
  text: string
  buttons?: MsgBtn[]
  progress?: { done: number; total: number }
}

type Session =
  | { type: 'idle' }
  | { type: 'form'; trigger: FullTrigger; questions: FullQuestion[]; qIndex: number; answers: Record<string, string> }
  | { type: 'query'; triggerId: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function validate(value: string, validationType: string): string | null {
  const v = value.trim()
  switch (validationType) {
    case 'email':  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Please enter a valid email address.'
    case 'phone':  return /^[+\d\s\-()]{6,20}$/.test(v)         ? null : 'Please enter a valid phone number.'
    case 'number': return !isNaN(Number(v)) && v !== ''          ? null : 'Please enter a valid number.'
    case 'date':   return !isNaN(Date.parse(v))                  ? null : 'Please enter a valid date (e.g. 2024-01-31).'
    default:       return null
  }
}

function checkConditions(q: FullQuestion, answers: Record<string, string>): boolean {
  if (q.conditions.length === 0) return true
  return q.conditions.every(c => {
    const ans = (answers[c.condition_question_id] ?? '').toLowerCase()
    const val = c.condition_value.toLowerCase()
    if (c.condition_operator === 'eq')       return ans === val
    if (c.condition_operator === 'neq')      return ans !== val
    if (c.condition_operator === 'contains') return ans.includes(val)
    return true
  })
}

function findNextQuestion(questions: FullQuestion[], fromIndex: number, answers: Record<string, string>): number {
  for (let i = fromIndex; i < questions.length; i++) {
    if (checkConditions(questions[i], answers)) return i
  }
  return -1
}

function resolveTokens(text: string, questions: FullQuestion[], answers: Record<string, string>): string {
  return text.replace(/\{Q(\d+)\}/g, (_, n) => {
    const q = questions[parseInt(n) - 1]
    if (!q) return `{Q${n}}`
    return answers[q.id] || `[Q${n} answer]`
  })
}

function buildQuestionMsg(
  q: FullQuestion,
  qIndex: number,
  total: number,
  questions: FullQuestion[],
  answers: Record<string, string>,
): Msg {
  const text = resolveTokens(q.question_text, questions, answers) || 'Question text...'
  const suffix = q.is_required ? '' : '\n\n_(Optional — type "skip" to skip)_'
  return {
    id: uid(),
    from: 'bot',
    text: text + suffix,
    progress: { done: qIndex, total },
    buttons: q.input_type === 'choice' && q.options.length > 0
      ? q.options.map(o => ({ kind: 'formChoice', label: o.option_label }))
      : undefined,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestMode({ config }: { config: BotConfig }) {
  const platforms = config.activePlatforms.length > 0
    ? config.activePlatforms
    : ['whatsapp', 'instagram']

  const [platform, setPlatform] = useState<string>(platforms[0])
  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), from: 'system', text: 'Test mode active. Type a keyword to start.' },
  ])
  const [session, setSession] = useState<Session>({ type: 'idle' })
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const isWA = platform === 'whatsapp'

  // ── Trigger matching ──────────────────────────────────────────────────────

  function matchTrigger(userInput: string): FullTrigger | null {
    const norm = userInput.trim().toLowerCase()
    // Keyword matches first
    for (const t of config.triggers) {
      if (!t.platforms.includes(platform)) continue
      if (t.trigger_type === 'single' && t.keywords[0]?.toLowerCase() === norm) return t
      if (t.trigger_type === 'multi'  && t.keywords.some(k => k.toLowerCase() === norm)) return t
    }
    // Catch-all
    for (const t of config.triggers) {
      if (!t.platforms.includes(platform)) continue
      if (t.trigger_type === 'any') return t
    }
    return null
  }

  // ── Fire a trigger → produce messages + new session ───────────────────────

  function buildTriggerResponse(trigger: FullTrigger): [Msg[], Session] {
    if (trigger.action_type === 'replier' && trigger.replier) {
      const msg: Msg = {
        id: uid(),
        from: 'bot',
        text: trigger.replier.message_text || '(No message set)',
        buttons: trigger.replier.buttons.map(b => ({
          kind: 'trigger',
          label: b.label,
          triggerId: b.triggerId,
        })),
      }
      return [[msg], { type: 'idle' }]
    }

    if (trigger.action_type === 'form' && trigger.form) {
      const questions = trigger.form.questions
      if (questions.length === 0) {
        return [[{ id: uid(), from: 'system', text: 'This form has no questions configured.' }], { type: 'idle' }]
      }
      const answers: Record<string, string> = {}
      const firstIdx = findNextQuestion(questions, 0, answers)
      if (firstIdx === -1) {
        return [[{ id: uid(), from: 'system', text: 'No questions to show (all conditions failed).' }], { type: 'idle' }]
      }
      const qMsg = buildQuestionMsg(questions[firstIdx], firstIdx, questions.length, questions, answers)
      return [[qMsg], { type: 'form', trigger, questions, qIndex: firstIdx, answers }]
    }

    if (trigger.action_type === 'query' && trigger.query) {
      const cats = trigger.query.categories
      if (cats.length === 0) {
        return [[{ id: uid(), from: 'system', text: 'This FAQ has no categories configured.' }], { type: 'idle' }]
      }
      const msg: Msg = {
        id: uid(),
        from: 'bot',
        text: 'What would you like to know about?',
        buttons: cats.map((cat, i) => ({
          kind: 'queryNav',
          target: 'cat',
          catIndex: i,
          label: cat.category_name || `Category ${i + 1}`,
        })),
      }
      return [[msg], { type: 'query', triggerId: trigger.id }]
    }

    return [
      [{ id: uid(), from: 'bot', text: config.bot.fallback_message || "I'm not fully configured yet." }],
      { type: 'idle' },
    ]
  }

  // ── Process a form answer ─────────────────────────────────────────────────

  function processFormAnswer(
    sess: Extract<Session, { type: 'form' }>,
    value: string,
  ): [Msg[], Session] {
    const { trigger, questions, qIndex, answers } = sess
    const current = questions[qIndex]
    const trimmed = value.trim()

    // Handle skip for optional questions
    if (!current.is_required && trimmed.toLowerCase() === 'skip') {
      const newAnswers = { ...answers, [current.id]: '' }
      return advanceForm(trigger, questions, qIndex, newAnswers)
    }

    // Required check
    if (current.is_required && !trimmed) {
      return [[{ id: uid(), from: 'bot', text: 'This question is required. Please provide an answer.' }], sess]
    }

    // Validate format
    if (trimmed) {
      const validationError = validate(trimmed, current.validation_type)
      if (validationError) {
        return [[{ id: uid(), from: 'bot', text: validationError }], sess]
      }
    }

    const newAnswers = { ...answers, [current.id]: trimmed }
    return advanceForm(trigger, questions, qIndex, newAnswers)
  }

  function advanceForm(
    trigger: FullTrigger,
    questions: FullQuestion[],
    currentIdx: number,
    answers: Record<string, string>,
  ): [Msg[], Session] {
    const nextIdx = findNextQuestion(questions, currentIdx + 1, answers)
    if (nextIdx === -1) {
      // Form complete
      return [
        [{ id: uid(), from: 'system', text: `Form "${trigger.form?.title || 'Form'}" completed. ${questions.length} question(s) answered.` }],
        { type: 'idle' },
      ]
    }
    const qMsg = buildQuestionMsg(questions[nextIdx], nextIdx, questions.length, questions, answers)
    return [[qMsg], { type: 'form', trigger, questions, qIndex: nextIdx, answers }]
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    setError(null)

    const userMsg: Msg = { id: uid(), from: 'user', text: trimmed }

    if (session.type === 'idle') {
      const trigger = matchTrigger(trimmed)
      if (trigger) {
        const [newMsgs, newSession] = buildTriggerResponse(trigger)
        setMessages(prev => [...prev, userMsg, ...newMsgs])
        setSession(newSession)
      } else {
        const fallback: Msg = { id: uid(), from: 'bot', text: config.bot.fallback_message || "Sorry, I didn't understand that. Try a different keyword." }
        setMessages(prev => [...prev, userMsg, fallback])
      }
      return
    }

    if (session.type === 'form') {
      const [newMsgs, newSession] = processFormAnswer(session, trimmed)
      setMessages(prev => [...prev, userMsg, ...newMsgs])
      setSession(newSession)
      return
    }

    if (session.type === 'query') {
      // During query, user should click buttons — text input gives a hint
      setMessages(prev => [
        ...prev,
        userMsg,
        { id: uid(), from: 'bot', text: 'Please tap one of the buttons above to navigate the FAQ.' },
      ])
    }
  }

  function handleButtonClick(btn: MsgBtn) {
    setError(null)

    if (btn.kind === 'trigger') {
      const userMsg: Msg = { id: uid(), from: 'user', text: btn.label }
      if (btn.triggerId) {
        const linked = config.triggers.find(t => t.id === btn.triggerId)
        if (linked) {
          const [newMsgs, newSession] = buildTriggerResponse(linked)
          setMessages(prev => [...prev, userMsg, ...newMsgs])
          setSession(newSession)
          return
        }
      }
      // No linked trigger → fallback
      const fallback: Msg = { id: uid(), from: 'bot', text: config.bot.fallback_message || 'No action linked to this button.' }
      setMessages(prev => [...prev, userMsg, fallback])
      return
    }

    if (btn.kind === 'formChoice' && session.type === 'form') {
      const userMsg: Msg = { id: uid(), from: 'user', text: btn.label }
      const [newMsgs, newSession] = processFormAnswer(session, btn.label)
      setMessages(prev => [...prev, userMsg, ...newMsgs])
      setSession(newSession)
      return
    }

    if (btn.kind === 'queryNav') {
      const userMsg: Msg = { id: uid(), from: 'user', text: btn.label }

      if (btn.target === 'cat' && btn.catIndex !== undefined) {
        const trigger = config.triggers.find(t => t.id === (session as Extract<Session, { type: 'query' }>).triggerId)
        const cat = trigger?.query?.categories[btn.catIndex]
        if (!cat) return
        const qMsg: Msg = {
          id: uid(),
          from: 'bot',
          text: `Here are questions about ${cat.category_name}:`,
          buttons: [
            ...cat.questions.map((q, qi) => ({
              kind: 'queryNav' as const,
              target: 'question' as const,
              catIndex: btn.catIndex,
              qIndex: qi,
              label: q.question_text || `Question ${qi + 1}`,
            })),
            { kind: 'queryNav' as const, target: 'cat' as const, catIndex: -1, label: '← Back to topics' },
          ],
        }
        setMessages(prev => [...prev, userMsg, qMsg])
        return
      }

      if (btn.target === 'question' && btn.catIndex !== undefined && btn.qIndex !== undefined) {
        if (btn.catIndex === -1) {
          // "Back to topics" — show categories again
          handleQueryReset()
          return
        }
        const trigger = config.triggers.find(t => t.id === (session as Extract<Session, { type: 'query' }>).triggerId)
        const q = trigger?.query?.categories[btn.catIndex]?.questions[btn.qIndex]
        if (!q) return
        const answerMsg: Msg = {
          id: uid(),
          from: 'bot',
          text: q.answer_text || '(No answer provided)',
          buttons: [
            { kind: 'queryNav', target: 'askAnother', label: 'Ask another question' },
            { kind: 'queryNav', target: 'done', label: 'Done' },
          ],
        }
        setMessages(prev => [...prev, userMsg, answerMsg])
        return
      }

      if (btn.target === 'askAnother') {
        handleQueryReset()
        return
      }

      if (btn.target === 'done') {
        const userMsg2: Msg = { id: uid(), from: 'user', text: btn.label }
        setMessages(prev => [...prev, userMsg2, { id: uid(), from: 'system', text: 'FAQ session ended.' }])
        setSession({ type: 'idle' })
        return
      }
    }
  }

  function handleQueryReset() {
    const triggerId = session.type === 'query' ? session.triggerId : null
    const trigger = triggerId ? config.triggers.find(t => t.id === triggerId) : null
    if (!trigger?.query) return
    const cats = trigger.query.categories
    const msg: Msg = {
      id: uid(),
      from: 'bot',
      text: 'What would you like to know about?',
      buttons: cats.map((cat, i) => ({
        kind: 'queryNav',
        target: 'cat',
        catIndex: i,
        label: cat.category_name || `Category ${i + 1}`,
      })),
    }
    setMessages(prev => [...prev, msg])
  }

  function handleReset() {
    setMessages([{ id: uid(), from: 'system', text: 'Test mode active. Type a keyword to start.' }])
    setSession({ type: 'idle' })
    setInput('')
    setError(null)
  }

  // ── Determine last bot msg index (for interactive buttons) ───────────────

  const lastBotMsgIndex = messages.reduce((last, msg, i) => (msg.from === 'bot' ? i : last), -1)

  // ── Render ────────────────────────────────────────────────────────────────

  const inputDisabled = false // always allow typing; query sessions give a hint

  return (
    <div className="flex gap-8 p-8 min-h-full">

      {/* ── Left: Trigger reference ── */}
      <div className="hidden lg:flex flex-col gap-4 w-[280px] shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">How to test</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Test Mode</h2>
          <p className="text-sm font-medium text-[#121212]/50 mt-1">
            Type keywords or click buttons in the phone to simulate a real conversation.
          </p>
        </div>

        {/* Trigger reference list */}
        <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white">
          <div className="bg-[#121212] px-4 py-2.5">
            <p className="text-xs font-black uppercase tracking-widest text-white">Available Triggers</p>
          </div>
          <div className="divide-y-2 divide-[#121212]/10 max-h-[500px] overflow-y-auto">
            {config.triggers.length === 0 ? (
              <p className="px-4 py-6 text-xs font-medium text-[#121212]/40 text-center">No triggers yet</p>
            ) : config.triggers.map(t => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-black text-[#121212] uppercase tracking-tight">{t.name}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ${
                    t.action_type === 'replier' ? 'bg-[#1040C0] text-white'
                    : t.action_type === 'form'   ? 'bg-[#D02020] text-white'
                    : 'bg-[#F0C020] text-[#121212]'
                  }`}>
                    {t.action_type}
                  </span>
                </div>

                {t.trigger_type === 'any' ? (
                  <p className="text-[10px] font-bold text-[#121212]/40 uppercase tracking-widest">Catch-all (any message)</p>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.keywords.map((kw, i) => (
                      <span key={i} className="text-[10px] font-bold bg-[#F0F0F0] border border-[#121212]/20 px-1.5 py-0.5">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-1 mt-1.5">
                  {t.platforms.map(p => (
                    <span key={p} className="text-[9px] font-black uppercase tracking-widest text-[#121212]/40">
                      {p === 'whatsapp' ? 'WA' : 'IG'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session indicator */}
        {session.type !== 'idle' && (
          <div className="border-2 border-[#F0C020] bg-[#F0C020]/20 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#121212]">Active Session</p>
            <p className="text-xs font-medium text-[#121212]/60 mt-0.5">
              {session.type === 'form' && `Form — Q${session.qIndex + 1} of ${session.questions.length}`}
              {session.type === 'query' && 'FAQ browser'}
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Interactive phone ── */}
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Controls above phone */}
        <div className="flex items-center gap-3 self-stretch justify-center">
          {/* Platform toggle */}
          {platforms.length > 1 && (
            <div className="flex border-2 border-[#121212]">
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => { setPlatform(p); handleReset() }}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-colors ${
                    platform === p ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]/50'
                  }`}
                >
                  {p === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#121212] text-xs font-black uppercase tracking-widest hover:bg-[#F0F0F0] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={3} />
            Reset
          </button>
        </div>

        {/* Phone frame */}
        <div className="w-[300px] border-[6px] border-[#121212] rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_#121212] bg-white">
          {/* Status bar */}
          <div className={`px-5 pt-2 pb-1 flex justify-between items-center text-[10px] font-bold ${isWA ? 'bg-[#075E54] text-white' : 'bg-white text-[#121212]'}`}>
            <span>9:41</span>
            <span>100%</span>
          </div>

          {/* Header */}
          {isWA ? (
            <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
              <div className="w-8 h-8 rounded-full bg-[#128C7E] border-2 border-white/30 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">{config.bot.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{config.bot.name}</p>
                <p className="text-white/60 text-[10px]">online</p>
              </div>
              <MoreVertical className="w-4 h-4 text-white/80" strokeWidth={2} />
            </div>
          ) : (
            <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
              <ChevronLeft className="w-5 h-5 text-[#121212]" strokeWidth={2.5} />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">{config.bot.name[0]?.toUpperCase()}</span>
              </div>
              <p className="text-[#121212] text-xs font-bold truncate flex-1">{config.bot.name}</p>
            </div>
          )}

          {/* Chat area */}
          <div
            ref={chatRef}
            className="h-[480px] overflow-y-auto p-3 flex flex-col gap-2"
            style={{ backgroundColor: isWA ? '#E5DDD5' : '#FFFFFF' }}
          >
            {messages.map((msg, msgIndex) => {
              const isLast = msgIndex === lastBotMsgIndex
              return (
                <div key={msg.id} className="flex flex-col gap-1.5">
                  {/* System message */}
                  {msg.from === 'system' && (
                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">
                      {msg.text}
                    </p>
                  )}

                  {/* User message */}
                  {msg.from === 'user' && (
                    <div className="self-end max-w-[80%]">
                      <div className={`px-3 py-2 rounded-tl-xl rounded-tr-xl rounded-bl-xl text-xs leading-relaxed ${
                        isWA ? 'bg-[#DCF8C6] text-[#121212]' : 'bg-[#0095F6] text-white'
                      }`}>
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>
                        <span className="block text-right text-[9px] mt-0.5 opacity-60">
                          {isWA ? '9:41 ✓✓' : '9:41 AM'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bot message */}
                  {msg.from === 'bot' && (
                    <div className="flex flex-col gap-1.5 max-w-[85%] self-start">
                      {/* Progress bar */}
                      {msg.progress && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${isWA ? 'bg-[#128C7E]' : 'bg-[#0095F6]'}`}
                              style={{ width: `${((msg.progress.done + 1) / msg.progress.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 shrink-0">
                            {msg.progress.done + 1}/{msg.progress.total}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs leading-relaxed ${
                        isWA ? 'bg-white text-[#121212] shadow-sm' : 'bg-[#F0F0F0] text-[#121212]'
                      }`}>
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>
                        <span className="block text-right text-[9px] mt-0.5 text-gray-400">
                          {isWA ? '9:41 ✓✓' : '9:41 AM'}
                        </span>
                      </div>

                      {/* Buttons — only interactive for the last bot message */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {msg.buttons.map((btn, bi) => (
                            <button
                              key={bi}
                              onClick={() => isLast && handleButtonClick(btn)}
                              disabled={!isLast}
                              className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border text-center transition-opacity ${
                                isWA
                                  ? 'bg-white border-[#128C7E] text-[#128C7E]'
                                  : 'bg-white border-[#0095F6] text-[#0095F6]'
                              } ${!isLast ? 'opacity-30 cursor-default' : 'hover:opacity-80'}`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-1.5 bg-[#D02020]/10 border-t border-[#D02020]/30">
              <p className="text-[10px] font-bold text-[#D02020]">{error}</p>
            </div>
          )}

          {/* Input bar */}
          <div className={`px-2 py-2 flex items-center gap-1.5 ${isWA ? 'bg-[#F0F0F0]' : 'bg-white border-t border-gray-200'}`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={inputDisabled}
              placeholder={session.type === 'query' ? 'Click a button above...' : 'Type a message...'}
              className={`flex-1 rounded-full px-3 py-1.5 text-[10px] focus:outline-none ${
                isWA ? 'bg-white' : 'bg-[#F0F0F0]'
              } disabled:opacity-50`}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || inputDisabled}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 ${
                isWA ? 'bg-[#075E54]' : 'bg-[#0095F6]'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/30">
          Simulator — No real messages sent
        </p>
      </div>
    </div>
  )
}
