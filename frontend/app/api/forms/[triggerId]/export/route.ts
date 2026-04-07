import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthorizedBotAccess } from '@/lib/botAccess'
import * as XLSX from 'xlsx'

function isMissingSchemaError(message: string) {
  return /does not exist/i.test(message) || /Could not find/i.test(message)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  const { triggerId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: trigger } = await admin
    .from('triggers')
    .select('id, bot_id')
    .eq('id', triggerId)
    .maybeSingle()

  if (!trigger) return new Response('Form not found', { status: 404 })

  const access = await getAuthorizedBotAccess(trigger.bot_id)
  if (!access) return new Response('Not found', { status: 404 })

  const { data: controls, error: controlsError } = await admin
    .from('customer_account_controls')
    .select('excel_export_enabled')
    .eq('customer_id', access.customerId)
    .maybeSingle()

  if (controlsError && !isMissingSchemaError(controlsError.message)) {
    return new Response('Failed to verify export access', { status: 500 })
  }

  if (controls?.excel_export_enabled === false) {
    console.warn(
      `[form export] Blocked XLSX export for trigger ${triggerId} (customer ${access.customerId})`
    )
    return new Response('Excel export is disabled for this account.', { status: 403 })
  }

  // Get form with questions
  const { data: form } = await admin
    .from('forms')
    .select('id, title, form_questions(id, question_text, order_index)')
    .eq('trigger_id', triggerId)
    .single()

  if (!form) return new Response('Form not found', { status: 404 })

  const questions = [...(form.form_questions as { id: string; question_text: string; order_index: number }[])]
    .sort((a, b) => a.order_index - b.order_index)

  // Get all responses
  const { data: responses } = await admin
    .from('form_responses')
    .select('*')
    .eq('form_id', form.id)
    .order('created_at', { ascending: false })

  if (!responses) return new Response('No data', { status: 404 })

  // Fetch answers separately (more reliable than nested PostgREST query)
  const responseIds = responses.map(r => r.id)
  const { data: allAnswers } = responseIds.length > 0
    ? await admin.from('form_response_answers').select('*').in('response_id', responseIds)
    : { data: [] }

  const answersMap: Record<string, { question_id: string; answer_text: string }[]> = {}
  for (const a of allAnswers ?? []) {
    if (!answersMap[a.response_id]) answersMap[a.response_id] = []
    answersMap[a.response_id].push(a)
  }

  // Build rows
  const header = ['Date', 'Platform', 'Status', ...questions.map(q => q.question_text)]

  const rows = responses.map(r => {
    const answerMap: Record<string, string> = {}
    for (const a of answersMap[r.id] ?? []) answerMap[a.question_id] = a.answer_text

    return [
      new Date(r.created_at).toLocaleString(),
      r.platform,
      r.is_complete ? 'Complete' : 'Incomplete',
      ...questions.map(q => answerMap[q.id] ?? ''),
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const filename = `${form.title.replace(/[^a-z0-9]/gi, '_')}_responses.xlsx`

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
