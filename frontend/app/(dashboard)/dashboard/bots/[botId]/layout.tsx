import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BotPermissionProvider } from '@/lib/context/botPermission'

const tabs = [
  { label: 'Platforms',  href: 'platforms' },
  { label: 'Triggers',   href: 'triggers' },
  { label: 'Flow',       href: 'flow' },
  { label: 'Test',       href: 'test' },
  { label: 'Analytics',  href: 'analytics' },
  { label: 'Contacts',   href: 'contacts' },
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

  return (
    <div className="flex flex-col h-full">
      {/* Bot header */}
      <div className="border-b-4 border-[#121212] bg-white px-8 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-3">
          <Link href="/dashboard/bots" className="hover:text-[#1040C0] transition-colors">
            Bots
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={3} />
          <span className="text-[#121212]">{bot.name}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 -mb-[17px]">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={`/dashboard/bots/${botId}/${tab.href}`}
              className="text-xs font-black uppercase tracking-widest px-4 py-2 border-2 border-b-0 border-[#121212] bg-[#F0F0F0] hover:bg-[#E0E0E0] transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <BotPermissionProvider canEdit={canEdit}>
          {children}
        </BotPermissionProvider>
      </div>
    </div>
  )
}
