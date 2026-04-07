'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string
  conversation_id: string
  bot_id: string
  alert_type: 'response_threshold' | 'window_closing' | 'agent_silent'
  is_read: boolean
  triggered_at: string
  bot_name: string
  sender_id: string
}

export interface AlertSettings {
  id?: string
  bot_id: string
  enabled: boolean
  threshold_minutes: number
  window_warning_enabled: boolean
  window_warning_minutes: number
  notify_email: boolean
}

export interface GetAlertsFilters {
  botId?: string
  alertType?: string
  isRead?: boolean
  page?: number
  limit?: number
}

interface AlertRow extends Omit<Alert, 'bot_name' | 'sender_id'> {
  bots?: { name?: string | null; customer_id?: string | null } | null
  conversations?: { sender_id?: string | null } | null
}

// ─── getAlerts ────────────────────────────────────────────────────────────────

export async function getAlerts(
  filters: GetAlertsFilters = {}
): Promise<{ alerts: Alert[]; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { alerts: [], total: 0 }

  const { botId, alertType, isRead, page = 0, limit = 30 } = filters
  const offset = page * limit

  // Scope to bots owned by this user
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { alerts: [], total: 0 }

  let query = supabase
    .from('alerts')
    .select('*, bots!inner(name, customer_id), conversations!inner(sender_id)', { count: 'exact' })
    .eq('bots.customer_id', profile.id)
    .order('triggered_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (botId) query = query.eq('bot_id', botId)
  if (alertType) query = query.eq('alert_type', alertType)
  if (isRead !== undefined) query = query.eq('is_read', isRead)

  const { data, count, error } = await query
  if (error) {
    console.error('[alerts] getAlerts error:', error.message)
    return { alerts: [], total: 0 }
  }

  const alerts: Alert[] = ((data ?? []) as AlertRow[]).map((row) => ({
    ...row,
    bot_name: row.bots?.name ?? '',
    sender_id: row.conversations?.sender_id ?? '',
  }))

  return { alerts, total: count ?? 0 }
}

// ─── getUnreadAlertCount ──────────────────────────────────────────────────────

export async function getUnreadAlertCount(botIds: string[]): Promise<number> {
  if (!botIds.length) return 0
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .in('bot_id', botIds)
    .eq('is_read', false)

  if (error) return 0
  return count ?? 0
}

// ─── getRecentAlerts (for bell dropdown — last 20) ────────────────────────────

export async function getRecentAlerts(botIds: string[]): Promise<Alert[]> {
  if (!botIds.length) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alerts')
    .select('*, bots!inner(name), conversations!inner(sender_id)')
    .in('bot_id', botIds)
    .order('triggered_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[alerts] getRecentAlerts error:', error.message)
    return []
  }

  return ((data ?? []) as AlertRow[]).map((row) => ({
    ...row,
    bot_name: row.bots?.name ?? '',
    sender_id: row.conversations?.sender_id ?? '',
  }))
}

// ─── markAlertRead ────────────────────────────────────────────────────────────

export async function markAlertRead(alertId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId)
  if (error) console.error('[alerts] markAlertRead error:', error.message)
}

// ─── markAllAlertsRead ────────────────────────────────────────────────────────

export async function markAllAlertsRead(botIds: string[]): Promise<void> {
  if (!botIds.length) return
  const supabase = await createClient()
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .in('bot_id', botIds)
    .eq('is_read', false)
  if (error) console.error('[alerts] markAllAlertsRead error:', error.message)
}

// ─── getAlertSettings ─────────────────────────────────────────────────────────

export async function getAlertSettings(botId: string): Promise<AlertSettings | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('bot_id', botId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[alerts] getAlertSettings error:', error.message)
    return null
  }

  if (!data) {
    // Return defaults when no row exists yet
    return {
      bot_id: botId,
      enabled: true,
      threshold_minutes: 120,
      window_warning_enabled: true,
      window_warning_minutes: 120,
      notify_email: true,
    }
  }

  return data as AlertSettings
}

// ─── saveAlertSettings ────────────────────────────────────────────────────────

export async function saveAlertSettings(
  botId: string,
  settings: Omit<AlertSettings, 'id' | 'bot_id'>
): Promise<{ error?: string }> {
  // Validate threshold range (15–1380 minutes)
  if (settings.threshold_minutes < 15 || settings.threshold_minutes > 1380) {
    return { error: 'Alert threshold must be between 15 and 1380 minutes.' }
  }
  if (settings.window_warning_minutes < 15 || settings.window_warning_minutes > 1380) {
    return { error: 'Window warning must be between 15 and 1380 minutes.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('alert_settings')
    .upsert({ bot_id: botId, ...settings }, { onConflict: 'bot_id' })

  if (error) {
    console.error('[alerts] saveAlertSettings error:', error.message)
    return { error: 'Failed to save alert settings.' }
  }

  return {}
}
