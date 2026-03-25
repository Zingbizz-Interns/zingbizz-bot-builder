'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getQueryBuilder(triggerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('query_builders')
    .select(`*, query_categories(*, query_questions(*))`)
    .eq('trigger_id', triggerId)
    .maybeSingle()
  return data
}

export async function saveQueryBuilder(triggerId: string, botId: string, formData: FormData) {
  const supabase = await createClient()

  const categories = JSON.parse((formData.get('categories') as string) || '[]') as {
    localId: string
    category_name: string
    order_index: number
    questions: { question_text: string; answer_text: string; order_index: number }[]
  }[]

  // 1. Upsert query_builder
  const { data: qb, error: qbErr } = await supabase
    .from('query_builders')
    .upsert({ trigger_id: triggerId }, { onConflict: 'trigger_id' })
    .select()
    .single()

  if (qbErr) return { error: qbErr.message }

  // 2. Delete existing categories (CASCADE removes questions)
  await supabase.from('query_categories').delete().eq('query_builder_id', qb.id)

  if (!categories.length) {
    revalidatePath(`/dashboard/bots/${botId}/triggers/${triggerId}/query`)
    return { success: true }
  }

  // 3. Insert categories
  const { data: inserted, error: catErr } = await supabase
    .from('query_categories')
    .insert(categories.map(c => ({ query_builder_id: qb.id, category_name: c.category_name, order_index: c.order_index })))
    .select()

  if (catErr) return { error: catErr.message }

  // 4. Insert questions for each category
  const allQuestions = categories.flatMap((c, i) =>
    c.questions.map(q => ({ category_id: inserted[i].id, question_text: q.question_text, answer_text: q.answer_text, order_index: q.order_index }))
  )

  if (allQuestions.length) {
    const { error: qErr } = await supabase.from('query_questions').insert(allQuestions)
    if (qErr) return { error: qErr.message }
  }

  revalidatePath(`/dashboard/bots/${botId}/triggers/${triggerId}/query`)
  return { success: true }
}
