'use client'

import { useState } from 'react'
import { Trash2, Settings2, Plus, ShieldCheck, Eye } from 'lucide-react'
import { deleteSubAccount } from '@/lib/actions/team'
import type { SubAccount } from '@/lib/actions/team'
import Button from '@/components/ui/Button'
import CreateSubAccountModal from './CreateSubAccountModal'
import ManagePermissionsModal from './ManagePermissionsModal'

interface BotOption { id: string; name: string }

interface Props {
  subAccounts: SubAccount[]
  allBots: BotOption[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TeamList({ subAccounts, allBots }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [managing, setManaging] = useState<SubAccount | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this team member? They will lose all access immediately.')) return
    setDeletingId(id)
    await deleteSubAccount(id)
    setDeletingId(null)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40">
          {subAccounts.length === 0 ? 'No members yet' : `${subAccounts.length} member${subAccounts.length !== 1 ? 's' : ''}`}
        </p>
        <Button variant="blue" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={3} />
          Add Member
        </Button>
      </div>

      {/* Empty state */}
      {subAccounts.length === 0 && (
        <div className="border-4 border-dashed border-[#121212] p-16 text-center">
          <p className="font-black uppercase tracking-tighter text-[#121212]/30 text-lg">No team members</p>
          <p className="text-xs font-medium text-[#121212]/30 mt-2">
            Add a member and assign which bots they can view or edit.
          </p>
        </div>
      )}

      {/* Table */}
      {subAccounts.length > 0 && (
        <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#121212] text-white">
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest">Name</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest">Email</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest">Bot Access</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest">Added</th>
                <th className="px-5 py-3 text-center text-xs font-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subAccounts.map((sub, i) => {
                const editCount = sub.bot_permissions.filter(p => p.can_edit).length
                const viewCount = sub.bot_permissions.length

                return (
                  <tr
                    key={sub.id}
                    className={`border-b-2 border-[#121212]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F0F0]'}`}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm font-black text-[#121212]">{sub.name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-[#121212]/60">{sub.email}</span>
                    </td>
                    <td className="px-5 py-3">
                      {viewCount === 0 ? (
                        <span className="text-xs font-bold uppercase tracking-widest text-[#121212]/30">No access</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#1040C0]">
                            <Eye className="w-3 h-3" strokeWidth={2.5} />
                            {viewCount} bot{viewCount !== 1 ? 's' : ''}
                          </span>
                          {editCount > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#121212]">
                              <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                              {editCount} edit
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-[#121212]/40">{formatDate(sub.created_at)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setManaging(sub)}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#1040C0] border-2 border-[#1040C0] px-2 py-1 hover:bg-[#1040C0] hover:text-white transition-colors"
                        >
                          <Settings2 className="w-3 h-3" strokeWidth={2.5} />
                          Access
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={deletingId === sub.id}
                          className="p-1.5 border-2 border-[#D02020] text-[#D02020] hover:bg-[#D02020] hover:text-white transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateSubAccountModal onClose={() => setShowCreate(false)} />}

      {managing && (
        <ManagePermissionsModal
          subAccount={managing}
          allBots={allBots}
          onClose={() => setManaging(null)}
        />
      )}
    </>
  )
}
