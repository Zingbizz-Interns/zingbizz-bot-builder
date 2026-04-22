import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditBotForm from './_components/EditBotForm'
import BusinessHoursForm from './_components/BusinessHoursForm'
import LiveChatAlertsForm from './_components/LiveChatAlertsForm'
import { getBusinessHours } from '@/lib/actions/businessHours'
import { getAlertSettings } from '@/lib/actions/alerts'
import { getBotLiveChatSettings } from '@/lib/actions/bots'
import LiveChatConfigForm from './_components/LiveChatConfigForm'
import CannedResponsesManager from './_components/CannedResponsesManager'

export default async function SettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const supabase = await createClient()

  const [botRes, businessHours, alertSettings, liveChatSettings] = await Promise.all([
    supabase.from('bots').select('id, name, fallback_message').eq('id', botId).single(),
    getBusinessHours(botId),
    getAlertSettings(botId),
    getBotLiveChatSettings(botId),
  ])

  if (!botRes.data) notFound()
  const bot = botRes.data

  return (
    <div className="p-8 max-w-xl space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Bot Config</p>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Settings</h2>
        <p className="text-sm font-medium text-black/50 mt-1">
          Edit bot name, fallback message and business hours.
        </p>
      </div>

      {/* General */}
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white">
        <div className="bg-[#FF6B6B] border-b-4 border-black px-6 py-4">
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
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white">
        <div className="bg-[#FF6B6B] border-b-4 border-black px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-white">Business Hours</h3>
          <p className="text-xs font-medium text-white/60 mt-0.5">
            Messages outside these hours receive the offline message instead of being processed.
          </p>
        </div>
        <div className="p-6">
          <BusinessHoursForm botId={botId} existing={businessHours} />
        </div>
      </div>

      {/* Live Chat Alerts */}
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white">
        <div className="bg-[#FFD93D] border-b-4 border-black px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-black">Live Chat Alerts</h3>
          <p className="text-xs font-medium text-black/60 mt-0.5">
            Get notified when conversations need attention or the WhatsApp window is closing.
          </p>
        </div>
        <div className="p-6">
          <LiveChatAlertsForm
            botId={botId}
            existing={alertSettings ?? {
              bot_id: botId,
              enabled: true,
              threshold_minutes: 120,
              window_warning_enabled: true,
              window_warning_minutes: 120,
              notify_email: true,
            }}
          />
        </div>
      </div>

      {/* Live Chat */}
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white">
        <div className="bg-[#107040] border-b-4 border-black px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-white">Live Chat</h3>
          <p className="text-xs font-medium text-white/70 mt-0.5">
            Tune escalation keywords and the message customers see when your team takes over.
          </p>
        </div>
        <div className="p-6">
          <LiveChatConfigForm
            botId={botId}
            existing={liveChatSettings ?? {
              escalation_keywords: ['human', 'agent', 'person', 'support', 'speak to', 'talk to', 'real person', 'help me'],
              takeover_message: "You're now connected with our team. We'll be right with you.",
              takeover_message_enabled: true,
            }}
          />
        </div>
      </div>

      {/* Quick Replies */}
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white">
        <div className="bg-[#FF6B6B] border-b-4 border-black px-6 py-4">
          <h3 className="text-base font-black uppercase tracking-tighter text-white">Quick Replies</h3>
          <p className="text-xs font-medium text-white/70 mt-0.5">
            Save reusable replies for common questions and insert them from the inbox with one click.
          </p>
        </div>
        <div className="p-6">
          <CannedResponsesManager botId={botId} />
        </div>
      </div>
    </div>
  )
}
