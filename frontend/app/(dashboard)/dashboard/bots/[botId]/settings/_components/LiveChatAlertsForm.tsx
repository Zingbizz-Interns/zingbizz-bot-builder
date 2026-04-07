'use client'

import { useState } from 'react'
import { saveAlertSettings, AlertSettings } from '@/lib/actions/alerts'
import Button from '@/components/ui/Button'
import { useCanEdit } from '@/lib/context/botPermission'

interface LiveChatAlertsFormProps {
  botId: string
  existing: AlertSettings
}

export default function LiveChatAlertsForm({ botId, existing }: LiveChatAlertsFormProps) {
  const canEdit = useCanEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [enabled, setEnabled] = useState(existing.enabled)
  const [thresholdMinutes, setThresholdMinutes] = useState(existing.threshold_minutes)
  const [windowWarningEnabled, setWindowWarningEnabled] = useState(existing.window_warning_enabled)
  const [windowWarningMinutes, setWindowWarningMinutes] = useState(existing.window_warning_minutes)
  const [notifyEmail, setNotifyEmail] = useState(existing.notify_email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await saveAlertSettings(botId, {
      enabled,
      threshold_minutes: thresholdMinutes,
      window_warning_enabled: windowWarningEnabled,
      window_warning_minutes: windowWarningMinutes,
      notify_email: notifyEmail,
    })

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  const thresholdHours = thresholdMinutes >= 60
    ? `${(thresholdMinutes / 60).toFixed(thresholdMinutes % 60 === 0 ? 0 : 1)} hour(s)`
    : `${thresholdMinutes} minute(s)`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Enable alerts */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]">Enable Alerts</p>
          <p className="text-xs font-medium text-[#121212]/40 mt-0.5">Receive alerts when conversations need attention</p>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setEnabled(v => !v)}
          className={`relative w-11 h-6 border-2 border-[#121212] transition-colors ${enabled ? 'bg-[#1040C0]' : 'bg-[#F0F0F0]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white border border-[#121212] transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Alert threshold */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Alert me after (minutes)
        </label>
        <input
          type="number"
          min={15}
          max={1380}
          value={thresholdMinutes}
          onChange={e => setThresholdMinutes(Number(e.target.value))}
          disabled={!canEdit || !enabled}
          className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium focus:outline-none focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {enabled && (
          <p className="text-xs font-medium text-[#121212]/40 mt-1">
            You&apos;ll be alerted if a conversation is unanswered for {thresholdHours}
          </p>
        )}
      </div>

      <div className="border-t-2 border-[#121212]/10" />

      {/* Window warning */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]">WhatsApp Window Warning</p>
          <p className="text-xs font-medium text-[#121212]/40 mt-0.5">Alert before the 24-hour reply window closes</p>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setWindowWarningEnabled(v => !v)}
          className={`relative w-11 h-6 border-2 border-[#121212] transition-colors ${windowWarningEnabled ? 'bg-[#1040C0]' : 'bg-[#F0F0F0]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white border border-[#121212] transition-all ${windowWarningEnabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Warn me when N minutes remain
        </label>
        <input
          type="number"
          min={15}
          max={1380}
          value={windowWarningMinutes}
          onChange={e => setWindowWarningMinutes(Number(e.target.value))}
          disabled={!canEdit || !windowWarningEnabled}
          className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium focus:outline-none focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="border-t-2 border-[#121212]/10" />

      {/* Email notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]">Email Notifications</p>
          <p className="text-xs font-medium text-[#121212]/40 mt-0.5">Receive alert emails at your account email address</p>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setNotifyEmail(v => !v)}
          className={`relative w-11 h-6 border-2 border-[#121212] transition-colors ${notifyEmail ? 'bg-[#1040C0]' : 'bg-[#F0F0F0]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white border border-[#121212] transition-all ${notifyEmail ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      {error && (
        <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#D02020]">{error}</p>
        </div>
      )}

      {success && (
        <div className="border-2 border-[#1040C0] bg-[#1040C0]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]">Saved successfully</p>
        </div>
      )}

      {canEdit && (
        <Button type="submit" variant="blue" disabled={saving}>
          {saving ? 'Saving...' : 'Save Alert Settings'}
        </Button>
      )}
    </form>
  )
}
