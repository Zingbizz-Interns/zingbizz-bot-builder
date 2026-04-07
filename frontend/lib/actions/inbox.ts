'use server'

import { createClient } from '@/lib/supabase/server'
import type { CannedResponse, ConversationNote } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  bot_id: string
  sender_id: string
  platform: string
  status: 'bot' | 'agent' | 'closed'
  needs_attention: boolean
  fallback_count: number
  last_customer_message_at: string | null
  last_reply_at: string | null
  unresolved_since: string | null
  agent_id: string | null
  created_at: string
  updated_at: string
  bot_name: string
}

export interface Message {
  id: string
  conversation_id: string
  bot_id: string
  sender_type: 'customer' | 'bot' | 'agent'
  content: string
  message_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export { type CannedResponse, type ConversationNote }

interface ConversationRow extends Omit<Conversation, 'bot_name'> {
  bots?: { name?: string | null } | null
}

interface AgentErrorResponse {
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function backendUrl() {
  return process.env.BACKEND_URL ?? 'http://localhost:3001'
}

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// ─── Read actions (direct Supabase) ──────────────────────────────────────────

export interface GetConversationsFilters {
  botId?: string
  tab?: 'all' | 'needs_attention' | 'agent' | 'closed' | 'expiring'
  page?: number
  limit?: number
}

export async function getConversations(
  filters: GetConversationsFilters = {}
): Promise<{ conversations: Conversation[]; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { conversations: [], total: 0 }

  const { tab = 'all', botId, page = 0, limit = 30 } = filters
  const offset = page * limit

  let query = supabase
    .from('conversations')
    .select('*, bots!inner(name, customer_id)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Scope to this user's bots via bots.customer_id
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { conversations: [], total: 0 }

  query = query.eq('bots.customer_id', profile.id)

  if (botId) query = query.eq('bot_id', botId)

  // Apply tab filters
  if (tab === 'needs_attention') {
    query = query.eq('needs_attention', true).neq('status', 'closed')
  } else if (tab === 'agent') {
    query = query.eq('status', 'agent')
  } else if (tab === 'closed') {
    query = query.eq('status', 'closed')
  } else if (tab === 'expiring') {
    const now = new Date()
    const h22ago = new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString()
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    query = query
      .gte('last_customer_message_at', h24ago)
      .lte('last_customer_message_at', h22ago)
      .neq('status', 'closed')
  }

  const { data, count, error } = await query
  if (error) {
    console.error('[inbox] getConversations error:', error.message)
    return { conversations: [], total: 0 }
  }

  const conversations: Conversation[] = ((data ?? []) as ConversationRow[]).map((row) => ({
    ...row,
    bot_name: row.bots?.name ?? '',
  }))

  return { conversations, total: count ?? 0 }
}

export async function getMessages(
  conversationId: string,
  page = 0,
  limit = 50
): Promise<{ messages: Message[]; total: number }> {
  const supabase = await createClient()
  const offset = page * limit

  const { data, count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[inbox] getMessages error:', error.message)
    return { messages: [], total: 0 }
  }

  return { messages: (data as Message[]) ?? [], total: count ?? 0 }
}

export async function getUnreadAttentionCount(botIds: string[]): Promise<number> {
  if (!botIds.length) return 0
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .in('bot_id', botIds)
    .eq('needs_attention', true)
    .neq('status', 'closed')

  if (error) return 0
  return count ?? 0
}

// ─── Write actions (call Express backend — needs WA messaging) ────────────────

async function agentFetch<TResponse>(
  path: string,
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' = 'POST',
  body?: Record<string, unknown>
): Promise<
  | { ok: true; data: TResponse }
  | { ok: false; data: null; error: string }
> {
  const token = await getAccessToken()
  if (!token) return { ok: false, data: null, error: 'Not authenticated' }

  try {
    const res = await fetch(`${backendUrl()}/api/agent${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await res.json() as TResponse | AgentErrorResponse
    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data
        ? (data as AgentErrorResponse).error ?? 'Request failed'
        : 'Request failed'
      return { ok: false, data: null, error: message }
    }
    return { ok: true, data: data as TResponse }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return { ok: false, data: null, error: message }
  }
}

export async function takeoverConversation(
  conversationId: string
): Promise<{ conversation?: Conversation; error?: string }> {
  const result = await agentFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/takeover`)
  if (!result.ok) return { error: result.error }
  return { conversation: { ...result.data.conversation, bot_name: '' } }
}

export async function releaseConversation(
  conversationId: string
): Promise<{ conversation?: Conversation; error?: string }> {
  const result = await agentFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/release`)
  if (!result.ok) return { error: result.error }
  return { conversation: { ...result.data.conversation, bot_name: '' } }
}

export async function resolveConversation(
  conversationId: string
): Promise<{ conversation?: Conversation; error?: string }> {
  const result = await agentFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/resolve`)
  if (!result.ok) return { error: result.error }
  return { conversation: { ...result.data.conversation, bot_name: '' } }
}

export async function reopenConversation(
  conversationId: string
): Promise<{ conversation?: Conversation; error?: string }> {
  // Reopen = release (sets back to 'bot')
  const result = await agentFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/release`)
  if (!result.ok) return { error: result.error }
  return { conversation: { ...result.data.conversation, bot_name: '' } }
}

export async function sendAgentMessage(
  conversationId: string,
  message: string
): Promise<{ message?: Message; error?: string }> {
  const result = await agentFetch<{ message: Message }>(`/conversations/${conversationId}/reply`, 'POST', { message })
  if (!result.ok) return { error: result.error }
  return { message: result.data.message as Message }
}

export async function getConversationNotes(
  conversationId: string
): Promise<{ notes: ConversationNote[]; error?: string }> {
  const result = await agentFetch<{ notes: ConversationNote[] }>(`/conversations/${conversationId}/notes`, 'GET')
  if (!result.ok) return { notes: [], error: result.error }
  return { notes: (result.data.notes as ConversationNote[]) ?? [] }
}

export async function addConversationNote(
  conversationId: string,
  content: string
): Promise<{ note?: ConversationNote; error?: string }> {
  const result = await agentFetch<{ note: ConversationNote }>(`/conversations/${conversationId}/notes`, 'POST', { content })
  if (!result.ok) return { error: result.error }
  return { note: result.data.note as ConversationNote }
}

export async function deleteConversationNote(
  conversationId: string,
  noteId: string
): Promise<{ error?: string }> {
  const result = await agentFetch<{ success: boolean }>(`/conversations/${conversationId}/notes/${noteId}`, 'DELETE')
  if (!result.ok) return { error: result.error }
  return {}
}

export async function getCannedResponses(
  botId: string
): Promise<{ cannedResponses: CannedResponse[]; error?: string }> {
  const result = await agentFetch<{ cannedResponses: CannedResponse[] }>(`/canned-responses?botId=${encodeURIComponent(botId)}`, 'GET')
  if (!result.ok) return { cannedResponses: [], error: result.error }
  return { cannedResponses: (result.data.cannedResponses as CannedResponse[]) ?? [] }
}

export async function createCannedResponse(
  payload: { botId: string; title: string; content: string; shortcut?: string }
): Promise<{ cannedResponse?: CannedResponse; error?: string }> {
  const result = await agentFetch<{ cannedResponse: CannedResponse }>('/canned-responses', 'POST', payload)
  if (!result.ok) return { error: result.error }
  return { cannedResponse: result.data.cannedResponse as CannedResponse }
}

export async function updateCannedResponse(
  id: string,
  payload: { title: string; content: string; shortcut?: string }
): Promise<{ cannedResponse?: CannedResponse; error?: string }> {
  const result = await agentFetch<{ cannedResponse: CannedResponse }>(`/canned-responses/${id}`, 'PUT', payload)
  if (!result.ok) return { error: result.error }
  return { cannedResponse: result.data.cannedResponse as CannedResponse }
}

export async function deleteCannedResponse(
  id: string
): Promise<{ error?: string }> {
  const result = await agentFetch<{ success: boolean }>(`/canned-responses/${id}`, 'DELETE')
  if (!result.ok) return { error: result.error }
  return {}
}
