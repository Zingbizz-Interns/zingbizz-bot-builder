'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Wifi } from 'lucide-react'
import { validateCredentials, savePlatformConfig, deletePlatformConfig } from '@/lib/actions/platforms'
import Button from '@/components/ui/Button'
import SessionConfig from './SessionConfig'
import type { PlatformConfig } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

interface InstagramFormProps {
  botId: string
  existing: PlatformConfig | null
}

export default function InstagramForm({ botId, existing }: InstagramFormProps) {
  const canEdit = useCanEdit()
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [validated, setValidated] = useState<{ ok: boolean; name?: string; error?: string } | null>(
    existing ? { ok: true, name: 'Connected' } : null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleValidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidating(true)
    setValidated(null)
    setError(null)

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
    if (!validated?.ok) { setError('Validate credentials first'); return }
    setSaving(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    fd.set('platform', 'instagram')
    const result = await savePlatformConfig(botId, fd)

    if (result.error) { setError(result.error); setSaving(false); return }
    setSuccess(true)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Disconnect Instagram from this bot?')) return
    setDeleting(true)
    await deletePlatformConfig(botId, 'instagram')
  }

  if (!canEdit) {
    return (
      <div className={`flex items-center gap-2 border-2 px-4 py-3 ${existing ? 'border-[#D02020] bg-[#D02020]/10' : 'border-[#121212]/20 bg-[#F0F0F0]'}`}>
        {existing
          ? <CheckCircle className="w-4 h-4 text-[#121212]" strokeWidth={2.5} />
          : <XCircle className="w-4 h-4 text-[#121212]/30" strokeWidth={2.5} />
        }
        <span className="text-xs font-bold uppercase tracking-widest text-[#121212]">
          {existing ? 'Connected' : 'Not connected'}
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {existing && (
        <div className="flex items-center justify-between border-2 border-[#D02020] bg-[#D02020]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#121212]" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-widest text-[#121212]">Connected</span>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-bold uppercase tracking-widest text-[#D02020] hover:underline disabled:opacity-50"
          >
            {deleting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Instagram Business Account ID <span className="text-[#D02020]">*</span>
        </label>
        <input
          name="page_id"
          required
          defaultValue={existing?.page_id ?? ''}
          placeholder="17841473521420472"
          className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors"
        />
        <p className="text-xs font-medium text-[#121212]/40 mt-1">
          This is your IGID — the numeric ID from the Meta webhook payload (<code className="bg-[#F0F0F0] px-1">entry.id</code>).
          Find it in Meta Business Suite → Settings → Instagram Accounts, or via:
          <code className="bg-[#F0F0F0] px-1 ml-1">GET /me?fields=instagram_business_account</code>
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Access Token <span className="text-[#D02020]">*</span>
        </label>
        <input
          name="access_token"
          required
          defaultValue={existing?.access_token ?? ''}
          placeholder="EAAWp55eJj5MB..."
          type="password"
          className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Webhook Verify Token <span className="text-[#D02020]">*</span>
        </label>
        <input
          name="verify_token"
          required
          defaultValue={existing?.verify_token ?? ''}
          placeholder="my_secret_token"
          className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors"
        />
      </div>

      <SessionConfig existing={existing} />

      {validated && (
        <div className={`flex items-center gap-2 border-2 px-3 py-2.5 ${validated.ok ? 'border-[#D02020] bg-[#D02020]/10' : 'border-[#D02020] bg-[#D02020]/10'}`}>
          {validated.ok
            ? <CheckCircle className="w-4 h-4 text-[#121212] shrink-0" strokeWidth={2.5} />
            : <XCircle className="w-4 h-4 text-[#D02020] shrink-0" strokeWidth={2.5} />
          }
          <span className="text-xs font-bold uppercase tracking-widest">
            {validated.ok ? `Valid — ${validated.name}` : validated.error}
          </span>
        </div>
      )}

      {error && (
        <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#D02020]">{error}</p>
        </div>
      )}

      {success && (
        <div className="border-2 border-[#F0C020] bg-[#F0C020]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]">Saved successfully</p>
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
          {saving ? 'Saving...' : existing ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
