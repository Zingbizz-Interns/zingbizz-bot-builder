import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAlerts } from '@/lib/actions/alerts'
import AlertsClient from './_components/AlertsClient'

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: bots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('customer_id', profile.id)
    .order('created_at', { ascending: false })

  const botList = bots ?? []

  const { alerts, total } = await getAlerts({ limit: 30 })

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">Live Chat</p>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Alerts</h2>
        <p className="text-sm font-medium text-[#121212]/50 mt-1">
          History of all alerts triggered across your bots.
        </p>
      </div>

      <AlertsClient initialAlerts={alerts} initialTotal={total} bots={botList} />
    </div>
  )
}
