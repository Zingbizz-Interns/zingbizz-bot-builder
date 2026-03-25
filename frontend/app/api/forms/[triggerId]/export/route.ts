import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  const { triggerId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Get form with questions
  const { data: form } = await supabase
    .from('forms')
    .select('id, title, form_questions(id, question_text, order_index)')
    .eq('trigger_id', triggerId)
    .single()

  if (!form) return new Response('Form not found', { status: 404 })

  const questions = [...(form.form_questions as { id: string; question_text: string; order_index: number }[])]
    .sort((a, b) => a.order_index - b.order_index)

  // Get all responses with answers
  const { data: responses } = await supabase
    .from('form_responses')
    .select('*, form_response_answers(*)')
    .eq('form_id', form.id)
    .order('created_at', { ascending: false })

  if (!responses) return new Response('No data', { status: 404 })

  // Build rows
  const header = ['Date', 'Platform', 'Status', ...questions.map(q => q.question_text)]

  const rows = responses.map(r => {
    const answers = (r.form_response_answers ?? []) as { question_id: string; answer_text: string }[]
    const answerMap: Record<string, string> = {}
    for (const a of answers) answerMap[a.question_id] = a.answer_text

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
