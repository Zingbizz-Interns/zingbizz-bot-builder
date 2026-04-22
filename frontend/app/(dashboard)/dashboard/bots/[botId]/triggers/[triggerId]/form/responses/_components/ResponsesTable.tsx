'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { FormResponseWithAnswers } from '@/types/database'

interface Question {
  id: string
  question_text: string
  order_index: number
  validation_type: string
}

interface ResponsesTableProps {
  botId: string
  responses: FormResponseWithAnswers[]
  questions: Question[]
  total: number
  page: number
  triggerId: string
  formTitle: string
  exportEnabled: boolean
}

export default function ResponsesTable({
  botId,
  responses,
  questions,
  total,
  page,
  triggerId,
  formTitle,
  exportEnabled,
}: ResponsesTableProps) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / 50))
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)

  async function handleExport() {
    if (!exportEnabled) return

    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch(`/api/forms/${triggerId}/export`)
      if (!res.ok) {
        const message = await res.text()
        setExportError(message || 'Export is currently unavailable.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${formTitle.replace(/[^a-z0-9]/gi, '_')}_responses.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Export is currently unavailable.')
    } finally {
      setExporting(false)
    }
  }

  function goPage(p: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(p))
    window.location.href = url.toString()
  }

  function getPhoneForResponse(response: FormResponseWithAnswers) {
    const phoneQuestionIds = new Set(
      sorted.filter((question) => question.validation_type === 'phone').map((question) => question.id)
    )

    for (const answer of response.form_response_answers ?? []) {
      if (phoneQuestionIds.has(answer.question_id) && answer.answer_text?.trim()) {
        return answer.answer_text.trim()
      }
    }

    return null
  }

  if (responses.length === 0) {
    return (
      <div className="border-4 border-black border-dashed p-16 text-center">
        <p className="font-black uppercase tracking-tighter text-black/30 text-xl">
          No responses yet
        </p>
        <p className="text-sm font-medium text-black/40 mt-2">
          Responses will appear here once users submit this form.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-widest text-black/50">
          {total} response{total !== 1 ? 's' : ''}
        </p>
        <Button variant="yellow" onClick={handleExport} disabled={exporting || !exportEnabled}>
          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
          {!exportEnabled ? 'Export Disabled' : exporting ? 'Exporting…' : 'Export XLSX'}
        </Button>
      </div>

      {!exportEnabled && (
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B6B]">
          Excel export is disabled for this account by your super admin.
        </p>
      )}

      {exportError && (
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B6B]">
          {exportError}
        </p>
      )}

      {/* Table */}
      <div className="border-4 border-black overflow-x-auto shadow-[4px_4px_0px_0px_#000]">
        <table className="w-full text-sm border-collapse min-w-max">
          <thead>
            <tr className="border-b-4 border-black bg-black text-white">
              <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-xs whitespace-nowrap">
                Date
              </th>
              <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-xs whitespace-nowrap">
                Platform
              </th>
              <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-xs whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-xs whitespace-nowrap">
                Chat
              </th>
              {sorted.map((q, i) => (
                <th
                  key={q.id}
                  className="px-4 py-3 text-left font-black uppercase tracking-widest text-xs max-w-[200px]"
                >
                  Q{i + 1}: {q.question_text.length > 40 ? q.question_text.slice(0, 40) + '…' : q.question_text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.map((r, idx) => {
              const answerMap: Record<string, string> = {}
              for (const a of (r.form_response_answers ?? [])) {
                answerMap[a.question_id] = a.answer_text
              }
              const phone = getPhoneForResponse(r)
              return (
                <tr
                  key={r.id}
                  className={`border-b-2 border-black/10 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF5]'}`}
                >
                  <td className="px-4 py-3 font-medium text-black/70 whitespace-nowrap" suppressHydrationWarning>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black ${
                        r.platform === 'whatsapp'
                          ? 'bg-[#FFD93D] text-black'
                          : 'bg-[#FF6B6B] text-white'
                      }`}
                    >
                      {r.platform === 'whatsapp' ? 'WA' : 'IG'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black ${
                        r.is_complete
                          ? 'bg-[#FF6B6B] text-white'
                          : 'bg-[#FFFDF5] text-black/60'
                      }`}
                    >
                      {r.is_complete ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {phone ? (
                      <Link
                        href={`/dashboard/bots/${botId}/live-chat?sender=${encodeURIComponent(phone)}`}
                        className="inline-flex items-center gap-1 border-2 border-[#107040] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[#107040] hover:bg-[#107040] hover:text-white transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" strokeWidth={2.5} />
                        View Chat
                      </Link>
                    ) : (
                      <span
                        title="No phone number in this response"
                        className="inline-flex items-center gap-1 border-4 border-black/20 px-2 py-1 text-xs font-bold uppercase tracking-widest text-black/30 cursor-not-allowed"
                      >
                        <MessageSquare className="w-3 h-3" strokeWidth={2.5} />
                        No Phone
                      </span>
                    )}
                  </td>
                  {sorted.map(q => (
                    <td key={q.id} className="px-4 py-3 font-medium text-[#000000] max-w-[200px]">
                      <span className="block truncate">{answerMap[q.id] ?? '—'}</span>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Previous
          </Button>
          <span className="text-xs font-bold uppercase tracking-widest text-black/50">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
            className="text-xs"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      )}
    </div>
  )
}
