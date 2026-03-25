'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getOrCreateProfile(email: string, name?: string) {
  const supabase = await createClient()

  // RPC runs as DB owner (SECURITY DEFINER) — bypasses RLS entirely
  const { data: profileId, error } = await supabase.rpc('upsert_my_profile', {
    p_email: email,
    p_name: name || email.split('@')[0],
  })

  if (error || !profileId) return null

  return { id: profileId as string }
}

export async function createBot(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const profile = await getOrCreateProfile(user.email!, user.user_metadata?.name)

  if (!profile) return { error: 'Could not create profile' }

  const name = (formData.get('name') as string)?.trim()
  const fallback_message = (formData.get('fallback_message') as string)?.trim()

  if (!name) return { error: 'Bot name is required' }

  const { data, error } = await supabase
    .from('bots')
    .insert({ customer_id: profile.id, name, fallback_message: fallback_message || 'Sorry, I didn\'t understand that. Please try again.' })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/bots')
  return { data }
}

export async function updateBot(botId: string, formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()
  const fallback_message = (formData.get('fallback_message') as string)?.trim()

  if (!name) return { error: 'Bot name is required' }

  const { error } = await supabase
    .from('bots')
    .update({
      name,
      fallback_message: fallback_message || "Sorry, I didn't understand that. Please try again.",
      updated_at: new Date().toISOString(),
    })
    .eq('id', botId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/bots/${botId}/settings`)
  revalidatePath('/dashboard/bots')
  return { success: true }
}

export async function deleteBot(botId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('bots').delete().eq('id', botId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/bots')
  return { success: true }
}

export async function toggleBotStatus(botId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bots')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', botId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/bots')
  return { success: true }
}

export async function getBots() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Sub-account: return only bots they have permission to access
  const admin = createAdminClient()
  const { data: subAccount } = await admin
    .from('sub_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (subAccount) {
    const { data: permissions } = await admin
      .from('bot_permissions')
      .select('bot_id')
      .eq('sub_account_id', subAccount.id)
    if (!permissions?.length) return []
    const { data } = await admin
      .from('bots')
      .select(`*, platform_configs(platform, is_active)`)
      .in('id', permissions.map(p => p.bot_id))
      .order('created_at', { ascending: false })
    return data ?? []
  }

  // Owner: return all their bots
  const profile = await getOrCreateProfile(user.email!, user.user_metadata?.name)
  if (!profile) return []

  const { data } = await supabase
    .from('bots')
    .select(`*, platform_configs(platform, is_active)`)
    .eq('customer_id', profile.id)
    .order('created_at', { ascending: false })

  return data ?? []
}
