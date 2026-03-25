import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestMode from './_components/TestMode'
import type { BotConfig, FullTrigger, FullQuestion } from './_components/TestMode'

export default async function TestPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params
  const supabase = await createClient()

  // Load bot + platform configs + triggers in parallel
  const [{ data: bot }, { data: platforms }, { data: rawTriggers }] = await Promise.all([
    supabase.from('bots').select('name, fallback_message').eq('id', botId).single(),
    supabase.from('platform_configs').select('platform, is_active').eq('bot_id', botId),
    supabase
      .from('triggers')
      .select('id, name, trigger_type, platforms, action_type, trigger_keywords(keyword)')
      .eq('bot_id', botId)
      .order('created_at', { ascending: true }),
  ])

  if (!bot) notFound()

  const triggerIds = (rawTriggers ?? []).map(t => t.id)

  // Load all action data in parallel
  let rawRepliers: any[] = []
  let rawForms:    any[] = []
  let rawQueries:  any[] = []

  if (triggerIds.length > 0) {
    const [{ data: r }, { data: f }, { data: q }] = await Promise.all([
      supabase
        .from('replier_actions')
        .select('trigger_id, message_text, replier_buttons(button_label, links_to_trigger_id, order_index)')
        .in('trigger_id', triggerIds),
      supabase
        .from('forms')
        .select(`
          trigger_id, id, title,
          form_questions(
            id, question_text, input_type, validation_type, is_required, order_index,
            form_question_options(option_label, order_index),
            form_conditions!question_id(condition_question_id, condition_operator, condition_value)
          )
        `)
        .in('trigger_id', triggerIds),
      supabase
        .from('query_builders')
        .select(`
          trigger_id,
          query_categories(
            category_name, order_index,
            query_questions(question_text, answer_text, order_index)
          )
        `)
        .in('trigger_id', triggerIds),
    ])
    rawRepliers = r ?? []
    rawForms    = f ?? []
    rawQueries  = q ?? []
  }

  // Assemble full triggers
  const triggers: FullTrigger[] = (rawTriggers ?? []).map(t => {
    const replierData = rawRepliers.find(r => r.trigger_id === t.id)
    const formData    = rawForms.find(f => f.trigger_id === t.id)
    const queryData   = rawQueries.find(q => q.trigger_id === t.id)

    return {
      id:           t.id,
      name:         t.name,
      trigger_type: t.trigger_type as FullTrigger['trigger_type'],
      platforms:    t.platforms as string[],
      action_type:  t.action_type as FullTrigger['action_type'],
      keywords:     (t.trigger_keywords as { keyword: string }[]).map(k => k.keyword),

      replier: replierData ? {
        message_text: replierData.message_text ?? '',
        buttons: ((replierData.replier_buttons as any[]) ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(b => ({ label: b.button_label, triggerId: b.links_to_trigger_id })),
      } : undefined,

      form: formData ? {
        id:    formData.id,
        title: formData.title ?? '',
        questions: ((formData.form_questions as any[]) ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any): FullQuestion => ({
            id:              q.id,
            question_text:   q.question_text ?? '',
            input_type:      q.input_type,
            validation_type: q.validation_type ?? 'none',
            is_required:     q.is_required,
            order_index:     q.order_index,
            options: ((q.form_question_options as any[]) ?? [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((o: any) => ({ option_label: o.option_label })),
            conditions: (q.form_conditions as any[]) ?? [],
          })),
      } : undefined,

      query: queryData ? {
        categories: ((queryData.query_categories as any[]) ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((cat: any) => ({
            category_name: cat.category_name ?? '',
            questions: ((cat.query_questions as any[]) ?? [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((q: any) => ({
                question_text: q.question_text ?? '',
                answer_text:   q.answer_text ?? '',
              })),
          })),
      } : undefined,
    }
  })

  const config: BotConfig = {
    bot: {
      name:             bot.name,
      fallback_message: (bot as any).fallback_message ?? "Sorry, I didn't understand that.",
    },
    activePlatforms: (platforms ?? [])
      .filter(p => p.is_active)
      .map(p => p.platform as string),
    triggers,
  }

  return <TestMode config={config} />
}
