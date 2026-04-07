'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { saveBotLiveChatSettings } from '@/lib/actions/bots'
import { useCanEdit } from '@/lib/context/botPermission'

interface Props {
  botId: string
  existing: {
    escalation_keywords: string[]
    takeover_message: string
    takeover_message_enabled: boolean
  }
}

function normalizeKeywords(input: string) {
  return input
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

export default function LiveChatConfigForm({ botId, existing }: Props) {
  const canEdit = useCanEdit()
  const [keywordsText, setKeywordsText] = useState(existing.escalation_keywords.join(', '))
  const [takeoverEnabled, setTakeoverEnabled] = useState(existing.takeover_message_enabled)
  const [takeoverMessage, setTakeoverMessage] = useState(existing.takeover_message)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const keywordCount = useMemo(() => normalizeKeywords(keywordsText).length, [keywordsText])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const escalationKeywords = normalizeKeywords(keywordsText)
    if (!escalationKeywords.length) {
      setError('Add at least one escalation keyword.')
      setSaving(false)
      return
    }

    const result = await saveBotLiveChatSettings(botId, {
      escalationKeywords,
      takeoverMessage,
      takeoverMessageEnabled: takeoverEnabled,
    })

    if (result.error) setError(result.error)
    else setSuccess(true)
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Escalation Keywords
        </label>
        <textarea
          rows={3}
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          readOnly={!canEdit}
          placeholder="human, agent, support, talk to, real person"
          className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
        />
        <p className="text-xs font-medium text-[#121212]/40 mt-1">
          Comma-separated list. Customers using one of these phrases will be flagged for human attention. {keywordCount} keyword{keywordCount === 1 ? '' : 's'} configured.
        </p>
      </div>

      <div className="border-t-2 border-[#121212]/10" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]">Takeover Acknowledgement</p>
          <p className="text-xs font-medium text-[#121212]/40 mt-0.5">
            Send a message to the customer when your team takes over a conversation.
          </p>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setTakeoverEnabled((value) => !value)}
          className={`relative w-11 h-6 border-2 border-[#121212] transition-colors ${takeoverEnabled ? 'bg-[#107040]' : 'bg-[#F0F0F0]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white border border-[#121212] transition-all ${takeoverEnabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
          Takeover Message
        </label>
        <textarea
          rows={3}
          value={takeoverMessage}
          onChange={(e) => setTakeoverMessage(e.target.value)}
          readOnly={!canEdit}
          disabled={!takeoverEnabled}
          maxLength={500}
          placeholder="You're now connected with our team. We'll be right with you."
          className={`${inputClass} resize-none disabled:opacity-50 disabled:cursor-not-allowed read-only:opacity-60 read-only:cursor-not-allowed`}
        />
        <div className="flex items-center justify-between mt-1 text-xs font-medium text-[#121212]/40">
          <span>{takeoverEnabled ? 'This message is sent automatically on takeover.' : 'Takeover message is currently disabled.'}</span>
          <span className="font-mono">{takeoverMessage.length}/500</span>
        </div>
      </div>

      {error && (
        <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
          <p className="text-sm font-medium text-[#D02020]">{error}</p>
        </div>
      )}

      {success && (
        <div className="border-2 border-[#1040C0] bg-[#1040C0]/10 px-3 py-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]">Live chat settings saved</p>
        </div>
      )}

      {canEdit && (
        <Button type="submit" variant="blue" disabled={saving}>
          {saving ? 'Saving...' : 'Save Live Chat Settings'}
        </Button>
      )}
    </form>
  )
}
