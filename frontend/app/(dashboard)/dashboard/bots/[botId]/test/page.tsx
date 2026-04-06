import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestMode from './_components/TestMode'
import type { BotConfig, FullTrigger, FullQuestion } from './_components/TestMode'
import type {
  ActionType,
  Bot,
  ConditionOperator,
  InputType,
  Platform,
  PlatformConfig,
  TriggerType,
  ValidationType,
} from '@/types/database'

type TriggerRow = {
  id: string
  name: string
  trigger_type: TriggerType
  platforms: Platform[]
  action_type: ActionType
  trigger_keywords: { keyword: string }[]
}

type ReplierRow = {
  trigger_id: string
  message_text: string | null
  replier_buttons: {
    button_label: string
    links_to_trigger_id: string | null
    order_index: number
  }[] | null
}

type FormRow = {
  trigger_id: string
  id: string
  title: string | null
  form_questions: {
    id: string
    question_text: string | null
    input_type: InputType
    validation_type: ValidationType | null
    is_required: boolean
    order_index: number
    form_question_options: {
      option_label: string
      order_index: number
    }[] | null
    form_conditions: {
      condition_question_id: string
      condition_operator: ConditionOperator
      condition_value: string
    }[] | null
  }[] | null
}

type QueryRow = {
  trigger_id: string
  query_categories: {
    category_name: string | null
    order_index: number
    query_questions: {
      question_text: string | null
      answer_text: string | null
      order_index: number
    }[] | null
  }[] | null
}

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

  const typedBot = bot as Pick<Bot, 'name' | 'fallback_message'>
  const typedPlatforms = (platforms ?? []) as Pick<PlatformConfig, 'platform' | 'is_active'>[]
  const typedTriggers = (rawTriggers ?? []) as TriggerRow[]

  const triggerIds = typedTriggers.map(t => t.id)

  // Load all action data in parallel
  let rawRepliers: ReplierRow[] = []
  let rawForms: FormRow[] = []
  let rawQueries: QueryRow[] = []

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
    rawRepliers = (r ?? []) as ReplierRow[]
    rawForms = (f ?? []) as FormRow[]
    rawQueries = (q ?? []) as QueryRow[]
  }

  // Assemble full triggers
  const triggers: FullTrigger[] = typedTriggers.map(t => {
    const replierData = rawRepliers.find(r => r.trigger_id === t.id)
    const formData = rawForms.find(f => f.trigger_id === t.id)
    const queryData = rawQueries.find(q => q.trigger_id === t.id)

    return {
      id: t.id,
      name: t.name,
      trigger_type: t.trigger_type,
      platforms: t.platforms,
      action_type: t.action_type,
      keywords: t.trigger_keywords.map(k => k.keyword),

      replier: replierData ? {
        message_text: replierData.message_text ?? '',
        buttons: (replierData.replier_buttons ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(b => ({ label: b.button_label, triggerId: b.links_to_trigger_id })),
      } : undefined,

      form: formData ? {
        id: formData.id,
        title: formData.title ?? '',
        questions: (formData.form_questions ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((q): FullQuestion => ({
            id: q.id,
            question_text: q.question_text ?? '',
            input_type:      q.input_type,
            validation_type: q.validation_type ?? 'none',
            is_required: q.is_required,
            order_index: q.order_index,
            options: (q.form_question_options ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map(o => ({ option_label: o.option_label })),
            conditions: q.form_conditions ?? [],
          })),
      } : undefined,

      query: queryData ? {
        categories: (queryData.query_categories ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(cat => ({
            category_name: cat.category_name ?? '',
            questions: (cat.query_questions ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map(q => ({
                question_text: q.question_text ?? '',
                answer_text: q.answer_text ?? '',
              })),
          })),
      } : undefined,
    }
  })

  const config: BotConfig = {
    bot: {
      name: typedBot.name,
      fallback_message: typedBot.fallback_message ?? "Sorry, I didn't understand that.",
    },
    activePlatforms: typedPlatforms
      .filter(p => p.is_active)
      .map(p => p.platform),
    triggers,
  }

  return <TestMode config={config} />
}
