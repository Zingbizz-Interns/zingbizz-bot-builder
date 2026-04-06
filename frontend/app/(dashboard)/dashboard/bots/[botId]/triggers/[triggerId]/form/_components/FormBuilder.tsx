'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save } from 'lucide-react'
import { useCanEdit } from '@/lib/context/botPermission'
import { saveForm } from '@/lib/actions/form'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import Button from '@/components/ui/Button'
import SaveStatusIndicator from '@/components/ui/SaveStatusIndicator'
import QuestionCard from './QuestionCard'
import FormPreview from './FormPreview'
import type { QuestionState } from './QuestionCard'
import type { Trigger } from '@/types/database'

interface FormBuilderProps {
  trigger: Trigger
  botName: string
  existing: {
    title: string
    submit_message: string
    show_progress: boolean
    form_questions: {
      id: string
      order_index: number
      question_text: string
      input_type: 'text' | 'choice'
      validation_type: string
      is_required: boolean
      form_question_options: { id: string; option_label: string; order_index: number }[]
      form_conditions: {
        id: string
        condition_question_id: string
        condition_operator: string
        condition_value: string
      }[]
    }[]
  } | null
}

function makeQuestion(): QuestionState {
  return {
    localId: Math.random().toString(36).slice(2),
    question_text: '',
    input_type: 'text',
    validation_type: 'none',
    is_required: true,
    options: [],
    conditions: [],
  }
}

