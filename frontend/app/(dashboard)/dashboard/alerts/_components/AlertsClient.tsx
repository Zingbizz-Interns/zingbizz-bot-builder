'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAlerts, markAlertRead, type Alert, type GetAlertsFilters } from '@/lib/actions/alerts'

interface AlertsClientProps {
  initialAlerts: Alert[]
  initialTotal: number
  bots: { id: string; name: string }[]
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  response_threshold: 'Response Threshold',
  window_closing: 'Window Closing',
  agent_silent: 'Agent Silent',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AlertsClient({ initialAlerts, initialTotal, bots }: AlertsClientProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const [filterBotId, setFilterBotId] = useState('')
  const [filterType, setFilterType] = useState('')

  const limit = 30

  async function applyFilters(newBotId: string, newType: string, newPage: number) {
    setLoading(true)
    const filters: GetAlertsFilters = { page: newPage, limit }
    if (newBotId) filters.botId = newBotId
    if (newType) filters.alertType = newType

    const result = await getAlerts(filters)
    setAlerts(result.alerts)
    setTotal(result.total)
    setPage(newPage)
    setLoading(false)
  }

  async function handleBotFilter(value: string) {
    setFilterBotId(value)
    await applyFilters(value, filterType, 0)
  }

  async function handleTypeFilter(value: string) {
    setFilterType(value)
    await applyFilters(filterBotId, value, 0)
  }

  async function handleViewConversation(alert: Alert) {
    if (!alert.is_read) {
      await markAlertRead(alert.id)
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a))
    }
    router.push(`/dashboard/inbox?conversation=${alert.conversation_id}`)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterBotId}
          onChange={e => handleBotFilter(e.target.value)}
          className="px-3 py-2 border-2 border-[#121212] bg-[#F0F0F0] text-xs font-bold uppercase tracking-widest focus:outline-none focus:bg-white"
        >
          <option value="">All Bots</option>
          {bots.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={e => handleTypeFilter(e.target.value)}
          className="px-3 py-2 border-2 border-[#121212] bg-[#F0F0F0] text-xs font-bold uppercase tracking-widest focus:outline-none focus:bg-white"
        >
          <option value="">All Types</option>
          <option value="response_threshold">Response Threshold</option>
          <option value="window_closing">Window Closing</option>
          <option value="agent_silent">Agent Silent</option>
        </select>

        <span className="ml-auto text-xs font-medium text-[#121212]/40 self-center">
          {total} alert{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40">Loading...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-2xl font-black uppercase tracking-tighter text-[#121212]/20 mb-2">No Alerts</p>
            <p className="text-xs font-medium text-[#121212]/40">Alerts will appear here when conversations need attention.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-4 border-[#121212] bg-[#F0F0F0]">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Bot</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Customer</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Triggered</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#121212]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#121212]/10">
              {alerts.map(alert => (
                <tr
                  key={alert.id}
                  className={`transition-colors ${!alert.is_read ? 'bg-[#1040C0]/5' : 'hover:bg-[#F0F0F0]/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {alert.alert_type === 'window_closing' ? '⚠️' : '⏱'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-2 ${
                        alert.alert_type === 'window_closing'
                          ? 'border-[#D02020] text-[#D02020]'
                          : alert.alert_type === 'agent_silent'
                          ? 'border-[#F0C020] text-[#121212]'
                          : 'border-[#1040C0] text-[#1040C0]'
                      }`}>
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-[#121212]">{alert.bot_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[#121212]/70">{alert.sender_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[#121212]/50">{timeAgo(alert.triggered_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-2 ${
                      alert.is_read
                        ? 'border-[#121212]/20 text-[#121212]/40'
                        : 'border-[#1040C0] text-[#1040C0] bg-[#1040C0]/10'
                    }`}>
                      {alert.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewConversation(alert)}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-2 border-[#121212] bg-white hover:bg-[#121212] hover:text-white transition-colors shadow-[2px_2px_0px_0px_#121212] hover:shadow-none"
                    >
                      View Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyFilters(filterBotId, filterType, page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 border-2 border-[#121212] text-xs font-bold uppercase tracking-widest disabled:opacity-30 hover:bg-[#121212] hover:text-white transition-colors"
          >
            Prev
          </button>
          <span className="text-xs font-medium text-[#121212]/40">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => applyFilters(filterBotId, filterType, page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1.5 border-2 border-[#121212] text-xs font-bold uppercase tracking-widest disabled:opacity-30 hover:bg-[#121212] hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
