import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id, name, email')
    .eq('user_id', user.id)
    .single()

  // Detect sub-account (admin client — sub_accounts requires service role)
  const admin = createAdminClient()
  const { data: subAccount } = await admin
    .from('sub_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const isOwner = !subAccount

  // Fetch bots for sidebar
  let sideBots: { id: string; name: string; is_active: boolean }[] = []

  if (isOwner && profile) {
    const { data } = await supabase
      .from('bots')
      .select('id, name, is_active')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false })
    sideBots = data ?? []
  } else if (!isOwner && subAccount) {
    const { data: perms } = await admin
      .from('bot_permissions')
      .select('bot_id')
      .eq('sub_account_id', subAccount.id)
    if (perms?.length) {
      const { data } = await admin
        .from('bots')
        .select('id, name, is_active')
        .in('id', perms.map(p => p.bot_id))
        .order('created_at', { ascending: false })
      sideBots = data ?? []
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        user={{ name: profile?.name ?? '', email: profile?.email ?? user.email ?? '' }}
        bots={sideBots}
        isOwner={isOwner}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
