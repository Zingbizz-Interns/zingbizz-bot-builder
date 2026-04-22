'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  addConversationNote,
  deleteConversationNote,
  getCannedResponses,
  getConversationNotes,
  getMessages,
  takeoverConversation,
  releaseConversation,
  resolveConversation,
  reopenConversation,
  sendAgentMessage,
  type CannedResponse,
  type Conversation,
  type ConversationNote,
  type Message,
} from '@/lib/actions/inbox'
import { getWhatsAppWindowExpiry } from '@/lib/utils'
import { ArrowLeft, MessageSquare, NotebookPen, RefreshCw, Send, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  conversation?: Conversation
  emptySender?: string
  onBack?: () => void
  onConversationUpdate?: (conv: Conversation) => void
}

function formatPhone(phone: string) {
  return phone.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2-$3') || phone
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function useCountdown(lastCustomerMessageAt: string | null) {
  const [display, setDisplay] = useState('')
  const [isWarning, setIsWarning] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    function tick() {
      const expiry = getWhatsAppWindowExpiry(lastCustomerMessageAt)
      setDisplay(expiry.display)
      setIsWarning(expiry.isWarning)
      setIsExpired(expiry.isExpired)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastCustomerMessageAt])

  return { display, isWarning, isExpired }
}

function extractSlashQuery(text: string) {
  const match = text.match(/(?:^|\s)\/([^\s/]*)$/)
  return match ? match[1].toLowerCase() : null
}

function applyQuickReply(current: string, content: string) {
  if (/(?:^|\s)\/([^\s/]*)$/.test(current)) {
    return current.replace(/(?:^|\s)\/([^\s/]*)$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : ''
      return `${prefix}${content}`
    })
  }

  return current.trim() ? `${current.trim()}\n${content}` : content
}

function hasConversationChanges(
  current: Conversation,
  incoming: Partial<Conversation>
) {
  return (Object.keys(incoming) as Array<keyof Conversation>).some((key) => current[key] !== incoming[key])
}

