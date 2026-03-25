'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react'
import { saveReplier } from '@/lib/actions/replier'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import Button from '@/components/ui/Button'
import SaveStatusIndicator from '@/components/ui/SaveStatusIndicator'
import PhonePreview from './PhonePreview'
import type { Trigger, ReplierAction, ReplierButton } from '@/types/database'
import { useCanEdit } from '@/lib/context/botPermission'

interface ButtonState {
  localId: string
  label: string
  links_to_trigger_id: string | null
}

interface AllTrigger {
  id: string
  name: string
}

interface ReplierBuilderProps {
  trigger: Trigger
  botName: string
  existing: (ReplierAction & { replier_buttons: ReplierButton[] }) | null
  allTriggers: AllTrigger[]
}

export default function ReplierBuilder({ trigger, botName, existing, allTriggers }: ReplierBuilderProps) {
  const canEdit = useCanEdit()
  const router = useRouter()
  const [message, setMessage] = useState(existing?.message_text ?? '')
  const [buttons, setButtons] = useState<ButtonState[]>(
    existing?.replier_buttons
      ?.sort((a, b) => a.order_index - b.order_index)
      .map(b => ({
        localId: b.id,
        label: b.button_label,
        links_to_trigger_id: b.links_to_trigger_id,
      })) ?? []
  )
  const [error, setError] = useState<string | null>(null)

  function addButton() {
    if (buttons.length >= 3) return
    setButtons(prev => [...prev, {
      localId: Math.random().toString(36).slice(2),
      label: '',
      links_to_trigger_id: null,
    }])
  }

  function updateButton(localId: string, patch: Partial<ButtonState>) {
    setButtons(prev => prev.map(b => b.localId === localId ? { ...b, ...patch } : b))
  }

  function removeButton(localId: string) {
    setButtons(prev => prev.filter(b => b.localId !== localId))
  }

  function moveButton(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= buttons.length) return
    setButtons(prev => {
      const arr = [...prev]
      ;[arr[index], arr[next]] = [arr[next], arr[index]]
      return arr
    })
  }

  async function doSave() {
    setError(null)
    const fd = new FormData()
    fd.set('message_text', message)
    fd.set('buttons', JSON.stringify(
      buttons.map(b => ({ label: b.label, links_to_trigger_id: b.links_to_trigger_id }))
    ))
    const result = await saveReplier(trigger.id, trigger.bot_id, fd)
    if (result.error) { setError(result.error); return { error: result.error } }
    router.refresh()
    return {}
  }

  const { status, triggerSave } = useAutoSave(doSave, [message, buttons])
  useUnsavedChanges(status)

  const inputClass = 'w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors'

  return (
    <div className="flex gap-8 p-8 min-h-full">
      {/* ── Left: Builder ── */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#121212]/40">Trigger — {trigger.name}</p>
            <SaveStatusIndicator status={status} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Replier Builder</h2>
          <p className="text-sm font-medium text-[#121212]/50 mt-1">
            Write a message and optionally add quick-reply buttons.
          </p>
        </div>

        <div className="space-y-6">
          {/* Message */}
          <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white">
            <div className="bg-[#1040C0] border-b-4 border-[#121212] px-5 py-3">
              <h3 className="text-sm font-black uppercase tracking-tighter text-white">Message</h3>
            </div>
            <div className="p-5">
              <textarea
                value={message}
                onChange={e => canEdit && setMessage(e.target.value)}
                readOnly={!canEdit}
                rows={5}
                placeholder="Type your bot's message here..."
                className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
              />
              <p className="text-xs font-medium text-[#121212]/40 mt-1.5">
                Supports plain text. Keep it concise.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white">
            <div className="bg-[#F0C020] border-b-4 border-[#121212] px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tighter text-[#121212]">Quick-Reply Buttons</h3>
                <p className="text-xs font-medium text-[#121212]/50">Max 3 buttons</p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={addButton}
                  disabled={buttons.length >= 3}
                  className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest border-2 border-[#121212] px-3 py-1.5 bg-white hover:bg-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                  Add Button
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">
              {buttons.length === 0 ? (
                <p className="text-xs font-medium text-[#121212]/40 text-center py-4">
                  No buttons yet. Add up to 3 quick-reply buttons.
                </p>
              ) : (
                buttons.map((btn, i) => (
                  <div key={btn.localId} className="flex gap-2 items-start">
                    {/* Order controls */}
                    {canEdit && (
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button type="button" onClick={() => moveButton(i, -1)} disabled={i === 0} className="p-0.5 text-[#121212]/30 hover:text-[#121212] disabled:opacity-20 transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                        <button type="button" onClick={() => moveButton(i, 1)} disabled={i === buttons.length - 1} className="p-0.5 text-[#121212]/30 hover:text-[#121212] disabled:opacity-20 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      </div>
                    )}

                    {/* Inputs */}
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1">
                          Button Label
                        </label>
                        <input
                          value={btn.label}
                          onChange={e => updateButton(btn.localId, { label: e.target.value })}
                          readOnly={!canEdit}
                          placeholder="e.g. Learn More"
                          maxLength={20}
                          className={`${inputClass} read-only:opacity-60 read-only:cursor-not-allowed`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1">
                          Links to Trigger
                        </label>
                        <select
                          value={btn.links_to_trigger_id ?? ''}
                          onChange={e => updateButton(btn.localId, { links_to_trigger_id: e.target.value || null })}
                          disabled={!canEdit}
                          className={`${inputClass} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <option value="">— None —</option>
                          {allTriggers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Delete */}
                    {canEdit && (
                      <button type="button" onClick={() => removeButton(btn.localId)} className="mt-6 p-1.5 text-[#121212]/30 hover:text-[#D02020] transition-colors">
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feedback + Save */}
          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          {canEdit && (
            <Button variant="blue" onClick={triggerSave} disabled={status === 'saving'}>
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {status === 'saving' ? 'Saving...' : 'Save Replier'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Right: Phone Preview ── */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-8">
          <p className="text-xs font-black uppercase tracking-widest text-[#121212]/40 mb-4 text-center">
            Live Preview
          </p>
          <PhonePreview
            platforms={trigger.platforms as string[]}
            message={message}
            buttons={buttons.map(b => ({ label: b.label }))}
            botName={botName}
          />
        </div>
      </div>
    </div>
  )
}
