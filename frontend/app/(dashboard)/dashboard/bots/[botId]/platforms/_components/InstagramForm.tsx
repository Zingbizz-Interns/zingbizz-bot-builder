'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, LogIn } from 'lucide-react'
import { deletePlatformConfig, savePlatformConfig } from '@/lib/actions/platforms'
import { useState } from 'react'
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const justConnected = searchParams.get('ig_connected') === '1'
  const oauthError = searchParams.get('error')

  const oauthErrors: Record<string, string> = {
    oauth_denied: 'You cancelled the Facebook login. Please try again.',
    oauth_expired: 'The login session expired. Please try again.',
    no_pages: 'No Facebook Pages found on your account. You need at least one Page linked to an Instagram Business Account.',
    no_instagram: 'No Instagram Business Account is linked to your Facebook Page. Connect one in Meta Business Suite first.',
    db_error: 'Failed to save your credentials. Please try again.',
    oauth_failed: 'Something went wrong during login. Please try again.',
  }

  async function handleDelete() {
    if (!confirm('Disconnect Instagram from this bot?')) return
    setDeleting(true)
    await deletePlatformConfig(botId, 'instagram')
    router.refresh()
  }

  async function handleSaveSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    const fd = new FormData(e.currentTarget)
    fd.set('platform', 'instagram')
    // Preserve the existing credentials — only updating session fields
    fd.set('page_id', existing!.page_id ?? '')
    fd.set('access_token', existing!.access_token)
    fd.set('verify_token', existing!.verify_token)
    const result = await savePlatformConfig(botId, fd)
    if (!result.error) setSaveSuccess(true)
    setSaving(false)
  }

  const connectUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/instagram?botId=${botId}`

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
    <div className="space-y-4">
      {/* Connected banner */}
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

      {/* Just-connected success banner (shown once on redirect) */}
      {justConnected && (
        <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]">Instagram connected successfully</p>
        </div>
      )}

      {/* OAuth error banner */}
      {oauthError && oauthErrors[oauthError] && (
        <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#D02020]">{oauthErrors[oauthError]}</p>
        </div>
      )}

      {/* Session config — only shown when connected */}
      {existing && (
        <form onSubmit={handleSaveSession} className="space-y-4">
          <SessionConfig existing={existing} />

          {saveSuccess && (
            <div className="border-2 border-[#F0C020] bg-[#F0C020]/10 px-3 py-2">
              <p className="text-sm font-bold uppercase tracking-widest text-[#121212]">Session settings saved</p>
            </div>
          )}

          <Button type="submit" variant="outline" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Session Settings'}
          </Button>
        </form>
      )}

      {/* Connect / Reconnect button */}
      <a href={connectUrl}>
        <Button type="button" variant={existing ? 'outline' : 'red'} className="w-full">
          <LogIn className="w-4 h-4" strokeWidth={2.5} />
          {existing ? 'Reconnect Instagram' : 'Connect with Facebook'}
        </Button>
      </a>

      {!existing && (
        <p className="text-xs font-medium text-[#121212]/40">
          You&apos;ll be redirected to Facebook to authorize access. Your Instagram account must be a
          Business or Creator account linked to a Facebook Page.
        </p>
      )}
    </div>
  )
}
