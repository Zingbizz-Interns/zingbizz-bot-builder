'use server'

import { createClient } from '@/lib/supabase/server'

export interface Contact {
  id: string
  sender_id: string
  platform: string
  first_seen_at: string
  last_seen_at: string
  message_count: number
}

export async function getContacts(botId: string): Promise<Contact[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('id, sender_id, platform, first_seen_at, last_seen_at, message_count')
    .eq('bot_id', botId)
    .order('last_seen_at', { ascending: false })
  return data ?? []
}

export interface JourneyEvent {
  id: string
  event_type: string
  trigger_id: string | null
  question_id: string | null
  platform: string
  created_at: string
  triggerName: string | null
  questionText: string | null
}

export async function getSenderJourney(
  botId: string,
  senderId: string,
  platform: string
): Promise<JourneyEvent[]> {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('analytics_events')
    .select('id, event_type, trigger_id, question_id, platform, created_at')
    .eq('bot_id', botId)
    .eq('sender_id', senderId)
    .eq('platform', platform)
    .order('created_at', { ascending: true })
    .limit(200)

  if (!events?.length) return []

  const triggerIds = [...new Set(events.map(e => e.trigger_id).filter(Boolean))] as string[]
  const questionIds = [...new Set(events.map(e => e.question_id).filter(Boolean))] as string[]

  const [{ data: triggers }, { data: questions }] = await Promise.all([
    triggerIds.length
      ? supabase.from('triggers').select('id, name').in('id', triggerIds)
      : Promise.resolve({ data: [] }),
    questionIds.length
      ? supabase.from('form_questions').select('id, question_text').in('id', questionIds)
      : Promise.resolve({ data: [] }),
  ])

  const triggerNames: Record<string, string> = {}
  const questionTexts: Record<string, string> = {}
  for (const t of triggers ?? []) triggerNames[t.id] = t.name
  for (const q of questions ?? []) questionTexts[q.id] = q.question_text

  return events.map(e => ({
    id: e.id,
    event_type: e.event_type,
    trigger_id: e.trigger_id,
    question_id: e.question_id,
    platform: e.platform,
    created_at: e.created_at,
    triggerName: e.trigger_id ? (triggerNames[e.trigger_id] ?? null) : null,
    questionText: e.question_id ? (questionTexts[e.question_id] ?? null) : null,
  }))
}
