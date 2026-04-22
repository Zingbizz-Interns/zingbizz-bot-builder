'use client'

import { useState } from 'react'
import { saveBusinessHours, type BusinessHours } from '@/lib/actions/businessHours'
import Button from '@/components/ui/Button'
import { useCanEdit } from '@/lib/context/botPermission'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
]

type DayKey = typeof DAYS[number]['key']

interface DayState {
  enabled: boolean
  start: string
  end: string
}

interface BusinessHoursFormProps {
  botId: string
  existing: BusinessHours | null
}

export default function BusinessHoursForm({ botId, existing }: BusinessHoursFormProps) {
  const canEdit = useCanEdit()
  const [timezone, setTimezone] = useState(existing?.timezone ?? 'UTC')
  const [outsideMsg, setOutsideMsg] = useState(
    existing?.outside_hours_message ?? 'Sorry, we are currently outside business hours.'
  )

  const [days, setDays] = useState<Record<DayKey, DayState>>(() => {
    const init: Partial<Record<DayKey, DayState>> = {}
    for (const { key } of DAYS) {
      const start = existing?.[`${key}_start` as keyof BusinessHours] as string | null
      const end = existing?.[`${key}_end` as keyof BusinessHours] as string | null
      init[key] = {
        enabled: !!(start && end),
        start: start?.slice(0, 5) ?? '09:00',
        end: end?.slice(0, 5) ?? '17:00',
      }
    }
    return init as Record<DayKey, DayState>
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function setDay(key: DayKey, patch: Partial<DayState>) {
    setDays(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData()
    fd.set('timezone', timezone)
    fd.set('outside_hours_message', outsideMsg)
    for (const { key } of DAYS) {
      const d = days[key]
      fd.set(`${key}_enabled`, String(d.enabled))
      fd.set(`${key}_start`, d.start)
      fd.set(`${key}_end`, d.end)
    }

    const result = await saveBusinessHours(botId, fd)
    if (result.error) setError(result.error)
    else setSuccess(true)
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Timezone */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          disabled={!canEdit}
          className={`${inputClass} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Days */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-2">
          Operating Hours
        </label>
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const d = days[key]
            return (
              <div key={key} className="flex items-center gap-3 border-4 border-black px-3 py-2 bg-[#FFFDF5]">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => canEdit && setDay(key, { enabled: !d.enabled })}
                  disabled={!canEdit}
                  className={`w-9 h-5 rounded-full border-4 border-black flex items-center transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                    d.enabled ? 'bg-black justify-end' : 'bg-white justify-start'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mx-0.5 ${d.enabled ? 'bg-white' : 'bg-black'}`} />
                </button>

                {/* Day name */}
                <span className={`text-xs font-black uppercase tracking-widest w-24 shrink-0 ${d.enabled ? 'text-black' : 'text-black/30'}`}>
                  {label}
                </span>

                {/* Time pickers */}
                {d.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={d.start}
                      onChange={e => setDay(key, { start: e.target.value })}
                      className="px-2 py-1 border-4 border-black bg-white text-xs font-bold focus:outline-none"
                    />
                    <span className="text-xs font-bold text-black/40">to</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={e => setDay(key, { end: e.target.value })}
                      className="px-2 py-1 border-4 border-black bg-white text-xs font-bold focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs font-medium text-black/30 flex-1">Closed</span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs font-medium text-black/40 mt-1.5">
          Toggle days on/off. When all days are off, business hours are not enforced.
        </p>
      </div>

      {/* Outside hours message */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Outside Hours Message
        </label>
        <textarea
          value={outsideMsg}
          onChange={e => setOutsideMsg(e.target.value)}
          readOnly={!canEdit}
          rows={2}
          placeholder="Message sent when user messages outside business hours..."
          className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
        />
      </div>

      {error && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#FF6B6B]">{error}</p>
        </div>
      )}
      {success && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black">Business hours saved</p>
        </div>
      )}

      {canEdit && (
        <Button type="submit" variant="yellow" disabled={saving}>
          {saving ? 'Saving...' : 'Save Business Hours'}
        </Button>
      )}
    </form>
  )
}
