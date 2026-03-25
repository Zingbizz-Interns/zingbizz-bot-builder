import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QueryBuilderUI from './_components/QueryBuilderUI'

export default async function QueryPage({
  params,
}: {
  params: Promise<{ botId: string; triggerId: string }>
}) {
  const { botId, triggerId } = await params
  const supabase = await createClient()

  const [{ data: trigger }, { data: bot }, { data: existing }] = await Promise.all([
    supabase.from('triggers').select('*').eq('id', triggerId).single(),
    supabase.from('bots').select('name').eq('id', botId).single(),
    supabase
      .from('query_builders')
      .select('*, query_categories(*, query_questions(*))')
      .eq('trigger_id', triggerId)
      .maybeSingle(),
  ])

  if (!trigger || trigger.action_type !== 'query') notFound()
  if (!bot) notFound()

  return (
    <QueryBuilderUI
      trigger={trigger}
      botName={bot.name}
      existing={existing as Parameters<typeof QueryBuilderUI>[0]['existing']}
    />
  )
}
