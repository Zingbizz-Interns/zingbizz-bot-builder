'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TriggerWithKeywords } from '@/types/database'

export async function getTriggers(botId: string): Promise<TriggerWithKeywords[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('triggers')
    .select('*, trigger_keywords(*)')
    .eq('bot_id', botId)
    .order('created_at', { ascending: true })
  return (data ?? []) as TriggerWithKeywords[]
}

export async function createTrigger(botId: string, formData: FormData) {
  const supabase = await createClient()

  const name        = (formData.get('name') as string)?.trim()
  const trigger_type = formData.get('trigger_type') as 'single' | 'multi' | 'any'
  const platforms   = formData.getAll('platforms') as string[]
  const action_type = formData.get('action_type') as 'replier' | 'form' | 'query'
  const keywords    = JSON.parse((formData.get('keywords') as string) || '[]') as string[]

  if (!name)                return { error: 'Trigger name is required' }
  if (!platforms.length)    return { error: 'Select at least one platform' }
  if (trigger_type !== 'any' && !keywords.length) return { error: 'Add at least one keyword' }

  const { data: trigger, error } = await supabase
    .from('triggers')
    .insert({ bot_id: botId, name, trigger_type, platforms, action_type })
    .select()
    .single()

  if (error) return { error: error.message }

  if (keywords.length > 0) {
    const { error: kwError } = await supabase
      .from('trigger_keywords')
      .insert(keywords.map(k => ({ trigger_id: trigger.id, keyword: k })))
    if (kwError) return { error: kwError.message }
  }

  revalidatePath(`/dashboard/bots/${botId}/triggers`)
  return { data: trigger }
}

export async function updateTrigger(triggerId: string, botId: string, formData: FormData) {
  const supabase = await createClient()

  const name        = (formData.get('name') as string)?.trim()
  const trigger_type = formData.get('trigger_type') as 'single' | 'multi' | 'any'
  const platforms   = formData.getAll('platforms') as string[]
  const action_type = formData.get('action_type') as 'replier' | 'form' | 'query'
  const keywords    = JSON.parse((formData.get('keywords') as string) || '[]') as string[]

  if (!name)                return { error: 'Trigger name is required' }
  if (!platforms.length)    return { error: 'Select at least one platform' }
  if (trigger_type !== 'any' && !keywords.length) return { error: 'Add at least one keyword' }

  const { error } = await supabase
    .from('triggers')
    .update({ name, trigger_type, platforms, action_type, updated_at: new Date().toISOString() })
    .eq('id', triggerId)

  if (error) return { error: error.message }

  // Replace keywords
  await supabase.from('trigger_keywords').delete().eq('trigger_id', triggerId)
  if (keywords.length > 0) {
    await supabase
      .from('trigger_keywords')
      .insert(keywords.map(k => ({ trigger_id: triggerId, keyword: k })))
  }

  revalidatePath(`/dashboard/bots/${botId}/triggers`)
  return { success: true }
}

export async function deleteTrigger(triggerId: string, botId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('triggers').delete().eq('id', triggerId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/bots/${botId}/triggers`)
  return { success: true }
}
