import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotAutomationGuardrailState } from '@/lib/botGuardrails'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BotPermissionProvider } from '@/lib/context/botPermission'
import BotAutomationStatusBanner from './_components/BotAutomationStatusBanner'

const tabs = [
  { label: 'Platforms',  href: 'platforms' },
  { label: 'Triggers',   href: 'triggers' },
  { label: 'Flow',       href: 'flow' },
  { label: 'Test',       href: 'test' },
  { label: 'Analytics',  href: 'analytics' },
  { label: 'Contacts',   href: 'contacts' },
  { label: 'Live Chat',  href: 'live-chat' },
  { label: 'Settings',   href: 'settings' },
]

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Use admin client so RLS doesn't block sub-accounts
  const { data: bot } = await admin
    .from('bots')
    .select('id, name, customer_id')
    .eq('id', botId)
    .single()

  if (!bot) notFound()

  // Verify the user has access: either they own the bot or have a bot_permission entry
  const { data: profile } = await admin
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const isOwner = profile?.id === bot.customer_id
  let canEdit = isOwner

  if (!isOwner) {
    const { data: subAccount } = await admin
      .from('sub_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!subAccount) notFound()

    const { data: permission } = await admin
      .from('bot_permissions')
      .select('id, can_edit')
      .eq('sub_account_id', subAccount.id)
      .eq('bot_id', botId)
      .single()

    if (!permission) notFound()

    canEdit = permission.can_edit
  }

  const automationState = await getBotAutomationGuardrailState(botId)

  return (
    <div className="flex flex-col h-full">
      {/* Bot header */}
      <div className="border-b-4 border-black bg-[#C4B5FD]/20 px-8 py-6 relative overflow-hidden">
        {/* Background texture */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Breadcrumb as layered stickers */}
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <Link 
            href="/dashboard/bots" 
            className="border-4 border-black bg-[#FFD93D] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_#000] -rotate-2 hover:rotate-0 hover:-translate-y-1 transition-all duration-200"
          >
            Bots
          </Link>
          <div className="border-4 border-black bg-white px-4 py-2 text-lg font-black uppercase tracking-tighter text-black shadow-[6px_6px_0px_0px_#000] rotate-1">
            {bot.name}
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex gap-2 -mb-[28px] flex-wrap">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={`/dashboard/bots/${botId}/${tab.href}`}
              className="text-xs font-black uppercase tracking-widest px-4 py-3 border-4 border-b-0 border-black bg-[#FFFDF5] hover:bg-[#FFD93D] hover:-translate-y-1 transition-all duration-100"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <BotPermissionProvider canEdit={canEdit}>
          {automationState?.isBlocked ? <BotAutomationStatusBanner state={automationState} /> : null}
          {children}
        </BotPermissionProvider>
      </div>
    </div>
  )
}
