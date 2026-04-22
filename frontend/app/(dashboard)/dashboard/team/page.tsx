import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSubAccounts } from '@/lib/actions/team'
import TeamList from './_components/TeamList'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Sub-accounts cannot access the team page
  const { data: subAccount } = await supabase
    .from('sub_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (subAccount) redirect('/dashboard/bots')

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Fetch all owner bots for the permissions modal
  const { data: bots } = profile
    ? await supabase
        .from('bots')
        .select('id, name')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const subAccounts = await getSubAccounts()

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Account</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Team</h2>
          <p className="text-sm font-medium text-black/50 mt-1">
            Create sub-accounts and control which bots they can view or modify.
          </p>
        </div>
        <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-[#FF6B6B] px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Members</p>
          <p className="text-3xl font-black tracking-tighter text-white">{subAccounts.length}</p>
        </div>
      </div>

      <TeamList
        subAccounts={subAccounts}
        allBots={(bots ?? []).map(b => ({ id: b.id, name: b.name }))}
      />
    </div>
  )
}
