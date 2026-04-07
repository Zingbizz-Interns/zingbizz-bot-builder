'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getConversations, type Conversation } from '@/lib/actions/inbox'
import { getWhatsAppWindowExpiry } from '@/lib/utils'
import { Clock, AlertCircle, Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'needs_attention' | 'agent' | 'closed' | 'expiring'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs_attention', label: 'Needs Attention' },
  { key: 'agent', label: 'Agent Active' },
  { key: 'closed', label: 'Resolved' },
  { key: 'expiring', label: 'Expiring Soon' },
]

interface Props {
  botIds: string[]
  botId?: string // if provided, scope to a single bot
  selectedId?: string
  initialSender?: string
  onSelect?: (conv: Conversation) => void
}

function formatPhone(phone: string) {
  return phone.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2-$3') || phone
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ConversationList({ botIds, botId, selectedId, initialSender, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const LIMIT = 30

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (p === 0) setLoading(true)
    else setLoadingMore(true)

    const result = await getConversations({ botId, tab, page: p, limit: LIMIT })

    setConversations(prev => replace ? result.conversations : [...prev, ...result.conversations])
    setTotal(result.total)
    setPage(p)

    if (p === 0) setLoading(false)
    else setLoadingMore(false)
  }, [botId, tab])

  // Reset and refetch when tab changes
  useEffect(() => {
    fetchPage(0, true)
  }, [fetchPage])

  // Supabase Realtime — live updates to conversation list (3.6)
  useEffect(() => {
    if (!botIds.length) return
    const supabase = createClient()

    const channel = supabase
      .channel('inbox-conversation-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Conversation & { bot_id: string }
          if (!botIds.includes(row.bot_id)) return

          if (payload.eventType === 'INSERT') {
            setConversations(prev => [{ ...payload.new as Conversation, bot_name: '' }, ...prev])
            setTotal(t => t + 1)
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(c => c.id === (payload.new as Conversation).id
                ? { ...payload.new as Conversation, bot_name: c.bot_name }
                : c
              )
            )
          }
        }
      )
      // Also subscribe to messages so last-message preview updates
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as { conversation_id: string; content: string; sender_type: string }
          setConversations(prev =>
            prev.map(c =>
              c.id === msg.conversation_id
                ? { ...c, updated_at: new Date().toISOString() }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [botIds, botId])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el || loadingMore) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom && conversations.length < total) {
      fetchPage(page + 1, false)
    }
  }, [loadingMore, conversations.length, total, page, fetchPage])

  // Client-side search filter
  const filtered = search.trim()
    ? conversations.filter(c =>
        c.sender_id.includes(search) ||
        (c.bot_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  useEffect(() => {
    if (!initialSender || selectedId) return
    const match = conversations.find((conversation) => conversation.sender_id === initialSender)
    if (match) onSelect?.(match)
  }, [initialSender, selectedId, conversations, onSelect])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-[#121212]/10">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#121212] mb-3">Inbox</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#121212]/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border-2 border-[#121212]/10 focus:border-[#121212]/30 outline-none bg-[#F5F5F0] placeholder-[#121212]/30"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-[#121212]/10 flex overflow-x-auto shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 -mb-0.5 transition-colors',
              tab === t.key
                ? 'border-[#F0C020] text-[#121212]'
                : 'border-transparent text-[#121212]/40 hover:text-[#121212]/70'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-4 h-4 animate-spin text-[#121212]/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/30">No conversations</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConversationCard
              key={conv.id}
              conv={conv}
              selected={conv.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#121212]/30" />
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationCard({
  conv,
  selected,
  onSelect,
}: {
  conv: Conversation
  selected: boolean
  onSelect?: (c: Conversation) => void
}) {
  const expiry = getWhatsAppWindowExpiry(conv.last_customer_message_at)
  const showExpiryWarning = !expiry.isExpired && expiry.isWarning
  const showFallbackBadge = conv.fallback_count >= 2

  const statusColor = {
    bot: '#1040C0',
    agent: '#107040',
    closed: '#121212',
  }[conv.status] ?? '#121212'

  return (
    <button
      onClick={() => onSelect?.(conv)}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-[#121212]/8 transition-colors hover:bg-[#F5F5F0]',
        selected && 'bg-[#F0C020]/10 border-l-2 border-l-[#F0C020]'
      )}
    >
      {/* Row 1: phone + time */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[#121212] truncate">
          {formatPhone(conv.sender_id)}
        </span>
        <span className="text-[10px] text-[#121212]/40 shrink-0 ml-2">
          {timeAgo(conv.updated_at)}
        </span>
      </div>

      {/* Row 2: bot name */}
      {conv.bot_name && (
        <p className="text-[10px] text-[#121212]/50 mb-1 truncate">{conv.bot_name}</p>
      )}

      {/* Row 3: badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {showFallbackBadge && (
          <span
            title={`Bot failed to understand this customer ${conv.fallback_count} times`}
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#D02020] text-white"
          >
            {conv.fallback_count} fails
          </span>
        )}
        {/* Status badge */}
        <span
          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border"
          style={{ color: statusColor, borderColor: `${statusColor}40` }}
        >
          {conv.status === 'bot' ? 'Bot' : conv.status === 'agent' ? 'Agent' : 'Closed'}
        </span>

        {/* Needs attention */}
        {conv.needs_attention && conv.status !== 'closed' && (
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Needs attention" />
        )}

        {/* Expiry warning */}
        {showExpiryWarning && (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-[#D02020]">
            <Clock className="w-2.5 h-2.5" />
            Expiring
          </span>
        )}

        {/* Needs attention dot */}
        {conv.needs_attention && conv.status !== 'closed' && (
          <AlertCircle className="w-3 h-3 text-orange-400 ml-auto shrink-0" />
        )}
      </div>
    </button>
  )
}
