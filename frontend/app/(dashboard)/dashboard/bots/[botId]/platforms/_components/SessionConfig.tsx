'use client'

import { useState } from 'react'
import type { PlatformConfig } from '@/types/database'

const EXPIRY_OPTIONS = [
  { label: '5 min',  ms: 300000 },
  { label: '10 min', ms: 600000 },
  { label: '30 min', ms: 1800000 },
  { label: '1 hour', ms: 3600000 },
]

const WARNING_OPTIONS = [
  { label: '1 min', ms: 60000 },
  { label: '2 min', ms: 120000 },
  { label: '5 min', ms: 300000 },
]

const inputClass =
  'w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors'
const selectClass =
  'w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-bold focus:outline-none focus:bg-white transition-colors cursor-pointer'

interface SessionConfigProps {
  existing: PlatformConfig | null
}

export default function SessionConfig({ existing }: SessionConfigProps) {
  const defaultExpiry  = existing?.session_expiry_ms ?? 600000
  const defaultWarning = existing?.warning_time_ms ?? 120000
  const defaultMsg     = existing?.warning_message ?? 'Your session will expire soon. Please respond to continue.'

  const [expiryPreset,  setExpiryPreset]  = useState<number>(EXPIRY_OPTIONS.some(o => o.ms === defaultExpiry)  ? defaultExpiry  : -1)
  const [expiryCustom,  setExpiryCustom]  = useState<string>(EXPIRY_OPTIONS.some(o => o.ms === defaultExpiry)  ? '' : String(defaultExpiry))
  const [warningPreset, setWarningPreset] = useState<number>(WARNING_OPTIONS.some(o => o.ms === defaultWarning) ? defaultWarning : -1)
  const [warningCustom, setWarningCustom] = useState<string>(WARNING_OPTIONS.some(o => o.ms === defaultWarning) ? '' : String(defaultWarning))

  const expiryMs  = expiryPreset  === -1 ? (parseInt(expiryCustom)  || defaultExpiry)  : expiryPreset
  const warningMs = warningPreset === -1 ? (parseInt(warningCustom) || defaultWarning) : warningPreset

  return (
    <div className="pt-4 mt-4 border-t-2 border-black/10 space-y-4">
      <p className="text-xs font-black uppercase tracking-widest text-black/40">Session Config</p>

      {/* Hidden inputs carry computed values into the form submit */}
      <input type="hidden" name="session_expiry_ms" value={expiryMs} />
      <input type="hidden" name="warning_time_ms"   value={warningMs} />

      <div className="grid grid-cols-2 gap-4">
        {/* Session Expiry */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
            Session Expiry
          </label>
          <select
            className={selectClass}
            value={expiryPreset}
            onChange={e => setExpiryPreset(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map(o => (
              <option key={o.ms} value={o.ms}>{o.label}</option>
            ))}
            <option value={-1}>Custom</option>
          </select>
          {expiryPreset === -1 && (
            <input
              type="number"
              placeholder="milliseconds e.g. 900000"
              value={expiryCustom}
              onChange={e => setExpiryCustom(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          )}
        </div>

        {/* Warning Time */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
            Warn Before Expiry
          </label>
          <select
            className={selectClass}
            value={warningPreset}
            onChange={e => setWarningPreset(Number(e.target.value))}
          >
            {WARNING_OPTIONS.map(o => (
              <option key={o.ms} value={o.ms}>{o.label}</option>
            ))}
            <option value={-1}>Custom</option>
          </select>
          {warningPreset === -1 && (
            <input
              type="number"
              placeholder="milliseconds e.g. 60000"
              value={warningCustom}
              onChange={e => setWarningCustom(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          )}
        </div>
      </div>

      {/* Warning Message */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Warning Message
        </label>
        <textarea
          name="warning_message"
          rows={2}
          defaultValue={defaultMsg}
          placeholder="Your session will expire soon..."
          className={`${inputClass} resize-none`}
        />
        <p className="text-xs font-medium text-black/40 mt-1">
          Sent to the user before their session expires.
        </p>
      </div>
    </div>
  )
}
