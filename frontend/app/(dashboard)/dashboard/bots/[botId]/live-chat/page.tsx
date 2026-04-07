import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import InboxClient from '@/app/(dashboard)/dashboard/inbox/_components/InboxClient'
import type { Conversation } from '@/lib/actions/inbox'

interface ConversationRow extends Omit<Conversation, 'bot_name'> {
  bots?: { name?: string | null } | null
}

export default async function BotLiveChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ botId: string }>
  searchParams: Promise<{ sender?: string }>
}) {
  const { botId } = await params
  const { sender } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Verify access: owner or permitted sub-account
  const { data: bot } = await admin
    .from('bots')
    .select('id, customer_id')
    .eq('id', botId)
    .single()

  if (!bot) notFound()

  const { data: profile } = await admin
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const isOwner = profile?.id === bot.customer_id

  if (!isOwner) {
    const { data: sub } = await admin
      .from('sub_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!sub) notFound()

    const { data: perm } = await admin
      .from('bot_permissions')
      .select('id')
      .eq('sub_account_id', sub.id)
      .eq('bot_id', botId)
      .single()

    if (!perm) notFound()
  }

  const { data: conversation } = sender
    ? await admin
        .from('conversations')
        .select('*, bots!inner(name)')
        .eq('bot_id', botId)
        .eq('sender_id', sender)
        .maybeSingle()
    : { data: null }

  const initialConversation = conversation
    ? {
        ...(conversation as ConversationRow),
        bot_name: (conversation as ConversationRow).bots?.name ?? '',
      }
    : undefined

  return (
    <div className="h-full">
      <InboxClient
        botIds={[botId]}
        botId={botId}
        initialConversation={initialConversation}
        initialSender={sender}
      />
    </div>
  )
}
