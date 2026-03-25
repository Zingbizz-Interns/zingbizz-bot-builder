'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getForm(triggerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forms')
    .select(`*, form_questions(*, form_question_options(*), form_conditions!question_id(*))`)
    .eq('trigger_id', triggerId)
    .maybeSingle()
  return data
}

export async function saveForm(triggerId: string, botId: string, formData: FormData) {
  const supabase = await createClient()

  const title = (formData.get('title') as string)?.trim() || 'Untitled Form'
  const submitMessage = (formData.get('submit_message') as string)?.trim() || 'Thank you! Your responses have been submitted.'
  const questionsRaw = JSON.parse((formData.get('questions') as string) || '[]') as {
    localId: string
    order_index: number
    question_text: string
    input_type: 'text' | 'choice'
    validation_type: string
    is_required: boolean
    options: { label: string }[]
    conditions: { conditionQuestionLocalId: string; operator: string; value: string }[]
  }[]

  // 1. Upsert form
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .upsert({ trigger_id: triggerId, title, submit_message: submitMessage }, { onConflict: 'trigger_id' })
    .select()
    .single()

  if (formErr) return { error: formErr.message }

  // 2. Delete existing questions (CASCADE removes options + conditions)
  await supabase.from('form_questions').delete().eq('form_id', form.id)

  if (!questionsRaw.length) {
    revalidatePath(`/dashboard/bots/${botId}/triggers/${triggerId}/form`)
    return { success: true }
  }

  // 3. Insert questions (no conditions yet)
  const { data: inserted, error: qErr } = await supabase
    .from('form_questions')
    .insert(
      questionsRaw.map(q => ({
        form_id: form.id,
        order_index: q.order_index,
        question_text: q.question_text,
        input_type: q.input_type,
        validation_type: q.validation_type,
        is_required: q.is_required,
      }))
    )
    .select()

  if (qErr) return { error: qErr.message }

  // 4. Build localId → db id map
  const localToDb: Record<string, string> = {}
  questionsRaw.forEach((q, i) => { localToDb[q.localId] = inserted[i].id })

  // 5. Insert options
  const allOptions = questionsRaw.flatMap((q, i) =>
    q.options.map((o, j) => ({ question_id: inserted[i].id, option_label: o.label, order_index: j }))
  )
  if (allOptions.length) {
    const { error: oErr } = await supabase.from('form_question_options').insert(allOptions)
    if (oErr) return { error: oErr.message }
  }

  // 6. Insert conditions
  const allConditions = questionsRaw.flatMap((q, i) =>
    q.conditions
      .filter(c => localToDb[c.conditionQuestionLocalId])
      .map(c => ({
        question_id: inserted[i].id,
        condition_question_id: localToDb[c.conditionQuestionLocalId],
        condition_operator: c.operator,
        condition_value: c.value,
      }))
  )
  if (allConditions.length) {
    const { error: cErr } = await supabase.from('form_conditions').insert(allConditions)
    if (cErr) return { error: cErr.message }
  }

  revalidatePath(`/dashboard/bots/${botId}/triggers/${triggerId}/form`)
  return { success: true }
}
