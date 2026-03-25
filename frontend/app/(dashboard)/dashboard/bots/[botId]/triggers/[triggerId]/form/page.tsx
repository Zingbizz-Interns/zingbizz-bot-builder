import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormBuilder from './_components/FormBuilder'

export default async function FormPage({
  params,
}: {
  params: Promise<{ botId: string; triggerId: string }>
}) {
  const { botId, triggerId } = await params
  console.log('[FormPage] triggerId:', triggerId, '| botId:', botId)

  const supabase = await createClient()

  // Check auth session
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  console.log('[FormPage] auth user:', user?.id ?? 'NULL', '| authErr:', authErr?.message ?? 'none')

  const [
    { data: trigger, error: triggerErr },
    { data: bot, error: botErr },
    { data: existing, error: formErr },
  ] = await Promise.all([
    supabase.from('triggers').select('*').eq('id', triggerId).single(),
    supabase.from('bots').select('name').eq('id', botId).single(),
    supabase
      .from('forms')
      .select('*, form_questions(*, form_question_options(*), form_conditions!question_id(*))')
      .eq('trigger_id', triggerId)
      .maybeSingle(),
  ])

  console.log('[FormPage] trigger:', trigger?.id ?? 'NULL', '| triggerErr:', triggerErr?.message ?? 'none')
  console.log('[FormPage] bot:', bot?.name ?? 'NULL', '| botErr:', botErr?.message ?? 'none')
  console.log('[FormPage] existing form:', existing ? `id=${existing.id} questions=${existing.form_questions?.length ?? 0}` : 'NULL', '| formErr:', formErr?.message ?? 'none')

  if (!trigger || trigger.action_type !== 'form') notFound()
  if (!bot) notFound()

  return (
    <FormBuilder
      trigger={trigger}
      botName={bot.name}
      existing={existing as Parameters<typeof FormBuilder>[0]['existing']}
    />
  )
}
