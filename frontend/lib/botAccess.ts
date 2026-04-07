import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AuthorizedBotAccess {
  userId: string
  botId: string
  customerId: string
  isOwner: boolean
  canEdit: boolean
}

export async function getAuthorizedBotAccess(botId: string): Promise<AuthorizedBotAccess | null> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: bot } = await admin
    .from('bots')
    .select('id, customer_id')
    .eq('id', botId)
    .single()

  if (!bot) {
    return null
  }

  const { data: profile } = await admin
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profile?.id === bot.customer_id) {
    return {
      userId: user.id,
      botId: bot.id,
      customerId: bot.customer_id,
      isOwner: true,
      canEdit: true,
    }
  }

  const { data: subAccount } = await admin
    .from('sub_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!subAccount) {
    return null
  }

  const { data: permission } = await admin
    .from('bot_permissions')
    .select('can_edit')
    .eq('sub_account_id', subAccount.id)
    .eq('bot_id', botId)
    .single()

  if (!permission) {
    return null
  }

  return {
    userId: user.id,
    botId: bot.id,
    customerId: bot.customer_id,
    isOwner: false,
    canEdit: permission.can_edit ?? false,
  }
}
