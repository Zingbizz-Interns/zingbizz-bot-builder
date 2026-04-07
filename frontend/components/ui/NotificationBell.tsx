'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markAllAlertsRead, markAlertRead } from '@/lib/actions/alerts'
import type { Alert } from '@/lib/actions/alerts'

interface NotificationBellProps {
  botIds: string[]
}

interface AlertRow extends Omit<Alert, 'bot_name' | 'sender_id'> {
  bots?: { name?: string | null } | null
  conversations?: { sender_id?: string | null } | null
}

const ALERT_LABELS: Record<string, string> = {
  response_threshold: 'Customer waiting',
  window_closing: 'Window closing',
  agent_silent: 'Agent silent',
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

export default function NotificationBell({ botIds }: NotificationBellProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const botIdsKey = useMemo(() => botIds.join(','), [botIds])
  const stableBotIds = useMemo(() => (botIdsKey ? botIdsKey.split(',') : []), [botIdsKey])
  const hasBots = stableBotIds.length > 0

  const fetchAlerts = useCallback(async () => {
    if (!stableBotIds.length) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('alerts')
      .select('*, bots!inner(name), conversations!inner(sender_id)')
      .in('bot_id', stableBotIds)
      .order('triggered_at', { ascending: false })
      .limit(20)

    if (error || !data) return

    const mapped: Alert[] = (data as AlertRow[]).map((row) => ({
      ...row,
      bot_name: row.bots?.name ?? '',
      sender_id: row.conversations?.sender_id ?? '',
    }))

    setAlerts(mapped)
    setUnreadCount(mapped.filter(a => !a.is_read).length)
  }, [stableBotIds])

  useEffect(() => {
    if (!hasBots) return
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60_000)
    return () => clearInterval(interval)
  }, [hasBots, fetchAlerts])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    setOpen(v => !v)
    // Mark all read when dropdown opens
    if (!open && unreadCount > 0) {
      await markAllAlertsRead(stableBotIds)
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      setUnreadCount(0)
    }
  }

  async function handleAlertClick(alert: Alert) {
    if (!alert.is_read) {
      await markAlertRead(alert.id)
    }
    setOpen(false)
    router.push(`/dashboard/inbox?conversation=${alert.conversation_id}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 border-transparent text-white/60 hover:text-white hover:border-white/20"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 shrink-0" strokeWidth={2} />
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#D02020] text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-80 bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#121212]">
            <p className="text-xs font-black uppercase tracking-widest text-[#121212]">Notifications</p>
            <button
              onClick={async () => {
                await markAllAlertsRead(stableBotIds)
                setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
                setUnreadCount(0)
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-[#1040C0] hover:underline"
            >
              Mark all read
            </button>
          </div>

          {/* Alert list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#121212]/10">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs font-medium text-[#121212]/40">No notifications yet</p>
              </div>
            ) : (
              alerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#F0F0F0] transition-colors border-l-4 ${
                    !alert.is_read ? 'border-[#1040C0] bg-[#1040C0]/5' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5 shrink-0">
                      {alert.alert_type === 'window_closing' ? '⚠️' : '⏱'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#121212] truncate">
                        {ALERT_LABELS[alert.alert_type] ?? alert.alert_type} — {alert.bot_name}
                      </p>
                      <p className="text-xs font-medium text-[#121212]/60 truncate mt-0.5">
                        {alert.sender_id}
                      </p>
                      <p className="text-[10px] font-medium text-[#121212]/30 mt-0.5">
                        {timeAgo(alert.triggered_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-[#121212] px-4 py-2.5">
            <Link
              href="/dashboard/alerts"
              onClick={() => setOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-[#1040C0] hover:underline"
            >
              View all alerts →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
