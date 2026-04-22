'use client'

import { useState } from 'react'
import { Pencil, Trash2, ArrowRight, BarChart2 } from 'lucide-react'
import { deleteTrigger } from '@/lib/actions/triggers'
import Button from '@/components/ui/Button'
import type { TriggerWithKeywords } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

const TRIGGER_TYPE_LABELS = { single: 'Single', multi: 'Multi', any: 'Any' }

const ACTION_STYLES = {
  replier: { label: 'Replier',       cls: 'bg-[#FF6B6B] text-white' },
  form:    { label: 'Form',          cls: 'bg-[#FF6B6B] text-white' },
  query:   { label: 'Query Builder', cls: 'bg-[#FFD93D] text-black' },
}

interface TriggerCardProps {
  trigger: TriggerWithKeywords
  botId: string
  onEdit: (trigger: TriggerWithKeywords) => void
}

export default function TriggerCard({ trigger, botId, onEdit }: TriggerCardProps) {
  const canEdit = useCanEdit()
  const [deleting, setDeleting] = useState(false)
  const action = ACTION_STYLES[trigger.action_type]

  async function handleDelete() {
    if (!confirm(`Delete trigger "${trigger.name}"? This will also delete its linked action.`)) return
    setDeleting(true)
    await deleteTrigger(trigger.id, botId)
  }

  const builderHref = `/dashboard/bots/${botId}/triggers/${trigger.id}/${trigger.action_type}`

  return (
    <div className="border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
      {/* Accent bar — action type color */}
      <div className={`h-1.5 ${action.cls.split(' ')[0]}`} />

      <div className="p-4">
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-black uppercase tracking-tighter text-[#000000] leading-tight">
            {trigger.name}
          </h3>
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(trigger)}
                className="p-1 text-black/30 hover:text-[#FF6B6B] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 text-black/30 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Trigger type */}
          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black bg-[#FFFDF5]">
            {TRIGGER_TYPE_LABELS[trigger.trigger_type]}
          </span>

          {/* Platforms */}
          {trigger.platforms.includes('whatsapp') && (
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black bg-[#FFD93D]">
              WA
            </span>
          )}
          {trigger.platforms.includes('instagram') && (
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black bg-[#FF6B6B] text-white">
              IG
            </span>
          )}

          {/* Action type */}
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-4 border-black ${action.cls}`}>
            {action.label}
          </span>
        </div>

        {/* Keywords */}
        {trigger.trigger_type !== 'any' && trigger.trigger_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {trigger.trigger_keywords.map(kw => (
              <span
                key={kw.id}
                className="text-xs font-medium bg-[#FFFDF5] border border-black/20 px-1.5 py-0.5 text-black/60"
              >
                {kw.keyword}
              </span>
            ))}
          </div>
        )}

        {trigger.trigger_type === 'any' && (
          <p className="text-xs font-medium text-black/40 mb-3 italic">Matches any message</p>
        )}

        {/* Open Builder */}
        <Button variant="outline" className="w-full text-xs" onClick={() => window.location.href = builderHref}>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          Open {action.label} Builder
        </Button>

        {/* View Responses — form triggers only */}
        {trigger.action_type === 'form' && (
          <Button
            variant="ghost"
            className="w-full text-xs mt-1"
            onClick={() => window.location.href = `${builderHref}/responses`}
          >
            <BarChart2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            View Responses
          </Button>
        )}
      </div>
    </div>
  )
}
