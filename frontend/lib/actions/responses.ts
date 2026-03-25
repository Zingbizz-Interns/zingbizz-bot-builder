'use server'

import { createClient } from '@/lib/supabase/server'
import type { FormResponseWithAnswers } from '@/types/database'

const PAGE_SIZE = 50

export async function getFormResponses(
  formId: string,
  page = 1
): Promise<{ responses: FormResponseWithAnswers[]; total: number }> {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('form_responses')
    .select('*, form_response_answers(*)', { count: 'exact' })
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { responses: (data ?? []) as FormResponseWithAnswers[], total: count ?? 0 }
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
