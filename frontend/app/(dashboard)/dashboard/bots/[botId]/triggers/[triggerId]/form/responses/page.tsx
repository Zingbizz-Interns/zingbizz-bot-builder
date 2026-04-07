import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFormResponses } from '@/lib/actions/responses'
import ResponsesTable from './_components/ResponsesTable'

interface PageProps {
  params: Promise<{ botId: string; triggerId: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ResponsesPage({ params, searchParams }: PageProps) {
  const { botId, triggerId } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))

  const supabase = await createClient()
  const admin = createAdminClient()

  // Load form with questions
  const { data: form } = await supabase
    .from('forms')
    .select('id, title, form_questions(id, question_text, order_index, validation_type)')
    .eq('trigger_id', triggerId)
    .single()

  if (!form) notFound()

  // Load trigger name for breadcrumb
  const { data: trigger } = await supabase
    .from('triggers')
    .select('name')
    .eq('id', triggerId)
    .single()

  const { responses, total } = await getFormResponses(form.id, page)

  const { data: bot } = await admin
    .from('bots')
    .select('customer_id')
    .eq('id', botId)
    .maybeSingle()

  const { data: controls, error: controlsError } = bot
    ? await admin
        .from('customer_account_controls')
        .select('excel_export_enabled')
        .eq('customer_id', bot.customer_id)
        .maybeSingle()
    : { data: null, error: null }

  if (controlsError && !/does not exist/i.test(controlsError.message)) {
    throw new Error(controlsError.message)
  }

  const exportEnabled = controls?.excel_export_enabled ?? true

  const questions = form.form_questions as {
    id: string
    question_text: string
    order_index: number
    validation_type: string
  }[]

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-6">
        <Link
          href={`/dashboard/bots/${botId}/triggers`}
          className="hover:text-[#1040C0] transition-colors"
        >
          Triggers
        </Link>
        <ChevronRight className="w-3 h-3" strokeWidth={3} />
        <Link
          href={`/dashboard/bots/${botId}/triggers/${triggerId}/form`}
          className="hover:text-[#1040C0] transition-colors"
        >
          {trigger?.name ?? 'Form'}
        </Link>
        <ChevronRight className="w-3 h-3" strokeWidth={3} />
        <span className="text-[#121212]">Responses</span>
      </div>

      {/* Page title */}
      <div className="mb-8">
        <h1 className="font-black uppercase tracking-tighter text-3xl text-[#121212]">
          {form.title}
        </h1>
        <p className="text-sm font-medium text-[#121212]/50 mt-1 uppercase tracking-widest">
          Response Viewer
        </p>
      </div>

      <ResponsesTable
        botId={botId}
        responses={responses}
        questions={questions}
        total={total}
        page={page}
        triggerId={triggerId}
        formTitle={form.title}
        exportEnabled={exportEnabled}
      />
    </div>
  )
}
