'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { createTrigger, updateTrigger } from '@/lib/actions/triggers'
import Button from '@/components/ui/Button'
import type { TriggerWithKeywords } from '@/types/database'

type TriggerType = 'single' | 'multi' | 'any'
type ActionType  = 'replier' | 'form' | 'query'

interface TriggerModalProps {
  botId: string
  existing?: TriggerWithKeywords
  onClose: () => void
}

const TRIGGER_TYPES: { value: TriggerType; label: string; desc: string }[] = [
  { value: 'single', label: 'Single Keyword',   desc: 'Matches one exact keyword' },
  { value: 'multi',  label: 'Multi Keyword',    desc: 'Matches any of several keywords' },
  { value: 'any',    label: 'Any Message',       desc: 'Catch-all — matches everything' },
]

const ACTION_TYPES: { value: ActionType; label: string; color: string }[] = [
  { value: 'replier', label: 'Replier',       color: 'bg-[#1040C0] text-white' },
  { value: 'form',    label: 'Form',          color: 'bg-[#D02020] text-white' },
  { value: 'query',   label: 'Query Builder', color: 'bg-[#F0C020] text-[#121212]' },
]

export default function TriggerModal({ botId, existing, onClose }: TriggerModalProps) {
  const [name,        setName]        = useState(existing?.name ?? '')
  const [triggerType, setTriggerType] = useState<TriggerType>(existing?.trigger_type ?? 'single')
  const [platforms,   setPlatforms]   = useState<string[]>(existing?.platforms ?? [])
  const [actionType,  setActionType]  = useState<ActionType>(existing?.action_type ?? 'replier')
  const [keywords,    setKeywords]    = useState<string[]>(
    existing?.trigger_keywords?.map(k => k.keyword) ?? []
  )
  const [kwInput,  setKwInput]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function addKeyword(raw: string) {
    const val = raw.trim().toLowerCase()
    if (!val) return
    if (triggerType === 'single') {
      setKeywords([val])
    } else if (!keywords.includes(val)) {
      setKeywords(prev => [...prev, val])
    }
    setKwInput('')
  }

  function handleKwKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    } else if (e.key === 'Backspace' && !kwInput && keywords.length) {
      setKeywords(prev => prev.slice(0, -1))
    }
  }

  function togglePlatform(p: string) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const fd = new FormData()
    fd.set('name', name)
    fd.set('trigger_type', triggerType)
    platforms.forEach(p => fd.append('platforms', p))
    fd.set('action_type', actionType)
    fd.set('keywords', JSON.stringify(keywords))

    const result = existing
      ? await updateTrigger(existing.id, botId, fd)
      : await createTrigger(botId, fd)

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  const inputClass = 'w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#121212]/60" onClick={onClose} />

      <div className="relative w-full max-w-lg border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#1040C0] px-6 py-4 flex items-center justify-between border-b-4 border-[#121212] sticky top-0">
          <h2 className="text-lg font-black uppercase tracking-tighter text-white">
            {existing ? 'Edit Trigger' : 'New Trigger'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Trigger Name <span className="text-[#D02020]">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Welcome, FAQ, Apply Now"
              className={inputClass}
              required
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-2">
              Trigger Type <span className="text-[#D02020]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TRIGGER_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTriggerType(t.value); setKeywords([]) }}
                  className={`border-2 border-[#121212] px-3 py-2.5 text-left transition-colors ${
                    triggerType === t.value
                      ? 'bg-[#121212] text-white'
                      : 'bg-[#F0F0F0] hover:bg-[#E0E0E0]'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-tighter leading-tight">{t.label}</p>
                  <p className={`text-xs font-medium mt-0.5 ${triggerType === t.value ? 'text-white/60' : 'text-[#121212]/40'}`}>
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {triggerType !== 'any' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
                {triggerType === 'single' ? 'Keyword' : 'Keywords'}{' '}
                <span className="text-[#D02020]">*</span>
                <span className="text-[#121212]/40 normal-case font-medium ml-2">
                  {triggerType === 'single' ? '(one keyword)' : '(press Enter or comma to add)'}
                </span>
              </label>

              {/* Tag input */}
              <div
                className="min-h-[42px] flex flex-wrap gap-1.5 px-2 py-2 border-2 border-[#121212] bg-[#F0F0F0] cursor-text focus-within:bg-white transition-colors"
                onClick={() => inputRef.current?.focus()}
              >
                {keywords.map(kw => (
                  <span
                    key={kw}
                    className="flex items-center gap-1 bg-[#121212] text-white text-xs font-bold uppercase tracking-wide px-2 py-0.5"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                      className="hover:text-[#D02020] transition-colors"
                    >
                      <X className="w-3 h-3" strokeWidth={3} />
                    </button>
                  </span>
                ))}
                {(triggerType === 'multi' || keywords.length === 0) && (
                  <input
                    ref={inputRef}
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={handleKwKeyDown}
                    onBlur={() => addKeyword(kwInput)}
                    placeholder={keywords.length === 0 ? 'Type a keyword...' : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#121212]/30"
                  />
                )}
              </div>
            </div>
          )}

          {/* Platforms */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-2">
              Platforms <span className="text-[#D02020]">*</span>
            </label>
            <div className="flex gap-3">
              {[
                { value: 'whatsapp',  label: 'WhatsApp', activeClass: 'bg-[#F0C020] text-[#121212]' },
                { value: 'instagram', label: 'Instagram', activeClass: 'bg-[#D02020] text-white' },
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={`flex-1 py-2.5 border-2 border-[#121212] text-xs font-black uppercase tracking-widest transition-colors ${
                    platforms.includes(p.value) ? p.activeClass : 'bg-[#F0F0F0] text-[#121212]/40'
                  }`}
                >
                  {p.label} {platforms.includes(p.value) ? '●' : '○'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-2">
              Action Type <span className="text-[#D02020]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACTION_TYPES.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setActionType(a.value)}
                  className={`border-2 border-[#121212] py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                    actionType === a.value ? a.color : 'bg-[#F0F0F0] text-[#121212]/40'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="blue" type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Trigger'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
