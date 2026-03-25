'use client'

import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import TriggerCard from './TriggerCard'
import TriggerModal from './TriggerModal'
import type { TriggerWithKeywords, ActionType } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

interface TriggerListProps {
  botId: string
  initialTriggers: TriggerWithKeywords[]
}

const ACTION_FILTERS: { value: 'all' | ActionType; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'replier', label: 'Replier' },
  { value: 'form',    label: 'Form'    },
  { value: 'query',   label: 'Query'   },
]

export default function TriggerList({ botId, initialTriggers }: TriggerListProps) {
  const canEdit = useCanEdit()
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState<TriggerWithKeywords | null>(null)
  const [search,       setSearch]       = useState('')
  const [actionFilter, setActionFilter] = useState<'all' | ActionType>('all')

  function openCreate() { setEditing(null); setShowModal(true) }
  function openEdit(t: TriggerWithKeywords) { setEditing(t); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  const filtered = initialTriggers.filter(t => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      t.trigger_keywords.some(kw => kw.keyword.toLowerCase().includes(q))
    const matchesAction = actionFilter === 'all' || t.action_type === actionFilter
    return matchesSearch && matchesAction
  })

  const hasFilters = search.trim() !== '' || actionFilter !== 'all'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="border-b-4 border-[#121212] pb-6 mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40 mb-1">Bot Config</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Triggers</h2>
          <p className="text-sm font-medium text-[#121212]/50 mt-1">
            Define what messages activate your bot and which action runs.
          </p>
        </div>
        {canEdit && (
          <Button variant="red" onClick={openCreate}>
            <Plus className="w-4 h-4" strokeWidth={3} />
            New Trigger
          </Button>
        )}
      </div>

      {/* Search + filter bar — only show if there are triggers */}
      {initialTriggers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#121212]/40" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search by name or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border-2 border-[#121212] bg-white text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:border-[#1040C0]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#121212]/30 hover:text-[#121212]"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Action type filter */}
          <div className="flex items-center gap-1">
            {ACTION_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setActionFilter(f.value)}
                className={`text-xs font-black uppercase tracking-widest px-3 py-2 border-2 border-[#121212] transition-colors ${
                  actionFilter === f.value
                    ? 'bg-[#121212] text-white'
                    : 'bg-white text-[#121212] hover:bg-[#F0F0F0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {initialTriggers.length === 0 ? (
        <div className="border-4 border-dashed border-[#121212] p-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#D02020] border-2 border-[#121212]" />
            <div className="w-5 h-5 bg-[#F0C020] border-2 border-[#121212]" />
            <div className="w-5 h-5 border-2 border-[#121212]"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#1040C0' }} />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]/40 text-center">
            No triggers yet.{canEdit && <><br />Create your first trigger to start building.</>}
          </p>
          {canEdit && (
            <Button variant="outline" shape="pill" onClick={openCreate}>
              <Plus className="w-4 h-4" strokeWidth={3} />
              Create Trigger
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-4 border-dashed border-[#121212] p-12 flex flex-col items-center gap-3">
          <Search className="w-8 h-8 text-[#121212]/20" strokeWidth={1.5} />
          <p className="text-sm font-bold uppercase tracking-widest text-[#121212]/40 text-center">
            No triggers match your search.
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setActionFilter('all') }}
              className="text-xs font-black uppercase tracking-widest text-[#1040C0] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(trigger => (
            <TriggerCard
              key={trigger.id}
              trigger={trigger}
              botId={botId}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {canEdit && showModal && (
        <TriggerModal
          botId={botId}
          existing={editing ?? undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
