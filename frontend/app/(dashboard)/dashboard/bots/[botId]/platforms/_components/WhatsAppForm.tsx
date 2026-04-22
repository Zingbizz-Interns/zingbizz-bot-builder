'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Wifi } from 'lucide-react'
import { validateCredentials, savePlatformConfig, deletePlatformConfig } from '@/lib/actions/platforms'
import Button from '@/components/ui/Button'
import SessionConfig from './SessionConfig'
import PlatformRequestStatus from './PlatformRequestStatus'
import WhatsAppSetupGuide from './WhatsAppSetupGuide'
import type { PlatformConfig, PlatformConnectionRequest } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

interface WhatsAppFormProps {
  botId: string
  existing: PlatformConfig | null
  request: PlatformConnectionRequest | null
}

export default function WhatsAppForm({ botId, existing, request }: WhatsAppFormProps) {
  const canEdit = useCanEdit()
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [validated, setValidated] = useState<{ ok: boolean; name?: string; error?: string } | null>(
    existing ? { ok: true, name: 'Connected' } : null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleValidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidating(true)
    setValidated(null)
    setError(null)
    setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const result = await validateCredentials(
      'whatsapp',
      fd.get('phone_number_id') as string,
      fd.get('access_token') as string
    )

    setValidated(result.valid ? { ok: true, name: result.name } : { ok: false, error: result.error })
    setValidating(false)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validated?.ok) { setError('Validate credentials first'); return }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const fd = new FormData(e.currentTarget)
    fd.set('platform', 'whatsapp')
    const result = await savePlatformConfig(botId, fd)

    if (result.error) { setError(result.error); setSaving(false); return }
    setSuccess(result.message ?? 'WhatsApp request submitted successfully.')
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Disconnect WhatsApp from this bot?')) return
    setDeleting(true)
    await deletePlatformConfig(botId, 'whatsapp')
  }

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <PlatformRequestStatus platform="whatsapp" request={request} hasLiveConfig={Boolean(existing)} />
        <div className={`flex items-center gap-2 border-2 px-4 py-3 ${existing ? 'border-[#FFD93D] bg-[#FFD93D]/10' : 'border-black/20 bg-[#FFFDF5]'}`}>
          {existing
            ? <CheckCircle className="w-4 h-4 text-black" strokeWidth={2.5} />
            : <XCircle className="w-4 h-4 text-black/30" strokeWidth={2.5} />
          }
          <span className="text-xs font-bold uppercase tracking-widest text-black">
            {existing ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PlatformRequestStatus platform="whatsapp" request={request} hasLiveConfig={Boolean(existing)} />

      {/* ── Setup guide (shown when not yet connected) ───────── */}
      {!existing && <WhatsAppSetupGuide botId={botId} />}

    <form onSubmit={handleSave} className="space-y-4">
      {/* Connected indicator */}
      {existing && (
        <div className="flex items-center justify-between border-2 border-[#FFD93D] bg-[#FFD93D]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-black" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Connected</span>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-bold uppercase tracking-widest text-[#FF6B6B] hover:underline disabled:opacity-50"
          >
            {deleting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
            Phone Number ID <span className="text-[#FF6B6B]">*</span>
          </label>
          <input
            name="phone_number_id"
            required
            defaultValue={existing?.phone_number_id ?? ''}
            placeholder="1234567890"
            className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
            WABA ID <span className="text-[#FF6B6B]">*</span>
          </label>
          <input
            name="waba_id"
            required
            defaultValue={existing?.waba_id ?? ''}
            placeholder="9876543210"
            className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Access Token <span className="text-[#FF6B6B]">*</span>
        </label>
        <input
          name="access_token"
          required
          defaultValue={existing?.access_token ?? ''}
          placeholder="EAAWp55eJj5MB..."
          type="password"
          className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Webhook Verify Token <span className="text-[#FF6B6B]">*</span>
        </label>
        <input
          name="verify_token"
          required
          defaultValue={existing?.verify_token ?? ''}
          placeholder="my_secret_token"
          className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors"
        />
      </div>

      <SessionConfig existing={existing} />

      {/* Validation feedback */}
      {validated && (
        <div className={`flex items-center gap-2 border-2 px-3 py-2.5 ${validated.ok ? 'border-[#FFD93D] bg-[#FFD93D]/10' : 'border-[#FF6B6B] bg-[#FF6B6B]/10'}`}>
          {validated.ok
            ? <CheckCircle className="w-4 h-4 text-[#000000] shrink-0" strokeWidth={2.5} />
            : <XCircle className="w-4 h-4 text-[#FF6B6B] shrink-0" strokeWidth={2.5} />
          }
          <span className="text-xs font-bold uppercase tracking-widest">
            {validated.ok ? `Valid — ${validated.name}` : validated.error}
          </span>
        </div>
      )}

      {error && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#FF6B6B]">{error}</p>
        </div>
      )}

      {success && (
        <div className="border-2 border-[#FFD93D] bg-[#FFD93D]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black">{success}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {/* Validate first */}
        <Button
          type="button"
          variant="outline"
          disabled={validating}
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest('form') as HTMLFormElement
            handleValidate({ preventDefault: () => {}, currentTarget: form } as React.FormEvent<HTMLFormElement>)
          }}
          className="flex-1"
        >
          <Wifi className="w-4 h-4" strokeWidth={2.5} />
          {validating ? 'Validating...' : 'Validate'}
        </Button>

        <Button type="submit" variant="yellow" disabled={saving || !validated?.ok} className="flex-1">
          {saving ? 'Submitting...' : existing ? 'Submit Update for Approval' : 'Submit for Approval'}
        </Button>
      </div>
    </form>
    </div>
  )
}
