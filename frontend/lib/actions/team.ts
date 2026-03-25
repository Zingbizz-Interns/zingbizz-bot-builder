'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface SubAccount {
  id: string
  email: string
  name: string
  created_at: string
  bot_permissions: { bot_id: string; can_edit: boolean }[]
}

export interface BotPermission {
  bot_id: string
  can_edit: boolean
}

async function getOwnerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Use admin to read profile — avoids permission issues on customer_profiles
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return profile ? { ...profile, userId: user.id } : null
}

export async function getSubAccounts(): Promise<SubAccount[]> {
  const profile = await getOwnerProfile()
  if (!profile) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('sub_accounts')
    .select('id, email, name, created_at, bot_permissions(bot_id, can_edit)')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as SubAccount[]
}

export async function createSubAccount(formData: FormData) {
  const profile = await getOwnerProfile()
  if (!profile) return { error: 'Unauthorized' }

  const email    = (formData.get('email')    as string)?.trim()
  const name     = (formData.get('name')     as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!email || !name || !password) return { error: 'All fields are required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { is_sub_account: true, name },
  })

  if (authError) return { error: authError.message }

  const { error: dbError } = await admin
    .from('sub_accounts')
    .insert({ owner_id: profile.id, user_id: authData.user.id, email, name })

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function deleteSubAccount(subAccountId: string) {
  const profile = await getOwnerProfile()
  if (!profile) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('sub_accounts')
    .select('user_id')
    .eq('id', subAccountId)
    .eq('owner_id', profile.id)
    .single()

  if (!sub) return { error: 'Sub-account not found' }

  const { error } = await admin
    .from('sub_accounts')
    .delete()
    .eq('id', subAccountId)

  if (error) return { error: error.message }

  if (sub.user_id) {
    await admin.auth.admin.deleteUser(sub.user_id)
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function getBotPermissions(subAccountId: string): Promise<BotPermission[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bot_permissions')
    .select('bot_id, can_edit')
    .eq('sub_account_id', subAccountId)
  return data ?? []
}

export async function saveBotPermissions(
  subAccountId: string,
  permissions: BotPermission[]
) {
  const profile = await getOwnerProfile()
  if (!profile) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('sub_accounts')
    .select('id')
    .eq('id', subAccountId)
    .eq('owner_id', profile.id)
    .single()

  if (!sub) return { error: 'Sub-account not found' }

  await admin.from('bot_permissions').delete().eq('sub_account_id', subAccountId)

  if (permissions.length > 0) {
    const { error } = await admin.from('bot_permissions').insert(
      permissions.map(p => ({
        sub_account_id: subAccountId,
        bot_id: p.bot_id,
        can_edit: p.can_edit,
      }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