export default function ConversationThread({ conversation: initialConv, emptySender, onBack, onConversationUpdate }: Props) {
  const [conv, setConv] = useState<Conversation | undefined>(initialConv)
  const [messages, setMessages] = useState<Message[]>([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [page, setPage] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'messages' | 'notes'>('messages')
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const [loadingCanned, setLoadingCanned] = useState(false)
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false)
  const [quickReplySearch, setQuickReplySearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const convRef = useRef<Conversation | undefined>(initialConv)
  const previousConversationIdRef = useRef<string | undefined>(initialConv?.id)
  const messagesRequestIdRef = useRef(0)
  const notesRequestIdRef = useRef(0)
  const cannedRequestIdRef = useRef(0)

  const LIMIT = 50
  const conversationId = conv?.id
  const botId = conv?.bot_id

  useEffect(() => {
    convRef.current = conv
  }, [conv])

  useEffect(() => {
    const nextConversationId = initialConv?.id
    const previousConversationId = previousConversationIdRef.current

    setConv((current) => {
      if (!initialConv) return undefined
      if (current?.id === initialConv.id) {
        return { ...current, ...initialConv }
      }
      return initialConv
    })

    if (nextConversationId !== previousConversationId) {
      previousConversationIdRef.current = nextConversationId
      setPage(0)
      setMessages([])
      setTotalMessages(0)
      setNotes([])
      setError(null)
      setActiveTab('messages')
      setReplyText('')
      setQuickRepliesOpen(false)
      setQuickReplySearch('')
    }
  }, [initialConv])

  useEffect(() => {
    if (!conversationId) {
      setLoadingMsgs(false)
      return
    }

    const requestId = ++messagesRequestIdRef.current
    let cancelled = false

    setLoadingMsgs(true)
    getMessages(conversationId, 0, LIMIT).then((result) => {
      if (cancelled || messagesRequestIdRef.current !== requestId) return
      setMessages(result.messages)
      setTotalMessages(result.total)
      setPage(0)
      setLoadingMsgs(false)
      scrollToBottom()
    })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) {
      setLoadingNotes(false)
      return
    }

    const requestId = ++notesRequestIdRef.current
    let cancelled = false

    setLoadingNotes(true)
    getConversationNotes(conversationId).then((result) => {
      if (cancelled || notesRequestIdRef.current !== requestId) return
      setNotes(result.notes)
      setLoadingNotes(false)
      if (result.error) setError(result.error)
    })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!botId) {
      setLoadingCanned(false)
      return
    }

    const requestId = ++cannedRequestIdRef.current
    let cancelled = false

    setLoadingCanned(true)
    getCannedResponses(botId).then((result) => {
      if (cancelled || cannedRequestIdRef.current !== requestId) return
      setCannedResponses(result.cannedResponses)
      setLoadingCanned(false)
      if (result.error) setError(result.error)
    })

    return () => {
      cancelled = true
    }
  }, [botId])

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  const handleMessagesScroll = useCallback(async () => {
    const el = scrollContainerRef.current
    if (!el || loadingOlder || messages.length >= totalMessages || !conv) return
    if (el.scrollTop < 80) {
      setLoadingOlder(true)
      const nextPage = page + 1
      const result = await getMessages(conv.id, nextPage, LIMIT)
      const prevHeight = el.scrollHeight
      setMessages((prev) => [...result.messages, ...prev])
      setPage(nextPage)
      setLoadingOlder(false)
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight
      })
    }
  }, [loadingOlder, messages.length, totalMessages, page, conv])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`thread-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((message) => message.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Conversation
          setConv((current) => {
            if (!current) return current
            return hasConversationChanges(current, updated) ? { ...current, ...updated } : current
          })
          const currentConversation = convRef.current
          if (currentConversation && hasConversationChanges(currentConversation, updated)) {
            onConversationUpdate?.({ ...currentConversation, ...updated })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_notes',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const result = await getConversationNotes(conversationId)
          if (!result.error) setNotes(result.notes)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, botId, onConversationUpdate])

  async function handleAction(action: () => Promise<{ conversation?: Conversation; error?: string }>) {
    setActionLoading(true)
    setError(null)
    const result = await action()
    if (result.error) {
      setError(result.error)
    } else if (result.conversation) {
      setConv((current) => current ? { ...current, ...result.conversation } : current)
      onConversationUpdate?.(result.conversation)
    }
    setActionLoading(false)
  }

  async function handleSend() {
    if (!conv || !replyText.trim() || sending) return
    setSending(true)
    setError(null)

    const text = replyText.trim()
    setReplyText('')
    setQuickRepliesOpen(false)

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: conv.id,
      bot_id: conv.bot_id,
      sender_type: 'agent',
      content: text,
      message_type: 'text',
      metadata: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    scrollToBottom()

    const result = await sendAgentMessage(conv.id, text)
    if (result.error) {
      setError(result.error)
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id))
      setReplyText(text)
    } else if (result.message) {
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((message) => message.id !== optimistic.id)
        if (withoutOptimistic.some((message) => message.id === result.message!.id)) {
          return withoutOptimistic
        }

        return [...withoutOptimistic, result.message!].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
    } else {
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id))
    }
    setSending(false)
  }

  async function handleAddNote() {
    if (!conv || !noteText.trim() || savingNote) return
    setSavingNote(true)
    const result = await addConversationNote(conv.id, noteText)
    if (result.error || !result.note) {
      setError(result.error ?? 'Failed to save note')
    } else {
      setNotes((prev) => [result.note!, ...prev])
      setNoteText('')
    }
    setSavingNote(false)
  }

  async function handleDeleteNote(noteId: string) {
    if (!conv) return
    const result = await deleteConversationNote(conv.id, noteId)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  function insertQuickReply(content: string) {
    setReplyText((current) => applyQuickReply(current, content))
    setQuickRepliesOpen(false)
    setQuickReplySearch('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const { display: countdown, isWarning: countdownWarning, isExpired: countdownExpired } =
    useCountdown(conv?.last_customer_message_at ?? null)

  const grouped = messages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const d = formatDate(msg.created_at)
    const last = acc[acc.length - 1]
    if (last && last.date === d) {
      last.messages.push(msg)
    } else {
      acc.push({ date: d, messages: [msg] })
    }
    return acc
  }, [])

  const slashQuery = extractSlashQuery(replyText)
  const filteredQuickReplies = useMemo(() => {
    const search = quickReplySearch.trim().toLowerCase()
    if (!search) return cannedResponses
    return cannedResponses.filter((response) =>
      response.title.toLowerCase().includes(search) ||
      response.content.toLowerCase().includes(search) ||
      (response.shortcut ?? '').toLowerCase().includes(search)
    )
  }, [cannedResponses, quickReplySearch])

  const slashMatches = useMemo(() => {
    if (slashQuery === null) return []
    return cannedResponses.filter((response) => {
      const shortcut = (response.shortcut ?? '').replace(/^\//, '').toLowerCase()
      return shortcut.includes(slashQuery)
    }).slice(0, 6)
  }, [cannedResponses, slashQuery])

  if (!conv) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center text-black/30">
        <MessageSquare className="w-10 h-10" strokeWidth={1} />
        <p className="text-xs font-bold uppercase tracking-widest">
          {emptySender ? `No messages yet for ${formatPhone(emptySender)}` : 'Select a conversation'}
        </p>
        {emptySender && (
          <p className="text-sm font-medium text-black/40 max-w-sm">
            Once this customer sends a message, the thread will appear here automatically.
          </p>
        )}
      </div>
    )
  }

  const statusColor = {
    bot: '#FF6B6B',
    agent: '#107040',
    closed: '#000000',
  }[conv.status] ?? '#000000'

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b-2 border-black/10 bg-white flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 items-center justify-center border-4 border-black/15 text-[#000000] md:hidden"
              aria-label="Back to conversation list"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <h3 className="text-sm font-black text-black">
              {formatPhone(conv.sender_id)}
            </h3>
            <span
              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border"
              style={{ color: statusColor, borderColor: `${statusColor}40` }}
            >
              {conv.status === 'bot' ? 'Bot' : conv.status === 'agent' ? 'Agent' : 'Closed'}
            </span>
          </div>
          {conv.bot_name && (
            <p className="text-[10px] text-black/50">{conv.bot_name}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!countdownExpired && conv.status !== 'closed' && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-bold font-mono tabular-nums px-2 py-1 border',
              countdownWarning
                ? 'text-[#FF6B6B] border-[#FF6B6B]/30 bg-[#FF6B6B]/5'
                : 'text-black/50 border-black/10'
            )}>
              {countdown}
            </div>
          )}
          {countdownExpired && conv.status !== 'closed' && (
            <span className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-widest">
              Window closed
            </span>
          )}

          {conv.status === 'bot' && (
            <button
              onClick={() => handleAction(() => takeoverConversation(conv.id))}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-black text-white hover:bg-[#FF6B6B] transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : 'Take Over'}
            </button>
          )}
          {conv.status === 'agent' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(() => releaseConversation(conv.id))}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-widest border-4 border-black text-[#000000] hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Return to Bot'}
              </button>
              <button
                onClick={() => handleAction(() => resolveConversation(conv.id))}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-[#107040] text-white hover:bg-[#0a5030] transition-colors disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Resolve'}
              </button>
            </div>
          )}
          {conv.status === 'closed' && (
            <button
              onClick={() => handleAction(() => reopenConversation(conv.id))}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-widest border-4 border-black text-[#000000] hover:bg-black hover:text-white transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : 'Reopen'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-[#FF6B6B]/10 border-b border-[#FF6B6B]/20 text-xs font-bold text-[#FF6B6B]">
          {error}
        </div>
      )}

      <div className="border-b-2 border-black/10 bg-white px-6 py-2 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={cn(
            'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 transition-colors',
            activeTab === 'messages'
              ? 'border-black bg-black text-white'
              : 'border-black/15 text-black/50 hover:text-black'
          )}
        >
          Messages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 transition-colors',
            activeTab === 'notes'
              ? 'border-[#FFD93D] bg-[#FFD93D] text-black'
              : 'border-black/15 text-black/50 hover:text-black'
          )}
        >
          Notes
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={activeTab === 'messages' ? handleMessagesScroll : undefined}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {activeTab === 'messages' ? (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black/30" />
              </div>
            )}

            {loadingMsgs ? (
              <div className="flex justify-center items-center h-32">
                <RefreshCw className="w-4 h-4 animate-spin text-black/30" />
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-black/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-black/10" />
                  </div>

                  {group.messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-[#FFD93D] bg-[#FFF6D6] p-4">
              <div className="flex items-center gap-2 mb-3">
                <NotebookPen className="w-4 h-4 text-black" strokeWidth={2.5} />
                <p className="text-xs font-black uppercase tracking-widest text-black">
                  Internal Notes
                </p>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                placeholder="Leave context for your team. These notes never get sent to the customer."
                className="w-full resize-none border-4 border-black/20 bg-white px-3 py-2 text-sm text-[#000000] placeholder-[#000000]/30 focus:outline-none focus:border-black/50"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-black/50">
                  Visible only inside the dashboard.
                </p>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || savingNote}
                  className="px-3 py-2 text-xs font-black uppercase tracking-widest bg-black text-white hover:bg-[#FF6B6B] disabled:opacity-40"
                >
                  {savingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>

            {loadingNotes ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="w-4 h-4 animate-spin text-black/30" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-[#000000]/35">
                <StickyNote className="w-8 h-8" strokeWidth={1.5} />
                <p className="text-xs font-bold uppercase tracking-widest">No notes yet</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="border-4 border-black bg-[#FFF8BF] p-4 shadow-[4px_4px_0px_0px_#FFD93D]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black">
                        {note.author_name ?? 'Team member'}
                      </p>
                      <p className="text-[10px] font-medium text-[#000000]/45 mt-1">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-[#000000]/45 hover:text-[#FF6B6B] transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-black">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {conv.status === 'agent' && (
        <div className="border-t-2 border-black/10 bg-white px-4 py-3 shrink-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickRepliesOpen((open) => !open)}
              className="inline-flex min-h-[44px] items-center gap-2 border-2 border-[#FF6B6B] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              Quick Replies
            </button>
            <p className="text-[11px] font-medium text-black/40">
              Type a shortcut like <span className="font-mono">/refund</span> to search saved replies.
            </p>
          </div>

          {(quickRepliesOpen || slashMatches.length > 0) && (
            <div className="mb-3 border-4 border-black bg-[#F5F5F0] p-3 space-y-3">
              {quickRepliesOpen && (
                <input
                  value={quickReplySearch}
                  onChange={(e) => setQuickReplySearch(e.target.value)}
                  placeholder="Search quick replies..."
                  className="w-full border-4 border-black/20 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:border-black/50"
                />
              )}

              <div className="max-h-56 overflow-y-auto space-y-2">
                {(quickRepliesOpen ? filteredQuickReplies : slashMatches).length === 0 ? (
                  <p className="text-xs font-medium text-black/40">
                    {loadingCanned ? 'Loading quick replies...' : 'No quick replies match this search.'}
                  </p>
                ) : (
                  (quickRepliesOpen ? filteredQuickReplies : slashMatches).map((response) => (
                    <button
                      key={response.id}
                      type="button"
                      onClick={() => insertQuickReply(response.content)}
                      className="w-full border-4 border-black/10 bg-white px-3 py-3 text-left hover:border-[#FF6B6B] hover:bg-[#FF6B6B]/5 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-black">
                          {response.title}
                        </span>
                        {response.shortcut && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B6B]">
                            {response.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-black/60 line-clamp-2">
                        {response.content}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply... (Cmd/Ctrl Enter to send)"
              rows={3}
              maxLength={4096}
              className="w-full resize-none border-4 border-black/20 focus:border-black/50 outline-none px-3 py-2 pr-16 text-sm text-[#000000] placeholder-[#000000]/30 bg-[#F5F5F0]"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span className="text-[10px] text-black/30 font-mono">
                {replyText.length}/4096
              </span>
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || sending}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center bg-black text-white hover:bg-[#FF6B6B] transition-colors disabled:opacity-30"
              >
                {sending
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isCustomer = msg.sender_type === 'customer'
  const isBot = msg.sender_type === 'bot'
  const isAgent = msg.sender_type === 'agent'

  return (
    <div className={cn('flex mb-2', isCustomer ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[70%]', isCustomer ? 'items-start' : 'items-end', 'flex flex-col gap-0.5')}>
        <div className={cn(
          'px-3 py-2 text-sm leading-relaxed',
          isCustomer && 'bg-[#FFFDF5] text-black',
          isBot && 'bg-[#FF6B6B]/10 text-[#FF6B6B]',
          isAgent && 'bg-[#107040] text-white',
        )}>
          {msg.content}
        </div>
        <div className={cn('flex items-center gap-1.5', isCustomer ? 'pl-1' : 'pr-1')}>
          {(isBot || isAgent) && (
            <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
              {isBot ? 'Bot' : 'You'}
            </span>
          )}
          <span className="text-[9px] text-black/30">
            {formatTime(msg.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
