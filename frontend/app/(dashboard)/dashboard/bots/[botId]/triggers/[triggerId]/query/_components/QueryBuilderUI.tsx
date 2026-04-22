'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, ChevronRight } from 'lucide-react'
import { useCanEdit } from '@/lib/context/botPermission'
import { saveQueryBuilder } from '@/lib/actions/query'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import Button from '@/components/ui/Button'
import SaveStatusIndicator from '@/components/ui/SaveStatusIndicator'
import QueryPreview from './QueryPreview'
import type { Trigger } from '@/types/database'

interface QuestionState  { localId: string; question_text: string; answer_text: string }
interface CategoryState  { localId: string; category_name: string; questions: QuestionState[]; expanded: boolean }

interface QueryBuilderUIProps {
  trigger: Trigger
  botName: string
  existing: {
    query_categories: {
      id: string; category_name: string; order_index: number
      query_questions: { id: string; question_text: string; answer_text: string; order_index: number }[]
    }[]
  } | null
}

const inputClass = 'w-full px-3 py-2 border-4 border-black bg-[#FFFDF5] text-sm font-medium placeholder:text-black/30 focus:outline-none focus:bg-white transition-colors'

export default function QueryBuilderUI({ trigger, botName, existing }: QueryBuilderUIProps) {
  const canEdit = useCanEdit()
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryState[]>(() => {
    if (!existing?.query_categories?.length) return []
    return [...existing.query_categories]
      .sort((a, b) => a.order_index - b.order_index)
      .map(c => ({
        localId: c.id,
        category_name: c.category_name,
        expanded: false,
        questions: [...c.query_questions]
          .sort((a, b) => a.order_index - b.order_index)
          .map(q => ({ localId: q.id, question_text: q.question_text, answer_text: q.answer_text })),
      }))
  })

  const [error, setError] = useState<string | null>(null)

  // ── Category helpers ──
  function addCategory() {
    setCategories(prev => [...prev, { localId: Math.random().toString(36).slice(2), category_name: '', questions: [], expanded: true }])
  }
  function updateCategory(id: string, patch: Partial<CategoryState>) {
    setCategories(prev => prev.map(c => c.localId === id ? { ...c, ...patch } : c))
  }
  function deleteCategory(id: string) {
    setCategories(prev => prev.filter(c => c.localId !== id))
  }
  function moveCategory(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= categories.length) return
    setCategories(prev => { const arr = [...prev]; [arr[index], arr[next]] = [arr[next], arr[index]]; return arr })
  }

  // ── Question helpers ──
  function addQuestion(catId: string) {
    setCategories(prev => prev.map(c => c.localId === catId
      ? { ...c, questions: [...c.questions, { localId: Math.random().toString(36).slice(2), question_text: '', answer_text: '' }] }
      : c
    ))
  }
  function updateQuestion(catId: string, qId: string, patch: Partial<QuestionState>) {
    setCategories(prev => prev.map(c => c.localId === catId
      ? { ...c, questions: c.questions.map(q => q.localId === qId ? { ...q, ...patch } : q) }
      : c
    ))
  }
  function deleteQuestion(catId: string, qId: string) {
    setCategories(prev => prev.map(c => c.localId === catId
      ? { ...c, questions: c.questions.filter(q => q.localId !== qId) }
      : c
    ))
  }
  function moveQuestion(catId: string, index: number, dir: -1 | 1) {
    const next = index + dir
    setCategories(prev => prev.map(c => {
      if (c.localId !== catId) return c
      if (next < 0 || next >= c.questions.length) return c
      const arr = [...c.questions]; [arr[index], arr[next]] = [arr[next], arr[index]]; return { ...c, questions: arr }
    }))
  }

  async function doSave() {
    setError(null)
    const fd = new FormData()
    fd.set('categories', JSON.stringify(
      categories.map((c, i) => ({
        localId: c.localId, category_name: c.category_name, order_index: i,
        questions: c.questions.map((q, j) => ({ question_text: q.question_text, answer_text: q.answer_text, order_index: j })),
      }))
    ))
    const result = await saveQueryBuilder(trigger.id, trigger.bot_id, fd)
    if (result.error) { setError(result.error); return { error: result.error } }
    router.refresh()
    return {}
  }

  const { status, triggerSave } = useAutoSave(doSave, [categories])
  useUnsavedChanges(status)

  return (
    <div className="flex gap-8 p-8 min-h-full">
      {/* ── Left: Builder ── */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-xs font-bold uppercase tracking-widest text-black/40">Trigger — {trigger.name}</p>
            <SaveStatusIndicator status={status} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Query Builder</h2>
          <p className="text-sm font-medium text-black/50 mt-1">Build FAQ categories with questions and pre-written answers.</p>
        </div>

        <div className="space-y-4">
          {categories.length === 0 && (
            <div className="border-4 border-dashed border-black p-10 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-black/40">No categories yet.</p>
            </div>
          )}

          {categories.map((cat, ci) => (
            <div key={cat.localId} className="border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
              {/* Category header */}
              <div className="bg-[#FFD93D] border-b-4 border-black px-4 py-2.5 flex items-center gap-2">
                <button onClick={() => updateCategory(cat.localId, { expanded: !cat.expanded })}
                  className="p-0.5 text-black/60 hover:text-[#000000] transition-colors">
                  <ChevronRight className={`w-4 h-4 transition-transform ${cat.expanded ? 'rotate-90' : ''}`} strokeWidth={3} />
                </button>
                <input
                  value={cat.category_name}
                  onChange={e => updateCategory(cat.localId, { category_name: e.target.value })}
                  readOnly={!canEdit}
                  placeholder="Category name e.g. Admissions, Fees"
                  className="flex-1 bg-transparent text-sm font-black uppercase tracking-tighter placeholder:text-black/30 focus:outline-none read-only:cursor-not-allowed"
                />
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveCategory(ci, -1)} disabled={ci === 0} className="p-1 text-black/30 hover:text-[#000000] disabled:opacity-20 transition-colors"><ChevronUp className="w-3.5 h-3.5" strokeWidth={3} /></button>
                    <button onClick={() => moveCategory(ci, 1)} disabled={ci === categories.length - 1} className="p-1 text-black/30 hover:text-[#000000] disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" strokeWidth={3} /></button>
                    <button onClick={() => deleteCategory(cat.localId)} className="p-1 text-black/30 hover:text-[#FF6B6B] transition-colors"><Trash2 className="w-3.5 h-3.5" strokeWidth={2} /></button>
                  </div>
                )}
              </div>

              {cat.expanded && (
                <div className="p-4 space-y-3">
                  {cat.questions.length === 0 && (
                    <p className="text-xs text-black/40 italic text-center py-2">No questions yet.</p>
                  )}

                  {cat.questions.map((q, qi) => (
                    <div key={q.localId} className="border-4 border-black p-3 bg-[#FFFDF5] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-black/50">Q{qi + 1}</span>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => moveQuestion(cat.localId, qi, -1)} disabled={qi === 0} className="p-0.5 text-black/30 hover:text-[#000000] disabled:opacity-20"><ChevronUp className="w-3 h-3" strokeWidth={3} /></button>
                            <button onClick={() => moveQuestion(cat.localId, qi, 1)} disabled={qi === cat.questions.length - 1} className="p-0.5 text-black/30 hover:text-[#000000] disabled:opacity-20"><ChevronDown className="w-3 h-3" strokeWidth={3} /></button>
                            <button onClick={() => deleteQuestion(cat.localId, q.localId)} className="p-0.5 text-black/30 hover:text-[#FF6B6B]"><Trash2 className="w-3 h-3" strokeWidth={2} /></button>
                          </div>
                        )}
                      </div>
                      <input
                        value={q.question_text}
                        onChange={e => updateQuestion(cat.localId, q.localId, { question_text: e.target.value })}
                        readOnly={!canEdit}
                        placeholder="Question e.g. What are the fees?"
                        className={`${inputClass} read-only:opacity-60 read-only:cursor-not-allowed`}
                      />
                      <textarea
                        rows={2}
                        value={q.answer_text}
                        onChange={e => updateQuestion(cat.localId, q.localId, { answer_text: e.target.value })}
                        readOnly={!canEdit}
                        placeholder="Answer..."
                        className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
                      />
                    </div>
                  ))}

                  {canEdit && (
                    <button type="button" onClick={() => addQuestion(cat.localId)}
                      className="w-full border-2 border-dashed border-black py-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-[#000000] hover:bg-[#FFFDF5] transition-colors">
                      <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add Question
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {canEdit && (
            <button type="button" onClick={addCategory}
              className="w-full border-4 border-dashed border-black py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-black/40 hover:text-[#000000] hover:bg-[#FFFDF5] transition-colors">
              <Plus className="w-4 h-4" strokeWidth={3} /> Add Category
            </button>
          )}

          {error && <div className="border-2 border-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2"><p className="text-sm font-medium text-[#FF6B6B]">{error}</p></div>}

          {canEdit && (
            <Button variant="yellow" onClick={triggerSave} disabled={status === 'saving'}>
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {status === 'saving' ? 'Saving...' : 'Save Query Builder'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Right: Preview ── */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-8">
          <QueryPreview
            platforms={trigger.platforms as string[]}
            botName={botName}
            categories={categories.map(c => ({
              category_name: c.category_name,
              questions: c.questions.map(q => ({ question_text: q.question_text, answer_text: q.answer_text })),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