export default function FormBuilder({ trigger, botName, existing }: FormBuilderProps) {
  const canEdit = useCanEdit()
  const router = useRouter()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [submitMessage, setSubmitMessage] = useState(existing?.submit_message ?? 'Thank you! Your responses have been submitted.')
  const [showProgress, setShowProgress] = useState(existing?.show_progress ?? false)
  const submitMsgRef = useRef<HTMLTextAreaElement>(null)

  function insertSubmitToken(token: string) {
    const el = submitMsgRef.current
    if (!el) { setSubmitMessage(prev => prev + token); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = submitMessage.slice(0, start) + token + submitMessage.slice(end)
    setSubmitMessage(next)
    requestAnimationFrame(() => {
      el.selectionStart = start + token.length
      el.selectionEnd = start + token.length
      el.focus()
    })
  }

  // Map existing DB questions to local state
  const [questions, setQuestions] = useState<QuestionState[]>(() => {
    if (!existing?.form_questions?.length) return []
    const sorted = [...existing.form_questions].sort((a, b) => a.order_index - b.order_index)

    // Build dbId -> localId map so conditions can reference local IDs
    const dbToLocal: Record<string, string> = {}
    const localIds = sorted.map(() => Math.random().toString(36).slice(2))
    sorted.forEach((q, i) => { dbToLocal[q.id] = localIds[i] })

    return sorted.map((q, i) => ({
      localId: localIds[i],
      question_text: q.question_text,
      input_type: q.input_type,
      validation_type: q.validation_type as QuestionState['validation_type'],
      is_required: q.is_required,
      options: [...q.form_question_options]
        .sort((a, b) => a.order_index - b.order_index)
        .map(o => ({ localId: o.id, label: o.option_label })),
      conditions: q.form_conditions.map(c => ({
        localId: c.id,
        conditionQuestionLocalId: dbToLocal[c.condition_question_id] ?? '',
        operator: c.condition_operator as QuestionState['conditions'][0]['operator'],
        value: c.condition_value,
      })),
    }))
  })

  const [error, setError] = useState<string | null>(null)

  function addQuestion() {
    setQuestions(prev => [...prev, makeQuestion()])
  }

  function updateQuestion(localId: string, patch: Partial<QuestionState>) {
    setQuestions(prev => prev.map(q => q.localId === localId ? { ...q, ...patch } : q))
  }

  function deleteQuestion(localId: string) {
    setQuestions(prev => {
      const filtered = prev.filter(q => q.localId !== localId)
      // Remove conditions referencing the deleted question
      return filtered.map(q => ({
        ...q,
        conditions: q.conditions.filter(c => c.conditionQuestionLocalId !== localId),
      }))
    })
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= questions.length) return
    setQuestions(prev => {
      const arr = [...prev]
      ;[arr[index], arr[next]] = [arr[next], arr[index]]
      return arr
    })
  }

  async function doSave() {
    setError(null)
    const fd = new FormData()
    fd.set('title', title)
    fd.set('submit_message', submitMessage)
    fd.set('show_progress', String(showProgress))
    fd.set('questions', JSON.stringify(
      questions.map((q, i) => ({
        localId: q.localId,
        order_index: i,
        question_text: q.question_text,
        input_type: q.input_type,
        validation_type: q.validation_type,
        is_required: q.is_required,
        options: q.options.map(o => ({ label: o.label })),
        conditions: q.conditions.map(c => ({
          conditionQuestionLocalId: c.conditionQuestionLocalId,
          operator: c.operator,
          value: c.value,
        })),
      }))
    ))
    const result = await saveForm(trigger.id, trigger.bot_id, fd)
    if (result.error) { setError(result.error); return { error: result.error } }
    router.refresh()
    return {}
  }

  const { status, triggerSave } = useAutoSave(doSave, [title, submitMessage, showProgress, questions])
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
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#121212]">Form Builder</h2>
          <p className="text-sm font-medium text-[#121212]/50 mt-1">
            Build dynamic question flows with validation and conditional logic.
          </p>
        </div>

        <div className="space-y-5">
          {/* Form title */}
          <div className="border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white">
            <div className="bg-[#D02020] border-b-4 border-[#121212] px-5 py-3">
              <h3 className="text-sm font-black uppercase tracking-tighter text-white">Form Details</h3>
            </div>
            <div className="p-5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
                Form Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                readOnly={!canEdit}
                placeholder="e.g. Application Form, Feedback Form"
                className={`${inputClass} read-only:opacity-60 read-only:cursor-not-allowed`}
              />
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#121212]">
                    Submit Message
                  </label>
                  {canEdit && questions.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#121212]/40 mr-1">Insert:</span>
                      {questions.map((q, i) => (
                        <button
                          key={q.localId}
                          type="button"
                          onClick={() => insertSubmitToken(`{Q${i + 1}}`)}
                          className="text-[10px] font-bold border border-[#1040C0] text-[#1040C0] px-1.5 py-0.5 hover:bg-[#1040C0] hover:text-white transition-colors"
                        >
                          {`{Q${i + 1}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  ref={submitMsgRef}
                  value={submitMessage}
                  onChange={e => setSubmitMessage(e.target.value)}
                  readOnly={!canEdit}
                  rows={3}
                  placeholder="Message sent to user after form is completed..."
                  className={`${inputClass} resize-none read-only:opacity-60 read-only:cursor-not-allowed`}
                />
                <p className="text-xs font-medium text-[#121212]/40 mt-1.5">
                  Sent to the user after they answer the last question. Use {'{Q1}'}, {'{Q2}'} etc. to include answers.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#121212]">Show Progress Indicator</p>
                  <p className="text-xs font-medium text-[#121212]/40 mt-0.5">
                    Appends &quot;(Question X of Y)&quot; to each message sent to the user.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showProgress}
                  disabled={!canEdit}
                  onClick={() => setShowProgress(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-[#121212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${showProgress ? 'bg-[#121212]' : 'bg-[#F0F0F0]'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white border border-[#121212] transition-transform ${showProgress ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, i) => (
            <QuestionCard
              key={q.localId}
              question={q}
              index={i}
              total={questions.length}
              previousQuestions={questions.slice(0, i).map((pq, pi) => ({
                localId: pq.localId,
                index: pi,
                question_text: pq.question_text,
              }))}
              onChange={patch => updateQuestion(q.localId, patch)}
              onDelete={() => deleteQuestion(q.localId)}
              onMoveUp={() => moveQuestion(i, -1)}
              onMoveDown={() => moveQuestion(i, 1)}
            />
          ))}

          {/* Add question */}
          {canEdit && (
            <button
              type="button"
              onClick={addQuestion}
              className="w-full border-4 border-dashed border-[#121212] py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#121212]/40 hover:text-[#121212] hover:border-[#121212] hover:bg-[#F0F0F0] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Add Question
            </button>
          )}

          {/* Feedback + Save */}
          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          {canEdit && (
            <Button variant="red" onClick={triggerSave} disabled={status === 'saving'}>
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {status === 'saving' ? 'Saving...' : 'Save Form'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Right: Phone Preview ── */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-8">
          <FormPreview
            platforms={trigger.platforms as string[]}
            botName={botName}
            title={title}
            showProgress={showProgress}
            questions={questions.map(q => ({
              localId: q.localId,
              question_text: q.question_text,
              input_type: q.input_type,
              is_required: q.is_required,
              options: q.options.map(o => ({ label: o.label })),
              conditions: q.conditions.map(c => ({
                conditionQuestionLocalId: c.conditionQuestionLocalId,
                operator: c.operator,
                value: c.value,
              })),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
