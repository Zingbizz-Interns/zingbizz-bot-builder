'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Wifi, Instagram, ChevronDown, ChevronUp } from 'lucide-react'
import {
  validateCredentials,
  savePlatformConfig,
  deletePlatformConfig,
  getInstagramOAuthUrl,
} from '@/lib/actions/platforms'
import Button from '@/components/ui/Button'
import SessionConfig from './SessionConfig'
import PlatformRequestStatus from './PlatformRequestStatus'
import InstagramSetupGuide from './InstagramSetupGuide'
import type { PlatformConfig, PlatformConnectionRequest } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

interface InstagramFormProps {
  botId: string
  existing: PlatformConfig | null
  request: PlatformConnectionRequest | null
}

export default function InstagramForm({ botId, existing, request }: InstagramFormProps) {
  const canEdit = useCanEdit()
  const searchParams = useSearchParams()
  const router = useRouter()

  // OAuth result from redirect query params (set by /api/instagram/callback)
  const igConnected = searchParams.get('ig_connected')
  const igRequestSubmitted = searchParams.get('ig_request_submitted')
  const igError     = searchParams.get('ig_error')

  const [oauthPending, startOAuth] = useTransition()
  const [showManual, setShowManual] = useState(false)

  // Manual form state
  const [validating, setValidating]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [validated, setValidated]     = useState<{ ok: boolean; name?: string; error?: string } | null>(
    existing ? { ok: true, name: 'Connected' } : null
  )
  const [manualError, setManualError] = useState<string | null>(null)
  const [success, setSuccess]         = useState<string | null>(null)

  function handleConnectWithInstagram() {
    startOAuth(async () => {
      const url = await getInstagramOAuthUrl(botId)
      window.location.href = url
    })
  }

  async function handleValidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidating(true)
    setValidated(null)
    setManualError(null)
    setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const result = await validateCredentials(
      'instagram',
      fd.get('page_id') as string,
      fd.get('access_token') as string
    )

    setValidated(result.valid ? { ok: true, name: result.name } : { ok: false, error: result.error })
    setValidating(false)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validated?.ok) { setManualError('Validate credentials first'); return }
    setSaving(true)
    setManualError(null)
    setSuccess(null)

    const fd = new FormData(e.currentTarget)
    fd.set('platform', 'instagram')
    const result = await savePlatformConfig(botId, fd)

    if (result.error) { setManualError(result.error); setSaving(false); return }
    setSuccess(result.message ?? 'Instagram request submitted successfully.')
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Disconnect Instagram from this bot?')) return
    setDeleting(true)
    await deletePlatformConfig(botId, 'instagram')
    // Clear query params after disconnect
    router.replace(`/dashboard/bots/${botId}/platforms`)
  }

  // ── Read-only view for non-editors ───────────────────────────
  if (!canEdit) {
    return (
      <div className="space-y-4">
        <PlatformRequestStatus platform="instagram" request={request} hasLiveConfig={Boolean(existing)} />
        <div className={`flex items-center gap-2 border-2 px-4 py-3 ${existing ? 'border-[#FF6B6B] bg-[#FF6B6B]/10' : 'border-black/20 bg-[#FFFDF5]'}`}>
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
      <PlatformRequestStatus platform="instagram" request={request} hasLiveConfig={Boolean(existing)} />

      {/* ── Connected banner ──────────────────────────────────── */}
      {existing && (
        <div className="flex items-center justify-between border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-4 py-3">
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

      {/* ── OAuth success banner (from redirect) ─────────────── */}
      {igConnected && (
        <div className="flex items-center gap-2 border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2.5">
          <CheckCircle className="w-4 h-4 text-[#000000] shrink-0" strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-widest text-black">
            Connected as @{igConnected}
          </span>
        </div>
      )}

      {igRequestSubmitted && (
        <div className="flex items-center gap-2 border-2 border-[#FFD93D] bg-[#FFD93D]/12 px-3 py-2.5">
          <CheckCircle className="w-4 h-4 text-[#000000] shrink-0" strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-widest text-black">
            Approval request submitted for @{igRequestSubmitted}
          </span>
        </div>
      )}

      {/* ── OAuth error banner (from redirect) ───────────────── */}
      {igError && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B6B]">
            Instagram Error: {igError}
          </p>
        </div>
      )}

      {/* ── Setup guide (shown when not yet connected) ───────── */}
      {!existing && <InstagramSetupGuide botId={botId} />}

      {/* ── Primary: Connect with Instagram button ───────────── */}
      {!existing && (
        <button
          type="button"
          onClick={handleConnectWithInstagram}
          disabled={oauthPending}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F56040] text-white font-black uppercase tracking-widest text-sm px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Instagram className="w-4 h-4" strokeWidth={2.5} />
          {oauthPending ? 'Redirecting...' : 'Connect with Instagram'}
        </button>
      )}

      {/* ── Manual fallback toggle ────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowManual(v => !v)}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black/70 transition-colors"
      >
        {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {existing ? 'Update credentials manually' : 'Enter credentials manually instead'}
      </button>

      {/* ── Manual form (fallback) ────────────────────────────── */}
      {showManual && (
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t-2 border-black/10">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
              Instagram Business Account ID <span className="text-[#FF6B6B]">*</span>
            </label>
            <input
              name="page_id"
              required
              defaultValue={existing?.page_id ?? ''}
              placeholder="17841473521420472"
              className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors"
            />
            <p className="text-xs font-medium text-black/40 mt-1">
              Numeric IGID from the Meta webhook payload (<code className="bg-[#FFFDF5] px-1">entry.id</code>).
            </p>
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

          {validated && (
            <div className={`flex items-center gap-2 border-2 px-3 py-2.5 ${validated.ok ? 'border-[#FF6B6B] bg-[#FF6B6B]/10' : 'border-[#FF6B6B] bg-[#FF6B6B]/10'}`}>
              {validated.ok
                ? <CheckCircle className="w-4 h-4 text-[#000000] shrink-0" strokeWidth={2.5} />
                : <XCircle className="w-4 h-4 text-[#FF6B6B] shrink-0" strokeWidth={2.5} />
              }
              <span className="text-xs font-bold uppercase tracking-widest">
                {validated.ok ? `Valid — ${validated.name}` : validated.error}
              </span>
            </div>
          )}

          {manualError && (
            <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#FF6B6B]">{manualError}</p>
            </div>
          )}

          {success && (
            <div className="border-2 border-[#FFD93D] bg-[#FFD93D]/10 px-3 py-2">
              <p className="text-sm font-bold uppercase tracking-widest text-black">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
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

            <Button type="submit" variant="red" disabled={saving || !validated?.ok} className="flex-1">
              {saving ? 'Submitting...' : existing ? 'Submit Update for Approval' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
