'use server'

import { createClient } from '@/lib/supabase/server'
import type { DateRange } from './analytics'

export interface BotSummary {
  botId: string
  botName: string
  triggerFires: number
  formsStarted: number
  formsCompleted: number
  completionRate: number
  activeUsers: number
}

export interface GlobalAnalyticsData {
  bots: BotSummary[]
  totals: {
    triggerFires: number
    formsStarted: number
    formsCompleted: number
    completionRate: number
    activeUsers: number
  }
}

function getStartDate(range: DateRange): string | null {
  if (range === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() - (range === '7d' ? 7 : 30))
  return d.toISOString()
}

export async function getGlobalAnalytics(range: DateRange): Promise<GlobalAnalyticsData> {
  const supabase = await createClient()

  // Get current user's profile → all their bots
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { bots: [], totals: { triggerFires: 0, formsStarted: 0, formsCompleted: 0, completionRate: 0, activeUsers: 0 } }

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { bots: [], totals: { triggerFires: 0, formsStarted: 0, formsCompleted: 0, completionRate: 0, activeUsers: 0 } }

  const { data: botsData } = await supabase
    .from('bots')
    .select('id, name')
    .eq('customer_id', profile.id)
    .order('created_at', { ascending: true })

  if (!botsData || botsData.length === 0) {
    return { bots: [], totals: { triggerFires: 0, formsStarted: 0, formsCompleted: 0, completionRate: 0, activeUsers: 0 } }
  }

  const botIds = botsData.map(b => b.id)
  const since = getStartDate(range)

  // Single query for all events across all bots
  let q = supabase
    .from('analytics_events')
    .select('bot_id, event_type, sender_id, created_at')
    .in('bot_id', botIds)

  if (since) q = q.gte('created_at', since)

  const { data: events } = await q

  // Per-bot counters
  const fires: Record<string, number> = {}
  const started: Record<string, number> = {}
  const completed: Record<string, number> = {}
  const activePerBot: Record<string, Set<string>> = {}
  const nowMinus1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  for (const e of events ?? []) {
    const bid = e.bot_id as string
    if (e.created_at >= nowMinus1h && e.sender_id) {
      if (!activePerBot[bid]) activePerBot[bid] = new Set()
      activePerBot[bid].add(e.sender_id)
    }
    if (e.event_type === 'trigger_fired') fires[bid] = (fires[bid] || 0) + 1
    if (e.event_type === 'form_started') started[bid] = (started[bid] || 0) + 1
    if (e.event_type === 'form_completed') completed[bid] = (completed[bid] || 0) + 1
  }

  const bots: BotSummary[] = botsData.map(b => {
    const s = started[b.id] || 0
    const c = completed[b.id] || 0
    return {
      botId: b.id,
      botName: b.name,
      triggerFires: fires[b.id] || 0,
      formsStarted: s,
      formsCompleted: c,
      completionRate: s > 0 ? Math.round((c / s) * 100) : 0,
      activeUsers: activePerBot[b.id]?.size ?? 0,
    }
  })

  // Global totals
  const totalFires = bots.reduce((s, b) => s + b.triggerFires, 0)
  const totalStarted = bots.reduce((s, b) => s + b.formsStarted, 0)
  const totalCompleted = bots.reduce((s, b) => s + b.formsCompleted, 0)
  const totalActive = bots.reduce((s, b) => s + b.activeUsers, 0)

  return {
    bots,
    totals: {
      triggerFires: totalFires,
      formsStarted: totalStarted,
      formsCompleted: totalCompleted,
      completionRate: totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0,
      activeUsers: totalActive,
    },
  }
}
