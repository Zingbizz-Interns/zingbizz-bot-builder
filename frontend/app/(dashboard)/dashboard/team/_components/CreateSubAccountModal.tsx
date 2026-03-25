'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createSubAccount } from '@/lib/actions/team'
import Button from '@/components/ui/Button'

interface Props {
  onClose: () => void
}

const inputClass = 'w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors'

export default function CreateSubAccountModal({ onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await createSubAccount(new FormData(e.currentTarget))
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#121212]/60" onClick={onClose} />

      <div className="relative w-full max-w-md border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white z-10">
        {/* Header */}
        <div className="bg-[#1040C0] px-6 py-4 flex items-center justify-between border-b-4 border-[#121212]">
          <h2 className="text-lg font-black uppercase tracking-tighter text-white">New Team Member</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Full Name <span className="text-[#D02020]">*</span>
            </label>
            <input name="name" required placeholder="e.g. Jane Doe" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Email <span className="text-[#D02020]">*</span>
            </label>
            <input name="email" type="email" required placeholder="jane@example.com" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Password <span className="text-[#D02020]">*</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className={inputClass}
            />
            <p className="text-xs font-medium text-[#121212]/40 mt-1">
              Share this password with the team member. They can reset it via login.
            </p>
          </div>

          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="blue" type="submit" disabled={saving} className="flex-1">
              {saving ? 'Creating...' : 'Create Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
