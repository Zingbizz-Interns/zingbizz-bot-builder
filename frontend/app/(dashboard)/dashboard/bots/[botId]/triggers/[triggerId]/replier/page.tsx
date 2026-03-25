import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTriggers } from '@/lib/actions/triggers'
import ReplierBuilder from './_components/ReplierBuilder'

export default async function ReplierPage({
  params,
}: {
  params: Promise<{ botId: string; triggerId: string }>
}) {
  const { botId, triggerId } = await params
  const supabase = await createClient()

  const [{ data: trigger }, { data: bot }, { data: existing }, allTriggers] = await Promise.all([
    supabase.from('triggers').select('*').eq('id', triggerId).single(),
    supabase.from('bots').select('name').eq('id', botId).single(),
    supabase
      .from('replier_actions')
      .select('*, replier_buttons(*)')
      .eq('trigger_id', triggerId)
      .maybeSingle(),
    getTriggers(botId),
  ])

  if (!trigger || trigger.action_type !== 'replier') notFound()
  if (!bot) notFound()

  return (
    <ReplierBuilder
      trigger={trigger}
      botName={bot.name}
      existing={existing as Parameters<typeof ReplierBuilder>[0]['existing']}
      allTriggers={allTriggers.map(t => ({ id: t.id, name: t.name }))}
    />
  )
}
