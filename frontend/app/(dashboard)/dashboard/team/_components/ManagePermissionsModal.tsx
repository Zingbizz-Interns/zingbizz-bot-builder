'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getBotPermissions, saveBotPermissions } from '@/lib/actions/team'
import type { SubAccount, BotPermission } from '@/lib/actions/team'
import Button from '@/components/ui/Button'

interface BotOption {
  id: string
  name: string
}

interface Props {
  subAccount: SubAccount
  allBots: BotOption[]
  onClose: () => void
}

export default function ManagePermissionsModal({ subAccount, allBots, onClose }: Props) {
  const [permissions, setPermissions] = useState<Record<string, { granted: boolean; canEdit: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    getBotPermissions(subAccount.id).then(perms => {
      const map: Record<string, { granted: boolean; canEdit: boolean }> = {}
      // Init all bots as not granted
      for (const bot of allBots) map[bot.id] = { granted: false, canEdit: false }
      // Apply existing permissions
      for (const p of perms) map[p.bot_id] = { granted: true, canEdit: p.can_edit }
      setPermissions(map)
      setLoading(false)
    })
  }, [subAccount.id, allBots])

  function toggleGranted(botId: string) {
    setPermissions(prev => ({
      ...prev,
      [botId]: { granted: !prev[botId].granted, canEdit: false },
    }))
  }

  function toggleCanEdit(botId: string) {
    setPermissions(prev => ({
      ...prev,
      [botId]: { ...prev[botId], canEdit: !prev[botId].canEdit },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload: BotPermission[] = Object.entries(permissions)
      .filter(([, v]) => v.granted)
      .map(([bot_id, v]) => ({ bot_id, can_edit: v.canEdit }))

    const result = await saveBotPermissions(subAccount.id, payload)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  const grantedCount = Object.values(permissions).filter(v => v.granted).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#121212]/60" onClick={onClose} />

      <div className="relative w-full max-w-lg border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#D02020] px-6 py-4 flex items-center justify-between border-b-4 border-[#121212] shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter text-white">Manage Access</h2>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mt-0.5">{subAccount.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        {/* Column labels */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-[#121212]/40">
            <span className="flex-1">Bot</span>
            <span className="w-20 text-center">View</span>
            <span className="w-20 text-center">Edit</span>
          </div>
        </div>

        {/* Bot list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <p className="text-xs font-medium text-[#121212]/40 py-4">Loading...</p>
          ) : allBots.length === 0 ? (
            <p className="text-xs font-medium text-[#121212]/40 py-4">No bots yet. Create a bot first.</p>
          ) : (
            <div className="space-y-2">
              {allBots.map(bot => {
                const perm = permissions[bot.id] ?? { granted: false, canEdit: false }
                return (
                  <div
                    key={bot.id}
                    className={`flex items-center border-2 border-[#121212] px-4 py-3 transition-colors ${
                      perm.granted ? 'bg-white' : 'bg-[#F0F0F0]'
                    }`}
                  >
                    <span className={`flex-1 text-sm font-bold truncate ${perm.granted ? 'text-[#121212]' : 'text-[#121212]/40'}`}>
                      {bot.name}
                    </span>

                    {/* View toggle */}
                    <div className="w-20 flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleGranted(bot.id)}
                        className="flex items-center"
                        aria-label="Toggle view access"
                      >
                        <div className={`relative w-10 h-5 border-2 border-[#121212] transition-colors ${perm.granted ? 'bg-[#121212]' : 'bg-[#F0F0F0]'}`}>
                          <div className={`absolute top-[2px] w-3 h-3 transition-all duration-150 ${perm.granted ? 'left-[18px] bg-white' : 'left-[2px] bg-[#121212]/30'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Edit toggle */}
                    <div className="w-20 flex justify-center">
                      <button
                        type="button"
                        onClick={() => perm.granted && toggleCanEdit(bot.id)}
                        disabled={!perm.granted}
                        className="flex items-center disabled:opacity-30"
                        aria-label="Toggle edit access"
                      >
                        <div className={`relative w-10 h-5 border-2 border-[#121212] transition-colors ${perm.canEdit && perm.granted ? 'bg-[#1040C0]' : 'bg-[#F0F0F0]'}`}>
                          <div className={`absolute top-[2px] w-3 h-3 transition-all duration-150 ${perm.canEdit && perm.granted ? 'left-[18px] bg-white' : 'left-[2px] bg-[#121212]/30'}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t-2 border-[#121212]/10 shrink-0">
          <p className="text-xs font-medium text-[#121212]/40 mb-3">
            {grantedCount} of {allBots.length} bots granted access
          </p>
          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2 mb-3">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="red" type="button" onClick={handleSave} disabled={saving || loading} className="flex-1">
              {saving ? 'Saving...' : 'Save Access'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
