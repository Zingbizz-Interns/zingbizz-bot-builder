'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Save, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  saveBotTriggerLimit,
  saveCustomerAccountControls,
  type PlatformConnectionRequestWithRelations,
  type SuperAdminBotLimitSummary,
  type SuperAdminCustomerDetail,
} from '@/lib/actions/superAdmin'

interface BotRowState extends SuperAdminBotLimitSummary {
  triggerLimitInput: string
}

function formatDate(value: string | null) {
  if (!value) return 'Not reviewed'
  return new Date(value).toLocaleString()
}

function requestStatusClasses(status: PlatformConnectionRequestWithRelations['status']) {
  switch (status) {
    case 'approved':
      return 'border-[#107040] bg-[#107040] text-white'
    case 'rejected':
      return 'border-[#D02020] bg-[#D02020] text-white'
    case 'cancelled':
      return 'border-[#121212] bg-[#121212] text-white'
    default:
      return 'border-[#121212] bg-[#F0C020] text-[#121212]'
  }
}

export default function CustomerDetailClient({
  customer,
  requests,
}: {
  customer: SuperAdminCustomerDetail
  requests: PlatformConnectionRequestWithRelations[]
}) {
  const [maxFormSubmissions, setMaxFormSubmissions] = useState(
    customer.controls.max_form_submissions?.toString() ?? ''
  )
  const [excelExportEnabled, setExcelExportEnabled] = useState(
    customer.controls.excel_export_enabled ?? true
  )
  const [automationEnabled, setAutomationEnabled] = useState(
    customer.controls.automation_enabled ?? true
  )
  const [automationDisabledReason, setAutomationDisabledReason] = useState(
    customer.controls.automation_disabled_reason ?? ''
  )
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null)
  const [botRows, setBotRows] = useState<BotRowState[]>(
    customer.bots.map((bot) => ({
      ...bot,
      triggerLimitInput: bot.trigger_limit?.toString() ?? '',
    }))
  )
  const [botStatus, setBotStatus] = useState<
    Record<string, { saving?: boolean; error?: string | null; success?: string | null }>
  >({})

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests]
  )

  const currentLimit =
    maxFormSubmissions.trim().length === 0 ? null : Number.parseInt(maxFormSubmissions, 10)
  const isOverQuota =
    currentLimit !== null &&
    Number.isFinite(currentLimit) &&
    customer.completed_form_submissions >= currentLimit

  async function handleAccountSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountSaving(true)
    setAccountError(null)
    setAccountSuccess(null)

    try {
      const parsedLimit =
        maxFormSubmissions.trim().length === 0
          ? null
          : Number.parseInt(maxFormSubmissions, 10)

      if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
        setAccountError('Max form submissions must be a non-negative whole number.')
        setAccountSaving(false)
        return
      }

      const result = await saveCustomerAccountControls({
        customerId: customer.profile.id,
        maxFormSubmissions: parsedLimit,
        excelExportEnabled,
        automationEnabled,
        automationDisabledReason,
      })

      setMaxFormSubmissions(result.max_form_submissions?.toString() ?? '')
      setExcelExportEnabled(result.excel_export_enabled ?? true)
      setAutomationEnabled(result.automation_enabled ?? true)
      setAutomationDisabledReason(result.automation_disabled_reason ?? '')
      setAccountSuccess('Customer controls saved.')
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'Failed to save customer controls.'
      )
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleBotSave(botId: string) {
    const bot = botRows.find((entry) => entry.id === botId)
    if (!bot) return

    setBotStatus((current) => ({
      ...current,
      [botId]: { saving: true, error: null, success: null },
    }))

    try {
      const parsedLimit =
        bot.triggerLimitInput.trim().length === 0
          ? null
          : Number.parseInt(bot.triggerLimitInput, 10)

      if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
        setBotStatus((current) => ({
          ...current,
          [botId]: {
            saving: false,
            error: 'Trigger limit must be a non-negative whole number.',
            success: null,
          },
        }))
        return
      }

      const result = await saveBotTriggerLimit({
        botId,
        triggerLimit: parsedLimit,
        triggerLimitEnforced: bot.trigger_limit_enforced,
      })

      setBotRows((current) =>
        current.map((entry) =>
          entry.id === botId
            ? {
                ...entry,
                trigger_limit: result.trigger_limit ?? null,
                trigger_limit_enforced: result.trigger_limit_enforced ?? true,
                triggerLimitInput: result.trigger_limit?.toString() ?? '',
              }
            : entry
        )
      )
      setBotStatus((current) => ({
        ...current,
        [botId]: { saving: false, error: null, success: 'Saved' },
      }))
    } catch (error) {
      setBotStatus((current) => ({
        ...current,
        [botId]: {
          saving: false,
          error: error instanceof Error ? error.message : 'Failed to save trigger limit.',
          success: null,
        },
      }))
    }
  }

  function updateBotRow(botId: string, update: Partial<BotRowState>) {
    setBotRows((current) =>
      current.map((entry) => (entry.id === botId ? { ...entry, ...update } : entry))
    )
    setBotStatus((current) => ({
      ...current,
      [botId]: { saving: false, error: null, success: null },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/super-admin/customers"
          className="inline-flex items-center gap-2 border-2 border-[#121212] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#121212] transition-colors hover:bg-[#121212] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Back To Customers
        </Link>

        {pendingRequests > 0 && (
          <Link
            href="/dashboard/super-admin/platform-approvals"
            className="inline-flex items-center gap-2 border-2 border-[#121212] bg-[#F0C020] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#121212] transition-colors hover:bg-[#121212] hover:text-white"
          >
            Review Pending Requests
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="border-4 border-[#121212] bg-white p-4 shadow-[6px_6px_0px_0px_#121212]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#121212]/45">
            Completed Submissions
          </p>
          <p className="mt-2 text-3xl font-black text-[#121212]">
            {customer.completed_form_submissions}
          </p>
        </div>
        <div className="border-4 border-[#121212] bg-white p-4 shadow-[6px_6px_0px_0px_#1040C0]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#121212]/45">
            Current Form Cap
          </p>
          <p className="mt-2 text-3xl font-black text-[#1040C0]">
            {maxFormSubmissions.trim().length > 0 ? maxFormSubmissions : '∞'}
          </p>
        </div>
        <div className="border-4 border-[#121212] bg-white p-4 shadow-[6px_6px_0px_0px_#D02020]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#121212]/45">
            Pending Requests
          </p>
          <p className="mt-2 text-3xl font-black text-[#D02020]">{pendingRequests}</p>
        </div>
        <div className="border-4 border-[#121212] bg-white p-4 shadow-[6px_6px_0px_0px_#F0C020]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#121212]/45">
            Account State
          </p>
          <p className="mt-2 text-xl font-black uppercase tracking-tight text-[#121212]">
            {!automationEnabled ? 'Automation Off' : isOverQuota ? 'At Limit' : 'Healthy'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#121212]">
          <div className="border-b-2 border-[#121212] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
              Account Controls
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-[#121212]">
              Limits And Safeguards
            </h2>
          </div>

          <form onSubmit={handleAccountSave} className="space-y-5 px-5 py-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-[0.18em] text-[#121212]">
                  Max Form Submissions
                </label>
                <input
                  value={maxFormSubmissions}
                  onChange={(event) => {
                    setMaxFormSubmissions(event.target.value)
                    setAccountError(null)
                    setAccountSuccess(null)
                  }}
                  placeholder="Leave blank for unlimited"
                  inputMode="numeric"
                  className="mt-2 w-full border-2 border-[#121212] bg-[#F5F5F0] px-3 py-3 text-sm font-medium text-[#121212] outline-none transition-colors focus:bg-white"
                />
                <p className="mt-2 text-xs font-medium text-[#121212]/55">
                  Current usage: {customer.completed_form_submissions} completed submission
                  {customer.completed_form_submissions === 1 ? '' : 's'}.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 border-2 border-[#121212] bg-[#F5F5F0] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={excelExportEnabled}
                    onChange={(event) => {
                      setExcelExportEnabled(event.target.checked)
                      setAccountError(null)
                      setAccountSuccess(null)
                    }}
                    className="mt-1 h-4 w-4 accent-[#1040C0]"
                  />
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#121212]">
                      Excel Export Enabled
                    </span>
                    <span className="mt-1 block text-sm font-medium text-[#121212]/55">
                      Owners can export form responses to XLSX when this stays on.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 border-2 border-[#121212] bg-[#F5F5F0] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={automationEnabled}
                    onChange={(event) => {
                      setAutomationEnabled(event.target.checked)
                      if (event.target.checked) {
                        setAutomationDisabledReason('')
                      }
                      setAccountError(null)
                      setAccountSuccess(null)
                    }}
                    className="mt-1 h-4 w-4 accent-[#1040C0]"
                  />
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#121212]">
                      Automation Enabled
                    </span>
                    <span className="mt-1 block text-sm font-medium text-[#121212]/55">
                      Turn this off to stop all trigger automation for the customer immediately.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {!automationEnabled && (
              <div>
                <label className="block text-xs font-black uppercase tracking-[0.18em] text-[#121212]">
                  Automation Disabled Reason
                </label>
                <textarea
                  value={automationDisabledReason}
                  onChange={(event) => {
                    setAutomationDisabledReason(event.target.value)
                    setAccountError(null)
                    setAccountSuccess(null)
                  }}
                  rows={3}
                  placeholder="Optional note shown in audit logs and used for operator context."
                  className="mt-2 w-full resize-none border-2 border-[#121212] bg-[#F5F5F0] px-3 py-3 text-sm font-medium text-[#121212] outline-none transition-colors focus:bg-white"
                />
              </div>
            )}

            {(isOverQuota || !automationEnabled) && (
              <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#D02020]">
                  <ShieldAlert className="h-4 w-4" strokeWidth={2.5} />
                  Runtime enforcement is active for this account.
                </p>
              </div>
            )}

            {accountError && (
              <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-4 py-3 text-sm font-medium text-[#D02020]">
                {accountError}
              </div>
            )}

            {accountSuccess && (
              <div className="border-2 border-[#107040] bg-[#107040]/10 px-4 py-3 text-sm font-medium text-[#107040]">
                {accountSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="blue" type="submit" disabled={accountSaving}>
                <Save className="h-4 w-4" strokeWidth={2.5} />
                {accountSaving ? 'Saving...' : 'Save Account Controls'}
              </Button>
            </div>
          </form>
        </section>

        <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#F0C020]">
          <div className="border-b-2 border-[#121212] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
              Account Summary
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-[#121212]">
              {customer.profile.name}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#121212]/60">
              {customer.profile.email}
            </p>
          </div>

          <div className="space-y-4 px-5 py-5 text-sm font-medium text-[#121212]/70">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]/45">
                Customer Id
              </p>
              <p className="mt-1 break-all font-mono text-xs text-[#121212]/60">
                {customer.profile.id}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]/45">
                Joined
              </p>
              <p className="mt-1">{formatDate(customer.profile.created_at)}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]/45">
                Managed Bots
              </p>
              <p className="mt-1">{customer.bots.length}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#121212]/45">
                Related Platform Requests
              </p>
              <p className="mt-1">{requests.length}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#1040C0]">
        <div className="border-b-2 border-[#121212] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
            Bot Limits
          </p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-[#121212]">
            Trigger Creation Controls
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-[#121212]/10">
            <thead className="bg-[#F5F5F0]">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Bot
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Current Triggers
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Limit
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Enforced
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#121212]/45">
                  Save
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#121212]/8">
              {botRows.map((bot) => (
                <tr key={bot.id}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-black text-[#121212]">{bot.name}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#121212]/45">
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-[#121212]">
                    {bot.trigger_count}
                  </td>
                  <td className="px-5 py-4">
                    <input
                      value={bot.triggerLimitInput}
                      onChange={(event) =>
                        updateBotRow(bot.id, { triggerLimitInput: event.target.value })
                      }
                      placeholder="Unlimited"
                      inputMode="numeric"
                      className="w-full min-w-[120px] border-2 border-[#121212] bg-[#F5F5F0] px-3 py-2 text-sm font-medium text-[#121212] outline-none transition-colors focus:bg-white"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-[#121212]/70">
                      <input
                        type="checkbox"
                        checked={bot.trigger_limit_enforced}
                        onChange={(event) =>
                          updateBotRow(bot.id, {
                            trigger_limit_enforced: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#1040C0]"
                      />
                      Enforced
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    {botStatus[bot.id]?.error ? (
                      <p className="max-w-[220px] text-xs font-medium text-[#D02020]">
                        {botStatus[bot.id]?.error}
                      </p>
                    ) : botStatus[bot.id]?.success ? (
                      <p className="text-xs font-medium text-[#107040]">
                        {botStatus[bot.id]?.success}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-[#121212]/45">
                        {bot.trigger_limit !== null
                          ? `${bot.trigger_count} / ${bot.trigger_limit}`
                          : 'Unlimited'}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleBotSave(bot.id)}
                      disabled={botStatus[bot.id]?.saving}
                    >
                      {botStatus[bot.id]?.saving ? 'Saving...' : 'Save Bot'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-4 border-[#121212] bg-white shadow-[8px_8px_0px_0px_#D02020]">
        <div className="border-b-2 border-[#121212] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#121212]/45">
            Platform Request History
          </p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-[#121212]">
            Related Approval Activity
          </h2>
        </div>

        {requests.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#121212]/35">
              No platform requests for this customer yet
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border-2 border-[#121212] bg-[#F5F5F0] px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#121212]">
                        {request.platform}
                      </p>
                      <span
                        className={`inline-flex items-center border-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${requestStatusClasses(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#121212]/65">
                      Bot: {request.bot_name ?? request.bot_id}
                    </p>
                    <p className="text-sm font-medium text-[#121212]/65">
                      Requested by {request.requester_name ?? request.requested_by}
                    </p>
                  </div>

                  <div className="text-sm font-medium text-[#121212]/60">
                    <p>Created: {formatDate(request.created_at)}</p>
                    <p>Reviewed: {formatDate(request.reviewed_at)}</p>
                  </div>
                </div>

                {request.decision_note && (
                  <p className="mt-3 text-sm font-medium text-[#121212]/65">
                    Decision note: {request.decision_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
