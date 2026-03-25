'use client'

import { useRef } from 'react'
import { Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { useCanEdit } from '@/lib/context/botPermission'

export type ValidationType = 'none' | 'email' | 'phone' | 'date' | 'name' | 'number'
export type ConditionOperator = 'eq' | 'neq' | 'contains'

export interface OptionState   { localId: string; label: string }
export interface ConditionState { localId: string; conditionQuestionLocalId: string; operator: ConditionOperator; value: string }
export interface QuestionState {
  localId: string
  question_text: string
  input_type: 'text' | 'choice'
  validation_type: ValidationType
  is_required: boolean
  options: OptionState[]
  conditions: ConditionState[]
}

interface PreviousQuestion { localId: string; index: number; question_text: string }

interface QuestionCardProps {
  question: QuestionState
  index: number
  total: number
  previousQuestions: PreviousQuestion[]
  onChange: (patch: Partial<QuestionState>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const VALIDATION_OPTIONS: { value: ValidationType; label: string }[] = [
  { value: 'none',   label: 'None' },
  { value: 'name',   label: 'Name' },
  { value: 'email',  label: 'Email' },
  { value: 'phone',  label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date',   label: 'Date' },
]

const inputClass = 'w-full px-3 py-2 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium placeholder:text-[#121212]/30 focus:outline-none focus:bg-white transition-colors'
const selectClass = `${inputClass} cursor-pointer`

export default function QuestionCard({
  question, index, total, previousQuestions,
  onChange, onDelete, onMoveUp, onMoveDown,
}: QuestionCardProps) {
  const canEdit = useCanEdit()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertToken(token: string) {
    const el = textareaRef.current
    if (!el) { onChange({ question_text: question.question_text + token }); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = question.question_text.slice(0, start) + token + question.question_text.slice(end)
    onChange({ question_text: next })
    requestAnimationFrame(() => {
      el.selectionStart = start + token.length
      el.selectionEnd   = start + token.length
      el.focus()
    })
  }

  function addOption() {
    onChange({ options: [...question.options, { localId: Math.random().toString(36).slice(2), label: '' }] })
  }
  function updateOption(id: string, label: string) {
    onChange({ options: question.options.map(o => o.localId === id ? { ...o, label } : o) })
  }
  function removeOption(id: string) {
    onChange({ options: question.options.filter(o => o.localId !== id) })
  }

  function addCondition() {
    if (!previousQuestions.length) return
    onChange({
      conditions: [...question.conditions, {
        localId: Math.random().toString(36).slice(2),
        conditionQuestionLocalId: previousQuestions[0].localId,
        operator: 'eq',
        value: '',
      }],
    })
  }
  function updateCondition(id: string, patch: Partial<ConditionState>) {
    onChange({ conditions: question.conditions.map(c => c.localId === id ? { ...c, ...patch } : c) })
  }
  function removeCondition(id: string) {
    onChange({ conditions: question.conditions.filter(c => c.localId !== id) })
  }

  return (
    <div className="border-4 border-[#121212] bg-white shadow-[4px_4px_0px_0px_#121212]">
      {/* Card header */}
      <div className="bg-[#F0F0F0] border-b-4 border-[#121212] px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-[#121212]">
          Question {index + 1}
        </span>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={onMoveUp}   disabled={index === 0}         className="p-1 text-[#121212]/30 hover:text-[#121212] disabled:opacity-20 transition-colors"><ChevronUp   className="w-3.5 h-3.5" strokeWidth={3} /></button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-[#121212]/30 hover:text-[#121212] disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" strokeWidth={3} /></button>
            <button onClick={onDelete}                                  className="p-1 text-[#121212]/30 hover:text-[#D02020] transition-colors"><Trash2      className="w-3.5 h-3.5" strokeWidth={2} /></button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Question text + token buttons */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[#121212]">
              Question Text <span className="text-[#D02020]">*</span>
            </label>
            {canEdit && previousQuestions.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[#121212]/40">Insert:</span>
                {previousQuestions.map(pq => (
                  <button
                    key={pq.localId}
                    type="button"
                    onClick={() => insertToken(`{Q${pq.index + 1}}`)}
                    className="text-[10px] font-bold border border-[#1040C0] text-[#1040C0] px-1.5 py-0.5 hover:bg-[#1040C0] hover:text-white transition-colors"
                  >
                    {`{Q${pq.index + 1}}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            rows={2}
            value={question.question_text}
            onChange={e => onChange({ question_text: e.target.value })}
            readOnly={!canEdit}
            placeholder="e.g. What is your full name?"
            className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
          />
        </div>

        {/* Input type + validation + required row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">Input Type</label>
            <select
              value={question.input_type}
              onChange={e => onChange({ input_type: e.target.value as 'text' | 'choice', options: [] })}
              disabled={!canEdit}
              className={`${selectClass} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <option value="text">Free Text</option>
              <option value="choice">Multiple Choice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">Validation</label>
            <select
              value={question.validation_type}
              disabled={!canEdit || question.input_type === 'choice'}
              onChange={e => onChange({ validation_type: e.target.value as ValidationType })}
              className={`${selectClass} disabled:opacity-40`}
            >
              {VALIDATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">Required</label>
            <button
              type="button"
              onClick={() => canEdit && onChange({ is_required: !question.is_required })}
              disabled={!canEdit}
              className="flex items-center gap-2.5 mt-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className={`relative w-10 h-5 border-2 border-[#121212] transition-colors ${question.is_required ? 'bg-[#121212]' : 'bg-[#F0F0F0]'}`}>
                <div className={`absolute top-[2px] w-3 h-3 transition-all duration-150 ${question.is_required ? 'left-[18px] bg-white' : 'left-[2px] bg-[#121212]/30'}`} />
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${question.is_required ? 'text-[#121212]' : 'text-[#121212]/40'}`}>
                {question.is_required ? 'Required' : 'Optional'}
              </span>
            </button>
          </div>
        </div>

        {/* Multiple choice options */}
        {question.input_type === 'choice' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#121212]">Options</label>
              {canEdit && (
                <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-bold text-[#1040C0] hover:underline">
                  <Plus className="w-3 h-3" strokeWidth={3} /> Add Option
                </button>
              )}
            </div>
            <div className="space-y-2">
              {question.options.length === 0 && (
                <p className="text-xs text-[#121212]/40 italic">No options yet.</p>
              )}
              {question.options.map((opt, i) => (
                <div key={opt.localId} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-[#121212]/40 w-5 shrink-0">{i + 1}.</span>
                  <input
                    value={opt.label}
                    onChange={e => updateOption(opt.localId, e.target.value)}
                    readOnly={!canEdit}
                    placeholder={`Option ${i + 1}`}
                    className={`${inputClass} flex-1 read-only:opacity-60 read-only:cursor-not-allowed`}
                  />
                  {canEdit && (
                    <button type="button" onClick={() => removeOption(opt.localId)} className="text-[#121212]/30 hover:text-[#D02020] transition-colors">
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditional logic */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#121212]">
              Show if <span className="font-medium normal-case text-[#121212]/40">(optional)</span>
            </label>
            {canEdit && previousQuestions.length > 0 && (
              <button type="button" onClick={addCondition} className="flex items-center gap-1 text-xs font-bold text-[#1040C0] hover:underline">
                <Plus className="w-3 h-3" strokeWidth={3} /> Add Condition
              </button>
            )}
          </div>

          {previousQuestions.length === 0 ? (
            <p className="text-xs text-[#121212]/30 italic">No previous questions to condition on.</p>
          ) : question.conditions.length === 0 ? (
            <p className="text-xs text-[#121212]/30 italic">Always shown. Add a condition to make it conditional.</p>
          ) : (
            <div className="space-y-2">
              {question.conditions.map(cond => (
                <div key={cond.localId} className="flex gap-2 items-center flex-wrap">
                  <select
                    value={cond.conditionQuestionLocalId}
                    onChange={e => updateCondition(cond.localId, { conditionQuestionLocalId: e.target.value })}
                    className="px-2 py-1.5 border-2 border-[#121212] bg-[#F0F0F0] text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
                  >
                    {previousQuestions.map(pq => (
                      <option key={pq.localId} value={pq.localId}>Q{pq.index + 1}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={e => updateCondition(cond.localId, { operator: e.target.value as ConditionOperator })}
                    className="px-2 py-1.5 border-2 border-[#121212] bg-[#F0F0F0] text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="eq">equals</option>
                    <option value="neq">not equals</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    value={cond.value}
                    onChange={e => updateCondition(cond.localId, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 min-w-[80px] px-2 py-1.5 border-2 border-[#121212] bg-[#F0F0F0] text-xs font-medium focus:outline-none focus:bg-white"
                  />
                  {canEdit && (
                    <button type="button" onClick={() => removeCondition(cond.localId)} className="text-[#121212]/30 hover:text-[#D02020] transition-colors">
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
