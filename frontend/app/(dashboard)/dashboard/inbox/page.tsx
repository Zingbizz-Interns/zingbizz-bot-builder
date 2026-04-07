import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import InboxClient from './_components/InboxClient'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let botIds: string[] = []

  if (profile) {
    const { data: bots } = await supabase
      .from('bots')
      .select('id')
      .eq('customer_id', profile.id)
    botIds = (bots ?? []).map((b: { id: string }) => b.id)
  } else {
    const { data: sub } = await admin
      .from('sub_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (sub) {
      const { data: perms } = await admin
        .from('bot_permissions')
        .select('bot_id')
        .eq('sub_account_id', sub.id)
      botIds = (perms ?? []).map((p: { bot_id: string }) => p.bot_id)
    }
  }

  return <InboxClient botIds={botIds} />
}
