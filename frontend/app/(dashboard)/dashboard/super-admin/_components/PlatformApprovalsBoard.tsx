'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock3, ShieldCheck, XCircle, Ban } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  updatePlatformConnectionRequestStatus,
  type PlatformConnectionRequestWithRelations,
} from '@/lib/actions/superAdmin'
import type { PlatformConnectionRequestStatus } from '@/types/database'

type QueueFilter = PlatformConnectionRequestStatus | 'all'

const filterLabels: Record<QueueFilter, string> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

function formatDate(value: string | null) {
  if (!value) return 'Not reviewed'
  return new Date(value).toLocaleString()
}

function formatPayloadValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function statusClasses(status: PlatformConnectionRequestStatus) {
  switch (status) {
    case 'approved':
      return 'border-[#107040] bg-[#107040] text-white'
    case 'rejected':
      return 'border-[#FF6B6B] bg-[#FF6B6B] text-white'
    case 'cancelled':
      return 'border-black bg-black text-white'
    default:
      return 'border-black bg-[#FFD93D] text-black'
  }
}

export default function PlatformApprovalsBoard({
  requests,
}: {
  requests: PlatformConnectionRequestWithRelations[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    Object.fromEntries(requests.map((request) => [request.id, request.decision_note ?? '']))
  )
  const [statusByRequestId, setStatusByRequestId] = useState<
    Record<string, { saving?: boolean; error?: string | null; success?: string | null }>
  >({})

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((request) => request.status === 'pending').length,
      approved: requests.filter((request) => request.status === 'approved').length,
      rejected: requests.filter((request) => request.status === 'rejected').length,
      cancelled: requests.filter((request) => request.status === 'cancelled').length,
    }),
    [requests]
  )

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesFilter = filter === 'all' || request.status === filter
      if (!matchesFilter) return false

      if (!normalizedSearch) return true

      return [
        request.customer_name,
        request.customer_email,
        request.bot_name,
        request.platform,
        request.requester_name,
        request.requester_email,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    })
  }, [filter, requests, search])

  async function handleDecision(
    requestId: string,
    nextStatus: PlatformConnectionRequestStatus
  ) {
    setStatusByRequestId((current) => ({
      ...current,
      [requestId]: { saving: true, error: null, success: null },
    }))

    try {
      await updatePlatformConnectionRequestStatus({
        requestId,
        status: nextStatus,
        decisionNote: decisionNotes[requestId] ?? '',
      })

      setStatusByRequestId((current) => ({
        ...current,
        [requestId]: {
          saving: false,
          error: null,
          success: `${nextStatus.toUpperCase()} saved.`,
        },
      }))
      router.refresh()
    } catch (error) {
      setStatusByRequestId((current) => ({
        ...current,
        [requestId]: {
          saving: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update platform connection request.',
          success: null,
        },
      }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-5">
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#000]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Requests
          </p>
          <p className="mt-2 text-3xl font-black text-black">{counts.all}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FFD93D]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Pending
          </p>
          <p className="mt-2 text-3xl font-black text-black">{counts.pending}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#107040]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Approved
          </p>
          <p className="mt-2 text-3xl font-black text-[#107040]">{counts.approved}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FF6B6B]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Rejected
          </p>
          <p className="mt-2 text-3xl font-black text-[#FF6B6B]">{counts.rejected}</p>
        </div>
        <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#FF6B6B]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000000]/45">
            Cancelled
          </p>
          <p className="mt-2 text-3xl font-black text-[#FF6B6B]">{counts.cancelled}</p>
        </div>
      </div>

      <section className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_#000]">
        <div className="border-b-2 border-black px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#000000]/45">
                Approval Queue
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-black">
                Platform Connection Requests
              </h2>
            </div>

            <label className="flex min-w-[280px] items-center gap-2 border-4 border-black bg-[#F5F5F0] px-3 py-2">
              <Search className="h-4 w-4 text-black/50" strokeWidth={2.5} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, bot, or requester"
                className="w-full bg-transparent text-sm font-medium text-[#000000] outline-none placeholder:text-[#000000]/35"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(filterLabels) as QueueFilter[]).map((value) => {
              const active = filter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-black bg-white text-[#000000] hover:bg-[#FFD93D]'
                  }`}
                >
                  {filterLabels[value]}
                </button>
              )
            })}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#000000]/35">
              No requests match this view
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            {filteredRequests.map((request) => {
              const requestState = statusByRequestId[request.id]
              const payloadEntries = Object.entries(request.request_payload ?? {})

              return (
                <article
                  key={request.id}
                  className="border-4 border-black bg-[#F5F5F0] p-4 shadow-[6px_6px_0px_0px_#000]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClasses(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                        <span className="inline-flex items-center border-4 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                          {request.platform}
                        </span>
                      </div>

                      <div>
                        <p className="text-lg font-black uppercase tracking-tight text-black">
                          {request.customer_name ?? request.customer_id}
                        </p>
                        <p className="text-sm font-medium text-[#000000]/55">
                          {request.customer_email ?? 'No customer email'} · Bot{' '}
                          {request.bot_name ?? request.bot_id}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm font-medium text-[#000000]/65 md:grid-cols-2">
                        <p className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" strokeWidth={2.5} />
                          Created: {formatDate(request.created_at)}
                        </p>
                        <p>
                          Requested by: {request.requester_name ?? request.requested_by}
                          {request.requester_email ? ` (${request.requester_email})` : ''}
                        </p>
                        <p>
                          Reviewer: {request.reviewer_name ?? 'Pending review'}
                          {request.reviewer_email ? ` (${request.reviewer_email})` : ''}
                        </p>
                        <p>Reviewed at: {formatDate(request.reviewed_at)}</p>
                      </div>
                    </div>

                    <div className="w-full max-w-xl space-y-3">
                      <div className="border-4 border-black bg-white px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                          Request Metadata
                        </p>
                        {payloadEntries.length === 0 ? (
                          <p className="mt-2 text-sm font-medium text-[#000000]/55">
                            No request payload was stored for this request.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-2">
                            {payloadEntries.slice(0, 6).map(([key, value]) => (
                              <div key={key} className="grid gap-1 md:grid-cols-[160px_1fr]">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000000]/45">
                                  {key}
                                </p>
                                <p className="break-all text-sm font-medium text-[#000000]/65">
                                  {formatPayloadValue(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {payloadEntries.length > 6 && (
                          <details className="mt-3 text-sm font-medium text-black/60">
                            <summary className="cursor-pointer font-black uppercase tracking-[0.16em]">
                              Show Full Payload
                            </summary>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words border-4 border-black bg-[#F5F5F0] p-3 text-xs text-black/70">
                              {JSON.stringify(request.request_payload ?? {}, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#000000]/45">
                          Review Note
                        </label>
                        <textarea
                          value={decisionNotes[request.id] ?? ''}
                          onChange={(event) =>
                            setDecisionNotes((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Add operational context for the decision."
                          className="mt-2 w-full resize-none border-4 border-black bg-white px-3 py-3 text-sm font-medium text-[#000000] outline-none transition-colors focus:bg-[#F5F5F0]"
                        />
                      </div>

                      {requestState?.error && (
                        <p className="text-sm font-medium text-[#FF6B6B]">
                          {requestState.error}
                        </p>
                      )}

                      {requestState?.success && (
                        <p className="text-sm font-medium text-[#107040]">
                          {requestState.success}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="yellow"
                          type="button"
                          disabled={requestState?.saving || request.status !== 'pending'}
                          onClick={() => handleDecision(request.id, 'approved')}
                        >
                          <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                          Approve
                        </Button>
                        <Button
                          variant="red"
                          type="button"
                          disabled={requestState?.saving || request.status !== 'pending'}
                          onClick={() => handleDecision(request.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" strokeWidth={2.5} />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          type="button"
                          disabled={requestState?.saving || request.status !== 'pending'}
                          onClick={() => handleDecision(request.id, 'cancelled')}
                        >
                          <Ban className="h-4 w-4" strokeWidth={2.5} />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
