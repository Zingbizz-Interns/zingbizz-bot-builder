'use server'

import { createClient } from '@/lib/supabase/server'
import type { FormResponseAnswer, FormResponseWithAnswers } from '@/types/database'

const PAGE_SIZE = 50

export async function getFormResponses(
  formId: string,
  page = 1
): Promise<{ responses: FormResponseWithAnswers[]; total: number }> {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch responses (paginated)
  const { data: responses, error, count } = await supabase
    .from('form_responses')
    .select('*', { count: 'exact' })
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  if (!responses || responses.length === 0) {
    return { responses: [], total: count ?? 0 }
  }

  // Fetch answers for this page of responses as a separate query
  // (more reliable than relying on PostgREST nested-select FK inference)
  const responseIds = responses.map((r) => r.id)
  const { data: answers } = await supabase
    .from('form_response_answers')
    .select('*')
    .in('response_id', responseIds)

  // Group answers by response_id
  const answersMap: Record<string, FormResponseAnswer[]> = {}
  for (const a of answers ?? []) {
    if (!answersMap[a.response_id]) answersMap[a.response_id] = []
    answersMap[a.response_id].push(a as FormResponseAnswer)
  }

  return {
    responses: responses.map((r) => ({
      ...r,
      form_response_answers: answersMap[r.id] ?? [],
    })) as FormResponseWithAnswers[],
    total: count ?? 0,
  }
}

export async function getFormIdByTrigger(triggerId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forms')
    .select('id')
    .eq('trigger_id', triggerId)
    .single()
  return data?.id ?? null
}
