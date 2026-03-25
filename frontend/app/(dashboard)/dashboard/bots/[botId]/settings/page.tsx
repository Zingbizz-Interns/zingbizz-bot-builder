import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditBotForm from './_components/EditBotForm'
import BusinessHoursForm from './_components/BusinessHoursForm'
import { getBusinessHours } from '@/lib/actions/businessHours'

export default async function SettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const supabase = await createClient()

  const [botRes, businessHours] = await Promise.all([
    supabase.from('bots').select('id, name, fallback_message').eq('id', botId).single(),
    getBusinessHours(botId),
  ])

  if (!botRes.data) notFound()
  const bot = botRes.data

  return (
    <div className="p-8 max-w-xl space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">Bot Config</p>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Settings</h2>
        <p className="text-sm font-medium text-[#121212]/50 mt-1">
          Edit bot name, fallback message and business hours.
        </p>
      </div>

      {/* General */}
      <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
        <div className="bg-[#1040C0] border-b-4 border-[#121212] px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-white">General</h3>
        </div>
        <div className="p-6">
          <EditBotForm
            botId={botId}
            name={bot.name}
            fallbackMessage={bot.fallback_message}
          />
        </div>
      </div>

      {/* Business Hours */}
      <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
        <div className="bg-[#D02020] border-b-4 border-[#121212] px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-white">Business Hours</h3>
          <p className="text-xs font-medium text-white/60 mt-0.5">
            Messages outside these hours receive the offline message instead of being processed.
          </p>
        </div>
        <div className="p-6">
          <BusinessHoursForm botId={botId} existing={businessHours} />
        </div>
      </div>
    </div>
  )
}
