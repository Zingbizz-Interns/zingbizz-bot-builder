'use client'

import { useState } from 'react'
import { updateBot } from '@/lib/actions/bots'
import Button from '@/components/ui/Button'
import { useCanEdit } from '@/lib/context/botPermission'

interface EditBotFormProps {
  botId: string
  name: string
  fallbackMessage: string
}

export default function EditBotForm({ botId, name, fallbackMessage }: EditBotFormProps) {
  const canEdit = useCanEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updateBot(botId, new FormData(e.currentTarget))
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Bot Name <span className="text-[#FF6B6B]">*</span>
        </label>
        <input
          name="name"
          required
          readOnly={!canEdit}
          defaultValue={name}
          placeholder="e.g. Admissions Bot"
          className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors read-only:opacity-60 read-only:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#000000] mb-1.5">
          Fallback Message
        </label>
        <textarea
          name="fallback_message"
          rows={3}
          readOnly={!canEdit}
          defaultValue={fallbackMessage}
          placeholder="Message shown when no trigger matches..."
          className="w-full px-3 py-2.5 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors resize-none read-only:opacity-60 read-only:cursor-not-allowed"
        />
        <p className="text-xs font-medium text-black/40 mt-1">
          Sent when no trigger matches the user&apos;s message.
        </p>
      </div>

      {error && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#FF6B6B]">{error}</p>
        </div>
      )}

      {success && (
        <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black">Saved successfully</p>
        </div>
      )}

      {canEdit && (
        <Button type="submit" variant="yellow" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      )}
    </form>
  )
}
