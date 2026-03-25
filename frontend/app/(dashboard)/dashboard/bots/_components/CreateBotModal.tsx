'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createBot } from '@/lib/actions/bots'
import Button from '@/components/ui/Button'

export default function CreateBotModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createBot(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#121212]/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white z-10">
        {/* Header */}
        <div className="bg-[#1040C0] px-6 py-4 flex items-center justify-between border-b-4 border-[#121212]">
          <h2 className="text-lg font-black uppercase tracking-tighter text-white">New Bot</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Bot Name
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Admissions Bot"
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Fallback Message
            </label>
            <textarea
              name="fallback_message"
              rows={3}
              placeholder="Message shown when no trigger matches..."
              defaultValue="Sorry, I didn't understand that. Please try again."
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="blue" type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Bot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
